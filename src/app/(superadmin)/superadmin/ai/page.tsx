"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Sparkles,
  Cpu,
  DollarSign,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  BrainCircuit,
  Sliders,
  Database,
  RefreshCw,
  ShieldCheck,
  BarChart3,
  Layers,
  Bot,
  Gauge,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

function StatCard({ title, value, subtext, icon: Icon, color }: {
  title: string; value: string; subtext: string; icon: any; color: string;
}) {
  return (
    <Card className="border border-border/80 bg-card shadow-xs hover:border-foreground/20 transition-all duration-200">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 rounded-xl", color)}>
            <Icon className="size-4" />
          </div>
          <Badge variant="outline" className="text-[10px] font-mono">LIVE</Badge>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-bold tracking-tight mt-1">{value}</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{subtext}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminAIPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [modelsData, setModelsData] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("telemetry");
  const [savingAgentId, setSavingAgentId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, modelsRes, agentsRes] = await Promise.all([
        fetch("/api/superadmin/ai/stats"),
        fetch("/api/superadmin/ai/models"),
        fetch("/api/superadmin/ai/agents"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (modelsRes.ok) setModelsData(await modelsRes.json());
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        setAgents(data.agents || []);
      }
    } catch (err: any) {
      toast.error("Erro ao carregar telemetria de IA.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateAgent = async (agentId: string, updates: Partial<any>) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, ...updates } : a))
    );

    setSavingAgentId(agentId);
    try {
      const res = await fetch("/api/superadmin/ai/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, ...updates }),
      });

      if (!res.ok) throw new Error("Falha ao salvar configuração.");
      const result = await res.json();

      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, ...result.agent } : a))
      );
      toast.success("Configuração do agente atualizada.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar agente.");
    } finally {
      setSavingAgentId(null);
    }
  };

  if (loading && !stats) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-64 rounded-md" />
            <Skeleton className="h-4 w-96 rounded-md" />
          </div>
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 border border-border/80 rounded-xl bg-card space-y-3 shadow-xs">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Skeleton className="lg:col-span-8 h-72 w-full rounded-xl" />
          <Skeleton className="lg:col-span-4 h-72 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const summary = stats?.summary || {
    totalRequests: 0,
    successRate: 100,
    avgLatencyMs: 0,
    totalTokensSum: 0,
    estimatedCostBrl: 0,
  };

  const dailyChartData = stats?.dailyChartData || [];
  const agentDistribution = stats?.agentDistribution || [];
  const activeModelsList = modelsData?.models || [];

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Inteligência Artificial & Agentes</h1>
            <Badge variant="secondary" className="text-[10px] uppercase font-semibold tracking-wider">
              Google AI Studio
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Monitoramento de consumo de tokens, latência, custos e governança dos agentes IA.
          </p>
        </div>

        <Button
          onClick={() => fetchData()}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2 h-9 text-xs font-semibold self-start sm:self-auto w-full sm:w-auto"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          Atualizar Métricas
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Consumo de Tokens"
          value={summary.totalTokensSum.toLocaleString()}
          subtext="Entrada, Saída e Thinking Tokens"
          icon={Cpu}
          color="bg-primary/10 text-primary"
        />
        <StatCard
          title="Custo Estimado"
          value={`R$ ${summary.estimatedCostBrl.toFixed(2)}`}
          subtext={`~ US$ ${summary.estimatedCostUsd || 0}`}
          icon={DollarSign}
          color="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          title="Latência Média"
          value={`${summary.avgLatencyMs} ms`}
          subtext="Tempo médio por requisição"
          icon={Zap}
          color="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          title="Taxa de Sucesso"
          value={`${summary.successRate}%`}
          subtext={`${summary.successfulRequests || 0} de ${summary.totalRequests || 0} chamadas ok`}
          icon={Activity}
          color="bg-blue-500/10 text-blue-600"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-fit! bg-card flex flex-col w-full  border border-border/80 p-1 gap-1">
          <TabsTrigger value="telemetry" className="text-xs h-7 gap-1.5 w-full">
            <BarChart3 className="size-3.5" /> Telemetria & Custos
          </TabsTrigger>
          <TabsTrigger value="agents" className="text-xs h-7 gap-1.5 w-full">
            <Bot className="size-3.5" /> Agentes & Raciocínio
          </TabsTrigger>
          <TabsTrigger value="models" className="text-xs h-7 gap-1.5 w-full">
            <Layers className="size-3.5" /> Modelos Google Studio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="telemetry" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-8 border border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" /> Evolução de Tokens & Custos
                </CardTitle>
                <CardDescription className="text-xs">
                  Volume diário de tokens de entrada, saída e raciocínio (thinking).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-72 w-full">
                  {dailyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillInput" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="date" tickLine={false} axisLine={false} className="text-[10px]" />
                        <YAxis tickLine={false} axisLine={false} className="text-[10px]" />
                        <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid border", borderRadius: "8px", fontSize: "11px" }} />
                        <Area type="monotone" dataKey="input" name="Tokens Entrada" stroke="#3b82f6" fill="url(#fillInput)" />
                        <Area type="monotone" dataKey="output" name="Tokens Saída" stroke="#10b981" fill="url(#fillOutput)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      Nenhum registro no período.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-4 border border-border/80 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <PieChart className="size-4 text-primary" /> Distribuição por Agente
                </CardTitle>
                <CardDescription className="text-xs">Proporção de uso por módulo da plataforma.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-52 w-full">
                  {agentDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={agentDistribution} dataKey="requests" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={45} paddingAngle={4}>
                          {agentDistribution.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid border", borderRadius: "8px", fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                      Sem chamadas recentes.
                    </div>
                  )}
                </div>
                <div className="space-y-1.5 pt-2">
                  {agentDistribution.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-muted-foreground truncate max-w-[160px]">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.requests} reqs</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Gauge className="size-4 text-primary" /> Latência & Desempenho por Agente
              </CardTitle>
              <CardDescription className="text-xs">Tempo médio de resposta em milissegundos.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-56 w-full">
                {agentDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={agentDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} className="text-[10px]" />
                      <YAxis tickLine={false} axisLine={false} className="text-[10px]" />
                      <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid border", borderRadius: "8px", fontSize: "11px" }} />
                      <Bar dataKey="avgLatencyMs" name="Latência Média (ms)" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Sem dados suficientes.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agents.map((agent) => (
              <Card key={agent.id} className={cn("border transition-colors", agent.active ? "border-border/80 bg-card" : "border-border/40 opacity-70 bg-muted/20")}>
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bot className="size-4 text-primary" />
                        <CardTitle className="text-sm font-bold">{agent.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs">{agent.description}</CardDescription>
                    </div>
                    <Switch
                      checked={agent.active}
                      disabled={savingAgentId === agent.id}
                      onCheckedChange={(val) => handleUpdateAgent(agent.id, { active: val })}
                    />
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-muted-foreground">Modelo Principal</label>
                    <Select
                      value={agent.model}
                      disabled={savingAgentId === agent.id}
                      onValueChange={(val) => handleUpdateAgent(agent.id, { model: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-1.5-flash" className="text-xs">Gemini 1.5 Flash (Recomendado)</SelectItem>
                        <SelectItem value="gemini-1.5-pro" className="text-xs">Gemini 1.5 Pro (Visão & Raciocínio Avançado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-medium text-muted-foreground">Nível de Raciocínio (Thinking)</label>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {agent.reasoningLevel} ({agent.thinkingBudget} tokens)
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { label: "Básico", level: "LOW", budget: 0 },
                        { label: "Equilibrado", level: "BALANCED", budget: 1024 },
                        { label: "Aprofundado", level: "DEEP", budget: 2048 },
                      ].map((lvl) => (
                        <Button
                          key={lvl.level}
                          type="button"
                          variant={agent.reasoningLevel === lvl.level ? "default" : "outline"}
                          size="sm"
                          className="h-7 text-[11px]"
                          disabled={savingAgentId === agent.id}
                          onClick={() => handleUpdateAgent(agent.id, { reasoningLevel: lvl.level, thinkingBudget: lvl.budget })}
                        >
                          {lvl.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground font-medium">Temperatura (Criatividade):</span>
                      <span className="font-mono font-bold text-primary">{agent.temperature}</span>
                    </div>
                    <Slider
                      value={[agent.temperature]}
                      min={0}
                      max={1}
                      step={0.05}
                      disabled={savingAgentId === agent.id}
                      onValueChange={(val) => {
                        setAgents((prev) =>
                          prev.map((a) => (a.id === agent.id ? { ...a, temperature: Number(val[0].toFixed(2)) } : a))
                        );
                      }}
                      onValueCommit={(val) => handleUpdateAgent(agent.id, { temperature: Number(val[0].toFixed(2)) })}
                    />
                    <div className="flex justify-between gap-1 pt-1">
                      {[
                        { label: "0.0 Exato", val: 0.0 },
                        { label: "0.3 Padrão", val: 0.3 },
                        { label: "0.7 Criativo", val: 0.7 },
                        { label: "1.0 Máx", val: 1.0 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          type="button"
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer",
                            agent.temperature === preset.val
                              ? "bg-primary/10 border-primary text-primary font-bold"
                              : "border-border/60 hover:bg-muted text-muted-foreground"
                          )}
                          onClick={() => handleUpdateAgent(agent.id, { temperature: preset.val })}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeModelsList.map((model: any, idx: number) => (
              <Card key={idx} className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="size-4 text-primary" />
                      <CardTitle className="text-sm font-bold">{model.displayName}</CardTitle>
                    </div>
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      ATIVO
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-1">{model.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Identificador Oficial:</span>
                    <span className="font-mono font-medium text-foreground">{model.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-muted-foreground">Janela de Contexto (Entrada):</span>
                    <span className="font-medium text-foreground">{(model.inputTokenLimit / 1000).toFixed(0)}k tokens</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Limite de Saída:</span>
                    <span className="font-medium text-foreground">{model.outputTokenLimit} tokens</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
