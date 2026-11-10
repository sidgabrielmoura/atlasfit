/**
 * Utilitário para cálculo e avanço de datas de vencimento de assinaturas e faturas da plataforma.
 */

export function advanceBillingDueDate(
  currentDate: Date | null,
  periodicity: string = "MENSAL",
  now: Date = new Date()
): Date {
  const upper = (periodicity || "MENSAL").toUpperCase().trim();

  // Se não houver data anterior, define a partir de hoje
  if (!currentDate || !Number.isFinite(currentDate.getTime())) {
    const base = new Date(now);
    base.setUTCDate(base.getUTCDate() + 30);
    base.setUTCHours(12, 0, 0, 0);
    return base;
  }

  // Se a data de vencimento for muito antiga (mais de 45 dias no passado),
  // ajustamos a base para o mês atual preservando o dia de vencimento original
  const targetDay = currentDate.getUTCDate();
  let base = new Date(currentDate);

  if (currentDate.getTime() < now.getTime() - 45 * 24 * 60 * 60 * 1000) {
    base = new Date(now);
    base.setUTCDate(Math.min(targetDay, 28));
  }

  if (upper === "SEMANAL") {
    return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  if (upper === "QUINZENAL") {
    return new Date(base.getTime() + 15 * 24 * 60 * 60 * 1000);
  }

  let monthsToAdd = 1;
  if (upper === "TRIMESTRAL") monthsToAdd = 3;
  else if (upper === "SEMESTRAL") monthsToAdd = 6;
  else if (upper === "ANUAL") monthsToAdd = 12;

  const next = new Date(base);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + monthsToAdd);

  const lastDayOfMonth = new Date(
    Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)
  ).getUTCDate();

  next.setUTCDate(Math.min(targetDay, lastDayOfMonth));
  next.setUTCHours(
    currentDate.getUTCHours(),
    currentDate.getUTCMinutes(),
    currentDate.getUTCSeconds(),
    currentDate.getUTCMilliseconds()
  );

  return next;
}
