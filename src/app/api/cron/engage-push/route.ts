import { recordCronResult, recordCronFailure } from "@/lib/cron-health";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EngagePushService } from "@/lib/engage/push-service";
import { isCronAuthorized } from "@/lib/cron-authorization";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { assertSuperadmin } from "@/modules/workspaces/application/gym-provisioning";

async function execute(force: boolean) {
  try {
    const startTime = Date.now();
    const result = await EngagePushService.runAutomatedPushCycle(force);
    const success = result.failedCount === 0;
    const durationMs = Date.now() - startTime;
    await recordCronResult("engage-push", success, durationMs);
    console.info("[ENGAGE_CRON]", { success: true, durationMs });

    return NextResponse.json({
      success,
      timestamp: new Date().toISOString(),
      executionTimeMs: durationMs,
      forcedExecution: force,
      ...result
    }, { status: success ? 200 : 503 });
  } catch {
    await recordCronFailure("engage-push");
    console.error("[ENGAGE_CRON]", { code: "PROCESSING_UNAVAILABLE" });
    return NextResponse.json({ success: false, error: { code: "PROCESSING_UNAVAILABLE" } }, { status: 503 });
  }
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  return execute(false);
}

/** Manual execution checks the persisted role; GET always requires the job secret. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  try { await serializableTransaction(tx => assertSuperadmin(tx, session.user.id)); }
  catch { return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 }); }
  return execute(true);
}
