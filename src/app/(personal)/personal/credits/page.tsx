"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Zap,
  CheckCircle2,
  Loader2,
  Star,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { workspaceStore } from "@/stores/workspace.store";
import { useSnapshot } from "valtio";

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  priceInCents: number;
  isHighlighted: boolean;
}

interface QuotaBalance {
  allowed: boolean;
  source: string;
  remaining: number;
  quotaUsed: number;
  quotaTotal: number;
  credits: number;
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function BalanceSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1, 2].map((i) => (
        <div key={i} className="p-5 border border-border/40 rounded-2xl bg-card/50 space-y-3">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-8 w-16 rounded" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
      ))}
    </div>
  );
}

function PackagesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-6 border border-border/40 rounded-2xl bg-card space-y-4">
          <Skeleton className="h-5 w-32 rounded" />
          <Skeleton className="h-8 w-20 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function PersonalCreditsPage() {
  const searchParams = useSearchParams();
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [balance, setBalance] = useState<QuotaBalance | null>(null);
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get("status") === "success") {
      toast.success("Pagamento confirmado! Seus créditos serão adicionados em instantes.");
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/personal/credits/packages");
        if (res.ok) setPackages(await res.json());
      } finally {
        setIsLoadingPackages(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      try {
        const res = await fetch(`/api/personal/credits/balance?workspaceId=${workspaceId}`);
        if (res.ok) setBalance(await res.json());
      } finally {
        setIsLoadingBalance(false);
      }
    })();
  }, [workspaceId]);

  const handlePurchase = async (pkg: CreditPackage) => {
    if (!workspaceId) return;
    setPurchasingId(pkg.id);
    try {
      const res = await fetch("/api/personal/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId: pkg.id, workspaceId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast.error("URL de checkout não disponível.");
      }
    } catch {
      toast.error("Erro ao iniciar compra. Tente novamente.");
      setPurchasingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-10 mx-auto animate-in fade-in duration-500">
      <div className="space-y-1 border-b border-border/40 pb-8">
        <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
          <Coins className="size-4" />
          Créditos de Importação
        </div>
        <h1 className="text-3xl font-black tracking-tight">Comprar Créditos</h1>
        <p className="text-muted-foreground text-sm font-medium">
          Créditos adicionais para importar alunos e fichas de treino usando IA.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Seu Saldo Atual</h2>
        {isLoadingBalance ? (
          <BalanceSkeleton />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-border/40 bg-card/50 shadow-sm">
              <CardContent className="p-5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Franquia do Plano (mensal)
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black tabular-nums">
                    {balance ? Math.max(0, (balance.quotaTotal || 0) - (balance.quotaUsed || 0)) : 0}
                  </span>
                  <span className="text-sm text-muted-foreground font-bold mb-1">
                    / {balance?.quotaTotal ?? 0} importações
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Renova automaticamente todo mês
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50 shadow-sm">
              <CardContent className="p-5 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Créditos Avulsos
                </p>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black tabular-nums text-primary">
                    {balance?.credits ?? 0}
                  </span>
                  <span className="text-sm text-muted-foreground font-bold mb-1">créditos</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  Não expiram — usados quando a franquia zerar
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Pacotes Disponíveis</h2>
        {isLoadingPackages ? (
          <PackagesSkeleton />
        ) : packages.length === 0 ? (
          <div className="border-2 border-dashed border-border/30 rounded-2xl p-12 text-center space-y-2">
            <Coins className="size-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground font-bold">Nenhum pacote disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={cn(
                  "border-border/40 p-0 bg-card shadow-sm hover:shadow-md transition-all duration-300 flex flex-col",
                  pkg.isHighlighted && "border-primary/40 ring-1 ring-primary/20"
                )}
              >
                {pkg.isHighlighted && (
                  <div className="flex items-center justify-center gap-1.5 py-2 bg-primary/10 border-b border-primary/20">
                    <Star className="size-3 text-primary fill-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Mais Popular</span>
                  </div>
                )}
                <CardContent className="p-6 flex flex-col flex-1 gap-4">
                  <div>
                    <h3 className="text-base font-black tracking-tight">{pkg.name}</h3>
                    {pkg.description && (
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{pkg.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Zap className="size-4 text-primary" />
                      <span className="text-2xl font-black tabular-nums">{pkg.credits}</span>
                      <span className="text-sm text-muted-foreground font-bold">créditos</span>
                    </div>
                  </div>
                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-border/40">
                    <div>
                      <p className="text-xl font-black">{formatBRL(pkg.priceInCents)}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">
                        {formatBRL(Math.round(pkg.priceInCents / pkg.credits))}/crédito
                      </p>
                    </div>
                    <Button
                      onClick={() => handlePurchase(pkg)}
                      disabled={purchasingId === pkg.id}
                      className={cn(
                        "h-10 px-4 rounded-xl gap-2 font-bold text-sm",
                        pkg.isHighlighted
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "bg-secondary text-foreground hover:bg-secondary/80"
                      )}
                    >
                      {purchasingId === pkg.id ? (
                        <><Loader2 className="size-4 animate-spin" /> Aguarde...</>
                      ) : (
                        <>Comprar <ArrowRight className="size-3.5" /></>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Como Funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: Zap,
              title: "1. Franquia Mensal",
              desc: "Seu plano inclui importações mensais que renovam automaticamente.",
            },
            {
              icon: Coins,
              title: "2. Créditos Avulsos",
              desc: "Ao esgotar a franquia, créditos avulsos são consumidos automaticamente.",
            },
            {
              icon: CheckCircle2,
              title: "3. Sem Expiração",
              desc: "Créditos comprados não expiram e ficam disponíveis para sempre.",
            },
          ].map((item) => (
            <div key={item.title} className="p-4 border border-border/40 rounded-2xl bg-card/30 space-y-2">
              <div className="p-2 w-fit rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-4" />
              </div>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
