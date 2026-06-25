import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";
import crypto from "crypto";

export async function POST(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const rawBody = await req.text();
  const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const apiKey = process.env.ABACATEPAY_API_KEY;

  let eventPayload: any;

  // Validação de assinatura criptográfica HMAC
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
    // Modo de desenvolvimento: analisa o corpo diretamente sem validação criptográfica
    try {
      eventPayload = JSON.parse(rawBody);
      console.log("Desenvolvimento - Webhook recebido sem verificação de assinatura:", eventPayload);
    } catch (err: any) {
      console.error("Erro ao converter corpo do webhook em desenvolvimento:", err);
      await logSystemError({ action: "WEBHOOK_PAYLOAD_PARSE", error: err, entity: "WEBHOOK" });
      return new NextResponse("Payload inválido.", { status: 400 });
    }
  }

  const { event: eventType, data } = eventPayload;
  const isCheckoutEvent = eventType && eventType.startsWith("checkout");
  const targetData = isCheckoutEvent ? data?.checkout : data;

  if (!targetData) {
    console.error("Payload do webhook inválido ou dados de targetData ausentes.");
    return new NextResponse("Dados insuficientes no payload.", { status: 400 });
  }

  if (eventType === "billing.paid" || (eventType === "checkout.completed" && targetData.status === "PAID")) {
    const transactionId = targetData.externalId;
    const { planId, userId, isPreSubscription } = targetData.metadata || {};

    if (!transactionId || !userId || !planId) {
      console.error("Webhook recebido com metadados ou ID de transação ausentes.");
      return new NextResponse("Dados insuficientes no payload.", { status: 400 });
    }

    // Identificar cupons aplicados no webhook de checkout / cobrança
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
          console.log(`Transação ${transactionId} já está aprovada.`);
          return;
        }

        await tx.transaction.update({
          where: { id: transactionId },
          data: {
            status: "APPROVED",
            paymentMethod: "PIX",
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

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 30);

        await tx.subscription.upsert({
          where: { userId },
          update: {
            planId,
            status: "active",
            startDate,
            endDate,
            isPreSubscription: isPreSub,
          },
          create: {
            userId,
            planId,
            status: "active",
            startDate,
            endDate,
            isPreSubscription: isPreSub,
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

        // Contabilizar uso dos cupons
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

            console.log(`Cupom ${coupon.code} usado: ${newUsedCount}/${coupon.maxUses ?? 'ilimitado'}`);

            if (shouldDeactivate) {
              deactivatedCoupons.push(coupon.code);
            }
          }
        }

        console.log(`Assinatura ativada com sucesso para o usuário ${userId} no plano ${planId} (Pré-assinatura: ${isPreSub})`);
      });

      // Desativar cupons no AbacatePay fora da transação de forma assíncrona
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
                  console.log(`Cupom ${code} atingiu limite máximo de usos e foi desabilitado no AbacatePay.`);
                }
              }
            } catch (err: any) {
              console.error(`Erro ao obter/desativar cupom ${code} no AbacatePay:`, err.message);
              await logSystemError({ action: "WEBHOOK_DEACTIVATE_COUPON_GET_ABACATEPAY", error: err, entity: "WEBHOOK" });
            }
          }
        } catch (abacateError) {
          console.error("Erro ao desativar cupons no AbacatePay via Webhook:", abacateError);
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
    eventType === "billing.failed" || 
    eventType === "charge.failed" || 
    eventType.includes("fail") || 
    eventType.includes("past_due") || 
    eventType.includes("unpaid")
  ) {
    let userId = targetData.metadata?.userId;
    let planId = targetData.metadata?.planId || "";

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
          // 1. Atualizar assinatura para atrasada/vencida
          await tx.subscription.update({
            where: { userId },
            data: {
              status: "past_due",
            }
          });

          // 2. Se houver transação correspondente, marcar como falha
          if (targetData.externalId) {
            await tx.transaction.updateMany({
              where: { id: targetData.externalId },
              data: {
                status: "FAILED",
              }
            });
          }

          // 3. Registrar atividade de falha
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

        console.log(`Webhook - Assinatura do usuário ${userId} marcada como vencida/atrasada devido a falha de cobrança.`);
      } catch (error: any) {
        console.error("Erro ao processar falha de cobrança via Webhook:", error);
        await logSystemError({ action: "WEBHOOK_BILLING_FAILED_PROCESS", error, entity: "WEBHOOK", userId: userId || null });
        return new NextResponse("Erro ao processar falha de cobrança.", { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
