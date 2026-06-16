import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logSystemError } from "@/lib/logger";

// POST: Create a new manual payment record
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { workspaceId, studentName, planName, amount, status, method, createdAt } = body;

    if (!workspaceId || !studentName || !planName || amount === undefined || !status || !method) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    // Verify trainer belongs to the workspace
    const memberCheck = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId,
      },
    });

    if (!memberCheck) {
      return new NextResponse("Acesso negado a este workspace.", { status: 403 });
    }

    // Parse customized billing/due date if provided
    const paymentDate = createdAt ? new Date(createdAt) : new Date();

    const newPayment = await prisma.workspacePayment.create({
      data: {
        workspaceId,
        studentName,
        planName, // repurposed as description/service
        amount: parseFloat(amount),
        status,
        method,
        createdAt: paymentDate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(newPayment);
  } catch (error) {
    await logSystemError({ action: "POST_MANUAL_PAYMENT", error, entity: "PAYMENT" });
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
