"use client";

import { useEffect, useState, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import {
  workspaceAdministrationResultSchema,
  workspaceAdministrationErrorMessage,
} from "@/modules/workspaces/domain/workspace-administration-contract";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import {
  ArrowLeft,
  Building2,
  Users,
  Dumbbell,
  DollarSign,
  Ban,
  Activity,
  CheckCircle2,
  Settings2,
  AlertCircle,
  LogIn,
  Loader2,
  MessageCircle,
  Flame,
  CreditCard,
  Trash2,
  Tag,
  Sliders,
  MapPin,
  ShieldCheck,
  Plus,
  Save,
  Copy,
  Check,
  ExternalLink,
  Search,
  RotateCcw,
  ShieldAlert,
  CalendarDays,
  FileText,
  Clock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GymPurgeForm } from "@/components/application/gym-purge-form";

/* -------------------------------------------------------------------------
   Componente de Card de Estatística Unificado
------------------------------------------------------------------------- */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  iconColor: string;
  iconBg: string;
  description: string;
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg, description }: StatCardProps) {
  return (
    <Card className="border-border/60 bg-card shadow-xs transition-all hover:border-border/80">
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 rounded-xl flex items-center justify-center shrink-0", iconBg, iconColor)}>
            <Icon className="size-4.5" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-foreground mt-1">{value}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-medium">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Componente Skeleton Completo para Zero Layout Shift
------------------------------------------------------------------------- */
function WorkspaceDetailSkeleton() {
  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-11 rounded-xl" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-48 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-36 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60 bg-card p-5 space-y-3">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-11 w-full sm:w-96 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Página Principal de Detalhes do Workspace
------------------------------------------------------------------------- */
export default function WorkspaceDeepViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const unwrappedParams = use(params);
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspending, setIsSuspending] = useState(false);

  // States de Cópia
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState(false);

  // States para Impersonate de membros e workspace
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [memberToImpersonate, setMemberToImpersonate] = useState<any>(null);
  const [isImpersonateOpen, setIsImpersonateOpen] = useState(false);
  const [impersonateReason, setImpersonateReason] = useState<string>("");
  const [isWorkspaceAccess, setIsWorkspaceAccess] = useState(false);

  // States para Moderação Financeira
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [updatingPaymentStatus, setUpdatingPaymentStatus] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [isDeletePaymentAlertOpen, setIsDeletePaymentAlertOpen] = useState(false);
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("ALL");

  // States para Filtro de Membros
  const [memberSearch, setMemberSearch] = useState("");
  const [memberRoleFilter, setMemberRoleFilter] = useState<string>("ALL");

  // States para Configurações GYM e Unidades
  const [gymLimits, setGymLimits] = useState({
    maxStudents: 500,
    maxStaff: 50,
    maxUnits: 5,
  });
  const [gymPolicies, setGymPolicies] = useState({
    billingGracePeriodDays: 5,
    requireGuardianSignature: true,
  });
  const [isSavingGymConfig, setIsSavingGymConfig] = useState(false);
  const [isAddUnitOpen, setIsAddUnitOpen] = useState(false);
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitData, setNewUnitData] = useState({
    name: "",
    code: "",
    address: "",
  });

  // State para aba ativa
  const [activeTab, setActiveTab] = useState<string>("geral");

  // States para Plano Personalizado (Manual)
  const [isSavingCustomPlan, setIsSavingCustomPlan] = useState(false);
  const [customPlanForm, setCustomPlanForm] = useState({
    name: "",
    price: "",
    maxWorkspaces: "1",
    maxStudents: "",
    isUnlimitedStudents: false,
    importQuota: "25",
    storageLimitMb: "1024",
    features: "",
    isRecurring: true,
    periodicity: "MENSAL" as "MENSAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL",
    paymentMethod: "PIX",
    nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    autoSuspendEnabled: true,
    toleranceDays: "5",
  });

  const fetchWorkspace = async (navigateOnFailure = true) => {
    try {
      const res = await fetch(`/api/superadmin/workspaces/${unwrappedParams.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setWorkspace(data);

      if (data.subscription) {
        const sub = data.subscription;
        const plan = sub.plan;
        setCustomPlanForm({
          name: plan?.name || `Plano Personalizado - ${data.name}`,
          price: sub.priceInCents ? (sub.priceInCents / 100).toFixed(2) : (plan?.price ? plan.price.toFixed(2) : "0.00"),
          maxWorkspaces: String(plan?.maxWorkspaces || sub.maxUnits || 1),
          maxStudents: plan?.maxStudents != null ? String(plan.maxStudents) : (sub.maxStudents != null ? String(sub.maxStudents) : ""),
          isUnlimitedStudents: plan?.maxStudents == null && sub.maxStudents == null,
          importQuota: String(plan?.importQuota ?? 25),
          storageLimitMb: String(plan?.storageLimitMb || sub.storageLimitMb || 1024),
          features: plan?.features || "",
          isRecurring: sub.billingControlType === "MANUAL" ? true : true,
          periodicity: (sub.periodicity || "MENSAL") as any,
          paymentMethod: sub.paymentMethod || "PIX",
          nextDueDate: sub.nextDueDate ? new Date(sub.nextDueDate).toISOString().split("T")[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          autoSuspendEnabled: sub.autoSuspendEnabled ?? true,
          toleranceDays: String(sub.toleranceDays ?? 5),
        });
      }

      if (data.type === "GYM") {
        setGymLimits({
          maxStudents: data.subscription?.maxStudents ?? 0,
          maxStaff: data.subscription?.maxStaff ?? 0,
          maxUnits: data.subscription?.maxUnits ?? 0,
        });
        setGymPolicies({
          billingGracePeriodDays: data.settings?.billingGracePeriodDays ?? 5,
          requireGuardianSignature: data.settings?.requireGuardianSignature ?? true,
        });
      }
      return true;
    } catch (error) {
      if (navigateOnFailure) {
        toast.error("Erro ao carregar os dados do workspace.");
        router.push("/superadmin/workspaces");
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPrice = customPlanForm.price.replace(",", ".");
    const priceNum = parseFloat(cleanPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Informe um valor numérico válido para o plano.");
      return;
    }

    const toleranceNum = parseInt(customPlanForm.toleranceDays, 10);
    if (isNaN(toleranceNum) || toleranceNum < 0) {
      toast.error("Informe dias de tolerância válidos.");
      return;
    }

    setIsSavingCustomPlan(true);
    try {
      const res = await fetch(`/api/superadmin/workspaces/${unwrappedParams.id}/custom-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customPlanForm.name.trim() || `Plano Personalizado - ${workspace?.name}`,
          price: priceNum,
          maxWorkspaces: parseInt(customPlanForm.maxWorkspaces, 10) || 1,
          maxStudents: customPlanForm.isUnlimitedStudents ? null : (parseInt(customPlanForm.maxStudents, 10) || null),
          importQuota: parseInt(customPlanForm.importQuota, 10) || 25,
          storageLimitMb: (() => {
            const parsed = parseInt(customPlanForm.storageLimitMb, 10) || 1024;
            return parsed > 0 && parsed <= 50 ? parsed * 1024 : parsed;
          })(),
          features: customPlanForm.features.trim() || undefined,
          isRecurring: customPlanForm.isRecurring,
          periodicity: customPlanForm.periodicity,
          paymentMethod: customPlanForm.paymentMethod,
          nextDueDate: customPlanForm.nextDueDate || undefined,
          autoSuspendEnabled: customPlanForm.autoSuspendEnabled,
          toleranceDays: toleranceNum,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao salvar plano personalizado.");

      toast.success("Plano personalizado salvo e ativado com sucesso!");
      await fetchWorkspace(false);
      setActiveTab("assinatura");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível salvar o plano personalizado.");
    } finally {
      setIsSavingCustomPlan(false);
    }
  };

  useEffect(() => {
    fetchWorkspace();
  }, [unwrappedParams.id]);

  // Ação de cópia rápida
  const handleCopy = (text: string, type: "id" | "slug") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedSlug(true);
      setTimeout(() => setCopiedSlug(false), 2000);
    }
    toast.success(`${type === "id" ? "ID" : "Slug"} copiado com sucesso!`);
  };

  // Salvar Configurações GYM
  const handleSaveGymConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingGymConfig) return;
    setIsSavingGymConfig(true);
    try {
      const res = await fetch(`/api/superadmin/workspaces/${workspace.id}/gym-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: {
            maxStudents: Number(gymLimits.maxStudents),
            maxStaff: Number(gymLimits.maxStaff),
            maxUnits: Number(gymLimits.maxUnits),
          },
          settings: gymPolicies,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao salvar configurações.");
      }
      if (!(await fetchWorkspace(false))) {
        throw new Error("Gravação recebida, mas a confirmação falhou. Recarregue para conferir os valores.");
      }
      toast.success("Configurações da academia salvas com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar configurações da academia.");
    } finally {
      setIsSavingGymConfig(false);
    }
  };

  // Adicionar Unidade Filial
  const handleAddUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitData.name.trim() || !newUnitData.code.trim()) {
      toast.error("Nome e código da unidade são obrigatórios.");
      return;
    }
    setIsAddingUnit(true);
    try {
      const res = await fetch(`/api/superadmin/workspaces/${workspace.id}/gym-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUnitData.name.trim(),
          code: newUnitData.code.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""),
          address: newUnitData.address ? newUnitData.address.trim() : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao criar unidade.");
      }
      toast.success("Unidade cadastrada com sucesso!");
      setIsAddUnitOpen(false);
      setNewUnitData({ name: "", code: "", address: "" });
      await fetchWorkspace();
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar unidade.");
    } finally {
      setIsAddingUnit(false);
    }
  };

  // Alterar Status (Suspender / Reativar)
  const handleToggleStatus = async () => {
    setIsSuspending(true);
    try {
      const newStatus = !workspace.isActive;
      const res = await fetch(`/api/superadmin/workspaces/${workspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus, expectedIsActive: workspace.isActive }),
      });
      const result: unknown = await res.json();
      if (!res.ok) throw new Error(workspaceAdministrationErrorMessage(result, "Não foi possível alterar o estado."));
      const applied = workspaceAdministrationResultSchema.parse(result);
      setWorkspace({ ...workspace, isActive: applied.isActive });
      toast.success(applied.isActive ? "Workspace reativado com sucesso." : "Workspace suspenso com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao alterar o status do workspace.");
    } finally {
      setIsSuspending(false);
    }
  };

  // Inicia impersonate como gestor do workspace para assistência / manutenção
  const handleAccessWorkspace = () => {
    let targetMember: any = null;
    if (workspace.owner && workspace.owner.role !== "SUPERADMIN") {
      targetMember = { userId: workspace.ownerId, user: workspace.owner };
    }

    if (!targetMember) {
      targetMember =
        workspace.members?.find(
          (m: any) => (m.userId === workspace.ownerId || m.role === "OWNER") && m.user?.role !== "SUPERADMIN"
        ) ||
        workspace.members?.find((m: any) => m.role === "TRAINER" && m.user?.role !== "SUPERADMIN") ||
        workspace.members?.find((m: any) => m.user?.role !== "SUPERADMIN");
    }

    if (!targetMember || !targetMember.userId) {
      if (workspace.owner?.role === "SUPERADMIN") {
        toast.error(
          "O proprietário deste workspace é uma conta Superadmin e não há outros membros elegíveis. Contas administrativas exigem login próprio."
        );
      } else {
        toast.error("Nenhum usuário gestor ou proprietário disponível neste workspace para acesso.");
      }
      return;
    }

    setMemberToImpersonate(targetMember);
    setIsWorkspaceAccess(true);
    setImpersonateReason(`Manutenção e assistência técnica ao workspace ${workspace.name} autorizada pelo Superadmin`);
    setIsImpersonateOpen(true);
  };

  // Executa Impersonate
  const handleImpersonate = async () => {
    if (!memberToImpersonate) return;
    setIsImpersonating(true);
    const toastId = toast.loading("Gerando token de acesso seguro...");
    try {
      const res = await fetch("/api/superadmin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: memberToImpersonate.userId,
          reason:
            impersonateReason ||
            `Manutenção e assistência técnica ao workspace ${workspace.name} autorizada pelo Superadmin`,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao gerar token de acesso.");
      }
      const { token } = await res.json();

      toast.loading("Realizando login auditado...", { id: toastId });

      const result = await signIn("credentials", {
        impersonateToken: token,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast.success("Acesso autorizado! Redirecionando para o workspace...", { id: toastId });
      window.location.href = "/dashboard";
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao tentar acessar a conta.", { id: toastId });
      setIsImpersonating(false);
    } finally {
      setIsImpersonateOpen(false);
      setMemberToImpersonate(null);
      setIsWorkspaceAccess(false);
    }
  };

  // Modais de ação rápida
  const triggerImpersonate = (member: any) => {
    setMemberToImpersonate(member);
    setIsWorkspaceAccess(false);
    setImpersonateReason(
      `Atendimento de suporte e diagnóstico autorizado pelo Superadmin para o usuário ${member.user?.name || member.user?.email || ""
      }`
    );
    setIsImpersonateOpen(true);
  };

  const triggerModeratePayment = (payment: any) => {
    setSelectedPayment(payment);
    setIsPaymentModalOpen(true);
  };

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    if (!selectedPayment) return;
    setUpdatingPaymentStatus(true);
    try {
      const res = await fetch(`/api/superadmin/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar pagamento");

      toast.success("Status de pagamento atualizado com sucesso!");
      setIsPaymentModalOpen(false);
      setSelectedPayment(null);
      await fetchWorkspace();
    } catch (error) {
      toast.error("Erro ao atualizar pagamento.");
    } finally {
      setUpdatingPaymentStatus(false);
    }
  };

  const handleDeletePaymentConfirm = async () => {
    if (!selectedPayment) return;
    setDeletingPayment(true);
    try {
      const res = await fetch(`/api/superadmin/payments/${selectedPayment.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir pagamento");

      toast.success("Pagamento excluído definitivamente!");
      setIsDeletePaymentAlertOpen(false);
      setIsPaymentModalOpen(false);
      setSelectedPayment(null);
      await fetchWorkspace();
    } catch (error) {
      toast.error("Erro ao remover pagamento.");
    } finally {
      setDeletingPayment(false);
    }
  };

  // Filtro de Membros
  const filteredMembers = useMemo(() => {
    return (workspace?.members || []).filter((m: any) => {
      if (memberSearch.trim()) {
        const q = memberSearch.toLowerCase().trim();
        const nameMatch = m.user?.name?.toLowerCase().includes(q);
        const emailMatch = m.user?.email?.toLowerCase().includes(q);
        const roleMatch = m.role?.toLowerCase().includes(q);
        if (!nameMatch && !emailMatch && !roleMatch) return false;
      }
      if (memberRoleFilter !== "ALL") {
        if (m.role !== memberRoleFilter) return false;
      }
      return true;
    });
  }, [workspace?.members, memberSearch, memberRoleFilter]);

  // Filtro de Pagamentos
  const filteredPayments = useMemo(() => {
    return (workspace?.payments || []).filter((p: any) => {
      if (paymentStatusFilter !== "ALL") {
        if (p.status?.toLowerCase() !== paymentStatusFilter.toLowerCase()) return false;
      }
      return true;
    });
  }, [workspace?.payments, paymentStatusFilter]);

  if (isLoading) {
    return <WorkspaceDetailSkeleton />;
  }

  if (!workspace) return null;

  const planName = workspace.subscription?.plan?.name || "Plano Gratuito";
  const planStatus = workspace.subscription?.status || "Inativo";

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-24">
      {/* 1. Breadcrumbs de Navegação */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/superadmin/dashboard" className="text-xs font-semibold">
                SuperAdmin
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/superadmin/workspaces" className="text-xs font-semibold">
                Workspaces
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
              {workspace.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 2. Cabeçalho Principal Alinhado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div className="flex items-start gap-4 min-w-0">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-xl border-border/60 hover:bg-secondary/60 cursor-pointer shadow-xs"
            title="Voltar aos Workspaces"
          >
            <Link href="/superadmin/workspaces">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate max-w-[280px] sm:max-w-md">
                {workspace.name}
              </h1>

              {workspace.type === "GYM" ? (
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold uppercase tracking-wider gap-1 h-5.5 px-2 text-[10px]">
                  <Building2 className="size-3" /> Academia
                </Badge>
              ) : (
                <Badge variant="outline" className="border-border/60 font-bold uppercase tracking-wider gap-1 text-muted-foreground h-5.5 px-2 text-[10px]">
                  <Dumbbell className="size-3" /> Personal
                </Badge>
              )}

              {workspace.isActive ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold uppercase tracking-wider h-5.5 px-2 text-[10px]">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="destructive" className="font-bold uppercase tracking-wider h-5.5 px-2 text-[10px]">
                  Suspenso
                </Badge>
              )}
            </div>

            {/* Identificadores e Links com Copiar */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap font-medium">
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-foreground/80">/app/{workspace.slug}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(workspace.slug, "slug")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  title="Copiar Slug"
                >
                  {copiedSlug ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </button>
              </span>

              <span className="text-border/60">•</span>

              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                ID: {workspace.id.substring(0, 10)}...
                <button
                  type="button"
                  onClick={() => handleCopy(workspace.id, "id")}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                  title="Copiar ID completo"
                >
                  {copiedId ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                </button>
              </span>
            </div>
          </div>
        </div>

        {/* Ações do Cabeçalho */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Button
            onClick={handleAccessWorkspace}
            disabled={isImpersonating}
            className="h-10 rounded-xl font-bold gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            {isImpersonating ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <LogIn className="size-3.5" />
            )}
            <span>Acessar Workspace</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={Boolean(workspace.closedAt)}
                variant={workspace.isActive ? "destructive" : "default"}
                className={cn(
                  "h-10 rounded-xl font-bold gap-2 text-xs shadow-xs cursor-pointer",
                  !workspace.isActive && "bg-emerald-600 hover:bg-emerald-700 text-white"
                )}
              >
                {workspace.isActive ? <Ban className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
                <span>{workspace.isActive ? "Suspender Workspace" : "Reativar Workspace"}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl border-border/50">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-black text-xl flex items-center gap-2">
                  <AlertCircle className="size-5 text-destructive" />
                  {workspace.isActive ? "Suspender este workspace?" : "Reativar este workspace?"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                  {workspace.isActive
                    ? "Ao suspender este workspace, todos os membros e alunos vinculados a ele perderão o acesso até que a assessoria seja reativada. Essa operação pode ser revertida a qualquer momento."
                    : "Ao reativar este workspace, todos os membros e alunos vinculados terão seus acessos restabelecidos imediatamente."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-6 gap-2">
                <AlertDialogCancel className="rounded-xl font-bold h-10">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleToggleStatus}
                  disabled={isSuspending}
                  className={cn(
                    "rounded-xl h-10 font-bold cursor-pointer",
                    workspace.isActive
                      ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  )}
                >
                  {isSuspending ? (
                    <><Loader2 className="size-4 animate-spin mr-1.5" /> Processando...</>
                  ) : workspace.isActive ? (
                    "Sim, Suspender"
                  ) : (
                    "Sim, Reativar"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* 3. Bento Grid de Indicadores Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={workspace.type === "GYM" ? "Alunos Ativos" : "Vínculos de Alunos"}
          value={(workspace.gymFinancialOverview?.executive.activeStudentsCount ?? workspace.studentsCount).toLocaleString("pt-BR")}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          description="Contratos e vínculos ativos na base"
        />

        <StatCard
          title="Recorrência (MRR)"
          value={
            workspace.mrr == null
              ? "Indisponível"
              : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(workspace.mrr)
          }
          icon={DollarSign}
          iconColor="text-emerald-500"
          iconBg="bg-emerald-500/10"
          description="Receita recorrente contratual"
        />

        <StatCard
          title="Planos Cadastrados"
          value={workspace.registeredPlansCount || 0}
          icon={Activity}
          iconColor="text-blue-500"
          iconBg="bg-blue-500/10"
          description="Grade de planos ofertados"
        />

        <StatCard
          title="Treinos Prescritos"
          value={workspace.registeredWorkoutsCount || 0}
          icon={Dumbbell}
          iconColor="text-purple-500"
          iconBg="bg-purple-500/10"
          description="Fichas de exercícios geradas"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="h-fit! p-1 bg-secondary/30 rounded-xl border border-border/40 inline-flex flex-wrap w-full sm:w-auto">
          <TabsTrigger
            value="geral"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Settings2 className="size-3.5 text-muted-foreground" />
            <span>Informações</span>
          </TabsTrigger>

          <TabsTrigger
            value="assinatura"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <CreditCard className="size-3.5 text-emerald-500" />
            <span>Assinatura</span>
            {workspace.subscription?.plan?.name && (
              <Badge variant="secondary" className="h-4.5 px-1.5 text-[9px] font-bold rounded-md ml-1 bg-emerald-500/10 text-emerald-500">
                {workspace.subscription.plan.name}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="plano-personalizado"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Sliders className="size-3.5 text-primary" />
            <span>Plano Personalizado</span>
          </TabsTrigger>

          {workspace.type === "GYM" && (
            <TabsTrigger
              value="unidades"
              className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
            >
              <Building2 className="size-3.5 text-purple-400" />
              <span>Unidades</span>
              <Badge variant="secondary" className="h-4.5 px-1.5 text-[9px] font-bold rounded-md ml-1">
                {workspace.units?.length || 0}
              </Badge>
            </TabsTrigger>
          )}

          <TabsTrigger
            value="membros"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Users className="size-3.5 text-muted-foreground" />
            <span>Membros</span>
            <Badge variant="secondary" className="h-4.5 px-1.5 text-[9px] font-bold rounded-md ml-1">
              {workspace.members?.length || 0}
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="financeiro"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <DollarSign className="size-3.5 text-muted-foreground" />
            <span>Financeiro</span>
            {workspace.payments?.length > 0 && (
              <Badge variant="secondary" className="h-4.5 px-1.5 text-[9px] font-bold rounded-md ml-1">
                {workspace.payments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* -------------------------------------------------------------------
            ABA 1: INFORMAÇÕES GERAIS
        ------------------------------------------------------------------- */}
        <TabsContent value="geral" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card Detalhes do Sistema */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Settings2 className="size-4 text-primary" />
                  <span>Detalhes do Sistema & Infraestrutura</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Identificadores globais e metadados de auditoria.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
                      ID do Workspace
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded-md text-foreground">
                        {workspace.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-md"
                        onClick={() => handleCopy(workspace.id, "id")}
                        title="Copiar ID"
                      >
                        {copiedId ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
                      Slug de Acesso
                    </span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-secondary/50 px-2 py-1 rounded-md text-foreground">
                        {workspace.slug}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 rounded-md"
                        onClick={() => handleCopy(workspace.slug, "slug")}
                        title="Copiar Slug"
                      >
                        {copiedSlug ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/30">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
                      Tipo de Entidade
                    </span>
                    <p className="font-bold text-sm text-foreground">
                      {workspace.type === "GYM" ? "Academia / Centro Fitness" : "Personal Trainer / Assessoria"}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
                      Criado em
                    </span>
                    <p className="font-bold text-sm text-foreground">
                      {new Date(workspace.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Proprietário */}
                <div className="pt-4 border-t border-border/30">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 block mb-2.5">
                    Proprietário da Conta (Owner)
                  </span>
                  {workspace.owner ? (
                    <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/50 bg-secondary/15">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="size-10 border border-border/60">
                          <AvatarImage src={workspace.owner.image} />
                          <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                            {workspace.owner.name?.substring(0, 2).toUpperCase() || "US"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-foreground truncate">{workspace.owner.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{workspace.owner.email}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => triggerImpersonate({ userId: workspace.ownerId, user: workspace.owner })}
                        variant="outline"
                        size="sm"
                        className="rounded-xl font-bold text-xs gap-1.5 h-8 border-border/60 shadow-xs hover:bg-primary hover:text-primary-foreground cursor-pointer shrink-0"
                      >
                        <LogIn className="size-3.5" />
                        <span>Acessar</span>
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium">Nenhum proprietário atribuído.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Card Plano & Assinatura */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <CreditCard className="size-4 text-emerald-500" />
                  <span>Plano & Licenciamento</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Detalhes da assinatura e franquia contratada.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/15">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">
                      Plano Ativo
                    </span>
                    <h4 className="text-lg font-black text-foreground">{planName}</h4>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-bold uppercase tracking-wider text-[10px] px-2.5 py-1 rounded-lg border",
                      planStatus.toLowerCase() === "active" || planStatus.toLowerCase() === "ativo"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : "bg-secondary text-muted-foreground border-border/60"
                    )}
                  >
                    {planStatus}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-2">
                  <div className="p-3 rounded-xl border border-border/40 bg-secondary/10 text-center space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      Franquia Alunos
                    </span>
                    <p className="text-base font-black text-foreground">
                      {workspace.subscription?.maxStudents ? workspace.subscription.maxStudents : "Ilimitado"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/40 bg-secondary/10 text-center space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      Franquia Staff
                    </span>
                    <p className="text-base font-black text-foreground">
                      {workspace.subscription?.maxStaff ? workspace.subscription.maxStaff : "Ilimitado"}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-border/40 bg-secondary/10 text-center space-y-1">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground">
                      Unidades
                    </span>
                    <p className="text-base font-black text-foreground">
                      {workspace.subscription?.maxUnits ? workspace.subscription.maxUnits : "1"}
                    </p>
                  </div>
                </div>

                {/* Atividade Recente (Treinos) */}
                <div className="pt-4 border-t border-border/30">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 block mb-2.5">
                    Últimos Treinos Prescritos
                  </span>
                  {workspace.workouts?.length > 0 ? (
                    <div className="space-y-2">
                      {workspace.workouts.slice(0, 3).map((workout: any) => (
                        <div
                          key={workout.id}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate text-foreground">{workout.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                              Aluno: {workout.student?.name || "Geral"}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-wider h-5 px-1.5 border-border/60">
                            {workout.difficulty || "Geral"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground font-medium py-3 text-center border border-dashed border-border/50 rounded-xl">
                      Nenhum treino prescrito recentemente.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("assinatura")}
                    className="w-full rounded-xl h-8 font-bold text-xs gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="size-3.5 text-primary" />
                    <span>Ver Detalhes da Assinatura</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="">
            <Card className="shadow-xs p-0 overflow-hidden">
              <CardHeader className="pt-5 border-b border-rose-500/10">
                <CardTitle className="text-sm font-bold text-red-500 flex items-center gap-2">
                  <ShieldAlert className="size-4" />
                  <span>Zona de Ações Críticas & Governança</span>
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Ações que alteram a disponibilidade operacional e a permanência de dados desta conta.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground">
                      {workspace.isActive ? "Suspender Acesso do Workspace" : "Reativar Acesso do Workspace"}
                    </p>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      {workspace.isActive
                        ? "Bloqueia temporariamente o login de todos os personais e alunos vinculados a esta assessoria."
                        : "Libera o acesso dos usuários vinculados a esta assessoria imediatamente."}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant={workspace.isActive ? "destructive" : "default"}
                        size="sm"
                        className={cn(
                          "rounded-xl font-bold h-9 px-4 text-xs cursor-pointer shrink-0 shadow-xs",
                          !workspace.isActive && "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                      >
                        {workspace.isActive ? "Suspender Workspace" : "Reativar Workspace"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl border-border/50">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-black text-xl flex items-center gap-2">
                          <AlertCircle className="size-5 text-destructive" />
                          Confirmar {workspace.isActive ? "suspensão" : "reativação"}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                          {workspace.isActive
                            ? "Tem certeza de que deseja suspender este workspace? Usuários e alunos não conseguirão acessar os treinos nem realizar novos pagamentos enquanto estiver suspenso."
                            : "Deseja restabelecer o acesso total dos membros e alunos a este workspace?"}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="mt-6 gap-2">
                        <AlertDialogCancel className="rounded-xl font-bold h-10">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleToggleStatus}
                          disabled={isSuspending}
                          className={cn(
                            "rounded-xl h-10 font-bold cursor-pointer",
                            workspace.isActive
                              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white"
                          )}
                        >
                          {isSuspending ? "Aguarde..." : workspace.isActive ? "Sim, Suspender" : "Sim, Reativar"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {workspace.type === "GYM" && (
                  <div className="">
                    <GymPurgeForm workspaceId={workspace.id} slug={workspace.slug} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------------
            ABA 2: ASSINATURA & PLANO ATIVO
        ------------------------------------------------------------------- */}
        <TabsContent value="assinatura" className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card Principal do Plano */}
            <Card className="lg:col-span-2 border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CreditCard className="size-4 text-primary" />
                    <span>Plano e Assinatura do Workspace</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Detalhes comerciais, quotas de capacidade e status de faturamento.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setActiveTab("plano-personalizado")}
                  size="sm"
                  className="rounded-xl h-9 px-3.5 text-xs font-bold gap-1.5 cursor-pointer shadow-xs"
                >
                  <Sliders className="size-3.5" />
                  <span>Configurar Plano Personalizado</span>
                </Button>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Cabeçalho do Plano */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-border/40 bg-secondary/15">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-black text-foreground">
                        {workspace.subscription?.plan?.name || "Sem plano ativo"}
                      </h3>
                      {workspace.subscription?.billingControlType === "MANUAL" ? (
                        <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/10 text-amber-500 border-amber-500/20">
                          Recorrência Manual
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/10 text-blue-500 border-blue-500/20">
                          Plataforma Automática
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {workspace.subscription?.plan?.features || "Plano com limites customizados e faturamento centralizado."}
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground block">
                      Valor Contratado
                    </span>
                    <span className="text-2xl font-black text-primary">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        workspace.subscription?.priceInCents
                          ? workspace.subscription.priceInCents / 100
                          : (workspace.subscription?.plan?.price || 0)
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground block">
                      / {workspace.subscription?.periodicity?.toLowerCase() || workspace.subscription?.plan?.interval || "mês"}
                    </span>
                  </div>
                </div>

                {/* Grid de Informações Financeiras e Recorrência */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="size-3.5 text-primary" />
                      Próximo Vencimento
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {workspace.subscription?.nextDueDate
                        ? new Date(workspace.subscription.nextDueDate).toLocaleDateString("pt-BR")
                        : "Não agendado"}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {workspace.subscription?.nextDueDate && (
                        (() => {
                          const diff = Math.ceil((new Date(workspace.subscription.nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                          return diff > 0 ? `Faltam ${diff} dias` : diff === 0 ? "Vence hoje" : `Vencido há ${Math.abs(diff)} dias`;
                        })()
                      )}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <Clock className="size-3.5 text-amber-500" />
                      Tolerância / Carência
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {workspace.subscription?.toleranceDays ?? 5} dias
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Prazo pós-vencimento antes de bloqueio
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/40 bg-card space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-emerald-500" />
                      Suspensão Automática
                    </span>
                    <p className="text-sm font-bold text-foreground">
                      {workspace.subscription?.autoSuspendEnabled ? (
                        <span className="text-emerald-500">Ativada</span>
                      ) : (
                        <span className="text-muted-foreground">Desativada</span>
                      )}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Bloqueio automático por atraso
                    </p>
                  </div>
                </div>

                {/* Quotas e Capacidades */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    Cotas e Capacidades Técnicas
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Alunos */}
                    <div className="p-4 rounded-xl border border-border/40 bg-secondary/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-muted-foreground">
                          <Users className="size-3.5 text-primary" /> Alunos Cadastrados
                        </span>
                        <span className="font-bold text-foreground">
                          {workspace.studentsCount || 0} / {workspace.subscription?.plan?.maxStudents || workspace.subscription?.maxStudents || "Ilimitado"}
                        </span>
                      </div>
                      <Progress
                        value={
                          workspace.subscription?.plan?.maxStudents || workspace.subscription?.maxStudents
                            ? Math.min(100, Math.round(((workspace.studentsCount || 0) / (workspace.subscription?.plan?.maxStudents || workspace.subscription?.maxStudents || 1)) * 100))
                            : 0
                        }
                        className="h-2 bg-secondary"
                      />
                    </div>

                    {/* Armazenamento */}
                    <div className="p-4 rounded-xl border border-border/40 bg-secondary/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-muted-foreground">
                          <FileText className="size-3.5 text-purple-400" /> Armazenamento Contratado
                        </span>
                        <span className="font-bold text-foreground">
                          {(() => {
                            const mb = workspace.subscription?.plan?.storageLimitMb || workspace.subscription?.storageLimitMb || 1024;
                            const normalized = mb <= 50 ? mb * 1024 : mb;
                            return normalized >= 1024 ? `${(normalized / 1024).toFixed(normalized % 1024 === 0 ? 0 : 1)} GB` : `${normalized} MB`;
                          })()}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Espaço para fotos de evolução, vídeos de treino e anexos.
                      </p>
                    </div>

                    {/* Workspaces */}
                    <div className="p-4 rounded-xl border border-border/40 bg-secondary/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-muted-foreground">
                          <Building2 className="size-3.5 text-emerald-400" /> Workspaces / Unidades
                        </span>
                        <span className="font-bold text-foreground">
                          {workspace.subscription?.plan?.maxWorkspaces || workspace.subscription?.maxUnits || 1}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Limite de unidades ou assessorias gerenciáveis.
                      </p>
                    </div>

                    {/* Importação */}
                    <div className="p-4 rounded-xl border border-border/40 bg-secondary/10 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold flex items-center gap-1.5 text-muted-foreground">
                          <Sparkles className="size-3.5 text-amber-400" /> Quota de Importação
                        </span>
                        <span className="font-bold text-foreground">
                          {workspace.subscription?.plan?.importQuota ?? 25} créditos
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Créditos para importação automatizada de treinos via IA/PDF.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Lateral Resumo & Ações */}
            <div className="space-y-6">
              <Card className="border-border/60 bg-card shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Status Operacional</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Situação do Workspace</span>
                    <Badge variant={workspace.isActive ? "default" : "destructive"} className="font-bold text-[10px]">
                      {workspace.isActive ? "Operacional / Ativo" : "Suspenso"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status da Assinatura</span>
                    <Badge variant="outline" className="font-bold text-[10px] text-primary border-primary/20">
                      {workspace.subscription?.status || "INACTIVE"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Método Cadastrado</span>
                    <span className="font-bold">{workspace.subscription?.paymentMethod || "PIX"}</span>
                  </div>

                  <div className="pt-4 border-t border-border/40">
                    <Button
                      onClick={() => setActiveTab("plano-personalizado")}
                      className="w-full rounded-xl h-10 text-xs font-bold gap-2 cursor-pointer shadow-xs"
                    >
                      <Sliders className="size-4" />
                      <span>Alterar / Personalizar Plano</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* -------------------------------------------------------------------
            ABA 3: CONFIGURAÇÃO DE PLANO PERSONALIZADO (MANUAL)
        ------------------------------------------------------------------- */}
        <TabsContent value="plano-personalizado" className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Sliders className="size-4 text-primary" />
                    <span>Criação & Configuração de Plano Manual / Personalizado</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Defina limites sob medida de alunos, workspaces, importação e armazenamento, além do valor e regras de cobrança recorrente.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveCustomPlan} className="space-y-6">
                {/* 1. Identificação do Plano */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Tag className="size-3.5" /> 1. Identificação do Plano
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="planName" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Nome do Plano *
                      </Label>
                      <Input
                        id="planName"
                        required
                        placeholder="Ex: Plano Personalizado VIP"
                        value={customPlanForm.name}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, name: e.target.value }))}
                        className="rounded-xl h-11 border-border/40 font-bold text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="planFeatures" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Recursos / Descrição Curta
                      </Label>
                      <Input
                        id="planFeatures"
                        placeholder="Ex: Alunos ilimitados, suporte prioritário, storage estendido"
                        value={customPlanForm.features}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, features: e.target.value }))}
                        className="rounded-xl h-11 border-border/40 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Cotas e Limites Técnicos */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <Sliders className="size-3.5" /> 2. Limites e Cotas Técnicas
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Limite de Alunos */}
                    <div className="space-y-2 p-3.5 rounded-xl border border-border/40 bg-secondary/10">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="maxStudents" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Limite de Alunos
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Switch
                            id="unlimitedStudents"
                            checked={customPlanForm.isUnlimitedStudents}
                            onCheckedChange={(checked) =>
                              setCustomPlanForm((prev) => ({ ...prev, isUnlimitedStudents: checked }))
                            }
                          />
                          <Label htmlFor="unlimitedStudents" className="text-[10px] font-bold cursor-pointer">
                            Ilimitado
                          </Label>
                        </div>
                      </div>
                      <Input
                        id="maxStudents"
                        type="number"
                        min="1"
                        disabled={customPlanForm.isUnlimitedStudents}
                        placeholder={customPlanForm.isUnlimitedStudents ? "Ilimitado" : "Ex: 100"}
                        value={customPlanForm.isUnlimitedStudents ? "" : customPlanForm.maxStudents}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, maxStudents: e.target.value }))}
                        className="rounded-xl h-10 border-border/40 font-bold text-sm bg-background"
                      />
                    </div>

                    {/* Limite de Workspaces */}
                    <div className="space-y-2 p-3.5 rounded-xl border border-border/40 bg-secondary/10">
                      <Label htmlFor="maxWorkspaces" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Workspaces / Unidades
                      </Label>
                      <Input
                        id="maxWorkspaces"
                        type="number"
                        min="1"
                        required
                        placeholder="Ex: 1"
                        value={customPlanForm.maxWorkspaces}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, maxWorkspaces: e.target.value }))}
                        className="rounded-xl h-10 border-border/40 font-bold text-sm bg-background"
                      />
                    </div>

                    {/* Quota de Importação */}
                    <div className="space-y-2 p-3.5 rounded-xl border border-border/40 bg-secondary/10">
                      <Label htmlFor="importQuota" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Quota de Importação
                      </Label>
                      <Input
                        id="importQuota"
                        type="number"
                        min="0"
                        required
                        placeholder="Ex: 25"
                        value={customPlanForm.importQuota}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, importQuota: e.target.value }))}
                        className="rounded-xl h-10 border-border/40 font-bold text-sm bg-background"
                      />
                    </div>

                    {/* Armazenamento em MB */}
                    <div className="space-y-2 p-3.5 rounded-xl border border-border/40 bg-secondary/10">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="storageLimitMb" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                          Armazenamento (MB ou GB)
                        </Label>
                        <span className="text-[10px] text-muted-foreground font-bold">
                          {(() => {
                            const num = parseInt(customPlanForm.storageLimitMb, 10);
                            if (isNaN(num) || num <= 0) return "";
                            if (num <= 50) return `(${num} GB = ${num * 1024} MB)`;
                            return `(${(num / 1024).toFixed(1)} GB)`;
                          })()}
                        </span>
                      </div>
                      <Input
                        id="storageLimitMb"
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="Ex: 3072 (ou 3 para 3 GB)"
                        value={customPlanForm.storageLimitMb}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, storageLimitMb: e.target.value }))}
                        className="rounded-xl h-10 border-border/40 font-bold text-sm bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Condições Comerciais & Recorrência */}
                <div className="space-y-4 pt-4 border-t border-border/30">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-1.5">
                    <DollarSign className="size-3.5" /> 3. Condições Comerciais, Recorrência e Tolerância
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Valor do Plano */}
                    <div className="space-y-2">
                      <Label htmlFor="planPrice" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Valor do Plano (R$) *
                      </Label>
                      <Input
                        id="planPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        placeholder="Ex: 199.90"
                        value={customPlanForm.price}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, price: e.target.value }))}
                        className="rounded-xl h-11 border-border/40 font-bold text-sm"
                      />
                    </div>

                    {/* Periodicidade */}
                    <div className="space-y-2">
                      <Label htmlFor="planPeriodicity" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Periodicidade de Cobrança *
                      </Label>
                      <Select
                        value={customPlanForm.periodicity}
                        onValueChange={(val: any) => setCustomPlanForm((prev) => ({ ...prev, periodicity: val }))}
                      >
                        <SelectTrigger id="planPeriodicity" className="rounded-xl h-11! w-full border-border/40 text-xs font-bold">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="MENSAL">Mensal</SelectItem>
                          <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                          <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                          <SelectItem value="ANUAL">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Forma de Pagamento */}
                    <div className="space-y-2">
                      <Label htmlFor="planPaymentMethod" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Forma de Pagamento
                      </Label>
                      <Select
                        value={customPlanForm.paymentMethod}
                        onValueChange={(val) => setCustomPlanForm((prev) => ({ ...prev, paymentMethod: val }))}
                      >
                        <SelectTrigger id="planPaymentMethod" className="rounded-xl h-11! w-full border-border/40 text-xs font-bold">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="PIX">PIX</SelectItem>
                          <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                          <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                          <SelectItem value="TRANSFER">Transferência Bancária</SelectItem>
                          <SelectItem value="CASH">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Próximo Vencimento */}
                    <div className="space-y-2">
                      <Label htmlFor="planNextDueDate" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Próximo Vencimento *
                      </Label>
                      <Input
                        id="planNextDueDate"
                        type="date"
                        required
                        value={customPlanForm.nextDueDate}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, nextDueDate: e.target.value }))}
                        className="rounded-xl h-11 border-border/40 text-xs font-bold"
                      />
                    </div>

                    {/* Dias de Tolerância */}
                    <div className="space-y-2">
                      <Label htmlFor="planToleranceDays" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Dias de Tolerância / Carência *
                      </Label>
                      <Input
                        id="planToleranceDays"
                        type="number"
                        min="0"
                        max="90"
                        required
                        value={customPlanForm.toleranceDays}
                        onChange={(e) => setCustomPlanForm((prev) => ({ ...prev, toleranceDays: e.target.value }))}
                        className="rounded-xl h-11 border-border/40 text-xs font-bold"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Dias permitidos em atraso antes do bloqueio automático.
                      </p>
                    </div>

                    {/* Suspensão Automática */}
                    <div className="space-y-2 flex flex-col justify-center p-3 rounded-xl border border-border/40 bg-secondary/15">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="planAutoSuspend" className="text-xs font-bold cursor-pointer">
                          Suspensão Automática
                        </Label>
                        <Switch
                          id="planAutoSuspend"
                          checked={customPlanForm.autoSuspendEnabled}
                          onCheckedChange={(checked) =>
                            setCustomPlanForm((prev) => ({ ...prev, autoSuspendEnabled: checked }))
                          }
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Suspender o workspace automaticamente se ultrapassar os dias de tolerância.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActiveTab("assinatura")}
                    className="rounded-xl h-11 px-5 font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingCustomPlan}
                    className="rounded-xl h-11 px-6 font-bold text-xs gap-2 cursor-pointer shadow-xs"
                  >
                    {isSavingCustomPlan ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Salvando Plano...</span>
                      </>
                    ) : (
                      <>
                        <Save className="size-4" />
                        <span>Salvar e Ativar Plano Personalizado</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {workspace.type === "GYM" && (
          <TabsContent value="unidades" className="space-y-6 animate-in fade-in duration-300">
            {/* Capacidade e Franquias Contratadas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="border-border/60 bg-card shadow-xs">
                <CardContent className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Alunos Matriculados</span>
                    <Users className="size-4 text-primary" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-foreground">{workspace.studentsCount || 0}</h3>
                    <span className="text-xs font-bold text-muted-foreground">/ {gymLimits.maxStudents}</span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round(((workspace.studentsCount || 0) / (gymLimits.maxStudents || 1)) * 100))}
                    className="h-2 bg-secondary"
                  />
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card shadow-xs">
                <CardContent className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Equipe / Staff</span>
                    <ShieldCheck className="size-4 text-purple-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-foreground">{workspace.staffCount || 0}</h3>
                    <span className="text-xs font-bold text-muted-foreground">/ {gymLimits.maxStaff}</span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round(((workspace.staffCount || 0) / (gymLimits.maxStaff || 1)) * 100))}
                    className="h-2 bg-secondary"
                  />
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-card shadow-xs">
                <CardContent className="p-5 space-y-2.5">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest">Unidades Filiais</span>
                    <Building2 className="size-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-black text-foreground">{workspace.units?.length || 0}</h3>
                    <span className="text-xs font-bold text-muted-foreground">/ {gymLimits.maxUnits}</span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round(((workspace.units?.length || 0) / (gymLimits.maxUnits || 1)) * 100))}
                    className="h-2 bg-secondary"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Unidades Filiais */}
            <Card className="border-border/60 bg-card shadow-xs overflow-hidden">
              <CardHeader className="pb-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Building2 className="size-4 text-primary" />
                    <span>Filiais Físicas da Rede ({workspace.units?.length || 0})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Locais físicos de atendimento cadastrados nesta academia.
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsAddUnitOpen(true)}
                  disabled={(workspace.units?.length || 0) >= (gymLimits.maxUnits || 5)}
                  className="rounded-xl h-9 px-4 font-bold gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer shrink-0"
                >
                  <Plus className="size-3.5" />
                  <span>Nova Unidade</span>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {workspace.units && workspace.units.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-secondary/5 border-b border-border/40 hover:bg-secondary/5">
                          <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                            Unidade
                          </TableHead>
                          <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                            Código / Slug
                          </TableHead>
                          <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                            Status
                          </TableHead>
                          <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">
                            Cadastrada em
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-border/30">
                        {workspace.units.map((unit: any) => (
                          <TableRow key={unit.id} className="hover:bg-secondary/15 transition-colors">
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                  <Building2 className="size-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-sm text-foreground truncate">{unit.name}</span>
                                  {unit.address && (
                                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                                      <MapPin className="size-3 shrink-0" />
                                      {unit.address}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="px-6 py-4 font-mono text-xs text-muted-foreground">
                              {unit.code}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider h-5 px-2">
                                {unit.status || "Ativa"}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 text-xs text-muted-foreground text-right">
                              {new Date(unit.createdAt).toLocaleDateString("pt-BR")}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <Empty className="py-12 border-none">
                    <EmptyMedia variant="icon">
                      <Building2 className="size-5" />
                    </EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle className="text-sm font-bold">Nenhuma unidade física cadastrada</EmptyTitle>
                      <EmptyDescription className="text-xs">
                        Cadastre a primeira filial física desta academia para habilitar a gestão descentralizada.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                )}
              </CardContent>
            </Card>

            {/* Parâmetros de Licença & Políticas */}
            <Card className="border-border/60 bg-card shadow-xs">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Sliders className="size-4 text-primary" />
                  <span>Parâmetros de Licenciamento & Políticas Operacionais</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Ajuste os limites de uso e preferências contratuais da academia.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleSaveGymConfig} className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 mb-3">
                      Limites Contratuais
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maxStudents" className="text-xs font-bold">
                          Máximo de Alunos
                        </Label>
                        <Input
                          id="maxStudents"
                          disabled={isSavingGymConfig}
                          type="number"
                          min="1"
                          value={gymLimits.maxStudents}
                          onChange={(e) => setGymLimits({ ...gymLimits, maxStudents: Number(e.target.value) })}
                          className="rounded-xl h-10 border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxStaff" className="text-xs font-bold">
                          Máximo de Equipe / Staff
                        </Label>
                        <Input
                          id="maxStaff"
                          disabled={isSavingGymConfig}
                          type="number"
                          min="1"
                          value={gymLimits.maxStaff}
                          onChange={(e) => setGymLimits({ ...gymLimits, maxStaff: Number(e.target.value) })}
                          className="rounded-xl h-10 border-border/60"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="maxUnits" className="text-xs font-bold">
                          Máximo de Unidades Filiais
                        </Label>
                        <Input
                          id="maxUnits"
                          disabled={isSavingGymConfig}
                          type="number"
                          min="1"
                          value={gymLimits.maxUnits}
                          onChange={(e) => setGymLimits({ ...gymLimits, maxUnits: Number(e.target.value) })}
                          className="rounded-xl h-10 border-border/60"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/30">
                    <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80 mb-3">
                      Regras de Negócio & Cobrança
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="gracePeriod" className="text-xs font-bold">
                          Tolerância de Inadimplência (Dias)
                        </Label>
                        <Input
                          id="gracePeriod"
                          disabled={isSavingGymConfig}
                          type="number"
                          min="0"
                          value={gymPolicies.billingGracePeriodDays}
                          onChange={(e) =>
                            setGymPolicies({ ...gymPolicies, billingGracePeriodDays: Number(e.target.value) })
                          }
                          className="rounded-xl h-10 border-border/60"
                        />
                        <p className="text-[11px] text-muted-foreground font-medium">
                          Dias de tolerância antes de suspender a catraca/acesso do aluno inadimplente.
                        </p>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/10">
                        <div className="space-y-0.5 pr-4">
                          <Label htmlFor="requireGuardianSignature" className="text-xs font-bold cursor-pointer">
                            Assinatura Obrigatória de Responsável
                          </Label>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            Exigir assinatura digital do responsável legal para ativação de menores.
                          </p>
                        </div>
                        <Switch
                          id="requireGuardianSignature"
                          disabled={isSavingGymConfig}
                          checked={gymPolicies.requireGuardianSignature}
                          onCheckedChange={(checked) =>
                            setGymPolicies({ ...gymPolicies, requireGuardianSignature: checked })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-border/30">
                    <Button
                      type="submit"
                      disabled={isSavingGymConfig}
                      className="rounded-xl h-10 px-6 font-bold gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
                    >
                      {isSavingGymConfig ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="size-4" />
                          <span>Salvar Configurações</span>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* -------------------------------------------------------------------
            ABA 3: MEMBROS & ACESSOS
        ------------------------------------------------------------------- */}
        <TabsContent value="membros" className="animate-in fade-in duration-300">
          <Card className="border-border/60 bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span>Membros Cadastrados ({workspace.members?.length || 0})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Usuários vinculados a este workspace com acesso ao painel ou prescrição.
                  </CardDescription>
                </div>
              </div>

              {/* Barra de Filtros de Membros */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Buscar membro por nome ou e-mail..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="h-9.5 pl-9 rounded-xl border-border/60 text-xs"
                  />
                  {memberSearch && (
                    <button
                      type="button"
                      onClick={() => setMemberSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md"
                    >
                      <RotateCcw className="size-3" />
                    </button>
                  )}
                </div>

                <Select value={memberRoleFilter} onValueChange={setMemberRoleFilter}>
                  <SelectTrigger className="h-9.5 w-full sm:w-[150px] rounded-xl border-border/60 text-xs font-semibold">
                    <SelectValue placeholder="Todas as Funções" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todas as Funções</SelectItem>
                    <SelectItem value="OWNER">Proprietário (Owner)</SelectItem>
                    <SelectItem value="TRAINER">Treinador (Trainer)</SelectItem>
                    <SelectItem value="STUDENT">Aluno (Student)</SelectItem>
                    <SelectItem value="ASSISTANT">Assistente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredMembers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/5 border-b border-border/40 hover:bg-secondary/5">
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          Membro
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          Função
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">
                          Foco Streak
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">
                          Progresso
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">
                          Último Acesso
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/30">
                      {filteredMembers.map((member: any) => (
                        <TableRow key={member.id} className="hover:bg-secondary/15 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="size-9 border border-border/60">
                                <AvatarImage src={member.user?.image} />
                                <AvatarFallback className="font-bold text-xs bg-primary/10 text-primary">
                                  {member.user?.name?.substring(0, 2).toUpperCase() ||
                                    member.user?.email?.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">
                                  {member.user?.name || "Sem Nome"}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">{member.user?.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-bold uppercase text-[9px] tracking-wider border h-5 px-2",
                                member.role === "OWNER" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                member.role === "TRAINER" && "bg-primary/10 text-primary border-primary/20",
                                member.role === "STUDENT" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                member.role === "ASSISTANT" && "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              )}
                            >
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1 font-bold text-xs">
                              <Flame className="size-3.5 text-orange-500 fill-current" />
                              <span>{member.streak || 0}d</span>
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (rec: {member.bestStreak || 0}d)
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <div className="flex flex-col items-center justify-center gap-1 max-w-[90px] mx-auto">
                              <span className="text-[11px] font-bold text-foreground">{member.progress || 0}%</span>
                              <Progress value={member.progress || 0} className="h-1.5 w-full bg-secondary" />
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <span className="text-xs font-medium text-muted-foreground">
                              {member.lastActive
                                ? new Date(member.lastActive).toLocaleDateString("pt-BR")
                                : "Nunca"}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {member.user?.whatsapp && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="size-8 rounded-lg text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600"
                                  onClick={() =>
                                    window.open(`https://wa.me/55${member.user.whatsapp.replace(/\D/g, "")}`, "_blank")
                                  }
                                  title="Enviar mensagem via WhatsApp"
                                >
                                  <MessageCircle className="size-4" />
                                </Button>
                              )}
                              <Button
                                onClick={() => triggerImpersonate(member)}
                                variant="outline"
                                size="sm"
                                className="h-8 rounded-lg font-bold text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground border-border/60 shadow-xs cursor-pointer"
                              >
                                <LogIn className="size-3.5" />
                                <span>Acessar</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty className="py-12 border-none">
                  <EmptyMedia variant="icon">
                    <Users className="size-5" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle className="text-sm font-bold">Nenhum membro encontrado</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      {memberSearch || memberRoleFilter !== "ALL"
                        ? "Nenhum membro corresponde aos filtros de busca informados."
                        : "Não há membros registrados nesta assessoria até o momento."}
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------
            ABA 4: CONTROLE FINANCEIRO INTERNO
        ------------------------------------------------------------------- */}
        <TabsContent value="financeiro" className="animate-in fade-in duration-300">
          <Card className="border-border/60 bg-card shadow-xs overflow-hidden">
            <CardHeader className="pb-4 border-b border-border/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <DollarSign className="size-4 text-emerald-500" />
                    <span>Movimentação Financeira Interna ({workspace.payments?.length || 0})</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {workspace.type === "GYM"
                      ? "Registros legados para consulta. Os indicadores executivos usam contratos e faturas da academia."
                      : "Registros de cobranças e faturas emitidas para alunos da assessoria."}
                  </CardDescription>
                </div>
              </div>

              {/* Filtro de Status de Pagamento */}
              <div className="flex items-center gap-3">
                <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                  <SelectTrigger className="h-9.5 w-full sm:w-[160px] rounded-xl border-border/60 text-xs font-semibold">
                    <SelectValue placeholder="Status de Pagamento" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="atrasado">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {filteredPayments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary/5 border-b border-border/40 hover:bg-secondary/5">
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          Aluno
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                          Plano
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">
                          Valor
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">
                          Método
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">
                          Status
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-center">
                          Data
                        </TableHead>
                        <TableHead className="px-6 py-3.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground text-right">
                          Ações
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/30">
                      {filteredPayments.map((payment: any) => (
                        <TableRow key={payment.id} className="hover:bg-secondary/15 transition-colors">
                          <TableCell className="px-6 py-4 font-bold text-sm text-foreground">
                            {payment.studentName}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-xs font-semibold text-muted-foreground">
                            {payment.planName || "Avulso"}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center font-black text-sm text-foreground">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                              payment.amount
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <Badge
                              variant="outline"
                              className="font-mono text-[9px] font-semibold border-border/40 uppercase bg-secondary/50 h-5 px-2"
                            >
                              {payment.method || "PIX"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center">
                            <Badge
                              className={cn(
                                "font-bold uppercase text-[9px] tracking-wider border h-5 px-2 rounded-md shadow-none",
                                payment.status === "pago" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                                payment.status === "pendente" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                                payment.status === "atrasado" && "bg-rose-500/10 text-rose-500 border-rose-500/20"
                              )}
                            >
                              {payment.status === "pago"
                                ? "Pago"
                                : payment.status === "pendente"
                                  ? "Pendente"
                                  : "Atrasado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-center font-medium text-xs text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Button
                              disabled={workspace.type === "GYM"}
                              onClick={() => triggerModeratePayment(payment)}
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-lg font-bold text-xs gap-1.5 hover:bg-primary hover:text-primary-foreground border-border/60 shadow-xs cursor-pointer"
                            >
                              <Sliders className="size-3.5" />
                              <span>Moderar</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <Empty className="py-12 border-none">
                  <EmptyMedia variant="icon">
                    <CreditCard className="size-5" />
                  </EmptyMedia>
                  <EmptyHeader>
                    <EmptyTitle className="text-sm font-bold">Nenhum registro de pagamento</EmptyTitle>
                    <EmptyDescription className="text-xs">
                      Não há transações financeiras internas registradas para os filtros aplicados.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddUnitOpen} onOpenChange={setIsAddUnitOpen}>
        <DialogContent className="max-w-md rounded-2xl! border-border/50">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Building2 className="size-5 text-primary" />
              <span>Cadastrar Nova Unidade</span>
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-muted-foreground">
              Adicione uma filial física à rede desta academia.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUnit} className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="unitName" className="text-xs font-bold">
                Nome da Unidade
              </Label>
              <Input
                id="unitName"
                required
                placeholder="Ex: Unidade Jardins"
                value={newUnitData.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const code = name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")
                    .replace(/(^-|-$)+/g, "");
                  setNewUnitData({ ...newUnitData, name, code });
                }}
                className="rounded-xl h-10 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitCode" className="text-xs font-bold">
                Código Identificador (Slug)
              </Label>
              <Input
                id="unitCode"
                required
                placeholder="Ex: jardins"
                value={newUnitData.code}
                onChange={(e) => setNewUnitData({ ...newUnitData, code: e.target.value })}
                className="rounded-xl h-10 border-border/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unitAddress" className="text-xs font-bold">
                Endereço Completo (Opcional)
              </Label>
              <Input
                id="unitAddress"
                placeholder="Ex: Av. Paulista, 1000 - Bela Vista, SP"
                value={newUnitData.address}
                onChange={(e) => setNewUnitData({ ...newUnitData, address: e.target.value })}
                className="rounded-xl h-10 border-border/60"
              />
            </div>
            <DialogFooter className="pt-4 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddUnitOpen(false)}
                className="rounded-xl font-bold h-10"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isAddingUnit || !newUnitData.name.trim() || !newUnitData.code.trim()}
                className="rounded-xl h-10 px-6 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
              >
                {isAddingUnit ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    <span>Cadastrando...</span>
                  </>
                ) : (
                  "Cadastrar Unidade"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Modal de Confirmação de Impersonate */}
      <Dialog
        open={isImpersonateOpen}
        onOpenChange={(open) => {
          setIsImpersonateOpen(open);
          if (!open) {
            setMemberToImpersonate(null);
            setIsWorkspaceAccess(false);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl! border-border/50">
          {memberToImpersonate && (
            <>
              <DialogHeader className="space-y-3">
                <div className="mx-auto size-12 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                  <LogIn className="size-6" />
                </div>
                <DialogTitle className="font-black text-xl text-center">
                  {isWorkspaceAccess
                    ? "Acessar Workspace (Manutenção & Assistência)"
                    : "Aviso de Acesso Seguro (Auditoria)"}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium leading-relaxed text-center text-muted-foreground">
                  {isWorkspaceAccess ? (
                    <>
                      Você está iniciando uma sessão de diagnóstico, assistência técnica ou manutenção no workspace{" "}
                      <strong className="text-foreground">{workspace.name}</strong> através da credencial do titular{" "}
                      <strong className="text-foreground">
                        {memberToImpersonate.user?.name || "Proprietário"} ({memberToImpersonate.user?.email})
                      </strong>
                      . Todas as ações realizadas ficarão registradas nos registros de auditoria do sistema.
                    </>
                  ) : (
                    <>
                      Você está prestes a acessar temporariamente a conta de{" "}
                      <strong className="text-foreground">
                        {memberToImpersonate.user?.name || "Usuário"} ({memberToImpersonate.user?.email})
                      </strong>
                      . Todas as suas ações serão gravadas em seu nome nos registros de auditoria do sistema.
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-6 gap-2 sm:justify-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setIsImpersonateOpen(false);
                    setMemberToImpersonate(null);
                    setIsWorkspaceAccess(false);
                  }}
                  disabled={isImpersonating}
                  className="rounded-xl font-bold h-10 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleImpersonate}
                  disabled={isImpersonating}
                  className="rounded-xl h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer gap-2"
                >
                  {isImpersonating ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Acessando...
                    </>
                  ) : (
                    <>
                      <LogIn className="size-4" />
                      <span>{isWorkspaceAccess ? "Entrar no Workspace" : "Sim, Entrar na Conta"}</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Modal de Moderação Financeira */}
      <Dialog
        open={isPaymentModalOpen}
        onOpenChange={(open) => {
          setIsPaymentModalOpen(open);
          if (!open) setSelectedPayment(null);
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border-border/50">
          {selectedPayment && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight">Moderar Cobrança</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Aluno: {selectedPayment.studentName} · Plano: {selectedPayment.planName}
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground">
                    Alterar Status do Pagamento
                  </Label>
                  <Select
                    defaultValue={selectedPayment.status}
                    onValueChange={(val) => handleUpdatePaymentStatus(val)}
                    disabled={updatingPaymentStatus || deletingPayment}
                  >
                    <SelectTrigger className="rounded-xl h-11 w-full border-border/60 font-bold text-xs">
                      <SelectValue placeholder="Selecione o novo status..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      <SelectItem value="pago" className="font-bold text-xs text-emerald-500">
                        PAGO
                      </SelectItem>
                      <SelectItem value="pendente" className="font-bold text-xs text-amber-500">
                        PENDENTE
                      </SelectItem>
                      <SelectItem value="atrasado" className="font-bold text-xs text-rose-500">
                        ATRASADO
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {updatingPaymentStatus && (
                    <div className="flex items-center gap-2 text-[11px] font-bold text-primary animate-pulse pl-1 pt-1">
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Salvando alteração de status...</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-border/50 bg-secondary/15 flex flex-col gap-2.5 text-xs">
                  <div className="flex justify-between font-bold">
                    <span className="text-muted-foreground">Valor Cobrado:</span>
                    <span className="text-foreground">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        selectedPayment.amount
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-muted-foreground">Método:</span>
                    <span className="text-foreground uppercase">{selectedPayment.method || "PIX"}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-muted-foreground">Registrado em:</span>
                    <span className="text-foreground">
                      {new Date(selectedPayment.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/30 flex flex-col sm:flex-row gap-2">
                <Button
                  onClick={() => setIsDeletePaymentAlertOpen(true)}
                  variant="ghost"
                  type="button"
                  disabled={updatingPaymentStatus || deletingPayment}
                  className="rounded-xl hover:bg-rose-500/10 h-10 font-bold text-rose-500 hover:text-rose-600 cursor-pointer mr-auto text-xs gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  <span>Excluir Registro</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedPayment(null);
                  }}
                  disabled={updatingPaymentStatus || deletingPayment}
                  className="rounded-xl font-bold h-10 text-xs"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. AlertDialog de Exclusão Definitiva de Cobrança */}
      <AlertDialog open={isDeletePaymentAlertOpen} onOpenChange={setIsDeletePaymentAlertOpen}>
        <AlertDialogContent className="rounded-2xl border-rose-500/20">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
              <Trash2 className="size-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black tracking-tight text-center">
              Excluir Cobrança Definitivamente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground text-center">
              Tem certeza que deseja excluir o registro de cobrança do aluno{" "}
              <strong className="text-foreground">{selectedPayment?.studentName}</strong>? Esta ação é irreversível
              e removerá o registro financeiro da base.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 gap-2 sm:justify-center">
            <AlertDialogCancel className="rounded-xl font-bold h-10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePaymentConfirm}
              disabled={deletingPayment}
              className="rounded-xl h-10 px-6 font-bold bg-rose-600 text-white hover:bg-rose-700 shadow-xs cursor-pointer gap-1.5"
            >
              {deletingPayment ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 5. Overlay de Transição de Conta (Impersonate) */}
      {isImpersonating && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm px-6 py-8 rounded-2xl border border-border/50 bg-card shadow-2xl">
            <div className="size-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 animate-bounce">
              <LogIn className="size-8" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black tracking-tight">Transição de Conta</h3>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                Estabelecendo login seguro...
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1 font-medium">
                Acessando o ecossistema do AtlasFit com as credenciais do usuário para suporte. Por favor, aguarde.
              </p>
            </div>
            <Loader2 className="size-6 text-primary animate-spin mt-2" />
          </div>
        </div>
      )}
    </div>
  );
}
