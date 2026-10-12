// ============================================================
// Kafka Integration (KafkaJS) — Lazy init with in-memory fallback
// ============================================================

import { logger } from "./logger";
import { randomUUID } from "crypto";

export type KafkaMessage = {
  key?: string;
  value: string | Buffer;
  headers?: Record<string, string | Buffer>;
};

export type KafkaPublishOptions = {
  topic: string;
  messages: KafkaMessage[];
};

export type KafkaConsumerHandler = (payload: {
  topic: string;
  partition: number;
  message: KafkaMessage & { timestamp?: string };
}) => Promise<void>;

type InMemorySubscription = {
  topic: string;
  handler: KafkaConsumerHandler;
};

interface KafkaEachMessagePayload {
  topic: string;
  partition: number;
  message: {
    key?: Buffer | null;
    value: Buffer | null;
    timestamp?: string;
  };
}

interface KafkaProducerHandle {
  connect(): Promise<void>;
  send(record: {
    topic: string;
    messages: Array<{
      key?: string;
      value: string | Buffer;
      headers?: Record<string, string | Buffer>;
    }>;
  }): Promise<unknown>;
  disconnect(): Promise<void>;
}

interface KafkaConsumerHandle {
  connect(): Promise<void>;
  subscribe(config: { topic: string; fromBeginning: boolean }): Promise<void>;
  run(config: {
    eachMessage: (payload: KafkaEachMessagePayload) => Promise<void>;
  }): Promise<void>;
  disconnect(): Promise<void>;
}

interface KafkaInstance {
  producer(config: { allowAutoTopicCreation: boolean }): KafkaProducerHandle;
  consumer(config: { groupId: string }): KafkaConsumerHandle;
}

interface KafkaConstructor {
  new (config: {
    clientId: string;
    brokers: string[];
    retry: { initialRetryTime: number; retries: number };
  }): KafkaInstance;
}

const KAFKA_ENABLED = process.env.KAFKA_ENABLED === "true";
const KAFKA_BROKERS = (process.env.KAFKA_BROKERS || "")
  .split(",")
  .map((b) => b.trim())
  .filter(Boolean);

const KAFKA_CLIENT_ID = process.env.KAFKA_CLIENT_ID || "kiki-agent";
const KAFKA_GROUP_ID = process.env.KAFKA_GROUP_ID || "kiki-agent-group";

let kafkaLib: KafkaConstructor | null = null;
let producer: KafkaProducerHandle | null = null;
let consumers: Array<{ disconnect: () => Promise<void> }> = [];
let connecting = false;
let connected = false;
let inMemorySubs: Set<InMemorySubscription> = new Set();

function isKafkaActuallyEnabled(): boolean {
  // Enabled only if explicitly true AND brokers configured (or we allow but
  // fallback still applies). Be conservative and require brokers to avoid
  // noisy connection attempts in local dev.
  return KAFKA_ENABLED && KAFKA_BROKERS.length > 0;
}

async function loadKafka(): Promise<KafkaConstructor | null> {
  if (kafkaLib) return kafkaLib;
  try {
    const mod = await import("kafkajs");
    kafkaLib = (mod as { Kafka: KafkaConstructor }).Kafka;
    return kafkaLib;
  } catch (e) {
    logger.warn("[Kafka] kafkajs not available; using in-memory fallback", {
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

async function ensureProducer(): Promise<boolean> {
  if (!isKafkaActuallyEnabled()) return false;
  if (connected && producer) return true;
  if (connecting) {
    // Simple spin-wait small loop not needed; return connected state
    return connected;
  }
  connecting = true;
  try {
    const KafkaCtor = await loadKafka();
    if (!KafkaCtor) {
      connecting = false;
      return false;
    }
    const kafka = new KafkaCtor({
      clientId: KAFKA_CLIENT_ID,
      brokers: KAFKA_BROKERS,
      retry: { initialRetryTime: 100, retries: 5 },
    });
    producer = kafka.producer({ allowAutoTopicCreation: true });
    await producer.connect();
    connected = true;
    logger.info("[Kafka] Producer connected", {
      brokers: KAFKA_BROKERS,
    });
    return true;
  } catch (e) {
    logger.warn("[Kafka] Failed to connect producer; falling back to in-memory", {
      error: e instanceof Error ? e.message : String(e),
    });
    connected = false;
    producer = null;
    return false;
  } finally {
    connecting = false;
  }
}

async function publishToKafka(options: KafkaPublishOptions): Promise<void> {
  const ok = await ensureProducer();
  if (!ok || !producer) {
    // In-memory fallback: fan out to subscribers
    await fanoutInMemory(options);
    return;
  }
  try {
    await producer.send({
      topic: options.topic,
      messages: options.messages.map((m) => ({
        key: m.key,
        value: m.value,
        headers: m.headers,
      })),
    });
  } catch (e) {
    logger.warn("[Kafka] Publish failed; falling back to in-memory fanout", {
      topic: options.topic,
      error: e instanceof Error ? e.message : String(e),
    });
    await fanoutInMemory(options);
  }
}

async function fanoutInMemory(options: KafkaPublishOptions): Promise<void> {
  for (const sub of inMemorySubs) {
    if (sub.topic !== options.topic) continue;
    for (const m of options.messages) {
      try {
        await sub.handler({
          topic: options.topic,
          partition: 0,
          message: {
            key: m.key,
            value: m.value,
            timestamp: String(Date.now()),
          },
        });
      } catch (e) {
        logger.error("[Kafka] In-memory subscriber error", {
          topic: options.topic,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }
}

export async function publishEvent(
  topic: string,
  event: Record<string, unknown>
): Promise<void> {
  const eventId =
    (event.eventId as string) ||
    (event.id as string) ||
    `${topic}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const envelope = {
    eventId,
    eventType: (event.eventType as string) || topic,
    topic,
    tenantId: (event.tenantId as string) || null,
    timestamp: (event.timestamp as number) || Date.now(),
    version: (event.version as string) || "1.0.0",
    payload: event,
  };

  await publishToKafka({
    topic,
    messages: [
      {
        key: String(eventId),
        value: JSON.stringify(envelope),
      },
    ],
  });
}

export async function subscribe(
  topic: string,
  handler: KafkaConsumerHandler
): Promise<() => void> {
  const unsub = () => {
    inMemorySubs.delete(sub);
  };
  const sub: InMemorySubscription = { topic, handler };
  inMemorySubs.add(sub);

  // If Kafka enabled, also create a real consumer (best-effort; don't block)
  if (isKafkaActuallyEnabled()) {
    (async () => {
      try {
        const KafkaCtor = await loadKafka();
        if (!KafkaCtor) return;
        const kafka = new KafkaCtor({
          clientId: KAFKA_CLIENT_ID,
          brokers: KAFKA_BROKERS,
          retry: { initialRetryTime: 100, retries: 3 },
        });
        const consumer = kafka.consumer({
          groupId: `${KAFKA_GROUP_ID}-${topic}`,
        });
        await consumer.connect();
        await consumer.subscribe({ topic, fromBeginning: false });
        await consumer.run({
          eachMessage: async ({ topic: t, partition, message }: KafkaEachMessagePayload) => {
            try {
              await handler({
                topic: t,
                partition,
                message: {
                  key: message.key?.toString(),
                  value: message.value || "",
                  timestamp: message.timestamp,
                },
              });
            } catch (e) {
              logger.error("[Kafka] Consumer handler error", {
                topic: t,
                error: e instanceof Error ? e.message : String(e),
              });
            }
          },
        });
        consumers.push(consumer);
        logger.info("[Kafka] Consumer subscribed", { topic });
      } catch (e) {
        logger.warn("[Kafka] Failed to start Kafka consumer; using in-memory only", {
          topic,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();
  }

  return unsub;
}

export async function shutdown(): Promise<void> {
  for (const c of consumers) {
    try {
      await c.disconnect();
    } catch {}
  }
  consumers = [];
  if (producer) {
    try {
      await producer.disconnect();
    } catch {}
  }
  producer = null;
  connected = false;
  connecting = false;
  inMemorySubs.clear();
}

export function isEnabled(): boolean {
  return isKafkaActuallyEnabled();
}
