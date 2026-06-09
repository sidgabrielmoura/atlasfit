"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign,
  Calendar,
  CreditCard,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Receipt,
  QrCode,
  FileText,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Motion animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
} as any;

interface FinanceData {
  status: "Em dia" | "Pendente" | "Expirado";
  nextDue: string;
  activePlan: {
    name: string;
    price: number;
    interval: string;
    checkoutLink: string | null;
  };
  workspace: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
  };
  history: Array<{
    id: string;
    planName: string;
    amount: number;
    status: "pago" | "pendente" | "atrasado";
    method: "PIX" | "BOLETO" | "CREDIT_CARD";
    createdAt: string;
  }>;
}

export default function StudentFinancePage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/finance");
      if (!res.ok) {
        throw new Error("Erro ao buscar dados financeiros do aluno.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar seus dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchFinanceData();
  }, []);

  if (loading) {
    return <StudentFinanceSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-20">
        <AlertTriangle className="size-12 mx-auto text-rose-500 animate-bounce" />
        <h2 className="text-xl font-bold text-white">Falha ao carregar suas finanças</h2>
        <p className="text-neutral-400">{error || "Não conseguimos sincronizar seu status financeiro."}</p>
        <Button onClick={fetchFinanceData} variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // Format Helper
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "PIX":
        return { label: "PIX", icon: QrCode, color: "text-teal-400 bg-teal-400/10" };
      case "BOLETO":
        return { label: "Boleto", icon: FileText, color: "text-amber-400 bg-amber-400/10" };
      case "CREDIT_CARD":
        return { label: "Cartão de Crédito", icon: CreditCard, color: "text-indigo-400 bg-indigo-400/10" };
      default:
        return { label: method, icon: Receipt, color: "text-neutral-400 bg-neutral-400/10" };
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pago":
        return { label: "Pago", variant: "success" as const, class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/25" };
      case "pendente":
        return { label: "Pendente", variant: "warning" as const, class: "bg-amber-500/10 text-amber-400 border-amber-500/25" };
      case "atrasado":
        return { label: "Atrasado", variant: "destructive" as const, class: "bg-rose-500/10 text-rose-400 border-rose-500/25" };
      default:
        return { label: status, variant: "secondary" as const, class: "bg-neutral-500/10 text-neutral-400 border-neutral-500/25" };
    }
  };

  // Days remaining calculation
  const nextDueDate = new Date(data.nextDue);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDueDate.setHours(0, 0, 0, 0);

  const diffTime = nextDueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let dueMessage = "";
  if (diffDays > 1) {
    dueMessage = `Vence em ${diffDays} dias`;
  } else if (diffDays === 1) {
    dueMessage = "Vence amanhã";
  } else if (diffDays === 0) {
    dueMessage = "Vence hoje!";
  } else {
    dueMessage = `Vencido há ${Math.abs(diffDays)} dias`;
  }

  // Get status color configs for overall KPI card
  const getOverallStatusConfig = (status: string) => {
    switch (status) {
      case "Em dia":
        return {
          color: "text-emerald-400",
          glow: "from-emerald-500/20 to-transparent",
          bg: "bg-emerald-500/10 border-emerald-500/20",
          icon: CheckCircle2,
          desc: "Sua assinatura está ativa e regularizada."
        };
      case "Pendente":
        return {
          color: "text-amber-400",
          glow: "from-amber-500/20 to-transparent",
          bg: "bg-amber-500/10 border-amber-500/20",
          icon: Clock,
          desc: "Há um pagamento pendente aguardando conclusão."
        };
      case "Expirado":
      default:
        return {
          color: "text-rose-400",
          glow: "from-rose-500/20 to-transparent",
          bg: "bg-rose-500/10 border-rose-500/20",
          icon: AlertTriangle,
          desc: "Sua assinatura expirou. Regularize para continuar acessando."
        };
    }
  };

  const statusConfig = getOverallStatusConfig(data.status);
  const StatusIcon = statusConfig.icon;

  // Last payment method
  const lastPayment = data.history[0];
  const preferredMethod = lastPayment ? getMethodLabel(lastPayment.method) : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/[0.04] pb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              {data.workspace.name}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Meu Financeiro
          </h1>
          <p className="text-sm text-neutral-400 font-medium">
            Gerencie o status da sua assinatura, próximos vencimentos e histórico de mensalidades.
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Card 1: Status */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden bg-neutral-900/40 border-white/[0.04] rounded-2xl h-full flex flex-col justify-between group hover:border-white/[0.08] transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl rounded-bl-full opacity-30 group-hover:opacity-40 transition-opacity blur-md" />
            <CardHeader className="pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                Status de Assinatura
              </span>
            </CardHeader>
            <CardContent className="pt-0 pb-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className={cn("p-3 rounded-2xl border transition-transform duration-300 group-hover:scale-110", statusConfig.bg)}>
                  <StatusIcon className={cn("size-6", statusConfig.color)} />
                </div>
                <div>
                  <span className={cn("text-2xl font-black tracking-tight block", statusConfig.color)}>
                    {data.status}
                  </span>
                  <span className="text-xs text-neutral-400 font-medium">
                    {statusConfig.desc}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 2: Active Plan */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden bg-neutral-900/40 border-white/[0.04] rounded-2xl h-full flex flex-col justify-between group hover:border-white/[0.08] transition-all duration-300">
            <CardHeader className="pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                Plano Contratado
              </span>
            </CardHeader>
            <CardContent className="pt-0 pb-6 space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-white group-hover:text-primary transition-colors">
                  {data.activePlan.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-neutral-300">
                  {formatBRL(data.activePlan.price)}
                </span>
                <span className="text-xs text-neutral-500 font-medium lowercase">
                  / {data.activePlan.interval}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 3: Next Expiration */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden bg-neutral-900/40 border-white/[0.04] rounded-2xl h-full flex flex-col justify-between group hover:border-white/[0.08] transition-all duration-300">
            <CardHeader className="pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                Próximo Vencimento
              </span>
            </CardHeader>
            <CardContent className="pt-0 pb-6 space-y-2">
              <div className="flex items-center gap-2.5">
                <Calendar className="size-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                <span className="text-2xl font-black tracking-tight text-white">
                  {new Date(data.nextDue).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                  diffDays < 0
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : diffDays <= 3
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-white/[0.04] text-neutral-400 border-white/[0.08]"
                )}>
                  {dueMessage}
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Card 4: Payment Method */}
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden bg-neutral-900/40 border-white/[0.04] rounded-2xl h-full flex flex-col justify-between group hover:border-white/[0.08] transition-all duration-300">
            <CardHeader className="pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500">
                Última Forma de Pagamento
              </span>
            </CardHeader>
            <CardContent className="pt-0 pb-6 space-y-2">
              {preferredMethod ? (
                <div className="flex items-center gap-3">
                  <div className={cn("p-2.5 rounded-xl border border-white/[0.05]", preferredMethod.color)}>
                    <preferredMethod.icon className="size-5" />
                  </div>
                  <div>
                    <span className="text-lg font-black tracking-tight text-white block">
                      {preferredMethod.label}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      Forma de cobrança registrada
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="size-5 text-neutral-600" />
                  <span className="text-sm text-neutral-500 font-bold">
                    Nenhum pagamento registrado
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Checkout and Renewal CTA Action Card */}
      <AnimatePresence mode="wait">
        {data.activePlan.checkoutLink && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden border border-primary/20 bg-linear-to-r from-primary/5 via-neutral-900/40 to-neutral-900/40 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-2xl">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                    Renovação Rápida & Pagamento
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-black text-white">
                  Pronto para realizar o seu pagamento ou renovar o plano?
                </h3>
                <p className="text-xs md:text-sm text-neutral-400 font-medium max-w-2xl leading-relaxed">
                  Evite suspensões e multas mantendo sua assinatura em dia. Clique abaixo para abrir o canal seguro de checkout de forma imediata e simplificada.
                </p>
              </div>
              <Button
                asChild
                className="w-full md:w-auto h-12 px-6 rounded-xl font-bold bg-primary text-black hover:bg-primary/90 flex items-center justify-center gap-2 group transition-all shrink-0 active:scale-95 duration-200"
              >
                <a href={data.activePlan.checkoutLink} target="_blank" rel="noopener noreferrer">
                  Pagar Assinatura <ExternalLink className="size-4 group-hover:translate-x-0.5 transition-transform" />
                </a>
              </Button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payments History section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
          <h2 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
            Histórico de Pagamentos
          </h2>
          <span className="text-xs text-neutral-500 font-black uppercase">
            {data.history.length} {data.history.length === 1 ? "Registro" : "Registros"}
          </span>
        </div>

        {data.history.length === 0 ? (
          <Card className="border border-dashed border-white/[0.06] bg-neutral-900/10 p-12 text-center rounded-2xl space-y-4">
            <Receipt className="size-12 mx-auto text-neutral-700" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Nenhum pagamento registrado</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed font-medium">
                Seu personal trainer ainda não realizou lançamentos financeiros ou cobranças para seu cadastro neste workspace.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-2xl border border-white/[0.04] bg-neutral-900/20">
              <Table>
                <TableHeader className="bg-neutral-900/40 border-b border-white/[0.04]">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-black text-neutral-400 text-xs uppercase py-4">Data</TableHead>
                    <TableHead className="font-black text-neutral-400 text-xs uppercase py-4">Serviço / Plano</TableHead>
                    <TableHead className="font-black text-neutral-400 text-xs uppercase py-4">Valor</TableHead>
                    <TableHead className="font-black text-neutral-400 text-xs uppercase py-4">Forma</TableHead>
                    <TableHead className="font-black text-neutral-400 text-xs uppercase py-4 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.history.map((payment) => {
                    const methodInfo = getMethodLabel(payment.method);
                    const statusInfo = getStatusLabel(payment.status);
                    const MethodIcon = methodInfo.icon;

                    return (
                      <TableRow key={payment.id} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                        <TableCell className="py-4 font-semibold text-neutral-300">
                          {new Date(payment.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="py-4 font-bold text-white">
                          {payment.planName}
                        </TableCell>
                        <TableCell className="py-4 font-black text-neutral-200">
                          {formatBRL(payment.amount)}
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-white/[0.03] text-neutral-400 border border-white/[0.05]">
                            <MethodIcon className="size-3.5 text-neutral-400" />
                            <span>{methodInfo.label}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-right">
                          <Badge className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize shadow-sm", statusInfo.class)}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card-Based List View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {data.history.map((payment) => {
                const methodInfo = getMethodLabel(payment.method);
                const statusInfo = getStatusLabel(payment.status);
                const MethodIcon = methodInfo.icon;

                return (
                  <Card key={payment.id} className="bg-neutral-900/40 border-white/[0.04] rounded-xl p-4 space-y-3 hover:border-white/[0.06] transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-500 font-semibold">
                        {new Date(payment.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                      <Badge className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border capitalize", statusInfo.class)}>
                        {statusInfo.label}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white">
                        {payment.planName}
                      </h4>
                      <p className="text-base font-black text-neutral-200">
                        {formatBRL(payment.amount)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/[0.03]">
                      <div className="inline-flex items-center gap-1.5 text-xs text-neutral-400">
                        <MethodIcon className="size-3.5 text-neutral-500" />
                        <span className="font-semibold">{methodInfo.label}</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Support details */}
      <Card className="bg-white/[0.01] border border-white/[0.04] p-5 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <UserCheck className="size-4 text-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Dúvidas ou Negociações
          </span>
        </div>
        <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
          Para realizar alterações no seu plano, solicitar reembolsos, trocar a data de vencimento recorrente ou negociar mensalidades em atraso, entre em contato direto com seu personal trainer ou com a administração da assessoria.
        </p>
      </Card>
    </div>
  );
}

// Skeleton loading layout for compliance (skelletonsloaders.md)
function StudentFinanceSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-white/[0.04] pb-6">
        <Skeleton className="h-4 w-32 bg-neutral-900" />
        <Skeleton className="h-8 w-64 bg-neutral-900" />
        <Skeleton className="h-4 w-96 bg-neutral-900" />
      </div>

      {/* Grid KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32 bg-neutral-900 rounded-2xl" />
        ))}
      </div>

      {/* CTA Card Skeleton */}
      <Skeleton className="h-28 bg-neutral-900 rounded-2xl" />

      {/* Table Title Skeleton */}
      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center border-b border-white/[0.04] pb-3">
          <Skeleton className="h-6 w-48 bg-neutral-900" />
          <Skeleton className="h-4 w-20 bg-neutral-900" />
        </div>

        {/* Table Rows Skeleton */}
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 bg-neutral-900 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
