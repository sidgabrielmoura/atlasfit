import type { GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";

/** Must run inside the same Serializable transaction that changes lifecycle state. */
export async function assertSingleLiveGymEnrollment(tx: GymTransactionClient, enrollment: { id?: string; workspaceId: string; studentMemberId: string; supersedesEnrollmentId?: string | null }) {
  const excluded = [...(enrollment.id ? [enrollment.id] : []), ...(enrollment.supersedesEnrollmentId ? [enrollment.supersedesEnrollmentId] : [])];
  const other = await tx.gymEnrollment.findFirst({ where: {
    workspaceId: enrollment.workspaceId, studentMemberId: enrollment.studentMemberId,
    status: { in: ["ACTIVE", "PAUSED"] }, id: { notIn: excluded },
  }, select: { id: true } });
  if (other) throw new WorkspaceAccessError(409, "ACTIVE_ENROLLMENT_EXISTS", "O aluno já tem uma matrícula ativa ou pausada nesta academia. Utilize troca ou renovação do contrato existente.");
}
