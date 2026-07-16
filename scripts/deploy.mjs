#!/usr/bin/env node
// Direct local -> production deploy for KIKI Agent Platform.
// 1. Push current branch to origin/main (production)
// 2. Deploy to Azure via `azd up` — only if the Azure Developer CLI is installed
//
// Safety checks (type-check/lint/test) run automatically via the
// `predeploy` npm script before this runs.

import { spawnSync } from "node:child_process";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    process.exitCode = res.status ?? 1;
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

console.log("→ Pushing to origin/main (production)...");
run("git", ["push", "origin", "main"]);

try {
  const azd = spawnSync(process.platform === "win32" ? "where" : "which", ["azd"], {
    stdio: "ignore",
    shell: true,
  });
  if (azd.status === 0) {
    console.log("→ azd detected — deploying to Azure...");
    run("azd", ["up"]);
  } else {
    console.log("→ azd not installed — skipped Azure deploy (code is live on push).");
  }
} catch (e) {
  console.warn("⚠ Azure deploy skipped:", e.message);
}

console.log("✓ Deploy complete.");
