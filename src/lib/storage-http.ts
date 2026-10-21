import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { storageService, StorageConfigurationError } from "@/lib/storage.service";
import { checkStorageQuota } from "@/lib/storage-quota.service";
import { authorizeStorageRead, authorizeWorkspaceUpload, isPublicStorageKey } from "./storage-access";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";
import { STORAGE_IMAGE_TYPES as imageTypes, STORAGE_FILE_TYPES as fileTypes, STORAGE_CHAT_TYPES as chatTypes } from "./storage-upload-policy";
import { isGymWorkspace, reserveGymStorage, releaseGymStorageReservation } from "@/modules/workspaces/application/gym-storage";

const uploadSchema = z.object({
  workspaceId: z.string().trim().min(1).max(100).optional(), studentId: z.string().trim().min(1).max(100).optional(),
  fileName: z.string().trim().min(1).max(200), contentType: z.string().trim().min(1).max(150), fileSize: z.number().int().positive().safe(),
  targetType: z.enum(["logo", "watermark", "workout_cover", "avatar", "progress_photo", "student_file", "chat_attachment", "campaign", "campaign_banner"]),
}).strict();

function accessResponse(error: unknown) {
  if (error instanceof StorageConfigurationError) return NextResponse.json({ error: "STORAGE_UNAVAILABLE", message: error.message }, { status: 503 });
  if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.statusCode });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "INVALID_REQUEST", message: "Corpo da requisição inválido." }, { status: 400 });
  return null;
}

export async function createStorageUpload(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Não autorizado.", { status: 401 });
  try {
    const parsed = uploadSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST", message: "Dados de upload inválidos." }, { status: 400 });
    const input = parsed.data;
    const contentType = input.contentType.split(";")[0].trim().toLowerCase();
    const image = ["logo", "watermark", "workout_cover", "avatar", "progress_photo", "campaign", "campaign_banner"].includes(input.targetType);
    const limit = input.targetType === "chat_attachment" ? 50 : image ? 10 : 20;
    if (input.fileSize > limit * 1024 * 1024) throw new WorkspaceAccessError(413, "FILE_SIZE_EXCEEDS_LIMIT", `Limite por arquivo: ${limit} MB.`);
    if (!(input.targetType === "chat_attachment" ? chatTypes : image ? imageTypes : fileTypes).includes(contentType)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Tipo de arquivo não permitido.");
    if (input.targetType === "campaign" || input.targetType === "campaign_banner") {
      const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
      if (actor?.role !== "SUPERADMIN") throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Upload de campanha exige superadmin.");
    } else if (input.targetType !== "avatar") {
      if (!input.workspaceId) throw new WorkspaceAccessError(400, "WORKSPACE_REQUIRED", "Identifique o workspace.");
      await authorizeWorkspaceUpload(input.workspaceId, session.user.id, input.targetType === "logo" || input.targetType === "watermark" || input.targetType === "workout_cover" ? "brand" : input.targetType, input.studentId);
      const quota = await checkStorageQuota(input.workspaceId, undefined, input.fileSize);
      if (!quota.allowed) throw new WorkspaceAccessError(409, "STORAGE_EXCEEDED", quota.message || "Armazenamento indisponível.");
    }
    const safeName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const suffix = `${randomUUID()}-${safeName}`;
    let key: string;
    switch (input.targetType) {
      case "logo": key = `workspace/${input.workspaceId}/logos/logo-${suffix}`; break;
      case "watermark": key = `workspace/${input.workspaceId}/watermarks/watermark-${suffix}`; break;
      case "workout_cover": key = `workspace/${input.workspaceId}/covers/cover-${suffix}`; break;
      case "avatar": key = `system/avatars/user-${session.user.id}-${suffix}`; break;
      case "progress_photo": key = `workspace/${input.workspaceId}/students/${input.studentId}/progress/photo-${suffix}`; break;
      case "student_file": key = `workspace/${input.workspaceId}/files/file-${suffix}`; break;
      case "chat_attachment": key = `workspace/${input.workspaceId}/chat/${session.user.id}/attachment-${suffix}`; break;
      case "campaign": case "campaign_banner": key = `campaigns/banner-${suffix}`; break;
    }
    const gym = input.workspaceId && await isGymWorkspace(input.workspaceId);
    if (gym) await reserveGymStorage({ workspaceId: input.workspaceId!, actorUserId: session.user.id, objectKey: key, target: input.targetType, size: input.fileSize, studentUserId: input.studentId });
    let uploadUrl: string;
    try { uploadUrl = await storageService.getPresignedUploadUrl(key, contentType, 600, gym ? input.fileSize : undefined); }
    catch (error) { if (gym) await releaseGymStorageReservation(key, session.user.id); throw error; }
    return NextResponse.json({ uploadUrl, fileUrl: `/api/storage/file?key=${encodeURIComponent(key)}`, objectKey: key });
  } catch (error) {
    const response = accessResponse(error); if (response) return response;
    console.error("[STORAGE_UPLOAD_FAILED]", error instanceof Error ? error.name : "UNKNOWN");
    return new NextResponse("Não foi possível preparar o upload.", { status: 500 });
  }
}

export async function serveStorageFile(req: Request) {
  try {
    const query = new URL(req.url).searchParams;
    const key = query.get("key");
    if (!key) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Informe o arquivo.");
    const session = isPublicStorageKey(key) ? null : await auth();
    const visibility = await authorizeStorageRead(key, session?.user?.id);
    const file = await storageService.getObjectStream(key, req.headers.get("range"));
    if (!file.body) return new NextResponse("Arquivo vazio.", { status: 404 });
    const headers = new Headers({ "Content-Type": file.contentType || "application/octet-stream", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox", "Cache-Control": visibility === "PUBLIC" ? "public, max-age=31536000, stale-while-revalidate=86400" : "private, no-store" });
    if (file.contentRange) headers.set("Content-Range", file.contentRange);
    if (file.contentLength !== undefined) headers.set("Content-Length", file.contentLength.toString());
    if (file.eTag) headers.set("ETag", file.eTag);
    if (file.lastModified) headers.set("Last-Modified", file.lastModified.toUTCString());
    if (query.get("download") === "true") headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(key.split("/").pop() || "download")}"`);
    return new Response(file.body.transformToWebStream(), { status: file.statusCode, headers });
  } catch (error) {
    const response = accessResponse(error); if (response) return response;
    const name = error instanceof Error ? error.name : undefined;
    if (name === "NoSuchKey") return new NextResponse("Arquivo não encontrado.", { status: 404 });
    if (name === "InvalidRange") return new NextResponse(null, { status: 416, headers: { "Content-Range": "bytes */*" } });
    console.error("[STORAGE_READ_FAILED]", name || "UNKNOWN");
    return new NextResponse("Não foi possível recuperar o arquivo.", { status: 500 });
  }
}
