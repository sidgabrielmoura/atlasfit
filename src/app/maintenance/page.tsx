"use client";

import { ShieldCheck, Database, KeyRound, Server, Mail, Lock, CheckCircle2, Globe, HardDrive } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-6 md:p-12 font-sans select-none">
      {/* 1. Header (Brand & Global Status Badge) */}
      <header className="w-full max-w-[1200px] mx-auto flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black tracking-[0.25em] text-foreground">ATLASFIT</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
          SISTEMA OFFLINE
        </div>
      </header>

      {/* 2. Main Structured Layout - 2 Columns */}
      <main className="w-full max-w-[1200px] mx-auto my-auto py-12 md:py-16 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-16 items-start">
        
        {/* Left Column: Core Status Info */}
        <div className="md:col-span-7 space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-black tracking-[0.15em] text-amber-500 bg-amber-500/10 border border-amber-500/20 uppercase">
              Acesso Restrito
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight max-w-lg">
              Painéis de controle indisponíveis.
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              O portal operacional para Alunos e Personal Trainers encontra-se temporariamente suspenso. Toda a integridade de dados cadastrais, históricos de atividades, avaliações físicas e faturamentos permanece totalmente protegida e isolada com segurança.
            </p>
          </div>

          {/* Structured Security Metadata Block */}
          <div className="grid grid-cols-2 gap-4 border border-border bg-card/45 rounded-2xl p-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status de Acesso</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <Lock className="size-3 text-amber-500" />
                Bloqueado
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Integridade dos Dados</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <ShieldCheck className="size-3 text-emerald-500" />
                Protegido e Preservado
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Criptografia Ativa</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <KeyRound className="size-3 text-emerald-500" />
                AES-256 bits
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Suporte Operacional</span>
              <p className="text-xs font-semibold text-foreground/90 flex items-center gap-1.5">
                <Globe className="size-3 text-emerald-500" />
                Canal Disponível
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-card/45 border border-border/40 flex items-start gap-3">
            <CheckCircle2 className="size-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed font-medium">
              As conexões externas e transações financeiras foram congeladas temporariamente para garantir a total consistência estrutural da plataforma durante a indisponibilidade.
            </p>
          </div>
        </div>

        {/* Right Column: Health Status Board Card */}
        <div className="md:col-span-5 space-y-6">
          <Card className="border-border bg-card rounded-2xl shadow-none">
            <CardHeader className="border-b border-border/40 pb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Dashboard de Integridade</span>
              <CardTitle className="text-base font-bold text-foreground">Status dos Módulos</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">Monitoramento interno de subsistemas e conexões.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Row 1: Core API */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <Server className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Portal & Painéis</h3>
                    <p className="text-[10px] text-muted-foreground">Acesso via Web</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px] font-semibold animate-none">
                  Pausado
                </Badge>
              </div>

              {/* Row 2: Database */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <Database className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Banco de Dados</h3>
                    <p className="text-[10px] text-muted-foreground">PostgreSQL Cluster</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px] font-semibold animate-none">
                  Manutenção
                </Badge>
              </div>

              {/* Row 3: Auth Provider */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <KeyRound className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Autenticação</h3>
                    <p className="text-[10px] text-muted-foreground">Sessões e Chaves</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/20 bg-amber-500/5 text-amber-500 text-[10px] font-semibold animate-none">
                  Pausado
                </Badge>
              </div>

              {/* Row 4: File Storage */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <HardDrive className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Armazenamento</h3>
                    <p className="text-[10px] text-muted-foreground">S3 File Storage</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[10px] font-semibold animate-none">
                  Seguro
                </Badge>
              </div>

              {/* Row 5: Payment Gateway */}
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center shrink-0">
                    <ShieldCheck className="size-4 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-foreground">Faturamentos</h3>
                    <p className="text-[10px] text-muted-foreground">AbacatePay Integrado</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/5 text-emerald-500 text-[10px] font-semibold animate-none">
                  Seguro
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

      </main>

      {/* 3. Footer (Support and Corporate Credentials) */}
      <footer className="w-full max-w-[1200px] mx-auto border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-muted-foreground">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
          <Mail className="size-3.5" />
          <span>Suporte técnico:</span>
          <a href="mailto:suporte@atlasfit.app" className="text-muted-foreground hover:text-foreground transition-colors lowercase font-semibold ml-0.5">
            suporte@atlasfit.app
          </a>
        </div>
        <p className="text-[10px] font-semibold tracking-wider uppercase">
          &copy; {new Date().getFullYear()} AtlasFit Platform. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
