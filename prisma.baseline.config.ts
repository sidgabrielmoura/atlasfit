import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Explicit baseline path; historical migrations stay intact for audit/rollback planning.
export default defineConfig({ schema: "prisma/schema.prisma", migrations: { path: "prisma/baseline-migrations" }, datasource: { url: env("DIRECT_URL") || env("DATABASE_URL") } });
