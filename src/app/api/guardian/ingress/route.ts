import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { rateLimit } from "@/lib/rate-limit";
import { handleWorkspaceAccessError } from "@/modules/workspaces";
import { guardianInvitationTokenSchema } from "@/modules/workspaces/domain/guardian-ingress";
import { getGuardianInvitation, claimGuardianInvitation } from "@/modules/workspaces/application/guardian-ingress";
import { guardianIngressRequestError } from "@/modules/workspaces/application/guardian-ingress-http";

const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function GET(req: Request) {
  try {
    const parsed = z.object({ token: guardianInvitationTokenSchema }).strict().safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: { message: "Link de convite inválido." } }, { status: 400, headers });
    return NextResponse.json(await getGuardianInvitation(parsed.data.token), { headers });
  } catch (error: unknown) { return failure(error); }
}
export async function POST(req: Request) {
  try {
    const invalidRequest = guardianIngressRequestError(req); if (invalidRequest) return invalidRequest;
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 80) || "unknown";
    if (!(await rateLimit(`guardian-ingress:${ip}`, 30, 600000)).success) return NextResponse.json({ error: { message: "Muitas tentativas. Aguarde para tentar novamente." } }, { status: 429, headers });
    const session = await auth();
    if (session?.user?.isImpersonated) return NextResponse.json({ error: { message: "O vínculo exige acesso direto do responsável." } }, { status: 403, headers });
    return NextResponse.json(await claimGuardianInvitation(await readJsonRequest(req, 8192), session?.user?.id, { ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim(), userAgent: req.headers.get("user-agent") || undefined }), { headers });
  } catch (error: unknown) { return failure(error); }
}
function failure(error: unknown) {
  if (error instanceof JsonRequestError) return NextResponse.json({ error: { message: error.message } }, { status: error.statusCode, headers });
  const response = handleWorkspaceAccessError(error); if (response) { for (const [key, value] of Object.entries(headers)) response.headers.set(key, value); return response; }
  console.error("guardian invitation claim failed", { errorType: error instanceof Error ? error.name : "unknown" });
  return NextResponse.json({ error: { message: "Não foi possível validar ou concluir o convite." } }, { status: 500, headers });
}
