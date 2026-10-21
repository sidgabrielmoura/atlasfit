import { withAuditedRequest } from "@/lib/audited-request";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { z } from "zod";
import { NextResponse } from "next/server";
import {
  requireGymWorkspaceAccess as requireWorkspaceAccess,
  handleWorkspaceAccessError,
  gymAssessmentService
} from "@/modules/workspaces";
const measure = z.preprocess(value => typeof value === "string" && value.trim() ? Number(value) : value, z.number().finite().min(0).max(1000));
const detail = z.record(z.string(), z.unknown()).nullable().optional();
const schema = z.object({ workspaceId: z.string().min(1).max(100), type: z.string().trim().min(1).max(200), weight: measure, height: measure, bodyFat: measure.nullable().optional(), muscleMass: measure.nullable().optional(), dobras: detail, anamnese: detail, circunferencias: detail, postural: detail, dorMobilidade: detail, testesFisicos: detail, notes: z.string().max(2000).nullable().optional() }).strict();

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
      anyCapability: ["health.read.assigned", "workspace.manage"]
    });

    const evaluations = await gymAssessmentService.listStudentPhysicalEvaluations({
      workspaceId: context.workspaceId,
      studentMemberId: id,
      requestorUserId: context.userId,
      requestorRoles: context.roles
    });

    return NextResponse.json({ evaluations });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_STUDENT_EVALUATIONS_GET_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao buscar avaliações físicas do aluno." } },
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
    const parsed = schema.safeParse(await readPrivacyJsonRequest(req, 70 * 1024));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Dados de avaliação inválidos." } }, { status: 400 });
    const body = parsed.data;
    const {
      workspaceId,
      type,
      weight,
      height,
      bodyFat,
      muscleMass,
      dobras,
      anamnese,
      circunferencias,
      postural,
      dorMobilidade,
      testesFisicos,
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
      anyCapability: ["health.manage.assigned", "workspace.manage"]
    });

    const evaluation = await gymAssessmentService.createPhysicalEvaluation({
      workspaceId: context.workspaceId,
      studentMemberId: id,
      evaluatorUserId: context.userId,
      type,
      weight,
      height,
      bodyFat: bodyFat ?? null,
      muscleMass: muscleMass ?? null,
      dobras,
      anamnese,
      circunferencias,
      postural,
      dorMobilidade,
      testesFisicos,
      notes
    });

    return NextResponse.json(
      { success: true, message: "Avaliação física registrada com sucesso.", evaluation },
      { status: 201 }
    );
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error);
    if (accessError) return accessError;

    console.error("[GYM_STUDENT_EVALUATIONS_POST_ERROR]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Falha ao registrar avaliação física." } },
      { status: 500 }
    );
  }
});
