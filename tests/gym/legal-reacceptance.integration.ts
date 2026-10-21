import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import { reacceptOwnDocument } from "@/lib/privacy/reacceptance";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => prisma.$disconnect());

async function fixture(test: (f: { userId: string; doc: Awaited<ReturnType<typeof prisma.legalDocument.create>>; input: Record<string, unknown> }) => Promise<void>) {
  const user = await prisma.user.create({ data: { birthDate: new Date("1990-01-15") } });
  const content = "Documento exclusivamente sintético para reaceite próprio.";
  const doc = await prisma.legalDocument.create({ data: { type: "TERMS", title: "Termos sintéticos", version: randomUUID(), content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(), publishedAt: new Date() } });
  try { await test({ userId: user.id, doc, input: { documentType: doc.type, documentId: doc.id, documentVersion: doc.version, documentHash: doc.contentHash, accepted: true } }); }
  finally {
    await prisma.auditLog.deleteMany({ where: { userId: user.id } });
    await prisma.legalAcceptance.deleteMany({ where: { userId: user.id } });
    await prisma.legalDocument.delete({ where: { id: doc.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

describe("Reaceite próprio vinculado ao documento exibido", () => {
  it("registra ID, hash e contexto próprios, com auditoria e replay sem duplicação", async () => fixture(async f => {
    const first = await reacceptOwnDocument(f.userId, f.input, { userAgent: "a".repeat(600) });
    expect(await reacceptOwnDocument(f.userId, f.input)).toEqual({ id: first.id, alreadyAccepted: true });
    expect(await prisma.legalAcceptance.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({ userId: f.userId, documentId: f.doc.id, documentHash: f.doc.contentHash, representedUserId: null, workspaceId: null, ipAddress: null, userAgent: "a".repeat(500), source: "IN_APP_MODAL", acceptanceType: "REACCEPTANCE" });
    expect(await prisma.auditLog.count({ where: { userId: f.userId, action: "USER_LEGAL_REACCEPTED", entityId: first.id } })).toBe(1);
  }));
  it("aceites simultâneos produzem um registro e uma auditoria", async () => fixture(async f => {
    const results = await Promise.all(Array.from({ length: 8 }, () => reacceptOwnDocument(f.userId, f.input)));
    expect(new Set(results.map(r => r.id)).size).toBe(1);
    expect(results.filter(r => !r.alreadyAccepted)).toHaveLength(1);
    expect(await prisma.legalAcceptance.count({ where: { userId: f.userId } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { userId: f.userId } })).toBe(1);
  }));
  it("exige confirmação literal e recusa campos de autoridade enviados pelo cliente", async () => fixture(async f => {
    for (const input of [{ ...f.input, accepted: false }, { ...f.input, accepted: undefined }, { ...f.input, documentId: undefined }, { ...f.input, documentHash: undefined }, { ...f.input, documentType: "HEALTH" }, { ...f.input, userId: f.userId }, { ...f.input, representedUserId: f.userId }, { ...f.input, workspaceId: randomUUID() }]) {
      await expect(reacceptOwnDocument(f.userId, input)).rejects.toMatchObject({ status: 400 });
    }
    expect(await prisma.legalAcceptance.count({ where: { userId: f.userId } })).toBe(0);
  }));
  it("recusa hash antigo, ID ou versão diferentes e integridade inválida sem escrita", async () => fixture(async f => {
    for (const input of [{ ...f.input, documentId: randomUUID() }, { ...f.input, documentVersion: "antiga" }, { ...f.input, documentHash: "0".repeat(64) }]) await expect(reacceptOwnDocument(f.userId, input)).rejects.toMatchObject({ status: 409 });
    await prisma.legalDocument.update({ where: { id: f.doc.id }, data: { content: "Conteúdo sintético alterado sem atualização do hash." } });
    await expect(reacceptOwnDocument(f.userId, f.input)).rejects.toMatchObject({ status: 409 });
    expect(await prisma.legalAcceptance.count({ where: { userId: f.userId } })).toBe(0);
    expect(await prisma.auditLog.count({ where: { userId: f.userId } })).toBe(0);
  }));
  it("documento deixa de ser aceitável quando despublicado ou com vigência/publicação futura", async () => fixture(async f => {
    const future = new Date(Date.now() + 86400000);
    for (const data of [{ status: "DRAFT" as const }, { status: "PUBLISHED" as const, publishedAt: future }, { publishedAt: new Date(), effectiveAt: future }]) {
      await prisma.legalDocument.update({ where: { id: f.doc.id }, data });
      await expect(reacceptOwnDocument(f.userId, f.input)).rejects.toMatchObject({ status: 409 });
    }
    expect(await prisma.legalAcceptance.count({ where: { userId: f.userId } })).toBe(0);
  }));
  it("menor não registra aceite próprio mesmo com sessão preexistente", async () => fixture(async f => {
    await prisma.user.update({ where: { id: f.userId }, data: { birthDate: new Date("2013-01-15") } });
    await expect(reacceptOwnDocument(f.userId, f.input)).rejects.toMatchObject({ status: 403 });
    expect(await prisma.legalAcceptance.count({ where: { userId: f.userId } })).toBe(0);
  }));
  it("aceite em representação não dispensa o aceite próprio", async () => fixture(async f => {
    await prisma.legalAcceptance.create({ data: { userId: f.userId, representedUserId: f.userId, documentId: f.doc.id, documentType: f.doc.type, documentVersion: f.doc.version, documentHash: f.doc.contentHash, source: "GUARDIAN_PORTAL" } });
    const result = await reacceptOwnDocument(f.userId, f.input);
    expect(result.alreadyAccepted).toBe(false);
    expect(await prisma.legalAcceptance.count({ where: { userId: f.userId, representedUserId: null } })).toBe(1);
  }));
  it("falha de auditoria reverte o aceite na mesma transação", async () => fixture(async f => {
    const constraint = `test_reaccept_${randomUUID().replaceAll("-", "")}`;
    // Only the explicitly guarded disposable database is modified.
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD CONSTRAINT "${constraint}" CHECK ("action" <> 'USER_LEGAL_REACCEPTED' OR "userId" <> '${f.userId}') NOT VALID`);
    try {
      await expect(reacceptOwnDocument(f.userId, f.input)).rejects.toThrow();
      expect(await prisma.legalAcceptance.count({ where: { userId: f.userId } })).toBe(0);
    } finally { await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DROP CONSTRAINT "${constraint}"`); }
  }));
});
