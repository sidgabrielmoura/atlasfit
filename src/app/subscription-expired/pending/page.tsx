"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { CheckCircle2, AlertTriangle, ArrowRight, Loader2, Sparkles, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

import { Suspense } from "react";

function PaymentPendingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams.get("transactionId");

  const [status, setStatus] = useState<"PENDING" | "APPROVED" | "FAILED" | "UNKNOWN">("PENDING");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!transactionId) {
      setStatus("UNKNOWN");
      return;
    }

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/personal/subscription/status?transactionId=${transactionId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();

        if (data.status === "APPROVED") {
          setStatus("APPROVED");
          toast.success("Pagamento confirmado com sucesso! 🎉");
        } else if (data.status === "FAILED") {
          setStatus("FAILED");
          toast.error("O pagamento foi cancelado ou falhou.");
        }
      } catch (err) {
        console.error("Erro ao verificar status do pagamento:", err);
      }
    };

    // Poll status every 3 seconds if pending
    let intervalId: NodeJS.Timeout;
    if (status === "PENDING") {
      intervalId = setInterval(() => {
        setAttempts((prev) => prev + 1);
        checkStatus();
      }, 3000);

      // Call immediately on mount
      checkStatus();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [transactionId, status]);

  const handleReturnToDashboard = () => {
    toast.success("Bem-vindo de volta! Redirecionando...");
    router.push("/personal/dashboard");
  };

  const handleBackToBilling = () => {
    router.push("/subscription-expired");
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[140px]" />
      </div>

      <div className="w-full max-w-md px-4 z-10">
        <AnimatePresence mode="wait">
          {status === "PENDING" && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Card className="border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md rounded-3xl p-8 text-center space-y-6">
                <CardContent className="p-0 flex flex-col items-center space-y-6">
                  {/* Pulsing Loading Ring */}
                  <div className="relative flex items-center justify-center size-20">
                    <span className="size-20 bg-primary/10 border border-primary/20 rounded-full animate-ping absolute" />
                    <div className="size-16 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center text-primary shadow-xl">
                      <Loader2 className="size-8 animate-spin" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-white">Aguardando Pagamento</h2>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Processando PIX Automático</p>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                    Estamos aguardando a confirmação do pagamento pelo gateway do <strong className="text-white">AbacatePay</strong>. A liberação do seu acesso ocorre instantaneamente assim que o Pix for aprovado.
                  </p>

                  <div className="w-full bg-neutral-950/40 p-4 rounded-2xl border border-neutral-800/40 text-left space-y-2.5 text-xs text-neutral-400 font-medium">
                    <div className="flex justify-between">
                      <span>Status da Transação</span>
                      <span className="text-amber-500 font-bold flex items-center gap-1.5">
                        <span className="size-1.5 bg-amber-500 rounded-full animate-pulse" />
                        Pendente
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tentativas de validação</span>
                      <span className="text-white font-bold">{attempts}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "APPROVED" && (
            <motion.div
              key="approved"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Card className="border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md rounded-3xl p-8 text-center space-y-6">
                <CardContent className="p-0 flex flex-col items-center space-y-6">
                  {/* Glowing Success Ring */}
                  <div className="relative flex items-center justify-center size-20">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="size-16 bg-emerald-500 text-black rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20">
                      <CheckCircle2 className="size-9 fill-current text-white" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-white">Pagamento Confirmado!</h2>
                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center justify-center gap-1.5">
                      Acesso Liberado
                    </p>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                    O AbacatePay processou com sucesso o Pix da sua assinatura. Sua conta AtlasFit foi reativada imediatamente com todos os seus painéis de personal trainer liberados!
                  </p>

                  <Button
                    onClick={handleReturnToDashboard}
                    className="w-full h-12 rounded-xl text-xs font-bold gap-2 bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/10 transition-all duration-300"
                  >
                    <span>Entrar na Minha Conta</span>
                    <ArrowRight className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "FAILED" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Card className="border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md rounded-3xl p-8 text-center space-y-6">
                <CardContent className="p-0 flex flex-col items-center space-y-6">
                  {/* Alert Icon */}
                  <div className="relative flex items-center justify-center size-20">
                    <div className="size-16 bg-destructive/10 text-destructive border border-destructive/20 rounded-full flex items-center justify-center shadow-xl">
                      <AlertTriangle className="size-8" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-white">Falha no Pagamento</h2>
                    <p className="text-[10px] text-destructive font-black uppercase tracking-widest">Cobrança Não Aprovada</p>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                    Ocorreu um problema ao validar a transação Pix ou o tempo limite expirou. Se o valor já foi debitado de sua conta, fale com nosso suporte técnico.
                  </p>

                  <div className="flex flex-col gap-2 w-full">
                    <Button
                      onClick={handleBackToBilling}
                      className="w-full h-12 rounded-xl text-xs font-bold bg-neutral-850 hover:bg-neutral-800 text-white border border-neutral-800 transition-colors"
                    >
                      Escolher Outro Plano
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {status === "UNKNOWN" && (
            <motion.div
              key="unknown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Card className="border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md rounded-3xl p-8 text-center space-y-6">
                <CardContent className="p-0 flex flex-col items-center space-y-6">
                  <div className="size-16 bg-neutral-800 border border-neutral-700 rounded-full flex items-center justify-center text-muted-foreground">
                    <CreditCard className="size-8" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black tracking-tight text-white">Transação Inválida</h2>
                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Erro de Parâmetro</p>
                  </div>

                  <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                    Não localizamos nenhuma identificação de transação válida na URL. Por favor, retorne à tela de faturamento e selecione novamente o plano.
                  </p>

                  <Button
                    onClick={handleBackToBilling}
                    className="w-full h-12 rounded-xl text-xs font-bold bg-primary text-black hover:bg-primary/90 transition-colors"
                  >
                    Ir Para Assinaturas
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function PaymentPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentPendingContent />
    </Suspense>
  );
}
