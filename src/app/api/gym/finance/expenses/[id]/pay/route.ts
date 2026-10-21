import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
import { expensePaymentRequestSchema } from "@/modules/workspaces/application/cash-mutations";
export const POST = withAuditedRequest(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = expensePaymentRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados do recebimento da despesa." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.payExpense({ ...parsed.data, expenseId: id, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) { return gymFinanceHttpFailure(error); }
});
