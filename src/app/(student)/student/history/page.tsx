"use client";

import { motion } from "framer-motion";
import {
  History,
  Calendar,
  Dumbbell,
  Clock,
  TrendingUp,
  ChevronRight,
  Filter,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

const historyItems = [
  {
    id: 1,
    date: "Hoje, 14 de Mai",
    name: "Superior A - Empurrar",
    duration: "52 min",
    exercises: 8,
    volume: "12.450kg",
    status: "completed"
  },
  {
    id: 2,
    date: "Ontem, 13 de Mai",
    name: "Inferior B - Quadríceps",
    duration: "65 min",
    exercises: 7,
    volume: "15.200kg",
    status: "completed"
  },
  {
    id: 3,
    date: "11 de Mai",
    name: "Cardio & Mobilidade",
    duration: "30 min",
    exercises: 4,
    volume: "-",
    status: "completed"
  },
  {
    id: 4,
    date: "09 de Mai",
    name: "Superior C - Puxar",
    duration: "58 min",
    exercises: 8,
    volume: "10.800kg",
    status: "completed"
  },
  {
    id: 5,
    date: "08 de Mai",
    name: "Inferior A - Posterior",
    duration: "70 min",
    exercises: 6,
    volume: "18.100kg",
    status: "completed"
  },
];

export default function StudentHistoryPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Histórico de Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Você completou <span className="text-primary font-semibold">42 treinos</span> este ano. Continue assim!
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl font-bold h-10 gap-2 border-border/60">
            <Filter className="size-4" /> Filtrar
          </Button>
          <Button variant="outline" className="rounded-xl font-bold h-10 gap-2 border-border/60">
            <Calendar className="size-4" /> Período
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Resumo Rápido */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-border/50 bg-card shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resumo Mensal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Treinos</span>
                <span className="text-sm font-bold">18 / 20</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Tempo Total</span>
                <span className="text-sm font-bold">14.5h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Volume Total</span>
                <span className="text-sm font-bold">245k kg</span>
              </div>
              <div className="pt-2">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-[90%]" />
                </div>
                <p className="text-[10px] text-center mt-2 font-bold text-muted-foreground uppercase tracking-tighter">90% da meta batida</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-primary text-primary-foreground p-6 space-y-4 shadow-lg shadow-primary/20">
            <TrendingUp className="size-8 opacity-50" />
            <h3 className="text-lg font-bold leading-tight">Sua consistência está incrível!</h3>
            <p className="text-xs text-primary-foreground/80 leading-relaxed font-medium">
              Você manteve uma frequência 15% maior do que no mês passado. Seus resultados virão em breve.
            </p>
          </Card>
        </div>

        {/* Lista de Histórico */}
        <div className="lg:col-span-3 space-y-4">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-3"
          >
            {historyItems.map((workout) => (
              <motion.div key={workout.id} variants={item}>
                <Card className="group border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm">
                  <CardContent className="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-base">{workout.name}</h3>
                          <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-tight bg-primary/10 text-primary border-none">
                            Completo
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                          <Calendar className="size-3" /> {workout.date}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-12">
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Duração</p>
                        <p className="text-sm font-bold flex items-center gap-1.5">
                          <Clock className="size-3.5 text-primary" /> {workout.duration}
                        </p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Volume</p>
                        <p className="text-sm font-bold flex items-center gap-1.5">
                          <Dumbbell className="size-3.5 text-primary" /> {workout.volume}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl size-10 hover:bg-primary/10 hover:text-primary transition-all">
                        <ChevronRight className="size-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground font-bold hover:bg-secondary/50">
            CARREGAR MAIS ATIVIDADES
          </Button>
        </div>
      </div>
    </div>
  );
}
