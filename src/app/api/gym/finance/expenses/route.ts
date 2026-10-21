import { withAuditedRequest } from "@/lib/audited-request";
import { expenseRequestSchema } from "@/modules/workspaces/application/cash-mutations";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess as requireWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
const id = z.string().trim().min(1).max(100);
const querySchema = z.object({
  workspaceId: id, unitId: id.optional(), status: z.enum(["PENDING", "SCHEDULED", "PAID", "OVERDUE", "CANCELLED"]).optional(),
  competenceMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(), categoryId: id.optional(), supplierId: id.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.string().regex(/^[1-9]\d*$/).transform(Number).refine(value => Number.isSafeInteger(value) && value <= 100001).optional(),
  limit: z.string().regex(/^[1-9]\d*$/).transform(Number).refine(value => Number.isSafeInteger(value) && value <= 100).optional(),
}).strict();
export const GET = withAuditedRequest(async function GET(request: Request) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os filtros de despesas." } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const { page = 1, limit = 50, ...filters } = parsed.data;
    return NextResponse.json(await gymCashExpenseService.listExpenses({ ...filters, workspaceId: context.workspaceId, actorUserId: context.userId, limit, offset: (page - 1) * limit }));
  } catch (error) { return gymFinanceHttpFailure(error); }
});

export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const parsed = expenseRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados da despesa." } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.createExpense({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
