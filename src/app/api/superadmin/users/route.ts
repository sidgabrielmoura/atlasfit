import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import bcryptjs from "bcryptjs";
import { logSystemError } from "@/lib/logger";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        workspaces: {
          include: {
            workspace: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const sanitizedUsers = users.map((u) => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });

    return NextResponse.json(sanitizedUsers);
  } catch (error) {
    await logSystemError({ action: "GET_USERS", error, entity: "USER" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, role } = body;

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
        }
      });

      // When creating a TRAINER, automatically grant a 10-day free trial
      // to match the self-registration flow in registerTrainer()
      if (role === "TRAINER") {
        const now = new Date();
        const tenDaysFromNow = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

        await tx.freeTrial.create({
          data: {
            userId: user.id,
            startDate: now,
            endDate: tenDaysFromNow,
            isActive: true,
          }
        });
      }

      return user;
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    await logSystemError({ action: "POST_USER_CREATE", error, entity: "USER" });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
