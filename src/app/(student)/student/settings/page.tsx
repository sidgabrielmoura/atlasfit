"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Moon,
  Shield,
  Bell,
  Scale,
  User,
  Lock,
  Camera,
  Loader2,
  AlertTriangle,
  Sparkles,
  Info,
  TrendingUp,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";

// Staggered grid animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

export default function StudentSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { update } = useSession();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Profile data states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [city, setCity] = useState("");
  const [objective, setObjective] = useState(""); // Represents fitness goal / objective
  const [avatarBase64, setAvatarBase64] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [imageKey, setImageKey] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Physical data states
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [isUpdatingPhysical, setIsUpdatingPhysical] = useState(false);

  // Security password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Preferences local states
  const [unit, setUnit] = useState("kg");
  const [autoTimer, setAutoTimer] = useState(true);

  const loadSettingsData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const res = await fetch("/api/student/settings");
      if (!res.ok) {
        throw new Error("Erro ao buscar suas configurações pessoais.");
      }
      const rawData = await res.json();

      // Load user profile details
      if (rawData.user) {
        setName(rawData.user.name || "");
        setEmail(rawData.user.email || "");
        setWhatsapp(rawData.user.whatsapp || "");
        setCity(rawData.user.city || "");
        setObjective(rawData.user.objective || "");
        setAvatarBase64(rawData.user.image || "");
        setImageKey(rawData.user.imageKey || "");
      }

      // Load latest physical metrics
      if (rawData.physicalData) {
        setWeight(rawData.physicalData.weight?.toString() || "");
        setHeight(rawData.physicalData.height?.toString() || "");
        setBodyFat(rawData.physicalData.bodyFat?.toString() || "");
        setMuscleMass(rawData.physicalData.muscleMass?.toString() || "");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar seus dados cadastrais.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadSettingsData();
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarBase64(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning("O nome é obrigatório.");
      return;
    }

    setIsUpdatingProfile(true);
    const toastId = toast.loading("Atualizando perfil...");
    try {
      let finalAvatarUrl = avatarBase64;
      let finalImageKey = imageKey;

      if (avatarFile) {
        // 1. Get presigned URL
        const presignedRes = await fetch("/api/storage/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: avatarFile.name,
            contentType: avatarFile.type,
            fileSize: avatarFile.size,
            targetType: "avatar",
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
          headers: { "Content-Type": avatarFile.type },
          body: avatarFile,
        });

        if (!putRes.ok) {
          throw new Error("Erro ao transferir arquivo para o storage.");
        }

        finalAvatarUrl = fileUrl;
        finalImageKey = objectKey;
      }

      const res = await fetch("/api/student/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateProfile",
          name,
          whatsapp: whatsapp.trim() || null,
          city: city.trim() || null,
          objective: objective || null,
          image: finalAvatarUrl || null,
          imageKey: finalImageKey || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao atualizar o perfil.");
      }

      // Update next-auth session in real-time to keep sidebar/topbar dynamic avatars synced
      await update();
      setAvatarFile(null);
      await loadSettingsData(true);

      toast.success("Perfil atualizado com sucesso! 🎉", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao salvar seus dados pessoais.", { id: toastId });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleUpdatePhysical = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) {
      toast.warning("O peso corporal é obrigatório.");
      return;
    }

    setIsUpdatingPhysical(true);
    try {
      const res = await fetch("/api/student/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updatePhysical",
          weight,
          height: height || null,
          bodyFat: bodyFat || null,
          muscleMass: muscleMass || null,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg);
      }

      await loadSettingsData(true);
      toast.success("Dados físicos atualizados com sucesso no seu histórico! 📊");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao registrar suas métricas físicas.");
    } finally {
      setIsUpdatingPhysical(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning("Todos os campos de senha são obrigatórios.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("A nova senha e a confirmação não coincidem.");
      return;
    }

    if (newPassword.length < 6) {
      toast.warning("A nova senha deve possuir pelo menos 6 caracteres.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const res = await fetch("/api/student/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "changePassword",
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const errMsg = await res.text();
        throw new Error(errMsg);
      }

      toast.success("Senha alterada com sucesso! 🔒");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao alterar sua senha de acesso.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return <StudentSettingsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-16">
        <AlertTriangle className="size-12 mx-auto text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold">Falha ao carregar configurações</h2>
        <p className="text-neutral-400">{error}</p>
        <Button onClick={() => loadSettingsData()} variant="outline" className="gap-2">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-4 animate-in fade-in duration-500">
      <div className="space-y-1 border-b border-border/30 pb-4">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
          <User className="size-7 text-primary" /> Configurações
        </h1>
        <p className="text-sm text-neutral-400">
          Gerencie seus dados cadastrais, métricas físicas, senha e preferências de visualização.
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        {/* Navigation list */}
        <TabsList className="bg-muted dark:bg-neutral-900/60 p-1 border border-border dark:border-neutral-800 rounded-xl flex overflow-x-auto whitespace-nowrap md:w-fit gap-1 w-full justify-start scrollbar-none">
          <TabsTrigger
            value="profile"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <User className="size-4" /> Dados Pessoais
          </TabsTrigger>
          <TabsTrigger
            value="physical"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Scale className="size-4" /> Dados Físicos
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Shield className="size-4" /> Conta e Segurança
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="outline-none focus-visible:ring-0">
          <form onSubmit={handleUpdateProfile}>
            <Card className="border p-0 border-border dark:border-white/6 bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-neutral-900/30 border-b py-4! border-border dark:border-white/4">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <User className="size-4 text-primary" /> Informações do Meu Perfil
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Edite sua assinatura visual, informações de contato e objetivos pessoais.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Profile Avatar Upload */}
                <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-border dark:border-white/[0.04]">
                  <div className="relative group size-24 rounded-full overflow-hidden border border-border dark:border-white/[0.08] bg-muted dark:bg-neutral-900 flex items-center justify-center">
                    {avatarBase64 ? (
                      <img src={avatarBase64} alt="Foto de perfil" className="size-full object-cover" />
                    ) : (
                      <User className="size-10 text-muted-foreground dark:text-neutral-500" />
                    )}
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all">
                      <Camera className="size-5 text-white" />
                      <span className="text-[9px] font-black uppercase text-white">Alterar</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </label>
                  </div>
                  <div className="space-y-1 text-center sm:text-left">
                    <h3 className="font-extrabold text-base text-foreground">{name || "Seu Nome"}</h3>
                    <p className="text-xs text-muted-foreground dark:text-neutral-450">Clique no círculo para carregar uma nova foto de perfil (JPG ou PNG).</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nome Completo */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Nome Completo</Label>
                    <Input
                      placeholder="Seu Nome Completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.08] text-sm h-11 rounded-xl"
                    />
                  </div>

                  {/* E-mail (Disabled) */}
                  <div className="space-y-2 relative">
                    <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                      E-mail Primário <Info className="size-3 text-muted-foreground" />
                    </Label>
                    <Input
                      value={email}
                      disabled
                      className="bg-muted/30 dark:bg-neutral-900/30 border-border dark:border-white/[0.04] text-muted-foreground dark:text-neutral-500 text-sm h-11 rounded-xl cursor-not-allowed"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">WhatsApp (DDD + Celular)</Label>
                    <Input
                      placeholder="(11) 99999-9999"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.08] text-sm h-11 rounded-xl"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Cidade / UF</Label>
                    <Input
                      placeholder="Ex: São Paulo - SP"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.08] text-sm h-11 rounded-xl"
                    />
                  </div>

                  {/* Objetivos Pessoais Dropdown */}
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Objetivo Principal</Label>
                    <Select value={objective} onValueChange={setObjective}>
                      <SelectTrigger className="bg-background dark:bg-neutral-900/60 border-border w-full dark:border-white/8 h-11 rounded-xl text-sm">
                        <SelectValue placeholder="Selecione seu objetivo" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover dark:bg-neutral-950 border border-border dark:border-white/8">
                        <SelectItem value="hipertrofia">Hipertrofia Muscular (Ganho de Massa) 💪</SelectItem>
                        <SelectItem value="definição corporal">Definição Corporal & Queima Adiposa ✨</SelectItem>
                        <SelectItem value="perda de peso">Perda de Peso / Emagrecimento 🏃</SelectItem>
                        <SelectItem value="condicionamento físico">Condicionamento Físico & Resistência ⚡</SelectItem>
                        <SelectItem value="força">Força Máxima & Performance 🏋️</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-black uppercase rounded-xl px-8 h-11 cursor-pointer transition-all"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" /> Salvando...
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        {/* ==================== TAB 2: DADOS FÍSICOS BÁSICOS ==================== */}
        <TabsContent value="physical" className="outline-none focus-visible:ring-0">
          <form onSubmit={handleUpdatePhysical}>
            <Card className="border p-0 border-border dark:border-white/6 bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/50 dark:bg-neutral-900/30 border-b py-4! border-border dark:border-white/4">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Scale className="size-4 text-primary" /> Dados Físicos Básicos
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Monitore suas medidas de base corporais. Atualizações aqui geram novos registros na sua evolução física.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                  {/* Peso Corporal */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Peso Corporal (kg)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 78.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.08] text-sm h-11 rounded-xl"
                    />
                  </div>

                  {/* Altura */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Altura (cm)</Label>
                    <Input
                      type="number"
                      placeholder="Ex: 175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.08] text-sm h-11 rounded-xl"
                    />
                  </div>

                  {/* Percentual de Gordura */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Gordura Corporal (BF %)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 12.4"
                      value={bodyFat}
                      onChange={(e) => setBodyFat(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.08] text-sm h-11 rounded-xl"
                    />
                  </div>

                  {/* Massa Muscular */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Massa Muscular (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 42.1"
                      value={muscleMass}
                      onChange={(e) => setMuscleMass(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border-border dark:border-white/[0.08] text-sm h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingPhysical}
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-black uppercase rounded-xl px-8 h-11 cursor-pointer transition-all"
                  >
                    {isUpdatingPhysical ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" /> Atualizando...
                      </>
                    ) : (
                      "Atualizar Dados Físicos"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="security" className="outline-none focus-visible:ring-0 space-y-6">
          <Card className="border p-0 border-border dark:border-white/6 bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
            <CardHeader className="bg-muted/50 dark:bg-neutral-900/30 border-b py-4! border-border dark:border-white/4">
              <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sun className="size-4 text-primary" /> Preferências do Aplicativo
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Personalize o visual e comportamento padrão do seu portal do aluno.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-foreground">Modo Escuro / Premium Dark</Label>
                  <p className="text-[11px] text-muted-foreground dark:text-neutral-450 font-medium">Alternar o tema visual do sistema</p>
                </div>
                <Switch
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>

              <div className="flex items-center justify-between pb-2">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-foreground">Unidade de Medida de Peso</Label>
                  <p className="text-[11px] text-muted-foreground dark:text-neutral-450 font-medium">Peso exibido nas cargas e no perfil</p>
                </div>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger className="w-[100px] h-9 rounded-lg bg-background dark:bg-neutral-900/80 border border-border dark:border-white/[0.08] text-xs font-bold">
                    <SelectValue placeholder="Unid." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover dark:bg-neutral-950 border-border dark:border-white/[0.08]">
                    <SelectItem value="kg">Quilos (KG)</SelectItem>
                    <SelectItem value="lb">Libras (LB)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-sm font-bold text-foreground">Auto-Timer de Descanso</Label>
                  <p className="text-[11px] text-muted-foreground dark:text-neutral-450 font-medium">Iniciar cronômetro de descanso ao registrar séries</p>
                </div>
                <Switch checked={autoTimer} onCheckedChange={setAutoTimer} />
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleChangePassword}>
            <Card className="border p-0 border-border dark:border-white/6 bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/50 py-4 dark:bg-neutral-900/30 border-b border-border dark:border-white/4">
                <CardTitle className="text-sm font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Lock className="size-4 text-primary" /> Alterar Senha de Acesso
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Atualize sua senha periodicamente para manter sua conta segura.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Senha Atual</Label>
                    <Input
                      type="password"
                      placeholder="Sua senha atual"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border border-border dark:border-white/8 text-sm h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Nova Senha (mín. 6 dígitos)</Label>
                    <Input
                      type="password"
                      placeholder="Nova chave de acesso"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border border-border dark:border-white/8 text-sm h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground dark:text-neutral-300">Confirmar Nova Senha</Label>
                    <Input
                      type="password"
                      placeholder="Repita a nova senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-background dark:bg-neutral-900/60 border border-border dark:border-white/8 text-sm h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-black uppercase rounded-xl px-8 h-11 cursor-pointer transition-all"
                  >
                    {isUpdatingPassword ? (
                      <>
                        <Loader2 className="size-4 animate-spin mr-2" /> Alterando...
                      </>
                    ) : (
                      "Atualizar Minha Senha"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StudentSettingsSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-8 animate-pulse">
      <div className="space-y-2 border-b border-border/50 pb-4">
        <Skeleton className="h-8 w-64 max-w-full bg-muted/80 dark:bg-neutral-900" />
        <Skeleton className="h-4 w-full max-w-md bg-muted/80 dark:bg-neutral-900" />
      </div>

      <div className="flex gap-2 max-w-sm">
        <Skeleton className="h-10 w-28 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
        <Skeleton className="h-10 w-28 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
        <Skeleton className="h-10 w-28 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
      </div>

      <Card className="border border-border bg-card dark:bg-neutral-950/20 rounded-2xl h-95 p-6 space-y-6">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <Skeleton className="size-16 rounded-full bg-muted/80 dark:bg-neutral-900" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 bg-muted/80 dark:bg-neutral-900" />
            <Skeleton className="h-3.5 w-60 bg-muted/80 dark:bg-neutral-900" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-12 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
          <Skeleton className="h-12 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
          <Skeleton className="h-12 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
          <Skeleton className="h-12 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
        </div>
      </Card>
    </div>
  );
}
