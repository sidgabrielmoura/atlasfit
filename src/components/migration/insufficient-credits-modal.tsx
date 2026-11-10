"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Coins,
  Zap,
  CheckCircle2,
  Loader2,
  Star,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CreditCard,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PersonalSubscriptionCheckout } from "@/components/application/personal-subscription-checkout";

export interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  priceInCents: number;
  isHighlighted: boolean;
}

export interface QuotaBalance {
  allowed: boolean;
  source: string;
  remaining: number;
  quotaUsed: number;
  quotaTotal: number;
  credits: number;
}

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  price: string | number;
  interval?: string;
  rawInterval?: string;
  isCurrent?: boolean;
  highlight?: boolean;
  features?: string[];
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function PackagesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-5 border border-border/40 rounded-2xl bg-card/60 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
          <div className="space-y-1.5 pt-2 border-t border-border/30">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-5 border border-border/40 rounded-2xl bg-card/60 space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
          <div className="space-y-2 pt-2 border-t border-border/30">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
          </div>
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export interface InsufficientCreditsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role?: "personal" | "gym";
  workspaceId?: string | null;
  creditsApiBasePath?: string;
  subscriptionRoute?: string;
  onSuccess?: () => void;
}

export function InsufficientCreditsModal({
  open,
  onOpenChange,
  role = "personal",
  workspaceId,
  creditsApiBasePath,
  subscriptionRoute,
  onSuccess,
}: InsufficientCreditsModalProps) {
  const creditsBase = creditsApiBasePath || (role === "gym" ? "/api/gym/credits" : "/api/personal/credits");
  const fullSubscriptionRoute = subscriptionRoute || (role === "gym" ? "/gym/subscription" : "/personal/subscription");
  const subscriptionApiEndpoint = role === "gym" && workspaceId
    ? `/api/gym/subscription?workspaceId=${workspaceId}`
    : "/api/personal/subscription";

  const [activeTab, setActiveTab] = useState<"credits" | "plans">("credits");
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>([]);
  const [balance, setBalance] = useState<QuotaBalance | null>(null);

  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [checkoutPackage, setCheckoutPackage] = useState<CreditPackage | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<{ id: string; name: string } | null>(null);

  const loadPackagesAndBalance = useCallback(async () => {
    if (!open) return;
    setIsLoadingPackages(true);
    setIsLoadingBalance(true);

    try {
      const pkgsPromise = fetch(`${creditsBase}/packages`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);

      const balancePromise = workspaceId
        ? fetch(`${creditsBase}/balance?workspaceId=${workspaceId}`)
            .then((res) => (res.ok ? res.json() : null))
            .catch(() => null)
        : Promise.resolve(null);

      const [pkgsData, balanceData] = await Promise.all([pkgsPromise, balancePromise]);
      setPackages(Array.isArray(pkgsData) ? pkgsData : []);
      if (balanceData) setBalance(balanceData);
    } finally {
      setIsLoadingPackages(false);
      setIsLoadingBalance(false);
    }
  }, [open, creditsBase, workspaceId]);

  const loadSubscriptionPlans = useCallback(async () => {
    if (!open || plans.length > 0) return;
    setIsLoadingPlans(true);
    try {
      const res = await fetch(subscriptionApiEndpoint, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        const rawPlans = data.platformPlans || data.plans || [];
        const filtered = Array.isArray(rawPlans)
          ? rawPlans.filter((p: any) => {
              if (role === "personal") {
                const lower = (p.name || "").toLowerCase();
                return !lower.includes("academia") && !lower.includes("franquia") && !lower.includes("estúdio") && !lower.includes("estudio") && !lower.includes("box");
              }
              return true;
            })
          : [];
        setPlans(filtered);
      }
    } catch {
      // Falha silenciosa para planos
    } finally {
      setIsLoadingPlans(false);
    }
  }, [open, plans.length, subscriptionApiEndpoint, role]);

  useEffect(() => {
    if (open) {
      loadPackagesAndBalance();
    }
  }, [open, loadPackagesAndBalance]);

  useEffect(() => {
    if (open && activeTab === "plans") {
      loadSubscriptionPlans();
    }
  }, [open, activeTab, loadSubscriptionPlans]);

  const handlePurchasePackage = async (pkg: CreditPackage) => {
    if (!workspaceId) {
      toast.error("Identificação do workspace ausente.");
      return;
    }

    if (role === "gym") {
      setCheckoutPackage(pkg);
      return;
    }

    setPurchasingPackageId(pkg.id);
    try {
      const res = await fetch(`${creditsBase}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id, workspaceId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || errData.message || "Erro ao iniciar compra.");
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        toast.success("Redirecionando para o pagamento seguro...");
        window.location.href = data.checkoutUrl;
      } else {
        toast.error("URL de checkout indisponível.");
        setPurchasingPackageId(null);
      }
    } catch (err: any) {
      toast.error(err.message || "Não foi possível iniciar a compra.");
      setPurchasingPackageId(null);
    }
  };

  const handleSelectPlan = (plan: SubscriptionPlanItem) => {
    if (plan.isCurrent) return;
    setCheckoutPlan({ id: plan.id, name: plan.name });
  };

  const isAnyActionRunning = purchasingPackageId !== null;

  return (
    <>
      {/* Checkout de Academia para Pacote de Créditos */}
      {role === "gym" && workspaceId && checkoutPackage && (
        <PersonalSubscriptionCheckout
          plan={checkoutPackage}
          onClose={() => setCheckoutPackage(null)}
          endpoint={`${creditsBase}/purchase`}
          purchaseContext={{ workspaceId }}
        />
      )}

      {/* Checkout de Assinatura (Plano Mensal) */}
      {checkoutPlan && (
        <PersonalSubscriptionCheckout
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
          endpoint={role === "gym" && workspaceId ? `/api/gym/subscription` : "/api/personal/subscription"}
          purchaseContext={role === "gym" && workspaceId ? { workspaceId } : undefined}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && isAnyActionRunning) return;
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent
          className="max-w-2xl sm:max-w-3xl p-0 gap-0 overflow-hidden rounded-3xl border-border/40 shadow-2xl bg-card"
          onEscapeKeyDown={(e) => {
            if (isAnyActionRunning) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (isAnyActionRunning) e.preventDefault();
          }}
        >
          {/* Header Minimalista */}
          <div className="p-6 sm:p-7 pb-4 space-y-3 border-b border-border/40 bg-linear-to-b from-muted/30 to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                <div className="size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Coins className="size-3.5" />
                </div>
                Créditos de Importação
              </div>

              <Badge
                variant="outline"
                className="text-[10px] font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5"
              >
                Saldo Esgotado
              </Badge>
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Seus créditos acabaram
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Adquira um pacote de créditos avulsos para continuar processando suas planilhas e fichas instantaneamente ou faça upgrade do seu plano.
              </DialogDescription>
            </div>

            {/* Faixa compacta de saldo atual */}
            <div className="pt-2">
              {isLoadingBalance ? (
                <Skeleton className="h-10 w-full rounded-xl" />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-card border border-border/40 text-xs shadow-2xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-medium">Franquia do mês:</span>
                      <span className="font-black text-foreground">
                        {balance ? Math.max(0, (balance.quotaTotal || 0) - (balance.quotaUsed || 0)) : 0}
                        <span className="text-muted-foreground font-normal"> / {balance?.quotaTotal ?? 0}</span>
                      </span>
                    </div>

                    <div className="w-px h-3 bg-border/60 hidden sm:block" />

                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground font-medium">Créditos avulsos:</span>
                      <span className="font-black text-primary flex items-center gap-1">
                        <Coins className="size-3" />
                        {balance?.credits ?? 0}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] text-muted-foreground font-medium">
                    1 crédito = 1 aluno ou ficha processada
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Abas: Pacotes de Créditos vs Planos de Assinatura */}
          <div className="p-6 sm:p-7 pt-4 space-y-5">
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as "credits" | "plans")}
              className="w-full space-y-4"
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <TabsList className="bg-muted/50 p-1 rounded-xl h-9 border border-border/40">
                  <TabsTrigger
                    value="credits"
                    className="text-xs font-bold rounded-lg px-3.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                  >
                    <Coins className="size-3.5 mr-1.5 text-primary" />
                    Pacotes Avulsos
                  </TabsTrigger>
                  <TabsTrigger
                    value="plans"
                    className="text-xs font-bold rounded-lg px-3.5 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
                  >
                    <Sparkles className="size-3.5 mr-1.5 text-amber-500" />
                    Planos de Assinatura
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                  <ShieldCheck className="size-3.5 text-emerald-500" />
                  Pagamento instantâneo via PIX
                </div>
              </div>

              {/* ABA 1: PACOTES AVULSOS */}
              <TabsContent value="credits" className="m-0 space-y-4 focus-visible:outline-hidden">
                {isLoadingPackages ? (
                  <PackagesSkeleton />
                ) : packages.length === 0 ? (
                  <div className="border border-dashed border-border/60 rounded-2xl p-8 text-center space-y-3 bg-muted/10">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                      <Coins className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">Nenhum pacote avulso disponível</p>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        Você pode migrar ou fazer upgrade de plano para receber uma cota mensal ampliada.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs font-bold"
                      onClick={() => setActiveTab("plans")}
                    >
                      Ver Planos Mensais <ArrowRight className="size-3.5 ml-1" />
                    </Button>
                  </div>
                ) : (
                  <div className={cn(
                    "grid gap-4",
                    packages.length === 1 ? "grid-cols-1" : packages.length === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-3"
                  )}>
                    {packages.map((pkg) => {
                      const isBuyingThis = purchasingPackageId === pkg.id;
                      const unitCost = Math.round(pkg.priceInCents / pkg.credits);

                      return (
                        <Card
                          key={pkg.id}
                          className={cn(
                            "relative border rounded-2xl bg-card p-4 sm:p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md",
                            pkg.isHighlighted
                              ? "border-primary/60 shadow-sm ring-1 ring-primary/20 bg-linear-to-b from-primary/[0.03] to-transparent"
                              : "border-border/40 hover:border-border/80"
                          )}
                        >
                          {pkg.isHighlighted && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                              <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2 py-0.5 shadow-xs">
                                <Star className="size-2.5 mr-1 fill-current" /> Mais Popular
                              </Badge>
                            </div>
                          )}

                          <div className="space-y-3 pt-1">
                            <div>
                              <h4 className="text-sm font-black text-foreground tracking-tight">{pkg.name}</h4>
                              {pkg.description && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                  {pkg.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-baseline gap-1.5 py-1">
                              <Zap className="size-4 text-primary shrink-0 self-center" />
                              <span className="text-2xl font-black text-foreground tabular-nums tracking-tight">
                                {pkg.credits}
                              </span>
                              <span className="text-xs text-muted-foreground font-bold">créditos</span>
                            </div>

                            <div className="pt-2 border-t border-border/30 space-y-1">
                              <p className="text-lg font-black text-foreground tracking-tight">
                                {formatBRL(pkg.priceInCents)}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-semibold">
                                {formatBRL(unitCost)} por crédito
                              </p>
                            </div>

                            <ul className="text-[11px] text-muted-foreground space-y-1 pt-1 font-medium">
                              <li className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                                <span>Nunca expiram</span>
                              </li>
                              <li className="flex items-center gap-1.5">
                                <CheckCircle2 className="size-3 text-emerald-500 shrink-0" />
                                <span>Liberação instantânea</span>
                              </li>
                            </ul>
                          </div>

                          <div className="pt-4 mt-auto">
                            <Button
                              onClick={() => handlePurchasePackage(pkg)}
                              disabled={isAnyActionRunning}
                              className={cn(
                                "w-full h-9 rounded-xl font-bold text-xs gap-1.5",
                                pkg.isHighlighted
                                  ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                              )}
                            >
                              {isBuyingThis ? (
                                <>
                                  <Loader2 className="size-3.5 animate-spin" />
                                  <span>Gerando checkout...</span>
                                </>
                              ) : (
                                <>
                                  <span>Comprar</span>
                                  <ArrowRight className="size-3" />
                                </>
                              )}
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ABA 2: PLANOS DE ASSINATURA */}
              <TabsContent value="plans" className="m-0 space-y-4 focus-visible:outline-hidden">
                {isLoadingPlans ? (
                  <PlansSkeleton />
                ) : plans.length === 0 ? (
                  <div className="border border-border/40 rounded-2xl p-6 bg-muted/20 text-center space-y-3">
                    <p className="text-xs text-muted-foreground font-medium">
                      Consulte a página completa de assinaturas para verificar opções mensais e anuais com cotas incluídas.
                    </p>
                    <Button asChild size="sm" className="rounded-xl font-bold text-xs">
                      <Link href={fullSubscriptionRoute}>
                        Acessar Planos <ArrowRight className="size-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {plans.slice(0, 3).map((plan) => {
                      const isCurrent = Boolean(plan.isCurrent);
                      const priceFormatted = typeof plan.price === "number" ? `R$ ${plan.price}` : String(plan.price || "");

                      return (
                        <Card
                          key={plan.id}
                          className={cn(
                            "relative border rounded-2xl bg-card p-4 sm:p-5 flex flex-col justify-between transition-all duration-200",
                            plan.highlight
                              ? "border-primary/60 shadow-sm ring-1 ring-primary/20 bg-linear-to-b from-primary/[0.03] to-transparent"
                              : "border-border/40"
                          )}
                        >
                          {plan.highlight && (
                            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10">
                              <Badge className="bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-wider px-2 py-0.5">
                                Recomendado
                              </Badge>
                            </div>
                          )}

                          <div className="space-y-3 pt-1">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-black text-foreground tracking-tight">{plan.name}</h4>
                                {isCurrent && (
                                  <Badge variant="outline" className="text-[9px] font-bold border-primary/30 text-primary">
                                    Atual
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="pt-1">
                              <p className="text-xl font-black text-foreground tracking-tight">
                                {priceFormatted}
                                <span className="text-[10px] text-muted-foreground font-bold ml-1">/mês</span>
                              </p>
                            </div>

                            {plan.features && plan.features.length > 0 && (
                              <ul className="text-[11px] text-muted-foreground space-y-1.5 pt-2 border-t border-border/30">
                                {plan.features.slice(0, 3).map((f, i) => (
                                  <li key={i} className="flex items-start gap-1.5 leading-tight">
                                    <CheckCircle2 className="size-3 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="pt-4 mt-auto">
                            {isCurrent ? (
                              <Button
                                disabled
                                variant="outline"
                                className="w-full h-9 rounded-xl font-bold text-xs opacity-70"
                              >
                                Plano Atual
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleSelectPlan(plan)}
                                disabled={isAnyActionRunning}
                                className={cn(
                                  "w-full h-9 rounded-xl font-bold text-xs gap-1.5",
                                  plan.highlight
                                    ? "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
                                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                )}
                              >
                                <span>Fazer Upgrade</span>
                                <ArrowRight className="size-3" />
                              </Button>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Rodapé Informativo Clean */}
            <div className="p-3.5 rounded-2xl bg-muted/30 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">Deseja gerenciar sua assinatura completa?</p>
                <p className="text-[11px] text-muted-foreground">
                  Acesse sua central de faturamento para ver notas fiscais, ciclos e alterar limites.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-8 rounded-xl font-bold text-xs shrink-0 border-border/60 hover:bg-card"
              >
                <Link href={fullSubscriptionRoute}>
                  Minha Assinatura <ArrowRight className="size-3 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
