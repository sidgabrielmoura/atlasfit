import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { withAuditedRequest } from "@/lib/audited-request";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { reconcileGymStorage } from "@/modules/workspaces/application/gym-storage-reconciliation";

const body = z.object({ afterKey: z.string().max(1024).optional() }).strict();
export const POST = withAuditedRequest(async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    const parsed = body.safeParse(await readJsonRequest(request, 4096));
    if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    const { id } = await params;
    return NextResponse.json(await reconcileGymStorage(id, session.user.id, parsed.data.afterKey), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    if (error instanceof JsonRequestError) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: error.statusCode });
    return NextResponse.json({ error: "STORAGE_RECONCILIATION_UNAVAILABLE", message: "Não foi possível conferir os objetos. Nenhum tamanho foi presumido." }, { status: 503 });
  }
});
