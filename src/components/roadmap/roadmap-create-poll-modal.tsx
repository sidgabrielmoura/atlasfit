"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Flame, Trash2, Lock, RefreshCw, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoadmapCreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoadmapCreatePollModal({ isOpen, onClose, onSuccess }: RoadmapCreatePollModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [allowVoteChange, setAllowVoteChange] = useState<boolean>(true);
  const [endsAt, setEndsAt] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddOption = () => {
    if (options.length < 5) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const next = [...options];
    next[index] = value;
    setOptions(next);
  };

  const applyPresetHours = (hours: number) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    const isoStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEndsAt(isoStr);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!title.trim() || validOptions.length < 2 || isSubmitting) {
      toast.error("Preencha a pergunta e pelo menos 2 opções.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/roadmap/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          allowVoteChange,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          options: validOptions,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Erro ao criar enquete");
      }

      toast.success("Enquete criada e ativada com sucesso!");
      setTitle("");
      setDescription("");
      setOptions(["", ""]);
      setAllowVoteChange(true);
      setEndsAt("");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar enquete.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md rounded-xl! overflow-auto! p-5 sm:p-6">
        <DialogHeader className="space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-1">
            <Flame className="size-3" /> Gestão de Enquetes
          </span>
          <DialogTitle className="text-lg font-bold tracking-tight">Criar Enquete Oficial</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          <div className="space-y-1">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Pergunta da Enquete</Label>
            <Input
              required
              placeholder="Ex: Qual funcionalidade devemos lançar primeiro?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg h-9 text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Descrição (Opcional)</Label>
            <Textarea
              placeholder="Breve explicação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg text-xs min-h-[50px] resize-none"
            />
          </div>

          {/* Date Limite / Deadline Input */}
          <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/30">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="size-3.5 text-primary" />
                <span>Data Limite de Votação (Opcional)</span>
              </Label>
              {endsAt && (
                <button type="button" onClick={() => setEndsAt("")} className="text-[10px] font-mono text-muted-foreground hover:underline">
                  Limpar
                </button>
              )}
            </div>

            <Input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="rounded-lg h-9 text-xs font-mono bg-background"
            />

            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[9px] font-mono text-muted-foreground">Atalhos:</span>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPresetHours(24)} className="h-5 text-[9px] font-mono px-1.5">
                +24h
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPresetHours(72)} className="h-5 text-[9px] font-mono px-1.5">
                +3 dias
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => applyPresetHours(168)} className="h-5 text-[9px] font-mono px-1.5">
                +7 dias
              </Button>
            </div>
          </div>

          {/* Configuração de troca de voto */}
          <div className="p-3 rounded-lg bg-secondary/40 border border-border/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  {allowVoteChange ? <RefreshCw className="size-3 text-primary" /> : <Lock className="size-3 text-muted-foreground" />}
                  <span>{allowVoteChange ? "Permitir alterar voto" : "Voto único / definitivo"}</span>
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  {allowVoteChange
                    ? "O personal trainer poderá trocar seu voto entre as opções."
                    : "O voto é único. Após votar, todas as opções ficam bloqueadas."}
                </p>
              </div>

              <Switch
                checked={allowVoteChange}
                onCheckedChange={setAllowVoteChange}
              />
            </div>
          </div>

          {/* Opções */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Opções de Voto</Label>
              {options.length < 5 && (
                <Button type="button" variant="ghost" size="sm" onClick={handleAddOption} className="text-xs font-bold text-primary h-6 px-2">
                  + Opção
                </Button>
              )}
            </div>

            {options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  required
                  placeholder={`Opção ${idx + 1}`}
                  value={opt}
                  onChange={(e) => handleOptionChange(idx, e.target.value)}
                  className="rounded-lg h-9 text-xs"
                />
                {options.length > 2 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveOption(idx)} className="size-8 rounded text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded text-xs font-medium">
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded h-9 px-4 text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Publicando...</span>
                </>
              ) : (
                "Publicar Enquete"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
