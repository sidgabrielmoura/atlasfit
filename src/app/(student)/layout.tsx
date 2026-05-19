import { StudentSidebar } from "@/components/application/student-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Guard: unauthenticated or wrong GlobalRole → student login
  if (!session?.user) {
    redirect("/auth/student");
  }

  const role = (session.user as any).role as string | undefined;
  if (role !== "STUDENT") {
    redirect("/auth/student");
  }

  return (
    <SidebarProvider>
      <StudentSidebar />
      <SidebarInset className="bg-background">
        {/* Top Header Barra Superior (Igual ao Personal) */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-background/80 backdrop-blur-md px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <div className="hidden md:flex relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar treinos, exercícios..."
                className="pl-9 bg-secondary/30 border-none h-9 rounded-lg"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Bell className="size-5 text-muted-foreground" />
              <span className="absolute top-2 right-2 size-2 bg-destructive rounded-full border-2 border-background" />
            </Button>
            <div className="h-8 w-[1px] bg-border/50 mx-1 hidden sm:block" />
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Plano Elite</span>
              <span className="text-[10px] text-muted-foreground font-medium">Assinatura Ativa</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
