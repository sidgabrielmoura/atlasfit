import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSuperadminTransactions } from "@/modules/workspaces/application/superadmin-finance";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
export const dynamic = "force-dynamic";
async function handleGET(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) return new NextResponse("Unauthorized", { status: 401 });
  try { return NextResponse.json(await listSuperadminTransactions(session.user.id, Object.fromEntries(new URL(req.url).searchParams))); }
  catch (error) {
    const access = handleWorkspaceAccessError(error); if (access) return access;
    console.error("SUPERADMIN_FINANCE_ERROR", error);
    return NextResponse.json({ error: { message: "Não foi possível carregar o relatório financeiro." } }, { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
