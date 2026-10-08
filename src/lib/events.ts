import { logger } from "./logger";
// ============================================================
// Real-time Event System — Server-Sent Events for live updates
// ============================================================

type EventListener = (event: string, data: unknown) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface SSEClient {
  controller: ReadableStreamDefaultController;
  tenantId: string | null; // null = system-scoped (sees all events)
}

class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private sseClients: Set<SSEClient> = new Set();

  // Subscribe to events
  on(event: string, listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.listeners.get(event)?.delete(listener);
  }

  // Emit an event
  emit(event: string, data: unknown): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event, data);
        } catch (e) {
          logger.error(`[EventBus] Listener error for ${event}:`, { error: e instanceof Error ? (e).message : String(e) });
        }
      }
    }

    // Also push to SSE clients (tenant-scoped — never leak another
    // tenant's events to a browser session).
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const dataTenantId = isRecord(data) && typeof data.tenantId === "string" ? data.tenantId : undefined;

    for (const client of this.sseClients) {
      if (!this.shouldDeliver(client, event, dataTenantId)) continue;
      try {
        client.controller.enqueue(encoder.encode(payload));
      } catch {
        this.sseClients.delete(client);
      }
    }
  }

  private shouldDeliver(client: SSEClient, event: string, dataTenantId: string | undefined): boolean {
    // System-scoped clients (e.g. admin consoles) receive everything.
    if (!client.tenantId) return true;

    // Tenant-scoped events are only delivered to their own tenant.
    if (dataTenantId) return client.tenantId === dataTenantId;

    // Undifferentiated events fall through to a small system whitelist.
    return SYSTEM_EVENTS.has(event);
  }

  // Register SSE client
  addSSEClient(controller: ReadableStreamDefaultController, tenantId: string | null = null): void {
    this.sseClients.add({ controller, tenantId });
  }

  removeSSEClient(controller: ReadableStreamDefaultController): void {
    for (const client of this.sseClients) {
      if (client.controller === controller) {
        this.sseClients.delete(client);
        break;
      }
    }
  }

  get clientCount(): number {
    return this.sseClients.size;
  }
}

// Singleton event bus
export const eventBus = new EventBus();

// ── Predefined event types ────────────────────────────────
export const EVENTS = {
  // Agent events
  AGENT_STARTED: "agent:started",
  AGENT_COMPLETED: "agent:completed",
  AGENT_ERROR: "agent:error",

  // Signal events
  SIGNAL_INGESTED: "signal:ingested",
  SIGNAL_ENRICHED: "signal:enriched",

  // Campaign events
  CAMPAIGN_UPDATED: "campaign:updated",
  CAMPAIGN_BUDGET_CHANGED: "campaign:budget_changed",

  // LTV events
  LTV_PREDICTION: "ltv:prediction",

  // Fraud events
  FRAUD_DETECTED: "fraud:detected",
  FRAUD_BLOCKED: "fraud:blocked",

  // System events
  SYSTEM_METRIC: "system:metric",
  WALLET_UPDATED: "wallet:updated",

  // Wallet card lifecycle
  WALLET_CARD_FROZEN: "wallet:card_frozen",
  WALLET_CARD_UNFROZEN: "wallet:card_unfrozen",
  WALLET_UNFREEZE_REQUESTED: "wallet:unfreeze_requested",
} as const;

// Events that are safe to broadcast to every connected tenant. Everything
// else is only delivered to the tenant it belongs to (via a top-level
// `tenantId` field on the payload). Kept lean: tenant-scoped events that
// omit `tenantId` are not delivered to browsers until their emit sites are
// annotated (see GAP-REPORT).
const SYSTEM_EVENTS = new Set<string>([
  EVENTS.AGENT_STARTED,
  EVENTS.AGENT_COMPLETED,
  EVENTS.AGENT_ERROR,
  EVENTS.SYSTEM_METRIC,
]);
