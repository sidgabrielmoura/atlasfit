"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  RefreshCw,
  Search,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  Package,
  Receipt,
  Tag,
  ToggleLeft,
  ToggleRight,
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
  Bar,
} from "recharts";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

interface MetricsData {
  configured: boolean;
  environment: "production" | "development" | "not_configured";
  store: {
    id: string;
    name: string;
    balance: {
      available: number;
      pending: number;
      blocked: number;
    };
  };
  mrr: {
    mrr: number;
    totalActiveSubscriptions: number;
  };
  revenue: {
    totalRevenue: number;
    totalTransactions: number;
    transactionsPerDay: Record<string, { amount: number; count: number }>;
  };
  merchant: {
    name: string;
    website: string;
    createdAt: string;
  };
}

interface CheckoutItem {
  id: string;
  amount: number;
  paidAmount: number | null;
  status: "PAID" | "PENDING" | "EXPIRED" | "CANCELLED" | "REFUNDED";
  devMode: boolean;
  url: string | null;
  receiptUrl: string | null;
  externalId: string | null;
  methods: string[];
  itemsCount: number;
  customer: {
    name: string;
    email: string;
    taxId: string;
    cellphone: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface CheckoutsResponse {
  summary: {
    totalCount: number;
    totalAmountInCents: number;
    totalPaidInCents: number;
    statusCounts: Record<string, number>;
  };
  checkouts: CheckoutItem[];
}

interface ProductItem {
  id: string;
  externalId: string | null;
  name: string;
  priceInCents: number;
  currency: string;
  status: string;
  cycle: string | null;
  imageUrl: string | null;
  description: string | null;
  devMode: boolean;
  createdAt: string;
  linkedType: "PLAN" | "CREDIT_PACKAGE" | "NONE";
  linkedName: string | null;
  linkedId: string | null;
}

interface CouponItem {
  id: string;
  code: string;
  discountKind: "PERCENTAGE" | "FIXED";
  discount: number;
  status: string;
  isActive: boolean;
  maxRedeems: number;
  redeemsCount: number;
  notes: string | null;
  devMode: boolean;
  createdAt: string;
  localId: string | null;
}

export default function SuperadminAbacatePayHubPage() {
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingCheckouts, setLoadingCheckouts] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [checkoutsData, setCheckoutsData] = useState<CheckoutsResponse | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [coupons, setCoupons] = useState<CouponItem[]>([]);

  // Aba selecionada na seção de detalhes
  const [activeSection, setActiveSection] = useState<"CHECKOUTS" | "PRODUCTS" | "COUPONS">("CHECKOUTS");

  // Filtros de Cobranças
  const [checkoutSearch, setCheckoutSearch] = useState("");
  const [checkoutStatusFilter, setCheckoutStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "OTHER">("ALL");

  // Cupons
  const [togglingCouponId, setTogglingCouponId] = useState<string | null>(null);
  const [isCreateCouponOpen, setIsCreateCouponOpen] = useState(false);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: "",
    discountKind: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discount: "10",
    maxRedeems: "-1",
    notes: "",
  });

  // Exclusão de Cupom
  const [isDeleteCouponOpen, setIsDeleteCouponOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<CouponItem | null>(null);
  const [isDeletingCoupon, setIsDeletingCoupon] = useState(false);

  // Copiado
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const fetchMetrics = useCallback(async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch("/api/superadmin/abacatepay/metrics");
      if (res.ok) setMetrics(await res.json());
    } catch (err) {
      console.error("Erro ao carregar métricas AbacatePay:", err);
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const fetchCheckouts = useCallback(async () => {
    setLoadingCheckouts(true);
    try {
      const res = await fetch("/api/superadmin/abacatepay/checkouts");
      if (res.ok) setCheckoutsData(await res.json());
    } catch (err) {
      console.error("Erro ao carregar checkouts AbacatePay:", err);
    } finally {
      setLoadingCheckouts(false);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/superadmin/abacatepay/products");
      if (res.ok) {
        const prodJson = await res.json();
        setProducts(prodJson.products || []);
      }
    } catch (err) {
      console.error("Erro ao carregar produtos AbacatePay:", err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchCoupons = useCallback(async () => {
    setLoadingCoupons(true);
    try {
      const res = await fetch("/api/superadmin/abacatepay/coupons");
      if (res.ok) {
        const coupJson = await res.json();
        setCoupons(coupJson.coupons || []);
      }
    } catch (err) {
      console.error("Erro ao carregar cupons AbacatePay:", err);
    } finally {
      setLoadingCoupons(false);
    }
  }, []);

  const fetchAllData = useCallback(async () => {
    await Promise.allSettled([
      fetchMetrics(),
      fetchCheckouts(),
      fetchProducts(),
      fetchCoupons(),
    ]);
  }, [fetchMetrics, fetchCheckouts, fetchProducts, fetchCoupons]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = async () => {
    setSyncing(true);
    try {
      await fetchAllData();
      toast.success("Métricas do AbacatePay atualizadas");
    } catch {
      toast.error("Falha ao atualizar métricas.");
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleCoupon = async (c: CouponItem) => {
    setTogglingCouponId(c.id);
    try {
      const res = await fetch("/api/superadmin/abacatepay/coupons", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, code: c.code }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao alterar status do cupom");
      }
      toast.success(c.isActive ? `Cupom ${c.code} desativado.` : `Cupom ${c.code} ativado.`);
      await fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar cupom.");
    } finally {
      setTogglingCouponId(null);
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const discountVal = parseFloat(couponForm.discount);
    if (isNaN(discountVal) || discountVal <= 0) {
      toast.error("Informe um valor de desconto válido.");
      return;
    }
    if (couponForm.discountKind === "PERCENTAGE" && discountVal > 100) {
      toast.error("O desconto percentual não pode ultrapassar 100%.");
      return;
    }

    setIsSubmittingCoupon(true);
    try {
      const res = await fetch("/api/superadmin/abacatepay/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponForm.code,
          discountKind: couponForm.discountKind,
          discount: discountVal,
          maxRedeems: parseInt(couponForm.maxRedeems) || -1,
          notes: couponForm.notes || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao criar cupom");
      }

      toast.success("Cupom criado com sucesso no AbacatePay!");
      setIsCreateCouponOpen(false);
      setCouponForm({
        code: "",
        discountKind: "PERCENTAGE",
        discount: "10",
        maxRedeems: "-1",
        notes: "",
      });
      await fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "Falha ao cadastrar cupom.");
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleDeleteCoupon = async () => {
    if (!couponToDelete) return;
    setIsDeletingCoupon(true);
    try {
      const res = await fetch(
        `/api/superadmin/abacatepay/coupons?id=${encodeURIComponent(couponToDelete.id)}&code=${encodeURIComponent(couponToDelete.code)}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao excluir cupom");
      }
      toast.success(`Cupom ${couponToDelete.code} excluído.`);
      setIsDeleteCouponOpen(false);
      setCouponToDelete(null);
      await fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || "Falha ao excluir cupom.");
    } finally {
      setIsDeletingCoupon(false);
    }
  };

  // Gráfico de Faturamento Diário
  const revenueChartData = useMemo(() => {
    if (!metrics?.revenue?.transactionsPerDay) return [];
    const entries = Object.entries(metrics.revenue.transactionsPerDay);
    if (entries.length === 0) return [];
    return entries
      .map(([date, val]) => ({
        date: date.slice(5),
        faturamento: (val.amount || 0) / 100,
        transacoes: val.count || 0,
      }))
      .slice(-12);
  }, [metrics]);

  // Status breakdown de cobranças
  const statusBreakdownData = useMemo(() => {
    const counts = checkoutsData?.summary?.statusCounts || {};
    return [
      { status: "Pagas", count: counts.PAID || 0 },
      { status: "Pendentes", count: counts.PENDING || 0 },
      { status: "Expiradas", count: counts.EXPIRED || 0 },
      { status: "Canceladas", count: (counts.CANCELLED || 0) + (counts.REFUNDED || 0) },
    ];
  }, [checkoutsData]);

  // Cobranças filtradas
  const filteredCheckouts = useMemo(() => {
    if (!checkoutsData?.checkouts) return [];
    return checkoutsData.checkouts.filter((c) => {
      const matchesFilter =
        checkoutStatusFilter === "ALL" ||
        (checkoutStatusFilter === "PAID" && c.status === "PAID") ||
        (checkoutStatusFilter === "PENDING" && c.status === "PENDING") ||
        (checkoutStatusFilter === "OTHER" && (c.status === "EXPIRED" || c.status === "CANCELLED" || c.status === "REFUNDED"));

      const searchLower = checkoutSearch.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        c.id.toLowerCase().includes(searchLower) ||
        (c.customer?.name && c.customer.name.toLowerCase().includes(searchLower)) ||
        (c.externalId && c.externalId.toLowerCase().includes(searchLower));

      return matchesFilter && matchesSearch;
    });
  }, [checkoutsData, checkoutStatusFilter, checkoutSearch]);

  const availableBalance = metrics?.store?.balance?.available || 0;
  const pendingBalance = metrics?.store?.balance?.pending || 0;
  const mrrVal = typeof metrics?.mrr?.mrr === "number" ? metrics.mrr.mrr : 0;
  const totalPaidCents = checkoutsData?.summary?.totalPaidInCents || 0;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-[1400px] mx-auto bg-background text-foreground min-h-screen">
      {/* HEADER MINIMALISTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">Métricas AbacatePay</h2>
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0 border-border">
              {metrics?.environment === "development" ? "sandbox" : metrics?.environment || "produção"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Visão geral do saldo em conta, faturamento de assinaturas, cobranças e catálogo de produtos.
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

      {/* CARDS DE TOPO NO PADRÃO ASAAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Saldo Disponível</span>
          {loadingMetrics ? (
            <Skeleton className="h-7 w-28 rounded my-0.5 bg-muted" />
          ) : (
            <span className="text-xl font-bold font-mono text-foreground block">
              {formatBRL(availableBalance)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground block">Pronto para saque imediato</span>
        </Card>

        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Saldo Pendente</span>
          {loadingMetrics ? (
            <Skeleton className="h-7 w-28 rounded my-0.5 bg-muted" />
          ) : (
            <span className="text-xl font-bold font-mono text-foreground block">
              {formatBRL(pendingBalance)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground block">Valores em compensação</span>
        </Card>

        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">MRR de Assinaturas</span>
          {loadingMetrics ? (
            <Skeleton className="h-7 w-28 rounded my-0.5 bg-muted" />
          ) : (
            <span className="text-xl font-bold font-mono text-foreground block">
              {formatBRL(mrrVal)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground block">
            {loadingMetrics ? (
              <Skeleton className="h-3.5 w-24 rounded bg-muted mt-1" />
            ) : (
              `${typeof metrics?.mrr?.totalActiveSubscriptions === "number" ? metrics.mrr.totalActiveSubscriptions : 0} assinaturas ativas`
            )}
          </span>
        </Card>

        <Card className="bg-card border-border/60 p-4 rounded-xl shadow-none space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground block">Volume Liquidado</span>
          {loadingCheckouts ? (
            <Skeleton className="h-7 w-28 rounded my-0.5 bg-muted" />
          ) : (
            <span className="text-xl font-bold font-mono text-foreground block">
              {formatBRL(totalPaidCents)}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground block">
            {loadingCheckouts ? (
              <Skeleton className="h-3.5 w-28 rounded bg-muted mt-1" />
            ) : (
              `${checkoutsData?.summary?.totalCount || 0} cobranças registradas`
            )}
          </span>
        </Card>
      </div>

      {/* GRÁFICOS NO PADRÃO ASAAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 bg-card border-border/60 p-5 rounded-xl shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Evolução do Faturamento</h3>
              <p className="text-[11px] text-muted-foreground">Volume diário em R$ liquidado no AbacatePay nos últimos dias.</p>
            </div>
          </div>

          <div className="h-[220px] w-full min-w-0">
            {loadingMetrics ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-lg bg-muted" />
              </div>
            ) : revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="abacateGrossMin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tickMargin={6} className="text-[10px] text-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} width={45} tickFormatter={(v) => `R$${v}`} className="text-[10px] text-muted-foreground" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                    itemStyle={{ color: "var(--foreground)" }}
                    formatter={(val: any) => [`R$ ${Number(val).toFixed(2)}`, "Faturamento"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    stroke="var(--primary)"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#abacateGrossMin)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground border border-dashed border-border/40 rounded-lg">
                Nenhum dado diário recente registrado
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-4 bg-card border-border/60 p-5 rounded-xl shadow-none flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Status das Cobranças</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Distribuição das cobranças registradas no checkout.</p>

            <div className="h-35 w-full min-w-0">
              {loadingCheckouts ? (
                <div className="h-full w-full flex items-center justify-center">
                  <Skeleton className="h-full w-full rounded-lg bg-muted" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusBreakdownData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis dataKey="status" axisLine={false} tickLine={false} tickMargin={6} className="text-[10px] text-muted-foreground" />
                    <YAxis axisLine={false} tickLine={false} width={45} className="text-[10px] text-muted-foreground" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                      formatter={(val: any) => [val, "Cobranças"]}
                    />
                    <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="divide-y divide-border/40 text-xs">
            {statusBreakdownData.map((item) => (
              <div key={item.status} className="flex justify-between items-center py-1.5">
                <span className="font-medium text-foreground">{item.status}</span>
                <span className="font-mono text-muted-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="bg-card border-border/60 p-5 rounded-xl shadow-none space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {activeSection === "CHECKOUTS"
                ? "Histórico de Cobranças & Checkouts"
                : activeSection === "PRODUCTS"
                  ? "Catálogo de Produtos AbacatePay"
                  : "Cupons de Desconto"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {activeSection === "CHECKOUTS"
                ? "Consulta de cobranças com higienização Zero-Leak de dados de clientes (LGPD)."
                : activeSection === "PRODUCTS"
                  ? "Produtos sincronizados e vinculados a planos ou pacotes de crédito."
                  : "Códigos promocionais aplicáveis nos checkouts externos."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border/40">
              <Button
                onClick={() => setActiveSection("CHECKOUTS")}
                variant="ghost"
                className={`h-7 px-2.5 text-[11px] font-medium rounded-md cursor-pointer ${activeSection === "CHECKOUTS" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Cobranças {loadingCheckouts ? "(...)" : `(${checkoutsData?.checkouts?.length || 0})`}
              </Button>
              <Button
                onClick={() => setActiveSection("PRODUCTS")}
                variant="ghost"
                className={`h-7 px-2.5 text-[11px] font-medium rounded-md cursor-pointer ${activeSection === "PRODUCTS" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Produtos {loadingProducts ? "(...)" : `(${products.length})`}
              </Button>
              <Button
                onClick={() => setActiveSection("COUPONS")}
                variant="ghost"
                className={`h-7 px-2.5 text-[11px] font-medium rounded-md cursor-pointer ${activeSection === "COUPONS" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                Cupons {loadingCoupons ? "(...)" : `(${coupons.length})`}
              </Button>
            </div>

            {activeSection === "COUPONS" && (
              <Button
                onClick={() => setIsCreateCouponOpen(true)}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5 rounded-lg font-medium"
              >
                <Plus className="size-3" />
                Novo Cupom
              </Button>
            )}
          </div>
        </div>

        {activeSection === "CHECKOUTS" && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-2.5 pointer-events-none" />
                <Input
                  value={checkoutSearch}
                  onChange={(e) => setCheckoutSearch(e.target.value)}
                  placeholder="Filtrar por ID ou cliente..."
                  className="h-8 text-xs bg-background border-border text-foreground pl-8 w-full sm:w-64 rounded-lg"
                />
              </div>

              <div className="flex items-center gap-1 bg-secondary/50 p-0.5 rounded-lg border border-border/40 self-start sm:self-auto">
                <Button
                  onClick={() => setCheckoutStatusFilter("ALL")}
                  variant="ghost"
                  className={`h-6 px-2 text-[10px] font-medium rounded-md cursor-pointer ${checkoutStatusFilter === "ALL" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                >
                  Todas
                </Button>
                <Button
                  onClick={() => setCheckoutStatusFilter("PAID")}
                  variant="ghost"
                  className={`h-6 px-2 text-[10px] font-medium rounded-md cursor-pointer ${checkoutStatusFilter === "PAID" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                >
                  Pagas
                </Button>
                <Button
                  onClick={() => setCheckoutStatusFilter("PENDING")}
                  variant="ghost"
                  className={`h-6 px-2 text-[10px] font-medium rounded-md cursor-pointer ${checkoutStatusFilter === "PENDING" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                >
                  Pendentes
                </Button>
                <Button
                  onClick={() => setCheckoutStatusFilter("OTHER")}
                  variant="ghost"
                  className={`h-6 px-2 text-[10px] font-medium rounded-md cursor-pointer ${checkoutStatusFilter === "OTHER" ? "bg-background text-foreground shadow-xs" : "text-muted-foreground"
                    }`}
                >
                  Outras
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
              {loadingCheckouts ? (
                <TableSkeletonRows count={5} />
              ) : filteredCheckouts.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Nenhuma cobrança encontrada.</div>
              ) : (
                filteredCheckouts.map((c, index) => (
                  <div
                    key={c.id}
                    className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground w-6 text-center shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground truncate">
                            {c.customer?.name || "Cliente Não Identificado"}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 text-muted-foreground border-border">
                            {c.status === "PAID" ? "Pago" : c.status === "PENDING" ? "Pendente" : c.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono">{c.id.slice(0, 14)}...</span>
                          <button
                            onClick={() => copyToClipboard(c.id, c.id)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copiar ID"
                          >
                            {copiedId === c.id ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                          </button>
                          {c.customer?.taxId && <span>• CPF: {c.customer.taxId}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 text-right shrink-0">
                      <div>
                        <span className="text-[10px] text-muted-foreground block">{formatDate(c.createdAt)}</span>
                        <span className="font-mono font-semibold text-foreground text-xs">{formatBRL(c.amount)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        {c.url && (
                          <Button variant="ghost" size="icon" className="size-7 rounded-lg text-muted-foreground hover:text-foreground" asChild>
                            <a href={c.url} target="_blank" rel="noopener noreferrer" title="Abrir Checkout">
                              <ExternalLink className="size-3.5" />
                            </a>
                          </Button>
                        )}
                        {c.receiptUrl && (
                          <Button variant="ghost" size="icon" className="size-7 rounded-lg text-emerald-500 hover:text-emerald-400" asChild>
                            <a href={c.receiptUrl} target="_blank" rel="noopener noreferrer" title="Ver Recibo">
                              <Receipt className="size-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSection === "PRODUCTS" && (
          <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
            {loadingProducts ? (
              <TableSkeletonRows count={4} />
            ) : products.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Nenhum produto cadastrado no AbacatePay.</div>
            ) : (
              products.map((p, index) => (
                <div
                  key={p.id}
                  className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground w-6 text-center shrink-0">
                      #{index + 1}
                    </span>

                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} className="size-8 rounded-lg object-contain bg-secondary/40 p-1 border border-border/40 shrink-0" />
                    ) : (
                      <div className="size-8 rounded-lg bg-secondary/40 flex items-center justify-center border border-border/40 shrink-0 text-muted-foreground">
                        <Package className="size-4" />
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">{p.name}</span>
                        {p.linkedType === "PLAN" && (
                          <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 text-primary border-primary/30">
                            Plano
                          </Badge>
                        )}
                        {p.linkedType === "CREDIT_PACKAGE" && (
                          <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0 text-amber-500 border-amber-500/30">
                            Créditos
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">ID: {p.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">{p.cycle ? p.cycle.toLowerCase() : "pagamento único"}</span>
                      <span className="font-mono font-semibold text-foreground text-xs">{formatBRL(p.priceInCents)}</span>
                    </div>

                    <Badge variant="outline" className={`text-[9px] font-mono uppercase px-1.5 py-0 ${p.status === "ACTIVE" ? "text-emerald-500 border-emerald-500/30" : "text-muted-foreground"}`}>
                      {p.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeSection === "COUPONS" && (
          <div className="divide-y divide-border/40 border border-border/40 rounded-lg overflow-hidden">
            {loadingCoupons ? (
              <TableSkeletonRows count={3} />
            ) : coupons.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Nenhum cupom cadastrado no AbacatePay.</div>
            ) : (
              coupons.map((c, index) => (
                <div
                  key={c.id}
                  className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-[11px] font-semibold text-muted-foreground w-6 text-center shrink-0">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground text-xs">{c.code}</span>
                        <Badge variant="outline" className="text-[9px] font-mono px-1.5 py-0 text-muted-foreground">
                          {c.discountKind === "PERCENTAGE" ? `${c.discount / 100}% OFF` : formatBRL(c.discount)}
                        </Badge>
                      </div>
                      {c.notes && <p className="text-[11px] text-muted-foreground truncate">{c.notes}</p>}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5 text-right shrink-0">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Usos</span>
                      <span className="font-mono font-semibold text-foreground text-xs">
                        {c.redeemsCount} / {c.maxRedeems === -1 ? "∞" : c.maxRedeems}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleCoupon(c)}
                      disabled={togglingCouponId === c.id}
                      className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                      title="Alternar Status"
                    >
                      {togglingCouponId === c.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : c.isActive ? (
                        <ToggleRight className="size-4 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="size-4 text-muted-foreground" />
                      )}
                      <span className={c.isActive ? "text-emerald-500 font-mono text-[10px]" : "font-mono text-[10px]"}>
                        {c.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setCouponToDelete(c);
                        setIsDeleteCouponOpen(true);
                      }}
                      className="size-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Excluir cupom"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <Dialog open={isCreateCouponOpen} onOpenChange={setIsCreateCouponOpen}>
        <DialogContent className="sm:max-w-md rounded-xl! p-5 bg-card border-border/60 shadow-none">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base font-bold tracking-tight text-foreground">Novo Cupom</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Cadastre um código promocional para checkouts do AbacatePay.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCoupon} className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Código</Label>
              <Input
                placeholder="Ex: BLACKFRIDAY"
                value={couponForm.code}
                onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                required
                className="h-8 text-xs font-mono uppercase bg-background rounded-lg border-border"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Tipo</Label>
                <Select
                  value={couponForm.discountKind}
                  onValueChange={(val: any) => setCouponForm((f) => ({ ...f, discountKind: val }))}
                >
                  <SelectTrigger className="h-8 text-xs w-full bg-background rounded-lg border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="PERCENTAGE" className="text-xs">Porcentagem (%)</SelectItem>
                    <SelectItem value="FIXED" className="text-xs">Fixo em Reais (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">
                  Valor {couponForm.discountKind === "PERCENTAGE" ? "(%)" : "(R$)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.1"
                  max={couponForm.discountKind === "PERCENTAGE" ? "100" : undefined}
                  value={couponForm.discount}
                  onChange={(e) => setCouponForm((f) => ({ ...f, discount: e.target.value }))}
                  required
                  className="h-8 text-xs bg-background rounded-lg border-border font-mono font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Limite de Resgates (-1 = ilimitado)</Label>
              <Input
                type="number"
                value={couponForm.maxRedeems}
                onChange={(e) => setCouponForm((f) => ({ ...f, maxRedeems: e.target.value }))}
                required
                className="h-8 text-xs bg-background rounded-lg border-border font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-muted-foreground">Descrição (opcional)</Label>
              <Input
                placeholder="Ex: Campanha de lançamento"
                value={couponForm.notes}
                onChange={(e) => setCouponForm((f) => ({ ...f, notes: e.target.value }))}
                className="h-8 text-xs bg-background rounded-lg border-border"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateCouponOpen(false)}
                className="h-8 text-xs rounded-lg border-border cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingCoupon}
                className="h-8 text-xs rounded-lg gap-1.5 font-medium cursor-pointer"
              >
                {isSubmittingCoupon ? <Loader2 className="size-3.5 animate-spin" /> : null}
                <span>{isSubmittingCoupon ? "Criando..." : "Salvar Cupom"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteCouponOpen}
        onOpenChange={(open) => {
          if (!isDeletingCoupon) setIsDeleteCouponOpen(open);
        }}
      >
        <AlertDialogContent className="rounded-xl p-5 bg-card border-border/60 shadow-none sm:max-w-md">
          <AlertDialogHeader className="space-y-1">
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Excluir Cupom {couponToDelete?.code}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              O cupom <strong className="text-foreground">{couponToDelete?.code}</strong> será removido permanentemente do
              AbacatePay e não poderá mais ser utilizado em novos pagamentos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2 gap-2">
            <AlertDialogCancel disabled={isDeletingCoupon} className="h-8 text-xs rounded-lg border-border" autoFocus>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCoupon();
              }}
              disabled={isDeletingCoupon}
              className="h-8 text-xs rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5 font-medium cursor-pointer"
            >
              {isDeletingCoupon ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              <span>{isDeletingCoupon ? "Excluindo..." : "Sim, excluir"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TableSkeletonRows({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-border/40">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="p-3 sm:px-4 flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="size-6 rounded-md bg-muted shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-44 rounded bg-muted" />
              <Skeleton className="h-3 w-28 rounded bg-muted" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-16 rounded bg-muted" />
            <Skeleton className="size-6 rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function AbacatePayMetricsSkeleton() {
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
