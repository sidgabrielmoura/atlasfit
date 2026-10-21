"use client"

import { GymCatalogSearch, useGymCatalog } from "@/components/application/gym-catalog-search";

import { GymPageHeader, GymEmptyState } from "@/components/application/gym-page";
import { GymTabsList } from "@/components/application/gym-tabs-list";
import { Tabs, TabsTrigger } from "@/components/ui/tabs";
import { SelectGroup } from "@/components/ui/select";
import { useState, useRef, useMemo } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { formatCPF } from "@/lib/cpf-validator"
import { parseBrlCents } from "@/modules/workspaces/domain/currency-input";
import {
  FileText,
  Plus,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Search,
  Eye,
  CreditCard,
  ArrowRightLeft,
  RefreshCw,
  Calculator,
  Calendar,
  Loader2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Clock,
  AlertTriangle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface GymEnrollmentsClientProps {
  workspaceId: string
  initialData: {
    enrollments: any[]
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
  catalogPlans: any[]
  students: any[]
  canApproveChange: boolean
  canManage: boolean
}

function EnrollmentKPICard({
  title,
  value,
  subDetail,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subDetail: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "destructive";
}) {
  const iconColor =
    variant === "success"
      ? "text-emerald-500 bg-emerald-500/10"
      : variant === "destructive"
        ? "text-rose-500 bg-rose-500/10"
        : variant === "warning"
          ? "text-amber-500 bg-amber-500/10"
          : "text-primary bg-primary/10";

  return (
    <Card
      size="sm"
      className="relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xs hover:border-border/80 transition-all duration-200"
    >
      <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
              {title}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </p>
          </div>
          <div className={cn("flex size-8 items-center justify-center rounded-lg shrink-0", iconColor)}>
            <Icon className="size-4" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
          {subDetail}
        </p>
      </CardContent>
    </Card>
  );
}

export function GymEnrollmentsClient({
  workspaceId,
  initialData,
  catalogPlans: initialCatalogPlans,
  students: initialStudents,
  canManage,
  canApproveChange,
}: GymEnrollmentsClientProps) {
  const [enrollments, setEnrollments] = useState<any[]>(initialData.enrollments)
  const [pagination, setPagination] = useState(initialData.pagination)
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("ALL")
  const [searchQuery, setSearchQuery] = useState("")

  // Loading & Async
  const [isLoading, setIsLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const listRequestId = useRef(0)
  const detailsRequestId = useRef(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedEnrollmentDetails, setSelectedEnrollmentDetails] = useState<any | null>(null)
  const [enrollmentToActivate, setEnrollmentToActivate] = useState<any | null>(null)
  const [enrollmentToPause, setEnrollmentToPause] = useState<any | null>(null)
  const [enrollmentToCancel, setEnrollmentToCancel] = useState<any | null>(null)
  const [enrollmentToChangePlan, setEnrollmentToChangePlan] = useState<any | null>(null)
  const [enrollmentToRenew, setEnrollmentToRenew] = useState<any | null>(null)

  // Form - Create
  const [createStudentId, setCreateStudentId] = useState("")
  const [createPlanVersionId, setCreatePlanVersionId] = useState("")
  const [createCustomPrice, setCreateCustomPrice] = useState("")
  const [createPayerName, setCreatePayerName] = useState("")
  const [createPayerCpf, setCreatePayerCpf] = useState("")

  // Form - Edit
  const [enrollmentToEdit, setEnrollmentToEdit] = useState<any | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editAutoRenew, setEditAutoRenew] = useState(true)
  const [editPayerName, setEditPayerName] = useState("")
  const [editPayerCpf, setEditPayerCpf] = useState("")
  const [editPayerEmail, setEditPayerEmail] = useState("")
  const [editPayerPhone, setEditPayerPhone] = useState("")
  const [editNextDueDate, setEditNextDueDate] = useState("")
  const [editEndDate, setEditEndDate] = useState("")

  // Form - Activate
  const [activatePaymentVerified, setActivatePaymentVerified] = useState(true)
  const [activateOverrideReason, setActivateOverrideReason] = useState("")

  // Form - Pause
  const [pauseStartDate, setPauseStartDate] = useState(new Date().toISOString().split("T")[0])
  const [pauseEndDate, setPauseEndDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [pauseReason, setPauseReason] = useState("Licença médica / viagem solicitada pelo aluno")
  const [pauseExtendEndDate, setPauseExtendEndDate] = useState(true)

  const [withdrawTarget, setWithdrawTarget] = useState<any | null>(null)
  const [withdrawReason, setWithdrawReason] = useState("")

  // Form - Cancel
  const [cancelReason, setCancelReason] = useState("")
  const [cancelImmediate, setCancelImmediate] = useState("cycle_end") // "immediate" | "cycle_end"

  // Form - Change Plan
  const [changePlanTargetVersionId, setChangePlanTargetVersionId] = useState("")
  const studentCatalog = useGymCatalog(workspaceId, "students", initialStudents, [createStudentId]);
  const planCatalog = useGymCatalog(workspaceId, "plans", initialCatalogPlans, [createPlanVersionId, changePlanTargetVersionId]);
  const students = studentCatalog.rows, catalogPlans = planCatalog.rows;
  const [changePlanMode, setChangePlanMode] = useState<"IMMEDIATE" | "NEXT_CYCLE">("IMMEDIATE")
  const [changePlanReason, setChangePlanReason] = useState("")
  const [changePlanCharge, setChangePlanCharge] = useState("")
  const [changePlanApproved, setChangePlanApproved] = useState(false)
  const commercialAttempt = useRef<{ payload: string; key: string } | null>(null)
  const commercialKey = (payload: string) => { if (commercialAttempt.current?.payload !== payload) commercialAttempt.current = { payload, key: crypto.randomUUID() }; return commercialAttempt.current.key; }

  // GYM-042: Recorrência & Assinatura Externa
  const [enrollmentToSetupSubscription, setEnrollmentToSetupSubscription] = useState<any | null>(null)


  const [subFirstDueDate, setSubFirstDueDate] = useState("")






  const [enrollmentToGenerateCycle, setEnrollmentToGenerateCycle] = useState<any | null>(null)
  const [cycleCompetenceMonth, setCycleCompetenceMonth] = useState("")
  const [cycleDueDate, setCycleDueDate] = useState("")
  const [isReconcilingId, setIsReconcilingId] = useState<string | null>(null)

  const formatBRL = (cents: number | bigint) => {
    return (Number(cents) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatCurrencyDisplay = (cents: number | bigint) => {
    const num = Number(cents);
    return (num / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCurrencyInputChange = (val: string, setter: (val: string) => void) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) {
      setter("");
      return;
    }
    const centsNum = parseInt(digits, 10);
    setter((centsNum / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const selectedPlanForCreate = useMemo(() => {
    return catalogPlans.find((p) => p.activeVersion?.id === createPlanVersionId);
  }, [catalogPlans, createPlanVersionId]);

  const stats = useMemo(() => {
    const active = enrollments.filter(e => e.status === "ACTIVE").length;
    const pendingAcceptance = enrollments.filter(e => e.status === "PENDING_ACCEPTANCE").length;
    const pendingActivation = enrollments.filter(e => e.status === "PENDING_ACTIVATION").length;
    const paused = enrollments.filter(e => e.status === "PAUSED").length;
    const cancelled = enrollments.filter(e => e.status === "CANCELLED").length;

    return {
      total: pagination.total,
      active,
      pending: pendingAcceptance + pendingActivation,
      pausedOrCancelled: paused + cancelled,
    };
  }, [enrollments, pagination.total]);

  const availableTargetPlans = useMemo(() => {
    if (!enrollmentToChangePlan) return [];
    return catalogPlans.filter(
      (plan) => plan.isActive && plan.activeVersion && plan.activeVersion.id !== enrollmentToChangePlan.planVersionId
    );
  }, [catalogPlans, enrollmentToChangePlan]);

  const setPausePresetDays = (days: number) => {
    const start = pauseStartDate ? new Date(pauseStartDate + "T00:00:00") : new Date();
    const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
    setPauseEndDate(end.toISOString().split("T")[0]);
  };

  const openEditDialog = (enr: any) => {
    setEnrollmentToEdit(enr);
    setEditPrice(enr.priceInCents !== undefined && enr.priceInCents !== null ? formatCurrencyDisplay(enr.priceInCents) : "");
    setEditAutoRenew(enr.autoRenew ?? true);
    setEditPayerName(enr.billingPayerName || "");
    setEditPayerCpf(enr.billingPayerCpf ? formatCPF(enr.billingPayerCpf) : "");
    setEditPayerEmail(enr.billingPayerEmail || "");
    setEditPayerPhone(enr.billingPayerPhone ? formatPhone(enr.billingPayerPhone) : "");
    setEditNextDueDate(enr.nextDueDate ? new Date(enr.nextDueDate).toISOString().slice(0, 10) : "");
    setEditEndDate(enr.endDate ? new Date(enr.endDate).toISOString().slice(0, 10) : "");
  };

  const handleEditEnrollmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentToEdit) return;

    setIsSubmitting(true);
    try {
      const customPriceInCents = editPrice.trim() ? parseBrlCents(editPrice) : undefined;
      if (editPrice.trim() && customPriceInCents === null) {
        throw new Error("Informe um preço negociado válido com até duas casas decimais.");
      }

      const payload: Record<string, any> = {
        workspaceId,
        autoRenew: editAutoRenew,
        billingPayerName: editPayerName.trim() || null,
        billingPayerCpf: editPayerCpf ? editPayerCpf.replace(/\D/g, "") : null,
        billingPayerEmail: editPayerEmail.trim() || null,
        billingPayerPhone: editPayerPhone.trim() || null,
        nextDueDate: editNextDueDate ? new Date(editNextDueDate + "T00:00:00Z").toISOString() : null,
        endDate: editEndDate ? new Date(editEndDate + "T23:59:59Z").toISOString() : null,
      };

      if (customPriceInCents !== undefined) {
        payload.customPriceInCents = customPriceInCents;
      }

      const res = await fetch(`/api/gym/enrollments/${enrollmentToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao salvar alterações da matrícula.");
      }

      toast.success("Matrícula atualizada com sucesso!");
      setEnrollmentToEdit(null);
      loadEnrollments(selectedStatusTab, searchQuery, pagination.page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao editar matrícula.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reload Enrollments
  const loadEnrollments = async (status?: string, search?: string, page = 1) => {
    const requestId = ++listRequestId.current
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        workspaceId,
        page: page.toString(),
        limit: "20",
      })

      if (status && status !== "ALL") {
        params.append("status", status)
      }
      if (search && search.trim().length > 0) {
        params.append("search", search.trim())
      }

      const res = await fetch(`/api/gym/enrollments?${params.toString()}`)
      const data = await res.json()
      if (requestId !== listRequestId.current) return
      if (res.ok) {
        setEnrollments(data.enrollments)
        setPagination(data.pagination)
        setListError(null)
      } else {
        throw new Error(data.error?.message || "Erro ao carregar matrículas.")
      }
    } catch (error) {
      if (requestId !== listRequestId.current) return
      setListError(error instanceof Error ? error.message : "Erro ao carregar matrículas.")
    } finally {
      if (requestId === listRequestId.current) setIsLoading(false)
    }
  }

  // Handle Create Enrollment
  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createStudentId || !createPlanVersionId) {
      toast.error("Selecione o aluno e o plano.")
      return
    }

    setIsSubmitting(true)
    try {
      const customPriceInCents = createCustomPrice
        ? parseBrlCents(createCustomPrice)
        : undefined
      if (customPriceInCents === null) throw new Error("Informe um preço válido com até duas casas decimais.");

      const res = await fetch("/api/gym/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          studentMemberId: createStudentId,
          planVersionId: createPlanVersionId,
          customPriceInCents,
          billingPayerName: createPayerName || undefined,
          billingPayerCpf: createPayerCpf || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao criar matrícula.")
      }

      toast.success("Matrícula criada com sucesso! Aguardando aceite dos termos.")
      setIsCreateOpen(false)
      setCreateStudentId("")
      setCreatePlanVersionId("")
      setCreateCustomPrice("")
      setCreatePayerName("")
      setCreatePayerCpf("")
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar matrícula.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Activate Enrollment
  const handleActivateEnrollment = async () => {
    if (!enrollmentToActivate) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/gym/enrollments/${enrollmentToActivate.id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          paymentVerified: activatePaymentVerified,
          overrideReason: activatePaymentVerified ? undefined : activateOverrideReason,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao ativar matrícula.")
      }

      toast.success("Matrícula ativada! Acesso físico liberado.")
      setEnrollmentToActivate(null)
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err: any) {
      toast.error(err.message || "Erro na ativação.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Pause Enrollment
  const handlePauseEnrollment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollmentToPause) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/gym/enrollments/${enrollmentToPause.id}/pause`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          startDate: pauseStartDate,
          endDate: pauseEndDate,
          reason: pauseReason,
          extendEndDate: pauseExtendEndDate,
          billingResumePolicy: "SKIP",
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao pausar matrícula.")
      }

      toast.success(data.status === "PAUSED" ? "Pausa iniciada. Acesso temporariamente suspenso." : "Pausa programada. O acesso permanece ativo até o início.")
      setEnrollmentToPause(null)
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao pausar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Resume Enrollment
  const handleResumeEnrollment = async (enrollmentId: string) => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/gym/enrollments/${enrollmentId}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao retomar matrícula.")
      }

      toast.success(data.accessGranted ? "Pausa encerrada. Acesso ativo." : "Pausa encerrada. Confira as condições de acesso.")
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao retomar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Cancel Enrollment
  const handleCancelEnrollment = async () => {
    if (!enrollmentToCancel) return
    if (!cancelReason.trim()) {
      toast.error("Informe a justificativa do cancelamento.")
      return
    }

    setIsSubmitting(true)
    try {
      const isImmediate = cancelImmediate === "immediate"
      const res = await fetch(`/api/gym/enrollments/${enrollmentToCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          reason: cancelReason,
          immediate: isImmediate,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao cancelar matrícula.")
      }

      if (isImmediate) {
        toast.success("Matrícula cancelada. Acesso pela matrícula encerrado; obrigações anteriores preservadas.")
      } else {
        toast.success("Cancelamento agendado para o fim da vigência. O estado atual permanece até essa data.")
      }

      setEnrollmentToCancel(null)
      setCancelReason("")
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err: any) {
      toast.error(err.message || "Erro ao cancelar.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Simulate Plan Change
  // Open Plan Change Dialog
  const openPlanChangeDialog = (enrollment: any) => {
    setEnrollmentToChangePlan(enrollment)
    setChangePlanMode("IMMEDIATE")
    setChangePlanReason("")
    setChangePlanApproved(false)
    setChangePlanCharge("")

    // Pre-select first eligible active plan that is different
    const available = catalogPlans
      .filter((p) => p.isActive && p.activeVersion && p.activeVersion.id !== enrollment.planVersionId)
    if (available.length > 0) {
      setChangePlanTargetVersionId(available[0].activeVersion.id)
      const price = available[0].activeVersion.priceInCents
      setChangePlanCharge(formatCurrencyDisplay(price))
    } else {
      setChangePlanTargetVersionId("")
      setChangePlanCharge("")
    }
  }

  // Execute Plan Change
  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollmentToChangePlan || !changePlanTargetVersionId || !changePlanApproved) return

    setIsSubmitting(true)
    try {
      const initialChargeInCents = changePlanCharge.trim() ? parseBrlCents(changePlanCharge) : 0;
      if (initialChargeInCents === null) {
        throw new Error("Informe um valor válido para a 1ª cobrança.");
      }

      const payload = {
        workspaceId,
        newPlanVersionId: changePlanTargetVersionId,
        mode: changePlanMode,
        reason: changePlanReason.trim() || "Troca de plano solicitada",
        initialChargeInCents,
        financialAdjustmentApproved: true,
      };
      const res = await fetch(`/api/gym/enrollments/${enrollmentToChangePlan.id}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, requestKey: commercialKey(JSON.stringify({ enrollmentId: enrollmentToChangePlan.id, ...payload })) }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao alterar plano.")
      }

      toast.success("Plano alterado com sucesso! Novo contrato preparado.")

      setEnrollmentToChangePlan(null)
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao trocar de plano.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Renew Enrollment
  const handleRenewEnrollment = async () => {
    if (!enrollmentToRenew) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/gym/enrollments/${enrollmentToRenew.id}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          requestKey: commercialKey(JSON.stringify({ renewal: enrollmentToRenew.id, workspaceId })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao renovar matrícula.")
      }

      toast.success("Renovação preparada. Aguarda novo aceite, recebimento e ativação.")
      setEnrollmentToRenew(null)
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro na renovação.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Setup Subscription Submit (GYM-042)
  const handleSetupSubscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollmentToSetupSubscription) return;
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/gym/enrollments/' + enrollmentToSetupSubscription.id + '/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, recurrenceMode: 'LOCAL', billingType: 'UNDEFINED', customFirstDueDate: subFirstDueDate || undefined }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Não foi possível configurar a recorrência.');
      toast.success('Mensalidades internas configuradas. Registre os recebimentos no financeiro.');
      setEnrollmentToSetupSubscription(null);
      await loadEnrollments(selectedStatusTab, searchQuery);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao configurar mensalidades.'); }
    finally { setIsSubmitting(false); }
  }

  // Generate Next Cycle Submit (GYM-042)
  const handleGenerateCycleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!enrollmentToGenerateCycle) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/gym/enrollments/${enrollmentToGenerateCycle.id}/subscription/cycle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          competenceMonth: cycleCompetenceMonth || undefined,
          dueDate: cycleDueDate || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao gerar ciclo.")
      }

      toast.success(`Fatura ${data.invoiceNumber} gerada para o ciclo ${data.cycleNumber}!`)
      setEnrollmentToGenerateCycle(null)
      loadEnrollments(selectedStatusTab, searchQuery)
    } catch (err: any) {
      toast.error(err.message || "Falha ao gerar fatura do ciclo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWithdrawCancellation = async () => {
    if (!withdrawTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gym/enrollments/' + withdrawTarget.id + '/cancel/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, reason: withdrawReason }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error?.message || 'Não foi possível retirar o cancelamento.');
      toast.success('Cancelamento retirado. A renovação automática permanece desativada.'); setWithdrawTarget(null); loadEnrollments(selectedStatusTab, searchQuery);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao retirar cancelamento.'); }
    finally { setIsSubmitting(false); }
  }

  // Open Full Details
  const openDetails = async (enrollment: any, historyPage = 1) => {
    const reqId = ++detailsRequestId.current;
    setSelectedEnrollmentDetails(enrollment);
    try {
      const res = await fetch(`/api/gym/enrollments/${enrollment.id}?workspaceId=${workspaceId}&historyPage=${historyPage}`);
      if (res.ok) {
        const full = await res.json();
        if (detailsRequestId.current === reqId) {
          setSelectedEnrollmentDetails((prev: any) => (prev ? full : null));
        }
      }
    } catch {
      // Keep existing data
    }
  };

  const renderStatusBadge = (status: string) => {
    const labels: Record<string, string> = {
      ACTIVE: "Ativa", PENDING_ACCEPTANCE: "Aguardando aceite", PENDING_ACTIVATION: "Aguardando pagamento",
      PAUSED: "Pausada", CANCELLED: "Cancelada", EXPIRED: "Expirada"
    }
    return <Badge variant="outline" className="gap-1.5 border-border/60 bg-transparent text-[10px] font-medium text-muted-foreground"><span className={status === "ACTIVE" ? "size-1.5 rounded-full bg-foreground" : "size-1.5 rounded-full bg-muted-foreground/40"} />{labels[status] || status}</Badge>
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <GymPageHeader title="Matrículas & Contratos" description="Acompanhe planos, contratos eletrônicos e a vigência de cada aluno."
        actions={canManage && <Button variant="outline" className="h-10 gap-2 cursor-pointer font-medium" onClick={() => setIsCreateOpen(true)}><Plus className="size-4" />Nova matrícula</Button>}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <EnrollmentKPICard
          title="Total Matrículas"
          value={stats.total}
          subDetail="Cadastradas na academia"
          icon={FileText}
          variant="default"
        />
        <EnrollmentKPICard
          title="Matrículas Ativas"
          value={stats.active}
          subDetail="Acesso físico liberado"
          icon={CheckCircle2}
          variant="success"
        />
        <EnrollmentKPICard
          title="Pendências"
          value={stats.pending}
          subDetail="Aceite ou 1º pagamento"
          icon={Clock}
          variant="warning"
        />
        <EnrollmentKPICard
          title="Pausadas / Canceladas"
          value={stats.pausedOrCancelled}
          subDetail="Trancadas ou encerradas"
          icon={AlertTriangle}
          variant="destructive"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Buscar matrículas por aluno ou CPF" placeholder="Buscar aluno ou CPF..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); loadEnrollments(selectedStatusTab, e.target.value) }} className="h-10 bg-card pl-9" />
        </div>
        <Select value={selectedStatusTab} onValueChange={(value) => { setSelectedStatusTab(value); loadEnrollments(value, searchQuery) }}>
          <SelectTrigger aria-label="Filtrar situação da matrícula" className="w-full sm:w-56"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="ALL">Todas as situações</SelectItem><SelectItem value="ACTIVE">Ativas</SelectItem><SelectItem value="PENDING_ACCEPTANCE">Aguardando aceite</SelectItem><SelectItem value="PENDING_ACTIVATION">Aguardando pagamento</SelectItem><SelectItem value="PAUSED">Pausadas</SelectItem><SelectItem value="EXPIRED">Expiradas</SelectItem><SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
        {(searchQuery || selectedStatusTab !== "ALL") && <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setSelectedStatusTab("ALL"); loadEnrollments("ALL", "") }}>Limpar filtros</Button>}
        <span className="text-xs text-muted-foreground sm:ml-auto" aria-live="polite">{pagination.total} {pagination.total === 1 ? "matrícula" : "matrículas"}</span>
      </div>

      {listError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/30 p-4"><p className="text-sm text-muted-foreground">{listError}</p><Button variant="outline" size="sm" onClick={() => loadEnrollments(selectedStatusTab, searchQuery, pagination.page)}>Tentar novamente</Button></div>}

      {isLoading ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Carregando matrículas">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} className="flex flex-col gap-4 rounded-xl border border-border/60 bg-card p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-7 w-28" />
              <div className="grid grid-cols-2 gap-3 border-t border-border/40 pt-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="mt-auto border-t border-border/40 pt-3 flex gap-2">
                <Skeleton className="h-8 flex-1" />
                <Skeleton className="h-8 w-20" />
              </div>
            </Card>
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <GymEmptyState icon={FileText} title="Nenhuma matrícula encontrada" description="Ajuste os filtros ou crie uma matrícula para começar." className="rounded-2xl border border-dashed border-border py-16" />
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {enrollments.map((enr) => {
            const studentUser = enr.studentMember?.user
            const version = enr.planVersion
            const studentName = studentUser?.name || "Aluno sem nome"
            const creditBalance = Number(enr.creditBalanceInCents || 0)
            return (
              <Card key={enr.id} className="flex h-full flex-col overflow-hidden rounded-xl border border-border/60 bg-card p-0 shadow-xs transition-colors duration-200 hover:border-foreground/20">
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <Avatar className="size-11 shrink-0 border border-border/40"><AvatarImage src={studentUser?.image || ""} alt={studentName} /><AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">{studentName.split(" ").filter(Boolean).map((part: string) => part[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback></Avatar>
                      <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{studentName}</h2><p className="mt-0.5 truncate text-xs text-muted-foreground">{studentUser?.email || "E-mail não informado"}</p></div>
                    </div>
                    {canManage && <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="-mr-1.5 size-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer" disabled={isSubmitting || isReconcilingId === enr.id} aria-label={"Ações da matrícula de " + studentName}><MoreVertical className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openEditDialog(enr)}><Edit2 className="size-4" />Editar matrícula</DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => openDetails(enr)}><Eye className="size-4" />Ver contrato e histórico</DropdownMenuItem>
                        {(enr.status !== "CANCELLED" || enr.providerSubscriptionId) && <DropdownMenuSeparator />}
                        {canApproveChange && enr.status === "ACTIVE" && <DropdownMenuItem className="cursor-pointer" onClick={() => openPlanChangeDialog(enr)}><ArrowRightLeft className="size-4" />Trocar plano</DropdownMenuItem>}
                        {(enr.status === "ACTIVE" || enr.status === "EXPIRED") && <DropdownMenuItem className="cursor-pointer" onClick={() => setEnrollmentToRenew(enr)}><RefreshCw className="size-4" />Renovar matrícula</DropdownMenuItem>}
                        {enr.status === "PENDING_ACTIVATION" && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEnrollmentToActivate(enr); setActivatePaymentVerified(true); setActivateOverrideReason("") }}><CheckCircle2 className="size-4" />Ativar matrícula</DropdownMenuItem>}
                        {enr.status === "ACTIVE" && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEnrollmentToPause(enr); setPauseExtendEndDate(true) }}><PauseCircle className="size-4" />Pausar matrícula</DropdownMenuItem>}
                        {enr.status === "PAUSED" && <DropdownMenuItem className="cursor-pointer" onClick={() => handleResumeEnrollment(enr.id)}><PlayCircle className="size-4" />Retomar matrícula</DropdownMenuItem>}
                        {enr.status !== "CANCELLED" && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEnrollmentToSetupSubscription(enr); setSubFirstDueDate(enr.nextDueDate ? new Date(enr.nextDueDate).toISOString().slice(0, 10) : "") }}><CreditCard className="size-4" />Configurar recorrência</DropdownMenuItem>}
                        {(enr.status === "ACTIVE" || enr.status === "PENDING_ACTIVATION") && <DropdownMenuItem className="cursor-pointer" onClick={() => { setEnrollmentToGenerateCycle(enr); const now = new Date(); setCycleCompetenceMonth(now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0")); setCycleDueDate(enr.nextDueDate ? new Date(enr.nextDueDate).toISOString().slice(0, 10) : now.toISOString().slice(0, 10)) }}><Calendar className="size-4" />Gerar ciclo de cobrança</DropdownMenuItem>}
                        {(enr.providerSubscriptionId || enr.recurrenceMode === "PROVIDER" || enr.scheduledPlanVersionId || creditBalance !== 0) && <DropdownMenuItem asChild><Link href="/gym/reconciliation" className="cursor-pointer"><RefreshCw className="size-4" />Revisar legado e saldos</Link></DropdownMenuItem>}{enr.cancellationEffectiveDate && ["ACTIVE", "PAUSED"].includes(enr.status) && <DropdownMenuItem className="cursor-pointer" onClick={() => { setWithdrawTarget(enr); setWithdrawReason(""); }}><RefreshCw className="size-4" />Retirar cancelamento futuro</DropdownMenuItem>}
                        {enr.status !== "CANCELLED" && <><DropdownMenuSeparator /><DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive" onClick={() => { setEnrollmentToCancel(enr); setCancelReason(""); setCancelImmediate(["ACTIVE", "PAUSED"].includes(enr.status) && enr.endDate && new Date(enr.endDate) > new Date() ? "cycle_end" : "immediate") }}><XCircle className="size-4" />Cancelar matrícula</DropdownMenuItem></>}
                      </DropdownMenuContent>
                    </DropdownMenu>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">{renderStatusBadge(enr.status)}<span className="text-[11px] text-muted-foreground">{version?.plan?.name || "Plano"}{version?.version ? " · v" + version.version : ""}</span></div>
                  <div className="flex items-baseline justify-between gap-3"><p className="text-xl font-semibold tracking-tight tabular-nums">{formatBRL(enr.priceInCents)}</p>{creditBalance > 0 && <span className="text-[11px] text-muted-foreground">Crédito {formatBRL(creditBalance)}</span>}</div>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/40 pt-3 text-xs">
                    <div><dt className="text-[11px] text-muted-foreground">Início</dt><dd className="mt-1 tabular-nums">{enr.startDate ? new Date(enr.startDate).toLocaleDateString("pt-BR") : "Não definido"}</dd></div>
                    <div><dt className="text-[11px] text-muted-foreground">Término</dt><dd className="mt-1 tabular-nums">{enr.endDate ? new Date(enr.endDate).toLocaleDateString("pt-BR") : "Indeterminado"}</dd></div>
                    <div><dt className="text-[11px] text-muted-foreground">Acesso pela matrícula</dt><dd className="mt-1 flex items-center gap-1.5">{enr.accessGranted ? <ShieldCheck className="size-3.5 text-emerald-500" /> : <ShieldAlert className="size-3.5 text-muted-foreground" />}{enr.accessGranted ? "Liberado" : "Bloqueado"}</dd></div>
                    <div><dt className="text-[11px] text-muted-foreground">Cobrança</dt><dd className="mt-1">{enr.recurrenceMode === "PROVIDER" ? "Assinatura externa legada" : enr.recurrenceMode === "LOCAL" ? "Ciclo local" : "Não configurada"}{enr.billingType && enr.billingType !== "UNDEFINED" ? " · " + ({ CREDIT_CARD: "Cartão", PIX: "Pix", BOLETO: "Boleto" } as Record<string, string>)[enr.billingType] : ""}</dd></div>
                  </dl>
                  {(enr.scheduledPlanVersion || enr.cancellationEffectiveDate) && <div className="space-y-1 rounded-lg bg-muted/30 p-3 text-[11px] text-muted-foreground">{enr.scheduledPlanVersion && <p>Próximo ciclo: {enr.scheduledPlanVersion.plan?.name}</p>}{enr.cancellationEffectiveDate && <p>Cancelamento agendado para {new Date(enr.cancellationEffectiveDate).toLocaleDateString("pt-BR")}</p>}</div>}
                  <div className="mt-auto border-t border-border/40 pt-3 flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 flex-1 gap-1.5 border-border/60 text-xs font-medium cursor-pointer" onClick={() => openDetails(enr)}>
                      <Eye className="size-3.5" />Ver detalhes
                    </Button>
                    {canManage && (
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border/60 text-xs font-medium hover:bg-primary/10 hover:text-primary hover:border-primary/30 cursor-pointer" onClick={() => openEditDialog(enr)}>
                        <Edit2 className="size-3.5" />Editar
                      </Button>
                    )}
                  </div>
                  {isReconcilingId === enr.id && <p role="status" className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Reconciliando assinatura...</p>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {pagination.totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4"><span className="text-xs text-muted-foreground">Mostrando {enrollments.length} de {pagination.total} matrículas</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={isLoading || pagination.page <= 1} onClick={() => loadEnrollments(selectedStatusTab, searchQuery, pagination.page - 1)}><ChevronLeft className="size-4" />Anterior</Button><span className="px-2 text-xs tabular-nums">{pagination.page} / {pagination.totalPages}</span><Button variant="outline" size="sm" disabled={isLoading || pagination.page >= pagination.totalPages} onClick={() => loadEnrollments(selectedStatusTab, searchQuery, pagination.page + 1)}>Próxima<ChevronRight className="size-4" /></Button></div></div>}

      {/* CREATE ENROLLMENT DIALOG */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
          <form onSubmit={handleCreateEnrollment}>
            <DialogHeader>
              <DialogTitle>Nova Matrícula de Aluno</DialogTitle>
              <DialogDescription>
                Selecione o aluno e o plano comercial. O contrato nascerá aguardando aceite eletrônico.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 min-w-0 [&>*]:min-w-0">
              <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                <Label htmlFor="create-student-select" className="text-sm font-medium">Aluno *</Label>
                <Select value={createStudentId} onValueChange={setCreateStudentId}>
                  <SelectTrigger id="create-student-select" className="w-full min-w-0 h-10">
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectGroup>
                      {students.map((st) => (
                        <SelectItem key={st.id} value={st.id}>
                          {st.name} {st.email ? `(${st.email})` : `(Mat: ${st.registrationNumber || "S/N"})`}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                <Label htmlFor="create-plan-select" className="text-sm font-medium">Plano do Catálogo *</Label>
                <Select value={createPlanVersionId} onValueChange={setCreatePlanVersionId}>
                  <SelectTrigger id="create-plan-select" className="w-full min-w-0 h-10">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {catalogPlans
                        .filter((p) => p.isActive && p.activeVersion)
                        .map((p) => (
                          <SelectItem key={p.activeVersion.id} value={p.activeVersion.id}>
                            {p.name} - v{p.activeVersion.version} ({formatBRL(p.activeVersion.priceInCents)} / {p.activeVersion.billingCycle.toLowerCase()})
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                <div className="flex items-center justify-between">
                  <Label htmlFor="create-custom-price" className="text-sm font-medium">Preço Negociado / Personalizado (R$)</Label>
                  {selectedPlanForCreate && (
                    <span className="text-xs text-muted-foreground">
                      Padrão do plano: <span className="font-semibold text-foreground">{formatBRL(selectedPlanForCreate.activeVersion.priceInCents)}</span>
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                    R$
                  </span>
                  <Input
                    id="create-custom-price"
                    inputMode="numeric"
                    placeholder={selectedPlanForCreate ? (Number(selectedPlanForCreate.activeVersion.priceInCents) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00"}
                    value={createCustomPrice}
                    onChange={(e) => handleCurrencyInputChange(e.target.value, setCreateCustomPrice)}
                    className="pl-10 h-10 font-medium"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar o valor oficial do plano.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40 min-w-0 [&>*]:min-w-0">
                <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="create-payer-name" className="text-sm font-medium">Nome do Pagador (Opcional)</Label>
                  <Input
                    id="create-payer-name"
                    placeholder="Se diferente do aluno"
                    value={createPayerName}
                    onChange={(e) => setCreatePayerName(e.target.value)}
                    className="h-10"
                  />
                </div>

                <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="create-payer-cpf" className="text-sm font-medium">CPF do Pagador (Opcional)</Label>
                  <Input
                    id="create-payer-cpf"
                    placeholder="000.000.000-00"
                    value={createPayerCpf}
                    maxLength={14}
                    onChange={(e) => setCreatePayerCpf(formatCPF(e.target.value))}
                    className="h-10"
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !createStudentId || !createPlanVersionId}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Gerando Matrícula...
                  </>
                ) : (
                  "Criar Matrícula"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ENROLLMENT DIALOG */}
      <Dialog open={Boolean(enrollmentToEdit)} onOpenChange={(open) => { if (!isSubmitting && !open) setEnrollmentToEdit(null) }}>
        <DialogContent className="max-w-xl sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
          {enrollmentToEdit && (
            <form onSubmit={handleEditEnrollmentSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit2 className="size-5 text-primary" />
                  Editar Matrícula
                </DialogTitle>
                <DialogDescription>
                  Atualize os valores negociados, vigência e pagador responsável pelo contrato.
                </DialogDescription>
              </DialogHeader>

              {/* Student info banner */}
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <Avatar className="size-10 shrink-0 border border-border/40">
                  <AvatarImage src={enrollmentToEdit.studentMember?.user?.image || ""} />
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {(enrollmentToEdit.studentMember?.user?.name || "AL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {enrollmentToEdit.studentMember?.user?.name || "Aluno"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Plano: {enrollmentToEdit.planVersion?.plan?.name || enrollmentToEdit.planVersion?.name || "Plano"} · Situação: {enrollmentToEdit.status}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 py-4 min-w-0 [&>*]:min-w-0">
                {/* Preço Negociado */}
                <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="edit-price" className="text-sm font-medium">Preço Mensal Negociado (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                      R$
                    </span>
                    <Input
                      id="edit-price"
                      inputMode="numeric"
                      placeholder="0,00"
                      value={editPrice}
                      onChange={(e) => handleCurrencyInputChange(e.target.value, setEditPrice)}
                      className="pl-10 h-10 font-medium"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor mensal contratado da matrícula.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 [&>*]:min-w-0">
                  {/* Próximo Vencimento */}
                  <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="edit-next-due" className="text-sm font-medium">Próximo Vencimento</Label>
                    <Input
                      id="edit-next-due"
                      type="date"
                      value={editNextDueDate}
                      onChange={(e) => setEditNextDueDate(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  {/* Término do Contrato */}
                  <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="edit-end-date" className="text-sm font-medium">Término do Contrato</Label>
                    <Input
                      id="edit-end-date"
                      type="date"
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                {/* Renovação Automática */}
                <div className="flex items-center space-x-2 pt-1">
                  <Checkbox
                    id="edit-auto-renew"
                    checked={editAutoRenew}
                    onCheckedChange={(checked) => setEditAutoRenew(checked === true)}
                  />
                  <Label htmlFor="edit-auto-renew" className="text-sm cursor-pointer leading-none">
                    Renovação automática ao final do período
                  </Label>
                </div>

                {/* Dados do Pagador */}
                <div className="space-y-3 pt-3 border-t border-border/40">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dados do Pagador / Responsável Financeiro
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-payer-name" className="text-sm font-medium">Nome do Pagador</Label>
                      <Input
                        id="edit-payer-name"
                        placeholder="Nome completo"
                        value={editPayerName}
                        onChange={(e) => setEditPayerName(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="edit-payer-cpf" className="text-sm font-medium">CPF do Pagador</Label>
                      <Input
                        id="edit-payer-cpf"
                        placeholder="000.000.000-00"
                        value={editPayerCpf}
                        maxLength={14}
                        onChange={(e) => setEditPayerCpf(formatCPF(e.target.value))}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-payer-email" className="text-sm font-medium">E-mail de Cobrança</Label>
                      <Input
                        id="edit-payer-email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={editPayerEmail}
                        onChange={(e) => setEditPayerEmail(e.target.value)}
                        className="h-10"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="edit-payer-phone" className="text-sm font-medium">Telefone / WhatsApp</Label>
                      <Input
                        id="edit-payer-phone"
                        placeholder="(00) 00000-0000"
                        value={editPayerPhone}
                        maxLength={15}
                        onChange={(e) => setEditPayerPhone(formatPhone(e.target.value))}
                        className="h-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnrollmentToEdit(null)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG TROCAR PLANO */}
      <Dialog
        open={Boolean(enrollmentToChangePlan)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setEnrollmentToChangePlan(null);
        }}
      >
        <DialogContent className="max-w-lg sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
          {enrollmentToChangePlan && (
            <form onSubmit={handleChangePlanSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ArrowRightLeft className="size-5 text-primary" />
                  Trocar Plano
                </DialogTitle>
                <DialogDescription>
                  Selecione o novo plano para atualizar o contrato do aluno.
                </DialogDescription>
              </DialogHeader>

              {/* Student & Current Plan Info */}
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <Avatar className="size-10 shrink-0 border border-border/40">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {(enrollmentToChangePlan.studentMember?.user?.name || "AL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {enrollmentToChangePlan.studentMember?.user?.name || "Aluno"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Plano atual: <span className="font-medium text-foreground">{enrollmentToChangePlan.planVersion?.plan?.name || enrollmentToChangePlan.planVersion?.name || "Plano"}</span> ({formatBRL(enrollmentToChangePlan.priceInCents)})
                  </p>
                </div>
              </div>

              {availableTargetPlans.length === 0 ? (
                <div className="my-5 flex flex-col items-center justify-center rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 p-6 text-center">
                  <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mb-2">
                    <AlertTriangle className="size-5" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Nenhum outro plano disponível</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Não existem outros planos ativos no catálogo desta academia para troca. Crie ou ative outros planos no menu de Planos.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 py-4 min-w-0 [&>*]:min-w-0">
                  {/* Select New Plan - No search input */}
                  <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="change-plan-target" className="text-sm font-medium">Novo Plano</Label>
                    <Select
                      value={changePlanTargetVersionId}
                      onValueChange={(value) => {
                        setChangePlanTargetVersionId(value);
                        setChangePlanApproved(false);
                        const selected = catalogPlans.find((plan) => plan.activeVersion?.id === value);
                        if (selected?.activeVersion?.priceInCents !== undefined) {
                          setChangePlanCharge(formatCurrencyDisplay(selected.activeVersion.priceInCents));
                        }
                      }}
                    >
                      <SelectTrigger id="change-plan-target" className="h-10">
                        <SelectValue placeholder="Selecione o plano de destino" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {availableTargetPlans.map((plan) => (
                            <SelectItem key={plan.activeVersion.id} value={plan.activeVersion.id}>
                              {plan.name} · {formatBRL(plan.activeVersion.priceInCents)}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 [&>*]:min-w-0">
                    {/* Início da nova vigência */}
                    <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                      <Label htmlFor="change-plan-mode" className="text-sm font-medium">Início da Vigência</Label>
                      <Select
                        value={changePlanMode}
                        onValueChange={(value: "IMMEDIATE" | "NEXT_CYCLE") => {
                          setChangePlanMode(value);
                          setChangePlanApproved(false);
                        }}
                      >
                        <SelectTrigger id="change-plan-mode" className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IMMEDIATE">Imediato (ao ativar)</SelectItem>
                          <SelectItem value="NEXT_CYCLE">Próximo vencimento</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Valor da 1ª Cobrança (R$) */}
                    <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                      <Label htmlFor="change-plan-charge" className="text-sm font-medium">Valor da 1ª Cobrança (R$)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                          R$
                        </span>
                        <Input
                          id="change-plan-charge"
                          inputMode="numeric"
                          placeholder="0,00"
                          value={changePlanCharge}
                          onChange={(e) => handleCurrencyInputChange(e.target.value, setChangePlanCharge)}
                          className="pl-10 h-10 font-medium"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Motivo da Troca */}
                  <div className="grid gap-2 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="change-plan-reason" className="text-sm font-medium">Motivo da Troca</Label>
                    <Input
                      id="change-plan-reason"
                      placeholder="Ex: Upgrade solicitado pelo aluno"
                      value={changePlanReason}
                      onChange={(e) => {
                        setChangePlanReason(e.target.value);
                        setChangePlanApproved(false);
                      }}
                      className="h-10"
                      required
                    />
                  </div>

                  {/* Confirmação */}
                  <div className="flex items-center space-x-2 pt-1">
                    <Checkbox
                      id="change-plan-approval"
                      checked={changePlanApproved}
                      onCheckedChange={(val) => setChangePlanApproved(val === true)}
                    />
                    <Label htmlFor="change-plan-approval" className="text-xs font-normal cursor-pointer text-muted-foreground leading-snug">
                      Confirmo a emissão do novo contrato com os valores informados.
                    </Label>
                  </div>
                </div>
              )}

              <DialogFooter className="gap-2! flex sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setEnrollmentToChangePlan(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    availableTargetPlans.length === 0 ||
                    !canApproveChange ||
                    !changePlanTargetVersionId ||
                    !changePlanApproved
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Alterando Plano...
                    </>
                  ) : (
                    "Confirmar Troca"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG RENOVAR MATRÍCULA */}
      <Dialog
        open={Boolean(enrollmentToRenew)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setEnrollmentToRenew(null);
        }}
      >
        <DialogContent className="max-w-md">
          {enrollmentToRenew && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="size-5 text-primary" />
                  Renovar Matrícula
                </DialogTitle>
                <DialogDescription>
                  Gera um novo período contratual para o aluno mantendo seu histórico.
                </DialogDescription>
              </DialogHeader>

              {/* Student & Plan Summary Card */}
              <div className="my-4 rounded-lg border border-border/50 bg-muted/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Aluno</span>
                  <span className="text-sm font-semibold text-foreground">
                    {enrollmentToRenew.studentMember?.user?.name || "Aluno"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/30 pt-2">
                  <span className="text-xs text-muted-foreground">Plano</span>
                  <span className="text-sm font-medium text-foreground">
                    {enrollmentToRenew.planVersion?.plan?.name || enrollmentToRenew.planVersion?.name || "Plano"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border/30 pt-2">
                  <span className="text-xs text-muted-foreground">Valor</span>
                  <span className="text-sm font-semibold text-primary">
                    {formatBRL(enrollmentToRenew.priceInCents)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mb-4">
                Um novo termo será gerado para o aceite digital do aluno. Acesso físico e histórico permanecem preservados.
              </p>

              <DialogFooter className="gap-2! flex sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setEnrollmentToRenew(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRenewEnrollment}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Renovando...
                    </>
                  ) : (
                    "Confirmar Renovação"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ENROLLMENT DETAILS & CONTRACT TERMS DIALOG */}
      <Dialog
        open={Boolean(selectedEnrollmentDetails)}
        onOpenChange={(open) => {
          if (!open) {
            detailsRequestId.current++;
            setSelectedEnrollmentDetails(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              Contrato & Detalhes da Matrícula
            </DialogTitle>
            <DialogDescription>
              Dados contratuais, aceite eletrônico e histórico de eventos.
            </DialogDescription>
          </DialogHeader>

          {selectedEnrollmentDetails && (
            <div className="space-y-4 py-2 text-sm">
              {/* Top Banner */}
              <div className="rounded-lg bg-muted/40 p-3.5 border border-border/50 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 [&>*]:min-w-0">
                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Aluno Titular</span>
                  <div className="font-semibold text-base mt-0.5 truncate">
                    {selectedEnrollmentDetails.studentMember?.user?.name || "Aluno"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    CPF: {selectedEnrollmentDetails.studentMember?.user?.cpfCnpj ? formatCPF(selectedEnrollmentDetails.studentMember?.user?.cpfCnpj) : "Não informado"}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Plano Contratado</span>
                  <div className="font-semibold text-base mt-0.5 truncate">
                    {selectedEnrollmentDetails.planVersion?.plan?.name || selectedEnrollmentDetails.planVersion?.name || "Plano"}
                  </div>
                  <div className="text-xs font-semibold text-primary">
                    {formatBRL(selectedEnrollmentDetails.priceInCents)} / {selectedEnrollmentDetails.planVersion?.billingCycle?.toLowerCase() || "mês"}
                  </div>
                </div>
              </div>

              {/* Legal Acceptance Proof */}
              <div className="rounded-lg border border-border/50 p-3.5 space-y-2 bg-background/50">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs flex items-center gap-1.5 uppercase tracking-wider text-muted-foreground">
                    <ShieldCheck className="size-4 text-emerald-500" />
                    Aceite Contratual Eletrônico
                  </span>
                  {selectedEnrollmentDetails.acceptance ? (
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 bg-emerald-500/10 text-[11px]">
                      Assinado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-border/50 text-[11px]">
                      Pendente de Assinatura
                    </Badge>
                  )}
                </div>

                {selectedEnrollmentDetails.acceptance ? (
                  <div className="text-xs space-y-1 text-muted-foreground pt-1.5 border-t border-border/40">
                    <div>
                      <strong className="text-foreground">Signatário:</strong>{" "}
                      {selectedEnrollmentDetails.acceptance.signerUser?.name || "Titular"} (
                      {selectedEnrollmentDetails.acceptance.representationRole === "SELF"
                        ? "Próprio Titular"
                        : `Responsável Legal: ${selectedEnrollmentDetails.acceptance.representationRole}`}
                      )
                    </div>
                    <div>
                      <strong className="text-foreground">Data e Hora:</strong>{" "}
                      {new Date(selectedEnrollmentDetails.acceptance.signedAt).toLocaleString("pt-BR")}
                    </div>
                    <div>
                      <strong className="text-foreground">IP / Auditoria:</strong>{" "}
                      {selectedEnrollmentDetails.acceptance.ipAddress || "Registrado"} · Termos v{selectedEnrollmentDetails.acceptance.termsVersion}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic pt-1 border-t border-border/40">
                    Aguardando assinatura digital dos termos pelo aluno ou responsável legal.
                  </div>
                )}
              </div>

              {/* Contract Terms Snapshot */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Termos do Contrato
                </label>
                <div className="max-h-36 overflow-y-auto rounded-md bg-muted/20 p-3 border border-border/50 font-mono text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {selectedEnrollmentDetails.acceptance?.termsSnapshot ||
                    selectedEnrollmentDetails.planVersion?.termsText ||
                    "Sem minuta de termos registrada para esta versão."}
                </div>
              </div>

              {/* Event Lifecycle Log */}
              {selectedEnrollmentDetails.events?.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Histórico de Eventos
                  </span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {selectedEnrollmentDetails.events.map((ev: any) => (
                      <div
                        key={ev.id}
                        className="text-xs p-2 rounded-md bg-muted/30 border border-border/30 flex justify-between items-start"
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <span className="font-medium text-foreground block truncate">{ev.reason}</span>
                          <span className="text-[11px] text-muted-foreground">Status: {ev.toStatus}</span>
                        </div>
                        <span className="text-muted-foreground text-[10px] shrink-0">
                          {new Date(ev.createdAt).toLocaleString("pt-BR")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-row items-center justify-between gap-2 sm:justify-between">
            {canManage && selectedEnrollmentDetails && (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                onClick={() => {
                  detailsRequestId.current++;
                  const target = selectedEnrollmentDetails;
                  setSelectedEnrollmentDetails(null);
                  openEditDialog(target);
                }}
              >
                <Edit2 className="size-4" />
                Editar Matrícula
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                detailsRequestId.current++;
                setSelectedEnrollmentDetails(null);
              }}
              className="cursor-pointer ml-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ACTIVATE ENROLLMENT DIALOG */}
      <Dialog
        open={Boolean(enrollmentToActivate)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setEnrollmentToActivate(null);
        }}
      >
        <DialogContent className="max-w-md">
          {enrollmentToActivate && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  Ativar Matrícula
                </DialogTitle>
                <DialogDescription>
                  Libera o acesso físico do aluno na academia.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <Avatar className="size-9 shrink-0 border border-border/40">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {(enrollmentToActivate.studentMember?.user?.name || "AL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {enrollmentToActivate.studentMember?.user?.name || "Aluno"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Plano: {enrollmentToActivate.planVersion?.plan?.name || enrollmentToActivate.planVersion?.name || "Plano"} · {formatBRL(enrollmentToActivate.priceInCents)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 py-4 text-sm">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="paymentVerified"
                    checked={activatePaymentVerified}
                    onCheckedChange={(checked) => setActivatePaymentVerified(checked === true)}
                  />
                  <Label htmlFor="paymentVerified" className="text-xs font-normal cursor-pointer leading-none">
                    Pagamento inicial verificado e conferido
                  </Label>
                </div>

                {!activatePaymentVerified && (
                  <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0 pt-1">
                    <Label htmlFor="override-reason" className="text-xs font-medium text-muted-foreground">
                      Justificativa para liberação manual *
                    </Label>
                    <Input
                      id="override-reason"
                      required
                      placeholder="Ex: Autorizado pela coordenação; pagará em dinheiro"
                      value={activateOverrideReason}
                      onChange={(e) => setActivateOverrideReason(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnrollmentToActivate(null)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleActivateEnrollment}
                  disabled={isSubmitting || (!activatePaymentVerified && !activateOverrideReason.trim())}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    "Confirmar Ativação"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG PAUSAR MATRÍCULA */}
      <Dialog
        open={Boolean(enrollmentToPause)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setEnrollmentToPause(null);
        }}
      >
        <DialogContent className="max-w-md">
          {enrollmentToPause && (
            <form onSubmit={handlePauseEnrollment}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Pausar / Trancar Matrícula
                </DialogTitle>
                <DialogDescription>
                  Suspende o acesso do aluno e posterga novas cobranças.
                </DialogDescription>
              </DialogHeader>

              {/* Student info */}
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <Avatar className="size-9 shrink-0 border border-border/40">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {(enrollmentToPause.studentMember?.user?.name || "AL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {enrollmentToPause.studentMember?.user?.name || "Aluno"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Plano: {enrollmentToPause.planVersion?.plan?.name || enrollmentToPause.planVersion?.name || "Plano"}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 py-4 min-w-0 [&>*]:min-w-0">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Duração Rápida</label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs cursor-pointer"
                      onClick={() => setPausePresetDays(15)}
                    >
                      15 dias
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs cursor-pointer"
                      onClick={() => setPausePresetDays(30)}
                    >
                      30 dias
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 text-xs cursor-pointer"
                      onClick={() => setPausePresetDays(60)}
                    >
                      60 dias
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 [&>*]:min-w-0">
                  <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="gym-pause-start" className="text-xs font-medium">Data de Início</Label>
                    <Input
                      type="date"
                      id="gym-pause-start"
                      required
                      value={pauseStartDate}
                      onChange={(e) => setPauseStartDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="gym-pause-end" className="text-xs font-medium">Data de Retorno</Label>
                    <Input
                      type="date"
                      id="gym-pause-end"
                      required
                      value={pauseEndDate}
                      onChange={(e) => setPauseEndDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="gym-pause-reason" className="text-xs font-medium">Motivo do Trancamento</Label>
                  <Input
                    id="gym-pause-reason"
                    placeholder="Ex: Viagem, licença médica, motivos de trabalho"
                    required
                    value={pauseReason}
                    onChange={(e) => setPauseReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-1 border-t border-border/40">
                  <Checkbox
                    id="pauseExtendEndDate"
                    checked={pauseExtendEndDate}
                    onCheckedChange={(checked) => setPauseExtendEndDate(checked === true)}
                  />
                  <Label htmlFor="pauseExtendEndDate" className="text-xs font-normal cursor-pointer text-muted-foreground leading-snug">
                    Prorrogar o término do contrato pelos dias pausados
                  </Label>
                </div>
              </div>

              <DialogFooter className="gap-2! flex sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnrollmentToPause(null)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Pausando...
                    </>
                  ) : (
                    "Confirmar Pausa"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* CANCEL ENROLLMENT ALERT DIALOG */}
      <AlertDialog
        open={Boolean(enrollmentToCancel)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setEnrollmentToCancel(null);
        }}
      >
        <AlertDialogContent className="max-w-md">
          {enrollmentToCancel && (
            <div>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-destructive flex items-center gap-2">
                  <XCircle className="size-5" />
                  Cancelar Matrícula
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Selecione o momento do cancelamento para o aluno{" "}
                  <strong>{enrollmentToCancel.studentMember?.user?.name}</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="py-3 space-y-3 text-sm">
                <RadioGroup
                  value={cancelImmediate}
                  onValueChange={setCancelImmediate}
                  className="gap-2.5"
                >
                  <div className="flex items-start space-x-2.5 border rounded-lg p-3 hover:bg-muted/30 cursor-pointer transition-colors">
                    <RadioGroupItem value="cycle_end" id="cancel_cycle_end" className="mt-0.5" />
                    <label htmlFor="cancel_cycle_end" className="cursor-pointer text-xs space-y-0.5">
                      <div className="font-semibold text-foreground">
                        Ao término da vigência
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Acesso garantido até{" "}
                        {enrollmentToCancel.endDate
                          ? new Date(enrollmentToCancel.endDate).toLocaleDateString("pt-BR")
                          : "o encerramento do período contratado"}
                        .
                      </div>
                    </label>
                  </div>

                  <div className="flex items-start space-x-2.5 border border-destructive/20 rounded-lg p-3 hover:bg-destructive/5 cursor-pointer transition-colors">
                    <RadioGroupItem value="immediate" id="cancel_immediate" className="mt-0.5" />
                    <label htmlFor="cancel_immediate" className="cursor-pointer text-xs space-y-0.5">
                      <div className="font-semibold text-destructive">
                        Imediato
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        Encerra a matrícula e bloqueia o acesso imediatamente.
                      </div>
                    </label>
                  </div>
                </RadioGroup>

                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0 pt-1">
                  <Label htmlFor="gym-cancellation-reason" className="text-xs font-medium">
                    Motivo do Cancelamento *
                  </Label>
                  <Input
                    id="gym-cancellation-reason"
                    required
                    placeholder="Ex: Mudança de cidade, cancelamento voluntário"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    void handleCancelEnrollment();
                  }}
                  disabled={isSubmitting || !cancelReason.trim()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    "Confirmar Cancelamento"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* DIALOG CONFIGURAR RECORRÊNCIA */}
      <Dialog
        open={Boolean(enrollmentToSetupSubscription)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setEnrollmentToSetupSubscription(null);
        }}
      >
        <DialogContent className="max-w-md">
          {enrollmentToSetupSubscription && (
            <form onSubmit={handleSetupSubscriptionSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="size-5 text-primary" />
                  Configurar Recorrência
                </DialogTitle>
                <DialogDescription>
                  Configure a cobrança recorrente mensal para esta matrícula.
                </DialogDescription>
              </DialogHeader>

              {/* Student & Plan Summary */}
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <Avatar className="size-9 shrink-0 border border-border/40">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {(enrollmentToSetupSubscription.studentMember?.user?.name || "AL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {enrollmentToSetupSubscription.studentMember?.user?.name || "Aluno"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Plano: {enrollmentToSetupSubscription.planVersion?.plan?.name || enrollmentToSetupSubscription.planVersion?.name || "Plano"} · {formatBRL(enrollmentToSetupSubscription.priceInCents)}/mês
                  </p>
                </div>
              </div>

              <div className="grid gap-3 py-4 min-w-0 [&>*]:min-w-0">
                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="sub-first-due" className="text-xs font-medium">
                    Data do 1º Vencimento (Opcional)
                  </Label>
                  <Input
                    id="sub-first-due"
                    type="date"
                    value={subFirstDueDate}
                    onChange={(e) => setSubFirstDueDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    As faturas dos próximos meses seguirão esta data de vencimento.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2! flex sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnrollmentToSetupSubscription(null)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Recorrência"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG GERAR CICLO DE COBRANÇA */}
      <Dialog
        open={Boolean(enrollmentToGenerateCycle)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setEnrollmentToGenerateCycle(null);
        }}
      >
        <DialogContent className="max-w-md">
          {enrollmentToGenerateCycle && (
            <form onSubmit={handleGenerateCycleSubmit}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="size-5 text-primary" />
                  Gerar Fatura do Ciclo
                </DialogTitle>
                <DialogDescription>
                  Emita a fatura do novo ciclo mensal para esta matrícula.
                </DialogDescription>
              </DialogHeader>

              {/* Student & Price Banner */}
              <div className="mt-3 flex items-center gap-3 rounded-lg border border-border/50 bg-muted/40 p-3">
                <Avatar className="size-9 shrink-0 border border-border/40">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                    {(enrollmentToGenerateCycle.studentMember?.user?.name || "AL").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {enrollmentToGenerateCycle.studentMember?.user?.name || "Aluno"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    Valor da Mensalidade: <span className="font-semibold text-primary">{formatBRL(enrollmentToGenerateCycle.priceInCents)}</span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 min-w-0 [&>*]:min-w-0">
                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="cycle-competence" className="text-xs font-medium">Competência (AAAA-MM)</Label>
                  <Input
                    id="cycle-competence"
                    placeholder="Ex: 2026-10"
                    value={cycleCompetenceMonth}
                    onChange={(e) => setCycleCompetenceMonth(e.target.value)}
                    required
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="cycle-due" className="text-xs font-medium">Data de Vencimento</Label>
                  <Input
                    id="cycle-due"
                    type="date"
                    value={cycleDueDate}
                    onChange={(e) => setCycleDueDate(e.target.value)}
                    required
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2! flex sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnrollmentToGenerateCycle(null)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Gerando Fatura...
                    </>
                  ) : (
                    "Gerar Fatura"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(withdrawTarget)}
        onOpenChange={(open) => {
          if (!isSubmitting && !open) setWithdrawTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          {withdrawTarget && (
            <div>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <PlayCircle className="size-5 text-emerald-500" />
                  Reverter Cancelamento
                </DialogTitle>
                <DialogDescription>
                  Reverte o cancelamento agendado e mantém a matrícula do aluno ativa.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-3">
                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="withdraw-reason" className="text-xs font-medium">Motivo da Reversão</Label>
                  <Input
                    id="withdraw-reason"
                    placeholder="Ex: Aluno desistiu do cancelamento e continuará treinando"
                    minLength={5}
                    maxLength={2000}
                    value={withdrawReason}
                    onChange={(e) => setWithdrawReason(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => setWithdrawTarget(null)}
                >
                  Voltar
                </Button>
                <Button
                  disabled={isSubmitting || withdrawReason.trim().length < 3}
                  onClick={handleWithdrawCancellation}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Revertendo...
                    </>
                  ) : (
                    "Confirmar Reversão"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  )
}
