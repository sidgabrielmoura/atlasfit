"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Vote, Heart, TrendingUp, ShieldCheck, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface RoadmapMetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RoadmapMetricsModal({ isOpen, onClose }: RoadmapMetricsModalProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch("/api/superadmin/roadmap/metrics")
      .then((res) => res.json())
      .then((data) => setMetrics(data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto! rounded-xl! p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-1">
            <TrendingUp className="size-3" /> Dashboard de Métricas
          </span>
          <DialogTitle className="text-lg font-bold tracking-tight">Métricas do Roadmap</DialogTitle>
        </DialogHeader>

        {loading || !metrics ? (
          <div className="space-y-3 py-3">
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-16 rounded" />
              <Skeleton className="h-16 rounded" />
              <Skeleton className="h-16 rounded" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 pt-1">
            <Card className="p-4 rounded-lg bg-card/40 border-border/40 flex justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono font-bold uppercase text-primary">Métrica Chave</span>
                <h3 className="text-2xl font-black font-mono text-primary">
                  {metrics.communityProductRate}%
                </h3>
                <p className="text-xs font-bold text-foreground">Community → Product Rate</p>
                <p className="text-[10px] text-muted-foreground">
                  Lançadas vindas da comunidade.
                </p>
              </div>
            </Card>

            <div className="grid grid-cols-3 gap-3 font-mono">
              <Card className="p-3 rounded-lg bg-card/40 border-border/30 space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Participação</span>
                <p className="text-lg font-bold text-foreground">{metrics.voterPercentage}%</p>
              </Card>

              <Card className="p-3 rounded-lg bg-card/40 border-border/30 space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Votos (30d)</span>
                <p className="text-lg font-bold text-foreground">{metrics.votesLast30Days}</p>
              </Card>

              <Card className="p-3 rounded-lg bg-card/40 border-border/30 space-y-0.5">
                <span className="text-[10px] text-muted-foreground">Sugestões</span>
                <p className="text-lg font-bold text-foreground">{metrics.totalFeatures}</p>
              </Card>
            </div>

            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> Auditoria Recente
              </span>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {(!metrics.auditLogs || metrics.auditLogs.length === 0) ? (
                  <p className="text-[11px] text-muted-foreground italic">Sem registros.</p>
                ) : (
                  metrics.auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 text-[11px] font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <ShieldCheck className="size-3 text-primary shrink-0" />
                        <span className="font-bold text-foreground truncate">{log.actor?.name || "Admin"}:</span>
                        <span className="text-muted-foreground truncate">{log.action}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {new Date(log.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
