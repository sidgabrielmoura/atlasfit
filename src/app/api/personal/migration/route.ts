import { uploadImportSource } from "@/lib/migration/source-upload";
import { IMPORT_LIMITS } from "@/lib/migration/config/limits";
import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { assertPersonalImportJobAccess } from "@/lib/migration/access";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkImportQuota, consumeImportQuota } from "@/lib/migration/quota.service";
import { checkStorageQuota } from "@/lib/storage-quota.service";
import { calculateTextSha256 } from "@/lib/migration/upload.service";

const AI_MIGRATION_ENABLED = process.env.AI_MIGRATION_ENABLED !== "false";

export async function POST(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  if (!AI_MIGRATION_ENABLED) {
    return new NextResponse("Funcionalidade de migração desabilitada temporariamente.", { status: 403 });
  }

  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const requestSize = Number(req.headers.get("content-length") || "0");
    if (requestSize > IMPORT_LIMITS.maxBatchSize + 1024 * 1024) return new NextResponse("Fontes acima do limite permitido.", { status: 413 });
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

    await requirePersonalWorkspaceAccess({ workspaceId, capability: "students.manage" });

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

    if ((rawText?.length || 0) > IMPORT_LIMITS.maxTextLength || files.length > IMPORT_LIMITS.maxImagesPerJob || files.reduce((sum, file) => sum + file.size, 0) > IMPORT_LIMITS.maxBatchSize) return new NextResponse("Fontes acima do limite permitido.", { status: 413 });
    const storageQuota = await checkStorageQuota(workspaceId, session.user.id, files.reduce((sum, file) => sum + file.size, 0));
    if (!storageQuota.allowed) {
      return NextResponse.json(
        {
          error: "STORAGE_EXCEEDED",
          message: storageQuota.message || "Armazenamento lotado. Faça upgrade do seu plano para continuar importando.",
          storageQuota,
        },
        { status: 400 }
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

    for (let index = 0; index < files.length; index++) await uploadImportSource(files[index], job.id, workspaceId, index);

    await consumeImportQuota(workspaceId, session.user.id, quota.source);

    return NextResponse.json({ ...job, jobId: job.id, quota }, { status: 201 });
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    console.error("[POST /api/personal/migration] Error:", error);
    return new NextResponse("Erro interno ao criar job de migração.", { status: 500 });
  }
}

async function handleGET(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
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
    await requirePersonalWorkspaceAccess({ workspaceId, capability: "students.manage" });

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
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    return new NextResponse("Erro ao listar jobs de migração.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
