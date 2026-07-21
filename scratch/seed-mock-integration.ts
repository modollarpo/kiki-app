import { getDb } from "../src/lib/db";
import { encryptToken } from "../src/lib/connectors/base";
import crypto from "crypto";

async function run() {
  const db = await getDb();
  console.log("Seeding mock Meta integration...");

  // Must match the tenant ID that seedIfEmpty() creates — see src/lib/db.ts:996
  const tenantId = "t1";
  const id = "ti_mock_" + crypto.randomBytes(4).toString("hex");

  // Encrypt "mock_meta_token" so the pipeline's decryptToken() step succeeds.
  // The Meta connector checks for accessToken === "mock_meta_token" in sendConversion (line 361)
  // and updateCampaign (line 433) to return simulated success.
  const encryptedToken = encryptToken("mock_meta_token");

  await db.prepare(`
    INSERT INTO tenant_integrations (
      id, tenant_id, platform, status, access_token, config, connected_at, updated_at
    ) VALUES (
      ?, ?, 'meta', 'active', ?, '{}', datetime('now'), datetime('now')
    )
  `).run(id, tenantId, encryptedToken);

  console.log("Successfully inserted mock Meta integration for tenant", tenantId);
  console.log("Encrypted token:", encryptedToken.slice(0, 50) + "...");
}

run().catch(console.error);
