"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileText,
  ImageIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  Edit2,
  ShieldCheck,
  ChevronRight,
  Info,
  FileSpreadsheet,
  FileCode,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { workspaceStore } from "@/stores/workspace.store";
import { useSnapshot } from "valtio";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Step = "UPLOAD" | "PROCESSING" | "RESULT" | "REVIEW" | "IMPORTING" | "COMPLETED";

interface SourceItem {
  id?: string;
  file?: File;
  name: string;
  type: "PDF" | "IMAGE" | "TEXT" | "SPREADSHEET";
  size?: number;
  previewUrl?: string;
}

export default function MigrateClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;

  const [step, setStep] = useState<Step>("UPLOAD");
  const [jobId, setJobId] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>("mfit");
  const [inputMode, setInputMode] = useState<"files" | "text">("files");

  // Input sources
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [rawText, setRawText] = useState<string>("");

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>("PARSING");
  const [jobSummary, setJobSummary] = useState<any>(null);

  // Review state
  const [reviewTab, setReviewTab] = useState<string>("ALL");
  const [records, setRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState<boolean>(false);

  // Edit Card Modal
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Preview & Confirm state
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [commitPreview, setCommitPreview] = useState<any | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState<boolean>(false);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  const [previewingFile, setPreviewingFile] = useState<SourceItem | null>(null);

  const [quotaBalance, setQuotaBalance] = useState<{
    allowed: boolean;
    source: string;
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

  useEffect(() => {
    fetchQuotaBalance();
  }, [fetchQuotaBalance]);


  useEffect(() => {
    const existingJobId = searchParams.get("jobId");
    if (existingJobId) {
      setJobId(existingJobId);
      fetchJobDetails(existingJobId);
    }
  }, [searchParams]);

  const fetchJobDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/personal/migration/${id}`);
      if (res.ok) {
        const data = await res.json();
        setJobSummary(data);

        if (data.status === "REVIEW") {
          setStep("REVIEW");
          loadRecords(id, "ALL");
        } else if (data.status === "PROCESSING") {
          setStep("PROCESSING");
          pollJobStatus(id);
        } else if (data.status === "COMPLETED") {
          setStep("COMPLETED");
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadRecords = async (id: string, tab: string) => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch(`/api/personal/migration/${id}/records?tab=${tab}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      toast.error("Erro ao carregar registros para revisão.");
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const pollJobStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/personal/migration/${id}`);
        if (res.ok) {
          const data = await res.json();
          setJobSummary(data);
          setProcessingStep(data.processingStep || "PARSING");

          if (data.status === "REVIEW") {
            clearInterval(interval);
            setIsProcessing(false);
            setStep("RESULT");
            toast.success("Processamento de dados concluído.");
          } else if (data.status === "FAILED") {
            clearInterval(interval);
            setIsProcessing(false);
            setStep("UPLOAD");
            toast.error(data.safeErrorMessage || "Falha no processamento. Tente novamente.");
          }
        }
      } catch (err) {
        clearInterval(interval);
        setIsProcessing(false);
      }
    }, 3000);
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (ext === ".xls") {
        toast.error(`O formato .xls (${file.name}) é legado. Converta para .xlsx ou .csv.`);
        continue;
      }

      let type: "PDF" | "IMAGE" | "SPREADSHEET" = "IMAGE";
      if (ext === ".pdf") type = "PDF";
      if (ext === ".csv" || ext === ".xlsx") type = "SPREADSHEET";

      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

      setSources((prev) => [
        ...prev,
        {
          file,
          name: file.name,
          type,
          size: file.size,
          previewUrl,
        },
      ]);
    }
  };

  const removeSource = (index: number) => {
    setSources((prev) => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const startMigrationProcess = async () => {
    if (!workspaceId) {
      toast.error("Nenhum workspace ativo selecionado.");
      return;
    }

    if (sources.length === 0 && !rawText.trim()) {
      toast.error("Selecione pelo menos um arquivo ou cole um texto.");
      return;
    }

    setIsProcessing(true);
    setStep("PROCESSING");

    try {
      const createRes = await fetch("/api/personal/migration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, sourcePlatform: platform }),
      });

      if (createRes.status === 402) {
        const errData = await createRes.json();
        setIsProcessing(false);
        setStep("UPLOAD");
        toast.error("Limite de importações atingido. Adquira créditos para continuar.", {
          action: { label: "Ver Créditos", onClick: () => router.push("/personal/credits") },
        });
        return;
      }

      if (!createRes.ok) throw new Error("Falha ao iniciar importação.");
      const job = await createRes.json();
      setJobId(job.id);
      if (job.quota) setQuotaBalance(job.quota);

      const formData = new FormData();
      if (inputMode === "text" && rawText.trim()) {
        formData.append("text", rawText);
        formData.append("type", "TEXT");
      } else {
        sources.forEach((s) => {
          if (s.file) formData.append("file", s.file);
        });
        formData.append("type", "MIXED");
      }

      const uploadRes = await fetch(`/api/personal/migration/${job.id}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errMsg = await uploadRes.text();
        throw new Error(errMsg || "Falha ao enviar arquivos.");
      }

      const processRes = await fetch(`/api/personal/migration/${job.id}/process`, {
        method: "POST",
      });

      if (!processRes.ok) {
        const errData = await processRes.json().catch(async () => ({ error: await processRes.text() }));
        throw new Error(errData.error || "Falha ao processar arquivos.");
      }

      pollJobStatus(job.id);
    } catch (err: any) {
      setIsProcessing(false);
      setStep("UPLOAD");
      toast.error(err.message || "Erro no processamento da importação.");
    }
  };

  const handleOpenEditModal = (record: any) => {
    setEditingRecord(record);
    setEditFormData(JSON.parse(JSON.stringify(record.normalizedData || {})));
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !jobId) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/records/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ normalizedData: editFormData }),
      });

      if (!res.ok) throw new Error("Falha ao salvar edições.");

      toast.success("Edições salvas.");
      setEditingRecord(null);
      loadRecords(jobId, reviewTab);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar alterações.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleOpenConfirmation = async () => {
    if (!jobId) return;

    setIsGeneratingPreview(true);
    try {
      const res = await fetch(`/api/personal/migration/${jobId}/preview`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Falha ao preparar resumo final.");
      const preview = await res.json();
      setCommitPreview(preview);
      setShowConfirmDialog(true);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar confirmação.");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  const executeFinalCommit = async () => {
    if (!jobId || !commitPreview) return;

    setIsCommitting(true);
    setStep("IMPORTING");
    setShowConfirmDialog(false);

    try {
      const res = await fetch(`/api/personal/migration/${jobId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commitVersion: commitPreview.commitVersion,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Falha ao finalizar importação.");
      }

      setStep("COMPLETED");
      toast.success("Importação concluída.");
    } catch (err: any) {
      setStep("REVIEW");
      toast.error(err.message || "Erro ao importar registros.");
    } finally {
      setIsCommitting(false);
    }
  };

  const getStepIndex = (s: Step) => {
    switch (s) {
      case "UPLOAD": return 1;
      case "PROCESSING": return 2;
      case "RESULT": return 3;
      case "REVIEW": return 3;
      case "IMPORTING": return 4;
      case "COMPLETED": return 4;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 mx-auto font-sans">
      {/* Header Corporativo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => router.push("/personal/clients")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Importação de Alunos</h1>
              <Badge variant="secondary" className="text-[10px] uppercase tracking-wider font-semibold">
                Lote
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Traga alunos, treinos e avaliações de outros sistemas por planilhas, PDFs ou fotos.
            </p>
          </div>
        </div>

        {/* Stepper Minimalista */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground border border-border/60 rounded-lg p-1 bg-card/40">
          {[
            { label: "1. Arquivos", idx: 1 },
            { label: "2. Processamento", idx: 2 },
            { label: "3. Revisão", idx: 3 },
            { label: "4. Concluído", idx: 4 },
          ].map((st) => {
            const currentIdx = getStepIndex(step);
            const isActive = currentIdx === st.idx;
            const isDone = currentIdx > st.idx;

            return (
              <div
                key={st.idx}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${isActive
                    ? "bg-primary text-primary-foreground font-semibold"
                    : isDone
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground"
                  }`}
              >
                {st.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 1: UPLOAD WORKSPACE */}
      {step === "UPLOAD" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          {/* Banner de Saldo de Importação */}
          {isLoadingQuota ? (
            <Skeleton className="h-14 w-full rounded-2xl" />
          ) : quotaBalance && !quotaBalance.allowed ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-destructive/30 bg-destructive/5">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-destructive">Limite de importações atingido</p>
                <p className="text-xs text-muted-foreground">Você não possui créditos disponíveis. Adquira um pacote para continuar importando.</p>
              </div>
              <Link href="/personal/credits">
                <Button size="sm" className="h-9 rounded-xl font-bold shrink-0 gap-2">
                  Comprar Créditos
                </Button>
              </Link>
            </div>
          ) : quotaBalance ? (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-border/40 bg-card/50">
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground font-medium">
                  Franquia mensal:
                  <span className="font-black text-foreground ml-1">
                    {Math.max(0, quotaBalance.quotaTotal - quotaBalance.quotaUsed)}/{quotaBalance.quotaTotal}
                  </span>
                </div>
                <div className="w-px h-4 bg-border/60" />
                <div className="text-xs text-muted-foreground font-medium">
                  Créditos avulsos:
                  <span className="font-black text-primary ml-1">{quotaBalance.credits}</span>
                </div>
              </div>
              <Link href="/personal/credits" className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline">
                Comprar mais
              </Link>
            </div>
          ) : null}
          {/* Card Principal de Upload */}
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-4 border-b border-border/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Enviar Arquivos de Origem</CardTitle>
                  <CardDescription className="text-xs">
                    Aceitamos planilhas (CSV, XLSX), relatórios (PDF) ou capturas de tela (JPG, PNG).
                  </CardDescription>
                </div>

                {/* Origem Opcional Compacta */}
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Origem:</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="h-8 text-xs w-[140px]">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mfit" className="text-xs">MFit Personal</SelectItem>
                      <SelectItem value="tecnofit" className="text-xs">Tecnofit</SelectItem>
                      <SelectItem value="planilha" className="text-xs">Planilha Própria</SelectItem>
                      <SelectItem value="outro" className="text-xs">Outro Sistema</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-5">
              {/* Alternador de Modo: Arquivos vs Texto */}
              <div className="flex items-center gap-2 border-b border-border/40 pb-3">
                <Button
                  variant={inputMode === "files" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setInputMode("files")}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Arquivos
                </Button>
                <Button
                  variant={inputMode === "text" ? "secondary" : "ghost"}
                  size="sm"
                  className="text-xs h-8"
                  onClick={() => setInputMode("text")}
                >
                  <FileCode className="h-3.5 w-3.5 mr-1.5" /> Texto Bruto
                </Button>
              </div>

              {inputMode === "files" ? (
                <div className="space-y-4">
                  {/* Dropzone Elegante */}
                  <div className="border border-dashed border-border/80 hover:border-foreground/30 rounded-xl p-6 text-center bg-muted/10 transition-colors cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".csv, .xlsx, .pdf, image/jpeg, image/png, image/webp"
                      multiple
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      onChange={handleFileUpload}
                    />
                    <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2 group-hover:text-foreground transition-colors" />
                    <p className="text-xs font-semibold text-foreground">
                      Clique para selecionar ou arraste arquivos aqui
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      CSV, XLSX, PDF, PNG ou JPG (máx. 15MB por arquivo)
                    </p>
                  </div>

                  {/* Lista de Arquivos Selecionados */}
                  {sources.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                        <span>{sources.length} arquivo(s) selecionado(s)</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[11px] text-destructive" onClick={() => setSources([])}>
                          Remover todos
                        </Button>
                      </div>

                      <div className="divide-y divide-border/40 border border-border/60 rounded-lg overflow-hidden bg-card">
                        {sources.map((src, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                            <div className="flex items-center gap-2.5 truncate max-w-[320px]">
                              {src.previewUrl ? (
                                <img
                                  src={src.previewUrl}
                                  alt={src.name}
                                  className="h-9 w-9 object-cover rounded-md border border-border/60 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => setPreviewingFile(src)}
                                />
                              ) : (
                                <div
                                  className="h-9 w-9 rounded-md border border-border/60 flex items-center justify-center bg-muted/40 shrink-0 cursor-pointer hover:bg-muted/60 transition-colors"
                                  onClick={() => setPreviewingFile(src)}
                                >
                                  {src.type === "SPREADSHEET" ? (
                                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                                  ) : src.type === "PDF" ? (
                                    <FileText className="h-4 w-4 text-rose-500" />
                                  ) : (
                                    <ImageIcon className="h-4 w-4 text-blue-500" />
                                  )}
                                </div>
                              )}
                              <div className="truncate">
                                <span
                                  className="font-medium text-foreground truncate block hover:underline cursor-pointer"
                                  onClick={() => setPreviewingFile(src)}
                                >
                                  {src.name}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  {src.size ? `${(src.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                                onClick={() => setPreviewingFile(src)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> Visualizar
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSource(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Cole aqui o texto contendo contatos, fichas ou observações de alunos..."
                    rows={6}
                    className="font-mono text-xs"
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    O sistema identificará nomes, contatos e exercícios presentes no texto.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botão de Ação */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Nenhum registro será criado sem sua confirmação final.
            </span>
            <Button
              className="gap-2 font-medium"
              disabled={sources.length === 0 && !rawText.trim()}
              onClick={startMigrationProcess}
            >
              <span>Processar Arquivos</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* STEP 2: PROCESSING */}
      {step === "PROCESSING" && (
        <Card className="py-14 text-center border-border/80 shadow-xs">
          <CardContent className="space-y-5 max-w-md mx-auto">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
            <div>
              <h2 className="text-base font-bold text-foreground">Lendo e estruturando dados...</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Aguarde enquanto organizamos os alunos, treinos e avaliações dos seus arquivos.
              </p>
            </div>

            <div className="border border-border/60 rounded-lg p-3 text-left space-y-2 bg-muted/20 text-xs">
              <div className="flex items-center justify-between">
                <span>Leitura dos arquivos</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="flex items-center justify-between">
                <span>Mapeamento de colunas</span>
                {processingStep === "PARSING" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                )}
              </div>
              <div className="flex items-center justify-between">
                <span>Estruturação dos registros</span>
                {processingStep === "EXTRACTING" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : processingStep === "NORMALIZING" || processingStep === "MATCHING" || processingStep === "PREPARING_REVIEW" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: RESULT SUMMARY */}
      {step === "RESULT" && jobSummary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          <Card className="border-border/80 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold">Resumo dos Dados Identificados</CardTitle>
              <CardDescription className="text-xs">
                Confira a contagem de elementos extraídos antes de abrir a central de revisão.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                  <div className="text-2xl font-bold text-foreground">{jobSummary.totalStudents}</div>
                  <div className="text-xs text-muted-foreground font-medium">Alunos</div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                  <div className="text-2xl font-bold text-foreground">{jobSummary.totalWorkouts}</div>
                  <div className="text-xs text-muted-foreground font-medium">Treinos</div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                  <div className="text-2xl font-bold text-foreground">{jobSummary.totalExercises}</div>
                  <div className="text-xs text-muted-foreground font-medium">Exercícios</div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                  <div className="text-2xl font-bold text-foreground">{jobSummary.totalAssessments}</div>
                  <div className="text-xs text-muted-foreground font-medium">Avaliações</div>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg border border-border/60">
                  <div className="text-2xl font-bold text-foreground">{jobSummary.totalMeasurements}</div>
                  <div className="text-xs text-muted-foreground font-medium">Medidas</div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  className="gap-2 font-medium"
                  onClick={() => {
                    setStep("REVIEW");
                    if (jobId) loadRecords(jobId, "ALL");
                  }}
                >
                  <span>Revisar Registros</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* STEP 4: REVIEW CARDS */}
      {step === "REVIEW" && (
        <div className="space-y-5">
          {/* Navegação de Filtros */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-card p-1.5 rounded-lg border border-border/80">
            <Tabs
              value={reviewTab}
              onValueChange={(val) => {
                setReviewTab(val);
                if (jobId) loadRecords(jobId, val);
              }}
              className="w-full sm:w-auto"
            >
              <TabsList className="h-8 bg-transparent p-0 gap-1">
                <TabsTrigger value="ALL" className="text-xs h-7">Todos</TabsTrigger>
                <TabsTrigger value="STUDENTS" className="text-xs h-7">Alunos</TabsTrigger>
                <TabsTrigger value="WORKOUTS" className="text-xs h-7">Treinos</TabsTrigger>
                <TabsTrigger value="ASSESSMENTS" className="text-xs h-7">Avaliações</TabsTrigger>
                <TabsTrigger value="MEASUREMENTS" className="text-xs h-7">Medidas</TabsTrigger>
                <TabsTrigger value="ATTENTION" className="text-xs h-7 text-amber-600 gap-1">
                  <AlertTriangle className="h-3 w-3" /> Atenção
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              className="w-full sm:w-auto gap-2 font-medium h-8 text-xs"
              disabled={isGeneratingPreview}
              onClick={handleOpenConfirmation}
            >
              {isGeneratingPreview ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Finalizar Importação
            </Button>
          </div>

          {/* Grid de Cards */}
          {isLoadingRecords ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Skeleton className="h-36 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </div>
          ) : records.length === 0 ? (
            <Card className="py-12 text-center border-dashed">
              <CardContent className="space-y-1">
                <Info className="h-8 w-8 text-muted-foreground mx-auto mb-1" />
                <p className="font-semibold text-sm">Nenhum registro nesta categoria</p>
                <p className="text-xs text-muted-foreground">Selecione "Todos" para visualizar os demais itens.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {records.map((rec) => {
                const norm = rec.normalizedData || {};
                const isStudent = rec.entityType === "STUDENT";
                const isWorkout = rec.entityType === "WORKOUT";
                const isDuplicate = rec.deduplicationMatch && rec.deduplicationMatch !== "NO_MATCH";

                return (
                  <Card
                    key={rec.id}
                    className={`border transition-colors ${rec.reviewStatus === "PENDING" || isDuplicate
                        ? "border-amber-500/40 bg-amber-500/5"
                        : "border-border/80"
                      }`}
                  >
                    <CardHeader className="pb-2.5 pt-3.5 border-b border-border/40">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="text-[10px] font-mono uppercase mb-1">
                            {rec.entityType}
                          </Badge>
                          <CardTitle className="text-sm font-bold">
                            {isStudent ? norm.name || "Aluno Sem Nome" : isWorkout ? norm.name || "Treino" : "Registro"}
                          </CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs px-2"
                          onClick={() => handleOpenEditModal(rec)}
                        >
                          <Edit2 className="h-3 w-3 mr-1" /> Editar
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="pt-3 pb-3 space-y-2 text-xs">
                      {isStudent && (
                        <div className="space-y-1 text-muted-foreground">
                          <div>E-mail: <span className="text-foreground font-medium">{norm.email || "não informado"}</span></div>
                          <div>WhatsApp: <span className="text-foreground font-medium">{norm.phone || "não informado"}</span></div>
                          <div>Objetivo: <span className="text-foreground font-medium">{norm.objective || "não informado"}</span></div>

                          {isDuplicate && (
                            <div className="mt-2 p-2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11px] font-medium flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>Aluno já cadastrado no workspace.</span>
                            </div>
                          )}
                        </div>
                      )}

                      {isWorkout && norm.exercises && (
                        <div className="space-y-1.5">
                          <div className="text-muted-foreground font-medium">
                            Exercícios ({norm.exercises.length})
                          </div>
                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                            {norm.exercises.map((ex: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-muted/30 border border-border/40 text-[11px]">
                                <span className="font-medium truncate max-w-[180px]">{ex.name || "Exercício"}</span>
                                <span className="text-muted-foreground">
                                  {ex.sets || 3}x {ex.reps || "10-12"} • {ex.load ? `${ex.load}kg` : "sem carga"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOG */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Confirmar Importação de Dados</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3 pt-1 text-xs text-foreground">
              {commitPreview && (
                <div className="space-y-1.5 bg-muted/40 p-3 rounded-md border text-xs">
                  <div className="flex justify-between">
                    <span>Novos alunos:</span>
                    <span className="font-semibold text-foreground">{commitPreview.newStudentsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Alunos a atualizar:</span>
                    <span className="font-semibold text-foreground">{commitPreview.updateStudentsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Treinos vinculados:</span>
                    <span className="font-semibold text-foreground">{commitPreview.workoutsCount}</span>
                  </div>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Os alunos e fichas serão cadastrados diretamente no seu workspace ativo.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCommitting} className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs font-semibold"
              disabled={isCommitting}
              onClick={executeFinalCommit}
            >
              {isCommitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Confirmar Importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* STEP 5: COMPLETED */}
      {step === "COMPLETED" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card className="py-12 text-center max-w-md mx-auto border-border/80">
            <CardContent className="space-y-4">
              <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
              <div>
                <h2 className="text-lg font-bold text-foreground">Importação Concluída</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Seus alunos e treinos foram cadastrados com sucesso.
                </p>
              </div>
              <div className="pt-2">
                <Button size="sm" className="font-medium" onClick={() => router.push("/personal/clients")}>
                  Ver Alunos Importados
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* EDIT MODAL */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Editar Registro</DialogTitle>
            <DialogDescription className="text-xs">
              Ajuste as informações extraídas antes de salvar no sistema.
            </DialogDescription>
          </DialogHeader>

          {editingRecord && (
            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Nome / Título</Label>
                <Input
                  value={editFormData.name || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              {editingRecord.entityType === "STUDENT" && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">E-mail</Label>
                      <Input
                        value={editFormData.email || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                        value={editFormData.phone || ""}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Objetivo</Label>
                    <Input
                      value={editFormData.objective || ""}
                      onChange={(e) => setEditFormData({ ...editFormData, objective: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditingRecord(null)}>Cancelar</Button>
            <Button disabled={isSavingEdit} size="sm" className="h-8 text-xs font-semibold" onClick={handleSaveEdit}>
              {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* COMPACT FILE PREVIEW DIALOG */}
      <Dialog open={!!previewingFile} onOpenChange={(open) => !open && setPreviewingFile(null)}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="pb-2 border-b border-border/40">
            <DialogTitle className="text-sm font-semibold truncate pr-4">
              {previewingFile?.name}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Pré-visualização do arquivo selecionado ({previewingFile?.type})
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex items-center justify-center bg-muted/20 rounded-lg border border-border/40 max-h-[360px] overflow-hidden">
            {previewingFile?.type === "IMAGE" && previewingFile.previewUrl ? (
              <img
                src={previewingFile.previewUrl}
                alt={previewingFile.name}
                className="max-h-[320px] w-auto object-contain rounded-md shadow-xs"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                {previewingFile?.type === "SPREADSHEET" ? (
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600 mx-auto" />
                ) : (
                  <FileText className="h-10 w-10 text-rose-500 mx-auto" />
                )}
                <p className="text-xs font-medium text-foreground truncate max-w-[260px] mx-auto">
                  {previewingFile?.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {previewingFile?.size ? `${(previewingFile.size / (1024 * 1024)).toFixed(1)} MB` : ""} • Pronto para importação
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPreviewingFile(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
