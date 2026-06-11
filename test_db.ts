import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

process.env.DATABASE_URL = "postgresql://neondb_owner:npg_JnFU0bktwKf4@ep-twilight-darkness-aq36niz9-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== ALL WORKOUT LOGS IN DATABASE ===");
  try {
    const logs = await prisma.workoutLog.findMany({
      include: {
        student: {
          select: {
            name: true,
            email: true,
          }
        },
        workout: {
          select: {
            name: true,
          }
        }
      }
    });

    console.log(`Total logs found in database: ${logs.length}`);
    for (const log of logs) {
      console.log(`- ID: ${log.id}`);
      console.log(`  Student: ${log.student?.name} (${log.studentId})`);
      console.log(`  Workout: ${log.workout?.name} (${log.workoutId})`);
      console.log(`  WorkspaceId: ${log.workspaceId}`);
      console.log(`  CompletedAt: ${log.completedAt.toISOString()}`);
      console.log(`  Loads: ${JSON.stringify(log.loads)}`);
      console.log(`  Reps: ${JSON.stringify(log.reps)}`);
      console.log("---------------------------------------");
    }

    console.log("\n=== ALL WORKSPACE MEMBERS ===");
    const members = await prisma.workspaceMember.findMany({
      include: {
        user: {
          select: {
            name: true,
          }
        }
      }
    });
    for (const member of members) {
      console.log(`- Member ID: ${member.id}`);
      console.log(`  User: ${member.user?.name} (${member.userId})`);
      console.log(`  WorkspaceId: ${member.workspaceId}`);
      console.log(`  Role: ${member.role}`);
      console.log(`  IsActive: ${member.isActive}`);
      console.log("---------------------------------------");
    }

  } catch (error: any) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
