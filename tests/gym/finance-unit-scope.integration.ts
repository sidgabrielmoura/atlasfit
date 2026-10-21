import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { manualFinanceService } from "@/modules/workspaces/application/manual-finance-service";
import { issueManualInvoice } from "@/modules/workspaces/application/manual-invoice-service";
import { gymInvoiceService } from "@/modules/workspaces/application/invoice-service";
import { resolveGymPayer } from "@/modules/workspaces/application/payer-service";
import type { WorkspaceContext } from "@/modules/workspaces/domain/types";
import { listGymStudents } from "@/modules/workspaces/application/gym-student-queries";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function fixture(grants = true) {
  const owner = await prisma.user.create({ data: { name: "Titular financeiro sintético" } });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, ownerId: owner.id, type: "GYM", name: "Financeiro por unidade", slug: `finance-unit-${randomUUID()}`, members: { create: { userId: owner.id, role: "OWNER" } }, settings: { create: { timezone: "Asia/Tokyo" } } } });
  const units = await Promise.all(["A", "B"].map(name => prisma.gymUnit.create({ data: { workspaceId: workspace.id, name } })));
  const operator = await prisma.user.create({ data: { name: "Gestor local sintético" } });
  const staff = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: operator.id, role: "MANAGER", unitId: units[0].id, ...(grants ? { roleGrants: { create: { role: "MANAGER", unitId: units[0].id } } } : {}) } });
  const students = await Promise.all(units.map(async unit => {
    const user = await prisma.user.create({ data: { name: `Aluno ${unit.name} sintético` } });
    return prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: {} } } });
  }));
  const accounts = await Promise.all(units.map(unit => prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: unit.id, name: `Banco ${unit.name}`, accountType: "BANK_ACCOUNT" } })));
  const central = await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, name: "Conta central", accountType: "BANK_ACCOUNT" } });
  const invoices = await Promise.all(students.map(student => issueManualInvoice({ idempotencyKey: randomUUID(), workspaceId: workspace.id, actorUserId: owner.id, studentMemberId: student.id, title: "Avulsa por unidade", dueDate: "2026-10-10", items: [{ itemType: "PLAN_SUBSCRIPTION", description: "Mensalidade", unitPriceInCents: 10000 }] })));
  return { owner, workspace, units, operator, staff, students, accounts, central, invoices };
}
describe("Financeiro GYM — avulsas e retries sob a unidade real", () => {
  it("grant local emite/recebe/reverte na unidade; listagem e recibo não expõem outra unidade", async () => {
    const f = await fixture();
    expect(f.invoices[0].dueDate.toISOString()).toBe("2026-10-09T15:00:00.000Z");
    const input = { workspaceId: f.workspace.id, actorUserId: f.operator.id, paymentMethod: "BANK_TRANSFER_MANUAL" as const, financialAccountId: f.accounts[0].id, amountInCents: 3000, allocations: [{ invoiceId: f.invoices[0].id, amountInCents: 3000 }], idempotencyKey: randomUUID() };
    const [first, repeated] = await Promise.all([manualFinanceService.recordPayment(input), manualFinanceService.recordPayment(input)]);
    expect(first.id).toBe(repeated.id);
    expect((await gymInvoiceService.listInvoices(f.workspace.id, {}, f.operator.id)).invoices.map(invoice => invoice.id)).toEqual([f.invoices[0].id]);
    expect((await gymInvoiceService.listPayments(f.workspace.id, {}, f.operator.id)).payments.map(payment => payment.id)).toEqual([first.id]);
    expect(await gymInvoiceService.getPaymentReceipt(f.workspace.id, first.id, f.operator.id)).toMatchObject({ amountInCents: 3000 });
    await expect(gymInvoiceService.listInvoices(f.workspace.id, { unitId: f.units[1].id }, f.operator.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(manualFinanceService.recordPayment({ ...input, idempotencyKey: randomUUID(), financialAccountId: f.accounts[1].id, allocations: [{ invoiceId: f.invoices[1].id, amountInCents: 3000 }] })).rejects.toMatchObject({ statusCode: 403 });
    await expect(manualFinanceService.recordPayment({ ...input, idempotencyKey: randomUUID(), financialAccountId: f.central.id })).rejects.toMatchObject({ statusCode: 403 });
    await expect(manualFinanceService.recordPayment({ ...input, posNsu: "Metadado alterado" })).rejects.toMatchObject({ statusCode: 409 });
    await manualFinanceService.reversePayment({ workspaceId: f.workspace.id, actorUserId: f.operator.id, paymentId: first.id, reversalReason: "Correção sintética" });
    expect(await prisma.gymFinancialAccount.findUnique({ where: { id: f.accounts[0].id } })).toMatchObject({ balanceInCents: BigInt(0) });
    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoices[0].id } })).toMatchObject({ paidAmountInCents: BigInt(0), balanceRemainingInCents: BigInt(10000) });
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.staff.id }, data: { revokedAt: new Date() } });
    await expect(manualFinanceService.recordPayment(input)).rejects.toMatchObject({ statusCode: 403 });
    await expect(gymInvoiceService.getPaymentReceipt(f.workspace.id, first.id, f.operator.id)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("papel legado da unidade não vira global; dados de aluno e fatura avulsa respeitam escopo", async () => {
    const f = await fixture(false);
    const input = { idempotencyKey: randomUUID(), workspaceId: f.workspace.id, actorUserId: f.operator.id, studentMemberId: f.students[0].id, title: "Fatura local", dueDate: new Date(), items: [{ itemType: "ENROLLMENT_FEE" as const, description: "Taxa", unitPriceInCents: 1000 }] };
    await issueManualInvoice(input);
    const fractional = await issueManualInvoice({ ...input, actorUserId: f.owner.id, idempotencyKey: randomUUID(), discountPercentage: 0.29, discountReason: "Percentual válido com duas casas" });
    expect(fractional.discountInCents).toBe(BigInt(3));
    await expect(issueManualInvoice({ ...input, idempotencyKey: randomUUID(), studentMemberId: f.students[1].id })).rejects.toMatchObject({ statusCode: 403 });
    const unassigned = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: (await prisma.user.create({ data: { name: "Aluno sem unidade" } })).id, role: "STUDENT" } });
    await expect(issueManualInvoice({ ...input, idempotencyKey: randomUUID(), studentMemberId: unassigned.id })).rejects.toMatchObject({ code: "UNIT_REQUIRED" });
    const context: WorkspaceContext = { userId: f.operator.id, userEmail: null, userRole: "USER", workspaceId: f.workspace.id, workspaceName: f.workspace.name, workspaceSlug: f.workspace.slug, workspaceType: "GYM", memberId: f.staff.id, memberRole: "MANAGER", roles: ["MANAGER"], capabilities: new Set(["students.read"]), hasCapability: capability => capability === "students.read", isOwner: false, isActive: true, isSuperAdmin: false };
    const shown = await listGymStudents({ workspaceId: f.workspace.id, actorContext: context });
    expect(shown.students.map(student => student.id)).toEqual([f.students[0].id]);
    await expect(issueManualInvoice({ ...input, discountInCents: -1 })).rejects.toMatchObject({ statusCode: 400 });
    await expect(issueManualInvoice({ ...input, customPayer: { name: "Pagador sintético", cpfCnpj: "11111111111", email: "" } })).rejects.toMatchObject({ statusCode: 400 });
  });
  it("fatura com FK estrangeiro, grant estudantil revogado e dinheiro impreciso não contornam os comandos", async () => {
    const f = await fixture(), other = await fixture();
    const corrupted = await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: other.students[0].id, studentUserId: other.students[0].userId, invoiceNumber: `CORRUPT-${randomUUID()}`, title: "FK sintético incompatível", dueDate: new Date(), subtotalInCents: BigInt(1000), totalInCents: BigInt(1000), balanceRemainingInCents: BigInt(1000), payerName: "Legado", createdByUserId: f.owner.id } });
    await expect(manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, paymentMethod: "BANK_TRANSFER_MANUAL", financialAccountId: f.accounts[0].id, amountInCents: 1000, allocations: [{ invoiceId: corrupted.id, amountInCents: 1000 }], idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "TENANT_MISMATCH" });
    expect((await gymInvoiceService.listInvoices(f.workspace.id, {}, f.owner.id)).invoices.map(invoice => invoice.id)).not.toContain(corrupted.id);
    await prisma.workspaceRoleGrant.create({ data: { memberId: f.students[0].id, role: "STUDENT", unitId: f.units[0].id, revokedAt: new Date() } });
    await expect(resolveGymPayer(f.workspace.id, { studentUserId: f.students[0].userId, studentMemberId: f.students[0].id })).rejects.toMatchObject({ statusCode: 404 });
    await expect(manualFinanceService.recordPayment({ workspaceId: f.workspace.id, actorUserId: f.owner.id, paymentMethod: "BANK_TRANSFER_MANUAL", financialAccountId: f.accounts[0].id, amountInCents: 1000.5, allocations: [{ invoiceId: f.invoices[0].id, amountInCents: 1000.5 }], idempotencyKey: randomUUID() })).rejects.toMatchObject({ statusCode: 400 });
    expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
});
