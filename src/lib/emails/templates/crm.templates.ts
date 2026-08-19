import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getNewLeadCapturedTrainerEmailTemplate(params: {
  trainerName: string;
  leadName: string;
  leadEmail?: string | null;
  leadPhone?: string | null;
  leadInstagram?: string | null;
  leadGoal?: string | null;
  source?: string | null;
  recipientEmail?: string;
}) {
  const {
    trainerName,
    leadName,
    leadEmail,
    leadPhone,
    leadInstagram,
    leadGoal,
    source,
    recipientEmail,
  } = params;

  const crmUrl = `${getAppBaseUrl()}/personal/crm`;
  const cleanPhone = leadPhone ? leadPhone.replace(/\D/g, "") : null;
  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

  const html = renderBaseEmailLayout({
    title: "Novo Lead Interessado na sua Consultoria!",
    badgeText: "Oportunidade Comercial",
    badgeColor: "#10b981",
    previewText: `${leadName} entrou em contato buscando consultoria`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Um novo potencial cliente acabou de se cadastrar no seu funil de vendas do AtlasFit:
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Nome:</strong> <span style="color: #d4d4d8;">${leadName}</span></div>
        ${leadPhone ? `<div style="margin-bottom: 8px;"><strong style="color: #ffffff;">WhatsApp:</strong> <span style="color: #10b981; font-weight: bold;">${leadPhone}</span></div>` : ""}
        ${leadEmail ? `<div style="margin-bottom: 8px;"><strong style="color: #ffffff;">E-mail:</strong> <span style="color: #d4d4d8;">${leadEmail}</span></div>` : ""}
        ${leadInstagram ? `<div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Instagram:</strong> <span style="color: #d4d4d8;">@${leadInstagram.replace(/^@/, "")}</span></div>` : ""}
        ${leadGoal ? `<div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Objetivo:</strong> <span style="color: #d4d4d8;">${leadGoal}</span></div>` : ""}
        ${source ? `<div><strong style="color: #ffffff;">Origem:</strong> <span style="color: #71717a;">${source}</span></div>` : ""}
      </div>

      <p style="margin: 0 0 16px 0; color: #a1a1aa;">
        Dica de ouro: Leads respondidos nos primeiros <strong>5 minutos</strong> têm até <strong>8x mais chances</strong> de fechar a consultoria!
      </p>

      ${whatsappUrl ? `
        <div style="text-align: center; margin-bottom: 12px;">
          <a href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff !important; font-size: 13px; font-weight: 800; text-decoration: none; padding: 10px 24px; border-radius: 12px;">
            Iniciar Conversa no WhatsApp
          </a>
        </div>
      ` : ""}
    `,
    ctaButton: {
      text: "Abrir Pipeline no CRM",
      url: crmUrl,
      color: "#ea580c",
    },
  });

  const text = `AtlasFit CRM | Novo Lead!\n\nOlá, ${trainerName}!\n${leadName} se cadastrou no seu funil.\nTelefone: ${leadPhone || "Não informado"}\nE-mail: ${leadEmail || "Não informado"}\nObjetivo: ${leadGoal || "Geral"}\n\nAcesse o CRM: ${crmUrl}`;

  return { html, text, subject: `🔥 Novo Lead no CRM: ${leadName} está interessado na sua consultoria` };
}

export function getCommercialProposalLeadEmailTemplate(params: {
  leadName: string;
  trainerName: string;
  workspaceName: string;
  proposalSummary: string;
  checkoutUrl: string;
  recipientEmail?: string;
}) {
  const { leadName, trainerName, workspaceName, proposalSummary, checkoutUrl, recipientEmail } = params;

  const html = renderBaseEmailLayout({
    title: "Proposta de Consultoria Fitness",
    badgeText: "Proposta Comercial",
    badgeColor: "#ea580c",
    previewText: `${trainerName} enviou sua proposta de treinamento`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${leadName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Aqui está a proposta de acompanhamento e consultoria personalizada montada por <strong>${trainerName}</strong> (${workspaceName}):
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px; line-height: 1.6; color: #d4d4d8;">
        ${proposalSummary}
      </div>

      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Para garantir sua vaga e iniciar seus treinos periodizados imediatamente, conclua sua matrícula pelo link seguro abaixo:
      </p>
    `,
    ctaButton: {
      text: "Aceitar Proposta e Fazer Matrícula",
      url: checkoutUrl,
      color: "#10b981",
    },
  });

  const text = `AtlasFit | Proposta de Consultoria\n\nOlá, ${leadName}!\n${trainerName} enviou sua proposta de consultoria:\n\n${proposalSummary}\n\nPara iniciar, acesse o link de matrícula: ${checkoutUrl}`;

  return { html, text, subject: `Proposta de Consultoria Personalizada com ${trainerName} 🎯` };
}
