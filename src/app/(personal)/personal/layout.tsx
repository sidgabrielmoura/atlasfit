import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { PersonalSidebar } from "@/components/application/personal-sidebar";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { PersonalMobileNavbar } from "@/components/application/personal-mobile-navbar";
import { PersonalHeaderWorkspace } from "@/components/application/personal-header-workspace";

export default async function PersonalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Guard: unauthenticated or wrong GlobalRole → trainer login
  if (!session?.user) {
    redirect("/auth/trainer");
  }

  const role = (session.user as any).role as string | undefined;
  if (role !== "TRAINER") {
    redirect("/auth/trainer");
  }

  // Verificar status de cobrança/assinatura da mensalidade do Personal
  const subscription = await prisma.subscription.findUnique({
    where: { userId: session.user.id }
  });

  const freeTrial = await prisma.freeTrial.findUnique({
    where: { userId: session.user.id }
  });

  const isTrialActive = freeTrial ? new Date() <= new Date(freeTrial.endDate) : false;
  const isSubscriptionActive = subscription ? subscription.status === "active" : false;

  if (!isTrialActive && !isSubscriptionActive) {
    redirect("/subscription-expired");
  }

  const showBillingWarning = subscription?.status === "past_due" || subscription?.status === "unpaid";

  return (
    <SidebarProvider>
      <PersonalSidebar />
      <SidebarInset>
        <header className="flex h-18 shrink-0 items-center justify-between border-b px-4 w-full">
          <div className="flex items-center gap-2 min-w-0">
            <SidebarTrigger className="px-4 mx-4 hidden md:inline-flex" />
            <Separator orientation="vertical" className="hidden md:block" />
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground mr-1">
                <span>Personal Trainer</span>
                <span className="text-muted-foreground/30">|</span>
              </div>
              <PersonalHeaderWorkspace />
            </div>
          </div>
        </header>

        {showBillingWarning && (
          <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold select-none animate-in fade-in duration-300">
            <div className="flex items-center gap-2 text-destructive">
              <span className="size-2 bg-destructive rounded-full shrink-0 animate-pulse" />
              <span>
                <strong>ASSINATURA EXPIRADA:</strong> O AbacatePay não conseguiu processar a renovação automática da sua mensalidade. Regularize seu pagamento para evitar a suspensão dos seus painéis.
              </span>
            </div>
            <a 
              href="/personal/subscription" 
              className="px-3.5 py-1.5 rounded-lg bg-destructive hover:bg-destructive/90 text-white font-bold text-[10px] tracking-wide uppercase transition-colors shrink-0 text-center"
            >
              Regularizar Assinatura
            </a>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-24 md:pb-6">
          {children}
        </div>
        <PersonalMobileNavbar />
      </SidebarInset>
    </SidebarProvider>
  );
}
