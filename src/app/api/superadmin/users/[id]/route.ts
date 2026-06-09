import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
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
      return new NextResponse("Missing user ID", { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        },
        subscription: {
          include: {
            plan: true
          }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!user) {
      return new NextResponse("User not found", { status: 404 });
    }

    const userWithSub = {
      ...user,
      subscriptions: user.subscription ? [
        {
          ...user.subscription,
          workspace: { name: user.name || "Workspace" }
        }
      ] : [],
      payments: user.transactions || []
    };

    return NextResponse.json(userWithSub, { status: 200 });
  } catch (error) {
    console.error("GET_USER_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

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
    const { role } = body;

    if (!id) {
      return new NextResponse("Missing user ID", { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role: role !== undefined ? role : undefined,
      }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("UPDATE_USER_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
