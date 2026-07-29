import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { checkImportQuota } from "@/lib/migration/quota.service";

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
    const quota = await checkImportQuota(workspaceId, session.user.id);
    return NextResponse.json(quota);
  } catch {
    return new NextResponse("Erro ao verificar saldo.", { status: 500 });
  }
}
