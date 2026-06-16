import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search");
  const userId = searchParams.get("userId");
  const workspaceId = searchParams.get("workspaceId");
  const action = searchParams.get("action");
  const severity = searchParams.get("severity");

  try {
    const where: any = {};

    if (userId && userId !== "all") {
      where.userId = userId;
    }

    if (workspaceId && workspaceId !== "all") {
      where.entity = "WORKSPACE";
      where.entityId = workspaceId;
    }

    if (action && action !== "all") {
      where.action = action;
    }

    if (severity && severity !== "all") {
      where.severity = severity;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { entity: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: true
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return NextResponse.json(logs);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
