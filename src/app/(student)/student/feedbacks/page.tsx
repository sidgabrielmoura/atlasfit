"use client";

import { motion } from "framer-motion";
import {
  Zap,
  Battery,
  Smile,
  MessageSquare,
  TrendingUp,
  AlertCircle,
  Wind
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import Link from "next/link";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function StudentFeedbackPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reporte de Feedback</h1>
        <p className="text-sm text-muted-foreground">Como está seu corpo hoje? Registre sua recuperação para otimizar seus treinos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 bg-card shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Registro Diário</CardTitle>
              <CardDescription className="text-xs">Avalie seu estado atual para ajuste de carga pelo seu personal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 pb-8">
              {[
                { label: "Energia", icon: Zap, value: 85, desc: "Seu nível de disposição hoje" },
                { label: "Fadiga", icon: Battery, value: 40, desc: "Cansaço acumulado dos treinos" },
                { label: "Humor", icon: Smile, value: 90, desc: "Bem-estar psicológico" },
              ].map((item, idx) => (
                <div key={idx} className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary text-primary">
                        <item.icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{item.desc}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-primary">{item.value}%</span>
                  </div>
                  <Progress value={item.value} className="h-1.5 bg-primary/5" />
                </div>
              ))}

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Button className="flex-1 h-10 rounded-xl font-bold bg-primary text-primary-foreground shadow-sm">
                  ENVIAR RELATÓRIO HOJE
                </Button>
                <Button variant="outline" className="flex-1 h-10 rounded-xl font-bold border-border/60" asChild>
                  <Link href="/student/history">VER HISTÓRICO</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <section className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Análises Recentes</h3>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <motion.div variants={item}>
                <Card className="bg-emerald-500/5 border-emerald-500/20 p-5 flex gap-4">
                  <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <TrendingUp className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Estado Ideal</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Sua média de recuperação subiu 8% esta semana.</p>
                  </div>
                </Card>
              </motion.div>
              <motion.div variants={item}>
                <Card className="bg-amber-500/5 border-amber-500/20 p-5 flex gap-4">
                  <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertCircle className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold">Ponto de Atenção</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">Fadiga acumulada alta. Considere um dia de descanso ativo.</p>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          </section>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Histórico de Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-secondary/20 rounded-xl border border-border/40 text-xs text-muted-foreground leading-relaxed font-medium italic">
                "Senti um pouco de dor no joelho direito durante o agachamento de ontem."
              </div>
              <div className="p-4 bg-secondary/10 rounded-xl border border-border/20 text-[10px] text-muted-foreground uppercase font-bold tracking-widest text-center">
                Observação enviada em 12/05
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-primary text-primary-foreground p-6 space-y-4 shadow-lg shadow-primary/20">
            <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Wind className="size-5" />
            </div>
            <h3 className="text-lg font-bold leading-tight">Dica de Recovery</h3>
            <p className="text-xs text-primary-foreground/80 leading-relaxed font-medium">
              Sessões de 15 min de mobilidade leve podem reduzir sua fadiga muscular significativamente.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
