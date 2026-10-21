import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { consumeCredentialProof } from "@/lib/auth/credential-proof";
import { rateLimit } from "@/lib/rate-limit";
import { resolveAuthenticationPolicy, authenticationPolicyKey } from "@/lib/auth/mfa-service";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { withAuditIdentity } from "@/lib/audit-context";
import { consumeImpersonationGrant } from "@/lib/auth/impersonation-service";
import { cache } from "react";
import { requestMemo } from "@/lib/request-memo";

export const { handlers: { GET, POST }, auth: uncachedAuth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [Credentials({
    async authorize(credentials, request) {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const email = typeof credentials.email === "string" ? credentials.email.trim().toLowerCase() : "";
      if (!(await rateLimit(`credentials:${ip}:${email}`, 10, 60_000)).success) return null;
      if (typeof credentials.impersonateToken === "string") {
        return consumeImpersonationGrant(credentials.impersonateToken);
      }
      if (!email || typeof credentials.password !== "string") return null;
      const user = await prisma.user.findUnique({ where: { email }, include: { _count: { select: { totpDevices: true } } } });
      if (!user?.password || !await bcrypt.compare(credentials.password, user.password)) return null;
      if (user.isBlocked) return null;
      if (!await permitsOwnAccount(user.id)) return null;
      const maintenance = await prisma.systemSetting.findUnique({ where: { key: "maintenance_mode" } });
      if (maintenance?.value === "true" && user.role !== "SUPERADMIN") return null;
      const policy = await resolveAuthenticationPolicy(user.id);
      if (!policy) return null;
      if (policy.requiresMfa || credentials.authenticationProof !== undefined) {
        if (!await consumeCredentialProof(user.id, user.password, credentials.authenticationProof, authenticationPolicyKey(policy))) return null;
      }
      return { id: user.id, name: user.name, email: user.email, role: user.role, sessionVersion: user.sessionVersion };
    },
  })],
  events: {
    async signIn({ user }) {
      if (user.id) await withAuditIdentity({ actorUserId: user.originalAdminUserId || user.id, effectiveUserId: user.id, impersonated: Boolean(user.isImpersonated) }, () => prisma.auditLog.create({ data: { userId: user.originalAdminUserId || user.id, action: user.isImpersonated ? "IMPERSONATED_LOGIN" : "LOGIN", entity: "USER", entityId: user.id, severity: "success" } }));
    },
  },
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionVersion = user.sessionVersion ?? 0;
        token.isImpersonated = user.isImpersonated;
        token.originalAdminEmail = user.originalAdminEmail;
        token.originalAdminUserId = user.originalAdminUserId;
        token.originalAdminSessionVersion = user.originalAdminSessionVersion;
      }
      if (!token.id || token.sessionVersion === undefined) return null;
      const current = await prisma.user.findUnique({ where: { id: token.id }, select: { role: true, sessionVersion: true, password: true, isBlocked: true } });
      if (!current || current.sessionVersion !== token.sessionVersion || current.isBlocked) return null;
      if (!token.isImpersonated && !current.password) return null;
      if (!await permitsOwnAccount(token.id)) return null;
      token.role = current.role;
      const expiration = await prisma.systemSetting.findUnique({ where: { key: "session_expiration" } });
      if (expiration?.value === "true" && token.iat && Date.now() / 1000 - token.iat > 86_400) return null;
      if (token.isImpersonated) {
        if (current.role === "SUPERADMIN") return null;
        if (!token.originalAdminUserId) return null;
        const admin = await prisma.user.findUnique({ where: { id: token.originalAdminUserId }, select: { role: true, sessionVersion: true, password: true } });
        if (!admin?.password || admin.role !== "SUPERADMIN" || admin.sessionVersion !== token.originalAdminSessionVersion) return null;
        if (!await permitsOwnAccount(token.originalAdminUserId)) return null;
      }
      return token;
    },
    async session({ session, token }) {
      if (!token.id) return session;
      session.user.id = token.id;
      session.user.role = token.role || "USER";
      session.user.sessionVersion = token.sessionVersion ?? 0;
      session.user.isImpersonated = token.isImpersonated;
      session.user.originalAdminEmail = token.originalAdminEmail;
      session.user.originalAdminUserId = token.originalAdminUserId;
      session.user.originalAdminSessionVersion = token.originalAdminSessionVersion;
      const profile = await prisma.user.findUnique({ where: { id: token.id }, select: { name: true, updatedAt: true, bio: true, specialty: true, whatsapp: true, instagram: true, linkedin: true, city: true, experience: true, cref: true } });
      if (profile) { const { updatedAt, ...fields } = profile; Object.assign(session.user, fields); }
      // Legacy inline images can be megabytes. Fetch bytes only when an avatar is displayed.
      session.user.image = `/api/user/avatar?userId=${encodeURIComponent(token.id)}&v=${profile?.updatedAt?.getTime() ?? 0}`;
      return session;
    },
  },
});

const renderAuth = cache(() => uncachedAuth());
export const auth: typeof uncachedAuth = ((...args: unknown[]) => {
  if (args.length) return Reflect.apply(uncachedAuth, undefined, args);
  return requestMemo("auth", renderAuth);
}) as typeof uncachedAuth;
