@description('Azure region for all resources')
param location string = 'swedencentral'

@description('Base name for resources (lowercase, alphanumeric)')
param baseName string = 'kiki'

@description('Azure OpenAI API version')
param openAiApiVersion string = '2024-10-21'

@description('Groq API key for fast bidding inference (leave empty to disable)')
@secure()
param groqApiKey string = ''

var resourceGroupName = '${baseName}-rg'
var acrName = replace('${baseName}acr', '-', '')
var envName = '${baseName}-env'
var containerAppName = '${baseName}-app'
var logAnalyticsName = '${baseName}-logs'
var storageName = replace('${baseName}store', '-', '')
var fileShareName = 'kikidata'
var openAiName = replace('${baseName}openai', '-', '')
var containerAppEnvStorageName = 'kikidata'

// Random-ish secrets (acceptable for demo; rotate in prod)
var jwtSecret = baseName
var encryptionKey = baseName

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
            { name: 'DATABASE_PATH', value: '/app/data/kiki.db' }
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
            { name: 'OPENCODE_ENDPOINT', value: '' }
            { name: 'OPENCODE_SECRET', value: '' }
          ]
          volumeMounts: [
            { name: 'data', mountPath: '/app/data' }
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

output containerAppUrl string = 'https://${containerAppName}.${location}.azurecontainerapps.io'
output acrLoginServer string = acr.loginServer
output openAiEndpoint string = openAi.properties.endpoint
output resourceGroupName string = resourceGroupName
