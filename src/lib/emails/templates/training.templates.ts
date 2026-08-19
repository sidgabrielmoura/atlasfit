import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getNewWorkoutPrescribedEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  workoutName: string;
  goal?: string;
  duration?: string;
  exerciseCount?: number;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, workoutName, goal, duration, exerciseCount, recipientEmail } = params;
  const workoutsUrl = `${getAppBaseUrl()}/student/workouts`;

  const html = renderBaseEmailLayout({
    title: "Novo Treino Prescrito!",
    badgeText: "Treino Liberado",
    badgeColor: "#ea580c",
    previewText: `Seu personal ${trainerName} liberou o treino: ${workoutName}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Seu personal trainer <strong>${trainerName}</strong> acabou de prescrever uma nova ficha de treinamento personalizada especialmente para você:
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
        <div style="font-size: 18px; font-weight: 900; color: #ffffff; margin-bottom: 12px;">${workoutName}</div>
        
        <div style="border-top: 1px solid #1f1f23; padding-top: 12px; font-size: 13px;">
          ${goal ? `<div style="margin-bottom: 6px;"><strong style="color: #ffffff;">Objetivo:</strong> <span style="color: #a1a1aa;">${goal}</span></div>` : ""}
          ${duration ? `<div style="margin-bottom: 6px;"><strong style="color: #ffffff;">Duração Estimada:</strong> <span style="color: #a1a1aa;">${duration}</span></div>` : ""}
          ${exerciseCount ? `<div><strong style="color: #ffffff;">Total de Exercícios:</strong> <span style="color: #ea580c; font-weight: bold;">${exerciseCount} exercícios</span></div>` : ""}
        </div>
      </div>

      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Abra o aplicativo para ver a demonstração em vídeo dos exercícios, registrar suas cargas e marcar suas séries completadas!
      </p>
    `,
    ctaButton: {
      text: "Acessar Meu Novo Treino",
      url: workoutsUrl,
    },
  });

  const text = `AtlasFit | Novo Treino Prescrito!\n\nOlá, ${studentName}!\nSeu personal ${trainerName} prescreveu o treino "${workoutName}".\nAcesse no app: ${workoutsUrl}`;

  return { html, text, subject: `Novo Treino Liberado: ${workoutName} 🏋️‍♂️` };
}

export function getWorkoutUpdatedEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  workoutName: string;
  changesSummary?: string;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, workoutName, changesSummary, recipientEmail } = params;
  const workoutsUrl = `${getAppBaseUrl()}/student/workouts`;

  const html = renderBaseEmailLayout({
    title: "Seu Treino Foi Atualizado",
    badgeText: "Ajuste de Treino",
    badgeColor: "#3b82f6",
    previewText: `${trainerName} atualizou a ficha: ${workoutName}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Seu personal trainer <strong>${trainerName}</strong> fez atualizações na ficha de treino <strong>"${workoutName}"</strong>.
      </p>
      ${changesSummary ? `
        <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #d4d4d8;">
          <strong>Alterações:</strong> ${changesSummary}
        </div>
      ` : ""}
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Confira os novos exercícios, séries e cargas sugeridas diretamente no aplicativo antes da sua próxima sessão de treino.
      </p>
    `,
    ctaButton: {
      text: "Visualizar Treino Atualizado",
      url: workoutsUrl,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Treino Atualizado\n\nOlá, ${studentName}!\nO treino "${workoutName}" foi atualizado por ${trainerName}.\nConfira no app: ${workoutsUrl}`;

  return { html, text, subject: `Atualização de Treino: ${workoutName} 📋` };
}
