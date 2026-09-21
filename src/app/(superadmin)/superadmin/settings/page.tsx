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
  Link as LinkIcon,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ShieldCheck,
  KeyRound,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
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
      <Card className="border-border/40 bg-card/50 p-0 shadow-sm overflow-hidden">
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
  const [integrationToDelete, setIntegrationToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Google Authenticator & 3FA States
  const [totpStatus, setTotpStatus] = useState<{
    enabled: boolean;
    threeFactorEnabled?: boolean;
    hasTotpSecret?: boolean;
    devices?: Array<{
      id: string;
      deviceName: string;
      createdAt: string;
      lastUsedAt?: string | null;
    }>;
    type: string;
    email?: string;
  } | null>(null);
  const [isLoadingTotpStatus, setIsLoadingTotpStatus] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
  const [isDisable3FAModalOpen, setIsDisable3FAModalOpen] = useState(false);
  const [isToggling3FA, setIsToggling3FA] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string; email: string } | null>(null);
  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [deviceToDelete, setDeviceToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingDevice, setIsDeletingDevice] = useState(false);
  const [isVerifyingTotp, setIsVerifyingTotp] = useState(false);
  const [isDisablingTotp, setIsDisablingTotp] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);
  const [hasCopiedBackup, setHasCopiedBackup] = useState(false);

  const fetchTotpStatus = async () => {
    setIsLoadingTotpStatus(true);
    try {
      const res = await fetch("/api/superadmin/security/totp/status");
      if (res.ok) {
        const data = await res.json();
        setTotpStatus(data);
      }
    } catch (e) {
      console.error("Failed to fetch TOTP status", e);
    } finally {
      setIsLoadingTotpStatus(false);
    }
  };

  const handleStartSetup = async (suggestedName?: string) => {
    setIsStartingSetup(true);
    setVerificationOtp("");
    setBackupCodes(null);
    const nextNum = (totpStatus?.devices?.length || 0) + 1;
    setNewDeviceName(suggestedName || (nextNum === 1 ? "Celular Principal" : `Celular ${nextNum}`));
    try {
      const res = await fetch("/api/superadmin/security/totp/setup");
      if (!res.ok) throw new Error("Falha ao gerar QR Code do Authenticator");
      const data = await res.json();
      setSetupData(data);
      setIsSetupModalOpen(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar configuração do Authenticator");
    } finally {
      setIsStartingSetup(false);
    }
  };

  const handleVerifyTotp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (verificationOtp.length !== 6 || !setupData) return;
    setIsVerifyingTotp(true);
    try {
      const res = await fetch("/api/superadmin/security/totp/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceName: newDeviceName,
          secret: setupData.secret,
          token: verificationOtp,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Código de verificação incorreto");
      }
      toast.success(data.message || "Aparelho conectado com sucesso!");
      setBackupCodes(data.backupCodes || []);
      fetchTotpStatus();
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
    } finally {
      setIsVerifyingTotp(false);
    }
  };

  const handleDeleteDevice = async () => {
    if (!deviceToDelete) return;
    setIsDeletingDevice(true);
    try {
      const res = await fetch(`/api/superadmin/security/totp/devices/${deviceToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao remover aparelho");
      }
      toast.success(data.message || "Aparelho removido com sucesso.");
      setDeviceToDelete(null);
      fetchTotpStatus();
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover aparelho");
    } finally {
      setIsDeletingDevice(false);
    }
  };

  const handleDisableTotp = async () => {
    setIsDisablingTotp(true);
    try {
      const res = await fetch("/api/superadmin/security/totp/disable", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Erro ao desativar");
      toast.success("Google Authenticator desativado com sucesso.");
      setIsDisableModalOpen(false);
      fetchTotpStatus();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desativar");
    } finally {
      setIsDisablingTotp(false);
    }
  };

  const handleToggle3FA = async (enable: boolean) => {
    if (!enable) {
      setIsDisable3FAModalOpen(true);
      return;
    }

    if (!totpStatus?.hasTotpSecret) {
      toast.info("Para ativar o 3FA, configure seu Google Authenticator.");
      handleStartSetup();
      return;
    }

    setIsToggling3FA(true);
    try {
      const res = await fetch("/api/superadmin/security/totp/toggle-3fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao ativar 3FA");
      }
      if (data.requiresSetup) {
        handleStartSetup();
        return;
      }
      toast.success("Autenticação em Três Fatores (3FA) ativada com sucesso!");
      fetchTotpStatus();
    } catch (err: any) {
      toast.error(err.message || "Erro ao ativar 3FA");
    } finally {
      setIsToggling3FA(false);
    }
  };

  const handleConfirmDisable3FA = async () => {
    setIsToggling3FA(true);
    try {
      const res = await fetch("/api/superadmin/security/totp/toggle-3fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao desativar 3FA");
      }
      toast.success("Autenticação em Três Fatores (3FA) desativada.");
      setIsDisable3FAModalOpen(false);
      fetchTotpStatus();
    } catch (err: any) {
      toast.error(err.message || "Erro ao desativar 3FA");
    } finally {
      setIsToggling3FA(false);
    }
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setHasCopiedSecret(true);
    toast.success("Chave copiada para a área de transferência!");
    setTimeout(() => setHasCopiedSecret(false), 2500);
  };

  const handleCopyBackupCodes = () => {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setHasCopiedBackup(true);
    toast.success("Códigos de backup copiados!");
    setTimeout(() => setHasCopiedBackup(false), 2500);
  };

  useEffect(() => {
    superAdminActions.fetchSettings();
    superAdminActions.fetchIntegrations();
    fetchTotpStatus();
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

  const handleDeleteIntegration = (id: string) => {
    setIntegrationToDelete(id);
  };

  const confirmDelete = async () => {
    if (!integrationToDelete) return;
    setIsDeleting(true);
    try {
      await superAdminActions.deleteIntegration(integrationToDelete);
      toast.success("Integração removida com sucesso!");
      setIntegrationToDelete(null);
    } catch (err: any) {
      toast.error("Erro ao remover integração: " + err.message);
    } finally {
      setIsDeleting(false);
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-12 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 border-b border-border/40 pb-6 md:pb-8">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Configurações do Sistema</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">Controle global de infraestrutura, segurança e variáveis de ambiente.</p>
        </div>

        {isMaintenance && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 animate-pulse self-start sm:self-auto">
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
            {/* 3FA Highlight Card */}
            <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-card via-card to-secondary/30 border border-border/60 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "size-12 rounded-2xl flex items-center justify-center border shrink-0 transition-colors shadow-sm",
                    totpStatus?.threeFactorEnabled
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                      : "bg-primary/10 text-primary border-primary/20"
                  )}>
                    <Smartphone className="size-6" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold tracking-tight text-foreground">
                        Autenticação em Três Fatores (3FA)
                      </h3>
                      {totpStatus?.threeFactorEnabled ? (
                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-black uppercase tracking-wider gap-1">
                          <CheckCircle2 className="size-3" /> 3FA Ativo & Blindado
                        </Badge>
                      ) : totpStatus?.hasTotpSecret ? (
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30 text-[10px] font-black uppercase tracking-wider">
                          Pronto para Ativar
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-[10px] font-bold uppercase tracking-wider">
                          Não configurado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                      Exige validação sequencial obrigatória no login do SuperAdmin: primeiro confirma o código de 6 dígitos enviado por e-mail e, logo em seguida, o código temporário gerado no aplicativo <strong>Google Authenticator</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {totpStatus?.threeFactorEnabled ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsDisable3FAModalOpen(true)}
                      disabled={isToggling3FA}
                      className="h-10 rounded-xl text-xs font-bold gap-2 cursor-pointer"
                    >
                      {isToggling3FA ? <Loader2 className="size-3.5 animate-spin" /> : <Power className="size-3.5" />}
                      Desativar 3FA
                    </Button>
                  ) : totpStatus?.hasTotpSecret ? (
                    <Button
                      type="button"
                      onClick={() => handleToggle3FA(true)}
                      disabled={isToggling3FA}
                      className="h-10 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-md shadow-primary/20 gap-2 cursor-pointer hover:bg-primary/90 transition-all active:scale-95"
                    >
                      {isToggling3FA ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Ativando...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="size-4" />
                          Ativar 3FA
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handleStartSetup()}
                      disabled={isStartingSetup || isToggling3FA}
                      className="h-10 rounded-xl text-xs font-black uppercase tracking-wider bg-primary text-primary-foreground shadow-md shadow-primary/20 gap-2 cursor-pointer hover:bg-primary/90 transition-all active:scale-95"
                    >
                      {isStartingSetup ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Iniciando...
                        </>
                      ) : (
                        <>
                          <QrCode className="size-4" />
                          Configurar e Ativar 3FA
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Seção Minimalista de Aparelhos Conectados */}
              <div className="pt-2 border-t border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Aparelhos Conectados
                    </span>
                    <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {totpStatus?.devices?.length || 0}
                    </Badge>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleStartSetup()}
                    disabled={isStartingSetup}
                    className="h-8 rounded-lg text-xs font-semibold gap-1.5 cursor-pointer border-border hover:bg-secondary/60"
                  >
                    <Plus className="size-3.5" />
                    Adicionar Aparelho
                  </Button>
                </div>

                {totpStatus?.devices && totpStatus.devices.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {totpStatus.devices.map((device) => (
                      <div
                        key={device.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-background/80 border border-border/50 group hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Smartphone className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{device.deviceName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {device.lastUsedAt
                                ? `Usado ${new Date(device.lastUsedAt).toLocaleDateString("pt-BR")}`
                                : `Adicionado ${new Date(device.createdAt).toLocaleDateString("pt-BR")}`}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeviceToDelete({ id: device.id, name: device.deviceName })}
                          className="size-7 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                          title="Remover aparelho"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/40 text-center text-xs text-muted-foreground">
                    Nenhum aparelho conectado no momento. Clique em <strong>Adicionar Aparelho</strong> para escanear com seu celular.
                  </div>
                )}
              </div>
            </div>

            {[
              { key: "session_expiration", title: "Expiração de Sessão", desc: "Forçar logout após 24h de inatividade." },
              { key: "two_factor_auth_enabled", title: "Autenticação de Duas Etapas (2FA)", desc: "Exigir validação com código OTP enviado por e-mail para todos os usuários ao realizar login." },
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
                        <SelectTrigger className="rounded-xl border-border/60 w-full">
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
                        <SelectTrigger className="rounded-xl border-border/60 w-full">
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
                      {/* Allow deletion of integrations */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteIntegration(serv.id)}
                        className="size-7 rounded-lg hover:bg-rose-500/10 text-rose-500"
                      >
                        <Trash className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SettingsSection>

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

      <AlertDialog open={!!integrationToDelete} onOpenChange={(open) => !open && setIntegrationToDelete(null)}>
        <AlertDialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-black tracking-tight">
              Remover Integração?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Essa ação não poderá ser desfeita. O serviço deixará de ser monitorado no painel de performance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2">
            <AlertDialogCancel className="rounded-xl font-bold h-11 border-border/50 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isDeleting}
              className="rounded-xl font-bold h-11 bg-rose-500 hover:bg-rose-600 text-white cursor-pointer border-none flex gap-2"
            >
              {isDeleting && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Configuração do Google Authenticator */}
      <Dialog open={isSetupModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsSetupModalOpen(false);
          setBackupCodes(null);
          setVerificationOtp("");
        }
      }}>
        <DialogContent className="sm:max-w-100 p-6 rounded-2xl! border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl">
          {backupCodes ? (
            <div className="space-y-4 py-1 text-center animate-in fade-in duration-200">
              <div className="space-y-1">
                <DialogTitle className="text-base font-bold tracking-tight">
                  Authenticator Ativado
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Guarde seus códigos de backup para emergências.
                </DialogDescription>
              </div>

              <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-xl bg-secondary/30 border border-border/40">
                {backupCodes.map((code, idx) => (
                  <div key={idx} className="font-mono text-xs font-semibold text-foreground py-1 px-2 rounded-md bg-background/60 border border-border/30 text-center">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopyBackupCodes}
                  className="flex-1 h-10 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer border-border"
                >
                  {hasCopiedBackup ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                  {hasCopiedBackup ? "Copiados" : "Copiar"}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setIsSetupModalOpen(false);
                    setBackupCodes(null);
                  }}
                  className="flex-1 h-10 rounded-xl text-xs font-semibold bg-primary text-primary-foreground shadow-sm cursor-pointer"
                >
                  Concluir
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-1">
              <DialogHeader className="space-y-1 text-center sm:text-center">
                <DialogTitle className="text-base font-bold tracking-tight">
                  Google Authenticator
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Escaneie o QR Code no app e digite o código de 6 dígitos.
                </DialogDescription>
              </DialogHeader>

              {setupData && (
                <div className="space-y-4">
                  {/* Nome do Aparelho */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Nome deste Aparelho</label>
                    <Input
                      value={newDeviceName}
                      onChange={(e) => setNewDeviceName(e.target.value)}
                      placeholder="Ex: Celular Principal, iPhone..."
                      className="h-9 text-xs rounded-xl border-border/60 bg-background"
                      disabled={isVerifyingTotp}
                    />
                  </div>

                  <div className="flex justify-center py-1">
                    <div className="p-1 rounded-2xl bg-white border border-border/40 shadow-sm">
                      <img
                        src={setupData.qrCodeUrl}
                        alt="QR Code"
                        className="size-56 object-contain mx-auto"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-secondary/30 border border-border/40 text-xs">
                    <code className="font-mono text-[11px] text-muted-foreground select-all truncate">
                      {setupData.secret}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopySecret(setupData.secret)}
                      className="h-6 px-2 text-[11px] font-medium gap-1 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    >
                      {hasCopiedSecret ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                      {hasCopiedSecret ? "Copiado" : "Copiar"}
                    </Button>
                  </div>

                  {/* Campo de Código + Ações */}
                  <form onSubmit={handleVerifyTotp} className="space-y-3 pt-1">
                    <div className="flex justify-center">
                      <InputOTP
                        maxLength={6}
                        value={verificationOtp}
                        onChange={setVerificationOtp}
                        disabled={isVerifyingTotp}
                        containerClassName="justify-center"
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <DialogFooter className="flex gap-2 sm:gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsSetupModalOpen(false)}
                        disabled={isVerifyingTotp}
                        className="rounded-xl h-10 text-xs font-semibold border-border cursor-pointer flex-1"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={isVerifyingTotp || verificationOtp.length !== 6}
                        className="rounded-xl h-10 text-xs font-semibold bg-primary text-primary-foreground shadow-sm cursor-pointer flex-1 gap-2 active:scale-95 transition-transform"
                      >
                        {isVerifyingTotp ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            Conectando...
                          </>
                        ) : (
                          "Conectar Aparelho"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação para Desativação do Google Authenticator */}
      <AlertDialog open={isDisableModalOpen} onOpenChange={setIsDisableModalOpen}>
        <AlertDialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="size-5 text-rose-500" />
              Desativar Google Authenticator?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Essa ação removerá a camada extra de segurança do seu login de Administrador. Sua conta voltará a depender exclusivamente de e-mail e senha para acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2">
            <AlertDialogCancel
              disabled={isDisablingTotp}
              className="rounded-xl font-bold h-11 border-border/50 cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDisableTotp();
              }}
              disabled={isDisablingTotp}
              className="rounded-xl font-bold h-11 bg-rose-500 hover:bg-rose-600 text-white cursor-pointer border-none flex gap-2"
            >
              {isDisablingTotp && <Loader2 className="size-4 animate-spin" />}
              {isDisablingTotp ? "Desativando..." : "Sim, desativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog de Confirmação para Desativação do 3FA */}
      <AlertDialog open={isDisable3FAModalOpen} onOpenChange={setIsDisable3FAModalOpen}>
        <AlertDialogContent className="rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="size-5 text-rose-500" />
              Desativar Autenticação em 3 Fatores (3FA)?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Essa ação removerá a exigência conjunta de <strong>E-mail + Google Authenticator</strong> para o seu usuário SuperAdmin. Seu login continuará exigindo autenticação padrão, mas sem a terceira etapa de verificação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2">
            <AlertDialogCancel
              disabled={isToggling3FA}
              className="rounded-xl font-bold h-11 border-border/50 cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDisable3FA();
              }}
              disabled={isToggling3FA}
              className="rounded-xl font-bold h-11 bg-rose-500 hover:bg-rose-600 text-white cursor-pointer border-none flex gap-2"
            >
              {isToggling3FA && <Loader2 className="size-4 animate-spin" />}
              {isToggling3FA ? "Desativando 3FA..." : "Sim, desativar 3FA"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deviceToDelete} onOpenChange={(open) => !open && setDeviceToDelete(null)}>
        <AlertDialogContent className="rounded-3xl! border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
              <ShieldAlert className="size-5 text-rose-500" />
              Remover aparelho &quot;{deviceToDelete?.name}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Este dispositivo deixará de gerar códigos de acesso válidos para a conta de SuperAdmin. Caso seja o único aparelho conectado, a verificação 3FA será desativada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex gap-2">
            <AlertDialogCancel
              disabled={isDeletingDevice}
              className="rounded-xl font-bold h-11 border-border/50 cursor-pointer"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteDevice();
              }}
              disabled={isDeletingDevice}
              className="rounded-xl font-bold h-11 bg-rose-500 hover:bg-rose-600 text-white cursor-pointer border-none flex gap-2"
            >
              {isDeletingDevice && <Loader2 className="size-4 animate-spin" />}
              {isDeletingDevice ? "Removendo..." : "Sim, remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
