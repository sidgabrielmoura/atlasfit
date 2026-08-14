import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { mergeFeaturesSchema } from "@/lib/roadmap/schemas";
import { superadminMergeFeatures } from "@/lib/roadmap/services";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const body = await req.json();
    const parsed = mergeFeaturesSchema.parse(body);

    const merged = await superadminMergeFeatures(parsed.primaryId, parsed.secondaryId, session.user.id);
    return NextResponse.json({ success: true, feature: merged });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return new NextResponse(error.errors[0]?.message || "Dados inválidos", { status: 400 });
    }
    console.error("POST /api/superadmin/roadmap/merge error:", error);
    return new NextResponse(error.message || "Erro ao mesclar funcionalidades", { status: 500 });
  }
}
