/**
 * Generates the branded HTML recovery email template.
 * Theme: Premium dark mode themed to match AtlasFit visual system.
 */
export function getResetPasswordEmailHtml(resetLink: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinir Senha - AtlasFit</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #09090b;
            color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #09090b;
            padding: 40px 0;
          }
          .container {
            max-width: 540px;
            margin: 0 auto;
            background-color: #18181b;
            border: 1px solid #27272a;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            padding: 32px 32px 16px 32px;
            text-align: center;
          }
          .logo-container {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .logo-text {
            font-size: 24px;
            font-weight: 900;
            font-style: italic;
            letter-spacing: -0.05em;
            color: #ffffff;
            text-transform: uppercase;
          }
          .logo-highlight {
            color: #ea580c;
          }
          .content {
            padding: 16px 32px 32px 32px;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 16px;
            text-align: center;
          }
          p {
            font-size: 14px;
            line-height: 1.6;
            color: #a1a1aa;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .btn-container {
            text-align: center;
            margin-bottom: 28px;
            margin-top: 8px;
          }
          .btn {
            display: inline-block;
            background-color: #ea580c;
            color: #ffffff !important;
            text-decoration: none;
            padding: 16px 36px;
            font-size: 14px;
            font-weight: 700;
            border-radius: 14px;
            box-shadow: 0 4px 14px rgba(234, 88, 12, 0.4);
            transition: background-color 0.2s;
          }
          .divider {
            height: 1px;
            background-color: #27272a;
            margin: 24px 0;
          }
          .footer {
            font-size: 11px;
            line-height: 1.5;
            color: #71717a;
            text-align: center;
            padding: 0 32px 32px 32px;
          }
          .footer a {
            color: #ea580c;
            text-decoration: none;
          }
          .alert-box {
            background-color: rgba(234, 88, 12, 0.05);
            border: 1px dashed rgba(234, 88, 12, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 16px;
            font-size: 12px;
            color: #ea580c;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <span class="logo-text">ATLAS<span class="logo-highlight">FIT</span></span>
              </div>
            </div>
            
            <div class="content">
              <h1>Redefinição de Senha</h1>
              
              <p>Olá,</p>
              
              <p>Recebemos uma solicitação para redefinir a senha associada a este e-mail no AtlasFit. Clique no botão abaixo para definir uma nova senha para sua conta.</p>
              
              <div class="btn-container">
                <a href="${resetLink}" class="btn" target="_blank">Redefinir Senha</a>
              </div>
              
              <div class="alert-box">
                <strong>Importante:</strong> Por razões de segurança, este link é válido para apenas uma redefinição e expirará em 1 hora.
              </div>
              
              <p>Se você não fez essa solicitação, por favor ignore este e-mail. Nenhuma alteração foi feita na sua conta.</p>
              
              <div class="divider"></div>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail transacional enviado automaticamente pelo sistema AtlasFit.</p>
              <p>Para sua segurança, nunca solicitamos sua senha ou dados confidenciais por e-mail.</p>
              <p>&copy; ${new Date().getFullYear()} AtlasFit. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates a clean plain text fallback for email clients that strip HTML.
 */
export function getResetPasswordEmailText(resetLink: string): string {
  return `
AtlasFit | Redefinição de Senha
==================================

Olá,

Recebemos uma solicitação para redefinir a senha da sua conta no AtlasFit.

Clique no link abaixo (ou cole em seu navegador) para escolher uma nova senha:
${resetLink}

Aviso de Segurança:
- Este link é de uso único e expira em 1 hora.
- Se você não solicitou a redefinição de senha, por favor ignore este e-mail.

Atenciosamente,
Equipe AtlasFit
  `.trim();
}

export function getTwoFactorEmailHtml(code: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código de Verificação - AtlasFit</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            background-color: #09090b;
            color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
          }
          .wrapper {
            width: 100%;
            background-color: #09090b;
            padding: 40px 0;
          }
          .container {
            max-width: 540px;
            margin: 0 auto;
            background-color: #18181b;
            border: 1px solid #27272a;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          }
          .header {
            padding: 32px 32px 16px 32px;
            text-align: center;
          }
          .logo-container {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .logo-text {
            font-size: 24px;
            font-weight: 900;
            font-style: italic;
            letter-spacing: -0.05em;
            color: #ffffff;
            text-transform: uppercase;
          }
          .logo-highlight {
            color: #ea580c;
          }
          .content {
            padding: 16px 32px 32px 32px;
          }
          h1 {
            font-size: 22px;
            font-weight: 800;
            color: #ffffff;
            margin-top: 0;
            margin-bottom: 16px;
            text-align: center;
          }
          p {
            font-size: 14px;
            line-height: 1.6;
            color: #a1a1aa;
            margin-top: 0;
            margin-bottom: 24px;
          }
          .code-container {
            text-align: center;
            margin: 28px 0;
            padding: 20px;
            background-color: #09090b;
            border: 1px solid #27272a;
            border-radius: 16px;
          }
          .code-text {
            font-size: 32px;
            font-weight: 850;
            letter-spacing: 0.25em;
            color: #ffffff;
            font-family: monospace;
          }
          .divider {
            height: 1px;
            background-color: #27272a;
            margin: 24px 0;
          }
          .footer {
            font-size: 11px;
            line-height: 1.5;
            color: #71717a;
            text-align: center;
            padding: 0 32px 32px 32px;
          }
          .alert-box {
            background-color: rgba(234, 88, 12, 0.05);
            border: 1px dashed rgba(234, 88, 12, 0.2);
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 16px;
            font-size: 12px;
            color: #ea580c;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <div class="logo-container">
                <span class="logo-text">ATLAS<span class="logo-highlight">FIT</span></span>
              </div>
            </div>
            
            <div class="content">
              <h1>Autenticação de Duas Etapas (2FA)</h1>
              
              <p>Olá,</p>
              
              <p>Para prosseguir com o seu login com segurança no AtlasFit, use o código de verificação temporário apresentado abaixo:</p>
              
              <div class="code-container">
                <span class="code-text">${code}</span>
              </div>
              
              <div class="alert-box">
                <strong>Importante:</strong> Este código é temporário e expirará em 5 minutos. Nunca compartilhe esse código com ninguém.
              </div>
              
              <p>Se você não tentou fazer login na sua conta no AtlasFit, por favor desconsidere este e-mail.</p>
              
              <div class="divider"></div>
            </div>
            
            <div class="footer">
              <p>Este é um e-mail transacional enviado automaticamente pelo sistema AtlasFit.</p>
              <p>Para sua segurança, nunca solicitamos sua senha ou dados confidenciais por e-mail.</p>
              <p>&copy; ${new Date().getFullYear()} AtlasFit. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function getTwoFactorEmailText(code: string): string {
  return `
AtlasFit | Autenticação de Duas Etapas (2FA)
==================================

Olá,

Para prosseguir com o seu login com segurança no AtlasFit, use o código de verificação temporário apresentado abaixo:

Código: ${code}

Este código expira em 5 minutos. Nunca compartilhe este código.

Se você não tentou fazer login, por favor desconsidere este e-mail.

Atenciosamente,
Equipe AtlasFit
  `.trim();
}
