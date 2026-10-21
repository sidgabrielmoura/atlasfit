import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, gymCashExpenseService } from "@/modules/workspaces";
import { openCashRequestSchema } from "@/modules/workspaces/application/cash-mutations";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

const querySchema = z.object({
  workspaceId: z.string().trim().min(1).max(100),
  status: z.enum(["OPEN", "CLOSED", "RECONCILED"]).optional(),
}).strict();

export const GET = withAuditedRequest(async function GET(request: Request) {
  try {
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia ou situação inválida." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const currentSession = await gymCashExpenseService.getCurrentSession(context.workspaceId, context.userId);
    const history = await gymCashExpenseService.listCashDrawerSessions({ workspaceId: context.workspaceId, actorUserId: context.userId, status: parsed.data.status, limit: 20 });
    return NextResponse.json({ currentSession, history });
  } catch (error) { return gymFinanceHttpFailure(error); }
});

export const POST = withAuditedRequest(async function POST(request: Request) {
  try {
    const parsed = openCashRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise a conta e o valor de abertura." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const session = await gymCashExpenseService.openCashDrawer({ ...parsed.data, workspaceId: context.workspaceId, openedByUserId: context.userId });
    return NextResponse.json(session, { status: 201 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
