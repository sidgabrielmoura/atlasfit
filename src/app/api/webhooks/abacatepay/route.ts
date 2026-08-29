import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";
import { publishToChannel } from "@/lib/ably";
import crypto from "crypto";

export async function POST(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const rawBody = await req.text();
  const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const apiKey = process.env.ABACATEPAY_API_KEY;

  let eventPayload: any;

  if (webhookSecret && webhookSecret !== "whsec_placeholder" && apiKey && apiKey !== "abc_dev_placeholder") {
    if (!signature) {
      return new NextResponse("Assinatura ausente.", { status: 401 });
    }
    try {
      const ABACATEPAY_SHARED_KEY = "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

      const sigHexSecret = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
      const sigBase64Secret = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("base64");
      const sigBase64Shared = crypto.createHmac("sha256", ABACATEPAY_SHARED_KEY).update(rawBody).digest("base64");
      const sigHexShared = crypto.createHmac("sha256", ABACATEPAY_SHARED_KEY).update(rawBody).digest("hex");

      const isValid = (signature === sigHexSecret) ||
                      (signature === sigBase64Secret) ||
                      (signature === sigBase64Shared) ||
                      (signature === sigHexShared);

      if (!isValid) {
        throw new Error("Assinatura inválida (HMAC incorreto).");
      }
      eventPayload = JSON.parse(rawBody);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err);
      await logSystemError({ action: "WEBHOOK_SIGNATURE_VERIFICATION", error: err, entity: "WEBHOOK" });
      return new NextResponse("Assinatura inválida.", { status: 401 });
    }
  } else {
    try {
      eventPayload = JSON.parse(rawBody);
    } catch (err: any) {
      console.error("Erro ao converter corpo do webhook:", err);
      await logSystemError({ action: "WEBHOOK_PAYLOAD_PARSE", error: err, entity: "WEBHOOK" });
      return new NextResponse("Payload inválido.", { status: 400 });
    }
  }

  const { event: eventType, data } = eventPayload;
  const isCheckoutEvent = eventType && eventType.startsWith("checkout");
  const isSubscriptionEvent = eventType && eventType.startsWith("subscription");
  const targetData = isCheckoutEvent
    ? data?.checkout
    : isSubscriptionEvent
      ? (data?.subscription || data)
      : data;

  if (!targetData) {
    console.error("Payload do webhook inválido ou dados de targetData ausentes.");
    return new NextResponse("Dados insuficientes no payload.", { status: 400 });
  }

  const subscriptionId = targetData.id?.startsWith("subs_")
    ? targetData.id
    : data?.subscription?.id || undefined;
  const customerId = targetData.customerId || data?.subscription?.customerId || undefined;

  // =========================================================================
  // 1. EVENTO: RENOVAÇÃO AUTOMÁTICA DA ASSINATURA (subscription.renewed)
  // Disparado pela AbacatePay no dia do vencimento quando a cobrança no cartão é aprovada
  // =========================================================================
  if (eventType === "subscription.renewed") {
    const metadata = targetData.metadata || data?.subscription?.metadata || {};
    let targetUserId = metadata.userId;
    let targetPlanId = metadata.planId;

    if (!targetUserId && subscriptionId) {
      const existingSub = await prisma.subscription.findFirst({
        where: { abacateSubscriptionId: subscriptionId }
      });
      if (existingSub) {
        targetUserId = existingSub.userId;
        targetPlanId = targetPlanId || existingSub.planId;
      }
    }

    if (!targetUserId && targetData.externalId) {
      const txRecord = await prisma.transaction.findUnique({
        where: { id: targetData.externalId }
      });
      if (txRecord) {
        targetUserId = txRecord.userId;
      }
    }

    if (!targetUserId) {
      console.error("[WEBHOOK_RENEWAL] Usuário não identificado para renovação da assinatura:", eventPayload);
      return new NextResponse("Usuário não identificado para renovação.", { status: 400 });
    }

    try {
      let planName = "Plano";

      const txResult = await prisma.$transaction(async (tx) => {
        const sub = await tx.subscription.findUnique({
          where: { userId: targetUserId },
          include: { plan: true }
        });

        if (!sub) {
          throw new Error(`Assinatura não encontrada para o usuário ${targetUserId}`);
        }

        planName = sub.plan.name;

        // Calcular novo vencimento: somar 1 mês ou 1 ano a partir do vencimento anterior
        const currentEnd = sub.endDate && new Date(sub.endDate) > new Date()
          ? new Date(sub.endDate)
          : new Date();
        const newEndDate = new Date(currentEnd);

        if (sub.plan.interval === "year") {
          newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
          newEndDate.setDate(newEndDate.getDate() + 30);
        }

        // 1. Atualizar o dia de vencimento e status da assinatura no sistema
        await tx.subscription.update({
          where: { id: sub.id },
          data: {
            status: "active",
            endDate: newEndDate,
            abacateSubscriptionId: subscriptionId || sub.abacateSubscriptionId,
            abacateCustomerId: customerId || sub.abacateCustomerId
          }
        });

        // 2. Registrar a fatura em Transaction
        const renewalAmountInCents = targetData.amount || data?.billing?.amount || Math.round(sub.plan.price * 100);
        const renewalAmount = renewalAmountInCents / 100;

        const newTx = await tx.transaction.create({
          data: {
            userId: targetUserId,
            amount: renewalAmount,
            status: "APPROVED",
            paymentMethod: "CREDIT_CARD",
            description: `Renovação Automática do plano ${sub.plan.name}`
          }
        });

        // 3. Registrar atividade de renovação
        await tx.subscriptionActivity.create({
          data: {
            userId: targetUserId,
            planId: sub.planId,
            type: "RENEWAL",
            amount: renewalAmount,
            status: "success"
          }
        });

        // 4. Comissão de afiliados recorrente
        const payingUser = await tx.user.findUnique({
          where: { id: targetUserId },
          select: { referredById: true }
        });

        if (payingUser?.referredById) {
          const commissionRate = 0.20;
          const commissionAmount = renewalAmount * commissionRate;

          await tx.referralCommission.create({
            data: {
              referrerId: payingUser.referredById,
              referredId: targetUserId,
              transactionId: newTx.id,
              amount: commissionAmount,
              percentage: commissionRate * 100,
              status: "APROVADO"
            }
          });
        }

        // 5. Log de Auditoria
        await tx.auditLog.create({
          data: {
            userId: targetUserId,
            action: "SUBSCRIPTION_RENEWAL",
            entity: "SUBSCRIPTION",
            entityId: sub.id,
            severity: "success",
            ip: "AbacatePay Webhook Auto-Renewal"
          }
        });

        return { newEndDate };
      });

      const renewedEndDate: Date = txResult.newEndDate;

      // Notificar a tela do personal trainer em tempo real via Ably
      try {
        await publishToChannel(`user:${targetUserId}`, "wallet:updated", {
          reason: "subscription_renewed",
          newEndDate: renewedEndDate
        });
      } catch (ablyErr) {
        console.warn("Falha ao emitir socket Ably:", ablyErr);
      }

      console.log(`Assinatura do Personal ${targetUserId} renovada com sucesso até ${renewedEndDate.toISOString()}!`);
      return NextResponse.json({ success: true, processed: "subscription_renewed", newEndDate: renewedEndDate });
    } catch (error: any) {
      console.error("Erro ao processar renovação automática de assinatura via Webhook:", error);
      await logSystemError({ action: "WEBHOOK_SUBSCRIPTION_RENEWED_PROCESS", error, entity: "WEBHOOK", userId: targetUserId });
      return new NextResponse("Erro ao processar renovação.", { status: 500 });
    }
  }

  // =========================================================================
  // 2. EVENTO: ATIVAÇÃO INICIAL (billing.paid / checkout.completed / subscription.completed)
  // =========================================================================
  if (
    eventType === "billing.paid" ||
    eventType === "subscription.completed" ||
    (eventType === "checkout.completed" && targetData.status === "PAID")
  ) {
    const metadata = targetData.metadata || data?.subscription?.metadata || {};
    const { packageId, planId, userId, isPreSubscription } = metadata;
    const transactionId = targetData.externalId;
    const billingId = targetData.id || targetData.billingId;

    if (packageId || (billingId && await prisma.creditPurchase.findFirst({ where: { OR: [{ abacatePayBillingId: billingId }, { id: transactionId }] } }))) {
      const targetUserId = userId || targetData.userId;

      let purchase = billingId
        ? await prisma.creditPurchase.findFirst({ where: { OR: [{ abacatePayBillingId: billingId }, { id: transactionId }] } })
        : null;

      if (!purchase && packageId && targetUserId) {
        purchase = await prisma.creditPurchase.findFirst({
          where: {
            userId: targetUserId,
            packageId: packageId,
            status: "PENDING",
          },
          orderBy: { createdAt: "desc" },
        });
      }

      if (purchase) {
        if (purchase.status === "PAID") {
          return NextResponse.json({ success: true, message: "Já processado." });
        }

        await prisma.$transaction([
          prisma.creditPurchase.update({
            where: { id: purchase.id },
            data: { status: "PAID", paidAt: new Date() },
          }),
          prisma.user.update({
            where: { id: purchase.userId },
            data: { importCredits: { increment: purchase.credits } },
          }),
        ]);

        console.log(`Créditos do Personal ${purchase.userId} atualizados (+${purchase.credits} coins) via Webhook Principal.`);
        return NextResponse.json({ success: true, processed: "credit_purchase" });
      } else if (packageId && targetUserId) {
        const pkg = await prisma.creditPackage.findUnique({ where: { id: packageId } });
        if (pkg) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: targetUserId },
              data: { importCredits: { increment: pkg.credits } },
            }),
            prisma.creditPurchase.create({
              data: {
                workspaceId: metadata.workspaceId || "",
                packageId: pkg.id,
                userId: targetUserId,
                amountInCents: pkg.priceInCents,
                credits: pkg.credits,
                status: "PAID",
                abacatePayBillingId: billingId,
                paidAt: new Date(),
              },
            }),
          ]);
          console.log(`Pacote de créditos ${packageId} ativado diretamente via Webhook para o usuário ${targetUserId}.`);
          return NextResponse.json({ success: true, processed: "credit_purchase_direct" });
        }
      }
    }

    if (!transactionId || !userId || !planId) {
      console.error("Webhook de plano recebido com metadados ou ID de transação ausentes.");
      return new NextResponse("Dados insuficientes no payload.", { status: 400 });
    }

    let usedCoupons: string[] = [];
    if (Array.isArray(targetData.coupons)) {
      usedCoupons = targetData.coupons.map((c: any) => typeof c === "string" ? c : c?.code).filter(Boolean);
    }
    if (usedCoupons.length === 0 && targetData.billing && Array.isArray(targetData.billing.coupons)) {
      usedCoupons = targetData.billing.coupons.map((c: any) => typeof c === "string" ? c : c?.code).filter(Boolean);
    }
    if (usedCoupons.length === 0 && targetData.metadata?.coupons) {
      const metaCoupons = targetData.metadata.coupons;
      if (typeof metaCoupons === "string") {
        try {
          const parsed = JSON.parse(metaCoupons);
          if (Array.isArray(parsed)) {
            usedCoupons = parsed.map((c: any) => typeof c === "string" ? c : c?.code).filter(Boolean);
          } else {
            usedCoupons = [metaCoupons];
          }
        } catch {
          usedCoupons = metaCoupons.split(",").map((c: string) => c.trim()).filter(Boolean);
        }
      } else if (Array.isArray(metaCoupons)) {
        usedCoupons = metaCoupons.map((c: any) => typeof c === "string" ? c : c?.code).filter(Boolean);
      }
    }

    const deactivatedCoupons: string[] = [];

    try {
      await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.findUnique({
          where: { id: transactionId }
        });

        if (!transaction) {
          throw new Error(`Transação não encontrada: ${transactionId}`);
        }

        if (transaction.status === "APPROVED") {
          return;
        }

        const method = targetData.method || targetData.paymentMethod || (eventType.startsWith("subscription") ? "CREDIT_CARD" : "PIX");

        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: "APPROVED",
            paymentMethod: method,
          }
        });

        const isPreSub = isPreSubscription === "true";
        let startDate = new Date();

        if (isPreSub) {
          const freeTrial = await tx.freeTrial.findUnique({
            where: { userId }
          });
          if (freeTrial) {
            startDate = new Date(freeTrial.endDate);
          }
        }

        const plan = await tx.plan.findUnique({
          where: { id: planId }
        });

        // Prorrogar vencimento de acordo com o intervalo do plano (ano ou mês)
        const endDate = new Date(startDate);
        if (plan?.interval === "year") {
          endDate.setFullYear(endDate.getFullYear() + 1);
        } else {
          endDate.setDate(endDate.getDate() + 30);
        }

        await tx.subscription.upsert({
          where: { userId },
          update: {
            planId,
            status: "active",
            startDate,
            endDate,
            isPreSubscription: isPreSub,
            abacateSubscriptionId: subscriptionId || undefined,
            abacateCustomerId: customerId || undefined,
          },
          create: {
            userId,
            planId,
            status: "active",
            startDate,
            endDate,
            isPreSubscription: isPreSub,
            abacateSubscriptionId: subscriptionId || undefined,
            abacateCustomerId: customerId || undefined,
          }
        });

        await tx.subscriptionActivity.create({
          data: {
            userId,
            planId,
            type: isPreSub ? "NEW_SUBSCRIPTION" : "UPGRADE",
            amount: transaction.amount,
            status: "success",
          }
        });

        await tx.auditLog.create({
          data: {
            userId,
            action: "PAYMENT",
            entity: "TRANSACTION",
            entityId: transactionId,
            severity: "success",
            ip: "AbacatePay Webhook"
          }
        });

        const payingUser = await tx.user.findUnique({
          where: { id: userId },
          select: { referredById: true }
        });

        if (payingUser?.referredById) {
          const commissionRate = 0.20;
          const commissionAmount = transaction.amount * commissionRate;

          await tx.referralCommission.create({
            data: {
              referrerId: payingUser.referredById,
              referredId: userId,
              transactionId: transactionId,
              amount: commissionAmount,
              percentage: commissionRate * 100,
              status: "APROVADO",
            }
          });
        }

        if (!isPreSub) {
          await tx.auditLog.create({
            data: {
              userId,
              action: "PLAN_CHANGE",
              entity: "SUBSCRIPTION",
              entityId: planId,
              severity: "success",
              ip: "AbacatePay Webhook Upgrade"
            }
          });
        }

        for (const couponCode of usedCoupons) {
          const coupon = await tx.coupon.findUnique({
            where: { code: couponCode.toUpperCase() }
          });

          if (coupon && coupon.isActive) {
            const newUsedCount = coupon.usedCount + 1;
            const shouldDeactivate = coupon.maxUses !== null && newUsedCount >= coupon.maxUses;

            await tx.coupon.update({
              where: { id: coupon.id },
              data: {
                usedCount: newUsedCount,
                isActive: shouldDeactivate ? false : coupon.isActive
              }
            });

            if (shouldDeactivate) {
              deactivatedCoupons.push(coupon.code);
            }
          }
        }
      });

      if (deactivatedCoupons.length > 0 && apiKey && apiKey !== "abc_dev_placeholder") {
        try {
          const abacate = AbacatePay({ secret: apiKey });
          for (const code of deactivatedCoupons) {
            try {
              const existing = await abacate.coupons.get(code);
              if (existing) {
                const abacateActive = existing.status === "ACTIVE" || existing.status === "active";
                if (abacateActive) {
                  await abacate.coupons.toggleStatus(existing.id);
                }
              }
            } catch (err: any) {
              await logSystemError({ action: "WEBHOOK_DEACTIVATE_COUPON_GET_ABACATEPAY", error: err, entity: "WEBHOOK" });
            }
          }
        } catch (abacateError) {
          await logSystemError({ action: "WEBHOOK_DEACTIVATE_COUPONS_ABACATEPAY", error: abacateError, entity: "WEBHOOK" });
        }
      }

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao processar ativação de assinatura via Webhook:", error);
      await logSystemError({ action: "WEBHOOK_BILLING_PAID_PROCESS", error, entity: "WEBHOOK" });
      return new NextResponse("Erro ao processar ativação.", { status: 500 });
    }
  } else if (
    eventType === "subscription.cancelled" ||
    eventType === "subscription.payment_failed" ||
    eventType === "billing.failed" ||
    eventType === "charge.failed" ||
    eventType.includes("fail") ||
    eventType.includes("past_due") ||
    eventType.includes("unpaid")
  ) {
    let userId = targetData.metadata?.userId || data?.subscription?.metadata?.userId;
    let planId = targetData.metadata?.planId || data?.subscription?.metadata?.planId || "";

    if (!userId && subscriptionId) {
      try {
        const sub = await prisma.subscription.findFirst({
          where: { abacateSubscriptionId: subscriptionId }
        });
        if (sub) {
          userId = sub.userId;
          planId = sub.planId;
        }
      } catch (err) {
        console.error("Erro ao buscar assinatura por subscriptionId no webhook:", err);
      }
    }

    if (!userId && targetData.externalId) {
      try {
        const transaction = await prisma.transaction.findUnique({
          where: { id: targetData.externalId }
        });
        if (transaction) {
          userId = transaction.userId;
        }
      } catch (err) {
        console.error("Erro ao buscar transação por externalId no webhook:", err);
      }
    }

    if (userId) {
      try {
        await prisma.$transaction(async (tx) => {
          const newStatus = eventType === "subscription.cancelled" ? "canceled" : "past_due";

          await tx.subscription.update({
            where: { userId },
            data: {
              status: newStatus,
            }
          });

          if (targetData.externalId) {
            await tx.transaction.updateMany({
              where: { id: targetData.externalId },
              data: {
                status: "FAILED",
              }
            });
          }

          await tx.subscriptionActivity.create({
            data: {
              userId,
              planId: planId || "fallback_plan",
              type: "RENEWAL",
              amount: targetData.amount ? targetData.amount / 100 : 0,
              status: "failed",
            }
          });
        });
      } catch (error: any) {
        console.error("Erro ao processar falha de cobrança via Webhook:", error);
        await logSystemError({ action: "WEBHOOK_BILLING_FAILED_PROCESS", error, entity: "WEBHOOK", userId: userId || null });
        return new NextResponse("Erro ao processar falha de cobrança.", { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
