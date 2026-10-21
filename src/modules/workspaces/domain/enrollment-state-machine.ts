import { GymEnrollmentStatus } from "@prisma/client";

export const ALLOWED_ENROLLMENT_TRANSITIONS: Record<GymEnrollmentStatus, GymEnrollmentStatus[]> = {
  DRAFT: [GymEnrollmentStatus.PENDING_ACCEPTANCE, GymEnrollmentStatus.CANCELLED],
  PENDING_ACCEPTANCE: [GymEnrollmentStatus.PENDING_ACTIVATION, GymEnrollmentStatus.CANCELLED],
  PENDING_ACTIVATION: [GymEnrollmentStatus.ACTIVE, GymEnrollmentStatus.CANCELLED],
  ACTIVE: [GymEnrollmentStatus.PAUSED, GymEnrollmentStatus.CANCELLED, GymEnrollmentStatus.EXPIRED],
  PAUSED: [GymEnrollmentStatus.ACTIVE, GymEnrollmentStatus.CANCELLED, GymEnrollmentStatus.EXPIRED],
  CANCELLED: [],
  EXPIRED: [],
};

export class InvalidEnrollmentTransitionError extends Error {
  constructor(public readonly from: GymEnrollmentStatus, public readonly to: GymEnrollmentStatus) {
    super(`Transição inválida de matrícula de ${from} para ${to}.`);
    this.name = "InvalidEnrollmentTransitionError";
  }
}
export function canTransitionEnrollment(from: GymEnrollmentStatus, to: GymEnrollmentStatus): boolean {
  return from === to || ALLOWED_ENROLLMENT_TRANSITIONS[from].includes(to);
}
export function assertValidEnrollmentTransition(from: GymEnrollmentStatus, to: GymEnrollmentStatus): void {
  if (!canTransitionEnrollment(from, to)) throw new InvalidEnrollmentTransitionError(from, to);
}