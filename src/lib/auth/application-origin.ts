/** Trusted configuration only; request Host/forwarded headers never choose credential links. */
export function validateApplicationOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Origem da aplicação inválida."); }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("Configure uma origem HTTPS válida para a aplicação; HTTP apenas em loopback.");
  return url.origin;
}

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  const configuredCandidates = [
    process.env.AUTH_URL,
    process.env.NEXTAUTH_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NODE_ENV === "production" ? "https://app.atlasfit.site" : "http://localhost:3000",
  ].filter(Boolean) as string[];

  for (const candidate of configuredCandidates) {
    try {
      const expected = validateApplicationOrigin(candidate);
      if (origin === expected) return true;
    } catch {
      // continua para próximo candidato
    }
  }

  // Em ambiente de desenvolvimento ou testes locais, permitir origens de loopback (localhost / 127.0.0.1 / [::1])
  if (process.env.NODE_ENV !== "production") {
    try {
      const parsed = new URL(origin);
      const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
      if (isLoopback && (parsed.protocol === "http:" || parsed.protocol === "https:")) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

