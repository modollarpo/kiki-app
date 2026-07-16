import { createService } from "../../../packages/shared/src/service-template";
import { influencerRoutes } from "./routes/influencer";

const ctx = createService({
  name: "influencer-service",
  port: parseInt(process.env.PORT || "3026"),
  databaseUrl: process.env.DATABASE_URL || "postgresql://kiki:kiki_dev_2024@localhost:5432/kiki",
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", influencerRoutes(ctx));

ctx.start().then(() => {
  console.log("[influencer-service] Ready");
});

export default ctx;
