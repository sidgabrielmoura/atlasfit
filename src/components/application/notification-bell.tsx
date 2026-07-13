"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import {
  Bell,
  Settings,
  Trash2,
  Check,
  Loader2,
  Dumbbell,
  ClipboardList,
  Flame,
  Target,
  DollarSign,
  Info,
  Mail,
  MessageSquare,
  BadgeCheck,
  Sun,
  Shield,
  Eye,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  isRead: boolean;
  deepLink?: string;
  createdAt: string;
}

interface CategoryPreference {
  push: boolean;
  inApp: boolean;
}

interface PreferencesSettings {
  TRAINING: CategoryPreference;
  ASSESSMENT: CategoryPreference;
  NUTRITION: CategoryPreference;
  CRM: CategoryPreference;
  FINANCE: CategoryPreference;
  SYSTEM: CategoryPreference;
  CAMPAIGN: CategoryPreference;
  MESSAGE: CategoryPreference;
  GAMIFICATION: CategoryPreference;
  MARKETING: CategoryPreference;
}

const CATEGORY_LABELS: Record<keyof PreferencesSettings, string> = {
  TRAINING: "Treinos",
  ASSESSMENT: "Avaliações",
  NUTRITION: "Nutrição",
  CRM: "CRM",
  FINANCE: "Financeiro",
  SYSTEM: "Sistema",
  CAMPAIGN: "Campanhas",
  MESSAGE: "Mensagens",
  GAMIFICATION: "Gamificação",
  MARKETING: "Marketing"
};

const ACTIVE_CATEGORIES: Array<keyof PreferencesSettings> = [
  "TRAINING",
  "ASSESSMENT",
  "CRM",
  "FINANCE",
  "MESSAGE"
];


const CATEGORY_ICONS: Record<string, any> = {
  TRAINING: Dumbbell,
  ASSESSMENT: ClipboardList,
  NUTRITION: Flame,
  CRM: Target,
  FINANCE: DollarSign,
  SYSTEM: Info,
  CAMPAIGN: Mail,
  MESSAGE: MessageSquare,
  GAMIFICATION: BadgeCheck,
  MARKETING: Sun,
  SECURITY: Shield
};

export function NotificationBell() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<PreferencesSettings | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const url = activeWorkspaceId
        ? `/api/personal/notifications?workspaceId=${activeWorkspaceId}`
        : "/api/personal/notifications";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch("/api/personal/notifications/preferences");
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();

    const handleNewMessage = () => {
      fetchNotifications();
    };

    window.addEventListener("fcm-message-received", handleNewMessage);
    return () => window.removeEventListener("fcm-message-received", handleNewMessage);
  }, [activeWorkspaceId]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      setMarkingId(id);
      const res = await fetch(`/api/personal/notifications/${id}`, {
        method: "PATCH"
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        toast.success("Notificação marcada como lida.");
      }
    } catch (error) {
      toast.error("Erro ao atualizar notificação.");
    } finally {
      setMarkingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/personal/notifications/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        toast.success("Notificação excluída.");
      }
    } catch (error) {
      toast.error("Erro ao excluir notificação.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const url = activeWorkspaceId
        ? `/api/personal/notifications?workspaceId=${activeWorkspaceId}`
        : "/api/personal/notifications";
      const res = await fetch(url, {
        method: "PATCH"
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        toast.success("Todas as notificações foram lidas.");
      }
    } catch (error) {
      toast.error("Erro ao marcar todas como lidas.");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      setClearing(true);
      const url = activeWorkspaceId
        ? `/api/personal/notifications?workspaceId=${activeWorkspaceId}`
        : "/api/personal/notifications";
      const res = await fetch(url, {
        method: "DELETE"
      });
      if (res.ok) {
        setNotifications([]);
        toast.success("Histórico de notificações limpo.");
      }
    } catch (error) {
      toast.error("Erro ao limpar histórico.");
    } finally {
      setClearing(false);
    }
  };

  const handleTogglePreference = async (
    category: keyof PreferencesSettings,
    channel: "push" | "inApp"
  ) => {
    if (!preferences) return;

    const currentVal = preferences[category][channel];
    const updatedCategory = {
      ...preferences[category],
      [channel]: !currentVal
    };

    const newSettings = {
      ...preferences,
      [category]: updatedCategory
    };

    setPreferences(newSettings);

    try {
      setSavingPrefs(true);
      const res = await fetch("/api/personal/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [category]: updatedCategory })
      });
      if (res.ok) {
        toast.success("Preferências atualizadas.");
      } else {
        throw new Error();
      }
    } catch (error) {
      setPreferences(preferences);
      toast.error("Erro ao salvar preferências.");
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="flex items-center">
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-full hover:bg-neutral-400/10 transition-colors"
          >
            <Bell className="size-5 text-muted-foreground hover:text-foreground transition-colors" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white ring-2 ring-background animate-pulse">
                {unreadCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-80 p-0! overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl rounded-2xl"
        >
          <div className="flex items-center justify-between px-4 py-2 bg-secondary/20">
            <span className="text-sm font-bold text-foreground">Notificações</span>
            <div className="flex items-center">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleMarkAllAsRead}
                  disabled={markingAll}
                  className="size-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                  title="Marcar todas como lidas"
                >
                  {markingAll ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsPopoverOpen(false);
                  setIsPrefsOpen(true);
                }}
                className="size-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary"
                title="Configurações"
              >
                <Settings className="size-3.5" />
              </Button>
            </div>
          </div>

          <Separator />

          <ScrollArea className="h-72 p-0!">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Carregando notificações...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground px-4 text-center">
                <Bell className="size-8 mb-2 text-muted-foreground/40" />
                <span className="text-xs font-semibold">Tudo limpo por aqui!</span>
                <span className="text-[10px] text-muted-foreground/60 mt-1">Você não possui novas notificações no momento.</span>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((n) => {
                  const IconComponent = CATEGORY_ICONS[n.category] || Info;
                  const isCritical = n.priority === "CRITICAL" || n.priority === "HIGH";

                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "relative flex gap-3 p-3 transition-colors border-b border-border/20 last:border-0 hover:bg-secondary/20",
                        !n.isRead && "bg-primary/5 hover:bg-primary/10"
                      )}
                    >
                      <div
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg shadow-sm border border-white/4",
                          isCritical
                            ? "bg-red-500/10 text-red-500"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        <IconComponent className="size-4.5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <p className={cn("text-xs font-bold text-foreground truncate pr-3", !n.isRead && "text-primary")}>
                            {n.title}
                          </p>
                          <span className="text-[9px] text-muted-foreground whitespace-nowrap pt-0.5">
                            {formatDistanceToNow(new Date(n.createdAt), {
                              addSuffix: false,
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                          {n.description}
                        </p>

                        {n.deepLink && (
                          <Link
                            href={n.deepLink}
                            onClick={() => {
                              setIsPopoverOpen(false);
                              if (!n.isRead) handleMarkAsRead(n.id);
                            }}
                            className="inline-flex items-center gap-1 text-[9px] font-bold text-primary mt-1.5 hover:underline"
                          >
                            <Eye className="size-3" />
                            Visualizar
                          </Link>
                        )}
                      </div>

                      <div className="absolute right-2 bottom-2 flex items-center gap-1 opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {!n.isRead && (
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={markingId === n.id}
                            onClick={() => handleMarkAsRead(n.id)}
                            className="size-5 rounded-full hover:bg-primary/10 hover:text-primary text-muted-foreground"
                            title="Marcar como lida"
                          >
                            {markingId === n.id ? (
                              <Loader2 className="size-2.5 animate-spin" />
                            ) : (
                              <Check className="size-2.5" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={deletingId === n.id}
                          onClick={() => handleDelete(n.id)}
                          className="size-5 rounded-full hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                          title="Excluir"
                        >
                          {deletingId === n.id ? (
                            <Loader2 className="size-2.5 animate-spin" />
                          ) : (
                            <Trash2 className="size-2.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {notifications.length > 0 && (
            <>
              <Separator />
              <div className="p-2 flex items-center justify-between bg-secondary/10">
                <Button
                  variant="ghost"
                  disabled={clearing}
                  onClick={handleClearHistory}
                  className="w-full text-[10px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive h-8 rounded-lg"
                >
                  {clearing ? (
                    <>
                      <Loader2 className="size-3 mr-1.5 animate-spin" />
                      Limpando Histórico...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3 mr-1.5" />
                      Limpar Histórico
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>

      <Dialog open={isPrefsOpen} onOpenChange={setIsPrefsOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border/50 bg-card/95 rounded-2xl! overflow-y-auto! gap-0">
          <div className="px-6 pt-6 pb-4">
            <DialogTitle className="text-xl font-bold tracking-tight">Preferências de Notificação</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Escolha quais categorias de notificações você deseja receber e por quais canais.
            </DialogDescription>
          </div>

          <div className="px-6 py-3.5 bg-secondary/15 border-y border-border/20 text-[11px] text-muted-foreground space-y-2 select-none">
            <p className="leading-relaxed">
              🔔 <strong className="text-foreground font-semibold">Central (In-App)</strong>: Mostra os alertas dentro do próprio site na Central de Notificações (acessada pelo sino do topo). Guarda histórico de notificações e não requer permissões adicionais.
            </p>
            <p className="leading-relaxed">
              📱 <strong className="text-foreground font-semibold">Push (Navegador)</strong>: Envia alertas instantâneos diretamente na tela do seu computador ou celular, mesmo se a aba do sistema estiver fechada. Requer a permissão de notificações ativa no seu navegador.
            </p>
          </div>

          <ScrollArea className="max-h-96 px-6 py-4">
            {!preferences ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-2 text-muted-foreground">
                <Loader2 className="size-6 animate-spin text-primary" />
                <span className="text-xs">Carregando configurações...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {(Object.keys(preferences) as Array<keyof PreferencesSettings>)
                  .filter((key) => ACTIVE_CATEGORIES.includes(key))
                  .map((key) => {
                    const Icon = CATEGORY_ICONS[key] || Info;
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-secondary/10 border border-border/20">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-foreground">{CATEGORY_LABELS[key]}</p>
                            <p className="text-[9px] text-muted-foreground mt-0.5">Configure o recebimento desta categoria</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Central</span>
                            <Switch
                              checked={preferences[key].inApp}
                              onCheckedChange={() => handleTogglePreference(key, "inApp")}
                              disabled={savingPrefs}
                              size="sm"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Push</span>
                            <Switch
                              checked={preferences[key].push}
                              onCheckedChange={() => handleTogglePreference(key, "push")}
                              disabled={savingPrefs}
                              size="sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </ScrollArea>

          <Separator />

          <div className="px-6 py-3 flex items-center justify-between bg-secondary/20">
            <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground font-medium">
              <AlertTriangle className="size-3 text-amber-500" />
              Notificações de Sistema/Segurança não podem ser desligadas.
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPrefsOpen(false)}
              className="h-8 text-xs font-semibold px-4 rounded-lg"
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
