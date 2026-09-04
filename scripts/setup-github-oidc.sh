#!/usr/bin/env bash
# setup-github-oidc.sh — Configure Azure federated identity credential for GitHub Actions OIDC
#
# Prerequisites:
#   1. GitHub repo: your-org/kiki-agent-platform
#   2. Azure CLI logged in with Owner permissions on the subscription
#   3. jq installed (or edit the JSON manually)
#
# Usage:
#   chmod +x scripts/setup-github-oidc.sh
#   ./scripts/setup-github-oidc.sh your-github-org/kiki-agent-platform
#
# After running:
#   1. Go to GitHub repo → Settings → Secrets and variables → Actions
#   2. Add these secrets:
#      - AZURE_CLIENT_ID: (output from this script)
#      - AZURE_TENANT_ID: (your Azure tenant ID)
#      - AZURE_SUBSCRIPTION_ID: (your Azure subscription ID)
#   3. Optionally add SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME

set -euo pipefail

REPO="${1:-}"
if [ -z "$REPO" ]; then
  echo "Usage: $0 <github-org/repo-name>"
  echo "Example: $0 my-org/kiki-agent-platform"
  exit 1
fi

RG="${RG:-kiki-agent-rg}"
OIDC_APP_NAME="${OIDC_APP_NAME:-github-actions-kiki}"

echo "==> Creating App Registration for GitHub OIDC..."
APP_ID=$(az ad app create \
  --display-name "$OIDC_APP_NAME" \
  --query appId -o tsv)

echo "==> Creating service principal..."
az ad sp create --id "$APP_ID" -o none

echo "==> Assigning Contributor role on resource group $RG..."
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
az role assignment create \
  --assignee "$APP_ID" \
  --role Contributor \
  --scope "/subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RG"

echo "==> Setting up federated identity credential for $REPO..."
cat > /tmp/oidc-cred.json <<EOF
{
  "name": "kiki-deploy",
  "issuer": "https://token.actions.githubusercontent.com",
  "subject": "repo:${REPO}:ref:refs/heads/main",
  "description": "OIDC for GitHub Actions deploy on main branch",
  "audiences": ["api://AzureADTokenExchange"]
}
EOF

# Wait for propagation
sleep 5

az ad app federated-credential create \
  --id "$APP_ID" \
  --parameters /tmp/oidc-cred.json

echo ""
echo "=== GitHub Actions Secrets to add ==="
echo "AZURE_CLIENT_ID:       $APP_ID"
echo "AZURE_TENANT_ID:       $(az account show --query tenantId -o tsv)"
echo "AZURE_SUBSCRIPTION_ID: $SUBSCRIPTION_ID"
echo ""
echo "Optional SMTP secrets (if you want email from CI):"
echo "SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_FROM_NAME"
echo ""
echo "Done. The CI/CD pipeline in .github/workflows/ci.yml is ready to run."
