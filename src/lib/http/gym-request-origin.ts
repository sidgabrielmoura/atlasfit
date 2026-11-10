import { isAllowedOrigin } from "@/lib/auth/application-origin";
export function isGymMutationOriginAllowed(request: Request) {
  if (!new URL(request.url).pathname.startsWith("/api/gym/") || ["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = request.headers.get("origin");
  return !origin || isAllowedOrigin(origin);
}
