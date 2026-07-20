"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { format } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dumbbell,
  UserPlus,
  Send,
  CopyPlus,
  ClipboardList,
  AlertCircle,
  Clock,
  ChevronRight,
  Zap,
  Loader2,
  CalendarRange,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const priorityConfig: Record<string, { badge: string; label: string }> = {
  Alta: { badge: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20", label: "Alta Prioridade" },
  Média: { badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20", label: "Média Prioridade" },
  Baixa: { badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20", label: "Baixa Prioridade" },
};

const getPendingIcon = (iconName: string) => {
  switch (iconName) {
    case "MessageSquare": return <MessageSquare className="size-4" />;
    case "Dumbbell": return <Dumbbell className="size-4" />;
    case "ClipboardList": return <ClipboardList className="size-4" />;
    case "UserPlus": return <UserPlus className="size-4" />;
    default: return <Clock className="size-4" />;
  }
};

interface AlertItem {
  id: string;
  type: string;
  title: string;
  action: string;
  whatsapp?: string;
}

interface AgendaItem {
  id: string;
  time: string;
  title: string;
  type: string;
  completed: boolean;
  studentId?: string | null;
  student?: {
    id: string;
    name: string;
  } | null;
}

interface PendingTask {
  id: string;
  title: string;
  count: number;
  icon: string;
}

interface IntelligentStudent {
  id: string;
  name: string;
  priority: string;
  priorityScore: number;
  visualStatus: string;
  statusText: string;
  plan: string;
  whatsapp?: string;
}

interface OrganizationData {
  alerts: AlertItem[];
  dailyAgenda: AgendaItem[];
  pendingTasks: PendingTask[];
  intelligentStudentsList: IntelligentStudent[];
}

function OrganizationSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* 1. Quick Actions Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 rounded-xl border border-border" />
        ))}
      </div>

      {/* 2. Intelligent Alerts Skeleton */}
      <Card className="border-red-500/20 bg-secondary/10 overflow-hidden shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-2.5">
          <Skeleton className="size-9 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-64" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-secondary/20 border border-border/50">
              <div className="flex items-center gap-3">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-60" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Agenda & Pending Tasks Skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-24" />
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-1.5 px-2 rounded-xl">
                <Skeleton className="size-5 rounded" />
                <Skeleton className="h-4 w-8" />
                <Skeleton className="h-4 w-40" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border pb-4 space-y-2">
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/15">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-lg" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 4. Smart Students List Skeleton */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border bg-secondary/10 pb-4 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-80" />
        </CardHeader>
        <CardContent className="p-0 divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="size-8 rounded-lg" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrganizationPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [data, setData] = useState<OrganizationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState<boolean>(false);
  const [newTaskTitle, setNewTaskTitle] = useState<string>("");
  const [newTaskTime, setNewTaskTime] = useState<string>("");
  const [newTaskType, setNewTaskType] = useState<string>("lembrete");
  const [newTaskStudentId, setNewTaskStudentId] = useState<string>("none");
  const [isSubmittingTask, setIsSubmittingTask] = useState<boolean>(false);

  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState<boolean>(false);
  const [editingTask, setEditingTask] = useState<AgendaItem | null>(null);
  const [editTaskTitle, setEditTaskTitle] = useState<string>("");
  const [editTaskTime, setEditTaskTime] = useState<string>("");
  const [editTaskType, setEditTaskType] = useState<string>("lembrete");
  const [editTaskStudentId, setEditTaskStudentId] = useState<string>("none");
  const [isSubmittingEditTask, setIsSubmittingEditTask] = useState<boolean>(false);

  const [isDeleteTaskModalOpen, setIsDeleteTaskModalOpen] = useState<boolean>(false);
  const [taskToDelete, setTaskToDelete] = useState<AgendaItem | null>(null);
  const [isSubmittingDeleteTask, setIsSubmittingDeleteTask] = useState<boolean>(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  useEffect(() => {
    async function loadMetrics() {
      if (!activeWorkspaceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const response = await fetch(`/api/personal/organization?workspaceId=${activeWorkspaceId}&date=${todayStr}`);
        if (!response.ok) {
          throw new Error("Falha ao carregar as métricas operacionais.");
        }
        const result = await response.json();
        setData(result);
      } catch (err: any) {
        console.error("Error fetching organization data:", err);
        setError(err.message || "Ocorreu um erro ao carregar os dados.");
      } finally {
        setIsLoading(false);
      }
    }

    loadMetrics();
  }, [activeWorkspaceId]);

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    setTogglingTaskId(taskId);
    try {
      const response = await fetch("/api/personal/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          completed: !currentCompleted,
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar a tarefa.");
      }

      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          dailyAgenda: prev.dailyAgenda.map((item) =>
            item.id === taskId ? { ...item, completed: !currentCompleted } : item
          ),
        };
      });

      toast.success(currentCompleted ? "Tarefa pendente." : "Tarefa concluída!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar a tarefa.");
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !newTaskTime.trim()) return;

    setIsSubmittingTask(true);
    try {
      const todayStr = format(new Date(), "yyyy-MM-dd");
      const response = await fetch("/api/personal/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          title: newTaskTitle,
          time: newTaskTime,
          type: newTaskType,
          date: todayStr,
          studentId: newTaskStudentId && newTaskStudentId !== "none" ? newTaskStudentId : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível criar a tarefa.");
      }

      const createdTask = await response.json();

      setData((prev) => {
        if (!prev) return null;
        const updatedAgenda = [...prev.dailyAgenda, createdTask].sort((a, b) => {
          return a.time.localeCompare(b.time);
        });
        return {
          ...prev,
          dailyAgenda: updatedAgenda,
        };
      });

      toast.success("Tarefa criada!");
      setIsTaskModalOpen(false);
      setNewTaskTitle("");
      setNewTaskTime("");
      setNewTaskType("lembrete");
      setNewTaskStudentId("none");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar a tarefa.");
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleOpenEditModal = (task: AgendaItem) => {
    setEditingTask(task);
    setEditTaskTitle(task.title);
    setEditTaskTime(task.time);
    setEditTaskType(task.type);
    setEditTaskStudentId(task.studentId || "none");
    setIsEditTaskModalOpen(true);
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskTitle.trim() || !editTaskTime.trim()) return;

    setIsSubmittingEditTask(true);
    try {
      const response = await fetch("/api/personal/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: editingTask.id,
          workspaceId: activeWorkspaceId,
          title: editTaskTitle,
          time: editTaskTime,
          type: editTaskType,
          studentId: editTaskStudentId && editTaskStudentId !== "none" ? editTaskStudentId : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar a tarefa.");
      }

      const updatedTask = await response.json();

      setData((prev) => {
        if (!prev) return null;
        const updatedAgenda = prev.dailyAgenda
          .map((item) => (item.id === editingTask.id ? updatedTask : item))
          .sort((a, b) => a.time.localeCompare(b.time));
        return {
          ...prev,
          dailyAgenda: updatedAgenda,
        };
      });

      toast.success("Tarefa atualizada com sucesso!");
      setIsEditTaskModalOpen(false);
      setEditingTask(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar a tarefa.");
    } finally {
      setIsSubmittingEditTask(false);
    }
  };

  const handleOpenDeleteModal = (task: AgendaItem) => {
    setTaskToDelete(task);
    setIsDeleteTaskModalOpen(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    setIsSubmittingDeleteTask(true);
    try {
      const response = await fetch(`/api/personal/organization?taskId=${taskToDelete.id}&workspaceId=${activeWorkspaceId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Não foi possível deletar a tarefa.");
      }

      setData((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          dailyAgenda: prev.dailyAgenda.filter((item) => item.id !== taskToDelete.id),
        };
      });

      toast.success("Tarefa removida!");
      setIsDeleteTaskModalOpen(false);
      setTaskToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover a tarefa.");
    } finally {
      setIsSubmittingDeleteTask(false);
    }
  };

  const handleAlertAction = (alert: AlertItem) => {
    if (alert.whatsapp) {
      const cleanPhone = alert.whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/55${cleanPhone}`, "_blank");
      toast.success("Redirecionando para o WhatsApp do aluno...");
    } else {
      window.location.href = "/personal/clients";
    }
  };

  const handlePendingTaskClick = (task: PendingTask) => {
    if (task.icon === "UserPlus" || task.icon === "ClipboardList") {
      window.location.href = "/personal/clients";
    } else if (task.icon === "Dumbbell") {
      window.location.href = "/personal/workouts";
    } else {
      window.location.href = "/personal/clients";
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 overflow-hidden w-full bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Organização</h2>
            <p className="text-neutral-400 mt-1 text-sm">Seu assistente operacional inteligente em tempo real.</p>
          </div>
        </div>
        <OrganizationSkeleton />
      </div>
    );
  }

  if (error || !activeWorkspaceId) {
    return (
      <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
          <AlertCircle className="size-8" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Não foi possível carregar as informações</h3>
          <p className="text-sm text-neutral-400 mt-1 max-w-sm">
            {error || "Por favor, selecione ou crie um workspace ativo no menu lateral."}
          </p>
        </div>
      </div>
    );
  }
  const { alerts, dailyAgenda, pendingTasks, intelligentStudentsList } = data || {
    alerts: [],
    dailyAgenda: [],
    pendingTasks: [],
    intelligentStudentsList: [],
  };

  const totalTasks = dailyAgenda.length;
  const completedTasks = dailyAgenda.filter((item) => item.completed).length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const urgentAlertsCount = alerts.filter((alert) => alert.type === "danger").length;
  const totalAlertsCount = alerts.length;

  const highPriorityStudents = intelligentStudentsList.filter((s) => s.priority === "Alta").length;

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 w-full bg-background min-h-screen md:pb-8">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Organização</h2>
          <p className="text-muted-foreground mt-1 text-sm">Seu assistente operacional inteligente em tempo real.</p>
        </div>
      </div>

      {/* Dashboard Operational Bento Stats Grid */}
      <div className="grid grid-cols-3 gap-3 md:gap-6">
        {/* Card 1: Agenda Progress */}
        <Card className="relative overflow-hidden bg-card border-border/50 shadow-xs hover:border-border transition-all">
          <CardContent className="p-3 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-wider block truncate">Tarefas</span>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-lg md:text-2xl font-black text-foreground">{completedTasks}</span>
                <span className="text-[10px] md:text-sm text-muted-foreground">/{totalTasks}</span>
              </div>
            </div>
            <div className="hidden sm:flex flex-col items-center justify-center size-9 md:size-11 rounded-xl bg-primary/10 border border-primary/20 shrink-0 text-xs font-black text-primary">
              {taskCompletionRate}%
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Alerts status */}
        <Card className="relative overflow-hidden bg-card border-border/50 shadow-xs hover:border-border transition-all">
          <CardContent className="p-3 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-wider block truncate">Alertas</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg md:text-2xl font-black text-foreground">{totalAlertsCount}</span>
                <span className="text-[10px] md:text-sm text-muted-foreground">ativos</span>
              </div>
            </div>
            <div className={cn(
              "hidden sm:flex items-center justify-center size-9 md:size-11 rounded-xl shrink-0 border",
              totalAlertsCount > 0 ? "bg-red-500/10 border-red-500/20 text-red-500 animate-pulse" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
            )}>
              <Zap className="size-4 md:size-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Radar de Alunos */}
        <Card className="relative overflow-hidden bg-card border-border/50 shadow-xs hover:border-border transition-all">
          <CardContent className="p-3 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="text-[9px] md:text-[11px] font-black text-muted-foreground uppercase tracking-wider block truncate">Radar</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg md:text-2xl font-black text-foreground">{intelligentStudentsList.length}</span>
                <span className="text-[10px] md:text-sm text-muted-foreground">alunos</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center justify-center size-9 md:size-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 shrink-0">
              <UserPlus className="size-4 md:size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----------------- MOBILE LAYOUT (Tabs-based to avoid endless scrolling) ----------------- */}
      <div className="md:hidden space-y-6">
        {/* Quick Actions (Horizontal scrollable pill strip) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
          <Button
            variant="outline"
            asChild
            className="h-10 px-4 flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary border-border/40 text-xs font-bold uppercase tracking-wider rounded-full shrink-0 cursor-pointer"
          >
            <Link href="/personal/workouts">
              <Dumbbell className="size-3.5 text-primary" />
              <span>Criar Treino</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-10 px-4 flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary border-border/40 text-xs font-bold uppercase tracking-wider rounded-full shrink-0 cursor-pointer"
          >
            <Link href="/personal/clients">
              <UserPlus className="size-3.5 text-primary" />
              <span>Novo Aluno</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-10 px-4 flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary border-border/40 text-xs font-bold uppercase tracking-wider rounded-full shrink-0 cursor-pointer"
          >
            <Link href="/personal/chat?massMessage=true">
              <Send className="size-3.5 text-primary" />
              <span>Msg em Massa</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-10 px-4 flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary border-border/40 text-xs font-bold uppercase tracking-wider rounded-full shrink-0 cursor-pointer"
          >
            <Link href="/personal/workouts">
              <CopyPlus className="size-3.5 text-primary" />
              <span>Duplicar Treino</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-10 px-4 flex items-center gap-1.5 bg-secondary/50 hover:bg-secondary border-border/40 text-xs font-bold uppercase tracking-wider rounded-full shrink-0 cursor-pointer"
          >
            <Link href="/personal/clients">
              <ClipboardList className="size-3.5 text-primary" />
              <span>Avaliação</span>
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="agenda" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-secondary/50 p-1 rounded-xl mb-6">
            <TabsTrigger value="agenda" className="rounded-lg text-xs font-bold py-2 cursor-pointer">
              Agenda
            </TabsTrigger>
            <TabsTrigger value="alunos" className="rounded-lg text-xs font-bold py-2 cursor-pointer">
              Alunos ({intelligentStudentsList.length})
            </TabsTrigger>
            <TabsTrigger value="pendencias" className="rounded-lg text-xs font-bold py-2 cursor-pointer">
              Pendências
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Agenda & Alertas */}
          <TabsContent value="agenda" className="space-y-6 outline-hidden">
            {/* Alertas Inteligentes */}
            <Card className="border-red-500/20 bg-linear-to-br from-red-500/[0.02] via-card to-transparent overflow-hidden shadow-xs">
              <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-2.5">
                <div className="p-2 bg-red-500/10 rounded-full border border-red-500/20">
                  <Zap className="size-4.5 text-red-500 fill-red-500/10 animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-foreground">Alertas Operacionais</CardTitle>
                  <CardDescription className="text-muted-foreground text-[10px]">Ações urgentes recomendadas.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "flex flex-col gap-2.5 p-3.5 rounded-xl border transition-all",
                    alert.type === "success" && "bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                    alert.type === "danger" && "bg-red-500/[0.02] border-red-500/20 text-red-600 dark:text-red-400",
                    alert.type === "warning" && "bg-amber-500/[0.02] border-amber-500/20 text-amber-600 dark:text-amber-400",
                    !["success", "danger", "warning"].includes(alert.type) && "bg-card border-border/40"
                  )}>
                    <div className="flex items-start gap-2.5">
                      {alert.type === "success" ? (
                        <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-emerald-500" />
                      ) : (
                        <AlertCircle className={cn("size-4 shrink-0 mt-0.5", alert.type === "danger" ? "text-red-500 animate-pulse" : "text-amber-500")} />
                      )}
                      <span className="text-xs font-semibold leading-tight">{alert.title}</span>
                    </div>
                    {alert.action && (
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAlertAction(alert)}
                          className={cn(
                            "h-7 px-3.5 text-[10px] border transition-all rounded-lg font-bold uppercase tracking-wider cursor-pointer",
                            alert.type === "success"
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-secondary border-border/40 text-foreground hover:bg-secondary/80"
                          )}
                        >
                          {alert.action}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Agenda do Dia */}
            <Card className="bg-card border-border/50 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                      <CalendarRange className="size-4.5 text-primary" />
                      Agenda de Hoje
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                      {new Date().toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg cursor-pointer transition-all border border-border/40"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-3">
                <div className="space-y-2.5">
                  {dailyAgenda.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-secondary/15 border border-border/30 hover:bg-secondary/25 transition-all">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                          <Checkbox
                            checked={item.completed}
                            disabled={togglingTaskId === item.id}
                            onCheckedChange={() => handleToggleTask(item.id, item.completed)}
                            className="cursor-pointer size-4.5"
                          />
                          {togglingTaskId === item.id && (
                            <div className="absolute inset-0 bg-background/85 flex items-center justify-center rounded">
                              <Loader2 className="size-3 animate-spin text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-xs font-bold leading-tight truncate transition-colors",
                              item.completed ? "text-muted-foreground line-through" : "text-foreground"
                            )}
                          >
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0 select-none">
                              {item.time}
                            </Badge>
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0 bg-primary/5 border-primary/10 text-primary select-none">
                              {item.type}
                            </Badge>
                            {item.student?.name && (
                              <span className="text-[10px] text-muted-foreground font-semibold truncate max-w-[125px]">
                                • {item.student.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(item)}
                          className="size-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md cursor-pointer transition-all border border-border/20"
                        >
                          <Pencil className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(item)}
                          className="size-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md cursor-pointer transition-all border border-border/20"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {dailyAgenda.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-xs text-muted-foreground font-medium">Nenhum compromisso agendado para hoje.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: Alunos Inteligentes */}
          <TabsContent value="alunos" className="space-y-4 outline-hidden">
            <div className="space-y-3">
              {intelligentStudentsList.map((student) => (
                <div key={student.id} className="p-4 rounded-xl border border-border/40 bg-card flex flex-col gap-3 shadow-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-center justify-center size-9 rounded-full bg-secondary border border-border/50 text-sm shrink-0">
                        {student.visualStatus}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground leading-none truncate">{student.name}</p>
                        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-extrabold mt-1">
                          {student.plan || "Plano Bronze"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 shrink-0", priorityConfig[student.priority]?.badge)}>
                      {student.priority}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-muted-foreground bg-secondary/25 p-2.5 rounded-lg border border-border/30 font-medium leading-relaxed">
                    {student.statusText}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-0.5">
                    {student.whatsapp && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const cleanPhone = student.whatsapp!.replace(/\D/g, "");
                          window.open(`https://wa.me/55${cleanPhone}`, "_blank");
                          toast.success("Redirecionando para o WhatsApp...");
                        }}
                        className="h-8 px-3.5 text-xs gap-1.5 border-border/60 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20 transition-all font-bold rounded-lg cursor-pointer"
                      >
                        <MessageSquare className="size-3.5" />
                        Cobrar
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        window.location.href = `/personal/clients?studentId=${student.id}`;
                      }}
                      className="h-8 px-3 text-xs gap-1 hover:bg-secondary transition-all font-bold rounded-lg cursor-pointer"
                    >
                      Perfil
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              {intelligentStudentsList.length === 0 && (
                <div className="text-center py-12 text-xs text-muted-foreground">
                  Nenhum aluno ativo encontrado neste workspace.
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: Central de Pendências */}
          <TabsContent value="pendencias" className="space-y-4 outline-hidden">
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => handlePendingTaskClick(task)}
                  className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-card hover:bg-secondary/30 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-secondary/60 text-muted-foreground group-hover:text-primary rounded-lg border border-border/40 group-hover:border-primary/25 transition-all">
                      {getPendingIcon(task.icon)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-none">{task.title}</span>
                      <span className="text-[9px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">Resolver Pendência</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="font-extrabold text-xs bg-primary/10 text-primary border-none px-2.5 py-0.5 rounded-full shrink-0">
                    {task.count}
                  </Badge>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ----------------- DESKTOP LAYOUT (Structured Bento Command Center) ----------------- */}
      <div className="hidden md:grid grid-cols-12 gap-8 items-start">
        {/* Main Operational Panel (cols-span-8) */}
        <div className="col-span-8 space-y-6">
          {/* Quick Actions (Bar layout) */}
          <Card className="bg-card border-border/50 p-4 shadow-xs">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <span className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Atalhos Rápidos</span>
              <div className="flex items-center gap-2.5">
                <Button variant="outline" size="sm" asChild className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
                  <Link href="/personal/workouts">
                    <Dumbbell className="size-3.5 text-primary" />
                    Criar Treino
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
                  <Link href="/personal/clients">
                    <UserPlus className="size-3.5 text-primary" />
                    Adicionar Aluno
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
                  <Link href="/personal/chat?massMessage=true">
                    <Send className="size-3.5 text-primary" />
                    Mensagem em Massa
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
                  <Link href="/personal/workouts">
                    <CopyPlus className="size-3.5 text-primary" />
                    Duplicar Treino
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild className="h-9 rounded-xl font-bold text-xs gap-1.5 cursor-pointer">
                  <Link href="/personal/clients">
                    <ClipboardList className="size-3.5 text-primary" />
                    Gerar Avaliação
                  </Link>
                </Button>
              </div>
            </div>
          </Card>

          {/* Alertas Inteligentes */}
          <Card className="border-red-500/20 bg-linear-to-br from-red-500/[0.03] via-card to-card overflow-hidden shadow-xs">
            <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-2.5">
              <div className="p-2 bg-red-500/10 rounded-full border border-red-500/20">
                <Zap className="size-5 text-red-500 fill-red-500/10 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">Alertas Inteligentes</CardTitle>
                <CardDescription className="text-muted-foreground text-xs">Ações operacionais imediatas recomendadas para evitar evasão.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2.5">
                {alerts.map((alert) => (
                  <div key={alert.id} className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                    alert.type === "success" && "bg-emerald-500/[0.02] border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                    alert.type === "danger" && "bg-red-500/[0.02] border-red-500/20 text-red-600 dark:text-red-400",
                    alert.type === "warning" && "bg-amber-500/[0.02] border-amber-500/20 text-amber-600 dark:text-amber-400",
                    !["success", "danger", "warning"].includes(alert.type) && "bg-secondary/20 border border-border/40 hover:border-border"
                  )}>
                    <div className="flex items-center gap-3">
                      {alert.type === "success" ? (
                        <CheckCircle2 className="size-4.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className={cn("size-4.5 shrink-0", alert.type === "danger" ? "text-red-500 animate-pulse" : "text-amber-500")} />
                      )}
                      <span className="text-sm font-semibold text-foreground/90">{alert.title}</span>
                    </div>
                    {alert.action && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAlertAction(alert)}
                        className={cn(
                          "h-8 px-4 text-xs border transition-all rounded-lg shrink-0 font-bold cursor-pointer",
                          alert.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-card border border-border/50 text-foreground hover:bg-secondary"
                        )}
                      >
                        {alert.action}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Agenda & Pendências side-by-side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Agenda do Dia */}
            <Card className="bg-card border-border/50 shadow-xs flex flex-col h-[520px]">
              <CardHeader className="border-b border-border/30 pb-4 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                      <CalendarRange className="size-4.5 text-primary" />
                      Agenda do Dia
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                      {new Date().toLocaleDateString("pt-BR", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsTaskModalOpen(true)}
                    className="size-8 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg cursor-pointer transition-all border border-border/40"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-hidden min-h-0 px-4">
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-2.5 pb-4">
                    {dailyAgenda.map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-4 group/task p-3 rounded-xl bg-secondary/15 hover:bg-secondary/30 border border-border/30 hover:border-border/60 transition-all">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="relative flex items-center justify-center shrink-0">
                            <Checkbox
                              checked={item.completed}
                              disabled={togglingTaskId === item.id}
                              onCheckedChange={() => handleToggleTask(item.id, item.completed)}
                              className="cursor-pointer size-4.5"
                            />
                            {togglingTaskId === item.id && (
                              <div className="absolute inset-0 bg-background/85 flex items-center justify-center rounded">
                                <Loader2 className="size-3 animate-spin text-primary" />
                              </div>
                            )}
                          </div>
                          <div className="w-10 text-xs font-bold text-muted-foreground text-right shrink-0">
                            {item.time}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                "text-xs font-bold leading-tight truncate transition-colors",
                                item.completed ? "text-muted-foreground line-through" : "text-foreground"
                              )}
                            >
                              {item.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <Badge variant="outline" className="text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0 select-none">
                                {item.type}
                              </Badge>
                              {item.student?.name && (
                                <span className="text-[9px] text-muted-foreground font-bold truncate max-w-[140px]">
                                  • {item.student.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(item)}
                            className="size-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md cursor-pointer transition-all border border-border/20"
                          >
                            <Pencil className="size-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDeleteModal(item)}
                            className="size-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-md cursor-pointer transition-all border border-border/20"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {dailyAgenda.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-16">Nenhum evento agendado para hoje.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Central de Pendências */}
            <Card className="bg-card border-border/50 shadow-xs flex flex-col h-[520px]">
              <CardHeader className="border-b border-border/30 pb-4 shrink-0">
                <CardTitle className="text-sm font-black text-foreground flex items-center gap-2">
                  <ClipboardList className="size-4.5 text-primary" />
                  Central de Pendências
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex-1 overflow-hidden min-h-0 px-4">
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-3 pb-4">
                    {pendingTasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => handlePendingTaskClick(task)}
                        className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-secondary/15 hover:bg-secondary/35 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-card text-muted-foreground group-hover:text-primary rounded-lg border border-border/50 group-hover:border-primary/20 transition-all">
                            {getPendingIcon(task.icon)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors leading-none">{task.title}</span>
                            <span className="text-[9px] text-muted-foreground font-semibold mt-1 uppercase tracking-wider">Clique para resolver</span>
                          </div>
                        </div>
                        <Badge variant="secondary" className="font-extrabold text-xs bg-primary/10 text-primary border-none px-2.5 py-0.5 rounded-full shrink-0">
                          {task.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Sidebar Area: Smart Students List (cols-span-4) */}
        <div className="col-span-4">
          <Card className="border-border/50 shadow-xs bg-card flex flex-col h-[670px]">
            <CardHeader className="border-b border-border/30 pb-4 shrink-0">
              <div>
                <CardTitle className="text-sm font-black text-foreground">Radar de Alunos</CardTitle>
                <CardDescription className="text-muted-foreground text-[10px] uppercase tracking-wider mt-0.5">Prioridade dinâmica por engajamento.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden min-h-0 p-4">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3 pb-4">
                  {intelligentStudentsList.map((student) => (
                    <div key={student.id} className="p-4 rounded-xl border border-border/40 bg-secondary/10 flex flex-col gap-3.5 hover:border-border transition-all">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col items-center justify-center size-9 rounded-full bg-card border border-border/50 text-sm shrink-0">
                            {student.visualStatus}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground leading-none truncate">{student.name}</p>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-extrabold mt-1">
                              {student.plan || "Plano Bronze"}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className={cn("text-[8px] uppercase tracking-wider font-extrabold px-2 py-0.5 shrink-0", priorityConfig[student.priority]?.badge)}>
                          {student.priority}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-muted-foreground bg-card p-2.5 rounded-lg border border-border/30 font-semibold leading-relaxed">
                        {student.statusText}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-0.5">
                        {student.whatsapp && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const cleanPhone = student.whatsapp!.replace(/\D/g, "");
                              window.open(`https://wa.me/55${cleanPhone}`, "_blank");
                              toast.success("Redirecionando para o WhatsApp...");
                            }}
                            className="h-8 px-3 text-[10px] gap-1.5 border-border/60 hover:bg-emerald-500/10 hover:text-emerald-500 hover:border-emerald-500/20 transition-all font-bold rounded-lg cursor-pointer"
                          >
                            <MessageSquare className="size-3.5" />
                            WhatsApp
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            window.location.href = `/personal/clients?studentId=${student.id}`;
                          }}
                          className="h-8 px-2.5 text-[10px] gap-1 hover:bg-secondary transition-all font-bold rounded-lg cursor-pointer"
                        >
                          Perfil
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {intelligentStudentsList.length === 0 && (
                    <div className="text-center py-16 text-xs text-muted-foreground">
                      Nenhum aluno ativo encontrado.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ----------------- MODALS (Declared once at bottom) ----------------- */}
      {/* Create Task Modal */}
      <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Nova Tarefa Diária</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Adicione um novo compromisso ou lembrete operacional na agenda.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Título da Tarefa</Label>
              <Input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Ex: Avaliação Física - João Silva"
                className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground focus-visible:ring-primary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horário</Label>
                <Input
                  type="text"
                  required
                  value={newTaskTime}
                  onChange={(e) => setNewTaskTime(e.target.value)}
                  placeholder="Ex: 14:00"
                  className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                <Select
                  value={newTaskType}
                  onValueChange={(value) => setNewTaskType(value)}
                >
                  <SelectTrigger className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground h-10 focus:ring-primary/50">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border text-popover-foreground rounded-xl">
                    <SelectItem value="avaliação">Avaliação</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="check-in">Check-in</SelectItem>
                    <SelectItem value="lembrete">Lembrete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aluno Relacionado (Opcional)</Label>
              <Select
                value={newTaskStudentId}
                onValueChange={(value) => setNewTaskStudentId(value)}
              >
                <SelectTrigger className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground h-10 focus:ring-primary/50">
                  <SelectValue placeholder="Selecione um aluno (Opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border text-popover-foreground rounded-xl">
                  <SelectItem value="none">Nenhum (Geral / Lembrete)</SelectItem>
                  {intelligentStudentsList.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex sm:justify-end gap-2">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 cursor-pointer rounded-xl transition-all"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmittingTask}
                className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer rounded-xl transition-all flex items-center gap-1.5 font-semibold"
              >
                {isSubmittingTask && <Loader2 className="size-4 animate-spin" />}
                Criar Tarefa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Task Modal */}
      <Dialog open={isEditTaskModalOpen} onOpenChange={setIsEditTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Editar Tarefa</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Altere os detalhes deste compromisso ou lembrete.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTask} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Título da Tarefa</Label>
              <Input
                type="text"
                required
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="Ex: Avaliação Física - João Silva"
                className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground focus-visible:ring-primary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horário</Label>
                <Input
                  type="text"
                  required
                  value={editTaskTime}
                  onChange={(e) => setEditTaskTime(e.target.value)}
                  placeholder="Ex: 14:00"
                  className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                <Select
                  value={editTaskType}
                  onValueChange={(value) => setEditTaskType(value)}
                >
                  <SelectTrigger className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground h-10 focus:ring-primary/50">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border text-popover-foreground rounded-xl">
                    <SelectItem value="avaliação">Avaliação</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="check-in">Check-in</SelectItem>
                    <SelectItem value="lembrete">Lembrete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Aluno Relacionado (Opcional)</Label>
              <Select
                value={editTaskStudentId}
                onValueChange={(value) => setEditTaskStudentId(value)}
              >
                <SelectTrigger className="w-full bg-muted border border-input text-foreground rounded-xl placeholder-muted-foreground h-10 focus:ring-primary/50">
                  <SelectValue placeholder="Selecione um aluno (Opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border text-popover-foreground rounded-xl">
                  <SelectItem value="none">Nenhum (Geral / Lembrete)</SelectItem>
                  {intelligentStudentsList.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex sm:justify-end gap-2">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 px-4 cursor-pointer rounded-xl transition-all"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmittingEditTask}
                className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer rounded-xl transition-all flex items-center gap-1.5 font-semibold"
              >
                {isSubmittingEditTask && <Loader2 className="size-4 animate-spin" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={isDeleteTaskModalOpen} onOpenChange={setIsDeleteTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-background border border-border text-foreground rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Excluir Tarefa</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Tem certeza que deseja excluir a tarefa <span className="text-foreground font-semibold">"{taskToDelete?.title}"</span>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex sm:justify-end gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4 cursor-pointer rounded-xl transition-all"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={isSubmittingDeleteTask}
              className="h-10 px-4 cursor-pointer rounded-xl transition-all flex items-center gap-1.5 font-semibold"
            >
              {isSubmittingDeleteTask && <Loader2 className="size-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

