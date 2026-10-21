import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ablyRest } from "@/lib/ably";
import { resolveRealtimeCapabilities } from "@/modules/workspaces/application/realtime-capabilities";
import { WorkspaceContextService } from "@/modules/workspaces/application/context-service";

async function handleGET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const params = new URL(req.url).searchParams;
    const requested = params.get("workspaceId");
    if (params.getAll("workspaceId").length > 1 || (requested !== null && (!requested.trim() || requested.length > 256))) {
      return new NextResponse("Contexto inválido.", { status: 400, headers: { "Cache-Control": "private, no-store" } });
    }
    const selected = await WorkspaceContextService.getActiveWorkspaceIdFromCookie();
    if (requested !== null && requested !== selected) {
      return new NextResponse("O contexto selecionado mudou.", { status: 409, headers: { "Cache-Control": "private, no-store" } });
    }
    if (!ablyRest) {
      return new NextResponse("Serviço de tempo real não configurado.", { status: 503 });
    }

    // Set the client ID to the authenticated user ID
    const clientId = session.user.id;

    // Request token with standard capabilities and client ID matching user ID
    const tokenRequest = await ablyRest.auth.createTokenRequest({
      clientId,
      capability: JSON.stringify(await resolveRealtimeCapabilities(clientId, selected)),
      ttl: 60_000,
    });

    return NextResponse.json(tokenRequest, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[API Ably Token] Falha ao emitir token.");
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
