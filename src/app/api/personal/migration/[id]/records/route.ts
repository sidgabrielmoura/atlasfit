import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { assertPersonalImportJobAccess } from "@/lib/migration/access";
import { requirePersonalWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getReviewRecords } from "@/lib/migration/review.service";

async function handleGET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Não autorizado.", { status: 401 });
  }

  const { id: jobId } = await params;
  const { searchParams } = new URL(req.url);

  const tabFilter = (searchParams.get("filter") || searchParams.get("tab") || "ALL") as any;
  const entityType = searchParams.get("entityType") || undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  try {
    await assertPersonalImportJobAccess(jobId);

    const result = await getReviewRecords({
      jobId,
      tabFilter,
      entityType,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (error) {
    const accessError = handleWorkspaceAccessError(error); if (accessError) return accessError;

    return new NextResponse("Erro ao consultar registros de revisão.", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);
