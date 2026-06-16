import prisma from "@/lib/prisma";

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

/**
 * Verifica se a streak do aluno deve ser atualizada/decair por inatividade.
 * Se o aluno estiver sem treinar por mais de 1 dia, a streak volta para zero.
 * Se houver diferença com o banco de dados, atualiza e retorna os novos valores.
 */
export async function verifyAndDecayWorkspaceMemberStreak(
  member: { id: string; userId: string; workspaceId: string; streak: number | null; bestStreak: number | null },
  preloadedDates?: Date[]
): Promise<{
  streak: number;
  bestStreak: number;
}> {
  // Buscar datas concluídas dos logs de treino do aluno
  const completedDates = preloadedDates || (
    await prisma.workoutLog.findMany({
      where: {
        studentId: member.userId,
        workspaceId: member.workspaceId,
      },
      select: {
        completedAt: true,
      },
    })
  ).map((l: any) => l.completedAt);

  // Recalcular as sequências (streaks) usando as datas locais
  const { streak: newStreak, bestStreak: newBestStreak } = calculateStreaks(completedDates);

  // Se a streak calculada for diferente da salva no banco, atualiza
  if (newStreak !== (member.streak || 0) || newBestStreak !== (member.bestStreak || 0)) {
    await prisma.workspaceMember.update({
      where: { id: member.id },
      data: {
        streak: newStreak,
        bestStreak: newBestStreak,
      },
    });
    return { streak: newStreak, bestStreak: newBestStreak };
  }

  return {
    streak: member.streak || 0,
    bestStreak: member.bestStreak || 0,
  };
}

/**
 * Verifica e decai em lote as streaks de todos os alunos ativos de um workspace.
 * Evita o problema de consultas N+1 executando em lote.
 */
export async function batchVerifyAndDecayStreaks(workspaceId: string): Promise<void> {
  // 1. Obter a data máxima de treino concluído de todos os alunos do workspace
  const lastLogs = await prisma.workoutLog.groupBy({
    by: ["studentId"],
    where: {
      workspaceId,
    },
    _max: {
      completedAt: true,
    },
  });

  const lastLogMap = new Map<string, Date>();
  lastLogs.forEach((log) => {
    if (log.studentId && log._max.completedAt) {
      lastLogMap.set(log.studentId, log._max.completedAt);
    }
  });

  // 2. Obter todos os membros ativos daquele workspace com cargo STUDENT e streak > 0
  const activeStreakMembers = await prisma.workspaceMember.findMany({
    where: {
      workspaceId,
      role: "STUDENT",
      isActive: true,
      streak: {
        gt: 0,
      },
    },
    select: {
      id: true,
      userId: true,
      streak: true,
    },
  });

  const todayStr = getLocalDateString(new Date());
  const todayEpoch = dateToEpochDays(todayStr);

  const memberIdsToReset: string[] = [];

  for (const m of activeStreakMembers) {
    const lastCompleted = lastLogMap.get(m.userId);
    if (!lastCompleted) {
      // Sem treinos concluídos -> streak deve ser 0
      memberIdsToReset.push(m.id);
    } else {
      const lastCompletedEpoch = dateToEpochDays(getLocalDateString(lastCompleted));
      if (lastCompletedEpoch < todayEpoch - 1) {
        // Último treino foi antes de ontem -> streak expirou
        memberIdsToReset.push(m.id);
      }
    }
  }

  // 3. Atualizar em lote todos os alunos com streak expirada para 0
  if (memberIdsToReset.length > 0) {
    await prisma.workspaceMember.updateMany({
      where: {
        id: { in: memberIdsToReset },
      },
      data: {
        streak: 0,
      },
    });
  }
}
