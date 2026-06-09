import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/auth/student",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // GlobalRole in Prisma schema: SUPERADMIN | USER
      const role = (auth?.user as any)?.role as string | undefined;

      const isSuperAdminArea = nextUrl.pathname.startsWith("/superadmin");
      const isPersonalArea = nextUrl.pathname.startsWith("/personal");
      const isStudentArea = nextUrl.pathname.startsWith("/student");

      // --- Superadmin area: requires SUPERADMIN GlobalRole ---
      if (isSuperAdminArea) {
        if (!isLoggedIn) return false;
        if (role !== "SUPERADMIN") return false;
        return true;
      }

      // --- Personal trainer area: requires TRAINER GlobalRole ---
      if (isPersonalArea) {
        if (!isLoggedIn) return false;
        if (role !== "TRAINER") return false;
        return true;
      }

      // --- Student area: requires STUDENT GlobalRole ---
      if (isStudentArea) {
        if (!isLoggedIn) return false;
        if (role !== "STUDENT") return false;
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        if ((user as any).isImpersonated) {
          token.isImpersonated = true;
          token.originalAdminEmail = (user as any).originalAdminEmail;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        if (token.isImpersonated) {
          (session.user as any).isImpersonated = true;
          (session.user as any).originalAdminEmail = token.originalAdminEmail;
        }
      }
      return session;
    },
  },
  providers: [], // Providers are defined in auth.ts to avoid Edge Runtime issues
} satisfies NextAuthConfig;
