import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
import { z } from "zod";
import { expenseCatalogQuerySchema, expenseCategoryRequestSchema, initializeExpenseCategoriesSchema } from "@/modules/workspaces/application/gym-expense-catalog";
export const GET = withAuditedRequest(async function GET(request: Request) {
  try {
    const parsed = expenseCatalogQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia obrigatória." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json({ categories: await gymCashExpenseService.listExpenseCategories(context.workspaceId, context.userId) });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const parsed = z.union([expenseCategoryRequestSchema, initializeExpenseCategoriesSchema]).safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a categoria." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    if ("initializeDefaults" in parsed.data) return NextResponse.json({ categories: await gymCashExpenseService.initializeExpenseCategories(context.workspaceId, context.userId) });
    return NextResponse.json(await gymCashExpenseService.createExpenseCategory({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
