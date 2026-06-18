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

      <div className="relative h-[40vh] md:h-screen md:flex-1 w-full overflow-hidden">
        <Image
          src={backgroundImage}
          alt={`AtlasFit ${role}`}
          fill
          className="object-cover"
          priority
        />

        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-background md:hidden" />
        <div className="absolute inset-0 bg-linear-to-r from-transparent to-background hidden md:block" />

        <div className="absolute inset-0 hidden md:flex flex-col justify-end p-12 text-white bg-linear-to-t from-black/80 to-transparent">
          <Image
            src="/logos_atlasfit/atlasfit (4).png"
            alt="AtlasFit"
            width={250}
            height={250}
          />
          <h1 className="text-5xl font-black uppercase tracking-tight leading-none mb-4">
            Maximize sua <br /> <span className="text-primary underline decoration-4 underline-offset-8">Performance.</span>
          </h1>
          <p className="text-lg text-white/70 max-w-md font-medium">
            A ferramenta definitiva para {role === "aluno" ? "alcançar seus resultados" : role === "personal" ? "gerenciar sua assessoria" : "administrar a plataforma"} com inteligência de dados.
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center -mt-20 md:mt-0 relative z-20">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="w-full max-w-md md:max-w-xl bg-card/80 backdrop-blur-2xl md:bg-transparent border border-border/50 md:border-none p-8 md:p-12 rounded-t-[2.5rem] md:rounded-none shadow-2xl md:shadow-none"
        >
          <div className="flex flex-col items-center gap-3 mb-8 md:hidden">
            <Image
              src="/logos_atlasfit/atlasfit (4).png"
              alt="AtlasFit"
              width={150}
              height={100}
            />
            <span className="text-xl font-bold tracking-tight">Espaço <span className="text-muted-foreground font-normal">| {role}</span></span>
          </div>

          {children}
        </motion.div>
      </div>
    </div>
  );
}
