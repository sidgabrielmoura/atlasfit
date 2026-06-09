import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import crypto from "crypto";

export async function POST(req: Request) {
  const session = await auth();

  const isImpersonated = (session?.user as any)?.isImpersonated;
  const originalAdminEmail = (session?.user as any)?.originalAdminEmail;

  if (!isImpersonated || !originalAdminEmail) {
    return new NextResponse("Not in an impersonated session", { status: 400 });
  }

  try {
    // Buscar se o email de destino (originalAdminEmail) de fato existe e é um SUPERADMIN
    const adminUser = await prisma.user.findUnique({
      where: { email: originalAdminEmail }
    });

    if (!adminUser || adminUser.role !== "SUPERADMIN") {
      return new NextResponse("Original user is not a superadmin", { status: 403 });
    }

    // Gerar um token seguro único e temporário (expira em 2 minutos)
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + 2);

    await prisma.verificationToken.create({
      data: {
        identifier: `IMPERSONATION:${adminUser.email}`,
        token,
        expires,
      }
    });

    return NextResponse.json({ token, email: adminUser.email }, { status: 200 });
  } catch (error) {
    console.error("UNIMPERSONATE_ERROR", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
