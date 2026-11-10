"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { toast } from "sonner";
import {
  FileText,
  Receipt,
  Landmark,
  ArrowLeftRight,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Loader2,
  Search,
  FileCheck,
  Lock,
  Eye,
  History,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Info,
  Calendar,
  X,
  Building2,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { GymEmptyState } from "@/components/application/gym-page";
import { cn } from "@/lib/utils";
import type {
  GymReviewKind,
  listGymAdministrativeReviewResources,
} from "@/modules/workspaces/application/gym-administrative-review";

type Listing = Awaited<ReturnType<typeof listGymAdministrativeReviewResources>>;
type Preview = {
  digest: string;
  blockers: string[];
  snapshot: Record<string, any>;
  proposed: Record<string, any>;
};

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const blockerLabels: Record<string, string> = {
  REVIEW_SOURCE_LIMIT: "Há mais registros do que o limite de uma revisão; confira o histórico em lotes menores",
  ACCOUNT_TENANT_REVIEW_REQUIRED: "Existem lançamentos vinculados a outra academia",
  CASH_TRANSFER_LINK_REVIEW_REQUIRED: "O vínculo entre caixa e transferência não corresponde à conta ou ao valor",
  UNLINKED_CASH_MOVEMENT_REVIEW_REQUIRED: "Classifique os movimentos antigos na aba de caixa antes de revisar esta conta",
  ALLOCATION_INTEGRITY_REQUIRED: "Existem alocações inconsistentes com seus recebimentos",
  INVOICE_AMOUNT_REVIEW_REQUIRED: "Os valores da obrigação e das alocações não correspondem",
  INVOICE_TRANSITION_REQUIRED: "Esta obrigação exige revisão do seu estado antes do saldo",
  LEGACY_ACCOUNT_FACTS_REVIEW_REQUIRED: "Existem recebimentos sem conta identificada ou despesas antigas sem pagamentos individuais; confira esses vínculos antes do saldo",
  EXTERNAL_ACCOUNT_REVIEW_REQUIRED: "Esta conta é externa e exige conferência própria do histórico; a academia usa contas internas",
};

const categoryConfig: Record<
  GymReviewKind,
  { label: string; singular: string; description: string; icon: React.ElementType }
> = {
  CONTRACT: {
    label: "Contratos Legados",
    singular: "Contrato",
    description: "Duplicidades de matrículas, vínculos externos e cancelamentos com retenção de faturas.",
    icon: FileText,
  },
  INVOICE: {
    label: "Faturas & Alocações",
    singular: "Fatura",
    description: "Conferência de obrigações, pagamentos parciais e saldos remanescentes.",
    icon: Receipt,
  },
  ACCOUNT: {
    label: "Contas Internas",
    singular: "Conta",
    description: "Auditoria de saldos iniciais, conciliação de receitas e despesas registradas.",
    icon: Landmark,
  },
  CASH_LINK: {
    label: "Movimentos de Caixa",
    singular: "Movimento de Caixa",
    description: "Classificação de sangrias e suprimentos legados com destino a transferências.",
    icon: ArrowLeftRight,
  },
};

function currency(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") {
    return "Não informado";
  }
  const str = String(value);
  if (!/^-?\d+$/.test(str)) return "Não informado";
  const amount = BigInt(str);
  const positive = amount < BigInt(0) ? -amount : amount;
  return `${amount < BigInt(0) ? "−" : ""}R$ ${(positive / BigInt(100)).toLocaleString("pt-BR")},${String(
    positive % BigInt(100)
  ).padStart(2, "0")}`;
}

function ReconciliationKPICard({
  title,
  value,
  subDetail,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subDetail: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "destructive";
}) {
  const iconColor =
    variant === "success"
      ? "text-emerald-500 bg-emerald-500/10"
      : variant === "warning"
        ? "text-amber-500 bg-amber-500/10"
        : variant === "destructive"
          ? "text-red-500 bg-red-500/10"
          : "text-primary bg-primary/10";

  return (
    <Card
      size="sm"
      className="relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xs hover:border-border/80 transition-all duration-200"
    >
      <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
              {title}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </p>
          </div>
          <div className={cn("flex size-8 items-center justify-center rounded-lg shrink-0", iconColor)}>
            <Icon className="size-4" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
          {subDetail}
        </p>
      </CardContent>
    </Card>
  );
}

export function GymReconciliationClient({
  workspaceId,
  workspaceName = "Academia",
  initial,
}: {
  workspaceId: string;
  workspaceName?: string;
  initial: Listing;
}) {
  const [kind, setKind] = useState<GymReviewKind>("CONTRACT");
  const [listing, setListing] = useState<Listing>(initial);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Review Dialog state
  const [target, setTarget] = useState<{ id: string; label: string } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [approved, setApproved] = useState(false);
  const [closed, setClosed] = useState(false);
  const [charges, setCharges] = useState(false);
  const [schedule, setSchedule] = useState(false);
  const [credit, setCredit] = useState("");
  const [due, setDue] = useState("");
  const [opening, setOpening] = useState("");
  const [cycles, setCycles] = useState("0");
  const [requestKey, setRequestKey] = useState("");
  const [cashDisposition, setCashDisposition] = useState("");
  const [transferId, setTransferId] = useState("");

  async function request(url: string, options?: RequestInit) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Não foi possível concluir a operação.");
    return data;
  }

  async function load(nextKind: GymReviewKind = kind, page = 1) {
    setBusy(true);
    try {
      const data = await request(
        `/api/gym/reviews?workspaceId=${encodeURIComponent(workspaceId)}&kind=${nextKind}&page=${page}`
      );
      setListing(data);
      setKind(nextKind);
      setSearchQuery("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao consultar as revisões.");
    } finally {
      setBusy(false);
    }
  }

  async function open(row: { id: string; label: string }) {
    setBusy(true);
    try {
      const data = await request(
        `/api/gym/reviews/${kind}/${row.id}?workspaceId=${encodeURIComponent(workspaceId)}`
      );
      setPreview(data);
      setTarget(row);
      setReason("");
      setEvidence("");
      setApproved(false);
      setClosed(false);
      setCharges(false);
      setSchedule(false);
      setCredit("");
      setDue("");
      setOpening("");
      setCashDisposition("");
      setTransferId("");
      setCycles(String(data.snapshot.contract?.cycleCount || "0"));
      setRequestKey(crypto.randomUUID());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao abrir revisão deste recurso.");
    } finally {
      setBusy(false);
    }
  }

  async function commit(event: React.FormEvent) {
    event.preventDefault();
    if (!target || !preview || busy) return;
    setBusy(true);
    try {
      const e = preview.snapshot.contract;
      const body = {
        workspaceId,
        requestKey,
        previewDigest: preview.digest,
        reason,
        evidenceReference: evidence,
        approved,
        ...(kind === "CONTRACT"
          ? {
            ...(e.providerSubscriptionId || e.recurrenceMode === "PROVIDER"
              ? {
                externalSubscriptionClosed: closed,
                externalChargesReviewed: charges,
                completedCycles: Number(cycles),
              }
              : {}),
            ...(BigInt(e.creditBalanceInCents) !== BigInt(0) ? { creditDisposition: credit } : {}),
            ...(e.scheduledPlanVersionId ? { cancelLegacyPlanSchedule: schedule } : {}),
            ...(due ? { nextDueDate: due } : {}),
          }
          : kind === "CASH_LINK"
            ? {
              cashMovementDisposition: cashDisposition,
              ...(cashDisposition === "INTERNAL_TRANSFER" ? { transferId } : {}),
            }
            : opening
              ? { openingAmountInCents: opening }
              : {}),
      };

      await request(`/api/gym/reviews/${kind}/${target.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success("Decisão administrativa registrada com sucesso! Histórico preservado.");
      setTarget(null);
      setPreview(null);
      await load(kind, listing.page);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Falha ao aprovar revisão. Reabra se os fatos mudaram."
      );
    } finally {
      setBusy(false);
    }
  }

  // Filtered rows in the active batch based on search input
  const filteredRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return listing.rows;
    return listing.rows.filter(
      (r) => r.label.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    );
  }, [listing.rows, searchQuery]);

  const contract = preview?.snapshot.contract;
  const invoice = preview?.snapshot.invoice;
  const account = preview?.snapshot.account;
  const duplicateOnly =
    contract &&
    !contract.providerSubscriptionId &&
    contract.recurrenceMode !== "PROVIDER" &&
    BigInt(contract.creditBalanceInCents) === BigInt(0) &&
    !contract.scheduledPlanVersionId;

  const draftOpening = /^\d{1,19}$/.test(opening) ? BigInt(opening) : null;
  const draftBalance =
    preview && (kind === "INVOICE" || kind === "ACCOUNT")
      ? kind === "INVOICE"
        ? BigInt(invoice.totalInCents) -
        BigInt(preview.snapshot.allocatedInCents) -
        (draftOpening ?? BigInt(invoice.openingPaidAmountInCents))
        : BigInt(preview.snapshot.activityInCents) +
        (draftOpening ?? BigInt(account.initialBalanceInCents))
      : null;

  const currentConfig = categoryConfig[kind];

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-400 mx-auto"
      aria-busy={busy}
    >
      {/* 1. Header Estratégico & Operacional */}
      <motion.div
        variants={item}
        className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              Revisão e Conciliação
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
            <span>Auditoria contábil, regularização de vínculos e conformidade de saldos.</span>
            <span className="font-semibold text-foreground flex items-center gap-1">
              <Building2 className="size-3.5 text-primary" />
              {workspaceName}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="w-fit gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-background border-border/50 shadow-xs"
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Auditoria Ativa
          </Badge>

          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => load(kind, listing.page)}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border/50 cursor-pointer"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Atualizar
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border/50 cursor-pointer"
          >
            <Link href="/gym/enrollments">
              <FileText className="size-3.5" />
              Matrículas
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border/50 cursor-pointer"
          >
            <Link href="/gym/finance">
              <DollarSign className="size-3.5" />
              Financeiro
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* 2. KPIs de Auditoria e Conformidade */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <ReconciliationKPICard
            title="Pendências no Tipo"
            value={listing.total}
            subDetail={currentConfig.label}
            icon={currentConfig.icon}
            variant={listing.total > 0 ? "warning" : "success"}
          />
          <ReconciliationKPICard
            title="Decisões Auditadas"
            value={listing.historyTotal}
            subDetail="Decisões salvas no histórico"
            icon={ShieldCheck}
            variant="success"
          />
          <ReconciliationKPICard
            title="Páginas do Lote"
            value={`${listing.page} de ${Math.max(1, listing.pages)}`}
            subDetail={`${listing.rows.length} itens exibidos nesta página`}
            icon={Eye}
            variant="default"
          />
          <ReconciliationKPICard
            title="Garantia Contábil"
            value="Livro-Razão"
            subDetail="Rastreabilidade criptográfica"
            icon={Lock}
            variant="default"
          />
        </div>
      </motion.div>

      {/* 3. Seletor de Categorias de Revisão (Tabs) */}
      <motion.div variants={item} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Tipos de revisão">
          {(Object.keys(categoryConfig) as GymReviewKind[]).map((categoryKey) => {
            const config = categoryConfig[categoryKey];
            const Icon = config.icon;
            const isActive = kind === categoryKey;

            return (
              <Button
                key={categoryKey}
                disabled={busy}
                variant={isActive ? "default" : "outline"}
                size="sm"
                aria-pressed={isActive}
                onClick={() => load(categoryKey, 1)}
                className={cn(
                  "rounded-xl h-9 text-xs font-semibold gap-2 border-border/50 cursor-pointer transition-all",
                  isActive ? "shadow-xs" : "bg-background/60 hover:bg-accent"
                )}
              >
                <Icon className="size-4" />
                <span>{config.label}</span>
                {isActive && listing.total > 0 && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px] font-bold">
                    {listing.total}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Alerta de diretriz de auditoria */}
        <Alert className="border-border/50 bg-card/40 backdrop-blur-xs py-2.5">
          <Info className="size-4 text-primary" />
          <AlertTitle className="text-xs font-semibold">Diretriz de Conformidade Financeira</AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            {currentConfig.description} Assinaturas externas exigem conferência no provedor. Esta
            revisão preserva contratos, faturas e recebimentos; não cancela cobranças externas nem gera
            receita fictícia.
          </AlertDescription>
        </Alert>

        {listing.duplicateInventoryHasMore && (
          <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 py-2.5">
            <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertTitle className="text-xs font-semibold">Lote de Duplicidades Elevado</AlertTitle>
            <AlertDescription className="text-xs">
              Duplicidades apresentadas em lotes de até 1.000 alunos. Regularize este lote e
              recarregue para processar os próximos registros.
            </AlertDescription>
          </Alert>
        )}
      </motion.div>

      {/* 4. Barra de Pesquisa e Filtros */}
      <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder={`Buscar por nome, identificador ou detalhes em ${currentConfig.label}...`}
            className="h-10 pl-9 bg-card border-border/50 rounded-xl"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-7 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground sm:ml-auto whitespace-nowrap" aria-live="polite">
          {filteredRows.length}{" "}
          {filteredRows.length === 1 ? "registro visível" : "registros visíveis"} no lote
        </p>
      </motion.div>

      {/* 5. Tabela de Registros a Revisar */}
      <motion.div variants={item}>
        <Card className="border border-border/50 bg-card/40 backdrop-blur-xs rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <currentConfig.icon className="size-4.5 text-primary" />
                  {currentConfig.label} Pendentes
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione um registro para abrir a auditoria detalhada, inspecionar o snapshot contábil
                  e propor a conciliação.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                Página {listing.page} de {Math.max(1, listing.pages)}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {busy ? (
              <div className="p-4 space-y-3" role="status" aria-label="Carregando dados da revisão">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-border/20">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-3/4 max-w-md" />
                      <Skeleton className="h-3 w-1/3 max-w-xs" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-8">
                <GymEmptyState
                  icon={CheckCircle2}
                  title="Nenhuma pendência encontrada"
                  description={
                    searchQuery
                      ? "Nenhum registro corresponde aos critérios de pesquisa informados."
                      : `Não há itens de ${currentConfig.label.toLowerCase()} aguardando conferência nesta página.`
                  }
                  className="rounded-xl border border-dashed border-border/50 bg-secondary/5 py-12"
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="w-[45%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Recurso / Descrição
                    </TableHead>
                    <TableHead className="w-[25%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Identificador
                    </TableHead>
                    <TableHead className="w-[15%] text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Tipo
                    </TableHead>
                    <TableHead className="w-[15%] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Ação
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="border-border/30 transition-colors hover:bg-muted/30"
                    >
                      <TableCell className="py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-sm text-foreground [overflow-wrap:anywhere]">
                            {row.label}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Aguardando validação com comprovante documental
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                          {row.id}
                        </span>
                      </TableCell>
                      <TableCell className="py-3.5">
                        <Badge variant="outline" className="text-[11px] font-medium border-border/50">
                          {currentConfig.singular}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3.5 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => open(row)}
                          className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border/50 hover:bg-primary hover:text-primary-foreground cursor-pointer transition-colors"
                          aria-label={`Revisar fatos de ${row.label}`}
                        >
                          <Eye className="size-3.5" />
                          Revisar Fatos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Paginação */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-t border-border/30 bg-muted/10">
              <Button
                variant="outline"
                size="sm"
                disabled={busy || listing.page <= 1}
                onClick={() => load(kind, listing.page - 1)}
                className="rounded-xl h-8 text-xs font-semibold gap-1 border-border/50 cursor-pointer"
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>

              <p className="text-xs text-muted-foreground font-medium" role="status">
                Página <span className="font-bold text-foreground">{listing.page}</span> de{" "}
                <span className="font-bold text-foreground">{Math.max(1, listing.pages)}</span> ·{" "}
                {listing.total} {listing.total === 1 ? "registro total" : "registros totais"}
              </p>

              <Button
                variant="outline"
                size="sm"
                disabled={busy || listing.page >= listing.pages}
                onClick={() => load(kind, listing.page + 1)}
                className="rounded-xl h-8 text-xs font-semibold gap-1 border-border/50 cursor-pointer"
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 6. Card de Decisões Registradas (Trilha de Auditoria) */}
      <motion.div variants={item}>
        <Card className="border border-border/50 bg-card/40 backdrop-blur-xs rounded-2xl overflow-hidden shadow-xs">
          <CardHeader className="p-4 sm:p-5 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <History className="size-4.5 text-primary" />
                  Decisões Registradas & Trilhas de Auditoria
                </CardTitle>
                <CardDescription className="text-xs">
                  Registro imutável de decisões administrativas tomadas para {currentConfig.label.toLowerCase()}.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {listing.historyTotal} {listing.historyTotal === 1 ? "decisão registrada" : "decisões registradas"}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5">
            {listing.history.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                Nenhuma decisão registrada ainda para esta categoria nesta página.
              </div>
            ) : (
              <div className="space-y-3">
                {listing.history.map((record) => (
                  <div
                    key={record.id}
                    className="p-3.5 rounded-xl border border-border/40 bg-background/40 space-y-2 hover:border-border/80 transition-all text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/20 pb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-semibold gap-1">
                          <Calendar className="size-3" />
                          {new Date(record.createdAt).toLocaleString("pt-BR")}
                        </Badge>
                        <span className="font-semibold text-foreground text-sm">
                          {record.reason}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        ID: {record.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <FileCheck className="size-3.5 text-emerald-500 shrink-0" />
                        <span className="truncate">
                          <strong className="text-foreground">Comprovante:</strong>{" "}
                          {record.evidenceReference}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 font-mono text-[11px]">
                        <span className="truncate">
                          <strong className="text-foreground font-sans">Recurso:</strong>{" "}
                          {record.resourceId}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 7. Modal de Revisão Administrativa (Dialog) */}
      <Dialog
        open={Boolean(target)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !busy) {
            setTarget(null);
            setPreview(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto! rounded-2xl! p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              Revisar {target?.label}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confira os valores contábeis do snapshot e anexe a justificativa e referência documental.
              A decisão ficará permanentemente registrada no livro-razão imutável da academia.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <form onSubmit={commit} className="space-y-5 mt-2">
              <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="size-3.5 text-primary" /> Fatos Contábeis & Snapshot
                </h4>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  {contract && (
                    <>
                      <dt className="text-muted-foreground">Matrícula</dt>
                      <dd className="font-mono text-foreground break-all">{contract.id}</dd>
                      <dt className="text-muted-foreground">Plano</dt>
                      <dd className="font-semibold text-foreground">{contract.planVersion.name}</dd>
                      <dt className="text-muted-foreground">Assinatura Externa</dt>
                      <dd className="font-mono text-foreground break-all">
                        {contract.providerSubscriptionId || "Sem referência externa"}
                      </dd>
                      <dt className="text-muted-foreground">Crédito Legado</dt>
                      <dd className="font-bold text-foreground">
                        {currency(contract.creditBalanceInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Ciclos Registrados</dt>
                      <dd className="font-medium text-foreground">{contract.cycleCount}</dd>
                      <dt className="text-muted-foreground">Faturas Preservadas</dt>
                      <dd className="font-medium text-foreground">
                        {preview.snapshot.invoices.length} fatura(s)
                      </dd>
                    </>
                  )}

                  {invoice && (
                    <>
                      <dt className="text-muted-foreground">Valor da Obrigação</dt>
                      <dd className="font-bold text-foreground">{currency(invoice.totalInCents)}</dd>
                      <dt className="text-muted-foreground">Pago Registrado</dt>
                      <dd className="font-medium text-foreground">
                        {currency(invoice.paidAmountInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Recebimentos Alocados</dt>
                      <dd className="font-medium text-foreground">
                        {currency(preview.snapshot.allocatedInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Pago Calculado</dt>
                      <dd className="font-bold text-emerald-600 dark:text-emerald-400">
                        {currency(preview.proposed.paidAmountInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Saldo Calculado</dt>
                      <dd className="font-bold text-foreground">
                        {currency(preview.proposed.balanceRemainingInCents)}
                      </dd>
                    </>
                  )}

                  {account && (
                    <>
                      <dt className="text-muted-foreground">Saldo de Abertura</dt>
                      <dd className="font-medium text-foreground">
                        {currency(account.initialBalanceInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Saldo Registrado</dt>
                      <dd className="font-medium text-foreground">
                        {currency(account.balanceInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Movimentação Líquida</dt>
                      <dd className="font-bold text-foreground">
                        {currency(preview.snapshot.activityInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Saldo Calculado</dt>
                      <dd className="font-bold text-emerald-600 dark:text-emerald-400">
                        {currency(preview.proposed.balanceInCents)}
                      </dd>
                    </>
                  )}

                  {kind === "CASH_LINK" && (
                    <>
                      <dt className="text-muted-foreground">Tipo de Movimento</dt>
                      <dd className="font-semibold text-foreground">
                        {preview.snapshot.movement.movementType === "SUPPLY" ? "Suprimento" : "Sangria"}
                      </dd>
                      <dt className="text-muted-foreground">Valor do Movimento</dt>
                      <dd className="font-bold text-foreground">
                        {currency(preview.snapshot.movement.amountInCents)}
                      </dd>
                      <dt className="text-muted-foreground">Data do Registro</dt>
                      <dd className="font-medium text-foreground">
                        {new Date(preview.snapshot.movement.createdAt).toLocaleString("pt-BR")}
                      </dd>
                    </>
                  )}
                </dl>
              </div>

              {/* Alertas de Bloqueio */}
              {!!preview.blockers.length && (
                <Alert variant="destructive" className="border-destructive/30 bg-destructive/10">
                  <AlertTriangle className="size-4" />
                  <AlertTitle className="text-xs font-bold">Bloqueios de Integridade Detectados</AlertTitle>
                  <AlertDescription className="text-xs space-y-1 mt-1">
                    <p>Revise os fatos individuais antes de aprovar este ajuste:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      {preview.blockers.map((code) => (
                        <li key={code}>
                          {blockerLabels[code] || "Há uma inconsistência que exige conferência documental."}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Alerta de múltiplas matrículas ativas */}
              {contract && preview.snapshot.liveContractsCount > 1 && (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                  <AlertTitle className="text-xs font-bold">Múltiplas Matrículas Detectadas</AlertTitle>
                  <AlertDescription className="text-xs space-y-2 mt-1">
                    <p>
                      Este aluno possui {preview.snapshot.liveContractsCount} matrículas ativas ou
                      pausadas. Escolha o contrato que deve permanecer e cancele os demais, preservando
                      suas obrigações.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-2 text-xs rounded-lg">
                      <Link href="/gym/enrollments">Regularizar matrículas</Link>
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Campos específicos de Contrato */}
              {contract && (
                <div className="space-y-3.5 rounded-xl border border-border/50 p-3.5 bg-background/50">
                  {(contract.providerSubscriptionId || contract.recurrenceMode === "PROVIDER") && (
                    <>
                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          id="check-closed"
                          checked={closed}
                          onCheckedChange={(val) => setClosed(Boolean(val))}
                          className="mt-0.5"
                        />
                        <Label htmlFor="check-closed" className="text-xs leading-snug cursor-pointer">
                          Conferi o encerramento da assinatura no provedor externo e possuo o comprovante documental.
                        </Label>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Checkbox
                          id="check-charges"
                          checked={charges}
                          onCheckedChange={(val) => setCharges(Boolean(val))}
                          className="mt-0.5"
                        />
                        <Label htmlFor="check-charges" className="text-xs leading-snug cursor-pointer">
                          Conferi todas as cobranças externas pendentes e seus respectivos destinos.
                        </Label>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="review-cycles" className="text-xs font-semibold">
                          Ciclos já emitidos (incluindo externos)
                        </Label>
                        <Input
                          id="review-cycles"
                          type="number"
                          min={0}
                          max={10000000}
                          value={cycles}
                          onChange={(e) => setCycles(e.target.value)}
                          className="h-9 rounded-lg"
                          required
                        />
                      </div>
                    </>
                  )}

                  {BigInt(contract.creditBalanceInCents) !== BigInt(0) && (
                    <div className="space-y-1.5">
                      <Label htmlFor="review-credit" className="text-xs font-semibold">
                        Destinação comprovada do crédito
                      </Label>
                      <Select value={credit || undefined} onValueChange={(val) => setCredit(val)}>
                        <SelectTrigger id="review-credit" className="w-full h-9 rounded-lg">
                          <SelectValue placeholder="Selecione a destinação comprovada" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXTERNALLY_SETTLED">
                            Liquidado fora do sistema, conforme documento
                          </SelectItem>
                          <SelectItem value="INVALID_LEGACY_ENTRY">
                            Lançamento legado incorreto, conforme revisão
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {contract.scheduledPlanVersionId && (
                    <div className="flex items-start gap-2.5">
                      <Checkbox
                        id="check-schedule"
                        checked={schedule}
                        onCheckedChange={(val) => setSchedule(Boolean(val))}
                        className="mt-0.5"
                      />
                      <Label htmlFor="check-schedule" className="text-xs leading-snug cursor-pointer">
                        Retirar o agendamento legado. A nova troca será proposta com outro aceite.
                      </Label>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="review-due" className="text-xs font-semibold">
                      Próximo vencimento local (opcional)
                    </Label>
                    <Input
                      id="review-due"
                      type="date"
                      value={due}
                      onChange={(e) => setDue(e.target.value)}
                      className="h-9 rounded-lg"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Sem data, a geração fica parada até configuração posterior. Nenhuma obrigação anterior será quitada.
                    </p>
                  </div>
                </div>
              )}

              {/* Campos específicos de Caixa */}
              {kind === "CASH_LINK" && (
                <div className="space-y-3.5 rounded-xl border border-border/50 p-3.5 bg-background/50">
                  <div className="space-y-1.5">
                    <Label htmlFor="cash-disposition" className="text-xs font-semibold">
                      Classificação comprovada
                    </Label>
                    <Select
                      value={cashDisposition || undefined}
                      onValueChange={(val) => {
                        setCashDisposition(val);
                        setTransferId("");
                      }}
                    >
                      <SelectTrigger id="cash-disposition" className="w-full h-9 rounded-lg">
                        <SelectValue placeholder="Selecione a classificação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INTERNAL_TRANSFER">
                          Movimento de uma transferência interna
                        </SelectItem>
                        <SelectItem value="STANDALONE_CASH">
                          Movimento avulso de dinheiro, conforme documento
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {cashDisposition === "INTERNAL_TRANSFER" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="cash-transfer" className="text-xs font-semibold">
                        Transferência correspondente
                      </Label>
                      <Select
                        value={transferId || undefined}
                        onValueChange={(val) => setTransferId(val)}
                      >
                        <SelectTrigger id="cash-transfer" className="w-full h-9 rounded-lg">
                          <SelectValue placeholder="Selecione a transferência conferida" />
                        </SelectTrigger>
                        <SelectContent>
                          {preview.snapshot.transfers.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>
                              {new Date(t.transferredAt).toLocaleDateString("pt-BR")} · {t.fromAccount.name} →{" "}
                              {t.toAccount.name} ({currency(t.amountInCents)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    A classificação preserva o valor original. Após a homologação, reabra a revisão da conta para conferir o saldo.
                  </p>
                </div>
              )}

              {/* Campos específicos de Fatura e Conta */}
              {(kind === "INVOICE" || kind === "ACCOUNT") && (
                <div className="space-y-2 rounded-xl border border-border/50 p-3.5 bg-background/50">
                  <Label htmlFor="review-opening" className="text-xs font-semibold">
                    {kind === "INVOICE"
                      ? "Valor pago antes da migração, em centavos (opcional)"
                      : "Saldo de abertura comprovado, em centavos (opcional)"}
                  </Label>
                  <Input
                    id="review-opening"
                    inputMode="numeric"
                    pattern="[0-9]{1,19}"
                    placeholder="Ex: 5000 (R$ 50,00)"
                    value={opening}
                    onChange={(e) => setOpening(e.target.value)}
                    className="h-9 rounded-lg"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Deixe em branco para manter o valor atual. A referência documental deve comprovar qualquer alteração. Este ajuste não cria novo recebimento.
                  </p>
                </div>
              )}

              {/* Exibição do Saldo Calculado Previsto */}
              {draftBalance !== null && (
                <div
                  className={cn(
                    "p-3 rounded-xl border text-xs font-medium flex items-center justify-between",
                    draftBalance < BigInt(0)
                      ? "border-destructive/30 bg-destructive/10 text-destructive"
                      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  )}
                >
                  <span>
                    {kind === "INVOICE"
                      ? "Saldo restante previsto após a decisão:"
                      : "Saldo da conta previsto após a decisão:"}
                  </span>
                  <span className="font-bold font-mono text-sm">
                    {currency(draftBalance.toString())}
                  </span>
                </div>
              )}

              {/* Campos Obrigatórios de Auditoria */}
              <div className="space-y-3.5 pt-2 border-t border-border/30">
                <div className="space-y-1.5">
                  <Label htmlFor="review-reason" className="text-xs font-semibold">
                    Justificativa Administrativa <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="review-reason"
                    minLength={10}
                    maxLength={2000}
                    placeholder="Descreva a motivação da revisão e os fatos contábeis apurados (mínimo 10 caracteres)..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="min-h-20 text-xs rounded-xl"
                    required
                  />
                  <p className="text-[10px] text-muted-foreground text-right">
                    {reason.length}/2000 caracteres
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="review-evidence" className="text-xs font-semibold">
                    Referência do Comprovante ou Relatório <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="review-evidence"
                    minLength={5}
                    maxLength={300}
                    placeholder="Ex: Extrato bancário de 10/2026, Doc #10492 ou protocolo do provedor"
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    className="h-9 rounded-lg text-xs"
                    required
                  />
                </div>

                <div className="flex items-start gap-2.5 pt-1">
                  <Checkbox
                    id="check-approved"
                    checked={approved}
                    onCheckedChange={(val) => setApproved(Boolean(val))}
                    className="mt-0.5"
                  />
                  <Label htmlFor="check-approved" className="text-xs leading-snug cursor-pointer font-medium">
                    Conferi os fatos contábeis e aprovo esta decisão administrativa como gestor autorizado.
                  </Label>
                </div>
              </div>

              {/* Ações do Modal */}
              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/30">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setTarget(null);
                    setPreview(null);
                  }}
                  className="rounded-xl h-9 text-xs"
                >
                  Cancelar
                </Button>

                <Button
                  type="submit"
                  disabled={
                    busy ||
                    !approved ||
                    duplicateOnly ||
                    Boolean(preview.blockers.length) ||
                    (draftBalance !== null && draftBalance < BigInt(0)) ||
                    reason.trim().length < 10 ||
                    evidence.trim().length < 5
                  }
                  className="rounded-xl h-9 text-xs font-semibold gap-1.5"
                >
                  {busy ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Registrando decisão...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-3.5" />
                      Registrar Revisão
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
