import { workspaceRequestFacts } from "./workspace-request-facts";
import { requestMemo } from "./request-memo";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { NextResponse } from "next/server";
import { isPersonalTrialActive } from "@/modules/workspaces/domain/personal-trial";
import { isPersonalSubscriptionActive } from "@/modules/workspaces/application/personal-affiliation";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

/** Account-level commercial endpoints cannot operate under an academy cookie. */
export async function personalCommercialContextResponse(options: { allowExpired?: boolean } = {}) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
  let activeId = await WorkspaceContextService.getActiveWorkspaceIdFromCookie();
  if (!activeId) {
    const context = await WorkspaceContextService.resolveUserWorkspaceContext(session.user.id);
    if (context.workspaceType === "PERSONAL" && context.workspaceId) activeId = context.workspaceId;
    else if (options.allowExpired && context.status === "NO_MEMBERSHIPS" && session.user.role === "TRAINER") return null;
    else return NextResponse.json({ error: "Selecione sua assessoria própria para usar este recurso." }, { status: 403 });
  }
  try { await requirePersonalWorkspaceAccess({ workspaceId: activeId, allowedRoles: ["OWNER", "TRAINER", "ASSISTANT", "MANAGER"] }); }
  catch (error) { const denied = handleWorkspaceAccessError(error); if (denied) return denied; throw error; }
  const workspace = await workspaceRequestFacts(activeId);
  if (!workspace || workspace.type !== "PERSONAL") return NextResponse.json({ error: "Selecione sua assessoria própria para usar este recurso." }, { status: 403 });
  if (!workspace.isActive) return NextResponse.json({ error: "Assessoria inativa." }, { status: 403 });
  if (!options.allowExpired) {
    const owner = await requestMemo(`personal-commercial:${workspace.ownerId}`, () => prisma.user.findUnique({ where: { id: workspace.ownerId }, select: { isTestAccount: true, subscription: { select: { status: true, startDate: true, endDate: true, isPreSubscription: true } }, freeTrial: { select: { isActive: true, startDate: true, endDate: true } } } }));
    if (!owner?.isTestAccount && !isPersonalSubscriptionActive(owner?.subscription ?? null) && !isPersonalTrialActive(owner?.freeTrial)) return NextResponse.json({ error: "Sua assinatura pessoal expirou.", code: "PERSONAL_SUBSCRIPTION_EXPIRED" }, { status: 402 });
  }
  return null;
}
