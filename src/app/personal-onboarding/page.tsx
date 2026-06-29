"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Dumbbell,
  User,
  Loader2,
  Sparkles,
  Paintbrush,
  Palette,
  Phone,
  MapPin,
  Award,
  BookOpen,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { InstagramIcon, LinkedinIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { workspaceActions } from "@/stores/workspace.store";

// Onboarding Steps
const STEPS = [
  { id: 1, title: "Perfil Profissional" },
  { id: 2, title: "Identidade Visual" },
  { id: 3, title: "Contato e Localização" },
];

export default function PersonalOnboardingPage() {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(1);

  // --- FORM STATES ---
  // Step 1: Perfil Profissional
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [experience, setExperience] = useState("");
  const [cref, setCref] = useState("");
  const [bio, setBio] = useState("");
  const [imageType, setImageType] = useState<"file" | "url">("file");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  // Step 2: Identidade Visual
  const [brandName, setBrandName] = useState("");
  const [brandSlogan, setBrandSlogan] = useState("");
  const [brandColor, setBrandColor] = useState("#ea580c");
  
  const [logoType, setLogoType] = useState<"file" | "url">("file");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [watermarkType, setWatermarkType] = useState<"file" | "url">("file");
  const [watermarkUrl, setWatermarkUrl] = useState("");
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState("");

  const [coverType, setCoverType] = useState<"file" | "url">("file");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");

  // Step 3: Contato e Localização
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [city, setCity] = useState("");

  // Prepopulate name from session when available
  useEffect(() => {
    if (session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [session, name]);

  // Handle file select previews
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    fileSetter: (file: File | null) => void,
    previewSetter: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      fileSetter(file);
      previewSetter(URL.createObjectURL(file));
    }
  };

  // Step Validations
  const validateStep = () => {
    if (currentStep === 1) {
      if (!name.trim()) {
        toast.warning("O seu nome é obrigatório.");
        return false;
      }
      const activeAvatar = imageType === "file" ? (imageFile || imagePreview) : imageUrl;
      if (!activeAvatar) {
        toast.warning("Por favor, adicione uma foto de perfil.");
        return false;
      }
      if (!specialty.trim()) {
        toast.warning("A sua especialidade é obrigatória.");
        return false;
      }
      if (!experience.trim()) {
        toast.warning("Informe o seu tempo de experiência.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!brandName.trim()) {
        toast.warning("O nome da assessoria é obrigatório.");
        return false;
      }
      const activeLogo = logoType === "file" ? (logoFile || logoPreview) : logoUrl;
      if (!activeLogo) {
        toast.warning("Por favor, adicione o logotipo da sua assessoria.");
        return false;
      }
      if (!brandColor) {
        toast.warning("A cor do tema é obrigatória.");
        return false;
      }
    } else if (currentStep === 3) {
      if (!whatsapp.trim()) {
        toast.warning("O número de WhatsApp de contato é obrigatório.");
        return false;
      }
      if (!city.trim()) {
        toast.warning("A sua cidade e estado são obrigatórios.");
        return false;
      }
    }
    return true;
  };

  // Stepper handlers
  const handleNext = () => {
    if (!validateStep()) return;

    if (currentStep < 3) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const uploadToR2 = async (file: File, targetType: string) => {
    const res = await fetch("/api/storage/presigned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        targetType,
      }),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Erro ao obter URL assinada.");
    }
    const { uploadUrl, fileUrl, objectKey } = await res.json();
    
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!putRes.ok) {
      throw new Error("Erro no upload do arquivo.");
    }
    return { fileUrl, objectKey };
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let finalAvatar = imageUrl;
      let finalAvatarKey = null;
      if (imageType === "file" && imageFile) {
        const { fileUrl, objectKey } = await uploadToR2(imageFile, "avatar");
        finalAvatar = fileUrl;
        finalAvatarKey = objectKey;
      }

      let finalLogo = logoUrl;
      let finalLogoKey = null;
      if (logoType === "file" && logoFile) {
        const { fileUrl, objectKey } = await uploadToR2(logoFile, "logo");
        finalLogo = fileUrl;
        finalLogoKey = objectKey;
      }

      let finalWatermark = watermarkUrl;
      let finalWatermarkKey = null;
      if (watermarkType === "file" && watermarkFile) {
        const { fileUrl, objectKey } = await uploadToR2(watermarkFile, "watermark");
        finalWatermark = fileUrl;
        finalWatermarkKey = objectKey;
      }

      let finalCover = coverUrl;
      let finalCoverKey = null;
      if (coverType === "file" && coverFile) {
        const { fileUrl, objectKey } = await uploadToR2(coverFile, "workout_cover");
        finalCover = fileUrl;
        finalCoverKey = objectKey;
      }

      const res = await fetch("/api/personal/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          image: finalAvatar || null,
          imageKey: finalAvatarKey || null,
          bio: bio || null,
          specialty,
          whatsapp,
          instagram: instagram || null,
          linkedin: linkedin || null,
          city,
          experience,
          cref: cref || null,
          brandName,
          brandSlogan: brandSlogan || null,
          brandColor,
          logoUrl: finalLogo,
          logoKey: finalLogoKey || null,
          watermarkUrl: finalWatermark || null,
          watermarkKey: finalWatermarkKey || null,
          workoutCoverUrl: finalCover || null,
          workoutCoverKey: finalCoverKey || null,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg || "Erro ao salvar informações de onboarding.");
      }

      const resData = await res.json();

      toast.success("Perfil e Assessoria configurados com sucesso! Bem-vindo(a) ao AtlasFit! 🚀");
      
      // Update nextauth session
      await update();

      if (resData.workspaceId) {
        workspaceActions.setActiveWorkspaceId(resData.workspaceId);
      }

      // Redirect to trainer dashboard
      router.push("/personal/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao finalizar o onboarding do Personal.");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = Math.round(((currentStep - 1) / 2) * 100);

  // Animation variants
  const slideVariants: any = {
    enter: (dir: number) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 100 : -100,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" },
    }),
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground flex flex-col justify-between select-none relative overflow-hidden font-sans">
      {/* Decorative Glow elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[40%] bg-primary/[0.03] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[40%] bg-purple-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="p-6 md:p-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/10">
            <Dumbbell className="size-4.5 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
            Atlas<span className="text-primary">Fit</span>
          </span>
        </div>
        <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest bg-white/[0.02] border border-white/[0.04] px-4 py-2 rounded-full">
          Painel do Personal
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-8 py-6 z-10">
        <div className="w-full max-w-xl md:max-w-2xl min-h-[420px] flex flex-col justify-center">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            
            {/* STEP 1: Perfil Profissional */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6 md:space-y-8"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <User className="size-3.5" /> Passo 1 de 3
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    Monte seu perfil profissional
                  </h2>
                  <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                    Estas informações serão expostas aos seus alunos no aplicativo deles.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Avatar upload */}
                  <div className="flex flex-col sm:flex-row items-center gap-5 pb-4 border-b border-white/[0.04]">
                    <div className="relative group size-20 rounded-full overflow-hidden border border-white/[0.08] bg-neutral-900 flex items-center justify-center shrink-0">
                      {imageType === "file" && imagePreview ? (
                        <img src={imagePreview} alt="Avatar Preview" className="size-full object-cover" />
                      ) : imageType === "url" && imageUrl ? (
                        <img src={imageUrl} alt="Avatar Preview" className="size-full object-cover" />
                      ) : (
                        <User className="size-9 text-neutral-500" />
                      )}
                      
                      {imageType === "file" && (
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                          <Camera className="size-4.5 text-white" />
                          <span className="text-[8px] font-black uppercase text-white">Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleFileSelect(e, setImageFile, setImagePreview)}
                          />
                        </label>
                      )}
                    </div>

                    <div className="space-y-3 flex-1 w-full">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-neutral-350">Foto de Perfil</Label>
                        <div className="flex gap-1.5 bg-neutral-900/80 p-0.5 rounded-lg border border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => setImageType("file")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              imageType === "file" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageType("url")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              imageType === "url" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Link URL
                          </button>
                        </div>
                      </div>

                      {imageType === "file" ? (
                        <p className="text-[10px] text-neutral-500 font-medium leading-normal">
                          Passe o cursor sobre o círculo para carregar uma imagem em JPG ou PNG.
                        </p>
                      ) : (
                        <Input
                          placeholder="https://exemplo.com/suafoto.png"
                          value={imageUrl}
                          onChange={(e) => setImageUrl(e.target.value)}
                          className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-10 text-white rounded-xl placeholder:text-neutral-600 font-semibold text-xs"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trainer-name" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        Nome Completo
                      </Label>
                      <Input
                        id="trainer-name"
                        placeholder="Ex: Ricardo Silva"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainer-specialty" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        Especialidade Principal
                      </Label>
                      <Input
                        id="trainer-specialty"
                        placeholder="Ex: Hipertrofia & Definição"
                        value={specialty}
                        onChange={(e) => setSpecialty(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trainer-experience" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        Anos de Experiência
                      </Label>
                      <Input
                        id="trainer-experience"
                        placeholder="Ex: 5 anos"
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-655 font-extrabold text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainer-cref" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Registro CREF (Opcional)</span>
                        <span className="text-[8px] text-neutral-500 font-semibold normal-case">Opcional</span>
                      </Label>
                      <Input
                        id="trainer-cref"
                        placeholder="Ex: CREF 123456-G/SP"
                        value={cref}
                        onChange={(e) => setCref(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trainer-bio" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Biografia Curta</span>
                      <span className="text-[8px] text-neutral-500 font-semibold normal-case">Opcional</span>
                    </Label>
                    <Textarea
                      id="trainer-bio"
                      placeholder="Conte rapidamente um pouco da sua trajetória e abordagem de treinos..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary min-h-[90px] text-white rounded-xl placeholder:text-neutral-650 font-semibold text-xs leading-relaxed resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Identidade Visual */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6 md:space-y-8"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <Paintbrush className="size-3.5" /> Passo 2 de 3
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    Crie a marca da sua Assessoria
                  </h2>
                  <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                    Personalize o visual e a cor primária que pintarão todo o painel de treino e PDFs.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand-name" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">
                        Nome da Assessoria / Marca
                      </Label>
                      <Input
                        id="brand-name"
                        placeholder="Ex: Silva Assessoria Esportiva"
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="brand-slogan" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Slogan / Slogan de Impacto</span>
                        <span className="text-[8px] text-neutral-500 font-semibold normal-case">Opcional</span>
                      </Label>
                      <Input
                        id="brand-slogan"
                        placeholder="Ex: Conquiste sua melhor versão"
                        value={brandSlogan}
                        onChange={(e) => setBrandSlogan(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                      />
                    </div>
                  </div>

                  {/* Primary Color Picker */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Palette className="size-3.5 text-primary" /> Cor do Tema da Assessoria
                    </Label>
                    <div className="flex gap-3">
                      <div className="relative size-12 shrink-0 rounded-xl overflow-hidden border border-white/[0.06] shadow-md">
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="absolute inset-0 size-full p-0 border-0 cursor-pointer scale-150"
                        />
                      </div>
                      <Input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="flex-1 uppercase font-mono text-sm tracking-wider rounded-xl bg-neutral-900 border-white/[0.06] h-12 text-white font-bold"
                      />
                    </div>
                  </div>

                  {/* LOGO, WATERMARK, COVER Inputs */}
                  <div className="space-y-4 pt-2 border-t border-white/[0.04]">
                    
                    {/* Logotipo */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Logotipo da Marca</Label>
                        <div className="flex gap-1.5 bg-neutral-900/80 p-0.5 rounded-lg border border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => setLogoType("file")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              logoType === "file" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoType("url")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              logoType === "url" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Link URL
                          </button>
                        </div>
                      </div>
                      
                      {logoType === "file" ? (
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, setLogoFile, setLogoPreview)}
                            className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-11 text-white rounded-xl text-xs flex items-center pt-2.5"
                          />
                          {logoPreview && (
                            <div className="size-11 rounded-lg border border-white/[0.06] bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0">
                              <img src={logoPreview} className="size-full object-cover" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <Input
                          placeholder="https://exemplo.com/logo.png"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-11 text-white rounded-xl text-xs"
                        />
                      )}
                    </div>

                    {/* Marca d'agua */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                          <span>Marca d'água de Impressão (Opcional)</span>
                        </Label>
                        <div className="flex gap-1.5 bg-neutral-900/80 p-0.5 rounded-lg border border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => setWatermarkType("file")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              watermarkType === "file" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setWatermarkType("url")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              watermarkType === "url" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Link URL
                          </button>
                        </div>
                      </div>
                      
                      {watermarkType === "file" ? (
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, setWatermarkFile, setWatermarkPreview)}
                            className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-11 text-white rounded-xl text-xs flex items-center pt-2.5"
                          />
                          {watermarkPreview && (
                            <div className="size-11 rounded-lg border border-white/[0.06] bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0">
                              <img src={watermarkPreview} className="size-full object-cover" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <Input
                          placeholder="https://exemplo.com/marca-dagua.png"
                          value={watermarkUrl}
                          onChange={(e) => setWatermarkUrl(e.target.value)}
                          className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-11 text-white rounded-xl text-xs"
                        />
                      )}
                    </div>

                    {/* Capa de treino */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider">Capa Padrão de Treinos (Opcional)</Label>
                        <div className="flex gap-1.5 bg-neutral-900/80 p-0.5 rounded-lg border border-white/[0.04]">
                          <button
                            type="button"
                            onClick={() => setCoverType("file")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              coverType === "file" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Arquivo
                          </button>
                          <button
                            type="button"
                            onClick={() => setCoverType("url")}
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                              coverType === "url" ? "bg-primary text-white" : "text-neutral-400"
                            }`}
                          >
                            Link URL
                          </button>
                        </div>
                      </div>
                      
                      {coverType === "file" ? (
                        <div className="flex items-center gap-3">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileSelect(e, setCoverFile, setCoverPreview)}
                            className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-11 text-white rounded-xl text-xs flex items-center pt-2.5"
                          />
                          {coverPreview && (
                            <div className="size-11 rounded-lg border border-white/[0.06] bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0">
                              <img src={coverPreview} className="size-full object-cover" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <Input
                          placeholder="https://exemplo.com/capa-treino.jpg"
                          value={coverUrl}
                          onChange={(e) => setCoverUrl(e.target.value)}
                          className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-11 text-white rounded-xl text-xs"
                        />
                      )}
                    </div>

                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Contatos e Localização */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6 md:space-y-8"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <Phone className="size-3.5" /> Passo 3 de 3
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    Como os alunos te contatam?
                  </h2>
                  <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                    Insira seus canais de contato e sua cidade/estado de atuação.
                  </p>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="trainer-whatsapp" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <Phone className="size-3 text-primary" /> WhatsApp (DDD + Celular)
                      </Label>
                      <Input
                        id="trainer-whatsapp"
                        placeholder="Ex: 11999999999"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainer-city" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                        <MapPin className="size-3 text-primary" /> Cidade / Estado (UF)
                      </Label>
                      <Input
                        id="trainer-city"
                        placeholder="Ex: São Paulo - SP"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.04]">
                    <div className="space-y-2">
                      <Label htmlFor="trainer-instagram" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={InstagramIcon} className="size-3.5 text-primary" /> Instagram
                        </span>
                        <span className="text-[8px] text-neutral-500 font-semibold normal-case">Opcional</span>
                      </Label>
                      <Input
                        id="trainer-instagram"
                        placeholder="Ex: @ricardo.personal"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="trainer-linkedin" className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <HugeiconsIcon icon={LinkedinIcon} className="size-3.5 text-primary" /> LinkedIn Link
                        </span>
                        <span className="text-[8px] text-neutral-500 font-semibold normal-case">Opcional</span>
                      </Label>
                      <Input
                        id="trainer-linkedin"
                        placeholder="Ex: linkedin.com/in/ricardo"
                        value={linkedin}
                        onChange={(e) => setLinkedin(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-650 font-extrabold text-sm"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-2xl flex gap-3.5 items-start mt-2">
                    <CheckCircle2 className="size-5.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-neutral-400 font-semibold leading-relaxed">
                      Quase tudo pronto! Ao finalizar, você terá acesso imediato ao seu dashboard, link de captação personalizado e poderá começar a gerenciar seus alunos e treinos.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      {/* Footer / Progress indicator */}
      <footer className="p-6 md:p-8 space-y-6 bg-neutral-950/80 backdrop-blur-md border-t border-white/[0.02] z-10">
        
        {/* Progress Tracker */}
        <div className="max-w-xl mx-auto space-y-2">
          <div className="h-1.5 w-full bg-neutral-900 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] font-black uppercase text-neutral-450 tracking-wider leading-none">
            <span>Início</span>
            <span>Concluído</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Button
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            variant="ghost"
            className="rounded-xl h-11 px-5 border border-white/[0.04] text-neutral-350 hover:text-white hover:bg-white/[0.03] disabled:opacity-30 disabled:hover:bg-transparent font-bold text-xs uppercase tracking-wider cursor-pointer"
          >
            <ChevronLeft className="size-4 mr-1" /> Voltar
          </Button>

          <Button
            onClick={handleNext}
            disabled={loading}
            className="rounded-xl h-11 px-6 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/10 cursor-pointer min-w-[120px]"
          >
            {loading ? (
              <div className="flex items-center gap-1.5">
                <Loader2 className="size-4 animate-spin" /> Finalizando...
              </div>
            ) : currentStep === 3 ? (
              "Finalizar"
            ) : (
              <div className="flex items-center gap-1">
                Próximo <ChevronRight className="size-4" />
              </div>
            )}
          </Button>
        </div>

      </footer>
    </div>
  );
}
