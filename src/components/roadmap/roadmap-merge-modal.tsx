"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Merge, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { FeatureCardData } from "./roadmap-card";

interface RoadmapMergeModalProps {
  primaryFeature: FeatureCardData | null;
  allFeatures: FeatureCardData[];
  onClose: () => void;
  onSuccess: () => void;
}

export function RoadmapMergeModal({
  primaryFeature,
  allFeatures,
  onClose,
  onSuccess,
}: RoadmapMergeModalProps) {
  const [secondaryId, setSecondaryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!primaryFeature) return null;

  const availableSecondaryOptions = allFeatures.filter((f) => f.id !== primaryFeature.id);

  const handleMergeSubmit = async () => {
    if (!secondaryId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/roadmap/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryId: primaryFeature.id,
          secondaryId,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao mesclar sugestões");
      }

      toast.success("Sugestões mescladas com sucesso! Votos e comentários transferidos.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao mesclar sugestões.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(primaryFeature)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-2xl! p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <Merge className="size-3.5" />
            <span>Ferramenta de Mesclagem</span>
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">Mesclar Sugestão Duplicada</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/40 space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Funcionalidade Principal (Manter)</p>
            <p className="text-xs font-bold text-foreground">{primaryFeature.title}</p>
            <p className="text-[10px] text-muted-foreground">{primaryFeature.voteCount} votos</p>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Selecionar Funcionalidade Duplicada (Incorporar & Arquivar)
            </Label>
            <Select value={secondaryId} onValueChange={setSecondaryId}>
              <SelectTrigger className="rounded-xl h-11 text-xs">
                <SelectValue placeholder="Escolha a ideia duplicada..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-56">
                {availableSecondaryOptions.map((f) => (
                  <SelectItem key={f.id} value={f.id} className="text-xs font-medium">
                    {f.title} ({f.voteCount} votos)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-medium text-amber-500 flex items-start gap-2">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>
              Todos os votos e comentários da ideia secundária serão migrados para a principal. Usuários que votaram em ambas manterão 1 único voto.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl text-xs font-bold">
              Cancelar
            </Button>
            <Button
              onClick={handleMergeSubmit}
              disabled={!secondaryId || isSubmitting}
              className="rounded-xl h-10 px-5 font-black uppercase text-xs tracking-widest gap-2 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Mesclando...</span>
                </>
              ) : (
                <>
                  <Merge className="size-3.5" />
                  <span>Confirmar Mesclagem</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
