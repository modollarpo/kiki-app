@description('Azure region for all resources')
param location string = 'swedencentral'

@description('Base name for resources (lowercase, alphanumeric)')
param baseName string = 'kiki'

@description('Azure OpenAI API version')
param openAiApiVersion string = '2024-10-21'

@description('Groq API key for fast bidding inference (leave empty to disable)')
@secure()
param groqApiKey string = ''

@description('OpenCode agent backend secret (reuse existing credential; auto-derived from baseName if empty)')
@secure()
param opencodeSecret string = ''

@description('PostgreSQL connection string for the app (DATABASE_URL). Required for production; omit only for local SQLite fallback.')
@secure()
param databaseUrl string = ''

@description('Azure Speech Services API key (leave empty to use Groq-only STT)')
@secure()
param azureSpeechKey string = ''

@description('Azure AI Translator API key (leave empty to use LibreTranslate-only)')
@secure()
param azureTranslatorKey string = ''

@description('Google OAuth client ID for SSO (leave empty to disable Google SSO)')
@secure()
param googleOAuthClientId string = ''

@description('Google OAuth client secret for SSO (leave empty to disable Google SSO)')
@secure()
param googleOAuthClientSecret string = ''

@description('SMTP host for transactional email (leave empty to disable email)')
param smtpHost string = ''

@description('SMTP port (default 587)')
param smtpPort string = '587'

@description('SMTP username')
@secure()
param smtpUser string = ''

@description('SMTP password')
@secure()
param smtpPass string = ''

@description('SMTP from address')
param smtpFrom string = ''

@description('SMTP from name')
param smtpFromName string = 'KIKI Agent'

var resourceGroupName = 'kiki-agent-rg'
var uniqueSuffix = substring(uniqueString(subscription().subscriptionId, location, baseName), 0, 8)
var acrName = 'kikiagentacr${uniqueSuffix}'
var envName = '${baseName}-env'
var containerAppName = '${baseName}-app'
var logAnalyticsName = '${baseName}-logs'
var storageName = replace('${baseName}store${uniqueSuffix}', '-', '')
var fileShareName = 'kikidata'
var openAiName = replace('${baseName}openai${uniqueSuffix}', '-', '')
var containerAppEnvStorageName = 'kikidata'

// Deterministic, sufficiently-long secrets derived from baseName so a redeploy
// without explicit params does not fall back to the 4-char "kiki" default.
var jwtSecret = '${base64(substring(toLower(replace(baseName, '-', '')), 0, 1))}${baseName}7f3c9a1b2e4d5c6f8a9b0c1d2e3f4a5b'
var encryptionKey = substring(concat(uniqueString('${baseName}-encryption-1'), uniqueString('${baseName}-encryption-2'), uniqueString('${baseName}-encryption-3'), uniqueString('${baseName}-encryption-4'), uniqueString('${baseName}-encryption-5')), 0, 64)
var opencodeSecretResolved = empty(opencodeSecret) ? substring(concat(uniqueString('${baseName}-opencode-1'), uniqueString('${baseName}-opencode-2'), uniqueString('${baseName}-opencode-3'), uniqueString('${baseName}-opencode-4'), uniqueString('${baseName}-opencode-5')), 0, 64) : opencodeSecret

// -- Log Analytics (for Container App logs) ----------------
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
  }
}

// -- Container App Environment ------------------------------
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

// -- Azure Container Registry ------------------------------
resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: {
    adminUserEnabled: true
  }
}

// -- Storage Account + File Share (SQLite persistence) ------
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

// -- Azure OpenAI ------------------------------------------
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

// -- Container App ------------------------------------------
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
      secrets: union(
        [
          { name: 'registry-password', value: acr.listCredentials().passwords[0].value }
          { name: 'openai-key', value: openAi.listKeys().key1 }
          { name: 'jwt-secret', value: jwtSecret }
          { name: 'encryption-key', value: encryptionKey }
          { name: 'opencode-secret', value: opencodeSecretResolved }
        ],
        empty(groqApiKey) ? [] : [{ name: 'groq-api-key', value: groqApiKey }],
        empty(databaseUrl) ? [] : [{ name: 'db-url', value: databaseUrl }],
        empty(azureSpeechKey) ? [] : [{ name: 'azure-speech-key', value: azureSpeechKey }],
        empty(azureTranslatorKey) ? [] : [{ name: 'azure-translator-key', value: azureTranslatorKey }],
        empty(googleOAuthClientId) ? [] : [{ name: 'google-oauth-client-id', value: googleOAuthClientId }],
        empty(googleOAuthClientSecret) ? [] : [{ name: 'google-oauth-client-secret', value: googleOAuthClientSecret }],
        empty(smtpUser) ? [] : [{ name: 'smtp-user', value: smtpUser }],
        empty(smtpPass) ? [] : [{ name: 'smtp-pass', value: smtpPass }]
      )
      registries: [
        {
          server: '${acr.properties.loginServer}'
          username: acr.name
          passwordSecretRef: 'registry-password'
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'kiki-web'
          image: '${acr.properties.loginServer}/${containerAppName}:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: union(
            [
              { name: 'NODE_ENV', value: 'production' }
              { name: 'PORT', value: '3000' }
              { name: 'NEXT_PUBLIC_API_URL', value: 'https://${containerAppName}.${location}.azurecontainerapps.io' }
              { name: 'NEXT_PUBLIC_BASE_URL', value: 'https://${containerAppName}.${location}.azurecontainerapps.io' }
              { name: 'AZURE_OPENAI_ENDPOINT', value: openAi.properties.endpoint }
              { name: 'AZURE_OPENAI_API_KEY', secretRef: 'openai-key' }
              { name: 'AZURE_OPENAI_API_VERSION', value: openAiApiVersion }
              { name: 'AZURE_OPENAI_DEPLOYMENT_STANDARD', value: 'gpt-4o' }
              { name: 'AZURE_OPENAI_DEPLOYMENT_MINI', value: 'gpt-4.1-mini' }
              { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
              { name: 'ENCRYPTION_KEY', secretRef: 'encryption-key' }
              { name: 'GROQ_MODEL', value: 'openai/gpt-oss-20b' }
              { name: 'BIDDING_INTERVAL_MS', value: '300000' }
              { name: 'OPENCODE_ENDPOINT', value: 'http://localhost:8080' }
              { name: 'OPENCODE_SECRET', secretRef: 'opencode-secret' }
              { name: 'ML_SERVICE_URL', value: 'http://localhost:8000' }
              { name: 'LIBRE_TRANSLATE_URL', value: 'http://libretranslate:5000' }
              { name: 'AZURE_SPEECH_REGION', value: location }
              { name: 'AZURE_TRANSLATOR_REGION', value: location }
              { name: 'SEED_DEMO_DATA', value: 'false' }
              { name: 'SMTP_HOST', value: smtpHost }
              { name: 'SMTP_PORT', value: smtpPort }
              { name: 'SMTP_FROM', value: smtpFrom }
              { name: 'SMTP_FROM_NAME', value: smtpFromName }
            ],
            empty(groqApiKey) ? [] : [{ name: 'GROQ_API_KEY', secretRef: 'groq-api-key' }],
            empty(databaseUrl) ? [] : [{ name: 'DATABASE_URL', secretRef: 'db-url' }],
            empty(azureSpeechKey) ? [] : [{ name: 'AZURE_SPEECH_KEY', secretRef: 'azure-speech-key' }],
            empty(azureTranslatorKey) ? [] : [{ name: 'AZURE_TRANSLATOR_KEY', secretRef: 'azure-translator-key' }],
            empty(googleOAuthClientId) ? [] : [{ name: 'GOOGLE_OAUTH_CLIENT_ID', secretRef: 'google-oauth-client-id' }],
            empty(googleOAuthClientSecret) ? [] : [{ name: 'GOOGLE_OAUTH_CLIENT_SECRET', secretRef: 'google-oauth-client-secret' }],
            empty(smtpUser) ? [] : [{ name: 'SMTP_USER', secretRef: 'smtp-user' }],
            empty(smtpPass) ? [] : [{ name: 'SMTP_PASS', secretRef: 'smtp-pass' }]
          )
          volumeMounts: [
            { volumeName: 'data', mountPath: '/app/data' }
          ]
        }
        {
          name: 'ml-service'
          image: '${acr.properties.loginServer}/ml-service:latest'
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
          image: '${acr.properties.loginServer}/${containerAppName}:latest'
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
            { name: 'OPENCODE_SECRET', secretRef: 'opencode-secret' }
          ]
        }
        {
          name: 'libretranslate'
          image: 'libretranslate/libretranslate:latest'
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            { name: 'LT_LOAD_ONLY', value: 'en,es,fr,de,it,pt,zh,ja,ko,ar,ru,sv,da,nl,pl,tr,th,vi' }
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
output acrLoginServer string = acr.properties.loginServer
output openAiEndpoint string = openAi.properties.endpoint
output resourceGroupName string = resourceGroupName
