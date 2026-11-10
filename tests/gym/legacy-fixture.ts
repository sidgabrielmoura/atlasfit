import type prisma from "@/lib/prisma";
import type { GymTransactionClient } from "@/modules/workspaces/application/transaction";

/** Only for exercising defensive reads against records predating DB constraints. */
export function legacyFixture<T>(db: typeof prisma, create: (tx: GymTransactionClient) => Promise<T>) {
  const target = new URL(process.env.DATABASE_URL || "http://invalid");
  if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw Error("Legacy fixtures require the disposable database.");
  return db.$transaction(async tx => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
    return create(tx);
  });
}
