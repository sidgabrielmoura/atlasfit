"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  FileSpreadsheet,
  Loader2,
  Trash2,
  ChevronRight,
  Clock,
  ArrowLeft,
  Zap,
  RefreshCw,
  Pause,
  Play,
  Coins,
  FileText,
  AlertTriangle,
  LayoutGrid,
  List,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { workspaceStore } from "@/stores/workspace.store";
import { useSnapshot } from "valtio";
import Link from "next/link";
import { useMigrationRealtime, useImportCreditRealtime } from "@/hooks/use-import-realtime";
import { createMigrationUpdates, type ImportQuotaBalance } from "@/lib/migration/realtime";
import { useImportCommit } from "@/providers/import-commit-provider";
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
import { cn } from "@/lib/utils";
import { InsufficientCreditsModal } from "./insufficient-credits-modal";

export interface MigrationJob {
  id: string;
  sourcePlatform: string;
  status: "UPLOADED" | "PROCESSING" | "REVIEW" | "IMPORTING" | "COMPLETED" | "PARTIAL" | "FAILED" | "CANCELLED";
  processingStep: string;
  progressPercentage?: number;
  estimatedSecondsRemaining?: number;
  progressMessage?: string;
  creditsConsumed?: number;
  pauseReason?: "CREDITS_EXHAUSTED" | "MANUAL_PAUSE" | null;
  pausedAt?: string | null;
  totalStudents: number;
  totalWorkouts: number;
  totalExercises: number;
  totalAssessments: number;
  totalMeasurements: number;
  errorCode?: string | null;
  safeErrorMessage?: string | null;
  createdAt: string;
}

interface MigrationDashboardViewProps {
  role?: "personal" | "gym";
  baseRoute?: string;
  backRoute?: string;
  creditsRoute?: string;
  apiBasePath?: string;
  creditsApiBasePath?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function MigrationDashboardView({
  role = "personal",
  baseRoute: customBaseRoute,
  backRoute: customBackRoute,
  creditsRoute: customCreditsRoute,
  apiBasePath: customApiBasePath,
  creditsApiBasePath: customCreditsApiBasePath,
  title: customTitle,
  description: customDescription,
  className,
}: MigrationDashboardViewProps) {
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;
  const commit = useImportCommit();

  const baseRoute = customBaseRoute || (role === "gym" ? "/gym/import" : "/personal/clients/migrate");
  const backRoute = customBackRoute || (role === "gym" ? "/gym/students" : "/personal/clients");
  const creditsRoute = customCreditsRoute || (role === "gym" ? "/gym/credits" : "/personal/credits");
  const apiBasePath = customApiBasePath || (role === "gym" ? "/api/gym/migration" : "/api/personal/migration");
  const creditsApiBasePath = customCreditsApiBasePath || (role === "gym" ? "/api/gym/credits" : "/api/personal/credits");
  const title = customTitle || (role === "gym" ? "Importação Assistida" : "Importações de Alunos");
  const description = customDescription || "Migração inteligente com consumo dinâmico de créditos e tempo real.";

  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reprocessingJobId, setReprocessingJobId] = useState<string | null>(null);
  const [pausingJobId, setPausingJobId] = useState<string | null>(null);
  const [isInsufficientCreditsOpen, setIsInsufficientCreditsOpen] = useState(false);

  // Modo de visualização dos cards: "grid" vs "list"
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("atlasfit_migration_jobs_view");
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    } catch { }
  }, []);

  const handleToggleViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("atlasfit_migration_jobs_view", mode);
    } catch { }
  };

  const updates = useMemo(createMigrationUpdates, [workspaceId, apiBasePath]);
  const quotaRevision = useRef(0);
  const jobsRequest = useRef(0);
  const quotaRequest = useRef(0);
  const [quotaBalance, setQuotaBalance] = useState<ImportQuotaBalance | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  const fetchQuotaBalance = useCallback(async () => {
    if (!workspaceId) return;
    const revision = quotaRevision.current;
    const request = ++quotaRequest.current;
    try {
      const res = await fetch(`${creditsApiBasePath}/balance?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        if (request === quotaRequest.current && revision === quotaRevision.current && workspaceStore.activeWorkspaceId === workspaceId) setQuotaBalance(data);
      }
    } catch {
      // Keep the last known balance visible while reconnecting.
    } finally {
      if (request === quotaRequest.current && workspaceStore.activeWorkspaceId === workspaceId) setIsLoadingQuota(false);
    }
  }, [workspaceId, creditsApiBasePath]);

  const fetchJobs = useCallback(async () => {
    if (!workspaceId) return;
    const revision = updates.revision();
    const request = ++jobsRequest.current;
    try {
      const res = await fetch(`${apiBasePath}?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data: MigrationJob[] = await res.json();
        if (request === jobsRequest.current && workspaceStore.activeWorkspaceId === workspaceId) {
          setJobs(data.map(job => updates.merge(job, revision)));
        }
      }
    } catch {
      if (request === jobsRequest.current && workspaceStore.activeWorkspaceId === workspaceId) toast.error("Erro ao carregar lista de importações.");
    } finally {
      if (request === jobsRequest.current && workspaceStore.activeWorkspaceId === workspaceId) setIsLoadingJobs(false);
    }
  }, [workspaceId, apiBasePath, updates]);

  useEffect(() => {
    setJobs([]);
    setQuotaBalance(null);
    setIsLoadingJobs(true);
    setIsLoadingQuota(true);
    void fetchJobs();
    void fetchQuotaBalance();
    return () => { jobsRequest.current++; quotaRequest.current++; };
  }, [fetchJobs, fetchQuotaBalance]);

  const jobsRef = useRef(jobs);
  useEffect(() => { jobsRef.current = jobs; }, [jobs]);
  const realtimeUnavailable = useMigrationRealtime(workspaceId, payload => {
    updates.receive(payload);
    if (!jobsRef.current.some(job => job.id === payload.jobId)) {
      void fetchJobs();
      return;
    }
    setJobs(previous => previous.map(job => job.id === payload.jobId ? { ...job, ...payload } as MigrationJob : job));
  }, () => { void fetchJobs(); });
  useImportCreditRealtime(workspaceId, role, balance => {
    quotaRevision.current++;
    setQuotaBalance(balance);
    setIsLoadingQuota(false);
  }, () => { void fetchQuotaBalance(); });
  useEffect(() => {
    const state = commit?.state;
    if (!state || state.workspaceId !== workspaceId) return;
    const status = state.phase === "running" ? "IMPORTING" : state.result?.status;
    if (!status) { if (state.phase === "error") void fetchJobs(); return; }
    const patch: { jobId: string; status: MigrationJob["status"]; processingStep: string } = { jobId: state.jobId, status, processingStep: status === "IMPORTING" ? "COMMITTING" : "IDLE" };
    updates.receive(patch);
    setJobs(previous => previous.map(job => job.id === state.jobId ? { ...job, ...patch } : job));
  }, [commit?.state, workspaceId, updates, fetchJobs]);

  const handlePauseJob = async (jobId: string) => {
    setPausingJobId(jobId);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/pause`, {
        method: "POST",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.currentStatus) {
          setJobs((prev) =>
            prev.map((j) => (j.id === jobId ? { ...j, status: data.currentStatus } : j))
          );
        }
        throw new Error(data.message || data.error || "Não foi possível pausar a importação.");
      }

      toast.success("Processamento pausado!");
      fetchJobs();
      fetchQuotaBalance();
    } catch (err: any) {
      toast.error(err.message || "Erro ao pausar processamento.");
    } finally {
      setPausingJobId(null);
    }
  };

  const handleResumeOrRetryJob = async (jobId: string) => {
    setReprocessingJobId(jobId);
    try {
      const res = await fetch(`${apiBasePath}/${jobId}/process`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402 || data.pauseReason === "CREDITS_EXHAUSTED" || data.errorCode === "CREDITS_EXHAUSTED") {
          setIsInsufficientCreditsOpen(true);
          return;
        }
        throw new Error(data.error || data.message || "Erro ao retomar processamento.");
      }

      toast.success("Processamento retomado!");
      fetchJobs();
      fetchQuotaBalance();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar.");
    } finally {
      setReprocessingJobId(null);
    }
  };

  const handleDeleteJob = async () => {
    if (!deletingJobId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${apiBasePath}/${deletingJobId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Erro ao cancelar job.");
      }

      toast.success("Importação excluída com sucesso!");
      setJobs((prev) => prev.filter((j) => j.id !== deletingJobId));
      setDeletingJobId(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir importação.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStepProgressPercentage = (job: MigrationJob) => {
    if (typeof job.progressPercentage === "number") {
      return job.progressPercentage;
    }
    if (job.status === "COMPLETED") return 100;
    if (job.status === "REVIEW") return 98;
    if (job.status === "FAILED") return 100;
    if (job.status === "PARTIAL") return 70;

    switch (job.processingStep) {
      case "UPLOADING": return 10;
      case "VALIDATING_QUOTA": return 20;
      case "DISPATCHING_OCR": return 35;
      case "EXTRACTING": return 55;
      case "NORMALIZING": return 80;
      case "MATCHING": return 90;
      case "PREPARING_REVIEW": return 98;
      default: return 15;
    }
  };

  const getEstimatedSecondsRemaining = (job: MigrationJob) => {
    if (job.status === "COMPLETED" || job.status === "REVIEW" || job.status === "FAILED" || job.status === "PARTIAL") return 0;
    if (typeof job.estimatedSecondsRemaining === "number") {
      return job.estimatedSecondsRemaining;
    }
    const pct = getStepProgressPercentage(job);
    return Math.max(5, Math.round((100 - pct) * 0.5));
  };

  const formatEstimatedTime = (seconds: number) => {
    if (seconds <= 0) return "Poucos segundos";
    if (seconds < 60) return `~${seconds}s`;
    const mins = Math.ceil(seconds / 60);
    return `~${mins}min`;
  };

  const renderStatusBadge = (job: MigrationJob) => {
    if (job.status === "IMPORTING") return <Badge variant="secondary">Criando alunos</Badge>;
    const isProcessing = job.status === "PROCESSING" || job.status === "UPLOADED";
    const isPartial = job.status === "PARTIAL";
    const isCreditsExhausted = isPartial && job.pauseReason === "CREDITS_EXHAUSTED";
    const isUserPaused = isPartial && job.pauseReason === "MANUAL_PAUSE";
    const isReviewNeeded = job.status === "REVIEW";
    const isCompleted = job.status === "COMPLETED";
    const isFailed = job.status === "FAILED";

    if (isCompleted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
          Concluído
        </span>
      );
    }
    if (isReviewNeeded) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
          Aguardando Revisão
        </span>
      );
    }
    if (isProcessing) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
          <span className="size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
          Processando
        </span>
      );
    }
    if (isCreditsExhausted) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
          Incompleto (Sem créditos)
        </span>
      );
    }
    if (isUserPaused) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/50">
          <Pause className="size-2.5 shrink-0" />
          Pausado
        </span>
      );
    }
    if (isPartial) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
          Incompleto
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
          <span className="size-1.5 rounded-full bg-destructive shrink-0" />
          Falhou
        </span>
      );
    }
    return null;
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
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">{title}</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {description}
            </p>
          </div>
        </div>

        <Link href={`${baseRoute}/new`} className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto gap-2 font-bold rounded-2xl h-11 px-5 shadow-xs">
            <Plus className="h-4 w-4" /> Nova Importação
          </Button>
        </Link>
      </div>

      {realtimeUnavailable && jobs.some(job => job.status === "PROCESSING" || job.status === "UPLOADED") && (
        <p role="status" className="text-xs text-muted-foreground">Conectando às atualizações em tempo real… O progresso será sincronizado ao conectar.</p>
      )}

      {isLoadingQuota ? (
        <Skeleton className="h-14 w-full rounded-2xl" />
      ) : quotaBalance && !quotaBalance.allowed ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-xs">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> Limite de créditos atingido
            </p>
            <p className="text-[11px] text-muted-foreground">
              Adquira mais créditos para continuar importando planilhas, PDFs e imagens.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setIsInsufficientCreditsOpen(true)}
            className="h-9 w-full sm:w-auto rounded-xl font-bold text-xs gap-1.5"
          >
            <Zap className="size-3.5" /> Comprar Créditos
          </Button>
        </div>
      ) : quotaBalance ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border border-border/40 bg-card/60 gap-3 shadow-2xs">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <span>Franquia mensal:</span>
              <span className="font-black text-foreground">
                {Math.max(0, quotaBalance.quotaTotal - quotaBalance.quotaUsed)}/{quotaBalance.quotaTotal} créditos
              </span>
            </div>
            <div className="w-px h-4 bg-border/60 hidden sm:block" />
            <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
              <span>Créditos avulsos:</span>
              <span className="font-black text-primary flex items-center gap-1">
                <Coins className="size-3" />
                {quotaBalance.credits}
              </span>
            </div>
          </div>
          <Link href={creditsRoute} className="text-[11px] font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1">
            Comprar mais créditos <ChevronRight className="size-3" />
          </Link>
        </div>
      ) : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Histórico de Importações</h2>
            <span className="text-xs text-muted-foreground/80 font-medium">({jobs.length})</span>
          </div>

          {/* Botão de Alternância de Visualização dos Cards (Grid vs List) */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
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

        <section>
          {isLoadingJobs ? (
            <div className="gap-3 grid grid-cols-1 lg:grid-cols-2">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : jobs.length === 0 ? (
            <Card className="py-12 text-center border-dashed rounded-3xl bg-card/30">
              <CardContent className="space-y-3 max-w-sm mx-auto">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-sm text-foreground">Nenhuma importação realizada</p>
                  <p className="text-xs text-muted-foreground">
                    Importe alunos, treinos e dados via PDF, planilha ou imagens.
                  </p>
                </div>
                <Link href={`${baseRoute}/new`} className="inline-block pt-1">
                  <Button size="sm" className="font-bold rounded-xl gap-2 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Criar Primeira Importação
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : viewMode === "list" ? (
            <div className="space-y-2.5">
              {jobs.map((job) => {
                const progress = getStepProgressPercentage(job);
                const isProcessing = job.status === "PROCESSING" || job.status === "UPLOADED";
                const isPartial = job.status === "PARTIAL";
                const isCreditsExhausted = isPartial && job.pauseReason === "CREDITS_EXHAUSTED";
                const isReviewNeeded = job.status === "REVIEW";
                const isCompleted = job.status === "COMPLETED";
                const isFailed = job.status === "FAILED";

                return (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 2 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="border rounded-2xl p-3 sm:p-4 bg-card/70 hover:border-border/80 transition-all border-border/40">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        {/* Info Principal */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 border border-border/40">
                            {job.sourcePlatform === "planilha" ? (
                              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-foreground capitalize truncate">
                                {job.sourcePlatform}
                              </span>
                              {renderStatusBadge(job)}
                            </div>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono mt-0.5">
                              <Clock className="size-2.5" />
                              {new Date(job.createdAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Contadores e Créditos */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[11px]">
                          <div className="flex items-center gap-2 text-muted-foreground font-medium">
                            <span><strong className="text-foreground">{job.totalStudents}</strong> alunos</span>
                            <span>•</span>
                            <span><strong className="text-foreground">{job.totalWorkouts}</strong> treinos</span>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] font-semibold text-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/40">
                            <Coins className="size-3 text-primary" />
                            <span>{job.creditsConsumed ?? 0}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">créditos</span>
                          </div>

                          {isProcessing && (
                            <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                              <Loader2 className="size-3 animate-spin text-primary" />
                              {progress}% (~{formatEstimatedTime(getEstimatedSecondsRemaining(job))})
                            </span>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          {isProcessing && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted/40"
                              disabled={pausingJobId === job.id}
                              onClick={() => handlePauseJob(job.id)}
                            >
                              {pausingJobId === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                              Pausar
                            </Button>
                          )}

                          {isPartial && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
                              disabled={reprocessingJobId === job.id}
                              onClick={() => {
                                if (isCreditsExhausted && quotaBalance && !quotaBalance.allowed && quotaBalance.credits === 0) {
                                  setIsInsufficientCreditsOpen(true);
                                  return;
                                }
                                handleResumeOrRetryJob(job.id);
                              }}
                            >
                              {reprocessingJobId === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                              Continuar
                            </Button>
                          )}

                          {isFailed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/60"
                              disabled={reprocessingJobId === job.id}
                              onClick={() => handleResumeOrRetryJob(job.id)}
                            >
                              {reprocessingJobId === job.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                              Repetir
                            </Button>
                          )}

                          {(isReviewNeeded || isPartial) && (
                            <Link href={`${baseRoute}/${job.id}`}>
                              <Button
                                variant={isReviewNeeded ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-3 rounded-xl text-xs font-bold gap-1 shadow-2xs"
                              >
                                Revisar <ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}

                          {isCompleted && (
                            <Link href={`${baseRoute}/${job.id}`}>
                              <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl text-xs font-semibold gap-1 border-border/60 hover:bg-muted/40">
                                Ver Resumo <ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                            onClick={() => setDeletingJobId(job.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* VISUALIZAÇÃO EM GRADE */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
              {jobs.map((job) => {
                const progress = getStepProgressPercentage(job);
                const isProcessing = job.status === "PROCESSING" || job.status === "UPLOADED";
                const isPartial = job.status === "PARTIAL";
                const isCreditsExhausted = isPartial && job.pauseReason === "CREDITS_EXHAUSTED";
                const isUserPaused = isPartial && job.pauseReason === "MANUAL_PAUSE";
                const isReviewNeeded = job.status === "REVIEW";
                const isCompleted = job.status === "COMPLETED";
                const isFailed = job.status === "FAILED";

                return (
                  <motion.div key={job.id} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }}>
                    <Card
                      className={`border rounded-2xl p-4 bg-card/70 transition-all space-y-3.5 hover:border-border/80 ${isProcessing ? "border-primary/40 shadow-xs" : isPartial ? "border-amber-500/30" : "border-border/40"
                        }`}
                    >
                      {/* Top Header do Card */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-8 rounded-xl bg-muted/40 flex items-center justify-center shrink-0 border border-border/40">
                            {job.sourcePlatform === "planilha" ? (
                              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <FileText className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-xs sm:text-sm text-foreground capitalize truncate block">
                              {job.sourcePlatform}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono">
                              <Clock className="size-2.5" />
                              {new Date(job.createdAt).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 flex items-center gap-1.5">
                          {renderStatusBadge(job)}
                        </div>
                      </div>

                      {/* Barra de Progresso LADO A LADO com Créditos Consumidos */}
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-muted/20 border border-border/30">
                        <div className="flex items-center justify-between text-[11px] gap-2">
                          <span className="text-muted-foreground truncate font-medium">
                            {isProcessing ? (
                              <span className="flex items-center gap-1 text-foreground">
                                <Loader2 className="size-3 animate-spin text-primary" />
                                {job.progressMessage || "Processando dados..."}
                              </span>
                            ) : isCreditsExhausted ? (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                <AlertTriangle className="size-3" /> Parou por créditos
                              </span>
                            ) : isUserPaused ? (
                              <span className="text-muted-foreground">Pausado pelo usuário</span>
                            ) : isReviewNeeded ? (
                              <span className="text-foreground">Pronto para conferência</span>
                            ) : isCompleted ? (
                              <span className="text-emerald-600 dark:text-emerald-400">Finalizado no workspace</span>
                            ) : (
                              <span>Progresso</span>
                            )}
                          </span>

                          {isProcessing && (
                            <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                              {formatEstimatedTime(getEstimatedSecondsRemaining(job))}
                            </span>
                          )}
                        </div>

                        {/* Barra lado a lado */}
                        <div className="flex items-center gap-3">
                          <div role="progressbar" aria-label="Progresso da importação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1.5 flex-1 bg-muted/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${isFailed
                                ? "bg-destructive"
                                : isPartial
                                  ? "bg-amber-500"
                                  : isCompleted
                                    ? "bg-emerald-500"
                                    : "bg-primary"
                                }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>

                          {/* Quantidade de Créditos Consumidos Lado a Lado */}
                          <div className="flex items-center gap-1 shrink-0 text-[11px] font-semibold text-foreground bg-background/80 px-2 py-0.5 rounded-md border border-border/40">
                            <Coins className="size-3 text-primary" />
                            <span>{job.creditsConsumed ?? 0}</span>
                            <span className="text-[10px] text-muted-foreground font-normal">créditos</span>
                          </div>
                        </div>
                      </div>

                      {/* Mensagem de Erro ou Alerta Seguro */}
                      {isPartial && job.safeErrorMessage && (
                        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium flex items-center gap-2 border border-amber-500/20">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{job.safeErrorMessage}</span>
                        </div>
                      )}

                      {isFailed && job.safeErrorMessage && (
                        <div className="p-2 rounded-xl bg-destructive/10 text-destructive text-[11px] font-medium flex items-center gap-2 border border-destructive/20">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{job.safeErrorMessage}</span>
                        </div>
                      )}

                      {/* Contadores Minimalistas */}
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] py-1 border-y border-border/30">
                        <div>
                          <span className="text-muted-foreground block">Alunos</span>
                          <span className="font-bold text-foreground text-xs">{job.totalStudents}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Treinos</span>
                          <span className="font-bold text-foreground text-xs">{job.totalWorkouts}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Avaliações</span>
                          <span className="font-bold text-foreground text-xs">{job.totalAssessments}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Medidas</span>
                          <span className="font-bold text-foreground text-xs">{job.totalMeasurements}</span>
                        </div>
                      </div>

                      {/* Ações do Card */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <div className="flex items-center gap-1.5">
                          {isProcessing && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 rounded-xl text-xs font-semibold gap-1.5 border-border/60 hover:bg-muted/40"
                              disabled={pausingJobId === job.id}
                              onClick={() => handlePauseJob(job.id)}
                            >
                              {pausingJobId === job.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Pause className="h-3 w-3" />
                              )}
                              Pausar
                            </Button>
                          )}

                          {isPartial && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 shadow-2xs"
                              disabled={reprocessingJobId === job.id}
                              onClick={() => {
                                if (isCreditsExhausted && quotaBalance && !quotaBalance.allowed && quotaBalance.credits === 0) {
                                  setIsInsufficientCreditsOpen(true);
                                  return;
                                }
                                handleResumeOrRetryJob(job.id);
                              }}
                            >
                              {reprocessingJobId === job.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Play className="h-3 w-3 fill-current" />
                              )}
                              Continuar Processamento
                            </Button>
                          )}

                          {isFailed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1.5 border-border/60"
                              disabled={reprocessingJobId === job.id}
                              onClick={() => handleResumeOrRetryJob(job.id)}
                            >
                              {reprocessingJobId === job.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Tentar Novamente
                            </Button>
                          )}

                          {(isReviewNeeded || isPartial) && (
                            <Link href={`${baseRoute}/${job.id}`}>
                              <Button
                                variant={isReviewNeeded ? "default" : "outline"}
                                size="sm"
                                className="h-8 px-3 rounded-xl text-xs font-bold gap-1 shadow-2xs"
                              >
                                Revisar <ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}

                          {isCompleted && (
                            <Link href={`${baseRoute}/${job.id}`}>
                              <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl text-xs font-semibold gap-1 border-border/60 hover:bg-muted/40">
                                Ver Resumo <ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          onClick={() => setDeletingJobId(job.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={!!deletingJobId} onOpenChange={(open) => !open && setDeletingJobId(null)}>
        <AlertDialogContent className="w-[92vw] sm:max-w-md rounded-3xl! p-5 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive">Excluir Importação</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Tem certeza que deseja cancelar e remover este registro de importação? Os dados ainda não confirmados serão descartados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 pt-2">
            <AlertDialogCancel disabled={isDeleting} className="h-10 text-xs rounded-xl w-full sm:w-auto">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="h-10 text-xs font-bold rounded-xl w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
              disabled={isDeleting}
              onClick={handleDeleteJob}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InsufficientCreditsModal
        open={isInsufficientCreditsOpen}
        onOpenChange={setIsInsufficientCreditsOpen}
        role={role}
        workspaceId={workspaceId}
        creditsApiBasePath={creditsApiBasePath}
        subscriptionRoute={role === "gym" ? "/gym/subscription" : "/personal/subscription"}
        onSuccess={() => {
          fetchJobs();
          fetchQuotaBalance();
        }}
      />
    </div>
  );
}
