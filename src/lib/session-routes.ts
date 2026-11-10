/** Only pages that never need the visitor's session may skip the initial lookup. */
export function isSessionlessRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  const path = pathname.replace(/\/$/, "") || "/";
  return [
    "/", "/maintenance", "/offline", "/privacidade",
    "/politica-de-privacidade", "/termos-de-uso",
    "/auth/admin", "/auth/gym", "/auth/student", "/auth/trainer",
    "/auth/register", "/auth/forgot-password", "/auth/reset-password",
  ].includes(path) || path.startsWith("/t/");
}
