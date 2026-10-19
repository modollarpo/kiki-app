import { createService, subscribeToTopic, publishEvent } from "../../../packages/shared/src/service-template";
import { serviceDatabaseUrl } from "../../../packages/shared/src/service-template/security";
import { attributionRoutes } from "./routes/attribution";

const ctx = createService({
  name: "creative-attribution-service",
  port: parseInt(process.env.PORT || "3021"),
  databaseUrl: serviceDatabaseUrl(),
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", attributionRoutes(ctx));

ctx.start().then(() => {
  console.log("[creative-attribution-service] Ready");
});

export default ctx;
