import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { cookies } from "next/headers";

const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const baseClient = new PrismaClient({ adapter });

  return baseClient.$extends({
    query: {
      workspaceMember: {
        async findFirst({ args, query }) {
          let activeWorkspaceId: string | undefined;
          try {
            const cookieStore = await cookies();
            activeWorkspaceId = cookieStore.get("student_active_workspace_id")?.value;
          } catch (e) {
            // Ignore error when called outside Next.js request contexts
          }

          if (
            activeWorkspaceId &&
            args.where &&
            args.where.userId &&
            args.where.role === "STUDENT" &&
            args.where.isActive === true &&
            !args.where.workspaceId
          ) {
            // Try searching for the member in the selected workspace first
            const selectedArgs = {
              ...args,
              where: {
                ...args.where,
                workspaceId: activeWorkspaceId,
              },
            };
            const result = await query(selectedArgs);
            if (result) return result;
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
