"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoadmapEditSuggestionModalProps {
  feature: any | null;
  categories: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
  isSuperAdmin?: boolean;
}

export function RoadmapEditSuggestionModal({
  feature,
  categories,
  onClose,
  onSuccess,
  isSuperAdmin = false,
}: RoadmapEditSuggestionModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("NONE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (feature) {
      setTitle(feature.title || "");
      setDescription(feature.description || "");
      setCategoryId(feature.categoryId || "NONE");
    }
  }, [feature]);

  if (!feature) return null;

  const isBlockedForTrainer = !isSuperAdmin && feature.voteCount > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlockedForTrainer) {
      toast.error("Esta sugestão já possui votos e não pode ser editada por você.");
      return;
    }

    if (!title.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/roadmap/features/${feature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId: categoryId === "NONE" ? null : categoryId,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Erro ao editar sugestão");
      }

      toast.success("Sugestão editada com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao editar sugestão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(feature)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-xl! p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-1">
            <Edit3 className="size-3" /> Autonomia da Sugestão
          </span>
          <DialogTitle className="text-lg font-bold tracking-tight">Editar Sugestão</DialogTitle>
        </DialogHeader>

        {isBlockedForTrainer && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-amber-500 text-xs font-medium">
            <Lock className="size-4 shrink-0" />
            <span>Esta sugestão já recebeu votos da comunidade e não pode mais ser alterada por você.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Título</Label>
            <Input
              required
              disabled={isBlockedForTrainer}
              placeholder="Título da sugestão..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Categoria</Label>
            <Select disabled={isBlockedForTrainer} value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full rounded-lg h-9 text-xs">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="NONE" className="text-xs">Geral</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Descrição</Label>
            <Textarea
              required
              disabled={isBlockedForTrainer}
              placeholder="Descrição completa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg text-xs min-h-[90px] resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded text-xs font-medium">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || isBlockedForTrainer}
              className="rounded h-9 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
