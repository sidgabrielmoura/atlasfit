import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

let cachedApiKey: string | null = null;

/**
 * Retorna a chave Master da API do Asaas de forma resiliente.
 * Resolve o problema comum do Next.js / dotenv-expand que engole chaves começando com "$"
 * (como as chaves "$aact_..." do Asaas), fazendo fallback para leitura do arquivo .env em desenvolvimento.
 */
export function getMasterAsaasApiKey(): string {
  if (process.env.NODE_ENV === "test") {
    let key = (process.env.ASAAS_API_KEY || "").trim();
    if (key.startsWith("\\$")) {
      key = key.slice(1);
    }
    if ((key.startsWith("'") && key.endsWith("'")) || (key.startsWith('"') && key.endsWith('"'))) {
      key = key.slice(1, -1).trim();
    }
    return key;
  }

  if (cachedApiKey) return cachedApiKey;

  let key = (process.env.ASAAS_API_KEY || "").trim();

  // Remove escape backslash caso o ambiente não tenha desescapado
  if (key.startsWith("\\$")) {
    key = key.slice(1);
  }

  // Remove aspas acidentais
  if ((key.startsWith("'") && key.endsWith("'")) || (key.startsWith('"') && key.endsWith('"'))) {
    key = key.slice(1, -1).trim();
  }

  if (key) {
    cachedApiKey = key;
    return key;
  }

  // Fallback seguro de leitura direta do .env apenas em desenvolvimento
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envPath, "utf-8"));
      if (parsed.ASAAS_API_KEY) {
        let raw = parsed.ASAAS_API_KEY.trim();
        if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
          raw = raw.slice(1, -1).trim();
        }
        if (raw.startsWith("\\$")) raw = raw.slice(1);
        if (raw) {
          cachedApiKey = raw;
          process.env.ASAAS_API_KEY = raw;
          return raw;
        }
      }
    }
  } catch {
    // Silencioso em ambientes onde fs não está disponível
  }

  return "";
}

let cachedWebhookSecret: string | null = null;

/**
 * Retorna o secret do webhook do Asaas de forma resiliente.
 * Faz fallback para leitura direta do .env caso o ambiente Next.js não tenha carregado.
 */
export function getAsaasWebhookSecret(): string {
  if (process.env.NODE_ENV === "test") {
    let secret = (process.env.ASAAS_WEBHOOK_SECRET || "").trim();
    if (secret.startsWith("\\$")) {
      secret = secret.slice(1);
    }
    if ((secret.startsWith("'") && secret.endsWith("'")) || (secret.startsWith('"') && secret.endsWith('"'))) {
      secret = secret.slice(1, -1).trim();
    }
    return secret;
  }

  if (cachedWebhookSecret) return cachedWebhookSecret;

  let secret = (process.env.ASAAS_WEBHOOK_SECRET || "").trim();

  if (secret.startsWith("\\$")) {
    secret = secret.slice(1);
  }

  if ((secret.startsWith("'") && secret.endsWith("'")) || (secret.startsWith('"') && secret.endsWith('"'))) {
    secret = secret.slice(1, -1).trim();
  }

  if (secret) {
    cachedWebhookSecret = secret;
    return secret;
  }

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const parsed = dotenv.parse(fs.readFileSync(envPath, "utf-8"));
      if (parsed.ASAAS_WEBHOOK_SECRET) {
        let raw = parsed.ASAAS_WEBHOOK_SECRET.trim();
        if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
          raw = raw.slice(1, -1).trim();
        }
        if (raw.startsWith("\\$")) raw = raw.slice(1);
        if (raw) {
          cachedWebhookSecret = raw;
          process.env.ASAAS_WEBHOOK_SECRET = raw;
          return raw;
        }
      }
    }
  } catch {
    // Silencioso se fs não estiver disponível
  }

  return "";
}

