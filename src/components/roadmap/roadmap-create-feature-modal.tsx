"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Sparkles, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface RoadmapCreateFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  statuses: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  initialStatusId?: string;
  onSuccess: () => void;
}

export function RoadmapCreateFeatureModal({
  isOpen,
  onClose,
  statuses,
  categories,
  initialStatusId,
  onSuccess,
}: RoadmapCreateFeatureModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState(initialStatusId || statuses[0]?.id || "");
  const [categoryId, setCategoryId] = useState<string>("NONE");
  const [source, setSource] = useState<"ATLASFIT" | "COMMUNITY">("ATLASFIT");
  const [priority, setPriority] = useState("MEDIUM");
  const [featured, setFeatured] = useState(false);
  const [estimatedRelease, setEstimatedRelease] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialStatusId) {
        setStatusId(initialStatusId);
      } else if (statuses[0]?.id && !statusId) {
        setStatusId(statuses[0].id);
      }
    }
  }, [isOpen, initialStatusId, statuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !statusId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/roadmap/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          statusId,
          categoryId: categoryId === "NONE" ? null : categoryId,
          source,
          priority,
          featured,
          estimatedRelease: estimatedRelease.trim() || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao criar funcionalidade");
      }

      toast.success("Card criado com sucesso no roadmap!");
      setTitle("");
      setDescription("");
      setEstimatedRelease("");
      setFeatured(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar card.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl! p-6 sm:p-7">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-1.5 text-blue-500 text-[10px] font-mono font-bold uppercase tracking-widest">
            <ShieldCheck className="size-3.5" />
            <span>SuperAdmin Feature</span>
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">Criar Card no Roadmap</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre um novo item, requisito ou funcionalidade no roadmap do produto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              Título do Card / Funcionalidade <span className="text-rose-500">*</span>
            </Label>
            <Input
              required
              placeholder="Ex: Integração com WhatsApp, Filtro por Tags..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              className="rounded-xl h-10 text-xs! font-bold bg-background"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
              Descrição Detalhada / Requisitos <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              required
              placeholder="Descreva o objetivo da funcionalidade, regras de negócio ou requisitos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="rounded-xl text-xs! resize-none bg-background leading-relaxed"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                Coluna Inicial <span className="text-rose-500">*</span>
              </Label>
              <Select value={statusId} onValueChange={setStatusId} disabled={isSubmitting}>
                <SelectTrigger className="rounded-xl h-10 text-xs w-full bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.id} className="text-xs font-medium">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                Prioridade
              </Label>
              <Select value={priority} onValueChange={setPriority} disabled={isSubmitting}>
                <SelectTrigger className="rounded-xl h-10 text-xs w-full bg-background">
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="URGENT" className="text-xs font-bold text-rose-500">
                    🔴 Urgente
                  </SelectItem>
                  <SelectItem value="HIGH" className="text-xs font-bold text-amber-500">
                    🟠 Alta
                  </SelectItem>
                  <SelectItem value="MEDIUM" className="text-xs font-medium text-blue-400">
                    🔵 Média
                  </SelectItem>
                  <SelectItem value="LOW" className="text-xs font-medium text-muted-foreground">
                    ⚪ Baixa
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Category, Source & Release */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                Categoria
              </Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={isSubmitting}>
                <SelectTrigger className="rounded-xl h-10 text-xs w-full bg-background">
                  <SelectValue placeholder="Sem categoria" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="NONE" className="text-xs text-muted-foreground">
                    Nenhuma
                  </SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                Origem
              </Label>
              <Select value={source} onValueChange={(val: any) => setSource(val)} disabled={isSubmitting}>
                <SelectTrigger className="rounded-xl h-10 text-xs w-full bg-background">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ATLASFIT" className="text-xs font-medium">
                    Oficial AtlasFit
                  </SelectItem>
                  <SelectItem value="COMMUNITY" className="text-xs font-medium">
                    Sugestão Comunidade
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                Previsão de Lançamento
              </Label>
              <Input
                placeholder="Ex: Q3 2026, Em breve..."
                value={estimatedRelease}
                onChange={(e) => setEstimatedRelease(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl h-10 text-xs! bg-background"
              />
            </div>
          </div>

          {/* Featured switch */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-secondary/20">
            <div className="space-y-0.5">
              <Label htmlFor="create-featured-toggle" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                Marcar como Destaque
              </Label>
              <p className="text-[10px] text-muted-foreground">Destacar visualmente na coluna e no roadmap</p>
            </div>
            <Switch
              id="create-featured-toggle"
              checked={featured}
              onCheckedChange={setFeatured}
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
                  <span>Criando card...</span>
                </>
              ) : (
                <>
                  <Plus className="size-4" />
                  <span>Criar Card</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
