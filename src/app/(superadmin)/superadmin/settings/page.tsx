"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as LucideIcons from "lucide-react";
import { 
  Settings, 
  ShieldAlert, 
  Globe, 
  Database, 
  Mail, 
  Bell, 
  Key, 
  Server,
  Zap,
  Lock,
  ChevronRight,
  Monitor,
  Loader2,
  RefreshCw,
  HardDrive,
  Cloud,
  Network,
  Power,
  Trash2,
  Plus,
  Trash,
  ToggleLeft,
  ToggleRight,
  Link as LinkIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (LucideIcons as any)[name];
  if (!IconComponent) {
    return <Zap className={className} />;
  }
  return <IconComponent className={className} />;
}

function SettingsSection({ title, icon: Icon, description, children, className, action }: { title: string; icon: any; description: string; children: React.ReactNode, className?: string, action?: React.ReactNode }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Icon className="size-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight leading-none">{title}</h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">{description}</p>
          </div>
        </div>
        {action}
      </div>
      <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
        <CardContent className="p-6 md:p-8">
          {children}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuperAdminSettingsPage() {
  const snap = useSnapshot(superAdminStore);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newIntegration, setNewIntegration] = useState({
    name: "",
    url: "",
    icon: "LinkIcon",
    category: "External"
  });

  useEffect(() => {
    superAdminActions.fetchSettings();
    superAdminActions.fetchIntegrations();
  }, []);

  useEffect(() => {
    if (snap.settings) {
      const data: Record<string, string> = {};
      snap.settings.forEach((s: any) => {
        data[s.key] = s.value;
      });
      setFormData(data);
    }
  }, [snap.settings]);

  const getSetting = (key: string, defaultVal: string = "") => {
    return formData[key] || defaultVal;
  };

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      const settingsToUpdate = [
        { key: "platform_name", value: formData.platform_name || "AtlasFit" },
        { key: "primary_domain", value: formData.primary_domain || "atlasfit.app" },
        { key: "support_email", value: formData.support_email || "noreply@atlasfit.app" }
      ];
      await superAdminActions.updateSettings(settingsToUpdate);
      toast.success("Configurações salvas com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao salvar configurações: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearCache = async () => {
    const promise = superAdminActions.clearCache();
    toast.promise(promise, {
      loading: "Limpando cache global...",
      success: "Cache limpo com sucesso!",
      error: "Erro ao limpar cache"
    });
  };

  const handleToggleMaintenance = async () => {
    const isMaintenance = formData.maintenance_mode === "true";
    
    try {
      await superAdminActions.toggleMaintenanceMode();
      toast.success(`Modo de manutenção ${isMaintenance ? "desativado" : "ativado"} com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao alterar modo de manutenção: ${err.message}`);
    }
  };

  const handleToggleBoolean = async (key: string) => {
    const currentValue = formData[key] === "true";
    const newValue = !currentValue;
    
    try {
      await superAdminActions.updateSettings([{ key, value: String(newValue) }]);
      toast.success(`Configuração atualizada!`);
    } catch (err: any) {
      toast.error(`Erro ao atualizar: ${err.message}`);
    }
  };

  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIntegration.name) {
      toast.error("Nome da integração é obrigatório");
      return;
    }
    setIsCreating(true);
    try {
      await superAdminActions.createIntegration(newIntegration);
      toast.success("Integração cadastrada com sucesso!");
      setIsAddModalOpen(false);
      setNewIntegration({ name: "", url: "", icon: "LinkIcon", category: "External" });
    } catch (err: any) {
      toast.error("Erro ao cadastrar integração: " + err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleIntegration = async (id: string, isActive: boolean) => {
    try {
      await superAdminActions.toggleIntegration(id, isActive);
      toast.success(`Integração ${isActive ? "ativada" : "desativada"} com sucesso!`);
    } catch (err: any) {
      toast.error("Erro ao alterar estado da integração: " + err.message);
    }
  };

  const handleDeleteIntegration = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta integração?")) return;
    try {
      await superAdminActions.deleteIntegration(id);
      toast.success("Integração removida com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao remover integração: " + err.message);
    }
  };

  if (snap.isLoading && (snap.settings || []).length === 0) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
         <Loader2 className="size-10 animate-spin text-primary" />
         <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Carregando Configurações...</p>
      </div>
    );
  }

  const isMaintenance = formData.maintenance_mode === "true";

  return (
    <div className="p-6 md:p-8 space-y-12 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground text-sm font-medium">Controle global de infraestrutura, segurança e variáveis de ambiente.</p>
        </div>
        
        {isMaintenance && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse">
            <ShieldAlert className="size-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Modo Manutenção Ativo</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-12">
        {/* 1. General Settings */}
        <SettingsSection title="Geral & Branding" icon={Globe} description="Identidade visual e domínios da plataforma">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Plataforma</label>
                 <Input 
                  value={getSetting("platform_name", "AtlasFit")} 
                  onChange={(e) => handleInputChange("platform_name", e.target.value)}
                  className="h-11 rounded-xl border-border/60 bg-background" 
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Domínio Principal</label>
                 <Input 
                  value={getSetting("primary_domain", "atlasfit.app")} 
                  onChange={(e) => handleInputChange("primary_domain", e.target.value)}
                  className="h-11 rounded-xl border-border/60 bg-background" 
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email de Suporte Sistema</label>
                 <Input 
                  value={getSetting("support_email", "noreply@atlasfit.app")} 
                  onChange={(e) => handleInputChange("support_email", e.target.value)}
                  className="h-11 rounded-xl border-border/60 bg-background" 
                 />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Língua Padrão</label>
                 <div className="h-11 rounded-xl border border-border/60 bg-background flex items-center px-4 text-sm font-medium opacity-60 cursor-not-allowed">
                    Português (Brasil)
                 </div>
              </div>
           </div>
           <div className="mt-8 flex justify-end">
              <Button 
                onClick={handleSaveGeneral}
                disabled={isSaving}
                className="h-11 rounded-xl px-8 font-black uppercase tracking-widest text-xs bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Salvar Alterações
              </Button>
           </div>
        </SettingsSection>

        {/* 2. Security */}
        <SettingsSection title="Segurança & Acesso" icon={ShieldAlert} description="Políticas de autenticação e proteção de dados">
           <div className="space-y-6">
              {[
                { key: "require_2fa", title: "Autenticação em Duas Etapas (2FA)", desc: "Obrigatório para todos os administradores e trainers." },
                { key: "session_expiration", title: "Expiração de Sessão", desc: "Forçar logout após 24h de inatividade." },
                { key: "api_white_label", title: "White-label API Access", desc: "Permitir que parceiros usem a API com seus próprios tokens." },
              ].map((item, idx) => {
                const enabled = formData[item.key] === "true";
                return (
                  <div 
                    key={idx} 
                    onClick={() => handleToggleBoolean(item.key)}
                    className="flex items-center justify-between p-4 rounded-2xl bg-secondary/20 border border-border/40 hover:bg-secondary/40 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                        <div className={cn(
                          "size-10 rounded-xl flex items-center justify-center border border-border/40",
                          enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          <Lock className="size-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold tracking-tight">{item.title}</p>
                          <p className="text-[10px] text-muted-foreground font-medium">{item.desc}</p>
                        </div>
                    </div>
                    <div className={cn(
                      "w-12 h-6 rounded-full p-1 transition-colors duration-300",
                      enabled ? "bg-primary" : "bg-muted"
                    )}>
                        <div className={cn(
                          "size-4 bg-white rounded-full transition-transform duration-300",
                          enabled ? "translate-x-6" : "translate-x-0"
                        )} />
                    </div>
                  </div>
                );
              })}
           </div>
        </SettingsSection>

        {/* 3. Integrations & Latency */}
        <SettingsSection 
          title="Integrações & Performance" 
          icon={Zap} 
          description="Status em tempo real das APIs e serviços externos"
          action={
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 rounded-xl gap-2 font-bold text-xs bg-primary text-primary-foreground shadow-sm">
                  <Plus className="size-4" /> NOVA INTEGRAÇÃO
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-black">Adicionar Integração</DialogTitle>
                  <DialogDescription className="text-xs">
                    Cadastre um novo serviço externo para monitoramento em tempo real.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateIntegration} className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="int-name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Serviço</Label>
                    <Input
                      id="int-name"
                      required
                      placeholder="Ex: Stripe Billing API"
                      value={newIntegration.name}
                      onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="int-url" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">URL de Ping (Health Check)</Label>
                    <Input
                      id="int-url"
                      placeholder="Ex: https://api.stripe.com"
                      value={newIntegration.url}
                      onChange={(e) => setNewIntegration({ ...newIntegration, url: e.target.value })}
                      className="rounded-xl border-border/60"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="int-icon" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ícone Visual</Label>
                      <Select
                        value={newIntegration.icon}
                        onValueChange={(val) => setNewIntegration({ ...newIntegration, icon: val })}
                      >
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="Selecione um ícone" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Database">Database</SelectItem>
                          <SelectItem value="HardDrive">HardDrive</SelectItem>
                          <SelectItem value="Network">Network</SelectItem>
                          <SelectItem value="Cloud">Cloud</SelectItem>
                          <SelectItem value="Mail">Mail</SelectItem>
                          <SelectItem value="Zap">Zap</SelectItem>
                          <SelectItem value="Server">Server</SelectItem>
                          <SelectItem value="Lock">Lock</SelectItem>
                          <SelectItem value="LinkIcon">Link / Webhook</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="int-cat" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Categoria</Label>
                      <Select
                        value={newIntegration.category}
                        onValueChange={(val) => setNewIntegration({ ...newIntegration, category: val })}
                      >
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Database">Database</SelectItem>
                          <SelectItem value="Storage">Storage</SelectItem>
                          <SelectItem value="Payment">Payment</SelectItem>
                          <SelectItem value="Email">Email</SelectItem>
                          <SelectItem value="Realtime">Realtime</SelectItem>
                          <SelectItem value="Cache">Cache</SelectItem>
                          <SelectItem value="External">External API</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter className="pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsAddModalOpen(false)}
                      className="rounded-xl font-bold"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating}
                      className="rounded-xl font-bold gap-2"
                    >
                      {isCreating && <Loader2 className="size-4 animate-spin" />}
                      Cadastrar Integração
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          }
        >
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {(snap.integrations || []).length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                   <LinkIcon className="size-8 mx-auto mb-2 opacity-40 animate-pulse" />
                   <p className="text-xs font-bold uppercase tracking-widest">Nenhuma integração ativa encontrada.</p>
                </div>
              ) : (
                (snap.integrations || []).map((serv: any, idx: number) => {
                  const isDegraded = serv.status === "Degraded" || (serv.latency && parseInt(serv.latency) > 250);
                  const isOffline = serv.status === "Offline" || serv.status === "Disabled" || !serv.isActive;
                  
                  return (
                    <div 
                      key={serv.id || idx} 
                      className={cn(
                        "p-5 rounded-2xl border flex flex-col gap-3 group transition-all relative overflow-hidden",
                        !serv.isActive ? "bg-secondary/5 border-border/20 opacity-60" : "bg-secondary/10 border-border/40 hover:border-primary/20"
                      )}
                    >
                       <div className="flex items-center justify-between">
                          <div className={cn(
                            "p-2 rounded-lg bg-background border border-border/40 text-primary transition-colors",
                            serv.isActive && "group-hover:bg-primary group-hover:text-primary-foreground"
                          )}>
                             <DynamicIcon name={serv.icon} className="size-4" />
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest",
                              !serv.isActive ? "text-muted-foreground" : isOffline ? "text-rose-500" : isDegraded ? "text-amber-500" : "text-emerald-500"
                            )}>
                               {!serv.isActive ? "Inativo" : serv.status}
                            </span>
                          </div>
                       </div>
                       
                       <div className="space-y-1">
                          <p className="text-[11px] font-bold tracking-tight truncate pr-8">{serv.name}</p>
                          {serv.isActive ? (
                            <div className="flex items-center gap-1.5 mt-1">
                               <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      isOffline ? "bg-rose-500 w-[10%]" : isDegraded ? "bg-amber-500 w-[50%]" : "bg-emerald-500 w-full"
                                    )} 
                                  />
                               </div>
                               <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">{serv.latency || "Offline"}</span>
                            </div>
                          ) : (
                            <div className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mt-1">
                              Serviço Desativado
                            </div>
                          )}
                       </div>

                       {/* Hover Actions Bar */}
                       <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleIntegration(serv.id, !serv.isActive)}
                          title={serv.isActive ? "Desativar" : "Ativar"}
                          className="size-7 rounded-lg hover:bg-background border border-border/20 text-muted-foreground"
                         >
                           {serv.isActive ? <ToggleRight className="size-4 text-emerald-500" /> : <ToggleLeft className="size-4" />}
                         </Button>
                         {/* Allow deletion of custom integrations */}
                         {!["postgres", "aws_s3", "vercel", "stripe", "sendgrid", "pusher", "redis", "authjs"].includes(serv.key) && (
                           <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteIntegration(serv.id)}
                            className="size-7 rounded-lg hover:bg-rose-500/10 text-rose-500"
                           >
                             <Trash className="size-3.5" />
                           </Button>
                         )}
                       </div>
                    </div>
                  );
                })
              )}
           </div>
        </SettingsSection>

        {/* 4. Advanced Operations */}
        <SettingsSection title="Operações Avançadas" icon={Server} description="Controles críticos e manutenção do sistema">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex flex-col justify-between gap-6">
                 <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 text-rose-600">
                       <Power className="size-4" />
                       Modo de Manutenção
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                       Ativar o modo de manutenção bloqueará o acesso de todos os usuários (exceto SuperAdmins) à plataforma. Útil para atualizações críticas de banco de dados.
                    </p>
                 </div>
                 <Button 
                  variant="outline" 
                  onClick={handleToggleMaintenance}
                  className={cn(
                    "h-11 rounded-xl font-bold text-xs border-rose-500/20 shadow-sm",
                    isMaintenance ? "bg-rose-600 text-white hover:bg-rose-700" : "text-rose-600 hover:bg-rose-500/10"
                  )}
                 >
                    {isMaintenance ? "DESATIVAR MANUTENÇÃO" : "ATIVAR MANUTENÇÃO"}
                 </Button>
              </div>

              <div className="p-6 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col justify-between gap-6">
                 <div>
                    <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                       <Trash2 className="size-4" />
                       Limpar Cache Global
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                       Invalida todas as tags de cache do sistema, forçando a re-geração de estatísticas, dashboards e listagens. Pode causar lentidão temporária.
                    </p>
                 </div>
                 <Button 
                  variant="outline" 
                  onClick={handleClearCache}
                  className="h-11 rounded-xl font-bold text-xs border-primary/20 text-primary hover:bg-primary/10 shadow-sm"
                 >
                    LIMPAR CACHE AGORA
                 </Button>
              </div>
           </div>
        </SettingsSection>
      </div>
    </div>
  );
}
