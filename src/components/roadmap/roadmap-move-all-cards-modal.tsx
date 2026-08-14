"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { StatusOption } from "./roadmap-card";

interface RoadmapMoveAllCardsModalProps {
  sourceStatus: StatusOption | null;
  allStatuses: StatusOption[];
  cardCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoadmapMoveAllCardsModal({
  sourceStatus,
  allStatuses,
  cardCount,
  onClose,
  onSuccess,
}: RoadmapMoveAllCardsModalProps) {
  const otherStatuses = allStatuses.filter((s) => s.id !== sourceStatus?.id);
  const [targetStatusId, setTargetStatusId] = useState<string>(otherStatuses[0]?.id || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!sourceStatus) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatusId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/roadmap/statuses/${sourceStatus.id}/move-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatusId: targetStatusId }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao transferir cards");
      }

      const targetStatus = allStatuses.find((s) => s.id === targetStatusId);
      toast.success(
        `${cardCount} cards movidos de "${sourceStatus.name}" para "${targetStatus?.name || "nova coluna"}" com sucesso!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao transferir cards.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(sourceStatus)} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md rounded-2xl! p-6 sm:p-7">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-1.5 text-blue-500 text-[10px] font-mono font-bold uppercase tracking-widest">
            <ArrowRightLeft className="size-3.5" />
            <span>Ação em Massa</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">Mover Todos os Cards</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Transferir todos os <strong>{cardCount} card{cardCount > 1 ? "s" : ""}</strong> da coluna &quot;{sourceStatus.name}&quot; para outra coluna de uma só vez.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              Coluna de Destino <span className="text-rose-500">*</span>
            </Label>
            <Select value={targetStatusId} onValueChange={setTargetStatusId} disabled={isSubmitting}>
              <SelectTrigger className="rounded-xl h-10 text-xs w-full bg-background">
                <SelectValue placeholder="Selecione a coluna de destino" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {otherStatuses.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                    <span className="flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ backgroundColor: s.color || "#888" }} />
                      {s.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end items-center gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl text-xs font-bold cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !targetStatusId}
              className="rounded-xl h-10 px-5 text-xs font-bold gap-1.5 text-white cursor-pointer shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Transferindo...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="size-3.5" />
                  <span>Mover Todos os Cards</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
