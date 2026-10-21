import "./guardian-visual.fixture";
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { createGymEnrollment } from "@/modules/workspaces/application/enrollment-creation";
import { issueCredentialProof } from "@/lib/auth/credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { LegalAcceptanceService } from "@/lib/privacy/legal-acceptance.service";
import { reacceptOwnDocument } from "@/lib/privacy/reacceptance";

it("prepara contratos e conciliação somente para revisão visual sintética", async () => {
  const f = JSON.parse(readFileSync(".tmp/gym-stabilization/guardian-visual-fixture.json", "utf8"));
  const unit = await prisma.gymUnit.findFirstOrThrow({ where: { workspaceId: f.workspaceId } });
  const adult = await prisma.user.create({ data: { name: "Aluno adulto visual do passo 3", email: `contract-${randomUUID()}@example.invalid`, birthDate: new Date("1990-01-15"), password: await bcrypt.hash(f.password, 10), twoFactorEnabled: false } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspaceId, unitId: unit.id, userId: adult.id, role: "STUDENT", studentProfile: { create: { registrationNumber: randomUUID() } } } });
  const plans = [];
  for (const [index, name] of ["Plano atual visual", "Plano novo visual"].entries()) plans.push(await prisma.gymPlan.create({ data: { workspaceId: f.workspaceId, name, versions: { create: { version: 1, name, priceInCents: BigInt(index ? 15000 : 10000), durationDays: 365, termsText: `Condições comerciais sintéticas do ${name}. Direitos e obrigações registrados separadamente.` } } }, include: { versions: true } }));
  const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspaceId, unitId: unit.id, studentMemberId: member.id, planVersionId: plans[0].versions[0].id, status: "ACTIVE", accessGranted: true, activatedAt: new Date(), priceInCents: BigInt(10000), cycleCount: 1, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 365 * 86400000), acceptance: { create: { workspaceId: f.workspaceId, signerUserId: adult.id, termsSnapshot: "Contrato anterior sintético preservado", termsVersion: "1" } } } });
  const legacy = await prisma.gymEnrollment.create({ data: { workspaceId: f.workspaceId, unitId: unit.id, studentMemberId: member.id, planVersionId: plans[0].versions[0].id, status: "CANCELLED", priceInCents: BigInt(10000), cycleCount: 1, providerSubscriptionId: `synthetic-visual-sub-${randomUUID()}`, recurrenceMode: "PROVIDER", subscriptionStatus: "ACTIVE" } });
  await prisma.gymGuardian.update({ where: { id: f.linked.id }, data: { isLegalRepresentative: true, isFinancialResponsible: true } });
  const minor = await createGymEnrollment({ workspaceId: f.workspaceId, actorUserId: f.owner.id, studentMemberId: f.memberId, planVersionId: plans[0].versions[0].id, unitId: unit.id, billingPayerGuardianId: f.linked.id });
  const account = await prisma.gymFinancialAccount.create({ data: { workspaceId: f.workspaceId, unitId: unit.id, name: "Conta da conciliação visual", accountType: "BANK_ACCOUNT", initialBalanceInCents: BigInt(500), balanceInCents: BigInt(0) } });
  for (const documentType of ["TERMS", "PRIVACY"] as const) await LegalAcceptanceService.recordAcceptance({ userId: adult.id, documentType, source: "SYNTHETIC_VISUAL_FIXTURE" });
  for (const userId of [f.owner.id, f.parent.id, adult.id]) for (const documentType of ["TERMS", "PRIVACY"] as const) {
    const now = new Date(); const document = await prisma.legalDocument.findFirstOrThrow({ where: { type: documentType, status: "PUBLISHED", publishedAt: { lte: now }, effectiveAt: { lte: now } }, orderBy: [{ effectiveAt: "desc" }, { publishedAt: "desc" }, { id: "desc" }] });
    await reacceptOwnDocument(userId, { documentType, documentId: document.id, documentVersion: document.version, documentHash: document.contentHash, accepted: true });
  }
  const proofs: Record<string, string> = {};
  for (const userId of [f.owner.id, f.parent.id, adult.id]) { const policy = await resolveAuthenticationPolicy(userId); if (!policy) throw Error("Política sintética indisponível."); proofs[userId] = await issueCredentialProof(userId, policy.user.password || "", authenticationPolicyKey(policy)); }
  writeFileSync(".tmp/gym-stabilization/contract-visual-fixture.json", JSON.stringify({ ...f, adult: { id: adult.id, email: adult.email, name: adult.name }, adultMemberId: member.id, unitId: unit.id, originalEnrollmentId: enrollment.id, legacyId: legacy.id, minorEnrollmentId: minor.id, accountId: account.id, proofs }));
});
