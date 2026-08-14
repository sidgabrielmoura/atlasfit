"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, MessageCircleCode, Sparkles, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { FeatureCardData } from "./roadmap-card";

interface RoadmapEditFeatureModalProps {
  feature: FeatureCardData | null;
  onClose: () => void;
  statuses: Array<{ id: string; name: string; color?: string }>;
  categories: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function RoadmapEditFeatureModal({
  feature,
  onClose,
  statuses,
  categories,
  onSuccess,
}: RoadmapEditFeatureModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusId, setStatusId] = useState("");
  const [categoryId, setCategoryId] = useState("NONE");
  const [priority, setPriority] = useState("MEDIUM");
  const [source, setSource] = useState<"ATLASFIT" | "COMMUNITY">("ATLASFIT");
  const [featured, setFeatured] = useState(false);
  const [isCommunityChoice, setIsCommunityChoice] = useState(false);
  const [officialResponse, setOfficialResponse] = useState("");
  const [estimatedRelease, setEstimatedRelease] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (feature) {
      setTitle(feature.title || "");
      setDescription(feature.description || "");
      setStatusId(feature.status?.id || statuses[0]?.id || "");
      setCategoryId((feature as any).categoryId || feature.category?.name ? (categories.find(c => c.name === feature.category?.name)?.id || "NONE") : "NONE");
      setPriority(feature.priority || "MEDIUM");
      setSource((feature.source as any) || "ATLASFIT");
      setFeatured(Boolean(feature.featured));
      setIsCommunityChoice(Boolean(feature.isCommunityChoice));
      setOfficialResponse(feature.officialResponse || "");
      setEstimatedRelease(feature.estimatedRelease || "");
    }
  }, [feature, statuses, categories]);

  if (!feature) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !statusId || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/roadmap/features/${feature.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          statusId,
          categoryId: categoryId === "NONE" ? null : categoryId,
          priority,
          source,
          featured,
          isCommunityChoice,
          officialResponse: officialResponse.trim() || null,
          estimatedRelease: estimatedRelease.trim() || null,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao atualizar funcionalidade");
      }

      toast.success("Card atualizado com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar card.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(feature)} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 sm:p-8">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500 text-[10px] font-black uppercase tracking-[0.2em]">
            <ShieldCheck className="size-4" />
            <span>Painel SuperAdmin</span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight">
            Editar Informações do Card
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Altere os dados, prioridade, categoria e resposta oficial deste item.
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
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="rounded-xl text-xs! resize-none bg-background leading-relaxed"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                Coluna / Status
              </Label>
              <Select value={statusId} onValueChange={setStatusId} disabled={isSubmitting}>
                <SelectTrigger className="rounded-xl h-10 text-xs w-full bg-background">
                  <SelectValue placeholder="Selecione o status" />
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
                  <SelectValue placeholder="Selecione a prioridade" />
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

          {/* Category, Source & Estimated Release */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                placeholder="Ex: Q3 2026, Outubro..."
                value={estimatedRelease}
                onChange={(e) => setEstimatedRelease(e.target.value)}
                disabled={isSubmitting}
                className="rounded-xl h-10 text-xs! bg-background"
              />
            </div>
          </div>

          {/* Feature Toggles: Featured & Community Choice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border/40 bg-secondary/20">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="featured-toggle" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                  <Sparkles className="size-3.5 text-amber-400" />
                  Item em Destaque
                </Label>
                <p className="text-[10px] text-muted-foreground">Destaca visualmente no quadro</p>
              </div>
              <Switch
                id="featured-toggle"
                checked={featured}
                onCheckedChange={setFeatured}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="community-choice-toggle" className="text-xs font-bold cursor-pointer">
                  Escolha da Comunidade
                </Label>
                <p className="text-[10px] text-muted-foreground">Badge especial de votação expressiva</p>
              </div>
              <Switch
                id="community-choice-toggle"
                checked={isCommunityChoice}
                onCheckedChange={setIsCommunityChoice}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Official Response */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[10px] font-mono font-bold uppercase text-primary flex items-center gap-1.5">
              <MessageCircleCode className="size-3.5" />
              Resposta Oficial da Equipe AtlasFit
            </Label>
            <Textarea
              placeholder="Ex: Estamos priorizando o desenvolvimento desta funcionalidade para a próxima sprint..."
              value={officialResponse}
              onChange={(e) => setOfficialResponse(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className="rounded-xl text-xs resize-none border-primary/30 focus:border-primary bg-background leading-relaxed"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t border-border/40">
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
              className="rounded-xl h-10 px-6 font-bold text-xs gap-2 bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-sm transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Save className="size-3.5" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
