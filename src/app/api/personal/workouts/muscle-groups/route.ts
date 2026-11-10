import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMuscleGroups } from "@/lib/cache/public-data";

// GET /api/personal/workouts/muscle-groups
async function handleGET() {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    return NextResponse.json(await getMuscleGroups());
  } catch (error) {
    console.error("Error fetching muscle groups:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
