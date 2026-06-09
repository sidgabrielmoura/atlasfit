"use client";

import { useSession, signIn } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldAlert, LogOut, Loader2 } from "lucide-react";

export function ImpersonationBanner() {
  const { data: session } = useSession();
  const [isReturning, setIsReturning] = useState(false);

  const isImpersonated = (session?.user as any)?.isImpersonated;
  const targetUserName = session?.user?.name || session?.user?.email || "Usuário";

  useEffect(() => {
    if (isImpersonated) {
      document.body.classList.add("has-impersonation-banner");
    } else {
      document.body.classList.remove("has-impersonation-banner");
    }
    return () => {
      document.body.classList.remove("has-impersonation-banner");
    };
  }, [isImpersonated]);

  const handleReturnToAdmin = async () => {
    setIsReturning(true);
    const toastId = toast.loading("Encerrando sessão de suporte...");
    try {
      const res = await fetch("/api/superadmin/unimpersonate", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erro ao encerrar impersonation");
      const { token } = await res.json();

      toast.loading("Restabelecendo login de administrador...", { id: toastId });

      const result = await signIn("credentials", {
        impersonateToken: token,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Retornado ao painel com sucesso!", { id: toastId });
      window.location.href = "/superadmin/workspaces";
    } catch (error) {
      console.error(error);
      toast.error("Erro ao retornar para a conta do superadmin.", { id: toastId });
      setIsReturning(false);
    }
  };

  if (!isImpersonated) return null;

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-9 z-150 w-full bg-amber-500 text-black px-4 py-1 flex items-center justify-between shadow-md border-b border-amber-600/30 animate-in slide-in-from-top duration-300 font-sans">
        <div className="flex items-center gap-2 max-w-[70%] sm:max-w-none">
          <p className="text-xs font-black tracking-tight leading-none">
            Modo Suporte: <span className="underline decoration-black/40 decoration-2">{targetUserName}</span>
          </p>
          <span className="hidden md:inline-block text-[10px] bg-black/10 text-black font-extrabold px-1.5 py-0.5 rounded-sm uppercase tracking-wider ml-1">
            Impersonated
          </span>
        </div>
        <Button
          size="sm"
          onClick={handleReturnToAdmin}
          disabled={isReturning}
          className="h-7 px-3 bg-black hover:bg-black/90 text-white rounded-md text-[10px] font-black tracking-wider uppercase flex items-center gap-1 cursor-pointer transition-all duration-300"
        >
          {isReturning ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <LogOut className="size-3" />
          )}
          <span>Voltar ao Admin</span>
        </Button>
      </div>

      {isReturning && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6 py-8 rounded-2xl border border-border/50 bg-card shadow-2xl">
            <div className="size-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 animate-bounce">
              <ShieldAlert className="size-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight">Finalizando Suporte</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Retornando ao Superadmin...
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1 font-medium">
                Desconectando da conta de suporte e restabelecendo sua sessão com privilégios administrativos.
              </p>
            </div>
            <Loader2 className="size-6 text-primary animate-spin mt-2" />
          </div>
        </div>
      )}
    </>
  );
}
