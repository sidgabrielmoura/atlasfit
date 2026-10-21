import { isGymLicenseCurrent } from "./gym-license";
import { resolveAccessRoles, resolveGymAccessRoles } from "../domain/access-roles";
import { resolveEffectiveCapabilities } from "../domain/roles";
import { WorkspaceAccessError } from "../domain/types";
import { getGymChatContactIds } from "./gym-chat-contacts";
import { reportReadTransaction } from "./transaction";

// undefined is retained for server diagnostics; null grants no operational workspace.
export async function resolveRealtimeCapabilities(userId: string, selectedWorkspaceId?: string | null) {
  return reportReadTransaction(async tx => {
  const allowedWorkspaces = new Set<string>();
  const gymContacts = new Map<string, Set<string>>();
  const capability: Record<string, ("subscribe" | "publish" | "presence")[]> = {
    [`user:${userId}`]: ["subscribe"],
    [`user:${userId}:notifications`]: ["subscribe"],
    "roadmap:features": ["subscribe"],
    "roadmap:polls": ["subscribe"],
  };
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
  const memberships = await tx.workspaceMember.findMany({ where: { userId, isActive: true, ...(selectedWorkspaceId !== undefined ? { workspaceId: selectedWorkspaceId ?? { in: [] } } : {}), workspace: { isActive: true } }, include: { roleGrants: true, workspace: { select: { ownerId: true, type: true, subscription: { select: { status: true, endDate: true, trialEndsAt: true } } } } } });
  for (const membership of memberships) {
    if (membership.workspace.type === "GYM" && !isGymLicenseCurrent(membership.workspace.subscription)) continue;
    capability[`user:${userId}:workspace:${membership.workspaceId}:chat`] = ["subscribe"];
    const roles = membership.workspace.type === "GYM" ? resolveGymAccessRoles(membership) : resolveAccessRoles(membership.role, membership.roleGrants);
    const owner = membership.workspace.ownerId === userId || roles.includes("OWNER");
    const capabilities = resolveEffectiveCapabilities(roles);
    if (membership.workspace.type === "GYM") {
      try {
        const contacts = await getGymChatContactIds(tx, membership.workspaceId, userId);
        gymContacts.set(membership.workspaceId, contacts);
        capability[`workspace:${membership.workspaceId}:user:${userId}:presence`] = ["subscribe", "presence"];
        for (const contactId of contacts) capability[`workspace:${membership.workspaceId}:user:${contactId}:presence`] = ["subscribe"];
      } catch (error) { if (error instanceof WorkspaceAccessError) continue; throw error; }
    } else capability[`workspace:${membership.workspaceId}:presence`] = ["subscribe", "presence"];
    allowedWorkspaces.add(membership.workspaceId);
    capability[`workspace:${membership.workspaceId}`] = ["subscribe"];
    if (membership.workspace.type === "PERSONAL") {
      if (owner || roles.includes("TRAINER")) capability[`migration:${membership.workspaceId}`] = ["subscribe"];
    } else {
      if (owner || capabilities.has("reports.finance")) capability[`workspace:${membership.workspaceId}:finance`] = ["subscribe"];
    }
  }
  const conversations = await tx.conversationParticipant.findMany({ where: { userId, leftAt: null, conversation: { workspaceId: { in: [...allowedWorkspaces] } } }, select: { conversationId: true, conversation: { select: { workspaceId: true, participants: { where: { leftAt: null, userId: { not: userId } }, select: { userId: true } } } } } });
  for (const conversation of conversations) {
    const allowedContacts = gymContacts.get(conversation.conversation.workspaceId);
    if (allowedContacts && conversation.conversation.participants.some(participant => !allowedContacts.has(participant.userId))) continue;
    capability[`conversation:${conversation.conversationId}`] = ["subscribe"];
    capability[`conversation:${conversation.conversationId}:typing`] = ["subscribe", "publish"];
  }
  const adjustments = await tx.exerciseAdjustmentRequest.findMany({ where: user?.role === "SUPERADMIN" ? {} : { requesterId: userId }, select: { id: true }, orderBy: { createdAt: "desc" }, take: 100 });
  for (const adjustment of adjustments) capability[`adjustment-request-${adjustment.id}`] = ["subscribe"];
  return capability;
  });
}
