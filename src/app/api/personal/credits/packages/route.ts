import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
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
