import { NextResponse } from "next/server";
import { getSuperAdminStats } from "@/services/superadmin.service";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const stats = await getSuperAdminStats();
    return NextResponse.json(stats);
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 });
  }
}
