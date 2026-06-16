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
import { Save, Paintbrush, Image as ImageIcon, UserCircle, Loader2, Palette } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { updateProfile, updateBrandSettings } from "./actions";
import { useSnapshot } from "valtio";
import { workspaceStore, workspaceActions } from "@/stores/workspace.store";

// Helper component for text URL input with live visual preview
// Helper component for toggleable file upload / text URL input with live preview
function ImageInputWithToggle({
  id,
  label,
  description,
  value,
  onChange,
  placeholder,
  isAvatar,
}: {
  id: string;
  label: string;
  description: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  isAvatar?: boolean;
}) {
  const [inputType, setInputType] = useState<"file" | "url">("url");
  const [urlVal, setUrlVal] = useState("");
  const [filePreview, setFilePreview] = useState("");

  // Sync state with parent value (e.g., when loaded from database)
  useEffect(() => {
    if (value) {
      if (value.startsWith("data:")) {
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
  };

  // Handle file base64 conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFilePreview(base64);
        onChange(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // When toggled, reset/sync values
  const toggleInputType = (type: "file" | "url") => {
    setInputType(type);
    if (type === "url") {
      onChange(urlVal);
    } else {
      onChange(filePreview);
    }
  };

  const previewSrc = inputType === "file" ? filePreview : urlVal;
  const hasPreview = !!previewSrc && (previewSrc.startsWith("data:") || previewSrc.startsWith("http://") || previewSrc.startsWith("https://"));

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
            className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              inputType === "file" 
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
            className={`h-7 px-2.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              inputType === "url" 
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
          <div className={`size-14 border border-border/50 bg-secondary/30 overflow-hidden flex items-center justify-center shrink-0 shadow-sm animate-in fade-in zoom-in-95 duration-200 ${isAvatar ? "rounded-full" : "rounded-xl"}`}>
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
              className="rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-xs font-semibold flex items-center pt-2.5 h-10 cursor-pointer"
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

  const { data: session, update } = useSession();
  const user = session?.user;

  // Profile Tab State
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
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
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [workoutCoverUrl, setWorkoutCoverUrl] = useState("");

  // Sync profile data state with session values when loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setImage(user.image || "");
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
      setWatermarkUrl(activeWorkspace.watermarkUrl || "");
      setWorkoutCoverUrl(activeWorkspace.workoutCoverUrl || "");
    }
  }, [activeWorkspace]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (activeTab === "perfil") {
        const result = await updateProfile({
          name,
          image,
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
          await update();
          toast.success("Perfil atualizado com sucesso! 🎉");
        }
      } else if (activeTab === "marca") {
        if (!activeWorkspace?.id) {
          toast.error("Nenhum workspace ativo selecionado.");
          return;
        }

        if (!brandName.trim()) {
          toast.error("O nome da assessoria é obrigatório.");
          return;
        }

        const result = await updateBrandSettings(activeWorkspace.id, {
          name: brandName,
          slogan: brandSlogan,
          primaryColor: brandColor,
          logoUrl: logoUrl,
          watermarkUrl: watermarkUrl,
          workoutCoverUrl: workoutCoverUrl,
        });

        if (result.success && result.workspace) {
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

          toast.success("Marca atualizada com sucesso! 🎨");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro ao salvar as configurações.");
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="marca" className="gap-2 cursor-pointer">
            <Paintbrush className="size-4" />
            Marca
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2 cursor-pointer">
            <UserCircle className="size-4" />
            Perfil
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
                    description="O logotipo da sua assessoria (PNG, JPG ou SVG)."
                    value={logoUrl}
                    onChange={setLogoUrl}
                    placeholder="https://exemplo.com/logo-assessoria.png"
                  />
                  <ImageInputWithToggle
                    id="pdfWatermark"
                    label="Marca d'água em PDF"
                    description="A imagem sutil de fundo que será impressa nos PDFs exportados."
                    value={watermarkUrl}
                    onChange={setWatermarkUrl}
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

            {/* 3. Personalização Avançada */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Personalização de Conteúdo</CardTitle>
                <CardDescription>Defina imagens e coberturas padrão para as suas planilhas de treinos.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <ImageInputWithToggle
                   id="workoutCover"
                   label="Capa Padrão dos Treinos"
                   description="Capa padrão exibida no app do aluno quando um treino específico não possuir uma capa personalizada."
                   value={workoutCoverUrl}
                   onChange={setWorkoutCoverUrl}
                   placeholder="https://exemplo.com/capa-padrao.jpg"
                 />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ============================== */}
          {/* ABA: PERFIL DO PERSONAL        */}
          {/* ============================== */}
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
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
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

        </motion.div>
      </Tabs>
    </div>
  );
}
