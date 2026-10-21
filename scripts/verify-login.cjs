require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function verify() {
  const users = [
    "academia@atlasfit.com",
    "recepcao@atlasfit.com",
    "professor@atlasfit.com",
    "aluna@atlasfit.com",
  ];

  for (const email of users) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaces: {
          include: {
            workspace: true,
            roleGrants: true,
          },
        },
      },
    });

    if (!user) {
      console.error(`❌ Usuário ${email} não encontrado.`);
      continue;
    }

    const match = await bcrypt.compare("admin123", user.password);
    console.log(`✅ [${email}]`);
    console.log(`   Nome: ${user.name}`);
    console.log(`   Senha 'admin123' válida: ${match}`);
    console.log(`   GlobalRole: ${user.role}`);
    console.log(`   Workspaces (${user.workspaces.length}):`);
    for (const member of user.workspaces) {
      console.log(`     - Workspace: ${member.workspace.name} (Tipo: ${member.workspace.type})`);
      console.log(`       MemberRole: ${member.role}`);
      console.log(`       RoleGrants: ${member.roleGrants.map((g) => g.role).join(", ")}`);
    }
  }
}

verify()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
