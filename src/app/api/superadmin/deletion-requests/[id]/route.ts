import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ErasureService } from "@/lib/privacy/erasure.service";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Find the deletion request either by its primary id or by target userId
    const deletionRequest = await prisma.dataDeletionRequest.findFirst({
      where: {
        OR: [
          { id },
          { userId: id },
        ],
      },
    });

    const targetUserId = deletionRequest ? deletionRequest.userId : id;

    const result = await ErasureService.executeCompleteErasure(targetUserId, session.user.id);

    return NextResponse.json({
      success: true,
      erasureResult: result,
    });
  } catch (error: any) {
    console.error("[DELETION_REQUEST_DELETE_ERROR]", error);
    return NextResponse.json({ error: error.message || "Erro ao realizar exclusão em cascata dos dados." }, { status: 500 });
  }
}
