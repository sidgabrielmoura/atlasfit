"use client";

import { useEffect, useState, Suspense } from "react";
import { useSuperAdminSnapshot, superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Megaphone,
  Search,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Eye,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  ToggleLeft,
  ToggleRight,
  MoreHorizontal,
  Upload
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Format Date for datetime-local input (yyyy-MM-ddThh:mm)
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
  return `${year}-${month}-${day}T${hours}-${minutes}`.replace("T", "T").substring(0, 16);
}

function CampaignsContent() {
  const snap = useSuperAdminSnapshot();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState("all");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null);
  const [imageInputType, setImageInputType] = useState<"file" | "url">("url");
  const [urlVal, setUrlVal] = useState("");
  const [filePreview, setFilePreview] = useState("");
  const [campaignFileObj, setCampaignFileObj] = useState<File | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    imageUrl: "",
    imageKey: "",
    type: "ANNOUNCEMENT",
    targetRole: "ALL",
    startDate: "",
    endDate: "",
    buttonText: "",
    buttonLink: "",
    showOnlyOnce: false,
    isActive: true,
    priority: "0",
  });

  const [campaignToDelete, setCampaignToDelete] = useState<any | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    superAdminActions.fetchCampaigns();
  }, []);

  // Set page filters
  useEffect(() => {
    superAdminActions.setCampaignFilters({
      search: searchTerm,
      type: typeFilter,
      targetRole: targetFilter,
      isActive: activeFilter,
      page: 1, // Reset to first page on filter
    });
  }, [searchTerm, typeFilter, targetFilter, activeFilter]);

  const handleOpenCreate = () => {
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setEditingCampaign(null);
    setImageInputType("url");
    setUrlVal("");
    setFilePreview("");
    setCampaignFileObj(null);
    setFormData({
      title: "",
      description: "",
      imageUrl: "",
      imageKey: "",
      type: "ANNOUNCEMENT",
      targetRole: "ALL",
      startDate: formatDateTimeLocal(now),
      endDate: formatDateTimeLocal(oneWeekLater),
      buttonText: "",
      buttonLink: "",
      showOnlyOnce: false,
      isActive: true,
      priority: "0",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (campaign: any) => {
    setEditingCampaign(campaign);
    const imgUrl = campaign.imageUrl || "";
    setCampaignFileObj(null);
    if (imgUrl.startsWith("data:")) {
      setImageInputType("file");
      setFilePreview(imgUrl);
      setUrlVal("");
    } else {
      setImageInputType("url");
      setUrlVal(imgUrl);
      setFilePreview("");
    }
    setFormData({
      title: campaign.title,
      description: campaign.description,
      imageUrl: imgUrl,
      imageKey: campaign.imageKey || "",
      type: campaign.type,
      targetRole: campaign.targetRole,
      startDate: formatDateTimeLocal(campaign.startDate),
      endDate: formatDateTimeLocal(campaign.endDate),
      buttonText: campaign.buttonText || "",
      buttonLink: campaign.buttonLink || "",
      showOnlyOnce: campaign.showOnlyOnce,
      isActive: campaign.isActive,
      priority: String(campaign.priority || 0),
    });
    setIsFormOpen(true);
  };

  const toggleImageInputType = (type: "file" | "url") => {
    setImageInputType(type);
    if (type === "url") {
      setFormData((prev) => ({ ...prev, imageUrl: urlVal }));
    } else {
      setFormData((prev) => ({ ...prev, imageUrl: filePreview }));
    }
  };

  const handleUrlChange = (val: string) => {
    setUrlVal(val);
    setFormData((prev) => ({ ...prev, imageUrl: val }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCampaignFileObj(file);
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
      setFormData((prev) => ({ ...prev, imageUrl: previewUrl }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations (HTTPS checks, empty values)
    if (!formData.title.trim()) {
      return toast.error("O título é obrigatório");
    }
    if (!formData.description.trim()) {
      return toast.error("A descrição é obrigatória");
    }
    if (formData.imageUrl) {
      const trimmedUrl = formData.imageUrl.trim();
      const isBlob = trimmedUrl.startsWith("blob:");
      const isHttps = trimmedUrl.startsWith("https://");
      if (!isBlob && !isHttps) {
        return toast.error("A Imagem deve ser uma URL HTTPS (https://) ou um arquivo de imagem válido");
      }
    }
    if (formData.buttonLink && !formData.buttonLink.trim().startsWith("https://")) {
      return toast.error("A URL do Botão (CTA) deve usar o protocolo HTTPS (https://)");
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start > end) {
      return toast.error("A data de início não pode ser maior que a data de término");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Salvando campanha...");
    try {
      let finalImageUrl = formData.imageUrl.trim() || null;
      let finalImageKey = formData.imageKey || null;

      if (imageInputType === "file" && campaignFileObj) {
        // 1. Get presigned URL
        const presignedRes = await fetch("/api/storage/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: campaignFileObj.name,
            contentType: campaignFileObj.type,
            fileSize: campaignFileObj.size,
            targetType: "campaign_banner",
          }),
        });

        if (!presignedRes.ok) {
          const txt = await presignedRes.text();
          throw new Error(txt || "Erro ao obter URL de upload.");
        }

        const { uploadUrl: putUrl, fileUrl, objectKey } = await presignedRes.json();

        // 2. Put file to R2
        const putRes = await fetch(putUrl, {
          method: "PUT",
          headers: { "Content-Type": campaignFileObj.type },
          body: campaignFileObj,
        });

        if (!putRes.ok) {
          throw new Error("Erro ao transferir arquivo para o storage.");
        }

        finalImageUrl = fileUrl;
        finalImageKey = objectKey;
      }

      const payload = {
        ...formData,
        imageUrl: finalImageUrl,
        imageKey: finalImageKey,
        buttonText: formData.buttonText.trim() || null,
        buttonLink: formData.buttonLink.trim() || null,
        priority: parseInt(formData.priority) || 0,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      if (editingCampaign) {
        await superAdminActions.updateCampaign(editingCampaign.id, payload);
        toast.success("Campanha atualizada com sucesso!", { id: toastId });
      } else {
        await superAdminActions.createCampaign(payload);
        toast.success("Campanha criada com sucesso!", { id: toastId });
      }
      setCampaignFileObj(null);
      setIsFormOpen(false);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar a campanha", { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (campaign: any) => {
    try {
      await superAdminActions.updateCampaign(campaign.id, {
        isActive: !campaign.isActive,
      });
      toast.success(
        `Campanha ${campaign.isActive ? "desativada" : "ativada"} com sucesso!`
      );
    } catch (error: any) {
      toast.error(error.message || "Erro ao alternar status da campanha");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    try {
      await superAdminActions.deleteCampaign(campaignToDelete.id);
      toast.success("Campanha deletada com sucesso!");
      setIsDeleteDialogOpen(false);
      setCampaignToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Erro ao deletar campanha.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Megaphone className="size-4" />
            Marketing & Comunicação
          </div>
          <h1 className="text-3xl font-black tracking-tight">Campanhas e Avisos</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Gerencie avisos de manutenção, atualizações e promoções para perfis específicos de usuários.
          </p>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        >
          <Plus className="size-4" /> NOVA CAMPANHA
        </Button>
      </div>

      {/* 2. Filter Bar */}
      <Card className="border-border/40 bg-secondary/5 shadow-none rounded-2xl">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou descrição..."
              className="pl-9 h-10 rounded-xl border-border/40 bg-background shadow-inner text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Filter by Campaign Type */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs font-bold bg-background min-w-[150px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40">
                <SelectItem value="all" className="font-bold text-xs">Todos os Tipos</SelectItem>
                <SelectItem value="PROMOTION" className="font-bold text-xs">Promoção</SelectItem>
                <SelectItem value="ANNOUNCEMENT" className="font-bold text-xs">Aviso</SelectItem>
                <SelectItem value="UPDATE" className="font-bold text-xs">Atualização</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter by Target Role */}
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs font-bold bg-background min-w-[150px]">
                <SelectValue placeholder="Público Alvo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40">
                <SelectItem value="all" className="font-bold text-xs">Todos Públicos</SelectItem>
                <SelectItem value="ALL" className="font-bold text-xs">Todos Usuários</SelectItem>
                <SelectItem value="PERSONAL" className="font-bold text-xs">Personais</SelectItem>
                <SelectItem value="STUDENT" className="font-bold text-xs">Alunos</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter by Active Status */}
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger className="h-10 rounded-xl border-border/60 text-xs font-bold bg-background min-w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40">
                <SelectItem value="all" className="font-bold text-xs">Todos Status</SelectItem>
                <SelectItem value="true" className="font-bold text-xs">Ativos</SelectItem>
                <SelectItem value="false" className="font-bold text-xs">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 3. Table of Campaigns */}
      <Card className="border-border/40 p-0 shadow-sm overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-secondary/10 border-b border-border/40">
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[220px]">Título / Tipo</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Público Alvo</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[240px]">Período de Exibição</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center w-[100px]">Prioridade</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center w-[120px]">Apenas uma vez</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-[120px]">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {snap.isLoading && snap.campaigns.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-40" /></td>
                    <td className="px-6 py-5 text-center"><Skeleton className="h-4 w-10 mx-auto" /></td>
                    <td className="px-6 py-5 text-center"><Skeleton className="h-4 w-10 mx-auto" /></td>
                    <td className="px-6 py-5"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-5 text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : snap.campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">
                    <Megaphone className="size-8 mx-auto mb-3 text-muted-foreground/60" />
                    <p className="text-sm font-bold uppercase tracking-wider">Nenhuma campanha cadastrada</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Crie campanhas clicando em "Nova Campanha".</p>
                  </td>
                </tr>
              ) : (
                snap.campaigns.map((campaign: any) => {
                  const now = new Date();
                  const isScheduledActive =
                    new Date(campaign.startDate) <= now &&
                    new Date(campaign.endDate) >= now;

                  return (
                    <tr
                      key={campaign.id}
                      className={cn(
                        "hover:bg-secondary/20 transition-colors group",
                        !campaign.isActive && "opacity-60"
                      )}
                    >
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1.5 max-w-[280px]">
                          <span className="text-xs font-bold leading-tight truncate">
                            {campaign.title}
                          </span>
                          <span
                            className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded border w-fit leading-none uppercase tracking-wider",
                              campaign.type === "PROMOTION" &&
                              "bg-amber-500/10 text-amber-500 border-amber-500/20",
                              campaign.type === "ANNOUNCEMENT" &&
                              "bg-rose-500/10 text-rose-500 border-rose-500/20",
                              campaign.type === "UPDATE" &&
                              "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}
                          >
                            {campaign.type === "PROMOTION" && "Promoção"}
                            {campaign.type === "ANNOUNCEMENT" && "Aviso"}
                            {campaign.type === "UPDATE" && "Atualização"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-semibold text-foreground">
                          {campaign.targetRole === "ALL" && "Todos Usuários"}
                          {campaign.targetRole === "PERSONAL" && "Personais"}
                          {campaign.targetRole === "STUDENT" && "Alunos"}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="size-3 shrink-0 text-primary" />
                            <span className="font-bold">
                              {new Date(campaign.startDate).toLocaleDateString()}
                            </span>
                            <span className="text-[10px]">
                              {new Date(campaign.startDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-4.5">
                            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase">
                              Até:
                            </span>
                            <span className="font-bold">
                              {new Date(campaign.endDate).toLocaleDateString()}
                            </span>
                            <span className="text-[10px]">
                              {new Date(campaign.endDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center text-xs font-black">
                        {campaign.priority || 0}
                      </td>
                      <td className="px-6 py-5 text-center text-xs">
                        {campaign.showOnlyOnce ? (
                          <span className="text-primary font-bold">Sim</span>
                        ) : (
                          <span className="text-muted-foreground/50">Não</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "text-[9px] font-bold px-2 py-0.5 rounded-full border w-fit leading-none uppercase tracking-wider text-center",
                              campaign.isActive
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {campaign.isActive ? "Ativo" : "Inativo"}
                          </span>
                          {campaign.isActive && (
                            <span
                              className={cn(
                                "text-[8px] font-semibold leading-none",
                                isScheduledActive
                                  ? "text-emerald-500"
                                  : "text-amber-500"
                              )}
                            >
                              {isScheduledActive ? "Na data" : "Fora da data"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 rounded-lg hover:bg-secondary"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50">
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(campaign)}
                              className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs"
                            >
                              <Edit2 className="size-3.5 text-primary" />
                              <span>Editar Campanha</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() => handleToggleActive(campaign)}
                              className="h-9 rounded-lg gap-2 cursor-pointer font-semibold text-xs"
                            >
                              {campaign.isActive ? (
                                <>
                                  <ToggleLeft className="size-3.5 text-muted-foreground" />
                                  <span>Desativar</span>
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="size-3.5 text-emerald-500" />
                                  <span>Ativar</span>
                                </>
                              )}
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setCampaignToDelete(campaign);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="h-9 rounded-lg gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10 font-semibold text-xs"
                            >
                              <Trash2 className="size-3.5" />
                              <span>Excluir Campanha</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {snap.campaignPagination.pages > 1 && (
          <div className="p-4 bg-secondary/5 border-t border-border/30 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold">
              Total: {snap.campaignPagination.total} campanhas
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={snap.campaignFilters.page <= 1 || snap.isLoading}
                onClick={() =>
                  superAdminActions.setCampaignFilters({
                    page: snap.campaignFilters.page - 1,
                  })
                }
                className="rounded-lg h-8 text-xs font-bold"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={
                  snap.campaignFilters.page >= snap.campaignPagination.pages ||
                  snap.isLoading
                }
                onClick={() =>
                  superAdminActions.setCampaignFilters({
                    page: snap.campaignFilters.page + 1,
                  })
                }
                className="rounded-lg h-8 text-xs font-bold"
              >
                Próximo
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl rounded-2xl! overflow-y-auto! max-h-[90vh]!">
          <DialogHeader className="border-b border-border/30 pb-4">
            <DialogTitle className="text-xl font-black tracking-tight flex items-center gap-2">
              {editingCampaign ? "Editar Campanha" : "Nova Campanha de Avisos"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-6">
              {/* Group 1: Content Details */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">1. Conteúdo da Campanha</span>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Defina o texto principal e a imagem de destaque.</p>
                </div>

                <div className="bg-secondary/10 border border-border/40 p-5 rounded-2xl space-y-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="title"
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                    >
                      Título da Campanha
                    </Label>
                    <Input
                      id="title"
                      required
                      placeholder="Ex: Super Upgrade AtlasFit 2.0"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="rounded-xl h-11 border-border/60 text-xs font-semibold bg-background"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="description"
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                    >
                      Descrição / Mensagem da Campanha
                    </Label>
                    <Textarea
                      id="description"
                      required
                      placeholder="Detalhe a mensagem da promoção, novidade ou comunicado..."
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="rounded-xl min-h-[120px] border-border/60 text-xs font-semibold leading-relaxed bg-background"
                    />
                  </div>

                  {/* Image URL / File Input with Toggle & Preview */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label
                        htmlFor="imageInput"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Imagem de Destaque (Opcional)
                      </Label>

                      {/* Toggle Button Group */}
                      <div className="flex gap-1 bg-secondary/40 p-0.5 rounded-lg border border-border/30 shrink-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleImageInputType("file")}
                          className={cn(
                            "h-6 px-2.5 rounded-md text-[9px] font-black transition-all cursor-pointer uppercase tracking-wider",
                            imageInputType === "file"
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-transparent"
                          )}
                        >
                          Arquivo
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleImageInputType("url")}
                          className={cn(
                            "h-6 px-2.5 rounded-md text-[9px] font-black transition-all cursor-pointer uppercase tracking-wider",
                            imageInputType === "url"
                              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm"
                              : "text-muted-foreground hover:bg-transparent"
                          )}
                        >
                          Link URL
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {formData.imageUrl && (
                        <div className="size-16 rounded-xl border border-border/40 bg-secondary/20 overflow-hidden flex items-center justify-center shrink-0 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                          <img
                            src={formData.imageUrl}
                            alt="Preview"
                            className="size-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      <div className="flex-1">
                        {imageInputType === "file" ? (
                          <Input
                            id="imageFile"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="rounded-xl bg-background border-border/60 focus:bg-background transition-all text-xs font-semibold flex items-center pt-2.5 h-11 cursor-pointer"
                          />
                        ) : (
                          <Input
                            id="imageUrl"
                            type="text"
                            placeholder="https://exemplo.com/imagem.jpg"
                            value={urlVal}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            className="rounded-xl h-11 border-border/60 text-xs font-semibold bg-background"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: Targeting & Priority */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">2. Configurações & Público-Alvo</span>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Controle o tipo, público e ordem de veiculação.</p>
                </div>

                <div className="bg-secondary/10 border border-border/40 p-5 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Type Selection */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="type"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Tipo
                      </Label>
                      <Select
                        value={formData.type}
                        onValueChange={(val) =>
                          setFormData({ ...formData, type: val })
                        }
                      >
                        <SelectTrigger className="w-full rounded-xl h-11 border-border/60 font-bold text-xs bg-background">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40">
                          <SelectItem value="PROMOTION" className="font-bold text-xs">Promoção</SelectItem>
                          <SelectItem value="ANNOUNCEMENT" className="font-bold text-xs">Aviso</SelectItem>
                          <SelectItem value="UPDATE" className="font-bold text-xs">Novidade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target Role Selection */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="targetRole"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Público-Alvo
                      </Label>
                      <Select
                        value={formData.targetRole}
                        onValueChange={(val) =>
                          setFormData({ ...formData, targetRole: val })
                        }
                      >
                        <SelectTrigger className="w-full rounded-xl h-11 border-border/60 font-bold text-xs bg-background">
                          <SelectValue placeholder="Público" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border/40">
                          <SelectItem value="ALL" className="font-bold text-xs">Todos (ALL)</SelectItem>
                          <SelectItem value="PERSONAL" className="font-bold text-xs">Personais</SelectItem>
                          <SelectItem value="STUDENT" className="font-bold text-xs">Alunos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="priority"
                      className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                    >
                      Prioridade de Exibição
                    </Label>
                    <Input
                      id="priority"
                      type="number"
                      placeholder="Ex: 0"
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="rounded-xl h-11 border-border/60 text-xs font-semibold bg-background"
                    />
                  </div>
                </div>
              </div>

              {/* Group 3: Schedule & CTA */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">3. Programação & Ação (CTA)</span>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase">Defina as datas limites e o link do botão.</p>
                </div>

                <div className="bg-secondary/10 border border-border/40 p-5 rounded-2xl space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Date Start */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="startDate"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Início
                      </Label>
                      <Input
                        id="startDate"
                        type="datetime-local"
                        required
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({ ...formData, startDate: e.target.value })
                        }
                        className="rounded-xl h-11 border-border/60 text-xs font-semibold text-foreground bg-background"
                      />
                    </div>

                    {/* Date End */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="endDate"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Término
                      </Label>
                      <Input
                        id="endDate"
                        type="datetime-local"
                        required
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                        className="rounded-xl h-11 border-border/60 text-xs font-semibold text-foreground bg-background"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* CTA Button Text */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="buttonText"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Texto CTA (Opcional)
                      </Label>
                      <Input
                        id="buttonText"
                        placeholder="Ex: Ver Detalhes"
                        value={formData.buttonText}
                        onChange={(e) =>
                          setFormData({ ...formData, buttonText: e.target.value })
                        }
                        className="rounded-xl h-11 border-border/60 text-xs font-semibold bg-background"
                      />
                    </div>

                    {/* CTA Button Link */}
                    <div className="space-y-2">
                      <Label
                        htmlFor="buttonLink"
                        className="text-[10px] font-black uppercase tracking-widest text-muted-foreground"
                      >
                        Link CTA (Opcional)
                      </Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          id="buttonLink"
                          placeholder="https://..."
                          value={formData.buttonLink}
                          onChange={(e) =>
                            setFormData({ ...formData, buttonLink: e.target.value })
                          }
                          className="pl-9 rounded-xl h-11 border-border/60 text-xs font-semibold bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 4: Toggle Switches */}
              <div className="bg-secondary/10 border border-border/40 p-5 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="showOnlyOnce"
                      className="text-xs font-bold cursor-pointer"
                    >
                      Exibição Única
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Exibir apenas uma vez por usuário.</p>
                  </div>
                  <Switch
                    id="showOnlyOnce"
                    checked={formData.showOnlyOnce}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, showOnlyOnce: checked })
                    }
                  />
                </div>
                <Separator className="bg-border/30" />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="isActive"
                      className="text-xs font-bold cursor-pointer text-emerald-500"
                    >
                      Campanha Ativa
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase">Permitir veiculação imediatamente.</p>
                  </div>
                  <Switch
                    id="isActive"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, isActive: checked })
                    }
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-6 border-t border-border/30 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl font-bold"
              >
                Cancelar
              </Button>
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
                ) : editingCampaign ? (
                  "Atualizar Campanha"
                ) : (
                  "Criar Campanha"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5. Delete Alert Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsDeleteDialogOpen(false);
            setCampaignToDelete(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold tracking-tight text-red-500 flex items-center gap-2">
              <Trash2 className="size-5" />
              Excluir Campanha?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-muted-foreground">
              Esta ação não poderá ser desfeita. A campanha{" "}
              <strong className="text-foreground">
                "{campaignToDelete?.title}"
              </strong>{" "}
              será permanentemente removida da plataforma e todos os dados de
              visualização associados serão apagados do banco de dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl font-bold"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-2 border-0 cursor-pointer"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="size-3.5" />
                  Excluir
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function CampaignsManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="size-10 text-primary animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Carregando campanhas...
          </p>
        </div>
      }
    >
      <CampaignsContent />
    </Suspense>
  );
}
