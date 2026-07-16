import { createService, subscribeToTopic, publishEvent } from "../../../packages/shared/src/service-template";
import { attributionRoutes } from "./routes/attribution";

const ctx = createService({
  name: "creative-attribution-service",
  port: parseInt(process.env.PORT || "3021"),
  databaseUrl: process.env.DATABASE_URL || "postgresql://kiki:kiki_dev_2024@localhost:5432/kiki",
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", attributionRoutes(ctx));

ctx.start().then(() => {
  console.log("[creative-attribution-service] Ready");
});

export default ctx;
