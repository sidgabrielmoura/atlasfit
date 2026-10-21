import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import { getSuperAdminStats } from "@/services/superadmin.service";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { auth } from "@/auth";

async function handleGET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const stats = await getSuperAdminStats(session.user.id);
    return NextResponse.json(stats);
  } catch (error) {
    const access = handleWorkspaceAccessError(error); if (access) return access;
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
