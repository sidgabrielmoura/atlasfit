import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { consumeCredentialProof } from "./credential-proof";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "./mfa-service";
import { consumeImpersonationGrant } from "./impersonation-service";

/** A verified, single-use server proof replaces a second password hash check. */
export async function authorizeCredentials(credentials: Partial<Record<string, unknown>>, request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const email = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
  if (!(await rateLimit(`credentials:${ip}:${email}`, 10, 60_000)).success) return null;
  if (typeof credentials.impersonateToken === "string") return consumeImpersonationGrant(credentials.impersonateToken);
  const hasProof = credentials.authenticationProof !== undefined;
  if (!email || (!hasProof && typeof credentials.password !== "string")) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, role: true, password: true, isBlocked: true, sessionVersion: true },
  });
  if (!user?.password || user.isBlocked) return null;
  if (!hasProof && !await bcrypt.compare(credentials.password as string, user.password)) return null;

  // Resolve the current policy/eligibility even with a proof. Changes to the
  // password, session version or required factors invalidate the old proof.
  const policy = await resolveAuthenticationPolicy(user.id);
  if (!policy || policy.user.password !== user.password || policy.user.sessionVersion !== user.sessionVersion) return null;
  const maintenance = await prisma.systemSetting.findUnique({ where: { key: "maintenance_mode" } });
  if (maintenance?.value === "true" && user.role !== "SUPERADMIN") return null;
  if (hasProof) {
    if (!await consumeCredentialProof(user.id, user.password, credentials.authenticationProof, authenticationPolicyKey(policy))) return null;
  } else if (policy.requiresMfa) {
    return null;
  }
  return { id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
}
