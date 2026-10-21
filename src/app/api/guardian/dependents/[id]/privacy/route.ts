import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { DataSubjectRequestType } from "@prisma/client";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { assertGuardianPrivacyAuthority } from "@/modules/workspaces/application/guardian-privacy";
import { submitGymPrivacyRequest } from "@/modules/workspaces/application/gym-privacy-requests";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { withAuditedRequest } from "@/lib/audited-request";
const schema = z.object({ workspaceId: z.string().min(1).max(100), type: z.enum(DataSubjectRequestType), notes: z.string().trim().max(2000).optional() }).strict();
const headers = { "Cache-Control": "no-store" };
export const GET = withAuditedRequest(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const session = await auth(); if (!session?.user?.id || session.user.isImpersonated) return NextResponse.json({ error: { message: "Sessão própria obrigatória." } }, { status: 401 });
    const { id } = await params; const workspaceId = z.string().min(1).max(100).parse(new URL(req.url).searchParams.get("workspaceId"));
    const data = await serializableTransaction(async tx => {
      const guardian = await assertGuardianPrivacyAuthority(tx, workspaceId, id, session.user.id);
      const rows = await tx.dataSubjectRequest.findMany({ where: { workspaceId, requesterUserId: guardian.studentMember.userId, metadata: { path: ["purpose"], equals: "GYM_DSR" } }, orderBy: { requestedAt: "desc" }, take: 100, select: { id: true, type: true, status: true, requestedAt: true, metadata: true } });
      return rows.map(({ metadata, ...row }) => ({ ...row, response: metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata.response ?? null : null }));
    }); return NextResponse.json({ requests: data }, { headers });
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { message: "Consulta indisponível." } }, { status: 400 }); }
});
export const POST = withAuditedRequest(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const session = await auth(); if (!session?.user?.id || session.user.isImpersonated) return NextResponse.json({ error: { message: "Sessão própria obrigatória." } }, { status: 401 });
    const body = schema.parse(await readPrivacyJsonRequest(req, 6000)); const { id } = await params;
    const subject = await serializableTransaction(tx => assertGuardianPrivacyAuthority(tx, body.workspaceId, id, session.user.id));
    return NextResponse.json(await submitGymPrivacyRequest({ ...body, guardianId: id, actorUserId: session.user.id, targetUserId: subject.studentMember.userId }), { headers });
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { message: "Solicitação não registrada." } }, { status: 400 }); }
});
