import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireGymWorkspaceAccess } from "@/modules/workspaces/application/guard";
import { getGymDashboardMetrics } from "@/modules/workspaces/application/gym-dashboard-metrics";
import { gymFinanceHttpFailure } from "@/modules/workspaces/application/gym-finance-http";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sessão não autenticada." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "ID do workspace é obrigatório." }, { status: 400 });
    }

    const context = await requireGymWorkspaceAccess({ workspaceId });
    const metrics = await getGymDashboardMetrics({
      workspaceId: context.workspaceId,
      actorUserId: context.userId,
    });

    return NextResponse.json(metrics, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    return gymFinanceHttpFailure(error);
  }
}
