"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Database,
  Search,
  Filter,
  Clock,
  ShieldAlert,
  LogIn,
  Trash2,
  CreditCard,
  RefreshCcw,
  MoreHorizontal,
  Download,
  User,
  Building2,
  Loader2,
  AlertTriangle,
  ChevronDown
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";

function LogIcon({ type }: { type: string }) {
  switch (type) {
    case "login": return <LogIn className="size-4" />;
    case "deletion": return <Trash2 className="size-4" />;
    case "payment": return <CreditCard className="size-4" />;
    case "plan_change": return <RefreshCcw className="size-4" />;
    case "login_fail": return <AlertTriangle className="size-4" />;
    case "workspace_update": return <Building2 className="size-4" />;
    default: return <Database className="size-4" />;
  }
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "success": return <div className="size-2 rounded-full bg-emerald-500" />;
    case "warning": return <div className="size-2 rounded-full bg-amber-500" />;
    case "danger": return <div className="size-2 rounded-full bg-rose-500" />;
    default: return <div className="size-2 rounded-full bg-blue-500" />;
  }
}

export default function LogsManagementPage() {
  const snap = useSnapshot(superAdminStore);

  useEffect(() => {
    superAdminActions.fetchLogs();
    superAdminActions.fetchUsers();
    superAdminActions.fetchWorkspaces();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    superAdminActions.setLogFilters({ search: e.target.value });
  };

  const handleUserFilter = (userId: string) => {
    superAdminActions.setLogFilters({ userId });
  };

  const handleWorkspaceFilter = (workspaceId: string) => {
    superAdminActions.setLogFilters({ workspaceId });
  };

  const handleActionFilter = (action: string) => {
    superAdminActions.setLogFilters({ action });
  };

  const activeUser = snap.users?.find(u => u.id === snap.logFilters.userId);
  const activeWorkspace = snap.workspaces?.find(w => w.id === snap.logFilters.workspaceId);
  const activeAction = snap.logFilters.action;

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Logs & Auditoria</h1>
          <p className="text-muted-foreground text-sm font-medium">Registro histórico de todas as ações críticas e transações da plataforma.</p>
        </div>
        <Button variant="outline" className="h-11 rounded-xl gap-2 font-bold text-xs border-border/60 px-6">
          <Download className="size-4" /> EXPORTAR LOGS (CSV)
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/40 bg-secondary/5 shadow-none">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar por ação, usuário ou IP..." 
              className="pl-9 h-10 rounded-xl border-border/40 bg-background" 
              value={snap.logFilters.search}
              onChange={handleSearch}
            />
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-xs border-border/40 bg-background min-w-[140px]">
                  <User className="size-3.5" /> 
                  <span className="truncate max-w-[100px] uppercase">
                    {activeUser?.name || "TODOS USUÁRIOS"}
                  </span>
                  <ChevronDown className="size-3 opacity-50 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest opacity-50">Filtrar por Usuário</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleUserFilter("all")} className="text-xs font-bold uppercase">Todos Usuários</DropdownMenuItem>
                {snap.users?.map((user: any) => (
                  <DropdownMenuItem key={user.id} onClick={() => handleUserFilter(user.id)} className="text-xs font-bold">
                    {user.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-xs border-border/40 bg-background min-w-[140px]">
                  <Building2 className="size-3.5" /> 
                  <span className="truncate max-w-[100px] uppercase">
                    {activeWorkspace?.name || "TODOS WORKSPACES"}
                  </span>
                  <ChevronDown className="size-3 opacity-50 ml-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest opacity-50">Filtrar por Workspace</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleWorkspaceFilter("all")} className="text-xs font-bold uppercase">Todos Workspaces</DropdownMenuItem>
                {snap.workspaces?.map((ws: any) => (
                  <DropdownMenuItem key={ws.id} onClick={() => handleWorkspaceFilter(ws.id)} className="text-xs font-bold">
                    {ws.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-xs border-border/40 bg-background">
                  <Filter className="size-3.5" /> 
                  <span className="uppercase">{activeAction === "all" ? "EVENTOS" : activeAction}</span>
                  <ChevronDown className="size-3 opacity-50 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-widest opacity-50">Tipo de Evento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleActionFilter("all")} className="text-xs font-bold uppercase">Todos Eventos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleActionFilter("LOGIN")} className="text-xs font-bold uppercase">Login</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleActionFilter("LOGIN_FAIL")} className="text-xs font-bold uppercase text-rose-500">Falha de Login</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleActionFilter("PAYMENT")} className="text-xs font-bold uppercase">Pagamentos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleActionFilter("PLAN_CHANGE")} className="text-xs font-bold uppercase">Alteração de Plano</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleActionFilter("DELETION")} className="text-xs font-bold uppercase text-rose-500">Exclusões</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleActionFilter("WORKSPACE_UPDATE")} className="text-xs font-bold uppercase">Update Workspace</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Logs Stream */}
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <div className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/10 border-b border-border/40">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Severidade</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Evento</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ação</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Usuário</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Origem (IP)</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {snap.isLoading && (snap.logs || []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                      <p className="text-xs font-bold uppercase tracking-widest">Carregando logs...</p>
                    </td>
                  </tr>
                ) : (snap.logs || []).map((log: any) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-center">
                        <SeverityBadge severity={log.severity} />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center border border-border/40",
                        log.severity === "danger" ? "bg-rose-500/10 text-rose-600 border-rose-500/20" :
                          log.severity === "warning" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                            "bg-secondary text-muted-foreground"
                      )}>
                        <LogIcon type={log.action.toLowerCase()} />
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="text-sm font-bold tracking-tight">{log.entity ? `${log.entity}: ${log.action}` : log.action}</p>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">{log.action}</p>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-full bg-secondary border border-border/40 flex items-center justify-center text-[10px] font-black">
                          {log.user?.name ? log.user.name.charAt(0).toUpperCase() : "?"}
                        </div>
                        <span className="text-xs font-bold">{log.user?.name || "Desconhecido"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <code className="text-[10px] font-mono bg-secondary/50 px-2 py-1 rounded border border-border/30 text-muted-foreground">
                        {log.ip || "N/A"}
                      </code>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        <span className="text-[10px] text-muted-foreground font-medium uppercase">{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="p-6 bg-secondary/10 border-t border-border/40 flex items-center justify-center">
          <Button variant="ghost" className="text-xs font-bold text-muted-foreground hover:text-primary">
            CARREGAR LOGS ANTIGOS
          </Button>
        </div>
      </Card>
    </div>
  );
}
