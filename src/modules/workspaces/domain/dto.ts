/**
 * Sanitized Data Transfer Objects (DTOs) for Workspace entities.
 * 
 * Enforces security rule #29 (Serialization & Data Minimization):
 * Never return passwordHash, setupTokens, secrets, or internal metadata to client lists.
 */

export interface SanitizedStudentListItem {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  isActive: boolean;
  plan: string;
  modality: string;
  streak: number;
  bestStreak: number;
  image: string | null;
  progress: number;
  avatarFallback: string;
  lastActive: string;
  hasPassword: boolean;
}

export interface SanitizedStudentDetail extends SanitizedStudentListItem {
  gender: string | null;
  birthDate: Date | null;
  height: number | null;
  weight: number | null;
  objective: string | null;
  canDoAnyWorkoutDay: boolean;
}

export function buildAvatarFallback(name?: string | null, email?: string | null): string {
  const nameParts = name?.trim().split(/\s+/) || [];
  if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
  }
  return (name?.[0] || email?.[0] || "A").toUpperCase();
}

/**
 * Sanitizes a student record for list display.
 * Strips setupToken, password, and sensitive security flags.
 */
export function sanitizeStudentListItem(member: {
  isActive: boolean;
  plan: string;
  modality: string;
  streak: number;
  bestStreak: number;
  progress: number;
  lastActive: Date | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    whatsapp?: string | null;
    image: string | null;
    password?: string | null;
  };
}): SanitizedStudentListItem {
  const fallback = buildAvatarFallback(member.user.name, member.user.email);

  return {
    id: member.user.id,
    name: member.user.name || "Sem Nome",
    email: member.user.email || "",
    whatsapp: member.user.whatsapp || "",
    isActive: member.isActive,
    plan: member.plan,
    modality: member.modality,
    streak: member.streak,
    bestStreak: member.bestStreak,
    image: member.user.image,
    progress: member.progress,
    avatarFallback: fallback,
    lastActive: member.lastActive
      ? new Date(member.lastActive).toLocaleDateString("pt-BR")
      : "Não acessou",
    hasPassword: member.user.password !== null && member.user.password !== undefined,
  };
}

/**
 * Sanitizes a student record for detailed view.
 * Strips setupToken, password, and sensitive security flags.
 */
export function sanitizeStudentDetail(member: {
  isActive: boolean;
  plan: string;
  modality: string;
  streak: number;
  bestStreak: number;
  progress: number;
  lastActive: Date | null;
  canDoAnyWorkoutDay?: boolean | null;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    whatsapp?: string | null;
    image: string | null;
    password?: string | null;
    gender?: string | null;
    birthDate?: Date | null;
    height?: number | null;
    weight?: number | null;
    objective?: string | null;
  };
}): SanitizedStudentDetail {
  const base = sanitizeStudentListItem(member);

  return {
    ...base,
    gender: member.user.gender || null,
    birthDate: member.user.birthDate || null,
    height: member.user.height ?? null,
    weight: member.user.weight ?? null,
    objective: member.user.objective || null,
    canDoAnyWorkoutDay: member.canDoAnyWorkoutDay ?? false,
  };
}
