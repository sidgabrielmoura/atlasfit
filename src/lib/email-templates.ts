/**
 * Ultra-minimalist branded HTML email templates for AtlasFit.
 */

function getLogoUrl(): string {
  const domain = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.atlasfit.site";
  const cleanDomain = domain.replace(/\/$/, "");
  return `${cleanDomain}/logos_atlasfit/atlasfit%20(4).png`;
}

export function getTwoFactorEmailHtml(code: string): string {
  const logoUrl = getLogoUrl();
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AtlasFit</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 48px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 420px; background-color: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 36px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <img src="${logoUrl}" alt="AtlasFit" width="150" style="max-width: 150px; height: auto; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0; tracking: -0.02em;">Código de Acesso</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="font-size: 14px; color: #a1a1aa; margin: 0; line-height: 1.5;">Insira o código de 6 dígitos para acessar sua conta.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 16px; padding: 18px 24px; display: inline-block;">
                      <span style="font-size: 34px; font-weight: 900; letter-spacing: 0.3em; color: #ffffff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; padding-left: 0.3em;">${code}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <span style="display: inline-block; font-size: 12px; font-weight: 600; color: #71717a; background-color: #27272a; padding: 5px 14px; border-radius: 20px;">Válido por 7 dias</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top: 1px solid #27272a; padding-top: 20px;">
                    <p style="font-size: 11px; color: #52525b; margin: 0;">&copy; ${new Date().getFullYear()} AtlasFit. Todos os direitos reservados.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getTwoFactorEmailText(code: string): string {
  return `
AtlasFit | Código de Acesso
==================================

Seu código de verificação é: ${code}

Válido por 7 dias para acessar sua conta no AtlasFit.
  `.trim();
}

export function getResetPasswordEmailHtml(resetLink: string): string {
  const logoUrl = getLogoUrl();
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AtlasFit</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 48px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 420px; background-color: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 36px 32px; text-align: center; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <img src="${logoUrl}" alt="AtlasFit" width="150" style="max-width: 150px; height: auto; display: block;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 8px;">
                    <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0;">Redefinição de Senha</h1>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <p style="font-size: 14px; color: #a1a1aa; margin: 0; line-height: 1.5;">Clique no botão abaixo para escolher uma nova senha.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <a href="${resetLink}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #000000 !important; text-decoration: none; padding: 14px 32px; font-size: 14px; font-weight: 700; border-radius: 12px;">Redefinir Senha</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top: 1px solid #27272a; padding-top: 20px;">
                    <p style="font-size: 11px; color: #52525b; margin: 0;">Link válido por 1 hora. &copy; ${new Date().getFullYear()} AtlasFit.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function getResetPasswordEmailText(resetLink: string): string {
  return `
AtlasFit | Redefinição de Senha
==================================

Acesse o link abaixo para escolher uma nova senha:
${resetLink}

Link válido por 1 hora.
  `.trim();
}
