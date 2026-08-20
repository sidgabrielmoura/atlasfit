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
