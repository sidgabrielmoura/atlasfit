import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getKycStatusUpdatedEmailTemplate(params: {
  trainerName: string;
  status: "APPROVED" | "PENDING_DOCUMENTS" | "REJECTED";
  reason?: string | null;
  recipientEmail?: string;
}) {
  const { trainerName, status, reason, recipientEmail } = params;
  const walletUrl = `${getAppBaseUrl()}/personal/wallet`;

  const isApproved = status === "APPROVED";

  const html = renderBaseEmailLayout({
    title: isApproved ? "Conta Digital Aprovada com Sucesso!" : "Atenção: Verificação da sua Conta Digital",
    badgeText: isApproved ? "Conta Aprovada" : "Documentação Pendente",
    badgeColor: isApproved ? "#10b981" : "#f59e0b",
    previewText: isApproved ? "Sua carteira digital está 100% pronta para receber" : "Documentos adicionais são necessários",
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      ${isApproved ? `
        <p style="margin: 0 0 16px 0; color: #d4d4d8;">
          A verificação cadastral da sua conta digital integrada ao AtlasFit foi <strong>concluída e aprovada com sucesso</strong>!
        </p>
        <p style="margin: 0 0 20px 0; color: #a1a1aa;">
          Você já pode emitir cobranças com PIX instantâneo e receber pagamentos dos seus alunos diretamente na sua subconta.
        </p>
      ` : `
        <p style="margin: 0 0 16px 0; color: #d4d4d8;">
          A instituição financeira responsável pelo processamento de pagamentos solicitou ajustes ou o reenvio de documentos para a sua conta digital.
        </p>
        ${reason ? `
          <div style="background-color: #09090b; border: 1px solid #f59e0b; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #f59e0b;">
            <strong>Observação da análise:</strong> ${reason}
          </div>
        ` : ""}
        <p style="margin: 0 0 20px 0; color: #a1a1aa;">
          Acesse a sua carteira no AtlasFit para enviar os documentos solicitados e liberar a emissão de cobranças.
        </p>
      `}
    `,
    ctaButton: {
      text: isApproved ? "Acessar Minha Carteira" : "Enviar Documentos Agora",
      url: walletUrl,
      color: isApproved ? "#10b981" : "#f59e0b",
    },
  });

  const text = `AtlasFit | Conta Digital\n\nOlá, ${trainerName}.\nStatus da verificação: ${isApproved ? "APROVADO" : "PENDENTE"}.\nAcesse: ${walletUrl}`;

  return { 
    html, 
    text, 
    subject: isApproved 
      ? "Sua Conta Digital AtlasFit foi aprovada! 🎉" 
      : "Ação Necessária: Verificação da sua Conta Digital AtlasFit" 
  };
}

export function getPayoutRequestedTrainerEmailTemplate(params: {
  trainerName: string;
  amountFormatted: string;
  pixKeyMasked: string;
  estimatedArrival?: string;
  recipientEmail?: string;
}) {
  const { trainerName, amountFormatted, pixKeyMasked, estimatedArrival = "até 1 dia útil", recipientEmail } = params;
  const walletUrl = `${getAppBaseUrl()}/personal/wallet`;

  const html = renderBaseEmailLayout({
    title: "Solicitação de Saque Recebida",
    badgeText: "Saque PIX",
    badgeColor: "#3b82f6",
    previewText: `Saque de ${amountFormatted} solicitado para sua chave PIX`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Sua solicitação de transferência do saldo da sua carteira digital AtlasFit foi registrada com sucesso:
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Valor Solicitado:</strong> <span style="color: #3b82f6; font-weight: 800; font-size: 16px;">${amountFormatted}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Destino PIX:</strong> <span style="color: #d4d4d8;">${pixKeyMasked}</span></div>
        <div><strong style="color: #ffffff;">Prazo Estimado:</strong> <span style="color: #a1a1aa;">${estimatedArrival}</span></div>
      </div>

      <p style="margin: 0; color: #a1a1aa;">
        Você receberá uma nova notificação assim que a liquidação for efetuada na sua conta bancária.
      </p>
    `,
    ctaButton: {
      text: "Acompanhar no Extrato",
      url: walletUrl,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Saque Solicitado\n\nOlá, ${trainerName}!\nSaque de ${amountFormatted} solicitado para a chave PIX ${pixKeyMasked}.\nAcompanhe no extrato: ${walletUrl}`;

  return { html, text, subject: `Saque PIX Solicitado: ${amountFormatted} 💸` };
}

export function getPayoutCompletedTrainerEmailTemplate(params: {
  trainerName: string;
  amountFormatted: string;
  pixKeyMasked: string;
  completedAtFormatted: string;
  recipientEmail?: string;
}) {
  const { trainerName, amountFormatted, pixKeyMasked, completedAtFormatted, recipientEmail } = params;
  const walletUrl = `${getAppBaseUrl()}/personal/wallet`;

  const html = renderBaseEmailLayout({
    title: "Saque PIX Concluído!",
    badgeText: "Transferência Efetuada",
    badgeColor: "#10b981",
    previewText: `O valor de ${amountFormatted} já está na sua conta bancária`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        O saque no valor de <strong>${amountFormatted}</strong> foi processado e transferido com sucesso para a sua conta bancária via PIX!
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Valor Transferido:</strong> <span style="color: #10b981; font-weight: 900; font-size: 16px;">${amountFormatted}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Chave PIX:</strong> <span style="color: #d4d4d8;">${pixKeyMasked}</span></div>
        <div><strong style="color: #ffffff;">Data da Liquidação:</strong> <span style="color: #d4d4d8;">${completedAtFormatted}</span></div>
      </div>
    `,
    ctaButton: {
      text: "Ver Extrato da Carteira",
      url: walletUrl,
      color: "#10b981",
    },
  });

  const text = `AtlasFit | Saque Concluído\n\nOlá, ${trainerName}!\nO valor de ${amountFormatted} foi transferido para seu PIX ${pixKeyMasked} em ${completedAtFormatted}.\nAcesse: ${walletUrl}`;

  return { html, text, subject: `Saque PIX Concluído: ${amountFormatted} creditado na sua conta ✅` };
}
