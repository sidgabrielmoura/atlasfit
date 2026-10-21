"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn, formatCurrencyBrl } from "@/lib/utils";
import { useRequestAttempt } from "@/hooks/use-request-attempt";
import { parseBrlCents } from "@/modules/workspaces/domain/currency-input";
import { reportCalendarRange } from "@/modules/workspaces/domain/gym-report-calendar";
import type { GymAnalyticsOverview } from "@/modules/workspaces/application/gym-analytics-service";
import { WorkspaceCapability } from "@/modules/workspaces";

import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  RefreshCw,
  PlusCircle,
  Copy,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  CreditCard,
  FileText,
  Receipt,
  RotateCcw,
  Printer,
  Trash2,
  BadgePercent,
  AlertTriangle,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  CalendarCheck,
  UserX,
  Search,
  Loader2,
  Check,
} from "lucide-react";

import { GymPageHeader, GymEmptyState } from "@/components/application/gym-page";
import { GymTabsList } from "@/components/application/gym-tabs-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { CashDrawerTab } from "./components/cash-drawer-tab";
import { ExpensesTab } from "./components/expenses-tab";
import { AccountsTab } from "./components/accounts-tab";

interface StudentItem {
  id: string;
  memberId: string;
  name: string;
  email: string;
  cpfCnpj?: string | null;
  isMinor?: boolean;
}

interface GuardianItem {
  id: string;
  studentMemberId: string;
  name: string;
  cpf: string;
  email?: string | null;
  phone?: string | null;
  relationship: string;
  isFinancialResponsible: boolean;
}

interface EnrollmentItem {
  id: string;
  studentMemberId: string;
  planVersion: { name: string };
  studentMember: { userId: string; user: { name: string | null } };
  billingPayerName?: string | null;
  billingPayerCpf?: string | null;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  title: string;
  description?: string | null;
  status: string;
  dueDate: string;
  issueDate: string;
  competenceMonth?: string | null;
  subtotalInCents: number;
  discountInCents: number;
  totalInCents: number;
  paidAmountInCents: number;
  balanceRemainingInCents: number;
  discountPercentage?: number | null;
  discountReason?: string | null;
  payer: {
    type: string;
    name: string;
    cpfCnpjMasked: string;
    email?: string | null;
    phone?: string | null;
  };
  student?: {
    memberId: string;
    name: string;
    email: string;
    image?: string | null;
  } | null;
  enrollment?: {
    id: string;
    planName: string;
  } | null;
  items: Array<{
    id: string;
    itemType: string;
    description: string;
    quantity: number;
    unitPriceInCents: number;
    totalInCents: number;
  }>;
  allocations: Array<{
    id: string;
    paymentId: string;
    paymentNumber?: string;
    receiptNumber?: string;
    allocatedAmountInCents: number;
    status: string;
  }>;
  paidAt?: string | null;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  paymentNumber: string;
  receiptNumber: string;
  idempotencyKey: string;
  amountInCents: number;
  paymentMethod: string;
  status: string;
  paidAt: string;
  payer: {
    name: string;
    cpfCnpjMasked: string;
  };
  receivedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  verificationDetails: {
    posCardBrand?: string | null;
    posAuthorizationCode?: string | null;
    posNsu?: string | null;
    posTerminalId?: string | null;
    bankTransferProofUrl?: string | null;
    bankTransferTransactionId?: string | null;
  };
  allocations: Array<{
    id: string;
    invoiceId: string;
    invoiceNumber?: string;
    title?: string;
    allocatedAmountInCents: number;
    status: string;
  }>;
  reversal?: {
    reversedAt?: string | null;
    reversalReason?: string | null;
  } | null;
  taxDisclaimer: string;
  notes?: string | null;
}

interface GymFinanceClientProps {
  accounts: Array<{ id: string; name: string; accountType: string }>;
  workspaceId: string;
  userCapabilities: WorkspaceCapability[];
  initialInvoices: {
    invoices: InvoiceItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  initialPayments: {
    payments: PaymentItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  initialOverview?: GymAnalyticsOverview;
  reportTimezone: string;
  students: StudentItem[];
  enrollments: EnrollmentItem[];
  guardians: GuardianItem[];
}

export function GymFinanceClient({
  accounts,
  workspaceId,
  userCapabilities,
  initialInvoices,
  initialPayments,
  initialOverview,
  reportTimezone,
  students,
  enrollments,
  guardians,
}: GymFinanceClientProps) {
  const router = useRouter();

  // Estados de dados
  const [invoicesData, setInvoicesData] = useState(initialInvoices);
  const [paymentsData, setPaymentsData] = useState(initialPayments);

  const availableTabs = [
    "invoices",
    "expenses",
    "accounts",
    ...(userCapabilities.includes("payments.read") ? ["payments", "cash-drawer"] : []),
    ...(userCapabilities.includes("reports.finance") ? ["metrics"] : []),
  ];
  const [activeTab, setActiveTab] = useState("invoices");

  // Filtros locais de faturas
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("ALL");

  // Filtros locais de pagamentos
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("ALL");

  // Métricas unificadas
  const [overviewData, setOverviewData] = useState<GymAnalyticsOverview | undefined>(initialOverview);
  const [isRefreshingOverview, setIsRefreshingOverview] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [metricsPeriod, setMetricsPeriod] = useState("30d");
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [selectedExportType, setSelectedExportType] = useState<"STUDENTS" | "INVOICES" | "PAYMENTS">("INVOICES");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && availableTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Loading states
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [isReversingPayment, setIsReversingPayment] = useState(false);

  // Modais
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);
  const [isPayInPersonOpen, setIsPayInPersonOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false);

  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<PaymentItem | null>(null);
  const [selectedPaymentToReverse, setSelectedPaymentToReverse] = useState<PaymentItem | null>(null);
  const invoiceAttempt = useRequestAttempt(`GYM:${workspaceId}:INVOICE`);
  const [receivingAccountId, setReceivingAccountId] = useState("");
  const [receivedAt, setReceivedAt] = useState("");
  const [reversalReasonInput, setReversalReasonInput] = useState("");

  // Form de nova fatura com itens (SEM justificativa de desconto conforme solicitado)
  interface InvoiceFormItem {
    itemType: "PLAN_SUBSCRIPTION" | "ENROLLMENT_FEE" | "DAILY_PASS" | "PRODUCT" | "SERVICE" | "PENALTY" | "OTHER";
    description: string;
    quantity: number;
    unitPrice: string;
  }

  const [invoiceForm, setInvoiceForm] = useState<{
    studentMemberId: string;
    title: string;
    dueDate: string;
    items: InvoiceFormItem[];
    discountAmount: string;
    payerType: "STUDENT" | "GUARDIAN" | "CUSTOM";
    guardianId: string;
    customName: string;
    customCpfCnpj: string;
    customEmail: string;
  }>({
    studentMemberId: "",
    title: "Mensalidade",
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    items: [
      {
        itemType: "PLAN_SUBSCRIPTION",
        description: "Mensalidade do Plano",
        quantity: 1,
        unitPrice: "",
      },
    ],
    discountAmount: "",
    payerType: "STUDENT",
    guardianId: "",
    customName: "",
    customCpfCnpj: "",
    customEmail: "",
  });

  // Form de pagamento presencial
  const [payInPersonForm, setPayInPersonForm] = useState({
    invoiceId: "",
    amount: "",
    paymentMethod: "CASH" as "CASH" | "EXTERNAL_POS_DEBIT" | "EXTERNAL_POS_CREDIT" | "BANK_TRANSFER_MANUAL",
    posCardBrand: "",
    posAuthorizationCode: "",
    posNsu: "",
    posTerminalId: "",
    bankTransferTransactionId: "",
    notes: "",
  });

  const paymentAttempt = useRequestAttempt(
    `GYM:${workspaceId}:INVOICE_PAYMENT:${payInPersonForm.invoiceId || "none"}`
  );

  const canIssue = userCapabilities.includes("invoices.issue");
  const canApproveRefunds = userCapabilities.includes("refunds.approve");
  const canRecordPayment = userCapabilities.includes("payments.record");

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Atualizar tudo
  const handleRefreshAll = async () => {
    setIsRefreshingAll(true);
    try {
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/gym/finance/invoices?workspaceId=${workspaceId}`),
        userCapabilities.includes("payments.read")
          ? fetch(`/api/gym/finance/payments?workspaceId=${workspaceId}`)
          : Promise.resolve(null),
      ]);
      if (invRes.ok) setInvoicesData(await invRes.json());
      if (payRes && payRes.ok) setPaymentsData(await payRes.json());
      if (userCapabilities.includes("reports.finance")) {
        await refreshMetrics();
      }
      toast.success("Dados financeiros atualizados!");
    } catch {
      toast.error("Erro ao atualizar dados financeiros.");
    } finally {
      setIsRefreshingAll(false);
    }
  };

  // Recarregar métricas analíticas em tempo real
  const refreshMetrics = async (newPeriod?: string) => {
    const period = newPeriod || metricsPeriod;
    setIsRefreshingOverview(true);
    try {
      const range = reportCalendarRange(new Date(), reportTimezone, period);
      const params = new URLSearchParams({ workspaceId, ...range });
      const res = await fetch(`/api/gym/analytics/kpis?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao atualizar métricas.");
      const json = await res.json();
      if (json.data) {
        setOverviewData(json.data);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar métricas.");
    } finally {
      setIsRefreshingOverview(false);
    }
  };

  // Exportar dados em CSV
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const range = reportCalendarRange(new Date(), reportTimezone, metricsPeriod);
      const res = await fetch("/api/gym/analytics/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          exportType: selectedExportType,
          ...range,
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson?.error?.message || "Falha ao exportar.");
      }

      const blob = await res.blob();
      const filename = `atlasfit-${selectedExportType.toLowerCase()}-${metricsPeriod}.csv`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Exportação concluída com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar exportação.");
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Emissão de Fatura com Itens (SEM justificativa de desconto)
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingInvoice) return;

    if (!invoiceForm.studentMemberId) {
      toast.error("Selecione um aluno para emitir a fatura.");
      return;
    }

    if (invoiceForm.items.length === 0) {
      toast.error("Adicione ao menos um item na fatura.");
      return;
    }

    // Processar itens
    const processedItems = [];
    for (const it of invoiceForm.items) {
      const price = parseBrlCents(it.unitPrice);
      if (price === null || price <= 0) {
        toast.error(`Valor unitário inválido no item: ${it.description || "Sem descrição"}`);
        return;
      }
      processedItems.push({
        itemType: it.itemType,
        description: it.description.trim() || "Item da Fatura",
        quantity: Number(it.quantity) || 1,
        unitPriceInCents: price,
      });
    }

    // Processar desconto (opcional)
    let discountCents = 0;
    if (invoiceForm.discountAmount) {
      const discount = parseBrlCents(invoiceForm.discountAmount);
      if (discount === null) {
        toast.error("Informe um desconto válido em reais.");
        return;
      }
      discountCents = discount;
    }

    setIsCreatingInvoice(true);

    try {
      const payload = {
        workspaceId,
        studentMemberId: invoiceForm.studentMemberId,
        title: invoiceForm.title.trim() || "Mensalidade",
        dueDate: invoiceForm.dueDate,
        items: processedItems,
        discountInCents: discountCents > 0 ? discountCents : undefined,
        // Envia automaticamente a justificativa comercial no payload caso haja desconto
        discountReason: discountCents > 0 ? "Desconto comercial" : undefined,
        preferredPayerType: invoiceForm.payerType,
        ...(invoiceForm.payerType === "GUARDIAN" ? { guardianId: invoiceForm.guardianId || undefined } : {}),
        ...(invoiceForm.payerType === "CUSTOM"
          ? {
              customPayer: {
                name: invoiceForm.customName,
                cpfCnpj: invoiceForm.customCpfCnpj,
                email: invoiceForm.customEmail,
              },
            }
          : {}),
      };

      const idempotencyKey = invoiceAttempt.keyFor(JSON.stringify(payload));
      const res = await fetch("/api/gym/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao emitir fatura.");
      }

      invoiceAttempt.confirmed();
      toast.success("Fatura emitida com sucesso!");
      setIsNewInvoiceOpen(false);

      // Refresh dados
      const invRes = await fetch(`/api/gym/finance/invoices?workspaceId=${workspaceId}`);
      if (invRes.ok) {
        const updated = await invRes.json();
        setInvoicesData(updated);
      }
      // Lists have already been revalidated through their authorized API endpoints.
      if (userCapabilities.includes("reports.finance")) await refreshMetrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar fatura.");
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  // Abrir modal de pagamento presencial pré-selecionando fatura
  const handleOpenPayInPerson = (invoice: InvoiceItem) => {
    setPayInPersonForm({
      invoiceId: invoice.id,
      amount: formatCurrencyBrl(invoice.balanceRemainingInCents),
      paymentMethod: "CASH",
      posCardBrand: "",
      posAuthorizationCode: "",
      posNsu: "",
      posTerminalId: "",
      bankTransferTransactionId: "",
      notes: "",
    });
    setIsPayInPersonOpen(true);
  };

  // Registrar Pagamento Presencial
  const handleRecordInPersonPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecordingPayment) return;

    const amountInCents = parseBrlCents(payInPersonForm.amount);
    if (amountInCents === null || amountInCents <= 0) {
      toast.error("Informe um valor válido recebido.");
      return;
    }

    const targetInvoice = invoicesData.invoices.find((i) => i.id === payInPersonForm.invoiceId);
    if (!targetInvoice) {
      toast.error("Fatura alvo não encontrada.");
      return;
    }

    if (amountInCents > targetInvoice.balanceRemainingInCents) {
      toast.error(
        `Valor excede o saldo devedor restante de ${formatCurrency(targetInvoice.balanceRemainingInCents)}.`
      );
      return;
    }

    setIsRecordingPayment(true);

    try {
      const payload = {
        workspaceId,
        financialAccountId: receivingAccountId || undefined,
        paidAt: receivedAt ? new Date(receivedAt).toISOString() : undefined,
        paymentMethod: payInPersonForm.paymentMethod,
        amountInCents,
        allocations: [{ invoiceId: payInPersonForm.invoiceId, amountInCents }],
        notes: payInPersonForm.notes || undefined,
        posCardBrand: payInPersonForm.posCardBrand || undefined,
        posAuthorizationCode: payInPersonForm.posAuthorizationCode || undefined,
        posNsu: payInPersonForm.posNsu || undefined,
        posTerminalId: payInPersonForm.posTerminalId || undefined,
        bankTransferTransactionId: payInPersonForm.bankTransferTransactionId || undefined,
      };

      if (
        payInPersonForm.paymentMethod === "EXTERNAL_POS_DEBIT" ||
        payInPersonForm.paymentMethod === "EXTERNAL_POS_CREDIT"
      ) {
        payload.posCardBrand = payInPersonForm.posCardBrand || undefined;
        payload.posAuthorizationCode = payInPersonForm.posAuthorizationCode || undefined;
        payload.posNsu = payInPersonForm.posNsu || undefined;
        payload.posTerminalId = payInPersonForm.posTerminalId || undefined;
      } else if (payInPersonForm.paymentMethod === "BANK_TRANSFER_MANUAL") {
        payload.bankTransferTransactionId = payInPersonForm.bankTransferTransactionId || undefined;
      }

      const idempotencyKey = paymentAttempt.keyFor(JSON.stringify(payload));
      const res = await fetch("/api/gym/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao registrar pagamento.");
      }

      const paymentResult = await res.json();
      paymentAttempt.confirmed();
      if (paymentResult.status === "REVERSED") {
        toast.info(
          "Esta tentativa corresponde a um recebimento já revertido. Consulte o recibo e o saldo atual."
        );
      } else {
        toast.success(`Recebimento de ${formatCurrency(paymentResult.amountInCents)} registrado.`);
      }
      setIsPayInPersonOpen(false);

      // Exibir automaticamente o recibo
      setSelectedReceiptPayment(paymentResult);
      setIsReceiptOpen(true);

      // Atualizar tabelas
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/gym/finance/invoices?workspaceId=${workspaceId}`),
        fetch(`/api/gym/finance/payments?workspaceId=${workspaceId}`),
      ]);
      if (invRes.ok) setInvoicesData(await invRes.json());
      if (payRes.ok) setPaymentsData(await payRes.json());

      // Lists have already been revalidated through their authorized API endpoints.
      if (userCapabilities.includes("reports.finance")) await refreshMetrics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao registrar pagamento.");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  // Reversão / Estorno com Justificativa
  const handleReversePaymentConfirm = async () => {
    if (!selectedPaymentToReverse || isReversingPayment) return;

    if (!reversalReasonInput.trim()) {
      toast.error("A justificativa do estorno é obrigatória.");
      return;
    }

    setIsReversingPayment(true);

    try {
      const res = await fetch(`/api/gym/finance/payments/${selectedPaymentToReverse.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          reversalReason: reversalReasonInput.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao estornar pagamento.");
      }

      toast.success("Pagamento estornado e saldo da fatura restaurado!");
      setIsReverseDialogOpen(false);
      setSelectedPaymentToReverse(null);
      setReversalReasonInput("");

      // Atualizar tabelas
      const [invRes, payRes] = await Promise.all([
        fetch(`/api/gym/finance/invoices?workspaceId=${workspaceId}`),
        fetch(`/api/gym/finance/payments?workspaceId=${workspaceId}`),
      ]);
      if (invRes.ok) setInvoicesData(await invRes.json());
      if (payRes.ok) setPaymentsData(await payRes.json());

      // Lists have already been revalidated through their authorized API endpoints.
      if (userCapabilities.includes("reports.finance")) await refreshMetrics();
    } catch (err: any) {
      toast.error(err.message || "Falha na reversão.");
    } finally {
      setIsReversingPayment(false);
    }
  };

  const getInvoiceStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-normal">
            Quitada
          </Badge>
        );
      case "PARTIALLY_PAID":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-normal">
            Parcialmente Paga
          </Badge>
        );
      case "OPEN":
        return (
          <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/10 font-normal">
            Aberta
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/10 font-normal">
            Cancelada
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    switch (method) {
      case "CASH":
        return <Badge variant="outline" className="gap-1 border-border/50 font-normal">Dinheiro</Badge>;
      case "EXTERNAL_POS_DEBIT":
        return <Badge variant="outline" className="gap-1 border-border/50 font-normal">Maquininha Débito</Badge>;
      case "EXTERNAL_POS_CREDIT":
        return <Badge variant="outline" className="gap-1 border-border/50 font-normal">Maquininha Crédito</Badge>;
      case "BANK_TRANSFER_MANUAL":
        return <Badge variant="outline" className="gap-1 border-border/50 font-normal">Transferência / Pix</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  // Filtragem de faturas
  const filteredInvoices = invoicesData.invoices.filter((inv) => {
    const searchLower = invoiceSearchQuery.toLowerCase();
    const matchesSearch =
      !invoiceSearchQuery ||
      inv.invoiceNumber.toLowerCase().includes(searchLower) ||
      (inv.student?.name && inv.student.name.toLowerCase().includes(searchLower)) ||
      inv.payer.name.toLowerCase().includes(searchLower) ||
      inv.title.toLowerCase().includes(searchLower);

    const matchesStatus =
      invoiceStatusFilter === "ALL" || inv.status === invoiceStatusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filtragem de pagamentos
  const filteredPayments = paymentsData.payments.filter((p) => {
    const searchLower = paymentSearchQuery.toLowerCase();
    const matchesSearch =
      !paymentSearchQuery ||
      p.receiptNumber.toLowerCase().includes(searchLower) ||
      p.payer.name.toLowerCase().includes(searchLower);

    const matchesMethod =
      paymentMethodFilter === "ALL" || p.paymentMethod === paymentMethodFilter;

    return matchesSearch && matchesMethod;
  });

  // Cálculos de KPIs
  const totalPaidInvoicesInCents = invoicesData.invoices.reduce(
    (sum, i) => sum + i.paidAmountInCents,
    0
  );
  const totalOpenBalanceInCents = invoicesData.invoices
    .filter((i) => i.status === "OPEN" || i.status === "PARTIALLY_PAID")
    .reduce((sum, i) => sum + i.balanceRemainingInCents, 0);
  const openInvoicesCount = invoicesData.invoices.filter(
    (i) => i.status === "OPEN" || i.status === "PARTIALLY_PAID"
  ).length;
  const confirmedPaymentsTotalInCents = paymentsData.payments
    .filter((p) => p.status === "CONFIRMED")
    .reduce((sum, p) => sum + p.amountInCents, 0);

  // Pré-cálculo da fatura sendo criada no modal
  const subtotalPreviewInCents = invoiceForm.items.reduce((acc, it) => {
    const centsVal = parseBrlCents(it.unitPrice) || 0;
    return acc + centsVal * (Number(it.quantity) || 1);
  }, 0);
  const discountPreviewInCents = parseBrlCents(invoiceForm.discountAmount) || 0;
  const totalPreviewInCents = Math.max(0, subtotalPreviewInCents - discountPreviewInCents);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* 1. Header no Padrão do Sistema */}
      <GymPageHeader
        title={<>Financeiro</>}
        description={<>Gestão de faturamento, mensalidades, recebimentos no balcão e fluxo de caixa.</>}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="default"
              onClick={handleRefreshAll}
              disabled={isRefreshingAll}
              className="gap-2 font-medium cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", isRefreshingAll && "animate-spin")} />
              <span>Atualizar</span>
            </Button>
            {canIssue && (
              <Button
                size="default"
                onClick={() => {
                  setInvoiceForm({
                    studentMemberId: students[0]?.memberId || "",
                    title: "Mensalidade",
                    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                    items: [
                      {
                        itemType: "PLAN_SUBSCRIPTION",
                        description: "Mensalidade do Plano",
                        quantity: 1,
                        unitPrice: "",
                      },
                    ],
                    discountAmount: "",
                    payerType: "STUDENT",
                    guardianId: "",
                    customName: "",
                    customCpfCnpj: "",
                    customEmail: "",
                  });
                  setIsNewInvoiceOpen(true);
                }}
                className="gap-2 font-medium cursor-pointer"
              >
                <PlusCircle className="size-4" />
                <span>Emitir Fatura</span>
              </Button>
            )}
          </div>
        }
      />

      {/* 2. KPI Metric Cards no Padrão do Personal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0 [&>*]:min-w-0">
        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Faturamento Liquidado
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {formatCurrency(totalPaidInvoicesInCents)}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-primary/10 text-primary">
                <DollarSign className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              Total liquidado nas faturas
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Em Aberto a Receber
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {formatCurrency(totalOpenBalanceInCents)}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-amber-500/10 text-amber-500">
                <Clock className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              {openInvoicesCount} faturas aguardando quitação
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Faturas Emitidas
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {invoicesData.pagination.total}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-blue-500/10 text-blue-500">
                <FileText className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              {invoicesData.invoices.length} carregadas nesta página
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Recebimentos no Balcão
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                  {paymentsData.pagination.total}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              {formatCurrency(confirmedPaymentsTotalInCents)} confirmados no caixa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabs do Módulo Financeiro */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <GymTabsList>
            <TabsTrigger value="invoices" className="gap-2 text-xs">
              <FileText className="size-3.5" />
              <span>Faturas & A Receber</span>
            </TabsTrigger>
            {userCapabilities.includes("reports.finance") && (
              <TabsTrigger value="metrics" className="gap-2 text-xs">
                <BarChart3 className="size-3.5" />
                <span>Métricas & Relatórios</span>
              </TabsTrigger>
            )}
            {userCapabilities.includes("payments.read") && (
              <TabsTrigger value="payments" className="gap-2 text-xs">
                <Receipt className="size-3.5" />
                <span>Pagamentos Balcão</span>
              </TabsTrigger>
            )}
            {userCapabilities.includes("payments.read") && (
              <TabsTrigger value="cash-drawer" className="gap-2 text-xs">
                <TrendingUp className="size-3.5" />
                <span>Caixa Recepção</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="expenses" className="gap-2 text-xs">
              <TrendingDown className="size-3.5" />
              <span>Despesas & A Pagar</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="gap-2 text-xs">
              <Building2 className="size-3.5" />
              <span>Contas & Bancos</span>
            </TabsTrigger>
          </GymTabsList>
        </div>

        {/* TAB 1: FATURAS E CONTAS A RECEBER */}
        <TabsContent value="invoices" className="mt-0 space-y-4">
          <Card className="min-w-0 border-border/50 overflow-hidden py-0">
            {/* Barra de Busca e Filtro */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border/50 bg-card/20">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar por aluno, fatura ou plano..."
                  value={invoiceSearchQuery}
                  onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                  className="pl-8 text-xs bg-background h-8"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={invoiceStatusFilter} onValueChange={setInvoiceStatusFilter}>
                  <SelectTrigger className="w-44 text-xs bg-background h-8">
                    <SelectValue placeholder="Status da Fatura" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="ALL">Todas as Faturas</SelectItem>
                      <SelectItem value="OPEN">Em Aberto</SelectItem>
                      <SelectItem value="PARTIALLY_PAID">Parcialmente Paga</SelectItem>
                      <SelectItem value="PAID">Quitada</SelectItem>
                      <SelectItem value="CANCELLED">Cancelada</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CardContent className="p-0">
              {filteredInvoices.length === 0 ? (
                <div className="py-12">
                  <GymEmptyState
                    icon={FileText}
                    title={<>Nenhuma fatura encontrada com os filtros aplicados</>}
                    className=""
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Número / Vencimento</TableHead>
                        <TableHead className="text-xs">Aluno / Pagador</TableHead>
                        <TableHead className="text-xs">Título / Plano</TableHead>
                        <TableHead className="text-xs">Total da Fatura</TableHead>
                        <TableHead className="text-xs">Pago / Restante</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="py-3 px-4 font-medium">
                            <div className="flex flex-col">
                              <span className="font-mono text-xs font-semibold text-foreground">
                                {inv.invoiceNumber}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Vence: {new Date(inv.dueDate).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="size-8 border border-border/50 shrink-0">
                                <AvatarImage src={inv.student?.image || undefined} />
                                <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                                  {(inv.student?.name || inv.payer.name).substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-xs sm:text-sm text-foreground truncate">
                                  {inv.student?.name || inv.payer.name}
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {inv.payer.type === "GUARDIAN" && (
                                    <Badge variant="outline" className="text-[10px] py-0 text-blue-500 border-blue-500/30">
                                      Resp: {inv.payer.name}
                                    </Badge>
                                  )}
                                  {inv.payer.type === "CUSTOM" && (
                                    <Badge variant="outline" className="text-[10px] py-0 text-purple-500 border-purple-500/30">
                                      Empresa: {inv.payer.name}
                                    </Badge>
                                  )}
                                  {inv.payer.cpfCnpjMasked && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                      {inv.payer.cpfCnpjMasked}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 px-4">
                            <div className="flex flex-col">
                              <span className="text-xs sm:text-sm font-medium text-foreground">{inv.title}</span>
                              {inv.enrollment && (
                                <span className="text-[11px] text-muted-foreground truncate">
                                  Plano: {inv.enrollment.planName}
                                </span>
                              )}
                              {inv.discountInCents > 0 && (
                                <span className="text-[11px] text-emerald-500 flex items-center gap-0.5 mt-0.5 font-medium">
                                  <BadgePercent className="size-3" />
                                  Desconto: -{formatCurrency(inv.discountInCents)}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="py-3 px-4 font-bold text-xs sm:text-sm text-foreground">
                            {formatCurrency(inv.totalInCents)}
                          </TableCell>

                          <TableCell className="py-3 px-4">
                            <div className="flex flex-col text-xs">
                              <span className="text-emerald-500 font-medium">
                                Pago: {formatCurrency(inv.paidAmountInCents)}
                              </span>
                              <span
                                className={
                                  inv.balanceRemainingInCents > 0
                                    ? "text-amber-500 font-semibold"
                                    : "text-muted-foreground"
                                }
                              >
                                Restante: {formatCurrency(inv.balanceRemainingInCents)}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="py-3 px-4">
                            {getInvoiceStatusBadge(inv.status)}
                          </TableCell>

                          <TableCell className="py-3 px-4 text-right">
                            {inv.balanceRemainingInCents > 0 && canRecordPayment && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenPayInPerson(inv)}
                                className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                              >
                                <Receipt className="size-3.5" />
                                Receber no Balcão
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: MÉTRICAS & RELATÓRIOS UNIFICADOS */}
        {userCapabilities.includes("reports.finance") && (
          <TabsContent value="metrics" className="mt-0 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/50 bg-card/40">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" />
                  Painel Consolidado de Indicadores Financeiros
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receita recorrente contratada, inadimplência e exportações de relatórios.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={metricsPeriod}
                  onValueChange={(val) => {
                    setMetricsPeriod(val);
                    refreshMetrics(val);
                  }}
                  disabled={isRefreshingOverview}
                >
                  <SelectTrigger className="w-36 h-8 text-xs bg-background">
                    <Calendar className="size-3.5 mr-1 text-muted-foreground" />
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="7d">Últimos 7 dias</SelectItem>
                      <SelectItem value="30d">Últimos 30 dias</SelectItem>
                      <SelectItem value="month">Mês Atual</SelectItem>
                      <SelectItem value="90d">Últimos 90 dias</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refreshMetrics()}
                  disabled={isRefreshingOverview}
                  className="h-8 gap-1.5 text-xs cursor-pointer"
                >
                  <RefreshCw
                    className={cn("size-3.5", isRefreshingOverview && "animate-spin")}
                  />
                  {isRefreshingOverview ? "Atualizando..." : "Atualizar"}
                </Button>

                <div className="flex items-center gap-1.5">
                  <Select
                    value={selectedExportType}
                    onValueChange={(val: any) => setSelectedExportType(val)}
                    disabled={isExportingCsv}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="INVOICES">Faturas</SelectItem>
                        <SelectItem value="PAYMENTS">Pagamentos</SelectItem>
                        <SelectItem value="STUDENTS">Alunos</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={handleExportCsv}
                    disabled={isExportingCsv}
                    className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
                  >
                    {isExportingCsv ? (
                      <RefreshCw className="size-3.5 animate-spin" />
                    ) : (
                      <Download className="size-3.5" />
                    )}
                    {isExportingCsv ? "Gerando..." : "Exportar CSV"}
                  </Button>
                </div>
              </div>
            </div>

            {isRefreshingOverview ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : overviewData ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0 [&>*]:min-w-0">
                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                            Receita Contratada (MRR)
                          </p>
                          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                            {formatCurrency(overviewData.executive.mrrInCents)}
                          </p>
                        </div>
                        <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-primary/10 text-primary">
                          <TrendingUp className="size-4.5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
                        {overviewData.executive.activeRecurringContracts} contratos vigentes
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                            Ticket Médio
                          </p>
                          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                            {formatCurrency(overviewData.executive.averageTicketInCents)}
                          </p>
                        </div>
                        <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-blue-500/10 text-blue-500">
                          <CreditCard className="size-4.5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
                        Média mensal por contrato vigente
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                            Alunos Ativos
                          </p>
                          <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
                            {overviewData.executive.activeStudentsCount}
                          </p>
                        </div>
                        <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-emerald-500/10 text-emerald-500">
                          <Users className="size-4.5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
                        {overviewData.executive.pausedStudentsCount} com contrato pausado
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-border/50 bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                            Inadimplência Geral
                          </p>
                          <p className="text-xl sm:text-2xl font-bold tracking-tight text-destructive truncate">
                            {overviewData.accountsReceivable.defaultRatePercentage}%
                          </p>
                        </div>
                        <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-destructive/10 text-destructive">
                          <AlertCircle className="size-4.5" />
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
                        {overviewData.accountsReceivable.overdueInvoicesCount} faturas vencidas
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Faixas de Inadimplência e Canais de Pagamento */}
                <div className="grid gap-4 md:grid-cols-2 min-w-0 [&>*]:min-w-0">
                  <Card className="min-w-0 border-border/50">
                    <CardHeader className="min-w-0 pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                        <AlertTriangle className="size-4 text-destructive" />
                        Saldo por Dias de Atraso
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Total vencido: {formatCurrency(overviewData.accountsReceivable.totalOverdueInCents)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            1 a 30 dias
                          </span>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {formatCurrency(overviewData.accountsReceivable.overdue0to30InCents)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            31 a 60 dias
                          </span>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {formatCurrency(overviewData.accountsReceivable.overdue31to60InCents)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            61 a 90 dias
                          </span>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {formatCurrency(overviewData.accountsReceivable.overdue61to90InCents)}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg border border-border/50 bg-background/50">
                          <span className="text-[10px] font-semibold text-muted-foreground block uppercase">
                            &gt; 90 dias
                          </span>
                          <div className="text-sm font-bold text-foreground mt-0.5">
                            {formatCurrency(overviewData.accountsReceivable.overdueOver90InCents)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="min-w-0 border-border/50">
                    <CardHeader className="min-w-0 pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                        <PieChart className="size-4 text-primary" />
                        Recebimentos por Canal
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Recebimentos brutos no período selecionado
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {overviewData.cashFlow.paymentsByMethod.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-6 text-center">
                          Nenhum pagamento registrado no período.
                        </p>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-border/50 hover:bg-transparent">
                              <TableHead className="text-xs">Método</TableHead>
                              <TableHead className="text-center text-xs">Quantidade</TableHead>
                              <TableHead className="text-right text-xs">Valor Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {overviewData.cashFlow.paymentsByMethod.map((item, idx) => (
                              <TableRow key={idx} className="border-border/40">
                                <TableCell className="font-medium text-xs">{item.method}</TableCell>
                                <TableCell className="text-center text-xs text-muted-foreground">
                                  {item.count}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-xs text-foreground">
                                  {formatCurrency(item.totalInCents)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                Clique em Atualizar para consultar os indicadores analíticos.
              </div>
            )}
          </TabsContent>
        )}

        {/* TAB 3: PAGAMENTOS PRESENCIAIS & CAIXA */}
        {userCapabilities.includes("payments.read") && (
          <TabsContent value="payments" className="mt-0 space-y-4">
            <Card className="min-w-0 border-border/50 overflow-hidden py-0">
              {/* Barra de Filtro de Pagamentos */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-border/50 bg-card/20">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por pagador ou recibo..."
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    className="pl-8 text-xs bg-background h-8"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
                    <SelectTrigger className="w-48 text-xs bg-background h-8">
                      <SelectValue placeholder="Forma de Pagamento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ALL">Todas as Formas</SelectItem>
                        <SelectItem value="CASH">Dinheiro</SelectItem>
                        <SelectItem value="EXTERNAL_POS_DEBIT">Maquininha Débito</SelectItem>
                        <SelectItem value="EXTERNAL_POS_CREDIT">Maquininha Crédito</SelectItem>
                        <SelectItem value="BANK_TRANSFER_MANUAL">Pix / Transferência</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <CardContent className="p-0">
                {filteredPayments.length === 0 ? (
                  <div className="py-12">
                    <GymEmptyState
                      icon={Receipt}
                      title={<>Nenhum pagamento presencial encontrado</>}
                      className=""
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">Nº Recibo / Data</TableHead>
                          <TableHead className="text-xs">Pagador / Atendente</TableHead>
                          <TableHead className="text-xs">Forma de Pagamento</TableHead>
                          <TableHead className="text-xs">Valor Pago</TableHead>
                          <TableHead className="text-xs">Faturas Alocadas</TableHead>
                          <TableHead className="text-xs">Status</TableHead>
                          <TableHead className="text-xs text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((p) => (
                          <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                            <TableCell className="py-3 px-4 font-medium">
                              <div className="flex flex-col">
                                <span className="font-mono text-xs font-semibold text-foreground">
                                  {p.receiptNumber}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(p.paidAt).toLocaleString("pt-BR")}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="text-xs sm:text-sm font-medium text-foreground">{p.payer.name}</span>
                                <span className="text-[11px] text-muted-foreground">
                                  Recebido por: {p.receivedBy?.name || "Operador"}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4">
                              <div className="flex flex-col gap-0.5">
                                <div>{getPaymentMethodBadge(p.paymentMethod)}</div>
                                {p.verificationDetails.posNsu && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    NSU: {p.verificationDetails.posNsu} • {p.verificationDetails.posCardBrand || "Cartão"}
                                  </span>
                                )}
                                {p.verificationDetails.bankTransferTransactionId && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    TxID: {p.verificationDetails.bankTransferTransactionId}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4 font-bold text-xs sm:text-sm text-foreground">
                              {formatCurrency(p.amountInCents)}
                            </TableCell>

                            <TableCell className="py-3 px-4">
                              <div className="flex flex-col text-xs text-muted-foreground">
                                {p.allocations.map((a) => (
                                  <span key={a.id}>
                                    {a.invoiceNumber}: {formatCurrency(a.allocatedAmountInCents)}
                                  </span>
                                ))}
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4">
                              {p.status === "CONFIRMED" ? (
                                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-normal">
                                  Confirmado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-rose-500 border-rose-500/20 bg-rose-500/10 font-normal">
                                  Estornado
                                </Badge>
                              )}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedReceiptPayment(p);
                                  setIsReceiptOpen(true);
                                }}
                                className="h-8 gap-1 text-xs cursor-pointer"
                              >
                                <Receipt className="size-3.5" />
                                Recibo
                              </Button>

                              {p.status === "CONFIRMED" && canApproveRefunds && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPaymentToReverse(p);
                                    setReversalReasonInput("");
                                    setIsReverseDialogOpen(true);
                                  }}
                                  className="h-8 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-xs cursor-pointer"
                                >
                                  <RotateCcw className="size-3.5" />
                                  Estornar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* TAB 4: CAIXA DA RECEPÇÃO */}
        {userCapabilities.includes("payments.read") && (
          <TabsContent value="cash-drawer" className="mt-0 space-y-4">
            <CashDrawerTab
              workspaceId={workspaceId}
              canManage={canApproveRefunds}
              canRecord={canRecordPayment}
            />
          </TabsContent>
        )}

        {/* TAB 5: DESPESAS E CONTAS A PAGAR */}
        <TabsContent value="expenses" className="mt-0 space-y-4">
          <ExpensesTab
            workspaceId={workspaceId}
            canManage={canIssue}
            canReverse={userCapabilities.includes("refunds.approve")}
          />
        </TabsContent>

        {/* TAB 6: CONTAS FINANCEIRAS E TRANSFERÊNCIAS */}
        <TabsContent value="accounts" className="mt-0 space-y-4">
          <AccountsTab workspaceId={workspaceId} canManage={canIssue} />
        </TabsContent>
      </Tabs>

      {/* ================= MODAIS ================= */}

      {/* DIALOG 1: EMITIR NOVA FATURA (SEM JUSTIFICATIVA DE DESCONTO) */}
      <Dialog
        open={isNewInvoiceOpen}
        onOpenChange={(open) => {
          if (!open && isCreatingInvoice) return;
          setIsNewInvoiceOpen(open);
        }}
      >
        <DialogContent className="max-w-xl sm:overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Emitir Nova Fatura
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Gere uma fatura discriminada com itens, valores e data de vencimento para cobrança.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInvoiceSubmit} className="space-y-4 py-2">
            {/* Aluno Titular */}
            <div className="space-y-1.5">
              <Label htmlFor="invStudent" className="text-xs font-medium">
                Aluno Titular <span className="text-destructive">*</span>
              </Label>
              <Select
                value={invoiceForm.studentMemberId}
                onValueChange={(val) => {
                  setInvoiceForm({ ...invoiceForm, studentMemberId: val });
                }}
                disabled={isCreatingInvoice}
              >
                <SelectTrigger className="w-full text-xs bg-background" id="invStudent">
                  <SelectValue placeholder="Selecione o aluno..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {students.map((s) => (
                      <SelectItem key={s.memberId} value={s.memberId} className="text-xs">
                        {s.name} {s.isMinor ? "(Menor de Idade)" : ""}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Pagador / Responsável Financeiro */}
            <div className="space-y-1.5">
              <Label htmlFor="invPayerType" className="text-xs font-medium">
                Responsável Financeiro / Pagador
              </Label>
              <Select
                value={invoiceForm.payerType}
                onValueChange={(val: "STUDENT" | "GUARDIAN" | "CUSTOM") =>
                  setInvoiceForm({ ...invoiceForm, payerType: val })
                }
                disabled={isCreatingInvoice}
              >
                <SelectTrigger className="w-full text-xs bg-background" id="invPayerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="STUDENT" className="text-xs">
                      O Próprio Aluno
                    </SelectItem>
                    {guardians.some((g) => g.studentMemberId === invoiceForm.studentMemberId) && (
                      <SelectItem value="GUARDIAN" className="text-xs">
                        Responsável Legal Cadastrado
                      </SelectItem>
                    )}
                    <SelectItem value="CUSTOM" className="text-xs">
                      Outro Pagador / Pessoa Jurídica
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {invoiceForm.payerType === "GUARDIAN" && (
              <div className="space-y-1.5">
                <Label htmlFor="invGuardian" className="text-xs font-medium">
                  Selecionar Responsável
                </Label>
                <Select
                  value={invoiceForm.guardianId}
                  onValueChange={(val) => setInvoiceForm({ ...invoiceForm, guardianId: val })}
                  disabled={isCreatingInvoice}
                >
                  <SelectTrigger className="w-full text-xs bg-background" id="invGuardian">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {guardians
                        .filter((g) => g.studentMemberId === invoiceForm.studentMemberId)
                        .map((g) => (
                          <SelectItem key={g.id} value={g.id} className="text-xs">
                            {g.name} ({g.relationship})
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {invoiceForm.payerType === "CUSTOM" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-lg border border-border/50 bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs">Nome / Razão Social</Label>
                  <Input
                    placeholder="Nome do pagador"
                    className="h-8 text-xs bg-background"
                    value={invoiceForm.customName}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customName: e.target.value })}
                    disabled={isCreatingInvoice}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">CPF / CNPJ</Label>
                  <Input
                    placeholder="000.000.000-00"
                    className="h-8 text-xs bg-background font-mono"
                    value={invoiceForm.customCpfCnpj}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customCpfCnpj: e.target.value })}
                    disabled={isCreatingInvoice}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">E-mail</Label>
                  <Input
                    type="email"
                    placeholder="financeiro@empresa.com"
                    className="h-8 text-xs bg-background"
                    value={invoiceForm.customEmail}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, customEmail: e.target.value })}
                    disabled={isCreatingInvoice}
                  />
                </div>
              </div>
            )}

            {/* Título & Vencimento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="invTitle" className="text-xs font-medium">
                  Título da Fatura <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invTitle"
                  required
                  placeholder="Ex: Mensalidade de Outubro"
                  className="text-xs bg-background"
                  value={invoiceForm.title}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
                  disabled={isCreatingInvoice}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="invDue" className="text-xs font-medium">
                  Data de Vencimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="invDue"
                  type="date"
                  required
                  className="text-xs bg-background"
                  value={invoiceForm.dueDate}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  disabled={isCreatingInvoice}
                />
              </div>
            </div>

            {/* Itens da Fatura */}
            <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Itens da Fatura
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInvoiceForm({
                      ...invoiceForm,
                      items: [
                        ...invoiceForm.items,
                        {
                          itemType: "PRODUCT",
                          description: "Taxa / Serviço",
                          quantity: 1,
                          unitPrice: "",
                        },
                      ],
                    });
                  }}
                  disabled={isCreatingInvoice}
                  className="h-7 text-xs gap-1 text-primary hover:text-primary cursor-pointer"
                >
                  <PlusCircle className="size-3.5" />
                  Adicionar Item
                </Button>
              </div>

              {/* Cabeçalho dos Itens */}
              <div className="grid grid-cols-12 gap-2 px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                <span className="col-span-5">Descrição</span>
                <span className="col-span-2 text-center">Qtd</span>
                <span className="col-span-4">Valor Unitário</span>
                <span className="col-span-1"></span>
              </div>

              {invoiceForm.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      placeholder="Descrição do item"
                      className="h-8 text-xs bg-background"
                      value={item.description}
                      onChange={(e) => {
                        const copy = [...invoiceForm.items];
                        copy[idx].description = e.target.value;
                        setInvoiceForm({ ...invoiceForm, items: copy });
                      }}
                      disabled={isCreatingInvoice}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qtd"
                      className="h-8 text-xs bg-background text-center"
                      value={item.quantity}
                      onChange={(e) => {
                        const copy = [...invoiceForm.items];
                        copy[idx].quantity = parseInt(e.target.value) || 1;
                        setInvoiceForm({ ...invoiceForm, items: copy });
                      }}
                      disabled={isCreatingInvoice}
                    />
                  </div>
                  <div className="col-span-4">
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                        R$
                      </span>
                      <Input
                        placeholder="0,00"
                        className="h-8 pl-8 text-xs font-medium bg-background"
                        value={item.unitPrice}
                        onChange={(e) => {
                          const copy = [...invoiceForm.items];
                          copy[idx].unitPrice = formatCurrencyBrl(e.target.value);
                          setInvoiceForm({ ...invoiceForm, items: copy });
                        }}
                        disabled={isCreatingInvoice}
                      />
                    </div>
                  </div>
                  <div className="col-span-1 text-right">
                    {invoiceForm.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setInvoiceForm({
                            ...invoiceForm,
                            items: invoiceForm.items.filter((_, i) => i !== idx),
                          });
                        }}
                        disabled={isCreatingInvoice}
                        className="size-8 text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desconto Comercial (SEM justificativa conforme pedido) */}
            <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-muted/20">
              <Label htmlFor="discAmount" className="text-xs font-medium">
                Desconto Comercial (Opcional)
              </Label>
              <div className="relative max-w-xs">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                  R$
                </span>
                <Input
                  id="discAmount"
                  placeholder="0,00"
                  className="h-8 pl-8 text-xs font-medium bg-background"
                  value={invoiceForm.discountAmount}
                  onChange={(e) =>
                    setInvoiceForm({
                      ...invoiceForm,
                      discountAmount: formatCurrencyBrl(e.target.value),
                    })
                  }
                  disabled={isCreatingInvoice}
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Valor em reais a ser deduzido do subtotal da fatura.
              </p>
            </div>

            {/* Resumo de Valores */}
            <div className="p-3 rounded-lg bg-card border border-border/50 space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal dos itens:</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(subtotalPreviewInCents)}
                </span>
              </div>
              {discountPreviewInCents > 0 && (
                <div className="flex justify-between text-emerald-500 font-medium">
                  <span>Desconto aplicado:</span>
                  <span>-{formatCurrency(discountPreviewInCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-border/30 text-foreground">
                <span>Total a Cobrar:</span>
                <span className="text-primary">{formatCurrency(totalPreviewInCents)}</span>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewInvoiceOpen(false)}
                disabled={isCreatingInvoice}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isCreatingInvoice}
                className="cursor-pointer gap-2"
              >
                {isCreatingInvoice ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Emitindo Fatura...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Emitir Fatura</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: RECEBER PAGAMENTO NO BALCÃO */}
      <Dialog
        open={isPayInPersonOpen}
        onOpenChange={(open) => {
          if (!open && isRecordingPayment) return;
          setIsPayInPersonOpen(open);
        }}
      >
        <DialogContent className="max-w-lg sm:overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <Receipt className="size-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Receber Pagamento no Balcão
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Registre a entrada em dinheiro, maquininha externa ou Pix com cálculo automático de saldo devedor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordInPersonPaymentSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="payMethod" className="text-xs font-medium">
                Forma de Pagamento Recebida <span className="text-destructive">*</span>
              </Label>
              <Select
                value={payInPersonForm.paymentMethod}
                onValueChange={(val) => {
                  if (
                    val === "CASH" ||
                    val === "EXTERNAL_POS_DEBIT" ||
                    val === "EXTERNAL_POS_CREDIT" ||
                    val === "BANK_TRANSFER_MANUAL"
                  )
                    setPayInPersonForm({ ...payInPersonForm, paymentMethod: val });
                }}
                disabled={isRecordingPayment}
              >
                <SelectTrigger className="w-full text-xs bg-background" id="payMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="CASH" className="text-xs">
                      Dinheiro em Espécie
                    </SelectItem>
                    <SelectItem value="EXTERNAL_POS_DEBIT" className="text-xs">
                      Cartão de Débito (Maquininha Externa)
                    </SelectItem>
                    <SelectItem value="EXTERNAL_POS_CREDIT" className="text-xs">
                      Cartão de Crédito (Maquininha Externa)
                    </SelectItem>
                    <SelectItem value="BANK_TRANSFER_MANUAL" className="text-xs">
                      Pix / Transferência Bancária Manual
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="receivedAt" className="text-xs font-medium">
                  Data e Hora do Recebimento
                </Label>
                <Input
                  id="receivedAt"
                  type="datetime-local"
                  className="text-xs bg-background"
                  value={receivedAt}
                  onChange={(event) => setReceivedAt(event.target.value)}
                  disabled={isRecordingPayment}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="payAmount" className="text-xs font-medium">
                  Valor Recebido (R$) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground select-none pointer-events-none">
                    R$
                  </span>
                  <Input
                    id="payAmount"
                    required
                    placeholder="0,00"
                    className="text-xs pl-8 font-medium bg-background"
                    value={payInPersonForm.amount}
                    onChange={(e) =>
                      setPayInPersonForm({
                        ...payInPersonForm,
                        amount: formatCurrencyBrl(e.target.value),
                      })
                    }
                    disabled={isRecordingPayment}
                  />
                </div>
              </div>
            </div>

            {payInPersonForm.paymentMethod !== "CASH" && (
              <div className="space-y-1.5">
                <Label htmlFor="receivingAccount" className="text-xs font-medium">
                  Conta Receptora <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={receivingAccountId}
                  onValueChange={setReceivingAccountId}
                  disabled={isRecordingPayment}
                  required
                >
                  <SelectTrigger id="receivingAccount" className="text-xs bg-background">
                    <SelectValue placeholder="Selecione a conta de destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id} className="text-xs">
                          {account.name} ({account.accountType})
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Campos de maquininha externa */}
            {(payInPersonForm.paymentMethod === "EXTERNAL_POS_DEBIT" ||
              payInPersonForm.paymentMethod === "EXTERNAL_POS_CREDIT") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-3 bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs">Bandeira do Cartão</Label>
                  <Select
                    value={payInPersonForm.posCardBrand}
                    onValueChange={(val) =>
                      setPayInPersonForm({ ...payInPersonForm, posCardBrand: val })
                    }
                    disabled={isRecordingPayment}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Bandeira" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="VISA" className="text-xs">Visa</SelectItem>
                        <SelectItem value="MASTERCARD" className="text-xs">Mastercard</SelectItem>
                        <SelectItem value="ELO" className="text-xs">Elo</SelectItem>
                        <SelectItem value="AMEX" className="text-xs">American Express</SelectItem>
                        <SelectItem value="HIPERCARD" className="text-xs">Hipercard</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Código de Autorização</Label>
                  <Input
                    placeholder="Ex: 849201"
                    className="h-8 text-xs bg-background"
                    value={payInPersonForm.posAuthorizationCode}
                    onChange={(e) =>
                      setPayInPersonForm({ ...payInPersonForm, posAuthorizationCode: e.target.value })
                    }
                    disabled={isRecordingPayment}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">NSU da Maquininha</Label>
                  <Input
                    placeholder="Ex: 09283741"
                    className="h-8 text-xs bg-background"
                    value={payInPersonForm.posNsu}
                    onChange={(e) =>
                      setPayInPersonForm({ ...payInPersonForm, posNsu: e.target.value })
                    }
                    disabled={isRecordingPayment}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Terminal / Máquina</Label>
                  <Input
                    placeholder="Ex: POS Balcão 01"
                    className="h-8 text-xs bg-background"
                    value={payInPersonForm.posTerminalId}
                    onChange={(e) =>
                      setPayInPersonForm({ ...payInPersonForm, posTerminalId: e.target.value })
                    }
                    disabled={isRecordingPayment}
                  />
                </div>
              </div>
            )}

            {/* Campos de Pix / Transferência */}
            {payInPersonForm.paymentMethod === "BANK_TRANSFER_MANUAL" && (
              <div className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-muted/20">
                <Label className="text-xs">Identificador da Transação (TxID / Pix)</Label>
                <Input
                  placeholder="Ex: E1234567820260925..."
                  className="h-8 text-xs bg-background font-mono"
                  value={payInPersonForm.bankTransferTransactionId}
                  onChange={(e) =>
                    setPayInPersonForm({ ...payInPersonForm, bankTransferTransactionId: e.target.value })
                  }
                  disabled={isRecordingPayment}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="payNotes" className="text-xs font-medium">
                Observações Internas (Opcional)
              </Label>
              <Input
                id="payNotes"
                placeholder="Ex: Recebido no balcão da academia"
                className="text-xs bg-background"
                value={payInPersonForm.notes}
                onChange={(e) => setPayInPersonForm({ ...payInPersonForm, notes: e.target.value })}
                disabled={isRecordingPayment}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsPayInPersonOpen(false)}
                disabled={isRecordingPayment}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isRecordingPayment}
                className="cursor-pointer gap-2"
              >
                {isRecordingPayment ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    <span>Confirmar Recebimento</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: RECIBO COMPROVATÓRIO (NÃO FISCAL) */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md sm:overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Receipt className="size-4" />
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  Recibo Comprovatório
                </DialogTitle>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedReceiptPayment?.receiptNumber}
              </Badge>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Comprovante de pagamento presencial emitido pelo caixa da academia.
            </DialogDescription>
          </DialogHeader>

          {selectedReceiptPayment && (
            <div className="space-y-4 py-2 text-sm border-t border-b border-border/50 my-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Data e Hora:</span>
                <span className="font-medium text-foreground">
                  {new Date(selectedReceiptPayment.paidAt).toLocaleString("pt-BR")}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Pagador:</span>
                <span className="font-medium text-foreground">{selectedReceiptPayment.payer.name}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Forma de Pagamento:</span>
                <div>{getPaymentMethodBadge(selectedReceiptPayment.paymentMethod)}</div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Atendente / Caixa:</span>
                <span className="font-medium text-foreground">
                  {selectedReceiptPayment.receivedBy?.name || "Operador"}
                </span>
              </div>

              <div className="rounded-lg bg-muted/40 p-3 space-y-1">
                <span className="text-xs font-semibold block text-muted-foreground">
                  Faturas Alocadas:
                </span>
                {selectedReceiptPayment.allocations.map((a) => (
                  <div key={a.id} className="flex justify-between text-xs">
                    <span>{a.invoiceNumber || "Fatura"}:</span>
                    <span className="font-bold text-foreground">
                      {formatCurrency(a.allocatedAmountInCents)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 text-base font-bold">
                <span>Valor Recebido:</span>
                <span className="text-primary">
                  {formatCurrency(selectedReceiptPayment.amountInCents)}
                </span>
              </div>

              {/* Advertência Legal Obrigatória */}
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
                <span>{selectedReceiptPayment.taxDisclaimer}</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `RECIBO ${selectedReceiptPayment?.receiptNumber}\nValor: ${
                    selectedReceiptPayment ? formatCurrency(selectedReceiptPayment.amountInCents) : ""
                  }\nPagador: ${selectedReceiptPayment?.payer.name}\n${selectedReceiptPayment?.taxDisclaimer}`
                );
                toast.success("Dados do recibo copiados!");
              }}
              className="gap-1.5 cursor-pointer"
            >
              <Copy className="size-3.5" />
              Copiar Texto
            </Button>
            <Button
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 cursor-pointer"
            >
              <Printer className="size-3.5" />
              Imprimir Recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ALERT DIALOG: ESTORNO / REVERSÃO COM JUSTIFICATIVA */}
      <AlertDialog
        open={isReverseDialogOpen}
        onOpenChange={(open) => {
          if (!open && isReversingPayment) return;
          setIsReverseDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="size-5 shrink-0" />
              <AlertDialogTitle className="text-base sm:text-lg">
                Estornar Pagamento Presencial?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Esta ação cancela o recibo{" "}
              <strong className="text-foreground">{selectedPaymentToReverse?.receiptNumber}</strong> e
              reverte o crédito de{" "}
              <strong className="text-foreground">
                {selectedPaymentToReverse ? formatCurrency(selectedPaymentToReverse.amountInCents) : ""}
              </strong>
              , restaurando o saldo devedor nas faturas correspondentes. Esta operação é auditada.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-1.5 py-2">
            <Label htmlFor="revReason" className="text-xs font-medium">
              Justificativa Obrigatória do Estorno <span className="text-destructive">*</span>
            </Label>
            <Input
              id="revReason"
              required
              placeholder="Ex: Erro de digitação no valor recebido"
              className="text-xs bg-background"
              value={reversalReasonInput}
              onChange={(e) => setReversalReasonInput(e.target.value)}
              disabled={isReversingPayment}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isReversingPayment}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleReversePaymentConfirm();
              }}
              disabled={isReversingPayment || !reversalReasonInput.trim()}
              variant="destructive"
              className="gap-2 cursor-pointer"
            >
              {isReversingPayment ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Estornando...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="size-3.5" />
                  <span>Confirmar Estorno</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
