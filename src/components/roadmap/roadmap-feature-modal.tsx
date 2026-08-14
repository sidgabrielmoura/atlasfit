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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageSquare, ShieldCheck, Send, Reply, Edit2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";

interface RoadmapFeatureModalProps {
  featureId: string | null;
  onClose: () => void;
  onToggleVote: (featureId: string) => Promise<{ voted: boolean; voteCount: number }>;
}

export function RoadmapFeatureModal({ featureId, onClose, onToggleVote }: RoadmapFeatureModalProps) {
  const { data: session } = useSession();
  const [feature, setFeature] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState("");
  const [isSavingCommentEdit, setIsSavingCommentEdit] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  const currentUserId = session?.user?.id;
  const isSuperAdmin = session?.user?.role === "SUPERADMIN";

  useEffect(() => {
    if (!featureId) {
      setFeature(null);
      return;
    }

    setLoading(true);
    fetch(`/api/roadmap/features/${featureId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao carregar detalhes");
        return res.json();
      })
      .then((data) => {
        setFeature(data);
        setHasVoted(data.userHasVoted);
        setVoteCount(data.voteCount);
      })
      .catch((err) => {
        toast.error(err.message || "Erro ao carregar funcionalidade.");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [featureId, onClose]);

  const handleVote = async () => {
    if (!featureId || isVoting) return;
    const prevVoted = hasVoted;
    const prevCount = voteCount;

    setHasVoted(!prevVoted);
    setVoteCount(prevVoted ? Math.max(0, prevCount - 1) : prevCount + 1);
    setIsVoting(true);

    try {
      const res = await onToggleVote(featureId);
      setHasVoted(res.voted);
      setVoteCount(res.voteCount);
    } catch {
      setHasVoted(prevVoted);
      setVoteCount(prevCount);
      toast.error("Erro ao registrar voto.");
    } finally {
      setIsVoting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !featureId || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const res = await fetch(`/api/roadmap/features/${featureId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText, parentId: replyParentId }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao comentar");
      }

      const data = await res.json();
      toast.success(replyParentId ? "Resposta enviada!" : "Comentário adicionado!");
      setCommentText("");
      setReplyParentId(null);

      // Refresh feature details
      const updatedRes = await fetch(`/api/roadmap/features/${featureId}`);
      if (updatedRes.ok) {
        setFeature(await updatedRes.json());
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao postar comentário.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleSaveEditComment = async (commentId: string) => {
    if (!editCommentText.trim() || isSavingCommentEdit) return;
    setIsSavingCommentEdit(true);
    try {
      const res = await fetch(`/api/roadmap/features/${featureId}/comments`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, content: editCommentText.trim() }),
      });

      if (!res.ok) throw new Error("Erro ao editar comentário");
      toast.success("Comentário atualizado!");
      setEditingCommentId(null);

      const updatedRes = await fetch(`/api/roadmap/features/${featureId}`);
      if (updatedRes.ok) {
        setFeature(await updatedRes.json());
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao editar.");
    } finally {
      setIsSavingCommentEdit(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (isDeletingComment) return;
    setIsDeletingComment(true);
    try {
      const res = await fetch(`/api/roadmap/features/${featureId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Erro ao excluir comentário");
      toast.success("Comentário excluído!");
      setDeletingCommentId(null);

      const updatedRes = await fetch(`/api/roadmap/features/${featureId}`);
      if (updatedRes.ok) {
        setFeature(await updatedRes.json());
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    } finally {
      setIsDeletingComment(false);
    }
  };

  if (!featureId) return null;

  const topLevelComments = feature?.comments?.filter((c: any) => !c.parentId) || [];

  return (
    <Dialog open={Boolean(featureId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto! rounded-xl! p-5 sm:p-6">
        {loading || !feature ? (
          <div className="space-y-3 py-3">
            <Skeleton className="h-5 w-1/4 rounded" />
            <Skeleton className="h-8 w-3/4 rounded" />
            <Skeleton className="h-20 w-full rounded" />
          </div>
        ) : (
          <div className="space-y-5">
            <DialogHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="text-[10px] font-mono uppercase px-2 py-0.5 border-primary/30 text-primary bg-primary/10">
                  {feature.status.name}
                </Badge>
                {feature.category && (
                  <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                    {feature.category.name}
                  </span>
                )}
                {feature.editedAt && (
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      feature.editedBy?.role === "SUPERADMIN" || feature.editedById === "ATLASFIT"
                        ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                        : "border-border/40 text-muted-foreground bg-secondary/40"
                    }`}
                  >
                    {feature.editedBy?.role === "SUPERADMIN" || feature.editedById === "ATLASFIT"
                      ? "editado por AtlasFit"
                      : `editado por ${feature.editedBy?.name ? feature.editedBy.name.split(" ")[0] : "Usuário"}`}
                  </span>
                )}
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                {feature.title}
              </DialogTitle>
            </DialogHeader>

            {/* Author info & Vote CTA */}
            <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <div className="text-xs">
                <p className="font-bold text-foreground">{feature.author?.name || "AtlasFit"}</p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {new Date(feature.createdAt).toLocaleDateString("pt-BR")}
                </p>
              </div>

              <Button
                onClick={handleVote}
                size="sm"
                disabled={isVoting}
                variant={hasVoted ? "default" : "outline"}
                className={`h-8 px-3 rounded text-xs font-mono font-bold gap-1.5 cursor-pointer ${
                  hasVoted ? "bg-primary text-primary-foreground" : "border-border/50 text-foreground"
                }`}
              >
                {isVoting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Heart className={`size-3.5 ${hasVoted ? "fill-current" : ""}`} />
                )}
                <span>{hasVoted ? "Apoiado" : "Apoiar"}</span>
                <span className="opacity-75">({voteCount})</span>
              </Button>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase text-muted-foreground">Descrição</span>
              <p className="text-xs text-foreground/90 font-normal leading-relaxed whitespace-pre-line bg-card/40 p-3 rounded-lg border border-border/30">
                {feature.description}
              </p>
            </div>

            {/* Official Response */}
            {feature.officialResponse && (
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1">
                <div className="flex items-center gap-1.5 text-primary text-[10px] font-mono font-bold uppercase">
                  <ShieldCheck className="size-3.5" />
                  <span>Resposta Oficial AtlasFit</span>
                </div>
                <p className="text-xs font-medium text-foreground leading-relaxed whitespace-pre-line">
                  {feature.officialResponse}
                </p>
              </div>
            )}

            {/* Discussion Thread */}
            <div className="space-y-3 pt-2 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-foreground">
                <MessageSquare className="size-3.5 text-primary" />
                <span>Discussão ({feature.comments?.length || 0})</span>
              </div>

              {/* Comments List */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {topLevelComments.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground italic text-center py-2">Sem comentários ainda. Seja o primeiro!</p>
                ) : (
                  topLevelComments.map((comment: any) => {
                    const replies = feature.comments.filter((c: any) => c.parentId === comment.id);
                    const canEditComment = isSuperAdmin || (currentUserId && comment.authorId === currentUserId);
                    const isCommentEditedByAdmin = comment.editedBy?.role === "SUPERADMIN" || comment.editedById === "ATLASFIT";
                    const commentEditorName = comment.editedBy?.name ? comment.editedBy.name.split(" ")[0] : "Usuário";

                    return (
                      <div key={comment.id} className="space-y-2">
                        {/* Parent Comment */}
                        <div className="p-2.5 rounded-lg bg-secondary/30 border border-border/30 space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{comment.author?.name || "Personal"}</span>
                              {comment.editedAt && (
                                <span
                                  className={`text-[9px] px-1 rounded border ${
                                    isCommentEditedByAdmin
                                      ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                                      : "border-border/40 text-muted-foreground bg-secondary/40"
                                  }`}
                                >
                                  {isCommentEditedByAdmin ? "editado por AtlasFit" : `editado por ${commentEditorName}`}
                                </span>
                              )}
                            </div>
                            <span className="text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString("pt-BR")}</span>
                          </div>

                          {editingCommentId === comment.id ? (
                            <div className="space-y-2 pt-1">
                              <Textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                disabled={isSavingCommentEdit}
                                className="rounded text-xs min-h-[50px]"
                              />
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={isSavingCommentEdit}
                                  onClick={() => setEditingCommentId(null)}
                                  className="h-6 text-[10px]"
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  disabled={isSavingCommentEdit || !editCommentText.trim()}
                                  onClick={() => handleSaveEditComment(comment.id)}
                                  className="h-6 text-[10px] gap-1"
                                >
                                  {isSavingCommentEdit ? (
                                    <>
                                      <Loader2 className="size-2.5 animate-spin" />
                                      <span>Salvando...</span>
                                    </>
                                  ) : (
                                    "Salvar"
                                  )}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-foreground/90 leading-normal">{comment.content}</p>
                          )}

                          {/* Reply / Edit / Delete Controls */}
                          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/20 text-[10px]">
                            <button
                              onClick={() => {
                                setReplyParentId(comment.id);
                                setCommentText(`@${comment.author?.name?.split(" ")[0]} `);
                              }}
                              className="text-primary hover:underline font-bold flex items-center gap-1"
                            >
                              <Reply className="size-2.5" /> Responder
                            </button>
                            {canEditComment && (
                              <button
                                onClick={() => {
                                  setEditingCommentId(comment.id);
                                  setEditCommentText(comment.content);
                                }}
                                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                              >
                                <Edit2 className="size-2.5" /> Editar
                              </button>
                            )}
                            {canEditComment && (
                              <button
                                onClick={() => setDeletingCommentId(comment.id)}
                                className="text-destructive hover:underline flex items-center gap-1"
                              >
                                <Trash2 className="size-2.5" /> Excluir
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Nested Replies */}
                        {replies.length > 0 && (
                          <div className="pl-4 space-y-2 border-l-2 border-primary/20">
                            {replies.map((reply: any) => (
                              <div key={reply.id} className="p-2 rounded bg-card/60 border border-border/20 space-y-0.5 text-xs">
                                <div className="flex items-center justify-between text-[9px] font-mono">
                                  <span className="font-bold text-foreground">{reply.author?.name || "Personal"}</span>
                                  <span className="text-muted-foreground">{new Date(reply.createdAt).toLocaleDateString("pt-BR")}</span>
                                </div>
                                <p className="text-xs text-foreground/90">{reply.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Comment / Reply Form */}
              <form onSubmit={handleAddComment} className="space-y-2 pt-1">
                {replyParentId && (
                  <div className="flex items-center justify-between text-[10px] font-mono bg-primary/10 text-primary p-1.5 rounded">
                    <span>Respondendo a um comentário</span>
                    <button type="button" onClick={() => setReplyParentId(null)} className="underline">
                      Cancelar resposta
                    </button>
                  </div>
                )}
                <Textarea
                  placeholder={replyParentId ? "Escreva sua resposta..." : "Escreva seu comentário..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={isSubmittingComment}
                  className="rounded-lg text-xs min-h-15 resize-none"
                />
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="rounded h-8 px-3 text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    {isSubmittingComment ? (
                      <>
                        <Loader2 className="size-3 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="size-3" />
                        <span>{replyParentId ? "Responder" : "Comentar"}</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DialogContent>

      <AlertDialog open={Boolean(deletingCommentId)} onOpenChange={(open) => !open && !isDeletingComment && setDeletingCommentId(null)}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Comentário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação removerá o comentário permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingComment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingCommentId) {
                  handleDeleteComment(deletingCommentId);
                }
              }}
              disabled={isDeletingComment}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeletingComment ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </span>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
