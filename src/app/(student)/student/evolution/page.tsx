"use client";

import { motion } from "framer-motion";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { studentEvolution, studentDashboard } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Scale, 
  Ruler, 
  TrendingUp, 
  Calendar,
  Download,
  ChevronRight,
  Zap,
  Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function StudentEvolutionPage() {
  const { weightHistory, measurements } = studentEvolution;
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-pulse">
        <div className="h-8 w-48 bg-secondary rounded-lg" />
        <div className="h-[300px] w-full bg-secondary/20 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header with Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Evolução Fisiológica</h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe seu progresso corporal e métricas de força ao longo do tempo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl border-border/60 h-10 px-4 font-bold text-xs">
            <Calendar className="size-3.5 mr-2" /> ÚLTIMOS 6 MESES
          </Button>
          <Button variant="outline" size="icon" className="rounded-xl size-10 border-border/60">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest">Peso Corporal</CardDescription>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tight">{studentDashboard.currentWeight}kg</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <TrendingUp className="size-3" /> -{studentDashboard.evolution}%
                  </div>
                </div>
              </div>
              <div className="flex bg-secondary/30 p-1 rounded-lg">
                <Button variant="secondary" size="sm" className="h-7 px-3 rounded-md text-[10px] font-bold bg-card shadow-xs">Peso</Button>
                <Button variant="ghost" size="sm" className="h-7 px-3 rounded-md text-[10px] font-bold text-muted-foreground">Gordura</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[320px] w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weightHistory} margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                    domain={['dataMin - 1', 'dataMax + 1']} 
                  />
                  <Tooltip 
                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1 }}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      borderRadius: "12px", 
                      border: "1px solid hsl(var(--border))",
                      fontSize: "12px"
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorWeight)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Measurements Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Medidas Corporais</h3>
              <Button variant="ghost" size="sm" className="h-auto p-0 text-xs font-bold gap-1 text-primary hover:bg-transparent">
                Adicionar <ChevronRight className="size-3" />
              </Button>
            </div>
            <motion.div 
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {measurements.map((m) => {
                const diff = m.current - m.previous;
                const isPositive = diff > 0;
                
                return (
                  <motion.div key={m.name} variants={item}>
                    <Card className="border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2.5 rounded-xl bg-secondary text-muted-foreground">
                            <Ruler className="size-5" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{m.name}</p>
                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Ant: {m.previous}{m.unit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold tracking-tight">{m.current}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{m.unit}</span></p>
                          <div className={cn(
                            "text-[10px] font-bold inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md",
                            isPositive ? "text-primary bg-primary/10" : "text-amber-600 bg-amber-500/10"
                          )}>
                            {isPositive ? "+" : ""}{diff}{m.unit} 
                            <TrendingUp className={cn("size-2.5", !isPositive && "rotate-180")} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </section>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          {/* Goal Progress Widget */}
          <Card className="bg-primary border-none text-primary-foreground shadow-lg shadow-primary/20">
            <CardContent className="p-6 space-y-6">
              <div className="size-12 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Target className="size-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold leading-tight tracking-tight">Rumo ao Objetivo</h3>
                <p className="text-xs text-primary-foreground/80 leading-relaxed">
                  Você já completou 65% da sua meta de redução de BF definida no início do mês.
                </p>
              </div>
              <Button className="w-full h-11 bg-white text-primary font-bold hover:bg-white/90 rounded-xl transition-all">
                VER PLANEJAMENTO
              </Button>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card className="border-border/50 bg-card shadow-sm">
             <CardHeader className="pb-3">
               <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Performance</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                {[
                  { label: "Volume de Treino", value: "+12%", color: "text-primary" },
                  { label: "Carga Média", value: "+5.4kg", color: "text-amber-600" },
                  { label: "Freq. Cardíaca", value: "Estável", color: "text-emerald-600" },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between border-b border-border/40 pb-3 last:border-0 last:pb-0">
                    <span className="text-xs font-semibold">{item.label}</span>
                    <span className={cn("text-xs font-bold", item.color)}>{item.value}</span>
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground pt-2 font-medium italic">
                  *Dados baseados nos últimos 30 dias.
                </p>
             </CardContent>
          </Card>

          {/* PRs Section */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Recordes Pessoais (PR)</h3>
             <div className="space-y-2">
                <Card className="border-border/50 bg-secondary/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Supino Reto</p>
                      <p className="text-sm font-bold">85kg</p>
                    </div>
                    <Zap className="size-4 text-amber-500 fill-amber-500/20" />
                  </CardContent>
                </Card>
                <Card className="border-border/50 bg-secondary/20 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agachamento</p>
                      <p className="text-sm font-bold">110kg</p>
                    </div>
                    <div className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[8px] font-black tracking-tighter">NEW PR</div>
                  </CardContent>
                </Card>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
