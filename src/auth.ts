import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/lib/auth/credential-authorization";
import { permitsOwnAccount } from "@/lib/auth/account-eligibility";
import { withAuditIdentity } from "@/lib/audit-context";
import { cache } from "react";
import { requestMemo } from "@/lib/request-memo";

export const { handlers: { GET, POST }, auth: uncachedAuth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: [Credentials({ authorize: authorizeCredentials })],
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
