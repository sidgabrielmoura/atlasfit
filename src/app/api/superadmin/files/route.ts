import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "todos";

    const whereClause: any = {};

    if (search) {
      // 1. Busca workspaces cujo nome contenha o termo
      const matchingWorkspaces = await prisma.workspace.findMany({
        where: {
          name: { contains: search, mode: "insensitive" }
        },
        select: { id: true }
      });
      const matchingWorkspaceIds = matchingWorkspaces.map(w => w.id);

      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { student: { name: { contains: search, mode: "insensitive" } } },
        { student: { email: { contains: search, mode: "insensitive" } } },
        { workspaceId: { in: matchingWorkspaceIds } },
      ];
    }

    if (category !== "todos") {
      whereClause.category = category;
    }

    const files = await prisma.studentFile.findMany({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // 2. Coleta os IDs únicos de workspaces e busca seus metadados
    const workspaceIds = Array.from(new Set(files.map(f => f.workspaceId).filter(Boolean)));
    const workspaces = await prisma.workspace.findMany({
      where: {
        id: { in: workspaceIds }
      },
      select: {
        id: true,
        name: true,
        slug: true
      }
    });

    const workspacesMap = new Map(workspaces.map(w => [w.id, w]));

    // 3. Une os metadados do workspace no retorno final
    const filesWithWorkspaces = files.map(file => ({
      ...file,
      workspace: workspacesMap.get(file.workspaceId) || null
    }));

    return NextResponse.json(filesWithWorkspaces, { status: 200 });
  } catch (error) {
    console.error("GET_SUPERADMIN_FILES_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
