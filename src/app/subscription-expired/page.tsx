"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { signOut, useSession } from "next-auth/react";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Flame, CheckCircle2, ShieldAlert, LogOut, Loader2, Zap, Sparkles,
  Users, Dumbbell, DollarSign, FolderLock, GlobeLock, Clock, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformPlan {
  id: string;
  name: string;
  price: string;
  interval: string;
  description: string;
  features: string[];
  highlight: boolean;
  buttonText: string;
  disabled: boolean;
  isCurrent: boolean;
}

interface ApiResponse {
  currentSubscription: {
    status: string;
    freeTrial?: {
      startDate: string;
      endDate: string;
      isActive: boolean;
      daysRemaining: number;
    } | null;
    usage: {
      students: {
        current: number;
        limit: number;
      };
    };
  };
  platformPlans: PlatformPlan[];
}

export default function SubscriptionExpiredPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const loadPlansData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/personal/subscription");
      if (!res.ok) {
        throw new Error("Não foi possível carregar os dados de assinatura.");
      }
      const result = await res.json();

      const freeTrial = result.currentSubscription?.freeTrial;
      const isTrialActive = freeTrial ? new Date() <= new Date(freeTrial.endDate) : false;
      const isSubscriptionActive = result.currentSubscription?.status?.toLowerCase() === "active";

      if (isTrialActive || isSubscriptionActive) {
        router.push("/personal/dashboard");
        return;
      }

      setData(result);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar os planos disponíveis.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      loadPlansData();
    } else if (sessionStatus === "unauthenticated") {
      router.push("/auth/trainer");
    }
  }, [sessionStatus, loadPlansData, router]);

  const handleSubscribe = async (planId: string, planName: string) => {
    setIsProcessing(planId);
    const toastId = toast.loading(`Iniciando contratação do plano ${planName}...`);

    try {
      const response = await fetch("/api/personal/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Erro ao processar assinatura.");
      }

      const res = await response.json();

      toast.success("Checkout gerado com sucesso! Redirecionando...", { id: toastId });

      if (res.checkoutUrl) {
        router.push(res.checkoutUrl);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Não foi possível iniciar o pagamento.", { id: toastId });
      setIsProcessing(null);
    }
  };

  const handleLogout = async () => {
    const toastId = toast.loading("Saindo da conta...");
    await signOut({ callbackUrl: "/auth/trainer" });
    toast.success("Sessão encerrada.", { id: toastId });
  };

  if (sessionStatus === "loading" || isLoading) {
    return <SubscriptionExpiredSkeleton />;
  }

  const activeStudents = data?.currentSubscription?.usage?.students?.current ?? 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 md:p-8 lg:p-12 relative overflow-hidden select-none">
      {/* Background Radial Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] bg-red-900/10 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-5xl z-10 space-y-8">

        {/* Top Warning Banner / Header */}
        <div className="text-center space-y-3 max-w-2xl mx-auto mb-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex size-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-xl mb-1"
          >
            <ShieldAlert className="size-7" />
          </motion.div>

          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
              Sua Assessoria está Bloqueada
            </h1>
            <p className="text-xs md:text-sm font-black uppercase tracking-widest text-red-500 flex items-center justify-center gap-1.5">
              Ação Necessária para Reativar seu Acesso
            </p>
          </div>

          <p className="text-sm text-neutral-400 leading-relaxed font-medium">
            Olá, <strong className="text-white">{session?.user?.name || "Treinador"}</strong>. Seu período de avaliação (Free Trial) ou mensalidade regular chegou ao fim. Para reaver o acesso à sua conta e voltar a gerenciar seus alunos, selecione um plano profissional.
          </p>
        </div>

        {/* Main Columns Grid: Left (Loss Aversion) | Right (Plans) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">

          {/* Left Column: Loss Aversion (5 cols) */}
          <div className="lg:col-span-5 flex">
            <Card className="flex flex-col justify-between w-full border border-red-500/10 bg-neutral-900/40 backdrop-blur-md rounded-3xl p-6 md:p-8 space-y-6">
              <div className="space-y-5">
                <div className="space-y-1">
                  <h3 className="text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                    <AlertTriangle className="size-5 text-red-500 shrink-0" />
                    O que você está perdendo:
                  </h3>
                  <p className="text-xs text-neutral-400 font-medium">
                    Seu acesso foi restringido e estes recursos foram pausados:
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Active Students Warning */}
                  <div className="flex items-start gap-3 bg-red-950/20 border border-red-500/15 p-3.5 rounded-2xl">
                    <Users className="size-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-white">
                        {activeStudents > 0 ? `${activeStudents} Alunos Ativos Sem Acesso` : "Seus Alunos Sem Acompanhamento"}
                      </p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                        {activeStudents > 0
                          ? `Seus ${activeStudents} alunos cadastrados não conseguem ver suas fichas de treinos, registrar cargas ou enviar feedbacks.`
                          : "Seus alunos cadastrados não conseguem acessar as rotinas de treino nem registrar progresso."
                        }
                      </p>
                    </div>
                  </div>

                  {/* Workout Library Warning */}
                  <div className="flex items-start gap-3 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-800/60">
                    <Dumbbell className="size-5 text-neutral-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-white">Biblioteca de Treinos Bloqueada</p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                        Sua biblioteca de exercícios customizados, fichas de treino prescritas e templates de periodização estão congelados.
                      </p>
                    </div>
                  </div>

                  {/* Finance Stopped Warning */}
                  <div className="flex items-start gap-3 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-800/60">
                    <DollarSign className="size-5 text-neutral-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-white">Faturamento Manual e Gráficos Pausados</p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                        O monitoramento financeiro de mensalidades dos alunos, gráficos de MRR e projeções de receita estão inacessíveis.
                      </p>
                    </div>
                  </div>

                  {/* FolderLock Warning */}
                  <div className="flex items-start gap-3 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-800/60">
                    <FolderLock className="size-5 text-neutral-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-white">Arquivos e Documentos Ocultos</p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                        Dietas, laudos, PDFs de periodização e exames compartilhados entre você e seus alunos foram ocultados do portal.
                      </p>
                    </div>
                  </div>

                  {/* Capture Link Warning */}
                  <div className="flex items-start gap-3 bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-800/60">
                    <GlobeLock className="size-5 text-neutral-500 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-white">Link de Captação Desativado</p>
                      <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                        Sua página pública e QR Code exclusivos para captar novos alunos na internet foram temporariamente desativados.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Retention warning */}
              <div className="bg-neutral-950/40 p-4 border border-neutral-800/50 rounded-2xl flex items-start gap-2.5">
                <Clock className="size-4.5 text-neutral-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Políticas de Retenção de Dados</p>
                  <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">
                    Suas informações e o histórico de treinos dos seus alunos ficarão salvos com segurança em nossos servidores por até 30 dias. Após este prazo, os registros serão excluídos permanentemente sob a conformidade da LGPD.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Plans list (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {data?.platformPlans.map((plan) => {
              const isPlanLoading = isProcessing === plan.id;
              const anyPlanLoading = isProcessing !== null;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative overflow-hidden border border-neutral-800/60 bg-neutral-900/40 backdrop-blur-md rounded-3xl transition-all duration-300 flex flex-col md:flex-row md:items-stretch",
                    plan.highlight ? "ring-2 ring-primary bg-neutral-900/60 shadow-2xl shadow-primary/5" : "hover:border-neutral-700/60"
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute top-0 right-0 bg-primary text-black font-extrabold text-[9px] uppercase px-3.5 py-1 rounded-bl-xl tracking-wider flex items-center gap-1 shadow-md">
                      Melhor Escolha
                    </div>
                  )}

                  {/* Plan Main Details */}
                  <div className="p-6 md:p-8 flex flex-col justify-between flex-1 space-y-4">
                    <div className="space-y-1.5">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        {plan.name}
                        {plan.highlight && <Zap className="size-4 text-primary fill-primary" />}
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed font-medium max-w-[320px]">
                        {plan.description}
                      </p>
                    </div>

                    <div className="flex items-baseline gap-1 pt-2">
                      <span className="text-3xl font-black tracking-tight text-white">{plan.price}</span>
                      <span className="text-xs text-neutral-500 font-semibold">{plan.interval}</span>
                    </div>

                    <Button
                      onClick={() => handleSubscribe(plan.id, plan.name)}
                      disabled={anyPlanLoading}
                      className={cn(
                        "w-full h-12 rounded-xl text-xs font-bold gap-2 relative transition-all duration-300",
                        plan.highlight
                          ? "bg-primary text-black hover:bg-primary/90 shadow-md shadow-primary/10"
                          : "bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700/50"
                      )}
                    >
                      {isPlanLoading ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="size-4 fill-current" />
                          <span>Reativar com {plan.name}</span>
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Features vertical block on desktop */}
                  <div className="p-6 md:p-8 bg-neutral-950/40 border-t md:border-t-0 md:border-l border-neutral-800/60 md:w-56 flex flex-col justify-center">
                    <ul className="space-y-3 text-xs text-neutral-300 font-medium">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-primary shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between text-xs pt-4 border-t border-neutral-850">
          <p className="text-neutral-500 font-medium">AtlasFit © {new Date().getFullYear()}</p>
          <Button
            onClick={handleLogout}
            variant="ghost"
            disabled={isProcessing !== null}
            className="text-neutral-500 hover:text-white flex items-center gap-2 cursor-pointer transition-colors"
          >
            <LogOut className="size-4" />
            <span>Sair da Minha Conta</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionExpiredSkeleton() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="w-full max-w-5xl px-4 py-8 z-10 space-y-8 animate-pulse">
        <div className="text-center space-y-4 max-w-xl mx-auto flex flex-col items-center">
          <Skeleton className="size-14 rounded-2xl bg-neutral-900 border border-neutral-800" />
          <Skeleton className="h-8 w-64 bg-neutral-900 rounded-lg" />
          <Skeleton className="h-4 w-48 bg-neutral-900 rounded" />
          <Skeleton className="h-14 w-full bg-neutral-900 rounded-lg mt-2" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch pt-2">
          <div className="lg:col-span-5">
            <Skeleton className="h-[480px] w-full bg-neutral-900/40 border border-neutral-800 rounded-3xl" />
          </div>
          <div className="lg:col-span-7 flex flex-col gap-6">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full bg-neutral-900/40 border border-neutral-800 rounded-3xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
