// ============================================================
// Bridge: EventBus → Kafka (optional)
// ============================================================

import { eventBus } from "./events";
import { publishEvent, subscribe, isEnabled } from "./kafka";
import { KAFKA_TOPICS } from "../../packages/shared/src/events";
import { logger } from "./logger";

const EVENT_TOPIC_MAP: Record<string, string | undefined> = {
  "campaign:created": KAFKA_TOPICS.CAMPAIGN,
  "campaign:updated": KAFKA_TOPICS.CAMPAIGN,
  "campaign:paused": KAFKA_TOPICS.CAMPAIGN,
  "campaign:budget_changed": KAFKA_TOPICS.CAMPAIGN,
  "campaign:activated": KAFKA_TOPICS.CAMPAIGN,
  "signal:ingested": KAFKA_TOPICS.SIGNAL,
  "signal:enriched": KAFKA_TOPICS.SIGNAL,
  "agent:started": KAFKA_TOPICS.AGENT,
  "agent:completed": KAFKA_TOPICS.AGENT,
  "agent:error": KAFKA_TOPICS.AGENT,
  "ltv:prediction": KAFKA_TOPICS.LTV,
  "ltv:retrained": KAFKA_TOPICS.LTV,
  "fraud:detected": KAFKA_TOPICS.FRAUD,
  "fraud:block": KAFKA_TOPICS.FRAUD,
  "fraud:blocked": KAFKA_TOPICS.FRAUD,
  "wallet:updated": KAFKA_TOPICS.WALLET,
  "system:metric": KAFKA_TOPICS.SYSTEM,
  "system:alert": KAFKA_TOPICS.SYSTEM,
  "system:health": KAFKA_TOPICS.SYSTEM,
  "connector:synced": KAFKA_TOPICS.INTEGRATION,
  "connector:error": KAFKA_TOPICS.INTEGRATION,
  "bid:placed": KAFKA_TOPICS.APPROVALS,
  "bid:approved": KAFKA_TOPICS.APPROVALS,
  "bid:rejected": KAFKA_TOPICS.APPROVALS,
  "approval:created": KAFKA_TOPICS.APPROVALS,
  "approval:approved": KAFKA_TOPICS.APPROVALS,
  "approval:rejected": KAFKA_TOPICS.APPROVALS,
  "creative:fashion": KAFKA_TOPICS.CREATIVE,
  "creative:generated": KAFKA_TOPICS.CREATIVE,
  "creative:fatigue_detected": KAFKA_TOPICS.CREATIVE,
  "attribution:recorded": KAFKA_TOPICS.ATTRIBUTION,
  "attribution:model_changed": KAFKA_TOPICS.ATTRIBUTION,
  "nl_query:answered": KAFKA_TOPICS.NL_ANALYTICS,
  "mmm:scenario_calculated": KAFKA_TOPICS.MMM,
  "mmm:optimized": KAFKA_TOPICS.MMM,
  "margin:calculated": KAFKA_TOPICS.MARGIN,
  "competitor:tracked": KAFKA_TOPICS.COMPETITOR,
  "competitor:price_drop": KAFKA_TOPICS.COMPETITOR,
  "influencer:discovered": KAFKA_TOPICS.INFLUENCER,
  "influencer:campaign_created": KAFKA_TOPICS.INFLUENCER,
};

let bridged = false;

export function bridgeEventBusToKafka(): void {
  if (bridged) return;
  bridged = true;

  logger.info("[KafkaBridge] Bridging EventBus -> Kafka (enabled)", {
    enabled: isEnabled(),
  });

  const originalEmit = (eventBus as any).emit.bind(eventBus);
  (eventBus as any).emit = async function (event: string, data: unknown) {
    try {
      originalEmit(event, data);
    } catch (e) {
      logger.error("[KafkaBridge] In-process emit failed", {
        event,
        error: e instanceof Error ? e.message : String(e),
      });
    }

    const topic = EVENT_TOPIC_MAP[event];
    if (!topic) return;

    try {
      await publishEvent(topic, {
        eventType: event,
        ...(typeof data === "object" && data !== null ? data : { data }),
        _bridge: "eventbus-kafka",
      } as Record<string, unknown>);
    } catch (e) {
      logger.warn("[KafkaBridge] Failed to publish to Kafka", {
        event,
        topic,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  };
}

export async function bridgeKafkaToEventBus(): Promise<void> {
  // Optional: subscribe to Kafka topics and re-emit into in-process bus
  // Kept lazy to avoid connecting unless explicitly needed
  logger.info("[KafkaBridge] kafka->eventbus bridge not auto-subscribed (in-memory fanout already covers local)");
}

bridgeEventBusToKafka();
