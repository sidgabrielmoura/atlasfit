/** Extensão pela duração efetivamente suspensa; sem crédito financeiro implícito. */
export function calculatePauseExtension(params: {
  currentEndDate: Date | null
  pauseStartDate: Date
  pauseEndDate: Date
}): Date | null {
  if (!params.currentEndDate) return null

  const startMs = new Date(params.pauseStartDate).getTime()
  const endMs = new Date(params.pauseEndDate).getTime()
  if (![startMs, endMs, params.currentEndDate.getTime()].every(Number.isFinite)) throw new Error("Datas de pausa inválidas.")
  // Extend by actual suspended time; a retry or zero-length pause adds no invented day.
  return new Date(params.currentEndDate.getTime() + Math.max(0, endMs - startMs))
}
