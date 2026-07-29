import prisma from "@/lib/prisma";
import { normalizePhone, normalizeEmail, normalizeDate } from "../normalization/normalization.service";

export type DeduplicationLevel = "EXACT_MATCH" | "PROBABLE_MATCH" | "NO_MATCH";

export interface StudentMatchResult {
  level: DeduplicationLevel;
  existingStudentId: string | null;
  existingStudentName: string | null;
  matchReason?: string;
}

/**
 * Checks an extracted student against existing students in the workspace.
 * Queries WorkspaceMember where workspaceId = activeWorkspaceId and role = "STUDENT".
 */
export async function checkStudentDuplicate(
  workspaceId: string,
  extracted: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    birthDate?: string | null;
  }
): Promise<StudentMatchResult> {
  const normEmail = normalizeEmail(extracted.email).normalizedValue;
  const normPhone = normalizePhone(extracted.phone).normalizedValue;
  const normBirthDate = normalizeDate(extracted.birthDate).normalizedValue;

  // Fetch all student members of the workspace
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      role: "STUDENT",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          whatsapp: true,
          birthDate: true,
        },
      },
    },
  });

  for (const m of workspaceMembers) {
    const user = m.user;
    if (!user) continue;

    const dbEmail = normalizeEmail(user.email).normalizedValue;
    const dbPhone = normalizePhone(user.whatsapp).normalizedValue;
    const dbBirthDate = normalizeDate(user.birthDate).normalizedValue;

    // 1. EXACT_MATCH: Phone match or Email match
    if (normPhone && dbPhone && normPhone === dbPhone) {
      return {
        level: "EXACT_MATCH",
        existingStudentId: user.id,
        existingStudentName: user.name ?? "Sem Nome",
        matchReason: `Telefone coincidente (${normPhone})`,
      };
    }

    if (normEmail && dbEmail && normEmail === dbEmail) {
      return {
        level: "EXACT_MATCH",
        existingStudentId: user.id,
        existingStudentName: user.name ?? "Sem Nome",
        matchReason: `E-mail coincidente (${normEmail})`,
      };
    }

    // 2. PROBABLE_MATCH: Same Name + Same BirthDate
    if (extracted.name && user.name) {
      const normExtName = extracted.name.trim().toLowerCase();
      const normDbName = user.name.trim().toLowerCase();

      if (normExtName === normDbName && normBirthDate && dbBirthDate && normBirthDate === dbBirthDate) {
        return {
          level: "PROBABLE_MATCH",
          existingStudentId: user.id,
          existingStudentName: user.name,
          matchReason: `Nome e data de nascimento coincidentes`,
        };
      }
    }
  }

  return {
    level: "NO_MATCH",
    existingStudentId: null,
    existingStudentName: null,
  };
}
