import { renderBaseEmailLayout, getAppBaseUrl } from "./base-layout";

export function getStudentInvitationEmailTemplate(params: {
  studentName: string;
  trainerName: string;
  workspaceName: string;
  setupToken: string;
  planName?: string;
  recipientEmail?: string;
}) {
  const { studentName, trainerName, workspaceName, setupToken, planName, recipientEmail } = params;
  const setupUrl = `${getAppBaseUrl()}/auth/setup?token=${setupToken}`;

  const html = renderBaseEmailLayout({
    title: "Seja Bem-vindo(a) à sua Consultoria!",
    badgeText: "Convite de Acesso",
    badgeColor: "#10b981",
    previewText: `Seu personal ${trainerName} te convidou para o AtlasFit`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${studentName}</strong>!</p>
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Seu personal trainer <strong>${trainerName}</strong> adicionou você à consultoria fitness no <strong>${workspaceName}</strong> através da plataforma <strong>AtlasFit</strong>.
      </p>
      ${planName ? `
        <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 14px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px;">
          <span style="color: #71717a;">Plano de Treinamento:</span>
          <strong style="color: #ffffff; margin-left: 6px;">${planName}</strong>
        </div>
      ` : ""}
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Para começar a visualizar seus treinos periodizados, registrar suas cargas e acompanhar sua evolução, crie sua senha de acesso clicando no botão abaixo:
      </p>
    `,
    ctaButton: {
      text: "Ativar Meu Acesso Agora",
      url: setupUrl,
      color: "#10b981",
    },
    secondaryInfoHtml: `
      <p style="margin: 0 0 6px 0;">Após definir sua senha, você poderá acessar pelo celular ou computador em qualquer lugar.</p>
      <p style="margin: 0;">Link direto: <a href="${setupUrl}" target="_blank" style="color: #3b82f6; word-break: break-all;">${setupUrl}</a></p>
    `,
  });

  const text = `AtlasFit | Bem-vindo(a)!\n\nOlá, ${studentName}!\nSeu personal ${trainerName} te cadastrou no ${workspaceName}.\n\nPara ativar sua conta e acessar seus treinos, acesse:\n${setupUrl}`;

  return { html, text, subject: `${trainerName} convidou você para treinar no AtlasFit 🏋️‍♂️` };
}

export function getNewStudentNotificationTrainerTemplate(params: {
  trainerName: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  modality: string;
  recipientEmail?: string;
}) {
  const { trainerName, studentName, studentEmail, planName, modality, recipientEmail } = params;
  const clientsUrl = `${getAppBaseUrl()}/personal/clients`;

  const html = renderBaseEmailLayout({
    title: "Novo Aluno na sua Consultoria!",
    badgeText: "Novo Aluno",
    badgeColor: "#3b82f6",
    previewText: `${studentName} ingressou no seu workspace`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${trainerName}</strong>!</p>
      <p style="margin: 0 0 20px 0; color: #d4d4d8;">
        Um novo aluno foi cadastrado com sucesso e já está pronto para receber suas prescrições:
      </p>
      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 14px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Nome:</strong> <span style="color: #d4d4d8;">${studentName}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">E-mail:</strong> <span style="color: #d4d4d8;">${studentEmail}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Plano:</strong> <span style="color: #d4d4d8;">${planName}</span></div>
        <div><strong style="color: #ffffff;">Modalidade:</strong> <span style="color: #d4d4d8;">${modality}</span></div>
      </div>
      <p style="margin: 0; color: #a1a1aa;">
        Acesse o painel para montar a primeira periodização de treinos ou agendar a avaliação física inicial.
      </p>
    `,
    ctaButton: {
      text: "Abrir Ficha do Aluno",
      url: clientsUrl,
      color: "#3b82f6",
    },
  });

  const text = `AtlasFit | Novo Aluno!\n\nOlá, ${trainerName}.\nO aluno ${studentName} (${studentEmail}) foi adicionado no plano ${planName}.\nAcesse o painel: ${clientsUrl}`;

  return { html, text, subject: `Novo Aluno Cadastrado: ${studentName} 🚀` };
}
