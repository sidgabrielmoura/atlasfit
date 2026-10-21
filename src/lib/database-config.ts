function integer(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`Invalid ${name}`);
  return value;
}

export function databasePoolConfig() {
  return {
    connectionString: process.env.DATABASE_URL,
    max: integer("DATABASE_POOL_MAX", 10, 1, 100),
    min: 0,
    idleTimeoutMillis: integer("DATABASE_POOL_IDLE_TIMEOUT_MS", 10_000, 1000, 300_000),
    connectionTimeoutMillis: integer("DATABASE_POOL_CONNECTION_TIMEOUT_MS", 10_000, 1000, 60_000),
    application_name: "atlasfit",
  };
}

export function databaseQuerySampleRate() {
  const rate = Number(process.env.DATABASE_QUERY_SAMPLE_RATE || "0");
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error("Invalid DATABASE_QUERY_SAMPLE_RATE");
  return rate;
}
