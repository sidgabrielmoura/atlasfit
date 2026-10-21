import { vi } from "vitest";

/** Complete persisted fixtures; never mock the authority functions themselves. */
export function seedGymAuthority(db: any, workspaceId: string, ownerId: string, roles: Record<string, string>) {
  db.workspace ??= {};
  db.workspace.findUnique ??= vi.fn();
  db.workspace.findUnique.mockResolvedValue({ id: workspaceId, name: "Academia sintética", type: "GYM", isActive: true, ownerId, subscription: { status: "ACTIVE", endDate: null, maxStaff: 10, maxStudents: 50 } });
  db.user ??= {}; db.user.findUnique ??= vi.fn(); db.user.findUnique.mockResolvedValue({ role: "USER" });
  db.workspaceMember ??= {}; db.workspaceMember.findUnique ??= vi.fn();
  db.workspaceMember.findUnique.mockImplementation(async ({ where }: any) => {
    const userId = where.userId_workspaceId?.userId, role = roles[userId];
    return role ? { id: `member-${userId}`, userId, workspaceId, role, isActive: true, unitId: null, roleGrants: [] } : null;
  });
  db.gymUnit ??= {}; db.gymUnit.findMany ??= vi.fn(); db.gymUnit.findFirst ??= vi.fn();
  db.gymUnit.findMany.mockResolvedValue([]);
}
