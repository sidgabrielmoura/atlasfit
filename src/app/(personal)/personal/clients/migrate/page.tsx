"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  ChevronRight,
  Info,
  Clock,
  Users,
  Dumbbell,
  ArrowLeft,
  Zap,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { workspaceStore } from "@/stores/workspace.store";
import { useSnapshot } from "valtio";
import Link from "next/link";
import { useAbly } from "@/providers/ably-provider";
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

interface MigrationJob {
  id: string;
  sourcePlatform: string;
  status: "UPLOADED" | "PROCESSING" | "REVIEW" | "IMPORTING" | "COMPLETED" | "FAILED" | "CANCELLED";
  processingStep: string;
  progressPercentage?: number;
  estimatedSecondsRemaining?: number;
  progressMessage?: string;
  totalStudents: number;
  totalWorkouts: number;
  totalExercises: number;
  totalAssessments: number;
  totalMeasurements: number;
  errorCode?: string | null;
  safeErrorMessage?: string | null;
  createdAt: string;
}

export default function MigrationDashboardPage() {
  const router = useRouter();
  const ably = useAbly();
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;

  const [jobs, setJobs] = useState<MigrationJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reprocessingJobId, setReprocessingJobId] = useState<string | null>(null);

  const handleRetryJob = async (jobId: string) => {
    setReprocessingJobId(jobId);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/process`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Erro ao reiniciar processamento.");
      }

      toast.success("Processamento reiniciado!");
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reprocessar.");
    } finally {
      setReprocessingJobId(null);
    }
  };

  const [quotaBalance, setQuotaBalance] = useState<{
    allowed: boolean;
    remaining: number;
    quotaUsed: number;
    quotaTotal: number;
    credits: number;
  } | null>(null);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);

  const fetchQuotaBalance = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingQuota(true);
    try {
      const res = await fetch(`/api/personal/credits/balance?workspaceId=${workspaceId}`);
      if (res.ok) setQuotaBalance(await res.json());
    } finally {
      setIsLoadingQuota(false);
    }
  }, [workspaceId]);

  const fetchJobs = useCallback(async () => {
    if (!workspaceId) return;
    setIsLoadingJobs(true);
    try {
      const res = await fetch(`/api/personal/migration?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch {
      toast.error("Erro ao carregar lista de importações.");
    } finally {
      setIsLoadingJobs(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchJobs();
    fetchQuotaBalance();
  }, [fetchJobs, fetchQuotaBalance]);

  // Real-time updates via Ably
  useEffect(() => {
    if (!ably || !workspaceId) return;

    const channelName = `migration:${workspaceId}`;
    const channel = ably.channels.get(channelName);

    const handleJobUpdate = (message: any) => {
      const payload = message.data;
      if (!payload || !payload.jobId) return;

      setJobs((prevJobs) => {
        const index = prevJobs.findIndex((j) => j.id === payload.jobId);
        if (index !== -1) {
          const updated = [...prevJobs];
          updated[index] = {
            ...updated[index],
            ...payload,
          };
          return updated;
        } else {
          fetchJobs();
          return prevJobs;
        }
      });
    };

    channel.subscribe("job_updated", handleJobUpdate);

    return () => {
      channel.unsubscribe("job_updated", handleJobUpdate);
    };
  }, [ably, workspaceId, fetchJobs]);

  const handleDeleteJob = async () => {
    if (!deletingJobId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/personal/migration/${deletingJobId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Importação removida com sucesso.");
      setJobs((prev) => prev.filter((j) => j.id !== deletingJobId));
      setDeletingJobId(null);
    } catch {
      toast.error("Erro ao excluir importação.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStepProgressPercentage = (job: MigrationJob) => {
    if (job.status === "COMPLETED" || job.status === "REVIEW") return 100;
    if (job.status === "FAILED" || job.status === "CANCELLED") return 0;
    if (typeof job.progressPercentage === "number" && job.progressPercentage > 0) {
      return job.progressPercentage;
    }

    switch (job.processingStep) {
      case "PARSING": return 20;
      case "EXTRACTING": return 50;
      case "NORMALIZING": return 80;
      case "MATCHING": return 90;
      case "PREPARING_REVIEW": return 98;
      default: return 15;
    }
  };

  const getEstimatedSecondsRemaining = (job: MigrationJob) => {
    if (job.status === "COMPLETED" || job.status === "REVIEW" || job.status === "FAILED") return 0;
    if (typeof job.estimatedSecondsRemaining === "number") {
      return job.estimatedSecondsRemaining;
    }
    const pct = getStepProgressPercentage(job);
    return Math.max(5, Math.round((100 - pct) * 0.5));
  };

  const formatEstimatedTime = (seconds: number) => {
    if (seconds <= 0) return "Poucos segundos";
    if (seconds < 60) return `~${seconds} seg`;
    const mins = Math.ceil(seconds / 60);
    return `~${mins} min`;
  };

  const activeProcessingJob = jobs.find(j => j.status === "PROCESSING" || j.status === "UPLOADED");

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 space-y-6 mx-auto max-w-5xl font-sans pb-24 sm:pb-8">
      {/* Header Corporativo Respondivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-2xl shrink-0 active:scale-95 transition-transform"
            onClick={() => router.push("/personal/clients")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Importações de Alunos</h1>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-black bg-primary/10 text-primary">
                Dashboard
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Acompanhe e gerencie as migrações de dados em tempo real.
            </p>
          </div>
        </div>

        <Link href="/personal/clients/migrate/new" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto gap-2 font-bold rounded-2xl h-11 px-5 shadow-xs">
            <Plus className="h-4 w-4" /> Nova Importação
          </Button>
        </Link>
      </div>

      {/* Banner de Saldo de Importação */}
      {isLoadingQuota ? (
        <Skeleton className="h-14 w-full rounded-2xl" />
      ) : quotaBalance && !quotaBalance.allowed ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-destructive/20 bg-destructive/5 backdrop-blur-xs">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
              <AlertTriangle className="size-3.5" /> Limite de importações atingido
            </p>
            <p className="text-[11px] text-muted-foreground">Adquira mais créditos para continuar importando planilhas e fotos de alunos.</p>
          </div>
          <Link href="/personal/credits" className="w-full sm:w-auto shrink-0">
            <Button size="sm" className="h-9 w-full sm:w-auto rounded-xl font-bold text-xs gap-1.5">
              <Zap className="size-3.5" /> Comprar Créditos
            </Button>
          </Link>
        </div>
      ) : quotaBalance ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-3xl border border-border/50 bg-card/60 gap-2 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground font-medium">
              Franquia mensal:
              <span className="font-black text-foreground ml-1.5">
                {Math.max(0, quotaBalance.quotaTotal - quotaBalance.quotaUsed)}/{quotaBalance.quotaTotal}
              </span>
            </div>
            <div className="w-px h-4 bg-border/60" />
            <div className="text-xs text-muted-foreground font-medium">
              Créditos avulsos:
              <span className="font-black text-primary ml-1.5">{quotaBalance.credits}</span>
            </div>
          </div>
          <Link href="/personal/credits" className="text-[11px] font-black uppercase tracking-wider text-primary hover:underline">
            Comprar mais créditos
          </Link>
        </div>
      ) : null}

      {/* Lista de Importações */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Histórico de Importações</h2>
          <span className="text-xs text-muted-foreground/80 font-medium">{jobs.length} registro(s)</span>
        </div>

        {isLoadingJobs ? (
          <div className="space-y-3">
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
                  Importe alunos, treinos e dados via PDF, planilha ou foto.
                </p>
              </div>
              <Link href="/personal/clients/migrate/new" className="inline-block pt-1">
                <Button size="sm" className="font-bold rounded-xl gap-2 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Criar Primeira Importação
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => {
              const progress = getStepProgressPercentage(job);
              const isProcessing = job.status === "PROCESSING" || job.status === "UPLOADED";
              const isReviewNeeded = job.status === "REVIEW";
              const isCompleted = job.status === "COMPLETED";
              const isFailed = job.status === "FAILED";

              return (
                <motion.div key={job.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`border rounded-2xl p-4 sm:p-5 bg-card/80 backdrop-blur-xs transition-all space-y-4 hover:border-border ${isProcessing ? "border-primary/40 shadow-xs" : "border-border/50"
                    }`}>
                    <section className="flex flex-col items-end space-y-1.5">
                      {isCompleted && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                          Concluído
                        </span>
                      )}
                      {isReviewNeeded && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
                          Aguardando Revisão
                        </span>
                      )}
                      {isProcessing && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                          <span className="size-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                          Processando
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-destructive/10 text-destructive border border-destructive/20">
                          <span className="size-1.5 rounded-full bg-destructive shrink-0" />
                          Falhou
                        </span>
                      )}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0 border border-border/40">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground tracking-tight truncate">
                                {job.sourcePlatform}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="size-3" />
                              <span>{new Date(job.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {isReviewNeeded && (
                            <Link href={`/personal/clients/migrate/${job.id}`}>
                              <Button size="sm" className="h-8 px-3.5 rounded-xl text-xs font-bold gap-1 shadow-2xs">
                                Revisar <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          {isCompleted && (
                            <Link href={`/personal/clients/migrate/${job.id}`}>
                              <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl text-xs font-semibold gap-1 border-border/60 hover:bg-muted/40">
                                Ver Resumo <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                          {isFailed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 rounded-xl text-xs font-semibold gap-1 border-border/60"
                              disabled={reprocessingJobId === job.id}
                              onClick={() => handleRetryJob(job.id)}
                            >
                              {reprocessingJobId === job.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Tentar Novamente
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => setDeletingJobId(job.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </section>

                    {isProcessing && (
                      <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/15">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="font-medium text-foreground flex items-center gap-1.5 truncate text-[11px]">
                            <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                            <span className="truncate">
                              {job.progressMessage ||
                                (job.processingStep === "PARSING" && "Lendo arquivos...") ||
                                (job.processingStep === "EXTRACTING" && "Extraindo dados...") ||
                                (job.processingStep === "NORMALIZING" && "Normalizando dados...") ||
                                (job.processingStep === "MATCHING" && "Buscando equivalências...") ||
                                (job.processingStep === "PREPARING_REVIEW" && "Finalizando preparação...") ||
                                "Processando..."}
                            </span>
                          </span>
                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            <span className="text-muted-foreground font-mono">
                              ⏱️ {formatEstimatedTime(getEstimatedSecondsRemaining(job))}
                            </span>
                            <span className="font-bold text-primary">{progress}%</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {isFailed && job.safeErrorMessage && (
                      <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive text-[11px] font-medium flex items-center gap-2 border border-destructive/20">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>{job.safeErrorMessage}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-border/30">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/15 border border-border/30">
                        <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-xs text-foreground">{job.totalStudents}</span>
                          <span className="text-[10px] text-muted-foreground">Alunos</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/15 border border-border/30">
                        <Dumbbell className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-xs text-foreground">{job.totalWorkouts}</span>
                          <span className="text-[10px] text-muted-foreground">Treinos</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/15 border border-border/30">
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-xs text-foreground">{job.totalAssessments}</span>
                          <span className="text-[10px] text-muted-foreground">Avaliações</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/15 border border-border/30">
                        <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold text-xs text-foreground">{job.totalMeasurements}</span>
                          <span className="text-[10px] text-muted-foreground">Medidas</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* CONFIRMAÇÃO DE DELEÇÃO */}
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
    </div>
  );
}
