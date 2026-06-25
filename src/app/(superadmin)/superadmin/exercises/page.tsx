"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dumbbell,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Video,
  Tag,
  MoreVertical,
  Clock,
  BadgeCheck,
  Filter,
  Play,
  Settings2,
  Loader2,
  Upload,
  Link as LinkIcon,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Send,
  MessageSquare,
  Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect, Suspense } from "react";
import { ExerciseThumbnail, ExercisePreviewModal } from "@/components/application/exercise-preview-modal";
import { useSearchParams } from "next/navigation";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import {
  Pagination as ShadcnPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const generatePages = (currentPage: number, totalPages: number) => {
  const pages: (number | string)[] = [];
  const maxVisible = 5;

  if (totalPages <= maxVisible) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) {
      pages.push("ellipsis-1");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("ellipsis-2");
    }
    pages.push(totalPages);
  }

  return pages;
};

function ExercisesContent() {
  const snap = useSnapshot(superAdminStore);
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("q") || "";

  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [searchPending, setSearchPending] = useState(initialSearch);
  const [searchConfig, setSearchConfig] = useState(initialSearch);
  const [searchOfficial, setSearchOfficial] = useState(initialSearch);

  const [configForm, setConfigForm] = useState<{
    name: string;
    videoUrl: string;
    muscleGroupId: string;
    muscleGroupIds: string[];
    isOfficial: boolean;
  }>({
    name: "",
    videoUrl: "",
    muscleGroupId: "",
    muscleGroupIds: [],
    isOfficial: true
  });

  // States para Solicitações de Reajuste
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loadingAdjustments, setLoadingAdjustments] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<any>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [resolvingRequest, setResolvingRequest] = useState(false);
  const [isAllResolvedOpen, setIsAllResolvedOpen] = useState(false);

  const getRemainingTime = (updatedAt: string) => {
    const now = new Date();
    const resolvedDate = new Date(updatedAt);
    const diffTime = now.getTime() - resolvedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const remaining = Math.max(0, 7 - diffDays);

    let badgeColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (diffDays > 3 && diffDays <= 5) {
      badgeColor = "text-amber-500 bg-amber-500/10 border-amber-500/20";
    } else if (diffDays > 5) {
      badgeColor = "text-rose-500 bg-rose-500/10 border-rose-500/20";
    }

    return {
      remaining,
      badgeColor
    };
  };

  const renderAdjustmentCard = (request: any, isResolved: boolean) => {
    const unreadMessagesCount = request.messages.filter(
      (m: any) => m.senderId !== null && m.sender?.role !== "SUPERADMIN" && !m.isReadByAdmin
    ).length;

    const timeInfo = isResolved ? getRemainingTime(request.updatedAt) : null;

    return (
      <Card
        key={request.id}
        className={cn(
          "border-border/40 p-0 hover:border-primary/45 bg-card/40 hover:bg-card/75 transition-all cursor-pointer relative group rounded-xl",
          unreadMessagesCount > 0 && "border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10"
        )}
        onClick={() => handleOpenReplyModal(request)}
      >
        <CardContent className="p-3.5 space-y-2">
          <div className="flex justify-between items-start gap-2">
            <div className="space-y-0.5 min-w-0">
              <h4 className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate">
                {request.exercise?.name || "Exercício"}
              </h4>
              <p className="text-[10px] text-muted-foreground font-semibold">
                De: {request.requester?.name || "Trainer"} • {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {unreadMessagesCount > 0 && (
                <span className="flex h-4 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shrink-0">
                  {unreadMessagesCount}
                </span>
              )}
              {isResolved && timeInfo && (
                <span className={cn("text-[9px] px-2 py-0.5 rounded-md font-bold border shrink-0", timeInfo.badgeColor)}>
                  {timeInfo.remaining}d restante{timeInfo.remaining !== 1 && "s"}
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
            {request.description}
          </p>
        </CardContent>
      </Card>
    );
  };

  const fetchAdjustments = async () => {
    setLoadingAdjustments(true);
    try {
      const res = await fetch("/api/admin/exercises/adjustments");
      if (res.ok) {
        const data = await res.json();
        setAdjustments(data);

        // Se houver um ajuste aberto, atualiza suas mensagens também (para manter chat sincronizado)
        if (selectedAdjustment) {
          const updated = data.find((a: any) => a.id === selectedAdjustment.id);
          if (updated) {
            setSelectedAdjustment((prev: any) => {
              if (!prev) return null;
              // Preserva as mensagens atualizadas que podem ter sido carregadas individualmente
              return { ...updated, messages: updated.messages || prev.messages };
            });
          }
        }
      }
    } catch (error) {
      console.error("Erro ao buscar reajustes:", error);
    } finally {
      setLoadingAdjustments(false);
    }
  };

  const handleOpenReplyModal = async (request: any) => {
    setSelectedAdjustment(request);
    setIsReplyModalOpen(true);

    // Fetch individual thread to mark messages as read by admin on the backend
    try {
      const res = await fetch(`/api/personal/workouts/exercises/adjustments/${request.id}/messages`);
      if (res.ok) {
        const messages = await res.json();
        setSelectedAdjustment((prev: any) => prev ? { ...prev, messages } : null);

        // Também atualiza a lista geral para atualizar indicadores e contagens
        fetchAdjustments();
      }
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all");

  useEffect(() => {
    superAdminActions.fetchExercises();
    superAdminActions.fetchPendingExercises();
    superAdminActions.fetchNeedsConfigExercises();
    superAdminActions.fetchMuscleGroups();
    fetchAdjustments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      superAdminActions.setExerciseFilters({
        search: searchOfficial,
        muscleGroupId: selectedMuscleGroup,
        page: 1
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchOfficial, selectedMuscleGroup]);

  // Efeito secundário para atualização do chat ativo
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isReplyModalOpen && selectedAdjustment) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/personal/workouts/exercises/adjustments/${selectedAdjustment.id}/messages`);
          if (res.ok) {
            const messages = await res.json();
            setSelectedAdjustment((prev: any) => prev ? { ...prev, messages } : null);
          }
        } catch (error) {
          console.error("Erro no auto-refresh de mensagens:", error);
        }
      }, 4000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isReplyModalOpen, selectedAdjustment?.id]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedAdjustment) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/personal/workouts/exercises/adjustments/${selectedAdjustment.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText })
      });
      if (res.ok) {
        setReplyText("");
        // Busca imediata após envio
        const msgRes = await fetch(`/api/personal/workouts/exercises/adjustments/${selectedAdjustment.id}/messages`);
        if (msgRes.ok) {
          const messages = await msgRes.json();
          setSelectedAdjustment((prev: any) => prev ? { ...prev, messages } : null);
        }
        toast.success("Resposta enviada com sucesso!");
        fetchAdjustments();
      } else {
        toast.error("Erro ao enviar resposta.");
      }
    } catch (error) {
      toast.error("Erro de conexão ao enviar resposta.");
    } finally {
      setSendingReply(false);
    }
  };

  const handleResolveRequest = async () => {
    if (!selectedAdjustment) return;

    setResolvingRequest(true);
    try {
      const res = await fetch(`/api/personal/workouts/exercises/adjustments/${selectedAdjustment.id}/resolve`, {
        method: "POST",
      });

      if (res.ok) {
        toast.success("Solicitação marcada como resolvida!");
        setIsReplyModalOpen(false);
        setSelectedAdjustment(null);
        fetchAdjustments();
      } else {
        toast.error("Erro ao resolver solicitação.");
      }
    } catch (error) {
      toast.error("Erro ao resolver solicitação.");
    } finally {
      setResolvingRequest(false);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      await superAdminActions.updateExerciseStatus(id, "NEEDS_CONFIG");
      toast.success("Exercício aprovado! Agora configure os detalhes finais.");
    } catch (error) {
      toast.error("Erro ao aprovar exercício.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await superAdminActions.updateExerciseStatus(id, "REJECTED");
      toast.success("Exercício recusado.");
    } catch (error) {
      toast.error("Erro ao recusar exercício.");
    } finally {
      setProcessingId(null);
    }
  };

  const openConfigModal = (ex: any | null) => {
    setSelectedExercise(ex);
    const ids = ex?.muscleGroups ? ex.muscleGroups.map((g: any) => g.id) : (ex?.muscleGroupId ? [ex.muscleGroupId] : []);
    setConfigForm({
      name: ex?.name || "",
      videoUrl: ex?.videoUrl || "",
      muscleGroupId: ex?.muscleGroupId || "",
      muscleGroupIds: ids,
      isOfficial: ex ? ex.isOfficial : true
    });
    setIsConfigModalOpen(true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (configForm.muscleGroupIds.length === 0) {
      toast.error("Selecione pelo menos um grupamento muscular.");
      return;
    }
    setIsSubmitting(true);
    try {
      if (selectedExercise) {
        await superAdminActions.configureExercise(selectedExercise.id, configForm);
        toast.success("Exercício configurado e publicado!");
      } else {
        await superAdminActions.createExercise(configForm);
        toast.success("Novo exercício oficial criado!");
      }
      setIsConfigModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar exercício.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    setIsDeleting(true);
    try {
      await superAdminActions.deleteExercise(exerciseToDelete.id);
      toast.success("Exercício excluído com sucesso!");
      setExerciseToDelete(null);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao excluir o exercício.");
    } finally {
      setIsDeleting(false);
    }
  };

  const pendingExercisesRaw = snap.pendingExercises || [];
  const needsConfigExercisesRaw = snap.needsConfigExercises || [];
  const officialExercisesRaw = snap.exercises || [];
  const officialExercises = snap.exercises || [];

  const pendingExercises = pendingExercisesRaw.filter((ex: any) =>
    ex.name.toLowerCase().includes(searchPending.toLowerCase()) ||
    (ex.muscleGroup?.name && ex.muscleGroup.name.toLowerCase().includes(searchPending.toLowerCase()))
  );
  const needsConfigExercises = needsConfigExercisesRaw.filter((ex: any) =>
    ex.name.toLowerCase().includes(searchConfig.toLowerCase()) ||
    (ex.muscleGroup?.name && ex.muscleGroup.name.toLowerCase().includes(searchConfig.toLowerCase()))
  );

  return (
    <>
      <div className="p-4 sm:p-6 md:p-8 space-y-8 md:space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Biblioteca Global</h1>
            <p className="text-muted-foreground text-sm font-medium">Gestão de exercícios oficiais e curadoria de conteúdos criados por trainers.</p>
          </div>
          <Button
            onClick={() => openConfigModal(null)}
            className="w-full sm:w-auto h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          >
            <Plus className="size-4" /> NOVO EXERCÍCIO OFICIAL
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 px-1 mb-6">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <BarChart3 className="size-5" />
                </div>
                <h2 className="text-xl font-bold tracking-tight leading-none">Insights da Biblioteca</h2>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <Card className="border-border/40 bg-card/50">
                  <CardContent className="p-4 md:p-6 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Exercícios</p>
                    <p className="text-xl md:text-2xl font-black">{snap.exercisePagination.total + needsConfigExercisesRaw.length}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/40 bg-card/50">
                  <CardContent className="p-4 md:p-6 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pendentes de Config.</p>
                    <p className="text-xl md:text-2xl font-black text-primary">{needsConfigExercisesRaw.length}</p>
                  </CardContent>
                </Card>
                <Card className="col-span-2 md:col-span-1 border-border/40 bg-card/50">
                  <CardContent className="p-4 md:p-6 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Uso Global Acumulado</p>
                    <p className="text-xl md:text-2xl font-black text-emerald-600">
                      {snap.exercisePagination.totalUsage}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <BadgeCheck className="size-5" />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight leading-none">Exercícios Oficiais</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 sm:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar exercícios..."
                      value={searchOfficial}
                      onChange={(e) => setSearchOfficial(e.target.value)}
                      className="pl-9 h-9 w-full sm:w-52 md:w-64 rounded-xl border-border/40 bg-secondary/20 text-xs font-medium"
                    />
                  </div>
                  <Select
                    value={selectedMuscleGroup}
                    onValueChange={setSelectedMuscleGroup}
                  >
                    <SelectTrigger className="w-full sm:w-44 h-9 rounded-xl border-border/40 bg-secondary/20 text-xs font-bold">
                      <SelectValue placeholder="Grupo Muscular" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40">
                      <SelectItem value="all" className="font-bold text-xs">Todos os grupos</SelectItem>
                      {snap.muscleGroups.map((group: any) => (
                        <SelectItem key={group.id} value={group.id} className="font-bold text-xs">
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Card className="border-border/40 p-0 shadow-sm overflow-hidden">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-secondary/10 border-b border-border/40">
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exercício</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Categoria</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Uso Total</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {snap.isLoading && officialExercisesRaw.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                              <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                              <p className="text-xs font-bold uppercase tracking-widest">Carregando exercícios...</p>
                            </td>
                          </tr>
                        ) : officialExercises.length === 0 && searchOfficial ? (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground opacity-60">
                              <Search className="size-6 mx-auto mb-2" />
                              <p className="text-xs font-bold uppercase tracking-widest">Nenhum exercício encontrado</p>
                            </td>
                          </tr>
                        ) : officialExercises.map((ex: any) => (
                          <tr key={ex.id} className="hover:bg-secondary/20 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className="cursor-pointer shrink-0"
                                  onClick={() => {
                                    setPreviewExercise(ex);
                                    setIsPreviewModalOpen(true);
                                  }}
                                >
                                  <ExerciseThumbnail videoUrl={ex.videoUrl} className="size-9 rounded-lg" />
                                </div>
                                <span
                                  className="text-sm font-bold truncate tracking-tight cursor-pointer hover:text-primary transition-colors"
                                  onClick={() => {
                                    setPreviewExercise(ex);
                                    setIsPreviewModalOpen(true);
                                  }}
                                >
                                  {ex.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5 items-center max-w-[240px]">
                                {ex.muscleGroups && ex.muscleGroups.length > 0 ? (
                                  ex.muscleGroups.map((group: any) => (
                                    <Badge
                                      key={group.id}
                                      variant="secondary"
                                      className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 text-foreground border border-border/40"
                                    >
                                      {group.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <Badge
                                    variant="secondary"
                                    className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary/80 text-foreground border border-border/40"
                                  >
                                    {ex.muscleGroup?.name || "Sem Categoria"}
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-xs font-black text-primary">{ex.usage}</span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                                  onClick={() => openConfigModal(ex)}
                                >
                                  <Settings2 className="size-4 text-muted-foreground" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="size-8 rounded-lg hover:bg-rose-500/10 text-rose-500 hover:text-rose-600 transition-colors"
                                  onClick={() => setExerciseToDelete(ex)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
              {snap.exercisePagination.total > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 py-4">
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest text-center sm:text-left">
                    Página {snap.exerciseFilters.page} de {snap.exercisePagination.pages} ({snap.exercisePagination.total} itens)
                  </p>
                  <ShadcnPagination className="w-auto mx-0">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          text="Anterior"
                          onClick={(e) => {
                            e.preventDefault();
                            if (snap.exerciseFilters.page > 1) {
                              superAdminActions.setExerciseFilters({ page: snap.exerciseFilters.page - 1 });
                            }
                          }}
                          className={cn(snap.exerciseFilters.page <= 1 && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>

                      {generatePages(snap.exerciseFilters.page, snap.exercisePagination.pages).map((p, idx) => {
                        if (typeof p === "string") {
                          return (
                            <PaginationItem key={`ellipsis-${idx}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink
                              href="#"
                              isActive={p === snap.exerciseFilters.page}
                              onClick={(e) => {
                                e.preventDefault();
                                superAdminActions.setExerciseFilters({ page: p });
                              }}
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          text="Próxima"
                          onClick={(e) => {
                            e.preventDefault();
                            if (snap.exerciseFilters.page < snap.exercisePagination.pages) {
                              superAdminActions.setExerciseFilters({ page: snap.exerciseFilters.page + 1 });
                            }
                          }}
                          className={cn(snap.exerciseFilters.page >= snap.exercisePagination.pages && "pointer-events-none opacity-50")}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </ShadcnPagination>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6 lg:w-80 xl:w-96 shrink-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  <RefreshCw className="size-5" />
                </div>
                <div className="flex-1 flex items-center justify-between min-w-0 gap-2">
                  <h2 className="text-xl font-bold tracking-tight leading-none truncate">Reajustes</h2>
                  {adjustments.filter((a: any) => a.status === "RESOLVED").length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => setIsAllResolvedOpen(true)}
                      className="h-8 px-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/10 hover:text-primary gap-1 shrink-0"
                    >
                      Ver Todos ({adjustments.filter((a: any) => a.status === "RESOLVED").length})
                    </Button>
                  )}
                </div>
              </div>

              {loadingAdjustments && adjustments.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                  <Loader2 className="size-6 animate-spin text-rose-500 animate-spin-slow" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Buscando reajustes...</p>
                </div>
              ) : adjustments.length === 0 ? (
                <div className="py-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl bg-secondary/5 opacity-50">
                  <CheckCircle2 className="size-6 text-emerald-500 mb-1" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nenhum reajuste pendente</p>
                </div>
              ) : (() => {
                const pending = adjustments.filter((a: any) => a.status === "PENDING");
                const resolved = adjustments.filter((a: any) => a.status === "RESOLVED");
                const latestResolved = resolved[0];

                if (pending.length === 0 && !latestResolved) {
                  return (
                    <div className="py-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-border rounded-xl bg-secondary/5 opacity-50">
                      <CheckCircle2 className="size-6 text-emerald-500 mb-1" />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Nenhum reajuste pendente</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {pending.map((request) => renderAdjustmentCard(request, false))}
                    {latestResolved && renderAdjustmentCard(latestResolved, true)}
                  </div>
                );
              })()}
            </div>

            <hr className="border-border/40" />

            <div className="flex items-center gap-3 px-1">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <Clock className="size-5" />
              </div>
              <h2 className="text-xl font-bold tracking-tight leading-none">Aguardando Aprovação</h2>
            </div>

            <div className="space-y-4">
              {!snap.isLoading && pendingExercisesRaw.length > 0 && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Buscar pendentes..."
                    value={searchPending}
                    onChange={(e) => setSearchPending(e.target.value)}
                    className="pl-9 h-9 w-full rounded-xl border-border/40 bg-secondary/20 text-xs font-medium"
                  />
                </div>
              )}

              {snap.isLoading && pendingExercisesRaw.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="size-8 animate-spin text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Buscando pendências...</p>
                </div>
              ) : pendingExercises.map((ex: any) => (
                <Card key={ex.id} className="border-border/40 bg-card/50 overflow-hidden group">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="cursor-pointer shrink-0"
                          onClick={() => {
                            setPreviewExercise(ex);
                            setIsPreviewModalOpen(true);
                          }}
                        >
                          <ExerciseThumbnail videoUrl={ex.videoUrl} className="size-10 rounded-lg" />
                        </div>
                        <div className="space-y-1 min-w-0">
                          <h3
                            className="text-sm font-bold tracking-tight group-hover:text-primary transition-colors cursor-pointer truncate"
                            onClick={() => {
                              setPreviewExercise(ex);
                              setIsPreviewModalOpen(true);
                            }}
                          >
                            {ex.name}
                          </h3>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest truncate">Criado por: {ex.creator?.name || "Desconhecido"}</p>
                        </div>
                      </div>
                      <div className={cn(
                        "p-1.5 rounded-lg border border-border/40 bg-secondary/50 shrink-0",
                        ex.videoUrl ? "text-primary" : "text-muted-foreground/40"
                      )}>
                        <Video className="size-3.5" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      <Tag className="size-3" />
                      <span className="truncate max-w-[150px]">
                        {ex.muscleGroups && ex.muscleGroups.length > 0
                          ? ex.muscleGroups.map((g: any) => g.name).join(", ")
                          : (ex.muscleGroup?.name || "Sem Categoria")}
                      </span>
                      <span className="mx-1">•</span>
                      <Clock className="size-3" />
                      {new Date(ex.createdAt).toLocaleDateString()}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-border/20">
                      <Button
                        onClick={() => handleApprove(ex.id)}
                        disabled={processingId === ex.id}
                        className="flex-1 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] gap-1.5"
                      >
                        {processingId === ex.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                        APROVAR
                      </Button>
                      <Button
                        onClick={() => handleReject(ex.id)}
                        disabled={processingId === ex.id}
                        variant="outline"
                        className="flex-1 h-9 rounded-lg border-rose-500/20 text-rose-600 hover:bg-rose-500/5 font-bold text-[10px] gap-1.5"
                      >
                        {processingId === ex.id ? <Loader2 className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                        RECUSAR
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="size-9 rounded-lg shrink-0"
                        disabled={!ex.videoUrl}
                        onClick={() => {
                          setPreviewExercise(ex);
                          setIsPreviewModalOpen(true);
                        }}
                      >
                        <Play className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {needsConfigExercisesRaw.length > 0 && (
                <>
                  <div className="flex items-center justify-between px-1 pt-6 pb-2 border-t border-border/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                        <Settings2 className="size-4" />
                      </div>
                      <h2 className="text-lg font-bold tracking-tight leading-none">Aguardando Configuração</h2>
                    </div>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por configurar..."
                      value={searchConfig}
                      onChange={(e) => setSearchConfig(e.target.value)}
                      className="pl-9 h-9 w-full rounded-xl border-border/40 bg-secondary/20 text-xs font-medium"
                    />
                  </div>

                  {needsConfigExercises.length === 0 && searchConfig && (
                    <div className="py-6 flex flex-col items-center justify-center text-center opacity-40">
                      <Search className="size-6 text-muted-foreground mb-2" />
                      <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum resultado</p>
                    </div>
                  )}

                  {needsConfigExercises.map((ex: any) => (
                    <Card key={ex.id} className="border-primary/20 bg-primary/5 overflow-hidden group">
                      <CardContent className="p-5 space-y-4">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className="cursor-pointer shrink-0"
                              onClick={() => {
                                setPreviewExercise(ex);
                                setIsPreviewModalOpen(true);
                              }}
                            >
                              <ExerciseThumbnail videoUrl={ex.videoUrl} className="size-10 rounded-lg" />
                            </div>
                            <div className="space-y-1 min-w-0">
                              <h3
                                className="text-sm font-bold tracking-tight text-primary cursor-pointer hover:underline truncate"
                                onClick={() => {
                                  setPreviewExercise(ex);
                                  setIsPreviewModalOpen(true);
                                }}
                              >
                                {ex.name}
                              </h3>
                              <p className="text-[10px] text-primary/80 font-bold uppercase tracking-widest truncate">Status: Aprovado (Falta Vídeo)</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button onClick={() => openConfigModal(ex)} size="icon" variant="ghost" className="text-primary hover:bg-primary/10 size-8 rounded-lg">
                              <Settings2 className="size-4" />
                            </Button>
                            <Button
                              onClick={() => setExerciseToDelete(ex)}
                              size="icon"
                              variant="ghost"
                              className="text-rose-600 hover:bg-rose-500/10 hover:text-rose-600 size-8 rounded-lg"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                        <Button
                          onClick={() => openConfigModal(ex)}
                          className="w-full h-9 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-[10px] gap-1.5 shadow-lg shadow-primary/20"
                        >
                          <Video className="size-3.5" /> CONFIGURAR
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}

              {!snap.isLoading && pendingExercisesRaw.length === 0 && needsConfigExercisesRaw.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                  <CheckCircle2 className="size-10 text-emerald-500" />
                  <p className="text-xs font-bold uppercase tracking-widest">Tudo em dia!</p>
                </div>
              )}

              {!snap.isLoading && pendingExercisesRaw.length > 0 && pendingExercises.length === 0 && searchPending && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 opacity-40">
                  <Search className="size-8 text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-widest">Nenhum pendente com este nome</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isConfigModalOpen} onOpenChange={setIsConfigModalOpen}>
        <DialogContent className="max-w-xl! rounded-2xl! overflow-y-auto!">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {selectedExercise ? "Editar Exercício" : "Novo Exercício Oficial"}
            </DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {selectedExercise
                ? `Editando: ${selectedExercise.name}`
                : "Crie um novo exercício oficial do zero."
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveConfig} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Exercício</Label>
                <Input
                  required
                  value={configForm.name}
                  onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                  placeholder="Ex: Agachamento Livre"
                  className="rounded-xl h-12 border-border/40 focus:border-primary font-bold"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Grupamentos Musculares (Selecione pelo menos um)
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-secondary/10 border border-border/40 max-h-48 overflow-y-auto">
                  {snap.muscleGroups.map((group: any) => {
                    const isChecked = configForm.muscleGroupIds.includes(group.id);
                    return (
                      <div key={group.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`muscle-group-${group.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            let newIds = [...configForm.muscleGroupIds];
                            if (checked) {
                              newIds.push(group.id);
                            } else {
                              newIds = newIds.filter((id) => id !== group.id);
                            }
                            setConfigForm({
                              ...configForm,
                              muscleGroupIds: newIds,
                              muscleGroupId: newIds[0] || "",
                            });
                          }}
                        />
                        <label
                          htmlFor={`muscle-group-${group.id}`}
                          className="text-xs font-bold text-foreground cursor-pointer select-none truncate"
                        >
                          {group.name}
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                Demonstração em Vídeo
              </Label>

              <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid grid-cols-2 w-full rounded-xl p-1 bg-secondary/30 h-11 border border-border/40">
                  <TabsTrigger value="url" className="rounded-lg gap-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <LinkIcon className="size-3.5" /> URL (Youtube/Vimeo)
                  </TabsTrigger>
                  <TabsTrigger value="upload" disabled className="rounded-lg gap-2 text-xs font-bold opacity-50 cursor-not-allowed">
                    <Upload className="size-3.5" /> Arquivo (Upload)
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <Video className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        required={!selectedExercise}
                        value={configForm.videoUrl}
                        onChange={(e) => setConfigForm({ ...configForm, videoUrl: e.target.value })}
                        placeholder="https://youtube.com/watch?v=..."
                        className="rounded-xl h-12 pl-10 border-border/40 focus:border-primary font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium pl-1">
                      Insira o link direto do vídeo. Suporte para YouTube, Vimeo e Wistia.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="mt-4">
                  {/* Desativado por enquanto */}
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex items-center space-x-2 p-4 rounded-xl bg-secondary/30 border border-border/40">
              <Checkbox
                id="isOfficial"
                checked={configForm.isOfficial}
                onCheckedChange={(checked) => setConfigForm({ ...configForm, isOfficial: !!checked })}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="isOfficial"
                  className="text-xs font-black tracking-tight leading-none cursor-pointer"
                >
                  Tornar Exercício Oficial
                </label>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Exercícios oficiais aparecem com destaque na biblioteca global para todos os usuários.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsConfigModalOpen(false)} className="rounded-xl font-bold">CANCELAR</Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-8 bg-primary font-black uppercase tracking-widest gap-2 shadow-lg shadow-primary/20">
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                {selectedExercise ? "SALVAR ALTERAÇÕES" : "PUBLICAR EXERCÍCIO"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Conversa/Resposta de Reajuste */}
      <Dialog
        open={isReplyModalOpen}
        onOpenChange={(open) => {
          setIsReplyModalOpen(open);
          if (!open) {
            setSelectedAdjustment(null);
            fetchAdjustments(); // Refetch to clear unread marks
          }
        }}
      >
        <DialogContent className="max-w-md w-[95%] rounded-xl flex flex-col h-[520px] p-0 overflow-hidden">
          {selectedAdjustment && (
            <>
              <DialogHeader className="p-5 border-b border-border/60">
                <DialogTitle className="flex items-center gap-2 justify-between">
                  <span className="truncate">Responder Reajuste: {selectedAdjustment.exercise?.name}</span>
                  <Badge
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full shrink-0 border font-medium bg-transparent shadow-none",
                      selectedAdjustment.status === "PENDING" && "text-amber-500 border-amber-500/20 bg-amber-500/5",
                      selectedAdjustment.status === "RESOLVED" && "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                    )}
                  >
                    {selectedAdjustment.status === "PENDING" ? "Em Aberto" : "Resolvido"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-1">
                  Solicitado por <span className="font-semibold text-foreground">{selectedAdjustment.requester?.name}</span> em {new Date(selectedAdjustment.createdAt).toLocaleDateString("pt-BR")}
                </DialogDescription>
              </DialogHeader>

              {/* Chat Container */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-secondary/5">
                {/* Motivo Original */}
                <div className="flex flex-col gap-1.5 p-3.5 rounded-xl border border-border bg-card shadow-sm">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider text-[10px]">Motivo da Solicitação:</span>
                  <p className="text-sm text-foreground leading-relaxed">{selectedAdjustment.description}</p>
                </div>

                <div className="relative flex items-center justify-center my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <span className="relative bg-background px-3 text-[9px] text-muted-foreground uppercase tracking-widest font-bold">
                    Histórico de Mensagens
                  </span>
                </div>

                {/* Messages Thread */}
                {selectedAdjustment.messages.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground">
                    Nenhuma mensagem trocada ainda. Escreva uma resposta abaixo.
                  </div>
                ) : (
                  selectedAdjustment.messages.map((message: any) => {
                    const isMe = message.senderId === null || message.sender?.role === "SUPERADMIN";
                    return (
                      <div
                        key={message.id}
                        className={cn(
                          "flex flex-col max-w-[80%] rounded-2xl p-3 shadow-sm text-sm leading-relaxed",
                          isMe
                            ? "bg-primary text-primary-foreground ml-auto rounded-tr-none"
                            : "bg-card border border-border text-foreground mr-auto rounded-tl-none"
                        )}
                      >
                        <span className="text-[10px] opacity-80 mb-1 font-semibold">
                          {isMe ? "Você (SuperAdmin)" : selectedAdjustment.requester?.name}
                        </span>
                        <p>{message.message}</p>
                        <span className="text-[9px] opacity-60 mt-1 self-end">
                          {new Date(message.createdAt).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer / Input Bar */}
              <div className="p-4 border-t border-border/60 bg-background flex flex-col gap-3">
                {selectedAdjustment.status === "PENDING" ? (
                  <>
                    <form onSubmit={handleSendReply} className="flex gap-2">
                      <Input
                        placeholder="Digite sua resposta..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="bg-card border-border h-10 flex-1"
                        disabled={sendingReply}
                      />
                      <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={sendingReply}>
                        {sendingReply ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      </Button>
                    </form>
                    <Button
                      variant="outline"
                      onClick={handleResolveRequest}
                      disabled={resolvingRequest}
                      className="w-full h-10 gap-2 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-600 font-medium"
                    >
                      {resolvingRequest ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                      Marcar como Resolvido
                    </Button>
                  </>
                ) : (
                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg flex items-center justify-center gap-2 text-emerald-600 text-sm font-medium">
                    <CheckCircle2 className="size-4" />
                    Esta solicitação foi resolvida.
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!exerciseToDelete} onOpenChange={(open) => !open && setExerciseToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs font-semibold text-muted-foreground">
              <span className="block">
                Esta ação não poderá ser desfeita.
              </span>
              <span className="block">
                O exercício <strong className="text-foreground">"{exerciseToDelete?.name}"</strong> será excluído permanentemente. Isso removerá todos os vínculos com treinos de alunos e treinadores, além de quaisquer solicitações de reajuste associadas.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteExercise();
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
      />

      <Sheet open={isAllResolvedOpen} onOpenChange={setIsAllResolvedOpen}>
        <SheetContent className="max-w-md w-[95%] rounded-l-2xl flex flex-col h-full p-0 overflow-hidden">
          <SheetHeader className="p-5 border-b border-border/60">
            <SheetTitle className="text-lg font-black tracking-tight">Reajustes Concluídos</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
              Mostrando as últimas 20 solicitações finalizadas. Elas são apagadas após 7 dias da conclusão.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-secondary/5">
            {adjustments.filter((a: any) => a.status === "RESOLVED").length === 0 ? (
              <div className="text-center py-12 text-xs text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                Nenhum reajuste concluído
              </div>
            ) : (
              adjustments
                .filter((a: any) => a.status === "RESOLVED")
                .slice(0, 20)
                .map((request) => renderAdjustmentCard(request, true))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default function ExerciseLibraryManagementPage() {
  return (
    <Suspense fallback={
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="size-10 text-primary animate-spin" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Carregando interface...</p>
      </div>
    }>
      <ExercisesContent />
    </Suspense>
  );
}
