import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@abacatepay/sdk";

export async function POST(req: Request) {
  const signature = req.headers.get("x-webhook-signature");
  const rawBody = await req.text();
  const webhookSecret = process.env.ABACATEPAY_WEBHOOK_SECRET;
  const apiKey = process.env.ABACATEPAY_API_KEY;

  let eventPayload: any;

  // Validação de assinatura criptográfica HMAC
  if (webhookSecret && webhookSecret !== "whsec_placeholder" && apiKey && apiKey !== "abc_dev_placeholder") {
    try {
      const abacate = AbacatePay({ secret: apiKey });
      eventPayload = abacate.webhooks.verify(rawBody, signature!);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err);
      return new NextResponse("Assinatura inválida.", { status: 401 });
    }
  } else {
    // Modo de desenvolvimento: analisa o corpo diretamente sem validação criptográfica
    try {
      eventPayload = JSON.parse(rawBody);
      console.log("Desenvolvimento - Webhook recebido sem verificação de assinatura:", eventPayload);
    } catch (err: any) {
      console.error("Erro ao converter corpo do webhook em desenvolvimento:", err);
      return new NextResponse("Payload inválido.", { status: 400 });
    }
  }

  const { event: eventType, data } = eventPayload;

  if (eventType === "billing.paid") {
    const transactionId = data.externalId;
    const { planId, userId, isPreSubscription } = data.metadata || {};

    if (!transactionId || !userId || !planId) {
      console.error("Webhook recebido com metadados ou ID de transação ausentes.");
      return new NextResponse("Dados insuficientes no payload.", { status: 400 });
    }

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

        console.log(`Assinatura ativada com sucesso para o usuário ${userId} no plano ${planId} (Pré-assinatura: ${isPreSub})`);
      });

      return NextResponse.json({ success: true });
    } catch (error: any) {
      console.error("Erro ao processar ativação de assinatura via Webhook:", error);
      return new NextResponse("Erro ao processar ativação.", { status: 500 });
    }
  } else if (
    eventType === "billing.failed" || 
    eventType === "charge.failed" || 
    eventType.includes("fail") || 
    eventType.includes("past_due") || 
    eventType.includes("unpaid")
  ) {
    let userId = data.metadata?.userId;
    let planId = data.metadata?.planId || "";

    if (!userId && data.externalId) {
      try {
        const transaction = await prisma.transaction.findUnique({
          where: { id: data.externalId }
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
          if (data.externalId) {
            await tx.transaction.updateMany({
              where: { id: data.externalId },
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
              amount: data.amount ? data.amount / 100 : 0,
              status: "failed",
            }
          });
        });

        console.log(`Webhook - Assinatura do usuário ${userId} marcada como vencida/atrasada devido a falha de cobrança.`);
      } catch (error: any) {
        console.error("Erro ao processar falha de cobrança via Webhook:", error);
        return new NextResponse("Erro ao processar falha de cobrança.", { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
