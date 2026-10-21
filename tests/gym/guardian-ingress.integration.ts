import { createHash, randomInt, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueGuardianInvitation, getGuardianInvitation, claimGuardianInvitation } from "@/modules/workspaces/application/guardian-ingress";
import { listGuardianDependents } from "@/modules/workspaces/application/guardian-portal";
import { updateGymGuardian, verifyGymGuardian } from "@/modules/workspaces/application/guardian-commands";
import { guardianInvitationInfoSchema } from "@/modules/workspaces/domain/guardian-ingress";
import { calculateDocumentHash } from "@/lib/privacy/legal-acceptance.service";
import { gymInvitationReturn } from "@/lib/auth/invitation-return";

const database = new URL(process.env.DATABASE_URL || "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "56432" || database.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige PostgreSQL descartável específico.");
afterAll(async () => prisma.$disconnect());
function syntheticCpf() {
  const digits = Array.from({ length: 9 }, () => randomInt(10));
  for (const length of [9, 10]) { const check = digits.reduce((sum, digit, i) => sum + digit * (length + 1 - i), 0) * 10 % 11; digits.push(check === 10 ? 0 : check); }
  return digits.join("");
}
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
async function fixture() {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { subscription: { create: { status: "ACTIVE", maxStaff: 30, maxUnits: 5 } }, ownerId: owner.id, type: "GYM", name: "Ingresso sintético", slug: randomUUID(), members: { create: { userId: owner.id, role: "OWNER" } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } });
  const student = await prisma.user.create({ data: { birthDate: new Date("2013-01-15") } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, userId: student.id, role: "STUDENT", isMinor: false, roleGrants: { create: { role: "STUDENT", unitId: unit.id } }, studentProfile: { create: {} } } });
  const guardian = await prisma.gymGuardian.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, name: "Responsável sintético", cpf: syntheticCpf(), email: `parent-${randomUUID()}@example.invalid`, phone: "11900000000", relationship: "MAE" } });
  await verifyGymGuardian(workspace.id, guardian.id, owner.id, "Documentos sintéticos de identidade e representação conferidos na fixture.");
  for (const type of ["TERMS", "PRIVACY"] as const) {
    const content = `Documento ${type} exclusivamente sintético do ingresso.`;
    await prisma.legalDocument.create({ data: { type, version: randomUUID(), title: "Documento sintético", content, contentHash: calculateDocumentHash(content), status: "PUBLISHED", effectiveAt: new Date(), publishedAt: new Date() } });
  }
  return { owner, workspace, unit, student, member, guardian };
}
async function invitation(f: Awaited<ReturnType<typeof fixture>>) {
  const issued = await issueGuardianInvitation(f.workspace.id, f.guardian.id, f.owner.id);
  const token = new URL(issued.invitationPath, "https://example.invalid").searchParams.get("token")!;
  const info = guardianInvitationInfoSchema.parse(await getGuardianInvitation(token));
  const input = { token, mode: "CREATE", cpf: f.guardian.cpf, birthDate: "1990-01-15", password: "senha-sintetica-ingresso", acceptedTerms: true, acceptedPrivacy: true, termsId: info.terms.id, termsHash: info.terms.hash, privacyId: info.privacy.id, privacyHash: info.privacy.hash };
  return { issued, token, info, input };
}
describe("GYM PostgreSQL — ingresso do responsável", () => {
  it("cria somente uma conta adulta e vínculo em consumo concorrente; token é hash, aceites próprios e nenhum papel de equipe", async () => {
    const f = await fixture(); const invite = await invitation(f);
    expect(gymInvitationReturn(invite.issued.invitationPath)).toBe(invite.issued.invitationPath);
    expect(gymInvitationReturn("/guardian/dependents")).toBe("/guardian/dependents");
    for (const route of [invite.issued.invitationPath + "&redirect=https://external.invalid", "//external.invalid", "/guardian/dependents?next=external"]) expect(gymInvitationReturn(route)).toBeNull();
    const stored = await prisma.verificationToken.findUniqueOrThrow({ where: { token: hash(invite.token) } });
    expect(stored.token).not.toBe(invite.token); expect(stored.identifier).not.toContain(f.guardian.cpf);
    expect(stored.expires.getTime() - Date.now()).toBeGreaterThan(47 * 3600000);
    expect(JSON.stringify(invite.info)).not.toMatch(/cpf|student|issuerId|fingerprint|verificationNotes/);
    const results = await Promise.allSettled([claimGuardianInvitation(invite.input), claimGuardianInvitation(invite.input)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { email: f.guardian.email! } });
    expect(user).toMatchObject({ cpfCnpj: f.guardian.cpf, role: "USER", setupToken: null, emailVerified: null });
    expect(await bcrypt.compare(invite.input.password, user.password!)).toBe(true);
    expect(await prisma.workspaceMember.count({ where: { userId: user.id } })).toBe(0);
    expect(await prisma.workspaceRoleGrant.count({ where: { member: { userId: user.id } } })).toBe(0);
    const legal = await prisma.legalAcceptance.findMany({ where: { userId: user.id } });
    expect(legal).toHaveLength(2); expect(legal.every(row => row.representedUserId === null && row.workspaceId === null && row.source === "GUARDIAN_INGRESS")).toBe(true);
    expect((await listGuardianDependents(user.id))[0].guardianId).toBe(f.guardian.id);
    await expect(getGuardianInvitation(invite.token)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.gymEnrollment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(await prisma.gymInvoice.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("não redefine conta existente nem contorna identidade, maioridade ou documentos alterados; vínculo exige login correspondente", async () => {
    const f = await fixture(); const invite = await invitation(f);
    await expect(claimGuardianInvitation({ ...invite.input, birthDate: "2013-01-15" })).rejects.toMatchObject({ statusCode: 403 });
    await expect(claimGuardianInvitation({ ...invite.input, cpf: "52998224725" })).rejects.toMatchObject({ statusCode: 403 });
    await expect(claimGuardianInvitation({ ...invite.input, acceptedTerms: false })).rejects.toMatchObject({ statusCode: 400 });
    const current = await prisma.legalDocument.findUniqueOrThrow({ where: { id: invite.info.terms.id } });
    const content = current.content + " Mudança sintética com mesmo ID.";
    await prisma.legalDocument.update({ where: { id: current.id }, data: { content, contentHash: calculateDocumentHash(content) } });
    await expect(claimGuardianInvitation(invite.input)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.user.count({ where: { email: f.guardian.email } })).toBe(0);
    const updated = await getGuardianInvitation(invite.token);
    const existing = await prisma.user.create({ data: { email: f.guardian.email, cpfCnpj: f.guardian.cpf, birthDate: new Date("1990-01-15"), password: "hash-existente-preservado", sessionVersion: 7, twoFactorSecret: "segredo-preservado", name: "Nome global preservado" } });
    await expect(claimGuardianInvitation({ ...invite.input, termsHash: updated.terms.hash })).rejects.toMatchObject({ statusCode: 409 });
    const { password: _password, cpf: _cpf, birthDate: _birth, ...base } = invite.input;
    const link = { ...base, mode: "LINK", termsHash: updated.terms.hash };
    await expect(claimGuardianInvitation(link)).rejects.toMatchObject({ statusCode: 401 });
    await expect(claimGuardianInvitation(link, f.owner.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.user.update({ where: { id: existing.id }, data: { birthDate: new Date("2013-01-15") } });
    await expect(claimGuardianInvitation(link, existing.id)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.user.update({ where: { id: existing.id }, data: { birthDate: new Date("1990-01-15") } });
    expect(await claimGuardianInvitation(link, existing.id)).toMatchObject({ success: true });
    expect(await prisma.user.findUniqueOrThrow({ where: { id: existing.id } })).toMatchObject({ password: "hash-existente-preservado", sessionVersion: 7, twoFactorSecret: "segredo-preservado", name: "Nome global preservado" });
    expect((await listGuardianDependents(existing.id))[0].guardianId).toBe(f.guardian.id);
  });
  it("reemissão, mudança de contato, expiração, revogação, suspensão, grants e maioridade invalidam convites sem criar contas", async () => {
    const f = await fixture(); const first = await invitation(f); const second = await invitation(f);
    await expect(getGuardianInvitation(first.token)).rejects.toMatchObject({ statusCode: 409 });
    await prisma.verificationToken.update({ where: { token: hash(second.token) }, data: { expires: new Date(Date.now() - 1000) } });
    await expect(claimGuardianInvitation(second.input)).rejects.toMatchObject({ statusCode: 409 });
    const contact = await invitation(f);
    const changedEmail = `changed-${randomUUID()}@example.invalid`;
    await updateGymGuardian({ workspaceId: f.workspace.id, guardianId: f.guardian.id, actorUserId: f.owner.id, email: changedEmail });
    await expect(claimGuardianInvitation(contact.input)).rejects.toMatchObject({ statusCode: 409 });
    await expect(issueGuardianInvitation(f.workspace.id, f.guardian.id, f.owner.id)).rejects.toMatchObject({ statusCode: 409 });
    await verifyGymGuardian(f.workspace.id, f.guardian.id, f.owner.id, "Nova conferência sintética completa realizada.");
    const current = await invitation(f);
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(claimGuardianInvitation(current.input)).rejects.toMatchObject({ statusCode: 403 });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: true } });
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.member.id }, data: { revokedAt: new Date() } });
    await expect(getGuardianInvitation(current.token)).rejects.toMatchObject({ statusCode: 409 });
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: f.member.id }, data: { revokedAt: null } });
    await prisma.user.update({ where: { id: f.student.id }, data: { birthDate: new Date("1990-01-15") } });
    await expect(claimGuardianInvitation(current.input)).rejects.toMatchObject({ statusCode: 409 });
    await prisma.user.update({ where: { id: f.student.id }, data: { birthDate: new Date("2013-01-15") } });
    await prisma.gymGuardian.update({ where: { id: f.guardian.id }, data: { revokedAt: new Date() } });
    await expect(claimGuardianInvitation(current.input)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.user.count({ where: { email: { in: [f.guardian.email!, changedEmail] } } })).toBe(0);
  });
  it("emissão e consulta revalidam operador e unidade; concorrência de reemissão mantém um convite e falha de auditoria desfaz criação e consumo", async () => {
    const f = await fixture();
    const manager = await prisma.user.create({ data: {} });
    const staff = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: manager.id, role: "MANAGER", unitId: f.unit.id, roleGrants: { create: { role: "MANAGER", unitId: f.unit.id } } } });
    const issued = await issueGuardianInvitation(f.workspace.id, f.guardian.id, manager.id);
    const token = new URL(issued.invitationPath, "https://example.invalid").searchParams.get("token")!;
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: staff.id }, data: { revokedAt: new Date() } });
    await expect(getGuardianInvitation(token)).rejects.toMatchObject({ statusCode: 403 });
    await expect(issueGuardianInvitation(f.workspace.id, f.guardian.id, manager.id)).rejects.toMatchObject({ statusCode: 403 });
    const invitations = await Promise.all([issueGuardianInvitation(f.workspace.id, f.guardian.id, f.owner.id), issueGuardianInvitation(f.workspace.id, f.guardian.id, f.owner.id)]);
    const active = await Promise.allSettled(invitations.map(row => getGuardianInvitation(new URL(row.invitationPath, "https://example.invalid").searchParams.get("token")!)));
    expect(active.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const invite = await invitation(f);
    await prisma.gymUnit.update({ where: { id: f.unit.id }, data: { isActive: false } });
    await expect(claimGuardianInvitation(invite.input)).rejects.toMatchObject({ statusCode: 403, code: "TENANT_MISMATCH" });
    await prisma.gymUnit.update({ where: { id: f.unit.id }, data: { isActive: true } });
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ADD CONSTRAINT "guardian_ingress_test_rollback" CHECK ("action" NOT LIKE 'GYM_GUARDIAN_INVITATION_CLAIMED:%') NOT VALID`);
    try { await expect(claimGuardianInvitation(invite.input)).rejects.toThrow(); }
    finally { await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DROP CONSTRAINT "guardian_ingress_test_rollback"`); }
    expect(await prisma.user.count({ where: { email: f.guardian.email } })).toBe(0);
    expect(await prisma.verificationToken.count({ where: { token: hash(invite.token) } })).toBe(1);
    expect((await prisma.gymGuardian.findUniqueOrThrow({ where: { id: f.guardian.id } })).guardianUserId).toBeNull();
    expect(await claimGuardianInvitation(invite.input)).toMatchObject({ success: true });
  });
});
