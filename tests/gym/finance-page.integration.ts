import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { getGymFinancePageData } from "@/modules/workspaces/application/gym-finance-page-data";
import { GymCashExpenseService } from "@/modules/workspaces/application/cash-drawer-expense-service";
import { provisionGymWorkspace } from "@/modules/workspaces/application/gym-provisioning";
import { issueManualInvoice } from "@/modules/workspaces/application/manual-invoice-service";
import { gymInvoiceService } from "@/modules/workspaces/application/invoice-service";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
const service = new GymCashExpenseService();
async function fixture() {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, ownerId: owner.id, type: "GYM", name: "Financeiro de unidades", slug: randomUUID(), members: { create: { userId: owner.id, role: "OWNER" } } } });
  const a = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade A" } });
  const b = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade B" } });
  const actor = await prisma.user.create({ data: {} });
  const staff = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: actor.id, role: "MANAGER", unitId: a.id } });
  const grant = await prisma.workspaceRoleGrant.create({ data: { memberId: staff.id, unitId: a.id, role: "FINANCE" } });
  const students = [];
  for (const unit of [a, b]) {
    const user = await prisma.user.create({ data: { name: unit.name, password: "nao-expor" } });
    students.push(await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, userId: user.id, role: "STUDENT", studentProfile: { create: {} } } }));
    await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: unit.id, name: unit.name, accountType: "BANK_ACCOUNT" } });
  }
  await prisma.gymFinancialAccount.create({ data: { workspaceId: workspace.id, name: "Central", accountType: "BANK_ACCOUNT" } });
  return { owner, workspace, actor, staff, grant, a, b, students };
}
describe("GYM PostgreSQL — jornada financeira por unidade", () => {
  it("emissão concorrente e retry criam uma obrigação; intenção alterada conflita e revogação/suspensão bloqueiam replay", async () => {
    const f = await fixture();
    const input = { workspaceId: f.workspace.id, actorUserId: f.actor.id, studentMemberId: f.students[0].id, idempotencyKey: randomUUID(), title: "Obrigação avulsa única", dueDate: "2026-10-10", items: [{ itemType: "SERVICE" as const, description: "Serviço", unitPriceInCents: 1000 }] };
    const [first, repeated] = await Promise.all([issueManualInvoice(input), issueManualInvoice(input)]);
    expect(first.id).toBe(repeated.id);
    expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { entityId: first.id, action: `GYM_INVOICE_CREATED:${first.id}` } })).toBe(1);
    await expect(issueManualInvoice({ ...input, title: "Intenção diferente" })).rejects.toMatchObject({ statusCode: 409 });
    const listed = await gymInvoiceService.listInvoices(f.workspace.id, {}, f.actor.id);
    expect(listed.invoices).toHaveLength(1); expect(JSON.stringify(listed)).not.toContain("issuanceFingerprint");
    await prisma.workspaceRoleGrant.update({ where: { id: f.grant.id }, data: { revokedAt: new Date() } });
    await expect(issueManualInvoice(input)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspaceRoleGrant.update({ where: { id: f.grant.id }, data: { revokedAt: null } });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(issueManualInvoice(input)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
  });
  it("formulários e controles refletem a unidade autorizada; grants revogados não restauram o papel legado", async () => {
    const f = await fixture();
    const local = await getGymFinancePageData(f.workspace.id, f.actor.id);
    expect(local.students.map(student => student.id)).toEqual([f.students[0].id]);
    expect(local.accounts.map(account => account.name)).toEqual(["Unidade A"]);
    expect(local.capabilities).toContain("invoices.issue");
    expect(local.capabilities).toContain("payments.record");
    expect(local.capabilities).not.toContain("workspace.manage");
    expect(JSON.stringify(local)).not.toContain("nao-expor");
    await prisma.workspaceRoleGrant.update({ where: { id: f.grant.id }, data: { unitId: f.b.id } });
    expect((await getGymFinancePageData(f.workspace.id, f.actor.id)).students.map(student => student.id)).toEqual([f.students[1].id]);
    await prisma.workspaceRoleGrant.update({ where: { id: f.grant.id }, data: { revokedAt: new Date() } });
    await expect(getGymFinancePageData(f.workspace.id, f.actor.id)).rejects.toMatchObject({ statusCode: 403 });
    const ownerData = await getGymFinancePageData(f.workspace.id, f.owner.id);
    expect(ownerData.students).toHaveLength(2); expect(ownerData.accounts).toHaveLength(3);
  });
  it("consulta não provisiona catálogo; ação explícita é concorrente e autorizada, e novo provisionamento é completo", async () => {
    const f = await fixture();
    expect(await service.listExpenseCategories(f.workspace.id, f.actor.id)).toEqual([]);
    expect(await prisma.gymExpenseCategory.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    await Promise.all([service.initializeExpenseCategories(f.workspace.id, f.actor.id), service.initializeExpenseCategories(f.workspace.id, f.actor.id)]);
    expect(await service.listExpenseCategories(f.workspace.id, f.actor.id)).toHaveLength(9);
    const input = { workspaceId: f.workspace.id, actorUserId: f.actor.id, name: "Categoria local", color: "#123abc" };
    const categories = await Promise.all([service.createExpenseCategory(input), service.createExpenseCategory(input)]);
    expect(categories[0].id).toBe(categories[1].id);
    await expect(service.createExpenseCategory({ ...input, color: "url(javascript:invalid)" })).rejects.toMatchObject({ statusCode: 400 });
    const supplier = await service.createSupplier({ workspaceId: f.workspace.id, actorUserId: f.actor.id, tradeName: "Fornecedor sintético", email: "catalog@example.invalid" });
    expect((await service.listSuppliers(f.workspace.id, f.actor.id)).map(item => item.id)).toEqual([supplier.id]);
    await expect(service.listSuppliers(f.workspace.id, f.students[0].userId)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspaceRoleGrant.update({ where: { id: f.grant.id }, data: { revokedAt: new Date() } });
    await expect(service.listExpenseCategories(f.workspace.id, f.actor.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.initializeExpenseCategories(f.workspace.id, f.actor.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(service.listSuppliers(f.workspace.id, f.owner.id)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
    const admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
    const provisioned = await provisionGymWorkspace({ name: "Academia provisionada", slug: `catalog-${randomUUID()}`, type: "GYM", ownerId: f.owner.id }, admin.id);
    expect(await prisma.gymExpenseCategory.count({ where: { workspaceId: provisioned.id } })).toBe(9);
    expect(await prisma.gymUnit.count({ where: { workspaceId: provisioned.id } })).toBe(1);
  });
});
