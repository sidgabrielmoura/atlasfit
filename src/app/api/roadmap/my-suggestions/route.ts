import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMySuggestions } from "@/lib/roadmap/services";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const data = await getMySuggestions(session.user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/roadmap/my-suggestions error:", error);
    return new NextResponse("Erro ao carregar minhas sugestões", { status: 500 });
  }
}
