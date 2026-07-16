import { createService } from "../../../packages/shared/src/service-template";
import { nlRoutes } from "./routes/query";

const ctx = createService({
  name: "nl-analytics-service",
  port: parseInt(process.env.PORT || "3025"),
  databaseUrl: process.env.DATABASE_URL || "postgresql://kiki:kiki_dev_2024@localhost:5432/kiki",
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", nlRoutes(ctx));

ctx.start().then(() => {
  console.log("[nl-analytics-service] Ready");
});

export default ctx;
