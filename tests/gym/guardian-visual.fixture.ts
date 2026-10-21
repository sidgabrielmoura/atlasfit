import { randomInt, randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { calculateDocumentHash, LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { issueGuardianInvitation } from "@/modules/workspaces/application/guardian-ingress";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Fixture visual exige PostgreSQL descartável específico.");
afterAll(async () => prisma.$disconnect());
it("prepara exclusivamente a fixture sintética da revisão no navegador", async () => {
  const password = "senha-visual-sintetica";
  const account = (name: string) => prisma.user.create({ data: { name, email: `visual-${randomUUID()}@example.invalid`, password: bcrypt.hashSync(password, 10), birthDate: new Date("1990-01-15"), twoFactorEnabled: false } });
  const owner = await account("Operador visual sintético");
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, name: "Academia de teste visual", slug: randomUUID(), type: "GYM", members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE", maxStudents: 20 } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade de teste" } });
  const student = await prisma.user.create({ data: { name: "Dependente visual sintético", birthDate: new Date("2013-01-15") } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: student.id, role: "STUDENT", unitId: unit.id, isMinor: true, roleGrants: { create: { role: "STUDENT", unitId: unit.id } }, studentProfile: { create: { registrationNumber: `VISUAL-${randomUUID().slice(0, 8)}` } } } });
  function cpf() {
    const digits = Array.from({ length: 9 }, () => randomInt(10));
    for (const length of [9, 10]) { const check = digits.reduce((sum, digit, i) => sum + digit * (length + 1 - i), 0) * 10 % 11; digits.push(check === 10 ? 0 : check); }
    return digits.join("");
  }
  const parentCpf = cpf();
  const pending = await prisma.gymGuardian.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, name: "Responsável para ativação visual", cpf: parentCpf, email: `visual-parent-${randomUUID()}@example.invalid`, phone: "11900000000", relationship: "MAE", verifiedAt: new Date(), verificationNotes: "Conferência exclusivamente sintética de identidade e representação." } });
  const parent = await account("Responsável visual já cadastrado");
  const secondCpf = cpf(); await prisma.user.update({ where: { id: parent.id }, data: { cpfCnpj: secondCpf } });
  const linked = await prisma.gymGuardian.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, guardianUserId: parent.id, name: parent.name!, cpf: secondCpf, email: parent.email, phone: "11900000001", relationship: "PAI", verifiedAt: new Date(), verificationNotes: "Conferência exclusivamente sintética." } });
  const amount = BigInt("9007199254740993");
  await prisma.gymInvoice.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, studentUserId: student.id, invoiceNumber: randomUUID(), title: "Mensalidade sintética de precisão", dueDate: new Date("2026-09-15"), subtotalInCents: amount, totalInCents: amount, balanceRemainingInCents: amount, payerName: pending.name, createdByUserId: owner.id } });
  for (const type of ["TERMS", "PRIVACY"] as const) {
    const content = `Documento ${type} exclusivamente sintético para revisão visual.\n\n` + "Conteúdo de teste de leitura, rolagem e confirmação. ".repeat(100);
    await prisma.legalDocument.create({ data: { type, title: type === "TERMS" ? "Termos sintéticos de revisão visual" : "Privacidade sintética de revisão visual", version: `VISUAL-${randomUUID().slice(0, 8)}`, content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", publishedAt: new Date(), effectiveAt: new Date() } });
  }
  const invite = await issueGuardianInvitation(workspace.id, pending.id, owner.id);
  for (const user of [owner, parent]) {
    for (const documentType of ["TERMS", "PRIVACY"] as const) await LegalAcceptanceService.recordAcceptance({ userId: user.id, documentType, source: "SYNTHETIC_VISUAL_FIXTURE" });
  }
  const proofs: Record<string, string> = {};
  for (const user of [owner, parent]) {
    const policy = await resolveAuthenticationPolicy(user.id); if (!policy) throw Error("Fixture sem política de autenticação.");
    proofs[user.id] = await issueCredentialProof(user.id, user.password!, authenticationPolicyKey(policy));
  }
  writeFileSync(".tmp/gym-stabilization/guardian-visual-fixture.json", JSON.stringify({ owner: { id: owner.id, email: owner.email }, parent: { id: parent.id, email: parent.email }, pending: { id: pending.id, cpf: parentCpf, email: pending.email }, linked: { id: linked.id }, memberId: member.id, workspaceId: workspace.id, invitationPath: invite.invitationPath, password, proofs }));
});
