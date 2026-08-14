"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoadmapSuggestModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  onSuccess: () => void;
  onOpenDetails: (featureId: string) => void;
}

export function RoadmapSuggestModal({
  isOpen,
  onClose,
  categories,
  onSuccess,
  onOpenDetails,
}: RoadmapSuggestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [similarIdeas, setSimilarIdeas] = useState<any[]>([]);

  useEffect(() => {
    if (!title || title.trim().length < 3) {
      setSimilarIdeas([]);
      return;
    }

    const timer = setTimeout(() => {
      fetch(`/api/roadmap/similar?query=${encodeURIComponent(title.trim())}`)
        .then((res) => res.json())
        .then((data) => setSimilarIdeas(Array.isArray(data) ? data : []))
        .catch(() => setSimilarIdeas([]));
    }, 300);

    return () => clearTimeout(timer);
  }, [title]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/roadmap/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId: categoryId || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao criar sugestão");
      }

      toast.success("Sua sugestão foi enviada!");
      setTitle("");
      setDescription("");
      setCategoryId("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar sugestão.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-xl! p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-1">
            <Lightbulb className="size-3" /> Sugestão de Ideia
          </span>
          <DialogTitle className="text-lg font-bold tracking-tight">Sugerir Funcionalidade</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Título</Label>
            <Input
              required
              maxLength={100}
              placeholder="Ex: Notificações de treino no WhatsApp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg h-9 text-xs"
            />
          </div>

          {similarIdeas.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 space-y-1.5">
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase">Ideias semelhantes encontradas:</span>
              <div className="space-y-1">
                {similarIdeas.map((idea) => (
                  <div
                    key={idea.id}
                    className="flex items-center justify-between p-2 rounded bg-background/80 text-xs"
                  >
                    <span className="truncate font-medium text-foreground max-w-[70%]">{idea.title}</span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onOpenDetails(idea.id);
                      }}
                      className="rounded h-6 px-2 text-[10px] font-mono font-bold gap-1 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      Apoiar
                      <ArrowRight className="size-2.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Descrição</Label>
            <Textarea
              required
              minLength={15}
              maxLength={2000}
              placeholder="Descreva a necessidade ou funcionalidade desejada..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg text-xs min-h-[90px] resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Categoria (Opcional)</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="rounded-lg h-9 text-xs w-full">
                <SelectValue placeholder="Selecione categoria" />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded text-xs font-medium">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!title.trim() || !description.trim() || isSubmitting}
              className="rounded h-9 px-4 text-xs font-bold gap-1 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin mr-1" />
                  <span>Enviando...</span>
                </>
              ) : (
                "Enviar Sugestão"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
