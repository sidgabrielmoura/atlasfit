import { withRequestMemo } from "@/lib/request-memo";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import bcryptjs from "bcryptjs";
import { logSystemError } from "@/lib/logger";
import { NotificationService } from "@/lib/notifications/service";
import { NotificationType, NotificationCategory, NotificationPriority } from "@/lib/notifications/types";
import { adminUserSelect, createAdminUserSchema } from "@/lib/auth/admin-user-service";

async function handleGET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      select: {
        ...adminUserSelect,
        workspaces: {
          select: { id: true, role: true, isActive: true, workspace: { select: { id: true, name: true, slug: true, type: true, isActive: true } } }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    await logSystemError({ action: "GET_USERS", error, entity: "USER" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const parsed = createAdminUserSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { name, email, password, role } = parsed.data;

    if (!name || !email || !password || !role) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return new NextResponse("Email already exists", { status: 400 });
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role,
        },
        select: adminUserSelect,
      });

      if (role === "TRAINER") {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        await tx.freeTrial.create({
          data: {
            userId: user.id,
            startDate: now,
            endDate: thirtyDaysFromNow,
            isActive: true,
          }
        });
      }

      return user;
    });


    try {
      await NotificationService.sendToSuperAdmins({
        type: NotificationType.SYSTEM,
        category: NotificationCategory.SYSTEM,
        title: "Novo Usuário Cadastrado 👤",
        description: `O usuário "${newUser.name}" (${newUser.email}) foi cadastrado como ${newUser.role}.`,
        priority: NotificationPriority.NORMAL,
        deepLink: "/superadmin/users"
      });
    } catch (notifErr) {
      console.error("Erro ao notificar superadmins sobre novo usuário:", notifErr);
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    await logSystemError({ action: "POST_USER_CREATE", error, entity: "USER" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
