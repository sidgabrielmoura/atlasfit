import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
const { configuration, runScheduledJob } = createRequire(import.meta.url)("../../../scripts/run-scheduled-job.cjs");

describe("Agendador manual: autenticação, falha e proteção do segredo", () => {
  let server: Server;
  let origin: string;
  let hits = 0;
  let authorization: string | undefined;
  let mode = "success";
  beforeAll(async () => {
    server = createServer((request, response) => {
      hits++; authorization = request.headers.authorization;
      if (mode === "redirect") { response.writeHead(302, { Location: "/secret-target" }); response.end(); return; }
      response.writeHead(mode === "unavailable" ? 503 : 200, { "Content-Type": "application/json" });
      response.end(mode === "invalid" ? "invalid-json" : JSON.stringify({ success: mode === "success", confidential: "never-log-provider-body" }));
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  });
  afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); });
  const env = () => ({ ATLASFIT_CRON_ORIGIN: origin, CRON_SECRET: "synthetic-private-job-secret", CRON_ALLOW_LOCAL: "1" });
  it("envia Bearer e só registra resultado técnico", async () => {
    mode = "success";
    const result = await runScheduledJob("deliveries", env());
    expect(result).toMatchObject({ job: "deliveries", success: true, httpStatus: 200 });
    expect(authorization).toBe("Bearer synthetic-private-job-secret");
    expect(JSON.stringify(result)).not.toMatch(/synthetic-private|never-log-provider/);
  });
  it.each(["unavailable", "invalid", "failure"])("%s não gera recibo de sucesso nem retry imediato", async value => {
    mode = value; const before = hits;
    expect(await runScheduledJob("gym-purge", env())).toMatchObject({ success: false });
    expect(hits - before).toBe(1);
  });
  it("não segue redirecionamento que poderia transportar o segredo", async () => {
    mode = "redirect"; const before = hits;
    expect(await runScheduledJob("deliveries", env())).toMatchObject({ success: false, code: "JOB_RESULT_UNCERTAIN" });
    expect(hits - before).toBe(1);
  });
  it.each(["http://remote.invalid", "https://user:password@example.invalid", "https://example.invalid/?secret=x", "https://example.invalid/other"])("recusa origem insegura ou ambígua %s", value => {
    expect(() => configuration("deliveries", { ...env(), ATLASFIT_CRON_ORIGIN: value })).toThrow("INVALID_CRON_ORIGIN");
  });
  it("validação não executa job e recusa nome ou segredo inválidos", () => {
    const before = hits; expect(configuration("deliveries", env()).url.pathname).toBe("/api/cron/deliveries");
    expect(() => configuration("arbitrary", env())).toThrow("INVALID_JOB");
    expect(() => configuration("deliveries", { ...env(), CRON_SECRET: "" })).toThrow("CRON_SECRET_REQUIRED");
    expect(hits).toBe(before);
  });
});
