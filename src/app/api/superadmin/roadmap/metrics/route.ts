import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSuperadminMetrics } from "@/lib/roadmap/services";

export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "SUPERADMIN") {
      return new NextResponse("Não autorizado", { status: 403 });
    }

    const metrics = await getSuperadminMetrics();
    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error("GET /api/superadmin/roadmap/metrics error:", error);
    return new NextResponse("Erro ao carregar métricas do superadmin", { status: 500 });
  }
}
