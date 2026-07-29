import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { validateUploadedFile, calculateTextSha256 } from "@/lib/migration/upload.service";
import { UnsupportedSpreadsheetFormatError } from "@/lib/migration/parsers/spreadsheet.parser";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: jobId } = await params;

  try {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return new NextResponse("Job de migração não encontrado.", { status: 404 });
    }

    const formData = await req.formData();
    const inputType = (formData.get("type") as string) || "MIXED";
    const textContent = formData.get("text") as string | null;

    if (textContent && textContent.trim()) {
      // Process Raw Text Source
      const sha256 = calculateTextSha256(textContent);

      const source = await prisma.importSource.create({
        data: {
          importJobId: jobId,
          type: "TEXT",
          status: "PENDING",
          textContent,
          sha256,
        },
      });

      return NextResponse.json({ success: true, source });
    }

    const files = formData.getAll("file") as File[];
    if (files.length === 0) {
      return new NextResponse("Nenhum arquivo ou texto enviado.", { status: 400 });
    }

    const createdSources = [];
    for (let idx = 0; idx < files.length; idx++) {
      const file = files[idx];
      const buffer = Buffer.from(await file.arrayBuffer());

      let validation;
      try {
        validation = validateUploadedFile(file.name, file.type, file.size, buffer);
      } catch (err: any) {
        if (err instanceof UnsupportedSpreadsheetFormatError) {
          return new NextResponse(err.message, { status: 400 });
        }
        throw err;
      }

      if (!validation.isValid) {
        return new NextResponse(validation.error || "Arquivo inválido.", { status: 400 });
      }

      let sourceType: "PDF" | "IMAGE" | "SPREADSHEET" = "IMAGE";
      if (validation.extension === ".pdf") sourceType = "PDF";
      if (validation.extension === ".csv" || validation.extension === ".xlsx") sourceType = "SPREADSHEET";

      let textContentValue: string | null = null;
      if (validation.extension === ".csv") {
        textContentValue = buffer.toString("utf8");
      } else if (validation.extension === ".xlsx") {
        textContentValue = `BASE64_XLSX:${buffer.toString("base64")}`;
      } else {
        const safeMime = file.type && file.type.includes("/") ? file.type : (validation.extension === ".pdf" ? "application/pdf" : "image/jpeg");
        textContentValue = `BASE64_FILE:${safeMime}:${buffer.toString("base64")}`;
      }

      const source = await prisma.importSource.create({
        data: {
          importJobId: jobId,
          type: sourceType,
          status: "PENDING",
          originalName: file.name,
          mimeType: file.type,
          extension: validation.extension,
          sizeBytes: file.size,
          sha256: validation.sha256,
          sortOrder: idx,
          textContent: textContentValue,
        },
      });

      createdSources.push(source);
    }

    return NextResponse.json({ success: true, sources: createdSources });
  } catch (error: any) {
    console.error("[POST upload] Erro:", error);
    return new NextResponse("Erro ao processar upload.", { status: 500 });
  }
}
