import { PrismaClient, GlobalRole, WorkspaceRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.systemSetting.deleteMany();
  await prisma.systemIntegration.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.muscleGroup.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.freeTrial.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionActivity.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create SuperAdmin
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const superAdmin = await prisma.user.create({
    data: {
      name: "AtlasFit Admin",
      email: "admin@atlasfit.com",
      password: hashedPassword,
      role: GlobalRole.SUPERADMIN,
    },
  });

  // 2. Create Plans
  const starterPlan = await prisma.plan.create({
    data: {
      name: "Starter",
      price: 149.0,
      features: "Até 50 alunos, Suporte via Email, Dashboard Básico",
      maxWorkspaces: 1,
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: "Professional",
      price: 299.0,
      features: "Alunos ilimitados, Suporte Prioritário, White Label, Dashboards Avançados",
      maxWorkspaces: 5,
    },
  });

  // 3. Create Users (Trainers)
  const trainer1 = await prisma.user.create({
    data: {
      name: "Ricardo Silva",
      email: "ricardo@assessoria.com",
      password: hashedPassword,
      role: GlobalRole.TRAINER,
    },
  });

  const trainer2 = await prisma.user.create({
    data: {
      name: "Amanda Costa",
      email: "amanda@fitcoach.com",
      password: hashedPassword,
      role: GlobalRole.TRAINER,
    },
  });

  // Trainer 3: Carlos Teste (Trial Ativo, 5 dias restantes)
  const trainer3 = await prisma.user.create({
    data: {
      name: "Carlos Teste (Free Trial)",
      email: "trial_trainer@assessoria.com",
      password: hashedPassword,
      role: GlobalRole.TRAINER,
    },
  });

  // Trainer 4: Bruna Expirada (Trial Expirado, 3 dias atrás)
  const trainer4 = await prisma.user.create({
    data: {
      name: "Bruna Expirada (Ex-Trial)",
      email: "expired_trainer@assessoria.com",
      password: hashedPassword,
      role: GlobalRole.TRAINER,
    },
  });

  const now = new Date();

  // Ricardo Silva (Expired Free Trial, but Active Subscription)
  await prisma.freeTrial.create({
    data: {
      userId: trainer1.id,
      startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      isActive: false,
    },
  });

  // Amanda Costa (Expired Free Trial, but Active Subscription)
  await prisma.freeTrial.create({
    data: {
      userId: trainer2.id,
      startDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      isActive: false,
    },
  });

  // Carlos Teste (Active Trial - started 5 days ago, ends in 5 days)
  await prisma.freeTrial.create({
    data: {
      userId: trainer3.id,
      startDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  // Bruna Expirada (Expired Trial - started 13 days ago, expired 3 days ago)
  await prisma.freeTrial.create({
    data: {
      userId: trainer4.id,
      startDate: new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  // Create a sample Student user
  const student1 = await prisma.user.create({
    data: {
      name: "Lucas Almeida",
      email: "lucas@aluno.com",
      password: hashedPassword,
      role: GlobalRole.STUDENT,
    },
  });

  // 4. Create Workspaces
  const workspace1 = await prisma.workspace.create({
    data: {
      name: "Silva Assessoria Esportiva",
      slug: "silva-assessoria",
      ownerId: trainer1.id,
      members: {
        create: {
          userId: trainer1.id,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });

  const workspace2 = await prisma.workspace.create({
    data: {
      name: "FitCoach Amanda",
      slug: "fitcoach-amanda",
      ownerId: trainer2.id,
      members: {
        create: {
          userId: trainer2.id,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });

  const workspace3 = await prisma.workspace.create({
    data: {
      name: "Carlos Consultoria",
      slug: "carlos-consultoria",
      ownerId: trainer3.id,
      members: {
        create: {
          userId: trainer3.id,
          role: WorkspaceRole.OWNER,
        },
      },
    },
  });

  // Add student to workspace1
  await prisma.workspaceMember.create({
    data: {
      userId: student1.id,
      workspaceId: workspace1.id,
      role: WorkspaceRole.STUDENT,
    },
  });

  // 5. Create Subscriptions
  await prisma.subscription.create({
    data: {
      userId: trainer1.id,
      planId: proPlan.id,
      status: "active",
    },
  });

  await prisma.subscription.create({
    data: {
      userId: trainer2.id,
      planId: starterPlan.id,
      status: "active",
    },
  });

  // 6. Create Muscle Groups and Exercises
  const peitoral = await prisma.muscleGroup.create({ data: { name: "Peitoral" } });
  const pernas = await prisma.muscleGroup.create({ data: { name: "Pernas" } });
  const costas = await prisma.muscleGroup.create({ data: { name: "Costas" } });
  const biceps = await prisma.muscleGroup.create({ data: { name: "Bíceps" } });

  await prisma.exercise.createMany({
    data: [
      { name: "Supino Reto", isOfficial: true, usage: 12500, muscleGroupId: peitoral.id, status: "APPROVED" },
      { name: "Agachamento Livre", isOfficial: true, usage: 11800, muscleGroupId: pernas.id, status: "APPROVED" },
      { name: "Levantamento Terra", isOfficial: true, usage: 9200, muscleGroupId: costas.id, status: "APPROVED" },
      { name: "Puxada Frontal", isOfficial: true, usage: 8500, muscleGroupId: costas.id, status: "APPROVED" },
      { name: "Rosca Direta", isOfficial: true, usage: 7100, muscleGroupId: biceps.id, status: "APPROVED" },
      { name: "Agachamento Búlgaro com Salto", isOfficial: false, creatorId: trainer1.id, muscleGroupId: pernas.id, status: "PENDING", videoUrl: "https://example.com/video.mp4" },
      { name: "Puxada Unilateral na Polia", isOfficial: false, creatorId: trainer2.id, muscleGroupId: costas.id, status: "PENDING" },
    ]
  });

  // 7. Create System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: "platform_name", value: "AtlasFit", description: "Nome da Plataforma" },
      { key: "primary_domain", value: "atlasfit.app", description: "Domínio Principal" },
      { key: "support_email", value: "noreply@atlasfit.app", description: "Email de Suporte Sistema" },
      { key: "require_2fa", value: "true", description: "Autenticação em Duas Etapas (2FA)", type: "boolean" },
      { key: "session_expiration", value: "true", description: "Expiração de Sessão", type: "boolean" },
      { key: "api_white_label", value: "false", description: "White-label API Access", type: "boolean" },
    ]
  });

  // 8. Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userId: superAdmin.id,
        action: "LOGIN",
        ip: "127.0.0.1",
        severity: "info",
      },
      {
        userId: superAdmin.id,
        action: "UPDATE_SETTING",
        entity: "SystemSetting",
        ip: "127.0.0.1",
        severity: "warning",
      },
      {
        userId: trainer1.id,
        action: "CREATE_WORKOUT",
        entity: "Workout",
        ip: "192.168.1.1",
        severity: "info",
      },
      {
        userId: trainer2.id,
        action: "PAYMENT",
        entity: "Subscription",
        ip: "Stripe Webhook",
        severity: "success",
      },
    ],
  });

  console.log("Seed completed successfully! 🚀");
  console.log("\n=== Credentials ===");
  console.log("SuperAdmin      → admin@atlasfit.com            / admin123");
  console.log("Trainer (Active)→ ricardo@assessoria.com        / admin123");
  console.log("Trainer (Active)→ amanda@fitcoach.com           / admin123");
  console.log("Trainer (Trial) → trial_trainer@assessoria.com  / admin123");
  console.log("Trainer (Expired)→ expired_trainer@assessoria.com/ admin123");
  console.log("Student         → lucas@aluno.com               / admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
