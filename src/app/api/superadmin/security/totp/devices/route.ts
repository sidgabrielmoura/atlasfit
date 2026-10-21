import { withRequestMemo } from "@/lib/request-memo";
import { handleMfaMutation, mfaPairBody } from "@/lib/auth/mfa-settings-http";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function handleGET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN" || !session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const devices = await prisma.userTotpDevice.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        deviceName: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("[GET_DEVICES_ERROR]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
export const GET = withRequestMemo(handleGET);

export function POST(request: Request) { return handleMfaMutation(request, mfaPairBody, ({ reauthenticationProof: _proof, ...body }) => ({ operation: "PAIR", ...body })); }
