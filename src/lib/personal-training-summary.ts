import { Prisma } from "@prisma/client";
import prisma from "./prisma";

/** Expand only actual numeric load entries. Malformed/legacy JSON cannot abort a dashboard. */
function loads(workspaceId: string, since?: Date) {
  return Prisma.sql`
    SELECT l.id, l."studentId", l."createdAt", kv.key AS "exerciseId",
      substring(left(v.value #>> '{}',64) FROM '^[[:space:]]*([+-]?(?:[0-9]+(?:[.][0-9]*)?|[.][0-9]+)(?:[eE][+-]?[0-9]{1,3})?)')::numeric AS load
    FROM "WorkoutLog" l
    CROSS JOIN LATERAL jsonb_each(CASE WHEN jsonb_typeof(l.loads)='object' THEN l.loads ELSE '{}'::jsonb END) kv
    CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(kv.value)='array' THEN kv.value ELSE '[]'::jsonb END) v(value)
    WHERE l."workspaceId"=${workspaceId} ${since ? Prisma.sql`AND l."createdAt">=${since}` : Prisma.empty}
  `;
}

export async function personalTrainingSummary(workspaceId: string, now = new Date()) {
  const since = new Date(now.getTime() - 42 * 86400000);
  const monday = new Date(now); monday.setDate(now.getDate() + (now.getDay() === 0 ? -6 : 1 - now.getDay())); monday.setHours(0, 0, 0, 0);
  const feedback = await prisma.workoutLog.groupBy({ by: ["effortScore"], where: { workspaceId, effortScore: { gte: 1, lte: 5 } }, _count: { _all: true } });
  const evolution = await prisma.$queryRaw<Array<{ week: number; average: number }>>(Prisma.sql`
    WITH load_values AS (${loads(workspaceId, since)})
    SELECT floor(extract(epoch FROM ("createdAt"-${since}::timestamp))/604800)::int AS week,
      round(avg(load))::float8 AS average FROM load_values
    WHERE load>0 AND load<1e100 AND "createdAt"<${now}
    GROUP BY 1
  `);
  const records = await prisma.$queryRaw<Array<{ studentName: string; exerciseName: string; maxLoad: number; date: Date }>>(Prisma.sql`
    WITH load_values AS (${loads(workspaceId)}), maxima AS (
      SELECT DISTINCT ON (v."studentId", COALESCE(e.name,'Exercício'))
        v."studentId", COALESCE(e.name,'Exercício') AS "exerciseName", v.load, v."createdAt"
      FROM load_values v
      LEFT JOIN "WorkoutExercise" we ON we.id=v."exerciseId" AND EXISTS (SELECT 1 FROM "Workout" w WHERE w.id=we."workoutId" AND w."workspaceId"=${workspaceId})
      LEFT JOIN "Exercise" e ON e.id=we."exerciseId"
      WHERE v.load>0 AND v.load<1e100
      ORDER BY v."studentId", COALESCE(e.name,'Exercício'), v.load DESC, v."createdAt" DESC, v.id DESC
    ) SELECT COALESCE(u.name,'Aluno') AS "studentName", m."exerciseName", m.load::float8 AS "maxLoad", m."createdAt" AS date
      FROM maxima m JOIN "User" u ON u.id=m."studentId" ORDER BY m.load DESC,m."studentId",m."exerciseName" LIMIT 3
  `);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const frequency = await prisma.$queryRaw<Array<{ day: number; count: number }>>(Prisma.sql`
    SELECT extract(dow FROM ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}))::int AS day, count(*)::int AS count
    FROM "WorkoutLog" WHERE "workspaceId"=${workspaceId} AND "createdAt">=${monday} GROUP BY 1
  `);
  return { feedback, evolution, records, frequency };
}
