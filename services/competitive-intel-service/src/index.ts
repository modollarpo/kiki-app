import { createService } from "../../../packages/shared/src/service-template";
import { serviceDatabaseUrl } from "../../../packages/shared/src/service-template/security";
import { competitiveRoutes } from "./routes/competitive";

const ctx = createService({
  name: "competitive-intel-service",
  port: parseInt(process.env.PORT || "3023"),
  databaseUrl: serviceDatabaseUrl(),
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", competitiveRoutes(ctx));

ctx.start().then(() => {
  console.log("[competitive-intel-service] Ready");
});

export default ctx;
