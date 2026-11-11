"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { LayoutDashboard, Dumbbell, LineChart, User, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useBottomAlertOffset, useIsModalOpen } from "@/hooks/use-bottom-alert";

export function StudentMobileNavbar() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const bottomAlertOffset = useBottomAlertOffset();
  const isModalOpen = useIsModalOpen();

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { title: "Início", href: "/student/dashboard", icon: LayoutDashboard },
    { title: "Treinos", href: "/student/workouts", icon: Dumbbell },
    { title: "Evolução", href: "/student/evolution", icon: LineChart },
    { title: "Perfil", href: "/student/profile", icon: User },
  ];

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        bottom:
          bottomAlertOffset > 0
            ? `calc(1.5rem + ${bottomAlertOffset}px + env(safe-area-inset-bottom, 0px))`
            : "calc(1.5rem + var(--mobile-bottom-offset, 0px) + env(safe-area-inset-bottom, 0px))",
      }}
      className={cn(
        "fixed left-1/2 -translate-x-1/2 z-30 w-[calc(100%-2rem)] max-w-sm md:hidden transition-[bottom,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        isModalOpen && "opacity-0 pointer-events-none invisible"
      )}
    >
      <div className="bg-white/80 dark:bg-neutral-950/35 backdrop-blur-3xl border border-black/10 dark:border-white/15 rounded-2xl p-1.5 flex items-center justify-between shadow-lg dark:shadow-2xl dark:shadow-black/70 ring-1 ring-black/5 dark:ring-white/10">
        <div className="flex items-center gap-1.5 flex-1 justify-between">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/student/dashboard" && pathname.startsWith(item.href));
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
                    layoutId="activeTabStudent"
                    className="absolute inset-0 bg-primary rounded-xl shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon className="size-4 shrink-0 z-10" />
                {isActive && (
                  <span className="font-extrabold text-[11px] text-primary-foreground tracking-tight z-10 ml-1.5 whitespace-nowrap animate-in fade-in duration-200">
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

