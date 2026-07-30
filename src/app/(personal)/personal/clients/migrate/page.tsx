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
    if (job.status === "COMPLETED") return 100;
    if (job.status === "REVIEW") return 100;
    if (job.status === "FAILED" || job.status === "CANCELLED") return 0;

    switch (job.processingStep) {
      case "PARSING": return 25;
      case "EXTRACTING": return 55;
      case "NORMALIZING": return 80;
      case "MATCHING": return 90;
      case "PREPARING_REVIEW": return 100;
      default: return 15;
    }
  };

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
        <Skeleton className="h-16 w-full rounded-3xl" />
      ) : quotaBalance && !quotaBalance.allowed ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl border border-destructive/30 bg-destructive/5 shadow-2xs">
          <div className="space-y-0.5">
            <p className="text-sm font-bold text-destructive">Limite de importações atingido</p>
            <p className="text-xs text-muted-foreground">Adquira um pacote de créditos para importar novas fichas de alunos.</p>
          </div>
          <Link href="/personal/credits" className="w-full sm:w-auto">
            <Button size="sm" className="h-10 w-full sm:w-auto rounded-xl font-bold gap-2">
              <Zap className="size-4" /> Comprar Créditos
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

      {/* Lista / Tabela de Jobs de Migração */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-foreground">Histórico de Importações</h2>
          <span className="text-xs text-muted-foreground font-medium">{jobs.length} registro(s)</span>
        </div>

        {isLoadingJobs ? (
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="py-14 text-center border-dashed rounded-3xl">
            <CardContent className="space-y-3 max-w-sm mx-auto">
              <div className="size-14 rounded-3xl bg-muted/40 flex items-center justify-center text-muted-foreground mx-auto">
                <FileSpreadsheet className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-foreground">Nenhuma importação realizada</p>
                <p className="text-xs text-muted-foreground">
                  Traga os dados de outros sistemas por PDFs, planilhas ou fotos.
                </p>
              </div>
              <Link href="/personal/clients/migrate/new" className="inline-block pt-2">
                <Button size="sm" className="font-bold rounded-xl gap-2">
                  <Plus className="h-4 w-4" /> Criar Primeira Importação
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
                <motion.div key={job.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border border-border/80 rounded-3xl p-4 sm:p-5 bg-card shadow-2xs hover:border-primary/30 transition-all space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground uppercase tracking-wider">
                              {job.sourcePlatform}
                            </span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold rounded-md uppercase tracking-wider ${isCompleted
                                ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                                : isReviewNeeded
                                  ? "border-amber-500/40 text-amber-600 bg-amber-500/10"
                                  : isProcessing
                                    ? "border-primary/40 text-primary bg-primary/10"
                                    : "border-destructive/40 text-destructive bg-destructive/10"
                                }`}
                            >
                              {isCompleted && "Concluído"}
                              {isReviewNeeded && "Aguardando Revisão"}
                              {isProcessing && "Processando IA"}
                              {isFailed && "Falhou"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(job.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {isReviewNeeded && (
                          <Link href={`/personal/clients/migrate/${job.id}`}>
                            <Button size="sm" className="h-9 px-4 rounded-xl text-xs font-bold gap-1.5">
                              Revisar Registros <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {isCompleted && (
                          <Link href={`/personal/clients/migrate/${job.id}`}>
                            <Button variant="outline" size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold gap-1.5">
                              Ver Resumo <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                        {isFailed && (
                          <Link href="/personal/clients/migrate/new">
                            <Button variant="secondary" size="sm" className="h-9 px-3 rounded-xl text-xs font-semibold">
                              Tentar Novamente
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingJobId(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Barra de Progresso Real-Time */}
                    {isProcessing && (
                      <div className="space-y-1.5 bg-muted/30 p-3 rounded-2xl border border-border/40">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-primary flex items-center gap-2">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {job.processingStep === "PARSING" && "Lendo arquivos..."}
                            {job.processingStep === "EXTRACTING" && "Extraindo dados..."}
                            {job.processingStep === "NORMALIZING" && "Normalizando dados..."}
                            {job.processingStep === "MATCHING" && "Buscando equivalências..."}
                            {job.processingStep === "PREPARING_REVIEW" && "Finalizando preparação..."}
                          </span>
                          <span className="font-black text-foreground">{progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/80 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-500 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Mensagem de Erro se Houver */}
                    {isFailed && job.safeErrorMessage && (
                      <div className="p-3 rounded-2xl bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{job.safeErrorMessage}</span>
                      </div>
                    )}

                    {/* Estatísticas Extraídas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-2.5">
                        <Users className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <span className="font-black text-foreground block">{job.totalStudents}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">Alunos</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-2.5">
                        <Dumbbell className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <span className="font-black text-foreground block">{job.totalWorkouts}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">Treinos</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-2.5">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-black text-foreground block">{job.totalAssessments}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">Avaliações</span>
                        </div>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-muted/20 border border-border/40 flex items-center gap-2.5">
                        <Info className="h-4 w-4 text-blue-500 shrink-0" />
                        <div>
                          <span className="font-black text-foreground block">{job.totalMeasurements}</span>
                          <span className="text-[10px] text-muted-foreground font-semibold">Medidas</span>
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
