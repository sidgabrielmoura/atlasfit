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
import { Save, UploadCloud, Paintbrush, Image as ImageIcon, UserCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { updateProfile } from "./actions";

// Componente auxiliar para a área de upload visual
function UploadZone({ label, description, icon: Icon = UploadCloud }: { label: string, description: string, icon?: any }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors rounded-xl p-6 flex flex-col items-center justify-center gap-2 bg-secondary/10 cursor-pointer group">
        <div className="p-3 bg-secondary/50 rounded-full group-hover:bg-primary/10 transition-colors">
          <Icon className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Clique ou arraste um arquivo</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("marca");

  const { data: session, update } = useSession();
  const user = session?.user;

  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [city, setCity] = useState("");
  const [experience, setExperience] = useState("");
  const [cref, setCref] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Sync state with session values when loaded
  useEffect(() => {
    if (user) {
      setName(user.name || "");
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updateProfile({
        name,
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
        toast.success("Configurações salvas com sucesso!");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground mt-1">Personalize sua plataforma e gerencie suas informações.</p>
        </div>
        <Button 
          className="shrink-0 gap-2 font-semibold"
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
          <TabsTrigger value="marca" className="gap-2">
            <Paintbrush className="size-4" />
            Marca
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2">
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
                <CardTitle>Identidade Visual</CardTitle>
                <CardDescription>Defina o nome da sua assessoria e as imagens principais.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="brandName">Nome da Assessoria</Label>
                    <Input id="brandName" defaultValue={settingsData.brand.name} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brandSlogan">Slogan</Label>
                    <Input id="brandSlogan" defaultValue={settingsData.brand.slogan} />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border/50">
                  <UploadZone 
                    label="Logotipo" 
                    description="SVG, PNG ou JPG (Máx. 2MB)" 
                  />
                  <UploadZone 
                    label="Favicon" 
                    description="Ícone da aba do navegador (Recomendado: 32x32px)" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* 2. Cores */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Cores da Marca</CardTitle>
                <CardDescription>Personalize a paleta de cores do aplicativo do seu aluno.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="colorPrimary">Cor Principal</Label>
                    <div className="flex gap-2">
                      <Input type="color" id="colorPrimary" defaultValue={settingsData.brand.colors.primary} className="w-14 h-10 p-1 cursor-pointer" />
                      <Input defaultValue={settingsData.brand.colors.primary} className="flex-1 uppercase font-mono text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorSecondary">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input type="color" id="colorSecondary" defaultValue={settingsData.brand.colors.secondary} className="w-14 h-10 p-1 cursor-pointer" />
                      <Input defaultValue={settingsData.brand.colors.secondary} className="flex-1 uppercase font-mono text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorAccent">Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <Input type="color" id="colorAccent" defaultValue={settingsData.brand.colors.accent} className="w-14 h-10 p-1 cursor-pointer" />
                      <Input defaultValue={settingsData.brand.colors.accent} className="flex-1 uppercase font-mono text-sm" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Personalização (Imagens e Banners) */}
            <Card className="border-border/50 shadow-sm bg-card">
              <CardHeader>
                <CardTitle>Personalização Avançada</CardTitle>
                <CardDescription>Banners e marca d'água para seus PDFs e treinos.</CardDescription>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-6">
                <UploadZone 
                  label="Imagem / Banner do App" 
                  description="Banner principal exibido no topo do app do aluno (Proporção 16:9)"
                  icon={ImageIcon}
                />
                <UploadZone 
                  label="Foto do Personal" 
                  description="Sua foto profissional (Recomendado: 1080x1080px)"
                  icon={UserCircle}
                />
                <UploadZone 
                  label="Marca d'água em PDF" 
                  description="Logo sutil que aparecerá no fundo dos PDFs exportados"
                />
                <UploadZone 
                  label="Capa Padrão dos Treinos" 
                  description="Imagem exibida quando o treino não tiver capa específica"
                  icon={ImageIcon}
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
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="profName">Nome Completo</Label>
                    <Input 
                      id="profName" 
                      value={name} 
                      onChange={(e) => setName(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profSpecialty">Especialidade Principal</Label>
                    <Input 
                      id="profSpecialty" 
                      value={specialty} 
                      onChange={(e) => setSpecialty(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profBio">Biografia</Label>
                  <Textarea 
                    id="profBio" 
                    value={bio} 
                    onChange={(e) => setBio(e.target.value)} 
                    className="min-h-[120px] resize-none"
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profInstagram">Instagram</Label>
                    <Input 
                      id="profInstagram" 
                      value={instagram} 
                      onChange={(e) => setInstagram(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profLinkedin">LinkedIn</Label>
                    <Input 
                      id="profLinkedin" 
                      value={linkedin} 
                      onChange={(e) => setLinkedin(e.target.value)} 
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profExperience">Tempo de Experiência</Label>
                    <Input 
                      id="profExperience" 
                      value={experience} 
                      onChange={(e) => setExperience(e.target.value)} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profCref">CREF</Label>
                    <Input 
                      id="profCref" 
                      value={cref} 
                      onChange={(e) => setCref(e.target.value)} 
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
