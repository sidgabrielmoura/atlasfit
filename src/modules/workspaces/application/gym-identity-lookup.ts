import { createHash, randomBytes } from "node:crypto";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { serializableTransaction } from "./transaction";
import { assertActorAuthority } from "./actor-authority";
import { WorkspaceAccessError } from "../domain/types";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const prefix = (workspaceId: string, actorId: string) => `GYM_IDENTITY_LOOKUP:${workspaceId}:${actorId}:`;
export async function createGymIdentityLookup(workspaceId: string, unitId: string, actorId: string, subjectId: string) {
  return serializableTransaction(async tx => {
    await assertActorAuthority(tx, workspaceId, actorId, "students.manage", unitId);
    const marker = prefix(workspaceId, actorId), now = new Date();
    await tx.verificationToken.deleteMany({ where: { identifier: { startsWith: marker }, expires: { lte: now } } });
    if (await tx.verificationToken.count({ where: { identifier: { startsWith: marker }, expires: { gt: now } } }) >= 20) throw new WorkspaceAccessError(429, "INVALID_STATUS", "Limite de consultas de identidade atingido. Tente novamente em uma hora.");
    const token = randomBytes(32).toString("hex");
    await tx.verificationToken.create({ data: { identifier: marker + JSON.stringify({ unitId, subjectId, validUntil: new Date(Date.now() + 15 * 60000).toISOString() }), token: digest(token), expires: new Date(Date.now() + 3600000) } });
    await tx.auditLog.create({ data: { userId: actorId, action: "GYM_IDENTITY_LOOKUP_REQUESTED", entity: "WORKSPACE", entityId: workspaceId } });
    return token;
  });
}
export async function resolveGymIdentityLookup(workspaceId: string, unitId: string, actorId: string, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Refaça a conferência de identidade antes de emitir o convite.");
  await assertActorAuthority(prisma, workspaceId, actorId, "students.manage", unitId);
  const marker = prefix(workspaceId, actorId);
  const row = await prisma.verificationToken.findFirst({ where: { token: digest(token), identifier: { startsWith: marker }, expires: { gt: new Date() } } });
  const parsed = z.object({ unitId: z.string(), subjectId: z.string(), validUntil: z.iso.datetime() }).safeParse(row ? JSON.parse(row.identifier.slice(marker.length)) : null);
  if (!parsed.success || parsed.data.unitId !== unitId || new Date(parsed.data.validUntil) <= new Date()) throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Consulta expirada ou incompatível com esta unidade e operador.");
  return parsed.data.subjectId;
}
