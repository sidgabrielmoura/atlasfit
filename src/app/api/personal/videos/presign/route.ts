import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { storageService } from "@/lib/storage.service";

const ALLOWED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/avi",
  "video/mpeg",
  "video/3gpp",
]);

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const { fileName, fileType, fileSize } = body;

    if (!fileName || !fileType) {
      return new NextResponse("Dados do arquivo ausentes.", { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(fileType.toLowerCase())) {
      return new NextResponse("Formato de vídeo não suportado. Utilize MP4, MOV ou WebM.", { status: 400 });
    }

    if (fileSize && Number(fileSize) > MAX_FILE_SIZE) {
      return new NextResponse("Tamanho máximo de 500MB excedido.", { status: 400 });
    }

    const cleanFileName = String(fileName)
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .slice(0, 100);

    const storageKey = `videos/${session.user.id}/${Date.now()}-${cleanFileName}`;
    const uploadUrl = await storageService.getPresignedUploadUrl(storageKey, fileType, 3600);
    const publicUrl = `/api/storage/file?key=${encodeURIComponent(storageKey)}`;

    return NextResponse.json({
      uploadUrl,
      storageKey,
      publicUrl,
    });
  } catch (error: any) {
    console.error("Presign error:", error);
    return new NextResponse(error.message || "Erro ao gerar URL de upload.", { status: 500 });
  }
}
