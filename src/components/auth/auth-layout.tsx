"use client";

import { motion } from "framer-motion";
import { Flame, ChevronLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface AuthLayoutProps {
  children: React.ReactNode;
  backgroundImage: string;
  role: string;
}

export function AuthLayout({ children, backgroundImage, role }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative overflow-hidden">
      {/* Botão Voltar (Absolute) */}
      <div className="absolute top-6 left-6 z-50">
        <Button variant="ghost" size="icon" asChild className="rounded-full bg-black/20 backdrop-blur-md text-white hover:bg-black/40">
          <Link href="/">
            <ChevronLeft className="size-6" />
          </Link>
        </Button>
      </div>

      {/* Hero Section (Top on Mobile, Left on Desktop) */}
      <div className="relative h-[40vh] md:h-screen md:flex-1 w-full overflow-hidden">
        <Image 
          src={backgroundImage} 
          alt={`AtlasFit ${role}`} 
          fill 
          className="object-cover"
          priority
        />
        {/* Gradients */}
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-background md:hidden" />
        <div className="absolute inset-0 bg-linear-to-r from-transparent to-background hidden md:block" />
        
        {/* Desktop Branding */}
        <div className="absolute inset-0 hidden md:flex flex-col justify-end p-12 text-white bg-linear-to-t from-black/80 to-transparent">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-3 bg-primary rounded-2xl">
              <Flame className="size-8" />
            </div>
            <span className="text-3xl font-black italic tracking-tighter">ATLASFIT</span>
          </div>
          <h1 className="text-5xl font-black uppercase tracking-tight leading-none mb-4">
            Maximize sua <br/> <span className="text-primary underline decoration-4 underline-offset-8">Performance.</span>
          </h1>
          <p className="text-lg text-white/70 max-w-md font-medium">
            A ferramenta definitiva para {role === "aluno" ? "alcançar seus resultados" : role === "personal" ? "gerenciar sua assessoria" : "administrar a plataforma"} com inteligência de dados.
          </p>
        </div>
      </div>

      {/* Content Section (Bottom Sheet on Mobile, Right on Desktop) */}
      <div className="flex-1 flex items-center justify-center p-6 -mt-12 md:mt-0 relative z-20">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="w-full max-w-md md:max-w-xl bg-card/80 backdrop-blur-2xl md:bg-transparent border border-border/50 md:border-none p-8 md:p-12 rounded-[2.5rem] md:rounded-none shadow-2xl md:shadow-none"
        >
          {/* Mobile Branding */}
          <div className="flex flex-col items-center gap-3 mb-8 md:hidden">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Flame className="size-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">AtlasFit <span className="text-muted-foreground font-normal">| {role}</span></span>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
