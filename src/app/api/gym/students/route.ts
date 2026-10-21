import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gymStudentRegistrationSchema } from "@/modules/workspaces/application/gym-student-commands";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  gymStudentService,
} from "@/modules/workspaces";

// GET: List gym students with pagination, search, and filters
export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
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
      // The query computes permitted units and assignments from live grants.
    });

    const page = Number(searchParams.get("page") || "1");
    const limit = Number(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || undefined;
    const unitId = searchParams.get("unitId") || undefined;
    const assignedStaffId = searchParams.get("assignedStaffId") || undefined;
    const status = searchParams.get("status") || "ACTIVE";
    const plan = searchParams.get("plan") || undefined;

    const result = await gymStudentService.listStudents({
      workspaceId: context.workspaceId,
      actorContext: context,
      page,
      limit,
      search,
      unitId,
      assignedStaffId,
      status,
      plan,
    });

    return NextResponse.json(result);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("GET /api/gym/students error:", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao listar alunos." } },
      { status: 500 }
    );
  }
});

// POST: Assisted student registration (reception desk)
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const parsed = gymStudentRegistrationSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Confira os dados, nascimento, responsável e chave da operação." } }, { status: 400 });
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
      requiredCapabilities: ["students.manage"],
      unitId: body.unitId || undefined,
    });

    const result = await gymStudentService.registerStudent({
      ...body,
      workspaceId: context.workspaceId,
      actorUserId: context.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("POST /api/gym/students error:", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro ao cadastrar aluno." } },
      { status: error instanceof SyntaxError || error instanceof z.ZodError ? 400 : 500 }
    );
  }
});
