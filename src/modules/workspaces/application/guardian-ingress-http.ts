import { NextResponse } from "next/server";
import { validateApplicationOrigin } from "@/lib/auth/application-origin";

/** JSON requests need a preflight cross-site; do not accept simple form bodies. */
export function guardianIngressRequestError(req: Request) {
  if (req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return NextResponse.json({ error: { message: "Corpo application/json obrigatório." } }, { status: 415, headers: { "Cache-Control": "no-store" } });
  const origin = req.headers.get("origin");
  const expected = validateApplicationOrigin(process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.atlasfit.site");
  if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== expected)) return NextResponse.json({ error: { message: "Origem da confirmação inválida." } }, { status: 403, headers: { "Cache-Control": "no-store" } });
  return null;
}
