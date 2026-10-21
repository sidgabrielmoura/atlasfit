import prisma from "./prisma";
import { requestMemo } from "./request-memo";
import { cache } from "react";

const renderWorkspace = cache((workspaceId: string) => prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true, slug: true, ownerId: true, isActive: true, type: true } }));
const renderMember = cache((workspaceId: string, userId: string) => prisma.workspaceMember.findFirst({ where: { userId, workspaceId }, select: { id: true, role: true, isActive: true, unitId: true, roleGrants: { select: { role: true, unitId: true, revokedAt: true } } } }));

/** These facts are reused only inside read requests, never across requests or inside transactions. */
export function workspaceRequestFacts(workspaceId: string) {
  return requestMemo(`workspace:${workspaceId}`, () => renderWorkspace(workspaceId));
}
export function memberRequestFacts(workspaceId: string, userId: string) {
  return requestMemo(`member:${workspaceId}:${userId}`, () => renderMember(workspaceId, userId));
}
