import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getInactivityAlertStudentEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  daysInactive: number;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, daysInactive, recipientEmail } = params;
  const workoutsUrl = `${getAppBaseUrl()}/student/workouts`;

  const html = renderBaseEmailLayout({
    title: "Sentimos Sua Falta nos Treinos!",
    badgeText: "Bora Treinar?",
    badgeColor: "#f59e0b",
    previewText: `Faz ${daysInactive} dias que não registramos seus treinos`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Notamos que você está há cerca de <strong>${daysInactive} dias</strong> sem registrar seus treinos no aplicativo.
      </p>
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        A consistência é a chave para alcançar seus objetivos físicos e manter a sua saúde em dia. Seu personal <strong>${trainerName}</strong> já deixou suas séries preparadas!
      </p>
      <p style="margin: 0 0 20px 0; color: #ffffff; font-weight: 700;">
        Que tal tirar 45 minutos hoje para retomar seu ritmo? Mesmo um treino mais leve é melhor que zero!
      </p>
    `,
    ctaButton: {
      text: "Abrir Meu Treino de Hoje",
      url: workoutsUrl,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Sentimos sua falta!\n\nOlá, ${studentName}!\nFaz ${daysInactive} dias que você não registra seus treinos com ${trainerName}.\nBora retomar o foco? Abra seu app: ${workoutsUrl}`;

  return { html, text, subject: `Sentimos sua falta nos treinos! Bora retomar o foco? ⚡` };
}

export function getChurnRiskAlertTrainerEmailTemplate(params: {
  trainerName: string;
  studentName: string;
  daysInactive: number;
  studentPhone?: string | null;
  recipientEmail?: string;
}) {
  const { trainerName, studentName, daysInactive, studentPhone, recipientEmail } = params;
  const clientsUrl = `${getAppBaseUrl()}/personal/clients`;
  const cleanPhone = studentPhone ? studentPhone.replace(/\D/g, "") : null;
  const whatsappUrl = cleanPhone ? `https://wa.me/55${cleanPhone}` : null;

  const html = renderBaseEmailLayout({
    title: "Alerta de Aluno Inativo (Risco de Desistência)",
    badgeText: "Atenção à Retenção",
    badgeColor: "#ef4444",
    previewText: `${studentName} está sem treinar há ${daysInactive} dias`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>.</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        O aluno <strong>${studentName}</strong> está há <strong>${daysInactive} dias consecutivos</strong> sem abrir o aplicativo ou registrar execuções de treino.
      </p>

      <div style="background-color: #09090b; border: 1px solid #ef4444; border-radius: 14px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
        <div style="color: #ef4444; font-weight: 800; margin-bottom: 6px;">RISCO ELEVADO DE CANCELAMENTO</div>
        <p style="margin: 0; color: #d4d4d8; line-height: 1.5;">
          Alunos que ficam mais de 10 dias inativos possuem 75% mais chance de não renovar a consultoria. Um simples contato pelo WhatsApp pode reverter essa situação!
        </p>
      </div>

      ${whatsappUrl ? `
        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${whatsappUrl}" target="_blank" style="display: inline-block; background-color: #25D366; color: #ffffff !important; font-size: 13px; font-weight: 800; text-decoration: none; padding: 10px 24px; border-radius: 12px;">
            Mandar Mensagem no WhatsApp
          </a>
        </div>
      ` : ""}
    `,
    ctaButton: {
      text: "Ver Perfil do Aluno",
      url: clientsUrl,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Alerta de Retenção\n\nOlá, ${trainerName}.\nO aluno ${studentName} está há ${daysInactive} dias sem treinar.\nFaça um contato proativo: ${clientsUrl}`;

  return { html, text, subject: `⚠️ Atenção: ${studentName} está sem treinar há ${daysInactive} dias` };
}

export function getPlanExpirationNoticeEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  planName: string;
  expirationDateFormatted: string;
  renewalUrl?: string;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, planName, expirationDateFormatted, renewalUrl, recipientEmail } = params;
  const link = renewalUrl || `${getAppBaseUrl()}/student/billing`;

  const html = renderBaseEmailLayout({
    title: "Seu Plano Está Chegando ao Fim",
    badgeText: "Renovação de Contrato",
    badgeColor: "#3b82f6",
    previewText: `Seu plano ${planName} encerra em ${expirationDateFormatted}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Gostaríamos de lembrar que o seu ciclo de consultoria no plano <strong>${planName}</strong> com <strong>${trainerName}</strong> encerra no dia <strong>${expirationDateFormatted}</strong>.
      </p>
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Para garantir a continuidade do seu acompanhamento profissional, sem perder suas planilhas de evolução e histórico de cargas, renove seu plano com facilidade:
      </p>
    `,
    ctaButton: {
      text: "Renovar Minha Consultoria",
      url: link,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Renovação de Plano\n\nOlá, ${studentName}!\nSeu plano ${planName} com ${trainerName} vence em ${expirationDateFormatted}.\nRenove seu acesso: ${link}`;

  return { html, text, subject: `Seu plano de consultoria encerra em ${expirationDateFormatted} - Renove agora` };
}
