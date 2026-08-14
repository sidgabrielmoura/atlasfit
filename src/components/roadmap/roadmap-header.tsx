"use client";

import React from "react";
import { Plus, Compass, UserCheck, Flame, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface RoadmapHeaderProps {
  stats: {
    totalIdeas: number;
    totalVotes: number;
    totalReleased: number;
  };
  onOpenSuggestModal: () => void;
  onOpenMySuggestionsModal: () => void;
  isSuperAdmin?: boolean;
  onOpenAdminFeatureModal?: () => void;
  onOpenAdminStatusModal?: () => void;
  onOpenAdminPollModal?: () => void;
  onOpenAdminMetricsModal?: () => void;
}

export function RoadmapHeader({
  stats,
  onOpenSuggestModal,
  onOpenMySuggestionsModal,
  isSuperAdmin,
  onOpenAdminFeatureModal,
  onOpenAdminStatusModal,
  onOpenAdminPollModal,
  onOpenAdminMetricsModal,
}: RoadmapHeaderProps) {
  return (
    <div className="space-y-4 pb-4 border-b border-border/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-1">
              <Compass className="size-3" /> Roadmap Community
            </span>
            {isSuperAdmin && (
              <Badge variant="outline" className="font-mono text-[9px] uppercase px-1.5 py-0 border-border/40 text-muted-foreground bg-secondary/30">
                Admin Mode
              </Badge>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Evolução do Produto
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={onOpenMySuggestionsModal}
            variant="outline"
            size="sm"
            className="rounded-lg h-9 px-3 text-xs font-medium border-border/50 gap-1.5"
          >
            <UserCheck className="size-3.5 text-primary" />
            Minhas Atividades
          </Button>

          <Button
            onClick={onOpenSuggestModal}
            size="sm"
            className="rounded-lg h-9 px-3.5 text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="size-3.5" />
            Sugerir Ideia
          </Button>

          {isSuperAdmin && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-border/30">
              <Button
                onClick={onOpenAdminFeatureModal}
                variant="outline"
                size="sm"
                className="rounded-lg h-9 px-2.5 text-xs font-mono font-bold gap-1 text-foreground border-border/50 hover:bg-secondary/50"
              >
                + Feature
              </Button>
              {onOpenAdminStatusModal && (
                <Button
                  onClick={onOpenAdminStatusModal}
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 px-2.5 text-xs font-mono font-bold gap-1 text-foreground border-border/50 hover:bg-secondary/50"
                >
                  + Coluna
                </Button>
              )}
              {onOpenAdminPollModal && (
                <Button
                  onClick={onOpenAdminPollModal}
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 px-2.5 text-xs font-mono font-bold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                >
                  <Flame className="size-3" /> Enquete
                </Button>
              )}
              {onOpenAdminMetricsModal && (
                <Button
                  onClick={onOpenAdminMetricsModal}
                  variant="ghost"
                  size="icon"
                  className="size-9 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <BarChart2 className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Minimal Stats */}
      <div className="flex items-center gap-4 text-xs font-mono pt-1 text-muted-foreground">
        <div>
          <span className="font-bold text-foreground">{stats.totalIdeas}</span> sugestões
        </div>
        <div className="size-1 rounded-full bg-border" />
        <div>
          <span className="font-bold text-primary">{stats.totalVotes.toLocaleString()}</span> votos
        </div>
        <div className="size-1 rounded-full bg-border" />
        <div>
          <span className="font-bold text-foreground">{stats.totalReleased}</span> lançadas
        </div>
      </div>
    </div>
  );
}
