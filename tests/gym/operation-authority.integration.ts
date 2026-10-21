import { afterAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import { SuperAdminGymService } from "@/modules/workspaces/application/superadmin-service";
import { EntitlementsService } from "@/modules/workspaces/application/entitlements-service";
import { GymOffboardingService } from "@/modules/workspaces/application/gym-offboarding-service";
import { gymAssessmentService } from "@/modules/workspaces/application/gym-assessment-service";
import { resolveRealtimeCapabilities } from "@/modules/workspaces/application/realtime-capabilities";
import { OwnershipService } from "@/modules/workspaces/application/ownership-service";
import { StaffService } from "@/modules/workspaces/application/staff-service";
import { GymService } from "@/modules/workspaces/application/gym-service";
import { MinorService } from "@/modules/workspaces/application/minor-service";
import { inviteGymStaff, acceptGymStaffInvitation, updateGymStaff } from "@/modules/workspaces/application/staff-mutations";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";
import { authorizeStorageRead, authorizeWorkspaceUpload, isPublicStorageKey } from "@/lib/storage-access";
import { checkStorageQuota, getPersonalTrainerStorageMetrics } from "@/lib/storage-quota.service";
import { GymAnalyticsService } from "@/modules/workspaces/application/gym-analytics-service";
import { spreadsheetCsvCell, moneyCsvCell } from "@/modules/workspaces/domain/spreadsheet-csv";
import Papa from "papaparse";
import { storageService } from "@/lib/storage.service";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Exige banco descartável específico.");
afterAll(async () => { await prisma.$disconnect(); });

async function fixture() {
  const owner = await prisma.user.create({ data: { email: `owner-${randomUUID()}@example.invalid`, name: "Titular sintético" } });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, name: "Academia", slug: `authority-${randomUUID()}`, type: "GYM" } });
  const operator = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: owner.id, role: "OWNER" } });
  const unit = await prisma.gymUnit.create({ data: { workspaceId: workspace.id, name: "Unidade" } });
  await prisma.workspaceSubscription.create({ data: { workspaceId: workspace.id, status: "ACTIVE", maxStudents: 10, maxStaff: 10 } });
  const plan = await prisma.gymPlan.create({ data: { workspaceId: workspace.id, name: "Plano" } });
  const version = await prisma.gymPlanVersion.create({ data: { planId: plan.id, name: plan.name, priceInCents: BigInt(10000), durationDays: 365, termsText: "Condições sintéticas", allowsAllUnits: false } });
  const students = [];
  for (let i = 0; i < 3; i++) {
    const user = await prisma.user.create({ data: { email: `student-${randomUUID()}@example.invalid`, role: "USER", name: "Aluno", medicalConditions: "Informação global que não deve ser exportada", password: "senha-sintetica-nao-e-credencial" } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role: "STUDENT", unitId: unit.id, studentProfile: { create: { notes: "Informação local" } } } });
    const enrollment = await prisma.gymEnrollment.create({ data: { workspaceId: workspace.id, studentMemberId: member.id, unitId: unit.id, planVersionId: version.id, startDate: new Date(Date.now() - 86400000), endDate: new Date(Date.now() + 90 * 86400000), priceInCents: version.priceInCents, status: "ACTIVE", accessGranted: true, acceptance: { create: { workspaceId: workspace.id, signerUserId: user.id, termsSnapshot: version.termsText, termsVersion: version.termsVersion } } } });
    students.push({ user, member, enrollment });
  }
  return { owner, workspace, operator, unit, students };
}

describe("GYM PostgreSQL — recursos e privacidade", () => {
  it("anexo GYM valida link e autoridade; erro não cria arquivo nem auditoria de sucesso", async () => {
    const f = await fixture(); const student = f.students[0];
    const input = { workspaceId: f.workspace.id, studentMemberId: student.member.id, uploadedByUserId: f.owner.id, name: "Documento", category: "outros" as const, type: "link" as const, url: "https://example.invalid/document" };
    await expect(gymAssessmentService.uploadStudentFile({ ...input, url: "javascript:alert(1)" })).rejects.toMatchObject({ code: "INVALID_URL" });
    await expect(gymAssessmentService.uploadStudentFile({ ...input, url: "https://user:pass@example.invalid/document" })).rejects.toMatchObject({ code: "INVALID_URL" });
    await expect(gymAssessmentService.uploadStudentFile({ ...input, uploadedByUserId: f.students[1].user.id })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    expect(await prisma.studentFile.count({ where: { workspaceId: f.workspace.id } })).toBe(0);
    const file = await gymAssessmentService.uploadStudentFile(input);
    expect(file).toMatchObject({ studentId: student.user.id, workspaceId: f.workspace.id, size: null, objectKey: null });
    expect(await prisma.auditLog.count({ where: { entityId: file.id, action: { startsWith: "GYM_STUDENT_FILE_ATTACHED:" } } })).toBe(1);
  });
  it("metadados de armazenamento simulados são revalidados; quota de anexos concorre no PostgreSQL real", async () => {
    const f = await fixture(); const student = f.students[0];
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { storageLimitMb: 1 } });
    const metadata = vi.spyOn(storageService, "getObjectMetadata").mockResolvedValue({ size: 600000, contentType: "application/pdf", eTag: "synthetic" });
    try {
      const input = { workspaceId: f.workspace.id, studentMemberId: student.member.id, uploadedByUserId: f.owner.id, name: "Upload sintético", category: "outros" as const, type: "file" as const, sizeInBytes: 1, mimeType: "image/png" };
      const a = `workspace/${f.workspace.id}/files/${randomUUID()}.pdf`; const b = `workspace/${f.workspace.id}/files/${randomUUID()}.pdf`;
      const attach = (key: string) => gymAssessmentService.uploadStudentFile({ ...input, objectKey: key, url: `/api/storage/file?key=${encodeURIComponent(key)}` });
      const attempts = await Promise.allSettled([attach(a), attach(b)]);
      expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
      const file = await prisma.studentFile.findFirstOrThrow({ where: { workspaceId: f.workspace.id } });
      expect(file).toMatchObject({ size: 600000, mimeType: "application/pdf" });
      expect(await prisma.studentFile.count({ where: { workspaceId: f.workspace.id } })).toBe(1);
      await expect(attach(file.objectKey || "missing")).rejects.toMatchObject({ statusCode: 409 });
      await expect(attach(`workspace/foreign/files/object.pdf`)).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
      metadata.mockResolvedValue({ size: 1, contentType: "text/html", eTag: "synthetic" });
      await expect(attach(b)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    } finally { metadata.mockRestore(); }
  });
  it("exportação real neutraliza campos de fórmula e preserva valores monetários acima de Number.MAX_SAFE_INTEGER", async () => {
    const f = await fixture(); const student = f.students[0];
    const formula = '=1+1";=2+2';
    await prisma.user.update({ where: { id: student.user.id }, data: { name: formula, whatsapp: "+5500000000000" } });
    const exported = await GymAnalyticsService.exportData({ workspaceId: f.workspace.id, actorUserId: f.owner.id, exportType: "STUDENTS" });
    const parsed = Papa.parse<string[]>(exported.content, { delimiter: ";", skipEmptyLines: true });
    expect(parsed.errors).toHaveLength(0);
    expect(parsed.data.every(row => row.length === 9)).toBe(true);
    const row = parsed.data.find(value => value[1].includes("1+1"));
    expect(row?.[1]).toBe(`'\t${formula}`);
    expect(row?.[3]).toBe("'\t+5500000000000");
    await prisma.workspaceMember.update({ where: { id: student.member.id }, data: { assignedStaffId: f.operator.id } });
    const assigned = await GymAnalyticsService.exportData({ workspaceId: f.workspace.id, actorUserId: f.owner.id, exportType: "STUDENTS", unitId: f.unit.id, assignedStaffId: f.operator.id });
    expect(assigned.rowCount).toBe(1);
    expect(assigned.content).toContain("1+1");
    await expect(GymAnalyticsService.exportData({ workspaceId: f.workspace.id, actorUserId: f.owner.id, exportType: "STUDENTS", startDate: "invalid" })).rejects.toMatchObject({ statusCode: 400 });
    for (const prefix of ["=", "+", "-", "@", "＝", "＋", "－", "＠", "\t", "\r", "\n", "\ufeff="]) expect(spreadsheetCsvCell(`${prefix}1+1`)).toMatch(/^"'\t/);
    expect(spreadsheetCsvCell(moneyCsvCell(BigInt(-123)))).toBe('"-1.23"');
    const dueDate = new Date();
    await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: student.member.id, studentUserId: student.user.id, invoiceNumber: `CSV-${randomUUID()}`, title: "Precisão CSV", dueDate, subtotalInCents: BigInt("9007199254740993"), totalInCents: BigInt("9007199254740993"), balanceRemainingInCents: BigInt("9007199254740993"), payerName: formula, createdByUserId: f.owner.id } });
    const invoices = await GymAnalyticsService.exportData({ workspaceId: f.workspace.id, actorUserId: f.owner.id, exportType: "INVOICES", endDate: new Date(dueDate.getTime() + 1000) });
    const invoice = Papa.parse<string[]>(invoices.content, { delimiter: ";", skipEmptyLines: true }).data[1];
    expect(invoice[5]).toBe("'\t90071992547409.93");
    expect(invoice[4]).toBe(`'\t${formula}`);
  });
  it("exportação por unidade exclui faturas alheias e soma apenas a parcela local de pagamentos mistos", async () => {
    const f = await fixture(); const student = f.students[0];
    const other = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Outra unidade CSV" } });
    await prisma.gymEnrollment.update({ where: { id: f.students[1].enrollment.id }, data: { unitId: other.id } });
    const paidAt = new Date(Date.now() - 30 * 86400000);
    const invoices = [];
    for (const [index, enrollment] of [student.enrollment, f.students[1].enrollment].entries()) invoices.push(await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: enrollment.studentMemberId, studentUserId: f.students[index].user.id, enrollmentId: enrollment.id, invoiceNumber: `UNIT-CSV-${randomUUID()}`, title: "Mensalidade CSV", dueDate: paidAt, subtotalInCents: BigInt(500), totalInCents: BigInt(500), balanceRemainingInCents: BigInt(500), payerName: "Aluno", createdByUserId: f.owner.id } }));
    const payment = await prisma.gymPayment.create({ data: { workspaceId: f.workspace.id, paymentNumber: `PAY-${randomUUID()}`, receiptNumber: randomUUID(), idempotencyKey: randomUUID(), amountInCents: BigInt(1000), paymentMethod: "BANK_TRANSFER_MANUAL", payerName: "Aluno", receivedByUserId: f.owner.id, paidAt, allocations: { create: invoices.map(invoice => ({ invoiceId: invoice.id, allocatedAmountInCents: BigInt(500) })) } } });
    const period = { startDate: new Date(paidAt.getTime() - 1000), endDate: new Date(paidAt.getTime() + 1000) };
    const scopedInvoices = await GymAnalyticsService.exportData({ workspaceId: f.workspace.id, actorUserId: f.owner.id, exportType: "INVOICES", unitId: f.unit.id, ...period });
    expect(scopedInvoices.rowCount).toBe(1);
    expect(scopedInvoices.content).not.toContain(invoices[1].invoiceNumber);
    const scopedPayments = await GymAnalyticsService.exportData({ workspaceId: f.workspace.id, actorUserId: f.owner.id, exportType: "PAYMENTS", unitId: f.unit.id, ...period });
    const row = Papa.parse<string[]>(scopedPayments.content, { delimiter: ";", skipEmptyLines: true }).data[1];
    expect(row[0]).toBe(payment.paymentNumber); expect(row[4]).toBe("5.00"); expect(row[1]).toBe(paidAt.toISOString());
  });
  it("caminhos privados não viram públicos por conter logos e objetos desconhecidos não são liberados", async () => {
    const f = await fixture();
    expect(isPublicStorageKey(`workspace/${f.workspace.id}/logos/brand.png`)).toBe(true);
    expect(isPublicStorageKey(`workspace/${f.workspace.id}/files/logos/secret.pdf`)).toBe(false);
    expect(() => isPublicStorageKey(`workspace/${f.workspace.id}/files/../logos/secret.pdf`)).toThrow();
    expect(() => isPublicStorageKey(`workspace/${f.workspace.id}/files/%2e%2e/secret.pdf`)).toThrow();
    await expect(authorizeStorageRead("unmapped/private.pdf", f.students[0].user.id)).rejects.toMatchObject({ code: "FILE_NOT_FOUND" });
    await expect(authorizeStorageRead(`workspace/${f.workspace.id}/files/private.pdf`)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("arquivo de saúde exige atribuição real; aluno alheio, recepção e academia suspensa não leem", async () => {
    const f = await fixture(); const student = f.students[0];
    const staffUser = await prisma.user.create({ data: { email: `file-trainer-${randomUUID()}@example.invalid` } });
    const staff = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: staffUser.id, role: "TRAINER" } });
    const reception = await prisma.user.create({ data: { email: `file-reception-${randomUUID()}@example.invalid` } });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: reception.id, role: "RECEPTIONIST" } });
    const key = `workspace/${f.workspace.id}/files/${randomUUID()}.pdf`;
    await prisma.studentFile.create({ data: { workspaceId: f.workspace.id, studentId: student.user.id, name: "Exame sintético", category: "exames", type: "file", objectKey: key, url: `/api/storage/file?key=${encodeURIComponent(key)}` } });
    expect(await authorizeStorageRead(key, student.user.id)).toBe("PRIVATE");
    await expect(authorizeStorageRead(key, f.students[1].user.id)).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await expect(authorizeStorageRead(key, reception.id)).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await expect(authorizeStorageRead(key, staffUser.id)).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
    await prisma.workspaceMember.update({ where: { id: student.member.id }, data: { assignedStaffId: staff.id } });
    expect(await authorizeStorageRead(key, staffUser.id)).toBe("PRIVATE");
    await authorizeWorkspaceUpload(f.workspace.id, staffUser.id, "progress_photo", student.user.id);
    await expect(authorizeWorkspaceUpload(f.workspace.id, reception.id, "brand")).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await prisma.workspace.update({ where: { id: f.workspace.id }, data: { isActive: false } });
    await expect(authorizeStorageRead(key, student.user.id)).rejects.toMatchObject({ code: "WORKSPACE_SUSPENDED" });
  });
  it("anexo de chat fica restrito a participantes; prévia nova fica restrita ao remetente", async () => {
    const f = await fixture(); const a = f.students[0]; const b = f.students[1];
    const conversation = await prisma.conversation.create({ data: { workspaceId: f.workspace.id, participants: { create: [{ userId: f.owner.id }, { userId: a.user.id }] } } });
    const key = `workspace/${f.workspace.id}/chat/${f.owner.id}/attachment-${randomUUID()}.pdf`;
    expect(await authorizeStorageRead(key, f.owner.id)).toBe("PRIVATE");
    await expect(authorizeStorageRead(key, a.user.id)).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
    await prisma.message.create({ data: { conversationId: conversation.id, senderId: f.owner.id, type: "FILE", attachment: { url: `/api/storage/file?key=${encodeURIComponent(key)}` } } });
    expect(await authorizeStorageRead(key, a.user.id)).toBe("PRIVATE");
    await expect(authorizeStorageRead(key, b.user.id)).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
    await prisma.conversationParticipant.update({ where: { conversationId_userId: { conversationId: conversation.id, userId: a.user.id } }, data: { leftAt: new Date() } });
    await expect(authorizeStorageRead(key, a.user.id)).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
  });
  it("arquivo PERSONAL conserva acesso de titular/aluno e quota pessoal exclui documentos GYM", async () => {
    const f = await fixture(); const student = f.students[0];
    const personal = await prisma.workspace.create({ data: { type: "PERSONAL", name: "Assessoria sintética", slug: `file-personal-${randomUUID()}`, ownerId: f.owner.id, members: { create: [{ userId: f.owner.id, role: "OWNER" }, { userId: student.user.id, role: "STUDENT" }] } } });
    const key = `workspace/${personal.id}/files/${randomUUID()}.pdf`;
    await prisma.studentFile.create({ data: { workspaceId: personal.id, studentId: student.user.id, name: "Arquivo PERSONAL", category: "outros", type: "file", objectKey: key, url: `/api/storage/file?key=${encodeURIComponent(key)}`, size: 1024 } });
    await prisma.studentFile.create({ data: { workspaceId: f.workspace.id, studentId: student.user.id, name: "Arquivo GYM", category: "outros", type: "file", url: "https://example.invalid/synthetic", size: 4096 } });
    expect(await authorizeStorageRead(key, f.owner.id)).toBe("PRIVATE");
    expect(await authorizeStorageRead(key, student.user.id)).toBe("PRIVATE");
    await authorizeWorkspaceUpload(personal.id, f.owner.id, "brand");
    await expect(authorizeStorageRead(key, f.students[1].user.id)).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
    expect(await getPersonalTrainerStorageMetrics(f.owner.id)).toMatchObject({ totalUsedBytes: 1024, workspacesCount: 1 });
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { storageLimitMb: 1, endDate: new Date(Date.now() - 1000) } });
    expect((await checkStorageQuota(f.workspace.id, f.owner.id, 1024)).allowed).toBe(false);
  });
  it("portal do responsável exige vínculo verificado; CPF coincidente não revela dependente ou permite aceite", async () => {
    const f = await fixture(); const student = f.students[0];
    const guardian = await prisma.user.create({ data: { email: `guardian-scope-${randomUUID()}@example.invalid`, cpfCnpj: "12345678909", birthDate: new Date("1990-01-15T00:00:00Z") } });
    const foreign = await prisma.user.create({ data: { email: `foreign-guardian-${randomUUID()}@example.invalid`, cpfCnpj: "12345678909", birthDate: new Date("1990-01-15T00:00:00Z") } });
    await prisma.workspaceMember.update({ where: { id: student.member.id }, data: { isMinor: true } });
    await prisma.user.update({ where: { id: student.user.id }, data: { birthDate: new Date("2012-01-15T00:00:00Z") } });
    const link = await prisma.gymGuardian.create({ data: { workspaceId: f.workspace.id, studentMemberId: student.member.id, guardianUserId: guardian.id, name: "Responsável sintético", cpf: "12345678909", phone: "11900000000", relationship: "TUTOR_LEGAL" } });
    const service = new MinorService();
    expect(await service.listDependentsForGuardian(guardian.id)).toEqual([]);
    await prisma.gymGuardian.update({ where: { id: link.id }, data: { verifiedAt: new Date() } });
    expect(await service.listDependentsForGuardian(guardian.id)).toMatchObject([{ guardianId: link.id, student: { memberId: student.member.id, notes: null } }]);
    expect(await service.listDependentsForGuardian(foreign.id)).toEqual([]);
    await expect(service.recordMinorLegalAcceptance({ workspaceId: f.workspace.id, guardianId: link.id, guardianUserId: foreign.id, documentType: "TERMS" })).rejects.toMatchObject({ code: "GUARDIAN_NOT_AUTHORIZED" });
    await prisma.gymGuardian.update({ where: { id: link.id }, data: { revokedAt: new Date() } });
    expect(await service.listDependentsForGuardian(guardian.id)).toEqual([]);
  });
  it("dossiê é local, sem saúde global, credencial ou consentimento de outro controlador; dinheiro mantém precisão", async () => {
    const f = await fixture(); const student = f.students[0];
    await prisma.privacyConsent.create({ data: { userId: student.user.id, purpose: "GLOBAL_SYNTHETIC_MARKETING" } });
    await prisma.gymInvoice.create({ data: { workspaceId: f.workspace.id, studentMemberId: student.member.id, studentUserId: student.user.id, invoiceNumber: `PRECISION-${randomUUID()}`, title: "Teste precisão", dueDate: new Date(), subtotalInCents: BigInt("9007199254740993"), totalInCents: BigInt("9007199254740993"), balanceRemainingInCents: BigInt("9007199254740993"), payerName: "Aluno", createdByUserId: f.owner.id } });
    const dossier = await GymOffboardingService.exportDataSubjectDossier({ workspaceId: f.workspace.id, targetUserId: student.user.id, actorUserId: f.owner.id });
    const serialized = JSON.stringify(dossier);
    expect(serialized).not.toContain(student.user.password);
    expect(serialized).not.toContain(student.user.medicalConditions);
    expect(serialized).not.toContain("GLOBAL_SYNTHETIC_MARKETING");
    expect(dossier.financialRecords[0].totalInCents).toBe("9007199254740993");
    await expect(GymOffboardingService.exportDataSubjectDossier({ workspaceId: f.workspace.id, targetUserId: student.user.id, actorUserId: f.students[1].user.id })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
  });
  it("equipe não recebe saúde por roles enviados; profissional precisa de atribuição", async () => {
    const f = await fixture(); const student = f.students[0];
    const staff = await prisma.user.create({ data: { email: `staff-${randomUUID()}@example.invalid` } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: staff.id, role: "RECEPTIONIST" } });
    await prisma.studentFile.create({ data: { workspaceId: f.workspace.id, studentId: student.user.id, name: "Exame", category: "exames", type: "link", url: "https://example.invalid/exam" } });
    const files = await gymAssessmentService.listStudentFiles({ workspaceId: f.workspace.id, studentMemberId: student.member.id, requestorUserId: staff.id, requestorRoles: ["OWNER"] });
    expect(files).toHaveLength(0);
    await expect(gymAssessmentService.listStudentPhysicalEvaluations({ workspaceId: f.workspace.id, studentMemberId: student.member.id, requestorUserId: staff.id, requestorRoles: ["OWNER"] })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await prisma.workspaceMember.update({ where: { id: member.id }, data: { role: "TRAINER" } });
    await expect(gymAssessmentService.listStudentPhysicalEvaluations({ workspaceId: f.workspace.id, studentMemberId: student.member.id, requestorUserId: staff.id, requestorRoles: ["OWNER"] })).rejects.toMatchObject({ code: "FORBIDDEN_RESOURCE" });
    await prisma.workspaceMember.update({ where: { id: student.member.id }, data: { assignedStaffId: member.id } });
    expect(await gymAssessmentService.listStudentPhysicalEvaluations({ workspaceId: f.workspace.id, studentMemberId: student.member.id, requestorUserId: staff.id, requestorRoles: [] })).toEqual([]);
  });
  it("token realtime não publica mensagens nem concede wildcard; grants revogados retiram canais administrativos", async () => {
    const f = await fixture(); const staff = await prisma.user.create({ data: { email: `finance-${randomUUID()}@example.invalid` } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: staff.id, role: "FINANCE", roleGrants: { create: { role: "FINANCE", grantedBy: f.owner.id } } } });
    const caps = await resolveRealtimeCapabilities(staff.id);
    expect(caps[`workspace:${f.workspace.id}:finance`]).toEqual(["subscribe"]);
    expect(Object.keys(caps).some(key => key.includes("*"))).toBe(false);
    expect(Object.values(caps).some(ops => ops.includes("publish"))).toBe(false);
    await prisma.workspaceRoleGrant.updateMany({ where: { memberId: member.id }, data: { revokedAt: new Date() } });
    expect((await resolveRealtimeCapabilities(staff.id))[`workspace:${f.workspace.id}:finance`]).toBeUndefined();
  });
});

describe("GYM PostgreSQL — provisionamento e licença sem efeitos em consulta", () => {
  it("criação concorrente tem um resultado completo; falha de licença não deixa academia parcial", async () => {
    const admin = await prisma.user.create({ data: { email: `admin-${randomUUID()}@example.invalid`, role: "SUPERADMIN" } });
    const owner = await prisma.user.create({ data: { email: `owner-${randomUUID()}@example.invalid` } });
    const input = { name: "Academia provisionada", slug: `provision-${randomUUID()}`, ownerId: owner.id, type: "GYM" as const, initialUnitName: "Filial inicial", maxStudents: 0 };
    const attempts = await Promise.allSettled([SuperAdminGymService.provisionWorkspace(input, admin.id), SuperAdminGymService.provisionWorkspace(input, admin.id)]);
    expect(attempts.filter(a => a.status === "fulfilled")).toHaveLength(1);
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { slug: input.slug }, include: { units: true, settings: true, subscription: true, members: { include: { roleGrants: true } } } });
    expect(workspace.units[0].name).toBe("Filial inicial"); expect(workspace.settings).not.toBeNull();
    expect(workspace.subscription).toMatchObject({ maxStudents: 0 }); expect(workspace.members[0].roleGrants[0].role).toBe("OWNER");
    await expect(SuperAdminGymService.provisionWorkspace({ ...input, slug: `invalid-${randomUUID()}`, maxUnits: 0 }, admin.id)).rejects.toMatchObject({ code: "INVALID_REQUEST" });
    await expect(SuperAdminGymService.provisionWorkspace({ ...input, slug: `denied-${randomUUID()}` }, owner.id)).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
  });
  it("consulta não provisiona licença, zero é preservado e trial vencido nega novos recursos", async () => {
    const f = await fixture();
    await prisma.workspaceSubscription.delete({ where: { workspaceId: f.workspace.id } });
    expect((await EntitlementsService.resolveEntitlements(f.workspace.id)).status).toBe("INCOMPLETE");
    expect(await prisma.workspaceSubscription.findUnique({ where: { workspaceId: f.workspace.id } })).toBeNull();
    await prisma.workspaceSubscription.create({ data: { workspaceId: f.workspace.id, status: "TRIAL", trialEndsAt: new Date(Date.now() - 86400000), maxStudents: 0, maxDevices: 0, storageLimitMb: 0 } });
    const license = await EntitlementsService.resolveEntitlements(f.workspace.id);
    expect(license).toMatchObject({ status: "EXPIRED", isEntitled: false, limits: { maxStudents: 0, storageLimitMb: 0 } });
    expect(license.canPerformAction("ADD_STUDENT").allowed).toBe(false);
  });
});

describe("GYM PostgreSQL — titularidade e desligamento atômicos", () => {
  it("gerente de unidade não transforma grant local em global nem revoga autoridade de outra unidade", async () => {
    const f = await fixture();
    const second = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Segunda unidade" } });
    const manager = await prisma.user.create({ data: { email: `unit-manager-${randomUUID()}@example.invalid` } });
    await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: manager.id, role: "MANAGER", unitId: f.unit.id, roleGrants: { create: { role: "MANAGER", unitId: f.unit.id, grantedBy: f.owner.id } } } });
    const staff = await prisma.user.create({ data: { email: `unit-trainer-${randomUUID()}@example.invalid` } });
    const member = await prisma.workspaceMember.create({ data: { workspaceId: f.workspace.id, userId: staff.id, role: "TRAINER", unitId: f.unit.id, roleGrants: { create: { role: "TRAINER", unitId: f.unit.id, grantedBy: f.owner.id } } } });
    const input = { workspaceId: f.workspace.id, memberId: member.id, actorUserId: manager.id };
    await expect(updateGymStaff({ ...input, unitId: null })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await expect(updateGymStaff({ ...input, unitId: second.id })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "TRAINER", unitId: second.id, grantedBy: f.owner.id } });
    await expect(updateGymStaff({ ...input, role: "ASSISTANT" })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: member.id, revokedAt: null, role: "TRAINER" } })).toBe(2);
    expect(await prisma.workspaceMember.findUnique({ where: { id: member.id } })).toMatchObject({ role: "TRAINER", unitId: f.unit.id });
    await updateGymStaff({ ...input, actorUserId: f.owner.id, unitId: null });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: member.id, role: "TRAINER", unitId: null, revokedAt: null } })).toBe(1);
  });
  it("licença encerrada não aceita convites; perfil desligado não ocupa quota nem restaura grants de aluno revogados", async () => {
    const f = await fixture(); const student = f.students[0];
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { maxStaff: 2, endDate: new Date(Date.now() - 86400000) } });
    await expect(inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.owner.id, email: student.user.email || "", role: "TRAINER" })).rejects.toMatchObject({ code: "INVALID_STATUS" });
    await prisma.workspaceSubscription.update({ where: { workspaceId: f.workspace.id }, data: { endDate: null } });
    await prisma.gymStaffProfile.create({ data: { memberId: student.member.id, terminationDate: new Date() } });
    const revoked = await prisma.workspaceRoleGrant.create({ data: { memberId: student.member.id, role: "STUDENT", unitId: f.unit.id, revokedAt: new Date(), grantedBy: f.owner.id } });
    const invitation = await inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.owner.id, email: student.user.email || "", role: "TRAINER", unitId: f.unit.id });
    await acceptGymStaffInvitation(invitation.rawToken, student.user.id);
    expect(await prisma.gymStaffProfile.findUnique({ where: { memberId: student.member.id } })).toMatchObject({ terminationDate: null });
    expect((await prisma.workspaceRoleGrant.findUniqueOrThrow({ where: { id: revoked.id } })).revokedAt).not.toBeNull();
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: student.member.id, role: "STUDENT", revokedAt: null } })).toBe(0);
  });
  it("convite de aluno preserva a unidade do grant STUDENT; contexto estrangeiro não escolhe academia implicitamente", async () => {
    const f = await fixture(); const student = f.students[0];
    const second = await prisma.gymUnit.create({ data: { workspaceId: f.workspace.id, name: "Unidade de trabalho" } });
    const invitation = await inviteGymStaff({ workspaceId: f.workspace.id, invitedById: f.owner.id, email: student.user.email || "", role: "TRAINER", unitId: second.id });
    await acceptGymStaffInvitation(invitation.rawToken, student.user.id);
    expect(await prisma.workspaceRoleGrant.findFirst({ where: { memberId: student.member.id, role: "STUDENT", revokedAt: null } })).toMatchObject({ unitId: f.unit.id });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: student.member.id, role: "STUDENT", unitId: null, revokedAt: null } })).toBe(0);
    const context = await WorkspaceContextService.resolveUserWorkspaceContext(student.user.id, `foreign-${randomUUID()}`);
    expect(context.status).toBe("NEEDS_SELECTION");
    expect(context.workspaceId).toBeUndefined();
    expect(context.availableWorkspaces?.map(item => item.id)).toEqual([f.workspace.id]);
    expect((await WorkspaceContextService.resolveUserWorkspaceContext(student.user.id, f.workspace.id)).workspaceId).toBe(f.workspace.id);
  });
  it("repasse separado exige autoridade, aluno atribuído e destino profissional; erros preservam a carteira", async () => {
    const f = await fixture(); const foreign = await fixture(); const source = f.students[0].member;
    await prisma.workspaceMember.update({ where: { id: source.id }, data: { role: "TRAINER" } });
    await prisma.workspaceMember.update({ where: { id: f.students[1].member.id }, data: { assignedStaffId: source.id } });
    const service = new StaffService();
    const input = { workspaceId: f.workspace.id, fromStaffMemberId: source.id, toStaffMemberId: f.operator.id, actorUserId: f.owner.id, studentMemberIds: [f.students[1].member.id] };
    await expect(service.reassignStudents({ ...input, actorUserId: f.students[2].user.id })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
    await expect(service.reassignStudents({ ...input, studentMemberIds: [...input.studentMemberIds, foreign.students[0].member.id] })).rejects.toMatchObject({ code: "STUDENT_NOT_FOUND" });
    await expect(service.reassignStudents({ ...input, toStaffMemberId: f.students[2].member.id })).rejects.toMatchObject({ code: "INVALID_REPLACEMENT" });
    expect(await prisma.workspaceMember.findUnique({ where: { id: f.students[1].member.id } })).toMatchObject({ assignedStaffId: source.id });
    expect(await service.reassignStudents(input)).toMatchObject({ success: true, count: 1 });
    expect(await prisma.workspaceMember.findUnique({ where: { id: f.students[1].member.id } })).toMatchObject({ assignedStaffId: f.operator.id });
  });
  it("banco impede dois grants globais ativos do mesmo papel e conserva histórico revogado", async () => {
    const f = await fixture(); const member = f.students[0].member;
    const old = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "FINANCE", grantedBy: f.owner.id } });
    await expect(prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "FINANCE", grantedBy: f.owner.id } })).rejects.toMatchObject({ code: "P2002" });
    await prisma.workspaceRoleGrant.update({ where: { id: old.id }, data: { revokedAt: new Date(), revokedBy: f.owner.id } });
    const current = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "FINANCE", grantedBy: f.owner.id } });
    const newerRevoked = await prisma.workspaceRoleGrant.create({ data: { memberId: member.id, role: "FINANCE", grantedBy: f.owner.id, revokedAt: new Date() } });
    await new GymService().grantMemberRole({ workspaceId: f.workspace.id, memberId: member.id, role: "FINANCE", grantedByUserId: f.owner.id });
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: member.id, role: "FINANCE", revokedAt: null } })).toBe(1);
    expect(await prisma.workspaceRoleGrant.findUnique({ where: { id: current.id } })).toMatchObject({ revokedAt: null });
    expect((await prisma.workspaceRoleGrant.findUniqueOrThrow({ where: { id: newerRevoked.id } })).revokedAt).not.toBeNull();
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: member.id, role: "FINANCE" } })).toBe(3);
  });
  it("ator sem autoridade não transfere; duas transferências simultâneas deixam um único novo titular", async () => {
    const f = await fixture();
    const first = f.students[0].user;
    const second = f.students[1].user;
    const input = { workspaceId: f.workspace.id, currentOwnerUserId: f.owner.id, targetUserId: first.id, auditActorId: f.owner.id };
    await expect(OwnershipService.transferWorkspaceOwnership({ ...input, auditActorId: second.id })).rejects.toMatchObject({ code: "OWNER_TRANSFER_FAILED" });
    const attempts = await Promise.allSettled([OwnershipService.transferWorkspaceOwnership(input), OwnershipService.transferWorkspaceOwnership({ ...input, targetUserId: second.id })]);
    expect(attempts.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const updated = await prisma.workspace.findUniqueOrThrow({ where: { id: f.workspace.id } });
    expect([first.id, second.id]).toContain(updated.ownerId);
    const grants = await prisma.workspaceRoleGrant.findMany({ where: { member: { workspaceId: f.workspace.id }, role: "OWNER", revokedAt: null } });
    expect(grants).toHaveLength(1);
    expect(await prisma.workspaceMember.findUnique({ where: { id: grants[0].memberId } })).toMatchObject({ userId: updated.ownerId, role: "OWNER" });
    expect(await prisma.workspaceMember.findUnique({ where: { id: f.operator.id } })).toMatchObject({ role: "MANAGER" });
  });
  it("substituto inválido não altera vínculos; handover conserva vínculo de aluno e outro workspace", async () => {
    const f = await fixture(); const staff = f.students[0];
    await prisma.workspaceMember.update({ where: { id: staff.member.id }, data: { role: "TRAINER" } });
    await prisma.workspaceRoleGrant.createMany({ data: ["TRAINER", "STUDENT"].map(role => ({ memberId: staff.member.id, role: role === "TRAINER" ? "TRAINER" : "STUDENT", grantedBy: f.owner.id, unitId: f.unit.id })) });
    const personal = await prisma.workspace.create({ data: { ownerId: staff.user.id, name: "Personal preservado", slug: `personal-${randomUUID()}`, type: "PERSONAL", members: { create: { userId: staff.user.id, role: "OWNER" } } } });
    const pupil = f.students[1];
    await prisma.workspaceMember.update({ where: { id: pupil.member.id }, data: { assignedStaffId: staff.member.id } });
    const input = { workspaceId: f.workspace.id, memberId: staff.member.id, actorUserId: f.owner.id, reason: "Transição sintética" };
    await expect(new StaffService().offboardStaffMember({ ...input, replacementStaffMemberId: f.students[2].member.id })).rejects.toMatchObject({ code: "INVALID_REPLACEMENT" });
    expect(await prisma.workspaceMember.findUnique({ where: { id: pupil.member.id } })).toMatchObject({ assignedStaffId: staff.member.id });
    const result = await new StaffService().offboardStaffMember({ ...input, replacementStaffMemberId: f.operator.id });
    expect(result).toMatchObject({ remainsStudent: true, reassignedStudentsCount: 1 });
    expect(await prisma.workspaceMember.findUnique({ where: { id: staff.member.id } })).toMatchObject({ isActive: true, role: "STUDENT" });
    expect(await prisma.workspaceMember.findUnique({ where: { id: pupil.member.id } })).toMatchObject({ assignedStaffId: f.operator.id });
    expect(await prisma.workspaceRoleGrant.findMany({ where: { memberId: staff.member.id, revokedAt: null } })).toMatchObject([{ role: "STUDENT", unitId: f.unit.id }]);
    expect(await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: staff.user.id, workspaceId: personal.id } } })).toMatchObject({ isActive: true, role: "OWNER" });
  });
  it("revogação de papel legado não recupera permissão e reativação concorrente não duplica grant global", async () => {
    const f = await fixture(); const student = f.students[0]; const service = new GymService();
    await prisma.workspaceMember.update({ where: { id: student.member.id }, data: { role: "FINANCE" } });
    await service.revokeMemberRole({ workspaceId: f.workspace.id, memberId: student.member.id, role: "FINANCE", revokedByUserId: f.owner.id });
    expect((await resolveRealtimeCapabilities(student.user.id))[`workspace:${f.workspace.id}:finance`]).toBeUndefined();
    const input = { workspaceId: f.workspace.id, memberId: student.member.id, role: "FINANCE" as const, grantedByUserId: f.owner.id };
    await Promise.all([service.grantMemberRole(input), service.grantMemberRole(input)]);
    expect(await prisma.workspaceRoleGrant.count({ where: { memberId: student.member.id, role: "FINANCE", unitId: null } })).toBe(1);
    await expect(service.revokeMemberRole({ ...input, revokedByUserId: f.students[1].user.id })).rejects.toMatchObject({ code: "INSUFFICIENT_PERMISSIONS" });
  });
});
