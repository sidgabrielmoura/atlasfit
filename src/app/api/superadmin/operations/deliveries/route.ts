import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { assertSuperadmin } from "@/modules/workspaces/application/gym-provisioning";
import { getDeliveryHealth } from "@/lib/cron-health";
import { handleWorkspaceAccessError } from "@/modules/workspaces";

async function handleGET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  try {
    const result = await serializableTransaction(async tx => { await assertSuperadmin(tx, session.user.id); return getDeliveryHealth(tx); });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleWorkspaceAccessError(error) || NextResponse.json({ error: { code: "MONITORING_UNAVAILABLE" } }, { status: 503 });
  }
}
export const GET = withRequestMemo(handleGET);
