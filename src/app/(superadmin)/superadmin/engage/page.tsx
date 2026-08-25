"use client";

import { useEffect, useState, Suspense } from "react";
import { useEngageSnapshot, engageActions, EngageBlock, EngageExperience } from "@/stores/engage.store";
import { TopBannerCarousel, EngageBannerItem, clearBannerMemoryCache } from "@/components/application/top-banner-carousel";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ExperienceBuilder } from "@/components/engage/experience-builder";
import { PushNotificationsStudio } from "@/components/engage/push-notifications-studio";
import {
  Megaphone,
  Search,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Loader2,
  MoreHorizontal,
  TrendingUp,
  Sliders,
  Copy,
  Sparkles,
  Layers,
  LayoutGrid,
  Image as ImageIcon,
  Upload,
  UserCheck,
  GraduationCap,
  BellRing
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

function EngageContent() {
  const snap = useEngageSnapshot();
  const [activeStudioTab, setActiveStudioTab] = useState<"EXPERIENCES" | "BANNERS" | "PUSH">("EXPERIENCES");

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingExperience, setEditingExperience] = useState<EngageExperience | null>(null);
  const [pendingFiles, setPendingFiles] = useState<Record<string, File>>({});

  const [formData, setFormData] = useState({
    title: "",
    category: "Aviso",
    format: "MODAL" as EngageExperience["format"],
    status: "ACTIVE" as EngageExperience["status"],
    priority: "0",
    startDate: "",
    endDate: "",
    showOnlyOnce: false,
    blocks: [] as EngageBlock[],
    segmentation: {
      roles: ["ALL"],
      plans: [] as string[],
      objective: "all",
    },
  });

  const [selectedStatsExp, setSelectedStatsExp] = useState<EngageExperience | null>(null);
  const [expToDelete, setExpToDelete] = useState<EngageExperience | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [banners, setBanners] = useState<EngageBannerItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [isSubmittingBanner, setIsSubmittingBanner] = useState(false);
  const [editingBanner, setEditingBanner] = useState<EngageBannerItem | null>(null);
  const [bannerToDelete, setBannerToDelete] = useState<EngageBannerItem | null>(null);
  const [isDeleteBannerDialogOpen, setIsDeleteBannerDialogOpen] = useState(false);
  const [isDeletingBanner, setIsDeletingBanner] = useState(false);
  const [bannerImageFile, setBannerImageFile] = useState<File | null>(null);
  const [previewImageSrc, setPreviewImageSrc] = useState<string>("");

  const [bannerFormData, setBannerFormData] = useState({
    title: "",
    linkUrl: "",
    imageUrl: "",
    targetRole: "ALL",
    isActive: true,
    sortOrder: "0",
  });

  useEffect(() => {
    engageActions.fetchSuperadminExperiences();
    fetchSuperadminBanners();
  }, []);

  useEffect(() => {
    engageActions.setFilters({
      search: searchTerm,
      category: categoryFilter,
      format: formatFilter,
      status: statusFilter,
      page: 1,
    });
    engageActions.fetchSuperadminExperiences();
  }, [searchTerm, categoryFilter, formatFilter, statusFilter]);

  const fetchSuperadminBanners = async () => {
    setLoadingBanners(true);
    try {
      const res = await fetch("/api/superadmin/banners");
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
        clearBannerMemoryCache();
      }
    } catch (err) {
      console.error("Fetch banners error:", err);
    } finally {
      setLoadingBanners(false);
    }
  };

  const handleOpenCreate = () => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEditingExperience(null);
    setPendingFiles({});
    setFormData({
      title: "",
      category: "Aviso",
      format: "MODAL",
      status: "ACTIVE",
      priority: "0",
      startDate: formatDateTimeLocal(now),
      endDate: formatDateTimeLocal(oneWeekLater),
      showOnlyOnce: false,
      blocks: [],
      segmentation: {
        roles: ["ALL"],
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
        roles: exp.segmentation?.roles || ["ALL"],
        plans: exp.segmentation?.plans || [],
        objective: exp.segmentation?.objective || "all",
      },
    });
    setIsFormOpen(true);
  };

  const handleDuplicate = async (exp: EngageExperience) => {
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
      await engageActions.createSuperadminExperience(payload);
      toast.success("Experiência duplicada com sucesso!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar", { id: toastId });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      let updatedBlocks = [...formData.blocks];
      for (let i = 0; i < updatedBlocks.length; i++) {
        const block = updatedBlocks[i];
        if (block.type === "IMAGE" && block.content.imageKey === "pending" && pendingFiles[block.id]) {
          const file = pendingFiles[block.id];
          let fileToUpload = file;
          try {
            fileToUpload = await compressImage(file);
          } catch (err) {
            console.warn("Failing compression, uploading original:", err);
          }

          const presignedRes = await fetch("/api/storage/presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: fileToUpload.name,
              contentType: fileToUpload.type,
              fileSize: fileToUpload.size,
              targetType: "campaign_banner",
            }),
          });

          if (!presignedRes.ok) {
            throw new Error(`Erro ao obter URL de upload para a imagem: ${file.name}`);
          }

          const { uploadUrl: putUrl, fileUrl, objectKey } = await presignedRes.json();
          const putRes = await fetch(putUrl, {
            method: "PUT",
            headers: { "Content-Type": fileToUpload.type },
            body: fileToUpload,
          });

          if (!putRes.ok) {
            throw new Error(`Erro ao enviar imagem ao storage: ${file.name}`);
          }

          updatedBlocks[i] = {
            ...block,
            content: {
              ...block.content,
              imageUrl: fileUrl,
              imageKey: objectKey,
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
        await engageActions.updateSuperadminExperience(editingExperience.id, payload);
        toast.success("Experiência atualizada com sucesso!", { id: toastId });
      } else {
        await engageActions.createSuperadminExperience(payload);
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
    if (!expToDelete) return;
    setIsDeleting(true);
    try {
      await engageActions.deleteSuperadminExperience(expToDelete.id);
      toast.success("Experiência deletada com sucesso!");
      setIsDeleteDialogOpen(false);
      setExpToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao deletar");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCreateBanner = () => {
    setEditingBanner(null);
    setBannerImageFile(null);
    setPreviewImageSrc("");
    setBannerFormData({
      title: "",
      linkUrl: "",
      imageUrl: "",
      targetRole: "ALL",
      isActive: true,
      sortOrder: "0",
    });
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (b: EngageBannerItem) => {
    setEditingBanner(b);
    setBannerImageFile(null);
    setPreviewImageSrc(b.imageUrl || "");
    setBannerFormData({
      title: b.title || "",
      linkUrl: b.linkUrl || "",
      imageUrl: b.imageUrl || "",
      targetRole: b.targetRole || "ALL",
      isActive: b.isActive ?? true,
      sortOrder: String(b.sortOrder || 0),
    });
    setIsBannerModalOpen(true);
  };

  const handleBannerImageUpload = async (file: File): Promise<string> => {
    let fileToUpload = file;
    try {
      fileToUpload = await compressImage(file);
    } catch (err) {
      console.warn("Failing compression, uploading original:", err);
    }

    const presignedRes = await fetch("/api/storage/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: fileToUpload.name,
        contentType: fileToUpload.type,
        fileSize: fileToUpload.size,
        targetType: "campaign_banner",
      }),
    });

    if (!presignedRes.ok) {
      throw new Error(`Erro ao obter URL de upload: ${file.name}`);
    }

    const { uploadUrl: putUrl, fileUrl } = await presignedRes.json();
    const putRes = await fetch(putUrl, {
      method: "PUT",
      headers: { "Content-Type": fileToUpload.type },
      body: fileToUpload,
    });

    if (!putRes.ok) {
      throw new Error(`Erro ao enviar arquivo para o Cloudflare: ${file.name}`);
    }

    return fileUrl;
  };

  const handleSubmitBanner = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalImageUrl = bannerFormData.imageUrl;

    if (bannerImageFile) {
      const toastUploadId = toast.loading("Enviando imagem do banner para o Cloudflare...");
      try {
        finalImageUrl = await handleBannerImageUpload(bannerImageFile);
        toast.dismiss(toastUploadId);
      } catch (err: any) {
        toast.error(err.message || "Erro no upload da imagem", { id: toastUploadId });
        return;
      }
    }

    if (!finalImageUrl) {
      return toast.error("Selecione uma imagem para o banner");
    }

    setIsSubmittingBanner(true);
    const toastId = toast.loading("Salvando banner...");
    try {
      const payload = {
        imageUrl: finalImageUrl,
        title: bannerFormData.title,
        linkUrl: bannerFormData.linkUrl,
        targetRole: bannerFormData.targetRole,
        isActive: bannerFormData.isActive,
        sortOrder: bannerFormData.sortOrder,
      };

      const url = editingBanner ? `/api/superadmin/banners/${editingBanner.id}` : "/api/superadmin/banners";
      const method = editingBanner ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erro ao salvar banner");
      }

      toast.success(editingBanner ? "Banner atualizado com sucesso!" : "Banner criado com sucesso!", { id: toastId });
      setIsBannerModalOpen(false);
      fetchSuperadminBanners();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar banner", { id: toastId });
    } finally {
      setIsSubmittingBanner(false);
    }
  };

  const handleDeleteBannerConfirm = async () => {
    if (!bannerToDelete) return;
    setIsDeletingBanner(true);
    try {
      const res = await fetch(`/api/superadmin/banners/${bannerToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao deletar banner");

      toast.success("Banner deletado com sucesso!");
      setIsDeleteBannerDialogOpen(false);
      setBannerToDelete(null);
      fetchSuperadminBanners();
    } catch (err: any) {
      toast.error(err.message || "Erro ao deletar");
    } finally {
      setIsDeletingBanner(false);
    }
  };

  const handleToggleBannerActive = async (b: EngageBannerItem) => {
    try {
      const res = await fetch(`/api/superadmin/banners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (res.ok) {
        toast.success(b.isActive ? "Banner desativado" : "Banner ativado");
        fetchSuperadminBanners();
      }
    } catch {
      toast.error("Erro ao alterar status do banner");
    }
  };

  const personalPreviewBanners = banners.filter(b => b.isActive && (b.targetRole === "ALL" || b.targetRole === "PERSONAL"));
  const studentPreviewBanners = banners.filter(b => b.isActive && (b.targetRole === "ALL" || b.targetRole === "STUDENT"));

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 border-b border-border/40 pb-6 md:pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Megaphone className="size-4 animate-pulse" />
            Atlas Engage Studio
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Comunicação e Banners</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium">
            Gerencie imagens de banners para o topo do aplicativo e pop-ups segmentados.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-secondary/40 p-1 rounded-xl flex items-center border border-border/40 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveStudioTab("EXPERIENCES")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeStudioTab === "EXPERIENCES" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="size-3.5" />
              Pop-ups e Modais
            </button>
            <button
              onClick={() => setActiveStudioTab("BANNERS")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeStudioTab === "BANNERS" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ImageIcon className="size-3.5" />
              Banners Topo ({banners.length})
            </button>
            <button
              onClick={() => setActiveStudioTab("PUSH")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
                activeStudioTab === "PUSH" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <BellRing className="size-3.5 text-primary" />
              Notificações Push
            </button>
          </div>

          {activeStudioTab === "EXPERIENCES" ? (
            <Button
              onClick={handleOpenCreate}
              className="h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Plus className="size-4" /> CRIAR EXPERIÊNCIA
            </Button>
          ) : activeStudioTab === "BANNERS" ? (
            <Button
              onClick={handleOpenCreateBanner}
              className="h-10! rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer"
            >
              <Upload className="size-4" /> Subir banner
            </Button>
          ) : null}
        </div>
      </div>

      {activeStudioTab === "PUSH" ? (
        <PushNotificationsStudio />
      ) : activeStudioTab === "BANNERS" ? (
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                  Preview dos Banners em Tempo Real
                </h2>
                <p className="text-xs text-muted-foreground font-medium">
                  Imagens subidas para o Cloudflare com transição de 3 segundos nas telas do Personal e do Aluno.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/60 bg-card p-5 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="size-4 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Preview · Visão do Personal</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {personalPreviewBanners.length} banners ativos
                  </span>
                </div>
                <div className="bg-background/80 p-3 rounded-2xl border border-border/40">
                  <TopBannerCarousel role="PERSONAL" customBanners={personalPreviewBanners} isPreview={true} />
                </div>
              </Card>

              {/* Preview Aluno */}
              <Card className="border-border/60 bg-card p-5 rounded-3xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="size-4 text-emerald-500" />
                    <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Preview · Visão do Aluno</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    {studentPreviewBanners.length} banners ativos
                  </span>
                </div>
                <div className="bg-background/80 p-3 rounded-2xl border border-border/40">
                  <TopBannerCarousel role="STUDENT" customBanners={studentPreviewBanners} isPreview={true} />
                </div>
              </Card>
            </div>
          </div>

          <Separator className="bg-border/40" />

          {/* Section: Banners Grid & List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                <Layers className="size-4 text-primary" /> Imagens de Banners Cadastradas
              </h2>
            </div>

            {loadingBanners ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <Card key={idx} className="border-border/40 p-5 space-y-4 rounded-2xl">
                    <Skeleton className="h-32 w-full rounded-xl" />
                  </Card>
                ))}
              </div>
            ) : banners.length === 0 ? (
              <Card className="border-border/40 p-12 text-center text-muted-foreground rounded-2xl">
                <ImageIcon className="size-10 mx-auto mb-3 opacity-40 text-primary" />
                <p className="text-sm font-bold uppercase tracking-wider">Nenhum banner enviado</p>
                <p className="text-xs text-muted-foreground/80 mt-1">Faça upload da imagem do banner clicando no botão "Subir Banner".</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((b) => (
                  <Card key={b.id} className={cn("border-border/40 p-0 hover:border-border/80 transition-all rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm bg-card", !b.isActive && "opacity-60")}>
                    <div className="relative aspect-video w-full overflow-hidden bg-secondary/10">
                      <img src={b.imageUrl} alt={b.title || "Banner"} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-border bg-background/80 backdrop-blur-md text-foreground shadow-sm">
                          {b.targetRole === "PERSONAL" ? "Apenas Personal" : b.targetRole === "STUDENT" ? "Apenas Aluno" : "Para Todos"}
                        </span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <Switch
                          checked={b.isActive}
                          onCheckedChange={() => handleToggleBannerActive(b)}
                        />
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      {b.title && (
                        <h3 className="text-sm font-bold text-foreground leading-snug">{b.title}</h3>
                      )}
                      {b.linkUrl ? (
                        <div className="text-[10px] font-mono text-muted-foreground truncate bg-secondary/20 p-2 rounded-lg border border-border/30">
                          Link: {b.linkUrl}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Sem link de clique</span>
                      )}
                    </div>

                    <div className="p-3 bg-secondary/5 border-t border-border/30 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-muted-foreground">Ordem: #{b.sortOrder || 0}</span>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditBanner(b)}
                          className="h-8 text-xs font-bold gap-1 rounded-lg hover:bg-secondary text-primary"
                        >
                          <Edit2 className="size-3.5" /> Editar
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setBannerToDelete(b); setIsDeleteBannerDialogOpen(true); }}
                          className="h-8 text-xs font-bold gap-1 rounded-lg hover:bg-red-500/10 text-red-500"
                        >
                          <Trash2 className="size-3.5" /> Excluir
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
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
                    <SelectItem value="Aviso" className="font-bold text-xs">Aviso</SelectItem>
                    <SelectItem value="Conteúdo" className="font-bold text-xs">Conteúdo</SelectItem>
                    <SelectItem value="Desafio" className="font-bold text-xs">Desafio</SelectItem>
                    <SelectItem value="Pesquisa" className="font-bold text-xs">Pesquisa</SelectItem>
                    <SelectItem value="Sistema" className="font-bold text-xs">Sistema</SelectItem>
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
              <p className="text-sm font-bold uppercase tracking-wider">Nenhuma experiência cadastrada</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Crie experiências interativas clicando no botão "Criar Experiência".</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {snap.experiences.map((exp: any) => {
                const isLive = exp.status === "ACTIVE" && new Date(exp.startDate) <= new Date() && new Date(exp.endDate) >= new Date();
                return (
                  <Card key={exp.id} className="border-border/40 p-0 hover:border-border/80 transition-all rounded-2xl flex flex-col justify-between overflow-hidden group shadow-sm bg-card">
                    <div className="p-5 space-y-4">
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
        </>
      )}

      {/* Simplified Banner Upload Modal */}
      <Dialog open={isBannerModalOpen} onOpenChange={setIsBannerModalOpen}>
        <DialogContent className="max-w-2xl! w-full rounded-2xl! overflow-y-auto! max-h-[90vh]">
          <DialogHeader className="border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              <Upload className="size-5 text-primary" />
              {editingBanner ? "Editar Banner" : "Subir Imagem de Banner"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitBanner} className="space-y-5 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Arquivo de Imagem do Banner
              </Label>
              <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border/60 rounded-2xl bg-secondary/10 hover:border-primary/50 transition-colors">
                {previewImageSrc ? (
                  <div className="space-y-3 w-full">
                    <img src={previewImageSrc} alt="Preview Banner" className="w-full h-36 object-cover rounded-xl border border-border" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBannerImageFile(null);
                        setPreviewImageSrc("");
                        setBannerFormData({ ...bannerFormData, imageUrl: "" });
                      }}
                      className="w-full text-xs font-bold rounded-xl"
                    >
                      Trocar Imagem
                    </Button>
                  </div>
                ) : (
                  <div className="text-center space-y-2">
                    <ImageIcon className="size-10 mx-auto text-muted-foreground opacity-50" />
                    <p className="text-xs font-bold text-foreground">Clique ou arraste a imagem do banner</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Formatos suportados: PNG, JPG, WEBP</p>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBannerImageFile(file);
                          setPreviewImageSrc(URL.createObjectURL(file));
                        }
                      }}
                      className="mt-2 text-xs rounded-xl cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bannerTitle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Identificador / Título Interno (Opcional)
              </Label>
              <Input
                id="bannerTitle"
                placeholder="Ex: Banner Campanha Atlas Pay"
                value={bannerFormData.title}
                onChange={(e) => setBannerFormData({ ...bannerFormData, title: e.target.value })}
                className="rounded-xl h-10 border-border/60 text-xs font-semibold bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkUrl" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Link de Destino ao Clicar (Opcional)
              </Label>
              <Input
                id="linkUrl"
                placeholder="Ex: /personal/wallet ou https://..."
                value={bannerFormData.linkUrl}
                onChange={(e) => setBannerFormData({ ...bannerFormData, linkUrl: e.target.value })}
                className="rounded-xl h-10 border-border/60 text-xs bg-background"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Público-Alvo (Nível)</Label>
                <Select
                  value={bannerFormData.targetRole}
                  onValueChange={(val) => setBannerFormData({ ...bannerFormData, targetRole: val })}
                >
                  <SelectTrigger className="h-10 w-full rounded-xl border-border/60 font-bold text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="font-semibold text-xs">Todos os Níveis (Personal & Aluno)</SelectItem>
                    <SelectItem value="PERSONAL" className="font-semibold text-xs">Apenas Personal</SelectItem>
                    <SelectItem value="STUDENT" className="font-semibold text-xs">Apenas Aluno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sortOrder" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ordem de Exibição</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  placeholder="0"
                  value={bannerFormData.sortOrder}
                  onChange={(e) => setBannerFormData({ ...bannerFormData, sortOrder: e.target.value })}
                  className="rounded-xl h-10 border-border/60 text-xs font-semibold bg-background"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/30">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold">Status do Banner</Label>
                <p className="text-[10px] text-muted-foreground">Ativar para exibir no carrossel de 3s.</p>
              </div>
              <Switch
                checked={bannerFormData.isActive}
                onCheckedChange={(checked) => setBannerFormData({ ...bannerFormData, isActive: checked })}
              />
            </div>

            <DialogFooter className="pt-6 border-t border-border/30 gap-2">
              <Button type="button" variant="ghost" onClick={() => setIsBannerModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
              <Button
                type="submit"
                disabled={isSubmittingBanner}
                className="rounded-xl h-11 px-8 font-black gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {isSubmittingBanner ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Enviando ao Cloudflare...
                  </>
                ) : editingBanner ? (
                  "Atualizar Banner"
                ) : (
                  "Salvar Banner"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Experience Create / Edit Dialog Form */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-4xl! rounded-2xl! overflow-y-auto! max-h-[90vh]!">
          <DialogHeader className="border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              {editingExperience ? "Editar Experiência" : "Nova Experiência Engage"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Título de Referência</Label>
                <Input
                  id="title"
                  required
                  placeholder="Ex: Desafio de Hábitos Saudáveis"
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
                      <SelectItem value="Aviso" className="font-semibold text-xs">Aviso</SelectItem>
                      <SelectItem value="Conteúdo" className="font-semibold text-xs">Conteúdo</SelectItem>
                      <SelectItem value="Desafio" className="font-semibold text-xs">Desafio</SelectItem>
                      <SelectItem value="Pesquisa" className="font-semibold text-xs">Pesquisa</SelectItem>
                      <SelectItem value="Sistema" className="font-semibold text-xs">Sistema</SelectItem>
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

            <ExperienceBuilder
              blocks={formData.blocks}
              onChange={(blocks) => setFormData({ ...formData, blocks })}
              format={formData.format}
              onFileSelect={(blockId, file) => {
                setPendingFiles(prev => ({ ...prev, [blockId]: file }));
              }}
              isAdmin={true}
            />

            <Separator className="bg-border/30" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4 bg-secondary/5 border border-border/40 p-4 rounded-2xl">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1.5">
                  <Sliders className="size-4" /> Segmentação Avançada
                </Label>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-muted-foreground">Público-Alvo (Role)</Label>
                    <Select
                      value={formData.segmentation.roles[0] || "ALL"}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        segmentation: {
                          ...formData.segmentation,
                          roles: [val],
                          objective: val === "PERSONAL" ? "all" : formData.segmentation.objective
                        }
                      })}
                    >
                      <SelectTrigger className="h-9 rounded-lg w-full border-border/40 text-xs font-semibold bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL" className="text-xs">Todos Usuários</SelectItem>
                        <SelectItem value="PERSONAL" className="text-xs">Apenas Personais</SelectItem>
                        <SelectItem value="STUDENT" className="text-xs">Apenas Alunos</SelectItem>
                      </SelectContent>
                    </Select>
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
                Métricas da Experiência
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

            <DialogFooter className="pt-6 border-t border-border/30">
              <Button type="button" onClick={() => setSelectedStatsExp(null)} className="rounded-xl font-bold w-full bg-secondary text-foreground hover:bg-secondary/80">
                Fechar Analytics
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Delete Experience Alert */}
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
              Esta ação não poderá ser desfeita. A campanha <strong className="text-foreground">"{expToDelete?.title}"</strong> será permanentemente excluída.
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

      {/* Delete Banner Alert */}
      <AlertDialog
        open={isDeleteBannerDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteBannerDialogOpen(false);
            setBannerToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-red-500 flex items-center gap-2">
              <Trash2 className="size-5" /> Excluir Banner?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-muted-foreground">
              Esta ação não poderá ser desfeita. O banner será permanentemente removido das telas dos usuários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingBanner} className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingBanner}
              onClick={(e) => { e.preventDefault(); handleDeleteBannerConfirm(); }}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-2 border-0 cursor-pointer"
            >
              {isDeletingBanner ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" /> Excluir Banner
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function SuperadminEngagePage() {
  return (
    <Suspense
      fallback={
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Carregando Engage Studio...
          </p>
        </div>
      }
    >
      <EngageContent />
    </Suspense>
  );
}
