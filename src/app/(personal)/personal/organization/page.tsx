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
          <Skeleton key={i} className="h-14 bg-neutral-900 border border-neutral-800 rounded-xl" />
        ))}
      </div>

      {/* 2. Intelligent Alerts Skeleton */}
      <Card className="border-red-500/20 bg-neutral-950/40 overflow-hidden shadow-sm">
        <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-2.5">
          <Skeleton className="size-9 rounded-full bg-neutral-900" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 bg-neutral-900" />
            <Skeleton className="h-3 w-64 bg-neutral-900" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/60">
              <div className="flex items-center gap-3">
                <Skeleton className="size-4 bg-neutral-900" />
                <Skeleton className="h-4 w-60 bg-neutral-900" />
              </div>
              <Skeleton className="h-8 w-20 bg-neutral-900 rounded-lg animate-pulse" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 3. Agenda & Pending Tasks Skeleton */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-neutral-950 border-neutral-800/80">
          <CardHeader className="border-b border-neutral-900 pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32 bg-neutral-900" />
              <Skeleton className="size-7 bg-neutral-900 rounded-lg" />
            </div>
            <Skeleton className="h-3 w-24 bg-neutral-900" />
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-1.5 px-2 rounded-xl">
                <Skeleton className="size-5 bg-neutral-900 rounded" />
                <Skeleton className="h-4 w-8 bg-neutral-900" />
                <Skeleton className="h-4 w-40 bg-neutral-900" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-neutral-950 border-neutral-800/80">
          <CardHeader className="border-b border-neutral-900 pb-4 space-y-2">
            <Skeleton className="h-5 w-40 bg-neutral-900" />
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/30">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 bg-neutral-900 rounded-lg" />
                  <Skeleton className="h-4 w-28 bg-neutral-900" />
                </div>
                <Skeleton className="h-5 w-8 bg-neutral-900 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* 4. Smart Students List Skeleton */}
      <Card className="border-neutral-800/80 bg-neutral-950">
        <CardHeader className="border-b border-neutral-900 bg-neutral-900/20 pb-4 space-y-2">
          <Skeleton className="h-5 w-48 bg-neutral-900" />
          <Skeleton className="h-3 w-80 bg-neutral-900" />
        </CardHeader>
        <CardContent className="p-0 divide-y divide-neutral-900">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="size-10 rounded-full bg-neutral-900" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 bg-neutral-900" />
                  <Skeleton className="h-3 w-48 bg-neutral-900" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16 bg-neutral-900" />
                <Skeleton className="h-6 w-32 bg-neutral-900 rounded-full" />
                <Skeleton className="size-8 bg-neutral-900 rounded-lg" />
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

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 overflow-hidden w-full bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Organização</h2>
          <p className="text-neutral-400 mt-1 text-sm">Seu assistente operacional inteligente em tempo real.</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col space-y-8"
      >
        {/* 1. Atalhos Rápidos */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              variant="outline"
              asChild
              className="h-14 flex flex-col items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <Link href="/personal/workouts">
                <Dumbbell className="size-4" />
                <span className="text-[10px] font-semibold tracking-wide uppercase">Criar Treino</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-14 flex flex-col items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <Link href="/personal/clients">
                <UserPlus className="size-4" />
                <span className="text-[10px] font-semibold tracking-wide uppercase">Adicionar Aluno</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-14 flex flex-col items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <Link href="/personal/clients">
                <Send className="size-4" />
                <span className="text-[10px] font-semibold tracking-wide uppercase">Mensagem em Massa</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-14 flex flex-col items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <Link href="/personal/workouts">
                <CopyPlus className="size-4" />
                <span className="text-[10px] font-semibold tracking-wide uppercase">Duplicar Treino</span>
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="h-14 flex flex-col items-center justify-center gap-1 bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-white transition-all cursor-pointer"
            >
              <Link href="/personal/clients">
                <ClipboardList className="size-4" />
                <span className="text-[10px] font-semibold tracking-wide uppercase">Gerar Avaliação</span>
              </Link>
            </Button>
          </div>
        </section>

        {/* 2. Alertas Inteligentes */}
        <section>
          <Card className="border-red-500/20 bg-linear-to-br from-red-500/5 via-neutral-900 to-neutral-950 overflow-hidden shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-2.5">
              <div className="p-2 bg-red-500/10 rounded-full border border-red-500/20">
                <Zap className="size-5 text-red-500 fill-red-500/10 animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-white">Alertas Inteligentes</CardTitle>
                <CardDescription className="text-neutral-400 text-xs">Ações operacionais imediatas para evitar evasão.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/60 border border-neutral-800/60">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={cn("size-4 shrink-0", alert.type === "danger" ? "text-red-500" : "text-yellow-500")} />
                      <span className="text-sm font-medium text-neutral-200">{alert.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAlertAction(alert)}
                      className="h-8 px-3 text-xs bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 hover:border-neutral-700 cursor-pointer transition-all rounded-lg shrink-0"
                    >
                      {alert.action}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Agenda & Pendências */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-neutral-950 border-neutral-800/80 shadow-sm">
            <CardHeader className="border-b border-neutral-900 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <CalendarRange className="size-4 text-primary" />
                    Agenda do Dia
                  </CardTitle>
                  <p className="text-xs text-neutral-400 font-medium ml-6">
                    {new Date().toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    }).replace(/^\w/, (c) => c.toUpperCase())}
                  </p>
                </div>
                
                <Dialog open={isTaskModalOpen} onOpenChange={setIsTaskModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg cursor-pointer transition-all"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md bg-neutral-950 border border-neutral-800 text-white rounded-3xl">
                    <DialogHeader>
                      <DialogTitle className="text-lg font-bold text-white">Nova Tarefa do Dia</DialogTitle>
                      <DialogDescription className="text-neutral-400 text-xs">
                        Adicione um novo compromisso ou lembrete operacional na agenda.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Título da Tarefa</Label>
                        <Input
                          type="text"
                          required
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="Ex: Avaliação Física - João Silva"
                          className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Horário</Label>
                          <Input
                            type="text"
                            required
                            value={newTaskTime}
                            onChange={(e) => setNewTaskTime(e.target.value)}
                            placeholder="Ex: 14:00"
                            className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Categoria</Label>
                          <Select
                            value={newTaskType}
                            onValueChange={(value) => setNewTaskType(value)}
                          >
                            <SelectTrigger className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500 h-10">
                              <SelectValue placeholder="Selecione a categoria" />
                            </SelectTrigger>
                            <SelectContent className="bg-neutral-950 border border-neutral-800 text-white rounded-xl">
                              <SelectItem value="avaliação">Avaliação</SelectItem>
                              <SelectItem value="financeiro">Financeiro</SelectItem>
                              <SelectItem value="check-in">Check-in</SelectItem>
                              <SelectItem value="lembrete">Lembrete</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Aluno Relacionado (Opcional)</Label>
                        <Select
                          value={newTaskStudentId}
                          onValueChange={(value) => setNewTaskStudentId(value)}
                        >
                          <SelectTrigger className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500 h-10">
                            <SelectValue placeholder="Selecione um aluno (Opcional)" />
                          </SelectTrigger>
                          <SelectContent className="bg-neutral-950 border border-neutral-800 text-white rounded-xl">
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
                            className="h-10 px-4 bg-transparent border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer rounded-xl transition-all"
                          >
                            Cancelar
                          </Button>
                        </DialogClose>
                        <Button
                          type="submit"
                          disabled={isSubmittingTask}
                          className="h-10 px-4 bg-primary hover:bg-primary/90 text-white cursor-pointer rounded-xl transition-all flex items-center gap-1.5"
                        >
                          {isSubmittingTask && <Loader2 className="size-4 animate-spin" />}
                          Criar Tarefa
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-2">
                  {dailyAgenda.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 group/task py-1.5 px-2 rounded-xl hover:bg-neutral-900/30 transition-all">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggleTask(item.id, item.completed)}
                          className="shrink-0 cursor-pointer"
                        />
                        <div className="w-10 text-xs font-bold text-neutral-400 text-right shrink-0">
                          {item.time}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm font-semibold leading-none truncate transition-colors",
                              item.completed ? "text-neutral-500 line-through" : "text-neutral-200"
                            )}
                          >
                            {item.title}
                          </p>
                          <p className="text-[10px] text-neutral-500 uppercase font-bold tracking-wider mt-1">
                            {item.type} {item.student?.name && `• Aluno: ${item.student.name}`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditModal(item)}
                          className="size-7 text-neutral-500 hover:text-white hover:bg-neutral-800 rounded-lg cursor-pointer transition-all"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDeleteModal(item)}
                          className="size-7 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer transition-all"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {dailyAgenda.length === 0 && (
                    <p className="text-sm text-neutral-500 text-center py-8">Nenhum evento agendado para hoje.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="bg-neutral-950 border-neutral-800/80 shadow-sm">
            <CardHeader className="border-b border-neutral-900 pb-4">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                Central de Pendências
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-3">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => handlePendingTaskClick(task)}
                      className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/60 bg-neutral-900/30 hover:bg-neutral-900/90 hover:border-neutral-700/80 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-neutral-900 text-neutral-300 group-hover:text-primary rounded-lg border border-neutral-800/80 group-hover:border-primary/20 transition-all">
                          {getPendingIcon(task.icon)}
                        </div>
                        <span className="text-xs font-semibold text-neutral-200 group-hover:text-white transition-colors">{task.title}</span>
                      </div>
                      <Badge variant="secondary" className="font-bold text-xs bg-neutral-800 text-neutral-300 border-none px-2.5 py-0.5 rounded-full shrink-0">
                        {task.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 4. Lista Inteligente de Alunos */}
        <section>
          <Card className="border-neutral-800/80 shadow-md bg-neutral-950">
            <CardHeader className="border-b border-neutral-900 bg-neutral-900/20 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-white">Lista Inteligente de Alunos</CardTitle>
                  <CardDescription className="text-neutral-400 text-xs">Prioridade dinâmica baseada no engajamento e histórico real.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-900">
                {intelligentStudentsList.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 hover:bg-neutral-900/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center size-10 rounded-full bg-neutral-900 border border-neutral-800 text-base shadow-sm">
                        {student.visualStatus}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-neutral-100">{student.name}</p>
                        <p className="text-xs text-neutral-400 mt-0.5">{student.statusText}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="hidden md:flex flex-col items-end">
                        <span className="text-xs text-neutral-500">{student.plan}</span>
                      </div>
                      <Badge variant="outline" className={cn("w-32 justify-center text-[10px] uppercase tracking-wider font-bold py-1", priorityConfig[student.priority]?.badge)}>
                        {priorityConfig[student.priority]?.label || student.priority}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          window.location.href = `/personal/clients?studentId=${student.id}`;
                        }}
                        className="h-8 w-8 text-neutral-500 hover:text-white hover:bg-neutral-900 cursor-pointer rounded-lg transition-all"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {intelligentStudentsList.length === 0 && (
                  <div className="text-center py-12 text-sm text-neutral-500">
                    Nenhum aluno ativo encontrado neste workspace.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </motion.div>

      {/* Edit Task Modal */}
      <Dialog open={isEditTaskModalOpen} onOpenChange={setIsEditTaskModalOpen}>
        <DialogContent className="sm:max-w-md bg-neutral-950 border border-neutral-800 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Editar Tarefa</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs">
              Altere os detalhes deste compromisso ou lembrete.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateTask} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Título da Tarefa</Label>
              <Input
                type="text"
                required
                value={editTaskTitle}
                onChange={(e) => setEditTaskTitle(e.target.value)}
                placeholder="Ex: Avaliação Física - João Silva"
                className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Horário</Label>
                <Input
                  type="text"
                  required
                  value={editTaskTime}
                  onChange={(e) => setEditTaskTime(e.target.value)}
                  placeholder="Ex: 14:00"
                  className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Categoria</Label>
                <Select
                  value={editTaskType}
                  onValueChange={(value) => setEditTaskType(value)}
                >
                  <SelectTrigger className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500 h-10">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-950 border border-neutral-800 text-white rounded-xl">
                    <SelectItem value="avaliação">Avaliação</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="check-in">Check-in</SelectItem>
                    <SelectItem value="lembrete">Lembrete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Aluno Relacionado (Opcional)</Label>
              <Select
                value={editTaskStudentId}
                onValueChange={(value) => setEditTaskStudentId(value)}
              >
                <SelectTrigger className="w-full bg-neutral-900 border border-neutral-800 text-white rounded-xl placeholder-neutral-500 h-10">
                  <SelectValue placeholder="Selecione um aluno (Opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-950 border border-neutral-800 text-white rounded-xl">
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
                  className="h-10 px-4 bg-transparent border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer rounded-xl transition-all"
                >
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmittingEditTask}
                className="h-10 px-4 bg-primary hover:bg-primary/90 text-white cursor-pointer rounded-xl transition-all flex items-center gap-1.5"
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
        <DialogContent className="sm:max-w-md bg-neutral-950 border border-neutral-800 text-white rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Excluir Tarefa</DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs mt-1">
              Tem certeza que deseja excluir a tarefa <span className="text-neutral-200 font-semibold">"{taskToDelete?.title}"</span>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex sm:justify-end gap-2">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 px-4 bg-transparent border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-900 cursor-pointer rounded-xl transition-all"
              >
                Cancelar
              </Button>
            </DialogClose>
            <Button
              type="button"
              onClick={handleDeleteTask}
              disabled={isSubmittingDeleteTask}
              className="h-10 px-4 bg-red-600 hover:bg-red-500 text-white cursor-pointer rounded-xl transition-all flex items-center gap-1.5"
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

