import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import {
  generateTOTPSecret,
  generateTOTPUri,
  generateQRCodeDataURL,
} from "@/lib/auth/totp";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });

    if (!user || !user.email) {
      return new NextResponse("User not found", { status: 404 });
    }

    const secret = generateTOTPSecret();
    const uri = generateTOTPUri(user.email, secret, "AtlasFit (SuperAdmin)");
    const qrCodeUrl = await generateQRCodeDataURL(uri);

    return NextResponse.json({
      secret,
      qrCodeUrl,
      email: user.email,
      issuer: "AtlasFit (SuperAdmin)",
    });
  } catch (error) {
    console.error("[TOTP_SETUP_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
