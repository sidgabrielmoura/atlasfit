import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { cookies } from "next/headers";
import { auditedData, auditedEnrollmentEvent } from "./audit-context";
import { gymOperationalWorkspaceWhere } from "@/modules/workspaces/application/gym-license";
import { databasePoolConfig, databaseQuerySampleRate } from "./database-config";

const prismaClientSingleton = () => {
  const pool = new Pool(databasePoolConfig());
  const sampleRate = databaseQuerySampleRate();
  pool.on("error", () => console.error("[DATABASE_POOL]", { code: "IDLE_CONNECTION_ERROR" }));
  const adapter = new PrismaPg(pool);
  const baseClient = new PrismaClient({ adapter, log: sampleRate ? [{ emit: "event", level: "query" }] : [] });
  if (sampleRate) baseClient.$on("query", event => {
    if (Math.random() < sampleRate) console.info("[DATABASE_QUERY_SAMPLE]", { durationMs: event.duration, poolTotal: pool.totalCount, poolIdle: pool.idleCount, poolWaiting: pool.waitingCount });
  });

  return baseClient.$extends({
    query: {
      auditLog: {
        async create({ args, query }) { return query({ ...args, data: auditedData(args.data) }); },
        async createMany({ args, query }) { return query({ ...args, data: Array.isArray(args.data) ? args.data.map(auditedData) : auditedData(args.data) }); },
      },
      gymEnrollmentEvent: {
        async create({ args, query }) { return query({ ...args, data: auditedEnrollmentEvent(args.data) }); },
        async createMany({ args, query }) { return query({ ...args, data: Array.isArray(args.data) ? args.data.map(auditedEnrollmentEvent) : auditedEnrollmentEvent(args.data) }); },
      },
      workspaceMember: {
        async findFirst({ args, query }) {
          let activeWorkspaceId: string | undefined;
          try {
            const cookieStore = await cookies();
            activeWorkspaceId =
              cookieStore.get("atlasfit_active_workspace_id")?.value ||
              cookieStore.get("student_active_workspace_id")?.value;
          } catch (e) {
            // Ignore error when called outside Next.js request contexts
          }

          if (
            args.where &&
            args.where.userId &&
            args.where.role === "STUDENT" &&
            args.where.isActive === true
          ) {
            // A selected tenant is binding: never fall through to a different membership.
            const { role, ...where } = args.where;
            const selectedArgs = {
              ...args,
              where: {
                AND: [where, { OR: [
                  { role: "STUDENT" as const, roleGrants: { none: {} } },
                  { studentProfile: { isNot: null } },
                  { roleGrants: { some: { role: "STUDENT" as const, revokedAt: null } } },
                ] }, { OR: [{ workspace: { type: "PERSONAL" as const, isActive: true } }, { workspace: gymOperationalWorkspaceWhere() }] }],
                ...(activeWorkspaceId && !args.where.workspaceId ? { workspaceId: activeWorkspaceId } : {}),
              },
            };
            return query(selectedArgs);
          }

          // Fallback to default query (e.g. first active membership)
          return query(args);
        },
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
