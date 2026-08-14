import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActivePoll, votePoll } from "@/lib/roadmap/services";
import { votePollSchema } from "@/lib/roadmap/schemas";
import { publishToChannel } from "@/lib/ably";

export async function GET() {
  try {
    const session = await auth();
    const poll = await getActivePoll(session?.user?.id);
    return NextResponse.json(poll || { active: false });
  } catch (error: any) {
    console.error("GET /api/roadmap/polls/active error:", error);
    return new NextResponse("Erro ao carregar votação", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const parsed = votePollSchema.parse(body);

    const result = await votePoll(parsed.pollId, parsed.optionId, session.user.id);

    // Fetch updated poll structure to broadcast via Ably
    const updatedPoll = await getActivePoll(session.user.id);
    if (updatedPoll) {
      await publishToChannel("roadmap:polls", "poll-voted", {
        pollId: parsed.pollId,
        totalVotes: updatedPoll.totalVotes,
        options: updatedPoll.options.map((opt: any) => ({
          id: opt.id,
          voteCount: opt.voteCount,
          percentage: opt.percentage,
        })),
        recentInteractors: updatedPoll.recentInteractors,
      });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return new NextResponse(error.errors[0]?.message || "Dados inválidos", { status: 400 });
    }
    console.error("POST /api/roadmap/polls/active error:", error);
    return new NextResponse(error.message || "Erro ao registrar voto na enquete", { status: 400 });
  }
}
