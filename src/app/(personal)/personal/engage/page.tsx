"use client";

import { useEffect, useState, Suspense } from "react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { useEngageSnapshot, engageActions, EngageBlock, EngageExperience } from "@/stores/engage.store";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ExperienceBuilder } from "@/components/engage/experience-builder";
import {
  Megaphone,
  Search,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Eye,
  Loader2,
  MoreHorizontal,
  TrendingUp,
  Sliders,
  Copy,
  Zap,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

function formatDateTimeLocal(dateStr?: string | Date): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const pad = (num: number) => String(num).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function PersonalEngageContent() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const snap = useEngageSnapshot();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExperience, setEditingExperience] = useState<EngageExperience | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    category: "Desafio",
    format: "CARD" as EngageExperience["format"],
    status: "ACTIVE" as EngageExperience["status"],
    priority: "0",
    startDate: "",
    endDate: "",
    showOnlyOnce: false,
    blocks: [] as EngageBlock[],
    segmentation: {
      roles: ["STUDENT"], // Local workspace engage targets students by default
      plans: [] as string[],
      objective: "all",
    },
  });

  // Analytics Modal
  const [selectedStatsExp, setSelectedStatsExp] = useState<EngageExperience | null>(null);

  // Delete Alert
  const [expToDelete, setExpToDelete] = useState<EngageExperience | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      engageActions.fetchPersonalExperiences(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      engageActions.setFilters({
        search: searchTerm,
        category: categoryFilter,
        format: formatFilter,
        status: statusFilter,
        page: 1,
      });
      engageActions.fetchPersonalExperiences(activeWorkspaceId);
    }
  }, [searchTerm, categoryFilter, formatFilter, statusFilter, activeWorkspaceId]);

  const handleOpenCreate = () => {
    if (!activeWorkspaceId) {
      return toast.error("Selecione um workspace primeiro.");
    }
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEditingExperience(null);
    setPendingFiles({});
    setFormData({
      title: "",
      category: "Desafio",
      format: "CARD",
      status: "ACTIVE",
      priority: "0",
      startDate: formatDateTimeLocal(now),
      endDate: formatDateTimeLocal(oneWeekLater),
      showOnlyOnce: false,
      blocks: [],
      segmentation: {
        roles: ["STUDENT"],
        plans: [],
        objective: "all",
      },
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (exp: EngageExperience) => {
    setEditingExperience(exp);
    setPendingFiles({});
    setFormData({
      title: exp.title,
      category: exp.category,
      format: exp.format,
      status: exp.status,
      priority: String(exp.priority || 0),
      startDate: formatDateTimeLocal(exp.startDate),
      endDate: formatDateTimeLocal(exp.endDate),
      showOnlyOnce: exp.showOnlyOnce,
      blocks: exp.blocks || [],
      segmentation: {
        roles: exp.segmentation?.roles || ["STUDENT"],
        plans: exp.segmentation?.plans || [],
        objective: exp.segmentation?.objective || "all",
      },
    });
    setIsFormOpen(true);
  };

  const handleDuplicate = async (exp: EngageExperience) => {
    if (!activeWorkspaceId) return;
    const toastId = toast.loading("Duplicando experiência...");
    try {
      const payload = {
        title: `${exp.title} (Cópia)`,
        category: exp.category,
        format: exp.format,
        status: "DRAFT",
        priority: exp.priority,
        startDate: exp.startDate,
        endDate: exp.endDate,
        showOnlyOnce: exp.showOnlyOnce,
        blocks: exp.blocks,
        segmentation: exp.segmentation,
      };
      await engageActions.createPersonalExperience(activeWorkspaceId, payload);
      toast.success("Experiência duplicada com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar", { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    if (!formData.title.trim()) {
      return toast.error("O título é obrigatório");
    }
    if (formData.blocks.length === 0) {
      return toast.error("Adicione pelo menos um bloco de conteúdo na experiência");
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start > end) {
      return toast.error("A data de início não pode ser após a data de término");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Salvando experiência...");
    try {
      // 1. Process deferred uploads for any block image or video starting with "pending" keys
      let updatedBlocks = [...formData.blocks];
      for (let i = 0; i < updatedBlocks.length; i++) {
        const block = updatedBlocks[i];
        if (block.type === "IMAGE" && block.content.imageKey === "pending" && pendingFiles[block.id]) {
          const file = pendingFiles[block.id];

          // Request presigned URL
          const presignedRes = await fetch("/api/storage/presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
              fileSize: file.size,
              targetType: "campaign_banner",
            }),
          });

          if (!presignedRes.ok) {
            throw new Error(`Erro ao obter URL de upload para o bloco de imagem: ${file.name}`);
          }

          const { uploadUrl: putUrl, fileUrl, objectKey } = await presignedRes.json();

          // Put file to storage
          const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!putRes.ok) {
            throw new Error(`Erro ao enviar imagem ao storage para o bloco: ${file.name}`);
          }

          // Update block with the real URL and objectKey
          updatedBlocks[i] = {
            ...block,
            content: {
              ...block.content,
              imageUrl: fileUrl,
              imageKey: objectKey,
            }
          };
        } else if (block.type === "VIDEO" && block.content.videoKey === "pending" && pendingFiles[block.id]) {
          const file = pendingFiles[block.id];

          // Request presigned URL
          const presignedRes = await fetch("/api/storage/presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
              fileSize: file.size,
              targetType: "campaign_banner",
            }),
          });

          if (!presignedRes.ok) {
            throw new Error(`Erro ao obter URL de upload para o bloco de vídeo: ${file.name}`);
          }

          const { uploadUrl: putUrl, fileUrl, objectKey } = await presignedRes.json();

          // Put file to storage
          const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!putRes.ok) {
            throw new Error(`Erro ao enviar vídeo ao storage para o bloco: ${file.name}`);
          }

          // Update block with the real URL and objectKey
          updatedBlocks[i] = {
            ...block,
            content: {
              ...block.content,
              videoUrl: fileUrl,
              videoKey: objectKey,
            }
          };
        }
      }

      const payload = {
        ...formData,
        blocks: updatedBlocks,
        priority: parseInt(formData.priority) || 0,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      if (editingExperience) {
        await engageActions.updatePersonalExperience(activeWorkspaceId, editingExperience.id, payload);
        toast.success("Experiência atualizada com sucesso!", { id: toastId });
      } else {
        await engageActions.createPersonalExperience(activeWorkspaceId, payload);
        toast.success("Experiência criada com sucesso!", { id: toastId });
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!expToDelete || !activeWorkspaceId) return;
    setIsDeleting(true);
    try {
      await engageActions.deletePersonalExperience(activeWorkspaceId, expToDelete.id);
      toast.success("Experiência deletada com sucesso!");
      setIsDeleteDialogOpen(false);
      setExpToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao deletar");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!activeWorkspaceId) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="size-12 text-amber-500 mb-3 animate-bounce" />
        <h2 className="text-lg font-black tracking-tight text-foreground">Nenhum Workspace Selecionado</h2>
        <p className="text-xs text-muted-foreground max-w-sm mt-1">
          Por favor, selecione ou crie um workspace na barra superior para acessar o Engage Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            Atlas Engage Workspace Studio
          </div>
          <h1 className="text-3xl font-black tracking-tight">Experiências do Aluno</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Engaje seus alunos com avisos, desafios, novidades e cupons dentro do seu Workspace.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer"
        >
          <Plus className="size-4" /> CRIAR EXPERIÊNCIA
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="border-border/40 p-0 bg-secondary/5 shadow-none rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou categoria..."
              className="pl-9 h-10 rounded-xl border-border/40 bg-background shadow-inner text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs font-bold bg-background min-w-[150px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold text-xs">Todas Categorias</SelectItem>
                <SelectItem value="Desafio" className="font-bold text-xs">Desafio</SelectItem>
                <SelectItem value="Conteúdo" className="font-bold text-xs">Conteúdo</SelectItem>
                <SelectItem value="Dica" className="font-bold text-xs">Dica</SelectItem>
                <SelectItem value="Aviso" className="font-bold text-xs">Aviso</SelectItem>
                <SelectItem value="Pesquisa" className="font-bold text-xs">Pesquisa</SelectItem>
              </SelectContent>
            </Select>

            <Select value={formatFilter} onValueChange={setFormatFilter}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs font-bold bg-background min-w-[150px]">
                <SelectValue placeholder="Formato" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold text-xs">Todos Formatos</SelectItem>
                <SelectItem value="BANNER" className="font-bold text-xs">Banner (Inline)</SelectItem>
                <SelectItem value="CARD" className="font-bold text-xs">Card (Feed)</SelectItem>
                <SelectItem value="DRAWER" className="font-bold text-xs">Drawer (Slide-in)</SelectItem>
                <SelectItem value="MODAL" className="font-bold text-xs">Modal (Pop-up)</SelectItem>
                <SelectItem value="FULLSCREEN" className="font-bold text-xs">Fullscreen</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs font-bold bg-background min-w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold text-xs">Todos Status</SelectItem>
                <SelectItem value="ACTIVE" className="font-bold text-xs">Ativas</SelectItem>
                <SelectItem value="DRAFT" className="font-bold text-xs">Rascunhos</SelectItem>
                <SelectItem value="COMPLETED" className="font-bold text-xs">Encerradas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Experiences */}
      {snap.isLoading && snap.experiences.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="border-border/40 p-5 space-y-4 rounded-2xl">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : snap.experiences.length === 0 ? (
        <Card className="border-border/40 p-12 text-center text-muted-foreground rounded-2xl">
          <Megaphone className="size-10 mx-auto mb-3 opacity-40 text-primary" />
          <p className="text-sm font-bold uppercase tracking-wider">Nenhuma experiência no Workspace</p>
          <p className="text-xs text-muted-foreground/80 mt-1">Engaje os alunos do seu estúdio criando sua primeira experiência.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {snap.experiences.map((exp: any) => {
            const isLive = exp.status === "ACTIVE" && new Date(exp.startDate) <= new Date() && new Date(exp.endDate) >= new Date();
            return (
              <Card key={exp.id} className="border-border/40 p-0 hover:border-border/80 transition-all rounded-2xl flex flex-col justify-between overflow-hidden group shadow-sm bg-card">
                <div className="p-5 space-y-4">
                  {/* Category & Format Tags */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5 flex-wrap">
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-primary/20 bg-primary/5 text-primary">
                        {exp.category}
                      </span>
                      <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-border bg-secondary/15 text-muted-foreground">
                        {exp.format}
                      </span>
                    </div>

                    <span className={cn(
                      "text-[8px] font-bold px-2 py-0.5 rounded-full border leading-none uppercase tracking-wider",
                      exp.status === "ACTIVE" && "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
                      exp.status === "DRAFT" && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                      exp.status === "COMPLETED" && "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
                    )}>
                      {exp.status === "ACTIVE" ? (isLive ? "No Ar (Live)" : "Programada") : exp.status}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground leading-snug tracking-tight">{exp.title}</h3>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                      <Calendar className="size-3.5 text-primary" />
                      <span>{new Date(exp.startDate).toLocaleDateString()}</span>
                      <span>até</span>
                      <span>{new Date(exp.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Simple stats bar */}
                  <div className="grid grid-cols-3 gap-2 bg-secondary/10 p-3 rounded-xl border border-border/30">
                    <div className="text-center">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">Views</span>
                      <span className="text-sm font-black text-foreground">{exp.stats?.views || 0}</span>
                    </div>
                    <div className="text-center border-x border-border/30">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">Cliques</span>
                      <span className="text-sm font-black text-foreground">{exp.stats?.clicks || 0}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground block">CTR</span>
                      <span className="text-sm font-black text-emerald-500">{exp.stats?.ctr || 0}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-secondary/5 border-t border-border/30 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedStatsExp(exp)}
                    className="h-8 text-[10px] font-black gap-1 text-primary hover:bg-secondary rounded-lg"
                  >
                    <TrendingUp className="size-3.5" /> VER ANALYTICS
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8 rounded-lg hover:bg-secondary">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50">
                      <DropdownMenuItem onClick={() => handleOpenEdit(exp)} className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs">
                        <Edit2 className="size-3.5 text-primary" />
                        <span>Editar</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicate(exp)} className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs">
                        <Copy className="size-3.5 text-indigo-500" />
                        <span>Duplicar</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => { setExpToDelete(exp); setIsDeleteDialogOpen(true); }}
                        className="h-9 rounded-lg gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 font-semibold text-xs"
                      >
                        <Trash2 className="size-3.5" />
                        <span>Excluir</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl! rounded-2xl! overflow-y-auto! no-scrollbar max-h-[90vh]!">
          <DialogHeader className="border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              {editingExperience ? "Editar Experiência" : "Nova Experiência no Workspace"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título do Aviso / Desafio</Label>
                <Input
                  id="title"
                  required
                  placeholder="Ex: Desafio Queima de Natal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl h-10 border-border/60 text-xs font-semibold bg-background"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categoria</Label>
                  <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                    <SelectTrigger className="h-10 w-full rounded-xl border-border/60 font-bold text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Desafio" className="font-semibold text-xs">Desafio</SelectItem>
                      <SelectItem value="Conteúdo" className="font-semibold text-xs">Conteúdo</SelectItem>
                      <SelectItem value="Dica" className="font-semibold text-xs">Dica</SelectItem>
                      <SelectItem value="Aviso" className="font-semibold text-xs">Aviso</SelectItem>
                      <SelectItem value="Pesquisa" className="font-semibold text-xs">Pesquisa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate">Formato de Exibição</Label>
                  <Select value={formData.format} onValueChange={(val: any) => setFormData({ ...formData, format: val })}>
                    <SelectTrigger className="h-10 w-full rounded-xl border-border/60 font-bold text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="BANNER" className="font-semibold text-xs">Banner (Inline)</SelectItem>
                      <SelectItem value="CARD" className="font-semibold text-xs">Card (Feed)</SelectItem>
                      <SelectItem value="DRAWER" className="font-semibold text-xs">Drawer (Slide-in)</SelectItem>
                      <SelectItem value="MODAL" className="font-semibold text-xs">Modal (Pop-up)</SelectItem>
                      <SelectItem value="FULLSCREEN" className="font-semibold text-xs">Fullscreen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prioridade</Label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                    <SelectTrigger className="h-10 w-full rounded-xl border-border/60 font-bold text-xs bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="0" className="font-semibold text-xs text-blue-500">Baixa</SelectItem>
                      <SelectItem value="1" className="font-semibold text-xs text-amber-500">Média</SelectItem>
                      <SelectItem value="2" className="font-semibold text-xs text-rose-500 font-bold">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-border/30" />

            {/* Experience Builder Block Editor Component */}
            <ExperienceBuilder
              blocks={formData.blocks}
              onChange={(blocks) => setFormData({ ...formData, blocks })}
              format={formData.format}
              onFileSelect={(blockId, file) => {
                setPendingFiles(prev => ({ ...prev, [blockId]: file }));
              }}
            />

            <Separator className="bg-border/30" />

            {/* Target Segmentation & Schedule */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 bg-secondary/5 border border-border/40 p-4 rounded-2xl">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Sliders className="size-4" /> Segmentação de Alunos
                </Label>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground">Objetivo Físico</Label>
                    <Select
                      value={formData.segmentation.objective}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        segmentation: { ...formData.segmentation, objective: val }
                      })}
                    >
                      <SelectTrigger className="h-9 w-full rounded-lg border-border/40 text-xs font-semibold bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-xs">Todos Objetivos</SelectItem>
                        <SelectItem value="Hipertrofia" className="text-xs">Hipertrofia</SelectItem>
                        <SelectItem value="Emagrecimento" className="text-xs">Emagrecimento</SelectItem>
                        <SelectItem value="Força" className="text-xs">Força</SelectItem>
                        <SelectItem value="Resistência" className="text-xs">Resistência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-zinc-500">Planos de Alunos</Label>
                    <Input
                      placeholder="Ex: Premium, Gold (opcional)"
                      value={formData.segmentation.plans ? formData.segmentation.plans.join(", ") : ""}
                      onChange={(e) => setFormData({
                        ...formData,
                        segmentation: {
                          ...formData.segmentation,
                          plans: e.target.value.split(",").map(p => p.trim()).filter(Boolean)
                        }
                      })}
                      className="h-9 rounded-lg border-border/40 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-secondary/5 border border-border/40 p-4 rounded-2xl">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Calendar className="size-4" /> Cronograma de Veiculação
                </Label>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500">Data de Início</Label>
                    <Input
                      type="datetime-local"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="h-9 rounded-lg border-border/40 text-xs bg-background text-foreground"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-zinc-500">Data de Fim</Label>
                    <Input
                      type="datetime-local"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="h-9 rounded-lg border-border/40 text-xs bg-background text-foreground"
                    />
                  </div>
                </div>

                <Separator className="bg-border/30" />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Exibição Única</Label>
                    <p className="text-[8px] text-muted-foreground uppercase">Ocultar após primeira interação ou visualização.</p>
                  </div>
                  <Switch
                    checked={formData.showOnlyOnce}
                    onCheckedChange={(checked) => setFormData({ ...formData, showOnlyOnce: checked })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-border/30 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl h-11 px-8 font-black gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Salvando...
                  </>
                ) : editingExperience ? (
                  "Atualizar Experiência"
                ) : (
                  "Criar Experiência"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Analytics Modal Dialog */}
      <Dialog open={!!selectedStatsExp} onOpenChange={(open) => { if (!open) setSelectedStatsExp(null); }}>
        {selectedStatsExp && (
          <DialogContent className="max-w-xl rounded-2xl! p-6!">
            <DialogHeader className="border-b border-border/30 pb-4">
              <DialogTitle className="text-xl font-black tracking-tight text-foreground flex items-center gap-2">
                <TrendingUp className="size-5 text-primary animate-pulse" />
                Analytics da Experiência
              </DialogTitle>
              <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{selectedStatsExp.title}</p>
            </DialogHeader>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-6">
              <div className="bg-secondary/10 border border-border/30 p-4 rounded-xl text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Visualizações</span>
                <span className="text-2xl font-black text-foreground">{selectedStatsExp.stats?.views || 0}</span>
              </div>
              <div className="bg-secondary/10 border border-border/30 p-4 rounded-xl text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Cliques CTA</span>
                <span className="text-2xl font-black text-foreground">{selectedStatsExp.stats?.clicks || 0}</span>
              </div>
              <div className="bg-secondary/10 border border-border/30 p-4 rounded-xl text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">CTR</span>
                <span className="text-2xl font-black text-emerald-500">{selectedStatsExp.stats?.ctr || 0}%</span>
              </div>
              <div className="bg-secondary/10 border border-border/30 p-4 rounded-xl text-center">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Descartes</span>
                <span className="text-2xl font-black text-foreground">{selectedStatsExp.stats?.dismisses || 0}</span>
              </div>
            </div>

            <Separator className="bg-border/30" />

            <div className="space-y-4 pt-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Conversão de Alunos</Label>
                <p className="text-[9px] text-muted-foreground font-semibold uppercase">Participação nas atividades do seu estúdio.</p>
              </div>

              <div className="bg-secondary/5 border border-border/40 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-foreground">Participando de Desafios:</span>
                  <span className="text-foreground font-bold">{selectedStatsExp.stats?.joins || 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-muted-foreground">Metas/Treinos Concluídos:</span>
                  <span className="text-foreground font-bold">{selectedStatsExp.stats?.completions || 0}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-border/30">
              <Button type="button" onClick={() => setSelectedStatsExp(null)} className="rounded-xl font-bold w-full bg-secondary text-foreground hover:bg-secondary/80">
                Fechar Analytics
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setExpToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-red-500 flex items-center gap-2">
              <Trash2 className="size-5" /> Excluir Experiência?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-muted-foreground">
              Esta ação não poderá ser desfeita. A campanha <strong className="text-foreground">"{expToDelete?.title}"</strong> será permanentemente excluída deste Workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-2 border-0 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" /> Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function PersonalEngagePage() {
  return (
    <Suspense
      fallback={
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Carregando Engage Workspace Studio...
          </p>
        </div>
      }
    >
      <PersonalEngageContent />
    </Suspense>
  );
}
