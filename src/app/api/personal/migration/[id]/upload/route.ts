import { persistImportSource, uploadImportSource } from "@/lib/migration/source-upload";
import { IMPORT_LIMITS } from "@/lib/migration/config/limits";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { assertPersonalImportJobAccess } from "@/lib/migration/access";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { validateUploadedFile, calculateTextSha256 } from "@/lib/migration/upload.service";
import { UnsupportedSpreadsheetFormatError } from "@/lib/migration/parsers/spreadsheet.parser";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: jobId } = await params;

  try {
    await assertPersonalImportJobAccess(jobId);

    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    if (!["UPLOADED", "FAILED"].includes(job.status)) return new NextResponse("Esta importação não admite novas fontes.", { status: 409 });
    if (Number(req.headers.get("content-length") || "0") > IMPORT_LIMITS.maxBatchSize + 1024 * 1024) return new NextResponse("Fontes acima do limite permitido.", { status: 413 });
    const formData = await req.formData();
    const inputType = (formData.get("type") as string) || "MIXED";
    const textContent = formData.get("text") as string | null;

    if (textContent && textContent.trim()) {
      if (textContent.length > IMPORT_LIMITS.maxTextLength) return new NextResponse("Texto acima do limite permitido.", { status: 413 });
      // Process Raw Text Source
      const sha256 = calculateTextSha256(textContent);

      const source = await persistImportSource({
          importJobId: jobId,
          type: "TEXT",
          status: "PENDING",
          textContent,
          sha256,
      }, job.workspaceId);

      const { textContent: omitted, ...metadata } = source;
      return NextResponse.json({ success: true, source: metadata });
    }

    const files = formData.getAll("file") as File[];
    if (files.length === 0) {
      return new NextResponse("Nenhum arquivo ou texto enviado.", { status: 400 });
    }

    if (files.length > IMPORT_LIMITS.maxImagesPerJob || files.reduce((sum, file) => sum + file.size, 0) > IMPORT_LIMITS.maxBatchSize) return new NextResponse("Arquivos acima do limite permitido.", { status: 413 });
    const createdSources = [];
    for (let idx = 0; idx < files.length; idx++) {
      const source = await uploadImportSource(files[idx], jobId, job.workspaceId, idx);

      createdSources.push(source);
    }

    return NextResponse.json({ success: true, sources: createdSources });
  } catch (error: any) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    console.error("[POST upload] Erro:", error);
    return new NextResponse("Erro ao processar upload.", { status: 500 });
  }
}
