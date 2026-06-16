"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  ClipboardCheck,
  Loader2,
  Plus,
  Scale,
  Ruler,
  Flame,
  Activity,
  Heart,
  AlertTriangle,
  Upload,
  X,
  FileText,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";

interface PhysicalEvaluationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  workspaceId: string;
  studentName?: string;
  studentGender?: string;
  studentBirthDate?: string;
  studentHeight?: number;
  studentWeight?: number;
  studentObjective?: string;
  onSuccess: () => void;
}

export function PhysicalEvaluationFormModal({
  isOpen,
  onClose,
  studentId,
  workspaceId,
  studentName = "",
  studentGender = "male",
  studentBirthDate = "",
  studentHeight,
  studentWeight,
  studentObjective = "",
  onSuccess
}: PhysicalEvaluationFormModalProps) {
  const [activeTab, setActiveTab] = useState("anamnese");
  const [submitting, setSubmitting] = useState(false);

  // General evaluation info
  const [evalDate, setEvalDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [evalType, setEvalType] = useState("Avaliação Completa (Dobras Cutâneas)");

  // 1. Anamnese states
  const [anamneseNome, setAnamneseNome] = useState(studentName);
  const [anamneseGender, setAnamneseGender] = useState(studentGender === "Masculino" || studentGender === "male" ? "male" : "female");
  const [anamneseBirthDate, setAnamneseBirthDate] = useState(() => {
    if (studentBirthDate) {
      try {
        return new Date(studentBirthDate).toISOString().substring(0, 10);
      } catch (e) {
        return "";
      }
    }
    return "";
  });
  const [anamneseObjective, setAnamneseObjective] = useState("");
  const [anamneseActivityLevel, setAnamneseActivityLevel] = useState("moderado"); // leve, moderado, intenso
  const [anamneseInjuries, setAnamneseInjuries] = useState("");
  const [anamneseIllnesses, setAnamneseIllnesses] = useState("");
  const [anamneseMedications, setAnamneseMedications] = useState("");
  const [anamneseRestrictions, setAnamneseRestrictions] = useState("");
  const [anamneseEatingHabits, setAnamneseEatingHabits] = useState("");
  const [anamneseSleepQuality, setAnamneseSleepQuality] = useState("boa"); // ruim, regular, boa, excelente

  // 2. Antropometria Básica states
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");

  // 3. Circunferências Corporais states
  const [circChest, setCircChest] = useState("");
  const [circWaist, setCircWaist] = useState("");
  const [circAbdomen, setCircAbdomen] = useState("");
  const [circHips, setCircHips] = useState("");
  const [circRightArmRelaxed, setCircRightArmRelaxed] = useState("");
  const [circLeftArmRelaxed, setCircLeftArmRelaxed] = useState("");
  const [circRightArmContracted, setCircRightArmContracted] = useState("");
  const [circLeftArmContracted, setCircLeftArmContracted] = useState("");
  const [circRightThigh, setCircRightThigh] = useState("");
  const [circLeftThigh, setCircLeftThigh] = useState("");
  const [circRightCalf, setCircRightCalf] = useState("");
  const [circLeftCalf, setCircLeftCalf] = useState("");

  // 4. Dobras Cutâneas states (J&P 3 Dobras)
  // Men: Peitoral, Abdominal, Coxa
  // Women: Tricipital, Suprailiaca, Coxa
  const [foldPeitoral, setFoldPeitoral] = useState("");
  const [foldAbdominal, setFoldAbdominal] = useState("");
  const [foldCoxa, setFoldCoxa] = useState("");
  const [foldTricipital, setFoldTricipital] = useState("");
  const [foldSuprailiaca, setFoldSuprailiaca] = useState("");

  // Real-time calculated results
  const [calculatedImc, setCalculatedImc] = useState<number | null>(null);
  const [imcClass, setImcClass] = useState("");
  const [calculatedBf, setCalculatedBf] = useState<number | null>(null);
  const [bfClass, setBfClass] = useState("");
  const [calculatedLeanMass, setCalculatedLeanMass] = useState<number | null>(null);
  const [calculatedFatMass, setCalculatedFatMass] = useState<number | null>(null);

  // 5. Avaliação Postural states
  const [photoFrontal, setPhotoFrontal] = useState("");
  const [photoPosterior, setPhotoPosterior] = useState("");
  const [photoLateralRight, setPhotoLateralRight] = useState("");
  const [photoLateralLeft, setPhotoLateralLeft] = useState("");

  const [posturalOmbros, setPosturalOmbros] = useState("Normal");
  const [posturalCabeca, setPosturalCabeca] = useState("Normal");
  const [posturalQuadril, setPosturalQuadril] = useState("Normal");
  const [posturalJoelhos, setPosturalJoelhos] = useState("Normal");
  const [posturalTornozelos, setPosturalTornozelos] = useState("Normal");
  const [posturalColuna, setPosturalColuna] = useState("Normal");
  const [posturalDeviations, setPosturalDeviations] = useState("");
  const [posturalReport, setPosturalReport] = useState("");

  // 6. Avaliação de Dor e Mobilidade
  const [painScale, setPainScale] = useState(0);
  const [painRegions, setPainRegions] = useState<Record<string, number>>({});
  const [painLimitations, setPainLimitations] = useState("");
  const [painHistory, setPainHistory] = useState("");

  // List of standard pain regions
  const standardPainRegions = [
    { id: "cervical", label: "Cervical" },
    { id: "ombro_d", label: "Ombro Direito" },
    { id: "ombro_e", label: "Ombro Esquerdo" },
    { id: "toracica", label: "Coluna Torácica" },
    { id: "lombar", label: "Lombar" },
    { id: "cotovelo_d", label: "Cotovelo Direito" },
    { id: "cotovelo_e", label: "Cotovelo Esquerdo" },
    { id: "quadril_d", label: "Quadril Direito" },
    { id: "quadril_e", label: "Quadril Esquerdo" },
    { id: "joelho_d", label: "Joelho Direito" },
    { id: "joelho_e", label: "Joelho Esquerdo" },
    { id: "tornozelo_d", label: "Tornozelo Direito" },
    { id: "tornozelo_e", label: "Tornozelo Esquerdo" }
  ];

  // 7. Testes Físicos states
  const [flexWells, setFlexWells] = useState("");
  const [flexClassification, setFlexClassification] = useState("");

  const [cardioTestType, setCardioTestType] = useState("Caminhada"); // Caminhada, Cooper
  const [cardioHr, setCardioHr] = useState("");
  const [cardioVo2, setCardioVo2] = useState("");

  const [forcaExercise, setForcaExercise] = useState("Supino Reto");
  const [forcaLoad, setForcaLoad] = useState("");
  const [forcaReps, setForcaReps] = useState("");
  const [forcaRm, setForcaRm] = useState<number | null>(null);

  const [notes, setNotes] = useState("");

  // Sync initial fields if user properties change or modal is opened
  useEffect(() => {
    if (isOpen) {
      setActiveTab("anamnese");
      setEvalDate(new Date().toISOString().substring(0, 10));
      setEvalType("Avaliação Completa (Dobras Cutâneas)");

      // Basic student data pre-filling
      setAnamneseNome(studentName || "");
      setAnamneseGender(studentGender === "Masculino" || studentGender === "male" || studentGender === "Feminino" || studentGender === "female" ? (studentGender === "Masculino" || studentGender === "male" ? "male" : "female") : "male");
      if (studentBirthDate) {
        try {
          setAnamneseBirthDate(new Date(studentBirthDate).toISOString().substring(0, 10));
        } catch (e) {
          setAnamneseBirthDate("");
        }
      } else {
        setAnamneseBirthDate("");
      }
      setAnamneseObjective(studentObjective || "");
      setWeight(studentWeight ? String(studentWeight) : "");
      setHeight(studentHeight ? String(studentHeight) : "");

      // Reset other form fields
      setAnamneseActivityLevel("moderado");
      setAnamneseInjuries("");
      setAnamneseIllnesses("");
      setAnamneseMedications("");
      setAnamneseRestrictions("");
      setAnamneseEatingHabits("");
      setAnamneseSleepQuality("boa");

      setCircChest("");
      setCircWaist("");
      setCircAbdomen("");
      setCircHips("");
      setCircRightArmRelaxed("");
      setCircLeftArmRelaxed("");
      setCircRightArmContracted("");
      setCircLeftArmContracted("");
      setCircRightThigh("");
      setCircLeftThigh("");
      setCircRightCalf("");
      setCircLeftCalf("");

      setFoldPeitoral("");
      setFoldAbdominal("");
      setFoldCoxa("");
      setFoldTricipital("");
      setFoldSuprailiaca("");

      setPhotoFrontal("");
      setPhotoPosterior("");
      setPhotoLateralRight("");
      setPhotoLateralLeft("");

      setPosturalOmbros("Normal");
      setPosturalCabeca("Normal");
      setPosturalQuadril("Normal");
      setPosturalJoelhos("Normal");
      setPosturalTornozelos("Normal");
      setPosturalColuna("Normal");
      setPosturalDeviations("");
      setPosturalReport("");

      setPainScale(0);
      setPainRegions({});
      setPainLimitations("");
      setPainHistory("");

      setFlexWells("");
      setFlexClassification("");
      setCardioTestType("Caminhada");
      setCardioHr("");
      setCardioVo2("");
      setForcaExercise("Supino Reto");
      setForcaLoad("");
      setForcaReps("");
      setNotes("");
    }
  }, [
    isOpen,
    studentId,
    studentName,
    studentGender,
    studentBirthDate,
    studentHeight,
    studentWeight,
    studentObjective
  ]);

  // Real-time calculations: IMC
  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    if (w > 0 && h > 0) {
      const heightM = h / 100;
      const imc = w / (heightM * heightM);
      setCalculatedImc(parseFloat(imc.toFixed(2)));

      if (imc < 18.5) setImcClass("Abaixo do peso");
      else if (imc <= 24.9) setImcClass("Peso normal");
      else if (imc <= 29.9) setImcClass("Sobrepeso");
      else if (imc <= 34.9) setImcClass("Obesidade Grau I");
      else if (imc <= 39.9) setImcClass("Obesidade Grau II");
      else setImcClass("Obesidade Grau III");
    } else {
      setCalculatedImc(null);
      setImcClass("");
    }
  }, [weight, height]);

  // Real-time calculations: Jackson & Pollock 3 Dobras
  useEffect(() => {
    const w = parseFloat(weight);
    if (!w || w <= 0) {
      setCalculatedBf(null);
      setCalculatedFatMass(null);
      setCalculatedLeanMass(null);
      setBfClass("");
      return;
    }

    let age = 30;
    if (anamneseBirthDate) {
      try {
        const dob = new Date(anamneseBirthDate);
        const today = new Date();
        age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
      } catch (e) { }
    }

    let bf = 0;
    let valid = false;

    if (anamneseGender === "male") {
      const p = parseFloat(foldPeitoral);
      const a = parseFloat(foldAbdominal);
      const c = parseFloat(foldCoxa);
      if (p > 0 && a > 0 && c > 0) {
        const sum = p + a + c;
        const density = 1.10938 - (0.0008267 * sum) + (0.0000016 * sum * sum) - (0.0002574 * age);
        if (density > 0) {
          bf = ((4.95 / density) - 4.50) * 100;
          valid = true;
        }
      }
    } else {
      const t = parseFloat(foldTricipital);
      const s = parseFloat(foldSuprailiaca);
      const c = parseFloat(foldCoxa);
      if (t > 0 && s > 0 && c > 0) {
        const sum = t + s + c;
        const density = 1.0994921 - (0.0009929 * sum) + (0.0000023 * sum * sum) - (0.0001392 * age);
        if (density > 0) {
          bf = ((4.95 / density) - 4.50) * 100;
          valid = true;
        }
      }
    }

    if (valid) {
      bf = Math.max(0, Math.min(100, bf));
      setCalculatedBf(parseFloat(bf.toFixed(2)));

      const fat = w * (bf / 100);
      const lean = w - fat;
      setCalculatedFatMass(parseFloat(fat.toFixed(2)));
      setCalculatedLeanMass(parseFloat(lean.toFixed(2)));

      let classification = "";
      if (anamneseGender === "male") {
        if (bf < 6) classification = "Gordura Essencial";
        else if (bf <= 13) classification = "Atleta";
        else if (bf <= 17) classification = "Fitness";
        else if (bf <= 24) classification = "Normal / Aceitável";
        else classification = "Obesidade";
      } else {
        if (bf < 14) classification = "Gordura Essencial";
        else if (bf <= 20) classification = "Atleta";
        else if (bf <= 24) classification = "Fitness";
        else if (bf <= 31) classification = "Normal / Aceitável";
        else classification = "Obesidade";
      }
      setBfClass(classification);
    } else {
      setCalculatedBf(null);
      setCalculatedFatMass(null);
      setCalculatedLeanMass(null);
      setBfClass("");
    }
  }, [anamneseGender, anamneseBirthDate, weight, foldPeitoral, foldAbdominal, foldCoxa, foldTricipital, foldSuprailiaca]);

  // Real-time calculations: 1RM
  useEffect(() => {
    const l = parseFloat(forcaLoad);
    const r = parseInt(forcaReps);
    if (l > 0 && r > 0) {
      const rm = r === 1 ? l : l * (1 + r / 30);
      setForcaRm(parseFloat(rm.toFixed(2)));
    } else {
      setForcaRm(null);
    }
  }, [forcaLoad, forcaReps]);

  // Flexibility classification helper
  useEffect(() => {
    const v = parseFloat(flexWells);
    if (!isNaN(v)) {
      if (v < 20) setFlexClassification("Fraca");
      else if (v <= 29) setFlexClassification("Regular");
      else if (v <= 35) setFlexClassification("Boa");
      else setFlexClassification("Excelente");
    } else {
      setFlexClassification("");
    }
  }, [flexWells]);

  // Base64 file uploader
  const handlePhotoUpload = (view: "frontal" | "posterior" | "right" | "left", file: File | null) => {
    if (!file) {
      if (view === "frontal") setPhotoFrontal("");
      if (view === "posterior") setPhotoPosterior("");
      if (view === "right") setPhotoLateralRight("");
      if (view === "left") setPhotoLateralLeft("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (view === "frontal") setPhotoFrontal(base64);
      if (view === "posterior") setPhotoPosterior(base64);
      if (view === "right") setPhotoLateralRight(base64);
      if (view === "left") setPhotoLateralLeft(base64);
    };
    reader.readAsDataURL(file);
  };



  // Submit Handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSubmitting(true);

      const hasDobras = foldPeitoral.trim() || foldAbdominal.trim() || foldCoxa.trim() || foldTricipital.trim() || foldSuprailiaca.trim();
      const dobrasData = hasDobras ? {
        peitoral: parseFloat(foldPeitoral) || 0,
        abdominal: parseFloat(foldAbdominal) || 0,
        coxa: parseFloat(foldCoxa) || 0,
        triceps: parseFloat(foldTricipital) || 0,
        suprailiaca: parseFloat(foldSuprailiaca) || 0
      } : null;

      const hasCircunferencias = circChest.trim() || circWaist.trim() || circAbdomen.trim() || circHips.trim() ||
        circRightArmRelaxed.trim() || circLeftArmRelaxed.trim() ||
        circRightArmContracted.trim() || circLeftArmContracted.trim() ||
        circRightThigh.trim() || circLeftThigh.trim() ||
        circRightCalf.trim() || circLeftCalf.trim();
      const circunferenciasData = hasCircunferencias ? {
        chest: parseFloat(circChest) || null,
        waist: parseFloat(circWaist) || null,
        abdomen: parseFloat(circAbdomen) || null,
        hips: parseFloat(circHips) || null,
        rightArmRelaxed: parseFloat(circRightArmRelaxed) || null,
        leftArmRelaxed: parseFloat(circLeftArmRelaxed) || null,
        rightArmContracted: parseFloat(circRightArmContracted) || null,
        leftArmContracted: parseFloat(circLeftArmContracted) || null,
        rightThigh: parseFloat(circRightThigh) || null,
        leftThigh: parseFloat(circLeftThigh) || null,
        rightCalf: parseFloat(circRightCalf) || null,
        leftCalf: parseFloat(circLeftCalf) || null
      } : null;

      const hasPostural = photoFrontal || photoPosterior || photoLateralRight || photoLateralLeft ||
        posturalDeviations.trim() || posturalReport.trim() ||
        posturalOmbros !== "Normal" || posturalCabeca !== "Normal" || posturalQuadril !== "Normal" ||
        posturalJoelhos !== "Normal" || posturalTornozelos !== "Normal" || posturalColuna !== "Normal";
      const posturalData = hasPostural ? {
        photos: {
          frontal: photoFrontal || null,
          posterior: photoPosterior || null,
          lateralRight: photoLateralRight || null,
          lateralLeft: photoLateralLeft || null
        },
        ombros: posturalOmbros,
        cabeca: posturalCabeca,
        quadril: posturalQuadril,
        joelhos: posturalJoelhos,
        tornozelos: posturalTornozelos,
        coluna: posturalColuna,
        deviations: posturalDeviations.trim(),
        report: posturalReport.trim()
      } : null;

      const hasDorMobilidade = painScale > 0 || Object.keys(painRegions).length > 0 || painLimitations.trim() || painHistory.trim();
      const dorMobilidadeData = hasDorMobilidade ? {
        painScale,
        regions: painRegions,
        limitations: painLimitations.trim(),
        history: painHistory.trim()
      } : null;

      const hasTestesFisicos = flexWells.trim() || cardioHr.trim() || cardioVo2.trim() || forcaLoad.trim() || forcaReps.trim();
      const testesFisicosData = hasTestesFisicos ? {
        flexibilidade: {
          wells: parseFloat(flexWells) || null,
          classification: flexClassification || null
        },
        cardio: {
          testType: cardioTestType,
          hr: parseFloat(cardioHr) || null,
          vo2: parseFloat(cardioVo2) || null
        },
        forca: {
          exercise: forcaExercise,
          load: parseFloat(forcaLoad) || null,
          reps: parseInt(forcaReps) || null
        }
      } : null;

      const weightVal = parseFloat(weight) || 0;
      const heightVal = parseFloat(height) || 0;

      const hasAnamnese = anamneseNome.trim() || anamneseBirthDate || anamneseObjective.trim() || anamneseInjuries.trim() || anamneseIllnesses.trim() || anamneseMedications.trim() || anamneseRestrictions.trim() || anamneseEatingHabits.trim();
      const anamneseData = hasAnamnese ? {
        name: anamneseNome.trim() || null,
        gender: anamneseGender,
        birthDate: anamneseBirthDate || null,
        objective: anamneseObjective.trim() || null,
        activityLevel: anamneseActivityLevel,
        injuries: anamneseInjuries.trim() || null,
        illnesses: anamneseIllnesses.trim() || null,
        medications: anamneseMedications.trim() || null,
        restrictions: anamneseRestrictions.trim() || null,
        eatingHabits: anamneseEatingHabits.trim() || null,
        sleepQuality: anamneseSleepQuality
      } : null;

      const payload = {
        workspaceId,
        date: evalDate,
        type: evalType,
        weight: weightVal,
        height: heightVal,
        bodyFat: calculatedBf,
        muscleMass: calculatedLeanMass && weightVal > 0 ? parseFloat(((calculatedLeanMass / weightVal) * 100).toFixed(2)) : null,
        notes: notes.trim() || null,
        anamnese: anamneseData,
        circunferencias: circunferenciasData,
        dobras: dobrasData,
        postural: posturalData,
        dorMobilidade: dorMobilidadeData,
        testesFisicos: testesFisicosData
      };

      const res = await fetch(`/api/personal/clients/${studentId}/evaluations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao salvar avaliação física.");
      }

      toast.success("Avaliação física de alta precisão gravada com sucesso!");
      onSuccess();
      onClose();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Ocorreu um erro ao gravar a avaliação.");
    } finally {
      setSubmitting(false);
    }
  };

  const tabsConfig = [
    { id: "anamnese", label: "1. Anamnese", icon: ClipboardCheck },
    { id: "antropometria", label: "2. Medidas", icon: Ruler },
    { id: "dobras", label: "3. Dobras J&P", icon: Flame },
    { id: "postural", label: "4. Postural", icon: Activity },
    { id: "dor", label: "5. Dor & Mobilidade", icon: Heart },
    { id: "testes", label: "6. Testes Físicos", icon: FileText }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="w-full gap-0 max-w-[calc(100%-1.5rem)] md:max-w-4xl bg-card dark:bg-neutral-950 border border-border dark:border-neutral-900 text-foreground h-[92vh] md:h-[85vh] max-h-[800px] rounded-2xl shadow-2xl p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 border-b border-border dark:border-neutral-900 shrink-0">
          <DialogTitle className="text-lg font-black flex items-center gap-2">
            <ClipboardCheck className="size-5 text-orange-500" />
            Avaliação Física de Alta Precisão
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Insira os dados da avaliação para o aluno. O percentual de gordura (Jackson-Pollock 3 dobras), IMC e força 1RM são computados automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          <div className="md:w-56 border-b md:border-b-0 md:border-r border-border dark:border-neutral-900 bg-muted/20 p-3 space-y-1 shrink-0">
            <div className="space-y-1.5 hidden md:block mb-4">
              <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider px-2">Seções da Ficha</span>
            </div>
            <div className="flex overflow-x-auto md:flex-col gap-1 no-scrollbar pb-2 md:pb-0">
              {tabsConfig.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all text-left whitespace-nowrap md:w-full ${activeTab === t.id
                      ? "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20"
                      : "text-muted-foreground hover:bg-muted dark:hover:bg-neutral-900"
                      }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsContent value="anamnese" className="space-y-4 outline-none mt-0">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <ClipboardCheck className="size-4 text-orange-500" /> 1. Questionário de Anamnese (Obrigatório)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseNome" className="text-xs font-bold text-muted-foreground">Nome Completo</Label>
                      <Input
                        id="anamneseNome"
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                        value={anamneseNome}
                        onChange={(e) => setAnamneseNome(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseGender" className="text-xs font-bold text-muted-foreground">Sexo Biológico</Label>
                      <Select value={anamneseGender} onValueChange={(val: any) => setAnamneseGender(val)} disabled={submitting}>
                        <SelectTrigger id="anamneseGender" className="bg-muted w-full dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9">
                          <SelectValue placeholder="Sexo" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border dark:border-neutral-800">
                          <SelectItem value="male" className="text-xs">Masculino</SelectItem>
                          <SelectItem value="female" className="text-xs">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseBirthDate" className="text-xs font-bold text-muted-foreground">Data de Nascimento</Label>
                      <Input
                        id="anamneseBirthDate"
                        type="date"
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                        value={anamneseBirthDate}
                        onChange={(e) => setAnamneseBirthDate(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseObjective" className="text-xs font-bold text-muted-foreground">Objetivo Principal</Label>
                      <Input
                        id="anamneseObjective"
                        placeholder="Ex: Emagrecimento, Hipertrofia..."
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                        value={anamneseObjective}
                        onChange={(e) => setAnamneseObjective(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseActivityLevel" className="text-xs font-bold text-muted-foreground">Nível de Atividade Física</Label>
                      <Select value={anamneseActivityLevel} onValueChange={setAnamneseActivityLevel} disabled={submitting}>
                        <SelectTrigger id="anamneseActivityLevel" className="bg-muted w-full dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9">
                          <SelectValue placeholder="Nível de Atividade" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border dark:border-neutral-800">
                          <SelectItem value="sedentario" className="text-xs">Sedentário (Sem exercício)</SelectItem>
                          <SelectItem value="leve" className="text-xs">Leve (1-2x por semana)</SelectItem>
                          <SelectItem value="moderado" className="text-xs">Moderado (3-5x por semana)</SelectItem>
                          <SelectItem value="intenso" className="text-xs">Intenso (Todos os dias)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseInjuries" className="text-xs font-bold text-muted-foreground">Histórico de Lesões</Label>
                      <Textarea
                        id="anamneseInjuries"
                        placeholder="Descreva lesões musculares, articulares, cirurgias antigas..."
                        rows={2}
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs p-2.5 focus-visible:ring-0"
                        value={anamneseInjuries}
                        onChange={(e) => setAnamneseInjuries(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseIllnesses" className="text-xs font-bold text-muted-foreground">Doenças Preexistentes</Label>
                      <Textarea
                        id="anamneseIllnesses"
                        placeholder="Ex: Diabetes, Hipertensão, Cardiopatias..."
                        rows={2}
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs p-2.5 focus-visible:ring-0"
                        value={anamneseIllnesses}
                        onChange={(e) => setAnamneseIllnesses(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseMedications" className="text-xs font-bold text-muted-foreground">Medicamentos em Uso</Label>
                      <Input
                        id="anamneseMedications"
                        placeholder="Uso contínuo ou frequente"
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                        value={anamneseMedications}
                        onChange={(e) => setAnamneseMedications(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseRestrictions" className="text-xs font-bold text-muted-foreground">Restrições Médicas</Label>
                      <Input
                        id="anamneseRestrictions"
                        placeholder="Recomendações ou impedimentos declarados por médicos"
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                        value={anamneseRestrictions}
                        onChange={(e) => setAnamneseRestrictions(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseEatingHabits" className="text-xs font-bold text-muted-foreground">Hábitos Alimentares</Label>
                      <Input
                        id="anamneseEatingHabits"
                        placeholder="Ex: Segue dieta, Consome muito doce, Pouca água..."
                        className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                        value={anamneseEatingHabits}
                        onChange={(e) => setAnamneseEatingHabits(e.target.value)}
                        disabled={submitting}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="anamneseSleepQuality" className="text-xs font-bold text-muted-foreground">Qualidade do Sono</Label>
                      <Select value={anamneseSleepQuality} onValueChange={setAnamneseSleepQuality} disabled={submitting}>
                        <SelectTrigger id="anamneseSleepQuality" className="bg-muted w-full dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9">
                          <SelectValue placeholder="Sono" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border dark:border-neutral-800">
                          <SelectItem value="ruim" className="text-xs">Ruim (Insônia/Acorda cansado)</SelectItem>
                          <SelectItem value="regular" className="text-xs">Regular (Levemente agitado)</SelectItem>
                          <SelectItem value="boa" className="text-xs">Boa (Sono contínuo)</SelectItem>
                          <SelectItem value="excelente" className="text-xs">Excelente (Profundo e reparador)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* 2. ANTROPOMETRIA & CIRCUNFERÊNCIAS */}
                <TabsContent value="antropometria" className="space-y-4 outline-none mt-0">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Ruler className="size-4 text-orange-500" /> 2. Antropometria Básica & Circunferências Corporais
                    </h3>
                  </div>

                  <div className="bg-muted/30 dark:bg-neutral-900/30 border border-border dark:border-neutral-900 p-4 rounded-2xl">
                    <h4 className="text-xs font-extrabold text-foreground mb-3 uppercase tracking-wider flex items-center gap-1">
                      <Scale className="size-4 text-sky-400" /> Fatores Básicos (IMC)
                    </h4>
                    <div className="grid grid-cols-2 gap-3 items-end">
                      <div className="space-y-1.5">
                        <Label htmlFor="weight" className="text-xs font-bold text-muted-foreground">Peso (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          step="0.01"
                          placeholder="Ex: 78.5"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={weight}
                          onChange={(e) => setWeight(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="height" className="text-xs font-bold text-muted-foreground">Altura (cm)</Label>
                        <Input
                          id="height"
                          type="number"
                          placeholder="Ex: 178"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={height}
                          onChange={(e) => setHeight(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      {calculatedImc !== null && (
                        <div className="col-span-2 bg-muted/60 dark:bg-neutral-900/60 p-2.5 rounded-xl border border-border/40 dark:border-neutral-800/60 flex items-center justify-between text-xs">
                          <div>
                            <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">IMC Calculado</span>
                            <span className="font-extrabold text-foreground text-sm">{calculatedImc}</span>
                          </div>
                          <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold px-2 py-0.5 rounded text-[10px]">
                            {imcClass}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider px-1">Perímetros / Circunferências (cm)</h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="circChest" className="text-[10px] font-medium text-muted-foreground">Tronco - Peitoral</Label>
                        <Input
                          id="circChest"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circChest}
                          onChange={(e) => setCircChest(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circWaist" className="text-[10px] font-medium text-muted-foreground">Cintura</Label>
                        <Input
                          id="circWaist"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circWaist}
                          onChange={(e) => setCircWaist(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circAbdomen" className="text-[10px] font-medium text-muted-foreground">Abdômen</Label>
                        <Input
                          id="circAbdomen"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circAbdomen}
                          onChange={(e) => setCircAbdomen(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circHips" className="text-[10px] font-medium text-muted-foreground">Quadril</Label>
                        <Input
                          id="circHips"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circHips}
                          onChange={(e) => setCircHips(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/20 pt-3">
                      <div className="space-y-1">
                        <Label htmlFor="circRightArmRelaxed" className="text-[10px] font-medium text-muted-foreground">Braço Relaxado Dir.</Label>
                        <Input
                          id="circRightArmRelaxed"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circRightArmRelaxed}
                          onChange={(e) => setCircRightArmRelaxed(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circLeftArmRelaxed" className="text-[10px] font-medium text-muted-foreground">Braço Relaxado Esq.</Label>
                        <Input
                          id="circLeftArmRelaxed"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circLeftArmRelaxed}
                          onChange={(e) => setCircLeftArmRelaxed(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circRightArmContracted" className="text-[10px] font-medium text-muted-foreground">Braço Contraído Dir.</Label>
                        <Input
                          id="circRightArmContracted"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circRightArmContracted}
                          onChange={(e) => setCircRightArmContracted(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circLeftArmContracted" className="text-[10px] font-medium text-muted-foreground">Braço Contraído Esq.</Label>
                        <Input
                          id="circLeftArmContracted"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circLeftArmContracted}
                          onChange={(e) => setCircLeftArmContracted(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-border/20 pt-3">
                      <div className="space-y-1">
                        <Label htmlFor="circRightThigh" className="text-[10px] font-medium text-muted-foreground">Coxa Direita</Label>
                        <Input
                          id="circRightThigh"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circRightThigh}
                          onChange={(e) => setCircRightThigh(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circLeftThigh" className="text-[10px] font-medium text-muted-foreground">Coxa Esquerda</Label>
                        <Input
                          id="circLeftThigh"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circLeftThigh}
                          onChange={(e) => setCircLeftThigh(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circRightCalf" className="text-[10px] font-medium text-muted-foreground">Panturrilha Dir.</Label>
                        <Input
                          id="circRightCalf"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circRightCalf}
                          onChange={(e) => setCircRightCalf(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="circLeftCalf" className="text-[10px] font-medium text-muted-foreground">Panturrilha Esq.</Label>
                        <Input
                          id="circLeftCalf"
                          type="number"
                          placeholder="cm"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                          value={circLeftCalf}
                          onChange={(e) => setCircLeftCalf(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* 3. DOBRAS CUTÂNEAS */}
                <TabsContent value="dobras" className="space-y-4 outline-none mt-0">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2 flex flex-col items-start">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Flame className="size-4 text-orange-500" /> 3. Dobras Cutâneas (Protocolo Pollock 3 Dobras)
                    </h3>
                    <Badge variant="outline" className="bg-orange-500/10 mt-1 text-orange-500 border border-orange-500/20 text-[10px] font-bold py-0.5 px-2">
                      Fórmula Ativa: {anamneseGender === "male" ? "Jackson-Pollock Masculino" : "Jackson-Pollock Feminino"}
                    </Badge>
                  </div>

                  {!weight ? (
                    <div className="p-8 text-center text-xs text-muted-foreground bg-muted/20 border border-dashed border-border dark:border-neutral-900 rounded-2xl">
                      <AlertTriangle className="size-6 text-yellow-500 mx-auto mb-2 animate-bounce" />
                      Por favor, informe o peso corporal na aba <strong>2. Medidas</strong> antes de preencher as dobras para ativar o cálculo automático da gordura corporal.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {anamneseGender === "male" ? (
                        /* MALE FIELDS: Peitoral, Abdominal, Coxa */
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="foldPeitoral" className="text-xs font-bold text-muted-foreground">Peitoral (mm)</Label>
                            <Input
                              id="foldPeitoral"
                              type="number"
                              placeholder="Dobras em mm"
                              className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                              value={foldPeitoral}
                              onChange={(e) => setFoldPeitoral(e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="foldAbdominal" className="text-xs font-bold text-muted-foreground">Abdominal (mm)</Label>
                            <Input
                              id="foldAbdominal"
                              type="number"
                              placeholder="Dobras em mm"
                              className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                              value={foldAbdominal}
                              onChange={(e) => setFoldAbdominal(e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="foldCoxa" className="text-xs font-bold text-muted-foreground">Coxa (mm)</Label>
                            <Input
                              id="foldCoxa"
                              type="number"
                              placeholder="Dobras em mm"
                              className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                              value={foldCoxa}
                              onChange={(e) => setFoldCoxa(e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      ) : (
                        /* FEMALE FIELDS: Tricipital, Suprailiaca, Coxa */
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="foldTricipital" className="text-xs font-bold text-muted-foreground">Tricipital (mm)</Label>
                            <Input
                              id="foldTricipital"
                              type="number"
                              placeholder="Dobras em mm"
                              className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                              value={foldTricipital}
                              onChange={(e) => setFoldTricipital(e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="foldSuprailiaca" className="text-xs font-bold text-muted-foreground">Suprailíaca (mm)</Label>
                            <Input
                              id="foldSuprailiaca"
                              type="number"
                              placeholder="Dobras em mm"
                              className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                              value={foldSuprailiaca}
                              onChange={(e) => setFoldSuprailiaca(e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="foldCoxa" className="text-xs font-bold text-muted-foreground">Coxa (mm)</Label>
                            <Input
                              id="foldCoxa"
                              type="number"
                              placeholder="Dobras em mm"
                              className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                              value={foldCoxa}
                              onChange={(e) => setFoldCoxa(e.target.value)}
                              disabled={submitting}
                            />
                          </div>
                        </div>
                      )}

                      {/* Display calculations in real time */}
                      {calculatedBf !== null && (
                        <div className="bg-muted/30 dark:bg-neutral-900/30 border border-border dark:border-neutral-900 p-4 rounded-2xl space-y-3">
                          <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider block">Resultados Estimados da Composição Corporal</span>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="bg-muted/80 dark:bg-neutral-950/40 p-3 rounded-xl border border-border/40 dark:border-neutral-800/40">
                              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Gordura Corporal</span>
                              <span className="font-extrabold text-rose-500 text-base">{calculatedBf}%</span>
                            </div>
                            <div className="bg-muted/80 dark:bg-neutral-950/40 p-3 rounded-xl border border-border/40 dark:border-neutral-800/40">
                              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Massa Gorda</span>
                              <span className="font-extrabold text-foreground text-base">{calculatedFatMass} kg</span>
                            </div>
                            <div className="bg-muted/80 dark:bg-neutral-950/40 p-3 rounded-xl border border-border/40 dark:border-neutral-800/40">
                              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Massa Magra</span>
                              <span className="font-extrabold text-emerald-500 text-base">{calculatedLeanMass} kg</span>
                            </div>
                            <div className="bg-muted/80 dark:bg-neutral-950/40 p-3 rounded-xl border border-border/40 dark:border-neutral-800/40 flex flex-col justify-center">
                              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Classificação</span>
                              <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 font-extrabold text-[9px] w-fit py-0 px-2.5 rounded-full mt-0.5">
                                {bfClass}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* 4. AVALIAÇÃO POSTURAL */}
                <TabsContent value="postural" className="space-y-4 outline-none mt-0">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Activity className="size-4 text-orange-500" /> 4. Avaliação Postural & Relatório Visual
                    </h3>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider px-1">Fotos de Postura (Clique para Enviar)</h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {/* Frontal */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground">Foto Frontal</Label>
                        <div className="border border-dashed border-border dark:border-neutral-800 bg-muted/40 dark:bg-neutral-900/40 h-28 rounded-xl relative overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-muted dark:hover:bg-neutral-900 transition-all">
                          {photoFrontal ? (
                            <>
                              <img src={photoFrontal} className="size-full object-cover" alt="Frontal preview" />
                              <button
                                type="button"
                                onClick={() => handlePhotoUpload("frontal", null)}
                                className="absolute top-1.5 right-1.5 bg-neutral-950/80 text-white rounded-full p-1 border border-white/10 hover:bg-destructive transition-colors"
                              >
                                <X className="size-3" />
                              </button>
                            </>
                          ) : (
                            <label className="size-full flex flex-col items-center justify-center p-3 cursor-pointer">
                              <Upload className="size-5 text-muted-foreground mb-1 animate-pulse" />
                              <span className="text-[9px] text-muted-foreground font-bold">Enviar Foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload("frontal", e.target.files?.[0] || null)} />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Posterior */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground">Foto Posterior</Label>
                        <div className="border border-dashed border-border dark:border-neutral-800 bg-muted/40 dark:bg-neutral-900/40 h-28 rounded-xl relative overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-muted dark:hover:bg-neutral-900 transition-all">
                          {photoPosterior ? (
                            <>
                              <img src={photoPosterior} className="size-full object-cover" alt="Posterior preview" />
                              <button
                                type="button"
                                onClick={() => handlePhotoUpload("posterior", null)}
                                className="absolute top-1.5 right-1.5 bg-neutral-950/80 text-white rounded-full p-1 border border-white/10 hover:bg-destructive transition-colors"
                              >
                                <X className="size-3" />
                              </button>
                            </>
                          ) : (
                            <label className="size-full flex flex-col items-center justify-center p-3 cursor-pointer">
                              <Upload className="size-5 text-muted-foreground mb-1 animate-pulse" />
                              <span className="text-[9px] text-muted-foreground font-bold">Enviar Foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload("posterior", e.target.files?.[0] || null)} />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Lateral Dir */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground">Lateral Dir.</Label>
                        <div className="border border-dashed border-border dark:border-neutral-800 bg-muted/40 dark:bg-neutral-900/40 h-28 rounded-xl relative overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-muted dark:hover:bg-neutral-900 transition-all">
                          {photoLateralRight ? (
                            <>
                              <img src={photoLateralRight} className="size-full object-cover" alt="Lateral Right preview" />
                              <button
                                type="button"
                                onClick={() => handlePhotoUpload("right", null)}
                                className="absolute top-1.5 right-1.5 bg-neutral-950/80 text-white rounded-full p-1 border border-white/10 hover:bg-destructive transition-colors"
                              >
                                <X className="size-3" />
                              </button>
                            </>
                          ) : (
                            <label className="size-full flex flex-col items-center justify-center p-3 cursor-pointer">
                              <Upload className="size-5 text-muted-foreground mb-1 animate-pulse" />
                              <span className="text-[9px] text-muted-foreground font-bold">Enviar Foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload("right", e.target.files?.[0] || null)} />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Lateral Esq */}
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-bold text-muted-foreground">Lateral Esq.</Label>
                        <div className="border border-dashed border-border dark:border-neutral-800 bg-muted/40 dark:bg-neutral-900/40 h-28 rounded-xl relative overflow-hidden flex flex-col items-center justify-center cursor-pointer hover:bg-muted dark:hover:bg-neutral-900 transition-all">
                          {photoLateralLeft ? (
                            <>
                              <img src={photoLateralLeft} className="size-full object-cover" alt="Lateral Left preview" />
                              <button
                                type="button"
                                onClick={() => handlePhotoUpload("left", null)}
                                className="absolute top-1.5 right-1.5 bg-neutral-950/80 text-white rounded-full p-1 border border-white/10 hover:bg-destructive transition-colors"
                              >
                                <X className="size-3" />
                              </button>
                            </>
                          ) : (
                            <label className="size-full flex flex-col items-center justify-center p-3 cursor-pointer">
                              <Upload className="size-5 text-muted-foreground mb-1 animate-pulse" />
                              <span className="text-[9px] text-muted-foreground font-bold">Enviar Foto</span>
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload("left", e.target.files?.[0] || null)} />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider px-1">Alinhamento das Articulações</h4>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label htmlFor="posturalOmbros" className="text-[10px] font-medium text-muted-foreground">Ombros</Label>
                          <Select value={posturalOmbros} onValueChange={setPosturalOmbros} disabled={submitting}>
                            <SelectTrigger id="posturalOmbros" className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border dark:border-neutral-800">
                              <SelectItem value="Normal" className="text-xs">Normal / Alinhado</SelectItem>
                              <SelectItem value="Ombro Direito Elevado" className="text-xs">Ombro Dir. Elevado</SelectItem>
                              <SelectItem value="Ombro Esquerdo Elevado" className="text-xs">Ombro Esq. Elevado</SelectItem>
                              <SelectItem value="Protrusão de Ombros" className="text-xs">Protrusão de Ombros</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="posturalCabeca" className="text-[10px] font-medium text-muted-foreground">Cabeça</Label>
                          <Select value={posturalCabeca} onValueChange={setPosturalCabeca} disabled={submitting}>
                            <SelectTrigger id="posturalCabeca" className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border dark:border-neutral-800">
                              <SelectItem value="Normal" className="text-xs">Normal / Alinhada</SelectItem>
                              <SelectItem value="Protrusão da Cabeça" className="text-xs">Protrusa (Anteriorizada)</SelectItem>
                              <SelectItem value="Inclinação Lateral Direita" className="text-xs">Inclinação Dir.</SelectItem>
                              <SelectItem value="Inclinação Lateral Esquerda" className="text-xs">Inclinação Esq.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="posturalQuadril" className="text-[10px] font-medium text-muted-foreground">Quadril</Label>
                          <Select value={posturalQuadril} onValueChange={setPosturalQuadril} disabled={submitting}>
                            <SelectTrigger id="posturalQuadril" className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border dark:border-neutral-800">
                              <SelectItem value="Normal" className="text-xs">Normal / Simétrico</SelectItem>
                              <SelectItem value="Anteversão Pélvica" className="text-xs">Anteversão Pélvica</SelectItem>
                              <SelectItem value="Retroversão Pélvica" className="text-xs">Retroversão Pélvica</SelectItem>
                              <SelectItem value="Báscula Direita" className="text-xs">Desvio/Báscula Dir.</SelectItem>
                              <SelectItem value="Báscula Esquerda" className="text-xs">Desvio/Báscula Esq.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="posturalJoelhos" className="text-[10px] font-medium text-muted-foreground">Joelhos</Label>
                          <Select value={posturalJoelhos} onValueChange={setPosturalJoelhos} disabled={submitting}>
                            <SelectTrigger id="posturalJoelhos" className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border dark:border-neutral-800">
                              <SelectItem value="Normal" className="text-xs">Normal / Alinhados</SelectItem>
                              <SelectItem value="Geno Valgo" className="text-xs">Geno Valgo (Para dentro)</SelectItem>
                              <SelectItem value="Geno Varo" className="text-xs">Geno Varo (Para fora)</SelectItem>
                              <SelectItem value="Hiperextensão" className="text-xs">Hiperextendidos</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="posturalTornozelos" className="text-[10px] font-medium text-muted-foreground">Tornozelos</Label>
                          <Select value={posturalTornozelos} onValueChange={setPosturalTornozelos} disabled={submitting}>
                            <SelectTrigger id="posturalTornozelos" className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border dark:border-neutral-800">
                              <SelectItem value="Normal" className="text-xs">Normal / Neutro</SelectItem>
                              <SelectItem value="Pronação (Pé Chato)" className="text-xs">Pronados</SelectItem>
                              <SelectItem value="Supinação (Pé Cavo)" className="text-xs">Supinados</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="posturalColuna" className="text-[10px] font-medium text-muted-foreground">Coluna Vertebral</Label>
                          <Select value={posturalColuna} onValueChange={setPosturalColuna} disabled={submitting}>
                            <SelectTrigger id="posturalColuna" className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8 w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border dark:border-neutral-800">
                              <SelectItem value="Normal" className="text-xs">Curvatura Normal</SelectItem>
                              <SelectItem value="Escoliose" className="text-xs">Escoliose (Desvio C/S)</SelectItem>
                              <SelectItem value="Hipercifose" className="text-xs">Hipercifose (Cunda)</SelectItem>
                              <SelectItem value="Hiperlordose" className="text-xs">Hiperlordose</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="posturalDeviations" className="text-xs font-bold text-muted-foreground">Resumo de Desvios Encontrados</Label>
                        <Input
                          id="posturalDeviations"
                          placeholder="Ex: Escoliose lombar, ombro direito deprimido"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={posturalDeviations}
                          onChange={(e) => setPosturalDeviations(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="posturalReport" className="text-xs font-bold text-muted-foreground">Parecer Postural Geral</Label>
                        <Input
                          id="posturalReport"
                          placeholder="Ex: Aluno deve focar em fortalecimento de romboides e mobilidade de quadril"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={posturalReport}
                          onChange={(e) => setPosturalReport(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* 5. DOR & MOBILIDADE */}
                <TabsContent value="dor" className="space-y-4 outline-none mt-0">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <Heart className="size-4 text-orange-500" /> 5. Avaliação de Dor & Mobilidade
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {/* Pain scale slider */}
                    <div className="bg-muted/30 dark:bg-neutral-900/30 border border-border dark:border-neutral-900 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-extrabold text-foreground uppercase tracking-wider block">Escala de Dor Subjetiva (0-10)</Label>
                        <Badge className={`font-bold px-2 py-0.5 rounded-full text-xs ${painScale === 0
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : painScale <= 4
                            ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-455 border border-rose-500/20"
                          }`}>
                          Nível: {painScale} / 10 ({painScale === 0 ? "Sem Dor" : painScale <= 4 ? "Dor Suave" : painScale <= 7 ? "Dor Moderada" : "Dor Forte"})
                        </Badge>
                      </div>
                      <Slider
                        defaultValue={[0]}
                        max={10}
                        step={1}
                        value={[painScale]}
                        onValueChange={(val) => setPainScale(val[0])}
                        disabled={submitting}
                        className="py-2"
                      />
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider px-1">Regiões Acometidas por Dor</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                        {standardPainRegions.map((region) => {
                          const isChecked = (painRegions[region.id] || 0) > 0;
                          const currentLevel = painRegions[region.id] || 0;
                          return (
                            <div
                              key={region.id}
                              className={`flex flex-col gap-2.5 p-3 rounded-xl border transition-all ${isChecked
                                ? "bg-rose-500/5 border-rose-500/30 text-rose-500"
                                : "bg-muted/30 text-muted-foreground border-border dark:border-neutral-800"
                                }`}
                            >
                              <div className="flex flex-col gap-1 items-start select-none">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    id={`checkbox-${region.id}`}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                      if (submitting) return;
                                      setPainRegions((prev) => {
                                        const updated = { ...prev };
                                        if (checked) {
                                          updated[region.id] = 5; // Default to 5 when checked
                                        } else {
                                          delete updated[region.id]; // Delete key when unchecked
                                        }
                                        return updated;
                                      });
                                    }}
                                    disabled={submitting}
                                  />
                                  <Label
                                    htmlFor={`checkbox-${region.id}`}
                                    className="text-xs line-clamp-1 font-bold text-foreground cursor-pointer select-none"
                                  >
                                    {region.label}
                                  </Label>
                                </div>
                                <span className={`text-[10px] font-black ${isChecked ? "text-rose-500" : "text-neutral-500"}`}>
                                  {isChecked ? `Nível ${currentLevel}/10` : ""}
                                </span>
                              </div>

                              {isChecked && (
                                <div className="pt-1">
                                  <Slider
                                    min={1}
                                    max={10}
                                    step={1}
                                    value={[currentLevel]}
                                    onValueChange={(val) => {
                                      const level = val[0];
                                      setPainRegions((prev) => ({
                                        ...prev,
                                        [region.id]: level,
                                      }));
                                    }}
                                    disabled={submitting}
                                    className="py-1 cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="painLimitations" className="text-xs font-bold text-muted-foreground">Limitações de Movimento</Label>
                        <Input
                          id="painLimitations"
                          placeholder="Ex: Falta de rotação externa no ombro, agachamento raso"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={painLimitations}
                          onChange={(e) => setPainLimitations(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="painHistory" className="text-xs font-bold text-muted-foreground">Observações Adicionais / Histórico</Label>
                        <Input
                          id="painHistory"
                          placeholder="Ex: Dores após corrida longa, pontadas nos joelhos"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={painHistory}
                          onChange={(e) => setPainHistory(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* 6. TESTES FÍSICOS */}
                <TabsContent value="testes" className="space-y-4 outline-none mt-0">
                  <div className="border-b border-border/50 dark:border-neutral-900 pb-2">
                    <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1.5">
                      <FileText className="size-4 text-orange-500" /> 6. Testes Físicos (Flexibilidade, Cardio e Força)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Flexibilidade */}
                    <div className="bg-muted/30 dark:bg-neutral-900/30 border border-border dark:border-neutral-900 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="size-4 text-orange-500" /> Flexibilidade
                      </h4>
                      <div className="space-y-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="flexWells" className="text-xs font-bold text-muted-foreground">Resultado (Banco de Wells / cm)</Label>
                          <Input
                            id="flexWells"
                            type="number"
                            placeholder="Distância em cm"
                            className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                            value={flexWells}
                            onChange={(e) => setFlexWells(e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                        {flexClassification && (
                          <div className="flex items-center justify-between text-xs pt-1.5">
                            <span className="text-muted-foreground font-light">Classificação:</span>
                            <Badge className={`font-bold px-2 py-0.5 rounded ${flexClassification === "Excelente"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : flexClassification === "Boa"
                                ? "bg-sky-500/10 text-sky-600 dark:text-sky-455 border border-sky-500/20"
                                : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20"
                              }`}>
                              {flexClassification}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resistência Cardiorrespiratória */}
                    <div className="bg-muted/30 dark:bg-neutral-900/30 border border-border dark:border-neutral-900 p-4 rounded-2xl space-y-3">
                      <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Heart className="size-4 text-rose-500" /> Resistência Cardiorrespiratória
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="cardioTestType" className="text-[10px] font-medium text-muted-foreground">Tipo de Teste</Label>
                          <Select value={cardioTestType} onValueChange={setCardioTestType} disabled={submitting}>
                            <SelectTrigger id="cardioTestType" className="bg-muted w-full dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border dark:border-neutral-800">
                              <SelectItem value="Caminhada" className="text-xs">Caminhada</SelectItem>
                              <SelectItem value="Cooper" className="text-xs">Cooper (12 min)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="cardioHr" className="text-[10px] font-medium text-muted-foreground">Frequência Cardíaca (bpm)</Label>
                          <Input
                            id="cardioHr"
                            type="number"
                            placeholder="bpm"
                            className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-8"
                            value={cardioHr}
                            onChange={(e) => setCardioHr(e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="cardioVo2" className="text-xs font-bold text-muted-foreground">VO2 Máximo Estimado (ml/kg/min)</Label>
                        <Input
                          id="cardioVo2"
                          type="number"
                          step="0.1"
                          placeholder="Ex: 42.5"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={cardioVo2}
                          onChange={(e) => setCardioVo2(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Teste de Força Muscular */}
                  <div className="bg-muted/30 dark:bg-neutral-900/30 border border-border dark:border-neutral-900 p-4 rounded-2xl space-y-3">
                    <h4 className="text-xs font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Plus className="size-4 text-yellow-500" /> Teste de Força Máxima (1RM Estimado)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="forcaExercise" className="text-xs font-bold text-muted-foreground">Exercício Referência</Label>
                        <Input
                          id="forcaExercise"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={forcaExercise}
                          onChange={(e) => setForcaExercise(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="forcaLoad" className="text-xs font-bold text-muted-foreground">Carga Utilizada (kg)</Label>
                        <Input
                          id="forcaLoad"
                          type="number"
                          placeholder="Carga em kg"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={forcaLoad}
                          onChange={(e) => setForcaLoad(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="forcaReps" className="text-xs font-bold text-muted-foreground">Repetições Máximas (RM)</Label>
                        <Input
                          id="forcaReps"
                          type="number"
                          placeholder="Quantidade"
                          className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs h-9"
                          value={forcaReps}
                          onChange={(e) => setForcaReps(e.target.value)}
                          disabled={submitting}
                        />
                      </div>
                    </div>

                    {forcaRm !== null && (
                      <div className="bg-muted/80 dark:bg-neutral-950/40 p-3 rounded-xl border border-border/40 dark:border-neutral-800/40 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">1RM Estimado (Epley)</span>
                          <span className="font-extrabold text-foreground text-sm">{forcaRm} kg</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">Estimado a partir de {forcaReps} reps</span>
                      </div>
                    )}
                  </div>

                  {/* Notas Finais */}
                  <div className="space-y-1.5">
                    <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground">Notas Gerais e Recomendações</Label>
                    <Textarea
                      id="notes"
                      placeholder="Parecer final da avaliação física..."
                      rows={2}
                      className="bg-muted dark:bg-neutral-900 border-border dark:border-neutral-800 text-xs p-2.5 focus-visible:ring-0"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Stepper Footer Controls */}
            <div className="p-4 bg-muted/20 border-t border-border dark:border-neutral-900 flex justify-between gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentIndex = tabsConfig.findIndex((t) => t.id === activeTab);
                  if (currentIndex > 0) {
                    setActiveTab(tabsConfig[currentIndex - 1].id);
                  } else {
                    onClose();
                  }
                }}
                disabled={submitting}
                className="h-9 font-bold border-border dark:border-neutral-800 text-xs rounded-xl"
              >
                {activeTab === "anamnese" ? "Cancelar" : (
                  <>
                    <ChevronLeft className="size-4 mr-1 shrink-0" /> Voltar
                  </>
                )}
              </Button>

              <div className="flex gap-2">
                {activeTab !== "testes" && (
                  <Button
                    type="button"
                    onClick={() => {
                      const currentIndex = tabsConfig.findIndex((t) => t.id === activeTab);
                      if (currentIndex < tabsConfig.length - 1) {
                        setActiveTab(tabsConfig[currentIndex + 1].id);
                      }
                    }}
                    className="h-9 font-bold bg-muted dark:bg-neutral-900 border border-border dark:border-neutral-800 text-foreground hover:bg-secondary/40 text-xs rounded-xl"
                  >
                    Próximo <ChevronRight className="size-4 ml-1 shrink-0" />
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-9 font-bold bg-orange-600 hover:bg-orange-500 text-white text-xs rounded-xl active:scale-95 transition-all shadow-md shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin size-4 mr-2" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Avaliação"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
