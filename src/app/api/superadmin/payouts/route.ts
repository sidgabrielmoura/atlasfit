import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";

// GET: List all payout requests (SuperAdmin only)
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const payouts = await prisma.payoutRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });

    return NextResponse.json(payouts);
  } catch (error: any) {
    console.error("Error in GET /api/superadmin/payouts:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}

// PATCH: Approve (Pay) or Reject a payout request (SuperAdmin only)
export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, status, rejectedReason } = body;

    if (!id || !status || !["PAGO", "REJEITADO"].includes(status)) {
      return new NextResponse("Parâmetros inválidos.", { status: 400 });
    }

    const existingPayout = await prisma.payoutRequest.findUnique({
      where: { id }
    });

    if (!existingPayout) {
      return new NextResponse("Solicitação de saque não encontrada.", { status: 404 });
    }

    if (existingPayout.status !== "PENDENTE") {
      return new NextResponse("Esta solicitação já foi finalizada.", { status: 400 });
    }

    const updatedPayout = await prisma.$transaction(async (tx) => {
      // Update payout request
      const payout = await tx.payoutRequest.update({
        where: { id },
        data: {
          status,
          rejectedReason: status === "REJEITADO" ? rejectedReason || "Recusado pelo administrador" : null,
          paidAt: status === "PAGO" ? new Date() : null
        }
      });

      return payout;
    });

    // Send notification after transaction commits (respecting user settings)
    try {
      await NotificationService.sendNotification({
        userId: updatedPayout.userId,
        type: status === "PAGO" ? "PAYMENT_CONFIRMED" : "SYSTEM",
        category: "FINANCE",
        title: status === "PAGO" ? "Saque Aprovado! 🎉" : "Saque Recusado ❌",
        description: status === "PAGO" 
          ? `Seu saque no valor de ${updatedPayout.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} foi pago com sucesso.`
          : `Seu saque no valor de ${updatedPayout.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} foi recusado. Motivo: ${rejectedReason || "Não informado"}.`,
        priority: "HIGH",
        deepLink: "/personal/rewards"
      });
    } catch (err) {
      console.error("Erro ao notificar personal trainer sobre status do saque:", err);
    }

    return NextResponse.json(updatedPayout);
  } catch (error: any) {
    console.error("Error in PATCH /api/superadmin/payouts:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}
