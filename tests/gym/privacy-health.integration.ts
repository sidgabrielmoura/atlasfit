import { afterAll, describe, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import prisma from "@/lib/prisma";
import { saveGymHealthProfile, readGymHealthProfile } from "@/modules/workspaces/application/gym-health-profile";
import { issueGymIdentityLink, acceptGymIdentityLink, readGymIdentityLink } from "@/modules/workspaces/application/gym-identity-link";
import { resolveGymIdentityLookup } from "@/modules/workspaces/application/gym-identity-lookup";
import { gymStudentService } from "@/modules/workspaces/application/gym-student-service";
import { submitGymPrivacyRequest, processGymPrivacyRequest, listGymPrivacyRequests } from "@/modules/workspaces/application/gym-privacy-requests";
import { exportGymDataSubject } from "@/modules/workspaces/application/privacy-service";
import { transitionGymMajority } from "@/modules/workspaces/application/gym-majority-transition";
import { authorizeGymStudent } from "@/modules/workspaces/application/student-authority";
import { storageService } from "@/lib/storage.service";
import { recordGymProgress } from "@/modules/workspaces/application/gym-progress-commands";
import { DataExportService } from "@/lib/privacy/export.service";
import { ErasureService } from "@/lib/privacy/erasure.service";
import { gymAssessmentService } from "@/modules/workspaces/application/gym-assessment-service";
import { redactPrivateText, redactLogValue } from "@/lib/privacy/log-redaction";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { saveGymDailyFeedback, recordGymWorkoutCompletion } from "@/modules/workspaces/application/gym-student-health-events";
import { assertGuardianPrivacyAuthority } from "@/modules/workspaces/application/guardian-privacy";
import { authorizeStorageRead } from "@/lib/storage-access";
import { gymInvitationReturn } from "@/lib/auth/invitation-return";
const db = new URL(process.env.DATABASE_URL || "http://invalid");
if (db.hostname !== "127.0.0.1" || db.port !== "56432" || db.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => prisma.$disconnect());
async function fixture() {
  const owner = await prisma.user.create({ data: { name: "Gestão sintética", email: `${randomUUID()}@example.invalid` } });
  const student = await prisma.user.create({ data: { name: "Titular sintético", email: `${randomUUID()}@example.invalid`, birthDate: new Date("1990-01-15"), password: "SEGREDO_AUTENTICACAO", medicalConditions: "SAUDE_GLOBAL_PRIVADA", weight: 99 } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, type: "GYM", name: "Privacidade sintética", slug: randomUUID(), subscription: { create: { status: "ACTIVE", maxStudents: 30, maxUnits: 5, maxStaff: 30 } } } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, unitId: unit.id, userId: student.id, role: "STUDENT", studentProfile: { create: { registrationNumber: randomUUID() } } } });
  const reception = await prisma.user.create({ data: {} }); await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: reception.id, role: "RECEPTIONIST", unitId: unit.id } });
  const trainer = await prisma.user.create({ data: {} }); const trainerMember = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: trainer.id, role: "TRAINER", unitId: unit.id } });
  return { owner, student, workspace, unit, member, reception, trainer, trainerMember };
}
const retain = () => ({ action: "RETAIN" as const, reason: "Retenção sintética sujeita a revisão pelo controlador", reviewAt: new Date(Date.now() + 86400000).toISOString() });
const decision = () => ({ health: { action: "DELETE" as const, reason: "Eliminação autorizada dos dados locais de saúde" }, training: { action: "DELETE" as const, reason: "Eliminação autorizada do histórico local de treino" }, files: { action: "DELETE" as const, reason: "Eliminação autorizada dos arquivos locais" }, membership: retain(), contractsAndFinance: retain(), legalAndAudit: retain(), communications: retain(), globalIdentityAndOtherControllers: retain() });
const requestInput = (f: Awaited<ReturnType<typeof fixture>>, type: "DELETION" | "ACCESS" | "INFORMATION" = "DELETION", self = true) => ({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: self ? f.student.id : f.owner.id, type });
describe("Privacidade e saúde — controlador local", () => {
  it("retorno do login aceita somente páginas locais esperadas sem destinos adicionais", () => {
    const path = "/account/gym-link?requestId=synthetic&token=" + "a".repeat(64);
    expect(gymInvitationReturn(path)).toBe(path);
    expect(gymInvitationReturn("/account/gym-privacy?workspaceId=synthetic")).toBe("/account/gym-privacy?workspaceId=synthetic");
    for (const input of [path + "&next=https://outside.invalid", "//outside.invalid", "/account/gym-link?requestId=synthetic&token=invalid", "/account/gym-privacy?workspaceId=synthetic&next=outside"]) expect(gymInvitationReturn(input)).toBeNull();
  });
  it("direitos continuam após desligamento e licença encerrada; exportação espontânea permanece bloqueada", async () => {
    const f = await fixture();
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { isActive: false } });
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { status: "CANCELED" } });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    const request = await submitGymPrivacyRequest(requestInput(f, "ACCESS"));
    await processGymPrivacyRequest(f.workspace.id, request.id, f.owner.id, { action: "START_REVIEW" });
    expect((await listGymPrivacyRequests(f.workspace.id, f.owner.id)).total).toBe(1);
    expect((await exportGymDataSubject({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id, requestId: request.id })).exportMetadata.requestId).toBe(request.id);
    await expect(exportGymDataSubject({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id })).rejects.toMatchObject({ statusCode: 403 });
  });
  it("representante legal conferido solicita direitos; poder financeiro isolado e maioridade não autorizam", async () => {
    const f = await fixture();
    await prisma.user.update({ where: { id: f.student.id }, data: { birthDate: new Date("2013-01-15") } });
    const parent = await prisma.user.create({ data: { cpfCnpj: "52998224725", birthDate: new Date("1990-01-15") } });
    const guardian = await prisma.gymGuardian.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.member.id, guardianUserId: parent.id, name: "Representante sintético", cpf: "52998224725", phone: "11900000000", relationship: "MAE", verifiedAt: new Date(), isLegalRepresentative: true, hasHealthAccess: true } });
    const input = { ...requestInput(f, "ACCESS"), guardianId: guardian.id, actorUserId: parent.id };
    const request = await submitGymPrivacyRequest(input); expect(request.status).toBe("PENDING");
    expect(await readGymHealthProfile(f.workspace.id, f.member.id, parent.id)).toMatchObject({ intake: {} });
    await prisma.gymGuardian.update({ where: { id: guardian.id }, data: { isLegalRepresentative: false } });
    expect((await listGymPrivacyRequests(f.workspace.id, f.owner.id)).requests.find(row => row.id === request.id)?.identityVerified).toBe(false);
    await processGymPrivacyRequest(f.workspace.id, request.id, f.owner.id, { action: "START_REVIEW" });
    await expect(exportGymDataSubject({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id, requestId: request.id })).rejects.toMatchObject({ statusCode: 403 });
    await expect(submitGymPrivacyRequest({ ...input, type: "INFORMATION" })).rejects.toMatchObject({ statusCode: 403 });
    await prisma.gymGuardian.update({ where: { id: guardian.id }, data: { isLegalRepresentative: true } });
    await prisma.user.update({ where: { id: f.student.id }, data: { birthDate: new Date("1990-01-15") } });
    await expect(serializableTransaction(tx => assertGuardianPrivacyAuthority(tx, f.workspace.id, guardian.id, parent.id))).rejects.toMatchObject({ statusCode: 403 });
  });
  it("bloqueio de tratamento alcança feedback, execução e leitura de arquivos por suporte", async () => {
    const f = await fixture(); await saveGymDailyFeedback(f.workspace.id, f.member.id, f.student.id, { energy: 50, fatigue: 20, humor: 80 });
    await prisma.gymStudentProfile.update({ where: { memberId: f.member.id }, data: { privacyRestrictedAt: new Date() } });
    await expect(saveGymDailyFeedback(f.workspace.id, f.member.id, f.student.id, { energy: 60, fatigue: 20, humor: 80 })).rejects.toMatchObject({ statusCode: 409 });
    await expect(recordGymWorkoutCompletion(f.workspace.id, f.member.id, f.student.id, { workoutId: "unavailable" })).rejects.toMatchObject({ statusCode: 409 });
    const admin = await prisma.user.create({ data: { role: "SUPERADMIN" } });
    await expect(authorizeStorageRead(`workspace/${f.workspace.id}/students/${f.student.id}/progress/test.jpg`, admin.id)).rejects.toMatchObject({ statusCode: 409 });
    expect(await prisma.dailyFeedback.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
  });
  it("retomada exige novo pedido, finalidade, fundamento e evidência; não reconstitui dados eliminados", async () => {
    const f = await fixture(); const request = await submitGymPrivacyRequest(requestInput(f));
    await processGymPrivacyRequest(f.workspace.id, request.id, f.owner.id, { action: "DECIDE_DELETION", response: "Resposta sintética com retenções detalhadas", decision: decision() });
    const next = await submitGymPrivacyRequest({ ...requestInput(f), type: "OTHER", notes: "Solicito retomar o tratamento local para novo atendimento." });
    const command = { action: "RESOLVE", response: "Nova finalidade conferida e atendimento autorizado", outcome: "COMPLETED", resumeTreatment: { purpose: "Novo acompanhamento solicitado pelo titular", legalBasis: "Fundamento conferido pelo controlador sintético", evidenceReference: "Referência sintética de nova solicitação verificada" } };
    await expect(processGymPrivacyRequest(f.workspace.id, next.id, f.owner.id, command)).rejects.toMatchObject({ statusCode: 409 });
    await processGymPrivacyRequest(f.workspace.id, next.id, f.owner.id, { action: "START_REVIEW" });
    await processGymPrivacyRequest(f.workspace.id, next.id, f.owner.id, command);
    expect((await prisma.gymStudentProfile.findUniqueOrThrow({ where: { memberId: f.member.id } })).privacyRestrictedAt).toBeNull();
    expect(await prisma.auditLog.count({ where: { entityId: f.member.id, action: "GYM_PRIVACY_TREATMENT_RESUMED" } })).toBe(1);
  });
  it("avaliação com anexo de marca não pode exportar nem excluir o objeto; decisão permanece intacta", async () => {
    const f = await fixture(); const key = `workspace/${f.workspace.id}/logos/brand.png`;
    await prisma.physicalEvaluation.create({ data: { workspaceId: f.workspace.id, studentId: f.student.id, type: "POSTURAL", weight: 70, height: 170, postural: { url: `/api/storage/file?key=${encodeURIComponent(key)}` } } });
    const request = await submitGymPrivacyRequest(requestInput(f));
    await expect(processGymPrivacyRequest(f.workspace.id, request.id, f.owner.id, { action: "DECIDE_DELETION", response: "Resposta sintética com retenção justificada", decision: decision() })).rejects.toMatchObject({ statusCode: 409 });
    await expect(exportGymDataSubject({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id })).rejects.toMatchObject({ statusCode: 409 });
    expect((await prisma.gymStudentProfile.findUniqueOrThrow({ where: { memberId: f.member.id } })).privacyRestrictedAt).toBeNull();
  });
  it("anamnese e medidas são locais; nunca copia nem altera saúde global ou de outro controlador", async () => {
    const f = await fixture(); const other = await fixture();
    await saveGymHealthProfile(f.workspace.id, f.member.id, f.student.id, { medicalConditions: "SAUDE_LOCAL", weight: 70, height: 170 }, true);
    expect(await readGymHealthProfile(f.workspace.id, f.member.id, f.student.id)).toMatchObject({ intake: { medicalConditions: "SAUDE_LOCAL" }, physicalData: { weight: 70, height: 170 } });
    expect(await prisma.user.findUnique({ where: { id: f.student.id } })).toMatchObject({ medicalConditions: "SAUDE_GLOBAL_PRIVADA", weight: 99 });
    expect(JSON.stringify(await readGymHealthProfile(other.workspace.id, other.member.id, other.student.id))).not.toContain("SAUDE_LOCAL");
    expect(await prisma.auditLog.count({ where: { entityId: f.member.id, action: "GYM_HEALTH_ONBOARDING_COMPLETED" } })).toBe(1);
  });
  it("recepção, treinador não atribuído e recurso estrangeiro não leem nem escrevem saúde", async () => {
    const f = await fixture(), other = await fixture();
    for (const actor of [f.reception.id, f.trainer.id]) await expect(readGymHealthProfile(f.workspace.id, f.member.id, actor)).rejects.toMatchObject({ statusCode: 403 });
    await expect(saveGymHealthProfile(f.workspace.id, other.member.id, f.owner.id, { weight: 70 })).rejects.toMatchObject({ statusCode: 404 });
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { assignedStaffId: f.trainerMember.id } });
    expect(await readGymHealthProfile(f.workspace.id, f.member.id, f.trainer.id)).toMatchObject({ intake: {} });
  });
  it("valida limites, tipos, infinitos e propriedades forjadas sem gravação parcial", async () => {
    const f = await fixture();
    for (const raw of [{ weight: Infinity }, { weight: -1 }, { medicalConditions: "a".repeat(2001) }, { studentId: f.student.id }, { weight: false }]) await expect(saveGymHealthProfile(f.workspace.id, f.member.id, f.student.id, raw)).rejects.toMatchObject({ statusCode: 400 });
    expect(await prisma.studentProgress.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
  });
  it("auditoria falha desfaz a saúde e as medidas na mesma transação", async () => {
    const f = await fixture();
    await expect(saveGymHealthProfile(f.workspace.id, f.member.id, f.student.id, { weight: 70 })).resolves.toEqual({ success: true });
    await expect(serializableTransaction(async tx => { await tx.gymStudentProfile.update({ where: { memberId: f.member.id }, data: { notes: "NAO_PERSISTIR" } }); await tx.auditLog.create({ data: { userId: "inexistente", action: "PRIVACY_ROLLBACK" } }); })).rejects.toBeDefined();
    expect((await prisma.gymStudentProfile.findUniqueOrThrow({ where: { memberId: f.member.id } })).notes).toBeNull();
  });
  it("consulta global oferece desafio opaco, sem identidade ou contatos; escopo e operador não podem reutilizá-lo", async () => {
    const f = await fixture(); const subject = await prisma.user.create({ data: { name: "NOME_GLOBAL_NAO_REVELAR", email: `${randomUUID()}@example.invalid`, birthDate: new Date("1990-01-15") } });
    const result = await gymStudentService.checkDuplicate(f.workspace.id, { email: subject.email }, f.owner.id, f.unit.id);
    expect(result.status).toBe("EXISTING_USER_CAN_LINK"); expect(result.user?.id).not.toBe(subject.id);
    expect(JSON.stringify(result)).not.toMatch(/NOME_GLOBAL_NAO_REVELAR|example.invalid/);
    expect(await resolveGymIdentityLookup(f.workspace.id, f.unit.id, f.owner.id, result.user!.id)).toBe(subject.id);
    await expect(resolveGymIdentityLookup(f.workspace.id, f.unit.id, f.reception.id, result.user!.id)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("identificadores completos não substituem autorização; login, alvo, unidade e uso único são revalidados", async () => {
    const f = await fixture(); const subject = await prisma.user.create({ data: { name: "Conta global", email: `${randomUUID()}@example.invalid`, birthDate: new Date("1990-01-15") } });
    const registration = { workspaceId: f.workspace.id, unitId: f.unit.id, actorUserId: f.owner.id, existingUserId: subject.id, email: subject.email, idempotencyKey: randomUUID() };
    await expect(gymStudentService.registerStudent(registration)).rejects.toMatchObject({ statusCode: 403 });
    const invitation = await issueGymIdentityLink({ ...registration, targetUserId: subject.id, email: subject.email! }); const token = new URL(invitation.path, "https://synthetic.invalid").searchParams.get("token")!;
    await expect(acceptGymIdentityLink(invitation.requestId, token, f.student.id)).rejects.toMatchObject({ statusCode: 403 });
    await Promise.all([acceptGymIdentityLink(invitation.requestId, token, subject.id), acceptGymIdentityLink(invitation.requestId, token, subject.id)]);
    const unit2 = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Outra" } });
    await expect(gymStudentService.registerStudent({ ...registration, unitId: unit2.id, identityLinkProofId: invitation.requestId })).rejects.toMatchObject({ statusCode: 403 });
    const linked = await gymStudentService.registerStudent({ ...registration, identityLinkProofId: invitation.requestId });
    expect(linked.userId).toBe(subject.id); expect(await gymStudentService.registerStudent({ ...registration, identityLinkProofId: invitation.requestId })).toEqual(linked);
    await expect(readGymIdentityLink(invitation.requestId, token, subject.id)).rejects.toMatchObject({ statusCode: 403 });
  });
  it("pedidos autenticados deduplicam em concorrência; recepção não opera a fila nem pedidos estrangeiros", async () => {
    const f = await fixture(), other = await fixture();
    const [a, b] = await Promise.all([submitGymPrivacyRequest(requestInput(f)), submitGymPrivacyRequest(requestInput(f))]); expect(a.id).toBe(b.id);
    const foreign = await submitGymPrivacyRequest(requestInput(other));
    await expect(processGymPrivacyRequest(f.workspace.id, foreign.id, f.owner.id, { action: "START_REVIEW" })).rejects.toMatchObject({ statusCode: 404 });
    await expect(listGymPrivacyRequests(f.workspace.id, f.reception.id)).rejects.toMatchObject({ statusCode: 403 });
    expect((await listGymPrivacyRequests(f.workspace.id, f.owner.id)).requests.map(r => r.id)).toEqual([a.id]);
  });
  it("conferência de identidade antecede execução; não aceita marcar exclusão como resolvida ou cancelar em processamento", async () => {
    const f = await fixture(); const r = await submitGymPrivacyRequest(requestInput(f, "DELETION", false));
    await expect(processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "DECIDE_DELETION", response: "Resposta sintética fundamentada", decision: decision() })).rejects.toMatchObject({ statusCode: 409 });
    await processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "VERIFY_IDENTITY", evidenceReference: "Protocolo sintético de identidade 001" });
    await expect(processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "RESOLVE", response: "Resposta sintética fundamentada", outcome: "COMPLETED" })).rejects.toMatchObject({ statusCode: 409 });
    const invalid = decision(); invalid.membership.reason = "";
    await expect(processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "DECIDE_DELETION", response: "Resposta sintética fundamentada", decision: invalid })).rejects.toMatchObject({ statusCode: 400 });
  });
  it("falha externa mantém dados e quota; retomada confirma expurgo local preservando outro vínculo e contrato", async () => {
    const f = await fixture(), other = await fixture(); const key = `workspace/${f.workspace.id}/files/${randomUUID()}.pdf`;
    await prisma.workspaceMember.create({ data: { workspaceId: other.workspace.id, userId: f.student.id, role: "STUDENT" } });
    await prisma.studentProgress.create({ data: { studentId: f.student.id, workspaceId: f.workspace.id, weight: 70 } });
    await prisma.studentProgress.create({ data: { studentId: f.student.id, workspaceId: other.workspace.id, weight: 80 } });
    const file = await prisma.studentFile.create({ data: { studentId: f.student.id, workspaceId: f.workspace.id, name: "Exame", category: "exames", type: "file", url: `/api/storage/file?key=${encodeURIComponent(key)}`, objectKey: key, size: 4 } });
    await prisma.gymStorageObject.create({ data: { objectKey: key, workspaceId: f.workspace.id, actorUserId: f.owner.id, target: "student_file", size: BigInt(4), status: "FINALIZED" } });
    const r = await submitGymPrivacyRequest(requestInput(f)); const deletion = vi.spyOn(storageService, "deleteObject").mockRejectedValueOnce(new Error("Erro sintético externo"));
    try {
      await expect(processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "DECIDE_DELETION", response: "Pedido atendido no escopo local com retenções justificadas", decision: decision() })).rejects.toThrow("Erro sintético");
      expect(await prisma.dataSubjectRequest.findUnique({ where: { id: r.id } })).toMatchObject({ status: "PROCESSING", completedAt: null });
      expect(await prisma.studentFile.findUnique({ where: { id: file.id } })).not.toBeNull(); expect(await prisma.gymStorageObject.findUnique({ where: { objectKey: key } })).not.toBeNull();
      await expect(recordGymProgress(f.workspace.id, f.member.id, f.student.id, { action: "logProgress", weight: 60 })).rejects.toMatchObject({ statusCode: 409 });
      deletion.mockResolvedValue(undefined);
      expect(await processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "RETRY_DELETION" })).toMatchObject({ status: "PARTIALLY_COMPLETED", completed: true });
      expect(await prisma.studentProgress.count({ where: { studentId: f.student.id, workspaceId: f.workspace.id } })).toBe(0);
      expect(await prisma.studentProgress.count({ where: { studentId: f.student.id, workspaceId: other.workspace.id } })).toBe(1);
      expect(await prisma.user.findUnique({ where: { id: f.student.id } })).toMatchObject({ medicalConditions: "SAUDE_GLOBAL_PRIVADA", password: "SEGREDO_AUTENTICACAO" });
      expect(await prisma.gymStorageObject.findUnique({ where: { objectKey: key } })).toBeNull();
      expect(await processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "RETRY_DELETION" })).toMatchObject({ completed: true });
    } finally { deletion.mockRestore(); }
  });
  it("arquivo estrangeiro bloqueia decisão antes de storage e saúde não fica bloqueada por decisão recusada", async () => {
    const f = await fixture(); const r = await submitGymPrivacyRequest(requestInput(f));
    await prisma.studentFile.create({ data: { studentId: f.student.id, workspaceId: f.workspace.id, name: "Legado", category: "outros", type: "file", url: "https://external.invalid/file.pdf", objectKey: "workspace/foreign/files/file.pdf" } });
    const deletion = vi.spyOn(storageService, "deleteObject");
    try { await expect(processGymPrivacyRequest(f.workspace.id, r.id, f.owner.id, { action: "DECIDE_DELETION", response: "Resposta sintética fundamentada", decision: decision() })).rejects.toMatchObject({ statusCode: 409 }); expect(deletion).not.toHaveBeenCalled(); expect((await prisma.gymStudentProfile.findUniqueOrThrow({ where: { memberId: f.member.id } })).privacyRestrictedAt).toBeNull(); } finally { deletion.mockRestore(); }
  });
  it("gera todos os registros (>500), fotos e bytes verificáveis, sem saúde global, segredos ou outro controlador", async () => {
    const f = await fixture(), other = await fixture(); const bytes = Buffer.from([0, 1, 2, 255]); const key = `workspace/${f.workspace.id}/files/${randomUUID()}.pdf`;
    await prisma.studentProgress.createMany({ data: Array.from({ length: 501 }, (_, i) => ({ studentId: f.student.id, workspaceId: f.workspace.id, weight: 50 + i / 100 })) });
    await prisma.studentProgress.create({ data: { studentId: f.student.id, workspaceId: other.workspace.id, notes: "OUTRO_CONTROLADOR" } });
    await prisma.studentFile.create({ data: { studentId: f.student.id, workspaceId: f.workspace.id, name: "Arquivo", category: "exames", type: "file", url: `/api/storage/file?key=${encodeURIComponent(key)}`, objectKey: key } });
    const read = vi.spyOn(storageService, "getObjectStream").mockImplementation(async () => ({ body: Readable.from([bytes]) as never, contentType: "application/pdf", contentLength: 4, statusCode: 200, acceptRanges: "bytes", contentRange: undefined, eTag: undefined, lastModified: undefined }));
    try { const exported = await exportGymDataSubject({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id }); expect(exported.progress).toHaveLength(501); expect(exported.attachments).toHaveLength(1); expect(Buffer.from(exported.attachments[0].content, "base64")).toEqual(bytes); expect(exported.attachments[0].sha256).toBe(createHash("sha256").update(bytes).digest("hex")); expect(JSON.stringify(exported)).not.toMatch(/SEGREDO_AUTENTICACAO|SAUDE_GLOBAL_PRIVADA|OUTRO_CONTROLADOR|registrationRequestFingerprint|password/); expect(await prisma.dataSubjectRequest.findUnique({ where: { id: exported.exportMetadata.requestId } })).toMatchObject({ status: "COMPLETED" }); } finally { read.mockRestore(); }
  });
  it("exportação incompleta não se declara concluída e não permite URL arbitrária", async () => {
    const f = await fixture(); await prisma.studentFile.create({ data: { studentId: f.student.id, workspaceId: f.workspace.id, name: "Legado", category: "outros", type: "file", url: "https://external.invalid/private.pdf" } });
    const read = vi.spyOn(storageService, "getObjectStream");
    try { await expect(exportGymDataSubject({ workspaceId: f.workspace.id, targetUserId: f.student.id, actorUserId: f.owner.id })).rejects.toMatchObject({ statusCode: 409 }); expect(read).not.toHaveBeenCalled(); expect(await prisma.dataSubjectRequest.findFirst({ where: { workspaceId: f.workspace.id } })).toMatchObject({ status: "PROCESSING", completedAt: null }); } finally { read.mockRestore(); }
  });
  it("maioridade retira representação de saúde em transação sem apagar contratos nem consentimentos históricos", async () => {
    const f = await fixture(); const parent = await prisma.user.create({ data: { birthDate: new Date("1990-01-15"), cpfCnpj: "12345678909" } });
    await prisma.workspaceMember.update({ where: { id: f.member.id }, data: { isMinor: true } });
    const guardian = await prisma.gymGuardian.create({ data: { workspaceId: f.workspace.id, studentMemberId: f.member.id, guardianUserId: parent.id, name: "Responsável", cpf: "12345678909", phone: "11900000000", relationship: "MAE", verifiedAt: new Date(), hasHealthAccess: true } });
    await expect(authorizeGymStudent(f.workspace.id, f.member.id, parent.id, "health.read.assigned", { allowGuardian: true })).rejects.toMatchObject({ statusCode: 403 });
    const outcomes = await Promise.all([transitionGymMajority(f.workspace.id, f.member.id, f.owner.id), transitionGymMajority(f.workspace.id, f.member.id, f.owner.id)]); expect(outcomes.filter(r => r.transitioned)).toHaveLength(1);
    expect(await prisma.gymGuardian.findUnique({ where: { id: guardian.id } })).toMatchObject({ isLegalRepresentative: false, hasHealthAccess: false, isFinancialResponsible: true, revokedAt: null });
    expect(await prisma.auditLog.count({ where: { entityId: f.member.id, action: "GYM_MAJORITY_TRANSITION_COMPLETED" } })).toBe(1);
  });
  it("anexos de todas as categorias exigem acesso de saúde, inclusive metadados e preview", async () => {
    const f = await fixture(); await prisma.studentFile.create({ data: { studentId: f.student.id, workspaceId: f.workspace.id, name: "Saúde em outros", category: "outros", type: "link", url: "https://synthetic.invalid" } });
    expect(await gymAssessmentService.listStudentFiles({ workspaceId: f.workspace.id, studentMemberId: f.member.id, requestorUserId: f.reception.id, requestorRoles: ["OWNER"] })).toEqual([]);
    expect(await gymAssessmentService.listStudentFiles({ workspaceId: f.workspace.id, studentMemberId: f.member.id, requestorUserId: f.owner.id, requestorRoles: [] })).toHaveLength(1);
  });
  it("exportação própria inclui anamnese local e jamais exporta senha; exclusão global não faz cascade em academia", async () => {
    const f = await fixture(); await saveGymHealthProfile(f.workspace.id, f.member.id, f.student.id, { medicalConditions: "SAUDE_LOCAL" });
    const packageData = await DataExportService.generateUserDataPackage(f.student.id); expect(JSON.stringify(packageData)).toContain("SAUDE_LOCAL"); expect(JSON.stringify(packageData)).not.toContain("SEGREDO_AUTENTICACAO");
    const deletion = vi.spyOn(storageService, "deleteObject"); try { await expect(ErasureService.executeCompleteErasure(f.student.id, f.owner.id)).rejects.toThrow("GYM_DATA_RETENTION_REQUIRED"); expect(deletion).not.toHaveBeenCalled(); expect(await prisma.user.findUnique({ where: { id: f.student.id } })).not.toBeNull(); } finally { deletion.mockRestore(); }
  });
  it("redação estrutural cobre JSON aninhado, CPF sem máscara, credenciais de URL e erros brutos", async () => {
    const raw = { nested: { password: "P_SINTETICA", medicalConditions: "H_SINTETICA", email: "pessoa@example.invalid" }, error: new Error("password=VAZAMENTO"), url: "https://synthetic.invalid?token=TOKEN_SINTETICO", value: "52998224725" };
    expect(JSON.stringify(redactLogValue(raw))).not.toMatch(/P_SINTETICA|H_SINTETICA|pessoa@example|VAZAMENTO|TOKEN_SINTETICO|52998224725/);
    expect(redactPrivateText('password: "senha com espaços", Authorization: Bearer abc.def.ghi')).not.toMatch(/senha com espaços|abc.def.ghi/);
  });
});
