import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { withAuditedRequest } from "@/lib/audited-request";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces";
import { issueGymIdentityLink } from "@/modules/workspaces/application/gym-identity-link";
import { assertActorAuthority } from "@/modules/workspaces/application/actor-authority";
import { resolveGymIdentityLookup } from "@/modules/workspaces/application/gym-identity-lookup";
const headers = { "Cache-Control": "no-store" };
export const POST = withAuditedRequest(async function POST(req: Request) {
  try {
    const body = z.object({ workspaceId: z.string().min(1).max(100), unitId: z.string().min(1).max(100), targetUserId: z.string().min(1).max(100), email: z.string().max(254).optional(), cpf: z.string().max(18).optional() }).strict().parse(await readPrivacyJsonRequest(req, 4096));
    const context = await requireGymWorkspaceAccess({ workspaceId: body.workspaceId, unitId: body.unitId, capability: "students.manage" });
    const subjectId = await resolveGymIdentityLookup(context.workspaceId, body.unitId, context.userId, body.targetUserId);
    return NextResponse.json(await issueGymIdentityLink({ ...body, targetUserId: subjectId, actorUserId: context.userId }), { headers });
  } catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: { message: "Confira os dados do convite." } }, { status: 400, headers }); }
});
export const GET = withAuditedRequest(async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const context = await requireGymWorkspaceAccess({ workspaceId: params.get("workspaceId") || "" });
    const request = await prisma.dataSubjectRequest.findFirst({ where: { id: params.get("requestId") || "", workspaceId: context.workspaceId, type: "OTHER", metadata: { path: ["purpose"], equals: "GYM_IDENTITY_LINK" } } });
    const m = request?.metadata;
    if (!request || !m || typeof m !== "object" || Array.isArray(m) || typeof m.unitId !== "string" || m.issuedBy !== context.userId) return NextResponse.json({ error: { message: "Convite indisponível." } }, { status: 404, headers });
    await assertActorAuthority(prisma, context.workspaceId, context.userId, "students.manage", m.unitId);
    const authorized = Boolean(m.verifiedAt && !m.consumedAt && typeof m.expiresAt === "string" && new Date(m.expiresAt) > new Date());
    return NextResponse.json({ requestId: request.id, authorized, ...(authorized ? { subjectUserId: request.requesterUserId } : {}) }, { headers });
  } catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: { message: "Não foi possível consultar o convite." } }, { status: 400, headers }); }
});
