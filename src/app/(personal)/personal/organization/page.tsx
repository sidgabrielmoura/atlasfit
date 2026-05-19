"use client";

import { motion } from "framer-motion";
import {
  organizationAlerts,
  dailyAgenda,
  pendingTasks,
  intelligentStudentsList,
} from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dumbbell,
  UserPlus,
  Send,
  CopyPlus,
  ClipboardList,
  AlertCircle,
  Clock,
  MessageSquare,
  ChevronRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const priorityConfig: Record<string, { badge: string; label: string }> = {
  Alta: { badge: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20", label: "Alta Prioridade" },
  Média: { badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/20", label: "Média Prioridade" },
  Baixa: { badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20", label: "Baixa Prioridade" },
};

const getPendingIcon = (iconName: string) => {
  switch (iconName) {
    case "MessageSquare": return <MessageSquare className="size-4" />;
    case "Dumbbell": return <Dumbbell className="size-4" />;
    case "ClipboardList": return <ClipboardList className="size-4" />;
    default: return <Clock className="size-4" />;
  }
};

export default function OrganizationPage() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 overflow-hidden w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Organização</h2>
          <p className="text-muted-foreground mt-1">Seu assistente operacional inteligente.</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col space-y-8"
      >
        {/* 1. Atalhos Rápidos */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all">
              <Dumbbell className="size-4" />
              <span className="text-xs">Criar Treino</span>
            </Button>
            <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all">
              <UserPlus className="size-4" />
              <span className="text-xs">Adicionar Aluno</span>
            </Button>
            <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all">
              <Send className="size-4" />
              <span className="text-xs">Mensagem em Massa</span>
            </Button>
            <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all">
              <CopyPlus className="size-4" />
              <span className="text-xs">Duplicar Treino</span>
            </Button>
            <Button variant="outline" className="h-14 flex flex-col items-center justify-center gap-1 bg-card hover:bg-primary/5 hover:text-primary hover:border-primary/50 transition-all">
              <ClipboardList className="size-4" />
              <span className="text-xs">Gerar Avaliação</span>
            </Button>
          </div>
        </section>

        {/* 2. Alertas Inteligentes */}
        <section>
          <Card className="border-red-500/20 bg-linear-to-br from-red-500/5 via-card to-card overflow-hidden">
            <CardHeader className="pb-3 flex flex-row items-center space-y-0 gap-2">
              <div className="p-2 bg-red-500/10 rounded-full">
                <Zap className="size-5 text-red-500 fill-red-500/20" />
              </div>
              <div>
                <CardTitle className="text-lg">Alertas Inteligentes</CardTitle>
                <CardDescription>Ações que exigem sua atenção imediata.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {organizationAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      <AlertCircle className={cn("size-4", alert.type === "danger" ? "text-red-500" : "text-yellow-500")} />
                      <span className="text-sm font-medium">{alert.title}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-primary hover:text-primary-foreground">
                      {alert.action}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 3. Agenda & Pendências */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Agenda do Dia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-4">
                  {dailyAgenda.map((item) => (
                    <div key={item.id} className="flex items-start gap-4">
                      <div className="w-12 text-sm font-semibold text-muted-foreground text-right mt-0.5">
                        {item.time}
                      </div>
                      <div className="flex-1 space-y-1 relative before:absolute before:left-[-17px] before:top-2 before:w-2 before:h-2 before:rounded-full before:bg-primary">
                        <p className="text-sm font-medium leading-none">{item.title}</p>
                        <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                      </div>
                    </div>
                  ))}
                  {dailyAgenda.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum evento agendado para hoje.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="size-4 text-primary" />
                Central de Pendências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] pr-4">
                <div className="space-y-4">
                  {pendingTasks.map((task) => (
                    <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 text-primary rounded-md">
                          {getPendingIcon(task.icon)}
                        </div>
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      <Badge variant="secondary" className="font-bold bg-primary/10 text-primary hover:bg-primary/20">
                        {task.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* 4. Lista Inteligente de Alunos */}
        <section>
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Lista Inteligente de Alunos</CardTitle>
                  <CardDescription>Organizada automaticamente pelo Sistema de Prioridades.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {intelligentStudentsList
                  .sort((a, b) => b.priorityScore - a.priorityScore)
                  .map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center size-10 rounded-full bg-secondary/50 text-xl border shadow-sm">
                          {student.visualStatus}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{student.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{student.statusText}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end">
                          <span className="text-xs text-muted-foreground">{student.plan}</span>
                        </div>
                        <Badge variant="outline" className={cn("w-32 justify-center text-[10px] uppercase tracking-wider", priorityConfig[student.priority].badge)}>
                          {priorityConfig[student.priority].label}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                          <ChevronRight className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </motion.div>
    </div>
  );
}
