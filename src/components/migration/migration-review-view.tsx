"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  Trash2,
  Coins,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Clock,
  LayoutGrid,
  List,
  User,
  Activity,
  Ruler,
  Bookmark,
  Users,
  ChevronsUpDown,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { workspaceStore } from "@/stores/workspace.store";
import { useSnapshot } from "valtio";
import { useMigrationRealtime } from "@/hooks/use-import-realtime";
import { createMigrationUpdates } from "@/lib/migration/realtime";
import { useImportCommit } from "@/providers/import-commit-provider";
import { importErrorMessage, readImportResponseError } from "@/lib/migration/commit-protocol";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ImportExerciseLink } from "./import-exercise-link";
import { useImportExerciseMatches } from "@/hooks/use-import-exercise-matches";
import { InsufficientCreditsModal } from "./insufficient-credits-modal";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RestTimeInput } from "@/components/application/RestTimeInput";
import { formatDayOfWeekToString } from "@/lib/migration/utils/day-of-week";
import { Label } from "@/components/ui/label";
import { cn, formatPhone } from "@/lib/utils";
import { isValidCpfCnpj, formatCpfCnpj } from "@/lib/cpf-validator";

export interface RecordPendency {
  code: string;
  title: string;
  description: string;
  field?: string;
  severity: "blocking" | "warning";
}

export interface RecordPendingAnalysis {
  isPending: boolean;
  reasons: string[];
  pendencies: RecordPendency[];
  hasBlocking: boolean;
  commitError?: string | null;
}

export function checkRecordPendingStatus(rec: any, requireGymValidation = false): RecordPendingAnalysis {
  const norm = rec.normalizedData || {};
  const reasons: string[] = [];
  const pendencies: RecordPendency[] = [];
  const commitError = rec.safeErrorMessage || null;

  if (rec.entityType === "WORKOUT") {
    const hasValidDay = Boolean(formatDayOfWeekToString(norm.dayOfWeek));
    if (!hasValidDay) {
      reasons.push("Dia de execução não definido");
      pendencies.push({
        code: "DAY_OF_WEEK_MISSING",
        title: "Dia de execução não definido",
        description: "Selecione o dia da semana em que este treino será realizado (ex: Segunda-feira).",
        field: "dayOfWeek",
        severity: "blocking",
      });
    }

    const targetStudentIds = Array.isArray(norm.targetStudentIds) && norm.targetStudentIds.length > 0
      ? norm.targetStudentIds
      : norm.temporaryStudentId
        ? [norm.temporaryStudentId]
        : [];
    const saveToLibrary = Boolean(norm.saveToLibrary);

    if (targetStudentIds.length === 0 && !saveToLibrary) {
      reasons.push("Vincule a ao menos um aluno ou salve na biblioteca");
      pendencies.push({
        code: "DESTINATION_UNASSIGNED",
        title: "Destino do treino não definido",
        description: "Vincule o treino a ao menos um aluno ou marque para salvar na Biblioteca de Treinos.",
        field: "targetStudentIds",
        severity: "blocking",
      });
    }

    if (!norm.exercises || !Array.isArray(norm.exercises) || norm.exercises.length === 0) {
      reasons.push("Nenhum exercício informado");
      pendencies.push({
        code: "NO_EXERCISES",
        title: "Nenhum exercício informado",
        description: "A prescrição deste treino está vazia. Adicione ao menos um exercício com séries e repetições.",
        field: "exercises",
        severity: "blocking",
      });
    } else {
      const emptyNameCount = norm.exercises.filter(
        (ex: any) => !String(ex.name || ex.matchedExerciseName || "").trim()
      ).length;
      if (emptyNameCount > 0) {
        reasons.push(`${emptyNameCount} exercício(s) sem nome`);
        pendencies.push({
          code: "EXERCISE_NAME_EMPTY",
          title: "Exercício sem nome preenchido",
          description: `Existe(m) ${emptyNameCount} exercício(s) sem nome neste treino. Preencha o nome de todos os exercícios.`,
          field: "exercises",
          severity: "blocking",
        });
      }
    }
  }

  if (rec.entityType === "STUDENT") {
    if (!norm.email && !norm.phone) {
      reasons.push("Contato ausente");
      pendencies.push({
        code: "CONTACT_MISSING",
        title: "Contato não informado",
        description: "Informe ao menos um endereço de e-mail ou número de WhatsApp para contato e acesso do aluno.",
        field: "email",
        severity: "blocking",
      });
    }
    const doc = norm.cpfCnpj ?? norm.cpf;
    if (doc) {
      const cleaned = String(doc).replace(/\D/g, "");
      if (cleaned.length > 0 && !isValidCpfCnpj(cleaned)) {
        reasons.push("CPF/CNPJ inválido");
        pendencies.push({
          code: "DOCUMENT_INVALID",
          title: "CPF ou CNPJ inválido",
          description: "Os dígitos verificadores do documento informado não conferem. Verifique o CPF/CNPJ.",
          field: "cpfCnpj",
          severity: "blocking",
        });
      }
    }
    if (norm.phone) {
      const rawPhone = String(norm.phone).replace(/\D/g, "");
      if (rawPhone.length > 0 && !/^\d{10,13}$/.test(rawPhone)) {
        reasons.push("WhatsApp inválido");
        pendencies.push({
          code: "PHONE_INVALID",
          title: "Número de WhatsApp incompleto",
          description: "Informe o DDD e o número completo (ex: (11) 98765-4321).",
          field: "phone",
          severity: "warning",
        });
      }
    }
    if (requireGymValidation && !norm.birthDate) {
      reasons.push("Nascimento obrigatório");
      pendencies.push({
        code: "BIRTHDATE_REQUIRED",
        title: "Data de nascimento obrigatória",
        description: "A política da academia exige a data de nascimento para registro de matrícula do aluno.",
        field: "birthDate",
        severity: "blocking",
      });
    }
  }

  if (rec.entityType === "ASSESSMENT") {
    if (!norm.temporaryStudentId && !norm.studentId) {
      reasons.push("Aluno não vinculado");
      pendencies.push({
        code: "STUDENT_UNLINKED",
        title: "Aluno não vinculado",
        description: "Esta avaliação física precisa ser vinculada a um aluno do lote.",
        field: "temporaryStudentId",
        severity: "blocking",
      });
    }
    if (!norm.date) {
      reasons.push("Data da avaliação ausente");
      pendencies.push({
        code: "DATE_MISSING",
        title: "Data da avaliação ausente",
        description: "Informe a data em que a avaliação física foi realizada.",
        field: "date",
        severity: "blocking",
      });
    }
    if (requireGymValidation && (norm.weight == null || norm.height == null)) {
      reasons.push("Peso e altura obrigatórios na academia");
      pendencies.push({
        code: "WEIGHT_HEIGHT_REQUIRED",
        title: "Peso e altura obrigatórios",
        description: "A academia exige o preenchimento de peso e altura para cadastrar a avaliação.",
        field: "weight",
        severity: "blocking",
      });
    }
  }

  if (rec.entityType === "MEASUREMENT") {
    if (!norm.temporaryStudentId && !norm.studentId) {
      reasons.push("Aluno não vinculado");
      pendencies.push({
        code: "STUDENT_UNLINKED",
        title: "Aluno não vinculado",
        description: "Este registro de medidas corporais precisa ser vinculado a um aluno do lote.",
        field: "temporaryStudentId",
        severity: "blocking",
      });
    }
    if (!norm.date) {
      reasons.push("Data da medição ausente");
      pendencies.push({
        code: "DATE_MISSING",
        title: "Data da medição ausente",
        description: "Informe a data da tomada de medidas corporais.",
        field: "date",
        severity: "blocking",
      });
    }
  }

  if (rec.reviewStatus === "PENDING" && pendencies.length === 0) {
    reasons.push("Pendente de revisão");
    pendencies.push({
      code: "REVIEW_PENDING",
      title: "Pendente de revisão",
      description: "Este registro requer conferência dos dados antes de ser gravado.",
      severity: "blocking",
    });
  }

  if (commitError && !pendencies.some((p) => p.code === "COMMIT_ERROR")) {
    pendencies.unshift({
      code: "COMMIT_ERROR",
      title: "Erro ao gravar no banco",
      description: commitError,
      severity: "blocking",
    });
  }

  return {
    isPending: pendencies.length > 0 || rec.reviewStatus === "PENDING" || Boolean(commitError),
    reasons,
    pendencies,
    hasBlocking: pendencies.some((p) => p.severity === "blocking") || Boolean(commitError),
    commitError,
  };
}

interface MigrationReviewViewProps {
  jobId: string;
  role?: "personal" | "gym";
  baseRoute?: string;
  backRoute?: string;
  creditsRoute?: string;
  apiBasePath?: string;
  creditsApiBasePath?: string;
  exercisesApiUrl?: string;
  className?: string;
}

export function MigrationReviewView({
  jobId,
  role = "personal",
  baseRoute: customBaseRoute,
  backRoute: customBackRoute,
  creditsRoute: customCreditsRoute,
  apiBasePath: customApiBasePath,
  creditsApiBasePath: customCreditsApiBasePath,
  exercisesApiUrl: customExercisesApiUrl,
  className,
}: MigrationReviewViewProps) {
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;
  const commit = useImportCommit();
  const activeCommit = commit?.state?.jobId === jobId && commit.state.workspaceId === workspaceId ? commit.state : null;

  const baseRoute = customBaseRoute || (role === "gym" ? "/gym/import" : "/personal/clients/migrate");
  const backRoute = customBackRoute || baseRoute;
  const creditsRoute = customCreditsRoute || (role === "gym" ? "/gym/credits" : "/personal/credits");
  const apiBasePath = customApiBasePath || (role === "gym" ? "/api/gym/migration" : "/api/personal/migration");
  const creditsApiBasePath = customCreditsApiBasePath || (role === "gym" ? "/api/gym/credits" : "/api/personal/credits");
  const exercisesApiUrl = customExercisesApiUrl || (role === "gym" ? "/api/gym/workouts/exercises" : "/api/personal/workouts/exercises");

  const [jobSummary, setJobSummary] = useState<any>(null);
  const [reviewTab, setReviewTab] = useState<string>("ALL");
  const [records, setRecords] = useState<any[]>([]);
  const [allRecords, setAllRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(true);
  const [isInsufficientCreditsOpen, setIsInsufficientCreditsOpen] = useState<boolean>(false);

  // Modo de visualização dos cards: "grid" vs "list"
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atlasfit_migration_records_view");
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    } catch { }
  }, []);

  const handleToggleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("atlasfit_migration_records_view", mode);
    } catch { }
  };

  // Edit Record Modal State
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const findExerciseMatches = useImportExerciseMatches(exercisesApiUrl, workspaceId, role);
  const [isMatchingExercises, setIsMatchingExercises] = useState(false);
  const [exerciseMatchError, setExerciseMatchError] = useState("");
  const exerciseNamesToMatch = JSON.stringify((editFormData.exercises || []).filter((exercise: any) => !exercise.matchedExerciseId && !exercise.isRequestedOfficial && !exercise.catalogLinkRemoved && String(exercise.name || "").trim()).map((exercise: any) => exercise.name.trim()));

  const editingAnalysis = useMemo(() => {
    if (!editingRecord) return null;
    const mergedRecord = {
      ...editingRecord,
      normalizedData: editFormData,
    };
    return checkRecordPendingStatus(mergedRecord, role === "gym");
  }, [editingRecord, editFormData, role]);

  // Confirmation & Final Commit State
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [commitPreview, setCommitPreview] = useState<any | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isCommittingLocally, setIsCommitting] = useState<boolean>(false);
  const isCommitting = isCommittingLocally || commit?.state?.phase === "running";
  const [commitUnitId, setCommitUnitId] = useState("");

  // Resume & Pause Processing State
  const [isResuming, setIsResuming] = useState<boolean>(false);
  const [isPausing, setIsPausing] = useState<boolean>(false);

  // Collapsible for committed records
  const [committedOpen, setCommittedOpen] = useState<boolean>(false);

  // Individual record deletion state
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState<boolean>(false);

  const handleDeleteRecord = async () => {
    if (isCommitting) return;
    if (!deletingRecordId || !jobId) return;
    setIsDeletingRecord(true);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/records/${deletingRecordId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Registro removido da importação.");
      setRecords((prev) => prev.filter((r) => r.id !== deletingRecordId));
      setAllRecords((prev) => prev.filter((r) => r.id !== deletingRecordId));
      setDeletingRecordId(null);
    } catch {
      toast.error("Erro ao excluir registro.");
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const updates = useMemo(createMigrationUpdates, [jobId, workspaceId, apiBasePath]);
  const detailRequest = useRef(0);
  const recordsRequest = useRef(0);
  const allRecordsRequest = useRef(0);
  const commitOutcomes = useRef(activeCommit);
  useEffect(() => { commitOutcomes.current = activeCommit; }, [activeCommit]);
  const mergeCommitRecords = useCallback((rows: any[], startedAt: typeof activeCommit) => rows.map(record => {
    const outcome = commitOutcomes.current?.outcomes[record.id];
    // Once the stream finishes, the API may contain a correction made afterwards.
    if (outcome?.status === "FAILED" && commitOutcomes.current?.phase !== "running" && startedAt === commitOutcomes.current) return record;
    return outcome ? { ...record, status: outcome.status, reviewStatus: outcome.reviewStatus || record.reviewStatus, errorCode: outcome.code || null, safeErrorMessage: outcome.message || null } : record;
  }), []);
  const reviewTabRef = useRef(reviewTab);
  useEffect(() => { reviewTabRef.current = reviewTab; }, [reviewTab]);

  const fetchJobDetails = useCallback(async () => {
    const revision = updates.revision();
    const request = ++detailRequest.current;
    try {
      const res = await fetch(`${apiBasePath}/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        if (request === detailRequest.current && workspaceStore.activeWorkspaceId === workspaceId) setJobSummary(updates.merge(data, revision));
      }
    } catch {
      if (request === detailRequest.current && workspaceStore.activeWorkspaceId === workspaceId) toast.error("Erro ao carregar detalhes da importação.");
    }
  }, [jobId, apiBasePath, workspaceId, updates]);

  const fetchAllRecords = useCallback(async () => {
    const request = ++allRecordsRequest.current;
    const commitAtStart = commitOutcomes.current;
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/records?filter=ALL&pageSize=500`);
      if (res.ok) {
        const data = await res.json();
        if (request === allRecordsRequest.current && workspaceStore.activeWorkspaceId === workspaceId) setAllRecords(mergeCommitRecords(data.records || [], commitAtStart));
      }
    } catch { }
  }, [jobId, apiBasePath, workspaceId, mergeCommitRecords]);

  const loadRecords = useCallback(async (filter: string, silent = false) => {
    const request = ++recordsRequest.current;
    const commitAtStart = commitOutcomes.current;
    if (!silent) setIsLoadingRecords(true);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/records?filter=${filter}&pageSize=500`);
      if (res.ok) {
        const data = await res.json();
        if (request !== recordsRequest.current || workspaceStore.activeWorkspaceId !== workspaceId) return;
        setRecords(mergeCommitRecords(data.records || [], commitAtStart));
        if (filter === "ALL") {
          allRecordsRequest.current++;
          setAllRecords(mergeCommitRecords(data.records || [], commitAtStart));
        } else {
          fetchAllRecords();
        }
      }
    } catch {
      if (request === recordsRequest.current && workspaceStore.activeWorkspaceId === workspaceId) toast.error("Erro ao carregar registros para revisão.");
    } finally {
      if (request === recordsRequest.current && workspaceStore.activeWorkspaceId === workspaceId) setIsLoadingRecords(false);
    }
  }, [jobId, apiBasePath, workspaceId, fetchAllRecords, mergeCommitRecords]);

  useEffect(() => {
    const names: string[] = JSON.parse(exerciseNamesToMatch);
    if (!editingRecord || editingRecord.entityType !== "WORKOUT" || !names.length) { setIsMatchingExercises(false); return; }
    let disposed = false;
    setIsMatchingExercises(true);
    setExerciseMatchError("");
    const timer = setTimeout(() => {
      void findExerciseMatches(names).then(matches => {
        if (disposed) return;
        const byName = new Map(names.map((name, index) => [name, matches[index]]));
        setEditFormData((previous: any) => ({
          ...previous, exercises: previous.exercises.map((exercise: any) => {
            const match = byName.get(String(exercise.name || "").trim());
            if (!match || exercise.matchedExerciseId || exercise.isRequestedOfficial || exercise.catalogLinkRemoved) return exercise;
            return { ...exercise, matchedExerciseId: match.exerciseId, matchedExerciseName: match.exerciseName, matchConfidence: match.confidence };
          })
        }));
      }).catch(error => { if (!disposed) setExerciseMatchError(importErrorMessage(error)); })
        .finally(() => { if (!disposed) setIsMatchingExercises(false); });
    }, 350);
    return () => { disposed = true; clearTimeout(timer); };
  }, [editingRecord?.id, exerciseNamesToMatch, findExerciseMatches]);

  useEffect(() => {
    setJobSummary(null);
    setRecords([]);
    setAllRecords([]);
    setReviewTab("ALL");
    reviewTabRef.current = "ALL";
    void fetchJobDetails();
    void loadRecords("ALL");
    return () => { detailRequest.current++; recordsRequest.current++; allRecordsRequest.current++; };
  }, [fetchJobDetails, loadRecords]);

  const lastRecordsUpdate = useRef("");
  const realtimeUnavailable = useMigrationRealtime(workspaceId, payload => {
    if (payload.jobId !== jobId) return;
    updates.receive(payload);
    setJobSummary((previous: any) => ({ id: jobId, ...previous, ...payload }));
    if (["REVIEW", "PARTIAL", "COMPLETED", "FAILED"].includes(payload.status || "")) {
      const key = JSON.stringify([jobId, payload.status, payload.creditsConsumed, payload.totalStudents, payload.totalWorkouts, payload.totalAssessments, payload.totalMeasurements]);
      if (lastRecordsUpdate.current !== key) {
        lastRecordsUpdate.current = key;
        void loadRecords(reviewTabRef.current, true);
      }
    }
  }, () => {
    void fetchJobDetails();
    void loadRecords(reviewTabRef.current, true);
  });

  useEffect(() => {
    if (!activeCommit) return;
    const status = activeCommit.phase === "running" ? "IMPORTING" : activeCommit.result?.status;
    if (status) updates.receive({ jobId, status, processingStep: status === "IMPORTING" ? "COMMITTING" : "IDLE" });
    const apply = (previous: any[]) => previous.map(record => {
      const outcome = activeCommit.outcomes[record.id];
      return outcome ? { ...record, status: outcome.status, reviewStatus: outcome.reviewStatus || record.reviewStatus, errorCode: outcome.code || null, safeErrorMessage: outcome.message || null } : record;
    });
    setRecords(apply);
    setAllRecords(apply);
    setJobSummary((previous: any) => previous ? { ...previous, status: activeCommit.phase === "running" ? "IMPORTING" : activeCommit.result?.status || previous.status, errorCode: activeCommit.result?.interrupted ? "COMMIT_INTERRUPTED" : activeCommit.failed ? "COMMIT_PARTIAL" : null } : previous);
  }, [activeCommit, jobId, updates]);

  const handleResumeProcessing = async () => {
    if (!jobId) return;
    setIsResuming(true);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/process`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (res.status === 402 || errData.pauseReason === "CREDITS_EXHAUSTED" || errData.code === "CREDITS_EXHAUSTED") {
          setIsInsufficientCreditsOpen(true);
          return;
        }
        throw new Error(errData.error || errData.message || "Erro ao retomar processamento.");
      }

      toast.success("Processamento retomado!");
      fetchJobDetails();
      loadRecords(reviewTab, true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao retomar processamento.");
      fetchJobDetails();
    } finally {
      setIsResuming(false);
    }
  };

  const handlePauseJob = async () => {
    if (!jobId) return;
    setIsPausing(true);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/pause`, {
        method: "POST",
      });

      const errData = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (errData.currentStatus) {
          setJobSummary((prev: any) => ({ ...prev, status: errData.currentStatus }));
        }
        throw new Error(errData.message || "Não foi possível pausar a importação.");
      }

      toast.success("Processamento pausado com sucesso!");
      fetchJobDetails();
      loadRecords(reviewTab, true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao pausar processamento.");
    } finally {
      setIsPausing(false);
    }
  };

  const [expandedExerciseIndexes, setExpandedExerciseIndexes] = useState<Record<number, boolean>>({});

  const availableStudents = useMemo(() => {
    return allRecords.filter((r) => r.entityType === "STUDENT");
  }, [allRecords]);

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allRecords) {
      if (r.entityType === "STUDENT") {
        const name = r.normalizedData?.name || "Aluno sem nome";
        if (r.temporaryEntityId) map.set(r.temporaryEntityId, name);
        if (r.temporaryStudentId) map.set(r.temporaryStudentId, name);
        if (r.normalizedData?.temporaryStudentId) map.set(r.normalizedData.temporaryStudentId, name);
        if (r.id) map.set(r.id, name);
      }
    }
    return map;
  }, [allRecords]);

  const handleOpenEditModal = (record: any) => {
    if (isCommitting) return;
    setEditingRecord(record);
    const norm = record.normalizedData || {};
    const initialTargetStudentIds: string[] = Array.isArray(norm.targetStudentIds) && norm.targetStudentIds.length > 0
      ? norm.targetStudentIds
      : norm.temporaryStudentId
        ? [norm.temporaryStudentId]
        : [];
    const initialSaveToLibrary = norm.saveToLibrary !== undefined
      ? Boolean(norm.saveToLibrary)
      : initialTargetStudentIds.length === 0;

    setEditFormData({
      ...norm,
      name: norm.name || "",
      phone: norm.phone ? formatPhone(String(norm.phone)) : "",
      cpfCnpj: norm.cpfCnpj ? formatCpfCnpj(String(norm.cpfCnpj)) : (norm.cpf ? formatCpfCnpj(String(norm.cpf)) : ""),
      targetStudentIds: initialTargetStudentIds,
      saveToLibrary: initialSaveToLibrary,
      exercises: (norm.exercises || []).map((ex: any) => {
        const isPc = ex.isBodyweight === true || String(ex.load || "").toLowerCase().includes("p.c");
        const setsCount = Number(ex.sets) || 3;
        const indSets = Array.isArray(ex.individualSets) && ex.individualSets.length > 0
          ? ex.individualSets.map((s: any) => ({
            reps: s.reps ? String(s.reps) : String(ex.reps || "10"),
            load: isPc ? "p.c." : (s.load ? String(s.load) : (ex.load ? String(ex.load) : "")),
            rest: s.rest || (ex.restSeconds ? `${ex.restSeconds}s` : "01:00"),
          }))
          : Array.from({ length: setsCount }, () => ({
            reps: String(ex.reps || "10"),
            load: isPc ? "p.c." : (ex.load ? String(ex.load) : ""),
            rest: ex.rest || (ex.restSeconds ? `${ex.restSeconds}s` : "01:00"),
          }));

        return {
          ...ex,
          sets: setsCount,
          reps: ex.reps || "10-12",
          load: isPc ? "p.c." : (ex.load || ""),
          restSeconds: ex.restSeconds || 60,
          rest: ex.rest || (ex.restSeconds ? `${ex.restSeconds}s` : "01:00"),
          isBodyweight: isPc,
          isIndividual: Boolean(ex.isIndividual || (Array.isArray(ex.individualSets) && ex.individualSets.length > 0)),
          individualSets: indSets,
          methodType: ex.methodType || "NONE",
          methodConfig: ex.methodConfig || {},
          allowRepsModification: ex.allowRepsModification ?? null,
          isRequestedOfficial: Boolean(ex.isRequestedOfficial),
        };
      }),
    });
    setExpandedExerciseIndexes({});
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !jobId) return;
    if (
      editingRecord.entityType === "WORKOUT" &&
      (!editFormData.targetStudentIds || editFormData.targetStudentIds.length === 0) &&
      !editFormData.saveToLibrary
    ) {
      toast.error("Vincule o treino a pelo menos um aluno ou marque a opção de salvar na biblioteca de treinos.");
      return;
    }
    setIsSavingEdit(true);

    try {
      const res = await fetch(`${apiBasePath}/${jobId}/records/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normalizedData: editFormData }),
      });

      if (!res.ok) throw new Error();

      const updated = await res.json();
      toast.success("Registro atualizado com sucesso!");

      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setAllRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditingRecord(null);
    } catch {
      toast.error("Erro ao salvar alterações no registro.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenConfirmation = async () => {
    setIsGeneratingPreview(true);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/preview`);
      if (res.ok) {
        const preview = await res.json();
        setCommitPreview(preview);
        if (role === "gym") setCommitUnitId(previous => preview.availableUnits?.some((unit: { id: string }) => unit.id === previous) ? previous : preview.availableUnits?.length === 1 ? preview.availableUnits[0].id : "");
        setShowConfirmDialog(true);
      } else {
        throw new Error(await readImportResponseError(res, "Erro ao gerar prévia da importação."));
      }
    } catch (error) {
      toast.error(importErrorMessage(error, "Erro ao gerar prévia da importação."));
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const executeFinalCommit = async () => {
    if (role === "gym" && !commitUnitId) return;
    if (isCommitting) return;
    setIsCommitting(true);
    try {
      if (role === "gym") {
        if (!commit || !workspaceId) throw new Error("Não foi possível iniciar a confirmação. Abra novamente a revisão.");
        setShowConfirmDialog(false);
        const result = await commit.start({ workspaceId, jobId, commitVersion: commitPreview?.commitVersion, unitId: commitUnitId, apiBasePath, reviewRoute: `${baseRoute}/${jobId}` });
        setCommitPreview(null);
        if (!result) { void fetchJobDetails(); void loadRecords(reviewTabRef.current, true); }
        return;
      }
      const res = await fetch(`${apiBasePath}/${jobId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ commitVersion: commitPreview?.commitVersion }),
      });

      if (!res.ok) {
        throw new Error(await readImportResponseError(res, "Erro ao finalizar importação."));
      }

      toast.success("Importação concluída com sucesso! Os dados foram adicionados.");
      setShowConfirmDialog(false);
      router.push(baseRoute);
    } catch (error) {
      toast.error(importErrorMessage(error, "Erro ao salvar registros no banco."));
    } finally {
      setIsCommitting(false);
    }
  };

  const toggleExerciseExpanded = (idx: number) => {
    setExpandedExerciseIndexes((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleToggleExpandAllExercises = (expand: boolean) => {
    const count = (editFormData.exercises || []).length;
    const next: Record<number, boolean> = {};
    for (let i = 0; i < count; i++) {
      next[i] = expand;
    }
    setExpandedExerciseIndexes(next);
  };

  const handleToggleTargetStudent = (studentTempId: string) => {
    setEditFormData((prev: any) => {
      const current: string[] = Array.isArray(prev.targetStudentIds) ? prev.targetStudentIds : [];
      const exists = current.includes(studentTempId);
      const next = exists ? current.filter((id) => id !== studentTempId) : [...current, studentTempId];
      return {
        ...prev,
        targetStudentIds: next,
      };
    });
  };

  const handleSelectAllStudents = () => {
    const allIds = availableStudents.map((s: any) => s.temporaryEntityId);
    setEditFormData((prev: any) => ({
      ...prev,
      targetStudentIds: allIds,
    }));
  };

  const handleClearAllStudents = () => {
    setEditFormData((prev: any) => ({
      ...prev,
      targetStudentIds: [],
    }));
  };

  const handleToggleBodyweight = (idx: number, checked: boolean) => {
    setEditFormData((prev: any) => {
      const updated = (prev.exercises || []).map((ex: any, i: number) => {
        if (i !== idx) return ex;
        const newLoad = checked ? "p.c." : "";
        const updatedInd = (ex.individualSets || []).map((s: any) => ({
          ...s,
          load: checked ? "p.c." : (s.load === "p.c." ? "" : s.load),
        }));
        return {
          ...ex,
          isBodyweight: checked,
          load: newLoad,
          individualSets: updatedInd,
        };
      });
      return { ...prev, exercises: updated };
    });
  };

  const handleToggleIndividual = (idx: number, checked: boolean) => {
    setEditFormData((prev: any) => {
      const updated = (prev.exercises || []).map((ex: any, i: number) => {
        if (i !== idx) return ex;
        const setsCount = Number(ex.sets) || 1;
        const currentSets = ex.individualSets || [];
        const newInd = Array.from({ length: setsCount }, (_, si) => {
          if (currentSets[si]) return currentSets[si];
          return {
            reps: String(ex.reps || "10"),
            load: ex.isBodyweight ? "p.c." : (ex.load ? String(ex.load) : ""),
            rest: ex.rest || "01:00",
          };
        });
        return {
          ...ex,
          isIndividual: checked,
          individualSets: newInd,
        };
      });
      return { ...prev, exercises: updated };
    });
  };

  const handleUpdateIndividualSetField = (exerciseIndex: number, setIndex: number, field: string, value: string) => {
    setEditFormData((prev: any) => {
      const updated = (prev.exercises || []).map((ex: any, i: number) => {
        if (i !== exerciseIndex) return ex;
        const updatedSets = (ex.individualSets || []).map((s: any, si: number) =>
          si === setIndex ? { ...s, [field]: value } : s
        );
        return {
          ...ex,
          individualSets: updatedSets,
        };
      });
      return { ...prev, exercises: updated };
    });
  };

  const handleUpdateExerciseSets = (idx: number, setsCount: number) => {
    const validCount = Math.max(1, Math.min(20, setsCount || 1));
    setEditFormData((prev: any) => {
      const updated = (prev.exercises || []).map((ex: any, i: number) => {
        if (i !== idx) return ex;
        const currentSets = ex.individualSets || [];
        const newInd = Array.from({ length: validCount }, (_, si) => {
          if (currentSets[si]) return currentSets[si];
          return {
            reps: String(ex.reps || "10"),
            load: ex.isBodyweight ? "p.c." : (ex.load ? String(ex.load) : ""),
            rest: ex.rest || "01:00",
          };
        });
        return {
          ...ex,
          sets: validCount,
          individualSets: newInd,
        };
      });
      return { ...prev, exercises: updated };
    });
  };

  const handleUpdateExerciseMethod = (idx: number, methodType: string, methodConfig: any = {}) => {
    setEditFormData((prev: any) => {
      const updated = (prev.exercises || []).map((ex: any, i: number) => {
        if (i !== idx) return ex;
        return {
          ...ex,
          methodType,
          methodConfig: methodType === "NONE" ? {} : { ...(ex.methodConfig || {}), ...methodConfig },
        };
      });
      return { ...prev, exercises: updated };
    });
  };

  const handleAddExerciseToForm = () => {
    setEditFormData((prev: any) => {
      const newEx = {
        name: "",
        sets: 3,
        reps: "10-12",
        load: "",
        restSeconds: 60,
        rest: "01:00",
        isBodyweight: false,
        isIndividual: false,
        methodType: "NONE",
        methodConfig: {},
        individualSets: [
          { reps: "10", load: "", rest: "01:00" },
          { reps: "10", load: "", rest: "01:00" },
          { reps: "10", load: "", rest: "01:00" },
        ],
        matchedExerciseId: null,
        matchedExerciseName: null,
        isRequestedOfficial: false,
        allowRepsModification: null,
      };
      const nextExercises = [...(prev.exercises || []), newEx];
      setExpandedExerciseIndexes((ePrev) => ({ ...ePrev, [nextExercises.length - 1]: true }));
      return {
        ...prev,
        exercises: nextExercises,
      };
    });
  };

  const handleRemoveExerciseFromForm = (index: number) => {
    setEditFormData((prev: any) => ({
      ...prev,
      exercises: (prev.exercises || []).filter((_: any, i: number) => i !== index),
    }));
  };

  const handleUpdateExerciseInForm = (index: number, field: string, value: any) => {
    setEditFormData((prev: any) => {
      const updated = [...(prev.exercises || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, exercises: updated };
    });
  };

  const activeRecords = records.filter((r) => r.status !== "COMMITTED");
  const committedRecords = records.filter((r) => r.status === "COMMITTED");

  const pendingCount = (allRecords.length > 0 ? allRecords : records)
    .filter((r) => r.status !== "COMMITTED")
    .filter((r) => checkRecordPendingStatus(r, role === "gym").isPending).length;

  const pendingBreakdown = useMemo(() => {
    const source = allRecords.length > 0 ? allRecords : records;
    let missingDayCount = 0;
    let unassignedDestCount = 0;
    let noExercisesCount = 0;
    let missingContactCount = 0;
    let commitErrorCount = 0;

    for (const r of source) {
      if (r.status === "COMMITTED") continue;
      const analysis = checkRecordPendingStatus(r, role === "gym");
      if (!analysis.isPending) continue;

      if (r.safeErrorMessage || r.errorCode || r.status === "FAILED") {
        commitErrorCount++;
      }
      if (analysis.pendencies.some((p) => p.code === "DAY_OF_WEEK_MISSING")) {
        missingDayCount++;
      }
      if (analysis.pendencies.some((p) => p.code === "DESTINATION_UNASSIGNED")) {
        unassignedDestCount++;
      }
      if (analysis.pendencies.some((p) => p.code === "NO_EXERCISES" || p.code === "EXERCISE_NAME_EMPTY")) {
        noExercisesCount++;
      }
      if (analysis.pendencies.some((p) => p.code === "CONTACT_MISSING")) {
        missingContactCount++;
      }
    }

    return {
      missingDayCount,
      unassignedDestCount,
      noExercisesCount,
      missingContactCount,
      commitErrorCount,
    };
  }, [allRecords, records, role]);

  const isJobProcessing = jobSummary?.status === "PROCESSING" || jobSummary?.status === "UPLOADED";
  const isJobPartial = jobSummary?.status === "PARTIAL" && !jobSummary?.errorCode?.startsWith("COMMIT_");
  const hasBlockingPending = role !== "gym" && pendingCount > 0;
  const isCreditsExhausted = isJobPartial && jobSummary?.pauseReason === "CREDITS_EXHAUSTED";
  const isManualPaused = isJobPartial && jobSummary?.pauseReason === "MANUAL_PAUSE";

  const handleCommitClick = () => {
    if (isGeneratingPreview || isCommitting || activeRecords.length === 0) return;
    if (hasBlockingPending) {
      toast.warning(`Existem ${pendingCount} registro(s) com pendências que impedem a finalização. Revise os itens destacados na aba 'Atenção'.`);
      setReviewTab("ATTENTION");
      loadRecords("ATTENTION");
      return;
    }
    handleOpenConfirmation();
  };

  const pendingSourcesCount = jobSummary?.sources
    ? jobSummary.sources.filter((s: any) => s.status === "PENDING" || s.status === "PROCESSING").length
    : 0;

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "STUDENT": return <User className="size-3.5" />;
      case "WORKOUT": return <Dumbbell className="size-3.5" />;
      case "ASSESSMENT": return <Activity className="size-3.5" />;
      case "MEASUREMENT": return <Ruler className="size-3.5" />;
      default: return null;
    }
  };

  return (
    <div className={cn("space-y-6 mx-auto font-sans w-full", className)}>
      {/* Header Corporativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl shrink-0 active:scale-95 transition-transform"
            onClick={() => router.push(backRoute)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                Revisão de Importação
              </h1>
              {isJobProcessing && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-primary/30 text-primary bg-primary/10 animate-pulse">
                  Processando
                </Badge>
              )}
              {isJobPartial && (
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  {isCreditsExhausted ? "Créditos Insuficientes" : "Pausado"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Valide e edite dados de alunos e treinos antes da efetivação final no banco.
            </p>
          </div>
        </div>

        <Button
          size="lg"
          className={cn(
            "hidden sm:flex gap-2 font-bold rounded-2xl h-11 px-5 shadow-xs shrink-0 transition-all",
            pendingCount > 0 ? "border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20" : "",
            activeRecords.length === 0 ? "opacity-75" : ""
          )}
          disabled={activeRecords.length === 0 || isGeneratingPreview || isCommitting}
          onClick={handleCommitClick}
        >
          {isGeneratingPreview ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          {activeRecords.length === 0 && committedRecords.length > 0
            ? "Itens já adicionados"
            : pendingCount > 0 && role !== "gym"
              ? "Resolver Pendências"
              : "Finalizar Importação"}
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full ml-1 border border-amber-500/30">
              {pendingCount} pendência{pendingCount > 1 ? "s" : ""}
            </span>
          )}
        </Button>
      </div>

      {realtimeUnavailable && isJobProcessing && (
        <p role="status" className="text-xs text-muted-foreground">Conectando às atualizações em tempo real… O progresso será sincronizado ao conectar.</p>
      )}
      {isJobProcessing && (
        <Card className="rounded-2xl border-primary/30 bg-primary/5 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <h3 className="text-sm font-bold text-foreground">
                  Processando arquivos de importação... {jobSummary?.progressPercentage ? `${jobSummary.progressPercentage}%` : ""}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                {jobSummary?.progressMessage || "Extração de dados por IA em andamento. Os registros serão atualizados em tempo real."}
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold text-primary">
                <Coins className="h-3.5 w-3.5" />
                <span>{jobSummary?.creditsConsumed ?? 0} créditos consumidos</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseJob}
              disabled={isPausing}
              className="h-9 rounded-xl text-xs font-bold gap-1.5 border-border/70 shrink-0"
            >
              {isPausing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
              {isPausing ? "Pausando..." : "Pausar Processamento"}
            </Button>
          </div>
        </Card>
      )}

      {isCreditsExhausted && (
        <Card className="rounded-2xl border-amber-500/40 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Coins className="h-4 w-4" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-amber-600 dark:text-amber-400">
                  Créditos de importação insuficientes
                </h3>
                <Badge variant="outline" className="text-[10px] uppercase font-bold border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                  Pausado
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O processamento foi pausado porque os créditos da sua conta acabaram. Os registros extraídos até agora já estão prontos abaixo para você revisar e cadastrar no seu workspace. Para processar os arquivos restantes, compre novos créditos e continue o processamento de onde parou.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  Créditos consumidos até agora: <strong className="text-foreground">{jobSummary?.creditsConsumed ?? 0}</strong>
                </span>
                {pendingSourcesCount > 0 && (
                  <span>
                    • Fontes pendentes a processar: <strong className="text-foreground">{pendingSourcesCount}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsInsufficientCreditsOpen(true)}
                className="h-10 text-xs rounded-xl font-bold gap-1.5 border-amber-500/40 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 w-full sm:w-auto"
              >
                <Coins className="h-4 w-4" />
                Comprar Créditos
              </Button>
              <Button
                onClick={handleResumeProcessing}
                disabled={isResuming || isJobProcessing}
                className="h-10 text-xs rounded-xl font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs w-full sm:w-auto"
              >
                {isResuming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
                {isResuming ? "Retomando..." : "Continuar Processamento"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isManualPaused && (
        <Card className="rounded-2xl border-border/80 bg-muted/30 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Importação Pausada Manualmente
                </h3>
                <Badge variant="secondary" className="text-[10px] font-bold">
                  Pausa
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O processamento de arquivos pendentes está em pausa. Você pode revisar e cadastrar os itens já extraídos ou retomar a importação dos demais arquivos quando quiser.
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5 text-primary" />
                  Créditos consumidos: <strong className="text-foreground">{jobSummary?.creditsConsumed ?? 0}</strong>
                </span>
                {pendingSourcesCount > 0 && (
                  <span>
                    • Fontes pendentes: <strong className="text-foreground">{pendingSourcesCount}</strong>
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={handleResumeProcessing}
              disabled={isResuming || isJobProcessing}
              className="h-10 text-xs rounded-xl font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs shrink-0 w-full sm:w-auto"
            >
              {isResuming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
              {isResuming ? "Retomando..." : "Continuar Processamento"}
            </Button>
          </div>
        </Card>
      )}

      {/* BANNER GERAL DE PENDÊNCIAS ATIVAS */}
      {pendingCount > 0 && (
        <Card className="rounded-2xl border-amber-500/40 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2 flex-wrap">
                    Pendências Identificadas no Lote
                    <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10">
                      {pendingCount} {pendingCount === 1 ? "item pendente" : "itens pendentes"}
                    </Badge>
                  </h3>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {role === "gym"
                  ? "Os registros com pendências não serão cadastrados na confirmação final até que você ajuste os dados ausentes. Clique em 'Editar' para resolver cada item ou conclua os demais normalmente."
                  : "Existem dados incompletos que impedem a confirmação final da migração. Abra a edição dos registros indicados para preencher as informações obrigatórias."}
              </p>

              {/* Breakdown de pendências */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {pendingBreakdown.missingDayCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5">
                    {pendingBreakdown.missingDayCount} treino(s) sem dia da semana
                  </Badge>
                )}
                {pendingBreakdown.unassignedDestCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5">
                    {pendingBreakdown.unassignedDestCount} treino(s) sem destino
                  </Badge>
                )}
                {pendingBreakdown.noExercisesCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5">
                    {pendingBreakdown.noExercisesCount} treino(s) sem exercícios válidos
                  </Badge>
                )}
                {pendingBreakdown.missingContactCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/5">
                    {pendingBreakdown.missingContactCount} aluno(s) sem e-mail/WhatsApp
                  </Badge>
                )}
                {pendingBreakdown.commitErrorCount > 0 && (
                  <Badge variant="outline" className="text-[10px] font-bold border-destructive/40 text-destructive bg-destructive/10">
                    {pendingBreakdown.commitErrorCount} erro(s) de gravação
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setReviewTab("ATTENTION");
                  loadRecords("ATTENTION");
                }}
                className={cn(
                  "h-10 text-xs font-bold rounded-xl gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 w-full sm:w-auto",
                  reviewTab === "ATTENTION" && "bg-amber-500/15"
                )}
              >
                <AlertTriangle className="size-3.5 text-amber-500" />
                {reviewTab === "ATTENTION" ? "Visualizando Pendências" : "Filtrar Apenas Pendências"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Barra de Filtros com Botão de Alternância de Visualização */}
      <div className="bg-card p-2 rounded-2xl border border-border/80 shadow-2xs flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="flex overflow-x-auto no-scrollbar gap-1.5 pb-1 sm:pb-0 flex-1">
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

        {/* Botão de Alternância de Visualização dos Cards (Grid vs List) */}
        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleToggleViewMode("grid")}
            className={cn(
              "h-7 px-2 rounded-lg text-xs font-bold gap-1 transition-all",
              viewMode === "grid" && "bg-background text-foreground shadow-2xs"
            )}
            title="Visualização em Grade"
          >
            <LayoutGrid className="size-3.5" />
            <span className="hidden sm:inline">Grade</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => handleToggleViewMode("list")}
            className={cn(
              "h-7 px-2 rounded-lg text-xs font-bold gap-1 transition-all",
              viewMode === "list" && "bg-background text-foreground shadow-2xs"
            )}
            title="Visualização em Lista"
          >
            <List className="size-3.5" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
        </div>
      </div>

      {isLoadingRecords ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      ) : activeRecords.length === 0 ? (
        <Card className="py-12 text-center border-dashed rounded-3xl">
          <CardContent className="space-y-3">
            {committedRecords.length > 0 ? (
              <>
                <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm">Todos os registros desta etapa já foram adicionados ao workspace</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Você pode consultar os {committedRecords.length} itens cadastrados na seção colapsada abaixo.
                    {isJobPartial && " Para processar os arquivos pendentes, utilize o botão no aviso do topo."}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Info className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="font-bold text-sm">Nenhum registro nesta categoria</p>
                <p className="text-xs text-muted-foreground">Selecione "Todos" para visualizar os demais itens extraídos.</p>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* VISUALIZAÇÃO EM LISTA COMPACTA DOS REGISTROS DE REVISÃO */
        <div className="space-y-2">
          {activeRecords.map((rec) => {
            const norm = rec.normalizedData || {};
            const isStudent = rec.entityType === "STUDENT";
            const isWorkout = rec.entityType === "WORKOUT";
            const isAssessment = rec.entityType === "ASSESSMENT";
            const isMeasurement = rec.entityType === "MEASUREMENT";
            const { isPending, reasons, pendencies } = checkRecordPendingStatus(rec, role === "gym");

            return (
              <motion.div key={rec.id} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }}>
                <Card
                  className={`border transition-all rounded-2xl p-3 sm:p-4 bg-card hover:border-border/80 ${rec.safeErrorMessage
                    ? "border-l-4 border-l-destructive border-border/70"
                    : isPending
                      ? "border-l-4 border-l-amber-500/90 border-border/70"
                      : "border-border/70"
                    }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Info Principal do Item */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 border border-border/40 text-muted-foreground">
                        {getEntityIcon(rec.entityType)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                            {isStudent
                              ? norm.name || "Aluno Sem Nome"
                              : isWorkout
                                ? norm.name || "Treino"
                                : isAssessment
                                  ? norm.type || "Avaliação Física"
                                  : isMeasurement
                                    ? "Medidas Corporais"
                                    : "Registro"}
                          </span>
                          <Badge variant="outline" className="text-[9px] font-mono uppercase rounded-md">
                            {rec.entityType}
                          </Badge>
                          {rec.safeErrorMessage ? (
                            <Badge variant="outline" className="text-[9px] font-bold border-destructive/40 text-destructive bg-destructive/10 rounded-md gap-1">
                              <AlertTriangle className="size-2.5" /> Erro ao Gravar
                            </Badge>
                          ) : isPending ? (
                            <Badge variant="outline" className="text-[9px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-md gap-1">
                              <AlertTriangle className="size-2.5 text-amber-500" />
                              {pendencies.length === 1 ? pendencies[0].title : `${pendencies.length} pendências`}
                            </Badge>
                          ) : null}
                        </div>

                        {/* Detalhes inline do item */}
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap mt-0.5">
                          {isStudent && (
                            <>
                              <span>{norm.email || (norm.phone ? formatPhone(String(norm.phone)) : "Sem contato informado")}</span>
                              {(norm.cpfCnpj || norm.cpf) && <span>• CPF/CNPJ: {formatCpfCnpj(String(norm.cpfCnpj || norm.cpf))}</span>}
                              {norm.objective && <span>• Obj: {norm.objective}</span>}
                            </>
                          )}

                          {isWorkout && (() => {
                            const targetIds: string[] = Array.isArray(norm.targetStudentIds) && norm.targetStudentIds.length > 0
                              ? norm.targetStudentIds
                              : norm.temporaryStudentId
                                ? [norm.temporaryStudentId]
                                : [];
                            const assignedNames = targetIds.map((id) => studentNameMap.get(id) || "Aluno").filter(Boolean);

                            return (
                              <>
                                {norm.saveToLibrary && (
                                  <span className="inline-flex items-center gap-1 text-primary font-semibold">
                                    <Bookmark className="size-3" /> Biblioteca
                                  </span>
                                )}
                                {assignedNames.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-foreground font-medium">
                                    <Users className="size-3 text-muted-foreground" />
                                    {assignedNames.length === 1 ? assignedNames[0] : `${assignedNames.length} alunos`}
                                  </span>
                                )}
                                {!norm.saveToLibrary && assignedNames.length === 0 && (
                                  <span className="text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                                    <AlertTriangle className="size-3 text-amber-500" /> Destino não definido
                                  </span>
                                )}
                                <span>•</span>
                                <span>
                                  Dia:{" "}
                                  <strong className={!formatDayOfWeekToString(norm.dayOfWeek) ? "text-amber-700 dark:text-amber-300" : ""}>
                                    {formatDayOfWeekToString(norm.dayOfWeek) || "Pendente"}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>{(norm.exercises || []).length} exercício(s)</span>
                                {norm.goal && <span>• {norm.goal}</span>}
                              </>
                            );
                          })()}

                          {isAssessment && (
                            <>
                              <span>Data: {norm.date || "—"}</span>
                              {norm.weight && <span>• {norm.weight} kg</span>}
                              {norm.bodyFat && <span>• {norm.bodyFat}% gordura</span>}
                            </>
                          )}

                          {isMeasurement && (
                            <>
                              <span>Data: {norm.date || "—"}</span>
                              {norm.chest && <span>• Peito: {norm.chest}cm</span>}
                              {norm.waist && <span>• Cintura: {norm.waist}cm</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
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

                  {/* Alerta de Erro de Commit na Lista */}
                  {rec.safeErrorMessage && (
                    <div className="mt-2.5 p-2.5 rounded-xl border border-destructive/40 bg-destructive/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle className="size-4 shrink-0 text-destructive" />
                        <span className="font-semibold text-destructive">
                          Erro ao cadastrar: <span className="font-normal text-foreground">{rec.safeErrorMessage}</span>
                        </span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-[10px] px-2.5 font-bold rounded-lg shrink-0 self-end sm:self-auto"
                        onClick={() => handleOpenEditModal(rec)}
                      >
                        Corrigir Agora
                      </Button>
                    </div>
                  )}

                  {/* Alerta de Pendências na Lista */}
                  {!rec.safeErrorMessage && isPending && pendencies.length > 0 && (
                    <div className="mt-2.5 p-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start sm:items-center gap-2 min-w-0">
                        <AlertTriangle className="size-4 shrink-0 text-amber-500 mt-0.5 sm:mt-0" />
                        <div className="text-[11px] text-amber-900 dark:text-amber-200">
                          <span className="font-bold">Pendência: </span>
                          <span>{pendencies.map((p) => `${p.title} (${p.description})`).join(" • ")}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2.5 font-bold rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 shrink-0 self-end sm:self-auto"
                        onClick={() => handleOpenEditModal(rec)}
                      >
                        Resolver
                      </Button>
                    </div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* VISUALIZAÇÃO EM GRADE DOS REGISTROS DE REVISÃO */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {activeRecords.map((rec) => {
            const norm = rec.normalizedData || {};
            const isStudent = rec.entityType === "STUDENT";
            const isWorkout = rec.entityType === "WORKOUT";
            const isAssessment = rec.entityType === "ASSESSMENT";
            const isMeasurement = rec.entityType === "MEASUREMENT";
            const isDuplicate = rec.deduplicationMatch && rec.deduplicationMatch !== "NO_MATCH";
            const { isPending, reasons, pendencies } = checkRecordPendingStatus(rec, role === "gym");

            return (
              <Card
                key={rec.id}
                className={`border transition-all rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 bg-card ${rec.safeErrorMessage
                  ? "border-l-4 border-l-destructive border-border/70"
                  : isPending
                    ? "border-l-4 border-l-amber-500/90 border-border/70"
                    : "border-border/70"
                  }`}
              >
                {/* Erro de Commit prévio */}
                {rec.safeErrorMessage && (
                  <div className="p-3.5 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <AlertTriangle className="size-4 shrink-0 text-destructive" />
                        <span>Erro ao Gravar no Banco</span>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-6 text-[10px] px-2 font-bold rounded-lg shadow-xs"
                        onClick={() => handleOpenEditModal(rec)}
                      >
                        Corrigir Agora
                      </Button>
                    </div>
                    <p className="text-xs text-foreground/90 leading-relaxed font-normal">
                      {rec.safeErrorMessage}
                    </p>
                  </div>
                )}

                {/* Pendências ativas */}
                {!rec.safeErrorMessage && isPending && pendencies.length > 0 && (
                  <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />
                        <span>
                          {pendencies.length === 1
                            ? "Pendência que impede o cadastro:"
                            : `${pendencies.length} pendências identificadas:`}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-[10px] px-2 font-bold rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20"
                        onClick={() => handleOpenEditModal(rec)}
                      >
                        Resolver
                      </Button>
                    </div>
                    <div className="space-y-1">
                      {pendencies.map((p, idx) => (
                        <div key={idx} className="text-[11px] leading-tight">
                          <span className="font-bold text-foreground">• {p.title}: </span>
                          <span className="text-muted-foreground">{p.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px] font-mono uppercase rounded-md">
                        {rec.entityType}
                      </Badge>
                      {rec.safeErrorMessage ? (
                        <Badge variant="outline" className="text-[10px] font-bold border-destructive/40 text-destructive bg-destructive/10 rounded-md gap-1">
                          <AlertTriangle className="size-3" /> Erro de Gravação
                        </Badge>
                      ) : isPending ? (
                        <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-md gap-1">
                          <AlertTriangle className="size-3 text-amber-500" />
                          {pendencies.length === 1 ? pendencies[0].title : `${pendencies.length} pendências`}
                        </Badge>
                      ) : null}
                    </div>
                    <CardTitle className="text-sm font-bold text-foreground">
                      {isStudent
                        ? norm.name || "Aluno Sem Nome"
                        : isWorkout
                          ? norm.name || "Treino"
                          : isAssessment
                            ? norm.type || "Avaliação Física"
                            : isMeasurement
                              ? "Medidas Corporais"
                              : "Registro"}
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
                      <div>WhatsApp: <span className="text-foreground font-semibold">{norm.phone ? formatPhone(String(norm.phone)) : "não informado"}</span></div>
                      <div>CPF/CNPJ: <span className="text-foreground font-semibold">{(norm.cpfCnpj || norm.cpf) ? formatCpfCnpj(String(norm.cpfCnpj || norm.cpf)) : "não informado"}</span></div>
                      <div>Objetivo: <span className="text-foreground font-semibold">{norm.objective || "não informado"}</span></div>

                      {(!norm.email && !norm.phone) && (
                        <div className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center justify-between pt-1">
                          <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Contato ausente. Informe e-mail ou WhatsApp para enviar o convite.</span>
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] px-1.5 text-primary hover:bg-primary/10 shrink-0"
                            onClick={() => handleOpenEditModal(rec)}
                          >
                            Informar
                          </Button>
                        </div>
                      )}

                      {role === "gym" && !norm.birthDate && (
                        <div className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center justify-between pt-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>Data de nascimento obrigatória para matrícula na academia.</span>
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 text-[10px] px-1.5 text-primary hover:bg-primary/10 shrink-0"
                            onClick={() => handleOpenEditModal(rec)}
                          >
                            Informar
                          </Button>
                        </div>
                      )}

                      {isDuplicate && (
                        <div className="mt-2 text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center gap-1.5 pt-1">
                          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>Aluno já cadastrado neste workspace.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isWorkout && (() => {
                    const targetIds: string[] = Array.isArray(norm.targetStudentIds) && norm.targetStudentIds.length > 0
                      ? norm.targetStudentIds
                      : norm.temporaryStudentId
                        ? [norm.temporaryStudentId]
                        : [];
                    const assignedNames = targetIds.map((id) => studentNameMap.get(id) || "Aluno").filter(Boolean);

                    return (
                      <div className="space-y-2.5">
                        {/* Destino do Treino */}
                        <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                          {norm.saveToLibrary && (
                            <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/5 rounded-md gap-1">
                              <Bookmark className="size-3" /> Biblioteca
                            </Badge>
                          )}
                          {assignedNames.length > 0 ? (
                            <Badge variant="outline" className="text-[10px] font-semibold border-border/80 text-foreground bg-muted/30 rounded-md gap-1">
                              <Users className="size-3 text-muted-foreground" />
                              {assignedNames.length === 1 ? assignedNames[0] : `${assignedNames.length} alunos`}
                            </Badge>
                          ) : !norm.saveToLibrary ? (
                            <Badge variant="outline" className="text-[10px] font-semibold border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 rounded-md gap-1">
                              <AlertTriangle className="size-3 text-amber-500" /> Sem destino atribuído
                            </Badge>
                          ) : null}
                        </div>

                        {!norm.saveToLibrary && assignedNames.length === 0 && (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] w-full">
                            <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-medium">
                              <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                              Destino não definido (vincule a um aluno ou biblioteca)
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2 rounded-lg font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 shrink-0"
                              onClick={() => handleOpenEditModal(rec)}
                            >
                              Atribuir
                            </Button>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2">
                          {formatDayOfWeekToString(norm.dayOfWeek) ? (
                            <Badge variant="secondary" className="text-[10px] font-bold rounded-lg bg-primary/10 text-primary">
                              Dia: {formatDayOfWeekToString(norm.dayOfWeek)}
                            </Badge>
                          ) : (
                            <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px] w-full">
                              <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-medium">
                                <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                                Dia de execução pendente
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2 rounded-lg font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 shrink-0"
                                onClick={() => handleOpenEditModal(rec)}
                              >
                                Definir
                              </Button>
                            </div>
                          )}
                        </div>

                        {(!norm.exercises || norm.exercises.length === 0) ? (
                          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[11px]">
                            <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-200 font-medium">
                              <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                              Sem exercícios cadastrados
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-2 rounded-lg font-semibold text-amber-800 dark:text-amber-200 hover:bg-amber-500/20 shrink-0"
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
                              const isMatched = Boolean(ex.matchedExerciseId);

                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between p-2 rounded-xl border text-[11px] gap-2 transition-colors ${!isMatched
                                    ? "bg-card border-amber-500/30 text-foreground"
                                    : "bg-muted/20 border-border/40"
                                    }`}
                                >
                                  <div className="truncate min-w-0">
                                    <span className="font-semibold block truncate text-foreground">{ex.name || "Exercício"}</span>
                                    {isMatched ? (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                                        ✓ {ex.matchedExerciseName || ex.name}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                                        <span className="size-1 rounded-full bg-amber-500 shrink-0" />
                                        Personalizado neste treino
                                      </span>
                                    )}
                                    {ex.isRequestedOfficial && (
                                      <span className="text-[10px] text-amber-600 font-medium block mt-0.5">
                                        ★ Solicitado para inclusão oficial
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-muted-foreground font-medium shrink-0">
                                    {ex.sets || 3}x {ex.reps || "10-12"} {ex.load ? `• ${ex.load}kg` : ""}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {isAssessment && (
                    <div className="space-y-2 text-muted-foreground">
                      <div className="text-[11px] font-semibold text-foreground">
                        Data: {norm.date || "não informada"}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Peso</span>
                          <span className="font-bold text-foreground">{norm.weight ? `${norm.weight} kg` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Altura</span>
                          <span className="font-bold text-foreground">{norm.height ? `${norm.height} m` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">% Gordura</span>
                          <span className="font-bold text-foreground">{norm.bodyFat ? `${norm.bodyFat}%` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Massa Muscular</span>
                          <span className="font-bold text-foreground">{norm.muscleMass ? `${norm.muscleMass} kg` : "—"}</span>
                        </div>
                      </div>
                      {norm.notes && (
                        <div className="text-[11px] bg-muted/20 p-2 rounded-xl border border-border/30 text-foreground">
                          <span className="font-semibold block text-[10px] text-muted-foreground">Observações:</span>
                          {norm.notes}
                        </div>
                      )}
                    </div>
                  )}

                  {isMeasurement && (
                    <div className="space-y-2 text-muted-foreground">
                      <div className="text-[11px] font-semibold text-foreground">
                        Data: {norm.date || "não informada"}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px] pt-1">
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Peitoral</span>
                          <span className="font-bold text-foreground">{norm.chest ? `${norm.chest} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Cintura</span>
                          <span className="font-bold text-foreground">{norm.waist ? `${norm.waist} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Abdômen</span>
                          <span className="font-bold text-foreground">{norm.abdomen ? `${norm.abdomen} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Quadril</span>
                          <span className="font-bold text-foreground">{norm.hips ? `${norm.hips} cm` : "—"}</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Braço D / E</span>
                          <span className="font-bold text-foreground">{norm.rightArm || "—"} / {norm.leftArm || "—"} cm</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40">
                          <span className="text-muted-foreground block text-[10px]">Coxa D / E</span>
                          <span className="font-bold text-foreground">{norm.rightThigh || "—"} / {norm.leftThigh || "—"} cm</span>
                        </div>
                        <div className="bg-muted/40 p-2 rounded-xl border border-border/40 col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-[10px]">Panturrilha D / E</span>
                          <span className="font-bold text-foreground">{norm.rightCalf || "—"} / {norm.leftCalf || "—"} cm</span>
                        </div>
                      </div>
                      {norm.notes && (
                        <div className="text-[11px] bg-muted/20 p-2 rounded-xl border border-border/30 text-foreground">
                          <span className="font-semibold block text-[10px] text-muted-foreground">Observações:</span>
                          {norm.notes}
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

      {/* SEÇÃO COLAPSADA: ITENS JÁ ADICIONADOS AO WORKSPACE (READ-ONLY) */}
      {committedRecords.length > 0 && (
        <Collapsible
          open={committedOpen}
          onOpenChange={setCommittedOpen}
          className="space-y-3 pt-6 border-t border-border/60"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-between p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 border border-border/60 text-left transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">
                      Itens já adicionados ao workspace
                    </h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-bold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                    >
                      {committedRecords.length} cadastrado{committedRecords.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Registros salvos e vinculados ao workspace (apenas visualização, sem ações disponíveis).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                <span>{committedOpen ? "Recolher" : "Visualizar"}</span>
                {committedOpen ? (
                  <ChevronUp className="size-4 transition-transform" />
                ) : (
                  <ChevronDown className="size-4 transition-transform" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent className="space-y-3 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {committedRecords.map((rec) => {
                const norm = rec.normalizedData || {};
                const isStudent = rec.entityType === "STUDENT";
                const isWorkout = rec.entityType === "WORKOUT";
                const isAssessment = rec.entityType === "ASSESSMENT";
                const isMeasurement = rec.entityType === "MEASUREMENT";

                return (
                  <Card
                    key={rec.id}
                    className="border border-border/60 transition-all rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 bg-muted/15 opacity-90 hover:opacity-100"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-border/40 pb-3">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="text-[10px] font-mono uppercase rounded-md">
                            {rec.entityType}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-md gap-1"
                          >
                            <CheckCircle2 className="size-3" /> Cadastrado
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-bold text-foreground">
                          {isStudent
                            ? norm.name || "Aluno Sem Nome"
                            : isWorkout
                              ? norm.name || "Treino"
                              : isAssessment
                                ? norm.type || "Avaliação Física"
                                : isMeasurement
                                  ? "Medidas Corporais"
                                  : "Registro"}
                        </CardTitle>
                      </div>
                    </div>

                    <div className="text-xs space-y-2 text-muted-foreground">
                      {isStudent && (
                        <div className="space-y-1">
                          <div>E-mail: <span className="text-foreground font-medium">{norm.email || "não informado"}</span></div>
                          <div>WhatsApp: <span className="text-foreground font-medium">{norm.phone ? formatPhone(String(norm.phone)) : "não informado"}</span></div>
                          {(norm.cpfCnpj || norm.cpf) && <div>CPF/CNPJ: <span className="text-foreground font-medium">{formatCpfCnpj(String(norm.cpfCnpj || norm.cpf))}</span></div>}
                          <div>Objetivo: <span className="text-foreground font-medium">{norm.objective || "não informado"}</span></div>
                        </div>
                      )}

                      {isWorkout && (() => {
                        const targetIds: string[] = Array.isArray(norm.targetStudentIds) && norm.targetStudentIds.length > 0
                          ? norm.targetStudentIds
                          : norm.temporaryStudentId
                            ? [norm.temporaryStudentId]
                            : [];
                        const assignedNames = targetIds.map((id) => studentNameMap.get(id) || "Aluno").filter(Boolean);

                        return (
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center gap-1.5 pb-0.5">
                              {norm.saveToLibrary && (
                                <Badge variant="outline" className="text-[10px] font-semibold border-primary/30 text-primary bg-primary/5 rounded-md gap-1">
                                  <Bookmark className="size-3" /> Biblioteca
                                </Badge>
                              )}
                              {assignedNames.length > 0 && (
                                <Badge variant="outline" className="text-[10px] font-semibold border-border/80 text-foreground bg-muted/30 rounded-md gap-1">
                                  <Users className="size-3 text-muted-foreground" />
                                  {assignedNames.length === 1 ? assignedNames[0] : `${assignedNames.length} alunos`}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-foreground font-medium">
                              <Dumbbell className="size-3.5 text-primary" />
                              <span>Dia: {formatDayOfWeekToString(norm.dayOfWeek) || "Dia livre"}</span>
                              {norm.exercises && (
                                <span className="text-muted-foreground">• {norm.exercises.length} exercício(s)</span>
                              )}
                            </div>
                            {norm.goal && (
                              <div className="text-[11px]">Objetivo: <span className="text-foreground">{norm.goal}</span></div>
                            )}
                          </div>
                        );
                      })()}

                      {isAssessment && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-foreground">
                            Data: {norm.date || "não informada"}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div>Peso: <span className="text-foreground font-semibold">{norm.weight ? `${norm.weight} kg` : "—"}</span></div>
                            <div>Altura: <span className="text-foreground font-semibold">{norm.height ? `${norm.height} m` : "—"}</span></div>
                            <div>% Gordura: <span className="text-foreground font-semibold">{norm.bodyFat ? `${norm.bodyFat}%` : "—"}</span></div>
                            <div>Massa Muscular: <span className="text-foreground font-semibold">{norm.muscleMass ? `${norm.muscleMass} kg` : "—"}</span></div>
                          </div>
                        </div>
                      )}

                      {isMeasurement && (
                        <div className="space-y-1.5">
                          <div className="text-[11px] font-semibold text-foreground">
                            Data: {norm.date || "não informada"}
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                            <div>Peitoral: <span className="text-foreground font-semibold">{norm.chest ? `${norm.chest} cm` : "—"}</span></div>
                            <div>Cintura: <span className="text-foreground font-semibold">{norm.waist ? `${norm.waist} cm` : "—"}</span></div>
                            <div>Abdômen: <span className="text-foreground font-semibold">{norm.abdomen ? `${norm.abdomen} cm` : "—"}</span></div>
                            <div>Quadril: <span className="text-foreground font-semibold">{norm.hips ? `${norm.hips} cm` : "—"}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Floating Action Bar (Mobile) */}
      {activeRecords.length > 0 && (
        <div className="sm:hidden fixed bottom-18 left-0 right-0 p-4 bg-linear-to-b! from-background/70 to-transparent backdrop-blur-sm border-t border-border/60 z-40 space-y-2">
          {pendingCount > 0 && (
            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1.5">
              <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>{pendingCount} pendência(s) identificada(s)</span>
            </div>
          )}
          <Button
            className={cn(
              "w-full h-12 gap-2 font-bold rounded-2xl text-sm shadow-md transition-all",
              pendingCount > 0 && role !== "gym" ? "border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/20" : ""
            )}
            disabled={isGeneratingPreview || isCommitting}
            onClick={handleCommitClick}
          >
            {isGeneratingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {pendingCount > 0 && role !== "gym" ? "Resolver Pendências" : "Finalizar Importação"}
            {pendingCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full ml-1 border border-amber-500/30">
                {pendingCount}
              </span>
            )}
          </Button>
        </div>
      )}

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
        <AlertDialogContent className="w-[92vw] sm:max-w-md rounded-3xl! p-5 sm:p-6 shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Confirmar Importação</AlertDialogTitle>
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

                {commitPreview?.warnings && commitPreview.warnings.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2 text-xs text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>Avisos de Validação ({commitPreview.warnings.length})</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800/90 dark:text-amber-300/90 pl-1">
                      {commitPreview.warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {pendingCount > 0 && (
                  <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 space-y-1 text-xs text-blue-900 dark:text-blue-200">
                    <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
                      <Info className="size-3.5 shrink-0 text-blue-500" />
                      <span>{pendingCount} registro(s) com pendências permanecerão salvos</span>
                    </div>
                    <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
                      Eles não serão perdidos e continuarão disponíveis nesta tela de revisão para que você possa completá-los e cadastrá-los quando quiser.
                    </p>
                  </div>
                )}

                {role === "gym" && (
                  <div className="grid gap-2">
                    <Label htmlFor="import-unit">Unidade de destino</Label>
                    <Select value={commitUnitId} onValueChange={setCommitUnitId}>
                      <SelectTrigger className="w-full" id="import-unit">
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {commitPreview?.availableUnits?.map((unit: { id: string; name: string }) => (
                          <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel disabled={isCommitting} className="h-10 text-xs rounded-xl w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto gap-2"
              disabled={isCommitting || (role === "gym" && !commitUnitId)}
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
        <DialogContent className="sm:max-w-4xl! rounded-3xl! p-5 sm:p-6 max-h-[85vh]! overflow-y-auto!">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar Registro</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste nomes, treinos e parâmetros antes da efetivação no sistema.
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-4 py-2 text-xs">
              {/* LIVE PENDENCY / STATUS BANNER */}
              {editingAnalysis && (
                <div className="space-y-2">
                  {editingRecord.safeErrorMessage && (
                    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3.5 space-y-1 text-xs text-destructive">
                      <div className="flex items-center gap-2 font-bold">
                        <AlertTriangle className="size-4 shrink-0" />
                        <span>Falha no último cadastro deste registro</span>
                      </div>
                      <p className="text-[11px] text-destructive/90 pl-6 leading-relaxed">
                        {editingRecord.safeErrorMessage}
                      </p>
                    </div>
                  )}

                  {editingAnalysis.isPending ? (
                    <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>
                            {editingAnalysis.pendencies.length} pendência{editingAnalysis.pendencies.length > 1 ? "s" : ""} a resolver neste registro
                          </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 bg-amber-500/20 text-amber-800 dark:text-amber-300">
                          Revisão Obrigatória
                        </Badge>
                      </div>
                      <div className="space-y-1.5 pl-1 pt-1">
                        {editingAnalysis.pendencies.map((pend, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                            <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                            <div>
                              <span className="font-semibold">{pend.title}: </span>
                              <span className="text-amber-800/90 dark:text-amber-300/90">{pend.description}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Todos os campos obrigatórios estão preenchidos corretamente para cadastro.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span>Nome / Título</span>
                  {!editFormData.name?.trim() && (
                    <span className="text-destructive font-bold text-[10px]">Obrigatório</span>
                  )}
                </Label>
                <Input
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className={cn("h-10 text-xs rounded-xl", !editFormData.name?.trim() && "border-destructive ring-1 ring-destructive/30 bg-destructive/5")}
                />
              </div>

              {editingRecord.entityType === "STUDENT" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold flex items-center justify-between">
                        <span>E-mail</span>
                        {!editFormData.email && !editFormData.phone && (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">1 contato obrigatório</span>
                        )}
                      </Label>
                      <Input
                        value={editFormData.email || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className={cn("h-10 text-xs rounded-xl", !editFormData.email && !editFormData.phone && "border-amber-500/50 bg-amber-500/5")}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="migration-phone" className="text-xs font-bold flex items-center justify-between">
                        <span>WhatsApp</span>
                        {!editFormData.email && !editFormData.phone && (
                          <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">1 contato obrigatório</span>
                        )}
                      </Label>
                      <Input
                        id="migration-phone"
                        value={editFormData.phone || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: formatPhone(e.target.value) })}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                        className={cn("h-10 text-xs rounded-xl", !editFormData.email && !editFormData.phone && "border-amber-500/50 bg-amber-500/5")}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="migration-document" className="text-xs font-bold flex items-center justify-between">
                      <span>CPF/CNPJ</span>
                      {(() => {
                        const raw = String(editFormData.cpfCnpj || "").replace(/\D/g, "");
                        if (raw.length > 0 && !isValidCpfCnpj(raw)) {
                          return <span className="text-destructive text-[10px] font-bold">Documento Inválido</span>;
                        }
                        return null;
                      })()}
                    </Label>
                    <Input
                      id="migration-document"
                      value={editFormData.cpfCnpj || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, cpfCnpj: formatCpfCnpj(e.target.value) })}
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                      maxLength={18}
                      className={cn(
                        "h-10 text-xs rounded-xl",
                        Boolean(editFormData.cpfCnpj && !isValidCpfCnpj(String(editFormData.cpfCnpj).replace(/\D/g, ""))) && "border-destructive ring-1 ring-destructive/30 bg-destructive/5"
                      )}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="migration-birth-date" className="text-xs font-bold flex items-center justify-between">
                      <span>Data de nascimento{role === "gym" ? " (obrigatória para academia)" : ""}</span>
                      {role === "gym" && !editFormData.birthDate && (
                        <span className="text-amber-600 dark:text-amber-400 text-[10px] font-bold">Obrigatório</span>
                      )}
                    </Label>
                    <Input
                      id="migration-birth-date"
                      type="date"
                      value={editFormData.birthDate?.slice(0, 10) || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, birthDate: e.target.value || null })}
                      className={cn("h-10 text-xs rounded-xl", role === "gym" && !editFormData.birthDate && "border-amber-500/60 bg-amber-500/5")}
                    />
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
                <div className="space-y-4 pt-2">
                  {/* SEÇÃO 1: Atribuição e Destino do Treino */}
                  <div className="border border-border/70 rounded-2xl p-3.5 bg-muted/10 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Users className="size-3.5 text-primary" /> Atribuição e Destino do Treino
                        </h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Escolha se deseja vincular a um ou mais alunos e/ou salvar como modelo na biblioteca.
                        </p>
                      </div>
                      {availableStudents.length > 1 && (
                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] px-2 rounded-lg font-medium"
                            onClick={handleSelectAllStudents}
                          >
                            Selecionar Todos
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] px-2 text-muted-foreground rounded-lg"
                            onClick={handleClearAllStudents}
                          >
                            Limpar
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Lista de Alunos Selecionáveis */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Alunos Vinculados ({editFormData.targetStudentIds?.length || 0})
                      </Label>
                      {availableStudents.length === 0 ? (
                        <div className="text-xs text-muted-foreground bg-muted/20 border border-border/50 rounded-xl p-2.5">
                          Nenhum aluno identificado neste lote de importação. O treino será salvo como modelo na Biblioteca de Treinos.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 border border-border/40 rounded-xl bg-card">
                          {availableStudents.map((st: any) => {
                            const isSelected = (editFormData.targetStudentIds || []).includes(st.temporaryEntityId);
                            return (
                              <button
                                key={st.id || st.temporaryEntityId}
                                type="button"
                                onClick={() => handleToggleTargetStudent(st.temporaryEntityId)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${isSelected
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-muted/40 border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/70"
                                  }`}
                              >
                                <User className="size-3" />
                                <span>{st.normalizedData?.name || "Aluno sem nome"}</span>
                                {isSelected && <CheckCircle2 className="size-3 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Toggle: Salvar na Biblioteca */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-card">
                      <div className="space-y-0.5">
                        <Label htmlFor="save-to-library-toggle" className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                          <Bookmark className="size-3.5 text-primary" /> Salvar como modelo na Biblioteca de Treinos
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          Disponibiliza o treino como modelo pronto na sua biblioteca para vincular a qualquer aluno futuramente.
                        </p>
                      </div>
                      <Switch
                        id="save-to-library-toggle"
                        checked={editFormData.saveToLibrary || false}
                        onCheckedChange={(checked) => setEditFormData((prev: any) => ({ ...prev, saveToLibrary: checked }))}
                      />
                    </div>

                    {/* Aviso de Validação Obrigatória */}
                    {(!editFormData.targetStudentIds || editFormData.targetStudentIds.length === 0) && !editFormData.saveToLibrary && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium">
                        <AlertTriangle className="size-4 shrink-0 text-amber-500" />
                        <span>
                          Obrigatório vincular o treino a pelo menos um aluno <strong>OU</strong> marcar para salvar na Biblioteca de Treinos.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* SEÇÃO 2: Configurações Gerais do Treino */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pb-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          Dia de Execução
                          <span className="text-destructive font-bold">*</span>
                        </span>
                        {!formatDayOfWeekToString(editFormData.dayOfWeek) ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold text-[10px] bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                            SELEÇÃO OBRIGATÓRIA
                          </span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="size-3" /> Definido
                          </span>
                        )}
                      </Label>
                      <Select
                        value={formatDayOfWeekToString(editFormData.dayOfWeek) || ""}
                        onValueChange={(val) => setEditFormData({ ...editFormData, dayOfWeek: val })}
                      >
                        <SelectTrigger className={cn(
                          "h-10 text-xs rounded-xl transition-all",
                          !formatDayOfWeekToString(editFormData.dayOfWeek)
                            ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/25"
                            : "border-border"
                        )}>
                          <SelectValue placeholder="Selecione o dia da semana (ex: Segunda-feira)" />
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
                      {!formatDayOfWeekToString(editFormData.dayOfWeek) && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                          Obrigatório selecionar em qual dia da semana este treino será executado pelo aluno.
                        </p>
                      )}
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

                  {/* SEÇÃO 3: Exercícios do Treino */}
                  <div className="space-y-2.5 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Label className="text-xs font-bold">Exercícios do Treino ({(editFormData.exercises || []).length})</Label>
                        {(editFormData.exercises || []).length > 0 && (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggleExpandAllExercises(true)}
                            >
                              Expandir todos
                            </Button>
                            <span className="text-muted-foreground text-[10px]">•</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[10px] px-1.5 text-muted-foreground hover:text-foreground"
                              onClick={() => handleToggleExpandAllExercises(false)}
                            >
                              Recolher todos
                            </Button>
                          </div>
                        )}
                      </div>
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

                    {(!editFormData.exercises || editFormData.exercises.length === 0) ? (
                      <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 text-center space-y-2">
                        <AlertTriangle className="size-5 text-amber-500 mx-auto" />
                        <div className="text-xs font-bold text-amber-800 dark:text-amber-300">Nenhum exercício adicionado a este treino</div>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400">
                          Todo treino precisa de ao menos um exercício prescrito. Clique no botão &quot;Adicionar Exercício&quot; acima para começar.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(editFormData.exercises || []).map((ex: any, idx: number) => {
                          const isMatched = Boolean(ex.matchedExerciseId);
                          const isExpanded = Boolean(expandedExerciseIndexes[idx]);
                          const isNameMissing = !String(ex.name || "").trim();

                          return (
                            <div
                              key={idx}
                              className={`p-3 border rounded-2xl transition-all ${isNameMissing
                                ? "border-destructive/60 bg-destructive/5"
                                : !isMatched
                                  ? "border-amber-500/40 bg-amber-500/5"
                                  : "border-border/60 bg-card hover:border-border"
                                }`}
                            >
                              {/* Visualização Colapsada (Minimalista e Elegante) */}
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className={cn(
                                    "size-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border",
                                    isNameMissing
                                      ? "bg-destructive/15 text-destructive border-destructive/30"
                                      : "bg-muted/80 text-muted-foreground border-border/30"
                                  )}>
                                    {idx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={cn(
                                        "font-bold text-xs truncate max-w-[200px] sm:max-w-[320px]",
                                        isNameMissing ? "text-destructive underline decoration-dotted font-black" : "text-foreground"
                                      )}>
                                        {ex.name || "Exercício sem nome"}
                                      </span>
                                      {isNameMissing && (
                                        <Badge variant="destructive" className="text-[9px] h-4.5 px-1.5 font-bold animate-pulse">
                                          Nome Obrigatório
                                        </Badge>
                                      )}
                                      {isMatched ? (
                                        <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 font-medium">
                                          Catálogo
                                        </Badge>
                                      ) : ex.isRequestedOfficial ? (
                                        <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 font-medium">
                                          Solicitado
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="text-[9px] h-4.5 px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 font-medium">
                                          Personalizado
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                                      <span>{ex.sets || 3} séries × {ex.reps || "10-12"}</span>
                                      <span>•</span>
                                      <span>{ex.isBodyweight ? "Peso do corpo" : ex.load ? `${ex.load}kg` : "Carga livre"}</span>
                                      <span>•</span>
                                      <span>{ex.rest || (ex.restSeconds ? `${ex.restSeconds}s` : "01:00")} desc.</span>
                                      {ex.methodType && ex.methodType !== "NONE" && (
                                        <>
                                          <span>•</span>
                                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary border-primary/20 font-bold">
                                            {ex.methodType}
                                          </Badge>
                                        </>
                                      )}
                                      {ex.isIndividual && (
                                        <>
                                          <span>•</span>
                                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 border-border/80 font-medium">
                                            Séries Indiv.
                                          </Badge>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 rounded-xl"
                                    onClick={() => toggleExerciseExpanded(idx)}
                                  >
                                    <span>{isExpanded ? "Recolher" : "Configurar"}</span>
                                    {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-destructive hover:bg-destructive/10 rounded-xl"
                                    onClick={() => handleRemoveExerciseFromForm(idx)}
                                  >
                                    <Trash2 className="size-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* Conteúdo Expandido com Controle Granular */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-border/50 space-y-3 animate-in fade-in duration-200">
                                  {/* Nome e Vinculação com o Catálogo */}
                                  <div className="space-y-1">
                                    <Label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                                      <span>Nome de Exibição do Exercício</span>
                                      {isNameMissing && (
                                        <span className="text-destructive text-[10px] font-bold">Nome Obrigatório</span>
                                      )}
                                    </Label>
                                    <Input
                                      value={ex.name || ""}
                                      onChange={(e) => setEditFormData((previous: any) => ({
                                        ...previous,
                                        exercises: previous.exercises.map((exercise: any, index: number) =>
                                          index === idx ? { ...exercise, name: e.target.value, matchedExerciseId: null, matchedExerciseName: null, catalogLinkRemoved: false, isRequestedOfficial: false } : exercise
                                        )
                                      }))}
                                      placeholder="Ex: Supino Reto com Barra"
                                      className={cn("h-9 text-xs font-bold rounded-xl", isNameMissing && "border-destructive ring-1 ring-destructive/30 bg-destructive/5")}
                                    />
                                    {isNameMissing && (
                                      <p className="text-[10px] text-destructive font-medium">O nome do exercício não pode ficar em branco.</p>
                                    )}
                                    <ImportExerciseLink
                                      index={idx}
                                      exerciseName={ex.name || ""}
                                      linkedId={ex.matchedExerciseId}
                                      linkedName={ex.matchedExerciseName}
                                      requested={ex.isRequestedOfficial}
                                      searching={isMatchingExercises && !ex.catalogLinkRemoved}
                                      error={exerciseMatchError}
                                      disabled={isSavingEdit}
                                      onRemove={() => setEditFormData((previous: any) => ({
                                        ...previous,
                                        exercises: previous.exercises.map((row: any, index: number) =>
                                          index === idx ? { ...row, matchedExerciseId: null, matchedExerciseName: null, catalogLinkRemoved: true, isRequestedOfficial: false } : row
                                        )
                                      }))}
                                      onRequest={() => setEditFormData((previous: any) => ({
                                        ...previous,
                                        exercises: previous.exercises.map((row: any, index: number) =>
                                          index === idx ? { ...row, matchedExerciseId: null, matchedExerciseName: null, catalogLinkRemoved: true, isRequestedOfficial: true } : row
                                        )
                                      }))}
                                    />
                                  </div>

                                  {/* Parâmetros Principais */}
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="space-y-1">
                                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Séries</Label>
                                      <Input
                                        type="number"
                                        min={1}
                                        max={20}
                                        value={ex.sets || 3}
                                        onChange={(e) => handleUpdateExerciseSets(idx, parseInt(e.target.value) || 1)}
                                        className="h-9 text-xs rounded-xl text-center font-bold"
                                      />
                                    </div>
                                    {!ex.isIndividual && (
                                      <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Repetições</Label>
                                        <Input
                                          value={ex.reps || "10-12"}
                                          onChange={(e) => handleUpdateExerciseInForm(idx, "reps", e.target.value)}
                                          placeholder="Ex: 10-12"
                                          className="h-9 text-xs rounded-xl text-center font-bold"
                                        />
                                      </div>
                                    )}
                                    {!ex.isIndividual && (
                                      <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Carga (kg)</Label>
                                        <Input
                                          value={ex.isBodyweight ? "p.c." : (ex.load || "")}
                                          onChange={(e) => handleUpdateExerciseInForm(idx, "load", e.target.value)}
                                          disabled={ex.isBodyweight}
                                          placeholder={ex.isBodyweight ? "p.c." : "Auto"}
                                          className="h-9 text-xs rounded-xl text-center font-bold disabled:opacity-80"
                                        />
                                      </div>
                                    )}
                                    {!ex.isIndividual && (
                                      <div className="space-y-1">
                                        <Label className="text-[10px] uppercase font-bold text-muted-foreground">Descanso</Label>
                                        <RestTimeInput
                                          value={ex.rest || "01:00"}
                                          onChange={(newRest) => {
                                            handleUpdateExerciseInForm(idx, "rest", newRest);
                                            const parts = newRest.split(":");
                                            const secs = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
                                            handleUpdateExerciseInForm(idx, "restSeconds", secs || 60);
                                          }}
                                          className="w-full"
                                        />
                                      </div>
                                    )}
                                  </div>

                                  {/* Checkboxes de Opções Rápidas */}
                                  <div className="flex flex-wrap items-center gap-4 px-1 py-1 border-t border-border/40 pt-2.5">
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`ex-bw-${idx}`}
                                        checked={ex.isBodyweight || false}
                                        onCheckedChange={(checked) => handleToggleBodyweight(idx, !!checked)}
                                      />
                                      <Label htmlFor={`ex-bw-${idx}`} className="text-xs text-muted-foreground cursor-pointer font-medium">
                                        Peso do corpo
                                      </Label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`ex-ind-${idx}`}
                                        checked={ex.isIndividual || false}
                                        onCheckedChange={(checked) => handleToggleIndividual(idx, !!checked)}
                                      />
                                      <Label htmlFor={`ex-ind-${idx}`} className="text-xs text-muted-foreground cursor-pointer font-medium">
                                        Configurar séries individualmente
                                      </Label>
                                    </div>

                                    <div className="flex items-center gap-1.5 ml-auto">
                                      <span className="text-[10px] font-bold text-muted-foreground">Modificar Reps:</span>
                                      <Select
                                        value={ex.allowRepsModification === null ? "inherit" : String(ex.allowRepsModification)}
                                        onValueChange={(val) => {
                                          const converted = val === "inherit" ? null : val === "true";
                                          handleUpdateExerciseInForm(idx, "allowRepsModification", converted);
                                        }}
                                      >
                                        <SelectTrigger className="h-7 text-[11px] font-semibold border-border bg-card px-2 w-auto gap-1">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="inherit" className="text-xs">Herdar Global</SelectItem>
                                          <SelectItem value="true" className="text-xs">Liberado</SelectItem>
                                          <SelectItem value="false" className="text-xs">Bloqueado</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  {/* Tabela de Séries Individuais */}
                                  {ex.isIndividual && (
                                    <div className="border border-border/60 rounded-xl p-2.5 bg-muted/20 space-y-2">
                                      <div className="grid grid-cols-[36px_1fr_1fr_1.2fr] gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                                        <div>Série</div>
                                        <div>Reps</div>
                                        <div>Carga</div>
                                        <div>Descanso</div>
                                      </div>
                                      <div className="space-y-1.5">
                                        {Array.from({ length: Number(ex.sets) || 1 }).map((_, si) => {
                                          const setItem = ex.individualSets?.[si] || { reps: "10", load: "", rest: "01:00" };
                                          return (
                                            <div key={si} className="grid grid-cols-[36px_1fr_1fr_1.2fr] gap-2 items-center">
                                              <span className="text-xs font-bold text-muted-foreground pl-1">#{si + 1}</span>
                                              <Input
                                                value={setItem.reps}
                                                onChange={(e) => handleUpdateIndividualSetField(idx, si, "reps", e.target.value)}
                                                placeholder="10"
                                                className="h-8 text-xs font-semibold rounded-lg text-center bg-card"
                                              />
                                              <Input
                                                value={ex.isBodyweight ? "p.c." : (setItem.load || "")}
                                                onChange={(e) => handleUpdateIndividualSetField(idx, si, "load", e.target.value)}
                                                disabled={ex.isBodyweight}
                                                placeholder={ex.isBodyweight ? "p.c." : "Auto"}
                                                className="h-8 text-xs font-semibold rounded-lg text-center bg-card disabled:opacity-80"
                                              />
                                              <RestTimeInput
                                                value={setItem.rest || "01:00"}
                                                onChange={(newRest) => handleUpdateIndividualSetField(idx, si, "rest", newRest)}
                                                className="w-full"
                                              />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Seção de Métodos Avançados */}
                                  <div className="border border-border/60 rounded-xl p-3 bg-muted/20 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Método Avançado
                                      </Label>
                                      {ex.methodType && ex.methodType !== "NONE" && (
                                        <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/5 font-semibold">
                                          Ativo: {ex.methodType}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                                      {[
                                        { id: "NONE", label: "Nenhum" },
                                        { id: "DROPSET", label: "Dropset" },
                                        { id: "REST_PAUSE", label: "Rest-Pause" },
                                        { id: "BISET", label: "Bi-set" },
                                        { id: "TRISET", label: "Tri-set" },
                                        { id: "CIRCUIT", label: "Circuito" },
                                      ].map((m) => (
                                        <Button
                                          key={m.id}
                                          type="button"
                                          variant={(ex.methodType || "NONE") === m.id ? "default" : "outline"}
                                          size="sm"
                                          className="h-8 text-[11px] font-semibold rounded-lg"
                                          onClick={() => handleUpdateExerciseMethod(idx, m.id)}
                                        >
                                          {m.label}
                                        </Button>
                                      ))}
                                    </div>

                                    {/* Configuração de Dropset */}
                                    {ex.methodType === "DROPSET" && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40 animate-in fade-in duration-200">
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Quedas (Drops)</Label>
                                          <div className="grid grid-cols-3 gap-1.5">
                                            {[1, 2, 3].map((d) => (
                                              <Button
                                                key={d}
                                                type="button"
                                                variant={(ex.methodConfig?.drops ?? 2) === d ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 text-xs rounded-lg"
                                                onClick={() => handleUpdateExerciseMethod(idx, "DROPSET", { drops: d })}
                                              >
                                                {d}
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Redução da Carga</Label>
                                          <div className="grid grid-cols-4 gap-1.5">
                                            {[10, 20, 30, 40].map((r) => (
                                              <Button
                                                key={r}
                                                type="button"
                                                variant={(ex.methodConfig?.reduction ?? 20) === r ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 text-xs rounded-lg"
                                                onClick={() => handleUpdateExerciseMethod(idx, "DROPSET", { reduction: r })}
                                              >
                                                {r}%
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Configuração de Rest-Pause */}
                                    {ex.methodType === "REST_PAUSE" && (
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/40 animate-in fade-in duration-200">
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Tempo de Pausa</Label>
                                          <div className="grid grid-cols-3 gap-1.5">
                                            {[10, 15, 20].map((p) => (
                                              <Button
                                                key={p}
                                                type="button"
                                                variant={(ex.methodConfig?.pause ?? 15) === p ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 text-xs rounded-lg"
                                                onClick={() => handleUpdateExerciseMethod(idx, "REST_PAUSE", { pause: p })}
                                              >
                                                {p}s
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="space-y-1.5">
                                          <Label className="text-[10px] font-bold text-muted-foreground uppercase">Repetições de Pausa (Rounds)</Label>
                                          <div className="grid grid-cols-3 gap-1.5">
                                            {[1, 2, 3].map((r) => (
                                              <Button
                                                key={r}
                                                type="button"
                                                variant={(ex.methodConfig?.rounds ?? 3) === r ? "default" : "outline"}
                                                size="sm"
                                                className="h-7 text-xs rounded-lg"
                                                onClick={() => handleUpdateExerciseMethod(idx, "REST_PAUSE", { rounds: r })}
                                              >
                                                {r}
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Observações do Exercício */}
                                  <div className="space-y-1">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Observações do Exercício</Label>
                                    <Input
                                      value={ex.notes || ""}
                                      onChange={(e) => handleUpdateExerciseInForm(idx, "notes", e.target.value)}
                                      placeholder="Ex: Executar com pegada supinada, cadência 3-0-1-0..."
                                      className="h-8 text-xs rounded-xl bg-card"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {editingRecord.entityType === "ASSESSMENT" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Data da Avaliação</Label>
                      <Input
                        value={editFormData.date || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                        placeholder="Ex: 22/07/2026"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Tipo / Descrição</Label>
                      <Input
                        value={editFormData.type || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                        placeholder="Ex: Avaliação Física Inicial"
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Peso (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.weight ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, weight: parseFloat(e.target.value) || null })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Altura (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={editFormData.height ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, height: parseFloat(e.target.value) || null })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">% Gordura</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.bodyFat ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, bodyFat: parseFloat(e.target.value) || null })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Massa Muscular (kg)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.muscleMass ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, muscleMass: parseFloat(e.target.value) || null })}
                        className="h-10 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <Label className="text-xs font-bold">Observações / Anotações</Label>
                    <Textarea
                      value={editFormData.notes || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      placeholder="Observações da avaliação..."
                      className="text-xs rounded-xl min-h-[70px]"
                    />
                  </div>
                </div>
              )}

              {editingRecord.entityType === "MEASUREMENT" && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Data da Medição</Label>
                    <Input
                      value={editFormData.date || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                      placeholder="Ex: 22/07/2026"
                      className="h-10 text-xs rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Peitoral (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.chest ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, chest: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Cintura (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.waist ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, waist: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Abdômen (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.abdomen ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, abdomen: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Quadril (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.hips ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, hips: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Braço Dir (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.rightArm ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, rightArm: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Braço Esq (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.leftArm ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, leftArm: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Coxa Dir (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.rightThigh ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, rightThigh: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Coxa Esq (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.leftThigh ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, leftThigh: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Panturrilha Dir (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.rightCalf ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, rightCalf: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold">Panturrilha Esq (cm)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={editFormData.leftCalf ?? ""}
                        onChange={(e) => setEditFormData({ ...editFormData, leftCalf: parseFloat(e.target.value) || null })}
                        className="h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <Label className="text-xs font-bold">Observações / Anotações</Label>
                    <Textarea
                      value={editFormData.notes || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                      placeholder="Observações das medidas corporais..."
                      className="text-xs rounded-xl min-h-[70px]"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-10 text-xs rounded-xl w-full sm:w-auto" onClick={() => setEditingRecord(null)}>
              Cancelar
            </Button>
            <Button
              disabled={
                isSavingEdit ||
                isMatchingExercises ||
                (editingRecord?.entityType === "WORKOUT" &&
                  (!editFormData.targetStudentIds || editFormData.targetStudentIds.length === 0) &&
                  !editFormData.saveToLibrary)
              }
              size="sm"
              className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto gap-2"
              onClick={handleSaveEdit}
            >
              {isSavingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InsufficientCreditsModal
        open={isInsufficientCreditsOpen}
        onOpenChange={setIsInsufficientCreditsOpen}
        role={role}
        workspaceId={workspaceId}
        creditsApiBasePath={creditsApiBasePath}
        subscriptionRoute={role === "gym" ? "/gym/subscription" : "/personal/subscription"}
        onSuccess={() => {
          fetchJobDetails();
          loadRecords(reviewTab, true);
        }}
      />
    </div>
  );
}
