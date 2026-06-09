/**
 * Converte um objeto Date para uma string de data local no formato YYYY-MM-DD.
 * Essencial para evitar variações devido ao fuso horário (timezone offset) do servidor.
 */
export function getLocalDateString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split("T")[0];
}

/**
 * Converte uma data YYYY-MM-DD em dias absolutos desde o Epoch do Unix (UTC).
 * Isso garante uma comparação matemática precisa e à prova de fuso horário.
 */
export function dateToEpochDays(dateStr: string): number {
  const parts = dateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const utcDate = Date.UTC(year, month, day);
  return Math.floor(utcDate / (1000 * 60 * 60 * 24));
}

/**
 * Recalcula o streak ativo e o recorde histórico (bestStreak) a partir de uma lista de logs de treino.
 */
export function calculateStreaks(completedDates: Date[]): {
  streak: number;
  bestStreak: number;
} {
  if (completedDates.length === 0) {
    return { streak: 0, bestStreak: 0 };
  }

  // 1. Converter datas para strings locais de calendário (YYYY-MM-DD) e remover duplicados
  const uniqueDays = new Set<string>();
  completedDates.forEach((date) => {
    if (date) {
      uniqueDays.add(getLocalDateString(new Date(date)));
    }
  });

  // 2. Converter para dias relativos ao Unix Epoch e ordenar de forma ascendente
  const epochDays = Array.from(uniqueDays)
    .map(dateToEpochDays)
    .sort((a, b) => a - b);

  // 3. Encontrar a maior sequência de dias consecutivos na história (bestStreak)
  let bestStreak = 0;
  let currentBlock = 0;
  let lastDay = -999999;

  for (const day of epochDays) {
    if (day === lastDay + 1) {
      currentBlock++;
    } else if (day === lastDay) {
      // Ignorar duplicados (embora o Set já filtre, por segurança extra)
    } else {
      if (currentBlock > bestStreak) {
        bestStreak = currentBlock;
      }
      currentBlock = 1;
    }
    lastDay = day;
  }
  if (currentBlock > bestStreak) {
    bestStreak = currentBlock;
  }

  // 4. Calcular o streak ativo (currentStreak)
  // O streak está ativo se o último dia treinado foi hoje ou ontem.
  const todayStr = getLocalDateString(new Date());
  const todayEpoch = dateToEpochDays(todayStr);

  let streak = 0;
  if (epochDays.length > 0) {
    const lastDayCompleted = epochDays[epochDays.length - 1];
    if (lastDayCompleted === todayEpoch || lastDayCompleted === todayEpoch - 1) {
      streak = 1;
      let expected = lastDayCompleted - 1;
      for (let i = epochDays.length - 2; i >= 0; i--) {
        if (epochDays[i] === expected) {
          streak++;
          expected--;
        } else {
          break;
        }
      }
    }
  }

  // O recorde deve sempre ser no mínimo igual ao streak ativo atual
  if (streak > bestStreak) {
    bestStreak = streak;
  }

  return { streak, bestStreak };
}
