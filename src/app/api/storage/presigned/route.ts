import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { storageService } from "@/lib/storage.service";

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "application/msword", // doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/plain",
];

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, studentId, fileName, contentType, fileSize, targetType } = body;

    if (!fileName || !contentType || !fileSize || !targetType) {
      return new NextResponse("Campos obrigatórios ausentes (fileName, contentType, fileSize, targetType).", { status: 400 });
    }

    // 1. Validate size and MIME types
    const isImageTarget = ["logo", "watermark", "workout_cover", "avatar", "progress_photo", "campaign", "campaign_banner"].includes(targetType);
    const sizeLimit = isImageTarget ? MAX_IMAGE_SIZE : MAX_FILE_SIZE;
    const allowedTypes = isImageTarget ? ALLOWED_IMAGE_TYPES : ALLOWED_FILE_TYPES;

    if (fileSize > sizeLimit) {
      return new NextResponse(`O arquivo excede o tamanho limite permitido de ${sizeLimit / (1024 * 1024)}MB.`, { status: 400 });
    }

    if (!allowedTypes.includes(contentType.toLowerCase())) {
      return new NextResponse(`Tipo de arquivo não permitido (${contentType}).`, { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");

    // 2. Validate multi-tenant authorizations
    const userId = session.user.id;

    if (["logo", "watermark", "workout_cover", "student_file"].includes(targetType)) {
      if (!workspaceId) {
        return new NextResponse("O workspaceId é obrigatório para este tipo de upload.", { status: 400 });
      }
      // Logged user must be trainer or owner of the workspace
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspaceId,
          role: { in: ["TRAINER", "OWNER"] },
          isActive: true,
        },
      });
      if (!member) {
        return new NextResponse("Você não possui permissão de treinador neste workspace.", { status: 403 });
      }
    }

    if (targetType === "progress_photo") {
      if (!workspaceId || !studentId) {
        return new NextResponse("workspaceId e studentId são obrigatórios para fotos de progresso.", { status: 400 });
      }
      // Must be the student uploading their own progress, or a trainer from their workspace
      const isSelf = userId === studentId;
      const isTrainer = await prisma.workspaceMember.findFirst({
        where: {
          userId,
          workspaceId,
          role: { in: ["TRAINER", "OWNER"] },
          isActive: true,
        },
      });
      
      const studentMembership = await prisma.workspaceMember.findFirst({
        where: {
          userId: studentId,
          workspaceId,
          role: "STUDENT",
        },
      });

      if (!studentMembership) {
        return new NextResponse("O aluno especificado não pertence a este workspace.", { status: 400 });
      }

      if (!isSelf && !isTrainer) {
        return new NextResponse("Acesso negado para enviar fotos de progresso deste aluno.", { status: 403 });
      }
    }

    if (targetType === "avatar") {
      // Any authenticated user can upload their own avatar
    }

    if (targetType === "campaign") {
      // Logged user must be superadmin
      const userObj = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (userObj?.role !== "SUPERADMIN") {
        return new NextResponse("Acesso exclusivo para administradores.", { status: 403 });
      }
    }

    // 3. Generate key and presigned URL
    let key = "";
    const timestamp = Date.now();

    switch (targetType) {
      case "logo":
        key = `workspace/${workspaceId}/logos/logo-${timestamp}-${safeFileName}`;
        break;
      case "watermark":
        key = `workspace/${workspaceId}/watermarks/watermark-${timestamp}-${safeFileName}`;
        break;
      case "workout_cover":
        key = `workspace/${workspaceId}/covers/cover-${timestamp}-${safeFileName}`;
        break;
      case "avatar":
        key = `system/avatars/user-${userId}-${timestamp}-${safeFileName}`;
        break;
      case "progress_photo":
        key = `workspace/${workspaceId}/students/${studentId}/progress/photo-${timestamp}-${safeFileName}`;
        break;
      case "student_file":
        key = `workspace/${workspaceId}/files/file-${timestamp}-${safeFileName}`;
        break;
      case "campaign":
      case "campaign_banner":
        key = `campaigns/banner-${timestamp}-${safeFileName}`;
        break;
      default:
        return new NextResponse("Tipo de upload inválido.", { status: 400 });
    }

    const uploadUrl = await storageService.getPresignedUploadUrl(key, contentType);
    const fileUrl = `/api/storage/file?key=${encodeURIComponent(key)}`;

    return NextResponse.json({
      uploadUrl,
      fileUrl,
      objectKey: key,
    });
  } catch (error) {
    console.error("Presigned URL API Error:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
