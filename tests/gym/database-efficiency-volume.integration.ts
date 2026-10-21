import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { afterAll, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { Pool } from "pg";

const target = new URL(process.env.DATABASE_URL || "http://invalid");
if (target.hostname !== "127.0.0.1" || target.port !== "56432" || target.pathname !== "/atlasfit_gym_stabilization_20261001") throw new Error("Requires disposable PostgreSQL.");
afterAll(async () => { await prisma.$disconnect(); });

it("measures transfer reduction and the workout exercise plan on equivalent synthetic volumes", async () => {
  const owner = await prisma.user.create({ data: {} });
  const workspace = await prisma.workspace.create({ data: { ownerId: owner.id, name: "Synthetic volume", slug: randomUUID() } });
  const users = Array.from({ length: 50 }, () => ({ id: randomUUID(), image: `data:image/png;base64,${"a".repeat(65536)}` }));
  await prisma.user.createMany({ data: users });
  await prisma.workspaceMember.createMany({ data: users.map(user => ({ workspaceId: workspace.id, userId: user.id, role: "STUDENT", progress: 50 })) });
  const beforeStart = performance.now();
  const before = await prisma.workspaceMember.findMany({ where: { workspaceId: workspace.id, role: "STUDENT" }, include: { user: true } });
  const beforeMs = performance.now() - beforeStart;
  const afterStart = performance.now();
  const after = await prisma.workspaceMember.aggregate({ where: { workspaceId: workspace.id, role: "STUDENT" }, _count: { _all: true }, _avg: { progress: true } });
  const afterMs = performance.now() - afterStart;
  const bytesBefore = Buffer.byteLength(JSON.stringify(before)), bytesAfter = Buffer.byteLength(JSON.stringify(after));
  expect(after._count._all).toBe(before.length); expect(after._avg.progress).toBe(50);
  expect(bytesAfter).toBeLessThan(bytesBefore / 1000);

  const muscle = await prisma.muscleGroup.create({ data: { name: randomUUID() } });
  const exercise = await prisma.exercise.create({ data: { name: "Synthetic", muscleGroupId: muscle.id } });
  const workouts = Array.from({ length: 200 }, () => ({ id: randomUUID(), name: "Synthetic", goal: "Strength", difficulty: "Beginner", duration: "30 min", workspaceId: workspace.id }));
  await prisma.workout.createMany({ data: workouts });
  await prisma.workoutExercise.createMany({ data: workouts.flatMap(workout => Array.from({ length: 20 }, (_, order) => ({ workoutId: workout.id, exerciseId: exercise.id, sets: 3, reps: "10", rest: "60s", order }))) });
  // The experiment changes only this disposable database and restores the index via ROLLBACK.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const connection = await pool.connect();
  const sql = 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT id,"exerciseId" FROM "WorkoutExercise" WHERE "workoutId"=$1 ORDER BY "order",id';
  let without, withIndex;
  try {
    await connection.query('ANALYZE "WorkoutExercise"');
    await connection.query('BEGIN');
    await connection.query('DROP INDEX "WorkoutExercise_workoutId_order_id_idx"');
    without = (await connection.query(sql, [workouts[0].id])).rows[0]['QUERY PLAN'][0];
    await connection.query('ROLLBACK');
    withIndex = (await connection.query(sql, [workouts[0].id])).rows[0]['QUERY PLAN'][0];
  } finally { await connection.query('ROLLBACK'); connection.release(); await pool.end(); }
  expect(withIndex.Plan['Actual Rows']).toBe(20);
  expect(JSON.stringify(withIndex.Plan)).toContain('WorkoutExercise_workoutId_order_id_idx');
  const summarize = (plan: any) => ({ node: plan.Plan['Node Type'], executionMs: plan['Execution Time'], sharedHits: plan.Plan['Shared Hit Blocks'], sharedReads: plan.Plan['Shared Read Blocks'], rows: plan.Plan['Actual Rows'], rowsRemoved: plan.Plan['Rows Removed by Filter'] || plan.Plan.Plans?.[0]?.['Rows Removed by Filter'] || 0 });
  writeFileSync('.tmp/database-efficiency-benchmark.json', JSON.stringify({ observedAt: new Date().toISOString(), environment: 'local PostgreSQL 17, one client, synthetic data', members: 50, workoutExercises: 4000, projection: { bytesBefore, bytesAfter, beforeMs, afterMs }, plan: { withoutIndex: summarize(without), withIndex: summarize(withIndex) }, limitations: 'Single local observations; cache order and timing noise apply. No production load, financial extrapolation, or p95/p99 estimate.' }, null, 2));
});
