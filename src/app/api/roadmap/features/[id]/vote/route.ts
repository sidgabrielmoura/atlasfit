import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { toggleVote, getRecentInteractors } from "@/lib/roadmap/services";
import { publishToChannel } from "@/lib/ably";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const { id } = await params;
    const result = await toggleVote(id, session.user.id);
    const recentInteractors = await getRecentInteractors(id);

    // Broadcast feature vote update to all clients via Ably
    await publishToChannel("roadmap:features", "feature-voted", {
      featureId: id,
      voteCount: result.voteCount,
      voterUserId: session.user.id,
      recentInteractors,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST /api/roadmap/features/[id]/vote error:", error);
    return new NextResponse(error.message || "Erro ao registrar voto", { status: 500 });
  }
}
