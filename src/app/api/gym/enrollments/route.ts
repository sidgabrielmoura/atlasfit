import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError, gymEnrollmentService } from "@/modules/workspaces";
import { createGymEnrollmentSchema } from "@/modules/workspaces/application/enrollment-creation";

const listSchema = z.object({
  workspaceId: z.string().trim().min(1).max(100),
  status: z.enum(["DRAFT", "PENDING_ACCEPTANCE", "PENDING_ACTIVATION", "ACTIVE", "PAUSED", "CANCELLED", "EXPIRED"]).optional(),
  studentMemberId: z.string().min(1).max(100).optional(), unitId: z.string().min(1).max(100).optional(),
  planId: z.string().min(1).max(100).optional(), search: z.string().trim().max(150).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();
export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const parsed = listSchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Filtros ou paginação inválidos." } }, { status: 400 });
    const { workspaceId, ...filter } = parsed.data;
    const context = await requireGymWorkspaceAccess({ workspaceId, unitId: filter.unitId });
    return NextResponse.json(await gymEnrollmentService.listEnrollments(context.workspaceId, filter, context.userId));
  } catch (error) { return failure(error); }
});
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const parsed = createGymEnrollmentSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados da matrícula." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId, unitId: parsed.data.unitId || undefined });
    return NextResponse.json(await gymEnrollmentService.createEnrollment({ ...parsed.data, workspaceId: context.workspaceId, actorUserId: context.userId }), { status: 201 });
  } catch (error) { return failure(error); }
});
function failure(error: unknown) {
  const accessError = handleWorkspaceAccessError(error);
  if (accessError) return accessError;
  if (error instanceof SyntaxError) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
  console.error("[GYM_ENROLLMENT_ERROR]", { code: error instanceof Error ? error.name : "INTERNAL_ERROR" });
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir a operação da matrícula." } }, { status: 500 });
}