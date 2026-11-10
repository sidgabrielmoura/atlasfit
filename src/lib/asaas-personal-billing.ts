import prisma from "@/lib/prisma";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { advanceBillingDueDate } from "./billing-due-date";
import { asaasEnvironment } from "@/modules/payments/providers/asaas/asaas-adapter";
import { getMasterAsaasApiKey } from "@/modules/payments/providers/asaas/asaas-config";
import { logSystemError } from "@/lib/logger";

function getAsaasConfig() {
  const apiKey = getMasterAsaasApiKey();
  const environment = asaasEnvironment();
  const baseUrl = environment === "PRODUCTION"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

  return { apiKey, baseUrl, environment };
}

function getMasterHeaders(apiKey: string) {
  return {
    "Content-Type": "application/json",
    "access_token": apiKey,
    "User-Agent": "AtlasFit/1.0",
  };
}

/**
 * Cria ou busca um cliente na conta Master do Asaas para cobrança da mensalidade da plataforma.
 */
export async function ensureMasterAsaasCustomer(user: {
  id: string;
  name: string | null;
  email: string | null;
  cpf?: string | null;
  phone?: string | null;
}): Promise<string> {
  const { apiKey, baseUrl } = getAsaasConfig();
  if (!apiKey) throw new Error("ASAAS_MASTER_CREDENTIAL_UNAVAILABLE");
  if (!user.email) throw new Error("USER_EMAIL_REQUIRED");

  const headers = getMasterHeaders(apiKey);
  const cleanEmail = user.email.trim().toLowerCase();
  const cleanCpf = user.cpf ? user.cpf.replace(/\D/g, "") : undefined;
  const cleanPhone = user.phone ? user.phone.replace(/\D/g, "") : undefined;

// Busca cliente existente pelo e-mail
  const searchRes = await fetch(`${baseUrl}/customers?email=${encodeURIComponent(cleanEmail)}`, {
    method: "GET",
    headers,
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.data && searchData.data.length > 0) {
      const existing = searchData.data[0];
      // Atualiza CPF/telefone se necessário
      const needsCpfUpdate = cleanCpf && existing.cpfCnpj !== cleanCpf;
      const needsPhoneUpdate = cleanPhone && existing.mobilePhone !== cleanPhone;

      if (needsCpfUpdate || needsPhoneUpdate) {
        const updateRes = await fetch(`${baseUrl}/customers/${existing.id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify({
            ...(cleanCpf ? { cpfCnpj: cleanCpf } : {}),
            ...(cleanPhone ? { mobilePhone: cleanPhone } : {}),
          }),
        });

        if (!updateRes.ok) {
          const updateErrText = await updateRes.text();
          try {
            const parsed = JSON.parse(updateErrText);
            if (parsed.errors?.[0]?.description) {
              throw new Error(parsed.errors[0].description);
            }
          } catch (e: any) {
            if (e.message && !e.message.startsWith("Unexpected")) throw e;
          }
        }
      }
      return existing.id;
    }
  }

  // Cria novo cliente no Asaas
  const createRes = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      name: (user.name || "Personal Trainer").trim(),
      email: cleanEmail,
      ...(cleanCpf ? { cpfCnpj: cleanCpf } : {}),
      ...(cleanPhone ? { mobilePhone: cleanPhone } : {}),
      notificationDisabled: true,
      externalReference: `USER_${user.id}`,
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.errors?.[0]?.description) {
        throw new Error(parsed.errors[0].description);
      }
    } catch (e: any) {
      if (e.message && !e.message.startsWith("Unexpected")) throw e;
    }
    throw new Error(`Falha ao registrar cliente no Asaas: ${errorText}`);
  }

  const newCustomer = await createRes.json();
  return newCustomer.id;
}

/**
 * Gera ou recupera uma cobrança Asaas pendente do plano para o Personal Trainer em carência.
 */
export async function getOrCreatePersonalPlanCharge(userId: string, inputCpf?: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      cpfCnpj: true,
      whatsapp: true,
      subscription: { include: { plan: true } },
    },
  });

  if (!user || !user.subscription) {
    throw new Error("Assinatura não encontrada para este usuário.");
  }

  const sub = user.subscription;
  const amountInCents = sub.priceInCents || Math.round((sub.plan?.price || 0) * 100);
  if (amountInCents <= 0) {
    throw new Error("O valor da assinatura não está configurado.");
  }

  // Sanitização e validação de CPF
  let effectiveCpf = (inputCpf || user.cpfCnpj || "").replace(/\D/g, "");

  if (effectiveCpf) {
    const { isValidCpfCnpj } = await import("@/lib/cpf-validator");
    if (!isValidCpfCnpj(effectiveCpf)) {
      const err = new Error("O CPF informado é inválido.");
      (err as any).code = "INVALID_CPF";
      throw err;
    }

    if (user.cpfCnpj !== effectiveCpf) {
      await prisma.user.update({
        where: { id: user.id },
        data: { cpfCnpj: effectiveCpf },
      });
    }
  } else {
    const err = new Error("Para emitir a cobrança no Asaas é necessário informar o CPF do titular.");
    (err as any).code = "CPF_REQUIRED";
    throw err;
  }

  const personalWs = await prisma.workspace.findFirst({
    where: { ownerId: userId, type: "PERSONAL" },
    select: { id: true },
  });
  const now = new Date();

  // Verifica se já existe uma cobrança PENDING criada nas últimas 24h
  const existingTx = await prisma.transaction.findFirst({
    where: {
      userId,
      status: "PENDING",
      providerCheckoutId: { not: null },
      createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });

  const { apiKey, baseUrl } = getAsaasConfig();
  if (!apiKey) throw new Error("Chave de API do Asaas não configurada.");
  const headers = getMasterHeaders(apiKey);

  if (existingTx && existingTx.providerCheckoutId) {
    // Consulta o Asaas para ver se já foi paga ou se ainda está válida
    const checkRes = await fetch(`${baseUrl}/payments/${existingTx.providerCheckoutId}`, {
      method: "GET",
      headers,
    });

    if (checkRes.ok) {
      const paymentData = await checkRes.json();
      if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(paymentData.status)) {
        await confirmPersonalSubscriptionPayment({
          transactionId: existingTx.id,
          paymentMethod: paymentData.billingType || "PIX",
          occurredAt: new Date(),
        });
        return {
          isPaid: true,
          message: "Pagamento já confirmado com sucesso!",
          transactionId: existingTx.id,
        };
      }

      if (paymentData.status === "PENDING") {
        // Busca o QR Code do PIX atualizado
        const qrRes = await fetch(`${baseUrl}/payments/${existingTx.providerCheckoutId}/pixQrCode`, {
          method: "GET",
          headers,
        });

        let pixQrCodeBase64: string | null = null;
        let pixCopiaECola: string | null = null;
        let pixExpirationDate: string | null = null;

        if (qrRes.ok) {
          const qrData = await qrRes.json();
          pixQrCodeBase64 = qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : null;
          pixCopiaECola = qrData.payload || null;
          pixExpirationDate = qrData.expirationDate || null;
        }

        return {
          isPaid: false,
          transactionId: existingTx.id,
          paymentId: existingTx.providerCheckoutId,
          invoiceUrl: paymentData.invoiceUrl || paymentData.bankSlipUrl || existingTx.checkoutUrl,
          amountInCents,
          amountFormatted: (amountInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          pixQrCodeBase64,
          pixCopiaECola,
          pixExpirationDate,
          planName: sub.plan?.name || "Plano Personal",
          dueDate: paymentData.dueDate,
        };
      }
    }
  }

  // Cria ou atualiza o cliente no Asaas Master com CPF
  const customerId = await ensureMasterAsaasCustomer({
    id: user.id,
    name: user.name,
    email: user.email,
    cpf: effectiveCpf,
    phone: user.whatsapp,
  });

  const dueDate = sub.nextDueDate && sub.nextDueDate > now
    ? sub.nextDueDate
    : new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const chargePayload = {
    customer: customerId,
    billingType: "UNDEFINED",
    value: Number((amountInCents / 100).toFixed(2)),
    dueDate: dueDateStr,
    description: `Mensalidade AtlasFit - ${sub.plan?.name || "Personal Trainer"}`,
    externalReference: `PERSONAL_SUB_${user.id}_${sub.id}`,
    postalService: false,
  };

  const createPaymentRes = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers,
    body: JSON.stringify(chargePayload),
  });

  if (!createPaymentRes.ok) {
    const errorText = await createPaymentRes.text();
    await logSystemError({ action: "ASAAS_CREATE_PERSONAL_CHARGE", error: errorText, entity: "TRANSACTION" });
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.errors?.[0]?.description) {
        throw new Error(parsed.errors[0].description);
      }
    } catch (e: any) {
      if (e.message && !e.message.startsWith("Unexpected")) throw e;
    }
    throw new Error(`Não foi possível gerar a cobrança no Asaas: ${errorText}`);
  }

  const paymentData = await createPaymentRes.json();

  // Busca o QR Code do PIX
  const qrRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
    method: "GET",
    headers,
  });

  let pixQrCodeBase64: string | null = null;
  let pixCopiaECola: string | null = null;
  let pixExpirationDate: string | null = null;

  if (qrRes.ok) {
    const qrData = await qrRes.json();
    pixQrCodeBase64 = qrData.encodedImage ? `data:image/png;base64,${qrData.encodedImage}` : null;
    pixCopiaECola = qrData.payload || null;
    pixExpirationDate = qrData.expirationDate || null;
  }

  // Registra a Transaction no banco
  const newTx = await prisma.transaction.create({
    data: {
      userId: user.id,
      workspaceId: personalWs?.id || null,
      platformPlanId: sub.planId,
      expectedAmountInCents: amountInCents,
      amount: amountInCents / 100,
      providerCheckoutId: paymentData.id,
      checkoutUrl: paymentData.invoiceUrl || paymentData.bankSlipUrl,
      status: "PENDING",
      paymentMethod: "PIX",
      description: `Mensalidade AtlasFit - ${sub.plan?.name || "Personal"}`,
    },
  });

  return {
    isPaid: false,
    transactionId: newTx.id,
    paymentId: paymentData.id,
    invoiceUrl: paymentData.invoiceUrl || paymentData.bankSlipUrl,
    amountInCents,
    amountFormatted: (amountInCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    pixQrCodeBase64,
    pixCopiaECola,
    pixExpirationDate,
    planName: sub.plan?.name || "Plano Personal",
    dueDate: paymentData.dueDate,
  };
}

/**
 * Consulta se o pagamento foi confirmado no Asaas e, caso positivo, liquida a fatura e atualiza o vencimento.
 */
export async function checkAndConfirmPersonalCharge(userId: string, transactionId?: string) {
  const txRecord = await prisma.transaction.findFirst({
    where: {
      userId,
      ...(transactionId ? { id: transactionId } : { status: "PENDING" }),
      providerCheckoutId: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!txRecord) {
    return { confirmed: false, error: "Nenhuma transação pendente encontrada." };
  }

  if (txRecord.status === "APPROVED") {
    return { confirmed: true, message: "Pagamento já aprovado!" };
  }

  const { apiKey, baseUrl } = getAsaasConfig();
  if (!apiKey) throw new Error("Chave de API do Asaas não configurada.");

  const checkRes = await fetch(`${baseUrl}/payments/${txRecord.providerCheckoutId}`, {
    method: "GET",
    headers: getMasterHeaders(apiKey),
  });

  if (!checkRes.ok) {
    return { confirmed: false, error: "Não foi possível consultar o Asaas no momento." };
  }

  const paymentData = await checkRes.json();
  if (["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"].includes(paymentData.status)) {
    const updatedSub = await confirmPersonalSubscriptionPayment({
      transactionId: txRecord.id,
      paymentMethod: paymentData.billingType || "PIX",
      occurredAt: new Date(),
    });

    return {
      confirmed: true,
      message: "Pagamento confirmado com sucesso!",
      nextDueDate: updatedSub?.nextDueDate,
    };
  }

  return { confirmed: false, status: paymentData.status };
}

/**
 * Confirma o pagamento da assinatura pessoal com total idempotência, avança o vencimento e reativa o acesso.
 */
export async function confirmPersonalSubscriptionPayment(input: {
  transactionId?: string;
  providerBillingId?: string;
  paymentMethod?: string;
  occurredAt?: Date;
  tx?: any;
}) {
  const occurredAt = input.occurredAt || new Date();

  const execute = async (db: any) => {
    const txRecord = await db.transaction.findFirst({
      where: {
        OR: [
          ...(input.transactionId ? [{ id: input.transactionId }] : []),
          ...(input.providerBillingId ? [{ providerCheckoutId: input.providerBillingId }] : []),
        ],
      },
    });

    if (!txRecord) {
      throw new Error("Transação não encontrada para confirmação.");
    }

    // Bloqueia a transação e a assinatura concorrentemente com locks pessimistas (FOR UPDATE)
    await db.$queryRaw`SELECT id FROM "Transaction" WHERE id = ${txRecord.id} FOR UPDATE`;
    await db.$queryRaw`SELECT id FROM "Subscription" WHERE "userId" = ${txRecord.userId} FOR UPDATE`;

    // Relê a transação após obter os locks para garantir idempotência estrita
    const freshTx = await db.transaction.findUnique({
      where: { id: txRecord.id },
    });

    if (!freshTx || freshTx.status === "APPROVED") {
      return db.subscription.findUnique({ where: { userId: txRecord.userId } });
    }

    const sub = await db.subscription.findUnique({
      where: { userId: txRecord.userId },
      include: { plan: true },
    });

    if (!sub) {
      throw new Error(`Assinatura não encontrada para o usuário ${txRecord.userId}`);
    }

    // Calcula a nova data de vencimento avançando um ciclo completo
    const currentDueDate = sub.nextDueDate || sub.endDate;
    const nextDueDate = advanceBillingDueDate(currentDueDate, sub.periodicity || "MENSAL", occurredAt);

    // 1. Atualiza a transação
    await db.transaction.update({
      where: { id: txRecord.id },
      data: {
        status: "APPROVED",
        paymentMethod: input.paymentMethod || txRecord.paymentMethod || "PIX",
        updatedAt: occurredAt,
      },
    });

    // 2. Atualiza a assinatura
    const updatedSub = await db.subscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        nextDueDate,
        endDate: nextDueDate,
      },
    });

    // 3. Reativa os workspaces pessoais do usuário se estiverem inativos
    await db.workspace.updateMany({
      where: { ownerId: txRecord.userId, type: "PERSONAL", isActive: false },
      data: { isActive: true },
    });

    // 4. Auditoria
    await db.auditLog.create({
      data: {
        userId: txRecord.userId,
        action: "PERSONAL_SUBSCRIPTION_PAID_ASAAS",
        entity: "Subscription",
        entityId: sub.id,
        severity: "info",
        metadata: {
          transactionId: txRecord.id,
          providerBillingId: txRecord.providerCheckoutId,
          amount: txRecord.amount,
          previousDueDate: currentDueDate?.toISOString(),
          newDueDate: nextDueDate.toISOString(),
          paymentMethod: input.paymentMethod,
        },
      },
    });

    // 5. Notificação em tempo real via Ably
    try {
      const { publishToChannel } = await import("@/lib/ably");
      await publishToChannel(`user:${txRecord.userId}`, "subscription:updated", {
        status: "active",
        nextDueDate: nextDueDate.toISOString(),
      });
      if (txRecord.workspaceId) {
        await publishToChannel(`workspace:${txRecord.workspaceId}`, "subscription:updated", {
          status: "active",
          nextDueDate: nextDueDate.toISOString(),
        });
      }
    } catch (e) {
      console.warn("[ABLY_NOTIFY_WARN]", e);
    }

    return updatedSub;
  };

  if (input.tx) {
    return execute(input.tx);
  }

  return serializableTransaction(execute);
}
