import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { getMuscleGroups } from "@/lib/cache/public-data";

export const GET = withAuditedRequest(async function GET() {
  try {
    return NextResponse.json(await getMuscleGroups());
  } catch (error) {
    console.error("GET gym muscle groups error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao carregar grupos musculares." }, { status: 500 });
  }
});
