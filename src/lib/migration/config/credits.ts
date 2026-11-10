/**
 * Configuração oficial de custos de créditos para importação de alunos, treinos e dados via IA ou processamento determinístico.
 *
 * Conforme parâmetros do produto:
 * - 50 créditos a cada 1.000 tokens consumidos pela IA (Gemini).
 * - Custo base por entidade processada (garante sustentabilidade e proporcionalidade ao volume de dados).
 * - Planilhas determinísticas (sem uso de tokens da IA) cobram apenas o custo base das entidades.
 */

export const IMPORT_CREDIT_COSTS = {
  /** Custo de 50 créditos a cada 1.000 tokens processados pela IA (tokens de entrada + saída) */
  CREDITS_PER_1K_TOKENS: 50,

  /** Custos base por entidade extraída/processada com sucesso */
  BASE_PER_STUDENT: 10,
  BASE_PER_WORKOUT: 5,
  BASE_PER_ASSESSMENT: 5,
  BASE_PER_MEASUREMENT: 5,
} as const;

export interface EntityCountsForCost {
  students?: number;
  workouts?: number;
  assessments?: number;
  measurements?: number;
}

/**
 * Calcula a quantidade de créditos correspondente a um número total de tokens consumidos na chamada do Gemini.
 */
export function calculateTokenCredits(totalTokens: number): number {
  if (!totalTokens || totalTokens <= 0) return 0;
  // 50 créditos para cada 1.000 tokens -> totalTokens * 0.05
  return Math.ceil((totalTokens * IMPORT_CREDIT_COSTS.CREDITS_PER_1K_TOKENS) / 1000);
}

/**
 * Calcula o custo total em créditos para um lote de entidades processadas + tokens de IA.
 */
export function calculateBatchCreditCost(
  counts: EntityCountsForCost,
  totalTokens: number = 0
): {
  baseCredits: number;
  tokenCredits: number;
  totalCredits: number;
} {
  const students = Math.max(0, counts.students ?? 0);
  const workouts = Math.max(0, counts.workouts ?? 0);
  const assessments = Math.max(0, counts.assessments ?? 0);
  const measurements = Math.max(0, counts.measurements ?? 0);

  const baseCredits =
    students * IMPORT_CREDIT_COSTS.BASE_PER_STUDENT +
    workouts * IMPORT_CREDIT_COSTS.BASE_PER_WORKOUT +
    assessments * IMPORT_CREDIT_COSTS.BASE_PER_ASSESSMENT +
    measurements * IMPORT_CREDIT_COSTS.BASE_PER_MEASUREMENT;

  const tokenCredits = calculateTokenCredits(totalTokens);
  const totalCredits = baseCredits + tokenCredits;

  return {
    baseCredits,
    tokenCredits,
    totalCredits,
  };
}
