import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { reverseInternalExpensePayment } from "@/modules/workspaces/application/cash-mutations";

const input = z.object({ workspaceId: z.string().min(1).max(100), reversalReason: z.string().trim().min(5).max(2000) }).strict();
export const POST = withAuditedRequest(async function POST(req: Request, { params }: { params: Promise<{ id: string; paymentId: string }> }) {
  try {
    const parsed = input.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Informe a academia e o motivo da reversão." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const resource = await params;
    return NextResponse.json(await reverseInternalExpensePayment({ workspaceId: context.workspaceId, expenseId: resource.id, paymentId: resource.paymentId, actorUserId: context.userId, reversalReason: parsed.data.reversalReason }));
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;
    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "JSON inválido." } }, { status: 400 });
    console.error("[GYM_EXPENSE_REVERSE_FAILED]", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível reverter o pagamento." } }, { status: 500 });
  }
});
