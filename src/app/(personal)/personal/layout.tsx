import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { PersonalSidebar } from "@/components/application/personal-sidebar";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

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

  return (
    <SidebarProvider>
      <PersonalSidebar />
      <SidebarInset>
        <header className="flex h-18 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="px-4 mx-4" />
          <Separator orientation="vertical" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Personal Trainer</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
