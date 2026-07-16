import { createService } from "../../../packages/shared/src/service-template";
import { competitiveRoutes } from "./routes/competitive";

const ctx = createService({
  name: "competitive-intel-service",
  port: parseInt(process.env.PORT || "3023"),
  databaseUrl: process.env.DATABASE_URL || "postgresql://kiki:kiki_dev_2024@localhost:5432/kiki",
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", competitiveRoutes(ctx));

ctx.start().then(() => {
  console.log("[competitive-intel-service] Ready");
});

export default ctx;
