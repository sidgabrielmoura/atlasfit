import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GuardianDependentsClient } from "./dependents-client";

export const metadata = {
  title: "Portal do Responsável — Dependentes | AtlasFit",
  description: "Acompanhamento de dependentes menores, aceites legais e termos de representação",
};

export default async function GuardianDependentsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/auth/student?callbackUrl=/guardian/dependents");
  }

  return (
    <div className="min-h-screen bg-background">
      <GuardianDependentsClient
        initialDependents={[]}
        userName={session.user.name || "Responsável"}
        userEmail={session.user.email || ""}
      />
    </div>
  );
}
