import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { reconcileCashRequestSchema } from "@/modules/workspaces/application/cash-mutations";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const parsed = reconcileCashRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe uma justificativa de conferência com pelo menos cinco caracteres." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.reconcileCashDrawer({ ...parsed.data, workspaceId: context.workspaceId, reconciledByUserId: context.userId }));
  } catch (error) { return gymFinanceHttpFailure(error); }
});
