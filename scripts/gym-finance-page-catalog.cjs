const fs = require('node:fs');
function edit(file, transform) { const text = fs.readFileSync(file, 'utf8'); fs.writeFileSync(file, transform(text)); }
edit('src/modules/workspaces/application/cash-drawer-expense-service.ts', text => {
  if (text.includes('from "./gym-expense-catalog"')) throw new Error('Transformação já aplicada.');
  text = 'import * as expenseCatalog from "./gym-expense-catalog";\n' + text;
  text = text.replace('export interface CreateExpenseCategoryInput {\n', 'export interface CreateExpenseCategoryInput {\n  actorUserId: string;\n').replace('export interface CreateSupplierInput {\n', 'export interface CreateSupplierInput {\n  actorUserId: string;\n');
  // Normalize Windows line endings before matching the old sections.
  text = text.replaceAll('\r\n', '\n');
  text = text.replace('export interface CreateExpenseCategoryInput {\n  workspaceId:', 'export interface CreateExpenseCategoryInput {\n  actorUserId: string;\n  workspaceId:').replace('export interface CreateSupplierInput {\n  workspaceId:', 'export interface CreateSupplierInput {\n  actorUserId: string;\n  workspaceId:');
  const start = text.indexOf('  /**\n   * Garante a existência de uma conta padrão');
  const end = text.indexOf('  /**\n   * Lista todas as contas financeiras', start);
  if (start < 0 || end < 0) throw new Error('Bloco de conta órfã não localizado.');
  text = text.slice(0, start) + text.slice(end);
  const catalogStart = text.indexOf('  /**\n   * Garante categorias');
  const catalogEnd = text.indexOf('  // ==========================================\n  // 3.', catalogStart);
  if (catalogStart < 0 || catalogEnd < 0) throw new Error('Catálogo antigo não localizado.');
  return text.slice(0, catalogStart) + `  async listExpenseCategories(workspaceId: string, actorUserId: string) { return expenseCatalog.listExpenseCategories(workspaceId, actorUserId); }
  async initializeExpenseCategories(workspaceId: string, actorUserId: string) { return expenseCatalog.initializeExpenseCategories(workspaceId, actorUserId); }
  async createExpenseCategory(input: CreateExpenseCategoryInput) { return expenseCatalog.createExpenseCategory(input); }
  async listSuppliers(workspaceId: string, actorUserId: string) { return expenseCatalog.listSuppliers(workspaceId, actorUserId); }
  async createSupplier(input: CreateSupplierInput) { return expenseCatalog.createSupplier(input); }

` + text.slice(catalogEnd);
});
edit('src/app/(gym)/gym/finance/page.tsx', text => {
 text = text.replaceAll('\r\n', '\n');
 text = text.replace('requireWorkspaceAccess, gymInvoiceService', 'requireGymWorkspaceAccess as requireWorkspaceAccess, gymInvoiceService');
 text = text.replace('import prisma from "@/lib/prisma";\n', '').replace('import { gymFinanceUnitReadScope } from "@/modules/workspaces/application/manual-finance-authority";', 'import { getGymFinancePageData } from "@/modules/workspaces/application/gym-finance-page-data";').replace('import { studentMembershipWhere } from "@/modules/workspaces/domain/student-membership";\n', '');
 text = text.replace('workspaceId: workspace.workspaceId, capability: "invoices.read"', 'workspaceId: workspace.workspaceId');
 const start = text.indexOf('  const scope ='); const end = text.indexOf('  return <GymFinanceClient', start);
 if (start < 0 || end < 0) throw new Error('Carga financeira não localizada.');
 text = text.slice(0, start) + `  const { capabilities, students, enrollments, guardians, accounts } = await getGymFinancePageData(context.workspaceId, context.userId);
  const invoices = await gymInvoiceService.listInvoices(context.workspaceId, { page: 1, limit: 20 }, context.userId);
  const payments = capabilities.includes("payments.read")
    ? await gymInvoiceService.listPayments(context.workspaceId, { page: 1, limit: 20 }, context.userId)
    : { payments: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
` + text.slice(end);
 return text.replace('userCapabilities={[...context.capabilities]}', 'userCapabilities={capabilities}');
});
console.log('Página financeira e catálogo delegados aos serviços com ator explícito.');
