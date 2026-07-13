"use client";

import { useState } from "react";
import { WifiOff, RefreshCw, ShieldCheck, Database, KeyRound, HardDrive, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  const [isChecking, setIsChecking] = useState(false);
  const [retryStatus, setRetryStatus] = useState<"idle" | "success" | "error">("idle");

  const handleRetry = async () => {
    setIsChecking(true);
    setRetryStatus("idle");

    // Simulate network checking delay for a premium feedback feel
    await new Promise((resolve) => setTimeout(resolve, 1200));

    if (typeof window !== "undefined" && window.navigator.onLine) {
      setRetryStatus("success");
      window.location.reload();
    } else {
      setRetryStatus("error");
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 md:p-12 font-sans select-none">
      {/* Header */}
      <header className="w-full max-w-[1200px] mx-auto flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-[0.25em] text-foreground">ATLASFIT</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
          Modo Offline
        </div>
      </header>

      {/* Main Grid */}
      <main className="w-full max-w-[1200px] mx-auto my-auto py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-center">
        {/* Left Column: Status info */}
        <div className="md:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black tracking-[0.15em] text-amber-500 bg-amber-500/10 border border-amber-500/20 uppercase">
              Sem Conexão
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-lg">
              Você está desconectado.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Parece que o seu dispositivo perdeu o acesso à internet. Você ainda pode visualizar dados cacheados locais. Seus treinos, históricos e avaliações físicas continuam seguros.
            </p>
          </div>

          {/* Action button with state checks to prevent double submit */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Button
              onClick={handleRetry}
              disabled={isChecking}
              className="bg-primary hover:bg-primary/95 text-white font-bold h-11 px-6 rounded-xl flex items-center gap-2 transition-all"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Verificando conexão...
                </>
              ) : (
                <>
                  <RefreshCw className="size-4" />
                  Tentar Reconectar
                </>
              )}
            </Button>
            {retryStatus === "error" && (
              <span className="text-xs text-red-500 font-medium">
                Conexão não restabelecida. Verifique sua rede e tente novamente.
              </span>
            )}
          </div>

          {/* Structured PWA Status Metadata Block */}
          <div className="grid grid-cols-2 gap-4 border border-border bg-card/45 rounded-2xl p-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Acesso Offline</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-emerald-500" />
                Disponível (PWA)
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dados Locais</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <Database className="size-3 text-emerald-500" />
                Cacheados e Seguros
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Modo de Segurança</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <KeyRound className="size-3 text-emerald-500" />
                Ativo
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Armazenamento</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <HardDrive className="size-3 text-emerald-500" />
                Preservado
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Offline Diagnostic Card */}
        <div className="md:col-span-5 space-y-6">
          <Card className="border-border bg-card rounded-2xl shadow-none">
            <CardHeader className="border-b border-border/40 pb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Integridade de Rede</span>
              <CardTitle className="text-base font-bold text-foreground">Status da Conexão</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">subsistemas de comunicação locais.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* API Connection */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <WifiOff className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Rede Externa</h3>
                    <p className="text-[10px] text-muted-foreground">Conexão com a Internet</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px] font-semibold">
                  Offline
                </Badge>
              </div>

              {/* Cache status */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <Database className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Armazenamento Local</h3>
                    <p className="text-[10px] text-muted-foreground">Service Worker Cache</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[10px] font-semibold">
                  Ativo
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-[1200px] mx-auto border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
          <Mail className="size-3.5" />
          <span>Suporte técnico:</span>
          <a href="mailto:suporte@atlasfit.app" className="text-muted-foreground hover:text-foreground transition-colors lowercase font-semibold ml-0.5">
            suporte@atlasfit.app
          </a>
        </div>
        <p className="text-[10px] font-semibold tracking-wider uppercase">
          &copy; {new Date().getFullYear()} AtlasFit Platform. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
