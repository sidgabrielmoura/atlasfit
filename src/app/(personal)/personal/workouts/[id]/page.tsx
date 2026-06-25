"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Edit2,
  Dumbbell,
  Clock,
  Activity,
  Flame,
  Gauge,
  Loader2,
  Copy,
  Trash2,
  Play,
  Search,
  Award,
  Sparkles,
  TrendingUp,
  Compass,
  ArrowRight,
  HelpCircle,
  X,
  Target,
  FileText,
  Printer
} from "lucide-react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ExerciseThumbnail, ExercisePreviewModal } from "@/components/application/exercise-preview-modal";

interface WorkoutDetailsPageProps {
  params: Promise<{ id: string }>;
}

export default function WorkoutDetailsPage({ params }: WorkoutDetailsPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [workout, setWorkout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});

  const handlePrintWorkout = (workout: any) => {
    const primaryColor = activeWs?.primaryColor || "#ea580c";
    const logoUrl = activeWs?.logoUrl || "";
    const workspaceName = activeWs?.name || "";
    const watermarkUrl = activeWs?.watermarkUrl || "";

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const groupLetters: Record<string, string> = {};
    let currentLetterCode = 65;
    (workout.exercises || []).forEach((we: any) => {
      if (we.groupId && !groupLetters[we.groupId]) {
        groupLetters[we.groupId] = String.fromCharCode(currentLetterCode++);
      }
    });

    const exercisesRows = (workout.exercises || []).map((we: any, idx: number) => {
      const repsArr = String(we.reps || "").split(",").map(s => s.trim());
      const loadArr = String(we.load || "").split(",").map(s => s.trim());
      const restArr = String(we.rest || "").split(",").map(s => s.trim());
      
      const isBodyweight = String(we.load || "").toLowerCase().includes("p.c");
      const formattedLoads = isBodyweight 
        ? "Peso do Corpo (p.c.)" 
        : (loadArr.map(l => l ? `${l} kg` : "Auto").join(" / ") || "Auto");

      const instructions = we.notes || we.exercise.instructions || "";
      
      let methodTags = "";
      let methodInstructions = "";

      if (we.groupId && we.group) {
        const typeLabel = we.group.type === "BISET" ? "Biset" : we.group.type === "TRISET" ? "Triset" : "Circuito";
        methodTags += `
          <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; background: rgba(234, 88, 12, 0.1); color: ${primaryColor}; margin-top: 4px; margin-right: 4px; border: 1px solid rgba(234, 88, 12, 0.2);">
            🔗 ${typeLabel} ${groupLetters[we.groupId]}
          </span>
        `;
      }

      if (we.methodType === "DROPSET") {
        methodTags += `
          <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; background: rgba(245, 158, 11, 0.1); color: #d97706; margin-top: 4px; margin-right: 4px; border: 1px solid rgba(245, 158, 11, 0.2);">
            ⚡ Dropset
          </span>
        `;
        const reduction = (we.methodConfig as any)?.reduction || 20;
        const drops = (we.methodConfig as any)?.drops || 2;
        methodInstructions = `Método Dropset: Faça a série com a carga planejada até a falha. Sem descansar, reduza a carga em ${reduction}% e faça o máximo de repetições possíveis. Repita o processo ${drops} vezes.`;
      } else if (we.methodType === "REST_PAUSE") {
        methodTags += `
          <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; background: rgba(147, 51, 234, 0.1); color: #9333ea; margin-top: 4px; margin-right: 4px; border: 1px solid rgba(147, 51, 234, 0.2);">
            ⚡ Rest-Pause
          </span>
        `;
        const pause = (we.methodConfig as any)?.pause || 15;
        const rounds = (we.methodConfig as any)?.rounds || 2;
        methodInstructions = `Método Rest-Pause: Faça a série até a falha. Solte o peso e descanse por apenas ${pause} segundos. Faça outra série até a falha. Repita o intervalo por ${rounds} vezes.`;
      }

      if (isBodyweight) {
        methodTags += `
          <span style="display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 4px; background: rgba(16, 185, 129, 0.1); color: #059669; margin-top: 4px; margin-right: 4px; border: 1px solid rgba(16, 185, 129, 0.2);">
            Peso do Corpo
          </span>
        `;
      }

      return `
        <tr style="border-bottom: 1px solid #e4e4e7;">
          <td style="padding: 12px 8px; font-weight: bold; text-align: center; color: ${primaryColor}; width: 40px;">${idx + 1}</td>
          <td style="padding: 12px 8px;">
            <div style="font-weight: bold; font-size: 14px; color: #18181b;">${we.exercise.name}</div>
            ${methodTags ? `<div style="margin-top: 2px;">${methodTags}</div>` : ""}
            ${methodInstructions ? `<div style="font-size: 10.5px; color: #18181b; font-weight: 600; background: #fafafa; border: 1px solid #e4e4e7; border-radius: 6px; padding: 6px 10px; margin-top: 6px;">${methodInstructions}</div>` : ""}
            ${instructions ? `<div style="font-size: 11px; color: #71717a; margin-top: 6px; font-style: italic;"><strong>Obs:</strong> ${instructions}</div>` : ""}
          </td>
          <td style="padding: 12px 8px; text-align: center; font-weight: 600; font-size: 13px;">${we.sets}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 13px;">${repsArr.join(" / ")}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 13px; font-weight: 600; color: ${isBodyweight ? primaryColor : "inherit"};">${formattedLoads}</td>
          <td style="padding: 12px 8px; text-align: center; font-size: 13px;">${restArr.join(" / ")}</td>
        </tr>
      `;
    }).join("");

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${workout.name} - ${workspaceName}</title>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
            @page {
              margin: 0;
              size: A4;
            }
            body {
              font-family: 'Inter', system-ui, -apple-system, sans-serif;
              margin: 0;
              padding: 40px 30px;
              color: #18181b;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              box-sizing: border-box;
              min-height: 100vh;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .top-bar {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 15px;
              background-color: ${primaryColor};
              z-index: 9999;
            }
            .bottom-bar {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 15px;
              background-color: ${primaryColor};
              z-index: 9999;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #f4f4f5;
              padding-bottom: 20px;
              margin-top: 15px;
              margin-bottom: 25px;
            }
            .brand-info {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .logo {
              width: 45px;
              height: 45px;
              object-fit: cover;
              border-radius: 8px;
            }
            .logo-fallback {
              width: 45px;
              height: 45px;
              background-color: ${primaryColor};
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 900;
              font-size: 20px;
              border-radius: 8px;
            }
            .brand-name {
              font-weight: 900;
              font-size: 18px;
              letter-spacing: -0.5px;
              color: #18181b;
            }
            .doc-title {
              text-align: right;
            }
            .doc-title h1 {
              margin: 0;
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: ${primaryColor};
            }
            .doc-title p {
              margin: 4px 0 0 0;
              font-size: 11px;
              color: #71717a;
              font-weight: 600;
            }
            .workout-summary {
              background-color: #fafafa;
              border: 1px solid #f4f4f5;
              border-radius: 12px;
              padding: 16px 20px;
              margin-bottom: 30px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
            }
            .summary-item {
              display: flex;
              flex-direction: column;
            }
            .summary-label {
              font-size: 9px;
              text-transform: uppercase;
              font-weight: 700;
              color: #71717a;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .summary-val {
              font-size: 14px;
              font-weight: 700;
              color: #18181b;
            }
            .section-title {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #71717a;
              margin-bottom: 12px;
              border-left: 3px solid ${primaryColor};
              padding-left: 8px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            th {
              background-color: #fafafa;
              color: #71717a;
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 10px 8px;
              border-bottom: 2px solid #f4f4f5;
            }
            .footer-note {
              margin-top: auto;
              border-top: 1px solid #f4f4f5;
              padding-top: 15px;
              font-size: 10px;
              color: #a1a1aa;
              text-align: center;
              margin-bottom: 15px;
            }
            ${watermarkUrl ? `
            .watermark {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url('${watermarkUrl}');
              background-position: center;
              background-repeat: no-repeat;
              background-size: 60%;
              opacity: 0.06;
              z-index: -1000;
              pointer-events: none;
            }
            ` : ""}
          </style>
        </head>
        <body>
          ${watermarkUrl ? `<div class="watermark"></div>` : ""}
          <div class="top-bar"></div>
          
          <div>
            <div class="header">
              <div class="brand-info">
                ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="${workspaceName}" />` : `<div class="logo-fallback">${workspaceName ? workspaceName.charAt(0).toUpperCase() : "A"}</div>`}
                <div class="brand-name">${workspaceName}</div>
              </div>
              <div class="doc-title">
                <h1>Ficha de Treino</h1>
                <p>${workout.name}</p>
              </div>
            </div>

            <div class="workout-summary">
              <div class="summary-item">
                <span class="summary-label">Objetivo</span>
                <span class="summary-val">${workout.goal || "Geral"}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Foco Muscular</span>
                <span class="summary-val">${workout.muscleGroupLabel || "Geral"}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Duração</span>
                <span class="summary-val">${workout.duration || "60 min"}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Descanso</span>
                <span class="summary-val">${workout.restBetweenExercises || "2 min"}</span>
              </div>
            </div>

            <div class="section-title">Exercícios Prescritos</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th style="text-align: left;">Exercício</th>
                  <th style="width: 80px; text-align: center;">Séries</th>
                  <th style="width: 100px; text-align: center;">Repetições</th>
                  <th style="width: 100px; text-align: center;">Carga</th>
                  <th style="width: 100px; text-align: center;">Descanso</th>
                </tr>
              </thead>
              <tbody>
                ${exercisesRows}
              </tbody>
            </table>
          </div>

          <div class="footer-note">
            Gerado automaticamente por ${workspaceName || "AtlasFit"}. Todos os direitos reservados.
          </div>
          
          <div class="bottom-bar"></div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                if (typeof html2pdf !== 'undefined') {
                  var opt = {
                    margin:       0,
                    filename:     '${workout.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf',
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, logging: false },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
                  };
                  html2pdf().set(opt).from(document.body).save().then(function() {
                    setTimeout(function() { window.close(); }, 1000);
                  }).catch(function(err) {
                    console.error('html2pdf error:', err);
                    window.print();
                    window.close();
                  });
                } else {
                  window.print();
                  window.close();
                }
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const fetchWorkoutDetails = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/personal/workouts/${id}`);
      if (!res.ok) {
        throw new Error("Erro ao carregar detalhes do treino.");
      }
      const data = await res.json();
      setWorkout(data);
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar os detalhes do treino.");
      router.push("/personal/workouts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkoutDetails();
  }, [id]);

  const handleDuplicate = async () => {
    if (isDuplicating || isDeleting) return;
    try {
      setIsDuplicating(true);
      const res = await fetch(`/api/personal/workouts/${id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Erro ao duplicar.");
      }
      toast.success("Modelo de treino duplicado com sucesso!");
      router.push("/personal/workouts");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao duplicar o treino.");
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (isDeleting || isDuplicating) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/personal/workouts/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Erro ao excluir.");
      }
      toast.success("Modelo de treino excluído!");
      setIsDeleteAlertOpen(false);
      router.push("/personal/workouts");
    } catch (error) {
      console.error(error);
      toast.error("Falha ao excluir o treino.");
    } finally {
      setIsDeleting(false);
    }
  };


  // Automated search fallback if no direct URL is configured in exercise
  const getYoutubeSearchLink = (exerciseName: string) => {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + " execução correta")}`;
  };

  // Dynamic calculations for volume analysis
  const totalSets = workout?.exercises?.reduce((acc: number, we: any) => acc + we.sets, 0) || 0;
  const totalExercises = workout?.exercises?.length || 0;

  // Real-time dynamic analysis of muscle group target percentages
  const getMuscleGroupCoverage = (exercises: any[]) => {
    const counts: { [key: string]: number } = {};
    exercises.forEach((we) => {
      if (we.exercise.muscleGroups && we.exercise.muscleGroups.length > 0) {
        we.exercise.muscleGroups.forEach((g: any) => {
          counts[g.name] = (counts[g.name] || 0) + 1;
        });
      } else {
        const muscle = we.exercise.muscleGroup?.name || "Geral";
        counts[muscle] = (counts[muscle] || 0) + 1;
      }
    });
    const total = Object.values(counts).reduce((sum, val) => sum + val, 0) || 1;
    return Object.keys(counts).map((muscle) => ({
      name: muscle,
      count: counts[muscle],
      percentage: Math.round((counts[muscle] / total) * 100),
    })).sort((a, b) => b.count - a.count);
  };

  const muscleCoverage = workout ? getMuscleGroupCoverage(workout.exercises || []) : [];

  if (loading) {
    return (
      <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto relative overflow-hidden">
        {/* Glow ambient skeletons */}
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-neutral-900/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
          <Skeleton className="h-10 w-full sm:w-44 bg-zinc-900 border border-white/[0.04] rounded-xl" />
          <div className="grid grid-cols-3 gap-2 w-full sm:flex sm:w-auto sm:items-center">
            <Skeleton className="h-10 w-full sm:w-28 bg-zinc-900 border border-white/[0.04] rounded-xl" />
            <Skeleton className="h-10 w-full sm:w-20 bg-zinc-900 border border-white/[0.04] rounded-xl" />
            <Skeleton className="h-10 w-full sm:w-20 bg-zinc-900 border border-white/[0.04] rounded-xl" />
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-6">
            {/* Hero card skeleton */}
            <Card className="border border-white/[0.04] bg-zinc-950/20 backdrop-blur-md overflow-hidden rounded-3xl p-6 md:p-8">
              <div className="space-y-4">
                <Skeleton className="h-10 w-2/3 bg-zinc-900 rounded-xl" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-24 bg-zinc-900 rounded-lg" />
                  <Skeleton className="h-6 w-28 bg-zinc-900 rounded-lg" />
                  <Skeleton className="h-6 w-20 bg-zinc-900 rounded-lg" />
                </div>
              </div>
            </Card>

            {/* Stats card skeleton inside left col (mobile layout) */}
            <div className="block lg:hidden">
              <Card className="border border-white/[0.04] bg-zinc-950/20 backdrop-blur-md rounded-3xl p-6">
                <Skeleton className="h-6 w-32 bg-zinc-900 rounded mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-2" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                </div>
              </Card>
            </div>

            {/* List header skeleton */}
            <div className="space-y-4 pt-2">
              <Skeleton className="h-6 w-48 bg-zinc-900 rounded" />
              {[1, 2, 3].map((n) => (
                <div key={n} className="p-5 md:p-6 rounded-2xl border border-white/[0.04] bg-zinc-900/10 flex flex-col md:flex-row md:items-center justify-between gap-5 relative">
                  <div className="flex items-center gap-4 min-w-0 w-full md:w-auto">
                    <Skeleton className="size-11 bg-zinc-900 rounded-xl shrink-0" />
                    <div className="space-y-2 min-w-0 flex-1">
                      <Skeleton className="h-5 w-3/4 sm:w-48 bg-zinc-900 rounded" />
                      <Skeleton className="h-3.5 w-20 bg-zinc-900 rounded-md" />
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto border-t border-white/[0.04] md:border-none pt-4 md:pt-0">
                    <Skeleton className="h-14 w-full sm:w-56 bg-zinc-900 rounded-xl" />
                    <Skeleton className="h-10 w-full sm:w-32 bg-zinc-900 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* Stats card skeleton inside right col (desktop layout) */}
            <div className="hidden lg:block">
              <Card className="border border-white/[0.04] bg-zinc-950/20 backdrop-blur-md rounded-3xl p-6">
                <Skeleton className="h-6 w-32 bg-zinc-900 rounded mb-4" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-2" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                  <Skeleton className="h-20 bg-zinc-900/50 rounded-2xl col-span-1" />
                </div>
              </Card>
            </div>
            {/* Muscle coverage skeleton */}
            <Card className="border border-white/[0.04] bg-zinc-950/20 backdrop-blur-md rounded-3xl p-6">
              <Skeleton className="h-6 w-40 bg-zinc-900 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2].map((n) => (
                  <div key={n} className="space-y-1">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20 bg-zinc-900 rounded" />
                      <Skeleton className="h-4 w-10 bg-zinc-900 rounded" />
                    </div>
                    <Skeleton className="h-2.5 w-full bg-zinc-900 rounded-full" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!workout) return null;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto relative overflow-hidden">
      {/* Glow aesthetic overlays */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/[0.02] rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.02] rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* Top Floating Action Block */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10 w-full">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 w-full sm:w-auto bg-zinc-950/40 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-100 border border-white/[0.06] backdrop-blur-md rounded-xl transition-all h-10 px-4 justify-center"
          asChild
        >
          <Link href="/personal/workouts">
            <ChevronLeft className="size-4.5" /> Voltar para modelos
          </Link>
        </Button>

        <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-10 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/60 border-white/[0.06] hover:text-zinc-100 transition-all font-semibold px-2 sm:px-4 justify-center text-xs sm:text-sm"
            onClick={() => handlePrintWorkout(workout)}
            disabled={isDuplicating || isDeleting}
          >
            <Printer className="size-4 text-zinc-400 shrink-0" />
            <span className="truncate">Exportar PDF</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-10 rounded-xl bg-zinc-950/40 hover:bg-zinc-900/60 border-white/[0.06] hover:text-zinc-100 transition-all font-semibold px-2 sm:px-4 justify-center text-xs sm:text-sm"
            onClick={handleDuplicate}
            disabled={isDuplicating || isDeleting}
          >
            {isDuplicating ? (
              <>
                <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                <span className="truncate">Duplicando...</span>
              </>
            ) : (
              <>
                <Copy className="size-4 text-zinc-400 shrink-0" />
                <span className="truncate">Duplicar<span className="hidden sm:inline"> Modelo</span></span>
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-10 rounded-xl bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary hover:text-primary transition-all font-bold px-2 sm:px-4 justify-center text-xs sm:text-sm"
            asChild
            disabled={isDuplicating || isDeleting}
          >
            <Link href={`/personal/workouts/${id}/edit`}>
              <Edit2 className="size-4 shrink-0" />
              <span className="truncate">Editar<span className="hidden sm:inline"> Dados</span></span>
            </Link>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 h-10 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 border-rose-500/10 text-rose-400 hover:text-rose-400 transition-all font-semibold px-2 sm:px-4 justify-center text-xs sm:text-sm"
            onClick={() => setIsDeleteAlertOpen(true)}
            disabled={isDuplicating || isDeleting}
          >
            <Trash2 className="size-4 text-rose-500/70 shrink-0" />
            <span className="truncate">Excluir</span>
          </Button>
        </div>
      </div>

      {/* 2-Column Responsive Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start relative z-10">

        {/* COL 1 & 2: Main Info & Exercise Flow */}
        <div className="lg:col-span-2 space-y-8">

          {/* Main Glassmorphic Hero Card */}
          <Card className="border border-white/[0.06] shadow-2xl bg-zinc-950/40 backdrop-blur-xl overflow-hidden rounded-3xl relative">
            {/* Visual glow ribbon top right */}
            <div className="absolute right-0 top-0 w-80 h-80 bg-gradient-to-bl from-primary/10 to-transparent blur-3xl pointer-events-none" />
            <Dumbbell className="absolute -right-12 -bottom-12 size-60 text-zinc-900/15 pointer-events-none rotate-12" />

            <CardContent className="p-6 md:p-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border border-primary/20 rounded-lg px-2.5 py-0.5 text-xs font-bold flex items-center gap-1">
                    Ficha de Modelo
                  </Badge>
                  {workout.muscleGroupLabel && (
                    <Badge variant="outline" className="border-white/[0.06] bg-zinc-900/40 text-zinc-300 font-semibold px-2.5 py-0.5 rounded-lg text-xs">
                      {workout.muscleGroupLabel}
                    </Badge>
                  )}
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                  {workout.name}
                </h1>

                <div className="flex flex-wrap items-center gap-2 pt-1.5">
                  <Badge className="bg-primary/15 text-primary border border-primary/25 px-3.5 py-1 rounded-full font-semibold text-xs tracking-wide">
                    Objetivo: {workout.goal}
                  </Badge>

                  {/* Smart Semantic Difficulty Tags */}
                  {workout.difficulty === "Iniciante" && (
                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3.5 py-1 rounded-full font-semibold text-xs">
                      Nível: Iniciante
                    </Badge>
                  )}
                  {workout.difficulty === "Intermediário" && (
                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/25 px-3.5 py-1 rounded-full font-semibold text-xs">
                      Nível: Intermediário
                    </Badge>
                  )}
                  {workout.difficulty === "Avançado" && (
                    <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/25 px-3.5 py-1 rounded-full font-semibold text-xs animate-pulse">
                      Nível: Avançado 🔥
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Real consolidated metrics card inside left col (mobile layout) */}
          <div className="block lg:hidden">
            <Card className="border border-white/[0.06] bg-zinc-950/40 backdrop-blur-xl rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/[0.02] rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-6 space-y-5">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <Gauge className="size-5 text-primary" /> Painel Consolidado
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Clock className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Duração</span>
                    <span className="font-black text-lg text-white">{workout.duration}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Dumbbell className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Exercícios</span>
                    <span className="font-black text-lg text-white">{totalExercises}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Activity className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform animate-pulse" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Volume Séries</span>
                    <span className="font-black text-lg text-white">{totalSets} séries</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Clock className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Desc. Exercícios</span>
                    <span className="font-black text-lg text-white">{workout.restBetweenExercises || "2 min"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exercise Prescriptions flow */}
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-white/[0.04]">
              <h3 className="font-extrabold text-xl text-white flex items-center gap-2">
                <Flame className="size-5.5 text-primary animate-pulse" /> Ficha de Exercícios
              </h3>
              <Badge className="bg-zinc-900 border border-white/[0.06] text-zinc-300 font-bold px-2.5 py-1 rounded-lg">
                {totalExercises} {totalExercises === 1 ? "Exercício" : "Exercícios"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {(() => {
                const groupLetters: Record<string, string> = {};
                let currentLetterCode = 65;
                (workout.exercises || []).forEach((we: any) => {
                  if (we.groupId && !groupLetters[we.groupId]) {
                    groupLetters[we.groupId] = String.fromCharCode(currentLetterCode++);
                  }
                });

                return (workout.exercises || []).map((we: any, index: number) => {
                  const hasVideo = !!we.exercise.videoUrl;
                  const repsArr = String(we.reps || "").split(",").map(s => s.trim());
                  const loadArr = String(we.load || "").split(",").map(s => s.trim());
                  const restArr = String(we.rest || "").split(",").map(s => s.trim());
                  const isIndividual = repsArr.length > 1 || loadArr.length > 1 || restArr.length > 1;

                  return (
                    <div
                      key={we.id}
                      className="group relative overflow-hidden p-4 md:p-6 rounded-2xl border border-white/[0.04] bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-white/[0.08] hover:shadow-[0_0_30px_-5px_rgba(var(--primary-rgb),0.1)] transition-all duration-300 backdrop-blur-md flex flex-col gap-4"
                    >
                      <div className="flex flex-col gap-4 w-full">
                        {/* Visual Watermark number */}
                        <span className="text-white/[0.02] group-hover:text-primary/[0.05] select-none transition-all duration-500 font-black text-6xl md:text-8xl absolute right-4 top-2 md:right-6 md:top-4 pointer-events-none">
                          {String(index + 1).padStart(2, "0")}
                        </span>

                        {/* Row 1: Exercise Info & Desktop Video Button */}
                        <div className="flex items-center justify-between gap-4 w-full relative z-10">
                          <div
                            className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
                            onClick={() => {
                              setPreviewExercise(we.exercise);
                              setIsPreviewModalOpen(true);
                            }}
                          >
                            {/* Step index badge */}
                            <div className="size-9 md:size-11 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-sm md:text-base shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-sm">
                              {index + 1}
                            </div>

                            <ExerciseThumbnail videoUrl={we.exercise.videoUrl} className="size-11 rounded-xl" />

                            <div className="min-w-0 space-y-1">
                              <h4 className="font-bold text-base md:text-lg text-white leading-snug group-hover:text-primary transition-colors break-words">
                                {we.exercise.name}
                              </h4>
                              <div className="flex flex-wrap items-center gap-2">
                                 {we.exercise.muscleGroups && we.exercise.muscleGroups.length > 0 ? (
                                   we.exercise.muscleGroups.map((g: any) => (
                                     <Badge key={g.name} variant="outline" className="border-white/[0.04] bg-zinc-900/40 text-zinc-400 text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                                       {g.name}
                                     </Badge>
                                   ))
                                 ) : (
                                   <Badge variant="outline" className="border-white/[0.04] bg-zinc-900/40 text-zinc-400 text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                                     {we.exercise.muscleGroup?.name || "Geral"}
                                   </Badge>
                                 )}

                                {we.groupId && we.group && (
                                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                    🔗 {we.group.type === "BISET" ? "Biset" : we.group.type === "TRISET" ? "Triset" : "Circuito"} {groupLetters[we.groupId]}
                                  </Badge>
                                )}

                                {we.methodType === "DROPSET" && (
                                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                    ⚡ Dropset
                                  </Badge>
                                )}

                                {we.methodType === "REST_PAUSE" && (
                                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                    ⚡ Rest-Pause
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="hidden sm:block shrink-0">
                            {hasVideo ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-10 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/40 font-bold transition-all shadow-md flex items-center gap-2"
                                onClick={() => {
                                  setPreviewExercise(we.exercise);
                                  setIsPreviewModalOpen(true);
                                }}
                              >
                                <Play className="size-4 fill-primary shrink-0" /> Ver Execução
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-10 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-dashed border-white/[0.06] transition-all flex items-center gap-2"
                                asChild
                              >
                                <a
                                  href={getYoutubeSearchLink(we.exercise.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Search className="size-4 shrink-0" /> Buscar Ajuda
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Row 2: Metrics Specs & Mobile Video Button */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-white/[0.04] w-full relative z-10">
                          {/* Metric specs dials */}
                          <div className="w-full sm:w-auto grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-6 bg-zinc-950/60 p-2 sm:p-2.5 sm:px-4 rounded-xl border border-white/[0.04] shadow-inner">
                            <div className="text-center sm:min-w-12">
                              <span className="text-[9px] text-zinc-500 block uppercase font-extrabold tracking-wider">Séries</span>
                              <span className="font-extrabold text-sm text-white">{we.sets}</span>
                            </div>
                            <div className="hidden sm:block w-px h-6 bg-white/[0.08]" />
                            <div className="text-center sm:min-w-12">
                              <span className="text-[9px] text-zinc-500 block uppercase font-extrabold tracking-wider">Reps</span>
                              <span className="font-extrabold text-sm text-white">{repsArr[0] || "10"}</span>
                            </div>
                            <div className="hidden sm:block w-px h-6 bg-white/[0.08]" />
                            <div className="text-center sm:min-w-12">
                              <span className="text-[9px] text-zinc-500 block uppercase font-extrabold tracking-wider">Carga</span>
                              <span className="font-extrabold text-sm text-white">{loadArr[0] || "Auto"}</span>
                            </div>
                            <div className="hidden sm:block w-px h-6 bg-white/[0.08]" />
                            <div className="text-center sm:min-w-12">
                              <span className="text-[9px] text-zinc-500 block uppercase font-extrabold tracking-wider">Descanso</span>
                              <span className="font-extrabold text-xs text-white whitespace-nowrap">{restArr[0] || "60s"}</span>
                            </div>
                          </div>

                          <div className="block sm:hidden w-full">
                            {hasVideo ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 hover:border-primary/40 font-bold transition-all shadow-md flex items-center gap-2 justify-center"
                                onClick={() => {
                                  setPreviewExercise(we.exercise);
                                  setIsPreviewModalOpen(true);
                                }}
                              >
                                <Play className="size-4 fill-primary shrink-0" /> Ver Execução
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full h-11 rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40 border border-dashed border-white/[0.06] transition-all flex items-center gap-2 justify-center"
                                asChild
                              >
                                <a
                                  href={getYoutubeSearchLink(we.exercise.name)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Search className="size-4 shrink-0" /> Buscar Ajuda
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                    {/* Collapsible individual sets section */}
                    {isIndividual && (
                      <div className="w-full relative z-20">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-bold text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.02] rounded-lg gap-1.5 px-2.5 -ml-2.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedExercises(prev => ({ ...prev, [we.id]: !prev[we.id] }));
                          }}
                        >
                          {expandedExercises[we.id] ? (
                            <>
                              Ocultar séries <ChevronUp className="size-3.5" />
                            </>
                          ) : (
                            <>
                              Ver todas as {we.sets} séries <ChevronDown className="size-3.5" />
                            </>
                          )}
                        </Button>

                        {expandedExercises[we.id] && (
                          <div className="mt-3 flex flex-col! gap-2.5 p-3 rounded-xl bg-zinc-950/40 border border-white/4">
                            {Array.from({ length: we.sets }).map((_, si) => (
                              <div key={si} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-zinc-900/30 border border-white/[0.02] text-xs">
                                <span className="font-bold text-zinc-500">#{si + 1}</span>
                                <div className="flex items-center gap-3">
                                  <div>
                                    <span className="text-[10px] text-zinc-500 block leading-none font-bold uppercase">Reps</span>
                                    <span className="font-bold text-white">{repsArr[si] || repsArr[0] || "10"}</span>
                                  </div>
                                  <div className="w-px h-5 bg-white/6" />
                                  <div>
                                    <span className="text-[10px] text-zinc-500 block leading-none font-bold uppercase">Carga</span>
                                    <span className="font-bold text-white">{loadArr[si] || loadArr[0] || "Auto"}</span>
                                  </div>
                                  <div className="w-px h-5 bg-white/6" />
                                  <div>
                                    <span className="text-[10px] text-zinc-500 block leading-none font-bold uppercase">Desc.</span>
                                    <span className="font-bold text-white">{restArr[si] || restArr[0] || "60s"}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            })()}</div>
          </div>
        </div>

        {/* COL 3: Quick Stats & Sideboards */}
        <div className="space-y-6">

          {/* Summary Dashboard widgets inside right col (desktop layout) */}
          <div className="hidden lg:block">
            <Card className="border border-white/[0.06] bg-zinc-950/40 backdrop-blur-xl rounded-3xl shadow-2xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-primary/[0.02] rounded-full blur-2xl pointer-events-none" />
              <CardContent className="p-6 space-y-5">
                <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                  <Gauge className="size-5 text-primary" /> Painel Consolidado
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Clock className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Duração</span>
                    <span className="font-black text-lg text-white">{workout.duration}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Dumbbell className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Exercícios</span>
                    <span className="font-black text-lg text-white">{totalExercises}</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Activity className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform animate-pulse" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Volume Séries</span>
                    <span className="font-black text-lg text-white">{totalSets} séries</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900/30 border border-white/[0.04] shadow-sm flex flex-col justify-between h-20 relative overflow-hidden group hover:border-white/[0.08] transition-all col-span-1">
                    <Clock className="size-4 text-primary absolute right-3.5 top-3.5 opacity-40 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] text-zinc-500 block uppercase font-bold tracking-wider">Desc. Exercícios</span>
                    <span className="font-black text-lg text-white">{workout.restBetweenExercises || "2 min"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Muscle Focus Coverage chart */}
          <Card className="border border-white/[0.06] bg-zinc-950/40 backdrop-blur-xl rounded-3xl shadow-2xl relative overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                <Target className="size-5 text-primary" /> Foco Muscular Estimado
              </h3>

              {muscleCoverage.length === 0 ? (
                <div className="text-center text-xs text-zinc-500 py-6">
                  Nenhum músculo mapeado ainda.
                </div>
              ) : (
                <div className="space-y-4 pt-1">
                  {muscleCoverage.map((muscle) => (
                    <div key={muscle.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-semibold text-zinc-300">
                        <span className="flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-primary" /> {muscle.name}
                        </span>
                        <span className="text-white text-[11px] bg-zinc-900 px-1.5 py-0.5 rounded border border-white/[0.04]">
                          {muscle.percentage}% ({muscle.count} {muscle.count === 1 ? "ex" : "exs"})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-zinc-950/60 border border-white/[0.04] rounded-full overflow-hidden p-0.5">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${muscle.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
      />

      {/* ALERT DIALOG: Permanent deletion confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-zinc-950 border border-white/[0.08] text-white rounded-3xl max-w-[calc(100%-2rem)] sm:max-w-md overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-xl font-black flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" /> Excluir Modelo de Treino?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400 text-xs leading-relaxed pt-1.5">
              Tem certeza que deseja excluir permanentemente o modelo <strong>&quot;{workout.name}&quot;</strong>?
              Esta ação é <span className="text-rose-400 font-bold">irreversível</span> e o template não poderá mais ser atribuído aos alunos.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              className="bg-zinc-900 border-white/[0.04] text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl font-bold h-11"
              disabled={isDeleting}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold h-11 min-w-24 gap-2 border-none"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Excluindo...
                </>
              ) : (
                <>
                  Confirmar Exclusão
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
