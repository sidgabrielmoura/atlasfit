import { defineConfig } from "vitest/config";
import path from "node:path";

// Only prepares synthetic accounts for the browser runner; not a functional test count.
export default defineConfig({ test: { environment: "node", include: ["tests/gym/guardian-visual.fixture.ts"], fileParallelism: false, testTimeout: 30_000, alias: { "@": path.resolve(__dirname, "src") } } });
