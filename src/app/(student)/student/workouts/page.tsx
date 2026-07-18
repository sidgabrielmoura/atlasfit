"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  Play,
  Clock,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Calendar,
  History,
  Info,
  Check,
  X,
  Timer,
  RotateCcw,
  Trophy,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  PlayCircle,
  ShieldAlert,
  Printer,
  ExternalLink,
  Minimize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ExerciseThumbnail, ExercisePreviewModal } from "@/components/application/exercise-preview-modal";
import { workoutStore, workoutActions } from "@/stores/workout.store";

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
} as any;

interface DisplayItem {
  type: "individual" | "group";
  exercise?: any; // WorkoutExercise
  group?: any;    // WorkoutExerciseGroup
  exercises?: any[]; // WorkoutExercise[]
}

const getYouTubeSearchUrl = (methodType: string, exerciseName?: string) => {
  let query = "";
  const suffix = exerciseName ? ` ${exerciseName}` : " musculacao";
  if (methodType === "DROPSET") {
    query = `como fazer dropset${suffix}`;
  } else if (methodType === "REST_PAUSE") {
    query = `como fazer rest pause${suffix}`;
  } else if (methodType === "BISET") {
    query = `como fazer biset${suffix}`;
  } else if (methodType === "TRISET") {
    query = `como fazer triset${suffix}`;
  } else if (methodType === "CIRCUIT") {
    query = `treino em circuito${suffix}`;
  } else {
    query = exerciseName ? `${exerciseName} execucao correta` : "execucao correta musculacao";
  }
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
};

const getDisplayItems = (exercises: any[], exerciseGroups: any[] = []): DisplayItem[] => {
  const items: DisplayItem[] = [];
  let currentGroupItems: any[] = [];
  let currentGroupId: string | null = null;

  exercises.forEach((ex) => {
    if (ex.groupId) {
      if (currentGroupId === ex.groupId) {
        currentGroupItems.push(ex);
      } else {
        if (currentGroupItems.length > 0) {
          const matchedGroup = exerciseGroups.find(g => g.id === currentGroupId);
          items.push({
            type: "group",
            group: matchedGroup || currentGroupItems[0].group,
            exercises: [...currentGroupItems]
          });
        }
        currentGroupId = ex.groupId;
        currentGroupItems = [ex];
      }
    } else {
      if (currentGroupItems.length > 0) {
        const matchedGroup = exerciseGroups.find(g => g.id === currentGroupId);
        items.push({
          type: "group",
          group: matchedGroup || currentGroupItems[0].group,
          exercises: [...currentGroupItems]
        });
        currentGroupItems = [];
        currentGroupId = null;
      }
      items.push({
        type: "individual",
        exercise: ex
      });
    }
  });

  if (currentGroupItems.length > 0) {
    const matchedGroup = exerciseGroups.find(g => g.id === currentGroupId);
    items.push({
      type: "group",
      group: matchedGroup || currentGroupItems[0].group,
      exercises: [...currentGroupItems]
    });
  }

  return items;
};


export default function StudentWorkoutsPage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  // State Management
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar / Selection States
  const daysOfWeekLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  // Video Demo Modal
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Workout Execution via global Valtio store
  const workoutSnap = useSnapshot(workoutStore);
  const activeExecutionWorkout = workoutSnap.activeWorkout;
  const currentStepIdx = workoutSnap.currentStepIdx;
  const executionSteps = workoutSnap.executionSteps;
  const allWorkoutLoads = workoutSnap.allWorkoutLoads;
  const allWorkoutReps = workoutSnap.allWorkoutReps;
  const allWorkoutSetsDone = workoutSnap.allWorkoutSetsDone;
  const restTimer = workoutSnap.restTimer;
  const isRestTimerActive = workoutSnap.isRestTimerActive;
  const totalTimer = workoutSnap.totalTimer;
  const isTotalTimerRunning = workoutSnap.isTotalTimerRunning;

  // Local fallback variables for set execution (compatibility)
  const currentExecExerciseIdx = 0;
  const setsWeights: string[] = [];
  const setsReps: string[] = [];
  const setsDone: boolean[] = [];

  const isStepCompleted = (step: any) => {
    if (!step) return false;
    if (step.type === "individual") {
      const exId = step.exercise.id;
      const doneArr = allWorkoutSetsDone[exId];
      return doneArr ? doneArr.every((d: boolean) => d) : false;
    } else {
      return step.exercises.every((ex: any) => {
        const doneArr = allWorkoutSetsDone[ex.id];
        return doneArr ? doneArr.every((d: boolean) => d) : false;
      });
    }
  };

  // Effort Evaluation State
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [effortScore, setEffortScore] = useState<number>(3); // default "Adequado"
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);

  // Confirmation State for leaving workout (confirmationmodals.md compliance)
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);

  // Congratulations Modal
  const [showConGrats, setShowConGrats] = useState(false);

  // Exercise expansion states
  const [expandedExercises, setExpandedExercises] = useState<Record<string, boolean>>({});

  // Load workouts data on mount
  useEffect(() => {
    loadWorkoutsData();
  }, []);

  async function loadWorkoutsData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/student/workouts");
      if (!res.ok) {
        throw new Error("Falha ao carregar treinos.");
      }
      const apiData = await res.json();
      setWorkouts(apiData.workouts || []);
      setHistoryLogs(apiData.logs || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

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
                  <th style="width: 120px; text-align: center;">Repetições</th>
                  <th style="width: 120px; text-align: center;">Carga</th>
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

  // Active workout for the selected day of the week
  const selectedWorkout = workouts.find((w) => w.dayOfWeek === selectedDay);

  const isCompletedToday = selectedWorkout
    ? historyLogs.some((log) =>
      log.workoutId === selectedWorkout.id &&
      new Date(log.completedAt).toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR")
    )
    : false;

  const currentStep = executionSteps[currentStepIdx];
  const allSetsCompleted = currentStep ? isStepCompleted(currentStep) : false;

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleToggleGroupSet = (setIdx: number, step: any) => {
    if (step.type !== "group") return;

    const exercises = step.exercises || [];
    const nextDone = JSON.parse(JSON.stringify(workoutStore.allWorkoutSetsDone));

    // Determine if it's currently completed (based on first exercise as reference)
    const isCurrentlyDone = nextDone[exercises[0].id]?.[setIdx];

    if (!isCurrentlyDone) {
      // Validate loads for all exercises in this set
      for (const ex of exercises) {
        const predefinedLoad = ex.load;
        const isPredefined = typeof predefinedLoad === "string" &&
          predefinedLoad.trim() !== "" &&
          !predefinedLoad.toLowerCase().includes("auto");
        if (!isPredefined) {
          const userLoad = allWorkoutLoads[ex.id]?.[setIdx];
          if (!userLoad || userLoad.trim() === "") {
            toast.warning(`Por favor, registre a carga do exercício "${ex.exercise.name}" na série ${setIdx + 1}. 💪`);
            return;
          }
        }
      }
    }

    // Toggle for all exercises in the group
    exercises.forEach((ex: any) => {
      if (!nextDone[ex.id]) {
        nextDone[ex.id] = new Array(ex.sets).fill(false);
      }
      nextDone[ex.id][setIdx] = !isCurrentlyDone;
    });

    workoutActions.updateSetsDone(nextDone);

    // If marked done, trigger rest timer
    if (!isCurrentlyDone) {
      const isCircuit = step.group?.type === "CIRCUIT";
      let restSeconds = 60;
      if (isCircuit && step.group?.config?.restBetweenRounds) {
        restSeconds = parseInt(step.group.config.restBetweenRounds) || 60;
      } else {
        const restValueStr = exercises[0].rest || "60s";
        restSeconds = parseInt(restValueStr) || 60;
      }
      workoutActions.startRestTimer(restSeconds);
    }
  };

  // Launch Workout Execution overlay
  const handleStartWorkout = (workout: any) => {
    if (!workout.isActive) {
      toast.error("Este treino está suspenso no momento pelo seu personal trainer.");
      return;
    }

    if (workoutStore.activeWorkout && workoutStore.activeWorkout.id !== workout.id) {
      toast.error("Você já possui um treino em andamento. Finalize ou cancele o treino atual antes de iniciar outro. ⚠️");
      return;
    }

    const isDoneToday = historyLogs.some((log) => {
      return log.workoutId === workout.id &&
        new Date(log.completedAt).toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR");
    });

    if (isDoneToday) {
      toast.error("Você já concluiu este treino hoje! Não é possível realizar o mesmo treino duas vezes no mesmo dia.");
      return;
    }

    const steps = getDisplayItems(workout.exercises, workout.exerciseGroups);

    // Initialize accumulated sets metrics for all exercises
    const initialLoads: Record<string, string[]> = {};
    const initialReps: Record<string, string[]> = {};
    const initialDone: Record<string, boolean[]> = {};
    workout.exercises.forEach((we: any) => {
      const repsArr = String(we.reps || "10").split(",").map(s => s.trim());
      const loadArr = String(we.load || "").split(",").map(s => s.trim());
      initialLoads[we.id] = Array.from({ length: we.sets }, (_, si) => loadArr[si] || loadArr[0] || "");
      initialReps[we.id] = Array.from({ length: we.sets }, (_, si) => repsArr[si] || repsArr[0] || "10");
      initialDone[we.id] = new Array(we.sets).fill(false);
    });

    workoutActions.startWorkout(workout, steps, initialLoads, initialReps, initialDone);
  };

  const searchParams = useSearchParams();
  const startWorkoutId = searchParams.get("startWorkoutId");
  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (workouts.length > 0 && startWorkoutId && !autoStartedRef.current) {
      const targetWorkout = workouts.find((w) => w.id === startWorkoutId);
      if (targetWorkout) {
        autoStartedRef.current = true;
        setSelectedDay(targetWorkout.dayOfWeek ?? new Date().getDay());
        handleStartWorkout(targetWorkout);
      }
    }
  }, [workouts, startWorkoutId, historyLogs]);

  // Toggle set status
  const handleToggleSet = (idx: number, exercise: any) => {
    const nextDone = JSON.parse(JSON.stringify(workoutStore.allWorkoutSetsDone));
    if (!nextDone[exercise.id]) {
      nextDone[exercise.id] = new Array(exercise.sets).fill(false);
    }

    const isCurrentlyDone = nextDone[exercise.id][idx];

    // Se estiver marcando como concluído, valida se a carga é obrigatória e foi registrada
    if (!isCurrentlyDone) {
      const predefinedLoad = exercise.load;
      const isPredefined = typeof predefinedLoad === "string" &&
        predefinedLoad.trim() !== "" &&
        !predefinedLoad.toLowerCase().includes("auto");

      if (!isPredefined) {
        const userLoad = allWorkoutLoads[exercise.id]?.[idx];
        if (!userLoad || userLoad.trim() === "") {
          toast.warning("Por favor, registre a carga utilizada nesta série antes de marcá-la como concluída. 💪");
          return;
        }
      }
    }

    nextDone[exercise.id][idx] = !isCurrentlyDone;
    workoutActions.updateSetsDone(nextDone);

    // If marked done, trigger rest timer
    if (!isCurrentlyDone) {
      const restValueStr = exercise.rest || "60s";
      const seconds = parseInt(restValueStr) || 60;
      workoutActions.startRestTimer(seconds);
    }
  };

  // Skip / Navigation between exercises in overlay
  const handleNextExercise = () => {
    if (!activeExecutionWorkout) return;

    const nextIdx = currentStepIdx + 1;
    if (nextIdx < executionSteps.length) {
      workoutActions.updateStepIdx(nextIdx);
      workoutActions.cancelRestTimer();
    } else {
      // Completed all exercises, trigger effort evaluation!
      workoutActions.setTotalTimerRunning(false);
      setIsEvaluating(true);
    }
  };

  const handlePrevExercise = () => {
    const prevIdx = currentStepIdx - 1;
    if (prevIdx >= 0 && activeExecutionWorkout) {
      workoutActions.updateStepIdx(prevIdx);
      workoutActions.cancelRestTimer();
    }
  };

  // Persist workout completion to database
  const handleSaveWorkoutLog = async () => {
    if (!activeExecutionWorkout) return;
    setIsSubmittingLog(true);
    try {
      const res = await fetch("/api/student/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workoutId: activeExecutionWorkout.id,
          feedback: feedbackNotes,
          effortScore,
          loads: allWorkoutLoads,
          reps: allWorkoutReps,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao salvar log de treino.");
      }

      toast.success("Treino concluído com sucesso! 🏆");
      setIsEvaluating(false);
      workoutActions.cancelWorkout();
      setShowConGrats(true);
      loadWorkoutsData(); // refresh logs list
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao gravar treino.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  if (loading) {
    return <StudentWorkoutsSkeleton />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="size-16 rounded-3xl bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">Falha ao carregar treinos</h2>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={() => loadWorkoutsData()} className="rounded-xl font-bold h-11 px-6">
          Recarregar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">Meus Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Visualize sua planilha de exercícios e registre suas conclusões no banco de dados.
          </p>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="rounded-xl font-bold h-11 gap-2 border-border/60 hover:bg-secondary/40 shadow-sm cursor-pointer w-full md:w-auto justify-center">
              <History className="size-4.5" /> Histórico de Conclusões
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md bg-background/95 backdrop-blur-xl border-l border-border p-6 overflow-y-auto">
            <SheetHeader className="pb-4 border-b border-border/40">
              <SheetTitle className="text-lg font-bold flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" />
                Histórico de Treinos
              </SheetTitle>
              <SheetDescription className="text-xs">
                Timeline com todos os seus treinos concluídos neste workspace.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-4 mt-6">
              {historyLogs.length > 0 ? (
                historyLogs.map((log: any) => (
                  <div key={log.id} className="p-4 rounded-xl border border-border/40 bg-card flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground">{log.workout.name}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(log.completedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-muted-foreground">{log.workout.muscleGroupLabel || "Foco Geral"}</span>
                      {log.effortScore && (
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[9px]">
                          Esforço: {log.effortScore}/5
                        </Badge>
                      )}
                    </div>
                    {log.feedback && (
                      <p className="text-[11px] text-muted-foreground leading-relaxed italic bg-secondary/20 p-2.5 rounded-lg border border-border/30 mt-1">
                        "{log.feedback}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground space-y-2 flex flex-col items-center justify-center">
                  <History className="size-8 text-muted-foreground/60 mb-2" />
                  <p className="text-sm font-bold">Nenhum treino concluído</p>
                  <p className="text-xs">Seus treinos finalizados aparecerão aqui.</p>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <Card className="border-border/50 p-0">
        <CardContent className="p-2 py-4">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1.5 scrollbar-thin scrollbar-thumb-muted">
            {daysOfWeekLabels.map((dayLabel, idx) => {
              const dayWorkouts = workouts.filter((w) => w.dayOfWeek === idx);
              const hasWorkout = dayWorkouts.length > 0;
              const isSelected = selectedDay === idx;
              const isToday = new Date().getDay() === idx;

              const isDayCompletedToday = dayWorkouts.some((w) =>
                historyLogs.some((log) =>
                  log.workoutId === w.id &&
                  new Date(log.completedAt).toLocaleDateString("pt-BR") === new Date().toLocaleDateString("pt-BR")
                )
              );

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDay(idx)}
                  className={cn(
                    "flex-1 min-w-[70px] py-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all cursor-pointer",
                    isSelected && "border-primary bg-primary/10! ring-1 ring-primary/20 shadow-md shadow-primary/5",
                    !isSelected && hasWorkout && "border-border bg-card hover:bg-secondary/20",
                    !isSelected && !hasWorkout && "border-border/40 bg-secondary/5 opacity-55 hover:bg-secondary/10"
                  )}
                >
                  <span className={cn("text-[10px] uppercase font-bold tracking-wider", isSelected ? "text-primary" : "text-muted-foreground")}>
                    {dayLabel}
                  </span>
                  {hasWorkout ? (
                    <div className="flex flex-col items-center gap-1">
                      <Badge variant="secondary" className={cn(
                        "text-[8px] font-black tracking-tighter px-1.5 py-0 border-none flex items-center justify-center gap-0.5",
                        isDayCompletedToday
                          ? "bg-emerald-500/10 text-emerald-500"
                          : (isSelected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")
                      )}>
                        {isDayCompletedToday && <Check className="size-2 shrink-0" />}
                        {dayWorkouts[0].muscleGroupLabel?.split(" ")[0] || "TREINO"}
                      </Badge>
                      {dayWorkouts[0].exercises?.some((we: any) => (we.methodType && we.methodType !== "NONE") || we.groupId) && (
                        <span className="text-[8px] font-black text-amber-500 flex items-center justify-center gap-0.5 leading-none select-none">
                          ⚡ MÉTODO
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[9px] font-bold text-muted-foreground/60">DESCANSO</span>
                  )}
                  {isToday && !isSelected && (
                    <div className="size-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Selected Workout Display Panel */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {selectedWorkout ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Left 2 Columns: Exercises list */}
              <div className="lg:col-span-2 space-y-6">

                {/* Active Workout Info Card */}
                <Card className="border-border/50 bg-gradient-to-r from-card to-secondary/20 overflow-hidden relative">
                  <CardContent className="p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn(
                          "rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase gap-1.5 ring-1",
                          selectedWorkout.isActive
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ring-emerald-500/10"
                            : "bg-destructive/10 text-destructive border-destructive/20 ring-destructive/10"
                        )}>
                          <span className={cn("size-1.5 rounded-full", selectedWorkout.isActive ? "bg-emerald-500 animate-pulse" : "bg-destructive")} />
                          {selectedWorkout.isActive ? "Treino Ativo" : "Treino Suspenso"}
                        </Badge>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[9px] font-bold uppercase">
                          {selectedWorkout.goal}
                        </Badge>
                        {isCompletedToday && (
                          <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase gap-1.5 ring-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ring-emerald-500/10">
                            <Check className="size-3 text-emerald-500 animate-bounce" /> Concluído Hoje
                          </Badge>
                        )}
                      </div>
                      <h2 className="text-xl md:text-2xl font-black tracking-tight">{selectedWorkout.name}</h2>
                      <p className="text-xs text-muted-foreground font-medium">
                        Foco muscular em <span className="text-primary font-semibold">{selectedWorkout.muscleGroupLabel || "Geral"}</span>
                      </p>
                      {(() => {
                        const methods = Array.from(new Set(
                          selectedWorkout.exercises
                            ?.map((we: any) => {
                              if (we.groupId) {
                                const matchedGroup = selectedWorkout.exerciseGroups?.find((g: any) => g.id === we.groupId);
                                const gType = matchedGroup?.type || we.group?.type;
                                if (gType) {
                                  return gType === "BISET" ? "BISET" : gType === "TRISET" ? "TRISET" : "CIRCUIT";
                                }
                              }
                              if (we.methodType !== "NONE" && we.methodType) {
                                return we.methodType;
                              }
                              return null;
                            })
                            .filter(Boolean)
                        ));
                        if (methods.length === 0) return null;
                        return (
                          <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {methods.map((method: any) => {
                              if (method === "BISET") {
                                return (
                                  <Badge key={method} className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    🔗 Biset
                                  </Badge>
                                );
                              }
                              if (method === "TRISET") {
                                return (
                                  <Badge key={method} className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    🔗 Triset
                                  </Badge>
                                );
                              }
                              if (method === "CIRCUIT") {
                                return (
                                  <Badge key={method} className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    🔗 Circuito
                                  </Badge>
                                );
                              }
                              if (method === "DROPSET") {
                                return (
                                  <Badge key={method} className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    ⚡ Dropset
                                  </Badge>
                                );
                              }
                              if (method === "REST_PAUSE") {
                                return (
                                  <Badge key={method} className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] px-1.5 py-0.5 rounded font-bold">
                                    ⚡ Rest-Pause
                                  </Badge>
                                );
                              }
                              return null;
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto shrink-0">
                      <Button
                        onClick={() => handlePrintWorkout(selectedWorkout)}
                        variant="outline"
                        className="w-full sm:w-auto h-12 rounded-xl font-bold text-sm border-border/60 hover:bg-secondary/40 gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
                      >
                        <Printer className="size-4.5" /> Exportar PDF
                      </Button>

                      {selectedWorkout.isActive && (
                        isCompletedToday ? (
                          <Button
                            disabled
                            className="w-full sm:w-auto h-12 rounded-xl font-bold text-sm bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 gap-2 shrink-0 opacity-100 cursor-not-allowed"
                          >
                            <CheckCircle2 className="size-4.5 text-emerald-500" /> TREINO CONCLUÍDO HOJE
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleStartWorkout(selectedWorkout)}
                            className="w-full sm:w-auto h-12 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10 gap-2 transition-all cursor-pointer active:scale-95 shrink-0"
                          >
                            <Play className="size-4.5 fill-current" /> INICIAR PLANILHA
                          </Button>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Exercises Flow */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Exercícios do Dia</h3>
                  <div className="space-y-4">
                    {(() => {
                      const displayItems = getDisplayItems(selectedWorkout.exercises || [], selectedWorkout.exerciseGroups || []);
                      const groupLetters: Record<string, string> = {};
                      let currentLetterCode = 65;
                      selectedWorkout.exercises?.forEach((we: any) => {
                        if (we.groupId && !groupLetters[we.groupId]) {
                          groupLetters[we.groupId] = String.fromCharCode(currentLetterCode++);
                        }
                      });

                      return displayItems.map((item: any, idx: number) => {
                        if (item.type === "individual") {
                          const we = item.exercise;
                          const repsArr = String(we.reps || "").split(",").map(s => s.trim());
                          const loadArr = String(we.load || "").split(",").map(s => s.trim());
                          const restArr = String(we.rest || "").split(",").map(s => s.trim());
                          const isIndividual = repsArr.length > 1 || loadArr.length > 1 || restArr.length > 1;

                          return (
                            <Card key={we.id} className="border-border/50 p-0 bg-card hover:border-primary/25 transition-all shadow-sm">
                              <CardContent className="p-4 md:p-6 flex flex-col gap-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
                                  <div className="flex flex-col items-start gap-1 min-w-0 flex-1">
                                    <div className="flex items-start gap-2">
                                      <div
                                        className="cursor-pointer shrink-0"
                                        onClick={() => {
                                          setPreviewExercise(we.exercise);
                                          setIsPreviewModalOpen(true);
                                        }}
                                      >
                                        <ExerciseThumbnail videoUrl={we.exercise.videoUrl} className="size-11 rounded-xl" />
                                      </div>
                                      <div className="space-y-1.5 min-w-0 flex-1">
                                        <h4
                                          className="font-bold text-base text-foreground leading-tight cursor-pointer hover:text-primary transition-colors truncate"
                                          onClick={() => {
                                            setPreviewExercise(we.exercise);
                                            setIsPreviewModalOpen(true);
                                          }}
                                        >
                                          {we.exercise.name}
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                          <span className="font-semibold text-foreground bg-secondary/50 px-2 py-0.5 rounded-md border border-border/40">
                                            {we.sets} séries
                                          </span>
                                          <span>{repsArr[0] || "10"} reps</span>
                                          {loadArr[0]?.toLowerCase().includes("p.c") ? (
                                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 font-bold rounded">
                                              Peso do Corpo (p.c.)
                                            </Badge>
                                          ) : (
                                            <span>Carga: {loadArr[0] || "Auto"}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <span>Descanso: {restArr[0] || "60s"}</span>

                                    {we.methodType === "DROPSET" && (
                                      <div className="flex flex-col gap-2.5 mt-3 p-3.5 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                          <div className="flex items-center gap-2">
                                            <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                              Dropset
                                            </Badge>
                                          </div>
                                          <a
                                            href={getYouTubeSearchUrl("DROPSET", we.exercise.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1 rounded-lg font-bold border border-amber-500/20 transition-colors"
                                          >
                                            Como Executar (YouTube) ↗
                                          </a>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                                          <strong>Como fazer:</strong> Faça a série até a falha com a carga padrão. Imediatamente, sem descansar, reduza a carga em {(we.methodConfig as any)?.reduction || 20}% e faça o máximo de repetições possíveis. Repita o processo {(we.methodConfig as any)?.drops || 2} vezes.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                          {Array.from({ length: (we.methodConfig as any)?.drops || 2 }).map((_, dropIdx) => (
                                            <div key={dropIdx} className="flex items-center gap-1 bg-amber-500/5 border border-amber-500/10 rounded-lg p-1 px-2 text-[10px] text-amber-400 font-medium">
                                              <span>Drop {dropIdx + 1}: -{(we.methodConfig as any)?.reduction || 20}%</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {we.methodType === "REST_PAUSE" && (
                                      <div className="flex flex-col gap-2.5 mt-3 p-3.5 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                                        <div className="flex flex-wrap justify-between items-center gap-2">
                                          <div className="flex items-center gap-2">
                                            <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                              Rest-Pause
                                            </Badge>
                                          </div>
                                          <a
                                            href={getYouTubeSearchUrl("REST_PAUSE", we.exercise.name)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[11px] text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg font-bold border border-purple-500/20 transition-colors"
                                          >
                                            Como Executar (YouTube) ↗
                                          </a>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                                          <strong>Como fazer:</strong> Faça a série até a falha. Solte o peso e descanse por apenas {(we.methodConfig as any)?.pause || 15} segundos. Faça outra série até a falha. Repita o intervalo {(we.methodConfig as any)?.rounds || 2} vezes na mesma série.
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                          {Array.from({ length: (we.methodConfig as any)?.rounds || 2 }).map((_, roundIdx) => (
                                            <div key={roundIdx} className="flex items-center gap-1.5 text-[10px] text-purple-400">
                                              <span className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-1 px-2 font-medium">Pausa {roundIdx + 1}: {(we.methodConfig as any)?.pause || "15s"}</span>
                                              {roundIdx < ((we.methodConfig as any)?.rounds || 2) - 1 && <span className="text-muted-foreground">→</span>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {we.methodType !== "DROPSET" && we.methodType !== "REST_PAUSE" && (we.exercise.instructions || we.notes) && (
                                      <p className="text-xs text-muted-foreground/80 leading-relaxed font-medium bg-secondary/15 p-3 rounded-xl border border-border/30 mt-2.5 max-w-125">
                                        <Info className="size-3.5 inline mr-1 text-primary align-text-bottom shrink-0" />
                                        {we.notes || we.exercise.instructions}
                                      </p>
                                    )}
                                  </div>

                                  {we.exercise.videoUrl && (
                                    <Button
                                      onClick={() => {
                                        setPreviewExercise(we.exercise);
                                        setIsPreviewModalOpen(true);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="rounded-xl border-border/60 font-bold h-9 gap-1.5 text-xs w-full sm:w-auto justify-center cursor-pointer hover:bg-secondary/40"
                                    >
                                      <PlayCircle className="size-4 text-primary" /> Ver Execução
                                    </Button>
                                  )}
                                </div>

                                {isIndividual && (
                                  <div className="w-full">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-secondary/20 rounded-lg gap-1.5 px-2.5 -ml-2.5"
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
                                      <div className="mt-3 flex flex-col! gap-2.5 p-3 rounded-xl bg-secondary/15 border border-border/40">
                                        {Array.from({ length: we.sets }).map((_, si) => (
                                          <div key={si} className="flex items-center justify-between gap-4 p-2 rounded-lg bg-card border border-border/20 text-xs">
                                            <span className="font-bold text-muted-foreground">#{si + 1}</span>
                                            <div className="flex items-center gap-3">
                                              <div>
                                                <span className="text-[10px] text-muted-foreground block leading-none font-bold uppercase">Reps</span>
                                                <span className="font-bold text-foreground">{repsArr[si] || repsArr[0] || "10"}</span>
                                              </div>
                                              <div className="w-px h-5 bg-border/40" />
                                              <div>
                                                <span className="text-[10px] text-muted-foreground block leading-none font-bold uppercase">Carga</span>
                                                <span className="font-bold text-foreground">
                                                  {(loadArr[si] || loadArr[0])?.toLowerCase().includes("p.c") ? "Peso do Corpo (p.c.)" : (loadArr[si] || loadArr[0] || "Auto")}
                                                </span>
                                              </div>
                                              <div className="w-px h-5 bg-border/40" />
                                              <div>
                                                <span className="text-[10px] text-muted-foreground block leading-none font-bold uppercase">Desc.</span>
                                                <span className="font-bold text-foreground">{restArr[si] || restArr[0] || "60s"}</span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        } else {
                          // group
                          const group = item.group;
                          const exercises = item.exercises || [];
                          const isCircuit = group.type === "CIRCUIT";
                          const groupLetter = groupLetters[exercises[0].groupId];

                          return (
                            <Card key={group.id} className="border-primary/20 bg-card/65 shadow-md relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
                              <CardHeader className="p-4 md:p-6 pb-2">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-primary text-primary-foreground font-black px-2 py-0.5 text-xs rounded-md uppercase">
                                      {group.type === "BISET" ? "Biset" : group.type === "TRISET" ? "Triset" : "Circuito"} {groupLetter}
                                    </Badge>
                                    <a
                                      href={getYouTubeSearchUrl(group.type, exercises.map((e: any) => e.exercise.name).join(" + "))}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-lg font-bold border border-primary/20 transition-colors shrink-0"
                                    >
                                      Como Executar (YouTube) ↗
                                    </a>
                                  </div>
                                </div>
                                <div className="mt-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                  <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                    {group.type === "BISET" && (
                                      <>
                                        <strong>Como fazer (Biset):</strong> Faça uma série do primeiro exercício e, imediatamente após, sem descansar, faça uma série do segundo. Descanse somente após finalizar o segundo exercício.
                                      </>
                                    )}
                                    {group.type === "TRISET" && (
                                      <>
                                        <strong>Como fazer (Triset):</strong> Faça uma série do primeiro, do segundo e do terceiro exercício consecutivamente sem descansar. Descanse somente após finalizar o terceiro exercício.
                                      </>
                                    )}
                                    {group.type === "CIRCUIT" && (
                                      <>
                                        <strong>Como fazer (Circuito):</strong> Faça uma série de cada exercício do grupo em sequência, um após o outro, sem descansar. Descanse por {group.config?.restBetweenRounds || 60}s apenas ao final de cada volta.
                                      </>
                                    )}
                                  </p>
                                </div>
                              </CardHeader>
                              <CardContent className="p-4 md:p-6 pt-0 space-y-4">
                                {exercises.map((we: any, subIdx: number) => {
                                  const repsArr = String(we.reps || "").split(",").map(s => s.trim());
                                  const loadArr = String(we.load || "").split(",").map(s => s.trim());
                                  const restArr = String(we.rest || "").split(",").map(s => s.trim());

                                  return (
                                    <div key={we.id} className="flex items-start gap-4 p-3 rounded-xl bg-secondary/10 border border-border/20">
                                      <div className="size-7 rounded-lg bg-secondary flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                        {groupLetter}{subIdx + 1}
                                      </div>
                                      <div className="space-y-1 min-w-0 flex-1">
                                        <div className="flex justify-between items-start gap-2">
                                          <h4 className="font-bold text-sm text-foreground truncate">{we.exercise.name}</h4>
                                          {we.exercise.videoUrl && (
                                            <button
                                              onClick={() => {
                                                setPreviewExercise(we.exercise);
                                                setIsPreviewModalOpen(true);
                                              }}
                                              className="text-[10px] text-primary font-bold hover:underline shrink-0"
                                            >
                                              Vídeo
                                            </button>
                                          )}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                          <span>{we.sets} séries</span>
                                          <span>•</span>
                                          <span>{repsArr[0] || "10"} reps</span>
                                          <span>•</span>
                                          {loadArr[0]?.toLowerCase().includes("p.c") ? (
                                            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] px-1.5 py-0.5 font-bold rounded">
                                              Peso do Corpo (p.c.)
                                            </Badge>
                                          ) : (
                                            <span>Carga: {loadArr[0] || "Auto"}</span>
                                          )}
                                          {!isCircuit && (
                                            <>
                                              <span>•</span>
                                              <span>Desc: {restArr[0] || "60s"}</span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </CardContent>
                            </Card>
                          );
                        }
                      });
                    })()}
                  </div>
                </section>
              </div>

              {/* Right Column: Consolidation and info */}
              <div className="space-y-6">

                {/* Consolidado Info Card */}
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo do Treino</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2.5">
                      <span className="text-muted-foreground font-medium">Duração Estimada</span>
                      <span className="font-bold text-foreground">{selectedWorkout.duration}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-b border-border/30 pb-2.5">
                      <span className="text-muted-foreground font-medium">Quantidade de Séries</span>
                      <span className="font-bold text-foreground">
                        {selectedWorkout.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0)} séries
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-1">
                      <span className="text-muted-foreground font-medium">Descanso entre Execs</span>
                      <span className="font-bold text-foreground">{selectedWorkout.restBetweenExercises || "2 min"}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Personal Message Advice block */}
                <Card className="border-border/50 bg-primary/5 border-dashed shadow-sm">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                      <Lightbulb className="size-4 animate-pulse" />
                      Orientação do Treinador
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                      Execute os exercícios focando em manter a máxima cadência na fase excêntrica (descida). O descanso entre as séries é fundamental para a recuperação dos substratos energéticos. Bom treino!
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <Card className="border-dashed border-2 border-border/60 bg-transparent flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
              <div className="size-12 rounded-full bg-secondary flex items-center justify-center mb-4">
                <Calendar className="size-6 text-muted-foreground" />
              </div>
              <h3 className="font-bold text-base mb-1">Dia de Descanso ou Sem Treino</h3>
              <p className="text-xs text-muted-foreground max-w-[280px] leading-relaxed">
                Nenhum treino planejado para {daysOfWeekLabels[selectedDay]}. Aproveite o dia para recuperar a musculatura ou realize uma atividade aeróbica regenerativa!
              </p>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
      />

      {/* Leave Workout Confirmation Dialog (confirmationmodals.md compliance) */}
      <AlertDialog open={isExitConfirmOpen} onOpenChange={setIsExitConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md bg-background border border-border text-foreground rounded-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">Cancelar Treino?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              O progresso atual será perdido. Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex sm:justify-end gap-2">
            <AlertDialogCancel className="h-10 px-4 cursor-pointer rounded-xl transition-all border-border hover:bg-secondary/40 font-semibold">
              Continuar Treinando
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setIsExitConfirmOpen(false);
                workoutActions.cancelWorkout();
              }}
              className="h-10 px-4 cursor-pointer rounded-xl transition-all font-bold"
            >
              Cancelar Treino
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* WORKOUT EXECUTION SHEET OVERLAY (TOUCH Gym workspace) */}
      {activeExecutionWorkout && !workoutSnap.isMinimized && (
        <div className="fixed inset-0 bg-background z-50 overflow-y-auto flex flex-col">
          {/* Header Area */}
          <header className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/40 p-4 flex items-center justify-between z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Dumbbell className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-black truncate">{activeExecutionWorkout.name}</h2>
                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Clock className="size-3 text-primary animate-pulse" /> {formatTimer(totalTimer)} exercitando
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Minimize workout to floating tracker */}
              <Button
                onClick={() => workoutActions.minimize()}
                variant="outline"
                size="icon"
                className="size-10 rounded-xl cursor-pointer border-border/60 hover:bg-secondary/40"
                title="Minimizar Treino"
              >
                <Minimize2 className="size-4" />
              </Button>

              <Button
                onClick={() => setIsExitConfirmOpen(true)}
                variant="destructive"
                size="icon"
                className="size-10 rounded-xl cursor-pointer"
              >
                <X className="size-5" />
              </Button>
            </div>
          </header>

          {/* Active Workout exercise block */}
          {executionSteps[currentStepIdx] ? (
            (() => {
              const currentStep = executionSteps[currentStepIdx];
              const isGroup = currentStep.type === "group";

              return (
                <main className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6 pb-36 animate-in fade-in duration-300">
                  {/* Progress Indicator */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>Progresso do Treino</span>
                      <span>
                        {Math.round(((currentStepIdx + 1) / executionSteps.length) * 100)}%
                      </span>
                    </div>
                    <Progress
                      value={((currentStepIdx + 1) / executionSteps.length) * 100}
                      className="h-1.5 rounded-full"
                    />
                  </div>

                  {!isGroup ? (
                    (() => {
                      const execEx = currentStep.exercise;
                      const isBodyweight = String(execEx.load || "").toLowerCase().includes("p.c");
                      return (
                        <>
                          <Card className="border-border/50 overflow-hidden shadow-sm p-0">
                            <CardContent className="p-5 space-y-4">
                              <div className="flex justify-between items-start gap-4">
                                <div>
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                    Exercício {currentStepIdx + 1} de {executionSteps.length}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <h3 className="text-lg font-bold text-foreground leading-tight">{execEx.exercise.name}</h3>
                                    {isBodyweight && (
                                      <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] px-2 py-0.5 font-bold rounded">
                                        Peso do Corpo
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                {execEx.exercise.videoUrl && (
                                  <Button
                                    onClick={() => {
                                      setPreviewExercise(execEx.exercise);
                                      setIsPreviewModalOpen(true);
                                    }}
                                    variant="outline"
                                    size="icon"
                                    className="size-9 rounded-lg border-border/60 shrink-0 cursor-pointer"
                                  >
                                    <Play className="size-4 text-primary fill-current" />
                                  </Button>
                                )}
                              </div>

                              {execEx.methodType === "DROPSET" && (
                                <div className="flex flex-col gap-2 p-3.5 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Método Dropset Ativo</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 font-medium">
                                    <strong>Como fazer:</strong> Faça a série com a carga planejada até a falha. Sem descansar, reduza a carga em {(execEx.methodConfig as any)?.reduction || 20}% e faça o máximo de repetições possíveis. Repita o processo {(execEx.methodConfig as any)?.drops || 2} vezes.
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                      {execEx.sets}x {String(execEx.reps || "").split(",")[0] || "10"}
                                    </Badge>
                                    {Array.from({ length: (execEx.methodConfig as any)?.drops || 2 }).map((_, dropIdx) => (
                                      <div key={dropIdx} className="flex items-center gap-1 bg-amber-500/5 border border-amber-500/10 rounded-lg p-1 px-2 text-[10px] text-amber-400 font-medium">
                                        <span>Drop {dropIdx + 1}: -{(execEx.methodConfig as any)?.reduction || 20}%</span>
                                      </div>
                                    ))}
                                  </div>
                                  <a
                                    href={getYouTubeSearchUrl("DROPSET", execEx.exercise.name)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center py-3 gap-1 text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-2.5 rounded-lg font-bold transition-all border border-amber-500/20"
                                  >
                                    Como Executar (YouTube) ↗
                                  </a>
                                </div>
                              )}

                              {execEx.methodType === "REST_PAUSE" && (
                                <div className="flex flex-col gap-2.5 p-3.5 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider">Método Rest-Pause Ativo</span>
                                    <a
                                      href={getYouTubeSearchUrl("REST_PAUSE", execEx.exercise.name)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg font-bold transition-all border border-purple-500/20"
                                    >
                                      Como Executar (YouTube) ↗
                                    </a>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 font-medium">
                                    <strong>Como fazer:</strong> Faça a série até a falha com a carga planejada. Solte o peso e descanse por apenas {(execEx.methodConfig as any)?.pause || 15} segundos. Faça outra série até a falha. Repita o intervalo curto por {(execEx.methodConfig as any)?.rounds || 2} vezes dentro da mesma série.
                                  </p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] px-2 py-0.5 rounded-md font-bold">
                                      {execEx.sets}x {String(execEx.reps || "").split(",")[0] || "10"}
                                    </Badge>
                                    {Array.from({ length: (execEx.methodConfig as any)?.rounds || 2 }).map((_, roundIdx) => (
                                      <div key={roundIdx} className="flex items-center gap-1.5 text-[10px] text-purple-400">
                                        <span className="bg-purple-500/5 border border-purple-500/10 rounded-lg p-1 px-2 font-medium">Pausa {roundIdx + 1}: {(execEx.methodConfig as any)?.pause || "15s"}</span>
                                        {roundIdx < ((execEx.methodConfig as any)?.rounds || 2) - 1 && <span className="text-muted-foreground">→</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {execEx.methodType !== "DROPSET" && execEx.methodType !== "REST_PAUSE" && execEx.notes && (
                                <p className="text-xs text-muted-foreground/90 font-semibold p-3 bg-secondary/25 border border-border/30 rounded-xl">
                                  <Lightbulb className="size-3.5 inline mr-1 text-primary align-text-bottom" />
                                  {execEx.notes}
                                </p>
                              )}
                            </CardContent>
                          </Card>

                          {/* Log sets container */}
                          <div className="space-y-4">
                            <div className="grid grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              <div className="text-center">Série</div>
                              <div className="text-center">Carga (KG)</div>
                              <div className="text-center">Reps</div>
                              <div className="text-center">Status</div>
                            </div>

                            <div className="space-y-2.5">
                              {new Array(execEx.sets).fill(0).map((_, setIdx) => (
                                <div
                                  key={setIdx}
                                  className={cn(
                                    "grid grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 items-center p-3 rounded-xl border transition-all shadow-sm",
                                    (allWorkoutSetsDone[execEx.id]?.[setIdx])
                                      ? "bg-primary/5 border-primary/30"
                                      : "bg-card border-border/40"
                                  )}
                                >
                                  {/* Set number */}
                                  <div className={cn(
                                    "flex items-center justify-center size-9 rounded-lg font-black text-xs",
                                    (allWorkoutSetsDone[execEx.id]?.[setIdx]) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                  )}>
                                    {setIdx + 1}
                                  </div>

                                  {/* Load Input */}
                                  {isBodyweight ? (
                                    <div className="h-10 flex items-center justify-center font-extrabold text-primary text-xs bg-primary/5 rounded-lg border border-primary/20 select-none">
                                      Peso do Corpo (p.c.)
                                    </div>
                                  ) : (
                                    <Input
                                      type="tel"
                                      value={allWorkoutLoads[execEx.id]?.[setIdx] || ""}
                                      onChange={(e) => {
                                        const nextLoads = JSON.parse(JSON.stringify(workoutStore.allWorkoutLoads));
                                        if (!nextLoads[execEx.id]) {
                                          nextLoads[execEx.id] = new Array(execEx.sets).fill("");
                                        }
                                        nextLoads[execEx.id][setIdx] = e.target.value;
                                        workoutActions.updateLoads(nextLoads);
                                      }}
                                      placeholder="ex: 60"
                                      className="h-9 text-center font-bold bg-muted/40 dark:bg-neutral-900/40 border border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg text-sm"
                                    />
                                  )}

                                  {/* Reps Input */}
                                  <Input
                                    type="tel"
                                    value={allWorkoutReps[execEx.id]?.[setIdx] || ""}
                                    onChange={(e) => {
                                      const nextReps = JSON.parse(JSON.stringify(workoutStore.allWorkoutReps));
                                      if (!nextReps[execEx.id]) {
                                        nextReps[execEx.id] = new Array(execEx.sets).fill("");
                                      }
                                      nextReps[execEx.id][setIdx] = e.target.value;
                                      workoutActions.updateReps(nextReps);
                                    }}
                                    placeholder="ex: 10"
                                    className="h-9 text-center font-bold bg-muted/40 dark:bg-neutral-900/40 border border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg text-sm"
                                  />

                                  {/* Complete Check button */}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleToggleSet(setIdx, execEx)}
                                    className={cn(
                                      "size-10 rounded-lg transition-all cursor-pointer relative overflow-visible after:absolute after:inset-[-8px] after:content-['']",
                                      (allWorkoutSetsDone[execEx.id]?.[setIdx])
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-secondary/60 text-muted-foreground hover:bg-primary/10"
                                    )}
                                  >
                                    {(allWorkoutSetsDone[execEx.id]?.[setIdx]) ? (
                                      <Check className="size-5" />
                                    ) : (
                                      <div className="size-4.5 rounded-full border-2 border-muted-foreground/30" />
                                    )}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    // group (Biset, Triset, Circuit)
                    (() => {
                      const group = currentStep.group;
                      const exercises = currentStep.exercises || [];
                      const isCircuit = group.type === "CIRCUIT";
                      const setsCount = exercises[0]?.sets || 3;

                      const groupLetters: Record<string, string> = {};
                      let currentLetterCode = 65;
                      activeExecutionWorkout.exercises.forEach((we: any) => {
                        if (we.groupId && !groupLetters[we.groupId]) {
                          groupLetters[we.groupId] = String.fromCharCode(currentLetterCode++);
                        }
                      });
                      const groupLetter = groupLetters[exercises[0].groupId];

                      return (
                        <>
                          <Card className="border-primary/20 bg-card/65 shadow-md relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
                            <CardHeader className="p-4 md:p-6 pb-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-primary text-primary-foreground font-black px-2 py-0.5 text-xs rounded-md uppercase">
                                    {group.type === "BISET" ? "Biset" : group.type === "TRISET" ? "Triset" : "Circuito"} {groupLetter}
                                  </Badge>
                                  <a
                                    href={getYouTubeSearchUrl(group.type, exercises.map((e: any) => e.exercise.name).join(" + "))}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 px-2.5 py-1 rounded-lg font-bold border border-primary/20 transition-colors shrink-0"
                                  >
                                    Como Executar (YouTube) ↗
                                  </a>
                                </div>

                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                                  Grupo {currentStepIdx + 1} de {executionSteps.length}
                                </span>
                              </div>
                              <div className="mt-2.5 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                <p className="text-[11px] text-muted-foreground leading-relaxed font-medium">
                                  {group.type === "BISET" && (
                                    <>
                                      <strong>Como fazer (Biset):</strong> Faça uma série do primeiro exercício e, imediatamente após, sem descansar, faça uma série do segundo. Descanse somente após finalizar o segundo exercício.
                                    </>
                                  )}
                                  {group.type === "TRISET" && (
                                    <>
                                      <strong>Como fazer (Triset):</strong> Faça uma série do primeiro, do segundo e do terceiro exercício consecutivamente sem descansar. Descanse somente após finalizar o terceiro exercício.
                                    </>
                                  )}
                                  {group.type === "CIRCUIT" && (
                                    <>
                                      <strong>Como fazer (Circuito):</strong> Faça uma série de cada exercício do grupo em sequência, um após o outro, sem descansar. Descanse por {group.config?.restBetweenRounds || 60}s apenas ao final de cada volta completa.
                                    </>
                                  )}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground font-medium mt-1">
                                {isCircuit ? (
                                  `Execução round-por-round: Complete uma volta inteira, depois inicie o descanso de ${group.config?.restBetweenRounds || 60}s.`
                                ) : (
                                  "Sem descanso entre exercícios. Complete a série de todos antes de descansar."
                                )}
                              </p>
                            </CardHeader>
                            <CardContent className="p-4 md:p-6 pt-0 space-y-2.5">
                              {exercises.map((ex: any, subIdx: number) => (
                                <div key={ex.id} className="flex justify-between items-center p-2 rounded-xl bg-secondary/15 border border-border/30 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="size-6 rounded bg-secondary flex items-center justify-center font-bold text-[10px] text-primary shrink-0">
                                      {groupLetter}{subIdx + 1}
                                    </div>
                                    <span className="font-bold truncate text-foreground">{ex.exercise.name}</span>
                                  </div>
                                  {ex.exercise.videoUrl && (
                                    <Button
                                      onClick={() => {
                                        setPreviewExercise(ex.exercise);
                                        setIsPreviewModalOpen(true);
                                      }}
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-[10px] font-bold text-primary hover:bg-secondary shrink-0"
                                    >
                                      Vídeo
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </CardContent>
                          </Card>

                          {/* Log sets container (set-by-set or round-by-round) */}
                          <div className="space-y-4">
                            <div className="space-y-3.5">
                              {Array.from({ length: setsCount }).map((_, setIdx) => {
                                const isSetDone = allWorkoutSetsDone[exercises[0].id]?.[setIdx];
                                return (
                                  <div
                                    key={setIdx}
                                    className={cn(
                                      "flex flex-col p-4 rounded-xl border transition-all shadow-sm space-y-3.5",
                                      isSetDone ? "bg-primary/5 border-primary/30" : "bg-card border-border/40"
                                    )}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div className={cn(
                                        "flex items-center justify-center h-7 px-3 rounded-lg font-black text-xs",
                                        isSetDone ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                                      )}>
                                        {isCircuit ? `Volta ${setIdx + 1}` : `Série ${setIdx + 1}`}
                                      </div>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleToggleGroupSet(setIdx, currentStep)}
                                        className={cn(
                                          "size-10 rounded-lg transition-all cursor-pointer relative overflow-visible after:absolute after:inset-[-8px] after:content-['']",
                                          isSetDone
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-secondary/60 text-muted-foreground hover:bg-primary/10"
                                        )}
                                      >
                                        {isSetDone ? (
                                          <Check className="size-5" />
                                        ) : (
                                          <div className="size-4.5 rounded-full border-2 border-muted-foreground/30" />
                                        )}
                                      </Button>
                                    </div>

                                    <div className="space-y-3 pt-1 border-t border-border/20">
                                      {exercises.map((ex: any) => {
                                        const isExBodyweight = String(ex.load || "").toLowerCase().includes("p.c");
                                        return (
                                          <div key={ex.id} className="grid grid-cols-[1fr_85px_85px] gap-2 items-center text-xs">
                                            <div className="flex flex-col min-w-0">
                                              <span className="font-bold truncate text-muted-foreground">{ex.exercise.name}</span>
                                              {isExBodyweight && (
                                                <span className="text-[10px] text-primary font-bold">Peso do Corpo</span>
                                              )}
                                            </div>

                                            {/* Load Input */}
                                            <div className="flex flex-col items-center w-full">
                                              <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Carga (KG)</span>
                                              {isExBodyweight ? (
                                                <div className="h-8 flex items-center justify-center font-extrabold text-primary text-[10px] bg-primary/5 rounded border border-primary/20 px-1.5 w-full select-none mt-1">
                                                  p.c.
                                                </div>
                                              ) : (
                                                <Input
                                                  type="tel"
                                                  value={allWorkoutLoads[ex.id]?.[setIdx] || ""}
                                                  onChange={(e) => {
                                                    const nextLoads = JSON.parse(JSON.stringify(workoutStore.allWorkoutLoads));
                                                    if (!nextLoads[ex.id]) {
                                                      nextLoads[ex.id] = new Array(ex.sets).fill("");
                                                    }
                                                    nextLoads[ex.id][setIdx] = e.target.value;
                                                    workoutActions.updateLoads(nextLoads);
                                                  }}
                                                  placeholder="ex: 60"
                                                  className="h-8 text-center font-bold bg-muted/40 dark:bg-neutral-900/40 border border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg text-xs w-full mt-1"
                                                />
                                              )}
                                            </div>

                                            {/* Reps Input */}
                                            <div className="flex flex-col items-center">
                                              <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Reps</span>
                                              <Input
                                                type="tel"
                                                value={allWorkoutReps[ex.id]?.[setIdx] || ""}
                                                onChange={(e) => {
                                                  const nextReps = JSON.parse(JSON.stringify(workoutStore.allWorkoutReps));
                                                  if (!nextReps[ex.id]) {
                                                    nextReps[ex.id] = new Array(ex.sets).fill("");
                                                  }
                                                  nextReps[ex.id][setIdx] = e.target.value;
                                                  workoutActions.updateReps(nextReps);
                                                }}
                                                placeholder="ex: 10"
                                                className="h-8 text-center font-bold bg-muted/40 dark:bg-neutral-900/40 border border-border/80 focus-visible:ring-1 focus-visible:ring-primary/40 rounded-lg text-xs w-full mt-1"
                                              />
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </>
                      );
                    })()
                  )}
                </main>
              );
            })()
          ) : null}

          {/* Floating Action footer navigation */}
          <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-xl border-t border-border/40 z-40">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-4">

              {/* Navigation Back / Next */}
              <div className="flex gap-2">
                <Button
                  onClick={handlePrevExercise}
                  disabled={currentStepIdx === 0}
                  variant="outline"
                  size="icon"
                  className="size-12 rounded-xl border-border/60 shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="size-5" />
                </Button>

                {activeExecutionWorkout && currentStepIdx < executionSteps.length - 1 ? (
                  <Button
                    onClick={handleNextExercise}
                    disabled={!allSetsCompleted}
                    className="h-12 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 px-6 gap-1 cursor-pointer active:scale-95 shadow-md shadow-primary/10"
                  >
                    Próximo <ChevronRight className="size-4.5" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextExercise}
                    disabled={!allSetsCompleted}
                    className="h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-6 gap-1 cursor-pointer active:scale-95 shadow-md shadow-emerald-500/10"
                  >
                    Finalizar Treino <CheckCircle2 className="size-4.5" />
                  </Button>
                )}
              </div>

              {/* Rest Timer Mini Indicator — opens Drawer */}
              {restTimer > 0 && (
                <button
                  onClick={() => workoutActions.setIsRestDrawerOpen(true)}
                  className="flex items-center gap-2 bg-primary/10 border border-primary/25 px-3 py-2 rounded-xl text-xs font-bold text-primary select-none shrink-0 hover:bg-primary/15 transition-all active:scale-95 cursor-pointer"
                >
                  <Timer className={cn("size-4", isRestTimerActive && "animate-pulse")} />
                  <span className="font-mono tabular-nums">{formatTimer(restTimer)}</span>
                </button>
              )}

            </div>
          </footer>
        </div>
      )}

      {/* Effort Evaluation Dialog popup */}
      <Dialog open={isEvaluating} onOpenChange={(open) => !open && setIsEvaluating(false)}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl p-6 overflow-hidden">
          <DialogHeader className="space-y-2 text-center flex flex-col items-center">
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
              <Trophy className="size-6 animate-pulse" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight">
              Treino Concluído! Mandou bem! 🔥
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-[340px]">
              Avalie como foi o esforço físico do treino de hoje para mantermos seu plano preciso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 my-4">
            {/* Sliding Effort Score Indicator */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex justify-between px-1">
                <span>Percepção de Esforço</span>
                <span className="text-primary font-black">
                  {effortScore === 1 ? "1 - Muito Fácil 😴" :
                    effortScore === 2 ? "2 - Fácil 😊" :
                      effortScore === 3 ? "3 - Adequado 👍" :
                        effortScore === 4 ? "4 - Difícil ⚡" :
                          "5 - Muito Difícil 🥵"}
                </span>
              </label>

              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    onClick={() => setEffortScore(val)}
                    className={cn(
                      "h-11 rounded-xl font-bold text-sm border flex flex-col items-center justify-center cursor-pointer transition-all",
                      effortScore === val
                        ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/15"
                        : "border-border bg-secondary/20 text-muted-foreground hover:bg-secondary/40"
                    )}
                  >
                    <span>{val}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional feedback comments notes */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">
                Feedback para o Personal (Opcional)
              </label>
              <textarea
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                placeholder="ex: fadiguei no supino reto, ou senti desconforto no joelho..."
                className="w-full h-20 rounded-xl bg-secondary/30 border border-border/50 p-3 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary font-medium"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              onClick={handleSaveWorkoutLog}
              disabled={isSubmittingLog}
              className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 gap-2 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95"
            >
              {isSubmittingLog ? (
                <>Salvando dados...</>
              ) : (
                <>Gravar no Histórico e Finalizar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Congratulations / Trophy Modal Popup */}
      <Dialog open={showConGrats} onOpenChange={setShowConGrats}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl border-border/50 bg-background/95 backdrop-blur-xl p-6 text-center space-y-4">
          <div className="flex flex-col items-center space-y-3">
            <div className="size-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-2">
              <Trophy className="size-8 animate-pulse" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-foreground">
              Treino Salvo com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-[280px]">
              Seus dados de esforço e constância foram sincronizados no banco do treinador. Continue mantendo o foco!
            </DialogDescription>
          </div>

          <div className="bg-secondary/30 p-4 rounded-2xl border border-border/40 flex justify-around text-center mt-2">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Frequência</p>
              <p className="text-lg font-black text-primary">Ativa</p>
            </div>
            <div className="w-px bg-border/40" />
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Streak</p>
              <p className="text-lg font-black text-primary">Atualizado</p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button onClick={() => setShowConGrats(false)} className="w-full h-11 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
              Voltar ao Painel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Mirroring the original layout completely (skelletonsloaders.md)
function StudentWorkoutsSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 w-full mx-auto animate-pulse">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 max-w-full bg-muted" />
          <Skeleton className="h-4 w-full max-w-md bg-muted" />
        </div>
        <Skeleton className="h-11 w-48 bg-muted rounded-xl" />
      </div>

      {/* Calendar strip skeleton */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            {[...Array(7)].map((_, i) => (
              <Skeleton key={i} className="h-16 flex-1 bg-muted rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Workout Panel Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50">
            <CardContent className="p-6 h-28 flex justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 bg-muted rounded-full" />
                <Skeleton className="h-7 w-56 bg-muted rounded" />
              </div>
              <Skeleton className="h-12 w-36 bg-muted rounded-xl" />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4 h-20 flex justify-between items-center">
                  <div className="flex gap-4">
                    <Skeleton className="size-9 bg-muted rounded-xl" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40 bg-muted" />
                      <Skeleton className="h-3.5 w-48 bg-muted" />
                    </div>
                  </div>
                  <Skeleton className="h-9 w-24 bg-muted rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/50">
            <CardContent className="p-5 h-44 bg-muted/25 rounded-2xl" />
          </Card>
        </div>
      </div>
    </div>
  );
}
