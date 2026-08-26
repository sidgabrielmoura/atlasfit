import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "SUPERADMIN") {
      return new NextResponse("Acesso não autorizado.", { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const role = searchParams.get("role")?.trim() || "";

    const where: any = {};
    if (role && role !== "ALL") {
      where.role = role;
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { cpfCnpj: { contains: query, mode: "insensitive" } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        _count: {
          select: {
            notificationDevices: {
              where: { status: "ACTIVE" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name || "Sem nome",
      email: u.email || "",
      role: u.role,
      image: u.image,
      activeDevicesCount: u._count.notificationDevices
    }));

    return NextResponse.json(formatted);
  } catch (error: any) {
    console.error("[User Search Error]:", error);
    return new NextResponse(error.message || "Erro ao buscar usuários.", { status: 500 });
  }
}
