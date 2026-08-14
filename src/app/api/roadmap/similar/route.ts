import { NextResponse } from "next/server";
import { searchSimilarSuggestions } from "@/lib/roadmap/services";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";

    const matches = await searchSimilarSuggestions(query);
    return NextResponse.json(matches);
  } catch (error: any) {
    console.error("GET /api/roadmap/similar error:", error);
    return NextResponse.json([]);
  }
}
