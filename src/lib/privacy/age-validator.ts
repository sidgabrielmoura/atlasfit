import { parseBirthDate, civilAge } from "./civil-age";
/**
 * ATLASFIT — CENTRALIZED AGE ELIGIBILITY VALIDATOR
 *
 * Enforces the platform 18+ policy on the server-side across all creation and update entry points:
 * - Personal signup & onboarding
 * - Student direct onboarding & setup-password
 * - Manual client creation by trainer
 * - AI Import / Migration pipeline
 * - Public lead capture
 */

export interface AgeValidationResult {
  isValid: boolean;
  age?: number;
  birthDate?: Date;
  error?: string;
}

export function validateAgeEligibility(
  birthDateInput: string | Date | null | undefined,
  minAge = 18
): AgeValidationResult {
  const birthDate = parseBirthDate(birthDateInput);
  if (!birthDate) return { isValid: false, error: birthDateInput ? "Data de nascimento inválida." : "A data de nascimento é obrigatória para validação de elegibilidade da conta." };
  const age = civilAge(birthDate);
  if (age < 0) return { isValid: false, error: "A data de nascimento não pode estar no futuro." };
  if (age < minAge) return { isValid: false, age, error: `O AtlasFit é exclusivo para maiores de ${minAge} anos. O cadastro de menores não é permitido.` };
  if (age > 120) return { isValid: false, age, error: "Data de nascimento inválida (idade superior a 120 anos)." };
  return { isValid: true, age, birthDate };
}

export interface GymAgeValidationResult {
  isValid: boolean;
  age?: number;
  birthDate?: Date;
  isMinor: boolean;
  requiresGuardian: boolean;
  error?: string;
}

/**
 * Validates age eligibility specifically in the context of Gym (Academia) workspaces.
 * - Adults (18+): valid, isMinor = false, no guardian required.
 * - Minors (between minMinorAge, e.g. 12, and 17): valid, isMinor = true, requiresGuardian = true.
 * - Children under minMinorAge (< 12): invalid without specific institutional pediatric program.
 */
export function validateGymMinorEligibility(
  birthDateInput: string | Date | null | undefined,
  minMinorAge = 12
): GymAgeValidationResult {
  const birthDate = parseBirthDate(birthDateInput);
  if (!birthDate) return { isValid: false, isMinor: false, requiresGuardian: false, error: birthDateInput ? "Data de nascimento inválida." : "A data de nascimento é obrigatória para verificar elegibilidade." };
  const age = civilAge(birthDate);
  if (age < 0 || age > 120) return { isValid: false, isMinor: false, requiresGuardian: false, error: age < 0 ? "A data de nascimento não pode estar no futuro." : "Data de nascimento inválida (idade superior a 120 anos)." };
  const isMinor = age < 18;
  if (age < minMinorAge) return { isValid: false, age, birthDate, isMinor: true, requiresGuardian: true, error: `A idade mínima para matrícula nesta academia é de ${minMinorAge} anos com representação legal.` };
  return { isValid: true, age, birthDate, isMinor, requiresGuardian: isMinor };
}
