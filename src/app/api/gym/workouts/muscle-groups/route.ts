import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const GET = withAuditedRequest(async function GET() {
  try {
    const muscleGroups = await prisma.muscleGroup.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(muscleGroups);
  } catch (error) {
    console.error("GET gym muscle groups error:", error);
    return NextResponse.json({ error: "Erro interno do servidor ao carregar grupos musculares." }, { status: 500 });
  }
});
