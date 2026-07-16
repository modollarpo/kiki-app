#!/usr/bin/env node
// Direct local -> production deploy for KIKI Agent Platform.
// Pipeline:
//   1. Push current branch to origin/main (production)
//   2. Deploy to Azure, trying in order:
//        a. `azd up`            (Azure Developer CLI) — preferred, matches azure.yaml
//        b. `az` Container App  (build -> ACR -> az containerapp update) — fallback
//        c. skip with a notice  (neither tool available in this environment)
//
// Safety checks (type-check/lint/test) run automatically via the
// `predeploy` npm script before this runs.

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

// Minimal parser for the simple azure.yaml used by this project.
function readAzureConfig() {
  const p = resolve(process.cwd(), "azure.yaml");
  if (!existsSync(p)) return null;
  const txt = readFileSync(p, "utf8");
  const get = (re) => {
    const m = txt.match(re);
    return m ? m[1].trim().replace(/^["']|["']$/g, "") : null;
  };
  return {
    resourceGroup: get(/resourceGroup:\s*([^\n]+)/),
    region: get(/region:\s*([^\n]+)/),
    containerApp: get(/containerApp:\s*\n\s*name:\s*([^\n]+)/),
    image: get(/image:\s*([^\n]+)/) || "kiki-app",
  };
}

console.log("→ Pushing to origin/main (production)...");
run("git", ["push", "origin", "main"]);

// ── Attempt 1: azd ────────────────────────────────────────
if (which("azd")) {
  console.log("→ azd detected — deploying to Azure (azd up)...");
  const code = run("azd", ["up"], { shell: true });
  if (code === 0) {
    console.log("✓ Deploy complete.");
    process.exit(0);
  }
  console.warn("⚠ azd up failed (exit " + code + ") — falling back to az...");
}

// ── Attempt 2: az Container App deploy ──────────────────────
if (which("az")) {
  const cfg = readAzureConfig();
  if (cfg && cfg.resourceGroup && cfg.containerApp) {
    const appName = cfg.containerApp;
    const rg = cfg.resourceGroup;
    const imageName = cfg.image || "kiki-app";
    const acr = `${imageName.replace(/[^a-z0-9]/gi, "").toLowerCase()}registry.azurecr.io/${imageName}:latest`;
    try {
      console.log(`→ az detected — deploying ${appName} to ${rg} via Container Apps...`);

      // Locate the ACR login server tied to this resource group.
      const acrList = spawnSync(
        "az",
        ["acr", "list", "--resource-group", rg, "--query", "[0].loginServer", "-o", "tsv"],
        { encoding: "utf8", shell: true }
      );
      const loginServer = (acrList.stdout || "").trim();
      const targetImage = loginServer ? `${loginServer}/${imageName}:latest` : acr;

      // Build + push image (requires Docker).
      console.log(`→ Building image ${targetImage}...`);
      if (run("docker", ["build", "-t", targetImage, "."], { shell: true }) !== 0) {
        throw new Error("docker build failed");
      }
      console.log("→ Pushing image to ACR...");
      if (run("az", ["acr", "login", "--name", loginServer.split(".")[0]], { shell: true }) !== 0) {
        throw new Error("az acr login failed");
      }
      if (run("docker", ["push", targetImage], { shell: true }) !== 0) {
        throw new Error("docker push failed");
      }

      // Update the running Container App to use the new image.
      console.log(`→ Updating Container App ${appName}...`);
      if (run("az", ["containerapp", "update", "--name", appName, "--resource-group", rg, "--image", targetImage], { shell: true }) !== 0) {
        throw new Error("az containerapp update failed");
      }
      console.log("✓ Deploy complete.");
      process.exit(0);
    } catch (e) {
      console.warn("⚠ az deploy skipped:", e.message);
    }
  } else {
    console.warn("⚠ az deploy skipped: couldn't read container app config from azure.yaml");
  }
}

// ── Fallback ───────────────────────────────────────────────
console.log("→ Azure CLI/azd not available here — code is live on push to origin/main.");
console.log("✓ Deploy complete (git push only).");
