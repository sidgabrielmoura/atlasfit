"use client";

import { useEffect } from "react";
import { useSnapshot } from "valtio";
import { workoutStore, workoutActions } from "@/stores/workout.store";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Timer,
  Play,
  Pause,
  Plus,
  XCircle,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { workspaceStore } from "@/stores/workspace.store";

// Web Audio sound generator for professional gym bell alert
const playRestChimeSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    /**
     * Sports gym bell — modeled on real struck metal bell physics.
     * Real bells produce INHARMONIC partials (not integer multiples).
     * Ratios below are measured from actual steel bells.
     * Higher partials decay faster — this is what makes it sound like metal, not a sine.
     */
    const bellPartials: { ratio: number; gain: number; decay: number }[] = [
      { ratio: 1,     gain: 0.30, decay: 2.4 },  // fundamental — longest ring
      { ratio: 2.756, gain: 0.20, decay: 1.6 },  // 2nd partial
      { ratio: 5.404, gain: 0.12, decay: 0.9 },  // 3rd partial
      { ratio: 8.933, gain: 0.06, decay: 0.5 },  // 4th partial — dies fast
    ];

    const BASE_FREQ = 523.25; // C5 — clear, gym-bell pitch

    const strike = (startTime: number, volume: number) => {
      bellPartials.forEach(({ ratio, gain, decay }) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(BASE_FREQ * ratio, startTime);

        // 3ms linear attack (hard strike) → exponential ring-out
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(gain * volume, startTime + 0.003);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + decay);

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + decay + 0.05);
      });
    };

    // Two strikes: DING — ding (second softer, like resonance)
    strike(now, 1.0);
    strike(now + 0.45, 0.60);

  } catch (err) {
    console.error("Erro ao reproduzir alerta de descanso:", err);
  }
};

/** Extracts a hex color to individual RGB components for building multi-stop gradients */
function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function WorkoutMinimizedCard({
  workout,
  totalTimer,
  progressPercent,
  onMaximize,
}: {
  workout: { name: string };
  totalTimer: number;
  progressPercent: number;
  onMaximize: () => void;
}) {
  const wsSnap = useSnapshot(workspaceStore);
  const primaryHex = wsSnap.activeWorkspace?.primaryColor || "#3052EB";
  const rgb = hexToRgb(primaryHex) || { r: 48, g: 82, b: 235 };

  // Build dark metallic gradient using the brand color as accent
  const cardBg = `linear-gradient(135deg, #0d0d0f 0%, #111218 50%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.18) 100%)`;
  const borderColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;
  const shadowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;
  const glowColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`;
  const accentColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.85)`;
  const accentColorLight = `rgba(${Math.min(rgb.r + 60, 255)}, ${Math.min(rgb.g + 60, 255)}, ${Math.min(rgb.b + 60, 255)}, 0.7)`;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 100, opacity: 0, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-[22rem] z-40 select-none"
    >
      <div
        className="relative overflow-hidden rounded-2xl text-white cursor-pointer"
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          boxShadow: `0 20px 60px -10px ${shadowColor}, 0 4px 16px -4px rgba(0,0,0,0.6)`,
        }}
        onClick={onMaximize}
      >
        {/* Ambient glow top-right — brand color */}
        <div
          className="absolute -top-6 -right-6 size-28 rounded-full blur-2xl pointer-events-none"
          style={{ background: glowColor }}
        />
        {/* Ambient glow bottom-left — slightly lighter */}
        <div
          className="absolute -bottom-8 -left-8 size-24 rounded-full blur-2xl pointer-events-none"
          style={{ background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.12)` }}
        />

        {/* Sweep shine effect */}
        <div className="animate-apple-sweep pointer-events-none" />

        <div className="relative z-10 p-4 flex items-center justify-between gap-3">
          {/* Icon */}
          <div
            className="size-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
            style={{
              background: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`,
              border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`,
            }}
          >
            <Clock
              className="size-5 animate-pulse"
              style={{ color: accentColorLight }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span
                className="text-[9px] font-black uppercase tracking-[0.18em]"
                style={{ color: accentColorLight }}
              >
                Treino em andamento
              </span>
            </div>
            <h4 className="text-sm font-black text-white truncate leading-tight">
              {workout.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono font-bold text-white/70 tabular-nums">
                {formatTime(totalTimer)}
              </span>
              <span className="text-white/30 text-[10px]">•</span>
              <span className="text-[10px] font-bold text-white/60">
                {progressPercent}% concluído
              </span>
            </div>

            {/* Progress bar — brand color gradient */}
            <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPercent}%`,
                  background: `linear-gradient(to right, ${accentColor}, ${accentColorLight})`,
                }}
              />
            </div>
          </div>

          {/* Maximize button */}
          <button
            onClick={(e) => { e.stopPropagation(); onMaximize(); }}
            className="size-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center shrink-0 transition-all active:scale-90 cursor-pointer"
            title="Abrir Treino"
          >
            <Maximize2 className="size-4 text-white/80" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function WorkoutManager() {

  const snap = useSnapshot(workoutStore);
  const router = useRouter();
  const pathname = usePathname();

  // Interval ticking for total timer and rest timer
  useEffect(() => {
    const timer = setInterval(() => {
      // 1. Tick total timer
      if (workoutStore.isTotalTimerRunning && workoutStore.activeWorkout) {
        workoutActions.incrementTotalTimer();
      }

      // 2. Tick rest timer
      if (workoutStore.isRestTimerActive && workoutStore.restTimer > 0) {
        if (workoutStore.restTimer === 1) {
          // Play sound and complete timer at exactly 0 transition
          playRestChimeSound();
          toast.success("Tempo de descanso concluído! Prepare-se para a próxima série. 🔥");
          workoutActions.cancelRestTimer();
        } else {
          workoutActions.decrementRestTimer();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-maximize when navigating back to /student/workouts while minimized
  useEffect(() => {
    if (pathname === "/student/workouts" && workoutStore.activeWorkout && workoutStore.isMinimized) {
      workoutActions.maximize();
    }
  }, [pathname]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleMaximize = () => {
    workoutActions.maximize();
    if (pathname !== "/student/workouts") {
      router.push("/student/workouts");
    }
  };

  // Skip the rest timer drawer
  const handleSkipRest = () => {
    workoutActions.cancelRestTimer();
  };

  const totalSteps = snap.executionSteps.length;
  const completedSteps = snap.executionSteps.filter((step: any) => {
    if (step.type === "individual") {
      const exId = step.exercise.id;
      const doneArr = snap.allWorkoutSetsDone[exId];
      return doneArr ? doneArr.every((d: boolean) => d) : false;
    } else {
      return step.exercises.every((ex: any) => {
        const doneArr = snap.allWorkoutSetsDone[ex.id];
        return doneArr ? doneArr.every((d: boolean) => d) : false;
      });
    }
  }).length;

  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <>
      {/* 1. Rest Timer Drawer Overlay */}
      <Drawer
        open={snap.isRestDrawerOpen}
        onOpenChange={(open) => {
          workoutActions.setIsRestDrawerOpen(open);
          if (!open) {
            workoutActions.pauseRestTimer();
          }
        }}
      >
        <DrawerContent className="bg-background/95 backdrop-blur-xl border-t border-border/50 max-w-md mx-auto rounded-t-3xl">
          <div className="mx-auto w-12 h-1 bg-muted rounded-full my-3" />
          <DrawerHeader className="text-center space-y-1">
            <DrawerTitle className="text-base font-extrabold tracking-tight flex items-center justify-center gap-2">
              <Timer className={cn("size-5 text-primary", snap.isRestTimerActive && "animate-pulse")} />
              Intervalo de Descanso
            </DrawerTitle>
            <DrawerDescription className="text-xs text-muted-foreground">
              Descanse a musculatura antes da próxima série.
            </DrawerDescription>
          </DrawerHeader>

          {/* Huge Timer Screen */}
          <div className="py-8 flex flex-col items-center justify-center">
            <span className="text-7xl font-black tracking-tighter tabular-nums text-foreground drop-shadow-sm select-none">
              {formatTime(snap.restTimer)}
            </span>
            <Badge variant="secondary" className="mt-3 bg-secondary/85 text-[10px] font-bold uppercase tracking-wider">
              {snap.isRestTimerActive ? "Descansando" : "Pausado"}
            </Badge>
          </div>

          <DrawerFooter className="flex flex-col gap-2 p-6 pt-2">
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* Play / Pause toggle */}
              <Button
                variant={snap.isRestTimerActive ? "outline" : "default"}
                onClick={() => {
                  if (snap.isRestTimerActive) {
                    workoutActions.pauseRestTimer();
                  } else {
                    workoutActions.resumeRestTimer();
                  }
                }}
                className="h-11 rounded-xl text-xs font-bold gap-2 cursor-pointer transition-all active:scale-95"
              >
                {snap.isRestTimerActive ? (
                  <>
                    <Pause className="size-4" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" /> Retomar
                  </>
                )}
              </Button>

              {/* Add 10s */}
              <Button
                variant="outline"
                onClick={() => workoutActions.add10sToRestTimer()}
                className="h-11 rounded-xl text-xs font-bold gap-2 border-border/60 hover:bg-secondary/40 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="size-4" /> +10s
              </Button>
            </div>

            {/* Skip rest */}
            <Button
              variant="ghost"
              onClick={handleSkipRest}
              className="w-full h-11 rounded-xl text-xs font-bold text-muted-foreground hover:text-red-500 hover:bg-red-500/5 gap-2 cursor-pointer mt-1"
            >
              <XCircle className="size-4" /> Pular Descanso
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* 2. Minimized Floating Track Player */}
      <AnimatePresence>
        {snap.activeWorkout && snap.isMinimized && (
          <WorkoutMinimizedCard
            workout={snap.activeWorkout}
            totalTimer={snap.totalTimer}
            progressPercent={progressPercent}
            onMaximize={handleMaximize}
          />
        )}
      </AnimatePresence>
    </>
  );
}
