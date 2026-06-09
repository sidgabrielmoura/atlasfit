import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!id) {
      return new NextResponse("Missing payment ID", { status: 400 });
    }

    if (!status || !["pago", "pendente", "atrasado"].includes(status)) {
      return new NextResponse("Invalid payment status", { status: 400 });
    }

    const updatedPayment = await prisma.workspacePayment.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(updatedPayment, { status: 200 });
  } catch (error) {
    console.error("PATCH_SUPERADMIN_PAYMENT_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
      return new NextResponse("Missing payment ID", { status: 400 });
    }

    await prisma.workspacePayment.delete({
      where: { id }
    });

    return new NextResponse("Payment deleted successfully", { status: 200 });
  } catch (error) {
    console.error("DELETE_SUPERADMIN_PAYMENT_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
