"use client";

import { GymPageHeader } from "@/components/application/gym-page";
import { GymTabsList } from "@/components/application/gym-tabs-list";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Users,
  FileText,
  DollarSign,
  Info,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";



interface PlanOption {
  id: string;
  name: string;
  priceInCents: number;
  billingPeriod: string;
}

interface PreviewRow {
  rowNumber: number;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  birthDate?: string;
  registrationNumber?: string;
  isMinor: boolean;
  hasGuardianData: boolean;
  guardianName?: string;
  guardianCpf?: string;
  guardianPhone?: string;
  guardianRelationship?: string;
  planName?: string;
  planId?: string;
  planPriceInCents?: number;
  startDate?: string;
  endDate?: string;
  openingDebitInCents: number;
  openingCreditInCents: number;
  status: "VALID" | "WARNING" | "INVALID";
  action: "NEW_STUDENT_AND_CONTRACT" | "LINK_EXISTING_STUDENT" | "SKIP_ALREADY_ACTIVE" | "INVALID";
  messages: string[];
}

interface ImportPreviewData {
  previewId: string;
  unitId: string;
  expiresAt: string;
  importBatchHash: string;
  totalRows: number;
  validRows: number;
  warningRows: number;
  invalidRows: number;
  totalNewStudents: number;
  totalExistingStudents: number;
  totalContracts: number;
  totalOpeningDebitInCents: number;
  totalOpeningCreditInCents: number;
  rows: PreviewRow[];
  securityNotice: string;
}

interface ImportCommitData {
  success: boolean;
  importBatchHash: string;
  alreadyCommitted?: boolean;
  message: string;
  totalProcessed: number;
  createdStudentsCount: number;
  linkedStudentsCount: number;
  createdEnrollmentsCount: number;
  createdInvoicesCount: number;
  totalOpeningDebitInCents: number;
  totalOpeningCreditInCents: number;
}

interface GymImportClientProps {
  workspaceId: string;
  plans: PlanOption[];
  units: { id: string; name: string }[];
}

export function GymImportClient({
  workspaceId,
  plans,
  units,
}: GymImportClientProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommitData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState<boolean>(false);
  const [overrideAmbiguities, setOverrideAmbiguities] = useState<boolean>(false);
  const [acceptLegacyBalances, setAcceptLegacyBalances] = useState(false);
  const [unitId, setUnitId] = useState(units.length === 1 ? units[0].id : "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  // 1. Download da planilha modelo oficial
  const handleDownloadTemplate = async () => {
    try {
      setIsDownloadingTemplate(true);
      const res = await fetch("/api/gym/import/template");
      if (!res.ok) {
        throw new Error("Não foi possível gerar a planilha modelo.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "modelo-importacao-academia.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Planilha modelo baixada com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao baixar planilha modelo.");
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // 2. Manipulação de upload de arquivo CSV
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.name.endsWith(".csv") && selected.type !== "text/csv") {
      toast.error("Por favor, selecione um arquivo em formato CSV (.csv).");
      return;
    }

    if (selected.size > 2 * 1024 * 1024) {
      toast.error("O arquivo excede o limite de 2 MB e 100 linhas por lote.");
      return;
    }

    setFile(selected);
    setPreview(null); setCommitResult(null); setOverrideAmbiguities(false); setAcceptLegacyBalances(false); setFileContent("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content !== "string") { toast.error("Não foi possível ler o arquivo."); return; }
      setFileContent(content);
    };
    reader.onerror = () => toast.error("Não foi possível ler o arquivo. Selecione-o novamente.");
    reader.readAsText(selected, "UTF-8");
  };

  // 3. Gerar prévia estruturada
  const handleGeneratePreview = async () => {
    if (!fileContent || !unitId) {
      toast.error("Selecione a unidade e um CSV antes de prosseguir.");
      return;
    }

    try {
      setIsPreviewLoading(true);
      const res = await fetch("/api/gym/import/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          csvContent: fileContent,
          unitId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falha ao gerar prévia da importação.");
      }

      setPreview(data.data);
      setOverrideAmbiguities(false); setAcceptLegacyBalances(false);
      toast.success(
        `Prévia processada com sucesso! ${data.data.validRows} linhas válidas identificadas.`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao processar prévia da importação.");
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // 4. Executar efetivação (Commit) do lote
  const handleCommitImport = async () => {
    if (!preview) return;

    try {
      setIsCommitting(true);
      const res = await fetch("/api/gym/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          importBatchHash: preview.importBatchHash,
          previewId: preview.previewId,
          unitId: preview.unitId,
          overrideAmbiguities,
          acceptLegacyBalances,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falha ao efetivar importação.");
      }

      setCommitResult(data.data);
      setIsConfirmDialogOpen(false);
      toast.success("Lote de importação efetivado com sucesso!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao concluir importação.");
    } finally {
      setIsCommitting(false);
    }
  };

  // 5. Reset do fluxo
  const handleReset = () => {
    setFile(null);
    setFileContent("");
    setPreview(null);
    setCommitResult(null);
    setActiveTab("ALL");
    setOverrideAmbiguities(false);
    setAcceptLegacyBalances(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Filtro de linhas
  const filteredRows = React.useMemo(() => {
    if (!preview) return [];
    if (activeTab === "ALL") return preview.rows;
    return preview.rows.filter((r) => r.status === activeTab);
  }, [preview, activeTab]);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Cabeçalho */}
      <GymPageHeader
        title={<>Importação Assistida</>}
        description={<>Confira os cadastros antes de importar. Novas matrículas aguardam aceite e ativação.</>}
        badge={<> <Badge variant="outline" className="border-border/50 text-[10px] text-muted-foreground font-medium">
              Migração
            </Badge> </>}
        actions={<> <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="default"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="cursor-pointer gap-1.5 font-medium"
          >
            {isDownloadingTemplate ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
            {isDownloadingTemplate ? "Baixando..." : "Baixar Planilha Modelo (.csv)"}
          </Button>
        </div> </>}
      />

      <div className="flex flex-col gap-2 sm:max-w-sm">
        <label htmlFor="import-unit" className="text-sm font-medium">Unidade</label>
        <NativeSelect id="import-unit" value={unitId} disabled={isPreviewLoading || isCommitting} onChange={event => { setUnitId(event.target.value); setPreview(null); setCommitResult(null); setOverrideAmbiguities(false); setAcceptLegacyBalances(false); }} className="w-full">
          <NativeSelectOption value="">Selecione a unidade</NativeSelectOption>
          {units.map(unit => <NativeSelectOption key={unit.id} value={unit.id}>{unit.name}</NativeSelectOption>)}
        </NativeSelect>
      </div>

      {/* CASO 1: SUCESSO DO COMMIT REALIZADO */}
      {commitResult && (
        <Card className="min-w-0 border-border/50">
          <CardHeader className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  {commitResult.alreadyCommitted
                    ? "Lote Já Efetivado Anteriormente (Idempotência)"
                    : "Importação Concluída com Sucesso"}
                </CardTitle>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">
                  Lote auditado SHA-256: <code className="text-[11px] font-mono">{commitResult.importBatchHash.slice(0, 16)}...</code>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-border/50 bg-background/40">
              <Check className="size-3.5 text-primary" />
              <AlertTitle className="text-xs font-semibold text-foreground">Reconciliação Auditada</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                {commitResult.message} Todos os dados foram gravados de forma transacional. Nenhuma cobrança em cartão foi criada automaticamente no gateway externo.
              </AlertDescription>
            </Alert>

            {/* Breakdown dos totais importados */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 min-w-0 [&>*]:min-w-0">
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Alunos Novos</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{commitResult.createdStudentsCount}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Alunos Vinculados</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{commitResult.linkedStudentsCount}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contratos Criados</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{commitResult.createdEnrollmentsCount}</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Faturas Abertura</p>
                <p className="text-xl font-bold text-foreground mt-0.5">{commitResult.createdInvoicesCount}</p>
              </div>
              
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Saldo Devedor</p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {formatCurrency(commitResult.totalOpeningDebitInCents)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
              <Button onClick={handleReset} variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs font-medium">
                <RefreshCw className="size-3.5" />
                Nova Importação
              </Button>
              <Button asChild size="sm" className="cursor-pointer gap-1.5 text-xs font-medium">
                <Link href="/gym/students">
                  Ver Alunos
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="cursor-pointer gap-1.5 text-xs font-medium">
                <Link href="/gym/finance">
                  Ver Caixa
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CASO 2: SKELETON ENQUANTO ANALISA PRÉVIA */}
      {isPreviewLoading && (
        <div className="space-y-4">
          <Card className="min-w-0 border border-border/50 bg-background/50">
            <CardHeader className="min-w-0 space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-72" />
            </CardHeader>
            <CardContent className="">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 min-w-0 [&>*]:min-w-0">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
            </CardContent>
          </Card>
          <div className="space-y-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </div>
        </div>
      )}

      {/* CASO 3: EXIBIÇÃO DA PRÉVIA CALCULADA */}
      {!commitResult && !isPreviewLoading && preview && (
        <div className="space-y-4">
          {/* Banner de Conformidade e Auditoria */}
          <Alert className="border-border/50 bg-background/50">
            <Info className="size-3.5 text-primary" />
            <AlertTitle className="text-xs font-semibold text-foreground">
              Prévia Gerada para Conferência · Lote {preview.importBatchHash.slice(0, 12)}...
            </AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground mt-0.5">
              {preview.securityNotice}
            </AlertDescription>
          </Alert>

          {/* Cards de Métricas da Prévia */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 min-w-0 [&>*]:min-w-0">
            <Card className="min-w-0 border-border/50 p-3.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Total de Linhas</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">{preview.totalRows}</p>
              <p className="text-[11px] text-muted-foreground">Planilha enviada</p>
            </Card>

            <Card className="min-w-0 border-border/50 p-3.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Válidas</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                {preview.validRows}
              </p>
              <p className="text-[11px] text-muted-foreground">Sem pendências</p>
            </Card>

            <Card className="min-w-0 border-border/50 p-3.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Com Alerta</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                {preview.warningRows}
              </p>
              <p className="text-[11px] text-muted-foreground">Menores / Vínculos</p>
            </Card>

            <Card className="min-w-0 border-border/50 p-3.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Inválidas</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                {preview.invalidRows}
              </p>
              <p className="text-[11px] text-muted-foreground">Ignoradas no lote</p>
            </Card>

            <Card className="min-w-0 border-border/50 p-3.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Contratos</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">{preview.totalContracts}</p>
              <p className="text-[11px] text-muted-foreground">{preview.totalNewStudents} alunos novos</p>
            </Card>

            <Card className="min-w-0 border-border/50 p-3.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Saldo Devedor</p>
              <p className="text-xl font-bold tracking-tight text-foreground mt-0.5">
                {formatCurrency(preview.totalOpeningDebitInCents)}
              </p>
              <p className="text-[11px] text-muted-foreground">Controle interno</p>
            </Card>
          </div>

          {/* Opções e Filtros */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0 sm:w-auto sm:flex-1">
              <GymTabsList className="">
                <TabsTrigger value="ALL" className="text-xs">Todas ({preview.totalRows})</TabsTrigger>
                <TabsTrigger value="VALID" className="text-xs">
                  Válidas ({preview.validRows})
                </TabsTrigger>
                <TabsTrigger value="WARNING" className="text-xs">
                  Alertas ({preview.warningRows})
                </TabsTrigger>
                <TabsTrigger value="INVALID" className="text-xs">
                  Inválidas ({preview.invalidRows})
                </TabsTrigger>
              </GymTabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="cursor-pointer text-xs font-medium">
                Descartar Prévia
              </Button>

              <Button
                size="sm"
                onClick={() => setIsConfirmDialogOpen(true)}
                disabled={preview.invalidRows > 0 || (preview.validRows === 0 && preview.warningRows === 0)}
                className="cursor-pointer gap-1.5 text-xs font-medium"
              >
                <CheckCircle2 className="size-3.5" />
                Efetivar Lote ({preview.validRows + preview.warningRows})
              </Button>
            </div>
          </div>

          {/* Tabela de Linhas Analisadas */}
          <Card className="min-w-0 border-border/50">
            <CardHeader className="min-w-0">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5 font-bold">
                <FileSpreadsheet className="size-3.5 text-primary" />
                Detalhamento dos Registros da Planilha
              </CardTitle>
              <CardDescription className="text-sm">
                Verifique os status, planos reconhecidos, identificação de menores e saldos antes da efetivação final.
              </CardDescription>
            </CardHeader>
            <div className="border-t border-border/50 overflow-x-auto max-h-[460px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 hover:bg-transparent">
                    <TableHead className="w-10 text-xs">#</TableHead>
                    <TableHead className="text-xs">Nome Completo</TableHead>
                    <TableHead className="text-xs">CPF / E-mail</TableHead>
                    <TableHead className="text-xs">Faixa Etária</TableHead>
                    <TableHead className="text-xs">Plano Reconhecido</TableHead>
                    <TableHead className="text-right text-xs">Saldo Devedor</TableHead>
                    <TableHead className="text-xs">Ação Prevista</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-6 text-xs text-muted-foreground">
                        Nenhum registro encontrado para este filtro.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRows.map((r) => (
                      <TableRow key={r.rowNumber} className="border-border/40">
                        <TableCell className="font-mono text-xs text-muted-foreground">{r.rowNumber}</TableCell>
                        <TableCell className="font-medium text-xs">
                          {r.name}
                          {r.registrationNumber && (
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              Matrícula: {r.registrationNumber}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div>{r.cpf || "—"}</div>
                          <div className="text-muted-foreground truncate max-w-[140px] text-[11px]">{r.email || "—"}</div>
                        </TableCell>
                        <TableCell>
                          {r.isMinor ? (
                            <Badge variant="outline" className="border-border/50 text-[10px]">
                              Menor {r.hasGuardianData ? "(Com Resp.)" : "(Sem Resp.)"}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Maior</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.planName ? (
                            <div>
                              <span className="font-medium">{r.planName}</span>
                              {r.planPriceInCents ? (
                                <span className="text-muted-foreground block text-[11px]">
                                  {formatCurrency(r.planPriceInCents)}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">Sem plano</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono font-medium">
                          {r.openingDebitInCents > 0 ? (
                            <span>{formatCurrency(r.openingDebitInCents)}</span>
                          ) : (
                            <span className="text-muted-foreground">R$ 0,00</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.action === "NEW_STUDENT_AND_CONTRACT" && (
                            <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/10 text-primary">Novo Aluno + Plano</Badge>
                          )}
                          {r.action === "LINK_EXISTING_STUDENT" && (
                            <Badge variant="outline" className="text-[10px] border-border/50 text-foreground">Vincular Existente</Badge>
                          )}
                          {r.action === "SKIP_ALREADY_ACTIVE" && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground border-border/50">Ignorar (Ativo)</Badge>
                          )}
                          {r.action === "INVALID" && (
                            <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">Inválido</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {r.status === "VALID" && (
                            <Badge variant="outline" className="text-[10px] border-primary/20 bg-primary/10 text-primary">
                              Válido
                            </Badge>
                          )}
                          {r.status === "WARNING" && (
                            <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                              Alerta
                            </Badge>
                          )}
                          {r.status === "INVALID" && (
                            <Badge variant="outline" className="text-[10px] border-border/50 text-muted-foreground">
                              Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                          {r.messages && r.messages.length > 0 ? (
                            <ul className="list-disc list-inside space-y-0.5">
                              {r.messages.map((m, idx) => (
                                <li key={idx} className="truncate text-[11px]" title={m}>
                                  {m}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      )}

      {/* CASO 4: TELA INICIAL DE UPLOAD E ORIENTAÇÕES */}
      {!commitResult && !isPreviewLoading && !preview && (
        <div className="grid gap-4 lg:grid-cols-3 min-w-0 [&>*]:min-w-0">
          {/* Zona de Upload */}
          <Card className="min-w-0 lg:col-span-2 border-border/50">
            <CardHeader className="min-w-0">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5 font-bold">
                <UploadCloud className="size-3.5 text-primary" />
                Carregar Planilha CSV
              </CardTitle>
              <CardDescription className="text-sm">
                Selecione ou arraste o arquivo CSV da sua base antiga para prévia e reconciliação assistida.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">


              {/* Área de Seleção de Arquivo */}
              <div
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/70 hover:border-primary/50 bg-muted/10 p-8 text-center transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-2.5">
                  <FileSpreadsheet className="size-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">
                  {file ? file.name : "Clique para selecionar o arquivo CSV"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {file
                    ? `${(file.size / 1024).toFixed(1)} KB selecionados`
                    : "CSV: vírgula ou ponto-e-vírgula; até 2 MB e 100 linhas"}
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Botão de Análise / Prévia */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                  disabled={isDownloadingTemplate}
                  className="cursor-pointer gap-1.5 text-xs font-medium"
                >
                  <Download className="size-3.5" />
                  Modelo de Exemplo
                </Button>

                <Button
                  size="sm"
                  onClick={handleGeneratePreview}
                  disabled={!fileContent || !unitId || isPreviewLoading}
                  className="cursor-pointer gap-1.5 text-xs font-medium"
                >
                  {isPreviewLoading ? <Spinner className="size-3.5" /> : <UploadCloud className="size-3.5" />}
                  {isPreviewLoading ? "Processando..." : "Analisar e Gerar Prévia"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Painel de Diretrizes e Regras */}
          <div className="space-y-4">
            <Card className="min-w-0 border-border/50">
              <CardHeader className="min-w-0">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="size-3.5 text-primary" />
                  Regras & Salvaguardas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-xs text-muted-foreground">
                <div className="flex gap-2">
                  <div className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-foreground">Saldos de Abertura:</strong> Saldos devedores geram faturas locais para controle interno de caixa da recepção. <em>Nenhuma cobrança automática em gateway será efetuada.</em>
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-foreground">Menores:</strong> Exigem dados completos do responsável. O acesso ao portal ocorre pelo responsável; a importação não verifica representação nem cria conta própria ativa.
                  </p>
                </div>

                <div className="flex gap-2">
                  <div className="size-1 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p>
                    <strong className="text-foreground">Deduplicação:</strong> Checagem cruzada por CPF, E-mail e Matrícula Legada para evitar registros duplicados.
                  </p>
                </div>


              </CardContent>
            </Card>

            <Card className="min-w-0 border-border/50">
              <CardHeader className="min-w-0">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5 font-bold">
                  <FileText className="size-3.5 text-primary" />
                  Planos Cadastrados ({plans.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-1.5">
                {plans.length === 0 ? (
                  <p className="text-muted-foreground italic py-2 text-center">Nenhum plano ativo cadastrado.</p>
                ) : (
                  plans.slice(0, 5).map((p) => (
                    <div key={p.id} className="flex justify-between items-center py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium text-foreground truncate max-w-[130px]">{p.name}</span>
                      <span className="text-muted-foreground text-[11px] font-mono">{formatCurrency(p.priceInCents)}</span>
                    </div>
                  ))
                )}
                {plans.length > 5 && (
                  <p className="text-[11px] text-muted-foreground pt-1">+{plans.length - 5} outros planos ativos</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Modal AlertDialog de Confirmação do Commit */}
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent className="border border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Confirmar Efetivação do Lote de Importação?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-2 text-xs text-muted-foreground">
              <p>
                Você está prestes a gravar definitivamente <strong>{(preview?.validRows || 0) + (preview?.warningRows || 0)} registros</strong> no banco de dados da academia.
              </p>
              <div className="rounded-md border border-border/50 bg-background/50 p-3 space-y-1.5 text-foreground text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alunos Novos / Vínculos:</span>
                  <strong>{preview?.totalNewStudents || 0} novos</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contratos & Matrículas:</span>
                  <strong>{preview?.totalContracts || 0}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo Devedor de Abertura:</span>
                  <strong>{formatCurrency(preview?.totalOpeningDebitInCents || 0)}</strong>
                </div>
              </div>
              <p className="text-[11px]">
                Esta ação é transacional e auditada. Faturas de abertura são exclusivamente locais e não debitam cartões automaticamente.
              </p>

              {preview?.warningRows && preview.warningRows > 0 ? (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="override-ambiguities"
                    checked={overrideAmbiguities}
                    onCheckedChange={(checked) => setOverrideAmbiguities(!!checked)}
                  />
                  <label
                    htmlFor="override-ambiguities"
                    className="text-xs font-medium text-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Confirmar inclusão das {preview.warningRows} linhas com alertas
                  </label>
                </div>
              ) : null}
              {preview && (preview.totalOpeningDebitInCents > 0 || preview.totalOpeningCreditInCents > 0) ? (
                <div className="flex items-start gap-2 pt-2">
                  <Checkbox id="accept-legacy-balances" checked={acceptLegacyBalances} onCheckedChange={value => setAcceptLegacyBalances(value === true)} />
                  <label htmlFor="accept-legacy-balances" className="text-sm">Confirmo os saldos históricos, sem baixa, crédito em caixa ou pagamento fictício. Esta operação exige alçada financeira.</label>
                </div>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCommitting} className="cursor-pointer text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCommitImport();
              }}
              disabled={isCommitting || !preview || preview.invalidRows > 0 || (preview.warningRows > 0 && !overrideAmbiguities) || ((preview.totalOpeningDebitInCents > 0 || preview.totalOpeningCreditInCents > 0) && !acceptLegacyBalances)}
              className="cursor-pointer gap-1.5 text-xs font-medium"
            >
              {isCommitting ? <Spinner className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
              {isCommitting ? "Efetivando lote..." : "Confirmar e Gravar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
