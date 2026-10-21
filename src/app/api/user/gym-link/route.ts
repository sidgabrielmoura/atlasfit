import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";
import { acceptGymIdentityLink, readGymIdentityLink } from "@/modules/workspaces/application/gym-identity-link";
import { handleWorkspaceAccessError } from "@/modules/workspaces";
const schema = z.object({ requestId: z.string().min(1).max(100), token: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
export async function GET(req: Request) {
  const session = await auth(); if (!session?.user?.id || session.user.isImpersonated) return NextResponse.json({ error: "Entre com a própria conta para conferir o vínculo." }, { status: 401, headers });
  try {
    const input = schema.parse(Object.fromEntries(new URL(req.url).searchParams));
    const result = await readGymIdentityLink(input.requestId, input.token, session.user.id);
    return NextResponse.json({ gymName: result.gymName, unitName: result.unitName, authorized: Boolean(result.metadata.verifiedAt) }, { headers });
  } catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: "Convite inválido." }, { status: 400, headers }); }
}
export async function POST(req: Request) {
  const session = await auth(); if (!session?.user?.id || session.user.isImpersonated) return NextResponse.json({ error: "Entre com a própria conta para autorizar." }, { status: 401, headers });
  try {
    const input = schema.extend({ accepted: z.literal(true) }).parse(await readPrivacyJsonRequest(req, 4096));
    if (req.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "Origem inválida." }, { status: 403, headers });
    return NextResponse.json(await acceptGymIdentityLink(input.requestId, input.token, session.user.id), { headers });
  } catch (e) { return handleWorkspaceAccessError(e) || NextResponse.json({ error: "Não foi possível confirmar o convite." }, { status: 400, headers }); }
}
