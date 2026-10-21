const fs = require('node:fs');
const file = 'src/modules/workspaces/application/cash-drawer-expense-service.ts';
let source = fs.readFileSync(file, 'utf8');
const start = source.indexOf('  async listExpenses(params: {');
const end = source.indexOf('\n  /**', start);
if (start < 0 || end < 0) throw new Error('Consulta de despesas não localizada.');
let part = source.slice(start, end);
part = part.replace('    workspaceId: string;', '    workspaceId: string;\n    actorUserId: string;\n    unitId?: string;');
part = part.replace('    const now = new Date();', '    if (!params.actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator necessário para consultar despesas.");\n    return serializableTransaction(async tx => {\n    const scope = await gymFinanceUnitReadScope(tx, workspaceId, params.actorUserId, "invoices.read", params.unitId);\n    const units = { OR: [{ unitId: { in: scope.unitIds } }, ...(scope.includeUnassigned ? [{ unitId: null }] : [])] };\n    const now = new Date();');
part = part.replace('      workspaceId,\n      ...(status', '      workspaceId,\n      AND: [units],\n      ...(status');
part = part.replaceAll('prisma.gymExpense.', 'tx.gymExpense.');
const tail = part.lastIndexOf('\n  }');
part = part.slice(0, tail) + '\n    });' + part.slice(tail);
if (!part.includes('AND: [units]')) throw new Error('Escopo de despesa não aplicado.');
source = source.slice(0, start) + part + source.slice(end);
fs.writeFileSync(file, source);
const test = 'tests/gym/cash-expense.integration.ts';
let text = fs.readFileSync(test, 'utf8').replaceAll('service.listExpenses({ workspaceId: f.workspace.id,', 'service.listExpenses({ workspaceId: f.workspace.id, actorUserId: f.owner.id,');
fs.writeFileSync(test, text);
const route = 'src/app/api/gym/finance/expenses/route.ts';
source = fs.readFileSync(route, 'utf8');
const post = source.indexOf('export async function POST');
if (post < 0) throw new Error('POST de despesa não localizado.');
let remaining = source.slice(post).replace('      workspaceId,\n      requiredCapabilities: ["invoices.issue"]', '      workspaceId');
fs.writeFileSync(route, `import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess as requireWorkspaceAccess, handleWorkspaceAccessError, gymCashExpenseService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
const id = z.string().trim().min(1).max(100);
const querySchema = z.object({
  workspaceId: id, unitId: id.optional(), status: z.enum(["PENDING", "SCHEDULED", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  competenceMonth: z.string().regex(/^\\d{4}-(0[1-9]|1[0-2])$/).optional(), categoryId: id.optional(), supplierId: id.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.string().regex(/^[1-9]\\d*$/).transform(Number).refine(value => Number.isSafeInteger(value) && value <= 100001).optional(),
  limit: z.string().regex(/^[1-9]\\d*$/).transform(Number).refine(value => Number.isSafeInteger(value) && value <= 100).optional(),
}).strict();
export async function GET(request: Request) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os filtros de despesas." } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const { page = 1, limit = 50, ...filters } = parsed.data;
    return NextResponse.json(await gymCashExpenseService.listExpenses({ ...filters, workspaceId: context.workspaceId, actorUserId: context.userId, limit, offset: (page - 1) * limit }));
  } catch (error) { return gymFinanceHttpFailure(error); }
}

${remaining}`);
console.log('Consulta de despesas com ator/unidade na transação; índices e histórico preservados.');
