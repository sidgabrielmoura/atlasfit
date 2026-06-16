"use client"

import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { toast } from "sonner";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  TrendingUp
} from "lucide-react";
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
    ownerId: ""
  });

  useEffect(() => {
    setMounted(true);
    superAdminActions.fetchWorkspaces();
    superAdminActions.fetchUsers();
  }, []);

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
      setFormData({ name: "", slug: "", ownerId: "" });
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
      ownerId: ws.ownerId || ""
    });
    setIsConfigModalOpen(true);
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await superAdminActions.updateWorkspace(editingWorkspace.id, formData);
      toast.success("Workspace atualizado com sucesso!");
      setIsConfigModalOpen(false);
      setEditingWorkspace(null);
      setFormData({ name: "", slug: "", ownerId: "" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar workspace.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = (ws: any) => {
    const actionText = ws.isActive !== false ? "suspender" : "reativar";
    const newStatus = ws.isActive === false ? true : false;
    const promise = superAdminActions.updateWorkspace(ws.id, { isActive: newStatus });

    toast.promise(promise, {
      loading: `${ws.isActive !== false ? 'Suspendendo' : 'Reativando'} workspace...`,
      success: `Workspace ${ws.isActive !== false ? 'suspenso' : 'reativado'} com sucesso!`,
      error: `Erro ao ${actionText} workspace.`
    });
  };

  if ((snap.workspaces || []).length === 0 && snap.isLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Carregando workspaces...</p>
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
    <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* 1. Cabeçalho alinhado com Aluno/Personal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Building2 className="size-4" />
            Global Workspaces
          </div>
          <h1 className="text-3xl font-black tracking-tight">Gestão de Workspaces</h1>
          <p className="text-muted-foreground text-sm font-medium">Controle e monitoramento de assessorias, academias e times.</p>
        </div>
        
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <Plus className="size-4" /> NOVO WORKSPACE
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
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
            setFormData({ name: "", slug: "", ownerId: "" });
          }
        }}>
          <DialogContent className="max-w-md rounded-2xl">
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
          <CardHeader className="border-b border-border/40 bg-secondary/10 px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Buscar workspace..." className="pl-9 h-10 rounded-xl border-border/60 bg-background text-xs font-semibold" />
              </div>
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
                  {(snap.workspaces || []).map((ws: any) => (
                    <tr key={ws.id} className="group hover:bg-secondary/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-10 min-w-10 rounded-xl bg-secondary flex items-center justify-center border border-border/40 font-bold text-xs text-primary uppercase shrink-0">
                            {ws.name.substring(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold leading-none truncate">{ws.name}</span>
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
                      <td className="px-6 py-4">
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
                  ))}
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
