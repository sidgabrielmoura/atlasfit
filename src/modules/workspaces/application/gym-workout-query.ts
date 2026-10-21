import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { WorkspaceAccessError } from "../domain/types";
import { resolveGymAccessRoles } from "../domain/access-roles";
import { resolveEffectiveCapabilities } from "../domain/roles";
import { parseGymWorkout } from "../domain/gym-workout-contract";
import { getGymUnitAccess } from "./gym-unit-access";
import { assertActorAuthority } from "./actor-authority";
import { gymExerciseVisibility } from "./gym-workout-commands";

const querySchema = z.object({ workspaceId: z.string().min(1).max(128), actorUserId: z.string().min(1).max(128), search: z.string().trim().max(200).default(""), page: z.number().int().min(1).max(10_000).default(1) }).strict();
const LIMIT = 30;
export async function getGymWorkoutStudentOptions(raw: unknown) {
  const input = parseGymWorkout(querySchema, raw);
  return prisma.$transaction(async tx => {
    const scope = await getGymUnitAccess(tx, input.workspaceId, input.actorUserId, "workouts.manage.assigned");
    const actor = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: input.actorUserId, workspaceId: input.workspaceId } }, include: { roleGrants: true } });
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: input.workspaceId }, select: { ownerId: true } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: input.actorUserId }, select: { role: true } });
    const scopes = scope.units.map((unit): Prisma.WorkspaceMemberWhereInput => {
      const roles = actor ? resolveGymAccessRoles(actor, unit.id) : [];
      const assignedOnly = user.role !== "SUPERADMIN" && workspace.ownerId !== input.actorUserId && roles.includes("TRAINER") && !roles.some(role => role === "OWNER" || role === "MANAGER");
      if (assignedOnly && !actor) throw new WorkspaceAccessError(403, "NOT_A_MEMBER", "Vínculo ativo necessário.");
      return { unitId: unit.id, ...(assignedOnly && actor ? { assignedStaffId: actor.id } : {}),
        OR: [{ role: "STUDENT", roleGrants: { none: {} } }, { roleGrants: { some: { role: "STUDENT", revokedAt: null, OR: [{ unitId: null }, { unitId: unit.id }] } } }] };
    });
    const search: Prisma.WorkspaceMemberWhereInput[] = input.search ? [{ OR: [{ user: { name: { contains: input.search, mode: "insensitive" } } }, { studentProfile: { registrationNumber: { contains: input.search, mode: "insensitive" } } }] }] : [];
    const where: Prisma.WorkspaceMemberWhereInput = {
      workspaceId: input.workspaceId, isActive: true, studentProfile: { is: { status: "ACTIVE" } },
      AND: [{ OR: scopes },
        ...search],
    };
    const students = await tx.workspaceMember.findMany({ where, select: { id: true, userId: true, user: { select: { name: true } }, studentProfile: { select: { registrationNumber: true } } }, orderBy: [{ user: { name: "asc" } }, { id: "asc" }], take: LIMIT + 1, skip: (input.page - 1) * LIMIT });
    return { data: students.slice(0, LIMIT).map(member => ({ memberId: member.id, userId: member.userId, name: member.user.name || "Aluno sem nome", registrationNumber: member.studentProfile?.registrationNumber ?? null })), page: input.page, hasNext: students.length > LIMIT };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function getGymWorkoutExerciseOptions(raw: unknown) {
  const input = parseGymWorkout(querySchema, raw);
  return prisma.$transaction(async tx => {
    await getGymUnitAccess(tx, input.workspaceId, input.actorUserId, "workouts.read");
    const rows = await tx.exercise.findMany({ where: { ...gymExerciseVisibility, ...(input.search ? { name: { contains: input.search, mode: "insensitive" } } : {}) }, select: { id: true, name: true, muscleGroup: { select: { name: true } } }, orderBy: [{ name: "asc" }, { id: "asc" }], take: LIMIT + 1, skip: (input.page - 1) * LIMIT });
    return { data: rows.slice(0, LIMIT).map(row => ({ id: row.id, name: row.name, muscleGroup: row.muscleGroup.name })), page: input.page, hasNext: rows.length > LIMIT };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
export async function canEditGymWorkoutTemplates(workspaceId: string, actorUserId: string) {
  return prisma.$transaction(async tx => {
    try { await assertActorAuthority(tx, workspaceId, actorUserId, "workouts.manage.assigned"); }
    catch (error) { if (error instanceof WorkspaceAccessError && error.statusCode === 403) return { canCreate: false, canEditOthers: false }; throw error; }
    const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } });
    const actor = await tx.workspaceMember.findUnique({ where: { userId_workspaceId: { userId: actorUserId, workspaceId } }, include: { roleGrants: true } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: actorUserId }, select: { role: true } });
    const capabilities = actor ? resolveEffectiveCapabilities(resolveGymAccessRoles(actor)) : new Set();
    return { canCreate: true, canEditOthers: user.role === "SUPERADMIN" || workspace.ownerId === actorUserId || capabilities.has("workspace.manage") };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
