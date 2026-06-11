import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
  }

  try {
    // 1. Fetch the active student membership in their workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "STUDENT",
        isActive: true,
      },
      include: {
        workspace: true,
        user: true,
      },
    });

    if (!member) {
      return new NextResponse("Membro do workspace ativo não encontrado.", { status: 404 });
    }

    const workspaceId = member.workspaceId;
    const studentName = member.user.name || session.user.name || "Aluno";

    // 2. Fetch all workspace payments belonging to this student
    const payments = await prisma.workspacePayment.findMany({
      where: {
        workspaceId,
        studentName,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 3. Consolidate financial status
    // If any payment is "atrasado", overall status is "Expirado"
    // Else if any payment is "pendente", overall status is "Pendente"
    // Otherwise "Em dia"
    let computedStatus = "Em dia";
    const hasOverdue = payments.some((p) => p.status === "atrasado");
    const hasPending = payments.some((p) => p.status === "pendente");

    if (hasOverdue) {
      computedStatus = "Expirado";
    } else if (hasPending) {
      computedStatus = "Pendente";
    }

    // 4. Calculate total pending/overdue amount
    const unpaidPayments = payments.filter((p) => p.status === "pendente" || p.status === "atrasado");
    const totalPending = unpaidPayments.reduce((sum, p) => sum + p.amount, 0);

    // 5. Calculate next due date (oldest unpaid invoice createdAt, or null if all paid)
    // Note: payments are ordered by createdAt desc, so the last unpaid is the oldest.
    const nextDue = unpaidPayments.length > 0
      ? unpaidPayments[unpaidPayments.length - 1].createdAt.toISOString()
      : null;

    // 6. Find latest paid payment details
    const latestPaidPayment = payments.find((p) => p.status === "pago");
    const latestPaid = latestPaidPayment
      ? {
          amount: latestPaidPayment.amount,
          createdAt: latestPaidPayment.createdAt.toISOString(),
          method: latestPaidPayment.method,
        }
      : null;

    // 7. Get the workspace owner's WhatsApp contact information
    const owner = await prisma.user.findUnique({
      where: { id: member.workspace.ownerId },
      select: { whatsapp: true },
    });

    // 8. Return response payload
    return NextResponse.json({
      status: computedStatus,
      nextDue,
      totalPending,
      latestPaid,
      workspace: {
        name: member.workspace.name,
        logoUrl: member.workspace.logoUrl,
        primaryColor: member.workspace.primaryColor || "#0ea5e9",
        trainerWhatsapp: owner?.whatsapp || null,
      },
      history: payments.map((p) => ({
        id: p.id,
        planName: p.planName,
        amount: p.amount,
        status: p.status, // "pago", "pendente", "atrasado"
        method: p.method, // "PIX", "BOLETO", "CREDIT_CARD"
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("GET student finance data error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
