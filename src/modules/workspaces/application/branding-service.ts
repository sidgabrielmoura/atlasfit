import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { workspaceBrandingSchema, type WorkspaceBrandingInput } from "../domain/branding";
import { resolveAccessRoles } from "../domain/access-roles";
import { WorkspaceAccessError } from "../domain/types";
import { serializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { validateStorageKey } from "@/lib/storage-access";
import { finalizeGymStorage, gymStoredObjectMetadata } from "./gym-storage";
import { STORAGE_IMAGE_TYPES } from "@/lib/storage-upload-policy";

export const workspaceBrandingSelect = { id: true, type: true, name: true, slug: true, slogan: true, primaryColor: true, logoUrl: true, logoKey: true, watermarkUrl: true, watermarkKey: true, workoutCoverUrl: true, workoutCoverKey: true } satisfies Prisma.WorkspaceSelect;

export async function updateWorkspaceBranding(workspaceId: string, actorUserId: string, expectedType: "PERSONAL" | "GYM", rawInput: WorkspaceBrandingInput) {
  const parsed = workspaceBrandingSchema.safeParse(rawInput);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", parsed.error.issues[0]?.message || "Marca inválida.");
  const input = parsed.data;
  if (expectedType === "GYM") await assertActorAuthority(prisma, workspaceId, actorUserId, "workspace.manage");
  const storedAssets = new Map<string, { size: number; mimeType: string }>();
  for (const [url, key, folder] of [[input.logoUrl, input.logoKey, "logos"], [input.watermarkUrl, input.watermarkKey, "watermarks"], [input.workoutCoverUrl, input.workoutCoverKey, "covers"]]) {
    const belongsToAsset = (value: string) => {
      validateStorageKey(value);
      return value.startsWith(`workspace/${workspaceId}/${folder}/`) && value.split("/").length === 4;
    };
    if (key && !belongsToAsset(key)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "A imagem deve pertencer à área de marca do workspace.");
    if (url?.startsWith("/api/storage/file?key=")) {
      const objectKey = new URL(url, "https://atlasfit.invalid").searchParams.get("key");
      if (!objectKey || !belongsToAsset(objectKey) || (key && key !== objectKey)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Upload incompatível com esta marca.");
      if (expectedType === "GYM" && !key) {
        if (folder === "logos") input.logoKey = objectKey;
        if (folder === "watermarks") input.watermarkKey = objectKey;
        if (folder === "covers") input.workoutCoverKey = objectKey;
      }
    }
    if (expectedType === "GYM" && (key || url?.startsWith("/api/storage/file?"))) {
      const objectKey = key || new URL(url!, "https://atlasfit.invalid").searchParams.get("key");
      if (objectKey) storedAssets.set(objectKey, await gymStoredObjectMetadata(objectKey, workspaceId, folder!, 10 * 1024 * 1024, STORAGE_IMAGE_TYPES));
    }
  }
  return serializableTransaction(async tx => {
    const workspace = await tx.workspace.findUnique({ where: { id: workspaceId }, select: { type: true, isActive: true, ownerId: true } });
    if (!workspace || workspace.type !== expectedType) throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Workspace incompatível com esta operação.");
    if (expectedType === "GYM") await assertActorAuthority(tx, workspaceId, actorUserId, "workspace.manage");
    else {
      const user = await tx.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
      const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } });
      if (user?.role !== "SUPERADMIN" && (!workspace.isActive || !member?.isActive || (workspace.ownerId !== actorUserId && !resolveAccessRoles(member.role, member.roleGrants).some(role => ["OWNER", "TRAINER", "ASSISTANT"].includes(role))))) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Sem permissão para editar a marca.");
    }
    if (input.slug && await tx.workspace.findFirst({ where: { slug: input.slug, id: { not: workspaceId } } })) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Este endereço já está em uso.");
    if (expectedType === "GYM") {
      const before = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { logoKey: true, watermarkKey: true, workoutCoverKey: true } });
      for (const [field, target] of [["logoKey", "logo"], ["watermarkKey", "watermark"], ["workoutCoverKey", "workout_cover"]] as const) {
        const key = input[field];
        if (key && key !== before[field]) await finalizeGymStorage(tx, { workspaceId, actorUserId, objectKey: key, target, size: storedAssets.get(key)!.size });
      }
    }
    const updated = await tx.workspace.update({ where: { id: workspaceId }, data: { ...input, slogan: input.slogan || null, logoUrl: input.logoUrl || null, logoKey: input.logoKey || null, watermarkUrl: input.watermarkUrl || null, watermarkKey: input.watermarkKey || null, workoutCoverUrl: input.workoutCoverUrl || null, workoutCoverKey: input.workoutCoverKey || null }, select: workspaceBrandingSelect });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "WORKSPACE_BRANDING_UPDATED", entity: "WORKSPACE", entityId: workspaceId, severity: "info" } });
    return { ...updated, primaryColor: input.primaryColor, logo: updated.name.slice(0, 2).toUpperCase() };
  });
}
