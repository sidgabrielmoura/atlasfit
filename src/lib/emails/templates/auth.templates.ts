import { renderBaseEmailLayout } from "./base-layout";

export function getTwoFactorEmailTemplate(code: string, recipientEmail?: string) {
  const html = renderBaseEmailLayout({
    title: "Código de Acesso",
    badgeText: "Segurança",
    previewText: `Seu código de acesso é ${code}`,
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0; color: #a1a1aa;">
        Use o código de verificação abaixo para confirmar sua identidade e acessar sua conta no AtlasFit:
      </p>
      <div style="text-align: center; margin: 24px 0;">
        <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 18px 24px; display: inline-block;">
          <span style="font-size: 34px; font-weight: 900; letter-spacing: 0.35em; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding-left: 0.35em;">
            ${code}
          </span>
        </div>
      </div>
      <p style="margin: 0; font-size: 13px; color: #71717a; text-align: center;">
        Este código é pessoal, intransferível e expira em 7 dias. Nunca compartilhe este código com terceiros.
      </p>
    `,
    secondaryInfoHtml: "Se você não solicitou este código de segurança, recomendamos alterar sua senha imediatamente.",
  });

  const text = `AtlasFit | Código de Acesso\n\nSeu código de verificação é: ${code}\nVálido por 7 dias para autenticação no AtlasFit.\n\nSe você não solicitou este código, ignore esta mensagem.`;

  return { html, text, subject: `${code} é seu código de segurança do AtlasFit` };
}

export function getResetPasswordEmailTemplate(resetLink: string, recipientEmail?: string) {
  const html = renderBaseEmailLayout({
    title: "Redefinição de Senha",
    badgeText: "Recuperação de Conta",
    previewText: "Acesse o link para escolher sua nova senha",
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0; color: #d4d4d8;">
        Recebemos uma solicitação para redefinir a senha da sua conta no <strong>AtlasFit</strong>.
      </p>
      <p style="margin: 0 0 8px 0; color: #a1a1aa;">
        Clique no botão abaixo para criar sua nova senha de acesso:
      </p>
    `,
    ctaButton: {
      text: "Redefinir Minha Senha",
      url: resetLink,
    },
    secondaryInfoHtml: `
      <p style="margin: 0 0 6px 0;">O link acima é válido por <strong>1 hora</strong>.</p>
      <p style="margin: 0;">Se você não solicitou a redefinição de senha, nenhuma alteração foi realizada.</p>
    `,
  });

  const text = `AtlasFit | Redefinição de Senha\n\nRecebemos uma solicitação para redefinir sua senha.\nAcesse o link abaixo para criar uma nova senha:\n${resetLink}\n\nEste link é válido por 1 hora.`;

  return { html, text, subject: "Redefinição de Senha - AtlasFit" };
}

export function getSecurityLoginAlertEmailTemplate(params: {
  userName: string;
  ipAddress: string;
  browser?: string;
  location?: string;
  timestamp: Date;
  recipientEmail?: string;
}) {
  const { userName, ipAddress, browser, location, timestamp, recipientEmail } = params;
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(timestamp);

  const html = renderBaseEmailLayout({
    title: "Novo Acesso Detectado",
    badgeText: "Alerta de Segurança",
    badgeColor: "#f59e0b",
    previewText: "Novo acesso realizado em sua conta AtlasFit",
    recipientEmail,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Olá, <strong>${userName}</strong>.</p>
      <p style="margin: 0 0 20px 0; color: #a1a1aa;">
        Identificamos um novo login em sua conta AtlasFit com as seguintes informações:
      </p>
      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 14px; padding: 16px; margin-bottom: 16px; font-size: 13px;">
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Data e Hora:</strong> <span style="color: #d4d4d8;">${formattedDate}</span></div>
        <div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Endereço IP:</strong> <span style="color: #d4d4d8;">${ipAddress}</span></div>
        ${browser ? `<div style="margin-bottom: 8px;"><strong style="color: #ffffff;">Dispositivo/Navegador:</strong> <span style="color: #d4d4d8;">${browser}</span></div>` : ""}
        ${location ? `<div><strong style="color: #ffffff;">Localização Aproximada:</strong> <span style="color: #d4d4d8;">${location}</span></div>` : ""}
      </div>
      <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
        Se foi você, não é necessária nenhuma ação. Caso não reconheça esse acesso, altere sua senha imediatamente.
      </p>
    `,
  });

  const text = `AtlasFit | Novo Acesso Detectado\n\nOlá, ${userName}.\nIdentificamos um novo login em sua conta:\nData: ${formattedDate}\nIP: ${ipAddress}\n\nSe não foi você, altere sua senha imediatamente no AtlasFit.`;

  return { html, text, subject: "Alerta de Segurança: Novo acesso à sua conta AtlasFit" };
}
