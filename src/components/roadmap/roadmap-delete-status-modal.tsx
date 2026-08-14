"use client";

import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { StatusOption } from "./roadmap-card";

interface RoadmapDeleteStatusModalProps {
  status: StatusOption | null;
  allStatuses: StatusOption[];
  cardCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoadmapDeleteStatusModal({
  status,
  allStatuses,
  cardCount,
  onClose,
  onSuccess,
}: RoadmapDeleteStatusModalProps) {
  const otherStatuses = allStatuses.filter((s) => s.id !== status?.id);
  const [targetStatusId, setTargetStatusId] = useState<string>(otherStatuses[0]?.id || "");
  const [isDeleting, setIsDeleting] = useState(false);

  if (!status) return null;

  const handleDelete = async () => {
    if (cardCount > 0 && !targetStatusId) {
      toast.error("Selecione uma coluna para onde transferir os cards existentes.");
      return;
    }

    setIsDeleting(true);
    try {
      const url = targetStatusId
        ? `/api/superadmin/roadmap/statuses/${status.id}?targetStatusId=${targetStatusId}`
        : `/api/superadmin/roadmap/statuses/${status.id}`;

      const res = await fetch(url, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao excluir coluna");
      }

      toast.success(
        cardCount > 0
          ? `Coluna "${status.name}" excluída e ${cardCount} cards foram migrados com sucesso!`
          : `Coluna "${status.name}" excluída com sucesso!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir coluna.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={Boolean(status)} onOpenChange={(open) => !open && !isDeleting && onClose()}>
      <AlertDialogContent className="sm:max-w-md rounded-2xl! p-6">
        <AlertDialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-rose-500 font-bold text-xs">
            <AlertTriangle className="size-4" />
            <span>Ação Destrutiva</span>
          </div>
          <AlertDialogTitle className="text-lg font-bold">
            Excluir Coluna &quot;{status.name}&quot;?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-2">
            <span>
              Essa ação removerá a coluna permanentemente do quadro.
            </span>
            {cardCount > 0 && (
              <span className="block p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
                ⚠️ Esta coluna possui <strong>{cardCount} card{cardCount > 1 ? "s" : ""}</strong>. Selecione abaixo para qual coluna você deseja transferir esses cards antes de excluir:
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {cardCount > 0 && otherStatuses.length > 0 && (
          <div className="space-y-1.5 py-2">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              Coluna de Destino para os Cards <span className="text-rose-500">*</span>
            </Label>
            <Select value={targetStatusId} onValueChange={setTargetStatusId} disabled={isDeleting}>
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
        )}

        <AlertDialogFooter className="gap-2 pt-3">
          <AlertDialogCancel disabled={isDeleting} onClick={onClose} className="rounded-xl text-xs font-bold">
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || (cardCount > 0 && !targetStatusId)}
            className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
          >
            {isDeleting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                Excluindo...
              </span>
            ) : (
              "Excluir Coluna"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
