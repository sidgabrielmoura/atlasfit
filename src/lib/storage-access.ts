import { assertGymOperationalWorkspace } from "@/modules/workspaces/application/gym-license";
import prisma from "@/lib/prisma";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { assertActorAuthority } from "@/modules/workspaces/application/actor-authority";
import { resolveAccessRoles } from "@/modules/workspaces/domain/access-roles";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { resolveEffectiveCapabilities } from "@/modules/workspaces/domain/roles";

export function validateStorageKey(key: string): void {
  if (!key || key.length > 1024 || /[\\\x00-\x1f\x7f%?#]/.test(key) || key.split("/").some(part => !part || part === "." || part === "..")) throw new WorkspaceAccessError(400, "INVALID_OBJECT_KEY", "Caminho de arquivo inválido.");
}

export function isPublicStorageKey(key: string): boolean {
  validateStorageKey(key);
  return /^workspace\/[^/]+\/(logos|watermarks|covers)\/[^/]+$/.test(key) || /^(system\/avatars|campaigns|videos|exercises)\//.test(key);
}

async function authorizeStudentObject(workspaceId: string, studentUserId: string, actorUserId: string, health: boolean) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, ownerId: true, isActive: true } });
  const student = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: studentUserId, workspaceId } }, include: { roleGrants: true, studentProfile: { select: { id: true } } } });
  if (!workspace?.isActive || !student?.isActive || !(student.studentProfile || resolveAccessRoles(student.role, student.roleGrants, student.unitId ?? undefined).includes("STUDENT"))) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Vínculo do aluno indisponível neste workspace.");
  if (workspace.type === "GYM") {
    await authorizeGymStudent(workspaceId, student.id, actorUserId, health ? "health.read.assigned" : "workouts.read", { allowSelf: true, allowGuardian: true });
    return;
  }
  if (actorUserId === studentUserId) return;
  const actor = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } });
  if (!actor?.isActive || (workspace.ownerId !== actorUserId && !resolveEffectiveCapabilities(resolveAccessRoles(actor.role, actor.roleGrants)).has(health ? "health.read.assigned" : "workouts.read"))) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Sem permissão para o arquivo do aluno.");
}

/** Authorizes before storage is contacted. Unknown private objects fail closed. */
export async function authorizeStorageRead(key: string, actorUserId?: string): Promise<"PUBLIC" | "PRIVATE"> {
  if (isPublicStorageKey(key)) return "PUBLIC";
  if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Sessão necessária.");
  const path = key.split("/");
  const workspaceId = path[0] === "workspace" ? path[1] : undefined;
  if (workspaceId && (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true } }))?.type === "GYM") await assertGymOperationalWorkspace(workspaceId);
  const user = await prisma.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
  const urls = [`/api/storage/file?key=${encodeURIComponent(key)}`, `/api/storage/file?key=${key}`];
  if (workspaceId && path[2] === "students" && path[3] && path[4] === "progress") {
    await authorizeStudentObject(workspaceId, path[3], actorUserId, true);
    return "PRIVATE";
  }
  const file = await prisma.studentFile.findFirst({ where: { ...(workspaceId ? { workspaceId } : {}), OR: [{ objectKey: key }, { url: { in: urls } }] }, select: { workspaceId: true, studentId: true, category: true } });
  if (file) {
    await authorizeStudentObject(file.workspaceId, file.studentId, actorUserId, true);
    return "PRIVATE";
  }
  const photo = await prisma.studentProgressPhoto.findFirst({ where: { ...(workspaceId ? { workspaceId } : {}), OR: [{ objectKey: key }, { photoUrl: { in: urls } }] }, select: { workspaceId: true, studentId: true } });
  if (photo) {
    await authorizeStudentObject(photo.workspaceId, photo.studentId, actorUserId, true);
    return "PRIVATE";
  }
  if (workspaceId && path[2] === "chat") {
    const { assertChatWorkspace, assertChatConversation } = await import("@/modules/workspaces/application/chat-authority");
    await assertChatWorkspace(workspaceId, actorUserId);
    const membership = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, select: { isActive: true, workspace: { select: { isActive: true } } } });
    if (!membership?.isActive || !membership.workspace.isActive) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Vínculo de chat indisponível.");
    // New uploads bind their temporary preview to the authenticated uploader.
    if (path.length === 5 && path[3] === actorUserId) return "PRIVATE";
    const message = await prisma.message.findFirst({ where: { conversation: { workspaceId, participants: { some: { userId: actorUserId, leftAt: null } } }, OR: urls.flatMap(url => [{ attachment: { path: ["url"], equals: url } }, { attachment: { path: ["urls"], array_contains: [url] } }]) }, select: { id: true, conversationId: true } });
    if (message) { await assertChatConversation(message.conversationId, actorUserId); return "PRIVATE"; }
    throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Arquivo restrito aos participantes da conversa.");
  }
  if (user?.role === "SUPERADMIN" && !workspaceId) return "PRIVATE";
  throw new WorkspaceAccessError(404, "FILE_NOT_FOUND", "Arquivo privado não vinculado a um recurso acessível.");
}

export async function authorizeWorkspaceUpload(workspaceId: string, actorUserId: string, target: "brand" | "student_file" | "progress_photo" | "chat_attachment", studentUserId?: string) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, ownerId: true, isActive: true } });
  if (!workspace?.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Workspace indisponível.");
  const user = await prisma.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
  const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } });
  if (workspace.type === "GYM") await assertGymOperationalWorkspace(workspaceId);
  if (target === "chat_attachment") {
    if (!member?.isActive && user?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo necessário para anexos de chat.");
    return;
  }
  if (workspace.type === "GYM") {
    if (target === "brand") return assertActorAuthority(prisma, workspaceId, actorUserId, "workspace.manage");
    if (!studentUserId) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Identifique o aluno do arquivo.");
    const student = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: studentUserId, workspaceId } }, select: { id: true } });
    if (!student) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno não encontrado neste workspace.");
    await authorizeGymStudent(workspaceId, student.id, actorUserId, "health.manage.assigned", { allowSelf: target === "progress_photo" });
    return;
  }
  if (target === "progress_photo") {
    if (!studentUserId) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Identifique o aluno.");
    await authorizeStudentObject(workspaceId, studentUserId, actorUserId, true);
  } else if (user?.role !== "SUPERADMIN" && (!member?.isActive || (workspace.ownerId !== actorUserId && !resolveAccessRoles(member.role, member.roleGrants).some(role => role === "OWNER" || role === "TRAINER")))) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Sem permissão de upload neste workspace.");
}
