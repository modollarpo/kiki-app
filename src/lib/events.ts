import { logger } from "./logger";
// ============================================================
// Real-time Event System — Server-Sent Events for live updates
// ============================================================

type EventListener = (event: string, data: unknown) => void;

class EventBus {
  private listeners: Map<string, Set<EventListener>> = new Map();
  private sseClients: Set<ReadableStreamDefaultController> = new Set();

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

    // Also push to SSE clients
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const controller of this.sseClients) {
      try {
        controller.enqueue(new TextEncoder().encode(payload));
      } catch {
        this.sseClients.delete(controller);
      }
    }
  }

  // Register SSE client
  addSSEClient(controller: ReadableStreamDefaultController): void {
    this.sseClients.add(controller);
  }

  removeSSEClient(controller: ReadableStreamDefaultController): void {
    this.sseClients.delete(controller);
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
