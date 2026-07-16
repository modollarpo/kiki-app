import { createService } from "../../../packages/shared/src/service-template";
import { marginRoutes } from "./routes/margin";

const ctx = createService({
  name: "profit-margin-service",
  port: parseInt(process.env.PORT || "3024"),
  databaseUrl: process.env.DATABASE_URL || "postgresql://kiki:kiki_dev_2024@localhost:5432/kiki",
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", marginRoutes(ctx));

ctx.start().then(() => {
  console.log("[profit-margin-service] Ready");
});

export default ctx;
