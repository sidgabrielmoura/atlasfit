import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { SuperAdminSidebar } from "@/components/application/superadmin-sidebar";
import { Separator } from "@/components/ui/separator";
import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

import { CommandMenu } from "@/components/application/command-menu";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <SuperAdminSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border/40 px-6 sticky top-0 z-40 bg-background/80 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="size-9 rounded-lg hover:bg-secondary transition-all" />
            <Separator orientation="vertical" className="h-6 opacity-50" />
            <div className="hidden md:flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
              <span className="text-primary font-black">SuperAdmin</span>
              <span className="opacity-50">/</span>
              <span>AtlasFit Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <CommandMenu />
            
            <Button variant="ghost" size="icon" className="size-9 rounded-lg hover:bg-secondary transition-all relative">
              <Bell className="size-4" />
              <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-background" />
            </Button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
