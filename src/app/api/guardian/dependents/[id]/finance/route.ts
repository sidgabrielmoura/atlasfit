import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGuardianFinance } from "@/modules/workspaces/application/guardian-portal";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Não autorizado." } }, { status: 401 });
  try {
    const { id } = await params;
    return NextResponse.json(await getGuardianFinance(id, session.user.id, Object.fromEntries(new URL(req.url).searchParams)));
  } catch (error: unknown) {
    const access = handleWorkspaceAccessError(error); if (access) return access;
    console.error("guardian finance operation failed", { errorType: error instanceof Error ? error.name : "unknown" });
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Não foi possível consultar as mensalidades." } }, { status: 500 });
  }
}
