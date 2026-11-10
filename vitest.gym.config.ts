import { defineConfig } from "vitest/config";
import path from "node:path";
const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Integração exige o PostgreSQL descartável documentado; banco publicado não é aceito.");
export default defineConfig({ test: {
  environment: "node", globals: true, include: ["tests/gym/**/*.integration.ts"],
  alias: { "@": path.resolve(__dirname, "src") }, fileParallelism: false, testTimeout: 60000, hookTimeout: 30000,
  env: { DIRECT_URL: process.env.DATABASE_URL!, ABLY_API_KEY: "", RESEND_API_KEY: "", ASAAS_API_KEY: "", ABACATEPAY_API_KEY: "", RATE_LIMIT_STORE: "memory", AUTH_SECRET: "isolated-gym-test-secret-not-for-production" },
} });
