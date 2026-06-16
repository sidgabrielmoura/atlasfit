import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado. Por favor, faça login.", { status: 401 });
    }

    const freeTrial = await prisma.freeTrial.findUnique({
      where: { userId: session.user.id }
    });

    let subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
      include: { plan: true },
    });

    const isTrialActive = !!(freeTrial && new Date() < new Date(freeTrial.endDate));
    const isTrialExpired = !!(freeTrial && new Date() > new Date(freeTrial.endDate));

    let effectiveSub: any = subscription;
    if (!effectiveSub && freeTrial) {
      effectiveSub = {
        id: "trial_" + freeTrial.id,
        plan: {
          name: "Free Trial",
          price: 0,
          maxStudents: 50,
        },
        status: isTrialActive ? "trial" : "expired",
        startDate: freeTrial.startDate,
        endDate: freeTrial.endDate,
        isPreSubscription: false,
      };
    }

    if (!effectiveSub) {
      let plan = await prisma.plan.findFirst({
        where: { name: { contains: "Starter", mode: "insensitive" } }
      });
      if (!plan) {
        plan = await prisma.plan.findFirst({
          orderBy: { price: "asc" }
        });
      }
      if (!plan) {
        plan = await prisma.plan.create({
          data: {
            name: "Starter",
            price: 149.0,
            features: "Até 50 Alunos ativos, Treinos ilimitados, Suporte por email, App para o aluno",
            maxWorkspaces: 1,
          }
        });
      }

      subscription = await prisma.subscription.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          status: "active",
          startDate: new Date(),
        },
        include: { plan: true }
      });
      effectiveSub = subscription;
    }

    const studentCount = await prisma.workspaceMember.count({
      where: {
        role: "STUDENT",
        isActive: true,
        workspace: {
          ownerId: session.user.id
        }
      }
    });

    const getStudentLimit = (plan: any): number => {
      if (plan.maxStudents !== undefined && plan.maxStudents !== null) {
        return plan.maxStudents;
      }
      const name = plan.name.toLowerCase();
      if (name.includes("starter") || name.includes("basic") || name.includes("trial")) {
        return 50;
      }
      if (name.includes("professional") || name.includes("pro")) {
        return 200;
      }
      return 999999;
    };

    const getStorageLimit = (planName: string) => {
      const name = planName.toLowerCase();
      if (name.includes("starter") || name.includes("basic") || name.includes("trial")) {
        return { limit: 5, unit: "GB" };
      }
      if (name.includes("professional") || name.includes("pro")) {
        return { limit: 20, unit: "GB" };
      }
      return { limit: 100, unit: "GB" };
    };

    const studentLimit = getStudentLimit(effectiveSub.plan);
    const storageLimitInfo = getStorageLimit(effectiveSub.plan.name);

    const simulatedStorage = Math.min(
      Math.max(parseFloat((studentCount * 0.12 + 0.3).toFixed(1)), 0.5),
      storageLimitInfo.limit - 0.2
    );

    const plansInDb = await prisma.plan.findMany({
      orderBy: { price: "asc" }
    });

    const mappedPlatformPlans = plansInDb.map((p) => {
      const isCurrent = effectiveSub.planId ? p.id === effectiveSub.planId : false;

      let featuresList: string[] = [];
      if (p.features) {
        featuresList = p.features.split(",").map(f => f.trim());
      } else {
        if (p.name.toLowerCase().includes("starter") || p.name.toLowerCase().includes("basic")) {
          featuresList = ["Até 50 alunos ativos", "Treinos ilimitados", "Suporte por email", "App para o aluno"];
        } else if (p.name.toLowerCase().includes("pro")) {
          featuresList = ["Alunos ilimitados", "Suporte Prioritário", "White Label", "Dashboards Avançados"];
        } else {
          featuresList = ["Tudo ilimitado", "Suporte WhatsApp 24/7", "White Label completo"];
        }
      }

      return {
        id: p.id,
        name: p.name,
        price: `R$ ${p.price}`,
        interval: `/${p.interval === "year" ? "ano" : "mês"}`,
        description: p.name.toLowerCase().includes("starter")
          ? "Ideal para quem está começando na consultoria online."
          : "A escolha perfeita para escalar seu negócio.",
        features: featuresList,
        highlight: p.name.toLowerCase().includes("pro") || p.name.toLowerCase().includes("professional"),
        buttonText: isCurrent ? "Seu Plano Atual" : (effectiveSub.plan ? (p.price > effectiveSub.plan.price ? "Fazer Upgrade" : "Regredir Plano") : "Assinar"),
        disabled: isCurrent,
        isCurrent
      };
    });

    const baseDate = effectiveSub.startDate || new Date();
    const nextBilling = new Date(baseDate);
    nextBilling.setDate(nextBilling.getDate() + 30);
    const targetDate = effectiveSub.endDate || nextBilling;

    const today = new Date();
    const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    const d2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 12, 0, 0);
    const timeDiff = d2.getTime() - d1.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    const nextBillingStr = targetDate.toISOString().split("T")[0];

    const transactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5
    });

    const mappedInvoices = transactions.map(t => ({
      id: t.id,
      date: t.createdAt.toISOString().split("T")[0],
      amount: t.amount,
      status: t.status,
      paymentMethod: t.paymentMethod || "PIX",
      description: t.description || "Assinatura Mensal AtlasFit"
    }));

    const domainSetting = await prisma.systemSetting.findUnique({
      where: { key: "primary_domain" }
    });
    const primaryDomain = domainSetting?.value || "atlasfit.app";

    const responseData = {
      currentSubscription: {
        id: effectiveSub.id,
        planName: effectiveSub.plan.name,
        planPrice: effectiveSub.plan.price,
        status: effectiveSub.status.toLowerCase(),
        nextBillingDate: nextBillingStr,
        daysRemaining: daysRemaining,
        paymentMethod: effectiveSub.plan.price === 0 ? "Nenhum" : "Pix Automático",
        billingCycle: effectiveSub.plan.price === 0 ? "Nenhum" : "Mensal",
        invoices: mappedInvoices,
        isPreSubscription: effectiveSub.isPreSubscription || false,
        primaryDomain,
        freeTrial: freeTrial ? {
          startDate: freeTrial.startDate.toISOString().split("T")[0],
          endDate: freeTrial.endDate.toISOString().split("T")[0],
          isActive: isTrialActive,
          daysRemaining: isTrialActive ? Math.max(0, Math.ceil((new Date(freeTrial.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : 0,
        } : null,
        usage: {
          students: {
            current: studentCount,
            limit: studentLimit,
          },
          storage: {
            current: simulatedStorage,
            limit: storageLimitInfo.limit,
            unit: storageLimitInfo.unit,
          }
        }
      },
      platformPlans: mappedPlatformPlans
    };

    return NextResponse.json(responseData);
  } catch (error) {
    await logSystemError({ action: "GET_SUBSCRIPTION_METRICS", error, entity: "SUBSCRIPTION" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const { planId } = body;

    if (!planId) {
      return new NextResponse("ID do plano é obrigatório.", { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return new NextResponse("Plano não encontrado.", { status: 404 });
    }

    const freeTrial = await prisma.freeTrial.findUnique({
      where: { userId: session.user.id }
    });

    const isTrialActive = !!(freeTrial && new Date() < new Date(freeTrial.endDate));

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        amount: plan.price,
        status: "PENDING",
        paymentMethod: "PIX",
        description: isTrialActive 
          ? `Pré-assinatura do plano ${plan.name} (Ativação pós-teste)`
          : `Assinatura do plano ${plan.name}`,
      }
    });

    const apiKey = process.env.ABACATEPAY_API_KEY;

    if (apiKey && apiKey !== "abc_dev_placeholder") {
      const abacate = AbacatePay({ secret: apiKey });

      let abacateProductId = "";
      try {
        const response = await abacate.products.list();
        let products: any[] = [];
        if (Array.isArray(response)) {
          products = response;
        } else if (response && typeof response === "object") {
          if (Array.isArray((response as any).data)) products = (response as any).data;
          else if (Array.isArray((response as any).products)) products = (response as any).products;
        }

        const existingProduct = products.find((p: any) => p.externalId === plan.id);
        const targetPriceCents = Math.round(plan.price * 100);

        if (existingProduct) {
          if (existingProduct.price !== targetPriceCents || existingProduct.name !== plan.name) {
            try {
              await abacate.products.delete({ id: existingProduct.id });
            } catch (delError) {
              console.error("Erro ao deletar produto desatualizado no AbacatePay:", delError);
            }
            const newProduct = await abacate.products.create({
              externalId: plan.id,
              name: plan.name,
              price: targetPriceCents,
              currency: "BRL",
              description: plan.features || `Plano ${plan.name}`
            });
            abacateProductId = newProduct.id;
          } else {
            abacateProductId = existingProduct.id;
          }
        } else {
          const newProduct = await abacate.products.create({
            externalId: plan.id,
            name: plan.name,
            price: targetPriceCents,
            currency: "BRL",
            description: plan.features || `Plano ${plan.name}`
          });
          abacateProductId = newProduct.id;
        }
      } catch (abacateError) {
        await logSystemError({ action: "POST_SUBSCRIPTION_SYNC_PRODUCT_ABACATEPAY", error: abacateError, entity: "SUBSCRIPTION" });
        try {
          const newProduct = await abacate.products.create({
            externalId: plan.id,
            name: plan.name,
            price: Math.round(plan.price * 100),
            currency: "BRL",
            description: plan.features || `Plano ${plan.name}`
          });
          abacateProductId = newProduct.id;
        } catch (innerErr) {
          await logSystemError({ action: "POST_SUBSCRIPTION_SYNC_PRODUCT_ABACATEPAY_CRITICAL", error: innerErr, entity: "SUBSCRIPTION" });
        }
      }

      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });

      // Buscar todos os cupons ativos no banco
      const activeCoupons = await prisma.coupon.findMany({
        where: { isActive: true }
      });
      const activeCouponCodes = activeCoupons.map(c => c.code);

      const checkout = await abacate.checkouts.create({
        items: [
          {
            id: abacateProductId || "prod_fallback",
            quantity: 1
          }
        ],
        customer: {
          name: user?.name || "Personal Trainer",
          email: user?.email || "trainer@atlasfit.com",
          cellphone: user?.whatsapp || "+5511999999999",
          taxId: "12345678909"
        },
        allowCoupons: true,
        coupons: activeCouponCodes,
        externalId: transaction.id,
        metadata: {
          planId: plan.id,
          userId: session.user.id,
          isPreSubscription: isTrialActive ? "true" : "false"
        },
        returnUrl: `${req.headers.get("origin") || "http://localhost:3000"}/subscription-expired/pending?transactionId=${transaction.id}`,
        completionUrl: `${req.headers.get("origin") || "http://localhost:3000"}/subscription-expired/pending?transactionId=${transaction.id}`
      });

      return NextResponse.json({ success: true, checkoutUrl: checkout.url });
    } else {
      const startDate = isTrialActive ? new Date(freeTrial.endDate) : new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);

      await prisma.subscription.upsert({
        where: { userId: session.user.id },
        update: {
          planId: plan.id,
          status: "active",
          startDate,
          endDate,
          isPreSubscription: isTrialActive,
        },
        create: {
          userId: session.user.id,
          planId: plan.id,
          status: "active",
          startDate,
          endDate,
          isPreSubscription: isTrialActive,
        },
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: "APPROVED" }
      });

      await prisma.subscriptionActivity.create({
        data: {
          userId: session.user.id,
          planId: plan.id,
          type: isTrialActive ? "NEW_SUBSCRIPTION" : "UPGRADE",
          amount: plan.price,
          status: "success",
        }
      });

      return NextResponse.json({ 
        success: true, 
        checkoutUrl: `/subscription-expired/pending?transactionId=${transaction.id}` 
      });
    }
  } catch (error) {
    await logSystemError({ action: "POST_SUBSCRIPTION_CHECKOUT", error, entity: "SUBSCRIPTION" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
