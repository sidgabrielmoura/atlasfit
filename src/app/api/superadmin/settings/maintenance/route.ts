import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST() {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: "maintenance_mode" }
    });

    const isEnabled = maintenanceSetting?.value === "true";
    const newValue = isEnabled ? "false" : "true";

    await prisma.systemSetting.upsert({
      where: { key: "maintenance_mode" },
      update: { value: newValue },
      create: { key: "maintenance_mode", value: newValue, type: "boolean", description: "Ativa o modo de manutenção global do sistema" }
    });

    return NextResponse.json({ success: true, enabled: newValue === "true" });
  } catch (error) {
    console.error("[MAINTENANCE_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
