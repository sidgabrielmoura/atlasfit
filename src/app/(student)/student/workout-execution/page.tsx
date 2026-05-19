"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  X,
  Clock,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Info,
  Check,
  Timer,
  Maximize2,
  Dumbbell,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { studentWorkouts } from "@/lib/mock-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function WorkoutExecutionPage() {
  const workout = studentWorkouts[0];
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [setsDone, setSetsDone] = useState<boolean[]>(new Array(workout.exercises[0].sets).fill(false));
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [workoutProgress, setWorkoutProgress] = useState(35); // Mock progress

  const currentExercise = workout.exercises[currentExerciseIdx];

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full space-y-8 pb-32 animate-in fade-in duration-500">
      {/* Header de Foco */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-widest">
            <Activity className="size-3" /> Em Execução
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{workout.name}</h1>
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground bg-secondary/50 px-3 py-1 rounded-lg border border-border/40">
              <Clock className="size-3.5" /> {formatTime(timer)}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg border border-primary/20">
              <Dumbbell className="size-3.5" /> Exercício {currentExerciseIdx + 1}/{workout.exercisesCount}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" className="rounded-xl border-border/60 font-bold h-10 gap-2">
            <Maximize2 className="size-4" /> Tela Cheia
          </Button>
          <Button variant="destructive" size="icon" className="rounded-xl size-10" asChild>
            <Link href="/student/workouts"><X className="size-5" /></Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card shadow-sm overflow-hidden rounded-2xl">
            <div className="aspect-video bg-black relative group overflow-hidden">
              <iframe
                src={currentExercise.videoUrl}
                className="w-full h-full border-none"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold">{currentExercise.name}</h2>
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold uppercase tracking-widest text-[10px]">
                  {currentExercise.sets} Séries
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium flex items-start gap-2">
                <Info className="size-4 text-primary shrink-0 mt-0.5" /> {currentExercise.instructions}
              </p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="grid grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <div className="text-center">Série</div>
              <div className="text-center">Carga (KG)</div>
              <div className="text-center">Reps</div>
              <div className="text-center">Status</div>
            </div>

            <div className="space-y-2.5">
              {new Array(currentExercise.sets).fill(0).map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "grid grid-cols-[3.5rem_1fr_1fr_3.5rem] gap-2 items-center p-3 rounded-xl border transition-all shadow-sm",
                    setsDone[idx]
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border/40"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center size-9 rounded-lg font-bold text-xs",
                    setsDone[idx] ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                  )}>
                    {idx + 1}
                  </div>
                  <Input
                    defaultValue={parseInt(currentExercise.load)}
                    className="h-10 text-center font-bold bg-transparent border-none focus-visible:ring-0 text-base p-0"
                  />
                  <Input
                    defaultValue={currentExercise.reps}
                    className="h-10 text-center font-bold bg-transparent border-none focus-visible:ring-0 text-base p-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      const newSets = [...setsDone];
                      newSets[idx] = !newSets[idx];
                      setSetsDone(newSets);
                      if (!setsDone[idx]) setIsTimerRunning(true);
                    }}
                    className={cn(
                      "size-10 rounded-lg transition-all",
                      setsDone[idx] ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-primary/10"
                    )}
                  >
                    {setsDone[idx] ? <Check className="size-5" /> : <div className="size-4 rounded-full border-2 border-muted-foreground/30" />}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-border/40 bg-primary/5 border-dashed overflow-hidden relative shadow-sm">
            <CardContent className="p-8 space-y-6 text-center">
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Intervalo de Descanso</p>
                <div className="text-4xl font-bold flex items-center justify-center gap-3">
                  <Timer className="size-8 text-primary" />
                  {currentExercise.rest}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-11 rounded-xl font-bold border-primary/20 text-primary bg-background hover:bg-primary/5">
                  <RotateCcw className="size-4 mr-2" /> Reset
                </Button>
                <Button className="flex-1 h-11 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm">
                  Iniciar
                </Button>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">Próximo na lista</h3>
            <Card className="border-border/50 bg-card/60 opacity-70">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="size-11 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Dumbbell className="size-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Próximo: {workout.exercises[1]?.name || "Finalizar"}</p>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">3 Séries • 12 Reps</p>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 md:left-[280px] p-6 bg-background/80 backdrop-blur-xl border-t border-border/40 z-40">
        <div className="max-w-4xl mx-auto flex items-center gap-4 md:gap-12">
          <div className="hidden md:flex flex-1 flex-col gap-2">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Progresso do Treino</span>
              <span>{workoutProgress}%</span>
            </div>
            <Progress value={workoutProgress} className="h-1.5 bg-primary/5" />
          </div>

          <div className="flex flex-1 md:flex-initial items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="size-12 rounded-xl border-border/60 shrink-0"
              onClick={() => setCurrentExerciseIdx(prev => Math.max(0, prev - 1))}
            >
              <ChevronLeft className="size-5" />
            </Button>
            <Button
              className="flex-1 md:w-64 h-12 rounded-xl font-bold text-base bg-primary text-primary-foreground shadow-md transition-all active:scale-95"
              onClick={() => {
                if (currentExerciseIdx < workout.exercises.length - 1) {
                  setCurrentExerciseIdx(prev => prev + 1);
                  setSetsDone(new Array(workout.exercises[currentExerciseIdx + 1].sets).fill(false));
                } else {
                  alert("Treino Finalizado! Mandou bem! 🔥");
                }
              }}
            >
              {currentExerciseIdx < workout.exercises.length - 1 ? (
                <>PRÓXIMO <ChevronRight className="size-5 ml-2" /></>
              ) : (
                <>FINALIZAR <CheckCircle2 className="size-5 ml-2" /></>
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
