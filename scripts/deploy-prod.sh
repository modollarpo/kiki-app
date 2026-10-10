#!/usr/bin/env bash
# deploy-prod.sh — build in ACR and deploy to the production Container App.
# Mirrors .github/workflows/deploy.yml. Requires the Azure CLI (`az`) logged in.
# No local Docker needed (uses `az acr build` remote build).
#
# Usage:
#   ./scripts/deploy-prod.sh                 # auto tag: local-<timestamp>
#   ./scripts/deploy-prod.sh my-tag          # explicit tag
set -euo pipefail

ACR="kikiagentacrchrdtvff"
RG="kiki-agent-rg"
APP="kiki-app"

TAG="${1:-local-$(date +%Y%m%d%H%M%S)}"

# Ensure logged in to Azure
if ! az account show >/dev/null 2>&1; then
  az login
fi

echo "Building image kiki-app:${TAG} in ACR (remote build)..."
az acr build -r "${ACR}" -t "kiki-app:latest" -t "kiki-app:${TAG}" -f Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://keekii.net --build-arg NEXT_PUBLIC_SITE_URL=https://keekii.net .

echo "Deploying kiki-app:${TAG} to production Container App..."
az containerapp update -g "${RG}" -n "${APP}" --image "${ACR}.azurecr.io/kiki-app:${TAG}"

echo "Done. Production revision updated to kiki-app:${TAG}"
