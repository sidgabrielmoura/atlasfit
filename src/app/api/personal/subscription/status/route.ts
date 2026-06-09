import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const transactionId = searchParams.get("transactionId");

    if (!transactionId) {
      return new NextResponse("ID da transação é obrigatório.", { status: 400 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      return new NextResponse("Transação não encontrada.", { status: 404 });
    }

    return NextResponse.json({ status: transaction.status });
  } catch (error) {
    console.error("GET transaction status error:", error);
    return new NextResponse("Erro interno.", { status: 500 });
  }
}
