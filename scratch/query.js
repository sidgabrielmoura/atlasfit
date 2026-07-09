require("dotenv").config();
const prisma = require("../src/lib/prisma").default;

async function main() {
  console.log("=== DB QUERY ENGAGE ===");
  const now = new Date();
  
  // Find all active experiences
  const experiences = await prisma.engageExperience.findMany({
    include: {
      _count: {
        select: { userStatuses: true, eventLogs: true }
      }
    }
  });
  console.log("Total experiences in DB:", experiences.length);
  experiences.forEach(e => {
    console.log(`- ID: ${e.id}`);
    console.log(`  Title: ${e.title}`);
    console.log(`  Format: ${e.format}`);
    console.log(`  Status: ${e.status}`);
    console.log(`  WorkspaceId: ${e.workspaceId}`);
    console.log(`  StartDate: ${e.startDate}`);
    console.log(`  EndDate: ${e.endDate}`);
    console.log(`  Segmentation:`, JSON.stringify(e.segmentation));
  });

  // Find all workspace members
  const members = await prisma.workspaceMember.findMany({
    include: {
      user: { select: { email: true, role: true, objective: true } },
      workspace: { select: { name: true } }
    }
  });
  console.log("\nWorkspace Members in DB:", members.length);
  members.forEach(m => {
    console.log(`- User: ${m.user.email} (${m.user.role}, objective: ${m.user.objective})`);
    console.log(`  Workspace: ${m.workspace.name} (ID: ${m.workspaceId})`);
    console.log(`  Role: ${m.role}, isActive: ${m.isActive}`);
  });

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
