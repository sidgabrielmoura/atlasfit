import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { readGymStudentStatement } from "@/modules/workspaces/application/gym-student-finance";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export const GET = withAuditedRequest(async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const search = new URL(req.url).searchParams;
    const page = Number(search.get("page") || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Página inválida.");
    const context = await requireGymWorkspaceAccess({ workspaceId: search.get("workspaceId") || "" });
    const statement = await serializableTransaction(async tx => {
      const target = await tx.workspaceMember.findFirst({ where: { workspaceId: context.workspaceId, OR: [{ id }, { userId: id }] }, select: { id: true } });
      if (!target) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno indisponível.");
      const student = await authorizeGymStudent(context.workspaceId, target.id, context.userId, "invoices.read", {}, tx);
      const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: context.workspaceId }, select: { name: true } });
      return readGymStudentStatement(tx, context.workspaceId, student.id, student.userId, workspace.name, page);
    });
    return NextResponse.json(statement, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
const retired = withAuditedRequest(async function retired(req: Request) {
  try {
    const body = await req.json();
    await requireGymWorkspaceAccess({ workspaceId: typeof body?.workspaceId === "string" ? body.workspaceId : "" });
    return NextResponse.json({ error: { code: "LEGACY_FINANCE_RETIRED", message: "Utilize o financeiro da academia para emitir faturas e registrar recebimentos." } }, { status: 410 });
  } catch (error) { return gymFinanceHttpFailure(error); }
});
export const POST = retired;
export const PUT = retired;
