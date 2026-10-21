const fs = require('node:fs');
const root = 'src/app/api/gym/finance';
const common = `import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
`;
fs.writeFileSync(`${root}/expenses/categories/route.ts`, common + `import { z } from "zod";
import { expenseCatalogQuerySchema, expenseCategoryRequestSchema, initializeExpenseCategoriesSchema } from "@/modules/workspaces/application/gym-expense-catalog";
export async function GET(request: Request) {
  try {
    const parsed = expenseCatalogQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia obrigatória." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json({ categories: await gymCashExpenseService.listExpenseCategories(context.workspaceId, context.userId) });
  } catch (error) { return gymFinanceHttpFailure(error); }
}
export async function POST(request: Request) {
  try {
    const parsed = z.union([expenseCategoryRequestSchema, initializeExpenseCategoriesSchema]).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a categoria." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    if ("initializeDefaults" in parsed.data) return NextResponse.json({ categories: await gymCashExpenseService.initializeExpenseCategories(context.workspaceId, context.userId) });
    return NextResponse.json(await gymCashExpenseService.createExpenseCategory({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
}
`);
fs.writeFileSync(`${root}/suppliers/route.ts`, common + `import { expenseCatalogQuerySchema, supplierRequestSchema } from "@/modules/workspaces/application/gym-expense-catalog";
export async function GET(request: Request) {
  try {
    const parsed = expenseCatalogQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia obrigatória." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json({ suppliers: await gymCashExpenseService.listSuppliers(context.workspaceId, context.userId) });
  } catch (error) { return gymFinanceHttpFailure(error); }
}
export async function POST(request: Request) {
  try {
    const parsed = supplierRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise o fornecedor." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.createSupplier({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
}
`);
for (const [operation, schema, method, message] of [
 ['pay', 'expensePaymentRequestSchema', 'payExpense', 'Revise os dados do recebimento da despesa.'],
 ['cancel', 'expenseCancellationRequestSchema', 'cancelExpense', 'Informe a justificativa do cancelamento.'],
]) fs.writeFileSync(`${root}/expenses/[id]/${operation}/route.ts`, common + `import { ${schema} } from "@/modules/workspaces/application/cash-mutations";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = ${schema}.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "${message}" } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.${method}({ ...parsed.data, expenseId: id, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) { return gymFinanceHttpFailure(error); }
}
`);
const file = `${root}/expenses/route.ts`;
let text = fs.readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
text = text.replace('handleWorkspaceAccessError, ', '');
text = 'import { expenseRequestSchema } from "@/modules/workspaces/application/cash-mutations";\n' + text;
const start = text.indexOf('export async function POST');
if (start < 0) throw new Error('POST despesas não localizado.');
text = text.slice(0, start) + `export async function POST(request: Request) {
  try {
    const parsed = expenseRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados da despesa." } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.createExpense({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
}
`;
fs.writeFileSync(file, text);
console.log('Contratos HTTP estritos; identidade do operador derivada da sessão.');
