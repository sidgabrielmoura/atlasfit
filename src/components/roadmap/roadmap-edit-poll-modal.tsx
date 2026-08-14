"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Edit3, Clock, RefreshCw, Lock, Power, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface RoadmapEditPollModalProps {
  poll: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RoadmapEditPollModal({ poll, onClose, onSuccess }: RoadmapEditPollModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [allowVoteChange, setAllowVoteChange] = useState<boolean>(true);
  const [endsAt, setEndsAt] = useState<string>("");
  const [status, setStatus] = useState<string>("ACTIVE");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // AlertDialog Confirmation States
  const [isCloseAlertOpen, setIsCloseAlertOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  useEffect(() => {
    if (poll) {
      setTitle(poll.title || "");
      setDescription(poll.description || "");
      setAllowVoteChange(poll.allowVoteChange ?? true);
      setStatus(poll.status || "ACTIVE");
      if (poll.endsAt) {
        const iso = new Date(new Date(poll.endsAt).getTime() - new Date(poll.endsAt).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setEndsAt(iso);
      } else {
        setEndsAt("");
      }
    }
  }, [poll]);

  if (!poll) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/roadmap/polls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: poll.id,
          title: title.trim(),
          description: description.trim() || null,
          allowVoteChange,
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          status,
        }),
      });

      if (!res.ok) throw new Error("Erro ao atualizar enquete");

      toast.success("Enquete atualizada com sucesso!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmClosePoll = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/roadmap/polls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, status: "CLOSED" }),
      });
      if (!res.ok) throw new Error("Erro ao encerrar enquete");
      toast.success("Enquete encerrada!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao encerrar.");
    } finally {
      setIsSubmitting(false);
      setIsCloseAlertOpen(false);
    }
  };

  const confirmDeletePoll = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/roadmap/polls?pollId=${poll.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir enquete");
      toast.success("Enquete excluída!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    } finally {
      setIsSubmitting(false);
      setIsDeleteAlertOpen(false);
    }
  };

  return (
    <>
      <Dialog open={Boolean(poll)} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-md rounded-xl! p-5 sm:p-6">
          <DialogHeader className="space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary flex items-center gap-1">
              <Edit3 className="size-3" /> Gestão Superadmin
            </span>
            <DialogTitle className="text-lg font-bold tracking-tight">Editar / Gerenciar Enquete</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Pergunta</Label>
              <Input
                required
                placeholder="Pergunta da enquete..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg h-9 text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Descrição</Label>
              <Textarea
                placeholder="Breve explicação..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-lg text-xs min-h-[50px] resize-none"
              />
            </div>

            <div className="space-y-1.5 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  <span>Data Limite de Votação</span>
                </Label>
                {endsAt && (
                  <button type="button" onClick={() => setEndsAt("")} className="text-[10px] font-mono text-muted-foreground hover:underline">
                    Remover data limite
                  </button>
                )}
              </div>

              <Input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="rounded-lg h-9 text-xs font-mono bg-background"
              />
            </div>

            <div className="p-3 rounded-lg bg-secondary/40 border border-border/40 space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    {allowVoteChange ? <RefreshCw className="size-3 text-primary" /> : <Lock className="size-3 text-muted-foreground" />}
                    <span>{allowVoteChange ? "Permitir alterar voto" : "Voto único / definitivo"}</span>
                  </Label>
                </div>

                <Switch
                  checked={allowVoteChange}
                  onCheckedChange={setAllowVoteChange}
                />
              </div>
            </div>

            {/* Quick Superadmin Actions (Encerrar / Deletar) */}
            <div className="pt-2 border-t border-border/30 flex items-center justify-between">
              <div className="flex gap-1.5">
                {poll.status === "ACTIVE" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCloseAlertOpen(true)}
                    className="h-8 text-xs font-bold text-muted-foreground border-border/40 hover:text-foreground gap-1"
                  >
                    <Power className="size-3" /> Encerrar Agora
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDeleteAlertOpen(true)}
                  className="h-8 text-xs font-bold text-destructive border-destructive/30 bg-destructive/10 hover:bg-destructive/20 gap-1"
                >
                  <Trash2 className="size-3" /> Excluir
                </Button>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded text-xs font-medium">
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded h-8 px-3 text-xs font-bold gap-1.5 bg-primary text-primary-foreground cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-3 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog for Close Confirmation */}
      <AlertDialog open={isCloseAlertOpen} onOpenChange={(open) => !open && !isSubmitting && setIsCloseAlertOpen(false)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar Votação?</AlertDialogTitle>
            <AlertDialogDescription>
              A enquete será encerrada e a opção mais votada será consolidada como a Decisão da Comunidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClosePoll}
              disabled={isSubmitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Encerrando...</span>
                </span>
              ) : (
                "Encerrar Agora"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog for Delete Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={(open) => !open && !isSubmitting && setIsDeleteAlertOpen(false)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Enquete?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação é irreversível e excluirá permanentemente a enquete e todos os votos registrados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeletePoll}
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </span>
              ) : (
                "Excluir Permanentemente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
