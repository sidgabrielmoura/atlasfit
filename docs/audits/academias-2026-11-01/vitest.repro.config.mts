import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ test: { environment: "node", include: ["docs/audits/academias-2026-11-01/reproducoes.test.ts"], alias: { "@": path.resolve(process.cwd(), "src") } } });
