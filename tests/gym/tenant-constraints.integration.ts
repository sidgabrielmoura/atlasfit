import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { afterAll, beforeAll, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = new URL(process.env.DATABASE_URL || "http://invalid");
if (url.hostname !== "127.0.0.1" || url.port !== "56432" || url.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Requires the disposable test server.");
const database = `atlasfit_tenant_constraints_${randomUUID().replaceAll("-", "")}`;
const administration = new Client({ connectionString: "postgresql://atlasfit_test@127.0.0.1:56432/postgres" });
const connectionString = `postgresql://atlasfit_test@127.0.0.1:56432/${database}`;
const sql = new Client({ connectionString });
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const migration = readFileSync("prisma/baseline-migrations/20261009000000_gym_tenant_relations/migration.sql", "utf8");
beforeAll(async () => {
 expect(readFileSync("prisma/migrations/20261009000000_gym_tenant_relations/migration.sql", "utf8")).toBe(migration);
 await administration.connect(); await administration.query(`CREATE DATABASE "${database}"`);
 await sql.connect();
 await sql.query(readFileSync("prisma/baseline-migrations/0_atlasfit_20261007/migration.sql", "utf8"));
 await sql.query(migration);
 await sql.query(readFileSync("prisma/baseline-migrations/20261009200000_gym_reference_identity/migration.sql", "utf8"));
 await sql.query(readFileSync("prisma/baseline-migrations/20261009220000_gym_retention_hold/migration.sql", "utf8"));
 await sql.query(readFileSync("prisma/baseline-migrations/20261009230000_gym_scheduled_purge/migration.sql", "utf8"));
}, 120000);
afterAll(async () => { await db.$disconnect(); await sql.end(); await administration.end(); });
async function fixture() {
 const owner = await db.user.create({ data: {} });
 const gyms = await Promise.all(["A", "B"].map(name => db.workspace.create({ data: { type: "GYM", name, slug: randomUUID(), ownerId: owner.id } })));
 const units = await Promise.all(gyms.map(workspace => db.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } })));
 const members = await Promise.all(gyms.map(workspace => db.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } })));
 const versions = await Promise.all(gyms.map(workspace => db.gymPlanVersion.create({ data: { plan: { create: { workspaceId: workspace.id, name: "Plano" } }, name: "Plano", priceInCents: BigInt(1000), durationDays: 30, termsText: "Fixture" } })));
 const accounts = await Promise.all(gyms.map((workspace, index) => db.gymFinancialAccount.create({ data: { workspaceId: workspace.id, unitId: units[index].id, name: "Conta", accountType: "BANK_ACCOUNT" } })));
 return { owner, gyms, units, members, versions, accounts };
}
it("database rejects a second active or paused enrollment until the previous one ends", async () => {
 const f = await fixture();
 const base = { workspaceId: f.gyms[0].id, studentMemberId: f.members[0].id, planVersionId: f.versions[0].id, priceInCents: BigInt(1000), status: "ACTIVE" as const };
 const first = await db.gymEnrollment.create({ data: base });
 await expect(db.gymEnrollment.create({ data: { ...base, status: "PAUSED" } })).rejects.toThrow();
 expect(await db.gymEnrollment.count({ where: { workspaceId: f.gyms[0].id, studentMemberId: f.members[0].id } })).toBe(1);
 await db.gymEnrollment.update({ where: { id: first.id }, data: { status: "CANCELLED" } });
 await db.gymEnrollment.create({ data: base });
 expect(await db.gymEnrollment.count({ where: { workspaceId: f.gyms[0].id, status: "ACTIVE" } })).toBe(1);
});
it("same-tenant IDs still must identify the same student, guardian, invoice and signer", async () => {
 const f=await fixture(),otherUser=await db.user.create({data:{}});
 const other=await db.workspaceMember.create({data:{workspaceId:f.gyms[0].id,userId:otherUser.id,role:"STUDENT"}});
 const enrollment=await db.gymEnrollment.create({data:{workspaceId:f.gyms[0].id,studentMemberId:f.members[0].id,planVersionId:f.versions[0].id,priceInCents:BigInt(1000)}});
 const guardian=await db.gymGuardian.create({data:{workspaceId:f.gyms[0].id,studentMemberId:other.id,name:"Responsável de outro aluno",cpf:"52998224725",phone:"11999999999",relationship:"PAI"}});
 await expect(db.gymEnrollment.update({where:{id:enrollment.id},data:{billingPayerGuardianId:guardian.id}})).rejects.toThrow(/identity relation mismatch/);
 const invoice={workspaceId:f.gyms[0].id,studentMemberId:f.members[0].id,studentUserId:f.owner.id,enrollmentId:enrollment.id,invoiceNumber:randomUUID(),title:"Identidade",dueDate:new Date(),subtotalInCents:BigInt(1000),totalInCents:BigInt(1000),balanceRemainingInCents:BigInt(1000),payerName:"Fixture",createdByUserId:f.owner.id};
 await expect(db.gymInvoice.create({data:{...invoice,studentUserId:otherUser.id}})).rejects.toThrow(/identity relation mismatch/);
 await expect(db.gymInvoice.create({data:{...invoice,studentMemberId:other.id,studentUserId:otherUser.id}})).rejects.toThrow(/identity relation mismatch/);
 await expect(db.gymContractAcceptance.create({data:{workspaceId:f.gyms[0].id,enrollmentId:enrollment.id,signerUserId:otherUser.id,termsSnapshot:"Fixture",termsVersion:"1"}})).rejects.toThrow(/identity relation mismatch/);
 await expect(db.workspaceMember.update({where:{id:f.members[0].id},data:{userId:otherUser.id}})).rejects.toThrow(/identity cannot be replaced/);
 const created=await db.gymInvoice.create({data:invoice});
 await expect(db.gymInvoiceItem.create({data:{invoiceId:created.id,planVersionId:f.versions[1].id,description:"Foreign plan",unitPriceInCents:BigInt(1000),totalInCents:BigInt(1000)}})).rejects.toThrow(/tenant relation mismatch/);
});
it("GYM direct deletion stays blocked; coordinated purge and PERSONAL deletion remain distinct", async () => {
 const f=await fixture();
 for(const isActive of [true,false]) {await db.workspace.update({where:{id:f.gyms[0].id},data:{isActive}});await expect(db.workspace.delete({where:{id:f.gyms[0].id}})).rejects.toThrow(/coordinated authenticated purge/);}
 const personal=await db.workspace.create({data:{type:"PERSONAL",ownerId:f.owner.id,name:"Discardable",slug:randomUUID()}});
 await db.workspace.delete({where:{id:personal.id}});
 expect(await db.workspace.findUnique({where:{id:f.gyms[0].id}})).not.toBeNull();
});
it("database rejects foreign primary units, assignments and role grants", async () => {
 const f = await fixture();
 await expect(db.workspaceMember.update({ where: { id: f.members[0].id }, data: { unitId: f.units[1].id } })).rejects.toThrow(/tenant relation mismatch/);
 await expect(db.workspaceMember.update({ where: { id: f.members[0].id }, data: { assignedStaffId: f.members[1].id } })).rejects.toThrow(/tenant relation mismatch/);
 await expect(db.workspaceRoleGrant.create({ data: { memberId: f.members[0].id, unitId: f.units[1].id, role: "MANAGER" } })).rejects.toThrow(/tenant relation mismatch/);
});
it("enrollment, version and guardian references remain in their own academy", async () => {
 const f = await fixture();
 const base = { workspaceId: f.gyms[0].id, studentMemberId: f.members[0].id, planVersionId: f.versions[0].id, startDate: new Date(), priceInCents: BigInt(1000) };
 for (const change of [{ studentMemberId: f.members[1].id }, { planVersionId: f.versions[1].id }, { unitId: f.units[1].id }]) await expect(db.gymEnrollment.create({ data: { ...base, ...change } })).rejects.toThrow(/tenant relation mismatch/);
 await expect(db.gymGuardian.create({ data: { workspaceId: f.gyms[0].id, studentMemberId: f.members[1].id, name: "Fixture", cpf: "52998224725", phone: "11999999999", relationship: "PAI" } })).rejects.toThrow(/tenant relation mismatch/);
 await db.gymEnrollment.create({ data: base });
});
it("cash accounts, suppliers and categories cannot be linked across tenants", async () => {
 const f = await fixture();
 const categories = await Promise.all(f.gyms.map(workspace => db.gymExpenseCategory.create({ data: { workspaceId: workspace.id, name: "Categoria" } })));
 const base = { workspaceId: f.gyms[0].id, categoryId: categories[0].id, title: "Despesa", amountInCents: BigInt(1000), competenceMonth: "2026-10", dueDate: new Date(), createdByUserId: f.owner.id };
 await expect(db.gymExpense.create({ data: { ...base, categoryId: categories[1].id } })).rejects.toThrow(/tenant relation mismatch/);
 await expect(db.gymExpense.create({ data: { ...base, financialAccountId: f.accounts[1].id } })).rejects.toThrow(/tenant relation mismatch/);
 await expect(db.gymAccountTransfer.create({ data: { workspaceId: f.gyms[0].id, fromAccountId: f.accounts[0].id, toAccountId: f.accounts[1].id, amountInCents: BigInt(100), performedByUserId: f.owner.id } })).rejects.toThrow(/tenant relation mismatch/);
 await expect(db.gymCashDrawerSession.create({ data: { workspaceId: f.gyms[0].id, financialAccountId: f.accounts[1].id, sessionNumber: randomUUID(), openedByUserId: f.owner.id, openingAmountInCents: BigInt(0) } })).rejects.toThrow(/tenant relation mismatch/);
});
it("direct allocation writers cannot combine a payment and invoice from different academies", async () => {
 const f = await fixture();
 const invoice = await db.gymInvoice.create({ data: { workspaceId: f.gyms[1].id, studentMemberId: f.members[1].id, studentUserId: f.owner.id, invoiceNumber: randomUUID(), title: "Fixture", dueDate: new Date(), subtotalInCents: BigInt(1000), totalInCents: BigInt(1000), balanceRemainingInCents: BigInt(1000), payerName: "Fixture", createdByUserId: f.owner.id } });
 const payment = await db.gymPayment.create({ data: { workspaceId: f.gyms[0].id, paymentNumber: randomUUID(), receiptNumber: randomUUID(), idempotencyKey: randomUUID(), paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: BigInt(1000), payerName: "Fixture", receivedByUserId: f.owner.id } });
 await expect(db.gymPaymentAllocation.create({ data: { paymentId: payment.id, invoiceId: invoice.id, allocatedAmountInCents: BigInt(1000) } })).rejects.toThrow(/tenant relation mismatch/);
});
it("reparenting and changing product type cannot invalidate historical links", async () => {
 const f = await fixture();
 await expect(db.gymUnit.update({ where: { id: f.units[0].id }, data: { workspaceId: f.gyms[1].id } })).rejects.toThrow(/explicit transfer/);
 await expect(db.workspace.update({ where: { id: f.gyms[0].id }, data: { type: "PERSONAL" } })).rejects.toThrow(/separate audited migration/);
 await expect(db.gymPlanVersion.update({ where: { id: f.versions[0].id }, data: { planId: f.versions[1].planId } })).rejects.toThrow(/cannot move/);
});
it("inherited scopes cannot move between academies or into PERSONAL even without a unit", async () => {
 const f = await fixture();
 const personal = await db.workspace.create({ data: { type: "PERSONAL", name: "PERSONAL", slug: randomUUID(), ownerId: f.owner.id } });
 const member = await db.workspaceMember.create({ data: { workspaceId: personal.id, userId: f.owner.id, role: "OWNER" } });
 const grant = await db.workspaceRoleGrant.create({ data: { memberId: f.members[0].id, role: "FINANCE" } });
 for (const memberId of [f.members[1].id, member.id]) await expect(db.workspaceRoleGrant.update({ where: { id: grant.id }, data: { memberId } })).rejects.toThrow(/explicit transfer/);
 await expect(db.workspaceMember.update({ where: { id: member.id }, data: { unitId: f.units[0].id } })).rejects.toThrow(/tenant relation mismatch/);
 expect((await db.workspaceRoleGrant.findUniqueOrThrow({ where: { id: grant.id } })).memberId).toBe(f.members[0].id);
 const payments = await Promise.all([...f.gyms, personal].map(workspace => db.gymPayment.create({ data: { workspaceId: workspace.id, paymentNumber: randomUUID(), receiptNumber: randomUUID(), idempotencyKey: randomUUID(), paymentMethod: "BANK_TRANSFER_MANUAL", amountInCents: BigInt(1000), payerName: "Fixture", receivedByUserId: f.owner.id } })));
 const invoice = await db.gymInvoice.create({ data: { workspaceId: f.gyms[0].id, studentMemberId: f.members[0].id, studentUserId: f.owner.id, invoiceNumber: randomUUID(), title: "Fixture", dueDate: new Date(), subtotalInCents: BigInt(1000), totalInCents: BigInt(1000), balanceRemainingInCents: BigInt(1000), payerName: "Fixture", createdByUserId: f.owner.id } });
 const allocation = await db.gymPaymentAllocation.create({ data: { paymentId: payments[0].id, invoiceId: invoice.id, allocatedAmountInCents: BigInt(1000) } });
 for (const payment of payments.slice(1)) await expect(db.gymPaymentAllocation.update({ where: { id: allocation.id }, data: { paymentId: payment.id } })).rejects.toThrow(/explicit transfer/);
 const expenses = await Promise.all([...f.gyms, personal].map(async workspace => {
  const category = await db.gymExpenseCategory.create({ data: { workspaceId: workspace.id, name: "Fixture" } });
  return db.gymExpense.create({ data: { workspaceId: workspace.id, categoryId: category.id, title: "Fixture", amountInCents: BigInt(1000), competenceMonth: "2026-10", dueDate: new Date(), createdByUserId: f.owner.id } });
 }));
 const expensePayment = await db.gymExpensePayment.create({ data: { expenseId: expenses[0].id, financialAccountId: f.accounts[0].id, amountInCents: BigInt(1000), paidAt: new Date(), recordedByUserId: f.owner.id, idempotencyKey: randomUUID(), requestFingerprint: randomUUID() } });
 for (const expense of expenses.slice(1)) await expect(db.gymExpensePayment.update({ where: { id: expensePayment.id }, data: { expenseId: expense.id } })).rejects.toThrow(/explicit transfer/);
});
it("PERSONAL-only relations retain their existing behavior", async () => {
 const f = await fixture();
 const personal = await Promise.all(["P1", "P2"].map(name => db.workspace.create({ data: { type: "PERSONAL", name, slug: randomUUID(), ownerId: f.owner.id } })));
 const unit = await db.gymUnit.create({ data: { workspaceId: personal[1].id, name: "Fixture legada PERSONAL" } });
 const member = await db.workspaceMember.create({ data: { workspaceId: personal[0].id, userId: f.owner.id, role: "OWNER", unitId: unit.id } });
 await db.workspaceMember.update({ where: { id: member.id }, data: { workspaceId: personal[1].id } });
});
it("migration detects historical inconsistencies and rolls back without guessing relationships", async () => {
 const f = await fixture();
 await sql.query('BEGIN');
 try {
  await sql.query('ALTER TABLE "WorkspaceMember" DISABLE TRIGGER "gym_scope_unitId"');
  await sql.query('UPDATE "WorkspaceMember" SET "unitId"=$1 WHERE id=$2', [f.units[1].id, f.members[0].id]);
  await expect(sql.query(migration)).rejects.toThrow(/Reconcile GYM relation WorkspaceMember.unitId/);
 } finally { await sql.query('ROLLBACK'); }
 expect((await db.workspaceMember.findUniqueOrThrow({ where: { id: f.members[0].id } })).unitId).toBeNull();
 await sql.query(migration); // repeatable on already consistent data
});
it("a late preflight failure rolls back earlier trigger replacements", async () => {
 const f = await fixture();
 const grant = await db.workspaceRoleGrant.create({ data: { memberId: f.members[0].id, role: "FINANCE", unitId: f.units[0].id } });
 const trigger = 'SELECT oid FROM pg_trigger WHERE tgrelid=\'"WorkspaceMember"\'::regclass AND tgname=\'gym_scope_unitId\'';
 const before = (await sql.query(trigger)).rows[0].oid;
 await sql.query('ALTER TABLE "WorkspaceRoleGrant" DISABLE TRIGGER "gym_scope_unitId"');
 try {
  await sql.query('UPDATE "WorkspaceRoleGrant" SET "unitId"=$1 WHERE id=$2', [f.units[1].id, grant.id]);
  await expect(sql.query(migration)).rejects.toThrow(/Reconcile GYM relation WorkspaceRoleGrant.unitId/);
  await sql.query('ROLLBACK');
  expect((await sql.query(trigger)).rows[0].oid).toBe(before);
 } finally {
  await sql.query('ROLLBACK');
  await sql.query('DELETE FROM "WorkspaceRoleGrant" WHERE id=$1', [grant.id]);
  await sql.query('ALTER TABLE "WorkspaceRoleGrant" ENABLE TRIGGER "gym_scope_unitId"');
 }
 await sql.query(migration);
});
