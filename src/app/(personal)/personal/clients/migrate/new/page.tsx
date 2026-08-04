"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Upload,
  FileText,
  ImageIcon,
  Trash2,
  Eye,
  Zap,
  Sparkles,
  FileSpreadsheet,
  FileCode,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { workspaceStore } from "@/stores/workspace.store";
import { useSnapshot } from "valtio";
import Link from "next/link";
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

interface SourceItem {
  file?: File;
  name: string;
  type: "PDF" | "IMAGE" | "TEXT" | "SPREADSHEET";
  size?: number;
  previewUrl?: string;
}

export default function NewMigrationPage() {
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const workspaceId = workspaceSnap.activeWorkspaceId;

  const [platform, setPlatform] = useState<string>("mfit");
  const [inputMode, setInputMode] = useState<"files" | "text">("files");

  const [sources, setSources] = useState<SourceItem[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [previewingFile, setPreviewingFile] = useState<SourceItem | null>(null);

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

  useEffect(() => {
    fetchQuotaBalance();
  }, [fetchQuotaBalance]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);

    const newSources: SourceItem[] = filesArray.map((file) => {
      let type: SourceItem["type"] = "TEXT";
      const ext = file.name.split(".").pop()?.toLowerCase();

      if (["csv", "xlsx", "xls"].includes(ext || "")) type = "SPREADSHEET";
      else if (ext === "pdf") type = "PDF";
      else if (["jpg", "jpeg", "png", "webp"].includes(ext || "")) type = "IMAGE";

      const previewUrl = type === "IMAGE" ? URL.createObjectURL(file) : undefined;

      return {
        file,
        name: file.name,
        type,
        size: file.size,
        previewUrl,
      };
    });

    setSources((prev) => [...prev, ...newSources]);
    toast.success(`${newSources.length} arquivo(s) adicionado(s).`);
  };

  const removeSource = (index: number) => {
    setSources((prev) => prev.filter((_, i) => i !== index));
  };

  const startMigrationProcess = async () => {
    if (!workspaceId) {
      toast.error("Selecione um workspace ativo.");
      return;
    }

    if (quotaBalance && !quotaBalance.allowed) {
      toast.error("Limite de importações atingido. Adquira créditos para continuar.");
      router.push("/personal/credits");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("workspaceId", workspaceId);
      formData.append("sourcePlatform", platform);

      if (inputMode === "text" && rawText.trim()) {
        formData.append("rawText", rawText.trim());
      } else {
        sources.forEach((src) => {
          if (src.file) formData.append("files", src.file);
        });
      }

      const res = await fetch("/api/personal/migration", {
        method: "POST",
        body: formData,
      });

      if (res.status === 402) {
        toast.error("Cota de importação excedida.");
        router.push("/personal/credits");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || "Erro ao iniciar importação.");
      }

      const data = await res.json();
      const jobId = data.id || data.jobId;

      const processRes = await fetch(`/api/personal/migration/${jobId}/process`, {
        method: "POST",
      });

      if (!processRes.ok) {
        const processErr = await processRes.json().catch(() => ({}));
        toast.error(processErr.error || "Erro no processamento por IA.");
        router.push("/personal/clients/migrate");
        return;
      }

      toast.success("Processamento iniciado! Acompanhe o progresso em tempo real.");
      router.push("/personal/clients/migrate");
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar o processamento.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8 space-y-6 mx-auto max-w-4xl font-sans pb-24 sm:pb-8">
      {/* Header Corporativo */}
      <div className="flex items-center gap-3 border-b border-border/50 pb-5">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-2xl shrink-0 active:scale-95 transition-transform"
          onClick={() => router.push("/personal/clients/migrate")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-foreground">Nova Importação de Alunos</h1>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest font-black bg-primary/10 text-primary">
              Automática
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecione arquivos ou texto bruto para sintetizar alunos e fichas.
          </p>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {/* Banner de Saldo de Importação */}
        {isLoadingQuota ? (
          <Skeleton className="h-16 w-full rounded-3xl" />
        ) : quotaBalance && !quotaBalance.allowed ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl border border-destructive/30 bg-destructive/5 shadow-2xs">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-destructive">Limite de importações atingido</p>
              <p className="text-xs text-muted-foreground">Adquira créditos adicionais para continuar importando fichas.</p>
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

        {/* Card Principal de Upload */}
        <Card className="border-border/80 shadow-xs rounded-3xl overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-4 border-b border-border/40 bg-muted/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base font-bold">Enviar Material para Extração</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Envie relatórios (PDF), planilhas (CSV, XLSX) ou capturas de tela das fichas (PNG, JPG).
                </CardDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Label className="text-xs text-muted-foreground font-medium whitespace-nowrap">Plataforma Origem:</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="h-9 text-xs w-[150px] rounded-xl">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="mfit" className="text-xs">MFit Personal</SelectItem>
                    <SelectItem value="tecnofit" className="text-xs">Tecnofit</SelectItem>
                    <SelectItem value="planilha" className="text-xs">Planilha Própria</SelectItem>
                    <SelectItem value="outro" className="text-xs">Outro Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 p-1 bg-muted/40 rounded-2xl">
              <Button
                variant={inputMode === "files" ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-9 rounded-xl font-bold gap-2"
                onClick={() => setInputMode("files")}
              >
                <Upload className="h-4 w-4" /> Arquivos
              </Button>
              <Button
                variant={inputMode === "text" ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-9 rounded-xl font-bold gap-2"
                onClick={() => setInputMode("text")}
              >
                <FileCode className="h-4 w-4" /> Texto Bruto
              </Button>
            </div>

            {inputMode === "files" ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-border/80 hover:border-primary/40 rounded-3xl p-6 sm:p-8 text-center bg-card/40 hover:bg-card/70 transition-colors cursor-pointer relative group active:scale-[0.99] flex flex-col items-center justify-center gap-2 min-h-[160px]">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .pdf, image/jpeg, image/png, image/webp"
                    multiple
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileUpload}
                  />
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">
                      Toque para selecionar arquivos
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CSV, XLSX, PDF, PNG ou JPG (máx. 15MB por arquivo)
                    </p>
                  </div>
                </div>

                {sources.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
                      <span>{sources.length} arquivo(s) selecionado(s)</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setSources([])}
                      >
                        Limpar tudo
                      </Button>
                    </div>

                    <div className="divide-y divide-border/40 border border-border/60 rounded-2xl overflow-hidden bg-card shadow-2xs">
                      {sources.map((src, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 text-xs gap-3">
                          <div className="flex items-center gap-3 truncate min-w-0">
                            {src.previewUrl ? (
                              <img
                                src={src.previewUrl}
                                alt={src.name}
                                className="h-10 w-10 object-cover rounded-xl border border-border/60 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setPreviewingFile(src)}
                              />
                            ) : (
                              <div
                                className="h-10 w-10 rounded-xl border border-border/60 flex items-center justify-center bg-muted/30 shrink-0 cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => setPreviewingFile(src)}
                              >
                                {src.type === "SPREADSHEET" ? (
                                  <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                                ) : src.type === "PDF" ? (
                                  <FileText className="h-5 w-5 text-rose-500" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                            )}
                            <div className="truncate min-w-0">
                              <span
                                className="font-bold text-foreground truncate block hover:underline cursor-pointer"
                                onClick={() => setPreviewingFile(src)}
                              >
                                {src.name}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {src.size ? `${(src.size / (1024 * 1024)).toFixed(1)} MB` : "Tamanho desconhecido"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
                              onClick={() => setPreviewingFile(src)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-destructive"
                              onClick={() => removeSource(idx)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                  className="font-mono text-xs rounded-2xl p-4 resize-none border-border/60"
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  O sistema identificará alunos e fichas no texto enviado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Bar (Desktop) */}
        <div className="hidden sm:flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            O processamento será iniciado em segundo plano com atualização em tempo real.
          </span>
          <Button
            size="lg"
            className="gap-2 font-bold rounded-2xl px-6"
            disabled={(sources.length === 0 && !rawText.trim()) || isSubmitting}
            onClick={startMigrationProcess}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>Iniciar Processamento</span>
          </Button>
        </div>

        {/* Sticky Action Bar no Mobile */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t border-border/60 z-40 shadow-xl">
          <Button
            size="lg"
            className="w-full h-12 gap-2 font-bold rounded-2xl text-sm shadow-md"
            disabled={(sources.length === 0 && !rawText.trim()) || isSubmitting}
            onClick={startMigrationProcess}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>Iniciar Processamento</span>
          </Button>
        </div>
      </motion.div>

      {/* FILE PREVIEW DIALOG */}
      <Dialog open={!!previewingFile} onOpenChange={(open) => !open && setPreviewingFile(null)}>
        <DialogContent className="w-[92vw] sm:max-w-md rounded-3xl p-5">
          <DialogHeader className="pb-2 border-b border-border/40">
            <DialogTitle className="text-sm font-bold truncate pr-4">
              {previewingFile?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pré-visualização do arquivo ({previewingFile?.type})
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 flex items-center justify-center bg-muted/20 rounded-2xl border border-border/40 max-h-[340px] overflow-hidden">
            {previewingFile?.type === "IMAGE" && previewingFile.previewUrl ? (
              <img
                src={previewingFile.previewUrl}
                alt={previewingFile.name}
                className="max-h-[300px] w-auto object-contain rounded-xl shadow-xs"
              />
            ) : (
              <div className="text-center p-6 space-y-2">
                {previewingFile?.type === "SPREADSHEET" ? (
                  <FileSpreadsheet className="h-10 w-10 text-emerald-600 mx-auto" />
                ) : (
                  <FileText className="h-10 w-10 text-rose-500 mx-auto" />
                )}
                <p className="text-xs font-bold text-foreground truncate max-w-[240px] mx-auto">
                  {previewingFile?.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {previewingFile?.size ? `${(previewingFile.size / (1024 * 1024)).toFixed(1)} MB` : ""} • Pronto para importação
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" className="h-10 text-xs rounded-xl w-full" onClick={() => setPreviewingFile(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
