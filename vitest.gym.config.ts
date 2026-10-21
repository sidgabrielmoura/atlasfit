import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({ test: { environment: "node", include: ["tests/gym/**/*.integration.ts"], fileParallelism: false, testTimeout: 30_000, hookTimeout: 30_000, alias: { "@": path.resolve(__dirname, "src") } } });
