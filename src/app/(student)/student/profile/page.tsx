"use client";

import { motion } from "framer-motion";
import {
  globalUser,
  studentDashboard,
  workspaces
} from "@/lib/mock-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User,
  Weight,
  Ruler,
  Target,
  CreditCard,
  Building2,
  Download,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Mail,
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

export default function StudentProfilePage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full space-y-10 pb-12 animate-in fade-in duration-500">
      {/* Profile Header Card */}
      <Card className="border-border/50 bg-card shadow-sm overflow-hidden rounded-[2rem]">
        <CardContent className="p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <Avatar className="size-28 border-4 border-background shadow-xl">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold italic">
                  {globalUser.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-primary-foreground border-2 border-background shadow-lg flex items-center justify-center">
                <Smartphone className="size-3.5" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{globalUser.name}</h1>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-bold text-[10px] uppercase tracking-widest px-3 py-1">
                    ALUNO ELITE
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
                  <Mail className="size-3.5" /> {globalUser.email}
                </p>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-2">
                <Button className="rounded-xl font-bold h-10 px-6 shadow-sm">
                  EDITAR PERFIL
                </Button>
                <Button variant="outline" className="rounded-xl font-bold h-10 px-6 border-border/60">
                  COMPARTILHAR
                </Button>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-2 gap-4">
              <div className="bg-secondary/40 p-5 rounded-2xl border border-border/50 text-center space-y-1 min-w-[100px]">
                <span className="text-2xl font-bold text-primary">{studentDashboard.streak}</span>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Streak</p>
              </div>
              <div className="bg-secondary/40 p-5 rounded-2xl border border-border/50 text-center space-y-1 min-w-[100px]">
                <span className="text-2xl font-bold text-amber-500">12</span>
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">PRs Totais</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Biometria Column */}
        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Biometria Atual</h3>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3"
          >
            {[
              { label: "Peso Corporal", value: `${studentDashboard.currentWeight}kg`, icon: Weight, color: "text-blue-500" },
              { label: "Altura", value: "1.82m", icon: Ruler, color: "text-green-500" },
              { label: "Objetivo", value: "Hipertrofia", icon: Target, color: "text-primary" },
            ].map((bio, idx) => (
              <motion.div key={idx} variants={item}>
                <Card className="bg-card border-border/50 shadow-sm group hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2.5 bg-secondary rounded-xl group-hover:scale-105 transition-transform", bio.color)}>
                        <bio.icon className="size-4.5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">{bio.label}</p>
                        <p className="text-lg font-bold">{bio.value}</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Gestão Column */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Gestão de Conta</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border/50 shadow-sm group hover:border-primary/30 transition-all overflow-hidden">
              <Link href="#" className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
                    <CreditCard className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Assinatura Premium</p>
                    <p className="text-[11px] text-muted-foreground">Próximo ciclo: 28/05</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </Card>

            <Card className="bg-card border-border/50 shadow-sm group hover:border-amber-500/30 transition-all overflow-hidden">
              <Link href="/select-workspace" className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                    <Building2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Workspace Atual</p>
                    <p className="text-[11px] text-muted-foreground">{workspaces[0].name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:block text-[9px] font-bold uppercase bg-amber-500/20 text-amber-600 px-2.5 py-0.5 rounded-full">TROCAR</span>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            </Card>

            <Card className="bg-card border-border/50 shadow-sm group hover:border-primary/30 transition-all overflow-hidden">
              <Link href="#" className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-secondary text-muted-foreground rounded-xl">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Privacidade e Dados</p>
                    <p className="text-[11px] text-muted-foreground">Preferências de segurança</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </Card>

            <Card className="bg-card border-border/50 shadow-sm group hover:border-primary/30 transition-all overflow-hidden">
              <Link href="#" className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-secondary text-muted-foreground rounded-xl">
                    <Download className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Exportar Histórico</p>
                    <p className="text-[11px] text-muted-foreground">PDF de treinos e medidas</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </Card>
          </div>

          <Button variant="ghost" className="w-full h-14 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/5 font-bold gap-3 border border-dashed border-destructive/20 mt-4">
            <LogOut className="size-5" /> SAIR DA CONTA GLOBAL
          </Button>
        </div>
      </div>

      <p className="text-center text-[10px] text-muted-foreground uppercase font-bold tracking-[0.3em] pt-8 opacity-40">
        AtlasFit System • v2.0.4 Premium
      </p>
    </div>
  );
}
