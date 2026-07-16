import { createService } from "../../../packages/shared/src/service-template";
import { mmmRoutes } from "./routes/mmm";

const ctx = createService({
  name: "mmm-service",
  port: parseInt(process.env.PORT || "3022"),
  databaseUrl: process.env.DATABASE_URL || "postgresql://kiki:kiki_dev_2024@localhost:5432/kiki",
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", mmmRoutes(ctx));

ctx.start().then(() => {
  console.log("[mmm-service] Ready");
});

export default ctx;
