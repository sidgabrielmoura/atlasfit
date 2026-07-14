import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/notifications/service";

// GET: Fetch trainer referral info, balances, commissions list, and payout requests list
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const userId = session.user.id;

  try {
    // 1. Fetch user to get referralCode
    let user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true, name: true, isTestAccount: true }
    });

    if (!user) {
      return new NextResponse("Usuário não encontrado.", { status: 404 });
    }

    // Generate referralCode if missing (retroactivity)
    let referralCode = user.referralCode;
    if (!referralCode) {
      const cleanName = (user.name || "trainer").split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      referralCode = `${cleanName}-${randomSuffix}`;
      await prisma.user.update({
        where: { id: userId },
        data: { referralCode }
      });
    }

    // 2. Count referred users (trainers)
    const referredCount = await prisma.user.count({
      where: { referredById: userId }
    });

    // 3. Fetch all commissions
    const commissions = await prisma.referralCommission.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        referred: {
          select: {
            name: true,
            email: true,
            createdAt: true,
            subscription: {
              select: {
                status: true
              }
            }
          }
        }
      }
    });

    // 4. Fetch all payouts
    const payouts = await prisma.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    // Calculate balances
    // Only approved commissions from referred users whose current subscription is "active" are eligible/approved for withdraw
    const totalApproved = commissions
      .filter((c) => c.status === "APROVADO" && c.referred?.subscription?.status?.toLowerCase() === "active")
      .reduce((sum, c) => sum + c.amount, 0);

    const totalPaid = payouts
      .filter((p) => p.status === "PAGO")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payouts
      .filter((p) => p.status === "PENDENTE")
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, totalApproved - totalPaid - totalPending);

    // Host header for link generation
    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    const isSubscriptionActive = subscription ? subscription.status.toLowerCase() === "active" : false;
    const isLocked = !isSubscriptionActive && !user.isTestAccount;

    // Find the most expensive monthly plan in the database to use as simulator base price
    const mostExpensivePlan = await prisma.plan.findFirst({
      where: {
        interval: "month"
      },
      orderBy: {
        price: "desc"
      },
      select: {
        price: true
      }
    });
    const simulatorBasePrice = mostExpensivePlan ? mostExpensivePlan.price : 97.00;

    // Host header for link generation
    const host = req.headers.get("host") || "atlasfit.app";
    const referralLink = `https://${host}/auth/register?ref=${referralCode}`;

    return NextResponse.json({
      referralCode,
      referralLink,
      referredCount,
      availableBalance,
      totalEarned: totalApproved,
      totalPaid,
      totalPending,
      commissions,
      payouts,
      isLocked,
      simulatorBasePrice
    });
  } catch (error: any) {
    console.error("Error in GET /api/personal/rewards:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}

// POST: Request a new payout (PIX)
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const userId = session.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isTestAccount: true }
    });
    if (!user) {
      return new NextResponse("Usuário não encontrado.", { status: 404 });
    }

    const subscription = await prisma.subscription.findUnique({
      where: { userId }
    });
    const isSubscriptionActive = subscription ? subscription.status.toLowerCase() === "active" : false;
    const isLocked = !isSubscriptionActive && !user.isTestAccount;

    if (isLocked) {
      return new NextResponse("Funcionalidade indisponível no período de testes. Faça uma assinatura para desbloquear.", { status: 403 });
    }

    const body = await req.json();
    const { amount, pixKey, pixKeyType } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return new NextResponse("Valor de saque inválido.", { status: 400 });
    }

    if (!pixKey || !pixKeyType) {
      return new NextResponse("Chave e tipo de chave PIX são obrigatórios.", { status: 400 });
    }

    // Check if there is an active pending request (limit to one pending request to avoid spam/fraud)
    const existingPending = await prisma.payoutRequest.findFirst({
      where: {
        userId,
        status: "PENDENTE"
      }
    });

    if (existingPending) {
      return new NextResponse("Você já possui uma solicitação de saque em análise.", { status: 400 });
    }

     // Calculate current available balance
    const commissions = await prisma.referralCommission.findMany({
      where: { referrerId: userId },
      include: {
        referred: {
          select: {
            subscription: {
              select: {
                status: true
              }
            }
          }
        }
      }
    });

    const payouts = await prisma.payoutRequest.findMany({
      where: { userId }
    });

    const totalApproved = commissions
      .filter((c) => c.status === "APROVADO" && c.referred?.subscription?.status?.toLowerCase() === "active")
      .reduce((sum, c) => sum + c.amount, 0);

    const totalPaid = payouts
      .filter((p) => p.status === "PAGO")
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payouts
      .filter((p) => p.status === "PENDENTE")
      .reduce((sum, p) => sum + p.amount, 0);

    const availableBalance = Math.max(0, totalApproved - totalPaid - totalPending);

    if (amount > availableBalance) {
      return new NextResponse("Saldo insuficiente para solicitar este saque.", { status: 400 });
    }

    // Create payout request
    const payout = await prisma.payoutRequest.create({
      data: {
        userId,
        amount,
        pixKey,
        pixKeyType,
        status: "PENDENTE"
      }
    });

    try {
      // Find all superadmins
      const superadmins = await prisma.user.findMany({
        where: { role: "SUPERADMIN" },
        select: { id: true }
      });

      // Find requesting trainer's name
      const trainer = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      for (const admin of superadmins) {
        await NotificationService.sendNotification({
          userId: admin.id,
          type: "SYSTEM",
          category: "FINANCE",
          title: "Novo Pedido de Saque PIX 💸",
          description: `${trainer?.name || "Um personal trainer"} solicitou um resgate de ${amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} via PIX.`,
          priority: "HIGH",
          deepLink: "/superadmin/finance/payouts"
        });
      }
    } catch (err) {
      console.error("Erro ao enviar notificações de saque para superadmin:", err);
    }

    return NextResponse.json(payout);
  } catch (error: any) {
    console.error("Error in POST /api/personal/rewards:", error);
    return new NextResponse(error.message || "Erro interno do servidor.", { status: 500 });
  }
}
