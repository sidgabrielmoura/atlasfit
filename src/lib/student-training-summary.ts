import prisma from "./prisma";

/** All-time streaks and records return aggregate rows, never complete workout JSON history. */
export async function studentTrainingSummary(workspaceId: string, studentId: string) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [streak] = await prisma.$queryRaw<Array<{ streak: number; bestStreak: number }>>`
    WITH days AS (
      SELECT DISTINCT ("completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date AS day
      FROM "WorkoutLog" WHERE "workspaceId"=${workspaceId} AND "studentId"=${studentId} AND EXISTS (SELECT 1 FROM "Workout" w WHERE w.id="WorkoutLog"."workoutId" AND w."workspaceId"=${workspaceId})
    ), islands AS (SELECT day, day-(row_number() OVER (ORDER BY day))::int AS island FROM days),
    runs AS (SELECT max(day) AS last_day,count(*)::int AS length FROM islands GROUP BY island)
    SELECT COALESCE(max(length) FILTER (WHERE last_day IN ((CURRENT_TIMESTAMP AT TIME ZONE ${timezone})::date, (CURRENT_TIMESTAMP AT TIME ZONE ${timezone})::date-1)),0)::int AS streak,
      COALESCE(max(length),0)::int AS "bestStreak" FROM runs
  `;
  const records = await prisma.$queryRaw<Array<{ exerciseName: string; maxLoad: number; date: Date; previousBest: number | null }>>`
    WITH per_log AS (
      SELECT l.id, l."completedAt", e.name AS exercise,
        max(substring(left(regexp_replace(v.value #>> '{}','[^0-9.]','','g'),64) FROM '^([0-9]+(?:[.][0-9]*)?|[.][0-9]+)')::numeric) AS load
      FROM "WorkoutLog" l JOIN "WorkoutExercise" we ON we."workoutId"=l."workoutId"
      JOIN "Workout" w ON w.id=l."workoutId" AND w."workspaceId"=${workspaceId}
      JOIN "Exercise" e ON e.id=we."exerciseId"
      CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(l.loads->we.id)='array' THEN l.loads->we.id ELSE '[]'::jsonb END) v(value)
      WHERE l."workspaceId"=${workspaceId} AND l."studentId"=${studentId}
      GROUP BY l.id,l."completedAt",e.name
    ), history AS (
      SELECT *, max(load) OVER (PARTITION BY exercise ORDER BY "completedAt",id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS previous FROM per_log WHERE load>0
    ), best AS (
      SELECT DISTINCT ON (exercise) * FROM history ORDER BY exercise, load DESC,"completedAt",id
    ) SELECT exercise AS "exerciseName",load::float8 AS "maxLoad","completedAt" AS date,previous::float8 AS "previousBest" FROM best ORDER BY "completedAt" DESC,exercise LIMIT 3
  `;
  return { ...streak, records };
}

/** Dashboard chart: latest real reading per month, with an unchanged all-time baseline. */
export async function studentProgressSummary(workspaceId: string, studentId: string) {
  const first = await prisma.studentProgress.findFirst({ where: { workspaceId, studentId }, orderBy: [{ date: "asc" }, { id: "asc" }], select: { id: true, weight: true } });
  const points = await prisma.$queryRaw<Array<{ id: string; date: Date; weight: number | null; bodyFat: number | null }>>`
    SELECT DISTINCT ON (date_trunc('month',date)) id,date,weight,"bodyFat" FROM "StudentProgress"
    WHERE "workspaceId"=${workspaceId} AND "studentId"=${studentId}
    ORDER BY date_trunc('month',date) DESC,date DESC,id DESC LIMIT 24
  `;
  return { first, points: points.reverse() };
}
