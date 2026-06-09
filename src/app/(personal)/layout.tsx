import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export default async function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Se for superadmin ou sessão impersonada, ignora para permitir suporte e testes
  if (session?.user?.role !== "SUPERADMIN" && !(session?.user as any)?.isImpersonated) {
    const maintenanceSetting = await prisma.systemSetting.findUnique({
      where: { key: "maintenance_mode" }
    });

    if (maintenanceSetting?.value === "true") {
      redirect("/maintenance");
    }
  }

  return <>{children}</>;
}
