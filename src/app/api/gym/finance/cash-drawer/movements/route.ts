import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { cashMovementRequestSchema } from "@/modules/workspaces/application/cash-mutations";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const parsed = cashMovementRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise contas, valor e identificação da tentativa." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const result = await gymCashExpenseService.recordCashMovement({ ...parsed.data, workspaceId: context.workspaceId, performedByUserId: context.userId });
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
