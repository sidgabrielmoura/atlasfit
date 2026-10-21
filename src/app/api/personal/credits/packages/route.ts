import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function handleGET() {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        credits: true,
        priceInCents: true,
        isHighlighted: true,
      },
    });

    return NextResponse.json(packages);
  } catch {
    return new NextResponse("Erro ao listar pacotes.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
