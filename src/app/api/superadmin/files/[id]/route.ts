import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return new NextResponse("Missing file ID", { status: 400 });
    }

    const file = await prisma.studentFile.findUnique({
      where: { id }
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETION",
        entity: "FILE",
        entityId: id,
        severity: "warning"
      }
    });

    await prisma.studentFile.delete({
      where: { id }
    });

    return new NextResponse("File deleted successfully", { status: 200 });
  } catch (error) {
    console.error("DELETE_SUPERADMIN_FILE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
