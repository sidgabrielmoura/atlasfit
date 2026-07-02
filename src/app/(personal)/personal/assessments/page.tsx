"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { toast } from "sonner";
import {
  ClipboardCheck,
  Calendar,
  Flame,
  Clock,
  Search,
  Plus,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  Scale,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { PhysicalEvaluationDetailModal } from "@/components/application/physical-evaluation-detail-modal";

interface Evaluation {
  id: string;
  date: string;
  type: string;
  weight: number;
  bodyFat: number | null;
  muscleMass: number | null;
  student: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  };
}

interface StudentEvolution {
  id: string;
  name: string;
  email: string;
  image: string | null;
  evalsCount: number;
  bfDelta: number;
  muscleMassDelta: number;
  weightDelta: number;
  lastBf: number | null;
  lastMuscleMass: number | null;
  lastWeight: number | null;
}

interface WorkspaceStudent {
  id: string;
  name: string;
  email: string;
  image: string | null;
  avatarFallback: string;
}

export default function AssessmentsPage() {
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  // Main Page States
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalEvals: 0,
    evalsThisMonth: 0,
    avgBodyFat: 0,
    pendingCount: 0,
  });
  const [recentEvaluations, setRecentEvaluations] = useState<Evaluation[]>([]);
  const [rankings, setRankings] = useState<{
    evolvingMost: StudentEvolution[];
    evolvingLeast: StudentEvolution[];
  }>({
    evolvingMost: [],
    evolvingLeast: [],
  });

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");

  // Select Student Modal States
  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(false);
  const [students, setStudents] = useState<WorkspaceStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");

  // Detail View Modal States
  const [selectedEval, setSelectedEval] = useState<any>(null);
  const [isEvalDetailModalOpen, setIsEvalDetailModalOpen] = useState(false);

  // Deletion States
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [evalToDelete, setEvalToDelete] = useState<Evaluation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Core Dashboard Data
  const fetchDashboardData = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/personal/assessments?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao carregar dados do painel.");
      }
      const data = await res.json();
      setMetrics(data.metrics);
      setRecentEvaluations(data.recentEvaluations);
      setRankings(data.rankings);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao buscar dados das avaliações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [activeWorkspaceId]);

  // Fetch Students for Selection list
  const fetchWorkspaceStudents = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingStudents(true);
      const res = await fetch(`/api/personal/clients?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao carregar lista de alunos.");
      }
      const data = await res.json();
      setStudents(data);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao buscar alunos.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleOpenNewEvalModal = () => {
    setIsNewEvalModalOpen(true);
    setStudentSearchQuery("");
    fetchWorkspaceStudents();
  };

  // Trigger select student redirect
  const handleSelectStudentForEval = (studentId: string) => {
    setIsNewEvalModalOpen(false);
    router.push(`/personal/clients/${studentId}?tab=avaliacoes&newEval=true`);
  };

  // Trigger Delete confirmation
  const handleTriggerDelete = (evaluation: Evaluation) => {
    setEvalToDelete(evaluation);
    setIsDeleteAlertOpen(true);
  };

  // Submit Delete Request
  const handleDeleteConfirm = async () => {
    if (!evalToDelete) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/personal/clients/${evalToDelete.student.id}/evaluations/${evalToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao excluir avaliação.");
      }

      toast.success("Avaliação física excluída com sucesso.");
      setIsDeleteAlertOpen(false);
      setEvalToDelete(null);
      fetchDashboardData();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao remover avaliação física.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenDetailModal = (evaluation: any) => {
    setSelectedEval(evaluation);
    setIsEvalDetailModalOpen(true);
  };

  // Client-side filtering of evaluations table
  const filteredEvaluations = recentEvaluations.filter((ev) =>
    ev.student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ev.student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = students.filter((st) =>
    st.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    st.email.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 overflow-x-hidden relative">
      <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-orange-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 left-10 w-96 h-96 rounded-full bg-primary/3 blur-[120px] pointer-events-none" />

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            Avaliações Físicas
          </h2>
          <p className="text-muted-foreground mt-1">Acompanhe métricas antropométricas e a evolução física dos seus alunos.</p>
        </div>
        <Button
          onClick={handleOpenNewEvalModal}
          className="shrink-0 gap-2 h-11 px-5 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 w-full sm:w-auto"
        >
          <Plus className="size-5" />
          <span>Nova Avaliação</span>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <Card key={i} className="border border-border/50 bg-card/60 backdrop-blur-md">
              <CardContent className="p-4 sm:p-6 space-y-2">
                <Skeleton className="h-4 w-28 bg-muted rounded" />
                <Skeleton className="h-8 w-16 bg-muted rounded" />
                <Skeleton className="h-3 w-36 bg-muted rounded" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-xs relative overflow-hidden group hover:border-border transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total de Avaliações</span>
                  <div className="text-3xl font-black text-foreground">{metrics.totalEvals}</div>
                  <p className="text-[10px] text-muted-foreground">Histórico acumulado no workspace</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                  <ClipboardCheck className="size-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-xs relative overflow-hidden group hover:border-border transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Este Mês</span>
                  <div className="text-3xl font-black text-foreground">{metrics.evalsThisMonth}</div>
                  <p className="text-[10px] text-muted-foreground">Registros novos cadastrados</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl shrink-0">
                  <Calendar className="size-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-xs relative overflow-hidden group hover:border-border transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Média de BF</span>
                  <div className="text-3xl font-black text-foreground">
                    {metrics.avgBodyFat > 0 ? `${metrics.avgBodyFat}%` : "—"}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Percentual de gordura médio</p>
                </div>
                <div className="p-3 bg-orange-500/10 rounded-xl shrink-0">
                  <Flame className="size-6 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-xs relative overflow-hidden group hover:border-border transition-all duration-300">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Atrasadas / Pendentes</span>
                  <div className="text-3xl font-black text-foreground">{metrics.pendingCount}</div>
                  <p className="text-[10px] text-muted-foreground">Alunos sem avaliação &gt; 60 dias</p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-xl shrink-0">
                  <Clock className="size-6 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
        {/* Most Evolving */}
        <Card className="border border-border/50 bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md rounded-2xl overflow-hidden relative shadow-lg">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-md font-extrabold flex items-center gap-2 text-foreground">
              <TrendingUp className="size-5 text-emerald-500" />
              Melhores Evoluções do Workspace
            </CardTitle>
            <CardDescription className="text-xs">Alunos com maior queima de gordura e ganho de massa magra.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/10">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full bg-muted" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4.5 w-28 bg-muted rounded" />
                      <Skeleton className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-20 bg-muted rounded" />
                </div>
              ))
            ) : rankings.evolvingMost.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground bg-secondary/5 rounded-xl border border-dashed border-border/40">
                Nenhum dado comparativo disponível no momento.
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">É necessário registrar pelo menos 2 avaliações no mesmo aluno.</p>
              </div>
            ) : (
              rankings.evolvingMost.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border/15 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="size-9 border border-border">
                        <AvatarImage src={s.image || undefined} />
                        <AvatarFallback className="bg-emerald-500/10 text-emerald-500 text-xs font-bold">
                          {idx + 1}º
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow-xs">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{s.name}</h4>
                      <span className="text-[10px] text-muted-foreground block truncate">{s.email}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    {s.bfDelta > 0 ? (
                      <span className="text-xs font-extrabold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                        -{s.bfDelta}% BF
                      </span>
                    ) : s.muscleMassDelta > 0 ? (
                      <span className="text-xs font-extrabold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/10">
                        +{s.muscleMassDelta}kg Massa
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-lg">
                        Estável
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground mt-0.5">{s.evalsCount} avaliações</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Needs Attention */}
        <Card className="border border-border/50 bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md rounded-2xl overflow-hidden relative shadow-lg">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-md font-extrabold flex items-center gap-2 text-foreground">
              <TrendingDown className="size-5 text-amber-500" />
              Necessitam de Atenção
            </CardTitle>
            <CardDescription className="text-xs">Alunos com menor evolução, platô ou ganho de gordura.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/10">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full bg-muted" />
                    <div className="space-y-1.5">
                      <Skeleton className="h-4.5 w-28 bg-muted rounded" />
                      <Skeleton className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <Skeleton className="h-7 w-20 bg-muted rounded" />
                </div>
              ))
            ) : rankings.evolvingLeast.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground bg-secondary/5 rounded-xl border border-dashed border-border/40">
                Nenhum dado comparativo disponível no momento.
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">É necessário registrar pelo menos 2 avaliações no mesmo aluno.</p>
              </div>
            ) : (
              rankings.evolvingLeast.map((s, idx) => (
                <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border/15 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative shrink-0">
                      <Avatar className="size-9 border border-border">
                        <AvatarImage src={s.image || undefined} />
                        <AvatarFallback className="bg-amber-500/10 text-amber-500 text-xs font-bold">
                          {idx + 1}º
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500/80 text-[9px] font-bold text-white shadow-xs">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{s.name}</h4>
                      <span className="text-[10px] text-muted-foreground block truncate">{s.email}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end">
                    {s.bfDelta < 0 ? (
                      <span className="text-xs font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/10">
                        +{Math.abs(s.bfDelta)}% BF
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-lg">
                        Variação: {s.bfDelta}% BF
                      </span>
                    )}
                    <span className="text-[9px] text-muted-foreground mt-0.5">{s.evalsCount} avaliações</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Evaluations Container */}
      <Card className="border border-border/50 bg-card/60 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl relative z-10">
        <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-border/30 dark:via-white/10 to-transparent" />
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg font-black text-foreground">Histórico de Avaliações Recentes</CardTitle>
            <CardDescription className="text-xs">Confira e filtre os registros físicos efetuados recentemente.</CardDescription>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome do aluno..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-base md:text-xs rounded-xl bg-background/50 border-border"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="block md:hidden space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2 border border-border/10 p-3 rounded-xl bg-secondary/5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Skeleton className="size-9 rounded-full bg-muted" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24 bg-muted" />
                          <Skeleton className="h-3 w-32 bg-muted" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-16 bg-muted rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-full bg-muted rounded-lg" />
                  </div>
                ))}
              </div>
              <div className="hidden md:block space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-6 w-32 bg-muted rounded" />
                    <Skeleton className="h-6 w-44 bg-muted rounded" />
                    <Skeleton className="h-6 w-20 bg-muted rounded" />
                    <Skeleton className="h-6 w-20 bg-muted rounded" />
                    <Skeleton className="h-6 flex-1 bg-muted rounded" />
                  </div>
                ))}
              </div>
            </div>
          ) : filteredEvaluations.length === 0 ? (
            <div className="py-16 text-center border-t border-border/40 flex flex-col items-center justify-center">
              <ClipboardCheck className="size-10 text-muted-foreground/60 mb-2 stroke-1.2" />
              <p className="text-muted-foreground font-semibold text-sm">Nenhuma avaliação física localizada.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Realize uma nova avaliação física para ver os registros aqui.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader className="bg-secondary/10 border-b border-border/40">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-3 px-6">Aluno</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-3 px-4">Data</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-3 px-4">Tipo</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-3 px-4 text-right">Peso</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-3 px-4 text-right">BF %</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-3 px-4 text-right">Massa Magra</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-muted-foreground py-3 px-6 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvaluations.map((ev) => (
                      <TableRow key={ev.id} className="hover:bg-secondary/5 border-b border-border/20 last:border-0 transition-colors">
                        <TableCell className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 border border-border">
                              <AvatarImage src={ev.student.image || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {ev.student.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 leading-tight">
                              <span className="text-xs font-bold text-foreground block truncate">{ev.student.name}</span>
                              <span className="text-[10px] text-muted-foreground block truncate">{ev.student.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs font-semibold text-muted-foreground">
                          {new Date(ev.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-foreground font-semibold truncate max-w-[180px]">
                          {ev.type}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs font-extrabold text-foreground text-right">
                          {ev.weight} kg
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs font-extrabold text-right">
                          {ev.bodyFat !== null ? (
                            <span className="text-orange-500">{ev.bodyFat}%</span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs font-extrabold text-right">
                          {ev.muscleMass !== null ? (
                            <span className="text-blue-500">{ev.muscleMass} kg</span>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDetailModal(ev)}
                              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                              title="Visualizar Ficha"
                            >
                              <Eye className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTriggerDelete(ev)}
                              className="size-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              title="Excluir Registro"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile-first Stacked Card List View */}
              <div className="block md:hidden divide-y divide-border/10 border-t border-border/40">
                {filteredEvaluations.map((ev) => (
                  <div key={ev.id} className="p-4 space-y-3 hover:bg-secondary/5 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="size-9 border border-border">
                          <AvatarImage src={ev.student.image || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {ev.student.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 leading-tight">
                          <span className="text-xs font-extrabold text-foreground block truncate">{ev.student.name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">{ev.student.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDetailModal(ev)}
                          className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                          title="Visualizar Ficha"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTriggerDelete(ev)}
                          className="size-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          title="Excluir Registro"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-[10px] sm:text-[11px] bg-secondary/15 rounded-lg p-2 border border-border/10">
                      <div className="flex flex-col items-start pl-1">
                        <span className="text-muted-foreground/60 uppercase font-black text-[8px] tracking-wider">Data</span>
                        <span className="text-foreground font-semibold whitespace-nowrap">
                          {new Date(ev.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground/60 uppercase font-black text-[8px] tracking-wider">Peso</span>
                        <span className="text-foreground font-extrabold">{ev.weight} kg</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground/60 uppercase font-black text-[8px] tracking-wider">Gordura</span>
                        <span className="text-orange-500 font-extrabold">
                          {ev.bodyFat !== null ? `${ev.bodyFat}%` : "—"}
                        </span>
                      </div>
                      <div className="flex flex-col items-end pr-1">
                        <span className="text-muted-foreground/60 uppercase font-black text-[8px] tracking-wider">M. Magra</span>
                        <span className="text-blue-500 font-extrabold whitespace-nowrap">
                          {ev.muscleMass !== null ? `${ev.muscleMass} kg` : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] font-medium text-muted-foreground/80 flex items-center gap-1 pl-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span>{ev.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* MODAL: SELECT STUDENT FOR NEW EVALUATION */}
      <Dialog open={isNewEvalModalOpen} onOpenChange={setIsNewEvalModalOpen}>
        <DialogContent className="w-full gap-0 max-w-[calc(100%-1.5rem)] sm:max-w-md bg-card dark:bg-neutral-950 border border-border dark:border-neutral-900 text-foreground rounded-2xl! shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border dark:border-neutral-900 shrink-0">
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Users className="size-5 text-primary" />
              Selecionar Aluno
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione o aluno para o qual você deseja criar uma avaliação física.
            </DialogDescription>
          </DialogHeader>

          <section>
            <div className="p-4 border-b border-border/40 bg-secondary/5">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome ou e-mail..."
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-base md:text-xs rounded-xl bg-background border-border"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {loadingStudents ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3">
                    <Skeleton className="size-9 rounded-full bg-muted" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32 bg-muted rounded" />
                      <Skeleton className="h-3 w-48 bg-muted rounded" />
                    </div>
                  </div>
                ))
              ) : filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum aluno ativo encontrado.
                </div>
              ) : (
                filteredStudents.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => handleSelectStudentForEval(st.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-primary/10 hover:text-foreground text-left transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-9 border border-border group-hover:border-primary/20">
                        <AvatarImage src={st.image || undefined} />
                        <AvatarFallback className="bg-secondary text-foreground text-xs font-semibold uppercase">
                          {st.avatarFallback || st.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 leading-tight">
                        <span className="text-xs font-bold text-foreground block truncate group-hover:text-primary transition-colors">
                          {st.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {st.email}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </section>
        </DialogContent>
      </Dialog>

      {/* DETAIL MODAL INTEGRATION */}
      <PhysicalEvaluationDetailModal
        isOpen={isEvalDetailModalOpen}
        onClose={() => setIsEvalDetailModalOpen(false)}
        evaluation={selectedEval}
      />

      {/* ALERT DIALOG: CONFIRM DELETE PHYSICAL EVALUATION */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-card dark:bg-zinc-950 border border-border/60 dark:border-white/[0.08] text-foreground rounded-2xl shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500 shrink-0 animate-bounce" /> Excluir Registro de Avaliação Física?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Você tem certeza que deseja remover a avaliação física registrada no dia <strong className="text-foreground font-bold">{evalToDelete ? new Date(evalToDelete.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""}</strong> para o aluno <strong className="text-foreground font-bold">{evalToDelete?.student.name}</strong>?
              Esta ação é <span className="text-rose-600 dark:text-rose-400 font-semibold underline">totalmente irreversível</span> e removerá permanentemente os valores associados de peso ({evalToDelete?.weight} kg), percentual de gordura ({evalToDelete?.bodyFat}%) e todos os históricos e dados antropométricos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs h-10 border-border bg-muted/20 hover:bg-muted/40" disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="rounded-xl text-xs h-10 bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-1.5 shadow-lg shadow-rose-500/25"
            >
              {isDeleting ? <Loader2 className="animate-spin size-3.5" /> : <Trash2 className="size-3.5" />}
              <span>{isDeleting ? "Excluindo..." : "Confirmar Exclusão"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
