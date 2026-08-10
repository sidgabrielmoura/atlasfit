"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  RefreshCw,
  Search,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";
import { centsToCurrencyString } from "@/modules/payments/domain/fee-calculator";

interface SubaccountItem {
  id: string;
  providerAccountId: string;
  personalUserId: string;
  userName: string;
  userEmail: string;
  legalNameMasked: string;
  documentLast4: string;
  status: string;
  kycStatus: string;
  providerStatus: string | null;
  totalMovedInCents: string;
  totalPlatformFeeInCents: string;
  totalPersonalNetInCents: string;
  totalPendingInCents: string;
  totalPayoutsInCents: string;
  billingsCount: number;
  pendingBillingsCount: number;
  payoutsCount: number;
  createdAt: string;
  lastProviderSyncAt: string | null;
}

interface WebhookEventItem {
  id: string;
  eventType: string;
  processingStatus: string;
  providerEventId: string;
  queuedAt: string;
  processedAt: string | null;
  lastErrorSanitized: string | null;
}

interface AsaasMetricsData {
  environment: string;
  masterAvailableInCents: string;
  summary: {
    totalGrossMovedInCents: string;
    totalPlatformFeeInCents: string;
    totalPersonalNetInCents: string;
    totalPendingInCents: string;
    totalPayoutsCompletedInCents: string;
    totalPayoutsProcessingInCents: string;
    totalSubaccountsCount: number;
    approvedSubaccountsCount: number;
    pendingSubaccountsCount: number;
    rejectedSubaccountsCount: number;
    activeMoverAccounts: number;
    avgVolumePerSubaccountInCents: string;
  };
  subaccountsList: SubaccountItem[];
  monthlyChartData: Array<{
    month: string;
    grossVolume: number;
    splitFees: number;
    netPersonal: number;
    count: number;
  }>;
  paymentMethodsData: Array<{
    method: string;
    volume: number;
    count: number;
  }>;
  statusBreakdownData: Array<{
    status: string;
    count: number;
    volume: number;
  }>;
  recentEvents: WebhookEventItem[];
}

export default function SuperadminAsaasMetricsPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState<AsaasMetricsData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [subaccountsTab, setSubaccountsTab] = useState<"ALL" | "TOP" | "LOW">("ALL");

  const fetchAsaasMetrics = async () => {
    try {
      const res = await fetch("/api/superadmin/asaas");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        toast.error("Falha ao carregar métricas Asaas");
      }
    } catch {
      toast.error("Erro ao conectar com a API de métricas Asaas");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await fetchAsaasMetrics();
      toast.success("Métricas Asaas atualizadas em tempo real");
    } catch {
      toast.error("Falha ao atualizar métricas.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAsaasMetrics();
  }, []);

  if (loading) {
    return <AsaasMetricsSkeleton />;
  }

  const summary = data?.summary;
  const masterBalanceCents = BigInt(data?.masterAvailableInCents || "0");
  const totalMovedCents = BigInt(summary?.totalGrossMovedInCents || "0");
  const totalSplitFeeCents = BigInt(summary?.totalPlatformFeeInCents || "0");
  const avgVolumeCents = BigInt(summary?.avgVolumePerSubaccountInCents || "0");

  const filteredSubaccounts = (data?.subaccountsList || []).filter((sub) => {
    const matchesSearch =
      sub.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.legalNameMasked.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (subaccountsTab === "TOP") return BigInt(sub.totalMovedInCents) > BigInt(0);
    if (subaccountsTab === "LOW") return BigInt(sub.totalMovedInCents) === BigInt(0);
    return true;
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1400px] mx-auto bg-background text-foreground min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Métricas Financeiras Asaas</h2>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0">
              {data?.environment || "sandbox"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão geral do saldo da conta master, receita de split e métricas de subcontas.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={syncing}
          className="h-8 text-xs gap-2 border-border text-foreground hover:bg-secondary rounded-lg self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "animate-spin" : ""}`} />
          <span>Sincronizar em Tempo Real</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Volume Total Movimentado</span>
          <span className="text-xl font-bold font-mono text-foreground block">
            {centsToCurrencyString(totalMovedCents)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Volume bruto liquidado</span>
        </Card>

        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Receita de Split AtlasFit</span>
          <span className="text-xl font-bold font-mono text-foreground block">
            {centsToCurrencyString(totalSplitFeeCents)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Comissão da plataforma</span>
        </Card>

        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Saldo da Conta Master</span>
          <span className="text-xl font-bold font-mono text-foreground block">
            {centsToCurrencyString(masterBalanceCents)}
          </span>
          <span className="text-[10px] text-muted-foreground block">Conta principal Asaas</span>
        </Card>

        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Subcontas Cadastradas</span>
          <span className="text-xl font-bold font-mono text-foreground block">
            {summary?.totalSubaccountsCount || 0}
          </span>
          <span className="text-[10px] text-muted-foreground block">
            Média: <span className="font-mono text-foreground font-semibold">{centsToCurrencyString(avgVolumeCents)}</span>
          </span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 bg-card border-border/60 p-5 rounded-xl shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Evolução Mensal da Receita</h3>
              <p className="text-[11px] text-muted-foreground">Volume movimentado vs receitas de split nos últimos 12 meses.</p>
            </div>
          </div>

          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyChartData || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGrossMin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tickMargin={6} className="text-[10px] text-muted-foreground" />
                <YAxis axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `R$${v}`} className="text-[10px] text-muted-foreground" />
                <Tooltip
                  contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                  itemStyle={{ color: "var(--foreground)" }}
                  formatter={(val: number | any, name: any) => [
                    `R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                    name === "grossVolume" ? "Volume Bruto" : "Split AtlasFit"
                  ]}
                />
                <Area type="monotone" dataKey="grossVolume" stroke="var(--primary)" strokeWidth={1.5} fillOpacity={1} fill="url(#colorGrossMin)" />
                <Area type="monotone" dataKey="splitFees" stroke="var(--muted-foreground)" strokeWidth={1.5} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-4 bg-card border-border/60 p-5 rounded-xl shadow-none flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Métodos de Pagamento</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Distribuição de volume por método de pagamento.</p>

            <div className="h-[140px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.paymentMethodsData || []} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="method" axisLine={false} tickLine={false} tickMargin={6} className="text-[10px] text-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} width={45} className="text-[10px] text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                    formatter={(val: number | any) => [`R$ ${Number(val).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Volume"]}
                  />
                  <Bar dataKey="volume" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="divide-y divide-border/40 border-t border-border/40 pt-2 text-xs">
            {(data?.paymentMethodsData || []).map((m) => (
              <div key={m.method} className="flex justify-between items-center py-1.5">
                <span className="font-medium text-foreground">{m.method}</span>
                <span className="font-mono text-muted-foreground">R$ {m.volume.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="bg-card border-border/60 p-5 rounded-xl shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Desempenho das Subcontas</h3>
            <p className="text-[11px] text-muted-foreground">Ranking de volume e status de KYC de todas as subcontas de personal trainers.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5 pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar por nome ou e-mail..."
                className="h-8 text-xs bg-background border-border text-foreground pl-8 w-full sm:w-56 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border/40">
              <Button
                onClick={() => setSubaccountsTab("ALL")}
                variant="ghost"
                className={`h-7 px-2.5 text-[11px] font-medium rounded-md cursor-pointer ${
                  subaccountsTab === "ALL" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Todas
              </Button>
              <Button
                onClick={() => setSubaccountsTab("TOP")}
                variant="ghost"
                className={`h-7 px-2.5 text-[11px] font-medium rounded-md cursor-pointer ${
                  subaccountsTab === "TOP" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Com Movimento
              </Button>
              <Button
                onClick={() => setSubaccountsTab("LOW")}
                variant="ghost"
                className={`h-7 px-2.5 text-[11px] font-medium rounded-md cursor-pointer ${
                  subaccountsTab === "LOW" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sem Movimento
              </Button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
          {filteredSubaccounts.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Nenhuma subconta encontrada.</div>
          ) : (
            filteredSubaccounts.map((sub, index) => {
              const movedVal = BigInt(sub.totalMovedInCents);
              const feeVal = BigInt(sub.totalPlatformFeeInCents);

              return (
                <div
                  key={sub.id}
                  className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground w-6 text-center shrink-0">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{sub.legalNameMasked}</span>
                        <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 text-muted-foreground border-border">
                          {sub.status === "APPROVED" || sub.kycStatus === "APPROVED" ? "Aprovado" : "Pendente"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{sub.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Movimentado</span>
                      <span className="font-mono font-semibold text-foreground text-xs">{centsToCurrencyString(movedVal)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Split</span>
                      <span className="font-mono font-semibold text-foreground text-xs">{centsToCurrencyString(feeVal)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="bg-card border-border/60 p-5 rounded-xl shadow-none space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Logs de Webhooks Asaas</h3>
        <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden text-xs">
          {(data?.recentEvents || []).slice(0, 8).map((evt) => (
            <div key={evt.id} className="p-2.5 px-4 flex items-center justify-between gap-2">
              <span className="font-mono text-foreground text-[11px] truncate">{evt.eventType}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] text-muted-foreground">{new Date(evt.queuedAt).toLocaleTimeString("pt-BR")}</span>
                <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground px-1.5 py-0">
                  {evt.processingStatus}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AsaasMetricsSkeleton() {
  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1400px] mx-auto bg-background text-foreground min-h-screen animate-pulse">
      <div className="flex justify-between items-center pb-4 border-b border-border/60">
        <Skeleton className="h-6 w-48 rounded-md bg-muted" />
        <Skeleton className="h-8 w-24 rounded-lg bg-muted" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl bg-muted" />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Skeleton className="lg:col-span-8 h-64 rounded-xl bg-muted" />
        <Skeleton className="lg:col-span-4 h-64 rounded-xl bg-muted" />
      </div>

      <Skeleton className="h-48 rounded-xl bg-muted" />
    </div>
  );
}
