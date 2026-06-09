"use client";

import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Plus,
  Copy,
  CheckCircle2,
  Clock,
  Trash2,
  Edit,
  Loader2,
  Search,
  MessageCircle,
  Calendar,
  Filter
} from "lucide-react";
import { workspaceStore } from "@/stores/workspace.store";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-border/50 bg-neutral-950/40">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-32 bg-neutral-800" />
              <Skeleton className="size-8 rounded-full bg-neutral-800" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-24 bg-neutral-800" />
              <Skeleton className="h-3 w-36 bg-neutral-800" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Revenue Chart Skeleton */}
          <Card className="border-border/50 bg-neutral-950/40">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-48 bg-neutral-800" />
              <Skeleton className="h-4 w-72 bg-neutral-800" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-xl bg-neutral-800" />
            </CardContent>
          </Card>

          {/* Recent Payments Skeleton */}
          <Card className="border-border/50 bg-neutral-950/40">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-48 bg-neutral-800" />
              <Skeleton className="h-4 w-72 bg-neutral-800" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/10">
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-10 rounded-full bg-neutral-800" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32 bg-neutral-800" />
                      <Skeleton className="h-3 w-20 bg-neutral-800" />
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col items-end">
                    <Skeleton className="h-4 w-20 bg-neutral-800" />
                    <Skeleton className="h-4 w-12 bg-neutral-800" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Alerts Widget Skeleton */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-neutral-950/40 h-full">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-32 bg-neutral-800" />
              <Skeleton className="h-4 w-48 bg-neutral-800" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-border/50 space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24 bg-neutral-800" />
                    <Skeleton className="h-4 w-16 bg-neutral-800" />
                  </div>
                  <Skeleton className="h-3 w-32 bg-neutral-800" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 flex-1 rounded-lg bg-neutral-800" />
                    <Skeleton className="h-8 w-8 rounded-lg bg-neutral-800" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  // Loading and data states
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0,
    mrrChange: 12.4,
    avgTicket: 0,
    ticketChange: 4.2,
    activePlans: 0,
    plansChange: 0,
    financialChurn: 0,
    churnChange: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTabFilter, setActiveTabFilter] = useState<"todos" | "pago" | "pendente" | "atrasado">("todos");

  // Payment creation/edit modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Payment form states
  const [studentType, setStudentType] = useState<"registered" | "manual">("registered");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [manualStudentName, setManualStudentName] = useState("");
  const [paymentDescription, setPaymentDescription] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pendente");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [paymentDate, setPaymentDate] = useState("");

  // Deletion confirmation states
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick action states
  const [isUpdatingStatusId, setIsUpdatingStatusId] = useState<string | null>(null);

  // Fetch all finance details from API
  const fetchFinanceData = async () => {
    if (!activeWorkspaceId) return;
    setIsLoading(true);
    try {
      // 1. Fetch overview metrics, chart, and payments
      const overviewRes = await fetch(`/api/personal/finance?workspaceId=${activeWorkspaceId}`);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setMetrics(data.metrics);
        setChartData(data.chartData);
        setRecentPayments(data.recentPayments);
      } else {
        toast.error("Erro ao carregar dados do financeiro.");
      }

      // 2. Fetch students list for dropdown association
      const studentsRes = await fetch(`/api/personal/clients?workspaceId=${activeWorkspaceId}`);
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
      }
    } catch (err) {
      console.error("Fetch finance error:", err);
      toast.error("Erro de conexão ao carregar finanças.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, [activeWorkspaceId]);

  // Open creation modal
  const handleOpenCreateModal = () => {
    setEditingPayment(null);
    setStudentType("registered");
    setSelectedStudentId(students[0]?.id || "");
    setManualStudentName("");
    setPaymentDescription("Mensalidade de Assessoria");
    setPaymentAmount("150.00");
    setPaymentStatus("pendente");
    setPaymentMethod("PIX");
    
    // Set current local date as default in YYYY-MM-DD
    const localDate = new Date();
    const formatted = localDate.toISOString().split("T")[0];
    setPaymentDate(formatted);
    
    setIsPaymentModalOpen(true);
  };

  // Open editing modal
  const handleOpenEditModal = (payment: any) => {
    setEditingPayment(payment);
    
    // Check if the student matches a registered one
    const matchingStudent = students.find((s) => s.name === payment.student);
    if (matchingStudent) {
      setStudentType("registered");
      setSelectedStudentId(matchingStudent.id);
    } else {
      setStudentType("manual");
      setManualStudentName(payment.student);
    }

    setPaymentDescription(payment.plan);
    setPaymentAmount(payment.amount.toString());
    setPaymentStatus(payment.status);
    setPaymentMethod(payment.method);
    setPaymentDate(payment.date.split("T")[0]);
    setIsPaymentModalOpen(true);
  };

  // Save manual receipt
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    const finalStudentName = studentType === "registered"
      ? students.find((s) => s.id === selectedStudentId)?.name || "Aluno Registrado"
      : manualStudentName;

    if (!finalStudentName) {
      toast.error("Preencha o nome do aluno.");
      return;
    }

    if (!paymentDescription || !paymentAmount || !paymentDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setIsSavingPayment(true);
    try {
      if (editingPayment) {
        // Edit existing payment
        const res = await fetch(`/api/personal/finance/payments/${editingPayment.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentName: finalStudentName,
            planName: paymentDescription,
            amount: parseFloat(paymentAmount),
            status: paymentStatus,
            method: paymentMethod,
            createdAt: new Date(`${paymentDate}T12:00:00`), // avoid timezone shifting
          }),
        });

        if (res.ok) {
          toast.success("Receita atualizada com sucesso! 💾");
          setIsPaymentModalOpen(false);
          fetchFinanceData();
        } else {
          const errMsg = await res.text();
          toast.error(errMsg || "Erro ao atualizar receita.");
        }
      } else {
        // Create new payment
        const res = await fetch(`/api/personal/finance/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            studentName: finalStudentName,
            planName: paymentDescription,
            amount: parseFloat(paymentAmount),
            status: paymentStatus,
            method: paymentMethod,
            createdAt: new Date(`${paymentDate}T12:00:00`),
          }),
        });

        if (res.ok) {
          toast.success("Receita registrada com sucesso! 💸");
          setIsPaymentModalOpen(false);
          fetchFinanceData();
        } else {
          const errMsg = await res.text();
          toast.error(errMsg || "Erro ao registrar receita.");
        }
      }
    } catch (err) {
      console.error("Save payment error:", err);
      toast.error("Erro de conexão ao salvar a receita.");
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Open Delete confirmation
  const handleOpenDeleteConfirm = (payment: any) => {
    setPaymentToDelete(payment);
    setIsConfirmDeleteOpen(true);
  };

  // Execute Delete
  const handleDeletePayment = async () => {
    if (!paymentToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/personal/finance/payments/${paymentToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Receita excluída do histórico! 🗑️");
        setIsConfirmDeleteOpen(false);
        setPaymentToDelete(null);
        fetchFinanceData();
      } else {
        const errMsg = await res.text();
        toast.error(errMsg || "Erro ao excluir receita.");
      }
    } catch (err) {
      console.error("Delete payment error:", err);
      toast.error("Erro ao conectar com o servidor para exclusão.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Quick mark payment as paid
  const handleQuickMarkAsPaid = async (paymentId: string) => {
    setIsUpdatingStatusId(paymentId);
    try {
      const res = await fetch(`/api/personal/finance/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pago",
        }),
      });

      if (res.ok) {
        toast.success("Pagamento confirmado com sucesso! 🎉");
        fetchFinanceData();
      } else {
        toast.error("Não foi possível atualizar o status.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão.");
    } finally {
      setIsUpdatingStatusId(null);
    }
  };

  // Launch WhatsApp prefilled reminder
  const handleSendWhatsAppReminder = (payment: any) => {
    // Attempt to lookup student phone number
    const matchingStudent = students.find((s) => s.name === payment.student);
    const phone = matchingStudent?.whatsapp || "";
    
    const formattedDate = new Date(payment.date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });

    const isOverdue = payment.status === "atrasado";
    const amountStr = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(payment.amount);

    const message = isOverdue
      ? `Olá, ${payment.student}! Tudo bem? Passando para te lembrar de forma amigável sobre o vencimento da sua mensalidade da assessoria esportiva no valor de ${amountStr}, que venceu no dia ${formattedDate}. Ficaria muito grato se pudesse verificar. Qualquer dúvida ou se precisar do PIX, me avise! Abração!`
      : `Olá, ${payment.student}! Tudo bem? Passando para lembrar que a mensalidade da sua assessoria esportiva no valor de ${amountStr} vence em ${formattedDate}. Qualquer dúvida estou à disposição. Tenha um ótimo treino!`;

    const cleanedPhone = phone.replace(/\D/g, "");
    
    // Fallback if no phone registered
    if (!cleanedPhone) {
      toast.info("Este aluno não possui WhatsApp cadastrado. O link foi copiado e abrirá o WhatsApp Geral.");
    }

    const whatsappUrl = cleanedPhone
      ? `https://api.whatsapp.com/send?phone=55${cleanedPhone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pago":
        return <Badge className="bg-success/20 text-success hover:bg-success/30 border-none">Pago</Badge>;
      case "pendente":
        return <Badge className="bg-warning/20 text-warning hover:bg-warning/30 border-none">Pendente</Badge>;
      case "atrasado":
        return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30 border-none">Atrasado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter payments list
  const filteredPayments = recentPayments.filter((p) => {
    const matchesSearch =
      p.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.plan.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTabFilter === "todos") return matchesSearch;
    return matchesSearch && p.status === activeTabFilter;
  });

  // Extract critical payment alerts (overdue first, then pending)
  const billingAlerts = recentPayments.filter((p) => p.status === "atrasado" || p.status === "pendente");

  if (!activeWorkspaceId) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-white">Financeiro</h2>
            <Skeleton className="h-4 w-48 bg-neutral-800" />
          </div>
        </div>
        <FinanceSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Financeiro</h2>
          <p className="text-muted-foreground mt-1">
            Gestão manual de receitas e mensalidades de <strong className="text-foreground">{workspaceSnap.activeWorkspace?.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-neutral-800 hover:bg-neutral-900 text-neutral-300 hover:text-white" onClick={() => fetchFinanceData()}>
            <Loader2 className={cn("size-4", isLoading && "animate-spin")} />
            <span>Atualizar</span>
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-white font-semibold" onClick={handleOpenCreateModal}>
            <Plus className="size-4" />
            <span>Registrar Receita</span>
          </Button>
        </div>
      </div>

      {isLoading && recentPayments.length === 0 ? (
        <FinanceSkeleton />
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* Metric Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Receita Recorrente (MRR)</CardTitle>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Faturamento confirmado no mês atual
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <TrendingUp className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avgTicket)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Média por pagamento confirmado
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Alunos Ativos</CardTitle>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <CreditCard className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.activePlans}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Alunos ativos na assessoria
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={item as any}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Inadimplência</CardTitle>
                  <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="size-4 text-destructive" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.financialChurn}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Taxa de pagamentos atrasados
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Grid: Chart & Table vs Alerts Sidebar */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Revenue Chart */}
              <motion.div variants={item as any}>
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Arrecadação</CardTitle>
                    <CardDescription>Visualização dos pagamentos manuais marcados como pagos nos últimos 6 meses.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                          <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                            tickFormatter={(value) => `R$${value}`}
                            dx={-10}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                            itemStyle={{ color: "var(--foreground)" }}
                            formatter={(value: number | any) => [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), "Faturamento"]}
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Comprehensive Controle de Mensalidades List */}
              <motion.div variants={item as any}>
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle>Histórico Geral de Receitas</CardTitle>
                        <CardDescription>Gerencie todos os lançamentos de mensalidades cadastrados.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filter and Search Bar */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por aluno ou serviço..."
                          className="pl-9 bg-neutral-900/50 border-neutral-800"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {(["todos", "pago", "pendente", "atrasado"] as const).map((tab) => (
                          <Button
                            key={tab}
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTabFilter(tab)}
                            className={cn(
                              "text-xs capitalize font-medium px-3 h-9 rounded-lg transition-colors border",
                              activeTabFilter === tab
                                ? "bg-primary text-white border-primary"
                                : "text-muted-foreground border-neutral-800 hover:text-white hover:bg-neutral-900"
                            )}
                          >
                            {tab === "todos" ? "Todos" : tab}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredPayments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-secondary/10">
                          <Filter className="size-8 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium text-muted-foreground">Nenhuma receita encontrada para os filtros atuais.</p>
                        </div>
                      ) : (
                        filteredPayments.map((tx) => (
                          <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-all group relative">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "size-10 rounded-full flex items-center justify-center shrink-0",
                                tx.status === "pago" ? "bg-success/10 text-success" :
                                  tx.status === "atrasado" ? "bg-destructive/10 text-destructive" :
                                    "bg-warning/10 text-warning"
                              )}>
                                {tx.status === "pago" ? <CheckCircle2 className="size-5" /> :
                                  tx.status === "atrasado" ? <AlertCircle className="size-5" /> :
                                    <Clock className="size-5" />}
                              </div>
                              <div>
                                <p className="font-semibold text-sm leading-tight text-white">{tx.student}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">{tx.plan}</p>
                                  <span className="text-[10px] text-neutral-600">•</span>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Calendar className="size-3" />
                                    {new Date(tx.date).toLocaleDateString("pt-BR")}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-bold text-sm text-white">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                </p>
                                <div className="flex items-center justify-end gap-2 mt-1">
                                  <span className="text-[10px] text-muted-foreground uppercase">{tx.method}</span>
                                  {getStatusBadge(tx.status)}
                                </div>
                              </div>

                              {/* Hover Quick Actions */}
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900 p-1 rounded-lg border border-neutral-800 shadow-md">
                                {tx.status !== "pago" && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Marcar como Pago"
                                    className="size-8 hover:bg-success/15 hover:text-success rounded-md text-muted-foreground"
                                    onClick={() => handleQuickMarkAsPaid(tx.id)}
                                    disabled={isUpdatingStatusId === tx.id}
                                  >
                                    {isUpdatingStatusId === tx.id ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="size-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Editar Lançamento"
                                  className="size-8 hover:bg-neutral-800 text-muted-foreground hover:text-white rounded-md"
                                  onClick={() => handleOpenEditModal(tx)}
                                >
                                  <Edit className="size-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Excluir Lançamento"
                                  className="size-8 hover:bg-destructive/15 hover:text-destructive text-muted-foreground rounded-md"
                                  onClick={() => handleOpenDeleteConfirm(tx)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Side: Alerts Widget */}
            <div className="space-y-6">
              <motion.div variants={item as any}>
                <Card className="border-border/50 bg-neutral-950/40">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-5 text-destructive animate-pulse" />
                      <CardTitle>Alertas de Pagamento</CardTitle>
                    </div>
                    <CardDescription>Clientes com pendências financeiras ou mensalidades em atraso.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {billingAlerts.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-xl bg-success/5 border-success/20">
                        <CheckCircle2 className="size-8 text-success mb-2" />
                        <p className="text-sm font-semibold text-success">Tudo em dia!</p>
                        <p className="text-xs text-muted-foreground text-center mt-1">Nenhum pagamento atrasado ou pendente registrado.</p>
                      </div>
                    ) : (
                      billingAlerts.map((alert) => {
                        const isOverdue = alert.status === "atrasado";
                        return (
                          <div
                            key={alert.id}
                            className={cn(
                              "p-4 rounded-xl border space-y-3 bg-neutral-900/60 transition-all hover:bg-neutral-900",
                              isOverdue ? "border-destructive/30 hover:border-destructive/50" : "border-warning/30 hover:border-warning/50"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm text-white">{alert.student}</h4>
                                <p className="text-xs text-muted-foreground mt-0.5">{alert.plan}</p>
                              </div>
                              {getStatusBadge(alert.status)}
                            </div>

                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Vencimento:</span>
                              <span className={cn("font-semibold flex items-center gap-1", isOverdue ? "text-destructive" : "text-warning")}>
                                <Calendar className="size-3" />
                                {new Date(alert.date).toLocaleDateString("pt-BR")}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs border-t border-neutral-800/80 pt-2">
                              <span className="text-muted-foreground">Valor total:</span>
                              <span className="font-bold text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(alert.amount)}
                              </span>
                            </div>

                            <div className="flex gap-2 pt-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs gap-1.5 h-8 border-neutral-800 hover:bg-neutral-800 hover:text-white"
                                onClick={() => handleQuickMarkAsPaid(alert.id)}
                                disabled={isUpdatingStatusId === alert.id}
                              >
                                {isUpdatingStatusId === alert.id ? (
                                  <Loader2 className="size-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-3 text-success" />
                                )}
                                <span>Confirmar Pago</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="px-2.5 h-8 hover:bg-success/10 text-success hover:text-success-foreground border border-success/20 hover:border-success/40"
                                onClick={() => handleSendWhatsAppReminder(alert)}
                              >
                                <MessageCircle className="size-3.5 fill-success/10 text-success" />
                                <span className="sr-only">Enviar WhatsApp</span>
                              </Button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment Create/Edit Dialog */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[480px] bg-neutral-950 border-neutral-800 text-white">
          <form onSubmit={handleSavePayment}>
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-bold">
                {editingPayment ? "Editar Lançamento Financeiro" : "Registrar Nova Receita"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Informe os detalhes do recebimento da assessoria esportiva.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Selector to type or choose student */}
              {!editingPayment && (
                <div className="space-y-2">
                  <Label className="text-xs text-neutral-400">Origem do Aluno</Label>
                  <div className="grid grid-cols-2 gap-2 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button
                      type="button"
                      className={cn("py-1 text-xs font-semibold rounded-md transition-colors", studentType === "registered" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                      onClick={() => setStudentType("registered")}
                    >
                      Aluno do Sistema
                    </button>
                    <button
                      type="button"
                      className={cn("py-1 text-xs font-semibold rounded-md transition-colors", studentType === "manual" ? "bg-primary text-white" : "text-muted-foreground hover:text-white")}
                      onClick={() => setStudentType("manual")}
                    >
                      Preenchimento Manual
                    </button>
                  </div>
                </div>
              )}

              {studentType === "registered" && students.length > 0 && !editingPayment ? (
                <div className="space-y-2">
                  <Label htmlFor="studentSelect" className="text-xs text-neutral-300">Aluno Cadastrado *</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger id="studentSelect" className="w-full bg-neutral-900 border-neutral-800 text-white">
                      <SelectValue placeholder="Selecione o aluno..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.email || "Sem e-mail"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="manualName" className="text-xs text-neutral-300">Nome Completo do Aluno *</Label>
                  <Input
                    id="manualName"
                    placeholder="Ex: Gabriel Moura"
                    className="bg-neutral-900 border-neutral-800 text-white"
                    value={manualStudentName}
                    onChange={(e) => setManualStudentName(e.target.value)}
                    required={studentType === "manual" || editingPayment}
                    disabled={!!editingPayment && studentType === "registered"}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs text-neutral-300">Descrição / Serviço prestado *</Label>
                <Input
                  id="desc"
                  placeholder="Ex: Mensalidade de Treino, Consultoria VIP Premium"
                  className="bg-neutral-900 border-neutral-800 text-white"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs text-neutral-300">Valor (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    className="bg-neutral-900 border-neutral-800 text-white"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs text-neutral-300">Data de Vencimento / Pagamento *</Label>
                  <Input
                    id="date"
                    type="date"
                    className="bg-neutral-900 border-neutral-800 text-white"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statusSelect" className="text-xs text-neutral-300">Status do Pagamento *</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger id="statusSelect" className="w-full bg-neutral-900 border-neutral-800 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                      <SelectItem value="pago">Confirmado (Pago)</SelectItem>
                      <SelectItem value="pendente">Pendente (Aguardando)</SelectItem>
                      <SelectItem value="atrasado">Atrasado (Vencido)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methodSelect" className="text-xs text-neutral-300">Método de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="methodSelect" className="w-full bg-neutral-900 border-neutral-800 text-white">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-neutral-900 border-neutral-800 text-white">
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                      <SelectItem value="DINHEIRO">Dinheiro / Espécie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-neutral-900 pt-4">
              <Button type="button" variant="outline" className="border-neutral-800 text-white hover:bg-neutral-900" onClick={() => setIsPaymentModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingPayment} className="gap-2 bg-primary text-white hover:bg-primary/95 font-semibold">
                {isSavingPayment && <Loader2 className="size-4 animate-spin" />}
                <span>Salvar Receita</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - complying with RULE[confirmationmodals.md] */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[420px] bg-neutral-950 border-neutral-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-lg">
              <Trash2 className="size-5" />
              <span>Excluir Lançamento Financeiro</span>
            </DialogTitle>
            <DialogDescription className="pt-2 text-neutral-400">
              Você tem certeza que deseja excluir o lançamento de <strong className="text-white">{paymentToDelete?.student}</strong> no valor de <strong className="text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentToDelete?.amount || 0)}</strong>?
              <br /><br />
              <span className="text-destructive font-semibold">Esta ação é irreversível e removerá este registro do faturamento e gráficos do financeiro.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0 border-t border-neutral-900 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsConfirmDeleteOpen(false)}
              className="border-neutral-800 text-white hover:bg-neutral-900"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeletePayment}
              className="gap-2 bg-destructive hover:bg-destructive/90 text-white font-semibold"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              <span>Excluir Registro</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
