import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { closeCashRequestSchema } from "@/modules/workspaces/application/cash-mutations";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const parsed = closeCashRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a contagem e a justificativa do fechamento." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    return NextResponse.json(await gymCashExpenseService.closeCashDrawer({ ...parsed.data, workspaceId: context.workspaceId, closedByUserId: context.userId }));
  } catch (error) { return gymFinanceHttpFailure(error); }
});
