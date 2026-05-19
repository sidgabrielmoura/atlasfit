"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { calendarEvents } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, MapPin, AlignLeft, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const typeConfig: Record<string, { color: string; label: string }> = {
  avaliação: { color: "bg-purple-500/10 text-purple-500 border-purple-500/20", label: "Avaliação" },
  financeiro: { color: "bg-green-500/10 text-green-500 border-green-500/20", label: "Financeiro" },
  aula: { color: "bg-blue-500/10 text-blue-500 border-blue-500/20", label: "Aula" },
  lembrete: { color: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20", label: "Lembrete" },
};

export default function CalendarPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState(calendarEvents);
  
  // Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    time: "09:00",
    type: "aula",
  });

  const selectedDateStr = date ? format(date, "yyyy-MM-dd") : "";
  const selectedEvents = events
    .filter((e) => e.date === selectedDateStr)
    .sort((a, b) => a.time.localeCompare(b.time));

  const handleAddEvent = () => {
    if (!date || !newEvent.title) return;

    const event = {
      id: `cev_${Date.now()}`,
      date: selectedDateStr,
      time: newEvent.time,
      title: newEvent.title,
      type: newEvent.type,
    };

    setEvents((prev) => [...prev, event]);
    setIsModalOpen(false);
    setNewEvent({ title: "", time: "09:00", type: "aula" });
  };

  return (
    <div className="flex-1 flex flex-col space-y-8 p-4 md:p-8 pt-6 overflow-hidden w-full h-full min-h-[calc(100vh-2rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agenda</h2>
          <p className="text-muted-foreground mt-1">Gerencie seus horários, aulas e lembretes.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="mr-2 size-4" />
              Novo Evento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border/50 shadow-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Evento</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título do Evento</Label>
                <Input 
                  id="title" 
                  placeholder="Ex: Aula de Hipertrofia com Marcos" 
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="bg-secondary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <div className="p-2.5 bg-secondary/30 rounded-md border border-border/50 text-sm text-muted-foreground flex items-center gap-2">
                    <CalendarDays className="size-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Selecione uma data"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Horário</Label>
                  <Input 
                    id="time" 
                    type="time" 
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="bg-secondary/30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select value={newEvent.type} onValueChange={(val) => setNewEvent({ ...newEvent, type: val })}>
                  <SelectTrigger className="bg-secondary/30">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aula">Aula</SelectItem>
                    <SelectItem value="avaliação">Avaliação</SelectItem>
                    <SelectItem value="financeiro">Financeiro</SelectItem>
                    <SelectItem value="lembrete">Lembrete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddEvent}>Salvar Evento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 flex-1 w-full"
      >
        {/* Calendário */}
        <div className="flex flex-col h-full">
          <Card className="flex-1 border-border/50 bg-card shadow-sm flex flex-col">
            <CardContent className="p-6 flex flex-1 items-center justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={ptBR}
                className="w-full flex justify-center scale-110 sm:scale-125 lg:scale-110 xl:scale-125 origin-center"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-secondary text-foreground",
                  head_cell: "text-muted-foreground font-medium text-[0.8rem] w-12",
                  cell: "h-12 w-12 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: cn("h-12 w-12 p-0 font-normal aria-selected:opacity-100"),
                }}
                modifiers={{
                  hasEvent: (d) => {
                    const dStr = format(d, "yyyy-MM-dd");
                    return events.some(e => e.date === dStr);
                  }
                }}
                modifiersStyles={{
                  hasEvent: { fontWeight: "bold", textDecoration: "underline", textUnderlineOffset: "4px", textDecorationColor: "currentColor" }
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Lista de Eventos */}
        <div className="flex flex-col h-full">
          <Card className="flex-1 border-border/50 shadow-sm flex flex-col">
            <CardHeader className="pb-4 border-b">
              <CardTitle className="flex items-center justify-between">
                <span>
                  {date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                </span>
                <Badge variant="secondary" className="font-normal text-xs bg-primary/10 text-primary">
                  {selectedEvents.length} {selectedEvents.length === 1 ? "evento" : "eventos"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col">
              <ScrollArea className="flex-1 h-[450px] lg:h-auto">
                {selectedEvents.length > 0 ? (
                  <div className="divide-y divide-border/50">
                    {selectedEvents.map((event) => (
                      <div key={event.id} className="p-6 flex items-start gap-6 hover:bg-secondary/20 transition-colors">
                        <div className="flex flex-col items-center mt-1">
                          <span className="text-lg font-bold text-foreground">{event.time}</span>
                          <span className="text-xs text-muted-foreground uppercase mt-1">Horário</span>
                        </div>
                        
                        <div className="w-px h-12 bg-border/50 mx-2 hidden sm:block"></div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold">{event.title}</h4>
                            <Badge variant="outline" className={cn("text-[10px] uppercase tracking-wider", typeConfig[event.type]?.color)}>
                              {typeConfig[event.type]?.label || event.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              Duração est.: 1h
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
                    <div className="p-4 rounded-full bg-secondary/50 text-muted-foreground">
                      <CalendarDays className="size-8 opacity-50" />
                    </div>
                    <div>
                      <p className="text-base font-medium text-foreground">Nenhum evento agendado</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">
                        Você tem o dia livre. Clique no botão "Novo Evento" para agendar algo.
                      </p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
