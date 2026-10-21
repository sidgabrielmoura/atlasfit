import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { completePasswordSetup, getPasswordSetupInfo } from "@/lib/auth/password-setup-service";
import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import { validateApplicationOrigin } from "@/lib/auth/application-origin";
import { newSetupTokenExpiry, SETUP_TOKEN_TTL_MS } from "@/lib/auth/setup-token-policy";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || !(target.pathname === "/atlasfit_gym_stabilization_20261001" || (process.env.GYM_FINAL_SCHEMA_TEST === "1" && /^\/atlasfit_completion_tests_[a-f0-9]+$/.test(target.pathname)))) throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
async function fixture() {
  const now = new Date(Date.now() - 1000); const token = randomUUID();
  const content = "Documento sintético de integração; não é texto legal aprovado nem publicado em ambiente existente.";
  const create = (type: "TERMS" | "PRIVACY") => prisma.legalDocument.create({ data: { type, version: `TEST-${randomUUID()}`, title: "Documento de teste", content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", publishedAt: now, effectiveAt: now } });
  await create("TERMS"); await create("PRIVACY");
  const user = await prisma.user.create({ data: { email: `setup-${randomUUID()}@example.invalid`, role: "USER", cpfCnpj: "12345678909", birthDate: new Date("1990-01-15T00:00:00Z"), setupToken: token, setupTokenExpiresAt: new Date(Date.now() + 3600000) } });
  const info = await getPasswordSetupInfo(token);
  if (!info.success) throw new Error("Fixture sem documentos/convite ativos.");
  const input = { token, password: "senha-sintetica-setup", acceptedTerms: true, acceptedPrivacy: true, termsDocumentId: info.termsDocumentId, privacyDocumentId: info.privacyDocumentId, termsDocumentHash: info.termsDocumentHash, privacyDocumentHash: info.privacyDocumentHash };
  return { user, info, input };
}
describe("Setup PostgreSQL — convite, identidade e aceite atômico", () => {
  it("recusa conteúdo substituído no mesmo ID sem consumir o convite; exige o hash relido", async () => {
    const f=await fixture();
    const content="Conteúdo sintético alterado após a exibição, mantendo o mesmo ID.";
    await prisma.legalDocument.update({where:{id:f.input.termsDocumentId},data:{content,contentHash:calculateDocumentHash(content)}});
    expect(await completePasswordSetup(f.input)).toHaveProperty("error");
    expect(await prisma.user.findUniqueOrThrow({where:{id:f.user.id}})).toMatchObject({password:null,setupToken:f.input.token});
    expect(await prisma.legalAcceptance.count({where:{userId:f.user.id}})).toBe(0);
    const shown=await getPasswordSetupInfo(f.input.token); if(!shown.success)throw Error("Documento indisponível.");
    expect(await completePasswordSetup({...f.input,termsDocumentHash:shown.termsDocumentHash,privacyDocumentHash:shown.privacyDocumentHash})).toMatchObject({success:true});
  });
  it("origem de links é validada sem Host da requisição; prazo de convite é compartilhado", () => {
    expect(validateApplicationOrigin("https://app.example.invalid/")).toBe("https://app.example.invalid");
    expect(validateApplicationOrigin("http://127.0.0.1:31173")).toBe("http://127.0.0.1:31173");
    for (const invalid of ["javascript:alert(1)", "http://external.example.invalid", "https://user:password@app.example.invalid", "https://app.example.invalid/path", "https://app.example.invalid?token=secret"]) expect(() => validateApplicationOrigin(invalid)).toThrow();
    const issuedAt = new Date("2026-10-01T00:00:00Z");
    expect(newSetupTokenExpiry(issuedAt).getTime() - issuedAt.getTime()).toBe(SETUP_TOKEN_TTL_MS);
    expect(newSetupTokenExpiry(issuedAt).toISOString()).toBe("2026-10-03T00:00:00.000Z");
  });
  it("aceites falsos e IDs de documento adulterados não alteram senha, token ou histórico", async () => {
    const f = await fixture();
    expect(await completePasswordSetup({ ...f.input, acceptedTerms: false })).toHaveProperty("error");
    expect(await completePasswordSetup({ ...f.input, acceptedPrivacy: false })).toHaveProperty("error");
    expect(await completePasswordSetup({ ...f.input, acceptedTerms: undefined })).toHaveProperty("error");
    expect(await completePasswordSetup({ ...f.input, acceptedPrivacy: undefined })).toHaveProperty("error");
    expect(await completePasswordSetup({ ...f.input, termsDocumentId: randomUUID() })).toHaveProperty("error");
    expect(await prisma.user.findUnique({ where: { id: f.user.id } })).toMatchObject({ password: null, setupToken: f.input.token, sessionVersion: 0 });
    expect(await prisma.legalAcceptance.count({ where: { userId: f.user.id } })).toBe(0);
  });
  it("convite expirado ou sem prazo é recusado; data persistida de menor não é contornada por data enviada", async () => {
    const f = await fixture();
    await prisma.user.update({ where: { id: f.user.id }, data: { setupTokenExpiresAt: new Date(Date.now() - 1000) } });
    expect(await getPasswordSetupInfo(f.input.token)).toHaveProperty("error");
    expect(await completePasswordSetup(f.input)).toHaveProperty("error");
    await prisma.user.update({ where: { id: f.user.id }, data: { setupTokenExpiresAt: null } });
    expect(await completePasswordSetup(f.input)).toHaveProperty("error");
    await prisma.user.update({ where: { id: f.user.id }, data: { setupTokenExpiresAt: new Date(Date.now() + 3600000), birthDate: new Date("2013-01-15T00:00:00Z") } });
    expect(await completePasswordSetup({ ...f.input, birthDate: "1990-01-15" })).toHaveProperty("error");
    expect(await prisma.user.findUnique({ where: { id: f.user.id } })).toMatchObject({ password: null, setupToken: f.input.token, sessionVersion: 0 });
    expect(await prisma.legalAcceptance.count({ where: { userId: f.user.id } })).toBe(0);
  });
  it("consumo concorrente atualiza uma vez, registra exatamente os dois aceites e revoga sessões", async () => {
    const f = await fixture();
    const results = await Promise.all([completePasswordSetup(f.input), completePasswordSetup(f.input)]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } });
    expect(user).toMatchObject({ setupToken: null, setupTokenExpiresAt: null, sessionVersion: 1 });
    expect(await bcrypt.compare(f.input.password, user.password || "")).toBe(true);
    const records = await prisma.legalAcceptance.findMany({ where: { userId: user.id } });
    expect(records).toHaveLength(2);
    expect(records.map(record => record.documentId).sort()).toEqual([f.input.termsDocumentId, f.input.privacyDocumentId].sort());
    expect(records.every(record => record.source === "SETUP_PASSWORD")).toBe(true);
    expect(await getPasswordSetupInfo(f.input.token)).toHaveProperty("error");
  });
  it("setup não funciona como reset de conta existente; password acima do limite de bytes não é truncado", async () => {
    const f = await fixture();
    expect(await completePasswordSetup({ ...f.input, password: "é".repeat(40) })).toHaveProperty("error");
    const original = await bcrypt.hash("senha-anterior-sintetica", 10);
    await prisma.user.update({ where: { id: f.user.id }, data: { password: original } });
    expect(await completePasswordSetup(f.input)).toHaveProperty("error");
    expect(await getPasswordSetupInfo(f.input.token)).toHaveProperty("error");
    expect((await prisma.user.findUniqueOrThrow({ where: { id: f.user.id } })).password).toBe(original);
  });
});
