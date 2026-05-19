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
    const { name, url, icon, category, isActive } = await req.json();

    const data: any = {};
    if (name !== undefined) data.name = name;
    if (url !== undefined) data.url = url;
    if (icon !== undefined) data.icon = icon;
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.isActive = isActive;

    const integration = await prisma.systemIntegration.update({
      where: { id },
      data,
    });

    return NextResponse.json(integration);
  } catch (error) {
    console.error("[INTEGRATION_PATCH]", error);
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
    await prisma.systemIntegration.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[INTEGRATION_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
