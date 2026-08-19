import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getNewInvoiceBillingEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  workspaceName: string;
  description: string;
  amountFormatted: string;
  dueDateFormatted: string;
  pixPayload?: string | null;
  invoiceUrl?: string | null;
  recipientEmail?: string;
}) {
  const {
    studentName,
    trainerName,
    workspaceName,
    description,
    amountFormatted,
    dueDateFormatted,
    pixPayload,
    invoiceUrl,
    recipientEmail,
  } = params;

  const checkoutUrl = invoiceUrl || `${getAppBaseUrl()}/student/billing`;

  const html = renderBaseEmailLayout({
    title: "Nova Fatura Disponível",
    badgeText: "Cobrança da Mensalidade",
    badgeColor: "#3b82f6",
    previewText: `Fatura de ${amountFormatted} com vencimento em ${dueDateFormatted}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Sua fatura referente à consultoria de <strong>${trainerName}</strong> (${workspaceName}) já está disponível para pagamento:
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
        <div style="font-size: 12px; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Valor Total</div>
        <div style="font-size: 28px; font-weight: 900; color: #ffffff; margin-bottom: 12px;">${amountFormatted}</div>
        
        <div style="border-top: 1px solid #1f1f23; padding-top: 12px; font-size: 13px;">
          <div style="margin-bottom: 6px;"><strong style="color: #ffffff;">Descrição:</strong> <span style="color: #a1a1aa;">${description}</span></div>
          <div><strong style="color: #ffffff;">Data de Vencimento:</strong> <span style="color: #60a5fa; font-weight: bold;">${dueDateFormatted}</span></div>
        </div>
      </div>

      ${pixPayload ? `
        <div style="background-color: #18181b; border: 1px dashed #3f3f46; border-radius: 14px; padding: 16px; margin-bottom: 20px; text-align: center;">
          <div style="font-size: 12px; font-weight: 700; color: #10b981; margin-bottom: 8px;">PAGAMENTO INSTANTÂNEO VIA PIX</div>
          <p style="font-size: 12px; color: #a1a1aa; margin: 0 0 10px 0;">Copie o código abaixo e cole no aplicativo do seu banco:</p>
          <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 10px; font-family: monospace; font-size: 11px; color: #d4d4d8; word-break: break-all; user-select: all; text-align: left;">
            ${pixPayload}
          </div>
        </div>
      ` : ""}

      <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
        Você também pode efetuar o pagamento via Cartão ou Boleto acessando o portal:
      </p>
    `,
    ctaButton: {
      text: "Acessar Fatura Completa",
      url: checkoutUrl,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Nova Fatura\n\nOlá, ${studentName}.\nSua fatura de ${amountFormatted} (${description}) vence em ${dueDateFormatted}.\nAcesse para pagar: ${checkoutUrl}`;

  return { html, text, subject: `Fatura de Mensalidade (${amountFormatted}) - Vencimento: ${dueDateFormatted}` };
}

export function getInvoiceReminderEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  amountFormatted: string;
  dueDateFormatted: string;
  invoiceUrl?: string | null;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, amountFormatted, dueDateFormatted, invoiceUrl, recipientEmail } = params;
  const checkoutUrl = invoiceUrl || `${getAppBaseUrl()}/student/billing`;

  const html = renderBaseEmailLayout({
    title: "Lembrete: Sua Fatura Vence em Breve",
    badgeText: "Lembrete de Vencimento",
    badgeColor: "#f59e0b",
    previewText: `Sua mensalidade de ${amountFormatted} vence no dia ${dueDateFormatted}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Este é um lembrete amigável de que a fatura da sua consultoria com <strong>${trainerName}</strong> no valor de <strong>${amountFormatted}</strong> vence no dia <strong>${dueDateFormatted}</strong>.
      </p>
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Para manter seus treinos e acompanhamento em dia sem interrupções, realize o pagamento com facilidade clicando abaixo:
      </p>
    `,
    ctaButton: {
      text: "Visualizar e Pagar Fatura",
      url: checkoutUrl,
      color: "#f59e0b",
    },
  });

  const text = `AtlasFit | Lembrete de Fatura\n\nOlá, ${studentName}.\nSua fatura de ${amountFormatted} vence em ${dueDateFormatted}.\nAcesse para pagar: ${checkoutUrl}`;

  return { html, text, subject: `Lembrete: Sua fatura de ${amountFormatted} vence em ${dueDateFormatted}` };
}

export function getInvoiceOverdueEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  amountFormatted: string;
  dueDateFormatted: string;
  invoiceUrl?: string | null;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, amountFormatted, dueDateFormatted, invoiceUrl, recipientEmail } = params;
  const checkoutUrl = invoiceUrl || `${getAppBaseUrl()}/student/billing`;

  const html = renderBaseEmailLayout({
    title: "Fatura em Atraso",
    badgeText: "Aviso de Pendência",
    badgeColor: "#ef4444",
    previewText: `Fatura vencida em ${dueDateFormatted}. Regularize seu acesso.`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>.</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Constatamos que a fatura da sua consultoria com <strong>${trainerName}</strong> no valor de <strong>${amountFormatted}</strong>, com vencimento em <strong>${dueDateFormatted}</strong>, encontra-se pendente.
      </p>
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Para evitar a suspensão da sua prescrição e continuar acessando suas séries no aplicativo, regularize o pagamento pelo link seguro abaixo:
      </p>
    `,
    ctaButton: {
      text: "Regularizar Pagamento Agora",
      url: checkoutUrl,
      color: "#ef4444",
    },
    secondaryInfoHtml: "Caso já tenha realizado o pagamento nas últimas horas, por favor desconsidere este aviso.",
  });

  const text = `AtlasFit | Fatura em Atraso\n\nOlá, ${studentName}.\nSua fatura de ${amountFormatted} vencida em ${dueDateFormatted} está pendente.\nRegularize seu pagamento: ${checkoutUrl}`;

  return { html, text, subject: `Importante: Fatura de ${amountFormatted} em atraso - Regularize seu plano` };
}

export function getPaymentReceiptStudentEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  planName: string;
  amountFormatted: string;
  paymentMethod: string;
  paidAtFormatted: string;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, planName, amountFormatted, paymentMethod, paidAtFormatted, recipientEmail } = params;
  const workoutsUrl = `${getAppBaseUrl()}/student/workouts`;

  const html = renderBaseEmailLayout({
    title: "Pagamento Confirmado!",
    badgeText: "Comprovante de Pagamento",
    badgeColor: "#10b981",
    previewText: `Seu pagamento de ${amountFormatted} foi confirmado com sucesso`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Confirmamos o recebimento do pagamento da sua consultoria com <strong>${trainerName}</strong>. Seu acesso está 100% ativo!
      </p>
      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Plano:</strong> <span style="color: #d4d4d8;">${planName}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Valor Pago:</strong> <span style="color: #10b981; font-weight: 800; font-size: 15px;">${amountFormatted}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Forma de Pagamento:</strong> <span style="color: #d4d4d8;">${paymentMethod}</span></div>
        <div><strong style="color: #ffffff;">Data da Confirmação:</strong> <span style="color: #d4d4d8;">${paidAtFormatted}</span></div>
      </div>
      <p style="margin: 0; color: #a1a1aa;">
        Bons treinos e mantenha o foco nos seus objetivos!
      </p>
    `,
    ctaButton: {
      text: "Abrir Meus Treinos",
      url: workoutsUrl,
      color: "#10b981",
    },
  });

  const text = `AtlasFit | Comprovante de Pagamento\n\nOlá, ${studentName}!\nSeu pagamento de ${amountFormatted} (${planName}) foi confirmado em ${paidAtFormatted}.\nAcesse seus treinos: ${workoutsUrl}`;

  return { html, text, subject: `Comprovante: Pagamento de ${amountFormatted} confirmado com sucesso ✅` };
}

export function getPaymentConfirmedTrainerEmailTemplate(params: {
  trainerName: string;
  studentName: string;
  amountFormatted: string;
  netAmountFormatted?: string;
  paymentMethod: string;
  recipientEmail?: string;
}) {
  const { trainerName, studentName, amountFormatted, netAmountFormatted, paymentMethod, recipientEmail } = params;
  const walletUrl = `${getAppBaseUrl()}/personal/wallet`;

  const html = renderBaseEmailLayout({
    title: "Mensalidade Recebida!",
    badgeText: "Recebimento Confirmado",
    badgeColor: "#10b981",
    previewText: `${studentName} pagou a mensalidade de ${amountFormatted}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Uma nova mensalidade foi paga por um dos seus alunos e o saldo já foi lançado na sua carteira:
      </p>
      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Aluno(a):</strong> <span style="color: #d4d4d8;">${studentName}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Valor Bruto:</strong> <span style="color: #ffffff; font-weight: 700;">${amountFormatted}</span></div>
        ${netAmountFormatted ? `<div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Valor Líquido Creditado:</strong> <span style="color: #10b981; font-weight: 900; font-size: 15px;">${netAmountFormatted}</span></div>` : ""}
        <div><strong style="color: #ffffff;">Método:</strong> <span style="color: #d4d4d8;">${paymentMethod}</span></div>
      </div>
      <p style="margin: 0; color: #a1a1aa;">
        Você pode acompanhar seu saldo disponível e solicitar saques PIX na sua carteira digital.
      </p>
    `,
    ctaButton: {
      text: "Acessar Minha Carteira",
      url: walletUrl,
      color: "#10b981",
    },
  });

  const text = `AtlasFit | Pagamento Recebido\n\nOlá, ${trainerName}!\nO aluno ${studentName} efetuou o pagamento de ${amountFormatted}.\nAcesse sua carteira: ${walletUrl}`;

  return { html, text, subject: `Recebimento: ${studentName} pagou ${amountFormatted} 💰` };
}

export function getCardPaymentFailedEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  amountFormatted: string;
  reason?: string;
  updateCardUrl?: string;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, amountFormatted, reason, updateCardUrl, recipientEmail } = params;
  const link = updateCardUrl || `${getAppBaseUrl()}/student/billing`;

  const html = renderBaseEmailLayout({
    title: "Falha na Cobrança do Cartão",
    badgeText: "Problema no Pagamento",
    badgeColor: "#ef4444",
    previewText: `Não foi possível processar a cobrança de ${amountFormatted}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>.</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        A tentativa de cobrança automática no cartão de crédito da sua mensalidade com <strong>${trainerName}</strong> no valor de <strong>${amountFormatted}</strong> não foi autorizada pela operadora.
      </p>
      ${reason ? `
        <div style="background-color: #09090b; border: 1px solid #3f3f46; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; font-size: 12px; color: #ef4444;">
          <strong>Motivo informado:</strong> ${reason}
        </div>
      ` : ""}
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Por favor, atualize os dados do seu cartão ou selecione outra forma de pagamento (PIX ou Boleto) para continuar treinando:
      </p>
    `,
    ctaButton: {
      text: "Atualizar Dados do Cartão",
      url: link,
      color: "#ef4444",
    },
  });

  const text = `AtlasFit | Falha no Cartão\n\nOlá, ${studentName}.\nA cobrança de ${amountFormatted} no seu cartão não foi autorizada.\nAtualize seu meio de pagamento: ${link}`;

  return { html, text, subject: "Atenção: Não foi possível processar o pagamento no seu cartão" };
}
