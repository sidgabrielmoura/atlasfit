"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Wallet,
  ArrowUpRight,
  ArrowRight,
  ArrowDownLeft,
  ShieldCheck,
  Send,
  PlusCircle,
  RefreshCw,
  Eye,
  EyeOff,
  Zap,
  Mail,
  Receipt,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  Clock,
  XCircle,
  CheckCircle2
} from "lucide-react";
import { WalletOnboardingModal } from "@/components/application/wallet-onboarding-modal";
import { WalletWithdrawModal } from "@/components/application/wallet-withdraw-modal";
import { StudentChargeModal } from "@/components/application/student-charge-modal";
import { centsToCurrencyString } from "@/modules/payments/domain/fee-calculator";
import { useAbly } from "@/providers/ably-provider";

interface WalletAccountData {
  id: string;
  status: string;
  legalNameMasked?: string;
  documentLast4?: string;
  balanceSnapshots: Array<{
    availableAmountInCents: string | number;
    pendingAmountInCents: string | number;
    blockedAmountInCents: string | number;
  }>;
  billings: Array<{
    id: string;
    title: string;
    grossAmountInCents: string | number;
    personalNetEstimatedInCents: string | number;
    status: string;
    paymentMethod: string;
    createdAt: string;
  }>;
  payouts: Array<{
    id: string;
    amountInCents: string | number;
    destinationMasked?: string;
    status: string;
    requestedAt: string;
  }>;
}

interface TransactionItem {
  id: string;
  itemType: "BILLING" | "PAYOUT";
  title: string;
  subtitle?: string;
  studentName?: string;
  amountInCents: string;
  netAmountInCents?: string;
  status: string;
  paymentMethod?: string;
  createdAt: string;
  destinationMasked?: string;
  hostedInvoiceUrl?: string;
  billingReference?: string;
}

export default function PersonalWalletPage() {
  const { data: session } = useSession();
  const ablyClient = useAbly();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const [accountData, setAccountData] = useState<WalletAccountData | null>(null);
  const [hasWallet, setHasWallet] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isChargeOpen, setIsChargeOpen] = useState(false);

  // Estados de Transações e Paginação
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "BILLING" | "PAYOUT">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "CANCELLED">("ALL");
  const [methodFilter, setMethodFilter] = useState<"ALL" | "PIX" | "CREDIT_CARD">("ALL");

  const fetchWalletOverview = async () => {
    try {
      const res = await fetch("/api/personal/wallet/account");
      if (res.ok) {
        const json = await res.json();
        if (json.hasWallet && json.account) {
          setAccountData(json.account);
          setHasWallet(true);
          setIsLocked(false);
        } else {
          setHasWallet(false);
          setIsLocked(false);
        }
      } else if (res.status === 403) {
        setIsLocked(true);
      }
    } catch {
      toast.error("Erro ao carregar dados da carteira");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = useCallback(async (
    currentPage: number,
    search: string,
    type: string,
    status: string,
    method: string
  ) => {
    setTxLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(currentPage),
        pageSize: "15",
        search,
        type,
        status,
        method
      });
      const res = await fetch(`/api/personal/wallet/transactions?${query.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.transactions || []);
        setTotalPages(json.pagination?.totalPages || 1);
        setTotalItems(json.pagination?.totalItems || 0);
      } else {
        toast.error("Falha ao carregar lista de transações.");
      }
    } catch {
      toast.error("Erro na busca de transações.");
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWalletOverview();
  }, []);

  useEffect(() => {
    if (hasWallet) {
      fetchTransactions(page, searchQuery, typeFilter, statusFilter, methodFilter);
    }
  }, [hasWallet, page, searchQuery, typeFilter, statusFilter, methodFilter, fetchTransactions]);

  useEffect(() => {
    if (!ablyClient || !session?.user?.id) return;

    const userChannel = ablyClient.channels.get(`user:${session.user.id}`);

    const handleWalletUpdate = () => {
      toast.success("Saldo atualizado em tempo real!", {
        description: "Os dados da sua carteira foram sincronizados via Ably."
      });
      fetchWalletOverview();
      fetchTransactions(page, searchQuery, typeFilter, statusFilter, methodFilter);
    };

    userChannel.subscribe("wallet:updated", handleWalletUpdate);

    return () => {
      userChannel.unsubscribe("wallet:updated", handleWalletUpdate);
    };
  }, [ablyClient, session?.user?.id, page, searchQuery, typeFilter, statusFilter, methodFilter, fetchTransactions]);

  const handleSyncBalance = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/personal/wallet/account/sync", {
        method: "POST"
      });
      if (res.ok) {
        toast.success("Saldo e lançamentos sincronizados com o Asaas!");
        await fetchWalletOverview();
        await fetchTransactions(page, searchQuery, typeFilter, statusFilter, methodFilter);
      } else {
        toast.error("Falha ao sincronizar com o parceiro bancário");
      }
    } catch {
      toast.error("Erro na sincronização financeira");
    } finally {
      setSyncing(false);
    }
  };

  const handleResendEmail = async () => {
    setSendingEmail(true);
    try {
      const res = await fetch("/api/personal/wallet/resend-email", {
        method: "POST"
      });
      if (res.ok) {
        toast.success("E-mail de ativação reenviado com sucesso!");
      } else {
        toast.error("Não foi possível reenviar o e-mail.");
      }
    } catch {
      toast.error("Erro ao reenviar e-mail de ativação.");
    } finally {
      setSendingEmail(false);
    }
  };

  const latestSnapshot = accountData?.balanceSnapshots?.[0];
  const availableCents = latestSnapshot ? BigInt(latestSnapshot.availableAmountInCents) : BigInt(0);
  const pendingCents = latestSnapshot ? BigInt(latestSnapshot.pendingAmountInCents) : BigInt(0);

  const totalBilledCents = accountData?.billings?.reduce(
    (acc, item) => acc + BigInt(item.personalNetEstimatedInCents || 0),
    BigInt(0)
  ) || BigInt(0);

  const totalPayoutsCents = accountData?.payouts?.reduce(
    (acc, item) => acc + BigInt(item.amountInCents || 0),
    BigInt(0)
  ) || BigInt(0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setPage(1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48 bg-muted rounded-2xl" />
          <Skeleton className="h-10 w-32 bg-muted rounded-2xl" />
        </div>
        <Skeleton className="h-72 bg-muted rounded-3xl" />
        <Skeleton className="h-64 bg-muted rounded-3xl" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-[1400px] mx-auto select-none bg-background min-h-screen">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">
              <Wallet className="size-4" />
              Atlas Pay • BaaS
            </div>
            <h2 className="text-3xl font-black tracking-tight text-foreground">Atlas Pay</h2>
            <p className="text-muted-foreground text-sm font-medium mt-1">
              Sua conta digital própria de recebimentos e mensalidades.
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-8 md:p-12 shadow-xl space-y-6">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 size-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted border border-border text-foreground">
              Área Exclusiva para Assinantes
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-foreground">
              Sua conta bancária própria para cobrar alunos.
            </h2>
            <p className="text-sm md:text-md text-muted-foreground leading-relaxed font-medium">
              Cobre mensalidades de alunos com split automático, gere Pix instantâneo e transfira seus saldos diretamente para qualquer chave Pix de sua titularidade. Ative uma assinatura para liberar seu cadastro financeiro.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 cursor-pointer"
              >
                <a href="/personal/subscription">
                  Ativar Assinatura e Desbloquear
                  <ArrowRight className="size-4 ml-2" />
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 px-6 rounded-xl border-border bg-background hover:bg-muted text-foreground font-bold text-xs uppercase tracking-wider"
              >
                <a href="/personal/subscription">Conhecer Planos</a>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-card border-border p-6 rounded-3xl space-y-3 text-card-foreground">
            <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Zap className="size-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Split Automático de Taxas</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              As tarifas da plataforma são deduzidas no momento da cobrança, enviando seu valor líquido limpo para sua carteira.
            </p>
          </Card>

          <Card className="bg-card border-border p-6 rounded-3xl space-y-3 text-card-foreground">
            <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Send className="size-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Saques Pix em 1 Clique</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Transfira seu saldo disponível a qualquer hora para a chave Pix de sua preferência sem taxas de custódia adicionais.
            </p>
          </Card>

          <Card className="bg-card border-border p-6 rounded-3xl space-y-3 text-card-foreground">
            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="size-5" />
            </div>
            <h3 className="text-base font-bold text-foreground">Regulação BaaS Asaas</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Infraestrutura regulada pelo Banco Central com isolamento total de patrimônio e relatórios de conciliação.
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-[1400px] mx-auto select-none bg-background min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black tracking-tight text-foreground">Atlas Pay</h2>
            {accountData?.status === "APPROVED" ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Ativa
              </Badge>
            ) : accountData ? (
              <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                Em Análise
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Gestão financeira de mensalidades, faturamentos e transferências Pix.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasWallet && (
            <>
              {accountData?.status !== "APPROVED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendEmail}
                  disabled={sendingEmail}
                  className="h-10 text-xs gap-2 font-semibold text-primary bg-primary/10 border-primary/20 hover:bg-primary/20 rounded-xl"
                >
                  <Mail className={`size-4`} />
                  <span>E-mail de Ativação</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncBalance}
                disabled={syncing}
                className="h-10 text-xs gap-2 font-medium bg-background border-border text-foreground hover:bg-muted rounded-xl cursor-pointer"
              >
                <RefreshCw className={`size-4 ${syncing ? "animate-spin text-primary" : ""}`} />
                <span>{syncing ? "Sincronizando" : "Sincronizar"}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {!hasWallet ? (
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-background to-primary/10 text-card-foreground p-8 md:p-12 shadow-xl space-y-6">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-muted border border-border text-foreground">
              Ativação instantânea
            </span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-foreground">
              Sua conta financeira própria para receber dos alunos.
            </h2>
            <p className="text-sm md:text-md text-muted-foreground leading-relaxed font-medium">
              Cobre mensalidades no cartão ou Pix com split automático de taxas. Transfira seus recebimentos a qualquer momento via Pix para sua conta pessoal.
            </p>
          </div>

          <div className="relative z-10 pt-2">
            <Button
              size="lg"
              onClick={() => setIsOnboardingOpen(true)}
              className="h-12 px-8 text-sm font-bold gap-2 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer"
            >
              <span>Ativar Minha Carteira</span>
              <ArrowUpRight className="size-5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-background to-primary/10 text-card-foreground p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
              <div className="absolute top-0 right-0 -mt-12 -mr-12 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                  Saldo Total Consolidado
                </span>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-xl bg-background border border-border cursor-pointer"
                >
                  {showBalance ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <div className="relative z-10">
                <span className="text-4xl sm:text-6xl font-black tracking-tight text-foreground block">
                  {showBalance ? centsToCurrencyString(availableCents + pendingCents) : "R$ ••••••••"}
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-4 pt-6 border-t border-border">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                    Disponível p/ Saque
                  </span>
                  <span className="text-lg sm:text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {showBalance ? centsToCurrencyString(availableCents) : "R$ ••••••"}
                  </span>
                </div>

                <div>
                  <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                    A Liberar (Pendente)
                  </span>
                  <span className="text-lg sm:text-2xl font-extrabold text-foreground mt-1 block">
                    {showBalance ? centsToCurrencyString(pendingCents) : "R$ ••••••"}
                  </span>
                </div>
              </div>

              <div className="relative z-10 flex flex-wrap items-center gap-3 pt-2">
                <Button
                  size="sm"
                  onClick={() => setIsWithdrawOpen(true)}
                  disabled={availableCents <= BigInt(0)}
                  className="h-11 px-6 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
                >
                  <Send className="size-4" />
                  <span>Sacar via Pix</span>
                </Button>

                <Button
                  size="sm"
                  onClick={() => setIsChargeOpen(true)}
                  className="h-11 px-6 text-xs font-bold gap-2 bg-card hover:bg-muted text-card-foreground border border-border rounded-xl cursor-pointer"
                >
                  <PlusCircle className="size-4 text-primary" />
                  <span>Cobrar Aluno</span>
                </Button>
              </div>
            </div>

            <div className="lg:col-span-4 relative overflow-hidden rounded-3xl border border-border bg-card text-card-foreground p-6 shadow-xl flex flex-col justify-between min-h-[260px]">
              <div className="absolute top-0 right-0 size-48 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-start relative z-10">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest block">
                    Conta Digital Regulada
                  </span>
                  <h4 className="text-base font-extrabold text-foreground tracking-tight">
                    {accountData?.legalNameMasked || session?.user?.name || "Personal Trainer"}
                  </h4>
                </div>
                <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                  <ShieldCheck className="size-5" />
                </div>
              </div>

              <div className="relative z-10 my-3 space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Documento Titular</span>
                  <span className="font-mono font-bold text-foreground">•••• {accountData?.documentLast4 || "8160"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-border">
                  <span className="text-muted-foreground">Status BaaS KYC</span>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Aprovado
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted-foreground">Liquidação Pix</span>
                  <span className="font-bold text-primary">Instantânea</span>
                </div>
              </div>

              <div className="flex justify-between items-end relative z-10 text-[10px] text-muted-foreground border-t border-border pt-3">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">Infraestrutura Asaas</span>
                <span className="font-black tracking-widest text-xs text-primary">ATLAS PAY</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-card border-border p-5 rounded-2xl text-card-foreground">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Faturado
              </span>
              <span className="text-xl font-extrabold text-foreground mt-1.5 block">
                {centsToCurrencyString(totalBilledCents)}
              </span>
            </Card>

            <Card className="bg-card border-border p-5 rounded-2xl text-card-foreground">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Total Sacado
              </span>
              <span className="text-xl font-extrabold text-primary mt-1.5 block">
                {centsToCurrencyString(totalPayoutsCents)}
              </span>
            </Card>

            <Card className="bg-card border-border p-5 rounded-2xl text-card-foreground">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Segurança Bancária
              </span>
              <span className="text-xs font-bold text-primary mt-2 flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" /> Subconta Regulada BaaS
              </span>
            </Card>
          </div>

          {/* Seção Paginada e Filtrada de Transações */}
          <Card className="bg-card p-0 border-border rounded-3xl overflow-hidden text-card-foreground shadow-xl">
            <div className="p-6 space-y-4 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Receipt className="size-5 text-primary" /> Histórico de Transações Paginado
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Exibindo 15 movimentações por página com filtros avançados e busca em tempo real.
                  </p>
                </div>

                <Badge variant="outline" className="w-fit bg-primary/10 border-primary/20 text-primary text-xs font-bold px-3 py-1 rounded-xl">
                  {totalItems} {totalItems === 1 ? "transação encontrada" : "transações encontradas"}
                </Badge>
              </div>

              {/* Barra de Busca e Filtros */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                <div className="sm:col-span-5 relative">
                  <Input
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Buscar aluno, título ou chave Pix..."
                    className="h-10 text-xs pl-9 pr-8 bg-background border-input text-foreground rounded-xl"
                  />
                  <Search className="size-4 text-muted-foreground absolute left-3 top-3 pointer-events-none" />
                  {searchQuery && (
                    <button
                      onClick={handleClearSearch}
                      className="absolute right-2.5 top-2.5 p-0.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors cursor-pointer"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-7 flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                  <div className="flex-1 min-w-[120px]">
                    <Select
                      value={typeFilter}
                      onValueChange={(val) => {
                        setTypeFilter(val as "ALL" | "BILLING" | "PAYOUT");
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs w-full bg-background border-input text-foreground rounded-xl">
                        <div className="flex items-center gap-1.5 truncate">
                          <Filter className="size-3.5 text-muted-foreground shrink-0" />
                          <SelectValue placeholder="Tipo" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="ALL">Todos os Tipos</SelectItem>
                        <SelectItem value="BILLING">Apenas Cobranças (+)</SelectItem>
                        <SelectItem value="PAYOUT">Apenas Saques (-)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[120px]">
                    <Select
                      value={statusFilter}
                      onValueChange={(val) => {
                        setStatusFilter(val as "ALL" | "PAID" | "PENDING" | "CANCELLED");
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs w-full bg-background border-input text-foreground rounded-xl">
                        <div className="flex items-center gap-1.5 truncate">
                          <SlidersHorizontal className="size-3.5 text-muted-foreground shrink-0" />
                          <SelectValue placeholder="Status" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="ALL">Todos os Status</SelectItem>
                        <SelectItem value="PAID">Pagos / Concluídos</SelectItem>
                        <SelectItem value="PENDING">Pendentes / Processando</SelectItem>
                        <SelectItem value="CANCELLED">Cancelados / Falhou</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[120px]">
                    <Select
                      value={methodFilter}
                      onValueChange={(val) => {
                        setMethodFilter(val as "ALL" | "PIX" | "CREDIT_CARD");
                        setPage(1);
                      }}
                    >
                      <SelectTrigger className="h-10 text-xs w-full bg-background border-input text-foreground rounded-xl">
                        <SelectValue placeholder="Método" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border text-popover-foreground">
                        <SelectItem value="ALL">Todos os Métodos</SelectItem>
                        <SelectItem value="PIX">Pix</SelectItem>
                        <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Lista de Transações com Skeleton Loader */}
            <div className="divide-y divide-border min-h-[300px]">
              {txLoading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-10 rounded-xl bg-muted" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-40 sm:w-60 bg-muted rounded-md" />
                          <Skeleton className="h-3 w-28 bg-muted rounded-md" />
                        </div>
                      </div>
                      <div className="space-y-1.5 text-right">
                        <Skeleton className="h-4 w-20 bg-muted rounded-md ml-auto" />
                        <Skeleton className="h-3 w-12 bg-muted rounded-md ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-3">
                  <div className="size-12 rounded-2xl bg-muted border border-border mx-auto flex items-center justify-center text-muted-foreground">
                    <Receipt className="size-6" />
                  </div>
                  <h4 className="text-sm font-bold text-foreground">Nenhuma transação encontrada</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Não encontramos movimentações para os filtros selecionados. Tente ajustar os parâmetros de busca.
                  </p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const statusUpper = (tx.status || "").toUpperCase();
                  const isBilling = tx.itemType === "BILLING";
                  const isPaid = statusUpper === "SETTLED" || statusUpper === "CONFIRMED" || statusUpper === "COMPLETED";
                  const isPending = statusUpper === "PENDING" || statusUpper === "PROCESSING" || statusUpper === "SUBMITTED" || statusUpper === "AWAITING_RISK_ANALYSIS";
                  const isCancelled = statusUpper === "CANCELLED" || statusUpper === "FAILED" || statusUpper === "REJECTED" || statusUpper === "REFUNDED";

                  let icon = <ArrowDownLeft className="size-5" />;
                  let containerClass = "bg-primary/10 border-primary/20 text-primary";
                  let amountClass = "text-foreground";
                  let sign = "+";
                  let statusLabel = tx.status;

                  if (isBilling) {
                    if (isPaid) {
                      icon = <ArrowDownLeft className="size-5" />;
                      containerClass = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400";
                      amountClass = "text-emerald-600 dark:text-emerald-400";
                      sign = "+";
                      statusLabel = "Pago";
                    } else if (isPending) {
                      icon = <Clock className="size-5" />;
                      containerClass = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
                      amountClass = "text-foreground";
                      sign = "+";
                      statusLabel = "Pendente";
                    } else if (isCancelled) {
                      icon = <XCircle className="size-5" />;
                      containerClass = "bg-destructive/10 border-destructive/20 text-destructive";
                      amountClass = "text-muted-foreground line-through";
                      sign = "+";
                      statusLabel = "Cancelado";
                    }
                  } else {
                    if (isPending) {
                      icon = <Clock className="size-5" />;
                      containerClass = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400";
                      amountClass = "text-foreground";
                      sign = "-";
                      statusLabel = "Em Processamento";
                    } else if (isCancelled) {
                      icon = <XCircle className="size-5" />;
                      containerClass = "bg-destructive/10 border-destructive/20 text-destructive";
                      amountClass = "text-muted-foreground line-through";
                      sign = "-";
                      statusLabel = "Cancelado";
                    } else {
                      icon = <ArrowUpRight className="size-5" />;
                      containerClass = "bg-muted border-border text-foreground";
                      amountClass = "text-foreground";
                      sign = "-";
                      statusLabel = "Concluído";
                    }
                  }

                  return (
                    <div
                      key={tx.id}
                      className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`size-10 rounded-xl border flex items-center justify-center shrink-0 ${containerClass}`}
                        >
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-foreground block truncate">{tx.title}</span>
                          <span className="text-[10px] text-muted-foreground block mt-0.5 truncate">
                            {new Date(tx.createdAt).toLocaleDateString("pt-BR")} às{" "}
                            {new Date(tx.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                            {tx.paymentMethod ? ` • ${tx.paymentMethod}` : ""}
                            {` • ${statusLabel}`}
                            {tx.subtitle && !tx.subtitle.includes("Aluno: Aluno") ? ` • ${tx.subtitle}` : ""}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs sm:text-sm font-extrabold block ${amountClass}`}>
                          {sign} {centsToCurrencyString(BigInt(tx.netAmountInCents || tx.amountInCents))}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Rodapé de Paginação Completa (15 por página) */}
            <div className="p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-muted/30">
              <div className="text-xs text-muted-foreground text-center sm:text-left">
                Página <span className="font-bold text-foreground">{page}</span> de{" "}
                <span className="font-bold text-foreground">{totalPages}</span> • Total de{" "}
                <span className="font-bold text-foreground">{totalItems}</span> movimentações (15 por página)
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || txLoading}
                  className="h-9 px-3 text-xs gap-1.5 border-border bg-background hover:bg-muted text-foreground rounded-xl cursor-pointer"
                >
                  <ChevronLeft className="size-4" />
                  <span>Anterior</span>
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .map((p, index, array) => {
                      const showEllipsis = index > 0 && p - array[index - 1] > 1;
                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && <span className="text-xs text-muted-foreground px-1">...</span>}
                          <button
                            onClick={() => setPage(p)}
                            disabled={txLoading}
                            className={`size-8 text-xs font-bold rounded-lg transition-colors cursor-pointer ${page === p
                              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                              : "bg-background text-foreground border border-border hover:bg-muted"
                              }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || txLoading}
                  className="h-9 px-3 text-xs gap-1.5 border-border bg-background hover:bg-muted text-foreground rounded-xl cursor-pointer"
                >
                  <span>Próximo</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <WalletOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={fetchWalletOverview}
        userEmail={session?.user?.email || ""}
        userName={session?.user?.name || ""}
      />

      <WalletWithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={fetchWalletOverview}
        availableBalanceInCents={availableCents}
      />

      <StudentChargeModal
        isOpen={isChargeOpen}
        onClose={() => setIsChargeOpen(false)}
        onSuccess={fetchWalletOverview}
        studentUserId={session?.user?.id || ""}
        studentName="Aluno"
      />
    </div>
  );
}
