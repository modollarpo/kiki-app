import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    env: {
      JWT_SECRET: "test-jwt-secret-at-least-32-characters-long",
      ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      DATABASE_PATH: path.join(process.cwd(), "test", ".test-kiki.db"),
      SEED_DEMO_DATA: "true",
      DEMO_USER_PASSWORD: "password123",
      DEMO_ADMIN_PASSWORD: "admin123",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
