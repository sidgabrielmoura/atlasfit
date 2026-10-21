import { listGymStudents, getGymStudent, checkGymStudentDuplicate } from "./gym-student-queries";
import { registerGymStudent, updateGymStudent } from "./gym-student-commands";
import { WorkspaceContext } from "../domain/types";

export interface ListGymStudentsOptions {
  workspaceId: string;
  actorContext: WorkspaceContext;
  page?: number;
  limit?: number;
  search?: string;
  unitId?: string | null;
  assignedStaffId?: string | null;
  status?: string; // "ACTIVE" | "INACTIVE" | "ALL"
  plan?: string;
}

export interface RegisterGymStudentInput {
  /** Required at runtime; legacy callers must supply a stable request key. */
  idempotencyKey?: string;
  workspaceId: string;
  actorUserId: string;
  existingUserId?: string | null;
  identityLinkProofId?: string | null;
  name?: string;
  email?: string | null;
  cpfCnpj?: string | null;
  whatsapp?: string | null;
  birthDate?: string | Date | null;
  gender?: string | null;
  unitId?: string | null;
  assignedStaffId?: string | null;
  plan?: string;
  modality?: string;
  registrationNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalClearance?: boolean;
  medicalClearanceExpiresAt?: Date | null;
  notes?: string | null;
  guardian?: {
    name: string;
    cpf: string;
    phone: string;
    email?: string | null;
    relationship?: string;
    isLegalRepresentative?: boolean;
    isFinancialResponsible?: boolean;
    isEmergencyContact?: boolean;
    hasHealthAccess?: boolean;
  } | null;
}

export interface UpdateGymStudentInput {
  workspaceId: string;
  memberId: string;
  actorContext: WorkspaceContext;
  name?: string;
  whatsapp?: string | null;
  birthDate?: string | Date | null;
  unitId?: string | null;
  assignedStaffId?: string | null;
  plan?: string;
  modality?: string;
  isActive?: boolean;
  registrationNumber?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalClearance?: boolean;
  medicalClearanceExpiresAt?: Date | null;
  notes?: string | null;
  status?: string;
  canDoAnyWorkoutDay?: boolean;
}

export class GymStudentService {
  /**
   * Masks an email address for privacy in duplicate previews (e.g. j***o@domain.com).
   */
  static maskEmail(email?: string | null): string | null {
    if (!email || !email.includes("@")) return null;
    const [local, domain] = email.split("@");
    if (local.length <= 2) return `${local[0]}*@${domain}`;
    return `${local[0]}${"*".repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  /**
   * Masks a CPF number for privacy in duplicate previews (e.g. 123.***.***-45).
   */
  static maskCpf(cpf?: string | null): string | null {
    if (!cpf) return null;
    const clean = cpf.replace(/\D/g, "");
    if (clean.length !== 11) return "***.***.***-**";
    return `${clean.slice(0, 3)}.***.***-${clean.slice(9, 11)}`;
  }

  /**
   * Lists gym students with pagination, search, unit and trainer filtering, and capability scoping.
   */
  async listStudents(options: ListGymStudentsOptions) { return listGymStudents(options); }

  /**
   * Retrieves single student details with authorization checks.
   */
  async getStudentById(workspaceId: string, memberId: string, actorContext: WorkspaceContext) { return getGymStudent(workspaceId, memberId, actorContext); }

  /**
   * Checks for existing user duplicates across AtlasFit by CPF, email, or phone.
   */
  async checkDuplicate(workspaceId: string, params: { cpf?: string | null; email?: string | null; phone?: string | null }, actorUserId?: string, unitId?: string) { return checkGymStudentDuplicate(workspaceId, params, actorUserId, unitId); }

  /**
   * Registers a student in the gym workspace via assisted reception desk workflow.
   * - Enforces maxStudents license capacity.
   * - Allows linking existing user or creating new account.
   * - Never creates fake fictional emails if email is absent.
   * - Creates local GymStudentProfile with emergency contact and registration number.
   * - Logs security audit log.
   */
  async registerStudent(input: RegisterGymStudentInput) { return registerGymStudent(input); }

  /**
   * Updates student information, branch unit, assigned trainer, or local gym profile.
   */
  async updateStudent(input: UpdateGymStudentInput) { return updateGymStudent(input); }
}

export const gymStudentService = new GymStudentService();
