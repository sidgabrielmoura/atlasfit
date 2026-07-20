"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Trophy,
  Activity,
  Clock,
  Scale,
  Camera,
  MessageCircle,
  Trash2,
  Heart,
  Plus,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image-compress";

// Grid stagger animations
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

export default function StudentEvolutionPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "charts";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Modal Control States
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [isSubmittingPhoto, setIsSubmittingPhoto,] = useState(false);

  // New Log form states
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [abdomen, setAbdomen] = useState("");
  const [hips, setHips] = useState("");
  const [rightArm, setRightArm] = useState("");
  const [leftArm, setLeftArm] = useState("");
  const [rightForearm, setRightForearm] = useState("");
  const [leftForearm, setLeftForearm] = useState("");
  const [rightThigh, setRightThigh] = useState("");
  const [leftThigh, setLeftThigh] = useState("");
  const [rightCalf, setRightCalf] = useState("");
  const [leftCalf, setLeftCalf] = useState("");
  const [notes, setNotes] = useState("");

  // Photo form states
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoBase64, setPhotoBase64] = useState("");

  // Selection for side-by-side comparison
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [carouselSlide, setCarouselSlide] = useState<"antes" | "depois">("antes");

  // Photo lightbox open state
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);

  // Custom Deletion Confirmation States (confirmationmodals.md compliance)
  const [progressToDelete, setProgressToDelete] = useState<string | null>(null);
  const [isDeleteProgressOpen, setIsDeleteProgressOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const [isDeletePhotoOpen, setIsDeletePhotoOpen] = useState(false);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/evolution");
      if (!res.ok) {
        throw new Error("Erro ao buscar dados de evolução do aluno.");
      }
      const rawData = await res.json();
      setData(rawData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao carregar dados de progresso.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadProgressData();

    const checkIsMobile = () => setIsMobile(window.innerWidth < 640);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      setPhotoBase64(URL.createObjectURL(file));
    }
  };

  // Submit new weight and measurements
  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight) {
      toast.warning("Por favor, preencha pelo menos o peso corporal.");
      return;
    }

    setIsSubmittingLog(true);
    try {
      const res = await fetch("/api/student/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "logProgress",
          weight,
          height: data?.progress?.[0]?.height || 175,
          bodyFat: bodyFat || null,
          muscleMass: muscleMass || null,
          chest: chest || null,
          waist: waist || null,
          abdomen: abdomen || null,
          hips: hips || null,
          rightArm: rightArm || null,
          leftArm: leftArm || null,
          rightForearm: rightForearm || null,
          leftForearm: leftForearm || null,
          rightThigh: rightThigh || null,
          leftThigh: leftThigh || null,
          rightCalf: rightCalf || null,
          leftCalf: leftCalf || null,
          notes: notes || null,
        }),
      });

      if (!res.ok) throw new Error("Erro na gravação.");

      toast.success("Progresso registrado com sucesso! 📈");
      setIsLogModalOpen(false);
      // Reset fields
      setWeight(""); setBodyFat(""); setMuscleMass("");
      setChest(""); setWaist(""); setAbdomen(""); setHips("");
      setRightArm(""); setLeftArm(""); setRightForearm(""); setLeftForearm("");
      setRightThigh(""); setLeftThigh(""); setRightCalf(""); setLeftCalf("");
      setNotes("");

      loadProgressData();
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao salvar dados de pesagem.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Submit progress photo
  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile && !photoUrlInput.trim()) {
      toast.warning("Por favor, selecione uma imagem ou informe um link.");
      return;
    }

    setIsSubmittingPhoto(true);
    const toastId = toast.loading("Enviando foto de progresso...");
    try {
      let finalUrl = photoUrlInput.trim();
      let finalKey = null;

      if (photoFile) {
        let compressedFile = photoFile;
        try {
          compressedFile = await compressImage(photoFile);
        } catch (err) {
          console.warn("Failing compression, uploading original:", err);
        }

        // 1. Get presigned URL
        const presignedRes = await fetch("/api/storage/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressedFile.name,
            contentType: compressedFile.type,
            fileSize: compressedFile.size,
            targetType: "progress_photo",
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
          headers: { "Content-Type": compressedFile.type },
          body: compressedFile,
        });

        if (!putRes.ok) {
          throw new Error("Erro ao transferir arquivo para o storage.");
        }

        finalUrl = fileUrl;
        finalKey = objectKey;
      }

      const res = await fetch("/api/student/evolution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "uploadPhoto",
          photoUrl: finalUrl,
          objectKey: finalKey,
        }),
      });

      if (!res.ok) throw new Error("Erro ao salvar foto no banco.");

      toast.success("Foto de progresso enviada com sucesso! 📸", { id: toastId });
      setIsPhotoModalOpen(false);
      setPhotoUrlInput("");
      setPhotoFile(null);
      setPhotoBase64("");

      loadProgressData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao salvar foto de progresso.", { id: toastId });
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  const handleDeleteProgress = async (id: string) => {
    setProgressToDelete(id);
    setIsDeleteProgressOpen(true);
  };

  const confirmDeleteProgress = async () => {
    if (!progressToDelete) return;
    try {
      const res = await fetch(`/api/student/evolution?type=progress&id=${progressToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir.");

      toast.success("Registro excluído com sucesso.");
      setIsDeleteProgressOpen(false);
      setProgressToDelete(null);
      loadProgressData();
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao deletar o registro.");
    }
  };

  const handleDeletePhoto = async (id: string) => {
    setPhotoToDelete(id);
    setIsDeletePhotoOpen(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      const res = await fetch(`/api/student/evolution?type=photo&id=${photoToDelete}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir.");

      toast.success("Foto removida com sucesso.");
      setIsDeletePhotoOpen(false);
      setPhotoToDelete(null);
      loadProgressData();
    } catch (err: any) {
      console.error(err);
      toast.error("Falha ao remover a foto.");
    }
  };

  const handlePhotoSelect = (id: string) => {
    setSelectedPhotoIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pId) => pId !== id);
      }
      if (prev.length >= 2) {
        toast.warning("Você pode selecionar no máximo 2 fotos para comparação.");
        return prev;
      }
      return [...prev, id];
    });
  };

  if (loading) {
    return <StudentEvolutionSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4">
        <Trophy className="size-12 mx-auto text-rose-500" />
        <h2 className="text-xl font-bold">Falha ao carregar sua área de evolução</h2>
        <p className="text-neutral-400">{error || "Verifique sua conexão e tente novamente."}</p>
        <Button onClick={loadProgressData} variant="outline" className="gap-2">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const { progress, evaluations, photos } = data;

  const latestProgress = progress[progress.length - 1] || null;
  const initialProgress = progress[0] || null;
  const latestEval = evaluations[0] || null;

  const currentWeight = latestProgress?.weight || latestEval?.weight || 0;
  const currentBF = latestProgress?.bodyFat || latestEval?.bodyFat || 0;
  const currentMuscle = latestProgress?.muscleMass || latestEval?.muscleMass || 0;

  // Weight oscillation calculation
  let weightOscillation = 0;
  if (progress.length > 1) {
    const firstW = progress[0].weight || 0;
    const lastW = currentWeight;
    weightOscillation = parseFloat((lastW - firstW).toFixed(1));
  }

  const formatLogDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (e) {
      return dateStr;
    }
  };

  const weightChartData = progress
    .filter((p: any) => p.weight !== null)
    .map((p: any) => ({
      date: formatLogDate(p.date),
      "Peso (kg)": p.weight,
    }));

  const bfChartData = progress
    .filter((p: any) => p.bodyFat !== null)
    .map((p: any) => ({
      date: formatLogDate(p.date),
      "BF%": p.bodyFat,
    }));

  const measurementsList = [
    { key: "chest", label: "Tórax / Peito", muscle: true },
    { key: "waist", label: "Cintura", muscle: false },
    { key: "abdomen", label: "Abdômen", muscle: false },
    { key: "hips", label: "Quadril", muscle: false },
    { key: "rightArm", label: "Braço Direito", muscle: true },
    { key: "leftArm", label: "Braço Esquerdo", muscle: true },
    { key: "rightForearm", label: "Antebraço Direito", muscle: true },
    { key: "leftForearm", label: "Antebraço Esquerdo", muscle: true },
    { key: "rightThigh", label: "Coxa Direita", muscle: true },
    { key: "leftThigh", label: "Coxa Esquerda", muscle: true },
    { key: "rightCalf", label: "Panturrilha Direita", muscle: true },
    { key: "leftCalf", label: "Panturrilha Esquerda", muscle: true },
  ];

  const renderLogForm = (isMobileView: boolean) => {
    const FooterComponent = isMobileView ? DrawerFooter : DialogFooter;
    return (
      <form onSubmit={handleProgressSubmit} className="space-y-6 pt-2 text-left">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label htmlFor="weight" className="text-xs font-bold text-muted-foreground">Peso Corporal (kg) *</Label>
            <Input
              id="weight"
              required
              placeholder="Ex: 75.5"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] focus:border-primary/50 text-foreground h-10 rounded-xl"
              type="number"
              step="0.01"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="bodyFat" className="text-xs font-bold text-muted-foreground">Gordura Corporal (BF %)</Label>
            <Input
              id="bodyFat"
              placeholder="Ex: 14.5"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] focus:border-primary/50 text-foreground h-10 rounded-xl"
              type="number"
              step="0.1"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="muscleMass" className="text-xs font-bold text-muted-foreground">Massa Muscular (%)</Label>
            <Input
              id="muscleMass"
              placeholder="Ex: 42.8"
              value={muscleMass}
              onChange={(e) => setMuscleMass(e.target.value)}
              className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] focus:border-primary/50 text-foreground h-10 rounded-xl"
              type="number"
              step="0.1"
            />
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block border-b border-border dark:border-white/[0.04] pb-1">
            Circunferências Corporais (cm)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label htmlFor="chest" className="text-[11px] text-muted-foreground">Tórax / Peito</Label>
              <Input
                id="chest" placeholder="Ex: 98" value={chest} onChange={(e) => setChest(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="waist" className="text-[11px] text-muted-foreground">Cintura</Label>
              <Input
                id="waist" placeholder="Ex: 82" value={waist} onChange={(e) => setWaist(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="abdomen" className="text-[11px] text-muted-foreground">Abdômen</Label>
              <Input
                id="abdomen" placeholder="Ex: 85" value={abdomen} onChange={(e) => setAbdomen(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="hips" className="text-[11px] text-muted-foreground">Quadril</Label>
              <Input
                id="hips" placeholder="Ex: 96" value={hips} onChange={(e) => setHips(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="rightArm" className="text-[11px] text-muted-foreground">Braço Dir.</Label>
              <Input
                id="rightArm" placeholder="Ex: 36" value={rightArm} onChange={(e) => setRightArm(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="leftArm" className="text-[11px] text-muted-foreground">Braço Esq.</Label>
              <Input
                id="leftArm" placeholder="Ex: 35.8" value={leftArm} onChange={(e) => setLeftArm(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rightForearm" className="text-[11px] text-muted-foreground">Antebraço Dir.</Label>
              <Input
                id="rightForearm" placeholder="Ex: 29" value={rightForearm} onChange={(e) => setRightForearm(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="leftForearm" className="text-[11px] text-muted-foreground">Antebraço Esq.</Label>
              <Input
                id="leftForearm" placeholder="Ex: 28.8" value={leftForearm} onChange={(e) => setLeftForearm(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="rightThigh" className="text-[11px] text-muted-foreground">Coxa Dir.</Label>
              <Input
                id="rightThigh" placeholder="Ex: 58" value={rightThigh} onChange={(e) => setRightThigh(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="leftThigh" className="text-[11px] text-muted-foreground">Coxa Esq.</Label>
              <Input
                id="leftThigh" placeholder="Ex: 57.5" value={leftThigh} onChange={(e) => setLeftThigh(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rightCalf" className="text-[11px] text-muted-foreground">Panturrilha Dir.</Label>
              <Input
                id="rightCalf" placeholder="Ex: 38" value={rightCalf} onChange={(e) => setRightCalf(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="leftCalf" className="text-[11px] text-muted-foreground">Panturrilha Esq.</Label>
              <Input
                id="leftCalf" placeholder="Ex: 37.8" value={leftCalf} onChange={(e) => setLeftCalf(e.target.value)}
                className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] text-xs h-9 rounded-xl" type="number" step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes" className="text-xs font-bold text-muted-foreground">Notas de Sentimento / Observação</Label>
          <Textarea
            id="notes"
            placeholder="Como se sente hoje? Disposição, sono, dores..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] focus:border-primary/50 text-foreground text-xs rounded-xl min-h-[70px]"
          />
        </div>

        <FooterComponent className={cn("gap-2 pt-4 flex flex-row w-full justify-end", isMobileView ? "p-0" : "")}>
          <Button
            type="button" variant="outline" onClick={() => setIsLogModalOpen(false)}
            className={cn("border-border dark:border-white/[0.08] hover:bg-secondary/40 rounded-xl h-11 font-semibold", isMobileView ? "flex-1" : "px-6")}
          >
            Cancelar
          </Button>
          <Button
            type="submit" disabled={isSubmittingLog}
            className={cn("bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer rounded-xl h-11 font-bold", isMobileView ? "flex-1" : "px-6")}
          >
            {isSubmittingLog ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" /> Gravando...
              </>
            ) : (
              "Salvar Registro"
            )}
          </Button>
        </FooterComponent>
      </form>
    );
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-in fade-in duration-500">
      {/* Top Banner Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            Minha Evolução
          </h1>
          <p className="text-sm text-neutral-400">
            Acompanhe suas pesagens, circunferências corporais e linha do tempo de fotos.
          </p>
        </div>
        <div className="flex flex-row items-center gap-2 w-full md:w-auto">
          <Button
            onClick={() => setIsLogModalOpen(true)}
            className="flex-1 md:flex-initial gap-2 font-bold px-4 bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer rounded-xl h-11 transition-all"
          >
            <Plus className="size-4" /> Registrar Medidas
          </Button>
          <Button
            onClick={() => setIsPhotoModalOpen(true)}
            variant="outline"
            className="flex-1 md:flex-initial gap-2 font-bold px-4 border-border dark:border-white/[0.08] hover:bg-secondary/40 cursor-pointer rounded-xl h-11"
          >
            <Camera className="size-4" /> Enviar Foto
          </Button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Metric Card 1: Weight */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peso Atual</span>
              <Scale className="size-4 text-emerald-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{currentWeight ? `${currentWeight} kg` : "—"}</span>
              {weightOscillation !== 0 && (
                <Badge
                  className={cn(
                    "font-bold text-[10px] rounded-full gap-1 shadow-none border-none py-0.5 px-2",
                    weightOscillation < 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}
                >
                  {weightOscillation < 0 ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
                  {Math.abs(weightOscillation)} kg {weightOscillation < 0 ? "perdidos" : "ganhos"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Primeiro registro: {initialProgress ? `${initialProgress.weight} kg` : "N/A"}
            </p>
          </Card>
        </motion.div>

        {/* Metric Card 2: Body Fat */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Gordura Corporal (BF)</span>
              <Activity className="size-4 text-amber-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{currentBF ? `${currentBF}%` : "—"}</span>
              {currentBF > 0 && (
                <Badge className={cn(
                  "font-bold text-[10px] rounded-full shadow-none border-none py-0.5 px-2",
                  currentBF <= 15 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : currentBF <= 24 ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                )}>
                  {currentBF <= 15 ? "Excelente ⚡" : currentBF <= 24 ? "Moderado 👍" : "Atenção ⚠️"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Metabolismo basal ativo e monitorado
            </p>
          </Card>
        </motion.div>

        {/* Metric Card 3: Muscle Mass */}
        <motion.div variants={itemVariants}>
          <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Massa Muscular</span>
              <Trophy className="size-4 text-sky-500" />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{currentMuscle ? `${currentMuscle}%` : "—"}</span>
              {currentMuscle > 0 && (
                <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 font-bold text-[10px] rounded-full">
                  Massa Magra
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Foco hipertrófico ativo em musculação
            </p>
          </Card>
        </motion.div>
      </motion.div>

      {/* Main Tabbed Area */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted dark:bg-neutral-900/60 p-1 border border-border dark:border-neutral-800 rounded-xl flex overflow-x-auto whitespace-nowrap md:w-fit gap-1 w-full justify-start scrollbar-none">
          <TabsTrigger
            value="charts"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Activity className="size-4" /> Gráficos de Evolução
          </TabsTrigger>
          <TabsTrigger
            value="measurements"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Scale className="size-4" /> Medidas Corporais
          </TabsTrigger>
          <TabsTrigger
            value="photos"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Camera className="size-4" /> Timeline de Fotos
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: EVOLUTION CHARTS ==================== */}
        <TabsContent value="charts" className="space-y-6 outline-none focus-visible:ring-0">
          {progress.length < 2 ? (
            <Card className="border border-dashed border-border dark:border-neutral-800 bg-card dark:bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-muted dark:bg-neutral-900/80 text-muted-foreground border border-border dark:border-neutral-800">
                  <Activity className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Poucos dados para gráficos</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Você precisa de pelo menos 2 registros de pesagem para traçar seu gráfico de evolução corporal.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weight Chart */}
              <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">Curva de Peso Corporal</CardTitle>
                  <CardDescription className="text-xs">Oscilação de peso logado nos últimos meses</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weightChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                        <XAxis dataKey="date" stroke="var(--muted-foreground)" opacity={0.7} fontSize={10} tickLine={false} />
                        <YAxis stroke="var(--muted-foreground)" opacity={0.7} fontSize={10} tickLine={false} domain={["dataMin - 2", "dataMax + 2"]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                          labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted-foreground)" }}
                          itemStyle={{ fontSize: "12px", fontWeight: "black", color: "var(--foreground)" }}
                        />
                        <Area type="monotone" dataKey="Peso (kg)" stroke="var(--primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWeight)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* BF% Chart */}
              <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-foreground">Percentual de Gordura (BF%)</CardTitle>
                  <CardDescription className="text-xs">Redução ou controle do percentual adiposo</CardDescription>
                </CardHeader>
                <CardContent className="h-[280px]">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={bfChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorBF" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                        <XAxis dataKey="date" stroke="var(--muted-foreground)" opacity={0.7} fontSize={10} tickLine={false} />
                        <YAxis stroke="var(--muted-foreground)" opacity={0.7} fontSize={10} tickLine={false} domain={["dataMin - 1", "dataMax + 1"]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                          labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "var(--muted-foreground)" }}
                          itemStyle={{ fontSize: "12px", fontWeight: "black", color: "#f59e0b" }}
                        />
                        <Area type="monotone" dataKey="BF%" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBF)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 2: MEASUREMENTS COMPARISON GRID ==================== */}
        <TabsContent value="measurements" className="space-y-6 outline-none focus-visible:ring-0">
          {!latestProgress ? (
            <Card className="border border-dashed border-border dark:border-neutral-800 bg-card dark:bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-muted dark:bg-neutral-900/80 text-muted-foreground border border-border dark:border-neutral-800">
                  <Scale className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Nenhuma circunferência registrada</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Clique em "Registrar Medidas" no canto superior direito para gravar suas primeiras circunferências corporais.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border dark:border-white/[0.04] pb-3">
                <div>
                  <h3 className="text-base font-bold text-foreground">Oscilação de Medidas Corporais</h3>
                  <p className="text-xs text-muted-foreground">Comparação entre o seu primeiro registro e a aferição mais recente.</p>
                </div>
              </div>

              {/* Responsive Grid of Circumferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {measurementsList.map((m) => {
                  const firstVal = initialProgress?.[m.key] || null;
                  const currentVal = latestProgress?.[m.key] || null;
                  let diff = 0;
                  if (firstVal !== null && currentVal !== null) {
                    diff = parseFloat((currentVal - firstVal).toFixed(1));
                  }

                  let diffBadge = null;
                  if (firstVal !== null && currentVal !== null) {
                    if (diff === 0) {
                      diffBadge = <span className="text-[10px] font-semibold text-muted-foreground">Estável</span>;
                    } else if (diff > 0) {
                      diffBadge = (
                        <span className={cn(
                          "text-[10px] font-bold py-0.5 px-2 rounded-full flex items-center gap-0.5",
                          m.muscle ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        )}>
                          <ArrowUpRight className="size-3" /> +{diff} cm
                        </span>
                      );
                    } else {
                      diffBadge = (
                        <span className={cn(
                          "text-[10px] font-bold py-0.5 px-2 rounded-full flex items-center gap-0.5",
                          m.muscle ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450"
                        )}>
                          <ArrowDownRight className="size-3" /> {diff} cm
                        </span>
                      );
                    }
                  }

                  return (
                    <Card key={m.key} className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 p-4 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-muted-foreground">{m.label}</span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg font-black text-foreground">
                            {currentVal !== null ? `${currentVal} cm` : "—"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            (inicial: {firstVal !== null ? `${firstVal} cm` : "—"})
                          </span>
                        </div>
                      </div>
                      <div>{diffBadge}</div>
                    </Card>
                  );
                })}
              </div>

              {/* Grid Logs History list table */}
              <div className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/40 rounded-xl overflow-hidden">
                <div className="bg-muted dark:bg-neutral-900/60 p-4 border-b border-border dark:border-white/[0.06]">
                  <h4 className="text-sm font-bold text-foreground">Histórico Cronológico de Medidas</h4>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 dark:bg-neutral-900/30">
                      <TableRow className="border-b border-border dark:border-white/[0.06]">
                        <TableHead className="text-muted-foreground font-bold">Data</TableHead>
                        <TableHead className="text-muted-foreground font-bold">Peso</TableHead>
                        <TableHead className="text-muted-foreground font-bold">BF%</TableHead>
                        <TableHead className="text-muted-foreground font-bold">Massa Magra</TableHead>
                        <TableHead className="text-muted-foreground font-bold">Cintura</TableHead>
                        <TableHead className="text-muted-foreground font-bold">Abdômen</TableHead>
                        <TableHead className="text-muted-foreground font-bold">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {progress.slice().reverse().map((log: any) => (
                        <TableRow key={log.id} className="border-b border-border dark:border-white/[0.04]">
                          <TableCell className="text-xs text-muted-foreground dark:text-neutral-300 font-medium">
                            {formatLogDate(log.date)}
                          </TableCell>
                          <TableCell className="text-sm font-bold text-foreground">
                            {log.weight ? `${log.weight} kg` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground dark:text-neutral-400">
                            {log.bodyFat ? `${log.bodyFat}%` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground dark:text-neutral-400">
                            {log.muscleMass ? `${log.muscleMass}%` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground dark:text-neutral-400">
                            {log.waist ? `${log.waist} cm` : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground dark:text-neutral-400">
                            {log.abdomen ? `${log.abdomen} cm` : "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => {
                                setProgressToDelete(log.id);
                                setIsDeleteProgressOpen(true);
                              }}
                              variant="ghost"
                              size="sm"
                              className="size-8 text-rose-500 hover:bg-rose-950/20"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 3: TIMELINE AND PHOTOS SYSTEM ==================== */}
        <TabsContent value="photos" className="space-y-6 outline-none focus-visible:ring-0">
          {photos.length === 0 ? (
            <Card className="border border-dashed border-border dark:border-neutral-800 bg-card dark:bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-muted dark:bg-neutral-900/80 text-muted-foreground border border-border dark:border-neutral-800">
                  <Camera className="size-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Nenhuma foto enviada</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Envie fotos de progresso clicando em "Enviar Foto" para que o seu personal possa acompanhar visualmente a sua evolução.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {selectedPhotoIds.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 50 }}
                    className="fixed bottom-15 left-1/2 -translate-x-1/2 z-40 bg-popover/95 dark:bg-neutral-900/95 backdrop-blur-xl border border-border dark:border-white/8 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-6 shadow-2xl shadow-black/80 max-w-lg w-[calc(100%-2rem)]"
                  >
                    <div className="space-y-0.5 text-center sm:text-left w-full sm:w-auto">
                      <h4 className="text-xs sm:text-sm font-black text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                        Comparação de Fotos
                      </h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {selectedPhotoIds.length === 1
                          ? "Selecione mais uma foto na galeria abaixo..."
                          : "2 fotos selecionadas! Pronto para comparar."}
                      </p>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto justify-center sm:justify-start">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedPhotoIds([])}
                        className="text-xs font-semibold text-muted-foreground hover:bg-muted/80 h-9 shrink-0 flex-1 sm:flex-initial"
                      >
                        Limpar
                      </Button>
                      <Button
                        size="sm"
                        disabled={selectedPhotoIds.length < 2}
                        onClick={() => {
                          setCarouselSlide("antes");
                          setIsComparisonOpen(true);
                        }}
                        className="text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer h-9 px-4 rounded-xl transition-all shrink-0 flex-1 sm:flex-initial"
                      >
                        Comparar Evolução
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between items-center pb-2">
                <div>
                  <h3 className="text-base font-bold text-foreground">Linha do Tempo Visual</h3>
                  <p className="text-xs text-muted-foreground">Clique na foto para ampliar, ou selecione 2 fotos para compará-las lado a lado.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {photos.map((photo: any) => {
                  const isSelected = selectedPhotoIds.includes(photo.id);
                  return (
                    <Card
                      key={photo.id}
                      className={cn(
                        "overflow-hidden gap-0! p-0 border bg-card dark:bg-neutral-950/40 relative group transition-all rounded-2xl select-none",
                        isSelected ? "border-primary/60 shadow-lg shadow-primary/5" : "border-border dark:border-white/6 hover:border-border/80 dark:hover:border-white/12"
                      )}
                    >
                      <div className="relative aspect-3/4 overflow-hidden bg-muted dark:bg-neutral-900">
                        <img
                          src={photo.photoUrl}
                          alt={`Progresso de ${formatLogDate(photo.date)}`}
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                          <button
                            onClick={() => handlePhotoSelect(photo.id)}
                            className={cn(
                              "size-6 rounded-lg flex items-center justify-center border transition-all cursor-pointer",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-black/50 border-white/20 text-transparent hover:border-white/40"
                            )}
                          >
                            ✓
                          </button>

                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setLightboxPhoto(photo)}
                              className="size-8 rounded-lg bg-black/60 border border-white/10 text-neutral-200 hover:text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                              title="Ampliar"
                            >
                              <Eye className="size-4" />
                            </button>
                            <button
                              onClick={() => {
                                setPhotoToDelete(photo.id);
                                setIsDeletePhotoOpen(true);
                              }}
                              className="size-8 rounded-lg bg-black/60 border border-white/10 text-rose-500 hover:text-rose-400 flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/40 to-transparent p-4 flex flex-col justify-end h-24">
                          <span className="text-xs font-bold text-white">
                            {formatLogDate(photo.date)}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 space-y-3 bg-card dark:bg-neutral-950/60 border-t border-border dark:border-white/4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Status do Personal</span>
                          {photo.trainerLiked ? (
                            <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 font-bold gap-1 text-[10px] rounded-full py-0.5 px-2">
                              <Heart className="size-3 text-rose-500 fill-rose-500 animate-pulse" /> Personal Curtiu
                            </Badge>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">Sem reações ainda</span>
                          )}
                        </div>

                        {photo.comment ? (
                          <div className="flex items-start gap-1.5 p-2 bg-muted/60 dark:bg-neutral-900/60 border border-border dark:border-neutral-800 rounded-lg text-xs italic text-muted-foreground dark:text-neutral-300">
                            <MessageCircle className="size-3.5 shrink-0 text-primary mt-0.5" />
                            <span>"{photo.comment}"</span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic text-center py-1">
                            Nenhum comentário do personal ainda.
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ==================== REGISTRAR MEDIDAS (DIALOG NO DESKTOP, DRAWER NO MOBILE) ==================== */}
      {isMobile ? (
        <Drawer open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
          <DrawerContent className="bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 text-foreground max-h-[85vh] flex flex-col p-0 pb-4">
            <DrawerHeader className="text-left px-6 pt-5 pb-2 shrink-0">
              <DrawerTitle className="text-lg font-bold flex items-center gap-2">
                <Scale className="size-5 text-primary" /> Registrar Minhas Medidas Corporais
              </DrawerTitle>
              <DrawerDescription className="text-xs text-muted-foreground">
                Insira seu peso atual, BF% e circunferências corporais para acompanhar sua transformação.
              </DrawerDescription>
            </DrawerHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-4">
              {renderLogForm(true)}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
          <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 text-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Scale className="size-5 text-primary" /> Registrar Minhas Medidas Corporais
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Insira seu peso atual, BF% e circunferências corporais para acompanhar sua transformação.
              </DialogDescription>
            </DialogHeader>
            {renderLogForm(false)}
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== DIALOG 2: UPLOAD PROGRESS PHOTO ==================== */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Camera className="size-5 text-primary" /> Enviar Foto de Progresso
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione uma foto sua de hoje para anexar à sua linha do tempo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePhotoSubmit} className="space-y-5 pt-2">
            <div className="space-y-4">
              {/* File input base64 conversion */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Selecionar arquivo de foto</Label>
                <div className="border-2 border-dashed border-border dark:border-neutral-800 rounded-xl p-4 text-center bg-muted/30 dark:bg-neutral-900/30 hover:bg-muted/50 dark:hover:bg-neutral-900/50 transition-colors relative cursor-pointer group">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 size-full opacity-0 cursor-pointer"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Camera className="size-8 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs font-bold text-foreground truncate max-w-[200px]">
                      {photoFile ? photoFile.name : "Escolher arquivo..."}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Imagens JPG, PNG, WEBP</span>
                  </div>
                </div>
              </div>

              {/* Or manual URL Link */}
              <div className="space-y-1">
                <Label htmlFor="photoUrl" className="text-xs font-bold text-muted-foreground">Ou informe a URL da foto</Label>
                <Input
                  id="photoUrl"
                  placeholder="https://exemplo.com/sua-foto.jpg"
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  disabled={!!photoBase64}
                  className="bg-background dark:bg-neutral-900 border border-border dark:border-white/[0.08] focus:border-primary/50 text-foreground h-10 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Preview image */}
            {photoBase64 && (
              <div className="rounded-xl overflow-hidden aspect-[4/3] border border-border dark:border-white/[0.06] relative bg-muted dark:bg-neutral-900">
                <img src={photoBase64} alt="Preview do progresso" className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoBase64(""); }}
                  className="absolute top-2 right-2 size-8 bg-black/60 text-rose-500 hover:text-rose-450 rounded-lg flex items-center justify-center cursor-pointer"
                  title="Remover"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button" variant="outline" onClick={() => setIsPhotoModalOpen(false)}
                className="border-border dark:border-white/[0.08] hover:bg-secondary/40 rounded-xl h-11 font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit" disabled={isSubmittingPhoto}
                className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer rounded-xl h-11 font-bold px-6"
              >
                {isSubmittingPhoto ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" /> Enviando...
                  </>
                ) : (
                  "Enviar Foto"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 3: COMPARISON LIGHTBOX (ANTES VS DEPOIS) ==================== */}
      <Dialog open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 text-foreground p-6 rounded-2xl!">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              Comparativo de Evolução Visual
            </DialogTitle>
          </DialogHeader>

          {(() => {
            if (selectedPhotoIds.length < 2) return null;
            const photo1 = photos.find((p: any) => p.id === selectedPhotoIds[0]);
            const photo2 = photos.find((p: any) => p.id === selectedPhotoIds[1]);
            if (!photo1 || !photo2) return null;

            const date1 = new Date(photo1.date).getTime();
            const date2 = new Date(photo2.date).getTime();
            const antes = date1 < date2 ? photo1 : photo2;
            const depois = date1 < date2 ? photo2 : photo1;

            return (
              <div className="pt-4 space-y-4">
                {/* Desktop layout: Side-by-Side */}
                <div className="hidden md:grid grid-cols-2 gap-6">
                  <div className="space-y-2 text-center">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block bg-emerald-500/10 border border-emerald-500/20 py-1.5 rounded-xl">
                      Antes — {formatLogDate(antes.date)}
                    </span>
                    <div className="aspect-3/4 rounded-xl overflow-hidden border border-border dark:border-white/6 bg-muted dark:bg-neutral-900 flex items-center justify-center">
                      <img src={antes.photoUrl} alt="Foto Antes" className="size-full object-cover" />
                    </div>
                    {antes.comment && (
                      <p className="text-[11px] text-muted-foreground dark:text-neutral-450 italic bg-muted/40 dark:bg-neutral-900/40 p-2.5 border border-border dark:border-neutral-800 rounded-xl">
                        "{antes.comment}"
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 text-center">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider block bg-primary/10 border border-primary/20 py-1.5 rounded-xl">
                      Depois — {formatLogDate(depois.date)}
                    </span>
                    <div className="aspect-3/4 rounded-xl overflow-hidden border border-border dark:border-white/6 bg-muted dark:bg-neutral-900 flex items-center justify-center">
                      <img src={depois.photoUrl} alt="Foto Depois" className="size-full object-cover" />
                    </div>
                    {depois.comment && (
                      <p className="text-[11px] text-muted-foreground dark:text-neutral-450 italic bg-muted/40 dark:bg-neutral-900/40 p-2.5 border border-border dark:border-neutral-800 rounded-xl">
                        "{depois.comment}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Mobile layout: Touch Carousel */}
                <div className="block md:hidden space-y-4">
                  {/* Segmented control tabs */}
                  <div className="flex bg-muted dark:bg-neutral-900 border border-border dark:border-neutral-800/80 p-1 rounded-xl w-full">
                    <button
                      type="button"
                      onClick={() => setCarouselSlide("antes")}
                      className={cn(
                        "flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer",
                        carouselSlide === "antes"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "text-muted-foreground hover:text-foreground border border-transparent"
                      )}
                    >
                      Antes
                    </button>
                    <button
                      type="button"
                      onClick={() => setCarouselSlide("depois")}
                      className={cn(
                        "flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer",
                        carouselSlide === "depois"
                          ? "bg-primary/15 text-primary border border-primary/20"
                          : "text-muted-foreground hover:text-foreground border border-transparent"
                      )}
                    >
                      Depois
                    </button>
                  </div>

                  {/* Swipeable Carousel Image Container */}
                  <div className="relative overflow-hidden aspect-3/4 rounded-2xl border border-border dark:border-white/6 bg-muted dark:bg-neutral-900 flex items-center justify-center">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={carouselSlide}
                        initial={{ opacity: 0, x: carouselSlide === "antes" ? -100 : 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: carouselSlide === "antes" ? 100 : -100 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.4}
                        onDragEnd={(e, info) => {
                          if (info.offset.x < -50 && carouselSlide === "antes") {
                            setCarouselSlide("depois");
                          } else if (info.offset.x > 50 && carouselSlide === "depois") {
                            setCarouselSlide("antes");
                          }
                        }}
                        className="size-full absolute inset-0 cursor-grab active:cursor-grabbing select-none"
                      >
                        <img
                          src={carouselSlide === "antes" ? antes.photoUrl : depois.photoUrl}
                          alt={carouselSlide === "antes" ? "Antes" : "Depois"}
                          className="size-full object-cover pointer-events-none"
                        />
                      </motion.div>
                    </AnimatePresence>

                    {/* Overlay Navigation Arrows */}
                    {carouselSlide === "depois" && (
                      <button
                        type="button"
                        onClick={() => setCarouselSlide("antes")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-20 cursor-pointer backdrop-blur-xs"
                      >
                        <ChevronLeft className="size-5" />
                      </button>
                    )}
                    {carouselSlide === "antes" && (
                      <button
                        type="button"
                        onClick={() => setCarouselSlide("depois")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 size-10 rounded-full bg-black/60 border border-white/10 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-20 cursor-pointer backdrop-blur-xs"
                      >
                        <ChevronRight className="size-5" />
                      </button>
                    )}
                  </div>

                  {/* Indicator dots */}
                  <div className="flex justify-center gap-1.5 pt-1">
                    <span
                      onClick={() => setCarouselSlide("antes")}
                      className={cn(
                        "h-1.5 rounded-full transition-all cursor-pointer",
                        carouselSlide === "antes" ? "w-6 bg-emerald-500" : "w-1.5 bg-neutral-700 hover:bg-neutral-600"
                      )}
                    />
                    <span
                      onClick={() => setCarouselSlide("depois")}
                      className={cn(
                        "h-1.5 rounded-full transition-all cursor-pointer",
                        carouselSlide === "depois" ? "w-6 bg-primary" : "w-1.5 bg-neutral-700 hover:bg-neutral-600"
                      )}
                    />
                  </div>

                  {/* Metadata and comments */}
                  <div className="space-y-2">
                    <div className="text-center">
                      <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                        Data da foto: {formatLogDate(carouselSlide === "antes" ? antes.date : depois.date)}
                      </span>
                    </div>
                    {carouselSlide === "antes" ? (
                      antes.comment && (
                        <p className="text-[11px] text-muted-foreground dark:text-neutral-450 italic bg-muted/40 dark:bg-neutral-900/40 p-2.5 border border-border dark:border-neutral-800 rounded-xl text-center">
                          "{antes.comment}"
                        </p>
                      )
                    ) : (
                      depois.comment && (
                        <p className="text-[11px] text-muted-foreground dark:text-neutral-450 italic bg-muted/40 dark:bg-neutral-900/40 p-2.5 border border-border dark:border-neutral-800 rounded-xl text-center">
                          "{depois.comment}"
                        </p>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="pt-4">
            <Button
              onClick={() => setIsComparisonOpen(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer rounded-xl h-11 w-full font-bold"
            >
              Fechar Comparativo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 4: SINGLE PHOTO LIGHTBOX ==================== */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="w-full max-w-2xl! overflow-y-auto! sm:max-w-sm bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 text-foreground p-4 rounded-2xl!">
          {lightboxPhoto && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="text-sm font-bold text-foreground">
                  Foto de Progresso — {formatLogDate(lightboxPhoto.date)}
                </DialogTitle>
              </DialogHeader>

              <div className="aspect-3/4 rounded-xl max-h-120 mx-auto overflow-hidden border border-border dark:border-white/6 bg-muted dark:bg-neutral-900 flex items-center justify-center relative">
                <img src={lightboxPhoto.photoUrl} alt="Lightbox Progresso" className="size-full object-cover" />
              </div>

              <div className="bg-muted/50 dark:bg-neutral-900/50 p-3 border border-border dark:border-neutral-800/80 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground dark:text-neutral-450 uppercase font-black tracking-wider">Status do Personal</span>
                  {lightboxPhoto.trainerLiked ? (
                    <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 font-bold gap-1 text-[10px] rounded-full">
                      <Heart className="size-3 text-rose-500 fill-rose-500 animate-pulse" /> Personal Curtiu
                    </Badge>
                  ) : (
                    <span className="text-[10px] text-neutral-500 italic">Sem reações</span>
                  )}
                </div>
                {lightboxPhoto.comment ? (
                  <p className="text-xs text-muted-foreground dark:text-neutral-300 italic p-2.5 bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 rounded-lg">
                    "{lightboxPhoto.comment}"
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground italic text-center">
                    Treinador ainda não comentou nesta imagem.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setLightboxPhoto(null)}
                  className="bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer rounded-xl h-11 w-full font-bold"
                >
                  Voltar para a Galeria
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== DELETE PROGRESS CONFIRMATION ALERT (confirmationmodals.md) ==================== */}
      <AlertDialog open={isDeleteProgressOpen} onOpenChange={setIsDeleteProgressOpen}>
        <AlertDialogContent className="bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 text-foreground rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-extrabold text-lg">Excluir Registro de Progresso?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-neutral-450 text-xs">
              Tem certeza que deseja excluir esta aferição de peso e medidas? Esta ação não poderá ser desfeita e o registro será apagado permanentemente do seu histórico corporal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border dark:border-white/[0.08] hover:bg-secondary/40 rounded-xl h-11 font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteProgress}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/95 cursor-pointer rounded-xl h-11 font-bold px-6 border-none"
            >
              Excluir Registro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== DELETE PHOTO CONFIRMATION ALERT (confirmationmodals.md) ==================== */}
      <AlertDialog open={isDeletePhotoOpen} onOpenChange={setIsDeletePhotoOpen}>
        <AlertDialogContent className="bg-background dark:bg-neutral-950 border border-border dark:border-neutral-800 text-foreground rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-extrabold text-lg">Remover Foto de Progresso?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-neutral-450 text-xs">
              Tem certeza que deseja excluir esta foto da sua linha do tempo de evolução visual? Esta ação não poderá ser desfeita e a foto será apagada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="border-border dark:border-white/[0.08] hover:bg-secondary/40 rounded-xl h-11 font-semibold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePhoto}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/95 cursor-pointer rounded-xl h-11 font-bold px-6 border-none"
            >
              Excluir Foto
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Skeletons to completely comply with skelletonsloaders.md
function StudentEvolutionSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-pulse">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 max-w-full bg-muted/80 dark:bg-neutral-900" />
          <Skeleton className="h-4 w-full max-w-md bg-muted/80 dark:bg-neutral-900" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 w-32 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
          <Skeleton className="h-11 w-32 bg-muted/80 dark:bg-neutral-900 rounded-xl" />
        </div>
      </div>

      {/* Consolidation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-28 bg-muted/80 dark:bg-neutral-900 rounded-2xl" />
        ))}
      </div>

      {/* Tabs list skeleton */}
      <Skeleton className="h-11 w-full md:w-96 bg-muted/80 dark:bg-neutral-900 rounded-xl" />

      {/* Main card panel skeleton */}
      <Card className="border border-border/50 bg-card dark:bg-neutral-950/20">
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-[300px] w-full bg-muted dark:bg-neutral-900 rounded-xl" />
        </CardContent>
      </Card>
    </div>
  );
}
