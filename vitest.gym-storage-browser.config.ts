import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", include: ["tests/gym/storage-browser.fixture.ts"], fileParallelism: false, testTimeout: 30000, alias: { "@": path.resolve(__dirname, "src") } } });
