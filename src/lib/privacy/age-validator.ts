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
  if (!birthDateInput) {
    return {
      isValid: false,
      error: "A data de nascimento é obrigatória para validação de elegibilidade da conta.",
    };
  }

  let birthDate: Date;
  if (birthDateInput instanceof Date) {
    birthDate = birthDateInput;
  } else if (typeof birthDateInput === "string") {
    const trimmed = birthDateInput.trim();
    if (!trimmed) {
      return {
        isValid: false,
        error: "A data de nascimento é obrigatória para validação de elegibilidade da conta.",
      };
    }
    
    // Support ISO (YYYY-MM-DD) and Brazilian (DD/MM/YYYY) formats
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
      const [day, month, year] = trimmed.split("/").map(Number);
      birthDate = new Date(Date.UTC(year, month - 1, day));
    } else {
      birthDate = new Date(trimmed);
    }
  } else {
    return {
      isValid: false,
      error: "Formato de data de nascimento inválido.",
    };
  }

  if (isNaN(birthDate.getTime())) {
    return {
      isValid: false,
      error: "Data de nascimento inválida.",
    };
  }

  const now = new Date();
  const todayAtMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const birthAtMidnight = new Date(birthDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());

  if (birthAtMidnight > todayAtMidnight) {
    return {
      isValid: false,
      error: "A data de nascimento não pode estar no futuro.",
    };
  }

  // Exact age calculation
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < minAge) {
    return {
      isValid: false,
      age,
      error: `O AtlasFit é exclusivo para maiores de ${minAge} anos. O cadastro de menores não é permitido.`,
    };
  }

  if (age > 120) {
    return {
      isValid: false,
      age,
      error: "Data de nascimento inválida (idade superior a 120 anos).",
    };
  }

  return {
    isValid: true,
    age,
    birthDate,
  };
}
