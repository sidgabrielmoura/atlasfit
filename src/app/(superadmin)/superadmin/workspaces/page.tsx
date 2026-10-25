"use client"

import { useEffect, useState, useMemo } from "react";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Search,
  Plus,
  MoreHorizontal,
  ExternalLink,
  Settings2,
  PauseCircle,
  BarChart3,
  Users,
  ShieldCheck,
  Activity,
  Loader2,
  Check,
  ChevronsUpDown,
  Ban,
  ArrowUpRight,
  TrendingUp,
  Dumbbell,
  Filter,
  FilterX,
  RotateCcw,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import Link from "next/link";
import { cn } from "@/lib/utils";

function WorkspaceStatCard({ title, value, icon: Icon, description }: { title: string; value: string; icon: any; description: string }) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        <h3 className="text-2xl font-black tracking-tight mt-1">{value}</h3>
        <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function WorkspacesManagementPage() {
  const snap = useSnapshot(superAdminStore);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOwnerSelectOpen, setIsOwnerSelectOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Estados do Modal de Edição (Configuração)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isConfigOwnerSelectOpen, setIsConfigOwnerSelectOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    ownerId: "",
    type: "PERSONAL" as "PERSONAL" | "GYM",
  });

  // Estados de Filtro da Tabela
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    setMounted(true);
    superAdminActions.fetchWorkspaces();
    superAdminActions.fetchUsers();
  }, []);

  const availablePlans = useMemo(() => {
    const plans = new Set<string>();
    (snap.workspaces || []).forEach((ws: any) => {
      const p = ws.subscription?.plan?.name;
      if (p) plans.add(p);
      else plans.add("FREE");
    });
    return Array.from(plans).sort();
  }, [snap.workspaces]);

  const filteredWorkspaces = useMemo(() => {
    return (snap.workspaces || []).filter((ws: any) => {
      // Filtro de busca por texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = ws.name?.toLowerCase().includes(q);
        const slugMatch = ws.slug?.toLowerCase().includes(q);
        const idMatch = ws.id?.toLowerCase().includes(q);
        const ownerNameMatch = ws.ownerName?.toLowerCase().includes(q);
        const ownerEmailMatch = ws.ownerEmail?.toLowerCase().includes(q);
        if (!nameMatch && !slugMatch && !idMatch && !ownerNameMatch && !ownerEmailMatch) {
          return false;
        }
      }

      // Filtro de Tipo de Conta
      if (typeFilter !== "ALL") {
        if (ws.type !== typeFilter) return false;
      }

      // Filtro de Plano
      if (planFilter !== "ALL") {
        const wsPlan = (ws.subscription?.plan?.name || "FREE").toUpperCase();
        if (wsPlan !== planFilter.toUpperCase()) return false;
      }

      // Filtro de Status
      if (statusFilter !== "ALL") {
        if (statusFilter === "ACTIVE" && ws.isActive === false) return false;
        if (statusFilter === "SUSPENDED" && ws.isActive !== false) return false;
      }

      return true;
    });
  }, [snap.workspaces, searchQuery, typeFilter, planFilter, statusFilter]);

  const hasActiveFilters = searchQuery.trim() !== "" || typeFilter !== "ALL" || planFilter !== "ALL" || statusFilter !== "ALL";

  const handleClearFilters = () => {
    setSearchQuery("");
    setTypeFilter("ALL");
    setPlanFilter("ALL");
    setStatusFilter("ALL");
  };

  const recentWorkspacesCount = (snap.workspaces || []).filter((ws: any) => {
    if (!ws.createdAt) return false;
    const createdDate = new Date(ws.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate >= sevenDaysAgo;
  }).length;

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await superAdminActions.createWorkspace(formData);
      toast.success("Workspace criado com sucesso!");
      setIsCreateModalOpen(false);
      setFormData({ name: "", slug: "", ownerId: "", type: "PERSONAL" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openConfigModal = (ws: any) => {
    setEditingWorkspace(ws);
    setFormData({
      name: ws.name,
      slug: ws.slug,
      ownerId: ws.ownerId || "",
      type: ws.type || "PERSONAL",
    });
    setIsConfigModalOpen(true);
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const refreshed = await superAdminActions.updateWorkspace(editingWorkspace.id, formData);
      if (refreshed) toast.success("Workspace atualizado.");
      else toast.warning("Alteração salva. Atualize a listagem para conferir o estado aplicado.");
      setIsConfigModalOpen(false);
      setEditingWorkspace(null);
      setFormData({ name: "", slug: "", ownerId: "", type: "PERSONAL" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (ws: any) => {
    const actionText = ws.isActive !== false ? "suspender" : "reativar";
    const newStatus = ws.isActive === false ? true : false;
    const promise = superAdminActions.updateWorkspace(ws.id, { isActive: newStatus, expectedIsActive: ws.isActive });

    toast.promise(promise, {
      loading: `${ws.isActive !== false ? 'Suspendendo' : 'Reativando'} workspace...`,
      success: (refreshed: boolean) => refreshed ? `Workspace ${newStatus ? "reativado" : "suspenso"}.` : "Alteração salva. A listagem precisa ser atualizada.",
      error: `Erro ao ${actionText} workspace.`
    });
  };

  // Persisted browser data is only rendered after hydration matches the server.
  if (!mounted || ((snap.workspaces || []).length === 0 && snap.workspacesLoading)) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-80 rounded-md" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 border border-border/80 rounded-xl bg-card space-y-2 shadow-xs">
              <Skeleton className="h-4 w-24 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          ))}
        </div>
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card p-4 space-y-4 shadow-xs">
          <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalWorkspaces = (snap.workspaces || []).length;

  const planCounts: Record<string, number> = {};
  (snap.workspaces || []).forEach((ws: any) => {
    const planName = ws.subscription?.plan?.name || "FREE";
    planCounts[planName] = (planCounts[planName] || 0) + 1;
  });

  const planColors: Record<string, string> = {
    FREE: "oklch(0.75 0.16 70)",
    STARTER: "var(--primary)",
    PROFESSIONAL: "oklch(0.65 0.24 300)",
    ENTERPRISE: "oklch(0.55 0.18 140)",
  };

  const getPlanColor = (planName: string) => {
    const nameUpper = planName.toUpperCase();
    return planColors[nameUpper] || "oklch(0.65 0.15 200)";
  };

  const planDistributionData = Object.entries(planCounts).map(([name, value]) => ({
    name,
    value,
    fill: getPlanColor(name),
  }));

  const enterpriseCount = planCounts["Enterprise"] || planCounts["ENTERPRISE"] || 0;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {snap.workspacesError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{snap.workspacesError} Os dados exibidos podem estar desatualizados.</span><Button variant="outline" size="sm" disabled={snap.workspacesLoading} onClick={() => superAdminActions.fetchWorkspaces()}>Atualizar listagem</Button></div>}
      {/* 1. Cabeçalho alinhado com Aluno/Personal */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 border-b border-border/40 pb-6 md:pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Building2 className="size-4" />
            Global Workspaces
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Gestão de Workspaces</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Controle e monitoramento de assessorias, academias e times.</p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 w-full sm:w-auto">
              <Plus className="size-4" /> NOVO WORKSPACE
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl!">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Criar Novo Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateWorkspace} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome da Assessoria / Equipe</Label>
                <Input
                  id="name"
                  required
                  placeholder="Ex: Team Silva"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData({ ...formData, name, slug });
                  }}
                  className="rounded-xl h-11 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Workspace</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: "PERSONAL" | "GYM") => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger id="type" className="rounded-xl h-11 border-border/60 font-semibold text-xs">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="PERSONAL">Personal Trainer / Assessoria</SelectItem>
                    <SelectItem value="GYM">Academia / Fitness Center (GYM)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {formData.type === "GYM"
                    ? "Habilita suporte a unidades filiais, unidades de acesso e licença corporativa."
                    : "Workspace para assessoria e personal trainer individual."}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identificador URL (Slug)</Label>
                <Input
                  id="slug"
                  required
                  placeholder="Ex: team-silva"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="rounded-xl h-11 border-border/60"
                />
                <p className="text-[10px] text-muted-foreground mt-1 px-1 font-medium">
                  O workspace será acessado via: /app/<strong>{formData.slug || 'slug-aqui'}</strong>
                </p>
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="ownerId" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Proprietário do Workspace (Owner)</Label>
                <Popover open={isOwnerSelectOpen} onOpenChange={setIsOwnerSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isOwnerSelectOpen}
                      className="w-full h-11 justify-between rounded-xl border-border/60 font-semibold text-xs text-left"
                    >
                      {formData.ownerId
                        ? (snap.users || []).find((user: any) => user.id === formData.ownerId)?.name || (snap.users || []).find((user: any) => user.id === formData.ownerId)?.email
                        : "Procurar e selecionar um dono..."}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-screen p-0 rounded-xl max-w-sm!">
                    <Command>
                      <CommandInput placeholder="Pesquisar por nome ou e-mail..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                        <CommandGroup>
                          {(snap.users || []).map((user: any) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => {
                                setFormData({ ...formData, ownerId: user.id });
                                setIsOwnerSelectOpen(false);
                              }}
                              className="rounded-lg cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 size-4",
                                  formData.ownerId === user.id ? "opacity-100 text-primary" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-xs">{user.name || "Sem Nome"}</span>
                                <span className="text-[10px] text-muted-foreground">{user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.ownerId}
                  className="rounded-xl h-11 px-8 font-black gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Criar Workspace
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Configurar Workspace */}
        <Dialog open={isConfigModalOpen} onOpenChange={(open) => {
          setIsConfigModalOpen(open);
          if (!open) {
            setEditingWorkspace(null);
            setFormData({ name: "", slug: "", ownerId: "", type: "PERSONAL" });
          }
        }}>
          <DialogContent className="max-w-md rounded-2xl!">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Configurar Workspace</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateWorkspace} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome da Assessoria / Equipe</Label>
                <Input
                  id="edit-name"
                  required
                  placeholder="Ex: Team Silva"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                    setFormData({ ...formData, name, slug });
                  }}
                  className="rounded-xl h-11 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tipo de Workspace</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val: "PERSONAL" | "GYM") => setFormData({ ...formData, type: val })}
                >
                  <SelectTrigger id="edit-type" className="rounded-xl h-11 border-border/60 font-semibold text-xs">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="PERSONAL">Personal Trainer / Assessoria</SelectItem>
                    <SelectItem value="GYM">Academia / Fitness Center (GYM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-slug" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identificador URL (Slug)</Label>
                <Input
                  id="edit-slug"
                  required
                  placeholder="Ex: team-silva"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="rounded-xl h-11 border-border/60"
                />
                <p className="text-[10px] text-muted-foreground mt-1 px-1 font-medium">
                  O workspace será acessado via: /app/<strong>{formData.slug || 'slug-aqui'}</strong>
                </p>
              </div>
              <div className="space-y-2 flex flex-col">
                <Label htmlFor="edit-ownerId" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Proprietário do Workspace (Owner)</Label>
                <Popover open={isConfigOwnerSelectOpen} onOpenChange={setIsConfigOwnerSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={isConfigOwnerSelectOpen}
                      className="w-full h-11 justify-between rounded-xl border-border/60 font-semibold text-xs text-left"
                    >
                      {formData.ownerId
                        ? (snap.users || []).find((user: any) => user.id === formData.ownerId)?.name || (snap.users || []).find((user: any) => user.id === formData.ownerId)?.email
                        : "Procurar e selecionar um dono..."}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-screen p-0 rounded-xl max-w-sm!">
                    <Command>
                      <CommandInput placeholder="Pesquisar por nome ou e-mail..." />
                      <CommandList className="max-h-60">
                        <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                        <CommandGroup>
                          {(snap.users || []).map((user: any) => (
                            <CommandItem
                              key={user.id}
                              value={user.email}
                              onSelect={() => {
                                setFormData({ ...formData, ownerId: user.id });
                                setIsConfigOwnerSelectOpen(false);
                              }}
                              className="rounded-lg cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 size-4",
                                  formData.ownerId === user.id ? "opacity-100 text-primary" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-xs">{user.name || "Sem Nome"}</span>
                                <span className="text-[10px] text-muted-foreground">{user.email}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter className="pt-4 gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="rounded-xl font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.ownerId}
                  className="rounded-xl h-11 px-8 font-black gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 2. Bento Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <WorkspaceStatCard title="Total Workspaces" value={(snap.workspaces || []).length.toLocaleString()} icon={Building2} description="Cadastrados na plataforma" />
        <WorkspaceStatCard title="Atividade Recente" value={`+${recentWorkspacesCount} novos (7d)`} icon={Activity} description="Criados nos últimos 7 dias" />
        <WorkspaceStatCard title="SaaS Enterprise" value={enterpriseCount.toLocaleString()} icon={ShieldCheck} description="Assinaturas corporativas ativas" />
      </div>

      {/* 3. Bento Grid: Gráfico de Planos + Tabela de Workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

        {/* Diretório de Workspaces (Tabela Principal) */}
        <Card className="lg:col-span-8 border-border/40 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="border-b border-border/40 bg-secondary/10 px-6 py-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Busca por texto */}
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, slug, ID ou dono..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 rounded-xl border-border/60 bg-background text-xs font-semibold"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-md transition-colors"
                    title="Limpar busca"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Filtros em linha */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Filtro por Tipo */}
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-10 w-[140px] rounded-xl border-border/60 bg-background text-xs font-semibold">
                    <SelectValue placeholder="Tipo de Conta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos os Tipos</SelectItem>
                    <SelectItem value="PERSONAL">Personal</SelectItem>
                    <SelectItem value="GYM">Academia (GYM)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Filtro por Plano */}
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger className="h-10 w-[140px] rounded-xl border-border/60 bg-background text-xs font-semibold">
                    <SelectValue placeholder="Plano" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos os Planos</SelectItem>
                    {availablePlans.map((plan) => (
                      <SelectItem key={plan} value={plan}>
                        {plan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Filtro por Status */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 w-[130px] rounded-xl border-border/60 bg-background text-xs font-semibold">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL">Todos os Status</SelectItem>
                    <SelectItem value="ACTIVE">Ativos</SelectItem>
                    <SelectItem value="SUSPENDED">Suspensos</SelectItem>
                  </SelectContent>
                </Select>

                {/* Limpar Filtros */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-10 px-3 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/60 gap-1.5 transition-colors"
                    title="Limpar todos os filtros"
                  >
                    <RotateCcw className="size-3.5" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>

            {/* Contador e Badges de filtros ativos */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 flex-wrap gap-2">
              <span className="font-medium">
                Exibindo <strong className="text-foreground font-bold">{filteredWorkspaces.length}</strong> de{" "}
                <strong className="text-foreground font-bold">{(snap.workspaces || []).length}</strong> workspaces
              </span>

              {hasActiveFilters && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {typeFilter !== "ALL" && (
                    <Badge variant="secondary" className="text-[10px] h-5 rounded-md font-semibold gap-1">
                      Tipo: {typeFilter === "PERSONAL" ? "Personal" : "Academia"}
                      <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setTypeFilter("ALL")} />
                    </Badge>
                  )}
                  {planFilter !== "ALL" && (
                    <Badge variant="secondary" className="text-[10px] h-5 rounded-md font-semibold gap-1">
                      Plano: {planFilter}
                      <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setPlanFilter("ALL")} />
                    </Badge>
                  )}
                  {statusFilter !== "ALL" && (
                    <Badge variant="secondary" className="text-[10px] h-5 rounded-md font-semibold gap-1">
                      Status: {statusFilter === "ACTIVE" ? "Ativos" : "Suspensos"}
                      <X className="size-2.5 cursor-pointer hover:text-foreground" onClick={() => setStatusFilter("ALL")} />
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-secondary/5 border-b border-border/40">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspace</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Slug</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Membros</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Plano</th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {filteredWorkspaces.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="size-12 rounded-2xl bg-secondary/50 flex items-center justify-center text-muted-foreground border border-border/50">
                            <Building2 className="size-6 opacity-60" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-foreground">Nenhum workspace encontrado</p>
                            <p className="text-xs text-muted-foreground max-w-sm">
                              {hasActiveFilters
                                ? "Nenhum resultado corresponde aos filtros selecionados. Tente ajustar os termos de pesquisa ou remover os filtros."
                                : "Nenhum workspace cadastrado até o momento."}
                            </p>
                          </div>
                          {hasActiveFilters && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearFilters}
                              className="mt-2 rounded-xl text-xs font-semibold gap-1.5 h-8 border-border/60 hover:bg-secondary/60 cursor-pointer"
                            >
                              <RotateCcw className="size-3.5" />
                              Limpar todos os filtros
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredWorkspaces.map((ws: any) => (
                      <tr key={ws.id} className="group hover:bg-secondary/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="size-10 min-w-10 rounded-xl bg-secondary flex items-center justify-center border border-border/40 font-bold text-xs text-primary uppercase shrink-0">
                              {ws.name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold leading-none truncate">{ws.name}</span>
                                {ws.type === "GYM" ? (
                                  <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-[9px] font-black uppercase tracking-wider gap-1 h-5">
                                    <Building2 className="size-2.5" />
                                    Academia
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-muted-foreground border-border/60 text-[9px] font-bold uppercase tracking-wider gap-1 h-5">
                                    <Dumbbell className="size-2.5" />
                                    Personal
                                  </Badge>
                                )}
                                {ws.isActive === false && (
                                  <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[9px] font-bold uppercase tracking-wider">
                                    Suspenso
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground mt-1 uppercase font-bold tracking-widest truncate">{ws.id.substring(0, 8)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            /{ws.slug}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Users className="size-3.5 text-muted-foreground" />
                            <span className="text-sm font-bold">{ws._count?.members || 0}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 truncate">
                          <div className={cn(
                            "inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider",
                            ws.subscription?.plan?.name === "Enterprise" ? "bg-primary/10 border-primary/20 text-primary" : "bg-secondary/50 border-border/40 text-muted-foreground"
                          )}>
                            <ShieldCheck className={cn("size-3", ws.subscription?.plan?.name === "Enterprise" ? "text-primary" : "text-muted-foreground")} />
                            {ws.subscription?.plan?.name || "FREE"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-secondary">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 rounded-xl border-border/50">
                              <Link href={`/superadmin/workspaces/${ws.id}`} passHref className="w-full">
                                <DropdownMenuItem className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs">
                                  <ExternalLink className="size-3.5 text-primary" />
                                  <span>Acessar Workspace</span>
                                </DropdownMenuItem>
                              </Link>
                              <DropdownMenuItem
                                className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs"
                                onClick={() => openConfigModal(ws)}
                              >
                                <Settings2 className="size-3.5" />
                                <span>Configurar Workspace</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className={cn(
                                  "h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs",
                                  ws.isActive !== false ? "text-destructive focus:text-destructive focus:bg-destructive/10" : "text-emerald-600 focus:text-emerald-600 focus:bg-emerald-500/10"
                                )}
                                onClick={() => handleToggleStatus(ws)}
                              >
                                <Ban className="size-3.5" />
                                <span>
                                  {ws.isActive !== false ? "Suspender Workspace" : "Reativar Workspace"}
                                </span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Lateral de Distribuição de Planos (SaaS) */}
        <Card className="lg:col-span-4 border-border/40 bg-card/50 shadow-sm overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-5 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <BarChart3 className="size-4 text-primary" /> Divisão de Contas
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Planos contratados pelos workspaces</p>
          </CardHeader>
          <CardContent className="pt-4 flex-1 flex flex-col justify-between">
            <div className="h-[200px] w-full min-w-0 flex items-center justify-center">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px" }} />
                    <Pie
                      data={planDistributionData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {planDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="space-y-2 mt-4 pt-4 border-t border-border/30">
              {planDistributionData.map((d, index) => (
                <div key={index} className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: d.fill }} />
                    <span className="text-muted-foreground font-semibold">{d.name}</span>
                  </div>
                  <span className="font-black text-foreground">
                    {d.value} workspaces ({Math.round((d.value / (totalWorkspaces || 1)) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
