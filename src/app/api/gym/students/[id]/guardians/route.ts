import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { addGymGuardianSchema } from "@/modules/workspaces/application/guardian-commands";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  minorService,
} from "@/modules/workspaces";

// GET: List guardians for a student
export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentMemberId } = await params;
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
    });

    const guardians = await minorService.listStudentGuardians(
      context.workspaceId,
      studentMemberId,
      context.userId
    );

    return NextResponse.json(guardians);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("GET /api/gym/students/[id]/guardians error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao listar responsáveis." } },
      { status: 500 }
    );
  }
});

// POST: Add guardian for a student
export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentMemberId } = await params;
    const parsed = addGymGuardianSchema.omit({ actorUserId: true, studentMemberId: true }).safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Confira os dados completos do responsável." } }, { status: 400 });
    const body = parsed.data;
    const { workspaceId } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
    });

    const guardian = await minorService.addGuardian({
      ...body,
      workspaceId: context.workspaceId,
      studentMemberId,
      actorUserId: context.userId,
    });

    return NextResponse.json(guardian, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("POST /api/gym/students/[id]/guardians error:", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao vincular responsável." } },
      { status: error instanceof SyntaxError ? 400 : 500 }
    );
  }
});
