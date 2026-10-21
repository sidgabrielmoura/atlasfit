import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { manualFinanceService } from "@/modules/workspaces/application/manual-finance-service";
import { issueCredentialProof, consumeCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAccessRoles } from "@/modules/workspaces/domain/access-roles";
import { GymOffboardingService } from "@/modules/workspaces/application/gym-offboarding-service";
import { manualSubscriptionService } from "@/modules/workspaces/application/manual-subscription-service";
import { issueManualInvoice } from "@/modules/workspaces/application/manual-invoice-service";
import { resolveGymPayer } from "@/modules/workspaces/application/payer-service";
import { activateGymEnrollment } from "@/modules/workspaces/application/enrollment-activation";
import { gymFinancialService } from "@/modules/workspaces/application/gym-financial-service";
import { inviteGymStaff, acceptGymStaffInvitation, updateGymStaff } from "@/modules/workspaces/application/staff-mutations";
import { updateWorkspaceBranding } from "@/modules/workspaces/application/branding-service";
import { normalizeWorkspaceColor, brandingForeground } from "@/modules/workspaces/domain/branding";
import { getGymStudentFinance } from "@/modules/workspaces/application/gym-student-finance";
import { gymPlanService, createGymPlanSchema } from "@/modules/workspaces/application/plan-service";
import { gymEnrollmentService } from "@/modules/workspaces/application/enrollment-service";
import { processLocalEnrollmentClosures } from "@/modules/workspaces/application/enrollment-closure-job";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Integração exige o banco descartável específico; nenhum outro banco será utilizado.");

async function fixture(total = 10000) {
  const suffix = randomUUID();
  const owner = await prisma.user.create({ data: { email: `owner-${suffix}@example.invalid`, name: "Operador sintético", role: "USER" } });
  const student = await prisma.user.create({ data: { email: `student-${suffix}@example.invalid`, name: "Aluno sintético", role: "STUDENT" } });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, name: "Academia de teste", slug: `test-${suffix}`, ownerId: owner.id, type: "GYM" } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT" } });
  const account = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, name: "Banco interno", accountType: "BANK_ACCOUNT" } });
  const invoice = await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, studentUserId: student.id, invoiceNumber: `TEST-${suffix}`, title: "Mensalidade sintética", dueDate: new Date(), subtotalInCents: BigInt(total), totalInCents: BigInt(total), balanceRemainingInCents: BigInt(total), payerName: "Aluno sintético", createdByUserId: owner.id } });
  return { owner, student, workspace, member, account, invoice };
}

async function pay(f: Awaited<ReturnType<typeof fixture>>, amount: number, key = randomUUID()) {
  return manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, financialAccountId: f.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: amount, allocations: [{ invoiceId: f.invoice.id, amountInCents: amount }], idempotencyKey: key });
}

afterAll(async () => { await prisma.$disconnect(); });

async function contractFixture() {
  const f = await fixture();
  const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Plano contratado" } });
  const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt(10000), enrollmentFeeInCents: BigInt(500), durationDays: 365, termsText: "Contrato sintético", billingCycle: "MONTHLY" } });
  const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.member.id, planVersionId: version.id, startDate: new Date("2026-01-31T12:00:00Z"), endDate: new Date("2027-01-31T12:00:00Z"), priceInCents: version.priceInCents, enrollmentFeeInCents: version.enrollmentFeeInCents, status: "PENDING_ACTIVATION" } });
  await prisma.gymContractAcceptance.create({ data: { enrollmentId: enrollment.id, workspaceId: f.workspace.id, signerUserId: f.student.id, termsSnapshot: version.termsText, termsVersion: version.termsVersion } });
  return { ...f, plan, version, enrollment };
}

describe("GYM PostgreSQL — devolução não excede fundos disponíveis", () => {
  it("extrato do aluno é local, somente leitura e reflete baixa parcial e reversão sem wallet", async () => {
    const f = await fixture(); const other = await fixture();
    const before = await getGymStudentFinance(f.workspace.id, f.member.id, f.student.id); expect(before.totals).toMatchObject({ receivedInCents: "0", outstandingInCents: "10000" });
    expect(before.invoices.map(invoice => invoice.id)).toEqual([f.invoice.id]);
    await expect(getGymStudentFinance(f.workspace.id, f.member.id, other.student.id)).rejects.toMatchObject({ statusCode: 403 });
    const payment = await pay(f, 3000); const partial = await getGymStudentFinance(f.workspace.id, f.member.id, f.student.id); expect(partial.totals).toMatchObject({ receivedInCents: "3000", outstandingInCents: "7000" });
    expect(partial.invoices[0]).toMatchObject({ status: "PARTIALLY_PAID", balanceInCents: "7000", receipts: [{ amountInCents: "3000", receiptNumber: payment.receiptNumber }] });
    expect(JSON.stringify(partial)).not.toMatch(/cpf|receivedByUserId|provider|setupToken|password/);
    await manualFinanceService.reversePayment({ workspaceId: f.workspace.id, paymentId: payment.id, actorUserId: f.owner.id, reversalReason: "Correção sintética do extrato" });
    const reversed = await getGymStudentFinance(f.workspace.id, f.member.id, f.student.id); expect(reversed.totals).toMatchObject({ receivedInCents: "0", outstandingInCents: "10000" }); expect(reversed.invoices[0].receipts).toMatchObject([{ amountInCents: "3000", receiptNumber: payment.receiptNumber, reversed: true }]);
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(1); expect(await prisma.paymentProviderAccount.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("reversão após gasto não altera recibo ou fatura quando saldo não suporta a devolução", async () => {
    const f = await fixture(); const payment = await pay(f, 10000);
    await prisma.gymFinancialAccount.update({ where: { id: f.account.id }, data: { balanceInCents: BigInt(100) } });
    await expect(manualFinanceService.reversePayment({ workspaceId: f.workspace.id, paymentId: payment.id, actorUserId: f.owner.id, reversalReason: "Devolução sintética sem fundos" })).rejects.toMatchObject({ code: "INSUFFICIENT_ACCOUNT_BALANCE" });
    expect(await prisma.gymPayment.findUnique({ where: { id: payment.id } })).toMatchObject({ status: "CONFIRMED", reversedAt: null });
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ paidAmountInCents: BigInt(10000), balanceRemainingInCents: BigInt(0), status: "PAID" });
    expect(await prisma.gymPaymentAllocation.count({ where: { paymentId: payment.id, status: "ACTIVE" } })).toBe(1);
  });
});

describe("GYM PostgreSQL — equipe e marca por workspace", () => {
  it("convite vincula destinatário, consome uma vez e preserva dados profissionais", async () => {
    const f = await fixture();
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: "ACTIVE", maxStaff: 3 } });
    const staff = await prisma.user.create({ data: { email: `staff-${randomUUID()}@example.invalid`, role: "USER" } });
    const invitation = await inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.owner.id, email: staff.email || "", role: "TRAINER", cref: "CREF-SINTETICO", jobTitle: "Instrutor" });
    await expect(acceptGymStaffInvitation(invitation.rawToken, f.student.id)).rejects.toMatchObject({ code: "INVALID_TOKEN" });
    const attempts = await Promise.allSettled([acceptGymStaffInvitation(invitation.rawToken, staff.id), acceptGymStaffInvitation(invitation.rawToken, staff.id)]);
    expect(attempts.filter(attempt => attempt.status === "fulfilled")).toHaveLength(1);
    const member = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId: staff.id, workspaceId: f.workspace.id } } });
    expect(await prisma.gymStaffProfile.findUnique({ where: { memberId: member.id } })).toMatchObject({ cref: "CREF-SINTETICO", jobTitle: "Instrutor" });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: member.id, role: "TRAINER", revokedAt: null } })).toBe(1);
  });
  it("equipe não promove OWNER; mudança de papel revoga grants anteriores", async () => {
    const f = await fixture();
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: "ACTIVE", maxStaff: 3 } });
    const staff = await prisma.user.create({ data: { email: `manager-${randomUUID()}@example.invalid` } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: staff.id, role: "MANAGER", roleGrants: { create: { role: "MANAGER", grantedBy: f.owner.id } } } });
    await expect(updateGymStaff({ workspaceId: f.workspace.id, memberId: member.id, actorUserId: staff.id, role: "OWNER" })).rejects.toMatchObject({ code: "INVALID_ROLE" });
    await expect(inviteGymStaff({ workspaceId: f.workspace.id, invitedById: staff.id, email: "owner@example.invalid", role: "OWNER" })).rejects.toMatchObject({ code: "INVALID_ROLE" });
    await updateGymStaff({ workspaceId: f.workspace.id, memberId: member.id, actorUserId: f.owner.id, role: "TRAINER" });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: member.id, role: "MANAGER", revokedAt: null } })).toBe(0);
    await expect(updateGymStaff({ workspaceId: f.workspace.id, memberId: member.id, actorUserId: staff.id, role: "FINANCE" })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
  });
  it("limite considera convites simultâneos e academia/unidade são validadas", async () => {
    const [a, b] = await Promise.all([fixture(), fixture()]);
    await prisma.workspaceSubscription.update({ where: { workspaceId: a.workspace.id }, data: { status: "ACTIVE", maxStaff: 2 } });
    const foreignUnit = await prisma.gymUnit.create({ data: { workspaceId: b.workspace.id, name: "Outra unidade" } });
    await expect(inviteGymStaff({ workspaceId: a.workspace.id, invitedById: a.owner.id, email: "unit@example.invalid", role: "TRAINER", unitId: foreignUnit.id })).rejects.toMatchObject({ code: "UNIT_NOT_FOUND" });
    const attempts = await Promise.allSettled([inviteGymStaff({ workspaceId: a.workspace.id, invitedById: a.owner.id, email: "one@example.invalid", role: "TRAINER" }), inviteGymStaff({ workspaceId: a.workspace.id, invitedById: a.owner.id, email: "two@example.invalid", role: "TRAINER" })]);
    expect(attempts.filter(attempt => attempt.status === "fulfilled")).toHaveLength(1);
  });
  it("marca persiste sem modificar User, PERSONAL ou outra academia", async () => {
    const [a, b] = await Promise.all([fixture(), fixture()]);
    const personal = await prisma.workspace.create({ data: { ownerId: a.owner.id, name: "Assessoria", slug: `personal-${randomUUID()}`, type: "PERSONAL", primaryColor: "#332211" } });
    const branding = { name: "Academia Azul", slogan: "Treine aqui", primaryColor: "#123456", logoUrl: null, watermarkUrl: null, workoutCoverUrl: null };
    const updated = await updateWorkspaceBranding(a.workspace.id, a.owner.id, "GYM", branding);
    expect(updated).toMatchObject(branding);
    expect(await prisma.workspace.findUnique({ where: { id: a.workspace.id } })).toMatchObject(branding);
    expect(await prisma.workspace.findUnique({ where: { id: personal.id } })).toMatchObject({ name: "Assessoria", primaryColor: "#332211" });
    expect(await prisma.workspace.findUnique({ where: { id: b.workspace.id } })).toMatchObject({ name: b.workspace.name });
    expect(await prisma.user.findUnique({ where: { id: a.owner.id } })).toMatchObject({ name: a.owner.name });
    await expect(updateWorkspaceBranding(a.workspace.id, a.student.id, "GYM", branding)).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await expect(updateWorkspaceBranding(a.workspace.id, a.owner.id, "GYM", { ...branding, logoUrl: `/api/storage/file?key=workspace/${b.workspace.id}/logos/foreign.png` })).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
  });
  it("cor inválida não vira CSS; foreground oferece contraste para cores claras/escuras", async () => {
    const f = await fixture();
    expect(normalizeWorkspaceColor('red; } body { display:none')).toBe("#2B4FCC");
    expect(brandingForeground("#FFFFFF")).toBe("#000000");
    expect(brandingForeground("#000000")).toBe("#FFFFFF");
    await expect(updateWorkspaceBranding(f.workspace.id, f.owner.id, "GYM", { name: "Academia", primaryColor: "red;display:none" })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
  });
});

describe("GYM PostgreSQL — contratos e recorrência manual", () => {
  it("cancelamento programado respeita a vigência, job concorrente é único e legado/dívida são preservados", async () => {
    const f = await contractFixture();
    const endDate = new Date(Date.now() + 86400000 * 30);
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { status: "ACTIVE", accessGranted: true, endDate, subscriptionStatus: "ACTIVE", recurrenceMode: "LOCAL" } });
    await prisma.gymInvoice.update({ where: { id: f.invoice.id }, data: { enrollmentId: f.enrollment.id } });
    const command = { workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, immediate: false, reason: "Encerrar no fim da vigência" };
    await expect(gymEnrollmentService.cancelEnrollment({ ...command, actorUserId: f.student.id })).rejects.toMatchObject({ statusCode: 403 });
    expect(await gymEnrollmentService.cancelEnrollment(command)).toMatchObject({ status: "ACTIVE", accessGranted: true, autoRenew: false, cancellationEffectiveDate: endDate });
    await gymEnrollmentService.cancelEnrollment(command);
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);
    expect(await processLocalEnrollmentClosures(f.workspace.id, new Date(endDate.getTime() - 1))).toMatchObject({ totalProcessed: 0 });
    const results = await Promise.all([processLocalEnrollmentClosures(f.workspace.id, endDate), processLocalEnrollmentClosures(f.workspace.id, endDate)]);
    expect(results.reduce((total, result) => total + result.cancelledCount, 0)).toBe(1);
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: f.enrollment.id, toStatus: "CANCELLED" } })).toBe(1);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "OPEN", balanceRemainingInCents: BigInt(10000) });
    const legacy = await contractFixture();
    await prisma.gymEnrollment.update({ where: { id: legacy.enrollment.id }, data: { status: "ACTIVE", endDate: new Date(0), cancellationEffectiveDate: new Date(0), recurrenceMode: "PROVIDER", providerSubscriptionId: "synthetic-legacy-contract" } });
    await expect(gymEnrollmentService.cancelEnrollment({ ...command, workspaceId: legacy.workspace.id, enrollmentId: legacy.enrollment.id, actorUserId: legacy.owner.id, immediate: true })).rejects.toMatchObject({ code: "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED" });
    expect(await processLocalEnrollmentClosures(legacy.workspace.id)).toMatchObject({ legacyPendingCount: 1, totalProcessed: 0 });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: legacy.enrollment.id } })).toMatchObject({ status: "ACTIVE", providerSubscriptionId: "synthetic-legacy-contract" });
    await prisma.gymEnrollment.update({ where: { id: legacy.enrollment.id }, data: { providerSubscriptionId: null } });
    expect(await processLocalEnrollmentClosures(legacy.workspace.id)).toMatchObject({ legacyPendingCount: 1, totalProcessed: 0 });
  });
  it("criação de matrícula valida unidade, papéis, preço e pagador dentro da transação", async () => {
    const f = await fixture(), foreign = await fixture();
    const unit = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Unidade do aluno" } });
    const foreignUnit = await prisma.gymUnit.create({ data: { workspaceId: foreign.workspace.id, name: "Unidade externa" } });
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { unitId: unit.id } });
    const plan = await gymPlanService.createPlan({ workspaceId: f.workspace.id, actorUserId: f.owner.id, name: "Plano", priceInCents: 10000, billingCycle: "MONTHLY", durationDays: 365, termsText: "Condições" });
    const input = { workspaceId: f.workspace.id, actorUserId: f.owner.id, studentMemberId: f.member.id, planVersionId: plan.activeVersion.id };
    await expect(gymEnrollmentService.createEnrollment({ ...input, unitId: foreignUnit.id })).rejects.toMatchObject({ statusCode: 404 });
    await expect(gymEnrollmentService.createEnrollment({ ...input, billingPayerUserId: foreign.student.id })).rejects.toMatchObject({ statusCode: 403 });
    await expect(gymEnrollmentService.createEnrollment({ ...input, customPriceInCents: -1 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(gymEnrollmentService.createEnrollment({ ...input, startDate: "2026-02-30" })).rejects.toMatchObject({ statusCode: 400 });
    const receptionist = await prisma.user.create({ data: {} });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: receptionist.id, role: "RECEPTIONIST", unitId: unit.id, roleGrants: { create: { role: "RECEPTIONIST", unitId: unit.id, grantedBy: f.owner.id } } } });
    await expect(gymEnrollmentService.createEnrollment({ ...input, actorUserId: receptionist.id, customPriceInCents: 1 })).rejects.toMatchObject({ statusCode: 403 });
    const created = await gymEnrollmentService.createEnrollment({ ...input, actorUserId: receptionist.id });
    expect(created).toMatchObject({ status: "PENDING_ACCEPTANCE", accessGranted: false, recurrenceMode: "LOCAL", subscriptionStatus: "INACTIVE", unitId: unit.id, priceInCents: 10000 });
    expect(JSON.stringify(created)).not.toMatch(/password|setupToken|creditCardToken|medicalConditions/);
    await gymPlanService.updatePlanMetadata({ workspaceId: f.workspace.id, actorUserId: f.owner.id, planId: plan.id, isActive: false });
    await expect(gymEnrollmentService.createEnrollment(input)).rejects.toMatchObject({ code: "PLAN_INACTIVE" });
    expect(await prisma.gymEnrollment.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(await prisma.gymEnrollmentEvent.count({ where: { enrollmentId: created.id } })).toBe(1);
  });
  it("plano valida condições no domínio, publica versões concorrentes e preserva contratos", async () => {
    const f = await fixture();
    const input = { workspaceId: f.workspace.id, actorUserId: f.owner.id, name: "Plano mensal", priceInCents: 10000, enrollmentFeeInCents: 0, billingCycle: "MONTHLY" as const, durationDays: 365, termsText: "Condições originais" };
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", ownerId: f.owner.id, slug: randomUUID(), name: "Assessoria privada" } });
    await expect(gymPlanService.createPlan({ ...input, workspaceId: personal.id })).rejects.toMatchObject({ statusCode: 404 });
    await expect(gymPlanService.createPlan({ ...input, priceInCents: -1 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(gymPlanService.createPlan({ ...input, actorUserId: f.student.id })).rejects.toMatchObject({ statusCode: 403 });
    expect(createGymPlanSchema.safeParse({ workspaceId: f.workspace.id, name: "Plano", priceInCents: 1, billingCycle: "MONTHLY", termsText: "Contrato", classCreditsPerCycle: 10 }).success).toBe(false);
    const plan = await gymPlanService.createPlan(input);
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.member.id, planVersionId: plan.activeVersion.id, priceInCents: BigInt(10000) } });
    const publish = { ...input, planId: plan.id, priceInCents: 15000, termsText: "Novas condições" };
    const results = await Promise.all([gymPlanService.publishNewVersion(publish), gymPlanService.publishNewVersion({ ...publish, priceInCents: 18000 })]);
    expect(results.map(result => result.version).sort()).toEqual([2, 3]);
    expect(await prisma.gymPlanVersion.count({ where: { planId: plan.id, isActive: true } })).toBe(1);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: enrollment.id } })).toMatchObject({ planVersionId: plan.activeVersion.id, priceInCents: BigInt(10000) });
    expect(await prisma.gymPlanVersion.findUnique({ where: { id: plan.activeVersion.id } })).toMatchObject({ priceInCents: BigInt(10000), termsText: "Condições originais" });
    await gymPlanService.updatePlanMetadata({ workspaceId: f.workspace.id, actorUserId: f.owner.id, planId: plan.id, isActive: false });
    await expect(gymPlanService.publishNewVersion(publish)).rejects.toMatchObject({ code: "PLAN_INACTIVE" });
    expect((await gymPlanService.getPlanById(plan.id, f.workspace.id, f.owner.id)).activeVersion).toBeNull();
  });
  it("setup concorrente emite uma obrigação e taxa inicial única; calendário preserva dia 31", async () => {
    const f = await contractFixture();
    const input = { workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, recurrenceMode: "LOCAL" as const, billingType: "UNDEFINED" as const };
    const [a, b] = await Promise.all([manualSubscriptionService.setup(input), manualSubscriptionService.setup(input)]);
    expect(a.firstInvoiceNumber).toBe(b.firstInvoiceNumber);
    const first = await prisma.gymInvoice.findFirstOrThrow({ where: { enrollmentId: f.enrollment.id } });
    expect(first.totalInCents).toBe(BigInt(10500));
    expect(first.paidAmountInCents).toBe(BigInt(0));
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ cycleCount: 1, nextDueDate: new Date("2026-02-28T12:00:00Z") });
    const cycleInput = { workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, dueDate: new Date("2026-02-28T12:00:00Z") };
    const [c, d] = await Promise.all([manualSubscriptionService.cycle(cycleInput), manualSubscriptionService.cycle(cycleInput)]);
    expect(c.invoiceId).toBe(d.invoiceId);
    expect(c.totalInCents).toBe(10000);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ cycleCount: 2, nextDueDate: new Date("2026-03-31T12:00:00Z") });
  });
  it("boolean do cliente e baixa parcial não ativam; recebimento integral persistido permite ativação", async () => {
    const f = await contractFixture();
    await manualSubscriptionService.setup({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, recurrenceMode: "LOCAL", billingType: "UNDEFINED" });
    await expect(activateGymEnrollment({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, paymentVerified: true })).rejects.toMatchObject({ code: "ACTIVATION_CONDITION_NOT_MET" });
    const invoice = await prisma.gymInvoice.findFirstOrThrow({ where: { enrollmentId: f.enrollment.id } });
    await manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, financialAccountId: f.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: 500, allocations: [{ invoiceId: invoice.id, amountInCents: 500 }], idempotencyKey: randomUUID() });
    await expect(activateGymEnrollment({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, paymentVerified: true })).rejects.toMatchObject({ code: "ACTIVATION_CONDITION_NOT_MET" });
    await manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, financialAccountId: f.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: 10000, allocations: [{ invoiceId: invoice.id, amountInCents: 10000 }], idempotencyKey: randomUUID() });
    expect(await activateGymEnrollment({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id })).toMatchObject({ status: "ACTIVE", accessGranted: true });
  });
  it("encerrar recorrência preserva mensalidades, matrícula e pagamentos", async () => {
    const f = await contractFixture();
    await manualSubscriptionService.setup({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, recurrenceMode: "LOCAL", billingType: "UNDEFINED" });
    await manualSubscriptionService.stop({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, cancellationReason: "Pedido sintético", immediate: true });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ status: "PENDING_ACTIVATION", subscriptionStatus: "CANCELLED" });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id, status: "OPEN" } })).toBe(1);
    await expect(manualSubscriptionService.cycle({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id })).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });
  it("a assinatura externa legada não é duplicada, cancelada nem convertida silenciosamente", async () => {
    const f = await contractFixture();
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { recurrenceMode: "PROVIDER", providerSubscriptionId: "synthetic-legacy" } });
    await expect(manualSubscriptionService.setup({ workspaceId: f.workspace.id, enrollmentId: f.enrollment.id, actorUserId: f.owner.id, recurrenceMode: "LOCAL", billingType: "UNDEFINED" })).rejects.toMatchObject({ code: "LEGACY_SUBSCRIPTION_REVIEW_REQUIRED" });
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ providerSubscriptionId: "synthetic-legacy", cycleCount: 0 });
    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id } })).toBe(0);
  });
  it("alçada não é concedida por ID de aprovador e matrícula de outro aluno é recusada", async () => {
    const [f, other] = await Promise.all([fixture(), contractFixture()]);
    const receptionist = await prisma.user.create({ data: { email: `reception-${randomUUID()}@example.invalid` } });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: receptionist.id, role: "RECEPTIONIST" } });
    const input = { idempotencyKey: randomUUID(), workspaceId: f.workspace.id, actorUserId: receptionist.id, studentMemberId: f.member.id, title: "Cobrança avulsa", dueDate: new Date(), items: [{ itemType: "SERVICE" as const, description: "Serviço", unitPriceInCents: 10000 }], discountInCents: 9000, discountReason: "Teste", discountAuthorizedByUserId: f.owner.id };
    await expect(issueManualInvoice(input)).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await expect(issueManualInvoice({ ...input, actorUserId: f.owner.id, discountInCents: 0, enrollmentId: other.enrollment.id })).rejects.toMatchObject({ code: "ENROLLMENT_NOT_FOUND" });
    const free = await issueManualInvoice({ ...input, actorUserId: f.owner.id, discountInCents: 10000 });
    expect(free).toMatchObject({ totalInCents: BigInt(0), paidAmountInCents: BigInt(0), discountAuthorizedByUserId: f.owner.id });
  });
  it("pagador estrangeiro não é resolvido por ID e não recebe identidade de outro aluno", async () => {
    const [a, b] = await Promise.all([fixture(), fixture()]);
    await expect(resolveGymPayer(a.workspace.id, { studentUserId: b.student.id, studentMemberId: a.member.id, customPayer: { name: "Pagador", cpfCnpj: "00000000000", email: "payer@example.invalid" } })).rejects.toMatchObject({ code: "STUDENT_NOT_FOUND" });
    const guardian = await prisma.gymGuardian.create({ data: { workspaceId: b.workspace.id, studentMemberId: b.member.id, name: "Responsável", cpf: "00000000000", phone: "00000000000", relationship: "PAI", verifiedAt: new Date() } });
    await expect(resolveGymPayer(a.workspace.id, { studentUserId: a.student.id, studentMemberId: a.member.id, guardianId: guardian.id })).rejects.toMatchObject({ code: "GUARDIAN_NOT_AUTHORIZED" });
  });
  it("caminhos wallet não produzem efeitos mesmo chamados diretamente", async () => {
    const f = await fixture();
    await expect(gymFinancialService.createGymBilling({ workspaceId: f.workspace.id, actorUserId: f.owner.id, studentUserId: f.student.id, title: "Teste", amountInCents: 100, paymentMethod: "PIX", dueDate: new Date() })).rejects.toMatchObject({ statusCode: 410 });
    expect(await prisma.studentBilling.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.walletPayoutRequest.count({ where: { account: { workspaceId: f.workspace.id } } })).toBe(0);
  });
});

describe("GYM real PostgreSQL — recebimentos e isolamento", () => {
  it("baixa parcial e integral; reversão recompõe obrigação e conta sem apagar histórico", async () => {
    const f = await fixture();
    const partial = await pay(f, 3000);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ paidAmountInCents: BigInt(3000), balanceRemainingInCents: BigInt(7000), status: "PARTIALLY_PAID" });
    await pay(f, 7000);
    await manualFinanceService.reversePayment({ workspaceId: f.workspace.id, paymentId: partial.id, actorUserId: f.owner.id, reversalReason: "Correção sintética" });
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ paidAmountInCents: BigInt(7000), balanceRemainingInCents: BigInt(3000), status: "PARTIALLY_PAID" });
    expect(await prisma.gymFinancialAccount.findUnique({ where: { id: f.account.id } })).toMatchObject({ balanceInCents: BigInt(7000) });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(2);
  });
  it("dois recebimentos concorrentes não excedem o saldo", async () => {
    const f = await fixture();
    const results = await Promise.allSettled([pay(f, 8000), pay(f, 8000)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ paidAmountInCents: BigInt(8000), balanceRemainingInCents: BigInt(2000) });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
  });
  it("retry concorrente da mesma chave cria apenas um recebimento", async () => {
    const f = await fixture();
    const key = randomUUID();
    const [first, second] = await Promise.all([pay(f, 4000, key), pay(f, 4000, key)]);
    expect(first.id).toBe(second.id);
    expect(await prisma.gymPaymentAllocation.count({ where: { paymentId: first.id } })).toBe(1);
    await expect(pay(f, 5000, key)).rejects.toMatchObject({ statusCode: 409 });
  });
  it("chave igual em academias diferentes não compartilha resultado", async () => {
    const [a, b] = await Promise.all([fixture(), fixture()]);
    const key = randomUUID();
    const [first, second] = await Promise.all([pay(a, 4000, key), pay(b, 4000, key)]);
    expect(first.id).not.toBe(second.id);
    expect(first.workspaceId).toBe(a.workspace.id);
    expect(second.workspaceId).toBe(b.workspace.id);
  });
  it("IDs de fatura/conta estrangeiros e aluno operador são recusados", async () => {
    const [a, b] = await Promise.all([fixture(), fixture()]);
    await expect(manualFinanceService.recordPayment({ workspaceId: a.workspace.id, actorUserId: a.owner.id, financialAccountId: a.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: 100, allocations: [{ invoiceId: b.invoice.id, amountInCents: 100 }], idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "INVOICE_NOT_FOUND" });
    await expect(manualFinanceService.recordPayment({ workspaceId: a.workspace.id, actorUserId: a.owner.id, financialAccountId: b.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: 100, allocations: [{ invoiceId: a.invoice.id, amountInCents: 100 }], idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "FINANCIAL_ACCOUNT_NOT_FOUND" });
    await expect(manualFinanceService.recordPayment({ workspaceId: a.workspace.id, actorUserId: a.student.id, financialAccountId: a.account.id, paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: 100, allocations: [{ invoiceId: a.invoice.id, amountInCents: 100 }], idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    expect(await prisma.gymPayment.count({ where: { workspaceId: a.workspace.id } })).toBe(0);
  });
  it("dinheiro exige caixa aberto; reversão cria compensação rastreável", async () => {
    const f = await fixture();
    const input = { workspaceId: f.workspace.id, actorUserId: f.owner.id, paymentMethod: "CASH" as const, amountInCents: 1000, allocations: [{ invoiceId: f.invoice.id, amountInCents: 1000 }], idempotencyKey: randomUUID() };
    await expect(manualFinanceService.recordPayment(input)).rejects.toMatchObject({ code: "CASH_DRAWER_NOT_OPEN" });
    const cash = await prisma.gymFinancialAccount.create({ data: { workspaceId: f.workspace.id, name: "Caixa sintético", accountType: "CASH" } });
    const session = await prisma.gymCashDrawerSession.create({ data: { workspaceId: f.workspace.id, financialAccountId: cash.id, sessionNumber: randomUUID(), openedByUserId: f.owner.id, openingAmountInCents: BigInt(0) } });
    const payment = await manualFinanceService.recordPayment(input);
    await Promise.all([manualFinanceService.reversePayment({ workspaceId: f.workspace.id, paymentId: payment.id, actorUserId: f.owner.id, reversalReason: "Teste" }), manualFinanceService.reversePayment({ workspaceId: f.workspace.id, paymentId: payment.id, actorUserId: f.owner.id, reversalReason: "Teste" })]);
    const movements = await prisma.gymCashDrawerMovement.findMany({ where: { sessionId: session.id } });
    expect(movements).toHaveLength(2);
    expect(movements.reduce((sum, movement) => sum + movement.amountInCents, BigInt(0))).toBe(BigInt(0));
    expect(await prisma.gymFinancialAccount.findUnique({ where: { id: cash.id } })).toMatchObject({ balanceInCents: BigInt(0) });
  });
  it("academia suspensa não aceita recebimento", async () => {
    const f = await fixture();
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(pay(f, 100)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
  });
  it("grants locais/revogados não recuperam papel legado", () => {
    expect(resolveAccessRoles("MANAGER", [{ role: "MANAGER", unitId: "a", revokedAt: null }], "b")).toEqual([]);
    expect(resolveAccessRoles("MANAGER", [{ role: "MANAGER", unitId: null, revokedAt: new Date() }])).toEqual([]);
  });
  it("prova Credentials tem consumo único e vínculo com senha", async () => {
    const f = await fixture();
    const proof = await issueCredentialProof(f.owner.id, "synthetic-password-hash");
    expect(await consumeCredentialProof(f.owner.id, "different-hash", proof)).toBe(false);
    const result = await Promise.all([consumeCredentialProof(f.owner.id, "synthetic-password-hash", proof), consumeCredentialProof(f.owner.id, "synthetic-password-hash", proof)]);
    expect(result.filter(Boolean)).toHaveLength(1);
  });
  it("solicitação de privacidade não modifica identidade compartilhada", async () => {
    const f = await fixture();
    const other = await prisma.workspace.create({ data: { name: "Personal sintético", slug: randomUUID(), ownerId: f.owner.id, type: "PERSONAL" } });
    await prisma.workspaceMember.create({ data: { workspaceId: other.id, userId: f.student.id, role: "STUDENT" } });
    const result = await GymOffboardingService.requestDataSubjectDeletion({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id });
    expect(result.status).toBe("PENDING");
    expect(await prisma.user.findUnique({ where: { id: f.student.id } })).toMatchObject({ email: f.student.email, name: f.student.name });
    expect(await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { workspaceId: other.id, userId: f.student.id } } })).toMatchObject({ isActive: true });
  });
});
