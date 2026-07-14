"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle2,
  Zap,
  CreditCard,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  Infinity as InfinityIcon,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  date: string;
  amount: number;
  status: string;
  paymentMethod: string;
  description: string;
}

interface SubscriptionDetails {
  id: string;
  planName: string;
  planPrice: number;
  status: string;
  nextBillingDate: string;
  daysRemaining: number;
  paymentMethod: string;
  billingCycle: string;
  invoices: Invoice[];
  isPreSubscription: boolean;
  isTestAccount?: boolean;
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
    storage: {
      current: number;
      limit: number;
      unit: string;
    };
  };
}

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
  currentSubscription: SubscriptionDetails | null;
  platformPlans: PlatformPlan[];
}

export default function SubscriptionPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  const loadSubscriptionData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/personal/subscription");
      if (!response.ok) {
        throw new Error("Não foi possível carregar os dados de assinatura.");
      }
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      console.error("Error loading subscriptions:", err);
      setError(err.message || "Erro desconhecido ao carregar assinatura.");
      toast.error("Erro ao carregar dados de cobrança.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptionData();
  }, [loadSubscriptionData]);

  const handlePlanAction = async (planId: string, planName: string, isCurrent: boolean) => {
    if (isCurrent) return;

    setIsProcessing(planId);

    try {
      const response = await fetch("/api/personal/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Falha ao alterar plano.");
      }

      const result = await response.json();
      
      if (result.checkoutUrl) {
        toast.success("Link de pagamento gerado! Redirecionando de forma segura...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        window.location.href = result.checkoutUrl;
      } else {
        toast.success(`Plano alterado para ${planName} com sucesso!`);
        await loadSubscriptionData();
      }
    } catch (err: any) {
      console.error("Error upgrading plan:", err);
      toast.error(err.message || "Não foi possível processar a alteração do plano.");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    const toastId = toast.loading("Processando cancelamento de assinatura...");

    try {
      const response = await fetch("/api/personal/subscription", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Falha ao solicitar cancelamento.");
      }

      toast.success("Assinatura cancelada com sucesso!", { id: toastId });
      setIsCancelDialogOpen(false);
      await loadSubscriptionData();
    } catch (err: any) {
      console.error("Error canceling subscription:", err);
      toast.error(err.message || "Não foi possível processar o cancelamento.", { id: toastId });
    } finally {
      setIsCanceling(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full max-w-5xl mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 bg-muted/40" />
          <Skeleton className="h-4 w-72 bg-muted/40" />
        </div>

        <div className="grid md:grid-cols-3 gap-6 animate-pulse">
          <Skeleton className="h-48 md:col-span-2 bg-muted/20 rounded-2xl" />
          <Skeleton className="h-48 bg-muted/20 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { currentSubscription: subscription, platformPlans } = data;

  if (!subscription) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full max-w-5xl mx-auto animate-in fade-in duration-300">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold tracking-tight">Assinatura</h2>
          <p className="text-muted-foreground text-sm">Escolha um plano profissional para liberar o seu acesso.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 pt-4">
          {platformPlans.map((plan) => {
            const isPlanProcessing = isProcessing === plan.id;
            return (
              <Card key={plan.id} className={cn("border border-border/60 bg-card rounded-2xl flex flex-col justify-between p-6", plan.highlight && "ring-1 ring-primary border-primary/40 shadow-sm")}>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <p className="text-muted-foreground text-xs mt-1">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-xs">{plan.interval}</span>
                  </div>
                  <ul className="space-y-2.5 pt-2 border-t border-border/40">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground/80">
                        <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handlePlanAction(plan.id, plan.name, plan.isCurrent)}
                  className="w-full mt-6 rounded-xl font-bold text-xs"
                  disabled={isProcessing !== null}
                >
                  {isPlanProcessing ? (
                    <>
                      <Loader2 className="mr-2 size-3 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Assinar Plano"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  const usagePercentage = Math.round((subscription.usage.students.current / subscription.usage.students.limit) * 100);
  const isNearLimit = usagePercentage >= 80;

  const formattedDate = subscription.isTestAccount
    ? "Não vence"
    : (subscription.nextBillingDate
      ? (subscription.nextBillingDate.includes("-") 
         ? subscription.nextBillingDate.split("-").reverse().join("/") 
         : subscription.nextBillingDate)
      : "");

  const isSubActive = subscription.status === "active";
  const isSubTrial = subscription.status === "trial";
  const isSubCanceled = subscription.status === "canceled";

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-foreground">Configurações de Assinatura</h2>
        <p className="text-muted-foreground text-xs">Visualize e gerencie seu plano ativo, consumo de recursos e histórico de faturas.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Subscription Details Card (Minimalist) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="border border-border/50 bg-card/45 backdrop-blur-md rounded-2xl overflow-hidden shadow-xs relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Plano Atual</span>
                  <CardTitle className="text-xl font-bold flex items-center gap-2">
                    {isSubTrial ? "Período de Testes" : subscription.planName}
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-[9px] font-bold px-2 py-0 uppercase tracking-wide",
                        isSubActive 
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20" 
                          : isSubTrial || isSubCanceled
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/20"
                          : "bg-red-500/15 text-red-500 border-red-500/20"
                      )}
                    >
                      {isSubActive ? "Ativo" : isSubTrial ? "Teste Grátis" : isSubCanceled ? "Cancelado" : "Atrasado"}
                    </Badge>
                  </CardTitle>
                </div>
                {!isSubTrial && (
                  <div className="text-right">
                    <span className="text-xl font-extrabold tracking-tight">R$ {subscription.planPrice}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold block">/{subscription.billingCycle === "Mensal" ? "mês" : "ano"}</span>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-0.5">
                  <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Método de Faturamento</span>
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <CreditCard className="size-3.5 text-primary shrink-0" />
                    {subscription.paymentMethod || "Pix Automático"}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Renovação / Vencimento</span>
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-primary shrink-0" />
                    {formattedDate}
                  </p>
                </div>
              </div>

              {/* Warning/Notifications Banner */}
              {isSubCanceled && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-normal font-medium">
                    <strong>Assinatura Cancelada:</strong> Seu acesso continua ativo até o dia <strong>{formattedDate}</strong> (término do período já pago). Após essa data, nenhuma cobrança adicional será realizada no AbacatePay e o acesso ao sistema será interrompido.
                  </p>
                </div>
              )}

              {subscription.isPreSubscription && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex gap-2">
                  <Zap className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 leading-normal font-medium">
                    <strong>Pré-Assinatura Garantida:</strong> Seu pagamento foi confirmado! Os dias contratados começarão a contar apenas após o encerramento automático do período de testes.
                  </p>
                </div>
              )}

              {/* Cancellation Area inside Configuration */}
              {!isSubCanceled && !subscription.isTestAccount && (
                <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground">Cancelar Renovação Automática</h4>
                    <p className="text-muted-foreground text-[10px] leading-normal max-w-sm">
                      Cancele suas cobranças recorrentes no AbacatePay. Seu acesso continua normalizado até a data de vencimento.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setIsCancelDialogOpen(true)}
                    className="hover:bg-red-500/10 hover:text-red-500 text-muted-foreground text-xs font-bold shrink-0 self-start sm:self-center"
                  >
                    <XCircle className="size-3.5 mr-1.5" />
                    Cancelar Assinatura
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Usage Limits & Status */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border border-border/50 bg-card/45 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between h-full min-h-[220px]">
            <div className="space-y-4">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estatísticas de Uso</span>
              
              <div className="space-y-3.5 text-xs pt-1">
                {/* Students */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-muted-foreground">Alunos Cadastrados</span>
                    <span className="text-foreground">
                      {subscription.usage.students.current} <span className="text-muted-foreground font-normal">/ {subscription.usage.students.limit >= 999999 ? "Ilimitado" : subscription.usage.students.limit}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", isNearLimit ? "bg-red-500" : "bg-primary")}
                      style={{ width: `${Math.min(subscription.usage.students.limit >= 999999 ? 5 : usagePercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Storage */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-muted-foreground">Armazenamento em Nuvem</span>
                    <span className="text-foreground">
                      {subscription.usage.storage.current} <span className="text-muted-foreground font-normal">/ {subscription.usage.storage.limit} {subscription.usage.storage.unit}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(subscription.usage.storage.current / subscription.usage.storage.limit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border/40 pt-4 flex items-center justify-between text-[11px] font-bold text-muted-foreground mt-4">
              <span>Status do Painel:</span>
              <span className={cn("flex items-center gap-1.5", (isSubActive || isSubTrial || (isSubCanceled && subscription.daysRemaining > 0)) ? "text-emerald-500" : "text-red-500")}>
                <span className={cn("size-1.5 rounded-full", (isSubActive || isSubTrial || (isSubCanceled && subscription.daysRemaining > 0)) ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
                {(isSubActive || isSubTrial || (isSubCanceled && subscription.daysRemaining > 0)) ? "Ativo" : "Bloqueado"}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Plans catalog if they want to upgrade or are cancelled */}
      <section className="space-y-4 pt-4">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">Alterar ou Reativar Plano</h3>
          <p className="text-muted-foreground text-xs">Precisa de mais limites ou deseja assinar novamente? Escolha um de nossos planos recomendados.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {platformPlans.map((plan) => {
            const isPlanProcessing = isProcessing === plan.id;
            const isAnyProcessing = isProcessing !== null;

            return (
              <Card key={plan.id} className={cn("border border-border/60 bg-card rounded-2xl flex flex-col justify-between p-6 transition-all", plan.isCurrent && "ring-1 ring-primary border-primary/45")}>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                      {plan.name}
                      {plan.isCurrent && <Badge className="text-[8px] bg-primary text-black font-extrabold px-1.5 py-0">Atual</Badge>}
                    </h4>
                    <p className="text-muted-foreground text-[10px] mt-0.5">{plan.description}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-muted-foreground text-[10px]">{plan.interval}</span>
                  </div>
                  <ul className="space-y-2 pt-2 border-t border-border/40">
                    {plan.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[10px] text-foreground/80">
                        <CheckCircle2 className="size-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={() => handlePlanAction(plan.id, plan.name, plan.isCurrent)}
                  variant={plan.isCurrent ? "outline" : "default"}
                  className="w-full mt-5 rounded-xl font-bold text-xs"
                  disabled={plan.isCurrent || isAnyProcessing || isSubCanceled}
                >
                  {isPlanProcessing ? (
                    <>
                      <Loader2 className="mr-2 size-3 animate-spin" />
                      Alterando...
                    </>
                  ) : plan.isCurrent ? (
                    "Plano Atual"
                  ) : (
                    "Escolher Plano"
                  )}
                </Button>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Invoice History List */}
      {subscription.invoices && subscription.invoices.length > 0 && (
        <section className="space-y-3 pt-4">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-foreground">Histórico de Cobranças</h3>
            <p className="text-muted-foreground text-xs">Verifique e audite seus faturamentos e comprovantes emitidos pelo AbacatePay.</p>
          </div>
          <Card className="border border-border/50 bg-card/30 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/15 text-muted-foreground font-bold uppercase tracking-wider select-none text-[9px]">
                    <th className="p-3.5">Data</th>
                    <th className="p-3.5">Descrição</th>
                    <th className="p-3.5">Método</th>
                    <th className="p-3.5">Valor</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscription.invoices.map((invoice: any) => (
                    <tr key={invoice.id} className="border-b border-border/40 hover:bg-muted/5 transition-colors font-medium">
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        {invoice.date.split("-").reverse().join("/")}
                      </td>
                      <td className="p-3.5 text-foreground font-semibold">
                        {invoice.description}
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        {invoice.paymentMethod || "PIX"}
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-foreground font-semibold">
                        R$ {invoice.amount.toFixed(2)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-right">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[8px] font-bold px-1.5 py-0 uppercase shrink-0",
                            invoice.status === "APPROVED" 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}
                        >
                          {invoice.status === "APPROVED" ? "Pago" : "Pendente"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      )}

      {/* Cancellation Confirmation Alert Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">Tem certeza que deseja cancelar?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              Esta ação cancelará a renovação automática da sua assinatura no AbacatePay. 
              <br />
              <br />
              Seu acesso continuará **totalmente liberado até o dia {formattedDate}** (término do período já pago). Após esta data, nenhuma nova cobrança será realizada e seu acesso será interrompido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isCanceling} className="rounded-xl text-xs font-bold">
              Manter Assinatura
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Confirmar Cancelamento"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
