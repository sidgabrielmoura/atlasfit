import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata = {
  title: "Métricas & Relatórios Gerenciais | AtlasFit Gym",
  description: "Indicadores da operação, receita recorrente, inadimplência, exportações auditadas",
};

export default async function GymAnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/gym");
  }

  redirect("/gym/finance?tab=metrics");
}
