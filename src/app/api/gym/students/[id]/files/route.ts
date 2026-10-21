import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { StorageConfigurationError } from "@/lib/storage.service";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  gymAssessmentService
} from "@/modules/workspaces";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      anyCapability: ["students.read", "workspace.manage"]
    });

    const files = await gymAssessmentService.listStudentFiles({
      workspaceId: context.workspaceId,
      studentMemberId: id,
      requestorUserId: context.userId,
      requestorRoles: context.roles
    });

    return NextResponse.json({ files });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_STUDENT_FILES_GET_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao buscar arquivos do aluno." } },
      { status: 500 }
    );
  }
});

export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      workspaceId,
      name,
      category,
      type = "file",
      url,
      fileName,
      fileSizeFormatted,
      sizeInBytes,
      mimeType,
      objectKey,
      notes
    } = body;

    if (!workspaceId) {
      return NextResponse.json(
        { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } },
        { status: 400 }
      );
    }

    const context = await requireWorkspaceAccess({
      workspaceId,
      anyCapability: ["students.manage", "health.manage.assigned", "workspace.manage"]
    });

    const file = await gymAssessmentService.uploadStudentFile({
      workspaceId: context.workspaceId,
      studentMemberId: id,
      uploadedByUserId: context.userId,
      name,
      category,
      type,
      url,
      fileName,
      fileSizeFormatted,
      sizeInBytes: sizeInBytes ?? null,
      mimeType,
      objectKey,
      notes
    });

    return NextResponse.json(
      { success: true, message: "Arquivo anexado com sucesso.", file },
      { status: 201 }
    );
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Corpo inválido." } }, { status: 400 });
    if (error instanceof StorageConfigurationError) return NextResponse.json({ error: { code: "STORAGE_UNAVAILABLE", message: error.message } }, { status: 503 });
    console.error("[GYM_STUDENT_FILES_POST_ERROR]", error instanceof Error ? error.name : "UNKNOWN");
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao anexar arquivo." } },
      { status: 500 }
    );
  }
});
