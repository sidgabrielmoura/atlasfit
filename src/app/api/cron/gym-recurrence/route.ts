import { recordCronResult, recordCronFailure } from "@/lib/cron-health";
import { NextResponse } from "next/server";
import { manualSubscriptionService } from "@/modules/workspaces/application/manual-subscription-service";
import { processLocalEnrollmentClosures } from "@/modules/workspaces/application/enrollment-closure-job";
import { retryPendingGymPrivacyDeletions } from "@/modules/workspaces/application/gym-privacy-requests";
import { processGymMajorityTransitions } from "@/modules/workspaces/application/gym-majority-transition";
import { isCronAuthorized } from "@/lib/cron-authorization";

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  const started = Date.now();
  try {
    const lifecycle = await processLocalEnrollmentClosures();
    const privacy = await retryPendingGymPrivacyDeletions();
    const majority = await processGymMajorityTransitions();
    const result = await manualSubscriptionService.processDue();
    const failed = result.failures.length > 0 || lifecycle.pauses.failures.length > 0 || privacy.failures.length > 0 || majority.failures.length > 0;
    console.info("[GYM_CRON]", { success: !failed, durationMs: Date.now() - started, processed: result.processed, failures: result.failures.length + lifecycle.pauses.failures.length + privacy.failures.length + majority.failures.length });
    await recordCronResult("gym-recurrence", !failed, Date.now() - started);
    return NextResponse.json({ success: !failed, lifecycle, privacy, majority, ...result }, { status: failed ? 503 : 200 });
  } catch (error) {
    await recordCronFailure("gym-recurrence");
    console.error("[GYM_CRON_ERROR]", { errorCode: error instanceof Error ? error.name : "UNKNOWN" });
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "Não foi possível concluir o processamento." } }, { status: 500 });
  }
}
