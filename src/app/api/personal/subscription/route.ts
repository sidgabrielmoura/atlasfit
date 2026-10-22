import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay, resolvePublicImageUrl } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";
import { isValidCpfCnpj } from "@/lib/cpf-validator";
import { z } from "zod";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { JsonRequestError } from "@/lib/http/read-json";
import { validateApplicationOrigin, isAllowedOrigin } from "@/lib/auth/application-origin";
import { isPersonalTrialActive } from "@/modules/workspaces/domain/personal-trial";
import { isPersonalSubscriptionActive } from "@/modules/workspaces/application/personal-affiliation";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { getAccountStorageQuotaMetrics } from "@/lib/comprehensive-storage.service";

async function handleGET(req: Request) {
  const restricted = await personalCommercialContextResponse({ allowExpired: true }); if (restricted) return restricted;
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

    if (!subscription) {
      const ownedWsSub = await prisma.workspaceSubscription.findFirst({
        where: {
          workspace: {
            ownerId: session.user.id,
          },
        },
        include: { plan: true },
      });
      if (ownedWsSub) {
        subscription = {
          id: ownedWsSub.id,
          userId: session.user.id,
          planId: ownedWsSub.planId || "",
          status: (ownedWsSub.status === "ACTIVE" || ownedWsSub.status === "TRIAL") ? "active" : "expired",
          startDate: ownedWsSub.startDate,
          endDate: ownedWsSub.endDate,
          isPreSubscription: false,
          importQuotaUsed: 0,
          importQuotaResetAt: null,
          abacateSubscriptionId: null,
          abacateCustomerId: null,
          billingControlType: ownedWsSub.billingControlType,
          nextDueDate: ownedWsSub.nextDueDate,
          priceInCents: ownedWsSub.priceInCents,
          paymentMethod: ownedWsSub.paymentMethod,
          periodicity: ownedWsSub.periodicity,
          autoSuspendEnabled: ownedWsSub.autoSuspendEnabled,
          toleranceDays: ownedWsSub.toleranceDays,
          plan: ownedWsSub.plan || {
            name: "Plano do Workspace",
            price: (ownedWsSub.priceInCents || 0) / 100,
            interval: "month",
            features: null,
            maxWorkspaces: ownedWsSub.maxUnits,
            maxStudents: ownedWsSub.maxStudents,
            importQuota: 25,
            storageLimitMb: ownedWsSub.storageLimitMb,
            paymentMethods: ownedWsSub.paymentMethod,
            imageUrl: null,
          },
        } as any;
      }
    }

    const isTrialActive = isPersonalTrialActive(freeTrial);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isTestAccount: true }
    });
    const isTestAccount = user?.isTestAccount || false;

    let effectiveSub: any = subscription ? { ...subscription, status: isPersonalSubscriptionActive(subscription) ? subscription.status : "expired" } : null;
    if (isTestAccount) {
      effectiveSub = {
        id: "test_account",
        plan: {
          name: "Conta Teste",
          price: 0,
          maxStudents: 999999,
          storageLimitMb: 102400,
        },
        status: "active",
        startDate: new Date(),
        endDate: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000), // 10 years in the future
        isPreSubscription: false,
      };
    } else if (!effectiveSub && freeTrial) {
      effectiveSub = {
        id: "trial_" + freeTrial.id,
        plan: {
          name: "Free Trial",
          price: 0,
          maxStudents: 50,
          storageLimitMb: 5120,
        },
        status: isTrialActive ? "trial" : "expired",
        startDate: freeTrial.startDate,
        endDate: freeTrial.endDate,
        isPreSubscription: false,
      };
    }

    if (!effectiveSub) {
      // Trainer has no subscription and no free trial.
      // Do NOT auto-create a Starter subscription — just return available plans
      // so the trainer can choose or be redirected to the subscription-expired page.
      const plansInDb = await prisma.plan.findMany({
        where: { customWorkspaceId: null },
        orderBy: { price: "asc" }
      });

      const mappedPlatformPlans = plansInDb.map((p) => ({
        id: p.id,
        name: p.name,
        price: `R$ ${p.price}`,
        interval: `/${p.interval === "year" ? "ano" : "mês"}`,
        description: p.name.toLowerCase().includes("starter")
          ? "Ideal para quem está começando na consultoria online."
          : "A escolha perfeita para escalar seu negócio.",
        features: p.features
          ? p.features.split(",").map(f => f.trim())
          : ["Funcionalidades incluídas"],
        highlight: p.name.toLowerCase().includes("pro") || p.name.toLowerCase().includes("professional"),
        buttonText: "Assinar",
        disabled: false,
        isCurrent: false,
      }));

      return NextResponse.json({
        currentSubscription: null,
        platformPlans: mappedPlatformPlans,
      });
    }

    const studentCount = await prisma.workspaceMember.count({
      where: {
        role: "STUDENT",
        isActive: true,
        workspace: {
          ownerId: session.user.id,
          type: "PERSONAL"
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

    const getStorageLimit = (plan: any) => {
      let limitMb = plan?.storageLimitMb;
      if (typeof limitMb !== "number" || isNaN(limitMb) || limitMb <= 0) {
        const name = (plan?.name || "").toLowerCase();
        if (name.includes("starter") || name.includes("basic") || name.includes("trial")) {
          limitMb = 5120; // 5 GB
        } else if (name.includes("professional") || name.includes("pro")) {
          limitMb = 20480; // 20 GB
        } else {
          limitMb = 102400; // 100 GB default fallback
        }
      }

      // If stored as small integer (e.g. 1 to 50), it represents GB
      if (limitMb <= 50) {
        return { limit: limitMb, unit: "GB", limitMb: limitMb * 1024 };
      }

      if (limitMb >= 1024) {
        const gb = Math.round((limitMb / 1024) * 10) / 10;
        return { limit: gb, unit: "GB", limitMb };
      }

      return { limit: limitMb, unit: "MB", limitMb };
    };

    const studentLimit = getStudentLimit(effectiveSub.plan);
    const storageLimitInfo = getStorageLimit(effectiveSub.plan);

    const storageMetrics = await getAccountStorageQuotaMetrics(session.user.id);

    const plansInDb = await prisma.plan.findMany({
      where: { customWorkspaceId: null },
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
        isCurrent,
        rawInterval: p.interval,
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
    const primaryDomain = domainSetting?.value || "app.atlasfit.site";

    const responseData = {
      currentSubscription: {
        id: effectiveSub.id,
        planName: effectiveSub.plan.name,
        planPrice: effectiveSub.plan.price,
        status: effectiveSub.status.toLowerCase(),
        nextBillingDate: isTestAccount ? "Não vence" : nextBillingStr,
        daysRemaining: daysRemaining,
        paymentMethod: effectiveSub.plan.price === 0 ? "Nenhum" : "Pix Automático",
        billingCycle: effectiveSub.plan.price === 0 ? "Nenhum" : "Mensal",
        invoices: mappedInvoices,
        isPreSubscription: effectiveSub.isPreSubscription || false,
        isTestAccount: isTestAccount,
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
            current: storageLimitInfo.unit === "GB" ? storageMetrics.totalUsedGb : storageMetrics.totalUsedMb,
            limit: storageLimitInfo.limit,
            unit: storageLimitInfo.unit,
            percentage: storageMetrics.percentageUsed,
            currentMb: storageMetrics.totalUsedMb,
            currentGb: storageMetrics.totalUsedGb,
            totalUsedBytes: storageMetrics.totalUsedBytes,
            breakdown: storageMetrics.breakdown,
            workspacesCount: storageMetrics.workspacesCount,
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
export const GET = withRequestMemo(handleGET);

export async function POST(req: Request) {
  let createdTransactionId: string | undefined;
  const restricted = await personalCommercialContextResponse({ allowExpired: true }); if (restricted) return restricted;
  try {
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) return new NextResponse("Origem da solicitação inválida.", { status: 403 });
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = z.object({ planId: z.string().min(1).max(200), billing: z.object({ taxId: z.string().max(18), cellphone: z.string().max(20) }).strict() }).strict().parse(await readPrivacyJsonRequest(req, 2048));
    const { planId } = body;
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
    const taxId = body.billing.taxId.replace(/\D/g, "");
    const cellphone = body.billing.cellphone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    if (!isValidCpfCnpj(taxId) || !/^\d{2}9\d{8}$/.test(cellphone) || !user?.name?.trim() || !z.email().safeParse(user.email).success) {
      return new NextResponse("Informe CPF/CNPJ e celular válidos do pagador e mantenha nome e email no seu perfil.", { status: 400 });
    }
    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") return new NextResponse("Pagamento indisponível. O gateway de assinaturas ainda não foi configurado.", { status: 503 });
    const returnOrigin = validateApplicationOrigin(process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.APP_URL || "https://app.atlasfit.site");

    if (!planId) {
      return new NextResponse("ID do plano é obrigatório.", { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan || plan.customWorkspaceId) {
      return new NextResponse("Plano não encontrado.", { status: 404 });
    }

    const freeTrial = await prisma.freeTrial.findUnique({
      where: { userId: session.user.id }
    });

    const isTrialActive = isPersonalTrialActive(freeTrial);

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

    createdTransactionId = transaction.id;

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

        const cycle = plan.interval === "year" ? "ANNUALLY" : "MONTHLY";
        const existingProduct = products.find((p: any) => p.externalId === plan.id);
        const targetPriceCents = Math.round(plan.price * 100);

        if (existingProduct) {
          if (
            existingProduct.price !== targetPriceCents ||
            existingProduct.name !== plan.name ||
            existingProduct.cycle !== cycle
          ) {
            try {
              await abacate.products.delete({ id: existingProduct.id });
            } catch (delError) {
              console.error("Erro ao deletar produto desatualizado no AbacatePay:", delError);
            }
            const publicImage = resolvePublicImageUrl(plan.imageUrl);
            const newProduct = await abacate.products.create({
              externalId: plan.id,
              name: plan.name,
              price: targetPriceCents,
              currency: "BRL",
              description: plan.features || `Plano ${plan.name}`,
              cycle,
              ...(publicImage ? { image: publicImage, imageUrl: publicImage } : {})
            });
            abacateProductId = newProduct.id;
          } else {
            abacateProductId = existingProduct.id;
          }
        } else {
          const publicImage = resolvePublicImageUrl(plan.imageUrl);
          const newProduct = await abacate.products.create({
            externalId: plan.id,
            name: plan.name,
            price: targetPriceCents,
            currency: "BRL",
            description: plan.features || `Plano ${plan.name}`,
            cycle,
            ...(publicImage ? { image: publicImage, imageUrl: publicImage } : {})
          });
          abacateProductId = newProduct.id;
        }
      } catch (abacateError) {
        await logSystemError({ action: "POST_SUBSCRIPTION_SYNC_PRODUCT_ABACATEPAY", error: abacateError, entity: "SUBSCRIPTION" });
        try {
          const cycle = plan.interval === "year" ? "ANNUALLY" : "MONTHLY";
          const publicImage = resolvePublicImageUrl(plan.imageUrl);
          const newProduct = await abacate.products.create({
            externalId: plan.id,
            name: plan.name,
            price: Math.round(plan.price * 100),
            currency: "BRL",
            description: plan.features || `Plano ${plan.name}`,
            cycle,
            ...(publicImage ? { image: publicImage, imageUrl: publicImage } : {})
          });
          abacateProductId = newProduct.id;
        } catch (innerErr) {
          await logSystemError({ action: "POST_SUBSCRIPTION_SYNC_PRODUCT_ABACATEPAY_CRITICAL", error: innerErr, entity: "SUBSCRIPTION" });
        }
      }

      if (!abacateProductId) throw new Error("Não foi possível registrar o produto no gateway.");

      // Buscar todos os cupons ativos no banco
      const activeCoupons = await prisma.coupon.findMany({
        where: { isActive: true }
      });
      const activeCouponCodes = activeCoupons.map(c => c.code);

      const planMethodsStr = (plan as any).paymentMethods || "CARD,PIX";
      const rawMethods = String(planMethodsStr).split(",").map((m: string) => m.trim().toUpperCase());
      const validMethods = rawMethods.filter((m: string) => m === "PIX" || m === "CARD") as Array<"PIX" | "CARD">;
      const methods = validMethods.length > 0 ? validMethods : (["CARD"] as Array<"PIX" | "CARD">);

      const completionUrl = `${returnOrigin}/subscription-expired/pending?transactionId=${transaction.id}`;
      const returnUrl = `${returnOrigin}/subscription-expired/pending?transactionId=${transaction.id}`;

      let checkout;

      if (methods.includes("CARD")) {
        try {
          checkout = await abacate.subscriptions.create({
            items: [
              {
                id: abacateProductId,
                quantity: 1
              }
            ],
            methods: ["CARD"],
            customer: {
              name: user.name!.trim(),
              email: user.email!,
              cellphone: cellphone,
              taxId: taxId
            },
            allowCoupons: true,
            coupons: activeCouponCodes,
            externalId: transaction.id,
            metadata: {
              planId: plan.id,
              userId: session.user.id,
              interval: plan.interval,
              isPreSubscription: isTrialActive ? "true" : "false"
            },
            returnUrl,
            completionUrl,
            retryPolicy: {
              maxRetry: 3,
              retryEvery: 1
            }
          });
        } catch (subErr: any) {
          const errStr = String(subErr?.message || subErr || "");
          console.warn("Falha ao criar assinatura com cartão no AbacatePay:", errStr);
          // Fallback para checkout comum se houver restrição da loja
          if (methods.includes("PIX") || errStr.includes("CARD is not available") || errStr.includes("CARD")) {
            console.warn("Executando fallback para checkout avulso PIX no AbacatePay.");
            checkout = await abacate.checkouts.create({
              methods: ["PIX"],
              items: [{ id: abacateProductId, quantity: 1 }],
              customer: {
                name: user.name!.trim(),
                email: user.email!,
                cellphone: cellphone,
                taxId: taxId
              },
              allowCoupons: true,
              coupons: activeCouponCodes,
              externalId: transaction.id,
              metadata: {
                planId: plan.id,
                userId: session.user.id,
                interval: plan.interval,
                isPreSubscription: isTrialActive ? "true" : "false"
              },
              returnUrl,
              completionUrl
            });
          } else {
            throw subErr;
          }
        }
      } else {
        // Cobrança pontual exclusiva por PIX
        checkout = await abacate.checkouts.create({
          methods: ["PIX"],
          items: [{ id: abacateProductId, quantity: 1 }],
          customer: {
            name: user.name!.trim(),
            email: user.email!,
            cellphone: cellphone,
            taxId: taxId
          },
          allowCoupons: true,
          coupons: activeCouponCodes,
          externalId: transaction.id,
          metadata: {
            planId: plan.id,
            userId: session.user.id,
            interval: plan.interval,
            isPreSubscription: isTrialActive ? "true" : "false"
          },
          returnUrl,
          completionUrl
        });
      }

      return NextResponse.json({ success: true, checkoutUrl: checkout.url });
    }
  } catch (error) {
    if (error instanceof z.ZodError) return new NextResponse("Dados de cobrança inválidos.", { status: 400 });
    if (error instanceof JsonRequestError) return new NextResponse(error.message, { status: error.statusCode });
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    if (createdTransactionId) await prisma.transaction.update({ where: { id: createdTransactionId }, data: { status: "FAILED" } });
    await logSystemError({ action: "POST_SUBSCRIPTION_CHECKOUT", error, entity: "SUBSCRIPTION" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const restricted = await personalCommercialContextResponse({ allowExpired: true }); if (restricted) return restricted;
  try {
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) return new NextResponse("Origem da solicitação inválida.", { status: 403 });
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const userId = session.user.id;

    // 1. Fetch current subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true }
    });

    if (!subscription) {
      return new NextResponse("Assinatura não encontrada.", { status: 404 });
    }

    if (subscription.status.toLowerCase() === "canceled") {
      return new NextResponse("A assinatura já está cancelada.", { status: 400 });
    }

    // 2. Update subscription status in our database to "canceled"
    // Keep endDate so they have access until renewal date
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: "canceled"
      }
    });

    // 3. Register activity
    await prisma.subscriptionActivity.create({
      data: {
        userId,
        planId: subscription.planId,
        type: "CANCELLATION",
        amount: 0,
        status: "success"
      }
    });

    // 4. Try to cancel the subscription in AbacatePay
    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (apiKey && apiKey !== "abc_dev_placeholder") {
      try {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true }
        });

        if (user?.email) {
          // List subscriptions from AbacatePay
          const response = await fetch("https://api.abacatepay.com/v2/subscriptions/list", {
            headers: {
              "Authorization": `Bearer ${apiKey}`
            }
          });

          if (response.ok) {
            const result = await response.json();
            const subscriptions = result.data || [];
            const abacateSub = subscriptions.find((sub: any) =>
              sub.customer?.email === user.email &&
              ["active", "ACTIVE"].includes(sub.status)
            );

            if (abacateSub?.id) {
              await fetch("https://api.abacatepay.com/v2/subscriptions/cancel", {
                method: "POST",
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ id: abacateSub.id })
              });
              console.log(`Assinatura ${abacateSub.id} cancelada no AbacatePay.`);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao cancelar assinatura no AbacatePay:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    await logSystemError({ action: "DELETE_SUBSCRIPTION_CANCEL", error, entity: "SUBSCRIPTION" });
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
