import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const requests = await prisma.dataDeletionRequest.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            image: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        requestedAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("[DELETION_REQUESTS_GET]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
