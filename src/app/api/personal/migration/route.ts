import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkImportQuota, consumeImportQuota } from "@/lib/migration/quota.service";
import { calculateTextSha256 } from "@/lib/migration/upload.service";

const AI_MIGRATION_ENABLED = process.env.AI_MIGRATION_ENABLED !== "false";

export async function POST(req: Request) {
  if (!AI_MIGRATION_ENABLED) {
    return new NextResponse("Funcionalidade de migração desabilitada temporariamente.", { status: 403 });
  }

  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    let workspaceId: string | undefined;
    let sourcePlatform: string | undefined;
    let rawText: string | undefined;
    let files: File[] = [];

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      workspaceId = (formData.get("workspaceId") as string) || undefined;
      sourcePlatform = (formData.get("sourcePlatform") as string) || (formData.get("platform") as string) || undefined;
      rawText = (formData.get("rawText") as string) || undefined;
      files = formData.getAll("files") as File[];
    } else {
      const body = await req.json().catch(() => ({}));
      workspaceId = body.workspaceId;
      sourcePlatform = body.sourcePlatform || body.platform;
      rawText = body.rawText;
    }

    if (!workspaceId) {
      return new NextResponse("workspaceId é obrigatório.", { status: 400 });
    }

    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
        role: { in: ["OWNER", "TRAINER"] },
      },
    });

    if (!member) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    const quota = await checkImportQuota(workspaceId, session.user.id);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "QUOTA_EXCEEDED",
          message: "Você atingiu o limite de importações do seu plano. Adquira créditos adicionais para continuar.",
          quota,
        },
        { status: 402 }
      );
    }

    const job = await prisma.importJob.create({
      data: {
        workspaceId,
        createdByUserId: session.user.id,
        sourcePlatform: sourcePlatform || "outro",
        status: "UPLOADED",
        processingStep: "IDLE",
      },
    });

    // Save Raw Text Source if provided
    if (rawText && rawText.trim()) {
      const sha256 = calculateTextSha256(rawText);
      await prisma.importSource.create({
        data: {
          importJobId: job.id,
          type: "TEXT",
          status: "PENDING",
          textContent: rawText.trim(),
          sha256,
        },
      });
    }

    // Save File Sources if provided
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop()?.toLowerCase();

      let type: "SPREADSHEET" | "PDF" | "IMAGE" | "TEXT" = "TEXT";
      if (["csv", "xlsx", "xls"].includes(ext || "")) type = "SPREADSHEET";
      else if (ext === "pdf") type = "PDF";
      else if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) type = "IMAGE";

      let textContent: string | undefined = undefined;
      if (type === "SPREADSHEET" && ext === "xlsx") {
        textContent = `BASE64_XLSX:${buffer.toString("base64")}`;
      } else if (type === "PDF" || type === "IMAGE") {
        const mimeType = file.type || (type === "PDF" ? "application/pdf" : "image/png");
        textContent = `BASE64_FILE:${mimeType}:${buffer.toString("base64")}`;
      } else {
        textContent = buffer.toString("utf-8");
      }

      await prisma.importSource.create({
        data: {
          importJobId: job.id,
          type,
          status: "PENDING",
          originalName: file.name,
          sizeBytes: file.size,
          textContent,
        },
      });
    }

    await consumeImportQuota(workspaceId, session.user.id, quota.source);

    return NextResponse.json({ ...job, jobId: job.id, quota }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/personal/migration] Error:", error);
    return new NextResponse("Erro interno ao criar job de migração.", { status: 500 });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("workspaceId é obrigatório.", { status: 400 });
  }

  try {
    // Auto-recover/fail any job stuck in PROCESSING or IMPORTING for over 3 minutes
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    await prisma.importJob.updateMany({
      where: {
        workspaceId,
        status: { in: ["PROCESSING", "IMPORTING"] },
        updatedAt: { lt: threeMinutesAgo },
      },
      data: {
        status: "FAILED",
        processingStep: "IDLE",
        errorCode: "TIMEOUT_EXCEEDED",
        safeErrorMessage: "O processamento foi encerrado por atingir o tempo limite de segurança (3 minutos). Por favor, tente importar novamente.",
      },
    });

    const jobs = await prisma.importJob.findMany({
      where: {
        workspaceId,
        createdByUserId: session.user.id,
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(jobs);
  } catch {
    return new NextResponse("Erro ao listar jobs de migração.", { status: 500 });
  }
}
