"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed prompt recently
    const dismissedUntil = localStorage.getItem("pwa_install_dismissed_until");
    if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
      return;
    }

    // 3. Listen to beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    // 4. Listen to appinstalled event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setInstalling(false);
      console.log("PWA installed successfully");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      setInstalling(true);
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
    } catch (err) {
      console.error("Installation prompt failed:", err);
    } finally {
      setDeferredPrompt(null);
      setShowPrompt(false);
      setInstalling(false);
    }
  };

  const handleDismiss = () => {
    // Snooze prompt for 7 days
    const snoozeDuration = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    localStorage.setItem("pwa_install_dismissed_until", String(Date.now() + snoozeDuration));
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300 ease-out">
      <div className="relative p-5 bg-neutral-950/95 backdrop-blur-md border border-neutral-800/80 rounded-2xl shadow-2xl flex flex-col gap-4 text-white">
        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 text-neutral-400 hover:text-white transition-colors"
          aria-label="Dismiss prompt"
        >
          <X className="size-4" />
        </button>

        {/* Icon & Brand */}
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0 border border-orange-500/20">
            <Download className="size-5 text-orange-500" />
          </div>
          <div>
            <span className="text-[9px] text-orange-500 font-bold uppercase tracking-wider">Web App</span>
            <h4 className="text-sm font-bold text-white tracking-tight leading-tight">AtlasFit App</h4>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-neutral-400 leading-relaxed pr-2">
          Instale o aplicativo para ter acesso imediato aos seus treinos, notificações em tempo real e total desempenho.
        </p>

        {/* Action Button */}
        <Button
          onClick={handleInstall}
          disabled={installing}
          className="w-full h-10 text-xs font-semibold bg-primary hover:bg-primary/90 text-black rounded-xl shadow-lg shadow-primary/10 flex items-center justify-center gap-1.5 transition-all"
        >
          {installing ? "Instalando..." : "Instalar Aplicativo"}
        </Button>
      </div>
    </div>
  );
}
