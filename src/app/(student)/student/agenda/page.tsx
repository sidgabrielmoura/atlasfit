"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Info,
  User,
  CalendarDays,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ClipboardList,
  Camera,
  DollarSign,
  AlertTriangle,
  Flame,
  Check,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Animation presets
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

export default function StudentAgendaPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [events, setEvents] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [photoRequestActive, setPhotoRequestActive] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("Em dia");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Calendar interactive states
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Tasks toggling states (to prevent double click & show visual loading per task)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // Photo upload Modal inside agenda
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoBase64, setPhotoBase64] = useState("");
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);

  const loadAgendaData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/agenda");
      if (!res.ok) {
        throw new Error("Erro ao buscar seus agendamentos da agenda.");
      }
      const rawData = await res.json();
      setEvents(rawData.events || []);
      setTasks(rawData.tasks || []);
      setWorkouts(rawData.workouts || []);
      setPhotoRequestActive(rawData.photoRequestActive ?? false);
      setPaymentStatus(rawData.paymentStatus || "Em dia");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar os compromissos da agenda.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadAgendaData();
  }, []);

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    if (updatingTaskId) return; // Prevent concurrent modifications / double click (asyncloader.md compliance)

    setUpdatingTaskId(taskId);
    try {
      const res = await fetch("/api/student/agenda", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          completed: !currentCompleted,
        }),
      });

      if (!res.ok) {
        throw new Error("Falha ao atualizar tarefa.");
      }

      toast.success(!currentCompleted ? "Tarefa marcada como concluída! 🎉" : "Tarefa marcada como pendente.");

      // Update local state smoothly
      setTasks(prev =>
        prev.map(t => (t.id === taskId ? { ...t, completed: !currentCompleted } : t))
      );
      setEvents(prev =>
        prev.map(e => (e.id === taskId ? { ...e, completed: !currentCompleted } : e))
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível atualizar o status da tarefa.");
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoBase64) {
      toast.warning("Por favor, selecione uma foto de progresso.");
      return;
    }

    setIsSubmittingPhoto(true);
    try {
      const res = await fetch("/api/student/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadPhoto",
          photoUrl: photoBase64,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar foto.");

      toast.success("Foto de progresso enviada com sucesso! 📸");
      setIsPhotoModalOpen(false);
      setPhotoFile(null);
      setPhotoBase64("");
      setPhotoRequestActive(false);
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao enviar sua foto de progresso.");
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  if (loading) {
    return <StudentAgendaSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-16">
        <CalendarDays className="size-12 mx-auto text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold">Falha ao carregar sua agenda</h2>
        <p className="text-neutral-400">{error || "Não conseguimos sincronizar seus eventos agendados."}</p>
        <Button onClick={loadAgendaData} variant="outline" className="gap-2">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateFilter(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateFilter(null);
  };

  // Check if a day has event
  const getDayEvents = (dayNum: number) => {
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
    const targetDateStr = `${year}-${formattedMonth}-${formattedDay}`;
    return events.filter(e => e.date === targetDateStr);
  };

  const selectDay = (dayNum: number) => {
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
    const targetDateStr = `${year}-${formattedMonth}-${formattedDay}`;

    if (selectedDateFilter === targetDateStr) {
      setSelectedDateFilter(null); // toggle reset
    } else {
      setSelectedDateFilter(targetDateStr);
    }
  };

  // Filtered upcoming events list
  const filteredEvents = selectedDateFilter
    ? events.filter(e => e.date === selectedDateFilter)
    : events;

  // Format Brazilian readable dates from "yyyy-MM-dd"
  const formatEventDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-");
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getDayNumber = (dateStr: string) => {
    try {
      return dateStr.split("-")[2];
    } catch (e) {
      return "";
    }
  };

  const getDayName = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split("-");
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
      return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
    } catch (e) {
      return "";
    }
  };

  // Weekly routine generation
  // Map dayOfWeek numbers to local labels
  const weekdaysMapping = [
    { num: 1, name: "Segunda-feira", short: "SEG" },
    { num: 2, name: "Terça-feira", short: "TER" },
    { num: 3, name: "Quarta-feira", short: "QUA" },
    { num: 4, name: "Quinta-feira", short: "QUI" },
    { num: 5, name: "Sexta-feira", short: "SEX" },
    { num: 6, name: "Sábado", short: "SÁB" },
    { num: 0, name: "Domingo", short: "DOM" },
  ];

  // Today's day of week number (0 = Sunday, 1 = Monday...)
  const todayDayOfWeek = new Date().getDay();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto pb-24 animate-in fade-in duration-500">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="size-6 text-primary animate-pulse" />
            Minha Agenda & Compromissos
          </h1>
          <p className="text-sm text-neutral-400">
            Gerencie sua rotina semanal de treinos, check-ins, tarefas atribuídas e avaliações físicas.
          </p>
        </div>
      </div>

      {/* Tabs Container */}
      <Tabs defaultValue="agenda" className="space-y-6">
        <TabsList className="bg-neutral-900/60 p-1 border border-neutral-800 rounded-xl flex overflow-x-auto whitespace-nowrap md:w-fit gap-1 w-full justify-start scrollbar-none">
          <TabsTrigger
            value="agenda"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <CalendarDays className="size-4" /> Calendário e Compromissos
          </TabsTrigger>
          <TabsTrigger
            value="routine"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Flame className="size-4" /> Rotina Semanal
          </TabsTrigger>
          <TabsTrigger
            value="tasks"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <ClipboardList className="size-4" /> Tarefas & Check-ins
            {tasks.filter(t => !t.completed).length > 0 && (
              <Badge className="bg-rose-500/20 text-rose-450 border border-rose-500/30 text-[9px] font-black shrink-0 ml-1 py-0 px-1.5 rounded-full">
                {tasks.filter(t => !t.completed).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="agenda" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="grid grid-cols-1 gap-4">
            {(paymentStatus === "Pendente" || paymentStatus === "Expirado") && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                <Card className="border w-full border-rose-500/20 bg-rose-500/5 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                      <AlertTriangle className="size-5" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-rose-400">Mensalidade Pendente</h4>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        Seu plano está com o status financeiro de <strong className="text-rose-550">{paymentStatus}</strong>.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-500/20 hover:bg-rose-550/10 text-xs font-bold text-rose-400 rounded-xl h-9 whitespace-nowrap"
                    onClick={() => window.location.href = "/student/finance"}
                  >
                    Resolver Agora
                  </Button>
                </Card>
              </motion.div>
            )}

            {photoRequestActive && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border border-primary/20 bg-primary/5 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-center">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-primary">Fotos de Progresso</h4>
                      <p className="text-[11px] text-neutral-400 font-medium">
                        Você não enviou fotos de progresso essa semana. Envie para o personal acompanhar.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary cursor-pointer text-primary-foreground hover:bg-primary/90 text-xs font-bold rounded-xl h-9 whitespace-nowrap"
                    onClick={() => setIsPhotoModalOpen(true)}
                  >
                    Enviar Foto Agora
                  </Button>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Main Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Scheduled Timeline List */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  {selectedDateFilter ? `Filtrando data: ${formatEventDate(selectedDateFilter)}` : "Próximos Compromissos"}
                </h3>
                {selectedDateFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDateFilter(null)}
                    className="text-[10px] uppercase font-bold text-primary hover:bg-primary/10 h-7 rounded-lg"
                  >
                    Ver Todos os Eventos
                  </Button>
                )}
              </div>

              {filteredEvents.length === 0 ? (
                <Card className="border border-dashed border-neutral-800 bg-neutral-950/20 p-8 rounded-2xl text-center">
                  <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                    <div className="p-4 rounded-full bg-neutral-900/80 text-neutral-500 border border-neutral-800">
                      <CalendarDays className="size-8" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Nenhum evento nesta data</h4>
                      <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                        Não há sessões presenciais, check-ins ou avaliações físicas para este dia específico.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {filteredEvents.map((event) => (
                    <motion.div key={event.id} variants={itemVariants}>
                      <Card className="border border-white/[0.06] bg-neutral-955/20 hover:border-primary/20 transition-all rounded-2xl overflow-hidden shadow-md">
                        <CardContent className="p-5 flex flex-col sm:flex-row gap-5">
                          {/* Day block tag */}
                          <div className="flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-0 size-full sm:size-20 rounded-xl bg-neutral-900 border border-white/[0.04] shrink-0 py-3 sm:py-0">
                            <span className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">
                              {getDayName(event.date)}
                            </span>
                            <span className="text-2xl font-black text-foreground">
                              {getDayNumber(event.date)}
                            </span>
                          </div>

                          {/* Main schedule information */}
                          <div className="flex-1 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <div className="space-y-1">
                                <h4 className="text-base font-extrabold text-foreground group-hover:text-primary transition-colors">
                                  {event.title}
                                </h4>
                                <div className="flex flex-wrap items-center gap-4 pt-0.5">
                                  <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                                    <Clock className="size-3.5 text-primary shrink-0" /> {event.time}
                                  </span>
                                  <span className="text-xs font-semibold text-neutral-400 flex items-center gap-1.5">
                                    <MapPin className="size-3.5 text-primary shrink-0" /> {event.location}
                                  </span>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "w-fit text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border-none shadow-none",
                                  event.type === "Avaliação" || event.type.includes("Dobra") || event.type.includes("Pollock")
                                    ? "bg-amber-500/10 text-amber-400"
                                    : event.type === "Bioimpedância"
                                      ? "bg-purple-500/10 text-purple-400"
                                      : event.type === "Check-in"
                                        ? "bg-sky-500/10 text-sky-400"
                                        : event.type === "Aula"
                                          ? "bg-blue-500/10 text-blue-400"
                                          : event.type === "Financeiro"
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : event.type === "Lembrete"
                                              ? "bg-zinc-500/10 text-zinc-400"
                                              : "bg-primary/10 text-primary"
                                )}
                              >
                                {event.type}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-white/[0.04] text-[11px] text-neutral-400">
                              <div className="flex items-center gap-2">
                                <User className="size-3.5 text-neutral-500 shrink-0" />
                                <span className="font-bold text-neutral-300">{event.personal}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {event.completed ? (
                                  <span className="text-emerald-450 font-bold flex items-center gap-1">
                                    <CheckCircle className="size-3.5 fill-emerald-500/10" /> Concluído
                                  </span>
                                ) : (
                                  <span className="text-neutral-500 italic font-medium flex items-center gap-1">
                                    <Info className="size-3.5" /> Confirmado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Right Column: Calendar Widget */}
            <div className="space-y-6">
              <Card className="border border-white/[0.06] bg-neutral-950/40 p-5 rounded-2xl">
                {/* Calendar header controls */}
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-black text-xs uppercase tracking-widest text-foreground">
                    {monthNames[month]} {year}
                  </h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handlePrevMonth}
                      className="size-8 rounded-lg border border-white/[0.08] hover:bg-neutral-900 cursor-pointer"
                    >
                      <ChevronLeft className="size-4 text-neutral-300" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleNextMonth}
                      className="size-8 rounded-lg border border-white/[0.08] hover:bg-neutral-900 cursor-pointer"
                    >
                      <ChevronRight className="size-4 text-neutral-300" />
                    </Button>
                  </div>
                </div>

                {/* Weekdays header */}
                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                  {["D", "S", "T", "Q", "Q", "S", "S"].map((day, idx) => (
                    <span key={idx} className="text-[10px] font-black text-neutral-500 uppercase">
                      {day}
                    </span>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty offset spaces */}
                  {Array.from({ length: firstDayOfMonth }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square" />
                  ))}

                  {/* Real days */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const dayEvents = getDayEvents(dayNum);
                    const hasEvent = dayEvents.length > 0;

                    // Today validation
                    const today = new Date();
                    const isToday =
                      today.getDate() === dayNum &&
                      today.getMonth() === month &&
                      today.getFullYear() === year;

                    // Active filter selection
                    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                    const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
                    const targetDateStr = `${year}-${formattedMonth}-${formattedDay}`;
                    const isSelected = selectedDateFilter === targetDateStr;

                    return (
                      <div
                        key={dayNum}
                        onClick={() => selectDay(dayNum)}
                        className={cn(
                          "aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all relative cursor-pointer",
                          isToday
                            ? "bg-primary text-primary-foreground font-black shadow-md shadow-primary/20 scale-105"
                            : isSelected
                              ? "bg-neutral-800 text-white font-extrabold border border-white/10"
                              : "hover:bg-secondary/40 text-neutral-300",
                          hasEvent && !isToday && !isSelected && "text-primary font-black bg-primary/10 hover:bg-primary/20"
                        )}
                      >
                        <span>{dayNum}</span>
                        {hasEvent && (
                          <span
                            className={cn(
                              "absolute bottom-1 size-1 rounded-full",
                              isToday ? "bg-white" : "bg-primary animate-pulse"
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Attention and policy card */}
              <Card className="bg-amber-500/5 border border-dashed border-amber-500/20 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-amber-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">
                    Política de Agendamentos
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-medium">
                  Eventuais desmarcações, ausências ou reagendamentos das sessões presenciais devem ser acordadas diretamente com o seu personal trainer com no mínimo **24h de antecedência**, evitando cancelamentos automáticos.
                </p>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="routine" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Flame className="size-5 text-primary animate-pulse" /> Mapeamento de Treinos Semanais
            </h3>
            <p className="text-xs text-neutral-400">
              Visualize sua grade semanal com os dias de treino atribuídos pelo personal e seus respectivos dias de descanso.
            </p>
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {weekdaysMapping.map((day) => {
              const dayWorkouts = workouts.filter((w) => w.dayOfWeek === day.num);
              const isToday = todayDayOfWeek === day.num;

              return (
                <motion.div key={day.num} variants={itemVariants} className="h-full">
                  <Card
                    className={cn(
                      "h-full border transition-all rounded-2xl overflow-hidden flex flex-col p-4 space-y-4",
                      isToday
                        ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/5 ring-1 ring-primary/20 scale-[1.02]"
                        : "border-white/[0.06] bg-neutral-950/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                        {day.name}
                      </span>
                      {isToday && (
                        <Badge className="bg-primary text-primary-foreground font-black text-[9px] py-0 px-2 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
                          Hoje
                        </Badge>
                      )}
                    </div>

                    {dayWorkouts.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center space-y-2">
                        <div className="size-10 rounded-full bg-neutral-900 border border-white/[0.04] flex items-center justify-center text-neutral-500">
                          <CoffeeIcon className="size-4" />
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-xs font-bold text-neutral-350">Recuperação</h5>
                          <span className="text-[10px] font-semibold text-emerald-450 uppercase tracking-widest">
                            Descanso / Off
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-between space-y-4">
                        {dayWorkouts.map((w) => (
                          <div key={w.id} className="space-y-3">
                            <div className="space-y-1">
                              <h5 className="text-sm font-extrabold text-foreground leading-tight tracking-tight">
                                {w.name}
                              </h5>
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
                                <TrendingUp className="size-3" /> {w.muscleGroupLabel || "Foco Geral"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-semibold text-neutral-400">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3 text-primary" /> {w.duration}
                              </span>
                              <span className="flex items-center gap-1">
                                <Flame className="size-3 text-primary" /> {w.difficulty}
                              </span>
                            </div>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          className="w-full bg-neutral-900 hover:bg-neutral-850 text-[10px] font-black uppercase text-neutral-300 rounded-xl h-8 cursor-pointer border border-white/[0.04]"
                          onClick={() => window.location.href = "/student/workouts"}
                        >
                          Ir para Treinos
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </TabsContent>

        {/* ==================== TAB 3: TAREFAS & CHECK-INS ==================== */}
        <TabsContent value="tasks" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.04] pb-4">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <ClipboardList className="size-5 text-primary" /> Minhas Tarefas e Checklist
              </h3>
              <p className="text-xs text-neutral-400">
                Acompanhe o cumprimento de suas tarefas e check-ins agendados com o personal trainer.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-neutral-900 text-neutral-300 font-bold border-white/[0.08] py-1 px-3">
                {tasks.filter(t => t.completed).length} de {tasks.length} Concluídas
              </Badge>
            </div>
          </div>

          {tasks.length === 0 ? (
            <Card className="border border-dashed border-neutral-800 bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-neutral-900/80 text-neutral-500 border border-neutral-800">
                  <ClipboardList className="size-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-foreground">Nenhuma tarefa pendente</h4>
                  <p className="text-xs text-neutral-400 max-w-xs mx-auto">
                    Seu personal trainer ainda não atribuiu tarefas ou checklists específicas para você.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {tasks.map((task) => {
                const isTaskUpdating = updatingTaskId === task.id;

                return (
                  <motion.div key={task.id} variants={itemVariants}>
                    <Card
                      className={cn(
                        "border transition-all rounded-2xl overflow-hidden shadow-sm flex items-start gap-4 p-5 cursor-pointer hover:border-primary/20",
                        task.completed
                          ? "border-emerald-500/10 bg-emerald-500/[0.01]"
                          : "border-white/[0.06] bg-neutral-950/20"
                      )}
                      onClick={() => handleToggleTask(task.id, task.completed)}
                    >
                      {/* Check-circle toggle button */}
                      <button
                        disabled={isTaskUpdating}
                        className={cn(
                          "size-6 rounded-lg border flex items-center justify-center shrink-0 transition-all",
                          task.completed
                            ? "bg-emerald-500 border-emerald-500 text-neutral-950 shadow-md shadow-emerald-500/20"
                            : "border-white/[0.12] hover:bg-white/5 text-transparent"
                        )}
                      >
                        {isTaskUpdating ? (
                          <Loader2 className="size-3.5 animate-spin text-neutral-400" />
                        ) : (
                          <Check className="size-4 stroke-[3]" />
                        )}
                      </button>

                      {/* Task details */}
                      <div className="flex-1 space-y-2">
                        <div className="space-y-1">
                          <h4
                            className={cn(
                              "text-sm font-bold leading-tight transition-all",
                              task.completed ? "text-neutral-450 line-through" : "text-foreground"
                            )}
                          >
                            {task.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-3 pt-0.5">
                            <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
                              <Clock className="size-3 text-primary shrink-0" /> {task.time}
                            </span>
                            <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1">
                              <CalendarDays className="size-3 text-primary shrink-0" /> {formatEventDate(task.scheduledDate)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04]">
                          <Badge
                            className={cn(
                              "text-[8px] font-black uppercase tracking-wider py-0 px-2 rounded-full border-none shadow-none",
                              task.type === "avaliação"
                                ? "bg-amber-500/10 text-amber-400"
                                : task.type === "check-in"
                                  ? "bg-sky-500/10 text-sky-400"
                                  : task.type === "financeiro"
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-neutral-800 text-neutral-400"
                            )}
                          >
                            {task.type}
                          </Badge>

                          {task.completed ? (
                            <span className="text-[10px] font-bold text-emerald-450 flex items-center gap-0.5">
                              Concluído
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-neutral-500 flex items-center gap-0.5">
                              {isTaskUpdating ? "Salvando..." : "Pendente"}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>

      {/* Progress Photo Dialog Upload Inside Agenda */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="border border-white/[0.08] bg-neutral-950 p-6 rounded-2xl max-w-md w-full">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <Camera className="size-5 text-primary" /> Enviar Foto de Progresso
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-450">
              Selecione uma imagem de frente, costas ou lado para que o seu personal possa auditar sua evolução física.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePhotoSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-300">Selecione seu Arquivo de Foto</Label>
              <div className="flex flex-col items-center justify-center border border-dashed border-white/[0.08] bg-neutral-900/40 rounded-xl p-6 text-center hover:bg-neutral-900 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {photoBase64 ? (
                  <div className="space-y-2 size-full">
                    <img
                      src={photoBase64}
                      alt="Preview"
                      className="h-32 object-contain mx-auto rounded-lg border border-white/[0.08]"
                    />
                    <span className="text-[10px] text-neutral-400 font-bold block truncate">
                      {photoFile?.name}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Camera className="size-8 mx-auto text-neutral-500 animate-pulse" />
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-foreground">Clique para Escolher</span>
                      <p className="text-[10px] text-neutral-500">Imagens PNG, JPG ou WEBP</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0 flex flex-col sm:flex-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsPhotoModalOpen(false)}
                className="text-xs font-bold text-neutral-400 hover:bg-neutral-900 rounded-xl h-11 flex-1 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingPhoto || !photoBase64}
                className="bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-bold rounded-xl h-11 flex-1 cursor-pointer"
              >
                {isSubmittingPhoto ? "Enviando..." : "Enviar Foto"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Simple Coffee Icon component
function CoffeeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}

// Skeleton loading layout for compliance (skelletonsloaders.md)
function StudentAgendaSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-white/[0.04] pb-4">
        <Skeleton className="h-8 w-64 bg-neutral-900" />
        <Skeleton className="h-4 w-96 bg-neutral-900" />
      </div>

      {/* Tabs list Skeleton */}
      <div className="flex gap-2 max-w-md">
        <Skeleton className="h-10 w-28 bg-neutral-900 rounded-xl" />
        <Skeleton className="h-10 w-28 bg-neutral-900 rounded-xl" />
        <Skeleton className="h-10 w-28 bg-neutral-900 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event List Skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-4 w-40 bg-neutral-900" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 bg-neutral-900 rounded-2xl" />
          ))}
        </div>

        {/* Side Widget Skeleton */}
        <div className="space-y-6">
          <Skeleton className="h-[280px] bg-neutral-900 rounded-2xl" />
          <Skeleton className="h-24 bg-neutral-900 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
