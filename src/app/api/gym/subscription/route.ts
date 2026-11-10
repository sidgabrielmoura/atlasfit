export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { EntitlementsService } from "@/modules/workspaces/application/entitlements-service";
import { calculateSingleWorkspaceStorageUsage } from "@/lib/comprehensive-storage.service";
import { withRequestMemo } from "@/lib/request-memo";
import { z } from "zod";
import { isValidCpfCnpj } from "@/lib/cpf-validator";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { AbacatePay, resolvePublicImageUrl } from "@/lib/abacatepay";
import { validateApplicationOrigin, isAllowedOrigin } from "@/lib/auth/application-origin";
import { logSystemError } from "@/lib/logger";
import { createHash } from "node:crypto";

async function handleGET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");

  if (!workspaceId) {
    return new NextResponse("workspaceId é obrigatório.", { status: 400 });
  }

  try {
    await requireGymWorkspaceAccess({
      workspaceId,
      anyCapability: ["workspace.manage", "invoices.read", "reports.finance"],
      allowExpiredGymLicense: true,
    });

    const [workspace, entitlements, storageUsage, plansInDb, transactions] = await Promise.all([
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: {
          id: true,
          name: true,
          ownerId: true,
          importCredits: true,
          subscription: {
            include: { plan: true },
          },
        },
      }),
      EntitlementsService.resolveEntitlements(workspaceId).catch(() => null),
      calculateSingleWorkspaceStorageUsage(workspaceId).catch(() => ({ totalUsedMb: 0, totalUsedBytes: 0, totalUsedGb: 0 })),
      prisma.plan.findMany({
        where: { customWorkspaceId: null, type: "GYM" },
        orderBy: { price: "asc" },
      }).catch(() => []),
      prisma.transaction.findMany({
        where: {
          workspaceId,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }).catch(() => []),
    ]);

    if (!workspace) {
      return new NextResponse("Workspace não encontrado.", { status: 404 });
    }

    const sub = workspace.subscription;
    const plan = sub?.plan;

    // Calculate days remaining
    let daysRemaining = 30;
    if (sub?.nextDueDate) {
      const today = new Date();
      const d1 = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
      const d2 = new Date(sub.nextDueDate.getFullYear(), sub.nextDueDate.getMonth(), sub.nextDueDate.getDate(), 12, 0, 0);
      daysRemaining = Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
    }

    const currentSubscription = {
      id: sub?.id || `gym_${workspace.id}`,
      planName: plan?.name || (entitlements?.planName ?? "Plano Academia"),
      planPrice: sub?.priceInCents != null ? sub.priceInCents / 100 : (plan?.price ?? 0),
      billingCycle: sub?.periodicity === "ANUAL" ? "Anual" : "Mensal",
      status: (entitlements?.status || sub?.status || "INCOMPLETE").toLowerCase(),
      paymentMethod: sub?.paymentMethod || "Não informado",
      nextBillingDate: sub?.nextDueDate ? sub.nextDueDate.toISOString().split("T")[0] : null,
      daysRemaining,
      isPreSubscription: false,
      isTestAccount: false,
      usage: {
        students: {
          current: entitlements?.usage?.studentsCount ?? 0,
          limit: entitlements?.limits?.maxStudents ?? sub?.maxStudents ?? plan?.maxStudents ?? 0,
        },
        storage: {
          current: Math.round((storageUsage.totalUsedMb || 0) * 10) / 10,
          limit: entitlements?.limits?.storageLimitMb ?? sub?.storageLimitMb ?? plan?.storageLimitMb ?? 0,
          unit: "MB",
        },
        units: {
          current: entitlements?.usage?.unitsCount ?? 1,
          limit: entitlements?.limits?.maxUnits ?? sub?.maxUnits ?? plan?.maxWorkspaces ?? 0,
        },
        staff: {
          current: entitlements?.usage?.staffCount ?? 0,
          limit: entitlements?.limits?.maxStaff ?? sub?.maxStaff ?? plan?.maxStaff ?? 0,
        },
        coins: workspace.importCredits ?? 0,
      },
      invoices: transactions.map((t) => ({
        id: t.id,
        date: t.createdAt.toISOString().split("T")[0],
        amount: t.amount,
        status: t.status,
        paymentMethod: t.paymentMethod || "PIX",
        description: t.description || `Assinatura de ${workspace.name}`,
      })),
    };

    const mappedPlatformPlans = plansInDb.map((p) => {
      const isCurrent = plan ? p.id === plan.id : false;

      let featuresList: string[] = [];
      if (p.features) {
        featuresList = p.features.split(",").map((f) => f.trim());
      } else {
        featuresList = [
          `Até ${p.maxStudents || 500} alunos ativos`,
          `Até ${p.maxWorkspaces || 1} ${p.maxWorkspaces === 1 ? "filial" : "filiais"}`,
          `Até ${p.maxStaff || 10} colaboradores por filial`,
          `Armazenamento de ${p.storageLimitMb >= 1024 ? Math.round(p.storageLimitMb / 1024) + " GB" : p.storageLimitMb + " MB"}`,
          "Gestão financeira completa e conciliação",
        ];
      }

      return {
        id: p.id,
        name: p.name,
        price: `R$ ${p.price}`,
        interval: `/${p.interval === "year" ? "ano" : "mês"}`,
        description: p.name.toLowerCase().includes("iniciante") || p.name.toLowerCase().includes("box")
          ? "Ideal para academias de unidade única ou estúdios fitness."
          : "Perfeito para redes de academias com múltiplas filiais e grande equipe.",
        features: featuresList,
        highlight: p.name.toLowerCase().includes("pro") || p.name.toLowerCase().includes("rede") || p.name.toLowerCase().includes("enterprise"),
        buttonText: isCurrent
          ? "Seu Plano Atual"
          : plan
          ? p.price > plan.price
            ? "Fazer Upgrade"
            : "Regredir Plano"
          : "Assinar",
        disabled: isCurrent,
        isCurrent,
        rawInterval: p.interval,
        maxWorkspaces: p.maxWorkspaces,
        maxStaff: p.maxStaff,
        type: p.type,
      };
    });

    return NextResponse.json({ currentSubscription, platformPlans: mappedPlatformPlans });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error);
    if (denied) return denied;
    console.error("[GET_GYM_SUBSCRIPTION] Error:", error);
    await logSystemError({ action: "GET_GYM_SUBSCRIPTION", error, entity: "SUBSCRIPTION" });
    return new NextResponse("Erro ao consultar assinatura da academia.", { status: 500 });
  }
}

export const GET = withRequestMemo(handleGET);

export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) {
      return new NextResponse("Origem da solicitação inválida.", { status: 403 });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return new NextResponse("workspaceId é obrigatório.", { status: 400 });
    }

    await requireGymWorkspaceAccess({ workspaceId, capability: "workspace.manage", allowExpiredGymLicense: true });
    const intent = req.headers.get("idempotency-key");
    if (!intent || !/^[\w:.-]{8,128}$/.test(intent)) return new NextResponse("Identificação da tentativa de compra obrigatória.", { status: 400 });
    const apiKey = process.env.ABACATEPAY_API_KEY;
    if (!apiKey || apiKey === "abc_dev_placeholder") return new NextResponse("Pagamento temporariamente indisponível.", { status: 503 });

    const body = z
      .object({
        planId: z.string().min(1).max(200),
        billing: z
          .object({
            taxId: z.string().max(18),
            cellphone: z.string().max(20),
          })
          .strict(),
      })
      .strict()
      .parse(await readPrivacyJsonRequest(req, 2048));

    const { planId } = body;
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    });

    const taxId = body.billing.taxId.replace(/\D/g, "");
    const cellphone = body.billing.cellphone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

    if (!isValidCpfCnpj(taxId) || !/^\d{2}9\d{8}$/.test(cellphone) || !user?.name?.trim() || !z.email().safeParse(user.email).success) {
      return new NextResponse("Informe CPF/CNPJ e celular válidos do pagador e mantenha nome e email no seu perfil.", { status: 400 });
    }

    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan || plan.type !== "GYM" || plan.customWorkspaceId) {
      return new NextResponse("Plano para academia não encontrado.", { status: 404 });
    }
    const targetPriceCents = Math.round(plan.price * 100);
    if (!Number.isSafeInteger(targetPriceCents) || targetPriceCents < 100) return new NextResponse("Preço de plano inválido para pagamento.", { status: 409 });
    const requestKey = createHash("sha256").update(JSON.stringify([workspaceId, session.user.id, intent])).digest("hex");
    const previous = await prisma.transaction.findUnique({ where: { requestKey } });
    if (previous) {
      if (previous.platformPlanId !== plan.id || previous.expectedAmountInCents !== targetPriceCents) return new NextResponse("Tentativa já utilizada com outro plano ou valor.", { status: 409 });
      if (previous.status === "PENDING" && previous.checkoutUrl) return NextResponse.json({ checkoutUrl: previous.checkoutUrl });
      return new NextResponse("Compra já recebida. Consulte sua situação antes de iniciar outra tentativa.", { status: 409 });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: session.user.id,
        workspaceId,
        requestKey,
        platformPlanId: plan.id,
        expectedAmountInCents: targetPriceCents,
        amount: plan.price,
        status: "PENDING",
        paymentMethod: "PIX",
        description: `Assinatura do plano ${plan.name} (Academia)`,
      },
    });

    const returnOrigin = validateApplicationOrigin(
      process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.APP_URL || "https://app.atlasfit.site"
    );

    if (apiKey && apiKey !== "abc_dev_placeholder") {
      const abacate = AbacatePay({ secret: apiKey });
      const cycle = plan.interval === "year" ? "ANNUALLY" : "MONTHLY";
      const publicImage = resolvePublicImageUrl(plan.imageUrl);

      let abacateProductId = "";
      try {
        const product = await abacate.products.create({
          externalId: `${plan.id}:${targetPriceCents}:${cycle}`,
          name: `${plan.name} (Academia)`,
          price: targetPriceCents,
          currency: "BRL",
          description: plan.features || `Plano Academia ${plan.name}`,
          cycle,
          ...(publicImage ? { image: publicImage, imageUrl: publicImage } : {}),
        });
        abacateProductId = product.id;
      } catch (prodErr) {
        // Search if product already exists
        try {
          const listRes = await abacate.products.list();
          const items = Array.isArray(listRes) ? listRes : (listRes as any)?.data || [];
          const found = items.find((p: any) => p.externalId === `${plan.id}:${targetPriceCents}:${cycle}`);
          if (found) abacateProductId = found.id;
        } catch (listErr) {
          await logSystemError({ action: "GYM_SUBSCRIPTION_SYNC_PRODUCT", error: listErr, entity: "SUBSCRIPTION" });
        }
      }

      if (abacateProductId) {
        const returnUrl = `${returnOrigin}/gym/subscription?status=pending&transactionId=${transaction.id}`;
        const checkout = await abacate.checkouts.create({
          methods: ["PIX", "CARD"],
          items: [{ id: abacateProductId, quantity: 1 }],
          customer: {
            name: user.name!.trim(),
            email: user.email!,
            cellphone,
            taxId,
          },
          externalId: transaction.id,
          metadata: { purpose: "GYM_SUBSCRIPTION", workspaceId, userId: session.user.id, planId: plan.id },
          returnUrl,
          completionUrl: returnUrl,
        });

        if (checkout?.url) {
          if (!checkout.id || !checkout.url.startsWith("https://")) throw new Error("INVALID_PROVIDER_CHECKOUT");
          await prisma.transaction.update({ where: { id: transaction.id }, data: { providerCheckoutId: checkout.id, checkoutUrl: checkout.url } });
          return NextResponse.json({ checkoutUrl: checkout.url });
        }
      }
    }

    return new NextResponse("Não foi possível abrir o pagamento. A compra permanece pendente de conferência.", { status: 503 });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error);
    if (denied) return denied;
    if (error instanceof z.ZodError) return new NextResponse("Dados de pagamento inválidos.", { status: 400 });
    await logSystemError({ action: "POST_GYM_SUBSCRIPTION", error, entity: "SUBSCRIPTION" });
    return new NextResponse("Erro ao processar assinatura da academia.", { status: 500 });
  }
}

