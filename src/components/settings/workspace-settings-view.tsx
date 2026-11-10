"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Paintbrush,
  UserCircle,
  Loader2,
  Palette,
  CreditCard,
  XCircle,
  AlertTriangle,
  Calendar,
  ShieldAlert,
  Trash2,
  Building2,
  KeyRound,
  Link2,
  Copy,
  Download,
  Info,
  Coins,
  Users,
  HardDrive,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useSnapshot } from "valtio";
import { workspaceStore, workspaceActions } from "@/stores/workspace.store";
import { cn, formatPhone, slugify } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { compressImage } from "@/lib/image-compress";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
import { updateProfile } from "@/app/(personal)/personal/settings/actions";
import { updateBrandSettings } from "@/app/(personal)/personal/settings/actions";
import { PrivacyCenterTab } from "@/components/privacy/privacy-center-tab";
import { GymPrivacyRequests } from "@/components/privacy/gym-privacy-requests";
import { GymClosureForm } from "@/components/application/gym-closure-form";

// Helper component for toggleable file upload / text URL input with live preview
function ImageInputWithToggle({
  id,
  label,
  description,
  value = "",
  onChange,
  onFileChange,
  onKeyChange,
  placeholder,
  isAvatar,
}: {
  id: string;
  label: string;
  description: string;
  value?: string;
  onChange: (val: string) => void;
  onFileChange?: (file: File | null) => void;
  onKeyChange?: (key: string) => void;
  placeholder?: string;
  isAvatar?: boolean;
}) {
  const [inputType, setInputType] = useState<"file" | "url">("url");
  const [urlVal, setUrlVal] = useState(value || "");
  const [filePreview, setFilePreview] = useState("");

  useEffect(() => {
    const safeVal = value || "";
    if (safeVal) {
      if (
        safeVal.startsWith("/api/storage/file") ||
        safeVal.startsWith("/api/user/avatar?") ||
        safeVal.startsWith("blob:") ||
        safeVal.startsWith("data:")
      ) {
        if (safeVal !== filePreview) {
          setInputType("file");
          setFilePreview(safeVal);
        }
      } else {
        if (safeVal !== urlVal) {
          setInputType("url");
          setUrlVal(safeVal);
        }
      }
    } else {
      setUrlVal("");
      setFilePreview("");
    }
  }, [value]);

  const handleUrlChange = (val: string) => {
    const safe = val || "";
    setUrlVal(safe);
    onChange(safe);
    if (onFileChange) onFileChange(null);
    if (onKeyChange) onKeyChange("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
      onChange(previewUrl);
      if (onFileChange) onFileChange(file);
    }
  };

  const toggleInputType = (type: "file" | "url") => {
    setInputType(type);
    if (type === "url") {
      onChange(urlVal || "");
      if (onFileChange) onFileChange(null);
      if (onKeyChange) onKeyChange("");
    } else {
      onChange(filePreview || "");
    }
  };

  const handleClearImage = () => {
    setUrlVal("");
    setFilePreview("");
    onChange("");
    if (onFileChange) onFileChange(null);
    if (onKeyChange) onKeyChange("");
  };

  const previewSrc = inputType === "file" ? filePreview : urlVal;
  const hasPreview =
    !!previewSrc &&
    (previewSrc.startsWith("/api/storage") ||
      previewSrc.startsWith("/api/user/avatar?") ||
      previewSrc.startsWith("blob:") ||
      previewSrc.startsWith("data:") ||
      previewSrc.startsWith("http://") ||
      previewSrc.startsWith("https://"));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1 pr-4">
          <Label htmlFor={id} className="text-sm font-semibold">
            {label}
          </Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        <div className="flex gap-1 bg-secondary/40 p-0.5 rounded-lg border border-border/30 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleInputType("file")}
            className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              inputType === "file"
                ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-transparent"
            }`}
          >
            Arquivo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleInputType("url")}
            className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              inputType === "url"
                ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-transparent"
            }`}
          >
            Link URL
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {hasPreview && (
          <div
            className={`size-14 border border-border/50 bg-secondary/30 overflow-hidden flex items-center justify-center shrink-0 shadow-xs animate-in fade-in zoom-in-95 duration-200 relative group ${
              isAvatar ? "rounded-full" : "rounded-xl"
            }`}
          >
            <img
              src={previewSrc}
              alt="Preview"
              className="size-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}

        <div className="flex-1 flex gap-2">
          {inputType === "file" ? (
            <Input
              key={`${id}-file-input`}
              id={id}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-xs font-semibold flex items-center pt-2.5 h-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          ) : (
            <Input
              key={`${id}-url-input`}
              id={id}
              type="text"
              value={urlVal || ""}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholder || "https://exemplo.com/imagem.png"}
              className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-sm font-medium h-10"
            />
          )}

          {hasPreview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearImage}
              className="h-10 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl shrink-0"
              title="Remover imagem"
            >
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface StaffMemberOption {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

export interface WorkspaceSettingsViewProps {
  role?: "personal" | "gym";
  workspace?: any;
  isCurrentOwner?: boolean;
  currentUserId?: string;
  eligibleStaffMembers?: StaffMemberOption[];
  privacySubjects?: { userId: string; name: string }[];
  defaultTab?: string;
}

export function WorkspaceSettingsView({
  role = "personal",
  workspace: propWorkspace,
  isCurrentOwner: propIsCurrentOwner,
  currentUserId: propCurrentUserId,
  eligibleStaffMembers = [],
  privacySubjects = [],
  defaultTab = "marca",
}: WorkspaceSettingsViewProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user;
  const snap = useSnapshot(workspaceStore);
  const activeWorkspace = snap.activeWorkspace || propWorkspace;

  const isGym = role === "gym" || activeWorkspace?.type === "GYM";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const effectiveOwner =
    propIsCurrentOwner !== undefined
      ? propIsCurrentOwner
      : activeWorkspace?.ownerId === (user?.id || propCurrentUserId);

  // Profile Tab State
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [city, setCity] = useState("");
  const [experience, setExperience] = useState("");
  const [cref, setCref] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Workspace Brand Tab State
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [brandSlogan, setBrandSlogan] = useState("");
  const [brandColor, setBrandColor] = useState("#2B4FCC");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [watermarkKey, setWatermarkKey] = useState("");
  const [workoutCoverUrl, setWorkoutCoverUrl] = useState("");
  const [workoutCoverKey, setWorkoutCoverKey] = useState("");

  // Upload file states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [workoutCoverFile, setWorkoutCoverFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  // Subscription Details State
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoadingSub, setIsLoadingSub] = useState<boolean>(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  // Gym Ownership Transfer State
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Gym LGPD Dossier & Deletion State
  const [dossierUserId, setDossierUserId] = useState("");
  const [isExportingDossier, setIsExportingDossier] = useState(false);
  const [deleteTargetUserId, setDeleteTargetUserId] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Personal Workspace Deletion State
  const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
  const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);

  // Sync profile data state with session values when loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setImage(user.image || "");
      setImageKey((user as any).imageKey || "");
      setSpecialty(user.specialty || "");
      setBio(user.bio || "");
      setWhatsapp(user.whatsapp || "");
      setInstagram(user.instagram || "");
      setLinkedin(user.linkedin || "");
      setCity(user.city || "");
      setExperience(user.experience || "");
      setCref(user.cref || "");
    }
  }, [user]);

  // Sync Brand state with active workspace
  useEffect(() => {
    const ws = activeWorkspace || propWorkspace;
    if (ws) {
      setBrandName(ws.name || "");
      setBrandSlug(ws.slug || "");
      setBrandSlogan(ws.slogan || "");
      setBrandColor(ws.primaryColor || "#2B4FCC");
      setLogoUrl(ws.logoUrl || "");
      setLogoKey(ws.logoKey || "");
      setWatermarkUrl(ws.watermarkUrl || "");
      setWatermarkKey(ws.watermarkKey || "");
      setWorkoutCoverUrl(ws.workoutCoverUrl || "");
      setWorkoutCoverKey(ws.workoutCoverKey || "");
    }
  }, [activeWorkspace, propWorkspace]);

  // Load Subscription Data
  const loadSubData = async () => {
    const wsId = activeWorkspace?.id || propWorkspace?.id;
    if (!wsId && isGym) return;
    setIsLoadingSub(true);
    try {
      const endpoint = isGym
        ? `/api/gym/subscription?workspaceId=${wsId}`
        : `/api/personal/subscription`;
      const res = await fetch(endpoint, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const result = await res.json();
        setSubscription(result.currentSubscription);
      }
    } catch (err) {
      console.error("Erro ao buscar assinatura nas configurações:", err);
    } finally {
      setIsLoadingSub(false);
    }
  };

  useEffect(() => {
    loadSubData();
  }, [activeWorkspace?.id, isGym]);

  // Handle Cancel Subscription (Personal)
  const handleCancelSubscription = async () => {
    setIsCanceling(true);
    const toastId = toast.loading("Processando cancelamento de assinatura...");
    try {
      const res = await fetch("/api/personal/subscription", {
        method: "DELETE",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao solicitar cancelamento.");
      }

      toast.success("Assinatura cancelada com sucesso!", { id: toastId });
      setIsCancelDialogOpen(false);
      await loadSubData();
    } catch (err: any) {
      console.error("Erro ao cancelar assinatura:", err);
      toast.error(err.message || "Não foi possível cancelar a assinatura.", { id: toastId });
    } finally {
      setIsCanceling(false);
    }
  };

  // Upload to R2 / Storage Helper
  const uploadToStorage = async (file: File, targetType: string): Promise<{ fileUrl: string; objectKey: string }> => {
    const wsId = activeWorkspace?.id || propWorkspace?.id;
    let fileToUpload = file;
    if (file.type.startsWith("image/")) {
      try {
        fileToUpload = await compressImage(file);
      } catch (err) {
        console.warn("Failing compression, uploading original:", err);
      }
    }

    const res = await fetch("/api/storage/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: wsId,
        fileName: fileToUpload.name,
        contentType: fileToUpload.type,
        fileSize: fileToUpload.size,
        targetType,
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Erro ao obter URL de upload.");
    }

    const { uploadUrl, fileUrl, objectKey } = await res.json();

    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": fileToUpload.type },
      body: fileToUpload,
    });

    if (!putRes.ok) {
      throw new Error("Erro ao transferir arquivo para o storage.");
    }

    return { fileUrl, objectKey };
  };

  // Handle Brand Name Change
  const handleBrandNameChange = (val: string) => {
    setBrandName(val);
  };

  // Handle Save
  const handleSave = async () => {
    const wsId = activeWorkspace?.id || propWorkspace?.id;
    if (!wsId && activeTab === "marca") {
      toast.error("Nenhum workspace ativo selecionado.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading("Salvando alterações...");
    try {
      if (activeTab === "perfil") {
        let finalImage = image;
        let finalImageKey = imageKey;

        if (avatarFile) {
          const uploaded = await uploadToStorage(avatarFile, "avatar");
          finalImage = uploaded.fileUrl;
          finalImageKey = uploaded.objectKey;
        }

        const result = await updateProfile({
          name,
          image: finalImage,
          imageKey: finalImageKey,
          specialty,
          bio,
          whatsapp,
          instagram,
          linkedin,
          city,
          experience,
          cref,
        });

        if (result?.success) {
          toast.success("Perfil atualizado com sucesso! 👤", { id: toastId });
          setAvatarFile(null);
        }
      } else if (activeTab === "marca") {
        let finalLogo = logoUrl;
        let finalLogoKey = logoKey;
        let finalWatermark = watermarkUrl;
        let finalWatermarkKey = watermarkKey;
        let finalWorkoutCover = workoutCoverUrl;
        let finalWorkoutCoverKey = workoutCoverKey;

        if (logoFile) {
          const uploaded = await uploadToStorage(logoFile, "logo");
          finalLogo = uploaded.fileUrl;
          finalLogoKey = uploaded.objectKey;
        }

        if (watermarkFile) {
          const uploaded = await uploadToStorage(watermarkFile, "watermark");
          finalWatermark = uploaded.fileUrl;
          finalWatermarkKey = uploaded.objectKey;
        }

        if (workoutCoverFile) {
          const uploaded = await uploadToStorage(workoutCoverFile, "workout_cover");
          finalWorkoutCover = uploaded.fileUrl;
          finalWorkoutCoverKey = uploaded.objectKey;
        }

        const brandingPayload = {
          name: brandName.trim(),
          slug: brandSlug.trim() ? slugify(brandSlug.trim()) : undefined,
          slogan: brandSlogan?.trim() || null,
          primaryColor: brandColor?.trim() || "#2B4FCC",
          logoUrl: finalLogo || null,
          logoKey: finalLogoKey || null,
          watermarkUrl: finalWatermark || null,
          watermarkKey: finalWatermarkKey || null,
          workoutCoverUrl: finalWorkoutCover || null,
          workoutCoverKey: finalWorkoutCoverKey || null,
        };

        if (isGym) {
          const res = await fetch("/api/gym/settings/branding", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              workspaceId: wsId,
              branding: brandingPayload,
            }),
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error?.message || "Não foi possível salvar a marca.");

          if (activeWorkspace) {
            workspaceActions.setActiveWorkspace({
              ...activeWorkspace,
              ...result.data,
            });
          }
          toast.success("Marca da academia atualizada com sucesso! 🎨", { id: toastId });
        } else {
          const result = await updateBrandSettings(wsId, brandingPayload);
          if (result.success && result.workspace) {
            if (activeWorkspace) {
              workspaceActions.setActiveWorkspace({
                ...activeWorkspace,
                ...result.workspace,
                plan: activeWorkspace.plan,
              });
            }
            toast.success("Marca atualizada com sucesso! 🎨", { id: toastId });
          }
        }

        setLogoFile(null);
        setWatermarkFile(null);
        setWorkoutCoverFile(null);
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Ocorreu um erro ao salvar as configurações.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Gym Transfer Ownership
  const handleTransferOwnership = async () => {
    const wsId = activeWorkspace?.id || propWorkspace?.id;
    if (!selectedTargetUserId) {
      toast.error("Selecione o membro que assumirá como novo proprietário.");
      return;
    }

    try {
      setIsTransferring(true);
      const res = await fetch("/api/gym/settings/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsId,
          targetUserId: selectedTargetUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falha ao transferir propriedade.");
      }

      toast.success("Titularidade da academia transferida com sucesso!");
      setIsTransferModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Erro na transferência de propriedade.");
    } finally {
      setIsTransferring(false);
    }
  };

  // Gym LGPD Export Dossier
  const handleExportDossier = async () => {
    const wsId = activeWorkspace?.id || propWorkspace?.id;
    if (!dossierUserId.trim()) {
      toast.error("Selecione o usuário titular para exportação.");
      return;
    }

    try {
      setIsExportingDossier(true);
      const res = await fetch("/api/gym/privacy/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsId,
          targetUserId: dossierUserId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falha ao extrair dossiê do titular.");
      }

      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dossie-titular-lgpd-${dossierUserId.trim()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Dossiê LGPD exportado e baixado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao exportar dossiê LGPD.");
    } finally {
      setIsExportingDossier(false);
    }
  };

  // Gym LGPD Delete Request
  const handleExecuteDeletion = async () => {
    const wsId = activeWorkspace?.id || propWorkspace?.id;
    if (!deleteTargetUserId.trim()) {
      toast.error("Selecione o titular do pedido.");
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch("/api/gym/privacy/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: wsId,
          targetUserId: deleteTargetUserId.trim(),
          reason: deleteReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Não foi possível registrar o pedido.");
      }

      toast.success("Solicitação de eliminação registrada para análise.");
      setIsDeleteModalOpen(false);
      setDeleteTargetUserId("");
      setDeleteReason("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Não foi possível registrar o pedido.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Personal Workspace Delete
  const handleDeletePersonalWorkspace = async () => {
    const wsId = activeWorkspace?.id || propWorkspace?.id;
    if (!wsId) {
      toast.error("Nenhum workspace ativo selecionado para exclusão.");
      return;
    }

    setIsDeletingWorkspace(true);
    const toastId = toast.loading(`Excluindo workspace "${activeWorkspace?.name || propWorkspace?.name}"...`);
    try {
      const res = await fetch(`/api/personal/workspace?workspaceId=${wsId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao excluir workspace.");
      }

      const data = await res.json();
      toast.success("Workspace excluído com sucesso!", { id: toastId });
      setIsDeleteWorkspaceModalOpen(false);

      const remaining: any[] = data.remainingWorkspaces || [];
      workspaceActions.setWorkspaces(remaining);

      if (remaining.length > 0) {
        workspaceActions.setActiveWorkspace(remaining[0]);
      } else {
        workspaceActions.setActiveWorkspaceId("");
        (workspaceStore as any).activeWorkspace = null;
        router.push("/personal");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Não foi possível excluir o workspace.", { id: toastId });
    } finally {
      setIsDeletingWorkspace(false);
    }
  };

  const domainPrefix = isGym ? "app.atlasfit.site/app/" : "app.atlasfit.site/t/";
  const primaryDomain = subscription?.primaryDomain || "app.atlasfit.site";
  const slugRoutePrefix = isGym ? `https://${primaryDomain}/app/` : `https://${primaryDomain}/t/`;

  return (
    <div className={cn("flex-1 space-y-8 w-full max-w-400 mx-auto", !isGym && "p-4 md:p-8 pt-6")}>
      {/* Dynamic CSS variable injection for brand color */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root, .dark {
              --primary: ${brandColor} !important;
              --sidebar-primary: ${brandColor} !important;
              --ring: ${brandColor} !important;
              --sidebar-ring: ${brandColor} !important;
              --chart-1: ${brandColor} !important;
            }
          `,
        }}
      />

      {/* Header Corporativo Idêntico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isGym
              ? "Personalize a identidade da sua academia e gerencie suas informações."
              : "Personalize sua assessoria, identidade visual e gerencie suas informações."}
          </p>
        </div>

        {(activeTab === "marca" || activeTab === "perfil") && (
          <Button
            className="shrink-0 gap-2 font-bold rounded-xl h-10 px-5 shadow-xs cursor-pointer"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Salvar Alterações
              </>
            )}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <TabsList className="bg-muted p-1 border border-border rounded-xl flex overflow-x-auto no-scrollbar whitespace-nowrap md:w-fit gap-1 w-full justify-start scrollbar-none scroll-smooth">
          <TabsTrigger value="marca" className="gap-2 cursor-pointer rounded-lg text-xs font-bold">
            <Paintbrush className="size-4 text-primary" />
            Identificação e Marca
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2 cursor-pointer rounded-lg text-xs font-bold">
            <UserCircle className="size-4 text-blue-500" />
            Perfil
          </TabsTrigger>
          {!isGym && (
            <TabsTrigger value="assinatura" className="gap-2 cursor-pointer rounded-lg text-xs font-bold" onClick={loadSubData}>
              <CreditCard className="size-4 text-emerald-500" />
              Assinatura
            </TabsTrigger>
          )}
          <TabsTrigger value="privacidade" className="gap-2 cursor-pointer rounded-lg text-xs font-bold">
            <ShieldAlert className="size-4 text-amber-500" />
            Privacidade e LGPD
          </TabsTrigger>
          <TabsTrigger
            value="seguranca"
            className="gap-2 cursor-pointer rounded-lg text-xs font-bold text-red-500 hover:text-red-600 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500"
          >
            {isGym ? <KeyRound className="size-4" /> : <Trash2 className="size-4" />}
            {isGym ? "Titularidade e Encerramento" : "Exclusão do workspace"}
          </TabsTrigger>
        </TabsList>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ABA 1: IDENTIFICAÇÃO E MARCA */}
          <TabsContent value="marca" className="space-y-6 mt-0 outline-none">
            {/* 1. Identidade Visual */}
            <Card className="border-border/50 shadow-xs bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">
                  {isGym ? "Identidade Visual da Academia" : "Identidade Visual da Assessoria"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {isGym
                    ? "Defina o nome da sua academia, slogan institucional e imagens da marca."
                    : "Defina o nome da sua assessoria, slogan e links para as imagens da sua marca."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="brandName" className="text-xs font-bold">
                      {isGym ? "Nome da Academia" : "Nome da Assessoria"}
                    </Label>
                    <Input
                      id="brandName"
                      value={brandName || ""}
                      onChange={(e) => handleBrandNameChange(e.target.value)}
                      placeholder={isGym ? "Ex: Academia AtlasFit Prime" : "Ex: Silva Assessoria Esportiva"}
                      className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all font-semibold h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brandSlogan" className="text-xs font-bold">
                      Slogan / Frase de Impacto
                    </Label>
                    <Input
                      id="brandSlogan"
                      value={brandSlogan || ""}
                      onChange={(e) => setBrandSlogan(e.target.value)}
                      placeholder="Ex: Elevando seus limites diários"
                      className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all h-10"
                    />
                  </div>
                </div>

                {/* Slug / Link de Acesso Exclusivo */}
                <div className="space-y-2 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="brandSlug" className="text-xs font-bold flex items-center gap-2">
                      <Link2 className="size-4 text-primary" />
                      Link Oficial de Captação e Portal do Aluno (Slug)
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 text-xs text-primary gap-1.5 hover:bg-primary/10 cursor-pointer"
                      onClick={() => {
                        const targetSlug = brandSlug || activeWorkspace?.slug || propWorkspace?.slug || "";
                        const url = `${slugRoutePrefix}${targetSlug}`;
                        navigator.clipboard.writeText(url);
                        toast.success("Link copiado para a área de transferência! 📋");
                      }}
                    >
                      <Copy className="size-3.5" />
                      Copiar Link
                    </Button>
                  </div>
                  <div className="flex items-center rounded-xl bg-secondary/30 border border-border/50 focus-within:border-primary/50 focus-within:bg-secondary/50 transition-all overflow-hidden h-10">
                    <span className="pl-3.5 pr-1 text-xs font-mono text-muted-foreground select-none">
                      {slugRoutePrefix}
                    </span>
                    <Input
                      id="brandSlug"
                      value={brandSlug || ""}
                      onChange={(e) => setBrandSlug(e.target.value)}
                      placeholder="link-exclusivo"
                      className="border-none bg-transparent shadow-none focus-visible:ring-0 text-foreground font-mono text-xs font-bold pl-0 h-10"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Este é o link oficial para recepção, matrícula ou portal web do seu ecossistema.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  <ImageInputWithToggle
                    id="brandLogo"
                    label={isGym ? "Logotipo da Academia" : "Logotipo da Assessoria"}
                    description="Imagem da sua logo (PNG, JPG ou SVG)."
                    value={logoUrl || ""}
                    onChange={setLogoUrl}
                    onFileChange={setLogoFile}
                    onKeyChange={setLogoKey}
                    placeholder="https://exemplo.com/logo.png"
                  />
                  <ImageInputWithToggle
                    id="pdfWatermark"
                    label="Marca d'água em PDF"
                    description="Marca nos PDFs e fichas exportadas."
                    value={watermarkUrl || ""}
                    onChange={setWatermarkUrl}
                    onFileChange={setWatermarkFile}
                    onKeyChange={setWatermarkKey}
                    placeholder="https://exemplo.com/marca-dagua.png"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Cores do Sistema */}
            <Card className="border-border/50 shadow-xs bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Tema de Cores do Sistema</CardTitle>
                <CardDescription className="text-xs">
                  Selecione a cor principal que pintará o aplicativo, relatórios e portal para todos os usuários.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-[440px] space-y-3">
                  <Label htmlFor="colorPrimary" className="text-xs font-bold flex items-center gap-2">
                    <Palette className="size-4 text-primary" />
                    Cor Principal da Marca
                  </Label>
                  <div className="flex gap-3">
                    <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-border/50 shadow-xs">
                      <Input
                        type="color"
                        id="colorPrimary"
                        value={brandColor || "#2B4FCC"}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="absolute inset-0 size-full p-0 border-0 cursor-pointer scale-150"
                      />
                    </div>
                    <Input
                      value={brandColor || "#2B4FCC"}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="flex-1 uppercase font-mono text-sm tracking-wider rounded-xl bg-secondary/30 border-border/50 h-12"
                    />
                  </div>

                  {/* Cores rápidas */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                      Paletas Rápidas:
                    </span>
                    {[
                      { name: "Atlas Blue", color: "#2B4FCC" },
                      { name: "Esmeralda", color: "#10B981" },
                      { name: "Roxo", color: "#8B5CF6" },
                      { name: "Âmbar", color: "#F59E0B" },
                      { name: "Carmesim", color: "#EF4444" },
                      { name: "Índigo", color: "#6366F1" },
                    ].map((p) => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => setBrandColor(p.color)}
                        style={{ backgroundColor: p.color }}
                        className="size-6 rounded-full border border-border/40 hover:scale-110 transition-transform cursor-pointer shadow-xs"
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Personalização de Treinos */}
            <Card className="border-border/50 shadow-xs bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Personalização de Conteúdo</CardTitle>
                <CardDescription className="text-xs">
                  Defina imagens e coberturas padrão para as suas planilhas e fichas de treinos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ImageInputWithToggle
                  id="workoutCover"
                  label="Capa Padrão dos Treinos"
                  description="Capa personalizada apresentada no início das fichas."
                  value={workoutCoverUrl || ""}
                  onChange={setWorkoutCoverUrl}
                  onFileChange={setWorkoutCoverFile}
                  onKeyChange={setWorkoutCoverKey}
                  placeholder="https://exemplo.com/capa-padrao.jpg"
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 2: PERFIL */}
          <TabsContent value="perfil" className="space-y-6 mt-0 outline-none">
            <Card className="border-border/50 shadow-xs bg-card rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Perfil do Operador / Gestor</CardTitle>
                <CardDescription className="text-xs">
                  Informações públicas e de contato que seus alunos e equipe visualizarão.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="pb-4 border-b border-border/50">
                  <ImageInputWithToggle
                    id="profImage"
                    label="Foto de Perfil"
                    description="Sua foto de perfil (PNG, JPG ou SVG)."
                    value={image || ""}
                    onChange={setImage}
                    onFileChange={setAvatarFile}
                    onKeyChange={setImageKey}
                    placeholder="https://exemplo.com/sua-foto-de-perfil.jpg"
                    isAvatar={true}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="profName" className="text-xs font-bold">
                      Nome Completo
                    </Label>
                    <Input
                      id="profName"
                      value={name || ""}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profSpecialty" className="text-xs font-bold">
                      {isGym ? "Cargo ou Especialidade" : "Especialidade Principal"}
                    </Label>
                    <Input
                      id="profSpecialty"
                      value={specialty || ""}
                      onChange={(e) => setSpecialty(e.target.value)}
                      placeholder={isGym ? "Ex: Gestor Geral / Coordenador" : "Ex: Hipertrofia e Reabilitação"}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profBio" className="text-xs font-bold">
                    Biografia
                  </Label>
                  <Textarea
                    id="profBio"
                    value={bio || ""}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-[120px] resize-none rounded-xl bg-secondary/30 border-border/50"
                    placeholder="Conte um pouco sobre sua trajetória profissional..."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <Label htmlFor="profWhatsApp" className="text-xs font-bold">
                      WhatsApp
                    </Label>
                    <Input
                      id="profWhatsApp"
                      placeholder="Ex: (11) 99999-9999"
                      value={whatsapp || ""}
                      onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profInstagram" className="text-xs font-bold">
                      Instagram
                    </Label>
                    <Input
                      id="profInstagram"
                      placeholder="@seu.perfil"
                      value={instagram || ""}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profLinkedin" className="text-xs font-bold">
                      LinkedIn
                    </Label>
                    <Input
                      id="profLinkedin"
                      placeholder="linkedin.com/in/perfil"
                      value={linkedin || ""}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="profCity" className="text-xs font-bold">
                      Cidade / Estado
                    </Label>
                    <Input
                      id="profCity"
                      placeholder="Ex: São Paulo, SP"
                      value={city || ""}
                      onChange={(e) => setCity(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profExperience" className="text-xs font-bold">
                      Tempo de Experiência
                    </Label>
                    <Input
                      id="profExperience"
                      placeholder="Ex: 8 anos"
                      value={experience || ""}
                      onChange={(e) => setExperience(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profCref" className="text-xs font-bold">
                      CREF / Registro
                    </Label>
                    <Input
                      id="profCref"
                      placeholder="Ex: 123456-G/SP"
                      value={cref || ""}
                      onChange={(e) => setCref(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50 h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ABA 3: ASSINATURA */}
          {!isGym && (
            <TabsContent value="assinatura" className="space-y-6 mt-0 outline-none">
              {isLoadingSub && !subscription ? (
                <Card className="border border-border/50 bg-card rounded-2xl p-6 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32 bg-muted/40" />
                    <Skeleton className="h-4 w-48 bg-muted/40" />
                  </div>
                  <Skeleton className="h-24 w-full bg-muted/20 rounded-xl" />
                </Card>
              ) : subscription ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <Card className="md:col-span-8 border border-border/50 bg-card rounded-2xl overflow-hidden shadow-xs relative">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                    <CardHeader className="pb-3 border-b border-border/40">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            Plano Atual
                          </span>
                          <CardTitle className="text-xl font-bold flex items-center gap-2">
                            {subscription.status === "trial" ? "Período de Testes" : subscription.planName}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[9px] font-bold px-2 py-0.5 uppercase tracking-wide",
                                subscription.status === "active"
                                  ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                                  : subscription.status === "trial" || subscription.status === "canceled"
                                  ? "bg-amber-500/15 text-amber-500 border-amber-500/20"
                                  : "bg-red-500/15 text-red-500 border-red-500/20"
                              )}
                            >
                              {subscription.status === "active"
                                ? "Ativo"
                                : subscription.status === "trial"
                                ? "Teste Grátis"
                                : subscription.status === "canceled"
                                ? "Cancelado"
                                : "Pendente"}
                            </Badge>
                          </CardTitle>
                        </div>
                        {subscription.status !== "trial" && (
                          <div className="text-right">
                            <span className="text-lg font-extrabold text-foreground">
                              {typeof subscription.planPrice === "number"
                                ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                    subscription.planPrice
                                  )
                                : subscription.planPrice}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              /{subscription.billingCycle?.toLowerCase().includes("ano") ? "ano" : "mês"}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-5 space-y-5 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">
                            Forma de Faturamento
                          </span>
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <CreditCard className="size-3.5 text-primary shrink-0" />
                            {subscription.paymentMethod || "Pix Automático"}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">
                            Próxima Renovação
                          </span>
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-primary shrink-0" />
                            {subscription.isTestAccount
                              ? "Não expira"
                              : subscription.nextBillingDate?.includes("-")
                              ? subscription.nextBillingDate.split("-").reverse().join("/")
                              : subscription.nextBillingDate || "Regular"}
                          </p>
                        </div>
                      </div>

                      {subscription.status !== "canceled" && !subscription.isTestAccount && (
                        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-foreground">Cancelar Renovação Recorrente</h4>
                            <p className="text-muted-foreground text-[10px] leading-normal max-w-sm">
                              Ao cancelar, suas cobranças automáticas serão suspensas, mas seu acesso continua liberado até a data de expiração.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsCancelDialogOpen(true)}
                            className="hover:bg-red-500/10 hover:text-red-500 text-muted-foreground text-xs font-bold shrink-0 self-start sm:self-center cursor-pointer"
                          >
                            <XCircle className="size-3.5 mr-1.5" />
                            Cancelar Assinatura
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Estatísticas de Capacidade e Uso */}
                  <Card className="md:col-span-4 border border-border/50 bg-card rounded-2xl p-5 space-y-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      Estatísticas da Conta
                    </span>

                    <div className="space-y-4 text-xs">
                      {/* Alunos */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Users className="size-3.5 text-primary" /> Alunos
                          </span>
                          <span>
                            {subscription.usage?.students?.current || 0}{" "}
                            <span className="text-muted-foreground font-normal">
                              / {subscription.usage?.students?.limit >= 999999 ? "Ilimitado" : subscription.usage?.students?.limit}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                subscription.usage?.students?.limit >= 999999
                                  ? 5
                                  : ((subscription.usage?.students?.current || 0) /
                                      (subscription.usage?.students?.limit || 1)) *
                                      100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Armazenamento */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <HardDrive className="size-3.5 text-blue-500" /> Armazenamento
                          </span>
                          <span>
                            {subscription.usage?.storage?.current || 0}{" "}
                            <span className="text-muted-foreground font-normal">
                              / {subscription.usage?.storage?.limit || 1024} {subscription.usage?.storage?.unit || "MB"}
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                ((subscription.usage?.storage?.current || 0) /
                                  (subscription.usage?.storage?.limit || 1024)) *
                                  100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="border border-border/50 bg-card rounded-2xl p-6 text-center">
                  <p className="text-xs text-muted-foreground">Assinatura inativa ou não localizada.</p>
                </Card>
              )}
            </TabsContent>
          )}

          {/* ABA 4: PRIVACIDADE E LGPD */}
          <TabsContent value="privacidade" className="space-y-6 mt-0 outline-none">
            {isGym ? (
              <div className="space-y-6">
                <Alert className="border-border/50 bg-background/50 rounded-2xl">
                  <Info className="size-4 text-primary" />
                  <AlertTitle className="text-xs font-bold text-foreground">
                    Governança e Solicitações de Privacidade (LGPD)
                  </AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                    Todas as solicitações dos titulares são auditadas com garantias de retenção fiscal e contratual.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Portabilidade de Dados */}
                  <Card className="border-border/50 shadow-xs bg-card rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Download className="size-4 text-primary" />
                        Dossiê do Titular (Portabilidade Art. 18)
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Exporte os registros cadastrais, treinos e histórico do titular em JSON.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="dossierUserId" className="text-xs font-semibold text-muted-foreground">
                          Selecione o Titular
                        </Label>
                        <NativeSelect
                          id="dossierUserId"
                          value={dossierUserId}
                          onChange={(e) => setDossierUserId(e.target.value)}
                          className="w-full h-10 rounded-xl"
                        >
                          <NativeSelectOption value="">Selecione um aluno ou membro...</NativeSelectOption>
                          {privacySubjects.map((s) => (
                            <NativeSelectOption key={s.userId} value={s.userId}>
                              {s.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </div>

                      <Button
                        onClick={handleExportDossier}
                        disabled={!dossierUserId.trim() || isExportingDossier}
                        className="w-full gap-2 text-xs font-bold rounded-xl h-10 cursor-pointer"
                      >
                        {isExportingDossier ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Exportando...</span>
                          </>
                        ) : (
                          <>
                            <Download className="size-3.5" />
                            <span>Exportar e Baixar (.json)</span>
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Eliminação / Anonimização */}
                  <Card className="border-border/50 shadow-xs bg-card rounded-2xl">
                    <CardHeader>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <ShieldAlert className="size-4 text-amber-500" />
                        Solicitar Eliminação / Anonimização
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Registre o pedido formal do titular para análise e aplicação das salvaguardas.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="deleteTargetUserId" className="text-xs font-semibold text-muted-foreground">
                          Selecione o Titular
                        </Label>
                        <NativeSelect
                          id="deleteTargetUserId"
                          value={deleteTargetUserId}
                          onChange={(e) => setDeleteTargetUserId(e.target.value)}
                          className="w-full h-10 rounded-xl"
                        >
                          <NativeSelectOption value="">Selecione um aluno ou membro...</NativeSelectOption>
                          {privacySubjects.map((s) => (
                            <NativeSelectOption key={s.userId} value={s.userId}>
                              {s.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="deleteReason" className="text-xs font-semibold text-muted-foreground">
                          Justificativa / Motivo
                        </Label>
                        <Input
                          id="deleteReason"
                          placeholder="Ex: Solicitação do titular via canal LGPD"
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          className="h-10 text-xs rounded-xl bg-secondary/30 border-border/50"
                        />
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteModalOpen(true)}
                        disabled={!deleteTargetUserId.trim() || isDeleting}
                        className="w-full gap-2 text-xs font-bold rounded-xl h-10 cursor-pointer border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" />
                            <span>Processando...</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="size-3.5" />
                            <span>Registrar Pedido de Eliminação</span>
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                {/* Histórico e Atendimento de Solicitações LGPD */}
                <GymPrivacyRequests workspaceId={activeWorkspace?.id || propWorkspace?.id} />
              </div>
            ) : (
              <PrivacyCenterTab />
            )}
          </TabsContent>

          {/* ABA 5: TITULARIDADE E SEGURANÇA */}
          <TabsContent value="seguranca" className="space-y-6 mt-0 outline-none">
            {isGym ? (
              <div className="space-y-6">
                {/* Transferência de Propriedade */}
                <Card className="border-border/50 shadow-xs bg-card rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <KeyRound className="size-4.5 text-primary" />
                      Transferência de Propriedade do Workspace
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Transfira a titularidade (papel OWNER) da academia para outro membro ativo da equipe com salvaguardas atômicas.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!effectiveOwner ? (
                      <Alert className="border-border/50 bg-background/50 rounded-xl">
                        <AlertTriangle className="size-4 text-amber-500" />
                        <AlertTitle className="text-xs font-bold text-foreground">
                          Acesso Restrito ao Proprietário
                        </AlertTitle>
                        <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                          Apenas o atual proprietário da academia tem autorização para transferir a titularidade do workspace.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        <Alert className="border-border/50 bg-background/50 rounded-xl">
                          <Info className="size-4 text-primary" />
                          <AlertTitle className="text-xs font-bold text-foreground">
                            Regra de Transição Automática de Papel
                          </AlertTitle>
                          <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                            Ao confirmar a transferência, seu papel será rebaixado automaticamente para{" "}
                            <strong>GERENTE (MANAGER)</strong>, e você deixará de ter poderes exclusivos de proprietário. A operação é definitiva.
                          </AlertDescription>
                        </Alert>

                        <div className="space-y-2 max-w-md">
                          <Label htmlFor="targetStaffMember" className="text-xs font-bold">
                            Selecione o Novo Proprietário
                          </Label>
                          <NativeSelect
                            id="targetStaffMember"
                            value={selectedTargetUserId}
                            onChange={(e) => setSelectedTargetUserId(e.target.value)}
                            className="w-full h-10 rounded-xl"
                          >
                            <NativeSelectOption value="">Selecione um membro ativo da equipe...</NativeSelectOption>
                            {eligibleStaffMembers
                              .filter((m) => m.userId !== (user?.id || propCurrentUserId))
                              .map((m) => (
                                <NativeSelectOption key={m.userId} value={m.userId}>
                                  {m.user.name || m.user.email} ({m.role})
                                </NativeSelectOption>
                              ))}
                          </NativeSelect>
                        </div>

                        <Button
                          onClick={() => setIsTransferModalOpen(true)}
                          disabled={!selectedTargetUserId || isTransferring}
                          className="gap-2 text-xs font-bold rounded-xl h-10 px-5 cursor-pointer"
                        >
                          <KeyRound className="size-3.5" />
                          Iniciar Transferência de Titularidade
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Encerramento da Academia */}
                {effectiveOwner && (
                  <GymClosureForm
                    workspaceId={activeWorkspace?.id || propWorkspace?.id}
                    slug={activeWorkspace?.slug || propWorkspace?.slug}
                  />
                )}
              </div>
            ) : (
              /* Exclusão do Workspace Atual (Personal) */
              <Card className="border-red-500/20 shadow-xs bg-card rounded-2xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500" />
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <Building2 className="size-5 text-red-500" />
                    <CardTitle className="text-xl font-bold text-foreground">Exclusão do Workspace Atual</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Exclua permanentemente este workspace, seus treinos e dados vinculados.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="p-4 rounded-2xl bg-secondary/30 border border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">
                        Excluir Workspace{" "}
                        <span className="text-primary font-mono">{activeWorkspace?.name || "Sem Workspace"}</span>
                      </h4>
                      <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
                        Ao excluir este workspace, você alternará para outro workspace cadastrado ou retornará para a tela inicial.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setIsDeleteWorkspaceModalOpen(true)}
                      disabled={!activeWorkspace?.id || isDeletingWorkspace}
                      className="rounded-xl text-xs font-bold shrink-0 cursor-pointer bg-red-600 hover:bg-red-700 h-10 px-4"
                    >
                      <Trash2 className="size-4 mr-2" />
                      Excluir Workspace Atual
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </motion.div>
      </Tabs>

      {/* Modal AlertDialog: Confirmação de Transferência de Titularidade (Gym) */}
      <AlertDialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <AlertDialogContent className="rounded-2xl border border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Confirmar Transferência de Propriedade?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs text-muted-foreground">
              <p>
                Você está prestes a transferir o controle total e exclusivo do workspace{" "}
                <strong>{activeWorkspace?.name || propWorkspace?.name}</strong> para outro usuário.
              </p>
              <p className="font-semibold text-foreground">
                Seu papel será convertido para Gerente (MANAGER). Confirme antes de prosseguir.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isTransferring} className="rounded-xl text-xs font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleTransferOwnership();
              }}
              disabled={isTransferring}
              className="rounded-xl text-xs font-bold gap-1.5 cursor-pointer"
            >
              {isTransferring ? <Loader2 className="size-3.5 animate-spin" /> : <KeyRound className="size-3.5" />}
              {isTransferring ? "Transferindo..." : "Confirmar Transferência"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal AlertDialog: Registro de Eliminação LGPD (Gym) */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent className="rounded-2xl border border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">
              Registrar Pedido de Eliminação LGPD?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              A solicitação ficará pendente de análise e salvaguardas fiscais. Histórico financeiro e contratos são retidos conforme legislação vigente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleExecuteDeletion();
              }}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldAlert className="size-3.5" />}
              {isDeleting ? "Registrando..." : "Confirmar Solicitação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal AlertDialog: Cancelamento de Assinatura (Personal) */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Tem certeza que deseja cancelar?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              Esta ação cancelará a renovação automática da sua assinatura. Seu acesso continuará liberado até o término do período já pago.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isCanceling} className="rounded-xl text-xs font-bold">
              Manter Assinatura
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCanceling}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              {isCanceling ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Confirmar Cancelamento"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal AlertDialog: Exclusão de Workspace (Personal) */}
      <AlertDialog open={isDeleteWorkspaceModalOpen} onOpenChange={setIsDeleteWorkspaceModalOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Excluir Workspace Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              Esta ação é irreversível e excluirá todos os treinos e registros vinculados a este workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeletingWorkspace} className="rounded-xl text-xs font-bold">
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeletePersonalWorkspace}
              disabled={isDeletingWorkspace}
              className="rounded-xl text-xs font-bold cursor-pointer bg-red-600 hover:bg-red-700"
            >
              {isDeletingWorkspace ? (
                <>
                  <Loader2 className="mr-2 size-3 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Sim, Excluir Workspace"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export const SettingsView = WorkspaceSettingsView;
