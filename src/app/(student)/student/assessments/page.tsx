"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { PhysicalEvaluationDetailModal } from "@/components/application/physical-evaluation-detail-modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  Calendar,
  FileText,
  Flame,
  Scale,
  Sparkles,
  Trophy,
  ClipboardList,
  Download,
  ExternalLink,
  MessageCircle,
  Clock,
  Heart,
  TrendingUp,
  HeartPulse,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function StudentAssessmentsPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Detail Dialog Modal
  const [selectedEval, setSelectedEval] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadAssessmentsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/assessments");
      if (!res.ok) {
        throw new Error("Falha ao buscar o histórico de avaliações.");
      }
      const rawData = await res.json();
      setData(rawData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão ao carregar avaliações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadAssessmentsData();
  }, []);

  if (loading) {
    return <StudentAssessmentsSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-16">
        <HeartPulse className="size-12 mx-auto text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold">Falha ao carregar suas avaliações</h2>
        <p className="text-neutral-400">{error || "Verifique sua conexão de rede."}</p>
        <Button onClick={loadAssessmentsData} variant="outline" className="gap-2">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const { evaluations, clinicalFiles, goals, difficulties, plan } = data;

  const latestEval = evaluations[0] || null;

  // Formatting date standard
  const formatEvalDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Recharts Double evolution line chart data preparation
  const chartData = evaluations
    .slice()
    .reverse()
    .map((ev: any) => ({
      date: formatEvalDate(ev.date),
      "Gordura (BF%)": ev.bodyFat || 0,
      "Massa Magra (%)": ev.muscleMass || 0,
    }));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="size-6 text-primary animate-pulse" />
            Avaliações Físicas
          </h1>
          <p className="text-sm text-neutral-400">
            Acompanhe adipometrias compartilhadas pelo seu personal.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground dark:text-neutral-450 uppercase tracking-wider">Objetivos Ativos</span>
            <Trophy className="size-4 text-amber-500" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {goals.length > 0 ? (
              goals.map((goal: string) => (
                <Badge key={goal} className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-extrabold text-[10px] rounded-full py-0.5 px-2">
                  {goal}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">Nenhum cadastrado</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Extraído das suas planilhas de treino</p>
        </Card>

        {/* Level / Difficulty Card */}
        <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground dark:text-neutral-450 uppercase tracking-wider">Nível de Treino</span>
            <Activity className="size-4 text-sky-400" />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {difficulties.length > 0 ? (
              difficulties.map((diff: string) => (
                <Badge key={diff} className="bg-sky-500/10 text-sky-600 dark:text-sky-455 border border-sky-500/20 font-extrabold text-[10px] rounded-full py-0.5 px-2">
                  {diff}
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground italic">Intermediário (Padrão)</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Metodologia active no workspace</p>
        </Card>

        {/* Member Plan Card */}
        <Card className="border border-border dark:border-white/6 bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground dark:text-neutral-450 uppercase tracking-wider">Plano de Assinatura</span>
          </div>
          <div className="mt-3">
            <span className="text-lg font-black text-foreground">{plan || "Mensal Elite"}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">Acesso total liberado</p>
        </Card>
      </div>

      <Tabs defaultValue="history" className="space-y-6">
        <TabsList className="bg-muted dark:bg-neutral-900/60 p-1 no-scrollbar border border-border dark:border-neutral-800 rounded-xl flex overflow-x-auto whitespace-nowrap md:w-fit gap-1 w-full justify-start scrollbar-none">
          <TabsTrigger
            value="history"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <ClipboardList className="size-4" /> Histórico de Avaliações
          </TabsTrigger>
          <TabsTrigger
            value="charts"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <TrendingUp className="size-4" /> Evolução Comparativa
          </TabsTrigger>
          <TabsTrigger
            value="clinical"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <FileText className="size-4" /> Dados Clínicos & Exames
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: HISTORY & EVALUATION LIST ==================== */}
        <TabsContent value="history" className="space-y-6 outline-none focus-visible:ring-0">
          {evaluations.length === 0 ? (
            <Card className="border border-dashed border-border dark:border-neutral-800 bg-card dark:bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-muted dark:bg-neutral-900/80 text-muted-foreground dark:text-neutral-455 border border-border dark:border-neutral-800">
                  <ClipboardList className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Nenhuma avaliação física cadastrada</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Seu personal trainer ainda não registrou avaliações físicas no sistema. Assim que ele cadastrar, os dados de adipometria Pollock ou bioimpedância aparecerão aqui.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-1">
                <div>
                  <h3 className="text-base font-bold text-foreground">Aferições Registradas</h3>
                  <p className="text-xs text-neutral-400">Clique em "Detalhes" para visualizar a composição corporal completa.</p>
                </div>
              </div>

              {/* Desktop evaluations table */}
              <div className="hidden md:block border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50 dark:bg-neutral-900/30">
                    <TableRow className="border-b border-border dark:border-white/[0.06]">
                      <TableHead className="text-muted-foreground dark:text-neutral-400 font-bold">Data</TableHead>
                      <TableHead className="text-muted-foreground dark:text-neutral-400 font-bold">Protocolo</TableHead>
                      <TableHead className="text-muted-foreground dark:text-neutral-400 font-bold">Peso</TableHead>
                      <TableHead className="text-muted-foreground dark:text-neutral-400 font-bold">Altura</TableHead>
                      <TableHead className="text-muted-foreground dark:text-neutral-400 font-bold">Gordura (BF%)</TableHead>
                      <TableHead className="text-muted-foreground dark:text-neutral-400 font-bold">Massa Magra</TableHead>
                      <TableHead className="text-muted-foreground dark:text-neutral-455 font-bold">Protocolo / Detalhe</TableHead>
                      <TableHead className="text-muted-foreground dark:text-neutral-400 font-bold text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((ev: any) => {
                      const skinfoldSum = ev.dobras
                        ? Object.entries(ev.dobras)
                            .filter(([key]) => !["bodyFat", "fatMass", "leanMass", "classification"].includes(key))
                            .reduce((acc: number, [_, val]: any) => acc + (parseFloat(val) || 0), 0)
                        : 0;

                      return (
                        <TableRow key={ev.id} className="border-b border-border dark:border-white/[0.04] hover:bg-secondary/40 dark:hover:bg-white/[0.02] transition-colors">
                          <TableCell className="text-xs text-muted-foreground dark:text-neutral-300 font-medium">
                            {formatEvalDate(ev.date)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-muted dark:bg-neutral-900 border-border dark:border-white/[0.08] text-muted-foreground dark:text-neutral-300 font-bold text-[10px]">
                              {ev.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm font-bold text-foreground">
                            {ev.weight} kg
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground dark:text-neutral-455">
                            {ev.height} cm
                          </TableCell>
                          <TableCell className="text-sm text-rose-500 dark:text-rose-400 font-extrabold">
                            {ev.bodyFat ? `${ev.bodyFat}%` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-emerald-600 dark:text-emerald-455 font-extrabold">
                            {ev.muscleMass ? `${ev.muscleMass}%` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground dark:text-neutral-400">
                            {ev.dobras ? (
                              <span className="font-bold flex items-center gap-1 text-amber-600 dark:text-amber-455">
                                <Flame className="size-3.5" /> Adipometria ({skinfoldSum.toFixed(1)} mm)
                              </span>
                            ) : (
                              <span className="font-semibold text-orange-500 flex items-center gap-1">
                                <ClipboardList className="size-3.5" /> Anamnese / Geral
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedEval(ev);
                                setIsDetailOpen(true);
                              }}
                              className="h-8 border-border dark:border-white/[0.08] hover:bg-secondary/40 dark:hover:bg-neutral-900 font-bold text-xs"
                            >
                              <Activity className="size-3.5 mr-1.5 text-primary shrink-0" /> Detalhes
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile evaluations cards list */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {evaluations.map((ev: any) => {
                  const skinfoldSum = ev.dobras
                    ? Object.entries(ev.dobras)
                        .filter(([key]) => !["bodyFat", "fatMass", "leanMass", "classification"].includes(key))
                        .reduce((acc: number, [_, val]: any) => acc + (parseFloat(val) || 0), 0)
                    : 0;

                  return (
                    <Card key={ev.id} className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 p-4 rounded-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-border dark:border-white/[0.04] pb-2">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted-foreground dark:text-neutral-500 font-bold uppercase tracking-wider">Aferição em</span>
                          <h4 className="text-xs font-black text-foreground">{formatEvalDate(ev.date)}</h4>
                        </div>
                        <Badge variant="outline" className="bg-muted dark:bg-neutral-900 border-border dark:border-white/[0.08] text-muted-foreground dark:text-neutral-300 font-bold text-[9px]">
                          {ev.type}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 font-bold block uppercase">Peso / Altura</span>
                          <span className="text-xs font-black text-foreground">{ev.weight} kg / {ev.height} cm</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 font-bold block uppercase">Método Analítico</span>
                          {ev.dobras ? (
                            <span className="text-xs font-bold text-amber-450 flex items-center gap-0.5">
                              <Flame className="size-3 text-amber-500 shrink-0" /> Adipometria ({skinfoldSum.toFixed(1)} mm)
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-orange-500 flex items-center gap-0.5">
                              <ClipboardList className="size-3 text-orange-500 shrink-0" /> Anamnese / Geral
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 font-bold block uppercase">Gordura (BF%)</span>
                          <span className="text-xs font-black text-rose-400">{ev.bodyFat ? `${ev.bodyFat}%` : "—"}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-neutral-500 font-bold block uppercase">Massa Magra</span>
                          <span className="text-xs font-black text-emerald-450">{ev.muscleMass ? `${ev.muscleMass}%` : "—"}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedEval(ev);
                          setIsDetailOpen(true);
                        }}
                        className="w-full bg-muted dark:bg-neutral-900 text-foreground border border-border dark:border-white/[0.08] hover:bg-secondary/40 dark:hover:bg-neutral-850 h-9 font-bold text-xs rounded-xl"
                      >
                        Visualizar Composição Completa
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 2: COMPARATIVE EVOLUTION CHARTS ==================== */}
        <TabsContent value="charts" className="space-y-6 outline-none focus-visible:ring-0">
          {evaluations.length < 2 ? (
            <Card className="border border-dashed border-border dark:border-neutral-800 bg-card dark:bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-muted dark:bg-neutral-900/80 text-muted-foreground dark:text-neutral-455 border border-border dark:border-neutral-800">
                  <TrendingUp className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Dados insuficientes para evolução comparativa</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Você precisa de pelo menos 2 avaliações físicas registradas pelo personal trainer para visualizar o gráfico de composição corporal comparativa.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base font-bold text-foreground">Composição Corporal Comparativa</CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Evolução comparativa entre gordura corporal (BF%) e massa magra (%) ao longo do tempo.
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[320px] pt-4 pr-4 pl-0">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" opacity={0.7} fontSize={10} tickLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" opacity={0.7} fontSize={10} tickLine={false} domain={[0, "dataMax + 10"]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                        labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "hsl(var(--muted-foreground))" }}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: "11px", fontWeight: "bold", color: "hsl(var(--foreground))" }} />
                      <Line
                        type="monotone"
                        dataKey="Gordura (BF%)"
                        stroke="#f43f5e"
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                        dot={{ strokeWidth: 1.5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Massa Magra (%)"
                        stroke="#10b981"
                        strokeWidth={2.5}
                        activeDot={{ r: 6 }}
                        dot={{ strokeWidth: 1.5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== TAB 3: CLINICAL FILES & EXAMS ==================== */}
        <TabsContent value="clinical" className="space-y-6 outline-none focus-visible:ring-0">
          {clinicalFiles.length === 0 ? (
            <Card className="border border-dashed border-border dark:border-neutral-800 bg-card dark:bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-muted dark:bg-neutral-900/80 text-muted-foreground dark:text-neutral-455 border border-border dark:border-neutral-800">
                  <FileText className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Nenhum exame clínico anexado</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Exames de sangue, laudos de bioimpedâncias externas ou recomendações clínicas liberadas pelo seu personal trainer aparecerão nesta seção.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-foreground">Exames & Arquivos Clínicos</h3>
                <p className="text-xs text-neutral-400">Clique para visualizar ou baixar os documentos anexados pelo seu personal.</p>
              </div>
              {/* Grid timeline of clinical files */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clinicalFiles.map((file: any) => (
                  <Card key={file.id} className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 p-4 rounded-xl flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <Badge variant="outline" className="bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 font-black text-[9px] py-0 px-2 rounded-full uppercase">
                            {file.category}
                          </Badge>
                          <h4 className="text-sm font-bold text-foreground truncate max-w-[200px] mt-1">{file.name}</h4>
                        </div>
                        <FileText className="size-5 text-rose-455 dark:text-rose-400 shrink-0" />
                      </div>

                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground dark:text-neutral-500">
                        <Calendar className="size-3 shrink-0" />
                        <span>{formatEvalDate(file.createdAt)}</span>
                        <span className="h-1 w-1 bg-border dark:bg-neutral-700 rounded-full" />
                        <span>{file.fileSize || "Link"}</span>
                      </div>

                      {file.notes && (
                        <p className="text-[11px] text-muted-foreground dark:text-neutral-400 italic bg-muted dark:bg-neutral-900/40 p-2 rounded-lg leading-relaxed border border-border dark:border-neutral-800">
                          "{file.notes}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        asChild
                        variant="outline"
                        className="flex-1 border-border dark:border-white/[0.08] hover:bg-secondary/40 dark:hover:bg-neutral-900 font-bold text-xs h-9 rounded-xl"
                      >
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="size-3.5 mr-1.5" /> Visualizar
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        asChild
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs h-9 rounded-xl cursor-pointer"
                      >
                        <a href={file.url} download>
                          <Download className="size-3.5 mr-1.5" /> Baixar
                        </a>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <PhysicalEvaluationDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        evaluation={selectedEval}
      />
    </div>
  );
}

// Loading assessments skeleton (skelletonsloaders.md compliance)
function StudentAssessmentsSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-pulse">
      {/* Top Header */}
      <div className="space-y-2 border-b border-border dark:border-white/[0.04] pb-4">
        <Skeleton className="h-8 w-80 max-w-full bg-muted dark:bg-neutral-900" />
        <Skeleton className="h-4 w-full max-w-md bg-muted dark:bg-neutral-900" />
      </div>

      {/* Target consolidation grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 bg-muted dark:bg-neutral-900 rounded-2xl" />
        ))}
      </div>

      {/* Tabs trigger row */}
      <Skeleton className="h-11 w-full md:w-96 bg-muted dark:bg-neutral-900 rounded-xl" />

      {/* Primary table/cards panel */}
      <Card className="border border-border/50 bg-card dark:bg-neutral-950/20">
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-[280px] w-full bg-muted dark:bg-neutral-900 rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}
