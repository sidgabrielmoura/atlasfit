"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  FolderOpen,
  Search,
  Plus,
  Download,
  ExternalLink,
  Eye,
  Trash2,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
  FileDown,
  Calendar,
  ClipboardList,
  AlertTriangle,
  Sparkles,
  Users,
  Activity,
  Dumbbell,
  Info,
  Link2,
  CheckCircle2,
  Clock,
  UserCheck
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
  hidden: { opacity: 0, scale: 0.97, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 20 }
  }
} as any;

interface Student {
  id: string;
  name: string | null;
  email: string | null;
}

interface SharedFile {
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
  student: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export default function PersonalFilesPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspace?.id;

  const [files, setFiles] = useState<SharedFile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "dieta_treino" | "exames" | "outros">("all");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("all");

  // Modal Upload Form state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [submittingUpload, setSubmittingUpload] = useState(false);

  const [uploadStudentId, setUploadStudentId] = useState("");
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("exames");
  const [uploadType, setUploadType] = useState<"file" | "link">("file");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileSize, setUploadFileSize] = useState("");
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);

  // Preview dialog & Delete alert state
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);
  const [deleteTargetFile, setDeleteTargetFile] = useState<SharedFile | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);

  const fetchWorkspaceFiles = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/personal/files?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) {
        throw new Error("Erro ao carregar dados da central de arquivos.");
      }
      const data = await res.json();
      setFiles(data.files || []);
      setStudents(data.students || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar arquivos compartilhados.");
      toast.error("Falha ao carregar arquivos da central.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkspaceFiles();
    }
  }, [activeWorkspaceId]);

  if (!activeWorkspaceId) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-20">
        <AlertTriangle className="size-12 mx-auto text-amber-500 animate-bounce" />
        <h2 className="text-xl font-bold text-white">Nenhum Workspace Ativo</h2>
        <p className="text-neutral-400">Por favor, selecione um workspace na barra superior para carregar seus arquivos.</p>
      </div>
    );
  }

  if (loading) {
    return <TrainerFilesSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-20">
        <AlertTriangle className="size-12 mx-auto text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold text-white">Erro de Sincronização</h2>
        <p className="text-neutral-400">{error}</p>
        <Button onClick={fetchWorkspaceFiles} variant="outline" className="gap-2 border-white/10 hover:bg-white/5">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  // Filter logic
  const filteredFiles = files.filter((file) => {
    const studentName = file.student?.name || "";
    const matchesSearch =
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.notes && file.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (file.fileName && file.fileName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "all" || file.category === selectedCategory;

    const matchesStudent =
      selectedStudentFilter === "all" || file.studentId === selectedStudentFilter;

    return matchesSearch && matchesCategory && matchesStudent;
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

  const getFileIcon = (file: SharedFile) => {
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

  const isPreviewable = (file: SharedFile) => {
    if (file.type === "link") return false;
    const name = (file.fileName || file.name || "").toLowerCase();
    return name.endsWith(".pdf") || /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  };

  const isImageFile = (file: SharedFile) => {
    const name = (file.fileName || file.name || "").toLowerCase();
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
  };

  // Submit Upload Handler
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadStudentId) {
      toast.warning("Por favor, selecione um aluno de destino.");
      return;
    }
    if (!uploadName.trim()) {
      toast.warning("Por favor, informe o título do documento.");
      return;
    }
    if (uploadType === "link" && !uploadUrl.trim()) {
      toast.warning("Por favor, informe o link externo.");
      return;
    }
    if (uploadType === "file" && (!selectedFileObj || !uploadFileName)) {
      toast.warning("Por favor, selecione ou arraste um arquivo.");
      return;
    }

    try {
      setSubmittingUpload(true);

      let finalUrl = uploadUrl;
      let finalKey = null;
      let finalMimeType = null;
      let finalSize = null;

      if (uploadType === "file" && selectedFileObj) {
        // 1. Get presigned URL
        const presignedRes = await fetch("/api/storage/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            studentId: uploadStudentId,
            fileName: selectedFileObj.name,
            contentType: selectedFileObj.type,
            fileSize: selectedFileObj.size,
            targetType: "student_file",
          }),
        });

        if (!presignedRes.ok) {
          const txt = await presignedRes.text();
          throw new Error(txt || "Erro ao obter URL de upload.");
        }

        const { uploadUrl: putUrl, fileUrl, objectKey } = await presignedRes.json();

        // 2. Put file to Cloudflare R2
        const putRes = await fetch(putUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFileObj.type },
          body: selectedFileObj,
        });

        if (!putRes.ok) {
          throw new Error("Erro no upload do arquivo para o servidor de armazenamento.");
        }

        finalUrl = fileUrl;
        finalKey = objectKey;
        finalMimeType = selectedFileObj.type;
        finalSize = selectedFileObj.size;
      }

      const payload = {
        workspaceId: activeWorkspaceId,
        name: uploadName,
        category: uploadCategory,
        type: uploadType,
        fileName: uploadType === "file" ? uploadFileName : null,
        fileSize: uploadType === "file" ? uploadFileSize : "Link",
        url: finalUrl,
        notes: uploadNotes.trim() || null,
        objectKey: finalKey,
        mimeType: finalMimeType,
        size: finalSize,
      };

      const res = await fetch(`/api/personal/clients/${uploadStudentId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao salvar arquivo.");
      }

      toast.success("Documento compartilhado com sucesso!");

      // Reset Form fields
      setUploadStudentId("");
      setUploadName("");
      setUploadCategory("exames");
      setUploadType("file");
      setUploadUrl("");
      setUploadNotes("");
      setUploadFileName("");
      setUploadFileSize("");
      setSelectedFileObj(null);
      setIsUploadModalOpen(false);

      fetchWorkspaceFiles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao enviar o arquivo.");
    } finally {
      setSubmittingUpload(false);
    }
  };

  // Delete Handler
  const handleDeleteFileConfirm = async () => {
    if (!deleteTargetFile) return;
    try {
      setDeletingFile(true);

      const res = await fetch(`/api/personal/clients/${deleteTargetFile.studentId}/files/${deleteTargetFile.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao excluir arquivo.");
      }

      toast.success("Arquivo excluído com sucesso!");
      setDeleteTargetFile(null);
      fetchWorkspaceFiles();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Não foi possível excluir o arquivo.");
    } finally {
      setDeletingFile(false);
    }
  };

  // Metrics details
  const totalFiles = files.length;
  const examFilesCount = files.filter(f => f.category === "exames").length;
  const dietTrainFilesCount = files.filter(f => f.category === "dieta_treino").length;
  const othersFilesCount = files.filter(f => f.category === "outros").length;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-5 w-full max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/[0.04] pb-6 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
              Workspace PT
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Central de Arquivos do Personal
          </h1>
          <p className="text-sm text-neutral-400 font-medium">
            Gerencie e compartilhe exames, laudos, dietas, rotinas de treino e links úteis de toda a sua base de alunos.
          </p>
        </div>
        <Button
          onClick={() => setIsUploadModalOpen(true)}
          className="gap-2 font-bold px-5 max-sm:w-full h-11 bg-primary text-black hover:bg-primary/90 rounded-xl shrink-0 self-start md:self-center transition-transform active:scale-95 duration-150 shadow-lg shadow-primary/5"
        >
          <Plus className="size-4.5" /> Compartilhar Arquivo
        </Button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Total */}
        <Card className="bg-neutral-900/40 border-white/[0.04] p-4 rounded-2xl relative overflow-hidden select-none">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Total Geral</span>
            <FolderOpen className="size-4 text-primary" />
          </div>
          <div className="mt-3 text-3xl font-black text-white">{totalFiles}</div>
          <p className="text-[10px] text-neutral-500 font-medium mt-1">Arquivos compartilhados</p>
        </Card>

        {/* Stat 2: Dietas e Treinos */}
        <Card className="bg-neutral-900/40 border-white/[0.04] p-4 rounded-2xl relative overflow-hidden select-none">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Dieta & Treino</span>
            <Dumbbell className="size-4 text-emerald-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white">{dietTrainFilesCount}</div>
          <p className="text-[10px] text-neutral-500 font-medium mt-1">Planos de treino e nutrição</p>
        </Card>

        {/* Stat 3: Laudos e Exames */}
        <Card className="bg-neutral-900/40 border-white/[0.04] p-4 rounded-2xl relative overflow-hidden select-none">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Laudos & Exames</span>
            <Activity className="size-4 text-cyan-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white">{examFilesCount}</div>
          <p className="text-[10px] text-neutral-500 font-medium mt-1">Check-ups médicos e exames</p>
        </Card>

        {/* Stat 4: Outros */}
        <Card className="bg-neutral-900/40 border-white/[0.04] p-4 rounded-2xl relative overflow-hidden select-none">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Outros</span>
            <Info className="size-4 text-violet-400" />
          </div>
          <div className="mt-3 text-3xl font-black text-white">{othersFilesCount}</div>
          <p className="text-[10px] text-neutral-500 font-medium mt-1">Tabelas e documentos diversos</p>
        </Card>
      </div>

      {/* Filter and Search Box */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-neutral-950/20 p-4 rounded-2xl border border-white/[0.03]">
        {/* Search */}
        <div className="relative md:col-span-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-neutral-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por título, notas ou aluno..."
            className="pl-10 h-11 bg-neutral-900/60 border-white/[0.05] rounded-xl focus-visible:ring-primary focus-visible:border-primary text-sm text-white placeholder-neutral-500"
          />
        </div>

        {/* Student filter */}
        <div className="md:col-span-1">
          <Select value={selectedStudentFilter} onValueChange={setSelectedStudentFilter}>
            <SelectTrigger className="h-11 max-sm:w-full bg-neutral-900/60 border-white/[0.05] rounded-xl text-xs text-white focus:ring-0 focus:ring-offset-0">
              <SelectValue placeholder="Filtrar por Aluno" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/[0.08]">
              <SelectItem value="all" className="text-xs">Todos os Alunos</SelectItem>
              {students.map(s => (
                <SelectItem key={s.id} value={s.id} className="text-xs">{s.name || "Aluno sem nome"}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Pills */}
        <div className="md:col-span-2 flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "all"
                ? "bg-primary text-black border-primary shadow-lg shadow-primary/10"
                : "bg-neutral-900/40 text-neutral-400 border-white/[0.04] hover:text-white hover:bg-neutral-900"
            )}
          >
            Todos
          </button>
          <button
            onClick={() => setSelectedCategory("dieta_treino")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "dieta_treino"
                ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/10"
                : "bg-neutral-900/40 text-neutral-400 border-white/[0.04] hover:text-white hover:bg-neutral-900"
            )}
          >
            Dieta & Treino
          </button>
          <button
            onClick={() => setSelectedCategory("exames")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "exames"
                ? "bg-cyan-500 text-black border-cyan-500 shadow-lg shadow-cyan-500/10"
                : "bg-neutral-900/40 text-neutral-400 border-white/[0.04] hover:text-white hover:bg-neutral-900"
            )}
          >
            Exames Clínicos
          </button>
          <button
            onClick={() => setSelectedCategory("outros")}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border shrink-0 transition-all active:scale-[0.97] duration-150",
              selectedCategory === "outros"
                ? "bg-violet-500 text-black border-violet-500 shadow-lg shadow-violet-500/10"
                : "bg-neutral-900/40 text-neutral-400 border-white/[0.04] hover:text-white hover:bg-neutral-900"
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
            className="text-center"
          >
            <Card className="border border-dashed border-white/6 bg-neutral-900/10 p-12 text-center rounded-2xl max-w-lg mx-auto shadow-xl">
              <FolderOpen className="size-12 mx-auto text-neutral-700 animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Nenhum arquivo publicado</h3>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Não localizamos compartilhamentos sob estes termos. Use o botão no topo direito para enviar o primeiro arquivo!
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
                  <Card className="relative overflow-hidden bg-neutral-900/40 border-white/4 rounded-2xl h-full flex flex-col justify-between group hover:border-white/8 transition-all duration-300 p-4 gap-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border shrink-0", catInfo.class)}>
                          {catInfo.label}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider shrink-0">
                          {file.fileSize || "Link"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-950/40 rounded-xl border border-white/3 text-xs font-semibold text-neutral-300">
                        <Users className="size-3.5 text-primary shrink-0" />
                        <span className="truncate">Para: <strong className="text-white font-bold">{file.student?.name || "Aluno sem nome"}</strong></span>
                      </div>

                      <div className="flex items-start gap-3 pt-1">
                        <div className={cn("p-2 rounded-xl border transition-transform duration-300 group-hover:scale-105 shrink-0", iconInfo.color)}>
                          <FileIcon className="size-4.5 shrink-0" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <h3 className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-primary transition-colors truncate">
                            {file.name}
                          </h3>
                          <span className="text-[10px] text-neutral-500 font-semibold flex items-center gap-1">
                            <Calendar className="size-3" />
                            Compartilhado em {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between border-t border-white/3 pt-3.5 text-[10px] text-neutral-400 font-bold">
                      <button
                        onClick={() => setDeleteTargetFile(file)}
                        className="text-neutral-500 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer active:scale-95 duration-100"
                      >
                        <Trash2 className="size-4 shrink-0" />
                        <span>Excluir</span>
                      </button>

                      <div className="flex items-center gap-3">
                        {/* Trainer Notes Popover */}
                        {hasNotes && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer active:scale-95 duration-100">
                                <ClipboardList className="size-4 text-primary shrink-0" />
                                <span>Notas</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 bg-neutral-950 border border-white/6 text-xs text-neutral-300 p-3.5 rounded-xl shadow-2xl">
                              <div className="flex items-center gap-1.5 font-black text-white mb-2 uppercase tracking-widest text-[9px]">
                                <ClipboardList className="size-3.5 text-primary shrink-0" />
                                <span>Notas de Upload</span>
                              </div>
                              <p className="leading-relaxed font-semibold wrap-break-word text-left">{file.notes}</p>
                            </PopoverContent>
                          </Popover>
                        )}

                        {/* File Preview */}
                        {previewAllowed && (
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="text-neutral-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer active:scale-95 duration-100"
                          >
                            <Eye className="size-4 shrink-0" />
                            <span>Visualizar</span>
                          </button>
                        )}

                        {/* Download link */}
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={file.type === "file" ? file.fileName || file.name : undefined}
                          className="text-primary hover:text-primary/80 transition-colors flex items-center gap-1 active:scale-95 duration-100 font-black cursor-pointer"
                        >
                          {file.type === "link" ? (
                            <ExternalLink className="size-4 shrink-0" />
                          ) : (
                            <Download className="size-4 shrink-0" />
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

      {/* ==================== DIALOG: COMPARTILHAR ARQUIVO ==================== */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="w-full max-w-lg bg-neutral-950 border border-white/[0.06] text-foreground rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] p-6">
          <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
          <DialogHeader className="pb-2 border-b border-white/[0.04]">
            <DialogTitle className="text-xl font-black flex items-center gap-2 text-white">
              <FolderOpen className="size-5 text-primary" /> Compartilhar Novo Arquivo
            </DialogTitle>
            <DialogDescription className="text-neutral-400 text-xs">
              Selecione o aluno de destino e envie exames, PDF de dietas ou links de planejamento diretamente para o portal dele.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-4">
            {/* Aluno Selecionado dropdown */}
            <div className="space-y-1.5">
              <Label htmlFor="uploadStudent" className="text-xs font-bold text-neutral-300">Aluno de Destino *</Label>
              <Select value={uploadStudentId} onValueChange={setUploadStudentId} disabled={submittingUpload}>
                <SelectTrigger id="uploadStudent" className="bg-neutral-900 border-white/[0.06] h-10 text-xs rounded-xl text-white w-full focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Selecione o aluno" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/[0.08]">
                  {students.map(student => (
                    <SelectItem key={student.id} value={student.id} className="text-xs">
                      {student.name || "Sem Nome"} ({student.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome / Título */}
            <div className="space-y-1.5">
              <Label htmlFor="uploadName" className="text-xs font-bold text-neutral-300">Título do Documento *</Label>
              <Input
                id="uploadName"
                placeholder="Ex: Dieta Customizada - Hipertrofia Fase 1"
                className="bg-neutral-900 border-white/[0.06] focus:border-primary/50 h-10 text-xs rounded-xl text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                disabled={submittingUpload}
                required
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label htmlFor="uploadCategory" className="text-xs font-bold text-neutral-300">Categoria</Label>
              <Select value={uploadCategory} onValueChange={setUploadCategory} disabled={submittingUpload}>
                <SelectTrigger id="uploadCategory" className="bg-neutral-900 border-white/[0.06] h-10 text-xs rounded-xl text-white w-full focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-neutral-900 border-white/[0.08]">
                  <SelectItem value="exames" className="text-xs">Exame / Laudo Médico</SelectItem>
                  <SelectItem value="dieta_treino" className="text-xs">Plano de Treino / Dieta</SelectItem>
                  <SelectItem value="outros" className="text-xs">Outros / Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origem: Arquivo Local ou Link Nuvem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-neutral-300">Origem do Documento</Label>
              <div className="grid grid-cols-2 p-1 bg-neutral-900 border border-white/[0.06] rounded-xl gap-1">
                <button
                  type="button"
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                    uploadType === "file"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  )}
                  onClick={() => setUploadType("file")}
                  disabled={submittingUpload}
                >
                  <FileText className="size-3.5" /> Arquivo Local
                </button>
                <button
                  type="button"
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer",
                    uploadType === "link"
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-neutral-400 hover:text-white"
                  )}
                  onClick={() => setUploadType("link")}
                  disabled={submittingUpload}
                >
                  <Link2 className="size-3.5" /> Link Externo
                </button>
              </div>
            </div>

            {/* Condicional de Upload de Arquivo Local */}
            {uploadType === "file" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-300">Arquivo Local *</Label>
                <div
                  onClick={() => {
                    if (!submittingUpload) {
                      document.getElementById("hidden-file-input")?.click();
                    }
                  }}
                  className={cn(
                    "border border-dashed border-white/[0.08] hover:border-primary/40 rounded-xl p-6 text-center cursor-pointer transition-all bg-neutral-900/30 hover:bg-neutral-900/60 flex flex-col items-center justify-center gap-2 group select-none",
                    uploadFileName ? "border-emerald-500/30 bg-emerald-500/[0.02]" : ""
                  )}
                >
                  <input
                    id="hidden-file-input"
                    type="file"
                    className="hidden"
                    disabled={submittingUpload}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFileName(file.name);
                        const size = file.size / (1024 * 1024); // Size in MB
                        setUploadFileSize(`${size.toFixed(1)} MB`);
                        setSelectedFileObj(file);
                      }
                    }}
                  />
                  <FileDown className={cn("size-8 text-neutral-500 transition-transform duration-300 group-hover:scale-110", uploadFileName && "text-emerald-400")} />
                  {uploadFileName ? (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-emerald-400 truncate max-w-[250px]">{uploadFileName}</p>
                      <p className="text-[10px] text-neutral-500 font-semibold">{uploadFileSize}</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-neutral-300 group-hover:text-primary">Clique para selecionar</p>
                      <p className="text-[10px] text-neutral-500 font-medium">PDF, DOC, JPG ou PNG (Máx. 10MB)</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Condicional de Link Externo */}
            {uploadType === "link" && (
              <div className="space-y-1.5">
                <Label htmlFor="uploadUrl" className="text-xs font-bold text-neutral-300">URL do Link Externo *</Label>
                <Input
                  id="uploadUrl"
                  placeholder="https://drive.google.com/..."
                  className="bg-neutral-900 border-white/[0.06] focus:border-primary/50 h-10 text-xs rounded-xl text-white focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  disabled={submittingUpload}
                  required
                />
              </div>
            )}

            {/* Observações / Anotações */}
            <div className="space-y-1.5">
              <Label htmlFor="uploadNotes" className="text-xs font-bold text-neutral-300">Observações Clínicas / Recomendações</Label>
              <Textarea
                id="uploadNotes"
                placeholder="Adicione notas adicionais, orientações de consumo ou orientações clínicas sobre este arquivo."
                className="bg-neutral-900 border-white/[0.06] focus:border-primary/50 text-xs rounded-xl text-white focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[80px]"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                disabled={submittingUpload}
              />
            </div>

            <DialogFooter className="pt-4 border-t border-white/[0.04] flex flex-row justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-white/[0.05] bg-neutral-900/40 text-neutral-300 hover:text-white hover:bg-neutral-900 text-xs font-bold"
                onClick={() => setIsUploadModalOpen(false)}
                disabled={submittingUpload}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingUpload}
                className="h-10 rounded-xl bg-primary text-black hover:bg-primary/90 text-xs font-bold gap-2 active:scale-95 transition-transform"
              >
                {submittingUpload ? "Enviando..." : "Compartilhar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: PREVIEW FILE ==================== */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="max-w-4xl h-[90vh] bg-neutral-950 border border-white/[0.06] rounded-2xl flex flex-col p-0 overflow-hidden shadow-2xl">
          {previewFile && (
            <>
              <DialogHeader className="p-4 border-b border-white/[0.04] bg-neutral-900/40 flex flex-row items-center justify-between space-y-0 gap-4 shrink-0">
                <div className="space-y-0.5 min-w-0">
                  <DialogTitle className="text-sm md:text-base font-black text-white truncate pr-6">
                    Visualizando: {previewFile.name}
                  </DialogTitle>
                  <DialogDescription className="text-[10px] md:text-xs text-neutral-500 font-bold uppercase tracking-wider flex items-center gap-2">
                    <span>Para: {previewFile.student?.name}</span>
                    <span>•</span>
                    <span>{getCategoryConfig(previewFile.category).label}</span>
                    <span>•</span>
                    <span>{previewFile.fileSize || ""}</span>
                  </DialogDescription>
                </div>
              </DialogHeader>

              {/* Trainer Notes Banner inside the Viewer */}
              {previewFile.notes && (
                <div className="bg-neutral-900 border-b border-white/[0.04] p-3.5 text-xs text-neutral-300 font-semibold flex gap-2.5 items-start">
                  <ClipboardList className="size-4.5 text-primary shrink-0 mt-0.5" />
                  <p className="leading-relaxed"><strong className="text-white font-bold block mb-0.5 text-[10px] uppercase tracking-wider">Notas de Compartilhamento:</strong> {previewFile.notes}</p>
                </div>
              )}

              {/* Viewer body */}
              <div className="flex-grow min-h-0 bg-neutral-900/20 relative flex items-center justify-center p-2 md:p-4 overflow-auto">
                {isImageFile(previewFile) ? (
                  <motion.img
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    src={previewFile.url}
                    alt={previewFile.name}
                    className="max-w-full max-h-full rounded-lg object-contain shadow-2xl"
                  />
                ) : (
                  <iframe
                    src={`${previewFile.url}#toolbar=0`}
                    className="w-full h-full rounded-lg border border-white/[0.03] bg-neutral-950 shadow-2xl"
                    title={previewFile.name}
                  />
                )}
              </div>

              {/* Viewer footer */}
              <DialogFooter className="p-4 border-t border-white/[0.04] bg-neutral-900/40 flex flex-row items-center justify-end gap-2 shrink-0">
                <Button
                  onClick={() => setPreviewFile(null)}
                  variant="outline"
                  className="h-10 rounded-xl border-white/[0.05] bg-neutral-900/40 text-neutral-300 hover:text-white hover:bg-neutral-900 text-xs font-bold"
                >
                  Fechar
                </Button>
                <Button
                  asChild
                  className="h-10 rounded-xl bg-primary text-black hover:bg-primary/90 text-xs font-bold gap-1.5 active:scale-95 transition-transform"
                >
                  <a
                    href={previewFile.url}
                    download={previewFile.fileName || previewFile.name}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="size-4" />
                    Baixar
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== ALERTDIALOG: CONFIRM EXCLUSÃO ==================== */}
      <AlertDialog open={!!deleteTargetFile} onOpenChange={(open) => !open && setDeleteTargetFile(null)}>
        <AlertDialogContent className="bg-neutral-950 border border-white/[0.08] text-foreground rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-white flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500 animate-pulse" /> Tem certeza?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-neutral-400 leading-relaxed font-semibold">
              Esta ação removerá permanentemente o arquivo <strong className="text-white font-bold">"{deleteTargetFile?.name}"</strong> enviado para o portal do aluno <strong className="text-white font-bold">"{deleteTargetFile?.student?.name}"</strong>. O aluno perderá o acesso imediato a este documento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex gap-2">
            <AlertDialogCancel
              className="h-10 rounded-xl border-white/[0.05] bg-neutral-900/40 text-neutral-300 hover:text-white hover:bg-neutral-900 text-xs font-bold cursor-pointer"
              disabled={deletingFile}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteFileConfirm();
              }}
              className="h-10 rounded-xl bg-rose-600 text-white hover:bg-rose-500 text-xs font-bold cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-2"
              disabled={deletingFile}
            >
              {deletingFile ? "Excluindo..." : "Confirmar Exclusão"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Skeleton loading layout for compliance (skelletonsloaders.md)
function TrainerFilesSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full max-w-7xl mx-auto animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-2 border-b border-white/[0.04] pb-6">
        <Skeleton className="h-4 w-32 bg-neutral-900" />
        <Skeleton className="h-8 w-64 max-w-full bg-neutral-900" />
        <Skeleton className="h-4 w-full max-w-md bg-neutral-900" />
      </div>

      {/* KPI Stats cards Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 bg-neutral-900 rounded-2xl" />
        ))}
      </div>

      {/* Filters Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-neutral-950/20 rounded-2xl border border-white/[0.03]">
        <Skeleton className="h-11 bg-neutral-900 rounded-xl" />
        <Skeleton className="h-11 bg-neutral-900 rounded-xl" />
        <div className="md:col-span-2 flex gap-2">
          <Skeleton className="h-10 w-20 bg-neutral-900 rounded-xl" />
          <Skeleton className="h-10 w-32 bg-neutral-900 rounded-xl" />
          <Skeleton className="h-10 w-32 bg-neutral-900 rounded-xl" />
          <Skeleton className="h-10 w-24 bg-neutral-900 rounded-xl" />
        </div>
      </div>

      {/* Files Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-56 bg-neutral-900 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
