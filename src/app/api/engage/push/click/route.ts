import { NextResponse } from "next/server";
import { EngagePushService } from "@/lib/engage/push-service";

function isSafeRedirectUrl(target: string): boolean {
  if (!target) return false;
  // Disallow javascript:, data:, vbscript: protocols
  if (/^(javascript|data|vbscript):/i.test(target.trim())) {
    return false;
  }
  // Safe relative paths
  if (target.startsWith("/") && !target.startsWith("//")) {
    return true;
  }
  // Safe absolute URLs for trusted domains
  try {
    const parsed = new URL(target);
    const trustedHosts = ["atlasfit.site", "app.atlasfit.site", "localhost", "127.0.0.1"];
    return trustedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const logId = searchParams.get("logId") || searchParams.get("engage_push_log");
  const rawRedirect = searchParams.get("redirect") || searchParams.get("url") || "/student/workouts";

  if (logId) {
    try {
      await EngagePushService.trackPushClick(logId);
    } catch (err) {
      console.warn("[Engage Push Click] Error tracking click:", err);
    }
  }

  const safeRedirect = isSafeRedirectUrl(rawRedirect) ? rawRedirect : "/student/workouts";

  try {
    return NextResponse.redirect(new URL(safeRedirect, req.url));
  } catch {
    return NextResponse.redirect(new URL("/student/workouts", req.url));
  }
}
