import type { GymTransactionClient } from "./transaction";

/** Lock before reading state shared by lifecycle commands and recurring invoices. */
export async function lockGymEnrollment(tx: GymTransactionClient, workspaceId: string, enrollmentId: string) {
  await tx.$queryRaw`SELECT "id" FROM "GymEnrollment" WHERE "id" = ${enrollmentId} AND "workspaceId" = ${workspaceId} FOR UPDATE`;
}
