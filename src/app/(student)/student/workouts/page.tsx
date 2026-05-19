"use client";

import { motion } from "framer-motion";
import { 
  studentWorkouts 
} from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Clock, 
  Dumbbell, 
  ChevronRight, 
  Calendar,
  History,
  MoreVertical,
  Plus
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function StudentWorkoutsPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Meus Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Você tem <span className="text-primary font-semibold">{studentWorkouts.length} divisões</span> ativas no seu plano.
          </p>
        </div>
        <Button variant="outline" className="rounded-xl font-bold h-10 gap-2 border-border/60 hover:bg-secondary/50">
          <History className="size-4" /> Histórico
        </Button>
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
      >
        {studentWorkouts.map((workout, idx) => (
          <motion.div key={workout.id} variants={item}>
            <Card className="group border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm hover:shadow-md">
              <CardContent className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                      {workout.type}
                    </Badge>
                    <h3 className="text-xl font-bold tracking-tight group-hover:text-primary transition-colors">{workout.name}</h3>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-lg size-8 text-muted-foreground">
                    <MoreVertical className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary/20 rounded-xl p-3 border border-border/30 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Músculos</span>
                    <span className="text-xs font-semibold truncate">{workout.muscles}</span>
                  </div>
                  <div className="bg-secondary/20 rounded-xl p-3 border border-border/30 flex flex-col gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Exercícios</span>
                    <span className="text-xs font-semibold">{workout.exercisesCount} Itens</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Última vez: <span className="text-foreground font-semibold">{workout.lastDone}</span>
                  {idx === 0 && (
                    <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      SUGESTÃO
                    </div>
                  )}
                </div>

                <div className="pt-2 flex gap-2">
                  <Button asChild className="flex-1 h-11 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all active:scale-[0.98]">
                    <Link href="/student/workout-execution">
                      <Play className="size-4 mr-2 fill-current" /> INICIAR TREINO
                    </Link>
                  </Button>
                  <Button variant="outline" className="size-11 rounded-xl shrink-0 border-border/60 hover:bg-secondary/50">
                    <ChevronRight className="size-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        <motion.div variants={item}>
          <Card className="h-full min-h-[280px] border-dashed border-2 border-border/60 bg-transparent flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all">
            <div className="size-12 rounded-full bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
              <Plus className="size-6 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="font-bold text-base mb-1">Novo Planejamento</h3>
            <p className="text-xs text-muted-foreground max-w-[180px]">Solicite uma nova divisão ao seu personal trainer.</p>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
