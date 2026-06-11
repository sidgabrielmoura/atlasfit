"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronLeft, Dumbbell, Scale, Ruler, User as UserIcon, Calendar, MapPin, Activity, Target, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

// Steps list
const STEPS = [
  { id: 1, title: "Composição Corporal" },
  { id: 2, title: "Informações Pessoais" },
  { id: 3, title: "Seu Objetivo" },
  { id: 4, title: "Saúde & Segurança" }
];

export default function StudentOnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  
  const [gender, setGender] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");

  const [objective, setObjective] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");

  const [medicalConditions, setMedicalConditions] = useState("");

  // Navigation handlers
  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkipBodyStats = () => {
    setWeight("");
    setHeight("");
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weight: weight ? parseFloat(weight) : null,
          height: height ? parseFloat(height) : null,
          gender: gender || null,
          birthDate: birthDate || null,
          city: city || null,
          objective: objective || null,
          experienceLevel: experienceLevel || null,
          medicalConditions: medicalConditions || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar informações de onboarding.");
      }

      toast.success("Perfil configurado com sucesso! Bem-vindo(a) ao AtlasFit! 🚀");
      // Redirect to main dashboard
      router.push("/student/dashboard");
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao finalizar o onboarding.");
    } finally {
      setLoading(false);
    }
  };

  // Progress percentage
  const progressPercent = Math.round(((currentStep - 1) / 3) * 100);

  // Slide variants for framer-motion
  const slideVariants: any = {
    enter: (direction: number) => ({
      x: direction > 0 ? 150 : -150,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.25, ease: "easeOut" }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 150 : -150,
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" }
    })
  };

  const [direction, setDirection] = useState(1);

  const navigateToStep = (nextStep: number) => {
    setDirection(nextStep > currentStep ? 1 : -1);
    handleNext();
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-foreground flex flex-col justify-between select-none relative overflow-hidden font-sans">
      
      {/* 1. Header (Logo styled after ClickUp) */}
      <header className="p-6 md:p-8 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-lg shadow-primary/10">
            <Dumbbell className="size-4.5 text-white" />
          </div>
          <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent">
            Atlas<span className="text-primary">Fit</span>
          </span>
        </div>
        
        {currentStep === 1 && (
          <button 
            onClick={handleSkipBodyStats}
            className="text-xs text-neutral-450 hover:text-neutral-200 transition-colors font-bold uppercase tracking-wider bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] px-4 py-2 rounded-full cursor-pointer"
          >
            Pular etapa
          </button>
        )}
      </header>

      {/* 2. Main Content Box */}
      <main className="flex-1 flex items-center justify-center px-4 md:px-8 py-4 z-10">
        <div className="w-full max-w-lg md:max-w-xl min-h-[360px] flex flex-col justify-center">
          <AnimatePresence mode="wait" initial={false} custom={direction}>
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
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <Activity className="size-3.5" /> Passo 1 de 4
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    Qual é a sua composição corporal inicial?
                  </h2>
                  <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                    Esses dados ajudam o seu treinador a desenhar avaliações e a acompanhar seu progresso de peso de forma visual.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                      <Scale className="size-3.5 text-primary" /> Peso Atual (kg)
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex: 78.5"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-600 font-extrabold text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                      <Ruler className="size-3.5 text-primary" /> Altura (cm)
                    </label>
                    <Input
                      type="number"
                      placeholder="Ex: 175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-600 font-extrabold text-sm"
                    />
                  </div>
                </div>
              </motion.div>
            )}

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
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <UserIcon className="size-3.5" /> Passo 2 de 4
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    Fale um pouco sobre você
                  </h2>
                  <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                    Precisamos dessas informações básicas para adequação biológica e localização.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Gênero Selector */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider leading-none">
                      Gênero
                    </label>
                    <div className="flex flex-wrap gap-2.5">
                      {["Masculino", "Feminino", "Outro"].map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                            gender === g
                              ? "bg-primary border-primary text-white shadow-md shadow-primary/10 scale-[1.02]"
                              : "bg-neutral-900 border-white/[0.06] text-neutral-450 hover:text-neutral-200 hover:border-neutral-700"
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Birth Date */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        <Calendar className="size-3.5 text-primary" /> Data de Nascimento
                      </label>
                      <Input
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-600 font-extrabold text-sm block"
                      />
                    </div>

                    {/* Cidade */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 leading-none">
                        <MapPin className="size-3.5 text-primary" /> Cidade
                      </label>
                      <Input
                        type="text"
                        placeholder="Ex: Fortaleza"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary h-12 text-white rounded-xl placeholder:text-neutral-600 font-extrabold text-sm"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

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
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <Target className="size-3.5" /> Passo 3 de 4
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    Qual é o seu objetivo principal?
                  </h2>
                  <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                    Isso guiará o seu treinador na hora de criar seus blocos de treinos.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Objective selector tags (ClickUp Styled) */}
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      { id: "hipertrofia", label: "Hipertrofia 💪" },
                      { id: "definição corporal", label: "Definição corporal ✨" },
                      { id: "perda de peso", label: "Perda de peso 🏃" },
                      { id: "condicionamento físico", label: "Condicionamento físico ⚡" },
                      { id: "força", label: "Força 🏋️" }
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setObjective(opt.id)}
                        className={`px-5 py-3 rounded-full text-xs font-bold border transition-all cursor-pointer ${
                          objective === opt.id
                            ? "bg-primary border-primary text-white shadow-md shadow-primary/10 scale-[1.02]"
                            : "bg-neutral-900 border-white/[0.06] text-neutral-450 hover:text-neutral-200 hover:border-neutral-700"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Experience Level Selector */}
                  <div className="space-y-2.5 pt-3 border-t border-white/[0.04]">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider leading-none">
                      Nível de experiência na musculação
                    </label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: "iniciante", label: "Iniciante", desc: "Nunca treinei ou treino há menos de 6 meses" },
                        { id: "intermediario", label: "Intermediário", desc: "Treino de 6 meses a 2 anos com constância" },
                        { id: "avancado", label: "Avançado", desc: "Treino há mais de 2 anos de forma consistente" }
                      ].map((lvl) => (
                        <button
                          key={lvl.id}
                          type="button"
                          onClick={() => setExperienceLevel(lvl.id)}
                          className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-center ${
                            experienceLevel === lvl.id
                              ? "bg-primary/5 border-primary text-white scale-[1.01]"
                              : "bg-neutral-900 border-white/[0.06] text-neutral-400 hover:border-neutral-700"
                          }`}
                        >
                          <span className={`text-xs font-black uppercase tracking-wider ${experienceLevel === lvl.id ? "text-primary" : "text-white"}`}>
                            {lvl.label}
                          </span>
                          <span className="text-[10px] text-neutral-450 mt-1 font-semibold leading-relaxed">
                            {lvl.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="space-y-6 md:space-y-8"
              >
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none flex items-center gap-1.5">
                    <ShieldAlert className="size-3.5" /> Passo 4 de 4
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white leading-tight">
                    Restrições médicas ou dores?
                  </h2>
                  <p className="text-xs text-neutral-450 font-semibold leading-relaxed">
                    Possui dores nas articulações, lesões, cirurgias recentes ou problemas cardíacos/hipertensão? Relate abaixo.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider leading-none">
                      Lesões ou restrições (opcional)
                    </label>
                    <Textarea
                      placeholder="Ex: Sinto dores eventuais no joelho esquerdo ao fazer agachamento, possuo leve desvio na coluna..."
                      value={medicalConditions}
                      onChange={(e) => setMedicalConditions(e.target.value)}
                      className="bg-neutral-900 border-white/[0.06] focus-visible:ring-primary min-h-[140px] text-white rounded-xl placeholder:text-neutral-600 font-semibold text-xs leading-relaxed"
                    />
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex gap-3 items-start">
                    <ShieldAlert className="size-5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-neutral-450 font-semibold leading-relaxed">
                      Sua segurança física é prioridade. Essas informações ficarão visíveis apenas para o seu personal trainer na hora de adaptar os exercícios das planilhas.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 3. Footer Actions & Progress Indicator (ClickUp Styled) */}
      <footer className="p-6 md:p-8 space-y-6 bg-neutral-950/80 backdrop-blur-md border-t border-white/[0.02] z-10">
        
        {/* Progress bar line */}
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

        {/* Action Buttons */}
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
                <Loader2 className="size-4 animate-spin" /> Finalizando
              </div>
            ) : currentStep === 4 ? (
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
