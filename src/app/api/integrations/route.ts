export const dynamic = "force-dynamic";
export interface IntegrationRow {
  id: string;
  tenant_id: string;
  platform: string;
  access_token: string;
  refresh_token: string | null;
  token_expiry: string | null;
  config: string | null;
  connected_at: string | null;
  status: string;
  last_sync_at: string | null;
}

export interface OAuthStateRow {
  state: string;
  tenant_id: string;
  platform: string;
  code_verifier: string | null;
  created_at: string;
  expires_at: string;
}

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  getConnector,
  getConnectorConfig,
  listConnectors,
  getSupportedPlatforms,
  isPlatformSupported,
  sendConversionToAllPlatforms,
} from "@/lib/connectors";
import { encryptToken, decryptToken } from "@/lib/connectors/base";
import { type PlatformId } from "@/lib/connectors/types";
import { getUserFromRequest } from "@/lib/auth";
import { checkEnforcement } from "@/lib/tenant";
import { eventBus } from "@/lib/events";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const platform = searchParams.get("platform") as PlatformId | null;

    switch (action) {
      // ── List supported platforms ──────────────────────
      case "list": {
        return NextResponse.json({
          ok: true,
          data: listConnectors(),
        });
      }

      // ── Fetch campaigns from a platform ──────────────
      case "campaigns": {
        if (!platform || !isPlatformSupported(platform)) {
          return NextResponse.json(
            { ok: false, error: "Valid platform required (meta, google, tiktok, linkedin, snap, pinterest)" },
            { status: 400 }
          );
        }
        const integrationId = searchParams.get("integrationId");
        if (!integrationId) {
          return NextResponse.json(
            { ok: false, error: "integrationId required" },
            { status: 400 }
          );
        }

        const db = await getDb();
const integration = await db.prepare(`
          SELECT * FROM tenant_integrations WHERE id = ? AND tenant_id = ? AND status = 'active'
        `).get<IntegrationRow>(integrationId, user.tenantId);

        if (!integration) {
          return NextResponse.json(
            { ok: false, error: "No active integration found" },
            { status: 404 }
          );
        }

        const accessToken = decryptToken(integration.access_token);
        const connector = getConnector(platform);
        const config = JSON.parse(integration.config || "{}");
        const accountId = config.accountId || "";

        const result = await connector.listCampaigns(accessToken, accountId);
        return NextResponse.json({
          success: result.success,
          data: result.data,
          latencyMs: result.latencyMs,
        });
      }

      // ── Get OAuth URL ────────────────────────────────
      case "oauth_url": {
        if (!platform || !isPlatformSupported(platform)) {
          return NextResponse.json(
            { ok: false, error: "Valid platform required" },
            { status: 400 }
          );
        }

        const connector = getConnector(platform);
        const { url, state, codeVerifier } = await connector.generateOAuthUrl(user.tenantId);
        return NextResponse.json({ ok: true, data: { url, state, codeVerifier } });
      }

      // ── Send CAPI event to all platforms ─────────────
      case "capi_send": {
        const eventPayload = searchParams.get("event");
        if (!eventPayload) {
          return NextResponse.json(
            { ok: false, error: "event JSON required" },
            { status: 400 }
          );
        }

        const db = await getDb();
const integrations = await db.prepare(`
          SELECT * FROM tenant_integrations WHERE tenant_id = ? AND status = 'active'
        `).all<IntegrationRow>(user.tenantId);

        const results = [];
        for (const integration of integrations) {
          const platformId = integration.platform as PlatformId;
          if (!isPlatformSupported(platformId)) continue;

          try {
            const accessToken = decryptToken(integration.access_token);
            const connector = getConnector(platformId);
            const event = JSON.parse(eventPayload);
            const result = await connector.sendConversion(accessToken, event);
            results.push(result);
          } catch (error) {
            results.push({
              platform: platformId,
              success: false,
              latencyMs: 0,
              error: String(error),
            });
          }
        }

        return NextResponse.json({
          ok: true,
          data: {
delivered: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
          },
        });
      }

// ── Default: list connected platforms ─────────────
      default: {
        const db = await getDb();
        const rows = await db.prepare(`
          SELECT * FROM tenant_integrations WHERE tenant_id = ? AND status = 'active'
          ORDER BY connected_at DESC
        `).all<IntegrationRow>(user.tenantId);

        const platforms = rows.map(row => {
          const config = JSON.parse(row.config || "{}");
          return {
            id: row.id,
            platform: row.platform,
            status: row.status,
            accountName: config.accountName || "Connected Account",
            accountId: config.accountId || "",
            connectedAt: row.connected_at,
            lastSyncAt: row.last_sync_at,
          };
        });

        return NextResponse.json({ ok: true, data: platforms });
      }
    }
  } catch (error) {
    logger.error("integrations/GET", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const enf = await checkEnforcement(user.tenantId);
    if (!enf.allowed) return NextResponse.json({ ok: false, error: enf.reason || "Access denied" }, { status: 403 });

    const body = await req.json();
    const { action, platform, code, state, integrationId } = body;

    if (!platform || !isPlatformSupported(platform)) {
      return NextResponse.json(
        { ok: false, error: "Valid platform required" },
        { status: 400 }
      );
    }

    const connector = getConnector(platform);

    switch (action) {
      // ── Handle OAuth callback ────────────────────────
      case "oauth_callback": {
        if (!code || !state) {
          return NextResponse.json(
            { ok: false, error: "code and state required" },
            { status: 400 }
          );
        }

        // Verify state
        const db = await getDb();
const stateRecord = await db.prepare(`
          SELECT * FROM oauth_states WHERE state = ? AND tenant_id = ? AND platform = ?
          AND expires_at > datetime('now')
        `).get<OAuthStateRow>(state, user.tenantId, platform);

        if (!stateRecord) {
          return NextResponse.json(
            { ok: false, error: "Invalid or expired OAuth state" },
            { status: 400 }
          );
        }

        // Delete used state (retrieve code_verifier before deleting)
        const codeVerifier = stateRecord.code_verifier || undefined;
        await db.prepare("DELETE FROM oauth_states WHERE state = ?").run(state);

        // Exchange code for tokens (with PKCE verifier)
        const tokens = await connector.handleCallback(code, state, codeVerifier);

        // Get account info
        const accountResult = await connector.getAccountInfo(tokens.accessToken);
        const accountInfo = accountResult.data;

        // Store integration
        const integrationId = `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const encryptedAccessToken = encryptToken(tokens.accessToken);
        const encryptedRefreshToken = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

        await db.prepare(`
          INSERT INTO tenant_integrations
          (id, tenant_id, platform, status, access_token, refresh_token, token_expiry, config, connected_at)
          VALUES (?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'))
        `).run(
          integrationId,
          user.tenantId,
          platform,
          encryptedAccessToken,
          encryptedRefreshToken,
          tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
          JSON.stringify({
            accountId: accountInfo?.id || "",
            accountName: accountInfo?.name || "",
            ...accountInfo?.config,
          })
        );

// Emit event
        eventBus.emit("integration.connected", {
          tenantId: user.tenantId,
          platform,
          integrationId,
          accountName: accountInfo?.name,
        });

        return NextResponse.json({
          ok: true,
          data: {
            integrationId,
            platform,
            accountName: accountInfo?.name,
            status: "active",
          },
        });
      }

      // ── Connect using manually supplied credentials ───
      case "connect_manual": {
        const { accessToken, refreshToken, accountId, accountName, expiresAt } = body;
        if (!accessToken || typeof accessToken !== "string") {
          return NextResponse.json({ ok: false, error: "accessToken required" }, { status: 400 });
        }

        let validated = false;
        try {
          validated = await connector.validateToken(accessToken);
        } catch (e) {
          return NextResponse.json(
            { ok: false, error: `Credential validation failed: ${e instanceof Error ? e.message : String(e)}` },
            { status: 400 }
          );
        }
        if (!validated) {
          return NextResponse.json(
            { ok: false, error: "Credential validation failed. Check the token and permissions." },
            { status: 400 }
          );
        }

        let resolvedAccountId = typeof accountId === "string" ? accountId : "";
        let resolvedAccountName = typeof accountName === "string" ? accountName : "";
        try {
          const accountResult = await connector.getAccountInfo(accessToken);
          if (accountResult.success && accountResult.data) {
            resolvedAccountId = resolvedAccountId || accountResult.data.id || "";
            resolvedAccountName = resolvedAccountName || accountResult.data.name || "";
          }
        } catch { /* account info is optional */ }

        const db = await getDb();
        await db.prepare(`
          UPDATE tenant_integrations SET status = 'revoked', updated_at = datetime('now')
          WHERE tenant_id = ? AND platform = ? AND status = 'active'
        `).run(user.tenantId, platform);

        const newIntegrationId = `int_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await db.prepare(`
          INSERT INTO tenant_integrations
          (id, tenant_id, platform, status, access_token, refresh_token, token_expiry, config, connected_at)
          VALUES (?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'))
        `).run(
          newIntegrationId,
          user.tenantId,
          platform,
          encryptToken(accessToken),
          refreshToken ? encryptToken(String(refreshToken)) : null,
          typeof expiresAt === "string" ? expiresAt : null,
          JSON.stringify({ accountId: resolvedAccountId, accountName: resolvedAccountName })
        );

        eventBus.emit("integration.connected", {
          tenantId: user.tenantId,
          platform,
          integrationId: newIntegrationId,
          accountName: resolvedAccountName,
        });

        return NextResponse.json({
          ok: true,
          data: {
            integrationId: newIntegrationId,
            platform,
            accountId: resolvedAccountId,
            accountName: resolvedAccountName,
            status: "active",
          },
        });
      }

      // ── Disconnect platform ──────────────────────────
      case "disconnect": {
        const db = await getDb();
        await db.prepare(`
          UPDATE tenant_integrations SET status = 'revoked', updated_at = datetime('now')
          WHERE tenant_id = ? AND platform = ?
        `).run(user.tenantId, platform);

eventBus.emit("integration.disconnected", {
          tenantId: user.tenantId,
          platform,
        });

        return NextResponse.json({
          ok: true,
          message: `${platform} disconnected`,
        });
      }

      // ── Refresh token ────────────────────────────────
      case "refresh_token": {
        if (!integrationId) {
          return NextResponse.json(
            { ok: false, error: "integrationId required" },
            { status: 400 }
          );
        }

        const db = await getDb();
const integration = await db.prepare(`
          SELECT * FROM tenant_integrations WHERE id = ? AND tenant_id = ?
        `).get<IntegrationRow>(integrationId, user.tenantId);

        if (!integration) {
          return NextResponse.json(
            { ok: false, error: "Integration not found" },
            { status: 404 }
          );
        }

        const refreshToken = integration.refresh_token ? decryptToken(integration.refresh_token) : '';
        const tokens = await connector.refreshToken(refreshToken);

        // Update stored tokens
        await db.prepare(`
          UPDATE tenant_integrations
          SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
              token_expiry = ?, status = 'active', updated_at = datetime('now')
          WHERE id = ?
        `).run(
          encryptToken(tokens.accessToken),
          tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
          tokens.expiresAt ? new Date(tokens.expiresAt).toISOString() : null,
          integrationId
        );

        return NextResponse.json({
          ok: true,
          data: { message: "Token refreshed" },
        });
      }

      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("integrations/POST", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
