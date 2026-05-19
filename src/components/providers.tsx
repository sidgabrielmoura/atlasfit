"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider } from "./providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  // Workaround para erro do next-themes no React 19 / Next.js 15
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
          {children}
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </NextThemesProvider>
    </AuthProvider>
  );
}
