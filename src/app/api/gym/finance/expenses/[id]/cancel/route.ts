import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
import { expenseCancellationRequestSchema } from "@/modules/workspaces/application/cash-mutations";
export const POST = withAuditedRequest(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const parsed = expenseCancellationRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe a justificativa do cancelamento." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.cancelExpense({ ...parsed.data, expenseId: id, workspaceId: context.workspaceId, actorUserId: context.userId }));
  } catch (error) { return gymFinanceHttpFailure(error); }
});
