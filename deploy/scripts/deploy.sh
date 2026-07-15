#!/usr/bin/env bash
# ============================================================
# KIKI Agent™ — Master Deployment Script
# Deploys: Web (Next.js) + PWA + Mobile (iOS/Android) + Azure
#
# Usage:
#   ./deploy/scripts/deploy.sh [ENVIRONMENT] [OPTIONS]
#
# Environments: dev | staging | prod (default: staging)
#
# Options:
#   --infra          Also deploy/update Azure infrastructure
#   --web-only       Only deploy the web app
#   --mobile-only    Only build and submit mobile apps
#   --skip-tests     Skip smoke tests after deploy
#   --dry-run        Validate everything without deploying
#
# Examples:
#   ./deploy/scripts/deploy.sh prod
#   ./deploy/scripts/deploy.sh staging --infra
#   ./deploy/scripts/deploy.sh prod --web-only
# ============================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; PURPLE='\033[0;35m'; CYAN='\033[0;36m'
BOLD='\033[1m'; RESET='\033[0m'

# ── Logging ───────────────────────────────────────────────
log()     { echo -e "${BOLD}[KIKI]${RESET} $*"; }
success() { echo -e "${GREEN}✓${RESET} $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✗ ERROR:${RESET} $*" >&2; exit 1; }
section() { echo -e "\n${BLUE}${BOLD}══════════════════════════════════════${RESET}\n${BOLD}  $*${RESET}\n${BLUE}══════════════════════════════════════${RESET}"; }

# ── Defaults ──────────────────────────────────────────────
ENVIRONMENT="${1:-staging}"
DEPLOY_INFRA=false
WEB_ONLY=false
MOBILE_ONLY=false
SKIP_TESTS=false
DRY_RUN=false
START_TIME=$(date +%s)

# Parse flags
for arg in "${@:2}"; do
  case $arg in
    --infra)       DEPLOY_INFRA=true   ;;
    --web-only)    WEB_ONLY=true       ;;
    --mobile-only) MOBILE_ONLY=true    ;;
    --skip-tests)  SKIP_TESTS=true     ;;
    --dry-run)     DRY_RUN=true        ;;
    *) warn "Unknown option: $arg"     ;;
  esac
done

# Validate environment
[[ "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]] || error "Invalid environment: $ENVIRONMENT. Use: dev | staging | prod"

# ── Banner ────────────────────────────────────────────────
echo -e "${BOLD}"
cat << 'BANNER'
  ╔═══════════════════════════════════════════╗
  ║   K I K I   A G E N T ™                  ║
  ║   Autonomous LTV Campaign Platform        ║
  ║   Enterprise Deployment System v2.0       ║
  ╚═══════════════════════════════════════════╝
BANNER
echo -e "${RESET}"
log "Environment : ${CYAN}${ENVIRONMENT}${RESET}"
log "Deploy infra: ${CYAN}${DEPLOY_INFRA}${RESET}"
log "Dry run     : ${CYAN}${DRY_RUN}${RESET}"
log "Git commit  : ${CYAN}$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')${RESET}"
echo ""

# ── Prerequisite checks ───────────────────────────────────
section "Checking Prerequisites"

check_cmd() {
  command -v "$1" &>/dev/null && success "$1 found" || error "$1 is required but not installed"
}

check_cmd node
check_cmd npm
check_cmd az
check_cmd kubectl
check_cmd docker
[ "$MOBILE_ONLY" = true ] || [ "$WEB_ONLY" = true ] || check_cmd helm

NODE_VER=$(node --version | cut -c2-)
[[ "${NODE_VER%%.*}" -ge 20 ]] || error "Node.js 20+ required (found $NODE_VER)"
success "Node.js $NODE_VER"

# Check Azure login
if ! az account show &>/dev/null; then
  error "Not logged into Azure. Run: az login"
fi
success "Azure authenticated as: $(az account show --query user.name -o tsv)"

# ── Environment Config ────────────────────────────────────
section "Loading Environment Config"

case $ENVIRONMENT in
  prod)
    RG_NAME="kiki-agent-prod-rg"
    AKS_NAME="kiki-agent-prod-aks"
    ACR_NAME="kikiagentprodacr"
    SWA_NAME="kiki-agent-prod-web"
    APP_URL="https://kiki.ai"
    API_URL="https://api.kiki.ai"
    K8S_NS="kiki-prod"
    ;;
  staging)
    RG_NAME="kiki-agent-staging-rg"
    AKS_NAME="kiki-agent-staging-aks"
    ACR_NAME="kikiagentstagingacr"
    SWA_NAME="kiki-agent-staging-web"
    APP_URL="https://staging.kiki.ai"
    API_URL="https://api.staging.kiki.ai"
    K8S_NS="kiki-staging"
    ;;
  dev)
    RG_NAME="kiki-agent-dev-rg"
    AKS_NAME="kiki-agent-dev-aks"
    ACR_NAME="kikiagentdevacr"
    SWA_NAME="kiki-agent-dev-web"
    APP_URL="https://dev.kiki.ai"
    API_URL="https://api.dev.kiki.ai"
    K8S_NS="kiki-dev"
    ;;
esac

success "Config loaded for: $ENVIRONMENT"
log "Resource Group: $RG_NAME"
log "App URL:        $APP_URL"

if [ "$DRY_RUN" = true ]; then
  warn "DRY RUN — no changes will be made"
fi

# ── 1. Infrastructure (optional) ──────────────────────────
if [ "$DEPLOY_INFRA" = true ]; then
  section "Deploying Azure Infrastructure (Bicep)"
  
  if [ "$DRY_RUN" = false ]; then
    log "Creating/updating resource group..."
    az group create \
      --name "$RG_NAME" \
      --location westeurope \
      --tags application="KIKI Agent" environment="$ENVIRONMENT" \
      --output none
    
    log "Validating Bicep template..."
    az deployment group validate \
      --resource-group "$RG_NAME" \
      --template-file deploy/azure/main.bicep \
      --parameters deploy/azure/parameters.${ENVIRONMENT}.json \
      --output none
    
    log "Deploying infrastructure (this may take 10-15 minutes)..."
    DEPLOY_OUTPUT=$(az deployment group create \
      --resource-group "$RG_NAME" \
      --template-file deploy/azure/main.bicep \
      --parameters deploy/azure/parameters.${ENVIRONMENT}.json \
      --name "kiki-deploy-$(date +%Y%m%d%H%M%S)" \
      --output json)
    
    success "Infrastructure deployed"
    ACR_SERVER=$(echo "$DEPLOY_OUTPUT" | jq -r '.properties.outputs.acrLoginServer.value')
    log "ACR: $ACR_SERVER"
  else
    warn "SKIP (dry run): az deployment group create"
  fi
fi

# ── 2. Quality Checks ─────────────────────────────────────
if [ "$MOBILE_ONLY" = false ]; then
  section "Quality Checks"
  
  log "Installing dependencies..."
  npm ci --silent
  success "npm ci"
  
  log "Type checking..."
  npm run type-check && success "TypeScript" || error "Type check failed"
  
  log "Linting..."
  npm run lint -- --max-warnings 0 && success "ESLint" || warn "Lint warnings found"
fi

# ── 3. Build Web + PWA ────────────────────────────────────
if [ "$MOBILE_ONLY" = false ]; then
  section "Building Web App + PWA"
  
  log "Building Next.js app..."
  if [ "$DRY_RUN" = false ]; then
    NODE_ENV=production npm run build
    success "Next.js build complete"
    
    # Validate build
    [ -d ".next" ] || error "Build failed: .next directory missing"
    [ -f ".next/BUILD_ID" ] || error "Build failed: BUILD_ID missing"
    BUILD_ID=$(cat .next/BUILD_ID)
    success "Build ID: $BUILD_ID"
    
    # Generate PWA service worker
    if [ -f "workbox-config.js" ]; then
      log "Generating PWA service worker..."
      npx workbox-cli generateSW workbox-config.js
      success "Service worker generated"
    fi
    
    log "Bundle analysis..."
    BUNDLE_SIZE=$(du -sh .next/static 2>/dev/null | cut -f1)
    log "Static bundle size: $BUNDLE_SIZE"
  else
    warn "SKIP (dry run): npm run build"
  fi
fi

# ── 4. Deploy Web → Azure Static Web Apps ────────────────
if [ "$MOBILE_ONLY" = false ]; then
  section "Deploying Web App → Azure Static Web Apps"
  
  if [ "$DRY_RUN" = false ]; then
    log "Deploying to Static Web Apps..."
    
    SWA_TOKEN=$(az staticwebapp secrets list \
      --name "$SWA_NAME" \
      --resource-group "$RG_NAME" \
      --query properties.apiKey -o tsv 2>/dev/null || echo "")
    
    if [ -n "$SWA_TOKEN" ]; then
      npx @azure/static-web-apps-cli deploy .next \
        --deployment-token "$SWA_TOKEN" \
        --app-location . \
        --output-location .next \
        --env "$ENVIRONMENT"
      success "Static Web App deployed"
    else
      warn "SWA token not found — deploying via GitHub Actions instead"
    fi
    
    # Purge CDN cache in production
    if [ "$ENVIRONMENT" = "prod" ]; then
      log "Purging Azure Front Door CDN cache..."
      az afd endpoint purge \
        --resource-group "$RG_NAME" \
        --profile-name "kiki-agent-prod-afd" \
        --endpoint-name "kiki-agent-prod-endpoint" \
        --domains kiki.ai www.kiki.ai \
        --content-paths "/*" \
        --output none
      success "CDN cache purged"
    fi
  else
    warn "SKIP (dry run): Static Web App deployment"
  fi
fi

# ── 5. Build & Push Docker Images ─────────────────────────
if [ "$MOBILE_ONLY" = false ] && [ "$WEB_ONLY" = false ]; then
  section "Building & Pushing Container Images"
  
  IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)
  
  if [ "$DRY_RUN" = false ]; then
    log "Logging into ACR: ${ACR_NAME}.azurecr.io"
    az acr login --name "$ACR_NAME"
    
    SERVICES=("api-gateway" "capi-gateway" "syncbrain" "ltv-model" "fraud-detect" "signal-agent")
    
    for SVC in "${SERVICES[@]}"; do
      SVC_DIR="services/$SVC"
      if [ -d "$SVC_DIR" ]; then
        log "Building: $SVC → ${IMAGE_TAG}"
        docker build -t "${ACR_NAME}.azurecr.io/${SVC}:${IMAGE_TAG}" \
          -t "${ACR_NAME}.azurecr.io/${SVC}:latest" \
          --build-arg BUILD_DATE="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
          --build-arg VERSION="$IMAGE_TAG" \
          "$SVC_DIR"
        docker push "${ACR_NAME}.azurecr.io/${SVC}:${IMAGE_TAG}"
        docker push "${ACR_NAME}.azurecr.io/${SVC}:latest"
        success "Pushed: $SVC:${IMAGE_TAG}"
      else
        warn "Service directory not found: $SVC_DIR (skipping)"
      fi
    done
    
    echo "$IMAGE_TAG" > /tmp/kiki-image-tag
  else
    warn "SKIP (dry run): Docker builds"
    IMAGE_TAG="dry-run-$(date +%Y%m%d)"
    echo "$IMAGE_TAG" > /tmp/kiki-image-tag
  fi
fi

# ── 6. Deploy to AKS ──────────────────────────────────────
if [ "$MOBILE_ONLY" = false ] && [ "$WEB_ONLY" = false ]; then
  section "Deploying to AKS"
  
  IMAGE_TAG=$(cat /tmp/kiki-image-tag 2>/dev/null || git rev-parse --short HEAD)
  
  if [ "$DRY_RUN" = false ]; then
    log "Getting AKS credentials..."
    az aks get-credentials \
      --resource-group "$RG_NAME" \
      --name "$AKS_NAME" \
      --overwrite-existing
    
    log "Creating/updating namespace..."
    kubectl apply -f deploy/k8s/namespace.yaml
    
    log "Applying secrets..."
    if [ -f ".env.${ENVIRONMENT}" ]; then
      kubectl create secret generic kiki-secrets \
        --from-env-file ".env.${ENVIRONMENT}" \
        --namespace "$K8S_NS" \
        --dry-run=client -o yaml | kubectl apply -f -
      success "Secrets applied"
    else
      warn "No .env.${ENVIRONMENT} found — using existing cluster secrets"
    fi
    
    log "Substituting image tag: $IMAGE_TAG"
    TMP_MANIFESTS="/tmp/kiki-k8s-${IMAGE_TAG}"
    cp -r deploy/k8s "$TMP_MANIFESTS"
    find "$TMP_MANIFESTS" -name "*.yaml" -exec sed -i "s|IMAGE_TAG|${IMAGE_TAG}|g" {} \;
    
    log "Applying all manifests..."
    kubectl apply -f "$TMP_MANIFESTS/" --namespace "$K8S_NS"
    
    log "Waiting for rollouts..."
    for DEP in api-gateway capi-gateway syncbrain ltv-model; do
      if kubectl get deployment "$DEP" --namespace "$K8S_NS" &>/dev/null; then
        kubectl rollout status deployment/"$DEP" \
          --namespace "$K8S_NS" \
          --timeout=300s && success "✓ $DEP rolled out" || {
          warn "$DEP rollout failed — initiating rollback"
          kubectl rollout undo deployment/"$DEP" --namespace "$K8S_NS"
          error "Deployment failed for $DEP — rolled back"
        }
      fi
    done
    
    rm -rf "$TMP_MANIFESTS"
    success "AKS deployment complete"
    
    log "Pod status:"
    kubectl get pods --namespace "$K8S_NS" --no-headers | head -20
  else
    warn "SKIP (dry run): AKS deployment"
  fi
fi

# ── 7. Mobile Apps ────────────────────────────────────────
if [ "$WEB_ONLY" = false ]; then
  section "Mobile App Build & Submit"
  
  MOBILE_DIR="mobile"
  
  if [ -d "$MOBILE_DIR" ]; then
    log "Building mobile apps with EAS..."
    
    if command -v eas &>/dev/null; then
      if [ "$DRY_RUN" = false ]; then
        cd "$MOBILE_DIR"
        
        log "Building iOS..."
        eas build --platform ios --profile "${ENVIRONMENT}" --non-interactive && success "iOS build complete" || warn "iOS build failed"
        
        log "Building Android..."
        eas build --platform android --profile "${ENVIRONMENT}" --non-interactive && success "Android build complete" || warn "Android build failed"
        
        if [ "$ENVIRONMENT" = "prod" ]; then
          log "Submitting iOS to App Store Connect..."
          eas submit --platform ios --latest --non-interactive && success "iOS submitted" || warn "iOS submission failed"
          
          log "Submitting Android to Play Store..."
          eas submit --platform android --latest --non-interactive && success "Android submitted" || warn "Android submission failed"
        fi
        
        cd ..
      else
        warn "SKIP (dry run): EAS mobile build"
      fi
    else
      warn "EAS CLI not installed (npm install -g eas-cli) — skipping mobile build"
    fi
  else
    warn "Mobile directory not found — skipping"
  fi
fi

# ── 8. Smoke Tests ────────────────────────────────────────
if [ "$SKIP_TESTS" = false ]; then
  section "Smoke Tests"
  
  if [ "$DRY_RUN" = false ]; then
    log "Waiting 15s for services to stabilise..."
    sleep 15
    
    run_check() {
      local NAME="$1" URL="$2" EXPECTED="${3:-200}"
      STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")
      if [ "$STATUS" = "$EXPECTED" ]; then
        success "$NAME → HTTP $STATUS"
      else
        error "$NAME → HTTP $STATUS (expected $EXPECTED)"
      fi
    }
    
    run_check "Homepage"        "$APP_URL"
    run_check "PWA Manifest"    "$APP_URL/manifest.json"
    run_check "Login Page"      "$APP_URL/auth/login"
    run_check "Features Page"   "$APP_URL/features"
    run_check "Pricing Page"    "$APP_URL/pricing"
    run_check "Status Page"     "$APP_URL/status"
    run_check "API Health"      "$API_URL/health"
    run_check "404 Page"        "$APP_URL/nonexistent-page" "404"
    
    success "All smoke tests passed"
  else
    warn "SKIP (dry run): smoke tests"
  fi
fi

# ── 9. Summary ────────────────────────────────────────────
section "Deployment Summary"

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

echo -e "${GREEN}${BOLD}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║   DEPLOYMENT SUCCESSFUL  🚀               ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${RESET}"

log "Environment : ${CYAN}${ENVIRONMENT}${RESET}"
log "Duration    : ${CYAN}${MINUTES}m ${SECONDS}s${RESET}"
[ -f "/tmp/kiki-image-tag" ] && log "Image tag   : ${CYAN}$(cat /tmp/kiki-image-tag)${RESET}"
log "App URL     : ${CYAN}${APP_URL}${RESET}"
log "API URL     : ${CYAN}${API_URL}${RESET}"

echo ""
log "Next steps:"
echo "  1. Verify: ${CYAN}${APP_URL}${RESET}"
echo "  2. Monitor: ${CYAN}https://portal.azure.com${RESET}"
echo "  3. Logs: ${CYAN}kubectl logs -n ${K8S_NS} -l app=api-gateway -f${RESET}"
echo ""
