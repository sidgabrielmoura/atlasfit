import prisma from "@/lib/prisma";
import type { GymTransactionClient } from "./transaction";
import { GYM_CONFIG_KEYS } from "./gym-feature-flags-service";
import { WorkspaceAccessError } from "../domain/types";
import { assertGymOperationalWorkspace } from "./gym-license";

export type GymModule = "import";
export async function assertGymModule(workspaceId: string, module: GymModule, db: GymTransactionClient = prisma) {
  await assertGymOperationalWorkspace(workspaceId, db);
  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, include: { subscription: true } });
  if (workspace?.type !== "GYM") throw new WorkspaceAccessError(404, "WORKSPACE_NOT_FOUND", "Academia não encontrada.");
  if (!workspace.isActive) throw new WorkspaceAccessError(403, "WORKSPACE_SUSPENDED", "Academia suspensa.");
  const license = workspace.subscription;
  const now = new Date();
  if (!license || (license.endDate && license.endDate <= now) || !(license.status === "ACTIVE" || (license.status === "TRIAL" && license.trialEndsAt && license.trialEndsAt > now))) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Licença da academia inativa ou expirada.");
  const key = GYM_CONFIG_KEYS.ASSISTED_IMPORT_ENABLED;
  const setting = await db.systemSetting.findUnique({ where: { key }, select: { value: true } });
  const enabled = setting?.value !== "false";
  if (!enabled) throw new WorkspaceAccessError(403, "INVALID_STATUS", "Módulo indisponível na configuração global.");
}
