import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", include: ["tests/services/**/*.external.ts"], exclude: ["tests/services/r2-http.external.ts"], fileParallelism: false, testTimeout: 60_000, hookTimeout: 60_000, alias: { "@": path.resolve(__dirname, "src") } } });
