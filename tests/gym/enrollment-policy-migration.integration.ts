import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { serializableTransaction, type GymTransactionClient } from "@/modules/workspaces/application/transaction";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => prisma.$disconnect());
const migration = readFileSync("prisma/migrations/20261005010000_gym_single_live_enrollment/migration.sql", "utf8").split("-- MIGRATION_INDEX");
if (migration.length !== 2) throw new Error("Revise a estrutura da migration.");
async function shadow(tx: GymTransactionClient) {
  // The real migration SQL resolves this session-local table, never the public data.
  await tx.$executeRawUnsafe('CREATE TEMP TABLE "GymEnrollment" ("id" TEXT PRIMARY KEY, "workspaceId" TEXT NOT NULL, "studentMemberId" TEXT NOT NULL, "status" "GymEnrollmentStatus" NOT NULL) ON COMMIT DROP');
  const resolved = await tx.$queryRaw<Array<{ temporary: boolean }>>`SELECT c.relpersistence = 't' AS temporary FROM pg_class c WHERE c.oid = to_regclass('"GymEnrollment"')`;
  if (resolved[0]?.temporary !== true) throw new Error("A migration precisa resolver somente a tabela temporária.");
}
describe("Migration de matrícula vigente única", () => {
  it("o índice impede escritor direto duplicado e permite histórico, empresas diferentes e substituição atômica", async () => serializableTransaction(async tx => {
    await shadow(tx);
    for (const sql of migration) await tx.$executeRawUnsafe(sql);
    await tx.$executeRawUnsafe(`INSERT INTO "GymEnrollment" VALUES ('a','gym','student','ACTIVE'),('old','gym','student','CANCELLED'),('other','another-gym','student','ACTIVE')`);
    await tx.$executeRawUnsafe("SAVEPOINT duplicate_test");
    await expect(tx.$executeRawUnsafe(`INSERT INTO "GymEnrollment" VALUES ('b','gym','student','PAUSED')`)).rejects.toThrow();
    await tx.$executeRawUnsafe("ROLLBACK TO SAVEPOINT duplicate_test");
    await tx.$executeRawUnsafe(`UPDATE "GymEnrollment" SET "status"='CANCELLED' WHERE "id"='a'`);
    await tx.$executeRawUnsafe(`INSERT INTO "GymEnrollment" VALUES ('next','gym','student','ACTIVE')`);
    const count = await tx.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*) AS count FROM "GymEnrollment" WHERE "workspaceId"='gym' AND "status" IN ('ACTIVE','PAUSED')`;
    expect(count[0].count).toBe(BigInt(1));
  }));
  it("preflight recusa duplicidades legadas sem modificar ou escolher contratos", async () => {
    await expect(serializableTransaction(async tx => {
      await shadow(tx);
      await tx.$executeRawUnsafe(`INSERT INTO "GymEnrollment" VALUES ('a','gym','student','ACTIVE'),('b','gym','student','PAUSED')`);
      await tx.$executeRawUnsafe(migration[0]);
    })).rejects.toThrow(/Reconcile duplicate live GYM enrollments/);
  });
});
