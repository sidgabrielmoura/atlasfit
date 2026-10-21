import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { withCommandAudit } from "@/lib/audit-context";
export type GymTransactionClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Unique request claims can conflict instead of raising a serialization failure. */
export async function idempotentSerializableTransaction<T>(operation: (tx: GymTransactionClient) => Promise<T>): Promise<T> {
  try { return await serializableTransaction(operation); }
  catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    // Re-enter permission and fingerprint checks; no unchecked receipt is returned.
    return serializableTransaction(operation);
  }
}

/** All reads establishing an invariant must occur inside this callback. */
export async function serializableTransaction<T>(operation: (tx: GymTransactionClient) => Promise<T>): Promise<T> {
  return withCommandAudit(() => executeSerializableTransaction(operation));
}

async function executeSerializableTransaction<T>(operation: (tx: GymTransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 30_000 });
    } catch (error) {
      const queryConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      // PostgreSQL row-lock conflicts exposed by $queryRaw keep their SQLSTATE in P2010.
      const rawConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010" && (error.meta?.code === "40001" || error.meta?.code === "40P01");
      const rawAdapter = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010" ? error.meta?.driverAdapterError : null;
      const rawAdapterConflict = typeof rawAdapter === "object" && rawAdapter !== null && "cause" in rawAdapter && typeof rawAdapter.cause === "object" && rawAdapter.cause !== null && "kind" in rawAdapter.cause && rawAdapter.cause.kind === "TransactionWriteConflict";
      // Prisma 7 adapter-pg can expose the commit conflict directly, outside RequestHandler.
      const commitConflict = error instanceof Error && "cause" in error && typeof error.cause === "object" && error.cause !== null && "kind" in error.cause && error.cause.kind === "TransactionWriteConflict";
      const adapterCause = error instanceof Error && "cause" in error ? error.cause : null;
      const adapterDeadlock = typeof adapterCause === "object" && adapterCause !== null && "originalCode" in adapterCause && (adapterCause.originalCode === "40P01" || adapterCause.originalCode === "40001");
      if ((!queryConflict && !rawConflict && !rawAdapterConflict && !commitConflict && !adapterDeadlock) || attempt >= 4) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * 2 ** attempt + Math.floor(Math.random() * 20)));
    }
  }
}

/** Reporting does not establish write invariants. Keep all facts in a read-only snapshot. */
export function reportReadTransaction<T>(operation: (tx: GymTransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    return operation(tx);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, maxWait: 10_000, timeout: 30_000 });
}
