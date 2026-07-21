export const dynamic = "force-dynamic";
// ============================================================
// KIKI Agent Platform — Platform Integrations API Route
// GET    /api/integrations          — List connected platforms
// POST   /api/integrations          — Connect/disconnect
// GET    /api/integrations/campaigns — Fetch campaigns from platforms
// GET    /api/integrations/oauth     — Generate OAuth URL
// POST   /api/integrations/callback  — Handle OAuth callback
// ============================================================

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
import { eventBus } from "@/lib/events";
import { logger, handleApiError } from "@/lib/logger";

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const platform = searchParams.get("platform") as PlatformId | null;

    switch (action) {
      // ── List supported platforms ──────────────────────
      case "list": {
        return NextResponse.json({
          success: true,
          data: listConnectors(),
        });
      }

      // ── Fetch campaigns from a platform ──────────────
      case "campaigns": {
        if (!platform || !isPlatformSupported(platform)) {
          return NextResponse.json(
            { success: false, error: "Valid platform required (meta, google, tiktok, linkedin, snap, pinterest)" },
            { status: 400 }
          );
        }
        const integrationId = searchParams.get("integrationId");
        if (!integrationId) {
          return NextResponse.json(
            { success: false, error: "integrationId required" },
            { status: 400 }
          );
        }

        const db = await getDb();
        const integration = await db.prepare(`
          SELECT * FROM tenant_integrations WHERE id = ? AND tenant_id = ? AND status = 'active'
        `).get(integrationId, user.tenantId) as any;

        if (!integration) {
          return NextResponse.json(
            { success: false, error: "No active integration found" },
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
            { success: false, error: "Valid platform required" },
            { status: 400 }
          );
        }

        const connector = getConnector(platform);
        const { url, state, codeVerifier } = await connector.generateOAuthUrl(user.tenantId);
        return NextResponse.json({ success: true, data: { url, state, codeVerifier } });
      }

      // ── Send CAPI event to all platforms ─────────────
      case "capi_send": {
        const eventPayload = searchParams.get("event");
        if (!eventPayload) {
          return NextResponse.json(
            { success: false, error: "event JSON required" },
            { status: 400 }
          );
        }

        const db = await getDb();
        const integrations = await db.prepare(`
          SELECT * FROM tenant_integrations WHERE tenant_id = ? AND status = 'active'
        `).all(user.tenantId) as any[];

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
          success: true,
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
        `).all(user.tenantId) as any[];

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

        return NextResponse.json({ success: true, data: platforms });
      }
    }
  } catch (error) {
    logger.error("integrations/GET", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, platform, code, state, integrationId } = body;

    if (!platform || !isPlatformSupported(platform)) {
      return NextResponse.json(
        { success: false, error: "Valid platform required" },
        { status: 400 }
      );
    }

    const connector = getConnector(platform);

    switch (action) {
      // ── Handle OAuth callback ────────────────────────
      case "oauth_callback": {
        if (!code || !state) {
          return NextResponse.json(
            { success: false, error: "code and state required" },
            { status: 400 }
          );
        }

        // Verify state
        const db = await getDb();
        const stateRecord = await db.prepare(`
          SELECT * FROM oauth_states WHERE state = ? AND tenant_id = ? AND platform = ?
          AND expires_at > datetime('now')
        `).get(state, user.tenantId, platform) as any;

        if (!stateRecord) {
          return NextResponse.json(
            { success: false, error: "Invalid or expired OAuth state" },
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
        eventBus.emit("integration.connected" as any, {
          tenantId: user.tenantId,
          platform,
          integrationId,
          accountName: accountInfo?.name,
        });

        return NextResponse.json({
          success: true,
          data: {
            integrationId,
            platform,
            accountName: accountInfo?.name,
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

        eventBus.emit("integration.disconnected" as any, {
          tenantId: user.tenantId,
          platform,
        });

        return NextResponse.json({
          success: true,
          message: `${platform} disconnected`,
        });
      }

      // ── Refresh token ────────────────────────────────
      case "refresh_token": {
        if (!integrationId) {
          return NextResponse.json(
            { success: false, error: "integrationId required" },
            { status: 400 }
          );
        }

        const db = await getDb();
        const integration = await db.prepare(`
          SELECT * FROM tenant_integrations WHERE id = ? AND tenant_id = ?
        `).get(integrationId, user.tenantId) as any;

        if (!integration) {
          return NextResponse.json(
            { success: false, error: "Integration not found" },
            { status: 404 }
          );
        }

        const refreshToken = decryptToken(integration.refresh_token);
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
          success: true,
          data: { message: "Token refreshed" },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error("integrations/POST", { message: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
