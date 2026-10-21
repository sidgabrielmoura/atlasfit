import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAllowedOrigin } from "@/lib/auth/application-origin";
import { JsonRequestError, readJsonRequest } from "@/lib/http/read-json";
import { LegalReacceptanceError, reacceptOwnDocument } from "@/lib/privacy/reacceptance";

const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return fail("Não autorizado.", 401);
  if (session.user.isImpersonated) return fail("Encerre a impersonação para confirmar seus documentos.", 403);
  try {
    if (req.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") return fail("Corpo application/json obrigatório.", 415);
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) return fail("Origem da confirmação inválida.", 403);
    const acceptance = await reacceptOwnDocument(session.user.id, await readJsonRequest(req, 4096), {
      ipAddress: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip"),
      userAgent: req.headers.get("user-agent"),
    });
    return NextResponse.json({ success: true, acceptance }, { headers });
  } catch (error) {
    if (error instanceof JsonRequestError) return fail(error.message, error.statusCode);
    if (error instanceof LegalReacceptanceError) return fail(error.message, error.status);
    console.error("[LEGAL_ACCEPT_API_ERROR] Falha ao registrar aceite.");
    return fail("Erro ao registrar aceite. Tente novamente.", 500);
  }
}
