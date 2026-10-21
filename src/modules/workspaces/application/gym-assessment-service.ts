import { attachGymStudentFile } from "./student-file-mutations";
import { serializableTransaction } from "./transaction";
import { gymPublicUserSelect } from "../domain/public-user";
import prisma from "@/lib/prisma";
import { PhysicalEvaluation, StudentFile } from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { authorizeGymStudent } from "./student-authority";

// ============================================================================
// DTOs & INTERFACES
// ============================================================================

export interface CreatePhysicalEvaluationInput {
  workspaceId: string;
  studentMemberId: string;
  evaluatorUserId: string;
  type: string; // Ex: "Pollock 7 Dobras", "Bioimpedância"
  weight: number;
  height: number;
  bodyFat?: number | null;
  muscleMass?: number | null;
  dobras?: Record<string, any> | null;
  anamnese?: Record<string, any> | null;
  circunferencias?: Record<string, any> | null;
  postural?: Record<string, any> | null;
  dorMobilidade?: Record<string, any> | null;
  testesFisicos?: Record<string, any> | null;
  notes?: string | null;
}

export interface ListEvaluationsOptions {
  workspaceId: string;
  studentMemberId: string;
  requestorUserId: string;
  requestorRoles: string[];
  guardianId?: string | null;
}

export interface UploadStudentFileInput {
  workspaceId: string;
  studentMemberId: string;
  uploadedByUserId: string;
  name: string;
  category: "exames" | "dieta_treino" | "outros";
  type: "file" | "link";
  url: string;
  fileName?: string | null;
  fileSizeFormatted?: string | null;
  sizeInBytes?: number | null;
  mimeType?: string | null;
  objectKey?: string | null;
  notes?: string | null;
}

export interface ListStudentFilesOptions {
  workspaceId: string;
  studentMemberId: string;
  requestorUserId: string;
  requestorRoles: string[];
  guardianId?: string | null;
}

// Limite máximo de tamanho de anexo permitido (20 MB)
export const MAX_ATTACHMENT_SIZE_BYTES = 20 * 1024 * 1024;

// ============================================================================
// SERVIÇO DE AVALIAÇÕES FÍSICAS, ANEXOS E GOVERNANÇA DE SAÚDE (GYM-070)
// ============================================================================

export class GymAssessmentService {
  /**
   * Registra uma avaliação física para o aluno na academia.
   * 
   * REGRAS DE PRIVACIDADE E SAÚDE (LGPD):
   * Apenas profissionais autorizados (TRAINER, MANAGER, OWNER) podem registrar avaliações.
   * Recepção e Financeiro NUNCA podem prescrever nem registrar avaliações físicas.
   */
  async createPhysicalEvaluation(
    input: CreatePhysicalEvaluationInput
  ): Promise<PhysicalEvaluation> {
    const {
      workspaceId,
      studentMemberId,
      evaluatorUserId,
      type,
      weight,
      height,
      bodyFat,
      muscleMass,
      dobras,
      anamnese,
      circunferencias,
      postural,
      dorMobilidade,
      testesFisicos,
      notes
    } = input;

    if (typeof type !== "string" || !type.trim() || type.length > 200) {
      throw new WorkspaceAccessError(400, "INVALID_TYPE", "O tipo de avaliação é obrigatório.");
    }

    if (typeof weight !== "number" || !Number.isFinite(weight) || weight <= 0 || weight > 1000 || typeof height !== "number" || !Number.isFinite(height) || height <= 0 || height > 1000 || [bodyFat, muscleMass].some(value => value != null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100)) || (notes != null && (typeof notes !== "string" || notes.length > 2000))) {
      throw new WorkspaceAccessError(
        400,
        "INVALID_MEASUREMENTS",
        "Peso e altura válidos são obrigatórios."
      );
    }
    let payloadSize = 0;
    for (const value of [dobras, anamnese, circunferencias, postural, dorMobilidade, testesFisicos]) {
      if (value == null) continue;
      if (typeof value !== "object" || Array.isArray(value)) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Estrutura de avaliação inválida.");
      try { payloadSize += Buffer.byteLength(JSON.stringify(value)); } catch { throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Estrutura de avaliação inválida."); }
    }
    if (payloadSize > 64 * 1024) throw new WorkspaceAccessError(413, "INVALID_REQUEST", "Avaliação acima do tamanho permitido.");
    return serializableTransaction(async tx => {
    const member = await authorizeGymStudent(workspaceId, studentMemberId, evaluatorUserId, "health.manage.assigned", {}, tx);
    const evaluation = await tx.physicalEvaluation.create({
      data: {
        workspaceId,
        studentId: member.userId,
        type: type.trim(),
        weight,
        height,
        bodyFat: bodyFat ?? null,
        muscleMass: muscleMass ?? null,
        dobras: (dobras as any) ?? undefined,
        anamnese: (anamnese as any) ?? undefined,
        circunferencias: (circunferencias as any) ?? undefined,
        postural: (postural as any) ?? undefined,
        dorMobilidade: (dorMobilidade as any) ?? undefined,
        testesFisicos: (testesFisicos as any) ?? undefined,
        notes: notes?.trim() || null
      }
    });

    await tx.auditLog.create({
      data: {
        userId: evaluatorUserId,
        action: "PHYSICAL_EVALUATION_RECORDED",
        entity: "PHYSICAL_EVALUATION",
        entityId: evaluation.id,
        severity: "info"
      }
    });

    return evaluation;
    });
  }

  /**
   * Lista as avaliações físicas de um aluno com validação estrita de privacidade e permissões.
   * 
   * REGRAS LGPD:
   * 1. Recepção e Financeiro são bloqueados.
   * 2. Responsáveis legais de menores só acessam se possuírem 'hasHealthAccess === true'.
   */
  async listStudentPhysicalEvaluations(options: ListEvaluationsOptions): Promise<PhysicalEvaluation[]> {
 const member = await authorizeGymStudent(options.workspaceId, options.studentMemberId, options.requestorUserId, "health.read.assigned", { allowSelf: true, allowGuardian: true, guardianId: options.guardianId });
 return prisma.physicalEvaluation.findMany({ where: { workspaceId: options.workspaceId, studentId: member.userId }, orderBy: { date: "desc" }, take: 500 });
 }

  /**
   * Resgata uma avaliação física específica por ID com verificação de tenant.
   */
  async getPhysicalEvaluationById(
    workspaceId: string,
    evaluationId: string,
    actorUserId: string
  ): Promise<PhysicalEvaluation> {
    const evaluation = await prisma.physicalEvaluation.findFirst({
      where: { id: evaluationId, workspaceId },
      include: {
        student: { select: { id: true, name: true, image: true } }
      }
    });

    if (!evaluation) {
      throw new WorkspaceAccessError(404, "EVALUATION_NOT_FOUND", "Avaliação física não encontrada.");
    }

    const member = await prisma.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: evaluation.studentId, workspaceId } }, select: { id: true } });
    if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Vínculo não encontrado.");
    await authorizeGymStudent(workspaceId, member.id, actorUserId, "health.read.assigned", { allowSelf: true, allowGuardian: true });
    return evaluation;
  }

  /**
   * Faz upload de arquivo ou anexo para o prontuário do aluno (exames, laudos, planos).
   * Valida cota máxima de 20 MB por arquivo e escopo do workspace.
   */
  async uploadStudentFile(input: UploadStudentFileInput): Promise<StudentFile> { return attachGymStudentFile(input); }

  /**
   * Lista arquivos e anexos do aluno, ocultando documentos da categoria 'exames' (dados sensíveis de saúde)
   * para usuários não autorizados ou responsáveis sem 'hasHealthAccess'.
   */
  async listStudentFiles(options: ListStudentFilesOptions): Promise<StudentFile[]> {
 const authorityOptions = { allowSelf: true, allowGuardian: true, guardianId: options.guardianId };
 const member = await authorizeGymStudent(options.workspaceId, options.studentMemberId, options.requestorUserId, "students.read", authorityOptions);
 let healthAllowed = false;
 try { await authorizeGymStudent(options.workspaceId, options.studentMemberId, options.requestorUserId, "health.read.assigned", authorityOptions); healthAllowed = true; }
 catch (error) { if (!(error instanceof WorkspaceAccessError) || error.statusCode !== 403) throw error; }
 return prisma.studentFile.findMany({ where: { workspaceId: options.workspaceId, studentId: member.userId, ...(healthAllowed ? {} : { id: "__HEALTH_ACCESS_REQUIRED__" }) }, orderBy: { createdAt: "desc" }, take: 500 });
 }

  /**
   * Remove um arquivo anexado do aluno.
   */
  async deleteStudentFile(
    workspaceId: string,
    fileId: string,
    actorUserId: string
  ): Promise<{ success: boolean }> {
 return serializableTransaction(async tx => {
 const file = await tx.studentFile.findFirst({ where: { id: fileId, workspaceId } });
 if (!file) throw new WorkspaceAccessError(404, "FILE_NOT_FOUND", "Arquivo não encontrado.");
 const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: file.studentId, workspaceId } }, select: { id: true } });
 if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Vínculo do arquivo não encontrado.");
 await authorizeGymStudent(workspaceId, member.id, actorUserId, "health.manage.assigned", {}, tx);
 await tx.studentFile.delete({ where: { id: file.id } });
 await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_STUDENT_FILE_RECORD_REMOVED", entity: "STUDENT_FILE", entityId: file.id } });
 return { success: true };
 });
 }

  async deletePhysicalEvaluation(
    workspaceId: string,
    evaluationId: string,
    actorUserId: string
  ): Promise<{ success: boolean }> {
    return serializableTransaction(async tx => {
      const evaluation = await tx.physicalEvaluation.findFirst({ where: { id: evaluationId, workspaceId } });
      if (!evaluation) throw new WorkspaceAccessError(404, "EVALUATION_NOT_FOUND", "Avaliação física não encontrada.");
      const member = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: evaluation.studentId, workspaceId } }, select: { id: true } });
      if (!member) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Vínculo da avaliação não encontrado.");
      await authorizeGymStudent(workspaceId, member.id, actorUserId, "health.manage.assigned", {}, tx);
      await tx.physicalEvaluation.delete({ where: { id: evaluation.id } });
      await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_PHYSICAL_EVALUATION_REMOVED", entity: "PHYSICAL_EVALUATION", entityId: evaluation.id } });
      return { success: true };
    });
  }
}

export const gymAssessmentService = new GymAssessmentService();
