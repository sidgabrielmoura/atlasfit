import { z } from "zod";
import { WorkspaceAccessError } from "../domain/types";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { getGymUnitAccess } from "./gym-unit-access";

const id = z.string().trim().min(1).max(100);
const optionalText = z.string().trim().max(200).optional();
export const expenseCategoryRequestSchema = z.object({ workspaceId: id, name: z.string().trim().min(1).max(100), code: z.string().trim().max(50).optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).strict();
export const supplierRequestSchema = z.object({ workspaceId: id, tradeName: z.string().trim().min(1).max(200), corporateName: optionalText, cnpjCpf: z.string().regex(/^(?:\d{11}|\d{14})$/).optional(), email: z.string().email().max(254).optional(), phone: z.string().trim().max(30).optional(), contactName: optionalText, notes: z.string().trim().max(2000).optional() }).strict();
export const initializeExpenseCategoriesSchema = z.object({ workspaceId: id, initializeDefaults: z.literal(true) }).strict();
export const expenseCatalogQuerySchema = z.object({ workspaceId: id }).strict();
const categorySelect = { id: true, name: true, code: true, color: true } as const;
const supplierSelect = { id: true, tradeName: true, corporateName: true, cnpjCpf: true, email: true, phone: true, contactName: true } as const;

// Shared catalog metadata has no unit or balance; financial facts retain their own unit ACL.
export async function provisionExpenseCategories(tx: GymTransactionClient, workspaceId: string) {
  const defaults = [
    { name: "Aluguel & Condomínio", code: "ALUGUEL", color: "#6366f1" },
    { name: "Energia Elétrica & Água", code: "UTILIDADES", color: "#eab308" },
    { name: "Manutenção de Equipamentos", code: "MANUTENCAO", color: "#f97316" },
    { name: "Limpeza & Conservação", code: "LIMPEZA", color: "#14b8a6" },
    { name: "Folha / Pró-labore", code: "PESSOAL", color: "#ec4899" },
    { name: "Marketing & Publicidade", code: "MARKETING", color: "#a855f7" },
    { name: "Sistemas & Tecnologia", code: "TI", color: "#3b82f6" },
    { name: "Impostos & Tributos", code: "IMPOSTOS", color: "#ef4444" },
    { name: "Outras Despesas Operacionais", code: "OUTROS", color: "#64748b" },
  ];
  await tx.gymExpenseCategory.createMany({ data: defaults.map(category => ({ ...category, workspaceId })), skipDuplicates: true });
}
function parse<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise os dados do catálogo financeiro.");
  return parsed.data;
}
export function listExpenseCategories(workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, workspaceId, actorUserId, "invoices.read");
    return tx.gymExpenseCategory.findMany({ where: { workspaceId, isActive: true }, select: categorySelect, orderBy: [{ name: "asc" }, { id: "asc" }] });
  });
}
export function initializeExpenseCategories(workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, workspaceId, actorUserId, "invoices.issue");
    await provisionExpenseCategories(tx, workspaceId);
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_EXPENSE_CATEGORIES_INITIALIZED", entity: "WORKSPACE", entityId: workspaceId } });
    return tx.gymExpenseCategory.findMany({ where: { workspaceId, isActive: true }, select: categorySelect, orderBy: [{ name: "asc" }, { id: "asc" }] });
  });
}
export function createExpenseCategory(raw: unknown) {
  const data = parse(expenseCategoryRequestSchema.extend({ actorUserId: id }), raw);
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, data.workspaceId, data.actorUserId, "invoices.issue");
    const category = await tx.gymExpenseCategory.upsert({ where: { workspaceId_name: { workspaceId: data.workspaceId, name: data.name } }, update: {}, create: { workspaceId: data.workspaceId, name: data.name, code: data.code, color: data.color ?? "#6366f1" }, select: categorySelect });
    await tx.auditLog.create({ data: { userId: data.actorUserId, action: "GYM_EXPENSE_CATEGORY_CREATED", entity: "GYM_EXPENSE_CATEGORY", entityId: category.id } });
    return category;
  });
}
export function listSuppliers(workspaceId: string, actorUserId: string) {
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, workspaceId, actorUserId, "invoices.read");
    return tx.gymSupplier.findMany({ where: { workspaceId, isActive: true }, select: supplierSelect, orderBy: [{ tradeName: "asc" }, { id: "asc" }] });
  });
}
export function createSupplier(raw: unknown) {
  const data = parse(supplierRequestSchema.extend({ actorUserId: id }), raw);
  return serializableTransaction(async tx => {
    await getGymUnitAccess(tx, data.workspaceId, data.actorUserId, "invoices.issue");
    const { actorUserId, ...supplier } = data;
    const created = await tx.gymSupplier.create({ data: supplier, select: supplierSelect });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_SUPPLIER_CREATED", entity: "GYM_SUPPLIER", entityId: created.id } });
    return created;
  });
}
