import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { calculateDocumentHash, LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => prisma.$disconnect());

describe("Conformidade da conta do responsável", () => {
  it("seleciona apenas documentos publicados e vigentes, com ordenação estável", async () => {
    const now = new Date();
    const future = new Date(now.getTime() + 86400000);
    const ids: string[] = [];
    const create = async (effectiveAt: Date, publishedAt: Date, status: "PUBLISHED" | "DRAFT" = "PUBLISHED") => {
      const content = "Documento exclusivamente sintético para teste de vigência.";
      const doc = await prisma.legalDocument.create({ data: { type: "TERMS", title: "Teste sintético", version: randomUUID(), content, contentHash: calculateDocumentHash(content), status, effectiveAt, publishedAt } });
      ids.push(doc.id); return doc;
    };
    try {
      const a = await create(now, now);
      const b = await create(now, now);
      await create(future, now);
      await create(now, future);
      await create(future, future);
      await create(now, now, "DRAFT");
      const selected = await LegalAcceptanceService.getActiveDocument("TERMS");
      expect(selected?.id).toBe([a.id, b.id].sort().at(-1));
    } finally { await prisma.legalDocument.deleteMany({ where: { id: { in: ids } } }); }
  });

  it("aceite em representação e hash antigo não substituem o aceite atual da própria conta", async () => {
    const user = await prisma.user.create({ data: {} });
    const represented = await prisma.user.create({ data: {} });
    const docs = [];
    try {
      for (const type of ["TERMS", "PRIVACY"] as const) {
        const content = `Documento ${type} exclusivamente sintético para teste de conformidade.`;
        docs.push(await prisma.legalDocument.create({ data: { type, title: "Teste sintético", version: randomUUID(), content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(), publishedAt: new Date() } }));
      }
      for (const doc of docs) {
        await prisma.legalAcceptance.create({ data: { userId: user.id, representedUserId: represented.id, documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: doc.contentHash, acceptanceType: "TERMS_ACCEPTED", source: "GUARDIAN_PORTAL" } });
      }
      expect((await LegalAcceptanceService.checkUserCompliance(user.id)).pendingDocuments).toHaveLength(2);
      for (const doc of docs) {
        await prisma.legalAcceptance.create({ data: { userId: user.id, documentId: doc.id, documentType: doc.type, documentVersion: doc.version, documentHash: "0".repeat(64), acceptanceType: "TERMS_ACCEPTED", source: "GUARDIAN_INGRESS" } });
      }
      expect((await LegalAcceptanceService.checkUserCompliance(user.id)).isCompliant).toBe(false);
      // Legacy student onboarding records a self acceptance with workspace context.
      const workspace = await prisma.workspace.create({ data: { ownerId: user.id, name: "Contexto sintético de aceite próprio", slug: randomUUID(), type: "GYM" } });
      try {
        for (const doc of docs) await LegalAcceptanceService.recordAcceptance({ userId: user.id, documentType: doc.type, documentVersion: doc.version, source: "STUDENT_ONBOARDING", workspaceId: workspace.id });
        expect((await LegalAcceptanceService.checkUserCompliance(user.id)).isCompliant).toBe(true);
      } finally {
        await prisma.legalAcceptance.updateMany({ where: { userId: user.id, workspaceId: workspace.id }, data: { workspaceId: null } });
        await prisma.workspace.delete({ where: { id: workspace.id } });
      }
      expect((await LegalAcceptanceService.checkUserCompliance(user.id)).isCompliant).toBe(true);
      const content = docs[0].content + " Revisão sintética com mesmo ID.";
      await prisma.legalDocument.update({ where: { id: docs[0].id }, data: { content, contentHash: calculateDocumentHash(content) } });
      expect((await LegalAcceptanceService.checkUserCompliance(user.id)).pendingDocuments.map(doc => doc.id)).toEqual([docs[0].id]);
    } finally {
      await prisma.legalAcceptance.deleteMany({ where: { userId: user.id } });
      await prisma.legalDocument.deleteMany({ where: { id: { in: docs.map(doc => doc.id) } } });
      await prisma.user.deleteMany({ where: { id: { in: [user.id, represented.id] } } });
    }
  });
});
