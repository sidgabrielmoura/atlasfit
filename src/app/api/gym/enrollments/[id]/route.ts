import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireGymWorkspaceAccess, gymEnrollmentService } from "@/modules/workspaces";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";
import { updateGymEnrollmentSchema } from "@/modules/workspaces/application/enrollment-update";

export const GET = withAuditedRequest(async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const parsed = z.object({ workspaceId: z.string().trim().min(1).max(100), historyPage: z.coerce.number().int().min(1).max(10000).default(1) }).strict().safeParse(Object.fromEntries(new URL(request.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Academia obrigatória." } }, { status: 400 });
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const { id } = await params;
    return NextResponse.json(await gymEnrollmentService.getEnrollmentById(id, context.workspaceId, context.userId, parsed.data.historyPage));
  } catch (error) { return gymFinanceHttpFailure(error); }
});

export const PATCH = withAuditedRequest(async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const { id } = await params;
    const parsed = updateGymEnrollmentSchema.safeParse({ ...body, enrollmentId: id });
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Revise os dados de alteração da matrícula." } }, { status: 400 });
    }
    const context = await requireGymWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    const updated = await gymEnrollmentService.updateEnrollment({
      ...parsed.data,
      actorUserId: context.userId,
    });
    return NextResponse.json(updated);
  } catch (error) {
    return gymFinanceHttpFailure(error);
  }
});
