import crypto from "crypto";
import { getDb } from "./db";
import { logger } from "./logger";

export async function refreshTokenForIntegration(
  tenantId: string,
  platform: string,
  integrationId: string,
  refreshToken: string,
  refreshFn: (rt: string) => Promise<{ accessToken: string; refreshToken?: string; expiresAt: number }>
): Promise<boolean> {
  const db = await getDb();
  try {
    const result = await refreshFn(refreshToken);
    const newExpiry = new Date(result.expiresAt * 1000).toISOString();
    const encryptedToken = result.accessToken;

    await db.prepare(`
      UPDATE tenant_integrations
      SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
          token_expiry = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND tenant_id = ?
    `).run(encryptedToken, result.refreshToken || null, newExpiry, integrationId, tenantId);

    await db.prepare(`
      INSERT INTO token_refresh_log (tenant_id, platform, integration_id, status, old_expiry, new_expiry)
      VALUES (?, ?, ?, 'success', ?, ?)
    `).run(tenantId, platform, integrationId, null, newExpiry);

    logger.info(`Token refreshed for ${platform}`, { tenantId, platform });
    return true;
  } catch (error) {
    await db.prepare(`
      INSERT INTO token_refresh_log (tenant_id, platform, integration_id, status, error_message)
      VALUES (?, ?, ?, 'failed', ?)
    `).run(tenantId, platform, integrationId, String(error));

    logger.error(`Token refresh failed for ${platform}`, { tenantId, platform, error: String(error) });
    return false;
  }
}

export async function checkAndRefreshExpiringTokens(): Promise<number> {
  const db = await getDb();
  const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const expiring = await db.prepare(`
    SELECT id, tenant_id, platform, refresh_token, token_expiry
    FROM tenant_integrations
    WHERE status = 'active'
      AND refresh_token IS NOT NULL
      AND token_expiry IS NOT NULL
      AND token_expiry < ?
  `).all(oneHourFromNow) as Array<{
    id: string; tenant_id: string; platform: string; refresh_token: string; token_expiry: string;
  }>;

  if (expiring.length === 0) return 0;

  let refreshed = 0;
  for (const integ of expiring) {
    try {
      const { getConnector } = await import("./connectors");
      const connector = await getConnector(integ.platform as any);
      if (!connector) continue;

      const { decryptToken, encryptToken } = await import("./connectors/base");
      const rt = integ.refresh_token;

      const result = await connector.refreshToken(rt);
      const newExpiry = new Date(result.expiresAt * 1000).toISOString();

      await db.prepare(`
        UPDATE tenant_integrations
        SET access_token = ?, token_expiry = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(result.accessToken, newExpiry, integ.id);

      await db.prepare(`
        INSERT INTO token_refresh_log (tenant_id, platform, integration_id, status, old_expiry, new_expiry)
        VALUES (?, ?, ?, 'success', ?, ?)
      `).run(integ.tenant_id, integ.platform, integ.id, integ.token_expiry, newExpiry);

      refreshed++;
    } catch (error) {
      await db.prepare(`
        INSERT INTO token_refresh_log (tenant_id, platform, integration_id, status, error_message)
        VALUES (?, ?, ?, 'failed', ?)
      `).run(integ.tenant_id, integ.platform, integ.id, String(error));

      logger.error(`Proactive token refresh failed`, {
        tenantId: integ.tenant_id,
        platform: integ.platform,
        error: String(error),
      });
    }
  }

  if (refreshed > 0) {
    logger.info(`Refreshed ${refreshed} expiring tokens`);
  }
  return refreshed;
}
