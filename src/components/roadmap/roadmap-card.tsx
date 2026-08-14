"use client";

import React, { useState, useEffect } from "react";
import {
  Heart,
  MessageSquare,
  MoreVertical,
  ShieldCheck,
  Merge,
  Trash2,
  GripVertical,
  Edit3,
  Copy,
  ArrowUpToLine,
  ArrowDownToLine,
  ArrowRightLeft,
  Sparkles,
  Calendar,
  Layers,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
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
import { RoadmapFacepile } from "./roadmap-facepile";
import { toast } from "sonner";

export interface StatusOption {
  id: string;
  name: string;
  color: string;
  slug: string;
}

export interface FeatureCardData {
  id: string;
  title: string;
  slug: string;
  description: string;
  voteCount: number;
  commentCount: number;
  userHasVoted: boolean;
  source: string;
  authorId?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" | string | null;
  featured?: boolean;
  isCommunityChoice?: boolean;
  officialResponse?: string | null;
  estimatedRelease?: string | null;
  createdAt: string;
  editedAt?: string | null;
  editedById?: string | null;
  editedBy?: { id: string; name?: string | null; role?: string } | null;
  category?: { name: string; icon?: string | null } | null;
  status: { id: string; name: string; color: string; slug: string };
  author?: { id?: string; name?: string | null } | null;
  recentInteractors?: Array<{ id: string; name?: string | null; image?: string | null }>;
}

interface RoadmapCardProps {
  feature: FeatureCardData;
  statuses?: StatusOption[];
  currentUserId?: string;
  onOpenDetails: (featureId: string) => void;
  onToggleVote: (featureId: string) => Promise<{ voted: boolean; voteCount: number }>;
  isSuperAdmin?: boolean;
  onAdminEdit?: (feature: FeatureCardData) => void;
  onAdminMerge?: (feature: FeatureCardData) => void;
  onAdminDelete?: (featureId: string) => Promise<void> | void;
  onAdminDuplicate?: (featureId: string) => Promise<void> | void;
  onAdminQuickMoveStatus?: (featureId: string, targetStatusId: string) => Promise<void> | void;
  onAdminMovePosition?: (featureId: string, position: "TOP" | "BOTTOM") => Promise<void> | void;
  onTrainerEdit?: (feature: FeatureCardData) => void;
  onTrainerDelete?: (featureId: string) => Promise<void> | void;
}

export function RoadmapCard({
  feature,
  statuses = [],
  currentUserId,
  onOpenDetails,
  onToggleVote,
  isSuperAdmin,
  onAdminEdit,
  onAdminMerge,
  onAdminDelete,
  onAdminDuplicate,
  onAdminQuickMoveStatus,
  onAdminMovePosition,
  onTrainerEdit,
  onTrainerDelete,
}: RoadmapCardProps) {
  const [hasVoted, setHasVoted] = useState(feature.userHasVoted);
  const [voteCount, setVoteCount] = useState(feature.voteCount);
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setHasVoted(feature.userHasVoted);
    setVoteCount(feature.voteCount);
  }, [feature.userHasVoted, feature.voteCount]);

  const isAuthor = Boolean(currentUserId && (feature.authorId === currentUserId || feature.author?.id === currentUserId));
  const canTrainerEdit = isAuthor && voteCount === 0;

  const isEditedByAdmin = feature.editedBy?.role === "SUPERADMIN" || feature.editedById === "ATLASFIT";
  const editorName = feature.editedBy?.name ? feature.editedBy.name.split(" ")[0] : "Usuário";

  const handleVoteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isVoting) return;

    const previousVoted = hasVoted;
    const previousCount = voteCount;

    setHasVoted(!previousVoted);
    setVoteCount(previousVoted ? Math.max(0, previousCount - 1) : previousCount + 1);
    setIsVoting(true);

    try {
      const result = await onToggleVote(feature.id);
      setHasVoted(result.voted);
      setVoteCount(result.voteCount);
    } catch {
      setHasVoted(previousVoted);
      setVoteCount(previousCount);
      toast.error("Erro ao registrar voto.");
    } finally {
      setIsVoting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isSuperAdmin) return;
    e.dataTransfer.setData("text/plain", JSON.stringify({ featureId: feature.id, currentStatusId: feature.status.id }));
    e.dataTransfer.effectAllowed = "move";
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (isSuperAdmin && onAdminDelete) {
        await onAdminDelete(feature.id);
      } else if (isAuthor && onTrainerDelete) {
        await onTrainerDelete(feature.id);
      }
      setIsDeleteAlertOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Priority color styling
  const getPriorityBadge = (priority?: string | null) => {
    if (!priority) return null;
    switch (priority.toUpperCase()) {
      case "URGENT":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-rose-500 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
            Urgente
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Alta
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-medium uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
            Média
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center gap-1 text-[9px] font-mono font-medium uppercase text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
            Baixa
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Card
        draggable={isSuperAdmin}
        onDragStart={handleDragStart}
        onClick={() => onOpenDetails(feature.id)}
        className="group relative border border-border/40 bg-card/40 hover:bg-card/80 p-3.5 sm:p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between space-y-3 rounded-xl hover:border-primary/40 shadow-xs hover:shadow-md"
      >
        <div className="space-y-2.5">
          {/* Top Bar: Grip, Categories & Badges, Actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5 overflow-hidden">
              {isSuperAdmin && (
                <GripVertical className="size-3.5 text-muted-foreground/40 shrink-0 cursor-grab active:cursor-grabbing hover:text-foreground transition-colors" />
              )}

              {/* Priority badge */}
              {getPriorityBadge(feature.priority)}

              {/* Featured Badge */}
              {feature.featured && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold uppercase text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">
                  Destaque
                </span>
              )}

              {/* Category */}
              {feature.category && (
                <span className="text-[10px] font-mono font-medium uppercase text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded">
                  {feature.category.name}
                </span>
              )}

              {/* Community choice */}
              {feature.isCommunityChoice && (
                <span className="text-[10px] font-mono font-bold uppercase text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
                  Comunidade
                </span>
              )}

              {/* Estimated release */}
              {feature.estimatedRelease && (
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-muted-foreground bg-secondary/60 border border-border/40 px-1.5 py-0.5 rounded">
                  <Calendar className="size-2.5 opacity-70" />
                  {feature.estimatedRelease}
                </span>
              )}

              {/* Edited badge */}
              {feature.editedAt && (
                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${isEditedByAdmin
                      ? "border-blue-500/30 text-blue-400 bg-blue-500/10"
                      : "border-border/40 text-muted-foreground bg-secondary/40"
                    }`}
                >
                  {isEditedByAdmin ? "editado por AtlasFit" : `editado por ${editorName}`}
                </span>
              )}
            </div>

            {/* Action Menu */}
            {(isSuperAdmin || isAuthor) && (
              <div onClick={(e) => e.stopPropagation()} className="shrink-0 -mt-1 -mr-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="size-7 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
                      <MoreVertical className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-xl border border-border/60">
                    {isSuperAdmin && (
                      <>
                        {/* Submenu: Transfer to another column */}
                        {statuses && statuses.length > 0 && onAdminQuickMoveStatus && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer">
                              <ArrowRightLeft className="size-3.5 text-blue-400" />
                              Mover para coluna
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-48 rounded-xl p-1.5 shadow-xl border border-border/60">
                              {statuses
                                .filter((s) => s.id !== feature.status.id)
                                .map((s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={() => onAdminQuickMoveStatus(feature.id, s.id)}
                                    className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                                  >
                                    <span
                                      className="size-2 rounded-full shrink-0"
                                      style={{ backgroundColor: s.color || "#888" }}
                                    />
                                    <span className="truncate">{s.name}</span>
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}

                        {/* Move position: Top or Bottom */}
                        {onAdminMovePosition && (
                          <>
                            <DropdownMenuItem
                              onClick={() => onAdminMovePosition(feature.id, "TOP")}
                              className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                            >
                              <ArrowUpToLine className="size-3.5 text-muted-foreground" />
                              Mover para o Topo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onAdminMovePosition(feature.id, "BOTTOM")}
                              className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                            >
                              <ArrowDownToLine className="size-3.5 text-muted-foreground" />
                              Mover para a Base
                            </DropdownMenuItem>
                          </>
                        )}

                        <DropdownMenuSeparator className="my-1" />

                        {/* Edit Details */}
                        {onAdminEdit && (
                          <DropdownMenuItem
                            onClick={() => onAdminEdit(feature)}
                            className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                          >
                            <Edit3 className="size-3.5 text-amber-500" />
                            Editar Detalhes
                          </DropdownMenuItem>
                        )}

                        {/* Duplicate */}
                        {onAdminDuplicate && (
                          <DropdownMenuItem
                            onClick={() => onAdminDuplicate(feature.id)}
                            className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                          >
                            <Copy className="size-3.5 text-blue-500" />
                            Duplicar Card
                          </DropdownMenuItem>
                        )}

                        {/* Merge Duplicate */}
                        {onAdminMerge && (
                          <DropdownMenuItem
                            onClick={() => onAdminMerge(feature)}
                            className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                          >
                            <Merge className="size-3.5 text-purple-500" />
                            Mesclar Duplicada
                          </DropdownMenuItem>
                        )}
                      </>
                    )}

                    {!isSuperAdmin && onTrainerEdit && (
                      <DropdownMenuItem
                        disabled={!canTrainerEdit}
                        onClick={() => canTrainerEdit && onTrainerEdit(feature)}
                        className={`text-xs font-medium gap-2 rounded-lg py-1.5 ${!canTrainerEdit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                          }`}
                      >
                        <Edit3 className="size-3.5" />
                        {canTrainerEdit ? "Editar Sugestão" : "Bloqueado (com votos)"}
                      </DropdownMenuItem>
                    )}

                    {((isSuperAdmin && onAdminDelete) || (isAuthor && onTrainerDelete)) && (
                      <>
                        <DropdownMenuSeparator className="my-1" />
                        <DropdownMenuItem
                          onClick={() => setIsDeleteAlertOpen(true)}
                          className="text-xs font-medium gap-2 text-rose-500 hover:text-rose-600 focus:text-rose-600 rounded-lg py-1.5 cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          Excluir Card
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          {/* Title & Description */}
          <div className="space-y-1">
            <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
              {feature.title}
            </h3>
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>

        {/* Footer / Author & Overlapping Avatars & Instant Vote */}
        <div className="pt-2 border-t border-border/30 flex items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 min-w-0">
            <RoadmapFacepile interactors={feature.recentInteractors} />
            <span className="text-muted-foreground font-mono text-[10px] truncate">
              {feature.author?.name ? feature.author.name.split(" ")[0] : "AtlasFit"}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {feature.commentCount > 0 && (
              <div className="flex items-center gap-1 font-mono text-muted-foreground text-[10px]">
                <MessageSquare className="size-3" />
                <span>{feature.commentCount}</span>
              </div>
            )}

            <Button
              size="sm"
              onClick={handleVoteClick}
              disabled={isVoting}
              variant={hasVoted ? "default" : "outline"}
              className={`h-7 px-2.5 rounded-lg text-[11px] font-mono font-bold gap-1 transition-all ${hasVoted
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "border-border/50 hover:border-primary/50 text-foreground"
                }`}
            >
              <Heart className={`size-3 ${hasVoted ? "fill-current text-primary-foreground" : ""}`} />
              <span>{voteCount}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* AlertDialog Confirmation for Deleting Card */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="sm:max-w-md rounded-2xl p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">Excluir Card do Roadmap?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Você está prestes a remover o card <strong className="text-foreground">&quot;{feature.title}&quot;</strong>. Essa ação arquivará o item e removerá do quadro público da comunidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
            >
              {isDeleting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Excluindo...</span>
                </span>
              ) : (
                "Excluir Definitivamente"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
