<#
.SYNOPSIS
  Build the KIKI Agent image in ACR and deploy it to the production Container App.
.DESCRIPTION
  Mirrors .github/workflows/deploy.yml: builds remotely with `az acr build`
  (no local Docker needed), tags the image with a unique immutable tag, then
  rolls out a new Container App revision. Requires the Azure CLI (`az`) logged in.
.PARAMETER Tag
  Image tag to use. Defaults to local-<yyyyMMddHHmmss> (no git required).
#>
param(
  [string]$Tag
)

$ErrorActionPreference = "Continue"

$ACR = "kikiagentacrchrdtvff"
$RG  = "kiki-agent-rg"
$APP = "kiki-app"

if (-not $Tag) {
  $Tag = "local-" + (Get-Date -Format "yyyyMMddHHmmss")
}

# Ensure logged in to Azure
$acct = az account show --query id -o tsv 2>$null
if (-not $acct) {
  Write-Host "Not logged in to Azure - launching browser login..."
  az login | Out-Null
}

Write-Host "Building image kiki-app:$Tag in ACR (remote build)..."
az acr build -r $ACR -t "kiki-app:latest" -t "kiki-app:$Tag" -f Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://keekii.net --build-arg NEXT_PUBLIC_SITE_URL=https://keekii.net .
if ($LASTEXITCODE -ne 0) { throw "ACR build failed (exit $LASTEXITCODE)" }

Write-Host "Building ml-service:$Tag in ACR (remote build)..."
az acr build -r $ACR -t "ml-service:latest" -t "ml-service:$Tag" -f python-ml-service/Dockerfile python-ml-service/
if ($LASTEXITCODE -ne 0) { throw "ML service build failed (exit $LASTEXITCODE)" }

Write-Host "Deploying kiki-app:$Tag to production Container App..."
az containerapp update -g $RG -n $APP --image "$ACR.azurecr.io/kiki-app:$Tag"
if ($LASTEXITCODE -ne 0) { throw "Container App update failed (exit $LASTEXITCODE)" }

# Ensure required env vars are set (idempotent)
Write-Host "Setting environment variables..."
$envVars = @(
  "SEED_DEMO_DATA=true",
  "NEXT_PUBLIC_BASE_URL=https://$APP.purplesky-3fddb402.swedencentral.azurecontainerapps.io"
)
# Pass through SMTP vars if set in local env (for CI/CD pipelines)
if ($env:SMTP_HOST) { $envVars += "SMTP_HOST=$($env:SMTP_HOST)" }
if ($env:SMTP_PORT) { $envVars += "SMTP_PORT=$($env:SMTP_PORT)" }
if ($env:SMTP_USER) { $envVars += "SMTP_USER=$($env:SMTP_USER)" }
if ($env:SMTP_PASS) { $envVars += "SMTP_PASS=$($env:SMTP_PASS)" }
if ($env:SMTP_FROM) { $envVars += "SMTP_FROM=$($env:SMTP_FROM)" }
if ($env:SMTP_FROM_NAME) { $envVars += "SMTP_FROM_NAME=$($env:SMTP_FROM_NAME)" }
az containerapp update -g $RG -n $APP --set-env-vars $envVars
if ($LASTEXITCODE -ne 0) { throw "Env var update failed (exit $LASTEXITCODE)" }

Write-Host "Done. Production revision updated to kiki-app:$Tag (ml-service:$Tag available in ACR)"
