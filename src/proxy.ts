import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse, type NextRequest } from "next/server";
import { isGymMutationOriginAllowed } from "@/lib/http/gym-request-origin";

const authMiddleware = NextAuth(authConfig).auth((request) => {
  const headers = new Headers(request.headers);
  headers.set("x-atlasfit-path", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
});

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/gym/")) {
    if (!isGymMutationOriginAllowed(request)) {
      return NextResponse.json(
        { error: { code: "INVALID_ORIGIN", message: "Origem da solicitação inválida." } },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return (authMiddleware as any)(request, {});
}

export default proxy;

export const config = {
  // Public pages and files are served without starting an auth function.
  // Keep the GYM mutation origin check and all protected application areas.
  matcher: [
    "/personal/:path*",
    "/student/:path*",
    "/gym/:path*",
    "/guardian/:path*",
    "/superadmin/:path*",
    "/api/gym/:path*",
  ],
};
