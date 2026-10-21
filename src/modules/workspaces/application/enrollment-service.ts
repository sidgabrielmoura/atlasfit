import { pauseGymEnrollment, resumeGymEnrollment } from "./enrollment-pause";
import { processLocalEnrollmentClosures } from "./enrollment-closure-job";
import { cancelGymEnrollment } from "./enrollment-cancellation";
import { createGymEnrollment } from "./enrollment-creation";
import { updateGymEnrollment, type UpdateEnrollmentInput } from "./enrollment-update";
import { safeCentsNumber } from "../domain/money";
import { acceptGymContract } from "./enrollment-contract";
import { activateGymEnrollment } from "./enrollment-activation";
import { getGymUnitAccess } from "./gym-unit-access";
import { serializableTransaction } from "./transaction";
import { previewGymPlanChange, requestGymEnrollmentRevision } from "./enrollment-revision";

export type { UpdateEnrollmentInput };
export { updateGymEnrollment };
/**
 * GYM-033: Serviço de Matrículas e Contratos de Academia (GymEnrollment & GymContractAcceptance)
 *
 * Garante:
 * 1. Associação estrita a uma versão imutável de plano (GymPlanVersion).
 * 2. Suporte a pagador próprio (aluno adulto ou responsável legal/financeiro de menor).
 * 3. Assinatura eletrônica com comprovação jurídica (snapshot dos termos, IP, UserAgent, data).
 * 4. Ativação da matrícula: direito de acesso concedido SOMENTE após aceite contratual
 *    e satisfação das condições de pagamento inicial.
 * 5. Ciclo de eventos rastreáveis (GymEnrollmentEvent) e pausas controladas (GymEnrollmentPause).
 */

import { GymEnrollmentStatus, type Prisma } from "@prisma/client"
import { WorkspaceAccessError } from "../domain/types"
import { GymPlanService } from "./plan-service"

export interface CreateEnrollmentInput {
  workspaceId: string
  studentMemberId: string
  planVersionId: string
  unitId?: string | null
  startDate?: Date | string
  autoRenew?: boolean
  customPriceInCents?: number | bigint | string
  billingPayerUserId?: string | null
  billingPayerGuardianId?: string | null
  billingPayerName?: string | null
  billingPayerCpf?: string | null
  billingPayerEmail?: string | null
  billingPayerPhone?: string | null
  actorUserId: string
}

export interface AcceptContractInput {
  enrollmentId: string
  workspaceId: string
  signerUserId: string
  accepted?: boolean
  contractDigest?: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface ActivateEnrollmentInput {
  enrollmentId: string
  workspaceId: string
  actorUserId: string
  paymentVerified?: boolean
  overrideReason?: string | null
}

export interface PauseEnrollmentInput {
  enrollmentId: string
  workspaceId: string
  startDate: Date | string
  endDate: Date | string
  reason: string
  actorUserId: string
  extendEndDate?: boolean
  billingResumePolicy?: "SKIP"
}

export interface ResumeEnrollmentInput {
  enrollmentId: string
  workspaceId: string
  actorUserId: string
}

export interface CancelEnrollmentInput {
  enrollmentId: string
  workspaceId: string
  reason: string
  actorUserId: string
  immediate?: boolean
}

export interface SimulatePlanChangeServiceInput {
  enrollmentId: string
  workspaceId: string
  newPlanVersionId: string
  mode: "IMMEDIATE" | "NEXT_CYCLE"
  changeDate?: Date | string
  actorUserId?: string
}

export interface ChangePlanInput {
  enrollmentId: string
  workspaceId: string
  newPlanVersionId: string
  mode: "IMMEDIATE" | "NEXT_CYCLE"
  actorUserId: string
  reason?: string
  requestKey?: string
  initialChargeInCents?: number
  financialAdjustmentApproved?: true
}

export interface RenewEnrollmentInput {
  enrollmentId: string
  workspaceId: string
  actorUserId: string
  durationDays?: number
  useScheduledPlanVersion?: boolean
  requestKey?: string
}

export interface ListEnrollmentsFilter {
  status?: GymEnrollmentStatus
  studentMemberId?: string
  unitId?: string
  planId?: string
  search?: string
  page?: number
  limit?: number
}

export class GymEnrollmentService {
  /**
   * Converte com segurança BigInts da matrícula para serialização JSON no Next.js
   */
  static serializeEnrollment<
    T extends {
      priceInCents: bigint
      enrollmentFeeInCents: bigint
      creditBalanceInCents?: bigint
      initialChargeInCents?: bigint | null
      changeRequestKey?: string | null
      changeRequestFingerprint?: string | null
      creditCardToken?: string | null
      planVersion?: { priceInCents: bigint; enrollmentFeeInCents: bigint } | null
      scheduledPlanVersion?: { priceInCents: bigint; enrollmentFeeInCents: bigint } | null
    }
  >(enrollment: T) {
    const { creditCardToken, changeRequestKey, changeRequestFingerprint, ...fields } = enrollment;
    return {
      ...fields,
      initialChargeInCents: enrollment.initialChargeInCents == null ? null : safeCentsNumber(enrollment.initialChargeInCents),
      priceInCents: safeCentsNumber(enrollment.priceInCents),
      enrollmentFeeInCents: safeCentsNumber(enrollment.enrollmentFeeInCents),
      creditBalanceInCents:
        enrollment.creditBalanceInCents !== undefined
          ? safeCentsNumber(enrollment.creditBalanceInCents)
          : 0,
      planVersion: enrollment.planVersion
        ? GymPlanService.serializePlanVersion(enrollment.planVersion)
        : undefined,
      scheduledPlanVersion: enrollment.scheduledPlanVersion
        ? GymPlanService.serializePlanVersion(enrollment.scheduledPlanVersion)
        : undefined,
    }
  }

  /**
   * Cria uma nova matrícula/contrato para um aluno.
   * Nasce em status PENDING_ACCEPTANCE com accessGranted = false.
   */
  async createEnrollment(input: CreateEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await createGymEnrollment(input)); }

  /**
   * Atualização de dados cadastrais/comerciais da matrícula.
   */
  async updateEnrollment(input: UpdateEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await updateGymEnrollment(input)); }

  /**
   * Assinatura/Aceite eletrônico do contrato da matrícula.
   * - Adulto: assina em nome próprio.
   * - Menor: deve ser assinado por um responsável com isLegalRepresentative === true.
   * - Registra snapshot imutável dos termos aceitos.
   * - Transita para PENDING_ACTIVATION.
   */
  async acceptContract(input: AcceptContractInput) { return acceptGymContract(input); }

  /**
   * Ativação da matrícula e concessão do direito de acesso contratado (matrícula).
   * REGRA CENTRAL GYM-033:
   * Aluno não recebe direito contratual antes das condições de ativação:
   * - Contrato assinado (acceptance)
   * - Pagamento verificado ou override explícito da recepção/gerência com justificativa
   */
  async activateEnrollment(input: ActivateEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await activateGymEnrollment(input)); }

  /**
   * Pausa temporária da matrícula (trancamento).
   * Revoga instantaneamente o direito de acesso contratado (accessGranted = false).
   */
  async pauseEnrollment(input: PauseEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await pauseGymEnrollment(input)); }

  async resumeEnrollment(input: ResumeEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await resumeGymEnrollment(input)); }

  /**
   * Cancelamento de matrícula: imediato ou programado ao final da vigência contratual.
   * - Imediato: revoga instantaneamente o direito de acesso contratado (accessGranted = false).
   * - Programado: desativa renovações e programa cancelamento para a data de expiração,
   *   preservando o estado atual até o término da vigência; não comprova pagamento.
   */
  async cancelEnrollment(input: CancelEnrollmentInput) { return GymEnrollmentService.serializeEnrollment(await cancelGymEnrollment(input)); }

  /**
   * Consulta paginada de matrículas com filtros por status, aluno, filial e plano.
   */
  async listEnrollments(workspaceId: string, filter: ListEnrollmentsFilter, actorUserId: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator necessário para consultar matrículas.");
    return serializableTransaction(async tx => {
    const scope = await getGymUnitAccess(tx, workspaceId, actorUserId, "enrollments.read");
    if (filter.unitId && !scope.units.some(unit => unit.id === filter.unitId)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Unidade indisponível para esta consulta.");
    const { status, studentMemberId, unitId, planId, search, page = 1, limit = 20 } = filter

    if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Paginação inválida.");
    const where: Prisma.GymEnrollmentWhereInput = { workspaceId, studentMember: { workspaceId }, planVersion: { plan: { workspaceId } }, OR: [{ unitId: { in: scope.units.map(unit => unit.id) } }, ...(scope.includeUnassigned ? [{ unitId: null }] : [])] }

    if (status) where.status = status
    if (studentMemberId) where.studentMemberId = studentMemberId
    if (unitId) where.unitId = unitId
    if (planId) {
      where.planVersion = { planId, plan: { workspaceId } }
    }

    if (search && search.trim().length > 0) {
      const q = search.trim()
      where.studentMember = {
        workspaceId,
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
            { cpfCnpj: { contains: q } },
          ],
        },
      }
    }

    const skip = (page - 1) * limit

    const total = await tx.gymEnrollment.count({ where });
    const enrollments = await tx.gymEnrollment.findMany({
        omit: { creditCardToken: true },
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: {
          planVersion: { select: {id:true,planId:true,name:true,version:true,billingCycle:true,durationDays:true,priceInCents:true,enrollmentFeeInCents:true,termsVersion:true,isActive:true,createdAt:true} },
          studentMember: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                  cpfCnpj: true,
                  whatsapp: true,
                },
              },
            },
          },
          unit: true,
          acceptance: {select:{id:true,signedAt:true,signerUserId:true,representedUserId:true,representationRole:true,termsVersion:true}},
        },
      });

    return {
      enrollments: enrollments.map(GymEnrollmentService.serializeEnrollment),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
    });
  }

  /**
   * Obtém detalhes completos de uma matrícula específica.
   */
  async getEnrollmentById(enrollmentId: string, workspaceId: string, actorUserId: string, historyPage=1) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator necessário para consultar contratos.");
    return serializableTransaction(async tx => {
    if (!Number.isSafeInteger(historyPage) || historyPage<1 || historyPage>10000) throw new WorkspaceAccessError(400,"INVALID_REQUEST","Página de histórico inválida.");
    const scope = await getGymUnitAccess(tx, workspaceId, actorUserId, "enrollments.read");
    const enrollment = await tx.gymEnrollment.findFirst({
        omit: { creditCardToken: true },
      where: { id: enrollmentId, workspaceId, studentMember: { workspaceId }, planVersion: { plan: { workspaceId } }, OR: [{ unitId: { in: scope.units.map(unit => unit.id) } }, ...(scope.includeUnassigned ? [{ unitId: null }] : [])] },
      include: {
        planVersion: { include: { plan: true } },
        studentMember: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                cpfCnpj: true,
                whatsapp: true,
                birthDate: true,
              },
            },
            guardians: { where: { workspaceId, revokedAt: null }, take:50, orderBy:{id:"asc"} },
          },
        },
        unit: true,
        acceptance: {
          include: {
            signerUser: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select:{events:true,pauses:true} },
        events: { take:20,skip:(historyPage-1)*20, orderBy:[{createdAt:"desc"},{id:"desc"}] },
        pauses: { take:20,skip:(historyPage-1)*20, orderBy:[{createdAt:"desc"},{id:"desc"}] },
      },
    })

    if (!enrollment) {
      throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada.")
    }

    return { ...GymEnrollmentService.serializeEnrollment(enrollment), historyPagination:{page:historyPage,limit:20,eventTotal:enrollment._count.events,pauseTotal:enrollment._count.pauses,totalPages:Math.ceil(Math.max(enrollment._count.events,enrollment._count.pauses)/20)} }
    });
  }

  async simulatePlanChange(input: SimulatePlanChangeServiceInput) {
    if (!input.actorUserId || input.changeDate !== undefined) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Ator e data de efetivação devem ser determinados pelo servidor.");
    return previewGymPlanChange({ workspaceId: input.workspaceId, enrollmentId: input.enrollmentId, actorUserId: input.actorUserId, newPlanVersionId: input.newPlanVersionId, mode: input.mode });
  }

  async changePlan(input: ChangePlanInput) {
    if (!input.requestKey) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Identifique a tentativa de contratação.");
    return GymEnrollmentService.serializeEnrollment(await requestGymEnrollmentRevision({ ...input, requestKey: input.requestKey, kind: "PLAN_CHANGE" }));
  }

  async renewEnrollment(input: RenewEnrollmentInput) {
    if (!input.requestKey || input.durationDays !== undefined || input.useScheduledPlanVersion !== undefined) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "A renovação utiliza a vigência contratada e exige uma tentativa identificada.");
    return GymEnrollmentService.serializeEnrollment(await requestGymEnrollmentRevision({ ...input, requestKey: input.requestKey, kind: "RENEWAL" }));
  }

  /**
   * Processador de expiração e cancelamento programado (Job/Cron idempotente).
   * - Transiciona matrículas vencidas sem auto-renovação para EXPIRED.
   * - Efetiva cancelamentos programados que atingiram sua cancellationEffectiveDate para CANCELLED.
   * - Revoga direito de acesso à matrícula (accessGranted = false).
   */
  async processExpiredEnrollments(workspaceId?: string) { return processLocalEnrollmentClosures(workspaceId); }
}

export const gymEnrollmentService = new GymEnrollmentService()
