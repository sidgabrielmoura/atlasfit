"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Edit2,
  ShieldCheck,
  Info,
  Dumbbell,
  Plus,
  PlusCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { workspaceStore } from "@/stores/workspace.store";
import { useSnapshot } from "valtio";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDayOfWeekToString } from "@/lib/migration/utils/day-of-week";
import { Label } from "@/components/ui/label";

export default function ReviewJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params);
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;

  const [jobSummary, setJobSummary] = useState<any>(null);
  const [reviewTab, setReviewTab] = useState<string>("ALL");
  const [records, setRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);

  // Edit Record Modal State
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Official exercises catalog for selector
  const [officialExercises, setOfficialExercises] = useState<any[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState<boolean>(false);

  // Confirmation & Final Commit State
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [commitPreview, setCommitPreview] = useState<any | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // Individual record deletion state
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);

  const handleDeleteRecord = async () => {
    if (!deletingRecordId || !jobId) return;
    setIsDeletingRecord(true);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/records/${deletingRecordId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Registro removido da importação.");
      setRecords((prev) => prev.filter((r) => r.id !== deletingRecordId));
      setDeletingRecordId(null);
    } catch {
      toast.error("Erro ao excluir registro.");
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const fetchJobDetails = useCallback(async () => {
    try {
      const res = await fetch(`/api/personal/migration/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJobSummary(data);
      }
    } catch {
      toast.error("Erro ao carregar detalhes da importação.");
    }
  }, [jobId]);

  const loadRecords = useCallback(async (filter: string) => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/records?filter=${filter}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch {
      toast.error("Erro ao carregar registros para revisão.");
    } finally {
      setIsLoadingRecords(false);
    }
  }, [jobId]);

  const fetchExercisesCatalog = useCallback(async () => {
    setIsLoadingExercises(true);
    try {
      const res = await fetch("/api/personal/exercises");
      if (res.ok) {
        const data = await res.json();
        setOfficialExercises(data || []);
      }
    } catch {
    } finally {
      setIsLoadingExercises(false);
    }
  }, []);

  useEffect(() => {
    fetchJobDetails();
    loadRecords("ALL");
    fetchExercisesCatalog();
  }, [fetchJobDetails, loadRecords, fetchExercisesCatalog]);

  const handleOpenEditModal = (record: any) => {
    setEditingRecord(record);
    setEditFormData(JSON.parse(JSON.stringify(record.normalizedData || {})));
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !jobId) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/records/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normalizedData: editFormData }),
      });

      if (!res.ok) throw new Error();

      toast.success("Registro atualizado com sucesso!");
      setEditingRecord(null);
      loadRecords(reviewTab);
    } catch {
      toast.error("Erro ao salvar alterações no registro.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenConfirmation = async () => {
    if (!jobId) return;

    setIsGeneratingPreview(true);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/preview`);
      if (res.ok) {
        const data = await res.json();
        setCommitPreview(data);
        setShowConfirmDialog(true);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro ao gerar pré-visualização de confirmação.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const executeFinalCommit = async () => {
    if (!jobId || !workspaceId) return;

    setIsCommitting(true);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, commitVersion: commitPreview?.commitVersion }),
      });

      if (!res.ok) throw new Error();

      setShowConfirmDialog(false);
      toast.success("Importação concluída com sucesso! Todos os alunos e fichas foram criados.");
      router.push("/personal/clients");
    } catch {
      toast.error("Erro ao confirmar importação no banco.");
    } finally {
      setIsCommitting(false);
    }
  };

  // Helper to add an exercise in workout edit form
  const handleAddExerciseToForm = () => {
    const currentExercises = editFormData.exercises || [];
    setEditFormData({
      ...editFormData,
      exercises: [
        ...currentExercises,
        {
          name: "Novo Exercício",
          sets: 3,
          reps: "10-12",
          restSeconds: 60,
          load: 0,
          isRequestedOfficial: false,
        },
      ],
    });
  };

  const handleUpdateExerciseInForm = (idx: number, field: string, value: any) => {
    const currentExercises = [...(editFormData.exercises || [])];
    currentExercises[idx] = {
      ...currentExercises[idx],
      [field]: value,
    };
    setEditFormData({
      ...editFormData,
      exercises: currentExercises,
    });
  };

  const handleRemoveExerciseFromForm = (idx: number) => {
    const currentExercises = [...(editFormData.exercises || [])];
    currentExercises.splice(idx, 1);
    setEditFormData({
      ...editFormData,
      exercises: currentExercises,
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 space-y-6 mx-auto max-w-5xl font-sans pb-24 sm:pb-8">
      {/* Header Corporativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl shrink-0 active:scale-95 transition-transform"
            onClick={() => router.push("/personal/clients/migrate")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Revisão de Importação</h1>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-black bg-primary/10 text-primary">
                {jobSummary?.sourcePlatform || "Lote"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valide e edite dados de alunos e treinos antes da efetivação final no banco.
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className="hidden sm:flex gap-2 font-bold rounded-2xl h-11 px-5 shadow-xs shrink-0"
          disabled={isGeneratingPreview}
          onClick={handleOpenConfirmation}
        >
          {isGeneratingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Finalizar Importação
        </Button>
      </div>

      {/* Navegação de Filtros Responsiva */}
      <div className="bg-card p-2 rounded-2xl border border-border/80 shadow-2xs">
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1">
          {[
            { key: "ALL", label: "Todos" },
            { key: "STUDENTS", label: "Alunos" },
            { key: "WORKOUTS", label: "Treinos" },
            { key: "ASSESSMENTS", label: "Avaliações" },
            { key: "MEASUREMENTS", label: "Medidas" },
            { key: "ATTENTION", label: "Atenção", isAttention: true },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant={reviewTab === tab.key ? "secondary" : "ghost"}
              size="sm"
              className={`text-xs h-9 rounded-xl shrink-0 px-3.5 font-bold ${reviewTab === tab.key ? "bg-primary/10 text-primary border border-primary/20" : ""
                }`}
              onClick={() => {
                setReviewTab(tab.key);
                loadRecords(tab.key);
              }}
            >
              {tab.isAttention && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mr-1" />}
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid de Cards de Registros */}
      {isLoadingRecords ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : records.length === 0 ? (
        <Card className="py-14 text-center border-dashed rounded-3xl">
          <CardContent className="space-y-2">
            <Info className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="font-bold text-sm">Nenhum registro nesta categoria</p>
            <p className="text-xs text-muted-foreground">Selecione "Todos" para visualizar os demais itens extraídos.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map((rec) => {
            const norm = rec.normalizedData || {};
            const isStudent = rec.entityType === "STUDENT";
            const isWorkout = rec.entityType === "WORKOUT";
            const isDuplicate = rec.deduplicationMatch && rec.deduplicationMatch !== "NO_MATCH";

            return (
              <Card
                key={rec.id}
                className={`border transition-all rounded-3xl p-4 sm:p-5 shadow-2xs space-y-3 ${rec.reviewStatus === "PENDING" || isDuplicate
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border/80 bg-card"
                  }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <Badge variant="outline" className="text-[10px] font-mono uppercase mb-1 rounded-md">
                      {rec.entityType}
                    </Badge>
                    <CardTitle className="text-sm font-bold text-foreground">
                      {isStudent ? norm.name || "Aluno Sem Nome" : isWorkout ? norm.name || "Treino" : "Registro"}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs px-3 rounded-xl gap-1.5 font-semibold shrink-0"
                      onClick={() => handleOpenEditModal(rec)}
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setDeletingRecordId(rec.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="text-xs space-y-2">
                  {isStudent && (
                    <div className="space-y-1 text-muted-foreground">
                      <div>E-mail: <span className="text-foreground font-semibold">{norm.email || "não informado"}</span></div>
                      <div>WhatsApp: <span className="text-foreground font-semibold">{norm.phone || "não informado"}</span></div>
                      <div>Objetivo: <span className="text-foreground font-semibold">{norm.objective || "não informado"}</span></div>

                      {(!norm.email && !norm.phone) && (
                        <div className="mt-2 p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Contato ausente. Cadastre o WhatsApp para enviar o convite do app.</span>
                        </div>
                      )}

                      {isDuplicate && (
                        <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Aluno já cadastrado neste workspace.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isWorkout && (
                    <div className="space-y-2.5">
                      {/* Dia de Execução Warning / Badge */}
                      <div className="flex items-center justify-between gap-2">
                        {formatDayOfWeekToString(norm.dayOfWeek) ? (
                          <Badge variant="secondary" className="text-[10px] font-bold rounded-lg bg-primary/10 text-primary">
                            Dia: {formatDayOfWeekToString(norm.dayOfWeek)}
                          </Badge>
                        ) : (
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-between gap-2 w-full">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              Dia de execução não definido
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 rounded-lg font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0"
                              onClick={() => handleOpenEditModal(rec)}
                            >
                              Definir Dia
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Lista de Exercícios */}
                      {(!norm.exercises || norm.exercises.length === 0) ? (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-bold flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            Nenhum exercício vinculado
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 rounded-lg font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0"
                            onClick={() => handleOpenEditModal(rec)}
                          >
                            Adicionar
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          <div className="flex items-center justify-between text-muted-foreground font-bold text-[11px] pb-0.5">
                            <span>Exercícios ({norm.exercises.length})</span>
                          </div>
                          {norm.exercises.map((ex: any, idx: number) => {
                            const isMatched = Boolean(ex.matchedExerciseId || ex.matchedExerciseName);

                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between p-2.5 rounded-xl border text-[11px] gap-2 transition-colors ${!isMatched
                                  ? "border-amber-500/50 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                                  : "bg-muted/30 border-border/40"
                                  }`}
                              >
                                <div className="truncate min-w-0">
                                  <span className="font-bold block truncate">{ex.name || "Exercício"}</span>
                                  {isMatched ? (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                                      ✓ Catálogo: {ex.matchedExerciseName || ex.name}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                                      Não encontrado no catálogo
                                    </span>
                                  )}
                                  {ex.isRequestedOfficial && (
                                    <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                                      ★ Solicitado para inclusão oficial
                                    </span>
                                  )}
                                </div>
                                <span className="text-muted-foreground font-semibold shrink-0">
                                  {ex.sets || 3}x {ex.reps || "10-12"} {ex.load ? `• ${ex.load}kg` : ""}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Action Bar no Mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border/60 z-40">
        <Button
          className="w-full h-12 gap-2 font-bold rounded-2xl text-sm shadow-md"
          disabled={isGeneratingPreview}
          onClick={handleOpenConfirmation}
        >
          {isGeneratingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Finalizar Importação
        </Button>
      </div>

      {/* CONFIRMAÇÃO DE DELEÇÃO DE REGISTRO */}
      <AlertDialog open={!!deletingRecordId} onOpenChange={(open) => !open && setDeletingRecordId(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-md rounded-3xl p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive">Descartar Registro</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Tem certeza que deseja remover permanentemente este registro da lista de importação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <AlertDialogCancel disabled={isDeletingRecord} className="h-10 text-xs rounded-xl w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              disabled={isDeletingRecord}
              onClick={handleDeleteRecord}
            >
              {isDeletingRecord ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CONFIRMATION DIALOG */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="w-[92vw] sm:max-w-md rounded-3xl p-5 sm:p-6 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Confirmar Importação no Banco</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1 text-xs text-foreground">
                {commitPreview && (
                  <div className="space-y-2 bg-muted/40 p-4 rounded-2xl border text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Novos alunos:</span>
                      <span className="font-bold text-foreground">{commitPreview.newStudentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alunos a atualizar:</span>
                      <span className="font-bold text-foreground">{commitPreview.updateStudentsCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Treinos vinculados:</span>
                      <span className="font-bold text-foreground">{commitPreview.workoutsCount}</span>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Os alunos e treinos serão vinculados diretamente ao seu workspace ativo.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isCommitting} className="h-10 text-xs rounded-xl w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto gap-2"
              disabled={isCommitting}
              onClick={executeFinalCommit}
            >
              {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* EDIT RECORD MODAL */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-4xl!  rounded-3xl! p-5 sm:p-6 max-h-[85vh]! overflow-y-auto!">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar Registro</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste nomes, treinos e parâmetros antes da efetivação no sistema.
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs font-bold">Nome / Título</Label>
                <Input
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              {editingRecord.entityType === "STUDENT" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">E-mail</Label>
                      <Input
                        value={editFormData.email || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">WhatsApp</Label>
                      <Input
                        value={editFormData.phone || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Objetivo</Label>
                    <Input
                      value={editFormData.objective || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, objective: e.target.value })}
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                </>
              )}

              {editingRecord.entityType === "WORKOUT" && (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold flex items-center gap-1">
                        Dia de Execução
                        {!editFormData.dayOfWeek && (
                          <span className="text-amber-500 font-bold text-[10px]">* PENDENTE</span>
                        )}
                      </Label>
                      <Select
                        value={editFormData.dayOfWeek || ""}
                        onValueChange={(val) => setEditFormData({ ...editFormData, dayOfWeek: val })}
                      >
                        <SelectTrigger className={`h-10 text-xs rounded-xl ${!editFormData.dayOfWeek ? "border-amber-500/60 bg-amber-500/5 text-amber-700 dark:text-amber-300" : ""}`}>
                          <SelectValue placeholder="Selecione o dia de execução (ex: Segunda-feira)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Segunda-feira">Segunda-feira</SelectItem>
                          <SelectItem value="Terça-feira">Terça-feira</SelectItem>
                          <SelectItem value="Quarta-feira">Quarta-feira</SelectItem>
                          <SelectItem value="Quinta-feira">Quinta-feira</SelectItem>
                          <SelectItem value="Sexta-feira">Sexta-feira</SelectItem>
                          <SelectItem value="Sábado">Sábado</SelectItem>
                          <SelectItem value="Domingo">Domingo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Objetivo / Foco do Treino</Label>
                      <Input
                        value={editFormData.goal || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, goal: e.target.value })}
                        placeholder="Ex: Hipertrofia, Emagrecimento, Peito/Tríceps"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <Label className="text-xs font-bold">Exercícios do Treino</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-xl font-bold gap-1"
                      onClick={handleAddExerciseToForm}
                    >
                      <Plus className="h-3.5 w-3.5" /> Adicionar Exercício
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    {(editFormData.exercises || []).map((ex: any, idx: number) => {
                      const isMatched = Boolean(ex.matchedExerciseId || ex.matchedExerciseName);

                      return (
                        <div
                          key={idx}
                          className={`p-3 border rounded-2xl space-y-2 text-xs shadow-2xs transition-colors ${!isMatched ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 bg-card"
                            }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              value={ex.name || ""}
                              onChange={(e) => handleUpdateExerciseInForm(idx, "name", e.target.value)}
                              placeholder="Nome do Exercício"
                              className="h-8 text-xs font-bold rounded-xl"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-xs text-destructive hover:bg-destructive/10 shrink-0"
                              onClick={() => handleRemoveExerciseFromForm(idx)}
                            >
                              Remover
                            </Button>
                          </div>

                          <div className="grid grid-cols-4 gap-2">
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Séries</Label>
                              <Input
                                value={ex.sets || 3}
                                onChange={(e) => handleUpdateExerciseInForm(idx, "sets", parseInt(e.target.value) || 3)}
                                className="h-8 text-xs rounded-xl text-center font-bold"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Reps</Label>
                              <Input
                                value={ex.reps || "10-12"}
                                onChange={(e) => handleUpdateExerciseInForm(idx, "reps", e.target.value)}
                                className="h-8 text-xs rounded-xl text-center font-bold"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Carga (kg)</Label>
                              <Input
                                value={ex.load || ""}
                                onChange={(e) => handleUpdateExerciseInForm(idx, "load", e.target.value)}
                                className="h-8 text-xs rounded-xl text-center font-bold"
                              />
                            </div>
                            <div>
                              <Label className="text-[10px] text-muted-foreground">Pausa (s)</Label>
                              <Input
                                value={ex.restSeconds || 60}
                                onChange={(e) => handleUpdateExerciseInForm(idx, "restSeconds", parseInt(e.target.value) || 60)}
                                className="h-8 text-xs rounded-xl text-center font-bold"
                              />
                            </div>
                          </div>

                          {/* Se o exercício NÃO estiver no catálogo, exibir destaque e botão de solicitar inclusão */}
                          {!isMatched ? (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 shrink-0" /> Não encontrado no catálogo
                              </span>
                              <Button
                                type="button"
                                variant={ex.isRequestedOfficial ? "secondary" : "outline"}
                                size="sm"
                                className={`h-7 text-[10px] rounded-lg gap-1 font-bold ${ex.isRequestedOfficial ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : ""
                                  }`}
                                onClick={() => handleUpdateExerciseInForm(idx, "isRequestedOfficial", !ex.isRequestedOfficial)}
                              >
                                {ex.isRequestedOfficial ? "★ Solicitado para catálogo oficial" : "Solicitar Inclusão Oficial"}
                              </Button>
                            </div>
                          ) : (
                            <div className="pt-1">
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                ✓ Vinculado ao catálogo oficial ({ex.matchedExerciseName || ex.name})
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-10 text-xs rounded-xl w-full sm:w-auto" onClick={() => setEditingRecord(null)}>
              Cancelar
            </Button>
            <Button disabled={isSavingEdit} size="sm" className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto gap-2" onClick={handleSaveEdit}>
              {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
