"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "./providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { DynamicBranding } from "@/components/application/dynamic-branding";
import dynamic from "next/dynamic";

const EngageRenderer = dynamic(
  () => import("@/components/engage/engage-renderer").then((mod) => mod.EngageRenderer),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  if (typeof window !== "undefined") {
    const originalError = console.error;
    console.error = (...args) => {
      if (typeof args[0] === "string" && args[0].includes("Encountered a script tag while rendering React component")) {
        return;
      }
      originalError.apply(console, args);
    };
  }

  return (
    <AuthProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        enableColorScheme={false}
      >
        <TooltipProvider delayDuration={0}>
          <DynamicBranding />
          {children}
          <EngageRenderer />
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </NextThemesProvider>
    </AuthProvider>
  );
}
