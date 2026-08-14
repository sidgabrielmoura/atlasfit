import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRoadmapData, createSuggestion } from "@/lib/roadmap/services";
import { createSuggestionSchema } from "@/lib/roadmap/schemas";

export async function GET(req: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const sort = searchParams.get("sort") || "popular";
    const priority = searchParams.get("priority") || undefined;
    const source = searchParams.get("source") || undefined;

    const isSuperAdmin = session?.user?.role === "SUPERADMIN";
    const data = await getRoadmapData(
      session?.user?.id,
      search,
      categoryId,
      sort,
      priority,
      source,
      isSuperAdmin
    );
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/roadmap/features error:", error);
    return new NextResponse("Erro ao carregar o roadmap", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    const body = await req.json();
    const parsed = createSuggestionSchema.parse(body);

    const feature = await createSuggestion(session.user.id, parsed.title, parsed.description, parsed.categoryId);
    return NextResponse.json({ success: true, feature });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return new NextResponse(error.errors[0]?.message || "Dados inválidos", { status: 400 });
    }
    console.error("POST /api/roadmap/features error:", error);
    return new NextResponse(error.message || "Erro ao criar sugestão", { status: 500 });
  }
}
