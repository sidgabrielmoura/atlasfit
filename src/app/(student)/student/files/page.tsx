"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  FolderOpen,
  Search,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  FileDown,
  FileCode,
  Calendar,
  Layers,
  Sparkles,
  ClipboardList,
  AlertTriangle,
  ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

// Motion animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 20 }
  }
} as any;

interface StudentFile {
  id: string;
  studentId: string;
  workspaceId: string;
  name: string;
  category: "exames" | "dieta_treino" | "outros" | string;
  type: "file" | "link";
  fileName: string | null;
  fileSize: string | null;
  url: string;
  notes: string | null;
  createdAt: string;
}

export default function StudentFilesPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [files, setFiles] = useState<StudentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "dieta_treino" | "exames" | "outros">("all");

  // Visualizer modal state
  const [previewFile, setPreviewFile] = useState<StudentFile | null>(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/files");
      if (!res.ok) {
        throw new Error("Erro ao carregar seus arquivos da central.");
      }
      const data = await res.json();
      setFiles(data || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao sincronizar seus arquivos.");
      toast.error("Erro ao sincronizar seus arquivos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchFiles();
  }, []);

  if (loading) {
    return <StudentFilesSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-20">
        <AlertTriangle className="size-12 mx-auto text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold text-foreground">Falha ao sincronizar arquivos</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchFiles} variant="outline" className="gap-2 border-border dark:border-white/10 hover:bg-secondary/40">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // Filter Categories logic
  const filteredFiles = files.filter((file) => {
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.notes && file.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (file.fileName && file.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || file.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getCategoryConfig = (category: string) => {
    switch (category) {
      case "dieta_treino":
        return { label: "Dieta & Treino", class: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "exames":
        return { label: "Exame Clínico", class: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
      case "outros":
      default:
        return { label: "Outros", class: "bg-violet-500/10 text-violet-400 border-violet-500/20" };
    }
  };

  const getFileIcon = (file: StudentFile) => {
    if (file.type === "link") {
      return { icon: LinkIcon, color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/15" };
    }
    const name = (file.fileName || file.name || "").toLowerCase();
    if (name.endsWith(".pdf")) {
      return { icon: FileText, color: "text-rose-400 bg-rose-500/10 border-rose-500/15" };
    }
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(name)) {
      return { icon: ImageIcon, color: "text-teal-400 bg-teal-500/10 border-teal-500/15" };
    }
    return { icon: FileDown, color: "text-amber-400 bg-amber-500/10 border-amber-500/15" };
  };

  const isPreviewable = (file: StudentFile) => {
    if (file.type === "link") return false;
    const name = (file.fileName || file.name || "").toLowerCase();
    return name.endsWith(".pdf") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  };

  const isImageFile = (file: StudentFile) => {
    const name = (file.fileName || file.name || "").toLowerCase();
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-border dark:border-white/[0.04] pb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              {activeWs?.name || "AtlasFit"}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            Central de Arquivos
          </h1>
          <p className="text-sm text-muted-foreground font-medium">
            Acesse dietas, treinos estruturados, exames médicos e links compartilhados pelo seu personal trainer.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
          <span className="px-3 py-1.5 rounded-xl bg-muted dark:bg-neutral-900 border border-border dark:border-white/[0.04] text-xs font-bold text-muted-foreground">
            {files.length} {files.length === 1 ? "arquivo" : "arquivos"} compartilhados
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/40 dark:bg-neutral-950/20 p-4 rounded-2xl border border-border dark:border-white/3">
        <div className="relative md:col-span-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar arquivo ou observação..."
            className="pl-10 h-11 bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.05] rounded-xl focus-visible:ring-primary focus-visible:border-primary text-sm text-foreground placeholder-muted-foreground"
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "all"
                ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/10"
                : "bg-muted dark:bg-neutral-900/40 text-muted-foreground dark:text-neutral-400 border-border dark:border-white/[0.04] hover:text-foreground hover:bg-secondary/40 dark:hover:bg-neutral-900"
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedCategory("dieta_treino")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "dieta_treino"
                ? "bg-emerald-500 text-white dark:text-black border-emerald-500 shadow-lg shadow-emerald-500/10"
                : "bg-muted dark:bg-neutral-900/40 text-muted-foreground dark:text-neutral-400 border-border dark:border-white/[0.04] hover:text-foreground hover:bg-secondary/40 dark:hover:bg-neutral-900"
            )}
          >
            Dieta & Treino
          </button>
          <button
            onClick={() => setSelectedCategory("exames")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "exames"
                ? "bg-cyan-500 text-white dark:text-black border-cyan-500 shadow-lg shadow-cyan-500/10"
                : "bg-muted dark:bg-neutral-900/40 text-muted-foreground dark:text-neutral-400 border-border dark:border-white/[0.04] hover:text-foreground hover:bg-secondary/40 dark:hover:bg-neutral-900"
            )}
          >
            Exames Clínicos
          </button>
          <button
            onClick={() => setSelectedCategory("outros")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "outros"
                ? "bg-violet-500 text-white dark:text-black border-violet-500 shadow-lg shadow-violet-500/10"
                : "bg-muted dark:bg-neutral-900/40 text-muted-foreground dark:text-neutral-400 border-border dark:border-white/[0.04] hover:text-foreground hover:bg-secondary/40 dark:hover:bg-neutral-900"
            )}
          >
            Outros
          </button>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {filteredFiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="py-1 text-center"
          >
            <Card className="border w-full border-dashed border-border dark:border-white/6 bg-card dark:bg-neutral-900/10 p-12 text-center rounded-2xl mx-auto space-y-4 shadow-xl">
              <FolderOpen className="size-12 mx-auto text-muted-foreground animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">Nenhum arquivo encontrado</h3>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Não localizamos arquivos sob os filtros aplicados. Tente ajustar o texto de pesquisa ou mude a categoria de busca.
                </p>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredFiles.map((file) => {
              const catInfo = getCategoryConfig(file.category);
              const iconInfo = getFileIcon(file);
              const FileIcon = iconInfo.icon;
              const hasNotes = file.notes && file.notes.trim().length > 0;
              const previewAllowed = isPreviewable(file);

              return (
                <motion.div key={file.id} variants={itemVariants} layout className="h-full">
                  <Card className="relative overflow-hidden bg-card dark:bg-neutral-900/40 border border-border dark:border-white/[0.04] rounded-2xl h-full flex flex-col justify-between group hover:border-border dark:hover:border-white/[0.08] transition-all duration-300 p-4 gap-4">

                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn("p-2 rounded-xl border transition-transform duration-300 group-hover:scale-105 shrink-0", iconInfo.color)}>
                          <FileIcon className="size-4.5 shrink-0" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="text-sm font-bold text-foreground tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                            {file.name}
                          </h3>
                          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                            <Calendar className="size-3" />
                            {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                      <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0", catInfo.class)}>
                        {catInfo.label}
                      </span>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-bold border-t border-border dark:border-white/[0.03] pt-3.5">
                      <span>{file.fileSize || "Link"}</span>
                      <div className="flex items-center gap-4">
                        {/* Trainer Notes Popover */}
                        {hasNotes && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 active:scale-95 duration-100 cursor-pointer">
                                <ClipboardList className="size-4 text-primary shrink-0" />
                                <span>Notas</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 bg-popover dark:bg-neutral-950 border border-border dark:border-white/[0.06] text-xs text-muted-foreground dark:text-neutral-300 p-3.5 rounded-xl shadow-2xl">
                              <div className="flex items-center gap-1.5 font-black text-foreground dark:text-white mb-2 uppercase tracking-widest text-[9px]">
                                <ClipboardList className="size-3.5 text-primary shrink-0" />
                                <span>Notas do Treinador</span>
                              </div>
                              <p className="leading-relaxed font-semibold break-words text-left">{file.notes}</p>
                            </PopoverContent>
                          </Popover>
                        )}

                        {/* File Preview */}
                        {previewAllowed && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 active:scale-95 duration-100 cursor-pointer"
                          >
                            <Eye className="size-4 shrink-0" />
                            <span>Visualizar</span>
                          </button>
                        )}

                        {/* Action Link/Download */}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={file.type === "file" ? file.fileName || file.name : undefined}
                          className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 active:scale-95 duration-100 font-black cursor-pointer"
                        >
                          {file.type === "link" ? (
                            <>
                              Acessar <ExternalLink className="size-4 shrink-0" />
                            </>
                          ) : (
                            <>
                              Baixar <Download className="size-4 shrink-0" />
                            </>
                          )}
                        </a>
                      </div>
                    </div>

                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Dialog visualizer */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] bg-background dark:bg-neutral-950 border border-border dark:border-white/[0.06] rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
          {previewFile && (
            <>
              <DialogHeader className="p-4 border-b border-border dark:border-white/[0.04] bg-muted/40 dark:bg-neutral-900/40 flex flex-row items-center justify-between space-y-0 gap-4 shrink-0">
                <div className="space-y-0.5 min-w-0">
                  <DialogTitle className="text-sm md:text-base font-black text-foreground dark:text-white truncate pr-6">
                    Visualizando: {previewFile.name}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] md:text-xs text-muted-foreground dark:text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>{getCategoryConfig(previewFile.category).label}</span>
                    <span>•</span>
                    <span>{previewFile.fileSize || ""}</span>
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Trainer Notes Banner inside the Viewer */}
              {previewFile.notes && (
                <div className="bg-muted dark:bg-neutral-900 border-b border-border dark:border-white/[0.04] p-3.5 text-xs text-muted-foreground dark:text-neutral-300 font-semibold flex gap-2.5 items-start">
                  <ClipboardList className="size-4.5 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed"><strong className="text-foreground dark:text-white font-bold block mb-0.5 text-[10px] uppercase tracking-wider">Anotações do Treinador:</strong> {previewFile.notes}</p>
                </div>
              )}

              {/* Viewer body */}
              <div className="flex-grow min-h-0 bg-muted/20 dark:bg-neutral-900/20 relative flex items-center justify-center p-2 md:p-4 overflow-auto">
                {isImageFile(previewFile) ? (
                  // Image viewer
                  <motion.img
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
                  />
                ) : (
                  // PDF viewer via Iframe
                  <iframe
                    src={`${previewFile.url}#toolbar=0`}
                    className="w-full h-full rounded-lg border border-border dark:border-white/[0.03] bg-background dark:bg-neutral-950 shadow-2xl"
                    title={previewFile.name}
                  />
                )}
              </div>

              {/* Viewer footer */}
              <DialogFooter className="p-4 border-t border-border dark:border-white/[0.04] bg-muted/40 dark:bg-neutral-900/40 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  onClick={() => setPreviewFile(null)}
                  variant="outline"
                  className="h-10 rounded-xl border-border dark:border-white/[0.05] bg-muted/40 dark:bg-neutral-900/40 text-muted-foreground dark:text-neutral-300 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-neutral-900 text-xs font-bold"
                >
                  Fechar
                </Button>
                <Button
                  asChild
                  className="h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold gap-1.5 active:scale-95 transition-transform"
                >
                  <a
                    href={previewFile.url}
                    download={previewFile.fileName || previewFile.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="size-4" />
                    Baixar Arquivo
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Policies Support Footer card */}
      <Card className="bg-muted/10 border border-border dark:border-white/[0.04] p-5 rounded-2xl space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="size-4 text-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-wider text-primary">
            Importante
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed font-semibold">
          Caso falte algum arquivo (como reajustes de treinos, novos exames solicitados ou planejamentos nutricionais), entre em contato diretamente com seu personal trainer para que ele realize a publicação na sua Central de Arquivos.
        </p>
      </Card>
    </div>
  );
}

// Skeleton loading layout for compliance (skelletonsloaders.md)
function StudentFilesSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-border dark:border-white/[0.04] pb-6">
        <Skeleton className="h-4 w-32 bg-muted dark:bg-neutral-900" />
        <Skeleton className="h-8 w-64 max-w-full bg-muted dark:bg-neutral-900" />
        <Skeleton className="h-4 w-full max-w-md bg-muted dark:bg-neutral-900" />
      </div>

      {/* Filter and Search Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/40 dark:bg-neutral-950/20 rounded-2xl border border-border dark:border-white/[0.03]">
        <Skeleton className="h-11 bg-muted dark:bg-neutral-900 rounded-xl" />
        <div className="md:col-span-2 flex gap-2">
          <Skeleton className="h-10 w-20 bg-muted dark:bg-neutral-900 rounded-xl" />
          <Skeleton className="h-10 w-32 bg-muted dark:bg-neutral-900 rounded-xl" />
          <Skeleton className="h-10 w-32 bg-muted dark:bg-neutral-900 rounded-xl" />
          <Skeleton className="h-10 w-24 bg-muted dark:bg-neutral-900 rounded-xl" />
        </div>
      </div>

      {/* Grid of File Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-48 bg-muted dark:bg-neutral-900 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
