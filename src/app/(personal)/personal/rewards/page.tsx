"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Users,
  ArrowUpRight,
  TrendingUp,
  Copy,
  CheckCircle2,
  Wallet,
  Calendar,
  Clock,
  ArrowRight,
  Check,
  AlertTriangle,
  HelpCircle,
  QrCode,
  X
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Animated counter for currency
export function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(value * 0.7);

  useEffect(() => {
    setDisplayValue(value * 0.7);

    let startTimestamp: number | null = null;
    const duration = 1200; // 1.2 seconds animation
    const startVal = value * 0.7;
    const endVal = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayValue(startVal + progress * (endVal - startVal));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return (
    <span>
      {displayValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      })}
    </span>
  );
}

// Animated counter for plain numbers
export function AnimatedCounter({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(Math.floor(value * 0.7));

  useEffect(() => {
    setDisplayValue(Math.floor(value * 0.7));

    let startTimestamp: number | null = null;
    const duration = 1200;
    const startVal = Math.floor(value * 0.7);
    const endVal = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayValue(Math.floor(startVal + progress * (endVal - startVal)));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endVal);
      }
    };

    window.requestAnimationFrame(step);
  }, [value]);

  return <span>{displayValue}</span>;
}

function formatCPF(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatCelular(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function RewardsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Payout Dialog States
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF");
  const [requestLoading, setRequestLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<"commissions" | "payouts">("commissions");

  // Earnings simulator state
  const [simulatedCount, setSimulatedCount] = useState(5);

  const handlePixKeyTypeChange = (newType: string) => {
    setPixKeyType(newType);
    setPixKey("");
  };

  const handlePixKeyChange = (val: string) => {
    if (pixKeyType === "CPF") {
      setPixKey(formatCPF(val));
    } else if (pixKeyType === "CELULAR") {
      setPixKey(formatCelular(val));
    } else {
      setPixKey(val);
    }
  };

  const getPixInputConfig = () => {
    switch (pixKeyType) {
      case "CPF":
        return {
          placeholder: "000.000.000-00",
          maxLength: 14,
          inputMode: "numeric" as const,
          type: "text"
        };
      case "CELULAR":
        return {
          placeholder: "(00) 90000-0000",
          maxLength: 15,
          inputMode: "numeric" as const,
          type: "text"
        };
      case "EMAIL":
        return {
          placeholder: "seu@email.com",
          maxLength: undefined,
          inputMode: "email" as const,
          type: "email"
        };
      default:
        return {
          placeholder: "Chave aleatória de 32 caracteres",
          maxLength: undefined,
          inputMode: undefined,
          type: "text"
        };
    }
  };

  const inputConfig = getPixInputConfig();

  const basePrice = data?.simulatorBasePrice || 97.00;
  const commissionPerUser = basePrice * 0.20;

  const fetchData = async () => {
    try {
      const res = await fetch("/api/personal/rewards");
      if (!res.ok) throw new Error("Erro ao carregar dados de indicações.");
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCopyLink = () => {
    if (!data?.referralLink) return;
    navigator.clipboard.writeText(data.referralLink);
    setCopied(true);
    toast.success("Link de indicação copiado! 🚀");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAmount || isNaN(Number(payoutAmount)) || Number(payoutAmount) <= 0) {
      toast.error("Por favor, insira um valor válido de saque.");
      return;
    }

    const value = Number(payoutAmount);
    if (value > (data?.availableBalance || 0)) {
      toast.error("Valor solicitado excede seu saldo disponível.");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Por favor, informe a chave PIX.");
      return;
    }

    setRequestLoading(true);

    try {
      const res = await fetch("/api/personal/rewards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: value,
          pixKey: pixKey.trim(),
          pixKeyType
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Solicitação de saque enviada com sucesso! 💸");
      setIsPayoutOpen(false);
      setPayoutAmount("");
      setPixKey("");

      // Refresh page data
      setLoading(true);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar saque.");
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* 1. Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <TrendingUp className="size-4" />
            Atlas Rewards
          </div>
          <h2 className="text-3xl font-black tracking-tight">Indique e Ganhe</h2>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Convide outros personal trainers e ganhe <strong className="text-primary font-bold">20% recorrente</strong> sob todas as mensalidades ativas deles.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Skeleton className="h-44 rounded-2xl md:col-span-2" />
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : data?.isLocked ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Premium Lock Banner / Hero */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-linear-to-br from-neutral-950 via-neutral-900 to-[#121c54] text-white p-8 md:p-12 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-12 -mr-12 size-96 rounded-full bg-primary/25 blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 -mb-16 -ml-16 size-64 rounded-full bg-indigo-500/10 blur-2xl" />

            <div className="relative z-10 max-w-2xl space-y-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/30 border border-primary/40 text-blue-300">
                🔒 Área Exclusiva para Assinantes
              </span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                Seu link de indicação vale dinheiro real.
              </h2>
              <p className="text-sm md:text-md text-neutral-300 leading-relaxed font-medium">
                No AtlasFit, acreditamos em crescer junto com você. Indique outros personal trainers e receba <strong className="text-white font-bold">20% de comissão recorrente</strong> sobre cada mensalidade paga por eles. Com apenas 5 indicações ativas, você já fatura mais do que o custo do seu plano!
              </p>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button
                  asChild
                  className="h-12 px-6 rounded-xl bg-linear-to-br from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-650 text-white font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-[0_8px_32px_0_rgba(48,82,235,0.3)] border border-white/20 relative overflow-hidden group cursor-pointer"
                >
                  <a href="/personal/subscription">
                    <div className="animate-apple-sweep" />
                    Ativar Assinatura & Desbloquear
                    <ArrowRight className="size-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-12 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-wider"
                >
                  <a href="/personal/subscription">Conhecer Planos</a>
                </Button>
              </div>
            </div>
          </div>

          {/* Simulator & Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Earnings Simulator */}
            <Card className="lg:col-span-2 border-border/40 bg-card/45 backdrop-blur-md relative overflow-hidden p-6 md:p-8 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Simulador de Ganhos</span>
                  <h3 className="text-xl font-black tracking-tight mt-1">Quanto você quer faturar?</h3>
                  <p className="text-xs text-muted-foreground mt-1 font-semibold">
                    Arraste o slider para simular seus ganhos mensais baseados no número de indicações ativas.
                  </p>
                </div>

                <div className="space-y-4 py-6">
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span>Colegas Indicados:</span>
                    <span className="text-primary text-lg font-black">{simulatedCount} personais</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={simulatedCount}
                    onChange={(e) => setSimulatedCount(Number(e.target.value))}
                    className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground font-bold">
                    <span>1</span>
                    <span>25</span>
                    <span>50</span>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Comissão Mensal Estimada</p>
                  <h4 className="text-3xl font-black tracking-tight text-primary mt-1">
                    {(simulatedCount * commissionPerUser).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </h4>
                  <p className="text-[9px] text-muted-foreground font-semibold mt-1">
                    Baseado em comissão de 20% sob o maior plano mensal de {basePrice.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    Recorrência Ativa
                  </span>
                </div>
              </div>
            </Card>

            {/* Benefits Card */}
            <Card className="border-border/40 bg-card/45 backdrop-blur-md relative overflow-hidden p-6 md:p-8 flex flex-col justify-between">
              <div className="space-y-5">
                <h3 className="text-md font-black tracking-tight border-b border-border/40 pb-3">Por que ser afiliado?</h3>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 text-xs font-bold">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Comissão de 20% Recorrente</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-semibold">
                        Você continua recebendo a comissão todos os meses enquanto o indicado mantiver a assinatura ativa.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 text-xs font-bold">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Saques PIX Rápidos</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-semibold">
                        Solicite o resgate diretamente no seu painel. O valor é enviado diretamente para sua conta bancária PIX cadastrada.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 text-xs font-bold">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">AtlasFit Grátis para Você</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed font-semibold">
                        Com apenas 5 indicações, o ganho mensal cobre inteiramente a sua própria assinatura, tornando o AtlasFit gratuito.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Bento Grid Banking Layout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Balance Card - inspired by Premium Banking Apps */}
            <Card className="md:col-span-2 p-0 relative overflow-hidden border border-primary/20 bg-linear-to-br from-neutral-950 via-neutral-900 to-[#101f5e] shadow-xl text-white">
              <div className="absolute top-0 right-0 -mt-8 -mr-8 size-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-12 -ml-12 size-36 rounded-full bg-blue-500/10 blur-2xl" />

              <CardContent className="p-8 h-full flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                      <Wallet className="size-5 text-primary-foreground" />
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">Saldo Disponível</span>
                  </div>
                  <span className="text-[10px] font-black bg-primary/30 border border-primary/40 px-3 py-1 rounded-full uppercase tracking-wider text-blue-300 shadow-sm">
                    Liberado
                  </span>
                </div>

                <div>
                  <h3 className="text-4xl md:text-5xl font-black tracking-tight leading-none">
                    <AnimatedNumber value={data?.availableBalance || 0} />
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-2 font-medium">
                    Pronto para transferir via PIX para sua conta pessoal
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => setIsPayoutOpen(true)}
                    disabled={data?.availableBalance <= 0}
                    className="w-full h-12 rounded-xl bg-white hover:bg-neutral-100 text-black border-none font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-lg shadow-black/30 group cursor-pointer"
                  >
                    Solicitar Resgate PIX
                    <ArrowUpRight className="size-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Total Earned Card */}
            <Card className="border-border/40 bg-card/45 backdrop-blur-md relative overflow-hidden">
              <CardContent className="p-6 h-full flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Acumulado</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <TrendingUp className="size-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight">
                    <AnimatedNumber value={data?.totalEarned || 0} />
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                    Ganhos totais gerados por suas indicações
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Referred Count Card */}
            <Card className="border-border/40 bg-card/45 backdrop-blur-md relative overflow-hidden">
              <CardContent className="p-6 h-full flex flex-col justify-between space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personais Indicados</span>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Users className="size-4" />
                  </div>
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight">
                    <AnimatedCounter value={data?.referredCount || 0} />
                  </h4>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">
                    Contas de personal vinculadas ao seu link
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. Invitation Link Copy Panel */}
          <Card className="border-border/40 bg-card/35 backdrop-blur-lg overflow-hidden">
            <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1 md:max-w-xl">
                <h3 className="text-md font-bold tracking-tight">Seu Link de Afiliado Exclusivo</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Compartilhe seu link exclusivo com outros profissionais nas redes sociais, WhatsApp ou e-mail. Quando eles assinarem qualquer plano do AtlasFit, você começa a faturar!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:max-w-md shrink-0">
                <div className="flex items-center w-full bg-background border border-border/60 rounded-xl p-1 shadow-sm focus-within:border-primary/60 transition-all">
                  <Input
                    readOnly
                    value={data?.referralLink}
                    className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm font-semibold truncate px-3 h-10 w-full"
                  />
                  <Button
                    onClick={handleCopyLink}
                    className={cn(
                      "shrink-0 h-10 px-5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-none border-none cursor-pointer",
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-primary hover:bg-primary/95 text-white"
                    )}
                  >
                    {copied ? (
                      <span className="flex items-center gap-1.5"><Check className="size-3.5" /> Copiado</span>
                    ) : (
                      <span className="flex items-center gap-1.5"><Copy className="size-3.5" /> Copiar</span>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Details Tables */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex gap-2 p-1 bg-secondary/20 rounded-xl">
                <Button
                  variant={activeTab === "commissions" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("commissions")}
                  className={cn(
                    "h-9 px-4 rounded-lg text-xs font-bold cursor-pointer transition-all",
                    activeTab === "commissions" && "bg-background shadow-xs text-primary"
                  )}
                >
                  Histórico de Comissões
                </Button>
                <Button
                  variant={activeTab === "payouts" ? "secondary" : "ghost"}
                  onClick={() => setActiveTab("payouts")}
                  className={cn(
                    "h-9 px-4 rounded-lg text-xs font-bold cursor-pointer transition-all",
                    activeTab === "payouts" && "bg-background shadow-xs text-primary"
                  )}
                >
                  Solicitações de Saque
                </Button>
              </div>
            </div>

            {activeTab === "commissions" ? (
              <Card className="border-border/40 overflow-hidden p-0 space-y-0!">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-secondary/15 border-b border-border/40">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">Personal Convidado</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">E-mail</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">Comissão Gerada</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">Data do Cadastro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {data?.commissions?.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground opacity-60">
                              Nenhuma comissão recebida ainda. Comece indicando personal trainers!
                            </td>
                          </tr>
                        ) : (
                          data?.commissions?.map((comm: any) => {
                            const dateObj = new Date(comm.referred.createdAt);
                            const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            }).format(dateObj);

                            // Mask email for privacy
                            const emailParts = comm.referred.email.split("@");
                            const maskedEmail = emailParts[0].substring(0, 3) + "***@" + emailParts[1];

                            return (
                              <tr key={comm.id} className="hover:bg-secondary/10 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0 border border-primary/20">
                                      PT
                                    </div>
                                    <span className="text-sm font-bold">{comm.referred.name}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                                  {maskedEmail}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-black text-emerald-600">
                                      +{comm.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground font-semibold mt-0.5">
                                      Taxa de {comm.percentage}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                                  {formattedDate}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/40 overflow-hidden p-0 space-y-0!">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-secondary/15 border-b border-border/40">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">Valor Solicitado</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">Destinatário (Chave PIX)</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">Status / Ação</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-nowrap">Data da Solicitação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        {data?.payouts?.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-sm font-medium text-muted-foreground opacity-60">
                              Nenhuma solicitação de resgate PIX realizada.
                            </td>
                          </tr>
                        ) : (
                          data?.payouts?.map((payout: any) => {
                            const dateObj = new Date(payout.createdAt);
                            const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(dateObj);

                            return (
                              <tr key={payout.id} className="hover:bg-secondary/10 transition-colors">
                                <td className="px-6 py-4">
                                  <span className="text-sm font-black text-foreground">
                                    {payout.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">{payout.pixKey}</span>
                                    <span className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">
                                      {payout.pixKeyType}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-start gap-1">
                                    <span className={cn(
                                      "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider",
                                      payout.status === "PAGO" && "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                                      payout.status === "PENDENTE" && "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400",
                                      payout.status === "REJEITADO" && "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                    )}>
                                      {payout.status === "PAGO" ? "Pago" : payout.status === "PENDENTE" ? "Em Análise" : "Recusado"}
                                    </span>
                                    {payout.status === "REJEITADO" && payout.rejectedReason && (
                                      <span className="text-[10px] text-rose-500 max-w-[200px] truncate leading-tight font-medium" title={payout.rejectedReason}>
                                        {payout.rejectedReason}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                                  {formattedDate}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      <Dialog open={isPayoutOpen} onOpenChange={setIsPayoutOpen}>
        <DialogContent className="max-w-lg! rounded-2xl!">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">Solicitar Resgate PIX</DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              Insira seus dados bancários para que possamos realizar a transferência de suas comissões.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRequestPayout} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor do Resgate</Label>
              <div className="relative">
                <span className="absolute left-3.5 top-3 text-sm font-black text-muted-foreground">R$</span>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="1"
                  max={data?.availableBalance || 0}
                  placeholder="0,00"
                  className="pl-9 rounded-xl h-11 border-border/40 focus:border-primary font-bold text-md"
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-semibold">
                Saldo disponível para saque: <strong className="text-primary">{data?.availableBalance?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1 space-y-2 flex flex-col">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo Chave</Label>
                <Select value={pixKeyType} onValueChange={handlePixKeyTypeChange}>
                  <SelectTrigger className="h-12! w-full rounded-xl bg-card border-border/40 text-xs font-bold cursor-pointer">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CELULAR">Celular</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                    <SelectItem value="CHAVE_ALEATORIA">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Chave PIX</Label>
                <Input
                  required
                  type={inputConfig.type}
                  placeholder={inputConfig.placeholder}
                  maxLength={inputConfig.maxLength}
                  inputMode={inputConfig.inputMode}
                  className="rounded-xl h-11 border-border/40 focus:border-primary font-bold text-sm"
                  value={pixKey}
                  onChange={(e) => handlePixKeyChange(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex gap-2">
              <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-neutral-400 font-medium leading-relaxed">
                <strong className="text-white font-semibold">Nota de Segurança:</strong> As transferências são analisadas e liberadas fisicamente pelo superadmin da plataforma para evitar fraudes. O processo pode levar até 24h úteis.
              </p>
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPayoutOpen(false)}
                className="rounded-xl font-bold cursor-pointer"
                disabled={requestLoading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={requestLoading}
                className="rounded-xl h-11 px-6 font-black uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer shadow-lg shadow-primary/10 gap-1.5"
              >
                {requestLoading && <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, ease: "linear", duration: 1 }} className="size-3.5 border-2 border-white/30 border-t-white rounded-full" />}
                {requestLoading ? "Enviando..." : "Confirmar Solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
