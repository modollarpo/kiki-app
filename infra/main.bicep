@description('Azure region for all resources')
param location string = 'swedencentral'

@description('Base name for resources (lowercase, alphanumeric)')
param baseName string = 'kiki'

@description('Azure OpenAI API version')
param openAiApiVersion string = '2024-10-21'

@description('Groq API key for fast bidding inference (leave empty to disable)')
@secure()
param groqApiKey string = ''

@description('PostgreSQL connection string for the app (DATABASE_URL). Required for production; omit only for local SQLite fallback.')
@secure()
param databaseUrl string = ''

var resourceGroupName = 'kiki-agent-rg'
var acrName = 'kikiagentacr'
var envName = '${baseName}-env'
var containerAppName = '${baseName}-app'
var logAnalyticsName = '${baseName}-logs'
var storageName = replace('${baseName}store', '-', '')
var fileShareName = 'kikidata'
var openAiName = replace('${baseName}openai', '-', '')
var containerAppEnvStorageName = 'kikidata'

// Deterministic, sufficiently-long secrets derived from baseName so a redeploy
// without explicit params does not fall back to the 4-char "kiki" default.
var jwtSecret = base64(substring(toLower(replace(baseName, '-', '')), 0, 1)) + '${baseName}' + '7f3c9a1b2e4d5c6f8a9b0c1d2e3f4a5b'
var encryptionKey = substring(sha256('${baseName}-encryption'), 0, 64)
var opencodeSecret = substring(sha256('${baseName}-opencode'), 0, 64)

// ── Log Analytics (for Container App logs) ────────────────
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
  }
}

// ── Container App Environment ─────────────────────────────
resource env 'Microsoft.App/managedEnvironments@2024-10-02-preview' = {
  name: envName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// ── Azure Container Registry ──────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: true
  }
}

// ── Storage Account + File Share (SQLite persistence) ─────
resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageName
  location: location
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
  }
}

resource fileShare 'Microsoft.Storage/storageAccounts/fileServices/shares@2023-05-01' = {
  name: '${storage.name}/default/${fileShareName}'
  properties: {
    accessTier: 'TransactionOptimized'
  }
}

// Mount the file share into the Container App environment
resource envStorage 'Microsoft.App/managedEnvironments/storages@2024-10-02-preview' = {
  name: containerAppEnvStorageName
  parent: env
  properties: {
    azureFile: {
      accountName: storage.name
      accountKey: storage.listKeys().keys[0].value
      shareName: fileShareName
      accessMode: 'ReadWrite'
    }
  }
}

// ── Azure OpenAI ──────────────────────────────────────────
resource openAi 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: openAiName
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    customSubDomainName: openAiName
    publicNetworkAccess: 'Enabled'
  }
}

// Model deployments are created separately via CLI (quota-dependent).

// ── Container App ─────────────────────────────────────────
resource containerApp 'Microsoft.App/containerApps@2024-10-02-preview' = {
  name: containerAppName
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
        allowInsecure: false
      }
      secrets: [
        { name: 'registry-password', value: acr.listCredentials().passwords[0].value }
        { name: 'openai-key', value: openAi.listKeys().key1 }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'encryption-key', value: encryptionKey }
        { name: 'groq-api-key', value: groqApiKey }
        { name: 'db-url', value: databaseUrl }
        { name: 'opencode-secret', value: opencodeSecret }
      ]
      registries: [
        {
          server: '${acr.loginServer}'
          username: acr.name
          passwordSecretRef: 'registry-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'kiki-web'
          image: '${acr.loginServer}/${containerAppName}:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'DATABASE_URL', secretRef: 'db-url' }
            { name: 'NEXT_PUBLIC_API_URL', value: 'https://${containerAppName}.${location}.azurecontainerapps.io' }
            { name: 'AZURE_OPENAI_ENDPOINT', value: openAi.properties.endpoint }
            { name: 'AZURE_OPENAI_API_KEY', secretRef: 'openai-key' }
            { name: 'AZURE_OPENAI_API_VERSION', value: openAiApiVersion }
            { name: 'AZURE_OPENAI_DEPLOYMENT_STANDARD', value: 'gpt-4o' }
            { name: 'AZURE_OPENAI_DEPLOYMENT_MINI', value: 'gpt-4o-mini' }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'ENCRYPTION_KEY', secretRef: 'encryption-key' }
            { name: 'GROQ_API_KEY', secretRef: 'groq-api-key' }
            { name: 'GROQ_MODEL', value: 'llama-3.1-8b-instant' }
            { name: 'BIDDING_INTERVAL_MS', value: '300000' }
            { name: 'OPENCODE_ENDPOINT', value: 'http://localhost:8080' }
            { name: 'OPENCODE_SECRET', secretRef: 'opencode-secret' }
            { name: 'ML_SERVICE_URL', value: 'http://localhost:8000' }
          ]
          volumeMounts: [
            { name: 'data', mountPath: '/app/data' }
          ]
        }
        {
          name: 'ml-service'
          image: '${acr.loginServer}/ml-service:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'PYTHONUNBUFFERED', value: '1' }
          ]
        }
        {
          name: 'opencode-backend'
          image: '${acr.loginServer}/${containerAppName}:latest'
          command: [
            'npx'
            '-y'
            'opencode-ai@1.18.2'
            'serve'
            '--port'
            '8080'
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'OPENCODE_SECRET', secretRef: 'jwt-secret' }
          ]
        }
      ]
      volumes: [
        {
          name: 'data'
          storageType: 'AzureFile'
          storageName: containerAppEnvStorageName
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output containerAppUrl string = 'https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io'
output acrLoginServer string = acr.loginServer
output openAiEndpoint string = openAi.properties.endpoint
output resourceGroupName string = resourceGroupName
