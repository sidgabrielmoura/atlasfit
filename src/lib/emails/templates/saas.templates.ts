import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getImportJobCompletedTrainerEmailTemplate(params: {
  trainerName: string;
  totalStudents: number;
  totalWorkouts: number;
  totalExercises: number;
  jobId: string;
  recipientEmail?: string;
}) {
  const { trainerName, totalStudents, totalWorkouts, totalExercises, jobId, recipientEmail } = params;
  const reviewUrl = `${getAppBaseUrl()}/personal/migration?jobId=${jobId}`;

  const html = renderBaseEmailLayout({
    title: "Migração de Treinos com IA Concluída!",
    badgeText: "Importação com IA",
    badgeColor: "#8b5cf6",
    previewText: `${totalWorkouts} treinos e ${totalStudents} alunos foram extraídos`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        A Inteligência Artificial do AtlasFit finalizou a leitura e extração dos seus arquivos de treinos antigos. Tudo foi estruturado e está pronto para sua revisão:
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Alunos Mapeados:</strong> <span style="color: #8b5cf6; font-weight: bold;">${totalStudents} alunos</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Treinos Identificados:</strong> <span style="color: #8b5cf6; font-weight: bold;">${totalWorkouts} fichas</span></div>
        <div><strong style="color: #ffffff;">Exercícios Processados:</strong> <span style="color: #d4d4d8;">${totalExercises} exercícios</span></div>
      </div>

      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Acesse a tela de revisão para validar os dados extraídos e confirmar a importação para o seu workspace com apenas 1 clique:
      </p>
    `,
    ctaButton: {
      text: "Revisar e Confirmar Importação",
      url: reviewUrl,
      color: "#8b5cf6",
    },
  });

  const text = `AtlasFit | Importação IA Concluída\n\nOlá, ${trainerName}!\nForam extraídos ${totalStudents} alunos e ${totalWorkouts} treinos dos seus arquivos.\nRevise e confirme no app: ${reviewUrl}`;

  return { html, text, subject: `🤖 Migração Concluída: Seus treinos e alunos estão prontos para revisão` };
}

export function getTrialEndingTrainerEmailTemplate(params: {
  trainerName: string;
  daysRemaining: number;
  recipientEmail?: string;
}) {
  const { trainerName, daysRemaining, recipientEmail } = params;
  const upgradeUrl = `${getAppBaseUrl()}/personal/subscription`;

  const html = renderBaseEmailLayout({
    title: "Seu Período de Testes Está Acabando",
    badgeText: "Aviso de Trial",
    badgeColor: "#3b82f6",
    previewText: `Restam apenas ${daysRemaining} dias de teste gratuito no AtlasFit`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Esperamos que você esteja aproveitando a experiência de prescrever treinos, organizar seus alunos e profissionalizar sua consultoria com o <strong>AtlasFit</strong>!
      </p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Restam apenas <strong>${daysRemaining} dias</strong> do seu período de avaliação gratuita.
      </p>
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Para não interromper o acesso dos seus alunos aos treinos e continuar usando todas as ferramentas de gestão, escolha o plano ideal para a sua consultoria:
      </p>
    `,
    ctaButton: {
      text: "Escolher Meu Plano PRO",
      url: upgradeUrl,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Fim do Trial\n\nOlá, ${trainerName}!\nRestam apenas ${daysRemaining} dias de teste gratuito no AtlasFit.\nEscolha seu plano PRO para continuar: ${upgradeUrl}`;

  return { html, text, subject: `⏳ Restam ${daysRemaining} dias de teste gratuito no AtlasFit - Ative seu plano` };
}

export function getPersonalPlanPaymentSuccessEmailTemplate(params: {
  trainerName: string;
  planName: string;
  amountFormatted: string;
  nextDueDateFormatted: string;
  paidAtFormatted: string;
  paymentMethod: string;
  recipientEmail?: string;
}) {
  const { trainerName, planName, amountFormatted, nextDueDateFormatted, paidAtFormatted, paymentMethod, recipientEmail } = params;
  const dashboardUrl = `${getAppBaseUrl()}/personal/dashboard`;

  const html = renderBaseEmailLayout({
    title: "Pagamento Confirmado!",
    badgeText: "Assinatura Renovada",
    badgeColor: "#10b981",
    previewText: `Sua assinatura do ${planName} foi renovada com sucesso (${amountFormatted})`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Confirmamos com sucesso o pagamento da mensalidade do seu plano <strong>${planName}</strong> no AtlasFit. Seu acesso segue 100% liberado e seu próximo ciclo já foi atualizado!
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Plano:</strong> <span style="color: #d4d4d8;">${planName}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Valor Pago:</strong> <span style="color: #10b981; font-weight: 800; font-size: 15px;">${amountFormatted}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Forma de Pagamento:</strong> <span style="color: #d4d4d8;">${paymentMethod}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Data da Confirmação:</strong> <span style="color: #d4d4d8;">${paidAtFormatted}</span></div>
        <div><strong style="color: #ffffff;">Próximo Vencimento:</strong> <span style="color: #3b82f6; font-weight: bold;">${nextDueDateFormatted}</span></div>
      </div>

      <p style="margin: 0; color: #a1a1aa;">
        Obrigado por confiar no AtlasFit para potencializar sua consultoria e seus alunos.
      </p>
    `,
    ctaButton: {
      text: "Acessar Plataforma",
      url: dashboardUrl,
      color: "#10b981",
    },
  });

  const text = `AtlasFit | Pagamento Confirmado\n\nOlá, ${trainerName}!\nSeu pagamento de ${amountFormatted} (${planName}) foi confirmado em ${paidAtFormatted}.\nPróximo vencimento: ${nextDueDateFormatted}.\nAcesse a plataforma: ${dashboardUrl}`;

  return { html, text, subject: `Assinatura Renovada com Sucesso - AtlasFit ✅` };
}

export function getPersonalPlanPaymentExpiredEmailTemplate(params: {
  trainerName: string;
  planName: string;
  amountFormatted: string;
  recipientEmail?: string;
}) {
  const { trainerName, planName, amountFormatted, recipientEmail } = params;
  const billingUrl = `${getAppBaseUrl()}/personal/dashboard`;

  const html = renderBaseEmailLayout({
    title: "Prazo de Pagamento Expirado",
    badgeText: "Atenção ao Prazo",
    badgeColor: "#f59e0b",
    previewText: `O tempo limite para pagamento da fatura de ${amountFormatted} expirou`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Identificamos que o prazo limite para pagamento do código PIX gerado para o seu plano <strong>${planName}</strong> (${amountFormatted}) expirou.
      </p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Para evitar interrupções no acesso dos seus alunos às rotinas de treinos e à plataforma, acesse o sistema para gerar uma nova cobrança instantânea.
      </p>
    `,
    ctaButton: {
      text: "Gerar Nova Cobrança",
      url: billingUrl,
      color: "#f59e0b",
    },
  });

  const text = `AtlasFit | Prazo de Pagamento Expirado\n\nOlá, ${trainerName}!\nO prazo para o código PIX de ${amountFormatted} (${planName}) expirou.\nAcesse para gerar uma nova cobrança: ${billingUrl}`;

  return { html, text, subject: `⚠️ Prazo de pagamento expirado - Regularize sua assinatura AtlasFit` };
}

export function getPersonalPlanPaymentFailedEmailTemplate(params: {
  trainerName: string;
  planName: string;
  amountFormatted: string;
  reason?: string;
  recipientEmail?: string;
}) {
  const { trainerName, planName, amountFormatted, reason, recipientEmail } = params;
  const billingUrl = `${getAppBaseUrl()}/personal/dashboard`;

  const html = renderBaseEmailLayout({
    title: "Falha no Processamento do Pagamento",
    badgeText: "Pagamento Negado",
    badgeColor: "#ef4444",
    previewText: `Não foi possível processar a cobrança de ${amountFormatted} para o plano ${planName}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Houve uma falha ao tentar processar o pagamento da sua assinatura do plano <strong>${planName}</strong> no valor de <strong>${amountFormatted}</strong>.
      </p>
      ${reason ? `
        <div style="background-color: #09090b; border: 1px solid #3f3f46; border-radius: 12px; padding: 12px 16px; margin-bottom: 18px; font-size: 12px; color: #ef4444;">
          <strong>Motivo informado:</strong> ${reason}
        </div>
      ` : ""}
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Recomendamos tentar novamente utilizando o <strong>PIX Instantâneo</strong>, que possui compensação imediata e dispensa autorização de operadora de cartão:
      </p>
    `,
    ctaButton: {
      text: "Regularizar via PIX",
      url: billingUrl,
      color: "#ef4444",
    },
  });

  const text = `AtlasFit | Falha no Pagamento\n\nOlá, ${trainerName}!\nNão foi possível processar o pagamento de ${amountFormatted} (${planName}).\nRegularize via PIX no app: ${billingUrl}`;

  return { html, text, subject: `❌ Falha no pagamento da sua assinatura AtlasFit` };
}

