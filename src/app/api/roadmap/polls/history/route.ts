import { NextResponse } from "next/server";
import { getClosedPollsHistory } from "@/lib/roadmap/services";

export async function GET() {
  try {
    const history = await getClosedPollsHistory();
    return NextResponse.json(history);
  } catch (error: any) {
    console.error("GET /api/roadmap/polls/history error:", error);
    return new NextResponse("Erro ao buscar histórico de enquetes", { status: 500 });
  }
}
