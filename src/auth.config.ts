import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  pages: {
    signIn: "/auth/student",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      // GlobalRole in Prisma schema: SUPERADMIN | USER
      const role = auth?.user?.role;

      const isSuperAdminArea = nextUrl.pathname.startsWith("/superadmin");
      const isPersonalArea = nextUrl.pathname.startsWith("/personal");
      const isStudentArea = nextUrl.pathname.startsWith("/student");
      const isGymArea = nextUrl.pathname.startsWith("/gym");
      const isGuardianArea = nextUrl.pathname.startsWith("/guardian");

      // --- Superadmin area: requires SUPERADMIN GlobalRole ---
      if (isSuperAdminArea) {
        if (!isLoggedIn || role !== "SUPERADMIN") {
          return NextResponse.redirect(new URL("/auth/admin", nextUrl));
        }
        return true;
      }

      // --- Gym area: requires logged in user (membership verified by layout/guards) ---
      if (isGymArea) {
        if (!isLoggedIn) {
          return NextResponse.redirect(new URL("/auth/gym", nextUrl));
        }
        return true;
      }

      // --- Guardian area: requires logged in user ---
      if (isGuardianArea) {
        if (!isLoggedIn) {
          return NextResponse.redirect(new URL("/auth/student", nextUrl));
        }
        return true;
      }

      // The server layout verifies PERSONAL membership or current GYM affiliation.
      if (isPersonalArea) {
        if (!isLoggedIn) {
          return NextResponse.redirect(new URL("/auth/trainer", nextUrl));
        }
        return true;
      }

      // --- Student area: requires STUDENT or USER GlobalRole ---
      if (isStudentArea) {
        if (!isLoggedIn) {
          return NextResponse.redirect(new URL("/auth/student", nextUrl));
        }
        return true;
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        if (user.isImpersonated) {
          token.isImpersonated = true;
          token.originalAdminEmail = user.originalAdminEmail;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id;
        session.user.role = token.role ?? "USER";
        session.user.sessionVersion = token.sessionVersion ?? 0;
        if (token.isImpersonated) {
          session.user.isImpersonated = true;
          session.user.originalAdminEmail = token.originalAdminEmail;
        }
      }
      return session;
    },
  },
  providers: [], // Providers are defined in auth.ts to avoid Edge Runtime issues
} satisfies NextAuthConfig;
