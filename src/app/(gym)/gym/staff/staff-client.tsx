"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { cn, formatPhone, formatCref } from "@/lib/utils";
import {
  Users,
  Building2,
  ShieldCheck,
  UserCheck,
  Plus,
  Mail,
  MoreHorizontal,
  Copy,
  Check,
  Trash2,
  Edit,
  UserMinus,
  Loader2,
  Search,
  Dumbbell,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Phone,
  Sparkles,
  UserPlus,
} from "lucide-react";

import { GymPageHeader, GymEmptyState } from "@/components/application/gym-page";
import { GymTabsList } from "@/components/application/gym-tabs-list";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { WorkspaceRole } from "@/modules/workspaces/domain/roles";
import {
  gymStaffListSchema,
  gymInvitationListSchema,
  gymStaffRoleSchema,
  type GymStaffRow,
  type GymInvitationRow,
} from "@/modules/workspaces/domain/gym-staff-contract";
import { workspaceAdministrationErrorMessage } from "@/modules/workspaces/domain/workspace-administration-contract";
import { z } from "zod";

interface GymStaffClientProps {
  workspaceId: string;
  workspaceName: string;
  initialStaff: GymStaffRow[];
  initialInvitations: GymInvitationRow[];
  initialStaffTotal: number;
  initialInvitationTotal: number;
  maxStaff: number;
  canManageStaff: boolean;
  currentUserId: string;
  units: { id: string; name: string }[];
  canManageGlobal: boolean;
}

const roleBadgeMap: Record<string, { label: string; className: string }> = {
  OWNER: {
    label: "Diretor / Proprietário",
    className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
  MANAGER: {
    label: "Gerente Geral",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  TRAINER: {
    label: "Instrutor / Coach",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  RECEPTIONIST: {
    label: "Recepção",
    className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  },
  FINANCE: {
    label: "Financeiro",
    className: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  },
  ASSISTANT: {
    label: "Assistente",
    className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  },
};

export function GymStaffClient({
  workspaceId,
  workspaceName,
  initialStaff,
  initialInvitations,
  maxStaff,
  canManageStaff,
  currentUserId,
  initialStaffTotal,
  initialInvitationTotal,
  units,
  canManageGlobal,
}: GymStaffClientProps) {
  const [staffList, setStaffList] = useState(initialStaff);
  const [invitationsList, setInvitationsList] = useState(initialInvitations);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<WorkspaceRole | "all">("all");
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>("all");
  const [staffTotal, setStaffTotal] = useState(initialStaffTotal);
  const [invitationTotal, setInvitationTotal] = useState(initialInvitationTotal);
  const [staffPage, setStaffPage] = useState(1);
  const [invitationPage, setInvitationPage] = useState(1);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestRef = useRef<AbortController | null>(null);

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState<{
    email: string;
    role: WorkspaceRole;
    cref: string;
    jobTitle: string;
    unitId: string;
  }>({
    email: "",
    role: "TRAINER",
    cref: "",
    jobTitle: "",
    unitId: canManageGlobal ? "global" : units[0]?.id ?? "",
  });
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [inviteSuccessInfo, setInviteSuccessInfo] = useState<{ email: string; emailSent: boolean } | null>(null);
  const [hasCopiedLink, setHasCopiedLink] = useState(false);

  // Edit Staff Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<GymStaffRow | null>(null);
  const [editForm, setEditForm] = useState<{
    role: WorkspaceRole;
    cref: string;
    jobTitle: string;
    bio: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
  }>({
    role: "TRAINER",
    cref: "",
    jobTitle: "",
    bio: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });

  // Offboard Alert Modal State
  const [isOffboardOpen, setIsOffboardOpen] = useState(false);
  const [isOffboarding, setIsOffboarding] = useState(false);
  const [offboardTarget, setOffboardTarget] = useState<GymStaffRow | null>(null);
  const [replacementStaffId, setReplacementStaffId] = useState<string>("none");
  const [offboardReason, setOffboardReason] = useState("");

  // Revoke Invite Alert Modal State
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [inviteToRevoke, setInviteToRevoke] = useState<GymInvitationRow | null>(null);

  // Filtered staff locally for fast search & role/unit filtering
  const filteredStaff = staffList.filter((m) => {
    const nameMatch = m.user?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = m.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSearch = !searchTerm || nameMatch || emailMatch;

    const matchesRole =
      selectedRoleFilter === "all" ||
      m.role === selectedRoleFilter ||
      m.roleGrants.some((g) => g.role === selectedRoleFilter);

    const matchesUnit =
      selectedUnitFilter === "all" ||
      m.unitId === selectedUnitFilter ||
      m.roleGrants.some((g) => g.unitId === selectedUnitFilter);

    return matchesSearch && matchesRole && matchesUnit;
  });

  const trainerCount = staffList.filter(
    (m) => m.role === "TRAINER" || m.roleGrants.some((g) => g.role === "TRAINER")
  ).length;

  const receptionCount = staffList.filter(
    (m) => m.role === "RECEPTIONIST" || m.roleGrants.some((g) => g.role === "RECEPTIONIST")
  ).length;

  const refreshStaff = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setIsRefreshing(true);
    try {
      const query = new URLSearchParams({
        workspaceId,
        page: String(staffPage),
        limit: "50",
        ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
        ...(selectedRoleFilter !== "all" ? { role: selectedRoleFilter } : {}),
        ...(selectedUnitFilter !== "all" ? { unitId: selectedUnitFilter } : {}),
      });

      const [res, invRes] = await Promise.all([
        fetch(`/api/gym/staff?${query}`, { signal: controller.signal }),
        fetch(
          `/api/gym/invitations?${new URLSearchParams({
            workspaceId,
            page: String(invitationPage),
            limit: "50",
            ...(selectedUnitFilter !== "all" ? { unitId: selectedUnitFilter } : {}),
          })}`,
          { signal: controller.signal }
        ),
      ]);

      const raw: unknown = await res.json();
      const invitations: unknown = await invRes.json();

      if (!res.ok || !invRes.ok) {
        throw new Error(workspaceAdministrationErrorMessage(!res.ok ? raw : invitations, "Falha ao atualizar a equipe."));
      }

      const staff = gymStaffListSchema.parse(raw);
      const invited = gymInvitationListSchema.parse(invitations);

      if (controller.signal.aborted) return false;
      setStaffList(staff.data);
      setStaffTotal(staff.total);
      setInvitationsList(invited.data);
      setInvitationTotal(invited.total);
      setRefreshError(null);
      return true;
    } catch (error) {
      if (controller.signal.aborted) return false;
      setRefreshError(error instanceof Error ? error.message : "Falha ao atualizar a equipe.");
      return false;
    } finally {
      if (!controller.signal.aborted) setIsRefreshing(false);
    }
  }, [workspaceId, staffPage, invitationPage, searchTerm, selectedRoleFilter, selectedUnitFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshStaff();
    }, 250);
    return () => {
      clearTimeout(timer);
      requestRef.current?.abort();
    };
  }, [refreshStaff]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim() || !inviteForm.email.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setIsInviting(true);
    try {
      const res = await fetch("/api/gym/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          email: inviteForm.email.trim(),
          role: inviteForm.role,
          unitId: inviteForm.unitId === "global" ? null : inviteForm.unitId,
          cref: inviteForm.cref ? inviteForm.cref.trim() : null,
          jobTitle: inviteForm.jobTitle ? inviteForm.jobTitle.trim() : null,
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        throw new Error(workspaceAdministrationErrorMessage(data, "Erro ao enviar convite."));
      }

      const parsedResult = z
        .object({
          inviteUrl: z.string(),
          delivery: z.string().optional(),
          emailSent: z.boolean().optional(),
        })
        .safeParse(data);

      const inviteUrl = parsedResult.success ? parsedResult.data.inviteUrl : (data as any)?.inviteUrl;
      const emailSent = parsedResult.success ? parsedResult.data.emailSent : false;

      if (emailSent) {
        toast.success(`Convite enviado por e-mail para ${inviteForm.email}!`);
      } else {
        toast.success("Convite gerado com sucesso!");
      }

      const fullUrl = inviteUrl?.startsWith("http")
        ? inviteUrl
        : `${window.location.origin}${inviteUrl}`;

      setGeneratedInviteLink(fullUrl);
      setInviteSuccessInfo({ email: inviteForm.email.trim(), emailSent: !!emailSent });
      await refreshStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao enviar convite.");
    } finally {
      setIsInviting(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopiedLink(true);
      toast.success("Link copiado para a área de transferência.");
      setTimeout(() => setHasCopiedLink(false), 3000);
    } catch {
      toast.error("Não foi possível copiar. Selecione o link e copie manualmente.");
    }
  };

  const openEditModal = (member: GymStaffRow) => {
    setEditingStaffMember(member);
    setEditForm({
      role: member.role,
      cref: member.staffProfile?.cref ? formatCref(member.staffProfile.cref) : "",
      jobTitle: member.staffProfile?.jobTitle || "",
      bio: member.staffProfile?.bio || "",
      emergencyContactName: member.staffProfile?.emergencyContactName || "",
      emergencyContactPhone: member.staffProfile?.emergencyContactPhone
        ? formatPhone(member.staffProfile.emergencyContactPhone)
        : "",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaffMember) return;
    setIsSavingEdit(true);

    try {
      const res = await fetch(
        `/api/gym/staff/${editingStaffMember.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            role: editForm.role !== editingStaffMember.role ? editForm.role : undefined,
            cref: editForm.cref ? editForm.cref.trim() : null,
            jobTitle: editForm.jobTitle ? editForm.jobTitle.trim() : null,
            bio: editForm.bio ? editForm.bio.trim() : null,
            emergencyContactName: editForm.emergencyContactName ? editForm.emergencyContactName.trim() : null,
            emergencyContactPhone: editForm.emergencyContactPhone ? editForm.emergencyContactPhone.trim() : null,
          }),
        }
      );

      const data: unknown = await res.json();
      if (!res.ok) {
        throw new Error(workspaceAdministrationErrorMessage(data, "Erro ao atualizar colaborador."));
      }

      toast.success("Perfil do colaborador atualizado com sucesso!");
      setIsEditOpen(false);
      setEditingStaffMember(null);
      await refreshStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const openOffboardModal = (member: GymStaffRow) => {
    setOffboardTarget(member);
    setReplacementStaffId("none");
    setOffboardReason("");
    setIsOffboardOpen(true);
  };

  const handleConfirmOffboard = async () => {
    if (!offboardTarget) return;
    if (!offboardReason.trim()) {
      toast.error("Informe o motivo do desligamento.");
      return;
    }
    setIsOffboarding(true);

    try {
      const res = await fetch(
        `/api/gym/staff/${offboardTarget.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId,
            replacementStaffMemberId: replacementStaffId === "none" ? null : replacementStaffId,
            reason: offboardReason.trim() || undefined,
          }),
        }
      );

      const data: unknown = await res.json();
      if (!res.ok) {
        throw new Error(workspaceAdministrationErrorMessage(data, "Erro ao desligar colaborador."));
      }
      const result = z
        .object({ success: z.literal(true), reassignedStudentsCount: z.number() })
        .parse(data);

      toast.success(
        `Colaborador desligado.${
          result.reassignedStudentsCount > 0
            ? ` ${result.reassignedStudentsCount} aluno(s) redistribuídos.`
            : ""
        }`
      );
      setIsOffboardOpen(false);
      setOffboardTarget(null);
      await refreshStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao desligar colaborador.");
    } finally {
      setIsOffboarding(false);
    }
  };

  const handleConfirmRevoke = async () => {
    if (!inviteToRevoke) return;
    setIsRevoking(true);

    try {
      const res = await fetch(
        `/api/gym/invitations/${inviteToRevoke.id}?workspaceId=${encodeURIComponent(workspaceId)}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId }),
        }
      );

      if (!res.ok) {
        const data: unknown = await res.json();
        throw new Error(workspaceAdministrationErrorMessage(data, "Erro ao revogar convite."));
      }

      toast.success("Convite cancelado com sucesso!");
      setIsRevokeOpen(false);
      setInviteToRevoke(null);
      await refreshStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao cancelar convite.");
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* 1. Header */}
      <GymPageHeader
        title={<>Equipe</>}
        description={<>Gerencie os profissionais, instrutores, permissões e convites da academia.</>}
        actions={
          <>
            {canManageStaff && (
              <Button
                size="default"
                onClick={() => {
                  setGeneratedInviteLink(null);
                  setInviteSuccessInfo(null);
                  setInviteForm({
                    email: "",
                    role: "TRAINER",
                    cref: "",
                    jobTitle: "",
                    unitId: canManageGlobal ? "global" : units[0]?.id ?? "",
                  });
                  setIsInviteOpen(true);
                }}
                disabled={isRefreshing}
                className="flex items-center gap-2 font-medium cursor-pointer"
              >
                <Plus className="size-4" />
                Convidar Profissional
              </Button>
            )}
          </>
        }
      />

      {/* 2. KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0 [&>*]:min-w-0">
        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Total de Membros
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {staffTotal}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-primary/10 text-primary">
                <Users className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              {staffList.filter((s) => s.isActive).length} ativos no momento
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Instrutores & Coaches
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {trainerCount}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-emerald-500/10 text-emerald-500">
                <Dumbbell className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              Prescrição de treinos e acompanhamento
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Recepção & Operação
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {receptionCount}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-cyan-500/10 text-cyan-500">
                <UserCheck className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              Atendimento e suporte a alunos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card hover:border-border transition-all">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
                  Convites Pendentes
                </p>
                <p className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {invitationTotal}
                </p>
              </div>
              <div className="flex size-9 items-center justify-center rounded-lg shrink-0 bg-amber-500/10 text-amber-500">
                <Mail className="size-4.5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
              Aguardando ativação por e-mail
            </p>
          </CardContent>
        </Card>
      </div>

      {refreshError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{refreshError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            onClick={() => {
              void refreshStaff();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* 3. Tabs: Equipe Ativa vs Convites Enviados */}
      <Tabs defaultValue="equipe" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <GymTabsList>
            <TabsTrigger value="equipe" className="gap-2 text-xs">
              <Users className="size-3.5" />
              <span>Colaboradores ({staffTotal})</span>
            </TabsTrigger>
            <TabsTrigger value="convites" className="gap-2 text-xs">
              <Mail className="size-3.5" />
              <span>Convites ({invitationTotal})</span>
              {invitationTotal > 0 && (
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </TabsTrigger>
          </GymTabsList>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setStaffPage(1);
                }}
                aria-label="Buscar colaboradores"
                className="pl-8 text-xs bg-background h-8"
              />
            </div>

            <Select
              value={selectedRoleFilter}
              onValueChange={(value) => {
                setSelectedRoleFilter(value === "all" ? "all" : gymStaffRoleSchema.parse(value));
                setStaffPage(1);
              }}
            >
              <SelectTrigger className="w-40 text-xs bg-background h-8">
                <SelectValue placeholder="Todos os Cargos" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  <SelectItem value="TRAINER">Instrutor / Coach</SelectItem>
                  <SelectItem value="MANAGER">Gerente Geral</SelectItem>
                  <SelectItem value="RECEPTIONIST">Recepção</SelectItem>
                  <SelectItem value="FINANCE">Financeiro</SelectItem>
                  <SelectItem value="ASSISTANT">Assistente</SelectItem>
                  <SelectItem value="OWNER">Diretor / Proprietário</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {units.length > 1 && (
              <Select
                value={selectedUnitFilter}
                onValueChange={(val) => {
                  setSelectedUnitFilter(val);
                  setStaffPage(1);
                }}
              >
                <SelectTrigger className="w-36 text-xs bg-background h-8">
                  <SelectValue placeholder="Unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">Todas as Unidades</SelectItem>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* ABA 1: Equipe Ativa */}
        <TabsContent value="equipe" className="mt-0">
          <Card className="min-w-0 border-border/50 overflow-hidden py-0">
            <CardContent className="p-0">
              {isRefreshing && staffList.length === 0 ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-2">
                      <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="size-9 rounded-full" />
                        <div className="space-y-1.5 flex-1 max-w-xs">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : filteredStaff.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">Colaborador</TableHead>
                        <TableHead className="text-xs">Papel & Cargo</TableHead>
                        <TableHead className="text-xs">Registro CREF</TableHead>
                        <TableHead className="text-xs">Alunos Vinculados</TableHead>
                        <TableHead className="text-xs">Unidade</TableHead>
                        <TableHead className="text-xs text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((member) => {
                        const badgeInfo = roleBadgeMap[member.role] || {
                          label: member.role,
                          className: "bg-muted text-foreground border-border/50",
                        };

                        const isSelf = member.userId === currentUserId;
                        const isOwner = member.isOwner;

                        return (
                          <TableRow
                            key={member.id}
                            className="hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="size-9 border border-border/50">
                                  <AvatarImage src={member.user?.image || undefined} />
                                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                                    {member.user?.name?.substring(0, 2).toUpperCase() || "ST"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-xs sm:text-sm truncate text-foreground flex items-center gap-1.5">
                                    {member.user?.name || "Sem Nome"}
                                    {isSelf && (
                                      <Badge variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                                        Você
                                      </Badge>
                                    )}
                                  </span>
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {member.user?.email}
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge
                                  variant="outline"
                                  className={`text-xs font-normal border ${badgeInfo.className}`}
                                >
                                  {badgeInfo.label}
                                </Badge>
                                {member.staffProfile?.jobTitle && (
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {member.staffProfile.jobTitle}
                                  </span>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4 font-mono text-xs">
                              {member.staffProfile?.cref ? (
                                <Badge variant="secondary" className="font-mono text-xs font-normal">
                                  {formatCref(member.staffProfile.cref)}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                                <Users className="size-3.5 text-muted-foreground" />
                                <span>{member._count?.assignedStudents || 0} aluno(s)</span>
                              </div>
                            </TableCell>

                            <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                              {member.unit?.name || "Global / Matriz"}
                            </TableCell>

                            <TableCell className="py-3 px-4 text-right">
                              {canManageStaff && member.canManage && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 hover:bg-muted/60"
                                      aria-label={`Ações para ${member.user?.name || "colaborador"}`}
                                    >
                                      <MoreHorizontal className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => openEditModal(member)}
                                      className="gap-2 cursor-pointer text-xs"
                                    >
                                      <Edit className="size-3.5 text-primary" />
                                      <span>Editar Perfil & Cargo</span>
                                    </DropdownMenuItem>

                                    {!isOwner && !isSelf && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => openOffboardModal(member)}
                                          className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive focus:bg-destructive/10"
                                        >
                                          <UserMinus className="size-3.5" />
                                          <span>Desligar Colaborador</span>
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12">
                  <GymEmptyState
                    icon={Users}
                    title={<>Nenhum colaborador encontrado com os filtros aplicados</>}
                    className=""
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Paginação */}
          {staffTotal > 50 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
              <span>
                Mostrando {(staffPage - 1) * 50 + 1} a {Math.min(staffPage * 50, staffTotal)} de {staffTotal} membros
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRefreshing || staffPage <= 1}
                  onClick={() => setStaffPage((val) => val - 1)}
                  className="h-8 text-xs"
                >
                  Anterior
                </Button>
                <span className="font-medium text-foreground">
                  Página {staffPage} de {Math.max(1, Math.ceil(staffTotal / 50))}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRefreshing || staffPage * 50 >= staffTotal}
                  onClick={() => setStaffPage((val) => val + 1)}
                  className="h-8 text-xs"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ABA 2: Convites Pendentes */}
        <TabsContent value="convites" className="mt-0">
          <Card className="min-w-0 border-border/50 overflow-hidden py-0">
            <CardContent className="p-0">
              {isRefreshing && invitationsList.length === 0 ? (
                <div className="p-4 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between gap-4 py-2">
                      <div className="flex items-center gap-3 flex-1">
                        <Skeleton className="size-8 rounded-full" />
                        <div className="space-y-1.5 flex-1 max-w-xs">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-28" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </div>
                  ))}
                </div>
              ) : invitationsList.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">E-mail Convidado</TableHead>
                        <TableHead className="text-xs">Papel Proposto</TableHead>
                        <TableHead className="text-xs">Unidade</TableHead>
                        <TableHead className="text-xs">Enviado em</TableHead>
                        <TableHead className="text-xs">Status & Validade</TableHead>
                        <TableHead className="text-xs text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitationsList.map((inv) => (
                        <TableRow key={inv.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="py-3 px-4 font-medium text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              <Mail className="size-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground">{inv.email}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className={`text-xs font-normal border ${
                                roleBadgeMap[inv.role]?.className || "bg-muted text-foreground"
                              }`}
                            >
                              {roleBadgeMap[inv.role]?.label || inv.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                            {inv.unit?.name || "Todas as unidades"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                            {new Date(inv.createdAt).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                              <Clock className="size-3.5 shrink-0" />
                              <span>Expira em {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            {canManageStaff && inv.canManage && (
                              <Button
                                onClick={() => {
                                  setInviteToRevoke(inv);
                                  setIsRevokeOpen(true);
                                }}
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              >
                                <Trash2 className="size-3.5 mr-1.5" />
                                Cancelar Convite
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-12">
                  <GymEmptyState
                    icon={Mail}
                    title={<>Nenhum convite pendente no momento</>}
                    className=""
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {invitationTotal > 50 && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
              <span>Total de {invitationTotal} convites registrados</span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRefreshing || invitationPage <= 1}
                  onClick={() => setInvitationPage((val) => val - 1)}
                  className="h-8 text-xs"
                >
                  Anterior
                </Button>
                <span className="font-medium text-foreground">
                  Página {invitationPage} de {Math.max(1, Math.ceil(invitationTotal / 50))}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isRefreshing || invitationPage * 50 >= invitationTotal}
                  onClick={() => setInvitationPage((val) => val + 1)}
                  className="h-8 text-xs"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ================= MODAIS ================= */}

      {/* 1. Modal de Convidar Profissional (Muito bem planejado + Resend + Máscara CREF) */}
      <Dialog
        open={isInviteOpen}
        onOpenChange={(open) => {
          if (!open && isInviting) return;
          setIsInviteOpen(open);
        }}
      >
        <DialogContent className="max-w-lg sm:overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <UserPlus className="size-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Convidar Profissional para a Equipe
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Envie um convite de acesso para um colaborador ou instrutor. O e-mail de ativação será disparado automaticamente com o link seguro.
            </DialogDescription>
          </DialogHeader>

          {generatedInviteLink ? (
            <div className="py-3 space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-foreground space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-500 text-sm">
                  <CheckCircle2 className="size-5 shrink-0" />
                  <span>Convite Criado com Sucesso!</span>
                </div>
                {inviteSuccessInfo?.emailSent ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Um e-mail de convite foi disparado via <strong>Resend</strong> para{" "}
                    <strong className="text-foreground">{inviteSuccessInfo.email}</strong> contendo o link exclusivo de ativação.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    O convite foi gerado no sistema. Copie o link exclusivo abaixo para enviar ao profissional.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium text-foreground">
                  Link Direto de Acesso (Uso Único · Válido por 72h)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={generatedInviteLink}
                    className="text-xs font-mono bg-muted/50 border-border/60 select-all"
                  />
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(generatedInviteLink)}
                    className="gap-1.5 shrink-0 cursor-pointer"
                  >
                    {hasCopiedLink ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {hasCopiedLink ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Você também pode compartilhar este link diretamente por WhatsApp se preferir.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsInviteOpen(false);
                    setGeneratedInviteLink(null);
                    setInviteSuccessInfo(null);
                  }}
                  className="w-full cursor-pointer"
                >
                  Concluir
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <form onSubmit={handleSendInvite} className="space-y-4 py-2">
              {/* Seção 1: Dados de Acesso */}
              <div className="space-y-1.5">
                <Label htmlFor="inviteEmail" className="text-xs font-medium">
                  E-mail do Profissional <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="inviteEmail"
                    type="email"
                    required
                    placeholder="ex: instrutor@academia.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="pl-9 text-xs"
                    disabled={isInviting}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  As instruções e o link seguro para ativar a conta serão enviados a este endereço.
                </p>
              </div>

              {/* Seção 2: Papel e Unidade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteRole" className="text-xs font-medium">
                    Papel / Função <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={inviteForm.role}
                    onValueChange={(val) =>
                      setInviteForm({ ...inviteForm, role: gymStaffRoleSchema.parse(val) })
                    }
                    disabled={isInviting}
                  >
                    <SelectTrigger className="w-full min-w-0 text-xs" id="inviteRole">
                      <SelectValue placeholder="Selecione a função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="TRAINER">Instrutor / Coach</SelectItem>
                        <SelectItem value="RECEPTIONIST">Recepção</SelectItem>
                        <SelectItem value="MANAGER">Gerente Geral</SelectItem>
                        <SelectItem value="FINANCE">Financeiro</SelectItem>
                        <SelectItem value="ASSISTANT">Assistente</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inviteUnit" className="text-xs font-medium">
                    Lotação / Unidade
                  </Label>
                  <Select
                    value={inviteForm.unitId}
                    onValueChange={(unitId) => setInviteForm({ ...inviteForm, unitId })}
                    disabled={isInviting}
                  >
                    <SelectTrigger className="w-full min-w-0 text-xs" id="inviteUnit">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {canManageGlobal && <SelectItem value="global">Todas as unidades</SelectItem>}
                        {units.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Seção 3: Dados Profissionais e Máscara CREF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="inviteCref" className="text-xs font-medium flex items-center justify-between">
                    <span>Registro CREF</span>
                    <span className="text-[10px] text-muted-foreground">Ex: 000000-G/UF</span>
                  </Label>
                  <Input
                    id="inviteCref"
                    placeholder="000000-G/SP"
                    value={inviteForm.cref}
                    onChange={(e) =>
                      setInviteForm({ ...inviteForm, cref: formatCref(e.target.value) })
                    }
                    className="text-xs font-mono"
                    disabled={isInviting}
                    maxLength={11}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inviteJobTitle" className="text-xs font-medium">
                    Cargo / Especialidade (Opcional)
                  </Label>
                  <Input
                    id="inviteJobTitle"
                    placeholder="Ex: Treinador Sênior / Musculação"
                    value={inviteForm.jobTitle}
                    onChange={(e) => setInviteForm({ ...inviteForm, jobTitle: e.target.value })}
                    className="text-xs"
                    disabled={isInviting}
                    maxLength={80}
                  />
                </div>
              </div>

              {/* Banner Informativo de Envio por E-mail */}
              <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-foreground flex items-start gap-2.5">
                <Send className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-medium text-foreground">Disparo Automático de Convite</p>
                  <p className="text-muted-foreground leading-relaxed">
                    O profissional receberá as instruções por e-mail para validar a identidade e definir a senha de acesso na academia.
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsInviteOpen(false)}
                  disabled={isInviting}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isInviting || !inviteForm.email.trim()}
                  className="cursor-pointer gap-2"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Enviando Convite...</span>
                    </>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Enviar Convite</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. Modal de Edição de Perfil do Colaborador (com Máscaras de CREF e Telefone) */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          if (!open && isSavingEdit) return;
          setIsEditOpen(open);
        }}
      >
        <DialogContent className="max-w-lg sm:overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Edit className="size-4" />
              </div>
              <DialogTitle className="text-base sm:text-lg font-bold">
                Editar Colaborador
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Atualize as informações de cargo, credenciais técnicas e contatos de emergência de{" "}
              <strong className="text-foreground">{editingStaffMember?.user?.name || "colaborador"}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            {/* Seção 1: Papel e Cargo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editRole" className="text-xs font-medium">
                  Papel no Workspace
                </Label>
                <Select
                  value={editForm.role}
                  onValueChange={(val) =>
                    setEditForm({ ...editForm, role: gymStaffRoleSchema.parse(val) })
                  }
                  disabled={editingStaffMember?.isOwner || isSavingEdit}
                >
                  <SelectTrigger className="w-full min-w-0 text-xs" id="editRole">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {editingStaffMember?.role === "OWNER" && (
                        <SelectItem value="OWNER">Diretor / Proprietário</SelectItem>
                      )}
                      <SelectItem value="TRAINER">Instrutor / Coach</SelectItem>
                      <SelectItem value="MANAGER">Gerente Geral</SelectItem>
                      <SelectItem value="RECEPTIONIST">Recepção</SelectItem>
                      <SelectItem value="FINANCE">Financeiro</SelectItem>
                      <SelectItem value="ASSISTANT">Assistente</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editJobTitle" className="text-xs font-medium">
                  Cargo Exibido (Job Title)
                </Label>
                <Input
                  id="editJobTitle"
                  placeholder="Ex: Treinador Especialista"
                  value={editForm.jobTitle}
                  onChange={(e) => setEditForm({ ...editForm, jobTitle: e.target.value })}
                  className="text-xs"
                  disabled={isSavingEdit}
                  maxLength={80}
                />
              </div>
            </div>

            {/* Seção 2: CREF e Bio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="editCref" className="text-xs font-medium flex items-center justify-between">
                  <span>Registro CREF</span>
                  <span className="text-[10px] text-muted-foreground">Ex: 000000-G/UF</span>
                </Label>
                <Input
                  id="editCref"
                  placeholder="000000-G/SP"
                  value={editForm.cref}
                  onChange={(e) =>
                    setEditForm({ ...editForm, cref: formatCref(e.target.value) })
                  }
                  className="text-xs font-mono"
                  disabled={isSavingEdit}
                  maxLength={11}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editBio" className="text-xs font-medium">
                  Especialidades / Bio Curta
                </Label>
                <Input
                  id="editBio"
                  placeholder="Ex: Hipertrofia, Funcional e Biomecânica"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="text-xs"
                  disabled={isSavingEdit}
                  maxLength={150}
                />
              </div>
            </div>

            {/* Seção 3: Contato de Emergência com Máscara de Telefone */}
            <div className="border-t border-border/50 pt-3 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Phone className="size-3.5 text-primary" />
                <span>Contato de Emergência</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="editContactName" className="text-xs font-medium">
                    Nome do Contato
                  </Label>
                  <Input
                    id="editContactName"
                    placeholder="Nome completo do responsável"
                    value={editForm.emergencyContactName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, emergencyContactName: e.target.value })
                    }
                    className="text-xs"
                    disabled={isSavingEdit}
                    maxLength={80}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="editContactPhone" className="text-xs font-medium">
                    Telefone de Emergência
                  </Label>
                  <Input
                    id="editContactPhone"
                    placeholder="(11) 99999-9999"
                    value={editForm.emergencyContactPhone}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        emergencyContactPhone: formatPhone(e.target.value),
                      })
                    }
                    className="text-xs font-mono"
                    disabled={isSavingEdit}
                    maxLength={15}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(false)}
                disabled={isSavingEdit}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSavingEdit}
                className="cursor-pointer gap-2"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Salvando Alterações...</span>
                  </>
                ) : (
                  <span>Salvar Alterações</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. AlertDialog de Desligamento de Colaborador */}
      <AlertDialog
        open={isOffboardOpen}
        onOpenChange={(open) => {
          if (!open && isOffboarding) return;
          setIsOffboardOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertCircle className="size-5 shrink-0" />
              <AlertDialogTitle className="text-base sm:text-lg">
                Desligar Colaborador da Equipe?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Você está prestes a revogar o acesso de{" "}
              <strong className="text-foreground">{offboardTarget?.user?.name || offboardTarget?.user?.email}</strong>{" "}
              a este workspace. Todos os treinos, periodizações e avaliações físicas criados por este colaborador serão rigorosamente preservados na academia.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            {offboardTarget && offboardTarget._count.assignedStudents > 0 && (
              <div className="p-3 rounded-lg border border-border/60 bg-muted/40 space-y-2">
                <p className="text-xs font-medium text-foreground">
                  Este profissional possui {offboardTarget._count.assignedStudents} aluno(s) vinculados na carteira:
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="replacementSelect" className="text-xs">
                    Transferir alunos para outro instrutor:
                  </Label>
                  <Select value={replacementStaffId} onValueChange={setReplacementStaffId}>
                    <SelectTrigger id="replacementSelect" className="text-xs">
                      <SelectValue placeholder="Selecione um substituto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="none">
                          Não transferir (deixar alunos sem instrutor atribuído)
                        </SelectItem>
                        {staffList
                          .filter(
                            (m) =>
                              m.id !== offboardTarget?.id &&
                              ["OWNER", "MANAGER", "TRAINER"].includes(m.role)
                          )
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.user?.name || t.user?.email}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="offboardReason" className="text-xs font-medium">
                Motivo do Desligamento (Para Registro de Auditoria) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="offboardReason"
                placeholder="Ex: Fim do contrato, transição de carreira..."
                value={offboardReason}
                onChange={(e) => setOffboardReason(e.target.value)}
                className="text-xs"
                disabled={isOffboarding}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isOffboarding}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmOffboard();
              }}
              disabled={isOffboarding || !offboardReason.trim()}
              variant="destructive"
              className="gap-2"
            >
              {isOffboarding ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Desligando...</span>
                </>
              ) : (
                "Sim, Desligar Colaborador"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 4. AlertDialog de Cancelar Convite */}
      <AlertDialog
        open={isRevokeOpen}
        onOpenChange={(open) => {
          if (!open && isRevoking) return;
          setIsRevokeOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertCircle className="size-5 shrink-0" />
              <AlertDialogTitle className="text-base sm:text-lg">
                Cancelar Convite de Acesso?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              O link de convite enviado para{" "}
              <strong className="text-foreground">{inviteToRevoke?.email}</strong> será invalidado imediatamente e não poderá mais ser utilizado para ingressar na equipe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>
              Voltar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleConfirmRevoke();
              }}
              disabled={isRevoking}
              variant="destructive"
              className="gap-2"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Cancelando...</span>
                </>
              ) : (
                "Sim, Cancelar Convite"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
