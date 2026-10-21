import { randomUUID, createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { issueStudentInvitation, getStudentInvitationInfo, completeStudentInvitation } from "@/modules/workspaces/application/gym-student-ingress";
import { gymStudentService } from "@/modules/workspaces/application/gym-student-service";
import { GymImportService } from "@/modules/workspaces/application/gym-import-service";
import { getPasswordSetupInfo } from "@/lib/auth/password-setup-service";
import { processDelivery } from "@/lib/delivery/outbox";
import { deliveryHandler } from "@/lib/delivery/worker";
import { decryptSubAccountApiKey } from "@/modules/payments/providers/asaas/subaccount-crypto";
import { resend } from "@/lib/resend";
const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || !(target.pathname === "/atlasfit_gym_stabilization_20261001" || (process.env.GYM_FINAL_SCHEMA_TEST === "1" && /^\/atlasfit_completion_tests_[a-f0-9]+$/.test(target.pathname)))) throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });
beforeAll(async()=>{for(const type of ["TERMS","PRIVACY"] as const) if(!await prisma.legalDocument.count({where:{type,status:"PUBLISHED",effectiveAt:{lte:new Date()},publishedAt:{lte:new Date()}}})) {
 const content="Documento sintético para a jornada de ingresso; sem validade jurídica operacional.";
 await prisma.legalDocument.create({data:{type,status:"PUBLISHED",version:"TEST-"+randomUUID(),title:"Synthetic",content,contentHash:createHash("sha256").update(content).digest("hex"),publishedAt:new Date(Date.now()-1000),effectiveAt:new Date(Date.now()-1000)}});
}});
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
async function fixture() {
  const owner = await prisma.user.create({ data: { password: await bcrypt.hash("senha-sintetica", 10), birthDate: new Date("1990-01-15"), email: `${randomUUID()}@example.invalid` } });
  const workspace = await prisma.workspace.create({ data: { name: "Ingresso sintético", slug: randomUUID(), type: "GYM", ownerId: owner.id, members: { create: { userId: owner.id, role: "OWNER" } }, subscription: { create: { status: "ACTIVE", maxStudents: 20 } } } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } });
  const base = { workspaceId: workspace.id, actorUserId: owner.id, unitId: unit.id, name: "Aluno sintético", email: `${randomUUID()}@example.invalid`, cpfCnpj: "52998224725", birthDate: "1990-01-15", idempotencyKey: randomUUID() };
  // Avoid globally duplicated identifiers in normal registration; persisted CPF
  // is set afterwards solely for this isolated synthetic setup fixture.
  const student = await gymStudentService.registerStudent({ ...base, cpfCnpj: undefined });
  await prisma.user.update({ where: { id: student.userId }, data: { cpfCnpj: base.cpfCnpj } });
  const principal = { id: owner.id, sessionVersion: owner.sessionVersion };
  const issue = (requestKey = randomUUID(), delivery: "MANUAL_LINK" | "EMAIL" = "MANUAL_LINK") => issueStudentInvitation(principal, student.memberId, { workspaceId: workspace.id, requestKey, confirmed: true, delivery });
  return { owner, workspace, unit, student, principal, base, issue };
}
async function tokenOf(f: Awaited<ReturnType<typeof fixture>>) { const issued = await f.issue(); if (issued.delivery !== "MANUAL_LINK") throw new Error("Link manual esperado."); return new URL(issued.invitationPath, "http://127.0.0.1").searchParams.get("token")!; }
async function claim(token: string, extra: Record<string, unknown> = {}) { const shown = await getStudentInvitationInfo(token); return { token, password: "nova-senha-sintetica", acceptedTerms: true, acceptedPrivacy: true, termsDocumentId: shown.termsDocumentId, privacyDocumentId: shown.privacyDocumentId, termsDocumentHash: shown.termsDocumentHash, privacyDocumentHash: shown.privacyDocumentHash, ...extra }; }

describe("GYM PostgreSQL — ingresso adulto e convite", () => {
  it("uma edição sob o mesmo ID exige nova leitura e não consome o convite nem atribui o aceite", async () => {
    const f=await fixture(),token=await tokenOf(f),input=await claim(token);
    const content="Novo conteúdo sintético posterior à leitura do aluno.";
    await prisma.legalDocument.update({where:{id:input.privacyDocumentId},data:{content,contentHash:hash(content)}});
    await expect(completeStudentInvitation(input)).rejects.toMatchObject({statusCode:409});
    expect(await prisma.verificationToken.findUnique({where:{token:hash(token)}})).not.toBeNull();
    expect(await prisma.user.findUniqueOrThrow({where:{id:f.student.userId}})).toMatchObject({password:null});
    expect(await prisma.legalAcceptance.count({where:{userId:f.student.userId}})).toBe(0);
    expect(await completeStudentInvitation(await claim(token))).toMatchObject({success:true});
  });
  it("guarda apenas hash, consome uma vez, registra aceite próprio e conserva matrícula/identidade sem criar trial ou pagamento", async () => {
    const f = await fixture(), token = await tokenOf(f), input = await claim(token);
    expect(await prisma.verificationToken.findUnique({ where: { token } })).toBeNull(); expect(await prisma.verificationToken.findUnique({ where: { token: hash(token) } })).not.toBeNull();
    expect(await prisma.user.findUnique({ where: { id: f.student.userId } })).toMatchObject({ password: null, setupToken: null, role: "USER", sessionVersion: 1 });
    await expect(completeStudentInvitation({ ...input, acceptedTerms: false })).rejects.toMatchObject({ statusCode: 400 });
    await expect(completeStudentInvitation(input, f.owner.id)).rejects.toMatchObject({ statusCode: 403 });
    const concurrent = await Promise.allSettled([completeStudentInvitation(input), completeStudentInvitation(input)]); expect(concurrent.filter(row => row.status === "fulfilled")).toHaveLength(1);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: f.student.userId } }); expect(user.role).toBe("USER"); expect(user.sessionVersion).toBe(2); expect(await bcrypt.compare(input.password, user.password!)).toBe(true);
    expect(await prisma.legalAcceptance.count({ where: { userId: user.id, source: "GYM_STUDENT_INGRESS" } })).toBe(2);
    expect(await prisma.workspaceMember.findUnique({ where: { id: f.student.memberId } })).toMatchObject({ isActive: true, role: "STUDENT", workspaceId: f.workspace.id });
    expect(await prisma.freeTrial.findUnique({ where: { userId: user.id } })).toBeNull(); expect(await prisma.gymPayment.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    expect(JSON.stringify(await prisma.auditLog.findMany({ where: { entityId: f.workspace.id } }))).not.toContain(token);
    await expect(getStudentInvitationInfo(token)).rejects.toMatchObject({ statusCode: 409 });
  });

  it("reemissão cancela link e setup legado; contas com senha conservam credenciais e suporte não emite", async () => {
    const f = await fixture(), old = await tokenOf(f), fresh = await tokenOf(f); await expect(getStudentInvitationInfo(old)).rejects.toMatchObject({ statusCode: 409 });
    expect((await getStudentInvitationInfo(fresh)).success).toBe(true);
    await expect(issueStudentInvitation({ ...f.principal, isImpersonated: true }, f.student.memberId, { workspaceId: f.workspace.id, confirmed: true, delivery: "MANUAL_LINK", requestKey: randomUUID() })).rejects.toMatchObject({ statusCode: 403 });
    const password = await bcrypt.hash("senha-existente", 10); await prisma.user.update({ where: { id: f.student.userId }, data: { password } });
    expect(await f.issue()).toMatchObject({ delivery: "LOGIN_OWN", loginPath: "/auth/student" }); expect((await prisma.user.findUniqueOrThrow({ where: { id: f.student.userId } })).password).toBe(password);
    const legacy = await fixture(), raw = randomUUID(); await prisma.user.update({ where: { id: legacy.student.userId }, data: { setupToken: raw, setupTokenExpiresAt: null } });
    expect(await getPasswordSetupInfo(raw)).toHaveProperty("error"); const revived = await tokenOf(legacy); expect((await getStudentInvitationInfo(revived)).success).toBe(true); expect(await prisma.user.findUnique({ where: { id: legacy.student.userId } })).toMatchObject({ setupToken: null, setupTokenExpiresAt: null });
  });

  it("escopo, grants, versão, prazo, suspensão e menoridade são revalidados antes do consumo", async () => {
    const foreign = await fixture(), f = await fixture();
    await expect(issueStudentInvitation(f.principal, foreign.student.memberId, { workspaceId: f.workspace.id, confirmed: true, delivery: "MANUAL_LINK", requestKey: randomUUID() })).rejects.toMatchObject({ statusCode: 404 });
    let token = await tokenOf(f); await prisma.user.update({ where: { id: f.owner.id }, data: { sessionVersion: { increment: 1 } } }); await expect(getStudentInvitationInfo(token)).rejects.toMatchObject({ statusCode: 409 });
    const active = await fixture(); token = await tokenOf(active); await prisma.workspaceRoleGrant.updateMany({ where: { memberId: active.student.memberId }, data: { revokedAt: new Date() } }); await expect(getStudentInvitationInfo(token)).rejects.toThrow();
    const expired = await fixture(); token = await tokenOf(expired); await prisma.verificationToken.update({ where: { token: hash(token) }, data: { expires: new Date(Date.now() - 1) } }); await expect(getStudentInvitationInfo(token)).rejects.toMatchObject({ statusCode: 409 });
    const suspended = await fixture(); token = await tokenOf(suspended); await prisma.workspace.update({ where: { id: suspended.workspace.id }, data: { isActive: false } }); await expect(getStudentInvitationInfo(token)).rejects.toMatchObject({ statusCode: 403 });
    const minor = await fixture(); await prisma.user.update({ where: { id: minor.student.userId }, data: { birthDate: new Date("2013-01-15") } }); await expect(minor.issue()).rejects.toMatchObject({ statusCode: 403 });
  });

  it("cadastro sem e-mail exige contato próprio; legado sem nascimento exige adulto e documentos atuais", async () => {
    const f = await fixture(); await prisma.user.update({ where: { id: f.student.userId }, data: { email: null, birthDate: null } }); const token = await tokenOf(f), input = await claim(token);
    expect(await getStudentInvitationInfo(token)).toMatchObject({ needsEmail: true, needsBirthDate: true });
    await expect(completeStudentInvitation(input)).rejects.toMatchObject({ statusCode: 400 });
    await expect(completeStudentInvitation({ ...input, birthDate: "2013-01-15", email: `${randomUUID()}@example.invalid` })).rejects.toMatchObject({ statusCode: 400 });
    await expect(completeStudentInvitation({ ...input, birthDate: "1990-01-15", email: f.owner.email })).rejects.toMatchObject({ statusCode: 409 });
    await expect(completeStudentInvitation({ ...input, birthDate: "1990-01-15", email: `${randomUUID()}@example.invalid`, termsDocumentId: randomUUID() })).rejects.toMatchObject({ statusCode: 409 });
    const email = `${randomUUID()}@example.invalid`; expect(await completeStudentInvitation({ ...input, birthDate: "1990-01-15", email })).toEqual({ success: true }); expect(await prisma.user.findUnique({ where: { id: f.student.userId } })).toMatchObject({ email, birthDate: new Date("1990-01-15") });
  });

  it("fila cifrada é idempotente; worker envia com recibo e ignora convite revogado antes do envio", async () => {
    const old = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM };
    process.env.RESEND_API_KEY = "synthetic-unit-key"; process.env.EMAIL_FROM = "synthetic@example.invalid";
    const send = vi.spyOn(resend.emails, "send").mockResolvedValue({ data: { id: "synthetic-receipt" }, error: null, headers: null } as any);
    try {
      const f = await fixture(), requestKey = randomUUID(), first = await f.issue(requestKey, "EMAIL"), repeat = await f.issue(requestKey, "EMAIL"); expect(repeat).toEqual(first); if (first.delivery !== "EMAIL") throw new Error("Fila esperada.");
      const job = await prisma.deliveryOutbox.findUniqueOrThrow({ where: { id: first.deliveryId } }); const payload = JSON.parse(decryptSubAccountApiKey(job.payloadEncrypted!)); expect(job.payloadEncrypted).not.toContain("gym_"); expect(payload.to).toBe(f.base.email);
      expect(await processDelivery(job.id, deliveryHandler)).toMatchObject({ status: "SENT" }); expect(send).toHaveBeenCalledTimes(1); expect(send.mock.calls[0][0]).not.toHaveProperty("guard"); expect(send.mock.calls[0][1]).toEqual({ idempotencyKey: `outbox/${job.id}` });
      const canceled = await f.issue(randomUUID(), "EMAIL"); if (canceled.delivery !== "EMAIL") throw new Error("Fila esperada."); await tokenOf(f); expect(await processDelivery(canceled.deliveryId, deliveryHandler)).toMatchObject({ status: "SKIPPED" }); expect(send).toHaveBeenCalledTimes(1);
    } finally { send.mockRestore(); if (old.key === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = old.key; if (old.from === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = old.from; }
  });

  it("adulto importado usa o mesmo ingresso sem ativar contrato pendente ou emitir cobrança externa", async () => {
    const f = await fixture(), email = `${randomUUID()}@example.invalid`;
    const plan = await prisma.gymPlan.create({ data: { workspaceId: f.workspace.id, name: "Plano importado" } }); await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt(10000), durationDays: 30, termsText: "Contrato sintético" } });
    const base = { workspaceId: f.workspace.id, unitId: f.unit.id, actorUserId: f.owner.id }, csvContent = `Nome;Email;Data_Nascimento;Plano\nAluno importado;${email};1990-01-15;${plan.name}`;
    const preview = await GymImportService.previewImport({ ...base, csvContent }); await GymImportService.commitImport({ ...base, previewId: preview.previewId, importBatchHash: preview.importBatchHash });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } }); await prisma.user.update({ where: { id: user.id }, data: { cpfCnpj: "12345678909" } }); const member = await prisma.workspaceMember.findUniqueOrThrow({ where: { userId_workspaceId: { userId: user.id, workspaceId: f.workspace.id } } });
    const issued = await issueStudentInvitation(f.principal, member.id, { workspaceId: f.workspace.id, confirmed: true, delivery: "MANUAL_LINK", requestKey: randomUUID() }); if (issued.delivery !== "MANUAL_LINK") throw new Error("Link esperado."); const token = new URL(issued.invitationPath, "http://127.0.0.1").searchParams.get("token")!;
    expect(await completeStudentInvitation(await claim(token))).toEqual({ success: true }); expect(await prisma.gymEnrollment.findFirst({ where: { workspaceId: f.workspace.id, studentMemberId: member.id } })).toMatchObject({ status: "PENDING_ACCEPTANCE", accessGranted: false }); expect(await prisma.studentBilling.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
});
