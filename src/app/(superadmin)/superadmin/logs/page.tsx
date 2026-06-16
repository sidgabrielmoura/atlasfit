"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Database,
  Search,
  Filter,
  ShieldAlert,
  LogIn,
  Trash2,
  CreditCard,
  RefreshCcw,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";

function LogIcon({ action, severity }: { action: string; severity: string }) {
  const lowercaseAction = action.toLowerCase();
  if (severity === "danger" || lowercaseAction.includes("fail") || lowercaseAction.includes("error")) {
    return <ShieldAlert className="size-4 text-rose-500 animate-pulse" />;
  }
  if (lowercaseAction.includes("delete")) return <Trash2 className="size-4 text-rose-400" />;
  if (lowercaseAction.includes("payment") || lowercaseAction.includes("transaction") || lowercaseAction.includes("subscription")) return <CreditCard className="size-4 text-emerald-400" />;
  if (lowercaseAction.includes("plan")) return <RefreshCcw className="size-4 text-blue-400" />;
  if (lowercaseAction.includes("workspace")) return <Building2 className="size-4 text-indigo-400" />;
  if (lowercaseAction.includes("login")) return <LogIn className="size-4 text-violet-400" />;
  return <Database className="size-4 text-muted-foreground" />;
}

function SeverityBadge({ severity }: { severity: string }) {
  switch (severity) {
    case "success":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wider">
          Sucesso
        </span>
      );
    case "warning":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 uppercase tracking-wider">
          Alerta
        </span>
      );
    case "danger":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20 uppercase tracking-wider">
          Erro do Sistema
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-wider">
          Info
        </span>
      );
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

  const handleSeverityFilter = (severity: string) => {
    superAdminActions.setLogFilters({ severity });
  };

  const activeUser = snap.users?.find(u => u.id === snap.logFilters.userId);
  const activeWorkspace = snap.workspaces?.find(w => w.id === snap.logFilters.workspaceId);
  const activeAction = snap.logFilters.action;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Monitoramento de Erros e Logs</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Rastreamento de erros críticos do sistema, webhooks e auditoria geral da plataforma.
          </p>
        </div>
        <Button variant="outline" className="h-11 rounded-xl gap-2 font-bold text-xs border-border/60 px-6 bg-background hover:bg-secondary/20 transition-all">
          <Download className="size-4" /> EXPORTAR ERROS (CSV)
        </Button>
      </div>

      {/* Tabs / Selector for severity filter */}
      <Tabs
        value={snap.logFilters.severity}
        onValueChange={handleSeverityFilter}
        className="w-full"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/10 border border-border/40 p-2 rounded-2xl">
          <TabsList className="bg-transparent border-none p-0 flex gap-1 h-auto">
            <TabsTrigger
              value="danger"
              className={cn(
                "rounded-xl px-4 py-2 font-bold text-xs uppercase transition-all tracking-wider flex items-center",
                "data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/20",
                "hover:text-rose-400"
              )}
            >
              <ShieldAlert className="size-3.5 mr-2" /> Apenas Erros do Sistema
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className={cn(
                "rounded-xl px-4 py-2 font-bold text-xs uppercase transition-all tracking-wider flex items-center",
                "data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-lg",
                "hover:text-foreground/80"
              )}
            >
              <Database className="size-3.5 mr-2" /> Todos os Logs
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-xs border-border/40 bg-background w-full sm:w-auto min-w-[140px] shadow-sm">
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
                <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-xs border-border/40 bg-background w-full sm:w-auto min-w-[140px] shadow-sm">
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
          </div>
        </div>
      </Tabs>

      {/* Filter Bar with search */}
      <Card className="border-border/40 bg-secondary/5 shadow-none rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por ação, erro ou IP..."
              className="pl-9 h-10 rounded-xl border-border/40 bg-background shadow-inner"
              value={snap.logFilters.search}
              onChange={handleSearch}
            />
          </div>
          {snap.logFilters.severity === "all" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 rounded-xl gap-2 font-bold text-xs border-border/40 bg-background shadow-sm">
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
          )}
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-border/40 p-0 shadow-sm overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/10 border-b border-border/40">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[120px]">Severidade</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[60px] text-center">Tipo</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Log de Ação / Mensagem de Erro</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[220px]">Usuário Resgatado</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center w-[130px]">Origem (IP)</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right w-[160px]">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {snap.isLoading && (snap.logs || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-xs font-bold uppercase tracking-widest">Carregando registros...</p>
                  </td>
                </tr>
              ) : (snap.logs || []).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                    <AlertTriangle className="size-8 mx-auto mb-3 text-muted-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider">Nenhum registro de log encontrado</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Nenhum erro de sistema registrado com os filtros selecionados.</p>
                  </td>
                </tr>
              ) : (snap.logs || []).map((log: any) => {
                const isError = log.severity === "danger" || log.action.includes("_FAIL:");
                let displayAction = log.action;
                let errorMessage = "";

                if (log.action.includes("_FAIL:")) {
                  const parts = log.action.split("_FAIL:");
                  displayAction = parts[0] + "_FAIL";
                  errorMessage = parts[1]?.trim() || "";
                }

                return (
                  <tr key={log.id} className="hover:bg-secondary/20 transition-colors group">
                    <td className="px-6 py-5 align-top">
                      <div className="flex items-center">
                        <SeverityBadge severity={log.severity} />
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center border border-border/40 mx-auto",
                        log.severity === "danger" ? "bg-rose-500/10 border-rose-500/20" :
                          log.severity === "warning" ? "bg-amber-500/10 border-amber-500/20" :
                            "bg-secondary/80 text-muted-foreground"
                      )}>
                        <LogIcon action={log.action} severity={log.severity} />
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      <div className="flex flex-col gap-1.5 max-w-[700px]">
                        <span className={cn(
                          "text-xs font-black tracking-tight uppercase px-2 py-0.5 rounded border w-fit leading-none",
                          log.severity === "danger" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-secondary/80 border-border/40 text-foreground"
                        )}>
                          {log.entity ? `${log.entity} / ${displayAction}` : displayAction}
                        </span>
                        {errorMessage && (
                          <span className="text-xs font-mono text-rose-500 break-all bg-rose-500/5 p-2.5 rounded-lg border border-rose-500/10 block mt-1 leading-normal font-medium max-h-[120px] overflow-y-auto">
                            {errorMessage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 align-top">
                      {log.userId ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-secondary border border-border/40 flex items-center justify-center text-[10px] font-black text-foreground">
                            {log.user?.name ? log.user.name.charAt(0).toUpperCase() : "?"}
                          </div>
                          <span className="text-xs font-bold text-foreground truncate max-w-[160px]">{log.user?.name || "Desconhecido"}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary animate-pulse">
                            S
                          </div>
                          <span className="text-xs font-extrabold text-primary">Sistema / Automático</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 text-center align-top">
                      <code className="text-[10px] font-mono bg-secondary/50 px-2 py-1 rounded border border-border/30 text-muted-foreground">
                        {log.ip || "N/A"}
                      </code>
                    </td>
                    <td className="px-6 py-5 text-right align-top">
                      <div className="flex flex-col items-end leading-none">
                        <span className="text-xs font-bold text-foreground">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase mt-1.5">{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-secondary/10 border-t border-border/40 flex items-center justify-center">
          <Button
            variant="ghost"
            className="text-xs font-bold text-muted-foreground hover:text-primary transition-all"
            onClick={() => superAdminActions.fetchLogs()}
          >
            ATUALIZAR REGISTROS
          </Button>
        </div>
      </Card>
    </div>
  );
}
