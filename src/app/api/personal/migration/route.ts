import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkImportQuota, consumeImportQuota } from "@/lib/migration/quota.service";

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
    const body = await req.json().catch(() => ({}));
    const { workspaceId, sourcePlatform } = body;

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

    await consumeImportQuota(workspaceId, session.user.id, quota.source);

    return NextResponse.json({ ...job, quota }, { status: 201 });
  } catch (error) {
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
    const jobs = await prisma.importJob.findMany({
      where: {
        workspaceId,
        createdByUserId: session.user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json(jobs);
  } catch {
    return new NextResponse("Erro ao listar jobs de migração.", { status: 500 });
  }
}
