"use client";

import { motion } from "framer-motion";
import { 
  studentDashboard, 
  globalUser 
} from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Flame, 
  TrendingUp, 
  Scale, 
  Play, 
  ChevronRight,
  Zap,
  Activity,
  Dumbbell,
  Target,
  CalendarCheck2,
  Clock,
  Trophy
} from "lucide-react";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function StatCard({ label, value, icon: Icon, color, bg }: { 
  label: string; value: string; icon: any; color: string; bg: string;
}) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="p-4 flex flex-col items-center text-center gap-2">
        <div className={cn("p-2 rounded-lg mb-1", bg, color)}>
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentDashboardPage() {
  const { dailyWorkout, streak, weeklyFrequency, currentWeight, evolution, insights, recentActivity } = studentDashboard;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Olá, {globalUser.name.split(" ")[0]}! 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            Sua sequência atual é de <span className="text-primary font-semibold">{streak} dias</span>. Continue focado!
          </p>
        </div>
        <div className="flex items-center gap-3 bg-secondary/20 px-3 py-1.5 rounded-full border border-border/40 text-xs font-medium text-muted-foreground">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          Membro Elite · AtlasFit
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Workout Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="overflow-hidden border-primary/20 shadow-lg shadow-primary/5 bg-card">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6 md:p-8 space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest">
                      <Activity className="size-3.5" />
                      Treino Recomendado para Hoje
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold">{dailyWorkout.name}</h2>
                    <p className="text-muted-foreground text-sm font-medium">{dailyWorkout.muscles}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">{dailyWorkout.duration} min</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Dumbbell className="size-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Volume Médio</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-xs font-semibold text-muted-foreground">
                      <span>Progresso no Programa</span>
                      <span>{dailyWorkout.progress}%</span>
                    </div>
                    <Progress value={dailyWorkout.progress} className="h-1.5" />
                  </div>
                </div>

                <div className="bg-secondary/10 p-6 md:w-64 flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-border/50 gap-4">
                  <div className="text-center space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status</p>
                    <p className="text-sm font-bold text-emerald-500">Pendente</p>
                  </div>
                  <Button asChild className="w-full h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all active:scale-95">
                    <Link href="/student/workout-execution">
                      <Play className="size-4 mr-2 fill-current" /> INICIAR
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Quick Stats Grid */}
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <StatCard label="Frequência" value={`${weeklyFrequency}x`} icon={CalendarCheck2} color="text-emerald-500" bg="bg-emerald-500/10" />
            <StatCard label="Evolução" value={`+${evolution}%`} icon={TrendingUp} color="text-blue-500" bg="bg-blue-500/10" />
            <StatCard label="Peso Atual" value={`${currentWeight}kg`} icon={Scale} color="text-amber-500" bg="bg-amber-500/10" />
            <StatCard label="Streak" value={`${streak}d`} icon={Flame} color="text-primary" bg="bg-primary/10" />
          </motion.div>

          {/* Recent Activity Section */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-base font-bold">Atividade Recente</CardTitle>
                <CardDescription className="text-xs">Histórico dos seus últimos treinos e conquistas</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-xs font-semibold text-primary">
                Ver tudo
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <div className="divide-y divide-border/40">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 px-6 py-4 hover:bg-secondary/10 transition-colors">
                    <div className={cn(
                      "size-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      activity.type === "workout" ? "bg-primary/10 text-primary" : 
                      activity.type === "achievement" ? "bg-amber-500/10 text-amber-500" : 
                      "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {activity.type === "workout" ? <Dumbbell className="size-5" /> : 
                       activity.type === "achievement" ? <Trophy className="size-5" /> : 
                       <Activity className="size-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{activity.text}</p>
                      <p className="text-xs text-muted-foreground">Concluído com sucesso · {activity.date}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Next Goal Widget */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Target className="size-4" /> Próximo Objetivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-base font-bold">120kg no Agachamento</p>
                <p className="text-xs text-muted-foreground mt-1">Sua melhor marca atual: 112kg</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-primary">
                  <span>PROGRESSO</span>
                  <span>85%</span>
                </div>
                <Progress value={85} className="h-1.5 bg-primary/20" />
              </div>
              <Button variant="outline" className="w-full h-10 rounded-xl text-xs font-bold border-primary/20 text-primary hover:bg-primary/5">
                Ver detalhes do objetivo
              </Button>
            </CardContent>
          </Card>

          {/* Insights Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Insights de Treino</h3>
            {insights.map((insight) => (
              <Card key={insight.id} className="border-border/50 bg-card shadow-sm">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-secondary rounded-lg text-primary shrink-0">
                    <Zap className="size-4 fill-primary/20" />
                  </div>
                  <p className="text-xs font-medium leading-relaxed">{insight.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Coach's Tip */}
          <Card className="border-border/50 bg-amber-500/5 border-dashed">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="size-4 text-amber-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Dica do Personal</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                "Lembre-se de manter a hidratação alta hoje. O treino de superiores exige muita energia metabólica!"
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
