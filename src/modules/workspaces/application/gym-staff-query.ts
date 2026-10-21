import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { getGymUnitAccess } from "./gym-unit-access";
import { serializableTransaction, type GymTransactionClient } from "./transaction";
import { WorkspaceAccessError } from "../domain/types";
import { gymStaffQuerySchema } from "../domain/gym-staff-contract";

const unitSelect = { id: true, name: true, code: true } satisfies Prisma.GymUnitSelect;
const staffSelect = {
  id: true, userId: true, role: true, unitId: true, isActive: true,
  user: { select: { id: true, name: true, email: true, image: true } }, unit: { select: unitSelect },
  staffProfile: { select: { cref: true, jobTitle: true, bio: true, emergencyContactName: true, emergencyContactPhone: true } },
  roleGrants: { select: { role: true, unitId: true, revokedAt: true } },
} satisfies Prisma.WorkspaceMemberSelect;

async function scope(tx: GymTransactionClient, workspaceId: string, actorUserId: string, unitId?: string) {
  const access = await getGymUnitAccess(tx, workspaceId, actorUserId, "staff.read");
  const workspace = await tx.workspace.findUniqueOrThrow({ where: { id: workspaceId }, select: { ownerId: true } });
  const actor = await tx.user.findUniqueOrThrow({ where: { id: actorUserId }, select: { role: true } });
  if (unitId && !access.units.some(unit => unit.id === unitId)) throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Unidade indisponível para consultar a equipe.");
  const units = unitId ? access.units.filter(unit => unit.id === unitId) : access.units;
  const includeUnassigned = !unitId && access.includeUnassigned;
  const unitWhere = { OR: [{ unitId: { in: units.map(unit => unit.id) } }, ...(includeUnassigned ? [{ unitId: null }] : [])] };
  const permitted = (targetUnitId: string | null) => targetUnitId === null ? includeUnassigned : units.some(unit => unit.id === targetUnitId);
  const canManage = (targetUnitId: string | null) => targetUnitId === null ? access.unassignedCapabilities.includes("staff.manage") && includeUnassigned : units.some(unit => unit.id === targetUnitId && unit.capabilities.includes("staff.manage"));
  const staffWhere: Prisma.WorkspaceMemberWhereInput = { workspaceId, isActive: true, OR: [
    ...(includeUnassigned ? [{ userId: workspace.ownerId }] : []),
    { roleGrants: { none: {} }, role: { not: "STUDENT" }, ...unitWhere },
    { roleGrants: { some: { role: { not: "STUDENT" }, revokedAt: null, ...unitWhere } } },
  ] };
  return { access, unitWhere, staffWhere, permitted, canManage, ownerId: workspace.ownerId, canManageOwners: workspace.ownerId === actorUserId || actor.role === "SUPERADMIN" };
}

type StaffOptions = { workspaceId: string; actorUserId: string; unitId?: string | null; role?: z.infer<typeof gymStaffQuerySchema>["role"]; search?: string; page?: number; limit?: number };
async function listStaff(tx: GymTransactionClient, options: StaffOptions) {
  const { actorUserId, ...raw } = options;
  const parsed = gymStaffQuerySchema.safeParse({ ...raw, unitId: raw.unitId ?? undefined });
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Filtros de equipe inválidos.");
  const { workspaceId, ...query } = parsed.data;
  if (!workspaceId || !actorUserId) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Academia e ator obrigatórios.");
  const authority = await scope(tx, workspaceId, actorUserId, query.unitId);
  const filters: Prisma.WorkspaceMemberWhereInput[] = [authority.staffWhere];
  if (query.search) filters.push({ user: { OR: [{ name: { contains: query.search, mode: "insensitive" } }, { email: { contains: query.search, mode: "insensitive" } }] } });
  if (query.role) filters.push({ OR: [
    { roleGrants: { none: {} }, role: query.role },
    { roleGrants: { some: { role: query.role, revokedAt: null, ...authority.unitWhere } } },
  ] });
  const where: Prisma.WorkspaceMemberWhereInput = { AND: filters };
  const rows = await tx.workspaceMember.findMany({ where, select: staffSelect, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit });
  const total = await tx.workspaceMember.count({ where });
  const assignments = rows.length ? await tx.workspaceMember.groupBy({ by: ["assignedStaffId"], where: { workspaceId, isActive: true, assignedStaffId: { in: rows.map(row => row.id) }, ...authority.unitWhere, studentProfile: { status: "ACTIVE" } }, _count: { _all: true } }) : [];
  const data = rows.map(row => {
    const allActive = row.roleGrants.filter(grant => !grant.revokedAt && grant.role !== "STUDENT");
    const visible = allActive.filter(grant => authority.permitted(grant.unitId)).map(({ role, unitId }) => ({ role, unitId }));
    const isOwner = row.userId === authority.ownerId || visible.some(grant => grant.role === "OWNER") || (row.role === "OWNER" && !row.roleGrants.length);
    return { ...row, role: isOwner ? "OWNER" : visible[0]?.role ?? row.role, unitId: authority.permitted(row.unitId) ? row.unitId : visible[0]?.unitId ?? null,
      unit: authority.permitted(row.unitId) ? row.unit : null, roleGrants: visible,
      isOwner, canManage: (!isOwner || authority.canManageOwners) && authority.canManage(row.unitId) && allActive.every(grant => authority.canManage(grant.unitId)),
      _count: { assignedStudents: assignments.find(item => item.assignedStaffId === row.id)?._count._all ?? 0 },
    };
  });
  return { data, total, page: query.page, limit: query.limit, totalPages: Math.ceil(total / query.limit) };
}

async function listInvitations(tx: GymTransactionClient, workspaceId: string, actorUserId: string, page = 1, limit = 50, unitId?: string) {
  const parsed = gymStaffQuerySchema.safeParse({ workspaceId, page, limit, unitId });
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Filtros de convites inválidos.");
  const authority = await scope(tx, workspaceId, actorUserId, unitId);
  const where: Prisma.WorkspaceInvitationWhereInput = { workspaceId, status: "PENDING", expiresAt: { gt: new Date() }, ...authority.unitWhere };
  const rows = await tx.workspaceInvitation.findMany({ where, select: { id: true, email: true, role: true, unitId: true, unit: { select: unitSelect }, status: true, expiresAt: true, createdAt: true }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: (page - 1) * limit, take: limit });
  const total = await tx.workspaceInvitation.count({ where });
  return { data: rows.map(row => ({ ...row, expiresAt: row.expiresAt.toISOString(), createdAt: row.createdAt.toISOString(), canManage: authority.canManage(row.unitId) })), total, page, limit, totalPages: Math.ceil(total / limit) };
}

export const listGymStaff = (options: StaffOptions) => serializableTransaction(tx => listStaff(tx, options));
export const listGymInvitations = (workspaceId: string, actorUserId: string, page = 1, limit = 50, unitId?: string) => serializableTransaction(tx => listInvitations(tx, workspaceId, actorUserId, page, limit, unitId));
export const getGymStaffPageData = (workspaceId: string, actorUserId: string) => serializableTransaction(async tx => {
  const authority = await scope(tx, workspaceId, actorUserId);
  const staff = await listStaff(tx, { workspaceId, actorUserId });
  const invitations = await listInvitations(tx, workspaceId, actorUserId);
  const license = await tx.workspaceSubscription.findUnique({ where: { workspaceId }, select: { maxStaff: true } });
  return { staff, invitations, maxStaff: license?.maxStaff ?? 0, units: authority.access.units.filter(unit => unit.capabilities.includes("staff.manage")).map(({ id, name }) => ({ id, name })), canManageGlobal: authority.access.unassignedCapabilities.includes("staff.manage") && authority.access.includeUnassigned };
});

export const getGymStaffMember = (workspaceId: string, memberId: string, actorUserId: string) => serializableTransaction(async tx => {
  const authority = await scope(tx, workspaceId, actorUserId);
  const row = await tx.workspaceMember.findFirst({ where: { AND: [authority.staffWhere, { id: memberId }] }, select: staffSelect });
  if (!row) throw new WorkspaceAccessError(404, "STAFF_NOT_FOUND", "Colaborador não encontrado no seu escopo.");
  const visible = row.roleGrants.filter(grant => !grant.revokedAt && grant.role !== "STUDENT" && authority.permitted(grant.unitId)).map(({ role, unitId }) => ({ role, unitId }));
  const students = await tx.workspaceMember.findMany({ where: { workspaceId, assignedStaffId: row.id, isActive: true, ...authority.unitWhere, studentProfile: { status: "ACTIVE" } }, take: 100, orderBy: { id: "asc" }, select: { id: true, user: { select: { id: true, name: true, email: true, image: true } }, lastActive: true } });
  return { ...row, role: visible[0]?.role ?? row.role, unitId: authority.permitted(row.unitId) ? row.unitId : visible[0]?.unitId ?? null, unit: authority.permitted(row.unitId) ? row.unit : null, roleGrants: visible, assignedStudents: students };
});
