"use client"

import { useMemo, useEffect, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Plus,
  Layers,
  Users,
  Search,
  MoreVertical,
  CheckCircle2,
  XCircle,
  CreditCard,
  Edit2,
  Ban,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileText,
  DollarSign,
  Calendar,
  AlertCircle,
  X,
} from "lucide-react"

import { MoneyInput } from "./money-input"
import { GymPageHeader } from "@/components/application/gym-page"
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia } from "@/components/ui/empty"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
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
  SelectGroup,
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

export interface PlanVersionItem {
  id: string
  planId: string
  version: number
  name: string
  description?: string | null
  priceInCents: number
  enrollmentFeeInCents: number
  billingCycle: string
  durationDays: number
  termsText: string
  termsVersion: string
  isActive: boolean
  createdAt: string | Date
  activeEnrollmentsCount?: number
  totalEnrollmentsCount?: number
}

export interface PlanItem {
  id: string
  workspaceId: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string | Date
  updatedAt: string | Date
  totalActiveEnrollments: number
  activeVersion: PlanVersionItem | null
  versions: PlanVersionItem[]
}

interface GymPlansClientProps {
  workspaceId: string
  initialPlans: PlanItem[]
  initialPagination: { page: number; limit: number; total: number; totalPages: number }
  canManage: boolean
}

const cycleDurationMap: Record<string, number> = {
  MONTHLY: 30,
  BIMONTHLY: 60,
  QUARTERLY: 90,
  SEMIANNUAL: 180,
  ANNUAL: 365,
  CUSTOM: 30,
}

const cycleLabels: Record<string, string> = {
  MONTHLY: "Mensal",
  BIMONTHLY: "Bimestral",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
  CUSTOM: "Personalizado",
}

function PlanKPICard({
  title,
  value,
  subDetail,
  icon: Icon,
  variant = "default",
}: {
  title: string
  value: string | number
  subDetail: string
  icon: React.ElementType
  variant?: "default" | "success" | "warning" | "destructive"
}) {
  const iconColor =
    variant === "success"
      ? "text-emerald-500 bg-emerald-500/10"
      : variant === "destructive"
        ? "text-rose-500 bg-rose-500/10"
        : variant === "warning"
          ? "text-amber-500 bg-amber-500/10"
          : "text-primary bg-primary/10"

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
  )
}

export function GymPlansClient({
  workspaceId,
  initialPlans,
  initialPagination,
  canManage,
}: GymPlansClientProps) {
  const [plans, setPlans] = useState<PlanItem[]>(initialPlans)
  const [selectedPlanForVersion, setSelectedPlanForVersion] = useState<PlanItem | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState(initialPagination)
  const [listBusy, setListBusy] = useState(false)
  const [listError, setListError] = useState("")
  const [listRevision, setListRevision] = useState(0)

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [planToToggleStatus, setPlanToToggleStatus] = useState<PlanItem | null>(null)

  // Form states - Create
  const [createName, setCreateName] = useState("")
  const [createPrice, setCreatePrice] = useState("14990")
  const [createFee, setCreateFee] = useState("0")
  const [createCycle, setCreateCycle] = useState("MONTHLY")
  const [createDuration, setCreateDuration] = useState("30")
  const [createTerms, setCreateTerms] = useState(
    "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE ATIVIDADE FÍSICA\n\n1. OBJETO: O presente contrato tem por objeto a prestação de serviços de condicionamento físico nas dependências da contratada.\n2. ACESSO: O acesso às áreas de treino depende de matrícula vigente e das condições deste contrato.\n3. RESPONSABILIDADE MÉDICA: O contratante declara-se apto para a prática de exercícios físicos.\n4. MENORES DE IDADE: A contratação para menores de 18 anos exige representação expressa do responsável legal."
  )

  // Form states - Edit
  const [editName, setEditName] = useState("")
  const [versionPrice, setVersionPrice] = useState("")
  const [versionFee, setVersionFee] = useState("0")
  const [versionCycle, setVersionCycle] = useState("MONTHLY")
  const [versionDuration, setVersionDuration] = useState("30")
  const [versionTerms, setVersionTerms] = useState("")

  // Format currency
  const formatBRL = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Load plans with debounce
  useEffect(() => {
    const controller = new AbortController()
    setListBusy(true)
    setListError("")
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          workspaceId,
          includeInactive: "true",
          status: statusFilter,
          search: searchQuery,
          page: String(page),
          limit: "20",
        })
        const response = await fetch(`/api/gym/plans?${query}`, {
          signal: controller.signal,
          cache: "no-store",
        })
        const result = await response.json()
        if (!response.ok) {
          throw new Error(result.error?.message || "Não foi possível consultar planos.")
        }
        if (!controller.signal.aborted) {
          setPlans(result.plans)
          setPagination(result.pagination)
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setListError(error instanceof Error ? error.message : "Consulta indisponível.")
        }
      } finally {
        if (!controller.signal.aborted) {
          setListBusy(false)
        }
      }
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [workspaceId, page, statusFilter, searchQuery, listRevision])

  // KPIs
  const stats = useMemo(() => {
    const total = pagination.total
    const activePlans = plans.filter((p) => p.isActive)
    const activeCount = activePlans.length
    const totalStudents = plans.reduce((acc, p) => acc + (p.totalActiveEnrollments || 0), 0)
    const plansWithPrice = activePlans.filter((p) => p.activeVersion?.priceInCents !== undefined)
    const avgPrice = plansWithPrice.length
      ? plansWithPrice.reduce((sum, p) => sum + (p.activeVersion?.priceInCents || 0), 0) / plansWithPrice.length
      : 0
    return {
      total,
      active: activeCount,
      totalStudents,
      avgPrice,
    }
  }, [plans, pagination.total])

  // Cycle change helpers to auto-adjust duration
  const handleCreateCycleChange = (cycle: string) => {
    setCreateCycle(cycle)
    if (cycleDurationMap[cycle]) {
      setCreateDuration(cycleDurationMap[cycle].toString())
    }
  }

  const handleVersionCycleChange = (cycle: string) => {
    setVersionCycle(cycle)
    if (cycleDurationMap[cycle]) {
      setVersionDuration(cycleDurationMap[cycle].toString())
    }
  }

  // Handle Plan Creation
  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim()) {
      toast.error("Nome do plano é obrigatório.")
      return
    }

    const priceInCents = Number(createPrice)
    const feeInCents = Number(createFee)

    if (
      !Number.isInteger(priceInCents) ||
      priceInCents < 0 ||
      priceInCents > 999999 ||
      !Number.isInteger(feeInCents) ||
      feeInCents < 0 ||
      feeInCents > 999999
    ) {
      toast.error("Informe valores entre R$ 0,00 e R$ 9.999,99.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/gym/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: createName.trim(),
          priceInCents,
          enrollmentFeeInCents: feeInCents,
          billingCycle: createCycle,
          durationDays: parseInt(createDuration, 10) || 30,
          termsText: createTerms,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao criar plano.")
      }

      toast.success("Plano criado com sucesso no catálogo!")
      setPlans([data, ...plans])
      setIsCreateOpen(false)
      setCreateName("")
      setCreatePrice("14990")
      setCreateFee("0")
      setCreateCycle("MONTHLY")
      setCreateDuration("30")
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar plano.")
    } finally {
      setIsSubmitting(false)
      setListRevision((val) => val + 1)
    }
  }

  // Open Edit Modal with prefilled values immediately (0ms latency)
  const openPublishModal = (selected: PlanItem) => {
    setSelectedPlanForVersion(selected)
    setEditName(selected.name)

    const active = selected.activeVersion
    if (active) {
      setVersionPrice(String(active.priceInCents))
      setVersionFee(String(active.enrollmentFeeInCents))
      setVersionCycle(active.billingCycle)
      setVersionDuration(active.durationDays.toString())
      setVersionTerms(active.termsText || "")
    } else {
      setVersionPrice("14990")
      setVersionFee("0")
      setVersionCycle("MONTHLY")
      setVersionDuration("30")
      setVersionTerms("")
    }

    // If termsText was not preloaded, fetch in background without delaying modal opening
    if (active && !active.termsText) {
      fetch(
        `/api/gym/plans/${selected.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
        { cache: "no-store" }
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.activeVersion?.termsText) {
            setVersionTerms((current) => (current ? current : data.activeVersion.termsText))
          }
        })
        .catch(() => { })
    }
  }

  // Handle Publish New Version & Metadata Update
  const handlePublishVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlanForVersion) return

    const priceInCents = Number(versionPrice)
    const feeInCents = Number(versionFee)

    if (
      !Number.isInteger(priceInCents) ||
      priceInCents < 0 ||
      priceInCents > 999999 ||
      !Number.isInteger(feeInCents) ||
      feeInCents < 0 ||
      feeInCents > 999999
    ) {
      toast.error("Informe valores entre R$ 0,00 e R$ 9.999,99.")
      return
    }

    setIsSubmitting(true)
    try {
      // 1. If name changed, update metadata
      if (editName.trim() !== selectedPlanForVersion.name) {
        const patchRes = await fetch(`/api/gym/plans/${selectedPlanForVersion.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            name: editName.trim(),
          }),
        })
        if (!patchRes.ok) {
          const errData = await patchRes.json()
          throw new Error(errData.error?.message || "Erro ao atualizar dados do plano.")
        }
      }

      // 2. Publish new version with commercial conditions
      const res = await fetch(`/api/gym/plans/${selectedPlanForVersion.id}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: editName.trim() || selectedPlanForVersion.name,
          priceInCents,
          enrollmentFeeInCents: feeInCents,
          billingCycle: versionCycle,
          durationDays: parseInt(versionDuration, 10) || 30,
          termsText: versionTerms,
        }),
      })

      const newVersion = await res.json()
      if (!res.ok) {
        throw new Error(newVersion.error?.message || "Erro ao atualizar condições do plano.")
      }

      toast.success("Plano atualizado com sucesso!")
      setSelectedPlanForVersion(null)
      setListRevision((val) => val + 1)
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar plano.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Plan Status (Active/Inactive)
  const handleToggleStatus = async () => {
    if (!planToToggleStatus) return

    setIsSubmitting(true)
    try {
      const nextStatus = !planToToggleStatus.isActive
      const res = await fetch(`/api/gym/plans/${planToToggleStatus.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          isActive: nextStatus,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || "Erro ao alterar status do plano.")
      }

      setPlans((prev) =>
        prev.map((p) => (p.id === planToToggleStatus.id ? { ...p, isActive: nextStatus } : p))
      )

      toast.success(
        nextStatus ? "Plano ativado no catálogo com sucesso." : "Plano desativado para novas matrículas."
      )
      setPlanToToggleStatus(null)
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status.")
    } finally {
      setIsSubmitting(false)
      setListRevision((val) => val + 1)
    }
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Page Header */}
      <GymPageHeader
        title="Planos & Catálogo"
        description="Organize os planos de treino, valores, ciclos de cobrança e condições de matrícula."
        actions={
          canManage && (
            <Button
              className="h-10 gap-2 cursor-pointer font-medium"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="size-4" />
              Novo plano
            </Button>
          )
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <PlanKPICard
          title="Total Planos"
          value={stats.total}
          subDetail="Cadastrados no catálogo"
          icon={Layers}
          variant="default"
        />
        <PlanKPICard
          title="Planos Ativos"
          value={stats.active}
          subDetail="Disponíveis na recepção"
          icon={CheckCircle2}
          variant="success"
        />
        <PlanKPICard
          title="Alunos Matriculados"
          value={stats.totalStudents}
          subDetail="Contratos vinculados"
          icon={Users}
          variant="default"
        />
        <PlanKPICard
          title="Ticket Médio"
          value={formatBRL(stats.avgPrice)}
          subDetail="Média dos planos ativos"
          icon={CreditCard}
          variant="warning"
        />
      </div>

      {/* Search & Filters Bar */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground select-none" />
            <Input
              type="search"
              aria-label="Buscar planos"
              placeholder="Buscar por nome ou descrição..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setPage(1)
              }}
              className="h-10 bg-background/50 pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("")
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value)
              setPage(1)
            }}
          >
            <SelectTrigger aria-label="Filtrar situação dos planos" className="h-10 w-full sm:w-44 bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="ALL">Todos os planos</SelectItem>
                <SelectItem value="ACTIVE">Apenas ativos</SelectItem>
                <SelectItem value="INACTIVE">Apenas inativos</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "ALL") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setStatusFilter("ALL")
                setPage(1)
              }}
              className="h-10 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Limpar filtros
            </Button>
          )}
        </div>

        <div className="text-xs text-muted-foreground shrink-0" aria-live="polite">
          <span className="font-semibold text-foreground">{pagination.total}</span>{" "}
          {pagination.total === 1 ? "plano cadastrado" : "planos cadastrados"}
        </div>
      </div>

      {/* Error state */}
      {listError && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <span>{listError}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setListRevision((v) => v + 1)}
            className="h-7 text-xs border-destructive/30"
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Content Grid */}
      {listBusy ? (
        /* Skeletons Loading (skelletonsloaders.md compliance) */
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card
              key={i}
              className="flex h-full p-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-xs"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-3.5 w-full rounded" />
                  </div>
                  <Skeleton className="size-6 rounded-full shrink-0" />
                </div>
                <Skeleton className="h-9 w-1/2 rounded" />
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="flex items-center justify-between border-t border-border/40 pt-3 mt-4">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-8 w-16 rounded" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : plans.length === 0 ? (
        /* Empty State */
        <Empty className="rounded-2xl border border-dashed border-border/80 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers className="size-6 text-muted-foreground" />
            </EmptyMedia>
            <EmptyTitle>
              {searchQuery || statusFilter !== "ALL" ? "Nenhum plano encontrado" : "Nenhum plano cadastrado"}
            </EmptyTitle>
            <EmptyDescription>
              {searchQuery || statusFilter !== "ALL"
                ? "Tente alterar os termos de busca ou limpar os filtros aplicados."
                : "Cadastre seu primeiro plano de mensalidade para começar a matricular alunos na recepção."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            {searchQuery || statusFilter !== "ALL" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("ALL")
                  setPage(1)
                }}
                className="cursor-pointer"
              >
                Limpar filtros
              </Button>
            ) : canManage ? (
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="gap-2 cursor-pointer font-medium"
              >
                <Plus className="size-4" />
                Criar Primeiro Plano
              </Button>
            ) : null}
          </EmptyContent>
        </Empty>
      ) : (
        /* Plans Card Grid */
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {plans.map((plan) => {
            const active = plan.activeVersion
            return (
              <Card
                key={plan.id}
                className={cn(
                  "flex h-full p-0 flex-col overflow-hidden rounded-xl border border-border/50 bg-background/50 backdrop-blur-xs shadow-xs transition-all duration-200 hover:border-border/80 hover:shadow-sm",
                  !plan.isActive && "opacity-80 bg-muted/20"
                )}
              >
                <CardContent className="flex h-full flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-md font-semibold tracking-tight text-foreground truncate">
                          {plan.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[10px] font-medium shrink-0",
                            plan.isActive
                              ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                              : "border-border/60 text-muted-foreground bg-muted/40"
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              plan.isActive ? "bg-emerald-500" : "bg-muted-foreground/50"
                            )}
                          />
                          {plan.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>

                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="-mr-1.5 size-8 shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                            disabled={isSubmitting}
                            aria-label={"Ações do plano " + plan.name}
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={() => openPublishModal(plan)}
                          >
                            <Edit2 className="size-4 text-muted-foreground" />
                            Editar plano
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={cn(
                              "gap-2 cursor-pointer",
                              plan.isActive
                                ? "text-destructive focus:text-destructive"
                                : "text-emerald-600 focus:text-emerald-600"
                            )}
                            onClick={() => setPlanToToggleStatus(plan)}
                          >
                            {plan.isActive ? (
                              <>
                                <Ban className="size-4" />
                                Desativar plano
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="size-4" />
                                Ativar plano
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {active ? (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                          {formatBRL(active.priceInCents)}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          / {cycleLabels[active.billingCycle]?.toLowerCase() || "mês"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-muted/20 p-2.5 text-xs">
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                            Duração
                          </span>
                          <span className="font-semibold text-foreground mt-0.5 block">
                            {active.durationDays} dias
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">
                            Taxa de Matrícula
                          </span>
                          <span className="font-semibold text-foreground mt-0.5 block tabular-nums">
                            {active.enrollmentFeeInCents > 0
                              ? formatBRL(active.enrollmentFeeInCents)
                              : "Isento"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-center my-2">
                      <p className="text-xs text-muted-foreground">
                        Condições comerciais não configuradas.
                      </p>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 border-t border-border/40 pt-3">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Users className="size-3.5 text-primary" />
                      <span>
                        <strong className="font-semibold text-foreground">
                          {plan.totalActiveEnrollments || 0}
                        </strong>{" "}
                        {(plan.totalActiveEnrollments || 0) === 1
                          ? "aluno ativo"
                          : "alunos ativos"}
                      </span>
                    </div>

                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5 text-xs cursor-pointer hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                        onClick={() => openPublishModal(plan)}
                      >
                        <Edit2 className="size-3.5" />
                        Editar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
          <span className="text-xs text-muted-foreground">
            Página <strong className="font-semibold text-foreground">{pagination.page}</strong> de{" "}
            {Math.max(1, pagination.totalPages)}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={listBusy || page <= 1}
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              className="gap-1 h-8 text-xs cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={listBusy || page >= pagination.totalPages}
              onClick={() => setPage((v) => v + 1)}
              className="gap-1 h-8 text-xs cursor-pointer"
            >
              Próxima
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-xl sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
          <form onSubmit={handleCreatePlan}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="size-5 text-primary" />
                Criar Novo Plano
              </DialogTitle>
              <DialogDescription>
                Defina o nome, valor, ciclo de cobrança e minuta de termos do plano.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4 min-w-0 [&>*]:min-w-0">
              <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                <Label htmlFor="create-name" className="text-sm font-medium">Nome do Plano *</Label>
                <Input
                  id="create-name"
                  required
                  placeholder="Ex: Musculação Livre, Plano Gold, Cross Training"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="h-10 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 [&>*]:min-w-0">
                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="create-price" className="text-sm font-medium">Preço por Ciclo (R$) *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                      R$
                    </span>
                    <MoneyInput
                      id="create-price"
                      aria-label="Preço por ciclo em reais"
                      required
                      value={createPrice}
                      onValueChange={setCreatePrice}
                      className="pl-10 h-10 font-medium"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="create-fee" className="text-sm font-medium">Taxa de Matrícula (R$)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                      R$
                    </span>
                    <MoneyInput
                      id="create-fee"
                      aria-label="Taxa de matrícula em reais"
                      value={createFee}
                      onValueChange={setCreateFee}
                      className="pl-10 h-10 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 [&>*]:min-w-0">
                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="create-cycle" className="text-sm font-medium">Ciclo de Cobrança *</Label>
                  <Select value={createCycle} onValueChange={handleCreateCycleChange}>
                    <SelectTrigger id="create-cycle" className="w-full h-10">
                      <SelectValue placeholder="Selecione o ciclo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="MONTHLY">Mensal</SelectItem>
                        <SelectItem value="BIMONTHLY">Bimestral</SelectItem>
                        <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                        <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                        <SelectItem value="ANNUAL">Anual</SelectItem>
                        <SelectItem value="CUSTOM">Personalizado</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="create-duration" className="text-sm font-medium">Duração (Dias)</Label>
                  <Input
                    id="create-duration"
                    type="number"
                    min={1}
                    value={createDuration}
                    onChange={(e) => setCreateDuration(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>

              <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                <Label htmlFor="create-terms" className="text-sm font-medium">Termos do Contrato *</Label>
                <Textarea
                  id="create-terms"
                  rows={4}
                  required
                  value={createTerms}
                  onChange={(e) => setCreateTerms(e.target.value)}
                  className="font-mono text-xs leading-relaxed"
                />
                <span className="text-[11px] text-muted-foreground">
                  Minuta contratual exibida e assinada eletronicamente pelo aluno no momento da matrícula.
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2! flex sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting || !createName.trim()}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Criando Plano...
                  </>
                ) : (
                  "Salvar Plano"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PLAN MODAL */}
      <Dialog
        open={Boolean(selectedPlanForVersion)}
        onOpenChange={(open) => !open && setSelectedPlanForVersion(null)}
      >
        <DialogContent className="max-w-xl sm:max-h-[calc(100dvh-3rem)] overflow-y-auto">
          {selectedPlanForVersion && (
            <form onSubmit={handlePublishVersion}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit2 className="size-5 text-primary" />
                  Editar Plano
                </DialogTitle>
                <DialogDescription>
                  Atualize o nome e as condições comerciais do plano.
                </DialogDescription>
              </DialogHeader>

              {/* Context Summary Banner */}
              <div className="mt-3 rounded-lg border border-border/50 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                <p>
                  As alterações serão aplicadas a <strong>novas matrículas e renovações</strong>. Contratos vigentes continuam com os valores pactuados anteriormente.
                </p>
              </div>

              <div className="grid gap-4 py-4 min-w-0 [&>*]:min-w-0">
                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="edit-name" className="text-sm font-medium">Nome do Plano *</Label>
                  <Input
                    id="edit-name"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-10 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 [&>*]:min-w-0">
                  <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="edit-price" className="text-sm font-medium">Preço por Ciclo (R$) *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                        R$
                      </span>
                      <MoneyInput
                        id="edit-price"
                        aria-label="Preço por ciclo em reais"
                        required
                        value={versionPrice}
                        onValueChange={setVersionPrice}
                        className="pl-10 h-10 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="edit-fee" className="text-sm font-medium">Taxa de Matrícula (R$)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground select-none">
                        R$
                      </span>
                      <MoneyInput
                        id="edit-fee"
                        aria-label="Taxa de matrícula em reais"
                        value={versionFee}
                        onValueChange={setVersionFee}
                        className="pl-10 h-10 font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 [&>*]:min-w-0">
                  <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="edit-cycle" className="text-sm font-medium">Ciclo de Cobrança *</Label>
                    <Select value={versionCycle} onValueChange={handleVersionCycleChange}>
                      <SelectTrigger id="edit-cycle" className="w-full h-10">
                        <SelectValue placeholder="Selecione o ciclo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="MONTHLY">Mensal</SelectItem>
                          <SelectItem value="BIMONTHLY">Bimestral</SelectItem>
                          <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                          <SelectItem value="SEMIANNUAL">Semestral</SelectItem>
                          <SelectItem value="ANNUAL">Anual</SelectItem>
                          <SelectItem value="CUSTOM">Personalizado</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                    <Label htmlFor="edit-duration" className="text-sm font-medium">Duração (Dias)</Label>
                    <Input
                      id="edit-duration"
                      type="number"
                      min={1}
                      value={versionDuration}
                      onChange={(e) => setVersionDuration(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5 min-w-0 [&>*]:min-w-0">
                  <Label htmlFor="edit-terms" className="text-sm font-medium">Termos do Contrato *</Label>
                  <Textarea
                    id="edit-terms"
                    rows={4}
                    required
                    value={versionTerms}
                    onChange={(e) => setVersionTerms(e.target.value)}
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2! flex sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedPlanForVersion(null)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !editName.trim()}>
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

      {/* CONFIRMATION MODAL FOR DEACTIVATE/ACTIVATE PLAN (confirmationmodals.md) */}
      <AlertDialog
        open={Boolean(planToToggleStatus)}
        onOpenChange={(open) => !open && setPlanToToggleStatus(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {planToToggleStatus?.isActive ? (
                <>
                  <Ban className="size-5 text-destructive" />
                  Desativar Plano do Catálogo?
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  Ativar Plano no Catálogo?
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {planToToggleStatus?.isActive
                ? `O plano "${planToToggleStatus?.name}" deixará de ficar disponível para novas matrículas na recepção. Alunos atualmente matriculados continuarão com acesso e contratos inalterados.`
                : `O plano "${planToToggleStatus?.name}" voltará a ficar disponível para novas contratações na recepção.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2! flex sm:gap-0">
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleStatus}
              disabled={isSubmitting}
              className={cn(
                planToToggleStatus?.isActive
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : "bg-emerald-600 text-white hover:bg-emerald-700"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Processando...
                </>
              ) : planToToggleStatus?.isActive ? (
                "Sim, Desativar"
              ) : (
                "Sim, Ativar"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
