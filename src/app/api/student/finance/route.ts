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

    // 3. Fetch workspace plans to find details (price, link) for the student's active plan
    const workspacePlans = await prisma.workspacePlan.findMany({
      where: {
        workspaceId,
        isActive: true,
      },
    });

    const activePlanName = member.plan || "Mensal";

    // Find matching plan in workspace plans configuration
    const matchedPlan = workspacePlans.find(
      (p) => p.name.toLowerCase() === activePlanName.toLowerCase()
    );

    // 4. Consolidate financial status
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

    // 5. Calculate next due date / expiration intelligently
    // Find the latest paid payment
    const latestPaidPayment = payments.find((p) => p.status === "pago");
    const baseDate = latestPaidPayment ? new Date(latestPaidPayment.createdAt) : new Date(member.createdAt);

    const nextDue = new Date(baseDate);
    const interval = matchedPlan?.interval?.toLowerCase() || "mensal";

    if (interval.includes("anual") || interval.includes("year")) {
      nextDue.setFullYear(nextDue.getFullYear() + 1);
    } else if (interval.includes("semestral")) {
      nextDue.setMonth(nextDue.getMonth() + 6);
    } else if (interval.includes("trimestral")) {
      nextDue.setMonth(nextDue.getMonth() + 3);
    } else {
      // Default monthly
      nextDue.setMonth(nextDue.getMonth() + 1);
    }

    // 6. Return response payload
    return NextResponse.json({
      status: computedStatus,
      nextDue: nextDue.toISOString(),
      activePlan: {
        name: activePlanName,
        price: matchedPlan?.price || 120.0, // fallback standard price
        interval: interval,
        checkoutLink: matchedPlan?.link || null,
      },
      workspace: {
        name: member.workspace.name,
        logoUrl: member.workspace.logoUrl,
        primaryColor: member.workspace.primaryColor || "#0ea5e9",
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
