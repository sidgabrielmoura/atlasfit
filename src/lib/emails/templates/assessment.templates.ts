import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getPhysicalEvaluationReportEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  evaluationDateFormatted: string;
  evaluationType: string;
  bodyFat?: number | null;
  muscleMass?: number | null;
  weight?: number | null;
  reportUrl?: string | null;
  recipientEmail?: string;
}) {
  const {
    studentName,
    trainerName,
    evaluationDateFormatted,
    evaluationType,
    bodyFat,
    muscleMass,
    weight,
    reportUrl,
    recipientEmail,
  } = params;

  const link = reportUrl || `${getAppBaseUrl()}/student/progress`;

  const html = renderBaseEmailLayout({
    title: "Sua Avaliação Física Está Pronta!",
    badgeText: "Laudo de Avaliação",
    badgeColor: "#8b5cf6",
    previewText: `Laudo de ${evaluationType} realizado por ${trainerName}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        O relatório completo da sua avaliação física realizada em <strong>${evaluationDateFormatted}</strong> por <strong>${trainerName}</strong> já foi finalizado e emitido:
      </p>

      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 20px; margin-bottom: 20px;">
        <div style="font-size: 14px; font-weight: 700; color: #8b5cf6; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.05em;">
          ${evaluationType}
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 13px;">
          ${weight ? `<div><span style="color: #71717a;">Peso:</span> <strong style="color: #ffffff;">${weight} kg</strong></div>` : ""}
          ${bodyFat ? `<div><span style="color: #71717a;">Gordura Corporal:</span> <strong style="color: #ffffff;">${bodyFat}%</strong></div>` : ""}
          ${muscleMass ? `<div><span style="color: #71717a;">Massa Magra:</span> <strong style="color: #ffffff;">${muscleMass}%</strong></div>` : ""}
        </div>
      </div>

      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Você pode visualizar o laudo completo com histórico comparativo, circunferências corporais e gráficos de evolução acessando o portal:
      </p>
    `,
    ctaButton: {
      text: "Visualizar Laudo Completo",
      url: link,
      color: "#8b5cf6",
    },
  });

  const text = `AtlasFit | Avaliação Física Pronta\n\nOlá, ${studentName}!\nSua avaliação física (${evaluationType}) de ${evaluationDateFormatted} está pronta.\nConfira o laudo: ${link}`;

  return { html, text, subject: `Laudo de Avaliação Física Disponível (${evaluationDateFormatted}) 📊` };
}

export function getReassessmentReminderEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  daysSinceLastAssessment: number;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, daysSinceLastAssessment, recipientEmail } = params;
  const link = `${getAppBaseUrl()}/student/progress`;

  const html = renderBaseEmailLayout({
    title: "Hora de Reavaliar Seus Resultados!",
    badgeText: "Check-in Periódico",
    badgeColor: "#3b82f6",
    previewText: `Já se passaram ${daysSinceLastAssessment} dias desde sua última avaliação física`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Faz aproximadamente <strong>${daysSinceLastAssessment} dias</strong> desde sua última avaliação física com <strong>${trainerName}</strong>.
      </p>
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        A reavaliação periódica é fundamental para quantificar seus ganhos de massa magra, redução de gordura corporal e ajustar a sua periodização para continuar evoluindo.
      </p>
      <p style="margin: 0 0 20px 0; color: #ffffff; font-weight: 700;">
        Fale com seu personal para agendar sua nova coleta de medidas ou atualizar suas fotos de evolução no aplicativo!
      </p>
    `,
    ctaButton: {
      text: "Acessar Meu Perfil de Evolução",
      url: link,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Lembrete de Reavaliação\n\nOlá, ${studentName}!\nJá fazem ${daysSinceLastAssessment} dias desde sua última avaliação com ${trainerName}.\nAgende sua reavaliação física no app: ${link}`;

  return { html, text, subject: `Hora de Reavaliar! Acompanhe sua evolução com ${trainerName} 📈` };
}
