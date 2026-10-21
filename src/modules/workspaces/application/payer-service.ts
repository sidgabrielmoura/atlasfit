import prisma from "@/lib/prisma";
import type { EffectivePayer, ResolvePayerParams } from "./gym-financial-service";
import type { GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";
import { gymPublicUserSelect } from "../domain/public-user";
import { hasStudentMembership } from "../domain/student-membership";
import { isValidCpfCnpj } from "@/lib/cpf-validator";

export async function resolveGymPayer(workspaceId: string, params: ResolvePayerParams, db: GymTransactionClient = prisma): Promise<EffectivePayer> {
  const member = await db.workspaceMember.findFirst({ where: { workspaceId, userId: params.studentUserId, ...(params.studentMemberId ? { id: params.studentMemberId } : {}), isActive: true }, include: { user: { select: gymPublicUserSelect }, studentProfile: true, roleGrants: true } });
  if (!member || !hasStudentMembership(member)) throw new WorkspaceAccessError(404, "STUDENT_NOT_FOUND", "Aluno ativo não encontrado nesta academia.");
  const enrollment = params.enrollmentId ? await db.gymEnrollment.findFirst({ where: { id: params.enrollmentId, workspaceId, studentMemberId: member.id } }) : null;
  if (params.enrollmentId && !enrollment) throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "A matrícula não pertence a este aluno e academia.");
  if (params.customPayer && params.guardianId) throw new WorkspaceAccessError(400, "INVALID_PAYER", "Selecione um único responsável financeiro.");
  const guardianId = params.guardianId || enrollment?.billingPayerGuardianId;
  if (guardianId || params.preferredPayerType === "GUARDIAN" || member.isMinor || params.customPayer) {
    const customDocument = params.customPayer?.cpfCnpj.replace(/\D/g, "");
    const guardians = await db.gymGuardian.findMany({ where: { ...(guardianId ? { id: guardianId } : {}), ...(customDocument ? { cpf: customDocument } : {}), workspaceId, studentMemberId: member.id, revokedAt: null, isFinancialResponsible: true, verifiedAt: { not: null } }, take: 2 });
    if (guardians.length > 1) throw new WorkspaceAccessError(409, "PAYER_REVIEW_REQUIRED", "Selecione o responsável financeiro verificado desta obrigação.");
    const guardian = guardians[0];
    if (!guardian) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "O pagador deve ser um responsável financeiro verificado deste aluno.");
    const document = guardian.cpf.replace(/\D/g, "");
    if (!isValidCpfCnpj(document) || !guardian.name.trim()) throw new WorkspaceAccessError(409, "PAYER_REVIEW_REQUIRED", "O cadastro financeiro do responsável exige revisão.");
    if (params.customPayer && (customDocument !== document || params.customPayer.name.trim() !== guardian.name.trim() || params.customPayer.email.trim().toLowerCase() !== (guardian.email || "").trim().toLowerCase())) throw new WorkspaceAccessError(403, "GUARDIAN_NOT_AUTHORIZED", "Pagador personalizado deve corresponder ao responsável financeiro verificado do aluno.");
    let payerUserId: string | undefined;
    if (guardian.guardianUserId) {
      const identity = await db.user.findUnique({ where: { id: guardian.guardianUserId }, select: { cpfCnpj: true } });
      if (identity?.cpfCnpj && identity.cpfCnpj.replace(/\D/g, "") !== document) throw new WorkspaceAccessError(409, "PAYER_REVIEW_REQUIRED", "A identidade vinculada diverge do responsável financeiro.");
      // A legacy global ID without a matching document is not identity evidence.
      if (identity?.cpfCnpj?.replace(/\D/g, "") === document) payerUserId = guardian.guardianUserId;
    }
    return { payerType: "GUARDIAN", name: guardian.name, cpfCnpj: document, email: guardian.email || "", phone: guardian.phone, payerGuardianId: guardian.id, payerUserId, studentUserId: member.userId, studentMemberId: member.id };
  }
  if (params.preferredPayerType === "CUSTOM" || (enrollment?.billingPayerName && !enrollment.billingPayerUserId)) throw new WorkspaceAccessError(409, "PAYER_REVIEW_REQUIRED", "O pagador legado exige vínculo financeiro verificado antes de nova emissão.");
  if (enrollment?.billingPayerUserId && enrollment.billingPayerUserId !== member.userId) throw new WorkspaceAccessError(409, "PAYER_REVIEW_REQUIRED", "O pagador legado exige revisão do vínculo financeiro.");
  return { payerType: "STUDENT", name: member.user.name || "Aluno", cpfCnpj: member.user.cpfCnpj || undefined, email: member.user.email || "", phone: member.user.whatsapp || undefined, payerUserId: member.userId, studentUserId: member.userId, studentMemberId: member.id };
}
