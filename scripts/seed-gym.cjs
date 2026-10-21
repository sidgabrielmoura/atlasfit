require("dotenv").config();
const { PrismaClient, GlobalRole, WorkspaceRole, WorkspaceType, GymBillingCycle, GymEnrollmentStatus, GymCashDrawerStatus, GymCashMovementType } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando criação da Academia no banco de dados...");

  const passwordHash = await bcrypt.hash("admin123", 10);

  // 1. Criar ou atualizar Usuários
  // 1.1 Dono / Administrador da Academia
  const ownerUser = await prisma.user.upsert({
    where: { email: "academia@atlasfit.com" },
    update: {
      name: "Carlos Gestor (Atlas Gym)",
      password: passwordHash,
      role: GlobalRole.USER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
    create: {
      name: "Carlos Gestor (Atlas Gym)",
      email: "academia@atlasfit.com",
      password: passwordHash,
      role: GlobalRole.USER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Usuário Dono/Gestor criado: ${ownerUser.email}`);

  // 1.2 Recepcionista
  const receptionistUser = await prisma.user.upsert({
    where: { email: "recepcao@atlasfit.com" },
    update: {
      name: "Ana Recepção",
      password: passwordHash,
      role: GlobalRole.USER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
    create: {
      name: "Ana Recepção",
      email: "recepcao@atlasfit.com",
      password: passwordHash,
      role: GlobalRole.USER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Usuário Recepcionista criado: ${receptionistUser.email}`);

  // 1.3 Professor / Instrutor
  const trainerUser = await prisma.user.upsert({
    where: { email: "professor@atlasfit.com" },
    update: {
      name: "Pedro Instrutor",
      password: passwordHash,
      role: GlobalRole.TRAINER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
    create: {
      name: "Pedro Instrutor",
      email: "professor@atlasfit.com",
      password: passwordHash,
      role: GlobalRole.TRAINER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Usuário Instrutor criado: ${trainerUser.email}`);

  // 1.4 Aluna
  const studentUser = await prisma.user.upsert({
    where: { email: "aluna@atlasfit.com" },
    update: {
      name: "Mariana Aluna",
      password: passwordHash,
      role: GlobalRole.USER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
    create: {
      name: "Mariana Aluna",
      email: "aluna@atlasfit.com",
      password: passwordHash,
      role: GlobalRole.USER,
      twoFactorEnabled: false,
      threeFactorEnabled: false,
      emailVerified: new Date(),
    },
  });
  console.log(`✓ Usuário Aluna criado: ${studentUser.email}`);

  // 2. Criar ou Atualizar o Workspace da Academia (tipo GYM)
  let gymWorkspace = await prisma.workspace.findFirst({
    where: { slug: "atlas-gym-prime" },
  });

  if (!gymWorkspace) {
    gymWorkspace = await prisma.workspace.create({
      data: {
        name: "Atlas Gym Prime",
        slug: "atlas-gym-prime",
        type: WorkspaceType.GYM,
        ownerId: ownerUser.id,
        primaryColor: "#2563EB",
      },
    });
    console.log(`✓ Workspace GYM criado: ${gymWorkspace.name} (${gymWorkspace.slug})`);
  } else {
    gymWorkspace = await prisma.workspace.update({
      where: { id: gymWorkspace.id },
      data: {
        name: "Atlas Gym Prime",
        type: WorkspaceType.GYM,
        ownerId: ownerUser.id,
        primaryColor: "#2563EB",
      },
    });
    console.log(`✓ Workspace GYM atualizado: ${gymWorkspace.name} (${gymWorkspace.slug})`);
  }

  // 3. Assinatura SaaS do Workspace (Entitlements)
  await prisma.workspaceSubscription.upsert({
    where: { workspaceId: gymWorkspace.id },
    update: {
      status: "ACTIVE",
      maxStudents: 500,
      maxStaff: 20,
      maxUnits: 3,
      storageLimitMb: 10240,
    },
    create: {
      workspaceId: gymWorkspace.id,
      status: "ACTIVE",
      maxStudents: 500,
      maxStaff: 20,
      maxUnits: 3,
      storageLimitMb: 10240,
    },
  });
  console.log(`✓ WorkspaceSubscription ativada.`);

  // 4. Configurações da Academia (GymSettings)
  await prisma.gymSettings.upsert({
    where: { workspaceId: gymWorkspace.id },
    update: {
      timezone: "America/Sao_Paulo",
      billingGracePeriodDays: 5,
      capacityLimit: 150,
      requireGuardianSignature: true,
      maxReceptionistDiscountPercentage: 10.0,
      maxReceptionistDiscountInCents: BigInt(2000),
    },
    create: {
      workspaceId: gymWorkspace.id,
      timezone: "America/Sao_Paulo",
      billingGracePeriodDays: 5,
      capacityLimit: 150,
      requireGuardianSignature: true,
      maxReceptionistDiscountPercentage: 10.0,
      maxReceptionistDiscountInCents: BigInt(2000),
    },
  });
  console.log(`✓ GymSettings configuradas.`);

  // 5. Unidade Física (GymUnit)
  let unit = await prisma.gymUnit.findFirst({
    where: { workspaceId: gymWorkspace.id, slug: "unidade-central" },
  });

  if (!unit) {
    unit = await prisma.gymUnit.create({
      data: {
        workspaceId: gymWorkspace.id,
        name: "Unidade Central - Jardins",
        slug: "unidade-central",
        code: "UNI-01",
        address: "Av. Paulista, 1500",
        city: "São Paulo",
        state: "SP",
        postalCode: "01310-200",
        phone: "(11) 3288-9000",
        email: "paulista@atlasgym.com.br",
        timezone: "America/Sao_Paulo",
        isActive: true,
      },
    });
    console.log(`✓ Unidade física criada: ${unit.name}`);
  } else {
    unit = await prisma.gymUnit.update({
      where: { id: unit.id },
      data: {
        name: "Unidade Central - Jardins",
        isActive: true,
      },
    });
    console.log(`✓ Unidade física atualizada: ${unit.name}`);
  }

  // 6. Membros e Concessões de Papel (RBAC Grants)
  // 6.1 Owner (Carlos)
  let ownerMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: gymWorkspace.id, userId: ownerUser.id },
  });
  if (!ownerMember) {
    ownerMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: gymWorkspace.id,
        userId: ownerUser.id,
        role: WorkspaceRole.OWNER,
        unitId: unit.id,
        isActive: true,
      },
    });
  }
  await prisma.workspaceRoleGrant.upsert({
    where: {
      memberId_role_unitId: {
        memberId: ownerMember.id,
        role: WorkspaceRole.OWNER,
        unitId: unit.id,
      },
    },
    update: { revokedAt: null },
    create: {
      memberId: ownerMember.id,
      role: WorkspaceRole.OWNER,
      unitId: unit.id,
    },
  });
  await prisma.gymStaffProfile.upsert({
    where: { memberId: ownerMember.id },
    update: { jobTitle: "Diretor Geral" },
    create: { memberId: ownerMember.id, jobTitle: "Diretor Geral" },
  });
  console.log(`✓ Papel OWNER vinculado a ${ownerUser.email}`);

  // 6.2 Receptionist (Ana)
  let recMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: gymWorkspace.id, userId: receptionistUser.id },
  });
  if (!recMember) {
    recMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: gymWorkspace.id,
        userId: receptionistUser.id,
        role: WorkspaceRole.RECEPTIONIST,
        unitId: unit.id,
        isActive: true,
      },
    });
  }
  await prisma.workspaceRoleGrant.upsert({
    where: {
      memberId_role_unitId: {
        memberId: recMember.id,
        role: WorkspaceRole.RECEPTIONIST,
        unitId: unit.id,
      },
    },
    update: { revokedAt: null },
    create: {
      memberId: recMember.id,
      role: WorkspaceRole.RECEPTIONIST,
      unitId: unit.id,
    },
  });
  await prisma.gymStaffProfile.upsert({
    where: { memberId: recMember.id },
    update: { jobTitle: "Recepcionista Líder" },
    create: { memberId: recMember.id, jobTitle: "Recepcionista Líder" },
  });
  console.log(`✓ Papel RECEPTIONIST vinculado a ${receptionistUser.email}`);

  // 6.3 Instructor (Pedro)
  let trainerMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: gymWorkspace.id, userId: trainerUser.id },
  });
  if (!trainerMember) {
    trainerMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: gymWorkspace.id,
        userId: trainerUser.id,
        role: WorkspaceRole.TRAINER,
        unitId: unit.id,
        isActive: true,
      },
    });
  }
  await prisma.workspaceRoleGrant.upsert({
    where: {
      memberId_role_unitId: {
        memberId: trainerMember.id,
        role: WorkspaceRole.TRAINER,
        unitId: unit.id,
      },
    },
    update: { revokedAt: null },
    create: {
      memberId: trainerMember.id,
      role: WorkspaceRole.TRAINER,
      unitId: unit.id,
    },
  });
  await prisma.gymStaffProfile.upsert({
    where: { memberId: trainerMember.id },
    update: { cref: "123456-G/SP", jobTitle: "Instrutor Chefe" },
    create: { memberId: trainerMember.id, cref: "123456-G/SP", jobTitle: "Instrutor Chefe" },
  });
  console.log(`✓ Papel TRAINER vinculado a ${trainerUser.email}`);

  // 6.4 Student (Mariana)
  let studentMember = await prisma.workspaceMember.findFirst({
    where: { workspaceId: gymWorkspace.id, userId: studentUser.id },
  });
  if (!studentMember) {
    studentMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: gymWorkspace.id,
        userId: studentUser.id,
        role: WorkspaceRole.STUDENT,
        unitId: unit.id,
        isActive: true,
      },
    });
  }
  await prisma.gymStudentProfile.upsert({
    where: { memberId: studentMember.id },
    update: { registrationNumber: "AG-2026-001", status: "ACTIVE" },
    create: { memberId: studentMember.id, registrationNumber: "AG-2026-001", status: "ACTIVE" },
  });
  console.log(`✓ Perfil de Aluna vinculado a ${studentUser.email}`);

  // 7. Catálogo de Planos e Versão (GymPlan & GymPlanVersion)
  let plan = await prisma.gymPlan.findFirst({
    where: { workspaceId: gymWorkspace.id, name: "Plano Anual Prime VIP" },
  });

  if (!plan) {
    plan = await prisma.gymPlan.create({
      data: {
        workspaceId: gymWorkspace.id,
        name: "Plano Anual Prime VIP",
        description: "Acesso total à musculação, esteiras, aulas coletivas e aplicativo AtlasFit com treinos e ficha digital.",
        isActive: true,
      },
    });
  }

  let planVersion = await prisma.gymPlanVersion.findFirst({
    where: { planId: plan.id, version: 1 },
  });

  if (!planVersion) {
    planVersion = await prisma.gymPlanVersion.create({
      data: {
        planId: plan.id,
        version: 1,
        name: "Plano Anual Prime VIP - v1",
        description: "Mensalidade de R$ 149,00 com fidelidade anual de 12 meses.",
        priceInCents: BigInt(14900), // R$ 149,00
        enrollmentFeeInCents: BigInt(0),
        billingCycle: GymBillingCycle.MONTHLY,
        durationDays: 365,
        termsText: "Termo de Adesão ao Plano Anual Prime VIP AtlasFit. O aluno adquire acesso irrestrito às dependências da unidade física...",
        termsVersion: "1.0",
        isActive: true,
      },
    });
    console.log(`✓ Plano e versão contratual criados: ${plan.name} (R$ 149,00)`);
  }

  // 8. Matrícula e Concessão de Acesso Ativo (Mariana)
  let enrollment = await prisma.gymEnrollment.findFirst({
    where: { workspaceId: gymWorkspace.id, studentMemberId: studentMember.id },
  });

  const now = new Date();
  const nextYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  if (!enrollment) {
    enrollment = await prisma.gymEnrollment.create({
      data: {
        workspaceId: gymWorkspace.id,
        studentMemberId: studentMember.id,
        planVersionId: planVersion.id,
        unitId: unit.id,
        status: GymEnrollmentStatus.ACTIVE,
        startDate: now,
        endDate: nextYear,
        priceInCents: BigInt(14900),
        nextDueDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        accessGranted: true,
        activatedAt: now,
      },
    });

    await prisma.gymContractAcceptance.create({
      data: {
        enrollmentId: enrollment.id,
        workspaceId: gymWorkspace.id,
        signerUserId: studentUser.id,
        representationRole: "SELF",
        termsSnapshot: planVersion.termsText,
        termsVersion: planVersion.termsVersion,
        ipAddress: "127.0.0.1",
        signedAt: now,
      },
    });

    console.log(`✓ Matrícula sintética criada para ${studentUser.email}`);
  }

  // 11. Conta Financeira e Caixa da Recepção
  let finAccount = await prisma.gymFinancialAccount.findFirst({
    where: { workspaceId: gymWorkspace.id, name: "Caixa Recepção - Principal" },
  });
  if (!finAccount) {
    finAccount = await prisma.gymFinancialAccount.create({
      data: {
        workspaceId: gymWorkspace.id,
        unitId: unit.id,
        name: "Caixa Recepção - Principal",
        accountType: "CASH",
        balanceInCents: BigInt(15000), // R$ 150,00 fundo
        initialBalanceInCents: BigInt(15000),
        currency: "BRL",
        isDefault: true,
        isActive: true,
      },
    });
  }

  let openSession = await prisma.gymCashDrawerSession.findFirst({
    where: { workspaceId: gymWorkspace.id, status: GymCashDrawerStatus.OPEN },
  });
  if (!openSession) {
    openSession = await prisma.gymCashDrawerSession.create({
      data: {
        workspaceId: gymWorkspace.id,
        unitId: unit.id,
        financialAccountId: finAccount.id,
        sessionNumber: "CX-202609-000001",
        status: GymCashDrawerStatus.OPEN,
        openedByUserId: receptionistUser.id,
        openingAmountInCents: BigInt(15000),
        expectedCashInCents: BigInt(15000),
      },
    });

    await prisma.gymCashDrawerMovement.create({
      data: {
        sessionId: openSession.id,
        movementType: GymCashMovementType.OPENING,
        amountInCents: BigInt(15000),
        description: "Abertura de caixa com fundo de troco",
        performedByUserId: receptionistUser.id,
      },
    });
    console.log(`✓ Turno de caixa aberto na recepção: ${openSession.sessionNumber} com R$ 150,00`);
  }

  console.log("\n========================================================");
  console.log("🎉 ACADEMIA CRIADA E PRONTA PARA ACESSO!");
  console.log("========================================================");
  console.log("Nome da Academia : Atlas Gym Prime");
  console.log("Slug / URL       : /gym/dashboard");
  console.log("--------------------------------------------------------");
  console.log("CREDENCIAIS DE ACESSO (Senha padrão: admin123)");
  console.log("--------------------------------------------------------");
  console.log("1. GESTOR / DONO (Acesso total administrativo):");
  console.log("   E-mail: academia@atlasfit.com");
  console.log("   Destino: /gym/dashboard");
  console.log("");
  console.log("2. RECEPÇÃO (Operação diária, caixa e catraca):");
  console.log("   E-mail: recepcao@atlasfit.com");
  console.log("   Destino: /gym/reception");
  console.log("");
  console.log("3. PROFESSOR / INSTRUTOR (Prescrição e treinos):");
  console.log("   E-mail: professor@atlasfit.com");
  console.log("   Destino: /gym/workouts");
  console.log("");
  console.log("4. ALUNA (Portal do aluno, grade e reservas):");
  console.log("   E-mail: aluna@atlasfit.com");
  console.log("   Destino: /student/dashboard");
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("Erro ao criar academia:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
