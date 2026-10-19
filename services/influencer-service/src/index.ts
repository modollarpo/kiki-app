import { createService } from "../../../packages/shared/src/service-template";
import { serviceDatabaseUrl } from "../../../packages/shared/src/service-template/security";
import { influencerRoutes } from "./routes/influencer";

const ctx = createService({
  name: "influencer-service",
  port: parseInt(process.env.PORT || "3026"),
  databaseUrl: serviceDatabaseUrl(),
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", influencerRoutes(ctx));

ctx.start().then(() => {
  console.log("[influencer-service] Ready");
});

export default ctx;
