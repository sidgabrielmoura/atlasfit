"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { settingsData } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Paintbrush, Image as ImageIcon, UserCircle, Loader2, Palette, CreditCard, XCircle, AlertTriangle, Calendar, AlertCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { updateProfile, updateBrandSettings } from "./actions";
import { useSnapshot } from "valtio";
import { workspaceStore, workspaceActions } from "@/stores/workspace.store";
import { cn, formatPhone } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { compressImage } from "@/lib/image-compress";
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


// Helper component for text URL input with live visual preview
// Helper component for toggleable file upload / text URL input with live preview
function ImageInputWithToggle({
  id,
  label,
  description,
  value,
  onChange,
  onFileChange,
  onKeyChange,
  placeholder,
  isAvatar,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  onFileChange?: (file: File | null) => void;
  onKeyChange?: (key: string) => void;
  placeholder?: string;
  isAvatar?: boolean;
}) {
  const [inputType, setInputType] = useState<"file" | "url">("url");
  const [urlVal, setUrlVal] = useState("");
  const [filePreview, setFilePreview] = useState("");

  // Sync state with parent value (e.g., when loaded from database)
  useEffect(() => {
    if (value) {
      if (value.startsWith("/api/storage/file") || value.startsWith("blob:") || value.startsWith("data:")) {
        if (value !== filePreview) {
          setInputType("file");
          setFilePreview(value);
        }
      } else {
        if (value !== urlVal) {
          setInputType("url");
          setUrlVal(value);
        }
      }
    } else {
      setUrlVal("");
      setFilePreview("");
    }
  }, [value]);

  // Update parent when URL changes
  const handleUrlChange = (val: string) => {
    setUrlVal(val);
    onChange(val);
    if (onFileChange) onFileChange(null);
    if (onKeyChange) onKeyChange("");
  };

  // Handle file preview and bubble up
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
      onChange(previewUrl);
      if (onFileChange) onFileChange(file);
    }
  };

  // When toggled, reset/sync values
  const toggleInputType = (type: "file" | "url") => {
    setInputType(type);
    if (type === "url") {
      onChange(urlVal);
      if (onFileChange) onFileChange(null);
      if (onKeyChange) onKeyChange("");
    } else {
      onChange(filePreview);
    }
  };

  const previewSrc = inputType === "file" ? filePreview : urlVal;
  const hasPreview = !!previewSrc && (previewSrc.startsWith("/api/storage") || previewSrc.startsWith("blob:") || previewSrc.startsWith("data:") || previewSrc.startsWith("http://") || previewSrc.startsWith("https://"));

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1 pr-4">
          <Label htmlFor={id} className="text-sm font-semibold">{label}</Label>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {/* Toggle Button Group */}
        <div className="flex gap-1 bg-secondary/40 p-0.5 rounded-lg border border-border/30 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => toggleInputType("file")}
            className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${inputType === "file"
              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm"
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
            className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${inputType === "url"
              ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-transparent"
              }`}
          >
            Link URL
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {hasPreview && (
          <div className={`size-14 border border-border/50 bg-secondary/30 overflow-hidden flex items-center justify-center shrink-0 shadow-sm animate-in fade-in zoom-in-95 duration-200 relative ${isAvatar ? "rounded-full" : "rounded-xl"}`}>
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

        <div className="flex-1">
          {inputType === "file" ? (
            <Input
              id={id}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-xs font-semibold flex items-center pt-2.5 h-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
          ) : (
            <Input
              id={id}
              type="text"
              value={urlVal}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholder || "https://exemplo.com/imagem.png"}
              className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-sm font-medium h-10"
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("marca");

  // Subscription Details State
  const [subscription, setSubscription] = useState<any>(null);
  const [isLoadingSub, setIsLoadingSub] = useState<boolean>(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  const loadSubData = async () => {
    setIsLoadingSub(true);
    try {
      const res = await fetch("/api/personal/subscription");
      if (res.ok) {
        const result = await res.json();
        setSubscription(result.currentSubscription);
      }
    } catch (err) {
      console.error("Erro ao buscar assinatura no settings:", err);
    } finally {
      setIsLoadingSub(false);
    }
  };

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

  useEffect(() => {
    loadSubData();
  }, []);

  const { data: session, update } = useSession();
  const user = session?.user;

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
  const snap = useSnapshot(workspaceStore);
  const activeWorkspace = snap.activeWorkspace;

  const [brandName, setBrandName] = useState("");
  const [brandSlogan, setBrandSlogan] = useState("");
  const [brandColor, setBrandColor] = useState("#0ea5e9");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [watermarkKey, setWatermarkKey] = useState("");
  const [workoutCoverUrl, setWorkoutCoverUrl] = useState("");
  const [workoutCoverKey, setWorkoutCoverKey] = useState("");

  // Defer R2 upload file states
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [workoutCoverFile, setWorkoutCoverFile] = useState<File | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
    } else {
      setName(settingsData.profile.name);
      setImage("");
      setImageKey("");
      setSpecialty(settingsData.profile.specialty);
      setBio(settingsData.profile.bio);
      setWhatsapp(settingsData.profile.whatsapp);
      setInstagram(settingsData.profile.social.instagram);
      setLinkedin(settingsData.profile.social.linkedin);
      setCity(settingsData.profile.city);
      setExperience(settingsData.profile.experience);
      setCref(settingsData.profile.cref);
    }
  }, [user]);

  // Sync Brand state with active workspace
  useEffect(() => {
    if (activeWorkspace) {
      setBrandName(activeWorkspace.name || "");
      setBrandSlogan(activeWorkspace.slogan || "");
      setBrandColor(activeWorkspace.primaryColor || "#0ea5e9");
      setLogoUrl(activeWorkspace.logoUrl || "");
      setLogoKey((activeWorkspace as any).logoKey || "");
      setWatermarkUrl(activeWorkspace.watermarkUrl || "");
      setWatermarkKey((activeWorkspace as any).watermarkKey || "");
      setWorkoutCoverUrl(activeWorkspace.workoutCoverUrl || "");
      setWorkoutCoverKey((activeWorkspace as any).workoutCoverKey || "");
    }
  }, [activeWorkspace]);

  const uploadToR2 = async (file: File, targetType: string, workspaceId?: string) => {
    let fileToUpload = file;
    // Compress image client-side to save bandwidth
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
        workspaceId,
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

  const handleSave = async () => {
    setIsSaving(true);
    const toastId = toast.loading("Salvando alterações...");
    try {
      if (activeTab === "perfil") {
        let finalImage = image;
        let finalImageKey = imageKey;

        if (avatarFile) {
          const uploaded = await uploadToR2(avatarFile, "avatar");
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

        if (result.success) {
          setAvatarFile(null);
          await update();
          toast.success("Perfil atualizado com sucesso! 🎉", { id: toastId });
        }
      } else if (activeTab === "marca") {
        if (!activeWorkspace?.id) {
          toast.error("Nenhum workspace ativo selecionado.", { id: toastId });
          return;
        }

        if (!brandName.trim()) {
          toast.error("O nome da assessoria é obrigatório.", { id: toastId });
          return;
        }

        let finalLogoUrl = logoUrl;
        let finalLogoKey = logoKey;
        let finalWatermarkUrl = watermarkUrl;
        let finalWatermarkKey = watermarkKey;
        let finalWorkoutCoverUrl = workoutCoverUrl;
        let finalWorkoutCoverKey = workoutCoverKey;

        if (logoFile) {
          const uploaded = await uploadToR2(logoFile, "logo", activeWorkspace.id);
          finalLogoUrl = uploaded.fileUrl;
          finalLogoKey = uploaded.objectKey;
        }

        if (watermarkFile) {
          const uploaded = await uploadToR2(watermarkFile, "watermark", activeWorkspace.id);
          finalWatermarkUrl = uploaded.fileUrl;
          finalWatermarkKey = uploaded.objectKey;
        }

        if (workoutCoverFile) {
          const uploaded = await uploadToR2(workoutCoverFile, "workout_cover", activeWorkspace.id);
          finalWorkoutCoverUrl = uploaded.fileUrl;
          finalWorkoutCoverKey = uploaded.objectKey;
        }

        const result = await updateBrandSettings(activeWorkspace.id, {
          name: brandName,
          slogan: brandSlogan,
          primaryColor: brandColor,
          logoUrl: finalLogoUrl,
          logoKey: finalLogoKey,
          watermarkUrl: finalWatermarkUrl,
          watermarkKey: finalWatermarkKey,
          workoutCoverUrl: finalWorkoutCoverUrl,
          workoutCoverKey: finalWorkoutCoverKey,
        });

        if (result.success && result.workspace) {
          setLogoFile(null);
          setWatermarkFile(null);
          setWorkoutCoverFile(null);

          // Update Valtio store locally so dynamic styles and switcher logo propagate instantly
          workspaceActions.setActiveWorkspace({
            ...activeWorkspace,
            ...result.workspace,
            plan: activeWorkspace.plan, // Keep plan info
          });

          // Also update the workspaces list in the store!
          const updatedWorkspaces = snap.workspaces.map((w) =>
            w.id === activeWorkspace.id ? { ...w, ...result.workspace, plan: w.plan } : w
          );
          workspaceActions.setWorkspaces(updatedWorkspaces);

          toast.success("Marca atualizada com sucesso! 🎨", { id: toastId });
        }
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Ocorreu um erro ao salvar as configurações.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full">
      {/* Live brand color CSS custom property overrides for instant color feedback */}
      <style dangerouslySetInnerHTML={{
        __html: `
          :root, .dark {
            --primary: ${brandColor} !important;
            --sidebar-primary: ${brandColor} !important;
            --ring: ${brandColor} !important;
            --sidebar-ring: ${brandColor} !important;
            --chart-1: ${brandColor} !important;
          }
        `
      }} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground mt-1">Personalize sua plataforma e gerencie suas informações.</p>
        </div>
        {activeTab !== "assinatura" && (
          <Button
            className="shrink-0 gap-2 font-semibold cursor-pointer"
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-[500px] mb-8">
          <TabsTrigger value="marca" className="gap-2 cursor-pointer">
            <Paintbrush className="size-4" />
            Marca
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2 cursor-pointer">
            <UserCircle className="size-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="assinatura" className="gap-2 cursor-pointer" onClick={loadSubData}>
            <CreditCard className="size-4" />
            Assinatura
          </TabsTrigger>
        </TabsList>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* ============================== */}
          {/* ABA: MARCA (WHITE-LABEL)       */}
          {/* ============================== */}
          <TabsContent value="marca" className="space-y-8 mt-0 outline-none">

            {/* 1. Identidade Visual */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Identidade Visual da Assessoria</CardTitle>
                <CardDescription>Defina o nome da sua assessoria, slogan e links para as imagens da sua marca.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="brandName">Nome da Assessoria</Label>
                    <Input
                      id="brandName"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="ex: Silva Assessoria Esportiva"
                      className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brandSlogan">Slogan / Frase de Impacto</Label>
                    <Input
                      id="brandSlogan"
                      value={brandSlogan}
                      onChange={(e) => setBrandSlogan(e.target.value)}
                      placeholder="ex: Elevando seus limites diários"
                      className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  <ImageInputWithToggle
                    id="brandLogo"
                    label="Logotipo da Assessoria"
                    description="(PNG, JPG ou SVG)."
                    value={logoUrl}
                    onChange={setLogoUrl}
                    onFileChange={setLogoFile}
                    onKeyChange={setLogoKey}
                    placeholder="https://exemplo.com/logo-assessoria.png"
                  />
                  <ImageInputWithToggle
                    id="pdfWatermark"
                    label="Marca d'água em PDF"
                    description="A imagem nos PDFs exportados."
                    value={watermarkUrl}
                    onChange={setWatermarkUrl}
                    onFileChange={setWatermarkFile}
                    onKeyChange={setWatermarkKey}
                    placeholder="https://exemplo.com/marca-dagua.png"
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Cores */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Tema de Cores do Sistema</CardTitle>
                <CardDescription>Selecione a cor principal que pintará todo o sistema tanto para alunos quanto profissionais.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-[400px]">
                  <div className="space-y-2">
                    <Label htmlFor="colorPrimary" className="font-semibold flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      Cor Principal da Marca
                    </Label>
                    <div className="flex gap-3">
                      <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-border/50 shadow-sm">
                        <Input
                          type="color"
                          id="colorPrimary"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="absolute inset-0 size-full p-0 border-0 cursor-pointer scale-150"
                        />
                      </div>
                      <Input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="flex-1 uppercase font-mono text-sm tracking-wider rounded-xl bg-secondary/30 border-border/50"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Personalização de Conteúdo</CardTitle>
                <CardDescription>Defina imagens e coberturas padrão para as suas planilhas de treinos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ImageInputWithToggle
                  id="workoutCover"
                  label="Capa Padrão dos Treinos"
                  description="Capa personalizada de treino."
                  value={workoutCoverUrl}
                  onChange={setWorkoutCoverUrl}
                  onFileChange={setWorkoutCoverFile}
                  onKeyChange={setWorkoutCoverKey}
                  placeholder="https://exemplo.com/capa-padrao.jpg"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="perfil" className="space-y-8 mt-0 outline-none">
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Perfil Profissional</CardTitle>
                <CardDescription>Informações públicas que seus alunos visualizarão.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="pb-4 border-b border-border/50">
                  <ImageInputWithToggle
                    id="profImage"
                    label="Foto de Perfil"
                    description="Sua foto de perfil (PNG, JPG ou SVG)."
                    value={image}
                    onChange={setImage}
                    onFileChange={setAvatarFile}
                    onKeyChange={setImageKey}
                    placeholder="https://exemplo.com/sua-foto-de-perfil.jpg"
                    isAvatar={true}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="profName">Nome Completo</Label>
                    <Input
                      id="profName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profSpecialty">Especialidade Principal</Label>
                    <Input
                      id="profSpecialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profBio">Biografia</Label>
                  <Textarea
                    id="profBio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="min-h-[120px] resize-none rounded-xl bg-secondary/30 border-border/50"
                    placeholder="Conte um pouco sobre sua trajetória profissional..."
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-4 border-t border-border/50">
                  <div className="space-y-2">
                    <Label htmlFor="profWhatsApp">WhatsApp</Label>
                    <Input
                      id="profWhatsApp"
                      placeholder="Ex: (11) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profInstagram">Instagram</Label>
                    <Input
                      id="profInstagram"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profLinkedin">LinkedIn</Label>
                    <Input
                      id="profLinkedin"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="profCity">Cidade / Estado</Label>
                    <Input
                      id="profCity"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profExperience">Tempo de Experiência</Label>
                    <Input
                      id="profExperience"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profCref">CREF</Label>
                    <Input
                      id="profCref"
                      value={cref}
                      onChange={(e) => setCref(e.target.value)}
                      className="rounded-xl bg-secondary/30 border-border/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assinatura" className="space-y-8 mt-0 outline-none">
            {isLoadingSub && !subscription ? (
              <Card className="border border-border/50 bg-card rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 bg-muted/40" />
                  <Skeleton className="h-4 w-48 bg-muted/40" />
                </div>
                <Skeleton className="h-20 w-full bg-muted/20 rounded-xl" />
              </Card>
            ) : subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <Card className="md:col-span-8 border border-border/50 bg-card rounded-2xl overflow-hidden shadow-xs relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader className="pb-3 border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plano Atual</span>
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
                            {subscription.status === "active" ? "Ativo" : subscription.status === "trial" ? "Teste Grátis" : subscription.status === "canceled" ? "Cancelado" : "Atrasado"}
                          </Badge>
                        </CardTitle>
                      </div>
                      {subscription.status !== "trial" && (
                        <div className="text-right">
                          <span className="text-lg font-extrabold text-foreground">R$ {subscription.planPrice}</span>
                          <span className="text-[10px] text-muted-foreground block">/{subscription.billingCycle === "Mensal" ? "mês" : "ano"}</span>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-5 space-y-5 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Forma de Faturamento</span>
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <CreditCard className="size-3.5 text-primary shrink-0" />
                          {subscription.paymentMethod || "Pix Automático"}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-muted-foreground uppercase text-[9px] tracking-wider">Próxima Renovação</span>
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-primary shrink-0" />
                          {subscription.isTestAccount 
                            ? "Não expira" 
                            : (subscription.nextBillingDate?.includes("-") 
                               ? subscription.nextBillingDate.split("-").reverse().join("/") 
                               : subscription.nextBillingDate)}
                        </p>
                      </div>
                    </div>

                    {/* Notification/Canceled status notice */}
                    {subscription.status === "canceled" && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2">
                        <AlertTriangle className="size-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-normal font-medium">
                          <strong>Assinatura Cancelada:</strong> Seu acesso continua ativo até o dia <strong>
                            {subscription.nextBillingDate?.includes("-") 
                              ? subscription.nextBillingDate.split("-").reverse().join("/") 
                              : subscription.nextBillingDate}
                          </strong> (término do período já pago). Após essa data, nenhuma cobrança adicional será realizada no AbacatePay e o acesso será suspenso.
                        </p>
                      </div>
                    )}

                    {/* Cancel button inside personal configs */}
                    {subscription.status !== "canceled" && !subscription.isTestAccount && (
                      <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-foreground">Cancelar Renovação Recorrente</h4>
                          <p className="text-muted-foreground text-[10px] leading-normal max-w-sm">
                            Ao cancelar, suas cobranças automáticas no AbacatePay serão suspensas, mas seu acesso continua liberado até a data de expiração do plano.
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

                {/* Micro usage statistics in Settings */}
                <Card className="md:col-span-4 border border-border/50 bg-card rounded-2xl p-5 space-y-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Estatísticas de Uso</span>
                  
                  <div className="space-y-3.5 text-xs">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-muted-foreground">Alunos Cadastrados</span>
                        <span>
                          {subscription.usage?.students.current} <span className="text-muted-foreground font-normal">/ {subscription.usage?.students.limit >= 999999 ? "Ilimitado" : subscription.usage?.students.limit}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(subscription.usage?.students.limit >= 999999 ? 5 : ((subscription.usage?.students.current / subscription.usage?.students.limit) * 100), 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-muted-foreground">Armazenamento</span>
                        <span>
                          {subscription.usage?.storage.current} <span className="text-muted-foreground font-normal">/ {subscription.usage?.storage.limit} {subscription.usage?.storage.unit}</span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${(subscription.usage?.storage.current / subscription.usage?.storage.limit) * 100}%` }}
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

        </motion.div>
      </Tabs>

      {/* Cancellation Confirmation Alert Dialog */}
      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">Tem certeza que deseja cancelar?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-normal">
              Esta ação cancelará a renovação automática da sua assinatura no AbacatePay. 
              <br />
              <br />
              Seu acesso continuará **totalmente liberado até o dia {
                subscription?.nextBillingDate?.includes("-") 
                  ? subscription.nextBillingDate.split("-").reverse().join("/") 
                  : subscription?.nextBillingDate
              }** (término do período já pago). Após esta data, nenhuma nova cobrança será realizada e seu acesso será interrompido.
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
    </div>
  );
}
