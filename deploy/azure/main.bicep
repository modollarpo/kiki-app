// ============================================================
// KIKI Agent™ — Azure Infrastructure (Bicep)
// Web App + PWA → Azure Static Web Apps / App Service
// API / Backend → Azure Kubernetes Service (AKS)
// Database → Azure Database for PostgreSQL Flexible Server
// Cache → Azure Cache for Redis
// Secrets → Azure Key Vault
// CDN → Azure Front Door (global)
// Registry → Azure Container Registry
// ============================================================

targetScope = 'resourceGroup'

@description('Environment: dev | staging | prod')
@allowed(['dev', 'staging', 'prod'])
param environment string = 'prod'

@description('Azure region')
param location string = resourceGroup().location

@description('Application name prefix')
param appName string = 'kiki-agent'

@description('PostgreSQL admin password')
@secure()
param pgAdminPassword string

@description('Redis auth key')
@secure()
param redisAuthKey string

var prefix = '${appName}-${environment}'
var tags = {
  application: 'KIKI Agent'
  environment: environment
  managed_by: 'bicep'
  team: 'platform'
}

// ─── Log Analytics Workspace ─────────────────────────────
resource logWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 90
  }
}

// ─── Azure Container Registry ─────────────────────────────
resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: replace('${prefix}acr', '-', '')
  location: location
  tags: tags
  sku: { name: environment == 'prod' ? 'Premium' : 'Standard' }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
    zoneRedundancy: environment == 'prod' ? 'Enabled' : 'Disabled'
  }
}

// ─── Key Vault ────────────────────────────────────────────
resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: '${prefix}-kv'
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    networkAcls: {
      defaultAction: 'Deny'
      bypass: 'AzureServices'
    }
  }
}

// ─── PostgreSQL Flexible Server ───────────────────────────
resource postgres 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' = {
  name: '${prefix}-pg'
  location: location
  tags: tags
  sku: {
    name: environment == 'prod' ? 'Standard_D8s_v3' : 'Standard_D2s_v3'
    tier: 'GeneralPurpose'
  }
  properties: {
    administratorLogin: 'kikidbadmin'
    administratorLoginPassword: pgAdminPassword
    version: '15'
    storage: {
      storageSizeGB: environment == 'prod' ? 512 : 128
    }
    backup: {
      backupRetentionDays: environment == 'prod' ? 35 : 7
      geoRedundantBackup: environment == 'prod' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: environment == 'prod' ? 'ZoneRedundant' : 'Disabled'
    }
  }
}

resource pgDatabase 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-03-01-preview' = {
  parent: postgres
  name: 'kiki_${environment}'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

// ─── Redis Cache ──────────────────────────────────────────
resource redis 'Microsoft.Cache/redis@2023-04-01' = {
  name: '${prefix}-redis'
  location: location
  tags: tags
  properties: {
    sku: {
      name: environment == 'prod' ? 'Premium' : 'Standard'
      family: environment == 'prod' ? 'P' : 'C'
      capacity: environment == 'prod' ? 1 : 1
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

// ─── AKS Cluster ──────────────────────────────────────────
resource aks 'Microsoft.ContainerService/managedClusters@2023-07-01' = {
  name: '${prefix}-aks'
  location: location
  tags: tags
  identity: { type: 'SystemAssigned' }
  properties: {
    kubernetesVersion: '1.29'
    dnsPrefix: '${prefix}-aks'
    enableRBAC: true
    aadProfile: {
      managed: true
      enableAzureRBAC: true
    }
    agentPoolProfiles: [
      {
        name: 'system'
        count: environment == 'prod' ? 3 : 1
        vmSize: environment == 'prod' ? 'Standard_D4s_v3' : 'Standard_D2s_v3'
        osType: 'Linux'
        mode: 'System'
        availabilityZones: environment == 'prod' ? ['1', '2', '3'] : []
        enableAutoScaling: true
        minCount: environment == 'prod' ? 3 : 1
        maxCount: environment == 'prod' ? 10 : 3
      }
      {
        name: 'app'
        count: environment == 'prod' ? 4 : 1
        vmSize: environment == 'prod' ? 'Standard_D8s_v3' : 'Standard_D2s_v3'
        osType: 'Linux'
        mode: 'User'
        enableAutoScaling: true
        minCount: environment == 'prod' ? 2 : 1
        maxCount: environment == 'prod' ? 20 : 5
        nodeLabels: { workload: 'app' }
      }
      {
        name: 'gpupool'
        count: 0
        vmSize: 'Standard_NC6s_v3'
        osType: 'Linux'
        mode: 'User'
        enableAutoScaling: true
        minCount: 0
        maxCount: environment == 'prod' ? 4 : 1
        nodeLabels: { workload: 'gpu-inference' }
        nodeTaints: ['gpu=true:NoSchedule']
      }
    ]
    addonProfiles: {
      omsagent: {
        enabled: true
        config: { logAnalyticsWorkspaceResourceID: logWorkspace.id }
      }
      azurepolicy: { enabled: true }
      azureKeyvaultSecretsProvider: { enabled: true }
    }
    networkProfile: {
      networkPlugin: 'azure'
      networkPolicy: 'calico'
      loadBalancerSku: 'standard'
    }
  }
}

// ─── ACR Pull permission for AKS ──────────────────────────
resource aksAcrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aks.id, acr.id, 'acrpull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: aks.properties.identityProfile.kubeletidentity.objectId
    principalType: 'ServicePrincipal'
  }
}

// ─── Azure Static Web Apps (Next.js) ──────────────────────
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: '${prefix}-web'
  location: 'eastus2'  // Static Web Apps available regions
  tags: tags
  sku: {
    name: environment == 'prod' ? 'Standard' : 'Free'
    tier: environment == 'prod' ? 'Standard' : 'Free'
  }
  properties: {
    repositoryUrl: 'https://github.com/kiki-agent/kiki-platform'
    branch: environment == 'prod' ? 'main' : environment
    buildProperties: {
      appLocation: '/'
      outputLocation: '.next'
      appBuildCommand: 'npm run build'
    }
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

// ─── Azure Front Door (CDN + WAF) ─────────────────────────
resource frontDoor 'Microsoft.Cdn/profiles@2023-05-01' = {
  name: '${prefix}-afd'
  location: 'Global'
  tags: tags
  sku: { name: 'Standard_AzureFrontDoor' }
}

resource afdEndpoint 'Microsoft.Cdn/profiles/afdEndpoints@2023-05-01' = {
  parent: frontDoor
  name: '${prefix}-endpoint'
  location: 'Global'
  properties: { enabledState: 'Enabled' }
}

resource afdOriginGroup 'Microsoft.Cdn/profiles/originGroups@2023-05-01' = {
  parent: frontDoor
  name: '${prefix}-origins'
  properties: {
    loadBalancingSettings: { sampleSize: 4, successfulSamplesRequired: 3 }
    healthProbeSettings: {
      probePath: '/api/health'
      probeRequestType: 'HEAD'
      probeProtocol: 'Https'
      probeIntervalInSeconds: 30
    }
  }
}

// ─── Application Insights ─────────────────────────────────
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-insights'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logWorkspace.id
    RetentionInDays: 90
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// ─── Outputs ──────────────────────────────────────────────
output acrLoginServer string = acr.properties.loginServer
output aksClusterName string = aks.name
output keyVaultUri string = keyVault.properties.vaultUri
output staticWebAppUrl string = staticWebApp.properties.defaultHostname
output postgresHost string = postgres.properties.fullyQualifiedDomainName
output redisHost string = redis.properties.hostName
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output frontDoorEndpoint string = afdEndpoint.properties.hostName
