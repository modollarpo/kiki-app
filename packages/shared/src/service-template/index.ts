// ============================================================
// KIKI Agent™ — Service Template
// Reusable Express server skeleton for all microservices
// ============================================================

import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { Pool } from "pg";
import { Kafka, Producer, Consumer, EachMessagePayload } from "kafkajs";
import { createServiceAuthMiddleware, corsAllowedOrigins } from "./security";
import type { ServiceTokenPayload } from "./security";

// Attach the verified token claims to the Express request so route handlers
// can scope queries to the authenticated tenant.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: ServiceTokenPayload;
    }
  }
}

export interface ServiceConfig {
  name: string;
  port: number;
  databaseUrl: string;
  kafkaBrokers: string[];
  redisUrl?: string;
  healthCheckPath?: string;
}

export interface ServiceContext {
  app: express.Express;
  db: Pool;
  kafka: Kafka;
  producer: Producer;
  consumers: Consumer[];
  config: ServiceConfig;
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createService(config: ServiceConfig): ServiceContext {
  const app = express();
  // Internal services are not browser-facing. Only origins explicitly listed in
  // CORS_ALLOWED_ORIGINS are permitted; the default denies all cross-origin use.
  const allowedOrigins = corsAllowedOrigins();
  app.use(cors({ origin: allowedOrigins.length > 0 ? allowedOrigins : false }));
  app.use(express.json({ limit: "10mb" }));
  app.use(createServiceAuthMiddleware({ healthPath: config.healthCheckPath }));

  const db = new Pool({ connectionString: config.databaseUrl, max: 20 });
  const kafka = new Kafka({
    clientId: config.name,
    brokers: config.kafkaBrokers,
    retry: { initialRetryTime: 100, retries: 8 },
  });
  const producer = kafka.producer({ allowAutoTopicCreation: true });
  const consumers: Consumer[] = [];

  // Health check
  app.get(config.healthCheckPath || "/health", async (_req: Request, res: Response) => {
    try {
      await db.query("SELECT 1");
      res.json({ status: "healthy", service: config.name, timestamp: new Date().toISOString() });
    } catch (e) {
      res.status(503).json({ status: "unhealthy", error: String(e) });
    }
  });

  // Error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(`[${config.name}] Error:`, err.message);
    res.status(500).json({ error: err.message });
  });

  async function start() {
    await db.query("SELECT 1");
    console.log(`[${config.name}] Database connected`);

    await producer.connect();
    console.log(`[${config.name}] Kafka producer connected`);

    const host = process.env.HOST && process.env.HOST.length > 0 ? process.env.HOST : "0.0.0.0";
    app.listen(config.port, host, () => {
      console.log(`[${config.name}] Listening on ${host}:${config.port}`);
    });
  }

  async function stop() {
    for (const c of consumers) await c.disconnect();
    await producer.disconnect();
    await db.end();
    console.log(`[${config.name}] Stopped`);
  }

  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);

  return { app, db, kafka, producer, consumers, config, start, stop };
}

export async function subscribeToTopic(
  ctx: ServiceContext,
  topic: string,
  handler: (payload: EachMessagePayload) => Promise<void>
) {
  const consumer = ctx.kafka.consumer({ groupId: `${ctx.config.name}-${topic}` });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: false });
  await consumer.run({
    eachMessage: async (payload) => {
      try {
        await handler(payload);
      } catch (e) {
        console.error(`[${ctx.config.name}] Error processing ${topic}:`, e);
      }
    },
  });
  ctx.consumers.push(consumer);
}

export async function publishEvent(
  producer: Producer,
  topic: string,
  event: Record<string, unknown>
) {
  await producer.send({
    topic,
    messages: [{ key: event.eventId as string, value: JSON.stringify(event) }],
  });
}
