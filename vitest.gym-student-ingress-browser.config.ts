import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", include: ["tests/gym/student-ingress-browser.fixture.ts"], fileParallelism: false, testTimeout: 30_000, alias: { "@": path.resolve(__dirname, "src") } } });
