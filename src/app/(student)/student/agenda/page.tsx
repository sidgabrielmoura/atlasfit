"use client";

import { motion } from "framer-motion";
import { 
  Clock, 
  MapPin, 
  ChevronRight,
  Plus,
  Info,
  User,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

const upcomingEvents = [
  {
    id: "ev_1",
    title: "Avaliação Antropométrica",
    date: "15 de Maio",
    time: "14:00",
    location: "Unidade Jardins",
    type: "Avaliação",
    color: "bg-blue-500",
    personal: "Gabriel Personal"
  },
  {
    id: "ev_2",
    title: "Treino Presencial",
    date: "17 de Maio",
    time: "09:00",
    location: "Unidade Jardins",
    type: "Personal",
    color: "bg-primary",
    personal: "Gabriel Personal"
  },
  {
    id: "ev_3",
    title: "Ajuste de Planejamento",
    date: "20 de Maio",
    time: "18:30",
    location: "Chamada de Vídeo",
    type: "Consultoria",
    color: "bg-amber-500",
    personal: "Gabriel Personal"
  },
];

export default function StudentAgendaPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sua Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas sessões presenciais e avaliações agendadas.</p>
        </div>
        <Button className="rounded-xl font-bold h-10 gap-2 shadow-sm">
          <Plus className="size-4" /> SOLICITAR SESSÃO
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos Compromissos */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Próximos Compromissos</h3>
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            {upcomingEvents.map((event) => (
              <motion.div key={event.id} variants={item}>
                <Card className="border-border/50 bg-card hover:border-primary/30 transition-all shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex flex-col items-center justify-center size-20 rounded-2xl bg-secondary shrink-0 border border-border/40">
                        <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">{event.date.split(' ')[2]}</span>
                        <span className="text-2xl font-bold">{event.date.split(' ')[0]}</span>
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                           <div className="space-y-1.5">
                            <h4 className="text-lg font-bold group-hover:text-primary transition-colors">{event.title}</h4>
                            <div className="flex flex-wrap items-center gap-4">
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <Clock className="size-3.5 text-primary" /> {event.time}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                <MapPin className="size-3.5 text-primary" /> {event.location}
                              </span>
                            </div>
                           </div>
                           <Badge variant="secondary" className="w-fit text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 bg-primary/10 text-primary border-none">
                            {event.type}
                           </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-border/40">
                           <div className="flex items-center gap-2">
                              <User className="size-3.5 text-muted-foreground" />
                              <span className="text-xs font-medium text-muted-foreground">{event.personal}</span>
                           </div>
                           <div className="flex gap-2">
                              <Button variant="ghost" size="sm" className="h-8 rounded-lg font-bold text-[10px] uppercase">Reagendar</Button>
                              <Button variant="ghost" size="icon" className="size-8 rounded-lg text-muted-foreground">
                                <MoreHorizontal className="size-4" />
                              </Button>
                           </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Calendário Lateral */}
        <div className="space-y-6">
          <Card className="border-border/50 bg-card shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-sm uppercase tracking-widest">Maio 2026</h3>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="size-8 rounded-lg border border-border/50">
                  <ChevronRight className="size-4 rotate-180" />
                </Button>
                <Button variant="ghost" size="icon" className="size-8 rounded-lg border border-border/50">
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(day => (
                <span key={day} className="text-[10px] font-bold text-muted-foreground uppercase">{day}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }).map((_, i) => {
                const day = i + 1;
                const hasEvent = [15, 17, 20].includes(day);
                const isToday = day === 12;
                
                return (
                  <div 
                    key={day} 
                    className={cn(
                      "aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-semibold transition-all relative cursor-pointer",
                      isToday ? "bg-primary text-primary-foreground shadow-md" : "hover:bg-secondary/50",
                      hasEvent && !isToday && "text-primary font-bold bg-primary/5"
                    )}
                  >
                    {day}
                    {hasEvent && (
                      <span className={cn(
                        "absolute bottom-1.5 size-1 rounded-full",
                        isToday ? "bg-white" : "bg-primary"
                      )} />
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="bg-amber-500/5 border-dashed border-amber-500/30">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="size-4 text-amber-600" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-700">Atenção</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                Desmarcações devem ser feitas com no mínimo 24h de antecedência para evitar a perda da sessão.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
