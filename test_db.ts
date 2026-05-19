import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Testing connection within workspace...");
  try {
    const workspaces = await prisma.workspace.findMany({ take: 1 });
    console.log("Workspaces found:", workspaces);

    const plans = await prisma.workspacePlan.findMany();
    console.log("Workspace plans:", plans);
  } catch (error: any) {
    console.error("CRITICAL DATABASE ERROR DETECTED:", error.message || error);
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
