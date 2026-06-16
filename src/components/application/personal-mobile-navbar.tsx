"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, Dumbbell, CalendarDays, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function PersonalMobileNavbar() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { title: "Início", href: "/personal/dashboard", icon: LayoutDashboard },
    { title: "Alunos", href: "/personal/clients", icon: Users },
    { title: "Treinos", href: "/personal/workouts", icon: Dumbbell },
    { title: "Agenda", href: "/personal/calendar", icon: CalendarDays },
  ];

  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-sm md:hidden">
      <div className="bg-white/80 dark:bg-neutral-950/35 backdrop-blur-3xl border border-black/10 dark:border-white/15 rounded-2xl p-1.5 flex items-center justify-between shadow-lg dark:shadow-2xl dark:shadow-black/70 ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-center gap-1.5 flex-1 justify-between">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/personal/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center justify-center px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors duration-200 select-none min-h-[36px]",
                  isActive && "text-primary-foreground font-bold"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabPersonal"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon className="size-4 shrink-0 z-10 text-white" />
                {isActive && (
                  <span className="font-extrabold text-[11px] text-white tracking-tight z-10 ml-1.5 whitespace-nowrap animate-in fade-in duration-200">
                    {item.title}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Separator line */}
        <div className="w-px h-5 bg-black/10 dark:bg-white/10 mx-2" />

        {/* Toggle Sidebar Button */}
        <button
          onClick={() => toggleSidebar()}
          className="p-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer rounded-xl flex items-center justify-center size-9 hover:bg-black/5 dark:hover:bg-white/5"
        >
          <Menu className="size-4 shrink-0" />
        </button>
      </div>
    </div>,
    document.body
  );
}

