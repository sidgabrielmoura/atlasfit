"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Columns3, Loader2, Plus, Globe, Lock } from "lucide-react";
import { toast } from "sonner";

const COLOR_PRESETS = [
  { label: "Âmbar", value: "#f59e0b" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Roxo", value: "#a855f7" },
  { label: "Esmeralda", value: "#10b981" },
  { label: "Rosa", value: "#f43f5e" },
  { label: "Índigo", value: "#6366f1" },
  { label: "Laranja", value: "#f97316" },
  { label: "Ciano", value: "#06b6d4" },
  { label: "Slate", value: "#64748b" },
];

interface RoadmapCreateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoadmapCreateStatusModal({
  isOpen,
  onClose,
  onSuccess,
}: RoadmapCreateStatusModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0].value);
  const [isPublic, setIsPublic] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/roadmap/statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          isPublic,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao criar coluna");
      }

      toast.success(`Coluna "${name.trim()}" criada com sucesso!`);
      setName("");
      setColor(COLOR_PRESETS[0].value);
      setIsPublic(true);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar coluna.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-md rounded-2xl! p-6 sm:p-7">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-1.5 text-blue-500 text-[10px] font-mono font-bold uppercase tracking-widest">
            <Columns3 className="size-3.5" />
            <span>Estrutura do Kanban</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">Criar Nova Coluna</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Defina o nome, cor e visibilidade da nova coluna no quadro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              Nome da Coluna <span className="text-rose-500">*</span>
            </Label>
            <Input
              required
              placeholder="Ex: Backlog, Em Testes, Sprint 4..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="rounded-xl h-10 text-xs! font-bold bg-background"
            />
          </div>

          {/* Color Presets */}
          <div className="space-y-2">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              Cor de Identificação
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PRESETS.map((c) => {
                const isSelected = color === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    disabled={isSubmitting}
                    className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-mono transition-all cursor-pointer ${isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-2 ring-primary/30"
                        : "border-border/50 hover:bg-secondary/40"
                      }`}
                  >
                    <span
                      className="size-3 rounded-full shrink-0 shadow-xs"
                      style={{ backgroundColor: c.value }}
                    />
                    <span className="truncate text-[10px]">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Public Visibility Toggle */}
          <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-border/40 bg-secondary/20">
            <div className="space-y-0.5">
              <Label htmlFor="public-status-toggle" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                {isPublic ? <Globe className="size-3.5 text-emerald-500" /> : <Lock className="size-3.5 text-amber-500" />}
                {isPublic ? "Coluna Pública" : "Coluna Interna / Privada"}
              </Label>
              <p className="text-[10px] text-muted-foreground">
                {isPublic
                  ? "Visível para a comunidade de personais no roadmap"
                  : "Apenas superadministradores podem ver esta coluna"}
              </p>
            </div>
            <Switch
              id="public-status-toggle"
              checked={isPublic}
              onCheckedChange={setIsPublic}
              disabled={isSubmitting}
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting}
              className="rounded-xl h-10 px-5 text-xs font-bold gap-1.5 text-white cursor-pointer shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Criando coluna...</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Criar Coluna</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
