/**
 * Base Layout for AtlasFit Transactional Emails.
 * Responsive, dark-mode optimized, bulletproof table structure for Gmail, Apple Mail, Outlook and mobile clients.
 */

export interface EmailBaseLayoutOptions {
  title?: string;
  previewText?: string;
  badgeText?: string;
  badgeColor?: string;
  contentHtml: string;
  ctaButton?: {
    text: string;
    url: string;
    color?: string;
  };
  secondaryInfoHtml?: string;
  recipientEmail?: string;
}

export function getAppBaseUrl(): string {
  const domain = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://app.atlasfit.site";
  return domain.replace(/\/$/, "");
}

export function getLogoUrl(): string {
  const cleanDomain = getAppBaseUrl();
  return `${cleanDomain}/logos_atlasfit/atlasfit%20(4).png`;
}

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace("#", "").trim();
  if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(59, 130, 246, ${alpha})`;
}

export function renderBaseEmailLayout(options: EmailBaseLayoutOptions): string {
  const {
    title,
    previewText,
    badgeText,
    badgeColor = "#3b82f6",
    contentHtml,
    ctaButton,
    secondaryInfoHtml,
    recipientEmail,
  } = options;

  const logoUrl = getLogoUrl();
  const currentYear = new Date().getFullYear();
  const buttonColor = ctaButton?.color || "#3b82f6";
  const badgeBg = hexToRgba(badgeColor, 0.12);
  const badgeBorder = hexToRgba(badgeColor, 0.25);
  const buttonShadow = hexToRgba(buttonColor, 0.35);

  return `
<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>${title || "AtlasFit"}</title>
    <!--[if mso]>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
    <![endif]-->
    <style>
      body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
      table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
      img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
      body { margin: 0; padding: 0; width: 100% !important; background-color: #09090b; }
      a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
      @media only screen and (max-width: 600px) {
        .email-container { width: 100% !important; padding: 16px !important; }
        .content-card { padding: 24px 20px !important; border-radius: 20px !important; }
        .cta-btn { width: 100% !important; display: block !important; box-sizing: border-box !important; text-align: center !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #09090b; color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    ${previewText ? `
      <div style="display: none; font-size: 1px; color: #09090b; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
        ${previewText}
      </div>
    ` : ""}
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #09090b; padding: 36px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="email-container" style="max-width: 540px;">
            
            <!-- Header / Brand Logo -->
            <tr>
              <td align="center" style="padding-bottom: 24px;">
                <a href="${getAppBaseUrl()}" target="_blank" style="text-decoration: none; display: inline-block;">
                  <img src="${logoUrl}" alt="AtlasFit" width="150" style="max-width: 150px; height: auto; display: block;" />
                </a>
              </td>
            </tr>

            <!-- Main Content Card -->
            <tr>
              <td>
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" class="content-card" style="background-color: #141417; border: 1px solid #27272a; border-radius: 24px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);">
                  
                  ${badgeText ? `
                    <tr>
                      <td align="left" style="padding-bottom: 16px;">
                        <span style="display: inline-block; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: ${badgeColor}; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 5px 12px; border-radius: 12px;">
                          ${badgeText}
                        </span>
                      </td>
                    </tr>
                  ` : ""}

                  ${title ? `
                    <tr>
                      <td align="left" style="padding-bottom: 16px;">
                        <h1 style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0; line-height: 1.3; letter-spacing: -0.02em;">
                          ${title}
                        </h1>
                      </td>
                    </tr>
                  ` : ""}

                  <!-- Body HTML -->
                  <tr>
                    <td align="left" style="font-size: 14px; line-height: 1.6; color: #d4d4d8;">
                      ${contentHtml}
                    </td>
                  </tr>

                  <!-- CTA Button -->
                  ${ctaButton ? `
                    <tr>
                      <td align="center" style="padding-top: 28px; padding-bottom: 12px;">
                        <a href="${ctaButton.url}" target="_blank" class="cta-btn" style="display: inline-block; background-color: ${buttonColor}; color: #ffffff !important; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 14px ${buttonShadow}; text-align: center;">
                          ${ctaButton.text}
                        </a>
                      </td>
                    </tr>
                  ` : ""}

                  <!-- Secondary Info -->
                  ${secondaryInfoHtml ? `
                    <tr>
                      <td align="left" style="padding-top: 20px; border-top: 1px solid #27272a; margin-top: 24px; font-size: 12px; color: #71717a; line-height: 1.5;">
                        ${secondaryInfoHtml}
                      </td>
                    </tr>
                  ` : ""}

                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top: 28px; padding-bottom: 16px; font-size: 11px; color: #52525b; line-height: 1.6;">
                <p style="margin: 0 0 6px 0;">
                  Esta mensagem foi gerada automaticamente pela plataforma <strong style="color: #71717a;">AtlasFit</strong>.
                </p>
                ${recipientEmail ? `<p style="margin: 0 0 6px 0;">Enviado para <strong style="color: #a1a1aa;">${recipientEmail}</strong></p>` : ""}
                <p style="margin: 0;">
                  &copy; ${currentYear} AtlasFit. Todos os direitos reservados.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}
