"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Weight,
  Ruler,
  Target,
  CreditCard,
  Building2,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Mail,
  Trophy,
  Flame,
  Calendar,
  LogOut,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

const getObjectiveLabel = (obj?: string | null) => {
  if (!obj) return "";
  const map: Record<string, string> = {
    hipertrofia: "Hipertrofia 💪",
    "definição corporal": "Definição corporal ✨",
    "perda de peso": "Perda de peso 🏃",
    "condicionamento físico": "Condicionamento físico ⚡",
    força: "Força 🏋️",
  };
  return map[obj.toLowerCase()] || obj;
};

export default function StudentProfilePage() {
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWs = workspaceSnap.activeWorkspace;

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/settings");
      if (!res.ok) {
        throw new Error("Não foi possível carregar seu perfil.");
      }
      const data = await res.json();
      setProfileData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro ao conectar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
  }, []);

  const getInitials = (name?: string | null) => {
    if (!name) return "AL";
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  if (loading) {
    return <StudentProfileSkeleton />;
  }

  if (error || !profileData) {
    return (
      <div className="p-8 text-center max-w-xl mx-auto space-y-4 pt-16">
        <User className="size-12 mx-auto text-rose-500 animate-pulse" />
        <h2 className="text-xl font-bold">Falha ao carregar perfil</h2>
        <p className="text-neutral-400">{error || "Não conseguimos sincronizar seus dados do perfil."}</p>
        <Button onClick={fetchProfileDetails} variant="outline" className="gap-2">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  const user = profileData.user;
  const physical = profileData.physicalData;
  const streak = profileData.streak || 0;
  const bestStreak = profileData.bestStreak || 0;
  const progressPercent = profileData.progress || 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 mx-auto w-full space-y-5 animate-in fade-in duration-500">
      {/* Profile Header Card */}
      <Card className="border p-0 border-border dark:border-white/6 bg-card dark:bg-neutral-950/40 backdrop-blur-md rounded-[2rem] overflow-hidden shadow-xl">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <Avatar className="size-28 border-4 border-background dark:border-neutral-900 shadow-xl overflow-hidden">
                {user?.image && (
                  <AvatarImage src={user.image} alt={user.name || "Aluno"} className="object-cover" />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold italic">
                  {getInitials(user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 size-8 rounded-full bg-primary text-primary-foreground border-2 border-background dark:border-neutral-900 shadow-lg flex items-center justify-center">
                <Smartphone className="size-3.5" />
              </div>
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">{user?.name || "Aluno Elite"}</h1>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase tracking-widest px-3 py-1 rounded-full">
                    ALUNO ELITE
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground dark:text-neutral-400 font-semibold flex items-center justify-center md:justify-start gap-2">
                  <Mail className="size-3.5 text-primary" /> {user?.email}
                </p>
                {user?.city && (
                  <p className="text-xs text-muted-foreground dark:text-neutral-500 font-medium flex items-center justify-center md:justify-start gap-1">
                    <MapPin className="size-3.5 text-muted-foreground dark:text-neutral-500" /> {user.city}
                  </p>
                )}
              </div>

              <div className="flex justify-center md:justify-start gap-3 pt-2">
                <Button asChild className="rounded-xl font-black text-xs uppercase tracking-wider h-11 px-6 shadow-md bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer">
                  <Link href="/student/settings">EDITAR PERFIL</Link>
                </Button>
                <Button variant="outline" asChild className="rounded-xl font-black text-xs uppercase tracking-wider h-11 px-6 border-border dark:border-white/[0.08] hover:bg-secondary/40 cursor-pointer">
                  <Link href="/student/settings?tab=security">ALTERAR SENHA</Link>
                </Button>
              </div>
            </div>

            <div className="hidden lg:grid grid-cols-3 gap-4 shrink-0">
              <div className="bg-muted/40 dark:bg-neutral-900/60 p-5 rounded-2xl border border-border dark:border-white/[0.04] text-center space-y-1 min-w-[120px]">
                <span className="text-2xl font-black text-primary flex items-center justify-center gap-1">
                  <Flame className="size-5 text-primary animate-pulse" /> {streak}
                </span>
                <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider">Streak Ativo</p>
              </div>
              <div className="bg-muted/40 dark:bg-neutral-900/60 p-5 rounded-2xl border border-border dark:border-white/[0.04] text-center space-y-1 min-w-[120px]">
                <span className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1">
                  <Trophy className="size-5 text-amber-500" /> {bestStreak}
                </span>
                <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider">Recorde</p>
              </div>
              <div className="bg-muted/40 dark:bg-neutral-900/60 p-5 rounded-2xl border border-border dark:border-white/[0.04] text-center space-y-1 min-w-[120px]">
                <span className="text-2xl font-black text-blue-500">{progressPercent}%</span>
                <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider">Progresso</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Biometria Column */}
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-2 flex items-center gap-2">
            <User className="size-4 text-primary" /> Biometria e Foco
          </h3>
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-3"
          >
            {[
              { label: "Peso Corporal", value: physical?.weight ? `${physical.weight} kg` : "—", icon: Weight, color: "text-blue-400" },
              { label: "Altura Base", value: physical?.height ? `${physical.height} cm` : "—", icon: Ruler, color: "text-emerald-400" },
              { label: "Objetivo Principal", value: getObjectiveLabel(user?.objective) || "Definir nas Configurações", icon: Target, color: "text-primary" },
            ].map((bioItem, idx) => (
              <motion.div key={idx} variants={item}>
                <Card className="bg-card dark:bg-neutral-950/40 border border-border dark:border-white/[0.06] shadow-sm hover:border-primary/30 transition-all rounded-2xl overflow-hidden">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2.5 bg-muted dark:bg-neutral-900 rounded-xl group-hover:scale-105 transition-transform border border-border dark:border-white/[0.04]", bioItem.color)}>
                        <bioItem.icon className="size-4.5" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider leading-none">{bioItem.label}</p>
                        <p className="text-base font-extrabold text-foreground">{bioItem.value}</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground dark:text-neutral-500" />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Gestão Column */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-2 flex items-center gap-2">
            <Building2 className="size-4 text-primary" /> Gestão de Conta e Acesso
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card dark:bg-neutral-950/40 border border-border dark:border-white/[0.06] shadow-sm hover:border-primary/35 transition-all overflow-hidden rounded-2xl">
              <Link href="/student/finance" className="flex items-center justify-between p-5 size-full">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl border border-primary/20">
                    <CreditCard className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Meu financeiro</p>
                    <p className="text-[10px] text-muted-foreground dark:text-neutral-400 font-semibold tracking-wider uppercase">Histórico e Faturas</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground dark:text-neutral-500" />
              </Link>
            </Card>

            <Card className="bg-card dark:bg-neutral-950/40 border border-border dark:border-white/[0.06] shadow-sm hover:border-amber-500/35 transition-all overflow-hidden rounded-2xl">
              <Link href="/select-workspace" className="flex items-center justify-between p-5 size-full">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                    <Building2 className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Assessoria Esportiva</p>
                    <p className="text-[10px] text-muted-foreground dark:text-neutral-400 font-semibold truncate max-w-[150px] uppercase">
                      {activeWs?.name || "AtlasFit"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] font-black uppercase bg-amber-500/10 text-amber-450 border border-amber-500/25 px-2.5 py-0.5 rounded-full">
                    TROCAR
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground dark:text-neutral-500" />
                </div>
              </Link>
            </Card>

            <Card className="bg-card dark:bg-neutral-950/40 border border-border dark:border-white/[0.06] shadow-sm hover:border-primary/35 transition-all overflow-hidden rounded-2xl">
              <Link href="/student/settings" className="flex items-center justify-between p-5 size-full">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-muted dark:bg-neutral-900 text-muted-foreground dark:text-neutral-400 rounded-xl border border-border dark:border-white/[0.04]">
                    <ShieldCheck className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Privacidade e Dados</p>
                    <p className="text-[10px] text-muted-foreground dark:text-neutral-400 font-semibold tracking-wider uppercase">Preferências de segurança</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground dark:text-neutral-500" />
              </Link>
            </Card>

            <Card className="bg-card dark:bg-neutral-950/40 border border-border dark:border-white/[0.06] shadow-sm hover:border-primary/35 transition-all overflow-hidden rounded-2xl">
              <Link href="/student/files" className="flex items-center justify-between p-5 size-full">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-muted dark:bg-neutral-900 text-muted-foreground dark:text-neutral-400 rounded-xl border border-border dark:border-white/[0.04]">
                    <Calendar className="size-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-foreground">Central de Arquivos</p>
                    <p className="text-[10px] text-muted-foreground dark:text-neutral-400 font-semibold tracking-wider uppercase">Downloads e links</p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground dark:text-neutral-500" />
              </Link>
            </Card>
          </div>

          {/* Ficha de Integração / Onboarding Section */}
          <div className="mt-8 space-y-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-neutral-400 px-2 flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Ficha de Integração (Dados de Entrada)
            </h3>

            <Card className="bg-card dark:bg-neutral-950/40 border border-border dark:border-white/[0.06] shadow-md rounded-[1.5rem] overflow-hidden">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Gênero */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-muted dark:bg-neutral-900 rounded-xl border border-border dark:border-white/[0.04] text-neutral-400">
                      <User className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider leading-none">Gênero</p>
                      <p className="text-sm font-extrabold text-foreground">{user?.gender || "Não informado"}</p>
                    </div>
                  </div>

                  {/* Data de Nascimento */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-muted dark:bg-neutral-900 rounded-xl border border-border dark:border-white/[0.04] text-neutral-400">
                      <Calendar className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider leading-none">Data de Nascimento</p>
                      <p className="text-sm font-extrabold text-foreground">
                        {user?.birthDate ? new Date(user.birthDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Não informada"}
                      </p>
                    </div>
                  </div>

                  {/* Cidade */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-muted dark:bg-neutral-900 rounded-xl border border-border dark:border-white/[0.04] text-neutral-400">
                      <MapPin className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider leading-none">Cidade</p>
                      <p className="text-sm font-extrabold text-foreground">{user?.city || "Não informada"}</p>
                    </div>
                  </div>

                  {/* Nível de Experiência */}
                  <div className="flex items-start gap-3.5">
                    <div className="p-2.5 bg-muted dark:bg-neutral-900 rounded-xl border border-border dark:border-white/[0.04] text-neutral-400">
                      <Trophy className="size-4" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider leading-none">Nível de Experiência</p>
                      <p className="text-sm font-extrabold text-foreground capitalize">
                        {user?.experienceLevel || "Não informado"}
                      </p>
                    </div>
                  </div>

                  {/* Restrições Médicas ou Dores */}
                  <div className="sm:col-span-2 space-y-2.5 pt-4 border-t border-border dark:border-white/[0.04]">
                    <p className="text-[10px] font-black uppercase text-muted-foreground dark:text-neutral-500 tracking-wider leading-none flex items-center gap-1.5">
                      <ShieldAlert className="size-3.5 text-amber-500" /> Restrições Médicas ou Dores Relatadas
                    </p>
                    <div className="p-4 rounded-xl bg-muted/40 dark:bg-neutral-900/30 border border-border dark:border-white/[0.04] text-xs font-semibold text-neutral-300 leading-relaxed">
                      {user?.medicalConditions || "Nenhuma restrição médica ou dor física relatada."}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button
            onClick={() => signOut({ callbackUrl: "/" })}
            variant="ghost"
            className="w-full h-14 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/5 font-black uppercase text-xs tracking-wider gap-3 border border-dashed border-destructive/20 mt-4 cursor-pointer"
          >
            <LogOut className="size-5" /> SAIR DA MINHA CONTA DO ALUNO
          </Button>
        </div>
      </div>

      <p className="text-center text-[10px] text-neutral-500 uppercase font-black tracking-[0.3em] pt-8 opacity-40">
        AtlasFit Premium • v2.0.4 Dynamic
      </p>
    </div>
  );
}

function StudentProfileSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto w-full space-y-10 pb-24 animate-pulse">
      <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/20 rounded-[2rem] h-[160px] p-8 md:p-10 flex items-center gap-6">
        <Skeleton className="size-24 rounded-full bg-muted/80 dark:bg-neutral-900 shrink-0" />
        <div className="space-y-2.5 flex-1">
          <Skeleton className="h-6 w-52 bg-muted/80 dark:bg-neutral-900" />
          <Skeleton className="h-4 w-72 bg-muted/80 dark:bg-neutral-900" />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-32 bg-muted/80 dark:bg-neutral-900" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 bg-muted/80 dark:bg-neutral-900 rounded-2xl" />
          ))}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Skeleton className="h-4 w-32 bg-muted/80 dark:bg-neutral-900" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 bg-muted/80 dark:bg-neutral-900 rounded-2xl" />
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <Skeleton className="h-4 w-48 bg-muted/80 dark:bg-neutral-900" />
            <Card className="border border-border dark:border-white/[0.06] bg-card dark:bg-neutral-950/20 rounded-[1.5rem] p-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="size-10 rounded-xl bg-muted/80 dark:bg-neutral-900" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-3 w-16 bg-muted/80 dark:bg-neutral-900" />
                      <Skeleton className="h-4 w-28 bg-muted/80 dark:bg-neutral-900" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 border-t border-border/50 dark:border-white/[0.04] space-y-2">
                <Skeleton className="h-3.5 w-40 bg-muted/80 dark:bg-neutral-900" />
                <Skeleton className="h-14 w-full bg-muted/80 dark:bg-neutral-900 rounded-xl" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
