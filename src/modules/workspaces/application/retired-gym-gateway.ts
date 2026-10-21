import { NextResponse } from "next/server";
import { z } from "zod";
import { requireWorkspaceAccess, handleWorkspaceAccessError } from "./guard";
import { WorkspaceAccessError } from "../domain/types";

import { rejectActiveGymGateway } from "../domain/gateway-policy";
export { rejectActiveGymGateway } from "../domain/gateway-policy";

export async function retiredGymGatewayOperation(req: Request): Promise<NextResponse> {
  try {
    const body = req.method === "GET" ? Object.fromEntries(new URL(req.url).searchParams) : await req.json();
    const parsed = z.object({ workspaceId: z.string().trim().min(1) }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Workspace obrigatório." } }, { status: 400 });
    const context = await requireWorkspaceAccess({ workspaceId: parsed.data.workspaceId });
    if (context.workspaceType !== "GYM") throw new WorkspaceAccessError(403, "FORBIDDEN_RESOURCE", "Este caminho pertence às academias.");
    rejectActiveGymGateway();
  } catch (error) {
    return handleWorkspaceAccessError(error) || NextResponse.json({ error: { code: "INVALID_REQUEST", message: "Requisição inválida." } }, { status: 400 });
  }
}
