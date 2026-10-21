"use client";

import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import Link from "next/link";
import { toast } from "sonner";
import {
  Building2,
  Users,
  ShieldCheck,
  Clock,
  Sliders,
  Sparkles,
  Save,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  Percent,
  DollarSign,
  FileText,
  ArrowLeft,
  Check,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { gymGlobalConfigSchema } from "@/modules/workspaces/domain/gym-config";
import { cn } from "@/lib/utils";

type Config = z.infer<typeof gymGlobalConfigSchema>;
type NumericKey = { [Key in keyof Config]: Config[Key] extends number ? Key : never }[keyof Config];

const editableKeys: (keyof Config)[] = [
  "assistedImportEnabled",
  "defaultBillingGraceDays",
  "defaultRequireGuardianSignature",
  "defaultMaxReceptionistDiscountPercent",
  "defaultMaxReceptionistDiscountCents",
  "defaultMaxStudents",
  "defaultMaxStaff",
  "defaultMaxUnits",
  "defaultStorageLimitMb",
];

function extractErrorMessage(body: unknown, fallback: string): string {
  const parsed = z.object({ error: z.string() }).safeParse(body);
  return parsed.success ? parsed.data.error : fallback;
}

function getChangedFields(applied: Config, draft: Config): Partial<Config> {
  return Object.fromEntries(
    editableKeys.filter((key) => applied[key] !== draft[key]).map((key) => [key, draft[key]])
  );
}

/* -------------------------------------------------------------------------
   Componente de Card de Estatística Unificado
------------------------------------------------------------------------- */
interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  iconColor: string;
  iconBg: string;
  description: string;
}

function StatCard({ title, value, icon: Icon, iconColor, iconBg, description }: StatCardProps) {
  return (
    <Card className="border-border/60 bg-card shadow-xs transition-all hover:border-border/80">
      <CardContent className="p-5 flex flex-col justify-between h-full space-y-3">
        <div className="flex items-center justify-between">
          <div className={cn("p-2.5 rounded-xl flex items-center justify-center shrink-0", iconBg, iconColor)}>
            <Icon className="size-4.5" />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/80">{title}</p>
          <h3 className="text-2xl font-black tracking-tight text-foreground mt-1">{value}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 font-medium">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------
   Componente Skeleton Completo para Zero Layout Shift
------------------------------------------------------------------------- */
function GymSettingsSkeleton() {
  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-pulse">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-11 rounded-xl" />
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-56 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-64 rounded" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="border-border/60 bg-card p-5 space-y-3">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-3 w-36 rounded" />
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-11 w-full sm:w-96 rounded-xl" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------
   Página Principal: Configurações Globais de Academias
------------------------------------------------------------------------- */
export default function SuperAdminGymSettingsPage() {
  const [applied, setApplied] = useState<Config | null>(null);
  const [draft, setDraft] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/superadmin/gym-settings", { signal, cache: "no-store" });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(body, "Não foi possível carregar as configurações."));
      const parsed = gymGlobalConfigSchema.safeParse(body);
      if (!parsed.success) throw new Error("Configuração retornada inválida. Recarregue a página.");
      if (signal?.aborted) return;
      setApplied(parsed.data);
      setDraft(parsed.data);
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : "Falha ao carregar as configurações.");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const dirty = Boolean(applied && draft && Object.keys(getChangedFields(applied, draft)).length > 0);

  const handleDiscardChanges = () => {
    setDraft(applied);
    setError(null);
    setReason("");
    toast.info("Alterações descartadas. Valores originais restaurados.");
  };

  async function handleSave() {
    if (!applied || !draft || saving) return;
    const validated = gymGlobalConfigSchema.safeParse(draft);
    if (!validated.success) {
      setError(validated.error.issues[0].message);
      toast.error(validated.error.issues[0].message);
      return;
    }
    const changes = getChangedFields(applied, validated.data);
    const baseline = Object.fromEntries(Object.keys(changes).map((key) => [key, Reflect.get(applied, key)]));
    if (!Object.keys(changes).length) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/superadmin/gym-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          configs: changes,
          baseline,
          reason: reason.trim() || "Configuração global de academias",
        }),
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(extractErrorMessage(body, "Não foi possível salvar as configurações."));

      const result = z.object({ success: z.literal(true), configs: gymGlobalConfigSchema }).safeParse(body);
      if (!result.success) throw new Error("Resposta de gravação inválida. Recarregue para conferir os valores aplicados.");

      const reread = await fetch("/api/superadmin/gym-settings", { cache: "no-store" });
      const persisted: unknown = await reread.json();
      if (!reread.ok) throw new Error("Gravação recebida, mas a confirmação falhou. Recarregue antes de tentar novamente.");

      const confirmed = gymGlobalConfigSchema.safeParse(persisted);
      if (!confirmed.success) throw new Error("Não foi possível confirmar os valores persistidos.");

      const mismatches = editableKeys.some((key) => key in changes && confirmed.data[key] !== validated.data[key]);
      if (mismatches) {
        setApplied(confirmed.data);
        throw new Error("Os valores atuais diferem da solicitação. Confira as alterações pendentes antes de salvar.");
      }

      setApplied(confirmed.data);
      setDraft(confirmed.data);
      setReason("");
      toast.success("Configurações globais salvas e confirmadas com sucesso!");
    } catch (cause) {
      const msg = cause instanceof Error ? cause.message : "Falha ao salvar as configurações.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <GymSettingsSkeleton />;
  }

  if (!applied || !draft) {
    return (
      <div className="min-w-0 p-4 sm:p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <AlertCircle className="size-5 text-destructive" />
              <span>Configurações Indisponíveis</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Não foi possível estabelecer contato com a base de configurações de academias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-destructive">{error || "Falha de comunicação interna."}</p>
            <Button onClick={() => void load()} variant="outline" className="rounded-xl font-bold gap-2">
              <RefreshCw className="size-4" />
              <span>Tentar Novamente</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-w-0 p-4 sm:p-6 md:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500 pb-24">
      {/* 1. Breadcrumbs de Navegação */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/superadmin/dashboard" className="text-xs font-semibold">
                SuperAdmin
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/superadmin/workspaces" className="text-xs font-semibold">
                Workspaces
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-xs font-bold text-foreground">
              Configurações de Academias
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 2. Cabeçalho Principal Alinhado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div className="flex items-start gap-4 min-w-0">
          <Button
            asChild
            variant="outline"
            size="icon"
            className="size-11 shrink-0 rounded-xl border-border/60 hover:bg-secondary/60 cursor-pointer shadow-xs"
            title="Voltar aos Workspaces"
          >
            <Link href="/superadmin/workspaces">
              <ArrowLeft className="size-5" />
            </Link>
          </Button>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground truncate">
                Configurações de Academias
              </h1>

              <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold uppercase tracking-wider gap-1 h-5.5 px-2 text-[10px]">
                <Building2 className="size-3" /> Academia (GYM)
              </Badge>

              <Badge variant="outline" className="border-border/60 font-bold uppercase tracking-wider gap-1 text-muted-foreground h-5.5 px-2 text-[10px]">
                Global
              </Badge>

              {dirty ? (
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold uppercase tracking-wider h-5.5 px-2 text-[10px]">
                  Alterações Pendentes
                </Badge>
              ) : (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold uppercase tracking-wider h-5.5 px-2 text-[10px]">
                  Valores Aplicados
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Parâmetros operacionais e franquias padrão aplicadas na criação de novas academias na plataforma.
            </p>
          </div>
        </div>

        {/* Ações do Cabeçalho */}
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {dirty && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscardChanges}
              disabled={saving}
              className="h-10 rounded-xl font-bold gap-2 text-xs border-border/60 shadow-xs hover:bg-secondary/60 cursor-pointer"
            >
              <RotateCcw className="size-3.5" />
              <span>Descartar</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => void load()}
            disabled={dirty || saving}
            className="h-10 rounded-xl font-bold gap-2 text-xs border-border/60 shadow-xs hover:bg-secondary/60 cursor-pointer"
          >
            <RefreshCw className="size-3.5" />
            <span>Recarregar</span>
          </Button>

          <Button
            onClick={() => void handleSave()}
            disabled={!dirty || saving}
            className="h-10 rounded-xl font-bold gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <Save className="size-3.5" />
                <span>Salvar Configurações</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Alerta de Erro se houver */}
      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-xs font-semibold text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 3. Bento Grid de Indicadores Principais (Valores em Rascunho/Padrão) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Alunos Padrão"
          value={draft.defaultMaxStudents.toLocaleString("pt-BR")}
          icon={Users}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          description="Franquia inicial de matrículas"
        />

        <StatCard
          title="Equipe / Staff"
          value={draft.defaultMaxStaff.toLocaleString("pt-BR")}
          icon={ShieldCheck}
          iconColor="text-purple-400"
          iconBg="bg-purple-500/10"
          description="Capacidade de colaboradores"
        />

        <StatCard
          title="Unidades Filiais"
          value={draft.defaultMaxUnits.toLocaleString("pt-BR")}
          icon={Building2}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          description="Locais permitidos por rede"
        />

        <StatCard
          title="Tolerância de Atraso"
          value={`${draft.defaultBillingGraceDays} dias`}
          icon={Clock}
          iconColor="text-amber-500"
          iconBg="bg-amber-500/10"
          description="Prazo antes do bloqueio de catraca"
        />
      </div>

      {/* 4. Tabs de Configuração Organizada */}
      <Tabs defaultValue="franquias" className="w-full space-y-6">
        <TabsList className="h-fit! p-1 bg-secondary/30 rounded-xl border border-border/40 inline-flex flex-wrap w-full sm:w-auto">
          <TabsTrigger
            value="franquias"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Building2 className="size-3.5 text-muted-foreground" />
            <span>Franquias & Licenciamento</span>
          </TabsTrigger>

          <TabsTrigger
            value="politicas"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <ShieldCheck className="size-3.5 text-muted-foreground" />
            <span>Políticas & Cobrança</span>
          </TabsTrigger>

          <TabsTrigger
            value="modulos"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <Sparkles className="size-3.5 text-purple-400" />
            <span>Módulos Globais</span>
          </TabsTrigger>

          <TabsTrigger
            value="auditoria"
            className="rounded-lg cursor-pointer h-9 px-4 text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs transition-all"
          >
            <FileText className="size-3.5 text-muted-foreground" />
            <span>Auditoria & Motivo</span>
          </TabsTrigger>
        </TabsList>

        {/* -------------------------------------------------------------------
            ABA 1: FRANQUIAS & LICENCIAMENTO
        ------------------------------------------------------------------- */}
        <TabsContent value="franquias" className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="size-4 text-primary" />
                <span>Franquias Padrão para Novas Academias</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Estes limites serão atribuídos por padrão a cada novo workspace do tipo Academia (GYM) criado na plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="gym-max-students" className="text-xs font-bold">
                    Máximo de Alunos (Matrículas)
                  </Label>
                  <Input
                    id="gym-max-students"
                    type="number"
                    min={0}
                    max={1_000_000}
                    value={Number.isFinite(draft.defaultMaxStudents) ? draft.defaultMaxStudents : ""}
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((current) =>
                        current ? { ...current, defaultMaxStudents: e.target.valueAsNumber || 0 } : current
                      )
                    }
                    className="rounded-xl h-10 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Limite inicial de alunos com contrato ativo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym-max-staff" className="text-xs font-bold">
                    Máximo de Equipe / Staff
                  </Label>
                  <Input
                    id="gym-max-staff"
                    type="number"
                    min={0}
                    max={1_000_000}
                    value={Number.isFinite(draft.defaultMaxStaff) ? draft.defaultMaxStaff : ""}
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((current) =>
                        current ? { ...current, defaultMaxStaff: e.target.valueAsNumber || 0 } : current
                      )
                    }
                    className="rounded-xl h-10 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Professores, recepcionistas e gestores.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym-max-units" className="text-xs font-bold">
                    Máximo de Unidades Filiais
                  </Label>
                  <Input
                    id="gym-max-units"
                    type="number"
                    min={1}
                    max={1_000_000}
                    value={Number.isFinite(draft.defaultMaxUnits) ? draft.defaultMaxUnits : 1}
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((current) =>
                        current ? { ...current, defaultMaxUnits: Math.max(1, e.target.valueAsNumber || 1) } : current
                      )
                    }
                    className="rounded-xl h-10 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Filiais físicas permitidas (mínimo 1).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym-storage-limit" className="text-xs font-bold">
                    Armazenamento Cloud (MB)
                  </Label>
                  <Input
                    id="gym-storage-limit"
                    type="number"
                    min={0}
                    max={1_000_000}
                    value={Number.isFinite(draft.defaultStorageLimitMb) ? draft.defaultStorageLimitMb : ""}
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((current) =>
                        current ? { ...current, defaultStorageLimitMb: e.target.valueAsNumber || 0 } : current
                      )
                    }
                    className="rounded-xl h-10 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Equivalente a {(draft.defaultStorageLimitMb / 1024).toFixed(1)} GB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------
            ABA 2: POLÍTICAS & REGRAS DE COBRANÇA
        ------------------------------------------------------------------- */}
        <TabsContent value="politicas" className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                <span>Políticas Financeiras & Regras Operacionais</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Diretrizes de tolerância de inadimplência, limites de descontos e exigências legais para alunos.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="gym-grace-days" className="text-xs font-bold">
                    Tolerância de Inadimplência (Dias)
                  </Label>
                  <Input
                    id="gym-grace-days"
                    type="number"
                    min={0}
                    max={365}
                    value={Number.isFinite(draft.defaultBillingGraceDays) ? draft.defaultBillingGraceDays : 0}
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((current) =>
                        current ? { ...current, defaultBillingGraceDays: e.target.valueAsNumber || 0 } : current
                      )
                    }
                    className="rounded-xl h-10 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Dias de carência antes do bloqueio da catraca de alunos com pagamentos vencidos.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym-discount-percent" className="text-xs font-bold">
                    Desconto Máximo da Recepção (%)
                  </Label>
                  <Input
                    id="gym-discount-percent"
                    type="number"
                    min={0}
                    max={100}
                    step="any"
                    value={
                      Number.isFinite(draft.defaultMaxReceptionistDiscountPercent)
                        ? draft.defaultMaxReceptionistDiscountPercent
                        : 0
                    }
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((current) =>
                        current
                          ? { ...current, defaultMaxReceptionistDiscountPercent: e.target.valueAsNumber || 0 }
                          : current
                      )
                    }
                    className="rounded-xl h-10 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Porcentagem máxima que atendentes podem aplicar sem aprovação do gestor.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym-discount-cents" className="text-xs font-bold">
                    Desconto Máximo da Recepção (Centavos)
                  </Label>
                  <Input
                    id="gym-discount-cents"
                    type="number"
                    min={0}
                    max={1_000_000}
                    value={
                      Number.isFinite(draft.defaultMaxReceptionistDiscountCents)
                        ? draft.defaultMaxReceptionistDiscountCents
                        : 0
                    }
                    disabled={saving}
                    onChange={(e) =>
                      setDraft((current) =>
                        current
                          ? { ...current, defaultMaxReceptionistDiscountCents: e.target.valueAsNumber || 0 }
                          : current
                      )
                    }
                    className="rounded-xl h-10 border-border/60"
                  />
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Equivalente a{" "}
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      (draft.defaultMaxReceptionistDiscountCents || 0) / 100
                    )}
                    .
                  </p>
                </div>
              </div>

              {/* Switch de Assinatura Obrigatória */}
              <div className="pt-4 border-t border-border/30">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/10">
                  <div className="space-y-0.5 pr-4">
                    <Label htmlFor="gym-require-guardian" className="text-xs font-bold cursor-pointer">
                      Assinatura Obrigatória de Responsável para Menores
                    </Label>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Exige assinatura digital de termo de responsabilidade pelo responsável legal para ativação de matrículas de menores de 18 anos.
                    </p>
                  </div>
                  <Switch
                    id="gym-require-guardian"
                    disabled={saving}
                    checked={draft.defaultRequireGuardianSignature}
                    onCheckedChange={(checked) =>
                      setDraft((current) =>
                        current ? { ...current, defaultRequireGuardianSignature: checked } : current
                      )
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------
            ABA 3: MÓDULOS GLOBAIS
        ------------------------------------------------------------------- */}
        <TabsContent value="modulos" className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="size-4 text-purple-400" />
                <span>Disponibilidade de Módulos Globais</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Controle a disponibilidade de módulos de importação e ferramentas auxiliares para a rede de academias.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border/50 bg-secondary/10">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="gym-assisted-import" className="text-xs font-bold cursor-pointer">
                      Módulo de Importação Assistida de Alunos e Saldos
                    </Label>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider h-5 px-1.5 border",
                        draft.assistedImportEnabled
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-secondary text-muted-foreground border-border/60"
                      )}
                    >
                      {draft.assistedImportEnabled ? "Disponível" : "Desativado"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Habilita a ferramenta de migração assistida, permitindo que as academias importem planilhas de alunos, planos vigentes e saldos financeiros legados com conferência prévia.
                  </p>
                </div>
                <Switch
                  id="gym-assisted-import"
                  disabled={saving}
                  checked={draft.assistedImportEnabled}
                  onCheckedChange={(checked) =>
                    setDraft((current) =>
                      current ? { ...current, assistedImportEnabled: checked } : current
                    )
                  }
                />
              </div>

              <div className="p-4 rounded-xl border border-border/40 bg-secondary/5 text-xs text-muted-foreground space-y-1">
                <p className="font-bold text-foreground">Nota de Governança de Módulos:</p>
                <p>
                  A liberação global de um recurso não dispensa a necessidade de licença ativa da academia nem substitui as regras de permissão de acesso por perfil (RBAC).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -------------------------------------------------------------------
            ABA 4: AUDITORIA & JUSTIFICATIVA
        ------------------------------------------------------------------- */}
        <TabsContent value="auditoria" className="space-y-6 animate-in fade-in duration-300">
          <Card className="border-border/60 bg-card shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <span>Registro de Auditoria & Justificativa da Alteração</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Todas as alterações em configurações globais de academias são registradas no log de auditoria com seu ID de SuperAdmin.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="gym-settings-reason" className="text-xs font-bold">
                    Justificativa ou Observação para Auditoria (Opcional)
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {reason.length} / 2000 caracteres
                  </span>
                </div>
                <Textarea
                  id="gym-settings-reason"
                  placeholder="Ex: Atualização dos limites de tolerância e franquias padrão aprovada pela diretoria técnica..."
                  value={reason}
                  maxLength={2000}
                  disabled={saving}
                  onChange={(e) => setReason(e.target.value)}
                  className="rounded-xl border-border/60 min-h-[120px] text-xs p-3"
                />
                <p className="text-[11px] text-muted-foreground font-medium">
                  Esta observação será gravada permanentemente no registro de auditoria da alteração.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                <ShieldAlert className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="font-bold text-foreground">Impacto das Configurações Globais:</p>
                  <p>
                    Esses padrões são aplicados exclusivamente a novos workspaces de academia criados a partir da gravação. Academias já existentes mantêm suas configurações individuais salvas em seus respectivos workspaces.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 5. Barra Inferior Flutuante quando houver alterações pendentes */}
      {dirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2.5 pl-1.5 min-w-0">
              <span className="size-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <p className="text-xs font-bold text-foreground truncate">
                Você possui alterações pendentes não salvas.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDiscardChanges}
                disabled={saving}
                className="h-9 px-3 rounded-xl font-bold text-xs"
              >
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => void handleSave()}
                disabled={saving}
                className="h-9 px-4 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs cursor-pointer gap-1.5"
              >
                {saving ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="size-3.5" />
                    <span>Salvar Agora</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
