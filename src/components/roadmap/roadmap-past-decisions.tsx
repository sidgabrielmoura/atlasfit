"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, History, Trophy, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ClosedPollHistory {
  id: string;
  title: string;
  description?: string | null;
  totalVotes: number;
  winner?: {
    title: string;
    voteCount: number;
    percentage: number;
  } | null;
  closedAt: string;
}

export function RoadmapPastDecisions() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<ClosedPollHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || history.length > 0) return;

    setLoading(true);
    fetch("/api/roadmap/polls/history")
      .then((res) => res.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, history.length]);

  return (
    <Card className="rounded-xl gap-0 p-0 border border-border/40 bg-card/30 overflow-hidden transition-all">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="p-3.5 sm:p-4 flex items-center justify-between cursor-pointer select-none hover:bg-card/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Decisões Anteriores da Comunidade</span>
        </div>

        <Button variant="ghost" size="sm" className="size-7 p-0 rounded-md text-muted-foreground">
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </Button>
      </div>

      {isOpen && (
        <div className="p-3.5 sm:p-4 pt-0 border-t border-border/30 space-y-3 animate-in fade-in duration-200">
          {loading ? (
            <p className="text-xs text-muted-foreground italic text-center py-2">Carregando histórico de decisões...</p>
          ) : history.length === 0 ? (
            <div className="p-4 text-center border border-dashed border-border/30 rounded-lg space-y-1 bg-card/10">
              <Sparkles className="size-4 mx-auto text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Nenhuma decisão anterior encerrada ainda.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="p-3 rounded-lg bg-secondary/30 border border-border/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-foreground truncate">{item.title}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {new Date(item.closedAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>

                {item.winner && (
                  <div className="p-2.5 rounded bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <Trophy className="size-3.5 text-primary shrink-0" />
                      <span className="font-bold text-primary truncate">Vencedora: {item.winner.title}</span>
                    </div>
                    <span className="font-mono text-[11px] font-extrabold text-primary shrink-0">
                      {item.winner.percentage}% ({item.winner.voteCount} votos)
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </Card>
  );
}
