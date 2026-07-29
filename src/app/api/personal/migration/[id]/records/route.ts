import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReviewRecords } from "@/lib/migration/review.service";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: jobId } = await params;
  const { searchParams } = new URL(req.url);

  const tabFilter = (searchParams.get("tab") as any) || "ALL";
  const entityType = searchParams.get("entityType") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  try {
    const result = await getReviewRecords({
      jobId,
      tabFilter,
      entityType,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    return new NextResponse("Erro ao consultar registros de revisão.", { status: 500 });
  }
}
