import { createService } from "../../../packages/shared/src/service-template";
import { serviceDatabaseUrl } from "../../../packages/shared/src/service-template/security";
import { mmmRoutes } from "./routes/mmm";

const ctx = createService({
  name: "mmm-service",
  port: parseInt(process.env.PORT || "3022"),
  databaseUrl: serviceDatabaseUrl(),
  kafkaBrokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

ctx.app.use("/api", mmmRoutes(ctx));

ctx.start().then(() => {
  console.log("[mmm-service] Ready");
});

export default ctx;
