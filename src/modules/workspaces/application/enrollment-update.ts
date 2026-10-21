import { z } from "zod";
import { type Prisma } from "@prisma/client";
import { WorkspaceAccessError } from "../domain/types";
import { cents, safeCentsNumber } from "../domain/money";
import { serializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { isValidCpfCnpj } from "@/lib/cpf-validator";
import { gymPublicUserSelect } from "../domain/public-user";

const id = z.string().trim().min(1).max(100);
const text = z.string().trim().max(150).nullable().optional();
const date = z.union([z.date(), z.string().date(), z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform(value => new Date(value));

export const updateGymEnrollmentSchema = z.object({
  workspaceId: id,
  enrollmentId: id,
  customPriceInCents: z.union([z.number().int().safe().nonnegative(), z.bigint().nonnegative(), z.string().regex(/^\d+$/)]).optional(),
  autoRenew: z.boolean().optional(),
  billingPayerName: text,
  billingPayerCpf: text,
  billingPayerEmail: z.string().trim().email().max(254).nullable().optional(),
  billingPayerPhone: z.string().trim().max(30).nullable().optional(),
  nextDueDate: date.nullable().optional(),
  endDate: date.nullable().optional(),
}).strict();

export interface UpdateEnrollmentInput {
  enrollmentId: string;
  workspaceId: string;
  actorUserId: string;
  customPriceInCents?: number | bigint | string;
  autoRenew?: boolean;
  billingPayerName?: string | null;
  billingPayerCpf?: string | null;
  billingPayerEmail?: string | null;
  billingPayerPhone?: string | null;
  nextDueDate?: Date | string | null;
  endDate?: Date | string | null;
}

export async function updateGymEnrollment(input: UpdateEnrollmentInput) {
  const { actorUserId, ...request } = input;
  const parsed = updateGymEnrollmentSchema.safeParse(request);
  if (!parsed.success) {
    throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Revise os dados de alteração da matrícula.");
  }
  const data = parsed.data;

  return serializableTransaction(async tx => {
    const enrollment = await tx.gymEnrollment.findFirst({
      where: { id: data.enrollmentId, workspaceId: data.workspaceId },
      include: {
        planVersion: { include: { plan: true } },
        studentMember: { include: { user: { select: gymPublicUserSelect } } },
      },
    });

    if (!enrollment) {
      throw new WorkspaceAccessError(404, "ENROLLMENT_NOT_FOUND", "Matrícula não encontrada.");
    }

    await assertActorAuthority(tx, data.workspaceId, actorUserId, "enrollments.manage", enrollment.unitId);

    const updateData: Prisma.GymEnrollmentUpdateInput = {};

    if (data.customPriceInCents !== undefined) {
      const price = cents(data.customPriceInCents);
      safeCentsNumber(price);
      if (price < BigInt(0)) {
        throw new WorkspaceAccessError(400, "INVALID_AMOUNT", "Preço não pode ser negativo.");
      }
      updateData.priceInCents = price;
    }

    if (data.autoRenew !== undefined) {
      updateData.autoRenew = data.autoRenew;
    }

    if (data.billingPayerName !== undefined) {
      updateData.billingPayerName = data.billingPayerName ? data.billingPayerName.trim() : null;
    }

    if (data.billingPayerCpf !== undefined) {
      if (data.billingPayerCpf && data.billingPayerCpf.trim().length > 0) {
        const cleanedCpf = data.billingPayerCpf.replace(/\D/g, "");
        if (!isValidCpfCnpj(cleanedCpf)) {
          throw new WorkspaceAccessError(400, "INVALID_PAYER", "CPF do pagador inválido.");
        }
        updateData.billingPayerCpf = cleanedCpf;
      } else {
        updateData.billingPayerCpf = null;
      }
    }

    if (data.billingPayerEmail !== undefined) {
      updateData.billingPayerEmail = data.billingPayerEmail ? data.billingPayerEmail.trim() : null;
    }

    if (data.billingPayerPhone !== undefined) {
      updateData.billingPayerPhone = data.billingPayerPhone ? data.billingPayerPhone.trim() : null;
    }

    if (data.nextDueDate !== undefined) {
      updateData.nextDueDate = data.nextDueDate;
    }

    if (data.endDate !== undefined) {
      updateData.endDate = data.endDate;
    }

    if (data.nextDueDate !== undefined || data.customPriceInCents !== undefined || data.autoRenew === true) { updateData.billingRetryAt = null; updateData.billingFailureCount = 0; }
    const updated = await tx.gymEnrollment.update({
      where: { id: enrollment.id },
      data: updateData,
      omit: { creditCardToken: true },
      include: {
        planVersion: { include: { plan: true } },
        studentMember: {
          include: {
            user: { select: gymPublicUserSelect },
          },
        },
        unit: true,
        acceptance: true,
      },
    });

    await tx.gymEnrollmentEvent.create({
      data: {
        enrollmentId: enrollment.id,
        workspaceId: data.workspaceId,
        fromStatus: enrollment.status,
        toStatus: updated.status,
        actorId: actorUserId,
        reason: "ENROLLMENT_UPDATED: Dados da matrícula editados.",
      },
    });

    return updated;
  });
}
