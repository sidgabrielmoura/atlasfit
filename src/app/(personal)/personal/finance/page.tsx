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
  Filter,
  MoreHorizontal,
  RefreshCw,
  Settings,
  BarChart3,
  ChevronDown
} from "lucide-react";
import { workspaceStore } from "@/stores/workspace.store";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
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
          <Card key={i} className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="size-8 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-24" />
              <Skeleton className="h-3 w-36" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Revenue Chart Skeleton */}
          <Card className="border-border bg-card">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full rounded-xl" />
            </CardContent>
          </Card>

          {/* Recent Payments Skeleton */}
          <Card className="border-border bg-card">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border bg-secondary/10">
                  <div className="flex items-center gap-4">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <div className="space-y-2 flex flex-col items-end">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Alerts Widget Skeleton */}
        <div className="space-y-6">
          <Card className="border-border bg-card h-full">
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                  <div className="flex gap-2 pt-2">
                    <Skeleton className="h-8 flex-1 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
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
  const [isKpisExpanded, setIsKpisExpanded] = useState(false);
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

  // Recurrence states
  const [activeSection, setActiveSection] = useState<"historico" | "recorrencias">("historico");
  const [recurrences, setRecurrences] = useState<any[]>([]);

  // Recurrence editing/configuration modal states
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState(false);
  const [selectedRecurrenceStudent, setSelectedRecurrenceStudent] = useState<any | null>(null);
  const [isSavingRecurrence, setIsSavingRecurrence] = useState(false);
  const [selectedStudentIdForRecurrence, setSelectedStudentIdForRecurrence] = useState("");

  // Recurrence form states
  const [recControlType, setRecControlType] = useState<"MANUAL" | "CONFIRMATION" | "AUTOMATIC">("MANUAL");
  const [recPrice, setRecPrice] = useState("150.00");
  const [recPaymentMethod, setRecPaymentMethod] = useState("PIX");
  const [recPeriodicity, setRecPeriodicity] = useState("MENSAL");
  const [recCustomCount, setRecCustomCount] = useState("1");
  const [recCustomUnit, setRecCustomUnit] = useState("meses");
  const [recDueDay, setRecDueDay] = useState("5");
  const [recFirstDueDate, setRecFirstDueDate] = useState("");
  const [recDescription, setRecDescription] = useState("Mensalidade de Assessoria");
  const [recIsActive, setRecIsActive] = useState(true);

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
      // 1. Fetch overview metrics, chart, payments and recurrences
      const overviewRes = await fetch(`/api/personal/finance?workspaceId=${activeWorkspaceId}`);
      if (overviewRes.ok) {
        const data = await overviewRes.json();
        setMetrics(data.metrics);
        setChartData(data.chartData);
        setRecentPayments(data.recentPayments);
        setRecurrences(data.recurrences || []);
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

  // Open Recurrence Config Modal
  const handleOpenRecurrenceModal = (studentRec: any) => {
    setSelectedRecurrenceStudent(studentRec);
    setRecControlType(studentRec.billingControlType || "MANUAL");
    setRecPrice(studentRec.billingPrice !== null && studentRec.billingPrice !== undefined ? studentRec.billingPrice.toString() : "150.00");
    setRecPaymentMethod(studentRec.billingPaymentMethod || "PIX");
    setRecPeriodicity(studentRec.billingPeriodicity || "MENSAL");
    setRecCustomCount(studentRec.billingCustomIntervalCount?.toString() || "1");
    setRecCustomUnit(studentRec.billingCustomIntervalUnit || "meses");
    setRecDueDay(studentRec.billingDueDay?.toString() || "5");

    const defaultDate = studentRec.billingFirstDueDate
      ? studentRec.billingFirstDueDate.split("T")[0]
      : new Date().toISOString().split("T")[0];
    setRecFirstDueDate(defaultDate);
    setRecDescription(studentRec.billingDescription || "Mensalidade de Assessoria");
    setRecIsActive(studentRec.billingIsActive !== false);
    setIsRecurrenceModalOpen(true);
  };

  const handleOpenCreateRecurrenceModal = () => {
    setSelectedRecurrenceStudent(null);
    setSelectedStudentIdForRecurrence(students[0]?.id || "");
    setRecControlType("AUTOMATIC");
    setRecPrice("150.00");
    setRecPaymentMethod("PIX");
    setRecPeriodicity("MENSAL");
    setRecCustomCount("1");
    setRecCustomUnit("meses");
    setRecDueDay("5");

    const defaultDate = new Date().toISOString().split("T")[0];
    setRecFirstDueDate(defaultDate);
    setRecDescription("Mensalidade de Assessoria");
    setRecIsActive(true);
    setIsRecurrenceModalOpen(true);
  };

  // Save Recurrence Configuration
  const handleSaveRecurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    const targetStudentId = selectedRecurrenceStudent
      ? selectedRecurrenceStudent.studentId
      : selectedStudentIdForRecurrence;

    if (!targetStudentId) {
      toast.error("Selecione um aluno.");
      return;
    }

    setIsSavingRecurrence(true);
    try {
      const res = await fetch(`/api/personal/clients/${targetStudentId}/finance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          billingControlType: recControlType,
          billingPrice: parseFloat(recPrice || "0"),
          billingPeriodicity: recPeriodicity,
          billingCustomIntervalCount: parseInt(recCustomCount || "1"),
          billingCustomIntervalUnit: recCustomUnit,
          billingDueDay: parseInt(recDueDay || "5"),
          billingFirstDueDate: recFirstDueDate ? new Date(`${recFirstDueDate}T12:00:00`) : null,
          billingStartDate: recFirstDueDate ? new Date(`${recFirstDueDate}T12:00:00`) : null,
          billingDescription: recDescription,
          billingPaymentMethod: recPaymentMethod,
          billingIsActive: recIsActive,
        }),
      });

      if (res.ok) {
        toast.success(selectedRecurrenceStudent
          ? `Recorrência de ${selectedRecurrenceStudent.studentName} atualizada com sucesso! 💾`
          : "Configuração de recorrência salva com sucesso! 💾"
        );
        setIsRecurrenceModalOpen(false);
        fetchFinanceData();
      } else {
        const errMsg = await res.text();
        toast.error(errMsg || "Erro ao salvar recorrência.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro de conexão ao salvar recorrência.");
    } finally {
      setIsSavingRecurrence(false);
    }
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
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Financeiro</h2>
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <FinanceSkeleton />
      </div>
    );
  }

  const statusData = [
    { name: "Pago", value: recentPayments.filter(p => p.status === "pago").length, color: "var(--primary)" },
    { name: "Pendente", value: recentPayments.filter(p => p.status === "pendente").length, color: "#eab308" },
    { name: "Atrasado", value: recentPayments.filter(p => p.status === "atrasado").length, color: "#f43f5e" },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-background text-foreground">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Financeiro</h2>
          <p className="text-muted-foreground mt-1">
            Gestão manual de receitas e mensalidades de <strong className="text-foreground">{workspaceSnap.activeWorkspace?.name}</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 border-border hover:bg-secondary text-muted-foreground hover:text-foreground" onClick={() => fetchFinanceData()}>
            <Loader2 className={cn("size-4", isLoading && "animate-spin")} />
            <span>Atualizar</span>
          </Button>
          <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold" onClick={handleOpenCreateModal}>
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
          <Card className="border-border bg-card/40 rounded-2xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" />
                <h3 className="font-bold text-xs sm:text-sm text-foreground uppercase tracking-wider">Métricas Financeiras</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsKpisExpanded(!isKpisExpanded)}
                className="size-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <motion.div
                  animate={{ rotate: isKpisExpanded ? 180 : 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                >
                  <ChevronDown className="size-4" />
                </motion.div>
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <Card className="hover:border-primary/50 p-0 transition-colors bg-background/50 border-border/50">
                <CardHeader className="flex flex-row items-center justify-between pt-3 px-5">
                  <CardTitle className="text-sm font-medium text-muted-foreground truncate">Receita Recorrente (MRR)</CardTitle>
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <DollarSign className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Faturamento do mês
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:border-primary/50 transition-colors bg-background/50 border-border/50 p-0">
                <CardHeader className="flex flex-row items-center justify-between pt-3 px-5">
                  <CardTitle className="text-sm font-medium text-muted-foreground truncate">Ticket Médio</CardTitle>
                  <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="size-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.avgTicket)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Média de pagamento
                  </p>
                </CardContent>
              </Card>
            </div>

            <AnimatePresence>
              {isKpisExpanded && (
                <motion.div
                  key="extra-kpis"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className=""
                >
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      <Card className="hover:border-primary/50 transition-colors bg-background/50 border-border/50 p-0">
                        <CardHeader className="flex flex-row items-center justify-between pt-3 px-5">
                          <CardTitle className="text-sm font-medium text-muted-foreground truncate">Alunos Ativos</CardTitle>
                          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <CreditCard className="size-4 text-primary" />
                          </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5">
                          <div className="text-2xl font-bold">{metrics.activePlans}</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Alunos ativos na assessoria
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      <Card className="hover:border-primary/50 transition-colors bg-background/50 border-border/50 p-0">
                        <CardHeader className="flex flex-row items-center justify-between pt-3 px-5">
                          <CardTitle className="text-sm font-medium text-muted-foreground truncate">Inadimplência</CardTitle>
                          <div className="size-9 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                            <AlertCircle className="size-4 text-destructive" />
                          </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5">
                          <div className="text-2xl font-bold">{metrics.financialChurn}%</div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Taxa de pagamentos atrasados
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          {/* Main Grid: Chart & Table vs Alerts Sidebar */}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2 min-w-0">
              {/* Revenue Chart */}
              <motion.div variants={item as any}>
                <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                  <Tabs defaultValue="arrecadacao" className="w-full">
                    <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 pb-2 gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-base font-bold">Análise de Receita</CardTitle>
                        <CardDescription className="text-xs">Monitore faturamento mensal e status de faturas.</CardDescription>
                      </div>
                      <TabsList className="bg-secondary/15 border border-border/30 rounded-lg p-0.5 h-8 gap-0.5 w-fit shrink-0">
                        <TabsTrigger value="arrecadacao" className="text-[10px] font-bold rounded-md px-3 h-7">Evolução</TabsTrigger>
                        <TabsTrigger value="status" className="text-[10px] font-bold rounded-md px-3 h-7">Status</TabsTrigger>
                      </TabsList>
                    </CardHeader>

                    <CardContent className="p-4 sm:p-6 pt-0">
                      <TabsContent value="arrecadacao" className="outline-none m-0">
                        <div className="h-[250px] w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                                tickMargin={8}
                                className="text-[10px] font-bold text-muted-foreground"
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                width={40}
                                tickFormatter={(value) => `R$ ${value}`}
                                className="text-[10px] font-bold text-muted-foreground"
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
                      </TabsContent>

                      <TabsContent value="status" className="outline-none m-0">
                        <div className="h-[250px] w-full min-w-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                              <XAxis
                                dataKey="name"
                                axisLine={false}
                                tickLine={false}
                                tickMargin={8}
                                className="text-[10px] font-bold text-muted-foreground"
                              />
                              <YAxis
                                axisLine={false}
                                tickLine={false}
                                width={30}
                                className="text-[10px] font-bold text-muted-foreground"
                              />
                              <Tooltip
                                contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                                itemStyle={{ color: "var(--foreground)" }}
                                formatter={(value: number | any) => [value, "Faturas"]}
                              />
                              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                {statusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </TabsContent>
                    </CardContent>
                  </Tabs>
                </Card>
              </motion.div>

              <motion.div variants={item as any}>
                <Card className="border-border bg-card shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="text-lg sm:text-xl">Gestão Financeira & Cobranças</CardTitle>
                        <CardDescription className="text-xs sm:text-sm">Monitore lançamentos de faturas ou gerencie planos de recorrência dos alunos.</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                    <div className="grid grid-cols-2 w-full sm:flex sm:w-fit gap-1 p-1 bg-secondary border border-border rounded-xl">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSection("historico")}
                        className={cn(
                          "text-xs font-bold px-2 sm:px-4 h-8 rounded-lg transition-colors cursor-pointer text-center",
                          activeSection === "historico"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className="hidden sm:inline">Histórico de Lançamentos</span>
                        <span className="inline sm:hidden">Lançamentos</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveSection("recorrencias")}
                        className={cn(
                          "text-xs font-bold px-2 sm:px-4 h-8 rounded-lg transition-colors cursor-pointer text-center",
                          activeSection === "recorrencias"
                            ? "bg-background text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <span className="hidden sm:inline">Controle de Recorrência ({recurrences.length})</span>
                        <span className="inline sm:hidden">Recorrências ({recurrences.length})</span>
                      </Button>
                    </div>

                    {activeSection === "historico" ? (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar por aluno ou serviço..."
                              className="pl-9 bg-background border-border text-foreground"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                            {(["todos", "pago", "pendente", "atrasado"] as const).map((tab) => (
                              <Button
                                key={tab}
                                variant="ghost"
                                size="sm"
                                onClick={() => setActiveTabFilter(tab)}
                                className={cn(
                                  "text-xs capitalize font-medium px-3 h-9 rounded-lg transition-colors border",
                                  activeTabFilter === tab
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "text-muted-foreground border-border hover:text-foreground hover:bg-secondary"
                                )}
                              >
                                {tab === "todos" ? "Todos" : tab}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 max-h-100 overflow-y-auto pr-1 custom-scrollbar">
                          {filteredPayments.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-secondary/10">
                              <Filter className="size-8 text-muted-foreground mb-2" />
                              <p className="text-sm font-medium text-muted-foreground">Nenhuma receita encontrada para os filtros atuais.</p>
                            </div>
                          ) : (
                            filteredPayments.map((tx) => (
                              <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all gap-3 min-w-0">
                                {/* Left: Info & Details */}
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={cn(
                                    "size-10 rounded-full flex items-center justify-center shrink-0 border",
                                    tx.status === "pago" ? "bg-success/10 text-success" :
                                      tx.status === "atrasado" ? "bg-destructive/10 text-destructive" :
                                        "bg-warning/10 text-warning"
                                  )}>
                                    {tx.status === "pago" ? <CheckCircle2 className="size-5" /> :
                                      tx.status === "atrasado" ? <AlertCircle className="size-5" /> :
                                        <Clock className="size-5" />}
                                  </div>
                                  <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <p className="font-semibold text-sm leading-tight text-foreground truncate">{tx.student}</p>
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                      <span className="truncate max-w-[150px]">{tx.plan}</span>
                                      <span className="text-[10px] text-border select-none">•</span>
                                      <span className="flex items-center gap-1 shrink-0">
                                        <Calendar className="size-3" />
                                        {new Date(tx.date).toLocaleDateString("pt-BR")}
                                      </span>
                                      <span className="text-[10px] text-border select-none">•</span>
                                      <span className="uppercase font-bold text-[9px] px-1.5 py-0.5 bg-secondary border border-border rounded shrink-0">{tx.method}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Right: Price, Status Badge & Dropdown */}
                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:ml-auto border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0 shrink-0">
                                  <div className="text-left sm:text-right flex items-center sm:block gap-2 sm:gap-0 w-full sm:w-auto justify-between sm:justify-start">
                                    {/* Mobile price layout */}
                                    <div className="sm:hidden text-left flex items-center gap-2">
                                      <p className="font-bold text-sm text-foreground">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                      </p>
                                      {getStatusBadge(tx.status)}
                                    </div>

                                    {/* Desktop price layout */}
                                    <div className="hidden sm:block">
                                      <p className="font-bold text-sm text-foreground">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                                      </p>
                                      <div className="mt-1 flex justify-end">
                                        {getStatusBadge(tx.status)}
                                      </div>
                                    </div>

                                    {/* Actions button */}
                                    <div className="sm:hidden ml-auto">
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                          >
                                            <MoreHorizontal className="size-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/50">
                                          {tx.status !== "pago" && (
                                            <DropdownMenuItem
                                              onClick={() => handleQuickMarkAsPaid(tx.id)}
                                              disabled={isUpdatingStatusId === tx.id}
                                              className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10"
                                            >
                                              {isUpdatingStatusId === tx.id ? (
                                                <Loader2 className="size-3.5 animate-spin" />
                                              ) : (
                                                <CheckCircle2 className="size-3.5" />
                                              )}
                                              <span>Confirmar Pagamento</span>
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() => handleOpenEditModal(tx)}
                                            className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs"
                                          >
                                            <Edit className="size-3.5 text-primary" />
                                            <span>Editar Lançamento</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => handleOpenDeleteConfirm(tx)}
                                            className="h-9 rounded-lg gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 font-semibold text-xs"
                                          >
                                            <Trash2 className="size-3.5" />
                                            <span>Excluir Lançamento</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>

                                  {/* Desktop-only dropdown trigger */}
                                  <div className="hidden sm:block">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="size-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                                        >
                                          <MoreHorizontal className="size-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/50">
                                        {tx.status !== "pago" && (
                                          <DropdownMenuItem
                                            onClick={() => handleQuickMarkAsPaid(tx.id)}
                                            disabled={isUpdatingStatusId === tx.id}
                                            className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs text-emerald-500 focus:text-emerald-500 focus:bg-emerald-500/10"
                                          >
                                            {isUpdatingStatusId === tx.id ? (
                                              <Loader2 className="size-3.5 animate-spin" />
                                            ) : (
                                              <CheckCircle2 className="size-3.5" />
                                            )}
                                            <span>Confirmar Pagamento</span>
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => handleOpenEditModal(tx)}
                                          className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs"
                                        >
                                          <Edit className="size-3.5 text-primary" />
                                          <span>Editar Lançamento</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleOpenDeleteConfirm(tx)}
                                          className="h-9 rounded-lg gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 font-semibold text-xs"
                                        >
                                          <Trash2 className="size-3.5" />
                                          <span>Excluir Lançamento</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar aluno..."
                              className="pl-9 bg-background border-border text-foreground"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                          </div>
                          <Button
                            onClick={handleOpenCreateRecurrenceModal}
                            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl text-xs h-10 px-4 cursor-pointer shrink-0"
                          >
                            <Plus className="size-4" />
                            <span>Nova Recorrência</span>
                          </Button>
                        </div>

                        <div className="space-y-3 max-h-100 overflow-y-auto pr-1 custom-scrollbar">
                          {recurrences.filter(r => r.studentName.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-xl bg-secondary/10">
                              <RefreshCw className="size-8 text-muted-foreground mb-2" />
                              <p className="text-sm font-medium text-muted-foreground">Nenhum aluno encontrado.</p>
                            </div>
                          ) : (
                            recurrences.filter(r => r.studentName.toLowerCase().includes(searchQuery.toLowerCase())).map((rec) => {
                              const isManual = rec.billingControlType === "MANUAL";
                              const isPaused = !rec.billingIsActive;
                              const isAuto = rec.billingControlType === "AUTOMATIC";
                              const isConfirm = rec.billingControlType === "CONFIRMATION";

                              return (
                                <div key={rec.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 transition-all gap-3 min-w-0">
                                  {/* Left: Icon & Info */}
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                      "size-10 rounded-full flex items-center justify-center shrink-0 border",
                                      isManual ? "bg-zinc-800/40 text-zinc-400 border-zinc-700/50" :
                                        isPaused ? "bg-rose-500/10 text-rose-500 border-rose-500/25" :
                                          isAuto ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/25" :
                                            "bg-amber-500/10 text-amber-500 border-amber-500/25"
                                    )}>
                                      <RefreshCw className={cn("size-5", !isManual && !isPaused && "animate-spin-slow")} />
                                    </div>

                                    <div className="flex-1 min-w-0 space-y-1">
                                      <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm leading-tight text-foreground truncate">{rec.studentName}</p>
                                        {!isManual && (
                                          <span className="flex h-2 w-2 relative shrink-0">
                                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", isPaused ? "bg-rose-400" : "bg-emerald-400")} />
                                            <span className={cn("relative inline-flex rounded-full h-2 w-2", isPaused ? "bg-rose-500" : "bg-emerald-500")} />
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground/90">
                                          {isManual ? "Controle Manual" :
                                            isConfirm ? "Com Confirmação" : "Automática"}
                                        </span>
                                        <span className="text-[10px] text-border select-none">•</span>
                                        {isManual ? (
                                          <span>Sem automação ativa</span>
                                        ) : (
                                          <span className="flex items-center gap-1 shrink-0">
                                            <Calendar className="size-3" />
                                            Próximo: {rec.billingNextDueDate ? new Date(rec.billingNextDueDate).toLocaleDateString("pt-BR") : "--/--/----"}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Right: Actions / Pricing */}
                                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:ml-auto border-t sm:border-t-0 border-border/40 pt-2 sm:pt-0 shrink-0">
                                    {/* Desktop price layout */}
                                    <div className="hidden sm:block text-right">
                                      {!isManual ? (
                                        <>
                                          <p className="font-bold text-sm text-foreground">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.billingPrice || 0)}
                                          </p>
                                          <span className="text-[10px] text-muted-foreground capitalize mt-0.5 block">
                                            {rec.billingPeriodicity?.toLowerCase()}
                                          </span>
                                        </>
                                      ) : (
                                        <p className="text-xs font-semibold text-muted-foreground">Manual</p>
                                      )}
                                    </div>

                                    {/* Mobile bottom row layout */}
                                    <div className="flex items-center justify-between w-full sm:w-auto gap-3">
                                      <div className="sm:hidden text-left">
                                        {!isManual ? (
                                          <p className="font-bold text-sm text-foreground">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.billingPrice || 0)}
                                            <span className="text-[10px] text-muted-foreground capitalize font-normal ml-1">
                                              / {rec.billingPeriodicity?.toLowerCase()}
                                            </span>
                                          </p>
                                        ) : (
                                          <p className="text-xs font-semibold text-muted-foreground">Controle Manual</p>
                                        )}
                                      </div>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenRecurrenceModal(rec)}
                                        className="h-9 gap-1.5 border-border hover:bg-secondary text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl cursor-pointer ml-auto"
                                      >
                                        <Settings className="size-3.5" />
                                        <span>Configurar</span>
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* Right Side: Alerts Widget */}
            <div className="space-y-6">
              <motion.div variants={item as any}>
                <Card className="border-border bg-card">
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
                              "p-4 rounded-xl border space-y-3 bg-secondary/20 border-border transition-all hover:bg-secondary/40",
                              isOverdue ? "border-destructive/30 hover:border-destructive/50" : "border-warning/30 hover:border-warning/50"
                            )}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-bold text-sm text-foreground">{alert.student}</h4>
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

                            <div className="flex items-center justify-between text-xs border-t border-border pt-2">
                              <span className="text-muted-foreground">Valor total:</span>
                              <span className="font-bold text-foreground">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(alert.amount)}
                              </span>
                            </div>

                            <div className="flex gap-2 pt-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-xs gap-1.5 h-8 border-border hover:bg-secondary hover:text-foreground"
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
        <DialogContent className="sm:max-w-[480px] bg-card border-border text-foreground">
          <form onSubmit={handleSavePayment}>
            <DialogHeader>
              <DialogTitle className="text-foreground text-lg font-bold">
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
                  <Label className="text-xs text-muted-foreground">Origem do Aluno</Label>
                  <div className="grid grid-cols-2 gap-2 bg-secondary p-1 rounded-lg border border-border">
                    <button
                      type="button"
                      className={cn("py-1 text-xs font-semibold rounded-md transition-colors", studentType === "registered" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                      onClick={() => setStudentType("registered")}
                    >
                      Aluno do Sistema
                    </button>
                    <button
                      type="button"
                      className={cn("py-1 text-xs font-semibold rounded-md transition-colors", studentType === "manual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                      onClick={() => setStudentType("manual")}
                    >
                      Preenchimento Manual
                    </button>
                  </div>
                </div>
              )}

              {studentType === "registered" && students.length > 0 && !editingPayment ? (
                <div className="space-y-2">
                  <Label htmlFor="studentSelect" className="text-xs text-muted-foreground">Aluno Cadastrado *</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger id="studentSelect" className="w-full bg-background border-border text-foreground">
                      <SelectValue placeholder="Selecione o aluno..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
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
                  <Label htmlFor="manualName" className="text-xs text-muted-foreground">Nome Completo do Aluno *</Label>
                  <Input
                    id="manualName"
                    placeholder="Ex: Gabriel Moura"
                    className="bg-background border-border text-foreground"
                    value={manualStudentName}
                    onChange={(e) => setManualStudentName(e.target.value)}
                    required={studentType === "manual" || editingPayment}
                    disabled={!!editingPayment && studentType === "registered"}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="desc" className="text-xs text-muted-foreground">Descrição / Serviço prestado *</Label>
                <Input
                  id="desc"
                  placeholder="Ex: Mensalidade de Treino, Consultoria VIP Premium"
                  className="bg-background border-border text-foreground"
                  value={paymentDescription}
                  onChange={(e) => setPaymentDescription(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-xs text-muted-foreground">Valor (R$) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    className="bg-background border-border text-foreground"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date" className="text-xs text-muted-foreground">Data de Vencimento / Pagamento *</Label>
                  <Input
                    id="date"
                    type="date"
                    className="bg-background border-border text-foreground"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statusSelect" className="text-xs text-muted-foreground">Status do Pagamento *</Label>
                  <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                    <SelectTrigger id="statusSelect" className="w-full bg-background border-border text-foreground">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="pago">Confirmado (Pago)</SelectItem>
                      <SelectItem value="pendente">Pendente (Aguardando)</SelectItem>
                      <SelectItem value="atrasado">Atrasado (Vencido)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="methodSelect" className="text-xs text-muted-foreground">Método de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="methodSelect" className="w-full bg-background border-border text-foreground">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                      <SelectItem value="DINHEIRO">Dinheiro / Espécie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border pt-4">
              <Button type="button" variant="outline" className="border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80" onClick={() => setIsPaymentModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSavingPayment} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold">
                {isSavingPayment && <Loader2 className="size-4 animate-spin" />}
                <span>{isSavingPayment ? "Salvando..." : "Salvar Receita"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog - complying with RULE[confirmationmodals.md] */}
      <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <DialogContent className="sm:max-w-[420px] bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive font-bold text-lg">
              <Trash2 className="size-5" />
              <span>Excluir Lançamento Financeiro</span>
            </DialogTitle>
            <DialogDescription className="pt-2 text-muted-foreground">
              Você tem certeza que deseja excluir o lançamento de <strong className="text-foreground">{paymentToDelete?.student}</strong> no valor de <strong className="text-foreground">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(paymentToDelete?.amount || 0)}</strong>?
              <br /><br />
              <span className="text-destructive font-semibold">Esta ação é irreversível e removerá este registro do faturamento e gráficos do financeiro.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setIsConfirmDeleteOpen(false)}
              className="border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeletePayment}
              className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              <span>Excluir Registro</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recurrence Configuration Dialog */}
      <Dialog open={isRecurrenceModalOpen} onOpenChange={setIsRecurrenceModalOpen}>
        <DialogContent className="sm:max-w-[550px] bg-card border-border text-foreground">
          <form onSubmit={handleSaveRecurrence}>
            <DialogHeader>
              <DialogTitle className="text-foreground text-lg font-bold flex items-center gap-2">
                <RefreshCw className="size-5 text-emerald-500 shrink-0" />
                <span>Configurar Recorrência Financeira</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Ajuste os parâmetros de cobrança automática ou periódica para {selectedRecurrenceStudent ? <strong className="text-foreground">{selectedRecurrenceStudent.studentName}</strong> : "um aluno"}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
              {!selectedRecurrenceStudent ? (
                <div className="space-y-1.5">
                  <Label htmlFor="recStudentSelect" className="text-xs font-bold text-muted-foreground">Aluno *</Label>
                  <Select value={selectedStudentIdForRecurrence} onValueChange={setSelectedStudentIdForRecurrence}>
                    <SelectTrigger id="recStudentSelect" className="w-full bg-background border-border text-foreground">
                      <SelectValue placeholder="Selecione o aluno..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      {students.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.email || "Sem e-mail"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-border bg-secondary/50 text-xs text-muted-foreground">
                  Configurando recorrência para o aluno: <strong className="text-foreground">{selectedRecurrenceStudent.studentName}</strong>
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30">
                <div className="space-y-0.5">
                  <Label htmlFor="recIsActive" className="text-xs text-foreground font-bold block">Status da Recorrência</Label>
                  <span className="text-[10px] text-muted-foreground block">
                    {recIsActive ? "Ativa - Processamento automático habilitado" : "Pausada - Sem cobranças automáticas"}
                  </span>
                </div>
                <Switch
                  id="recIsActive"
                  checked={recIsActive}
                  onCheckedChange={setRecIsActive}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="recControlType" className="text-xs font-bold text-muted-foreground">Tipo de Controle</Label>
                  <Select value={recControlType} onValueChange={(val) => setRecControlType(val as any)}>
                    <SelectTrigger id="recControlType" className="w-full bg-background border-border text-foreground">
                      <SelectValue placeholder="Selecione o tipo..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border text-popover-foreground">
                      <SelectItem value="MANUAL">Manual (Sem automação)</SelectItem>
                      <SelectItem value="CONFIRMATION">Recorrência com Confirmação</SelectItem>
                      <SelectItem value="AUTOMATIC">Recorrência Automática (Baixa auto)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recControlType !== "MANUAL" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="recPrice" className="text-xs font-bold text-muted-foreground">Valor da Cobrança (R$) *</Label>
                    <Input
                      id="recPrice"
                      type="number"
                      step="0.01"
                      placeholder="Ex: 150.00"
                      className="bg-background border-border text-foreground"
                      value={recPrice}
                      onChange={(e) => setRecPrice(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              {recControlType !== "MANUAL" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="recPaymentMethod" className="text-xs font-bold text-muted-foreground">Método de Pagamento Principal</Label>
                      <Select value={recPaymentMethod} onValueChange={setRecPaymentMethod}>
                        <SelectTrigger id="recPaymentMethod" className="w-full bg-background border-border text-foreground">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                          <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="recPeriodicity" className="text-xs font-bold text-muted-foreground">Periodicidade</Label>
                      <Select value={recPeriodicity} onValueChange={setRecPeriodicity}>
                        <SelectTrigger id="recPeriodicity" className="w-full bg-background border-border text-foreground">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border text-popover-foreground">
                          <SelectItem value="MENSAL">Mensal</SelectItem>
                          <SelectItem value="QUINZENAL">Quinzenal</SelectItem>
                          <SelectItem value="SEMANAL">Semanal</SelectItem>
                          <SelectItem value="ANUAL">Anual</SelectItem>
                          <SelectItem value="PERSONALIZADA">Personalizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {recPeriodicity === "PERSONALIZADA" && (
                    <div className="grid grid-cols-2 gap-4 bg-secondary/40 p-3 rounded-xl border border-border">
                      <div className="space-y-1.5">
                        <Label htmlFor="recCustomCount" className="text-xs font-bold text-muted-foreground">Frequência (A cada)</Label>
                        <Input
                          id="recCustomCount"
                          type="number"
                          min="1"
                          className="bg-background border-border text-foreground"
                          value={recCustomCount}
                          onChange={(e) => setRecCustomCount(e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="recCustomUnit" className="text-xs font-bold text-muted-foreground">Unidade de Tempo</Label>
                        <Select value={recCustomUnit} onValueChange={setRecCustomUnit}>
                          <SelectTrigger id="recCustomUnit" className="w-full bg-background border-border text-foreground">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover border-border text-popover-foreground">
                            <SelectItem value="dias">dias</SelectItem>
                            <SelectItem value="semanas">semanas</SelectItem>
                            <SelectItem value="meses">meses</SelectItem>
                            <SelectItem value="anos">anos</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(recPeriodicity === "MENSAL" || recPeriodicity === "ANUAL" || (recPeriodicity === "PERSONALIZADA" && (recCustomUnit === "meses" || recCustomUnit === "anos"))) && (
                      <div className="space-y-1.5">
                        <Label htmlFor="recDueDay" className="text-xs font-bold text-muted-foreground">Dia de Vencimento fixo (1-31)</Label>
                        <Input
                          id="recDueDay"
                          type="number"
                          min="1"
                          max="31"
                          placeholder="Ex: 5"
                          className="bg-background border-border text-foreground"
                          value={recDueDay}
                          onChange={(e) => setRecDueDay(e.target.value)}
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label htmlFor="recFirstDueDate" className="text-xs font-bold text-muted-foreground">Primeiro Vencimento *</Label>
                      <Input
                        id="recFirstDueDate"
                        type="date"
                        className="bg-background border-border text-foreground"
                        value={recFirstDueDate}
                        onChange={(e) => setRecFirstDueDate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="recDescription" className="text-xs font-bold text-muted-foreground">Descrição da Fatura</Label>
                    <Input
                      id="recDescription"
                      placeholder="Ex: Plano Trimestral Assessoria"
                      className="bg-background border-border text-foreground"
                      value={recDescription}
                      onChange={(e) => setRecDescription(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="border-t border-border pt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                onClick={() => setIsRecurrenceModalOpen(false)}
                disabled={isSavingRecurrence}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSavingRecurrence}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/95 font-semibold"
              >
                {isSavingRecurrence && <Loader2 className="size-4 animate-spin" />}
                <span>{isSavingRecurrence ? "Salvando..." : "Salvar Configuração"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
