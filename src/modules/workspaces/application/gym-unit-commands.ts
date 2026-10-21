import { z } from "zod";
import { gymUnitSchema } from "../domain/gym-config";
import { WorkspaceAccessError } from "../domain/types";
import { assertActorAuthority } from "./actor-authority";
import { assertGymOperationalWorkspace } from "./gym-license";
import { serializableTransaction } from "./transaction";
import { getGymUnitAccess } from "./gym-unit-access";

const timezone = z.string().max(80).refine(value => { try { new Intl.DateTimeFormat("pt-BR", { timeZone: value }); return true; } catch { return false; } });
const creation = gymUnitSchema.extend({ timezone: timezone.optional() });
const update = creation.omit({ slug: true }).partial().extend({ isActive: z.boolean().optional() }).strict();
function actor(id?: string): asserts id is string { if (!id) throw new WorkspaceAccessError(401, "UNAUTHORIZED", "Ator obrigatório para administrar unidades."); }

export function createGymUnit(workspaceId: string, raw: unknown, actorUserId?: string) {
  actor(actorUserId);
  const parsed = creation.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados da unidade inválidos.");
  return serializableTransaction(async tx => {
    await assertActorAuthority(tx, workspaceId, actorUserId, "workspace.manage");
    const workspace = await assertGymOperationalWorkspace(workspaceId, tx);
    if (await tx.gymUnit.count({ where: { workspaceId, isActive: true } }) >= workspace.subscription!.maxUnits) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Limite de unidades ativas atingido.");
    const unit = await tx.gymUnit.create({ data: { ...parsed.data, workspaceId } });
    await tx.auditLog.create({ data: { userId: actorUserId, action: "GYM_UNIT_CREATED", entity: "GYM_UNIT", entityId: unit.id } });
    return unit;
  });
}
export function updateGymUnit(workspaceId: string, unitId: string, raw: unknown, actorUserId?: string) {
  actor(actorUserId);
  const parsed = update.safeParse(raw);
  if (!parsed.success || !Object.keys(parsed.data).length) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Dados da unidade inválidos.");
  return serializableTransaction(async tx => {
    const workspace = await assertGymOperationalWorkspace(workspaceId, tx);
    const before = await tx.gymUnit.findFirst({ where: { id: unitId, workspaceId } });
    if (!before) throw new WorkspaceAccessError(404, "UNIT_NOT_FOUND", "Unidade não encontrada.");
    // An inactive unit can only be reactivated by global administration.
    await assertActorAuthority(tx, workspaceId, actorUserId, "workspace.manage", before.isActive ? unitId : undefined);
    if (parsed.data.isActive === true && !before.isActive && await tx.gymUnit.count({ where: { workspaceId, isActive: true } }) >= workspace.subscription!.maxUnits) throw new WorkspaceAccessError(409, "INVALID_REQUEST", "Limite de unidades ativas atingido.");
    if (parsed.data.isActive === false && before.isActive) {
      const linked = await tx.workspaceMember.count({ where: { workspaceId, unitId, isActive: true } });
      const liveContracts = await tx.gymEnrollment.count({ where: { workspaceId, unitId, status: { notIn: ["CANCELLED", "EXPIRED"] } } });
      if (linked || liveContracts) throw new WorkspaceAccessError(409, "INVALID_STATUS", "Transfira ou encerre os vínculos e contratos ativos antes de desativar a unidade.");
    }
    const unit = await tx.gymUnit.update({ where: { id: unitId }, data: parsed.data });
    await tx.auditLog.create({ data: { userId: actorUserId, action: `GYM_UNIT_UPDATED:${JSON.stringify({ before: { isActive: before.isActive }, after: { isActive: unit.isActive }, fields: Object.keys(parsed.data) })}`, entity: "GYM_UNIT", entityId: unitId } });
    return unit;
  });
}
export function listAuthorizedGymUnits(workspaceId: string, includeInactive: boolean, actorUserId?: string) {
  actor(actorUserId);
  return serializableTransaction(async tx => {
    const scope = await getGymUnitAccess(tx, workspaceId, actorUserId, "students.read");
    if (includeInactive) await assertActorAuthority(tx, workspaceId, actorUserId, "workspace.manage");
    return tx.gymUnit.findMany({ where: { workspaceId, ...(includeInactive ? {} : { id: { in: scope.units.map(unit => unit.id) }, isActive: true }) }, orderBy: [{ name: "asc" }, { id: "asc" }] });
  });
}
