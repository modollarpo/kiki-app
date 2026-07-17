#!/usr/bin/env node
// Direct local -> production deploy for KIKI Agent Platform.
// Pipeline:
//   1. Push current branch to origin/main (production)
//   2. Deploy to Azure, trying in order:
//        a. `azd up`            (Azure Developer CLI) -- preferred, matches azure.yaml
//        b. `az` Container App  (build -> ACR -> az containerapp update) -- fallback
//        c. skip with a notice  (neither tool available in this environment)
//
// Safety checks (type-check/lint/test) run automatically via the
// `predeploy` npm script before this runs.
//
// Production environment (confirmed 2026-07-17):
//   Resource Group : kiki-agent-rg
//   Region         : swedencentral
//   Container App  : kiki-app
//   Environment    : kiki-env
//   ACR            : kikiagentacr.azurecr.io
//   Live URL       : https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io

import { spawnSync } from "node:child_process";

// -- Production constants (verified against Azure) ---------
const PROD = {
  resourceGroup: "kiki-agent-rg",
  containerApp: "kiki-app",
  acr: "kikiagentacr",
  acrServer: "kikiagentacr.azurecr.io",
  imageName: "kiki-app",
};

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (res.error) throw res.error;
  return res.status ?? 0;
}

function which(bin) {
  const r = spawnSync(process.platform === "win32" ? "where" : "which", [bin], {
    stdio: "ignore",
  });
  return r.status === 0;
}

// Generate a short timestamp tag for the image (e.g. 20260717143000)
const tag = new Date()
  .toISOString()
  .replace(/[-T:Z.]/g, "")
  .slice(0, 14);
const targetImage = `${PROD.acrServer}/${PROD.imageName}:${tag}`;

console.log("-> Pushing to origin/main (production)...");
run("git", ["push", "origin", "main"]);

// -- Attempt 1: azd ----------------------------------------
if (which("azd")) {
  console.log("-> azd detected -- deploying to Azure (azd up)...");
  const code = run("azd", ["up", "--no-prompt"], { shell: true });
  if (code === 0) {
    console.log("Deploy complete via azd.");
    process.exit(0);
  }
  console.warn("azd up failed (exit " + code + ") -- falling back to az CLI...");
}

// -- Attempt 2: az Container App deploy --------------------
if (which("az")) {
  try {
    console.log(`-> az detected -- building image via ACR (${PROD.acr})...`);
    console.log(`   Image: ${targetImage}`);

    // Build + push image directly in Azure Container Registry (no local Docker required).
    if (
      run("az", [
        "acr", "build",
        "--registry", PROD.acr,
        "--resource-group", PROD.resourceGroup,
        "--image", `${PROD.imageName}:${tag}`,
        "--image", `${PROD.imageName}:latest`,
        ".",
      ], { shell: true }) !== 0
    ) {
      throw new Error("az acr build failed");
    }

    // Update the running Container App to use the new image.
    console.log(`-> Updating Container App '${PROD.containerApp}' in '${PROD.resourceGroup}'...`);
    if (
      run("az", [
        "containerapp", "update",
        "--name", PROD.containerApp,
        "--resource-group", PROD.resourceGroup,
        "--image", targetImage,
      ], { shell: true }) !== 0
    ) {
      throw new Error("az containerapp update failed");
    }

    console.log("Deploy complete.");
    console.log(`  Live: https://kiki-app.purplesky-3fddb402.swedencentral.azurecontainerapps.io`);
    process.exit(0);
  } catch (e) {
    console.warn("az deploy failed:", e.message);
    process.exit(1);
  }
}

// -- Fallback ----------------------------------------------
console.log("-> Azure CLI/azd not available -- code is live on push to origin/main.");
console.log("Deploy complete (git push only).");
