"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, CalendarDays, Pencil, Trash2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { color: string; label: string }> = {
  avaliação: { color: "bg-purple-500/10 text-purple-400 border-purple-500/20", label: "Avaliação" },
  financeiro: { color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", label: "Financeiro" },
  aula: { color: "bg-blue-500/10 text-blue-400 border-blue-500/20", label: "Aula" },
  "check-in": { color: "bg-amber-500/10 text-amber-400 border-amber-500/20", label: "Check-in" },
  lembrete: { color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20", label: "Lembrete" },
};

interface TaskItem {
  id: string;
  title: string;
  time: string;
  type: string;
  completed: boolean;
  createdAt: string;
  studentId?: string | null;
  student?: {
    id: string;
    name: string;
  } | null;
}

export default function CalendarPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Creation State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    time: "09:00",
    type: "lembrete",
    studentId: "none",
  });

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskItem | null>(null);
  const [editTaskData, setEditTaskData] = useState({
    title: "",
    time: "09:00",
    type: "lembrete",
    studentId: "none",
  });

  // Delete State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";

  const fetchTasks = async () => {
    if (!activeWorkspaceId || !selectedDateStr) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/personal/organization?workspaceId=${activeWorkspaceId}&date=${selectedDateStr}`
      );
      if (!response.ok) {
        throw new Error("Não foi possível buscar as tarefas diárias.");
      }
      const data = await response.json();
      setTasks(data.dailyAgenda || []);
      if (data.intelligentStudentsList) {
        setStudents(data.intelligentStudentsList.map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch (err: any) {
      console.error("Error fetching tasks for date:", err);
      setError(err.message || "Erro de conexão ao buscar tarefas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspaceId, selectedDateStr]);

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
        throw new Error("Falha ao sincronizar a tarefa.");
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, completed: !currentCompleted } : t))
      );

      toast.success(currentCompleted ? "Lembrete pendente!" : "Lembrete concluído!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status do lembrete.");
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim() || !newTask.time.trim() || !activeWorkspaceId) return;

    setIsSubmittingCreate(true);
    try {
      const response = await fetch("/api/personal/organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          title: newTask.title,
          time: newTask.time,
          type: newTask.type,
          date: selectedDateStr,
          studentId: newTask.studentId && newTask.studentId !== "none" ? newTask.studentId : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível salvar a tarefa diária.");
      }

      await fetchTasks();
      setIsCreateModalOpen(false);
      setNewTask({ title: "", time: "09:00", type: "lembrete", studentId: "none" });
      toast.success("Tarefa diária criada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar tarefa diária.");
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleEditClick = (task: TaskItem) => {
    setTaskToEdit(task);
    setEditTaskData({
      title: task.title,
      time: task.time,
      type: task.type,
      studentId: task.studentId || "none",
    });
    setIsEditModalOpen(true);
  };

  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskToEdit || !editTaskData.title.trim() || !editTaskData.time.trim() || !activeWorkspaceId) return;

    setIsSubmittingEdit(true);
    try {
      const response = await fetch("/api/personal/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: taskToEdit.id,
          workspaceId: activeWorkspaceId,
          title: editTaskData.title,
          time: editTaskData.time,
          type: editTaskData.type,
          studentId: editTaskData.studentId && editTaskData.studentId !== "none" ? editTaskData.studentId : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar a tarefa.");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskToEdit.id
            ? { ...t, title: editTaskData.title, time: editTaskData.time, type: editTaskData.type, studentId: editTaskData.studentId }
            : t
        )
      );

      setIsEditModalOpen(false);
      toast.success("Tarefa atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar a tarefa.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteClick = (task: TaskItem) => {
    setTaskToDelete(task);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete || !activeWorkspaceId) return;

    setIsSubmittingDelete(true);
    try {
      const response = await fetch(
        `/api/personal/organization?taskId=${taskToDelete.id}&workspaceId=${activeWorkspaceId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Não foi possível excluir a tarefa.");
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      setIsDeleteModalOpen(false);
      toast.success("Tarefa removida com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir tarefa diária.");
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const calendarCard = (
    <Card className="flex-1 border-border bg-card shadow-sm flex flex-col rounded-2xl overflow-hidden">
      <CardContent className="p-6 flex flex-1 items-center justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          locale={ptBR}
          className="w-full flex justify-center scale-100 sm:scale-110 lg:scale-100 xl:scale-110 origin-center text-foreground"
          classNames={{
            day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            day_today: "bg-accent text-accent-foreground font-semibold rounded-md",
            head_cell: "text-muted-foreground font-medium text-[0.8rem] w-12",
            cell: "h-12 w-12 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day: cn("h-12 w-12 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md cursor-pointer transition-colors"),
          }}
        />
      </CardContent>
    </Card>
  );

  const tasksCard = (
    <Card className="flex-1 border-border bg-card shadow-sm flex flex-col rounded-2xl overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/40">
        <CardTitle className="flex items-center justify-between">
          <span className="text-foreground text-lg">
            {date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
          </span>
          <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary border border-primary/20">
            {tasks.length} {tasks.length === 1 ? "tarefa" : "tarefas"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 flex flex-col">
        <ScrollArea className="flex-1 h-[450px] lg:h-auto">
          {isLoading ? (
            <div className="divide-y divide-border/50">
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-6 flex items-start gap-6 animate-pulse">
                  <div className="flex flex-col items-center mt-1 space-y-2">
                    <Skeleton className="h-6 w-12 rounded bg-muted" />
                    <Skeleton className="h-3 w-8 rounded bg-muted" />
                  </div>
                  <div className="w-px h-12 bg-border mx-2 hidden sm:block"></div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-2/3 rounded bg-muted" />
                      <Skeleton className="h-4 w-16 rounded-full bg-muted" />
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-3 w-24 rounded bg-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                <AlertCircle className="size-8" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Falha ao carregar as tarefas</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[280px] mx-auto">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchTasks} className="mt-4 border-border text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          ) : tasks.length > 0 ? (
            <div className="divide-y divide-border/40">
              {tasks.map((task) => (
                <div key={task.id} className="p-6 flex items-start gap-6 hover:bg-secondary/30 transition-colors group/task">
                  <div className="flex items-center gap-4 shrink-0">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(task.id, task.completed)}
                      className="size-5 cursor-pointer rounded-md shrink-0"
                    />
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-foreground leading-none">{task.time}</span>
                      <span className="text-[10px] text-muted-foreground uppercase mt-1 tracking-wider font-bold">Horário</span>
                    </div>
                  </div>

                  <div className="w-px h-12 bg-border/40 mx-2 hidden sm:block"></div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h4 className={cn(
                          "text-base font-semibold leading-tight truncate transition-colors",
                          task.completed ? "text-muted-foreground line-through font-medium" : "text-foreground"
                        )}>
                          {task.title}
                        </h4>
                        <Badge variant="outline" className={cn("text-[9px] uppercase tracking-wider font-bold mt-1.5 px-2 py-0.5", typeConfig[task.type]?.color)}>
                          {typeConfig[task.type]?.label || task.type}
                        </Badge>
                        {task.student?.name && (
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider font-bold mt-1.5 px-2 py-0.5 bg-muted border-border text-muted-foreground ml-1.5">
                            Aluno: {task.student.name}
                          </Badge>
                        )}
                      </div>

                      {/* Ações Rápidas Inline */}
                      <div className="flex items-center gap-1 opacity-0 group-hover/task:opacity-100 transition-opacity duration-200 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(task)}
                          className="size-8 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg cursor-pointer transition-all"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(task)}
                          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer transition-all"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        Duração est.: 1h
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-12 space-y-4">
              <div className="p-4 rounded-full bg-muted text-muted-foreground border border-border">
                <CalendarDays className="size-8 opacity-60" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">Nenhum compromisso agendado</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-[280px] mx-auto">
                  Você tem o dia livre. Clique em "Nova Tarefa" para adicionar um compromisso ou lembrete.
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex-1 flex flex-col space-y-8 p-4 md:p-8 pt-6 overflow-hidden w-full h-full min-h-[calc(100vh-2rem)] bg-background">
      <div className="flex flex-col max-sm:gap-4 sm:flex-row items-start sm:items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Tarefas Diárias</h2>
          <p className="text-muted-foreground mt-1 text-sm">Gerencie sua rotina operacional, atendimentos e lembretes importantes.</p>
        </div>

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer rounded-xl font-semibold max-sm:w-full">
              <Plus className="mr-2 size-4" />
              Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border border-border text-foreground rounded-3xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-foreground">Nova Tarefa Diária</DialogTitle>
              <DialogDescription className="text-muted-foreground text-xs">
                Crie um compromisso ou lembrete importante para {date ? format(date, "dd/MM/yyyy") : "a data selecionada"}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateTask} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Título da Tarefa</Label>
                <Input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Ex: Avaliação Física - João Silva"
                  className="w-full bg-muted/50 border border-border text-foreground rounded-xl placeholder-muted-foreground focus-visible:ring-primary/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horário</Label>
                  <Input
                    type="time"
                    required
                    value={newTask.time}
                    onChange={(e) => setNewTask({ ...newTask, time: e.target.value })}
                    className="w-full bg-muted/50 border border-border text-foreground rounded-xl focus-visible:ring-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                  <Select
                    value={newTask.type}
                    onValueChange={(val) => setNewTask({ ...newTask, type: val })}
                  >
                    <SelectTrigger className="w-full bg-muted/50 border border-border text-foreground rounded-xl h-10 focus:ring-primary/50">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border text-foreground rounded-xl">
                      <SelectItem value="aula">Aula</SelectItem>
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
                  value={newTask.studentId}
                  onValueChange={(val) => setNewTask({ ...newTask, studentId: val })}
                >
                  <SelectTrigger className="w-full bg-muted/50 border border-border text-foreground rounded-xl h-10 focus:ring-primary/50">
                    <SelectValue placeholder="Selecione um aluno (Opcional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border text-foreground rounded-xl">
                    <SelectItem value="none">Nenhum (Geral / Lembrete)</SelectItem>
                    {students.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-4 flex sm:justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 px-4 bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer rounded-xl transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingCreate}
                  className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer rounded-xl transition-all flex items-center gap-1.5 font-semibold"
                >
                  {isSubmittingCreate ? "Salvando..." : "Criar Tarefa"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col flex-1 w-full"
      >
        {/* Mobile View with Tabs */}
        <div className="block lg:hidden w-full">
          <Tabs defaultValue="calendario" className="w-full">
            <TabsList className="grid grid-cols-2 bg-secondary/15 border border-border/30 rounded-xl p-1 mb-4">
              <TabsTrigger value="calendario" className="text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 py-2">
                <CalendarDays className="size-4" />
                <span>Calendário</span>
              </TabsTrigger>
              <TabsTrigger value="tarefas" className="text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 py-2">
                <Clock className="size-4" />
                <span>Tarefas do Dia</span>
                <Badge variant="secondary" className="font-bold text-[9px] size-4 flex items-center justify-center p-0 rounded-full bg-primary text-primary-foreground ml-1 shrink-0">
                  {tasks.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendario" className="outline-none m-0">
              {calendarCard}
            </TabsContent>
            
            <TabsContent value="tarefas" className="outline-none m-0">
              {tasksCard}
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop View with Grid */}
        <div className="hidden lg:grid grid-cols-12 gap-8 flex-1 w-full">
          <div className="lg:col-span-5 flex flex-col h-full">
            {calendarCard}
          </div>
          <div className="lg:col-span-7 flex flex-col h-full">
            {tasksCard}
          </div>
        </div>
      </motion.div>

      {/* Modal de Edição de Tarefa */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-foreground rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Editar Tarefa Diária</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Atualize as informações operacionais desta tarefa.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTask} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Título da Tarefa</Label>
              <Input
                type="text"
                required
                value={editTaskData.title}
                onChange={(e) => setEditTaskData({ ...editTaskData, title: e.target.value })}
                className="w-full bg-muted/50 border border-border text-foreground rounded-xl placeholder-muted-foreground focus-visible:ring-primary/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Horário</Label>
                <Input
                  type="time"
                  required
                  value={editTaskData.time}
                  onChange={(e) => setEditTaskData({ ...editTaskData, time: e.target.value })}
                  className="w-full bg-muted/50 border border-border text-foreground rounded-xl focus-visible:ring-primary/50"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Categoria</Label>
                <Select
                  value={editTaskData.type}
                  onValueChange={(val) => setEditTaskData({ ...editTaskData, type: val })}
                >
                  <SelectTrigger className="w-full bg-muted/50 border border-border text-foreground rounded-xl h-10 focus:ring-primary/50">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border text-foreground rounded-xl">
                    <SelectItem value="aula">Aula</SelectItem>
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
                value={editTaskData.studentId}
                onValueChange={(val) => setEditTaskData({ ...editTaskData, studentId: val })}
              >
                <SelectTrigger className="w-full bg-muted/50 border border-border text-foreground rounded-xl h-10 focus:ring-primary/50">
                  <SelectValue placeholder="Selecione um aluno (Opcional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border text-foreground rounded-xl">
                  <SelectItem value="none">Nenhum (Geral / Lembrete)</SelectItem>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 flex sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                className="h-10 px-4 bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer rounded-xl transition-all"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingEdit}
                className="h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer rounded-xl transition-all flex items-center gap-1.5 font-semibold"
              >
                {isSubmittingEdit ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-card border border-border text-foreground rounded-3xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-foreground">Tem certeza?</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Esta ação não poderá ser desfeita. A tarefa diária <strong>"{taskToDelete?.title}"</strong> será excluída definitivamente de seus compromissos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4 flex sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="h-10 px-4 bg-transparent border-border text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer rounded-xl transition-all"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isSubmittingDelete}
              className="h-10 px-4 bg-red-600 hover:bg-red-700 text-white cursor-pointer rounded-xl transition-all flex items-center gap-1.5 font-semibold"
            >
              {isSubmittingDelete ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
