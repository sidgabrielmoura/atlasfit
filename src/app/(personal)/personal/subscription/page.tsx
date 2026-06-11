"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Zap, CreditCard, AlertCircle, Loader2, Calendar, Clock } from "lucide-react";
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
  currentSubscription: SubscriptionDetails;
  platformPlans: PlatformPlan[];
}

export default function SubscriptionPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

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
        body: JSON.stringify({
          planId,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Falha ao alterar plano.");
      }

      const result = await response.json();
      
      if (result.checkoutUrl) {
        toast.success("Link de pagamento gerado! Redirecionando de forma segura...");
        // Pequena pausa para garantir a leitura do toast
        await new Promise((resolve) => setTimeout(resolve, 1200));
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

  if (isLoading || !data) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-48 bg-muted/60" />
            <Skeleton className="h-5 w-80 bg-muted/60" />
          </div>
        </div>

        <div className="flex flex-col space-y-10 animate-pulse">
          <div>
            <Card className="border-border/50 bg-card overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-3">
                    <Skeleton className="h-7 w-64 max-w-full bg-muted/60" />
                    <Skeleton className="h-5 w-full max-w-md bg-muted/60" />
                  </div>
                  <Skeleton className="hidden md:block h-12 w-12 rounded-full bg-muted/60" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8 p-6 bg-secondary/20 rounded-xl border border-border/50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-24 bg-muted/60" />
                      <Skeleton className="h-4 w-12 bg-muted/60" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full bg-muted/60" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-4 w-36 bg-muted/60" />
                      <Skeleton className="h-4 w-12 bg-muted/60" />
                    </div>
                    <Skeleton className="h-3 w-full rounded-full bg-muted/60" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="text-center space-y-2 pt-8 flex flex-col items-center">
              <Skeleton className="h-8 w-64 max-w-full bg-muted/60" />
              <Skeleton className="h-5 w-full max-w-md bg-muted/60" />
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start pt-8 pb-12">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/50 bg-card/50 flex flex-col h-[400px]">
                  <CardHeader className="text-center pb-8 pt-8 space-y-3">
                    <Skeleton className="h-6 w-24 mx-auto bg-muted/60" />
                    <Skeleton className="h-10 w-32 mx-auto bg-muted/60" />
                    <Skeleton className="h-4 w-48 mx-auto bg-muted/60" />
                  </CardHeader>
                  <CardContent className="flex-1 space-y-4">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="flex items-center gap-3">
                        <Skeleton className="h-5 w-5 rounded-full bg-muted/60" />
                        <Skeleton className="h-4 w-full bg-muted/60" />
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter className="pt-6">
                    <Skeleton className="h-10 w-full bg-muted/60" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { currentSubscription: subscription, platformPlans } = data;

  const usagePercentage = Math.round((subscription.usage.students.current / subscription.usage.students.limit) * 100);
  const isNearLimit = usagePercentage >= 80;

  const formattedDate = subscription.nextBillingDate
    ? subscription.nextBillingDate.split("-").reverse().join("/")
    : "";

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assinatura</h2>
          <p className="text-muted-foreground mt-1">Gerencie seu plano, limites de uso e cobranças.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col space-y-10"
      >
        {/* Active Subscription Details (Spotify style) */}
        <section className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                 {/* Box 1: Left - Subscription Information Control Panel */}
            <Card className="lg:col-span-7 border-border bg-card overflow-hidden shadow-none rounded-2xl relative">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Plano Contratado</span>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      {subscription.status === "trial" ? "Período de Teste" : subscription.planName}
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "ml-2 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide",
                          subscription.status === "active" 
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                            : subscription.status === "trial"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse"
                        )}
                      >
                        {subscription.status === "active" ? "Ativo" : subscription.status === "trial" ? "Free Trial" : "Atrasado / Vencido"}
                      </Badge>
                    </CardTitle>
                  </div>
                  {subscription.status !== "trial" && (
                    <div className="flex items-center gap-1.5 px-3 py-2 bg-secondary/50 rounded-xl border border-border/50 shrink-0">
                      <span className="text-xl font-extrabold tracking-tight">R$ {subscription.planPrice}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">{subscription.billingCycle === "Mensal" ? "/ mês" : "/ ano"}</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-6 space-y-6">
                {/* Meta details list */}
                <div className="grid grid-cols-2 gap-4">
                  {subscription.status === "trial" ? (
                    <>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Início do Teste</span>
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-amber-500" />
                          {subscription.freeTrial?.startDate.split("-").reverse().join("/") || ""}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Fim do Teste</span>
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-amber-500" />
                          {subscription.freeTrial?.endDate.split("-").reverse().join("/") || ""}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Workspace Limite</span>
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-amber-500" />
                          Máx 1 Workspace
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tipo de Conta</span>
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Zap className="size-3.5 text-amber-500" />
                          Demonstração Gratuita
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Método de Cobrança</span>
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <CreditCard className="size-3.5 text-primary" />
                          {subscription.paymentMethod || "Pix Automático"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ciclo de Faturamento</span>
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Clock className="size-3.5 text-primary" />
                          {subscription.billingCycle || "Mensal"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Próximo Vencimento</span>
                        <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-primary" />
                          {formattedDate}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Identificação da Assinatura</span>
                        <p className="text-xs font-semibold text-foreground font-mono truncate">
                          {subscription.id?.substring(0, 16)}...
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {subscription.isPreSubscription && (
                  <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                    <div className="flex gap-2">
                      <Zap className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-emerald-600 leading-relaxed font-medium">
                        <strong>Pré-Assinatura Ativa:</strong> Você já garantiu seu acesso premium! O pagamento foi compensado, mas os dias de faturamento só começarão a ser cobrados após o término do seu período de free trial.
                      </p>
                    </div>
                  </div>
                )}

                {/* Critical error banner if payment failed */}
                {(subscription.status === "past_due" || subscription.status === "unpaid") && (
                  <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/20 space-y-3">
                    <div className="flex gap-2">
                      <AlertCircle className="size-4 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive leading-relaxed font-medium">
                        <strong>Erro na renovação automática:</strong> O AbacatePay não conseguiu efetuar a cobrança da mensalidade deste mês. Por favor, regularize o pagamento efetuando uma nova assinatura para reativar as permissões de acesso ao sistema.
                      </p>
                    </div>
                  </div>
                )}

                {/* Usage limits inside details */}
                <div className="space-y-4 pt-4 border-t border-border/50">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Estatísticas de Consumo</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Active Students Limit Progress bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">Alunos Cadastrados</span>
                        <span className="font-bold">
                          {subscription.usage.students.current}{" "}
                          <span className="text-muted-foreground font-normal">
                            / {subscription.usage.students.limit >= 999999 ? "Ilimitado" : subscription.usage.students.limit}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isNearLimit ? "bg-red-500" : "bg-primary"
                          )}
                          style={{
                            width: `${Math.min(
                              subscription.usage.students.limit >= 999999
                                ? 5
                                : usagePercentage,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Storage usage Progress bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">Armazenamento</span>
                        <span className="font-bold">
                          {subscription.usage.storage.current}{" "}
                          <span className="text-muted-foreground font-normal">
                            / {subscription.usage.storage.limit} {subscription.usage.storage.unit}
                          </span>
                        </span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{
                            width: `${(subscription.usage.storage.current / subscription.usage.storage.limit) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Box 2: Right - Premium Days Remaining Status Card */}
            <Card className="lg:col-span-5 border-border bg-card overflow-hidden shadow-none rounded-2xl min-h-[340px] flex flex-col justify-between p-6">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {subscription.status === "trial" ? "Teste Gratuito Restante" : "Tempo Restante de Acesso"}
                </span>
                <h3 className="text-lg font-bold">Resumo da Adimplência</h3>
              </div>

              {/* Central Days Display */}
              <div className="py-6 flex flex-col items-center justify-center text-center space-y-2">
                {subscription.daysRemaining > 0 && (subscription.status === "active" || subscription.status === "trial") ? (
                  <>
                    <div className="inline-flex items-baseline justify-center">
                      <span className={cn(
                        "text-6xl font-black tracking-tighter",
                        subscription.status === "trial" ? "text-amber-500" : "text-primary"
                      )}>
                        {subscription.daysRemaining}
                      </span>
                      <span className="text-sm font-bold text-muted-foreground ml-1">dias</span>
                    </div>
                    <p className="text-xs text-muted-foreground max-w-[200px] font-medium leading-normal">
                      {subscription.status === "trial" 
                        ? "restantes do período de teste gratuito do seu painel."
                        : "restantes de uso total autorizado do portal de personal trainer."}
                    </p>
                    {subscription.status === "trial" && (
                      <p className="text-[10px] text-amber-600 font-semibold max-w-[220px] bg-amber-500/5 px-2 py-1 rounded-md border border-amber-500/10">
                        Faça a pré-assinatura hoje para garantir acesso contínuo.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="size-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-2">
                      <AlertCircle className="size-8 animate-pulse" />
                    </div>
                    <span className="text-2xl font-black text-destructive tracking-tight">Acesso Expirado</span>
                    <p className="text-xs text-muted-foreground max-w-[240px] font-medium leading-normal">
                      A mensalidade ou período de testes está vencido. Regularize agora para reativar as permissões de acesso ao sistema.
                    </p>
                  </>
                )}
              </div>

              {/* Status footer inside days block */}
              <div className="border-t border-border/50 pt-4 flex items-center justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Status do Serviço:</span>
                <span className={cn(
                  "flex items-center gap-1.5",
                  (subscription.status === "active" || subscription.status === "trial") ? "text-emerald-500" : "text-destructive"
                )}>
                  <span className={cn(
                    "size-2 rounded-full",
                    (subscription.status === "active" || subscription.status === "trial") ? "bg-emerald-500" : "bg-destructive animate-pulse"
                  )} />
                  {(subscription.status === "active" || subscription.status === "trial") ? "Operando Normalmente" : "Painéis Bloqueados"}
                </span>
              </div>
            </Card>

          </div>
        </section>

        {/* Pricing Catalog */}
        <section className="space-y-6">
          <div className="text-center space-y-2 pt-8">
            <h3 className="text-2xl font-bold tracking-tight">Cresça a sua Consultoria</h3>
            <p className="text-muted-foreground">Escolha o plano ideal para escalar seu negócio com o AtlasFit.</p>
          </div>

          {subscription.status === "trial" && (
            <div className="max-w-2xl mx-auto p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center flex flex-col items-center gap-2 select-none animate-in fade-in duration-300">
              <Zap className="size-5 text-amber-500 shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed max-w-lg font-medium">
                <strong>Como funciona a Pré-Assinatura?</strong> Ao escolher seu plano premium hoje, a cobrança é realizada imediatamente, mas seu período de 10 dias de teste grátis continua contando normalmente. Suas mensalidades só começam após o fim do teste!
              </p>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-8 items-start pt-8 pb-12">
            {platformPlans.map((plan) => {
              const isPlanProcessing = isProcessing === plan.id;
              const isAnyProcessing = isProcessing !== null;

              return (
                <Card
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col h-full transition-all duration-300 overflow-visible",
                    plan.highlight
                      ? "border-primary shadow-lg shadow-primary/10 scale-100 md:scale-105 z-10"
                      : "border-border/50 bg-card/50 hover:bg-card"
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <Badge className="bg-primary text-primary-foreground font-bold px-4 py-1.5 shadow-md">
                        Recomendado
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-8 pt-8">
                    <CardTitle className="text-xl mb-2">{plan.name}</CardTitle>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                      <span className="text-muted-foreground font-medium">{plan.interval}</span>
                    </div>
                    <CardDescription className="mt-4 text-sm h-10 flex items-center justify-center">
                      {plan.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1">
                    <ul className="space-y-4">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle2 className="size-5 text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground/80">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-6">
                    <Button
                      onClick={() => handlePlanAction(plan.id, plan.name, plan.isCurrent)}
                      className={cn(
                        "w-full cursor-pointer transition-all duration-200",
                        plan.highlight
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                      variant={plan.highlight ? "default" : "outline"}
                      disabled={plan.isCurrent || isAnyProcessing}
                    >
                      {isPlanProcessing ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          {plan.highlight && !plan.isCurrent && <Zap className="mr-2 size-4" />}
                          {plan.isCurrent 
                            ? "Seu Plano Atual" 
                            : subscription.status === "trial" 
                            ? "Garantir Pré-Assinatura" 
                            : plan.buttonText}
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Dynamic Billing Invoices History */}
        {subscription.invoices && subscription.invoices.length > 0 && (
          <section className="space-y-4 pt-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight">Histórico de Cobranças</h3>
              <p className="text-muted-foreground text-xs">Acesse e audite seus faturamentos e comprovantes recentes.</p>
            </div>
            <Card className="border-border/50 bg-card overflow-hidden shadow-none rounded-2xl">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/20 text-muted-foreground font-bold uppercase tracking-wider select-none">
                      <th className="p-4 font-semibold">Data da Fatura</th>
                      <th className="p-4 font-semibold">Descrição</th>
                      <th className="p-4 font-semibold">Método</th>
                      <th className="p-4 font-semibold">Valor</th>
                      <th className="p-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscription.invoices.map((invoice: any) => (
                      <tr key={invoice.id} className="border-b border-border/40 hover:bg-muted/5 transition-colors font-medium">
                        <td className="p-4 whitespace-nowrap text-neutral-400">
                          {invoice.date.split("-").reverse().join("/")}
                        </td>
                        <td className="p-4 text-foreground font-bold">
                          {invoice.description}
                        </td>
                        <td className="p-4 whitespace-nowrap text-neutral-400">
                          {invoice.paymentMethod || "PIX"}
                        </td>
                        <td className="p-4 whitespace-nowrap text-foreground font-bold">
                          R$ {invoice.amount.toFixed(2)}
                        </td>
                        <td className="p-4 whitespace-nowrap text-right">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide shrink-0",
                              invoice.status === "APPROVED" 
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                : invoice.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            )}
                          >
                            {invoice.status === "APPROVED" ? "Pago" : invoice.status === "PENDING" ? "Pendente" : "Falhou"}
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
      </motion.div>
    </div>
  );
}
