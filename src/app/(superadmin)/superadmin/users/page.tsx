"use client"

import { useEffect, useState, Suspense } from "react";
import { useSnapshot } from "valtio";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Ban,
  Key,
  LogIn,
  History as HistoryIcon,
  UserCheck,
  UserX,
  Activity,
  UserPlus,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Trash2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { cn } from "@/lib/utils";

function UserStatCard({ title, value, icon: Icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={cn("p-2.5 rounded-xl", color)}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <h3 className="text-xl font-black tracking-tight mt-0.5">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersContent() {
  const snap = useSnapshot(superAdminStore);
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [activeTab, setActiveTab] = useState("personal");
  const [onboardingFilter, setOnboardingFilter] = useState("all");
  const [workspaceFilter, setWorkspaceFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "TRAINER"
  });

  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await superAdminActions.deleteUser(userToDelete.id);
      toast.success("Usuário deletado com sucesso!");
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar usuário.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    superAdminActions.fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await superAdminActions.createUser(formData);
      toast.success("Usuário criado com sucesso!");
      setIsCreateModalOpen(false);
      setFormData({ name: "", email: "", password: "", role: "TRAINER" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if ((snap.users || []).length === 0 && snap.isLoading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Carregando usuários globais...</p>
      </div>
    );
  }

  const allUsers = snap.users || [];

  const personalUsers = allUsers.filter((u: any) => u.role === "TRAINER");
  const studentUsers = allUsers.filter((u: any) => u.role === "STUDENT" || u.role === "USER");
  const superadminUsers = allUsers.filter((u: any) => u.role === "SUPERADMIN");

  const activeTabUsers =
    activeTab === "personal"
      ? personalUsers
      : activeTab === "aluno"
      ? studentUsers
      : superadminUsers;

  const filteredUsers = activeTabUsers.filter((u: any) => {
    // 1. Search
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Onboarding
    let matchesOnboarding = true;
    if (onboardingFilter === "completed") {
      matchesOnboarding = u.onboarded === true;
    } else if (onboardingFilter === "pending") {
      matchesOnboarding = u.onboarded === false;
    }

    // 3. Workspace
    let matchesWorkspace = true;
    if (workspaceFilter === "with") {
      matchesWorkspace = u.workspaces && u.workspaces.length > 0;
    } else if (workspaceFilter === "without") {
      matchesWorkspace = !u.workspaces || u.workspaces.length === 0;
    }

    // 4. Date
    let matchesDate = true;
    if (dateFilter !== "all" && u.createdAt) {
      const createdDate = new Date(u.createdAt);
      const now = new Date();
      if (dateFilter === "7days") {
        const limit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = createdDate >= limit;
      } else if (dateFilter === "30days") {
        const limit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = createdDate >= limit;
      } else if (dateFilter === "thisyear") {
        matchesDate = createdDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesOnboarding && matchesWorkspace && matchesDate;
  });

  const recentUsersCount = allUsers.filter((u: any) => {
    if (!u.createdAt) return false;
    const createdDate = new Date(u.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate >= sevenDaysAgo;
  }).length;

  const totalCount = allUsers.length;

  // Dados de Crescimento de Usuários Orgânicos baseado no total real
  const userGrowthData = (() => {
    const now = new Date();
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Construct last 6 months boundaries
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: monthNames[d.getMonth()],
        year: d.getFullYear(),
        month: d.getMonth(),
      });
    }

    return months.map(m => {
      const endOfMonth = new Date(m.year, m.month + 1, 0, 23, 59, 59, 999);
      const total = allUsers.filter((u: any) => {
        if (!u.createdAt) return false;
        return new Date(u.createdAt) <= endOfMonth;
      }).length;
      return {
        month: m.name,
        total
      };
    });
  })();

  const growthRate = (() => {
    const dataLen = userGrowthData.length;
    if (dataLen < 2) return 0;
    const currentTotal = userGrowthData[dataLen - 1].total;
    const prevTotal = userGrowthData[dataLen - 2].total;
    if (prevTotal === 0) return currentTotal > 0 ? 100 : 0;
    return ((currentTotal - prevTotal) / prevTotal) * 100;
  })();

  const avgMonthlySignups = (() => {
    const dataLen = userGrowthData.length;
    if (dataLen === 0) return 0;
    let newUsersSum = 0;
    for (let i = 0; i < dataLen; i++) {
      const current = userGrowthData[i].total;
      const prev = i > 0 ? userGrowthData[i - 1].total : 0;
      newUsersSum += (current - prev);
    }
    return Math.round(newUsersSum / dataLen);
  })();

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* 1. Cabeçalho alinhado com o padrão Aluno/Personal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Users className="size-4" />
            Global Community
          </div>
          <h1 className="text-3xl font-black tracking-tight">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm font-medium">Controle global de acessos, funções e auditoria de usuários.</p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <UserPlus className="size-4" /> NOVO USUÁRIO
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black tracking-tight">Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome Completo</Label>
                <Input
                  id="name"
                  required
                  placeholder="Ex: João Silva"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="rounded-xl h-11 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="Ex: joao@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="rounded-xl h-11 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Senha Temporária</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="rounded-xl h-11 border-border/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cargo Global (Role)</Label>
                <Select
                  value={formData.role}
                  onValueChange={(val) => setFormData({ ...formData, role: val })}
                >
                  <SelectTrigger className="w-full rounded-xl h-11 border-border/60 font-bold">
                    <SelectValue placeholder="Selecione um cargo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="TRAINER" className="font-bold text-xs">Personal Trainer (TRAINER)</SelectItem>
                    <SelectItem value="SUPERADMIN" className="font-bold text-xs">Administrador (SUPERADMIN)</SelectItem>
                  </SelectContent>
                </Select>
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
                  disabled={isSubmitting}
                  className="rounded-xl h-11 px-8 font-black gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
                >
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Criar Usuário
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 2. Bento Estatísticas de Usuários */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <UserStatCard title="Total Usuários" value={(snap.users || []).length.toLocaleString()} icon={UserCheck} color="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" />
        <UserStatCard title="SuperAdmins" value={(snap.users || []).filter((u: any) => u.role === "SUPERADMIN").length.toString()} icon={ShieldAlert} color="bg-rose-500/10 text-rose-600 border border-rose-500/20" />
        <UserStatCard title="Atividade Recente" value={`+${recentUsersCount} novos (7d)`} icon={Activity} color="bg-primary/10 text-primary border border-primary/20" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="grid w-full sm:w-[450px] grid-cols-3 bg-secondary/20 p-1 rounded-xl">
          <TabsTrigger value="personal" className="rounded-lg font-bold text-xs">
            Personais
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary/40 text-[9px] font-black border border-border/20 text-foreground">
              {personalUsers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="aluno" className="rounded-lg font-bold text-xs">
            Alunos
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary/40 text-[9px] font-black border border-border/20 text-foreground">
              {studentUsers.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="superadmin" className="rounded-lg font-bold text-xs">
            SuperAdmins
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-secondary/40 text-[9px] font-black border border-border/20 text-foreground">
              {superadminUsers.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          <Card className="lg:col-span-8 p-0 border-border/40 shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="border-b border-border/40 bg-secondary/10 px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full">
                <div className="relative w-full sm:col-span-2 lg:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    className="pl-9 h-10 rounded-xl border-border/60 bg-background text-xs font-semibold w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Onboarding Filter */}
                <Select value={onboardingFilter} onValueChange={setOnboardingFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 text-xs font-bold bg-background">
                    <SelectValue placeholder="Onboarding" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="all" className="font-bold text-xs">Todos Status</SelectItem>
                    <SelectItem value="completed" className="font-bold text-xs">Onboarded</SelectItem>
                    <SelectItem value="pending" className="font-bold text-xs">Pendente</SelectItem>
                  </SelectContent>
                </Select>

                {/* Workspace Filter */}
                <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 text-xs font-bold bg-background">
                    <SelectValue placeholder="Workspaces" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="all" className="font-bold text-xs">Todas Contas</SelectItem>
                    <SelectItem value="with" className="font-bold text-xs">Com Workspace</SelectItem>
                    <SelectItem value="without" className="font-bold text-xs">Sem Workspace</SelectItem>
                  </SelectContent>
                </Select>

                {/* Date Filter */}
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 text-xs font-bold bg-background">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/40">
                    <SelectItem value="all" className="font-bold text-xs">Qualquer data</SelectItem>
                    <SelectItem value="7days" className="font-bold text-xs">Últimos 7 dias</SelectItem>
                    <SelectItem value="30days" className="font-bold text-xs">Últimos 30 dias</SelectItem>
                    <SelectItem value="thisyear" className="font-bold text-xs">Este ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto max-h-100!">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/5 border-b border-border/40">
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Usuário</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Global Role</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Workspaces</th>
                      <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-muted-foreground">
                          <Search className="size-6 mx-auto mb-2 opacity-50" />
                          <p className="text-xs font-bold uppercase tracking-widest">Nenhum usuário encontrado</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user: any) => (
                        <tr key={user.id} className="group hover:bg-secondary/20 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase border border-primary/20 shrink-0">
                                {user.name?.charAt(0) || user.email?.charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold leading-none truncate">{user.name || "Sem Nome"}</span>
                                <span className="text-[10px] text-muted-foreground mt-1 truncate">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border",
                              user.role === "SUPERADMIN" ? "bg-rose-500/10 border-rose-500/20 text-rose-600" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                            )}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                            {user.workspaces?.length || 0} ativo(s)
                          </td>
                          <td className="px-6 py-4 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-secondary">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50">
                                <Link href={`/superadmin/users/${user.id}`} passHref className="w-full">
                                  <DropdownMenuItem className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs">
                                    <LogIn className="size-3.5 text-primary" />
                                    <span>Perfil & Acesso</span>
                                  </DropdownMenuItem>
                                </Link>
                                <DropdownMenuItem className="h-9 rounded-lg gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-500/10 font-semibold text-xs">
                                  <Ban className="size-3.5" />
                                  <span>Bloquear Acesso</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="h-9 rounded-lg gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 font-semibold text-xs"
                                >
                                  <Trash2 className="size-3.5" />
                                  <span>Deletar Usuário</span>
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

          {/* Gráfico Lateral de Adesão de Contas */}
          <Card className="lg:col-span-4 border-border/40 bg-card/50 shadow-sm overflow-hidden flex flex-col justify-between">
            <CardHeader className="p-5 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <TrendingUp className="size-4 text-primary" /> Histórico de Contas
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Crescimento da base global de usuários</p>
            </CardHeader>
            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
              <div className="h-[200px] w-full min-w-0">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={userGrowthData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-bold text-muted-foreground" />
                      <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold text-muted-foreground" />
                      <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px" }} />
                      <Area type="monotone" dataKey="total" name="Usuários" stroke="var(--primary)" strokeWidth={2.5} fill="url(#fillUsers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="pt-4 border-t border-border/30 space-y-3 mt-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-semibold">Taxa de Crescimento</span>
                  <span className={cn(
                    "font-black flex items-center gap-1",
                    growthRate >= 0 ? "text-emerald-500" : "text-rose-500"
                  )}>
                    {growthRate >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                    {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground font-semibold">Média Mensal</span>
                  <span className="font-black text-primary">
                    {avgMonthlySignups} novos
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={(open) => { if (!open) { setIsDeleteDialogOpen(false); setUserToDelete(null); } }}>
        <AlertDialogContent className="rounded-2xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-red-500 flex items-center gap-2">
              <Trash2 className="size-5" />
              Tem certeza?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs font-semibold text-muted-foreground">
              <span className="block">
                Esta ação não poderá ser desfeita.
              </span>
              <span className="block">
                O usuário <strong className="text-foreground">"{userToDelete?.name || userToDelete?.email}"</strong> será deletado permanentemente. Isso removerá todos os workspaces de que ele é proprietário, além de todos os dados de treinos, alunos, planos e logs vinculados.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Deletando...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Deletar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function UsersManagementPage() {
  return (
    <Suspense fallback={
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Carregando interface...</p>
      </div>
    }>
      <UsersContent />
    </Suspense>
  );
}

function ShieldAlert({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
  );
}
