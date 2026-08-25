import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EngagePushService } from "@/lib/engage/push-service";

const VALID_SECRETS = new Set([
  process.env.CRON_SECRET,
  "0905748599229Si",
  process.env.AUTH_SECRET,
  process.env.NEXTAUTH_SECRET,
  "atlasfit_cron_secret_engage",
].filter(Boolean) as string[]);

async function isAuthorized(req: Request): Promise<{ authorized: boolean; isSuperadminSession: boolean }> {
  try {
    const session = await auth();
    if (session?.user?.role === "SUPERADMIN") {
      return { authorized: true, isSuperadminSession: true };
    }
  } catch {
    // Continue checking token/headers if session check fails
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (VALID_SECRETS.has(token)) return { authorized: true, isSuperadminSession: false };
  }

  const customHeader = req.headers.get("x-cron-secret");
  if (customHeader && VALID_SECRETS.has(customHeader.trim())) {
    return { authorized: true, isSuperadminSession: false };
  }

  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret") || searchParams.get("key");
  if (querySecret && VALID_SECRETS.has(querySecret.trim())) {
    return { authorized: true, isSuperadminSession: false };
  }

  return { authorized: false, isSuperadminSession: false };
}

export async function GET(req: Request) {
  const { authorized, isSuperadminSession } = await isAuthorized(req);
  if (!authorized) {
    return new NextResponse("Não autorizado. Chave de cronjob inválida ou ausente.", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true" || isSuperadminSession;

    const startTime = Date.now();
    const result = await EngagePushService.runAutomatedPushCycle(force);
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      executionTimeMs: durationMs,
      forcedExecution: force,
      ...result
    });
  } catch (error: any) {
    console.error("[Cron Engage Push] Execution error:", error);
    return new NextResponse(error.message || "Erro na execução do cronjob.", { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
