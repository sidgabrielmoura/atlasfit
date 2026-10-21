import { transitionGymMajority } from "./gym-majority-transition";
import { listGuardianDependents } from "./guardian-portal";
import { recordGuardianLegalAcceptance } from "./guardian-legal-commands";
import { addGymGuardian, updateGymGuardian, verifyGymGuardian, revokeGymGuardian, listGymStudentGuardians } from "./guardian-commands";
import { gymPublicUserSelect } from "../domain/public-user";
import prisma from "@/lib/prisma";
import { WorkspaceAccessError } from "../domain/types";
import { validateGymMinorEligibility } from "@/lib/privacy/age-validator";
import { LegalDocumentType } from "@prisma/client";

export interface AddGuardianInput {
  workspaceId: string;
  studentMemberId: string;
  actorUserId: string;
  name: string;
  cpf: string;
  phone: string;
  email?: string | null;
  relationship: string; // "PAI", "MAE", "TUTOR_LEGAL", "OUTRO"
  isLegalRepresentative?: boolean;
  isFinancialResponsible?: boolean;
  isEmergencyContact?: boolean;
  hasHealthAccess?: boolean;
  guardianUserId?: string | null;
}

export interface UpdateGuardianInput {
  workspaceId: string;
  guardianId: string;
  actorUserId: string;
  name?: string;
  phone?: string;
  email?: string | null;
  relationship?: string;
  isLegalRepresentative?: boolean;
  isFinancialResponsible?: boolean;
  isEmergencyContact?: boolean;
  hasHealthAccess?: boolean;
  guardianUserId?: string | null;
}

export class MinorService {
  /**
   * Cleans CPF digits.
   */
  static cleanCpf(cpf: string): string {
    return cpf.replace(/\D/g, "");
  }

  /**
   * Links or registers a legal guardian for a minor student member.
   * - Enforces least privilege: health access defaults to false.
   * - Distinguishes legal representation, financial responsibility, and emergency contact.
   * - Derives isMinor from the persisted birth date; identity verification is separate.
   */
  async addGuardian(input: AddGuardianInput) { return addGymGuardian(input); }

  /**
   * Updates guardian powers, contact details, or health access permissions.
   */
  async updateGuardian(input: UpdateGuardianInput) { return updateGymGuardian(input); }

  /**
   * Revokes representation of a guardian (e.g. custody change, legal order).
   */
  async revokeGuardian(workspaceId: string, guardianId: string, actorUserId: string, reason?: string) { return revokeGymGuardian(workspaceId, guardianId, actorUserId, reason); }

  /**
   * Verifies identity document / power of attorney presented by guardian at the desk.
   */
  async verifyGuardian(workspaceId: string, guardianId: string, actorUserId: string, notes?: string) { return verifyGymGuardian(workspaceId, guardianId, actorUserId, notes); }

  /**
   * Records legal terms acceptance on behalf of a minor student by their legal guardian.
   */
  async recordMinorLegalAcceptance(params: { workspaceId: string; guardianId: string; guardianUserId: string; documentType: LegalDocumentType; documentId?: string; documentHash?: string; accepted?: boolean; documentVersion?: string; ipAddress?: string | null; userAgent?: string | null }) { return recordGuardianLegalAcceptance(params); }

  /**
   * Lists all active guardians for a student member in a workspace.
   */
  async listStudentGuardians(workspaceId: string, studentMemberId: string, actorUserId?: string) { return listGymStudentGuardians(workspaceId, studentMemberId, actorUserId); }

  /**
   * Lists minor dependents for a guardian user across gyms (for the Portal do Responsável).
   * - Strict health privacy: omits confidential evaluations unless hasHealthAccess is true.
   */
  async listDependentsForGuardian(guardianUserId: string) { return listGuardianDependents(guardianUserId); }

  /**
   * Checks whether a minor has reached adulthood (18 years) and transitions their legal status.
   */
  async checkMajorityTransition(workspaceId: string, studentMemberId: string, actorUserId?: string) {
    if (!actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório para a transição coordenada.");
    return transitionGymMajority(workspaceId, studentMemberId, actorUserId);
  }
}

export const minorService = new MinorService();
