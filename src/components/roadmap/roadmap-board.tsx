"use client";

import React, { useState } from "react";
import { FeatureCardData, RoadmapCard, StatusOption } from "./roadmap-card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Inbox,
  MoreVertical,
  Edit2,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Trash2,
  Lock,
  Columns3,
} from "lucide-react";

interface RoadmapBoardProps {
  statuses: StatusOption[];
  features: FeatureCardData[];
  currentUserId?: string;
  onOpenDetails: (featureId: string) => void;
  onToggleVote: (featureId: string) => Promise<{ voted: boolean; voteCount: number }>;
  onOpenSuggestModal: () => void;
  isSuperAdmin?: boolean;
  onAdminEdit?: (feature: FeatureCardData) => void;
  onAdminMerge?: (feature: FeatureCardData) => void;
  onAdminDelete?: (featureId: string) => Promise<void> | void;
  onAdminDuplicate?: (featureId: string) => Promise<void> | void;
  onAdminQuickMoveStatus?: (featureId: string, targetStatusId: string) => Promise<void> | void;
  onAdminMovePosition?: (featureId: string, position: "TOP" | "BOTTOM") => Promise<void> | void;
  onAdminStatusChange?: (featureId: string, targetStatusId: string, newRank: number) => Promise<void>;
  onAdminAddInColumn?: (statusId: string) => void;
  onAdminCreateStatus?: () => void;
  onAdminEditStatus?: (status: StatusOption) => void;
  onAdminDeleteStatus?: (status: StatusOption, cardCount: number) => void;
  onAdminMoveAllCards?: (status: StatusOption, cardCount: number) => void;
  onAdminReorderStatus?: (statusId: string, direction: "LEFT" | "RIGHT") => void;
  onTrainerEdit?: (feature: FeatureCardData) => void;
  onTrainerDelete?: (featureId: string) => Promise<void> | void;
}

export function RoadmapBoard({
  statuses,
  features,
  currentUserId,
  onOpenDetails,
  onToggleVote,
  onOpenSuggestModal,
  isSuperAdmin,
  onAdminEdit,
  onAdminMerge,
  onAdminDelete,
  onAdminDuplicate,
  onAdminQuickMoveStatus,
  onAdminMovePosition,
  onAdminStatusChange,
  onAdminAddInColumn,
  onAdminCreateStatus,
  onAdminEditStatus,
  onAdminDeleteStatus,
  onAdminMoveAllCards,
  onAdminReorderStatus,
  onTrainerEdit,
  onTrainerDelete,
}: RoadmapBoardProps) {
  const [activeTab, setActiveTab] = useState(statuses[0]?.id || "");
  const [dragOverStatusId, setDragOverStatusId] = useState<string | null>(null);

  const getFeaturesByStatus = (statusId: string) => {
    return features.filter((f) => f.status.id === statusId);
  };

  const handleDragOver = (e: React.DragEvent, statusId: string) => {
    if (!isSuperAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatusId(statusId);
  };

  const handleDragLeave = () => {
    setDragOverStatusId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatusId: string) => {
    if (!isSuperAdmin || !onAdminStatusChange) return;
    e.preventDefault();
    setDragOverStatusId(null);

    const rawData = e.dataTransfer.getData("text/plain");
    if (!rawData) return;

    try {
      const { featureId, currentStatusId } = JSON.parse(rawData);
      if (!featureId || currentStatusId === targetStatusId) return;

      const targetFeatures = getFeaturesByStatus(targetStatusId);
      const lastRank = targetFeatures.length > 0 ? Math.max(...targetFeatures.map((f: any) => f.rank || 0)) : 0;
      const newRank = lastRank + 1000;

      await onAdminStatusChange(featureId, targetStatusId, newRank);
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  return (
    <div className="space-y-4">
      {/* MOBILE VIEW: Compact Segmented Tabs */}
      <div className="block lg:hidden space-y-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <Tabs value={activeTab || statuses[0]?.id} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center gap-2">
              <TabsList className="flex-1 grid grid-flow-col auto-cols-fr rounded-xl p-1 bg-secondary/40 h-10 overflow-x-auto">
                {statuses.map((status) => {
                  const count = getFeaturesByStatus(status.id).length;
                  return (
                    <TabsTrigger
                      key={status.id}
                      value={status.id}
                      className="rounded-lg font-mono font-bold text-[10px] uppercase gap-1 data-[state=active]:bg-background data-[state=active]:shadow-xs transition-all px-2.5"
                    >
                      <span className="truncate">{status.name.split(" ")[0]}</span>
                      <span className="text-[9px] opacity-60">({count})</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {isSuperAdmin && onAdminCreateStatus && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onAdminCreateStatus}
                  title="Criar nova coluna"
                  className="size-10 shrink-0 rounded-xl border-dashed border-border/60 hover:border-primary/60 cursor-pointer"
                >
                  <Plus className="size-4 text-primary" />
                </Button>
              )}
            </div>

            {statuses.map((status, index) => {
              const columnFeatures = getFeaturesByStatus(status.id);
              return (
                <TabsContent
                  key={status.id}
                  value={status.id}
                  onDragOver={(e) => handleDragOver(e, status.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, status.id)}
                  className={`pt-3 space-y-2.5 rounded-xl transition-colors ${dragOverStatusId === status.id ? "bg-primary/5 ring-2 ring-primary/40 p-2" : ""
                    }`}
                >
                  {/* Column header actions for mobile */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-card/40 border border-border/40">
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: status.color || "#888" }}
                        />
                        <span className="font-bold text-xs">{status.name}</span>
                        {(status as any).isPublic === false && (
                          <span className="text-[9px] font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Lock className="size-2.5" /> Interna
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {onAdminAddInColumn && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onAdminAddInColumn(status.id)}
                            className="h-7 px-2 text-[11px] font-mono font-bold gap-1 text-primary cursor-pointer"
                          >
                            <Plus className="size-3" />
                            Card
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 rounded-lg">
                              <MoreVertical className="size-3.5 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-xl border border-border/60">
                            {onAdminEditStatus && (
                              <DropdownMenuItem
                                onClick={() => onAdminEditStatus(status)}
                                className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                              >
                                <Edit2 className="size-3.5 text-amber-500" />
                                Editar Coluna
                              </DropdownMenuItem>
                            )}
                            {onAdminMoveAllCards && columnFeatures.length > 0 && (
                              <DropdownMenuItem
                                onClick={() => onAdminMoveAllCards(status, columnFeatures.length)}
                                className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                              >
                                <ArrowRightLeft className="size-3.5 text-blue-500" />
                                Mover Todos os Cards ({columnFeatures.length})
                              </DropdownMenuItem>
                            )}
                            {onAdminReorderStatus && (
                              <>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem
                                  disabled={index === 0}
                                  onClick={() => onAdminReorderStatus(status.id, "LEFT")}
                                  className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                                >
                                  <ArrowLeft className="size-3.5" />
                                  Mover para Esquerda
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={index === statuses.length - 1}
                                  onClick={() => onAdminReorderStatus(status.id, "RIGHT")}
                                  className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                                >
                                  <ArrowRight className="size-3.5" />
                                  Mover para Direita
                                </DropdownMenuItem>
                              </>
                            )}
                            {onAdminDeleteStatus && (
                              <>
                                <DropdownMenuSeparator className="my-1" />
                                <DropdownMenuItem
                                  onClick={() => onAdminDeleteStatus(status, columnFeatures.length)}
                                  className="text-xs font-medium gap-2 text-rose-500 hover:text-rose-600 focus:text-rose-600 rounded-lg py-1.5 cursor-pointer"
                                >
                                  <Trash2 className="size-3.5" />
                                  Excluir Coluna
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}

                  {columnFeatures.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-border/40 rounded-xl space-y-2 bg-card/20">
                      <Inbox className="size-5 mx-auto text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground font-mono">Sem itens nesta coluna.</p>
                    </div>
                  ) : (
                    columnFeatures.map((feature) => (
                      <RoadmapCard
                        key={feature.id}
                        feature={feature}
                        statuses={statuses}
                        currentUserId={currentUserId}
                        onOpenDetails={onOpenDetails}
                        onToggleVote={onToggleVote}
                        isSuperAdmin={isSuperAdmin}
                        onAdminEdit={onAdminEdit}
                        onAdminMerge={onAdminMerge}
                        onAdminDelete={onAdminDelete}
                        onAdminDuplicate={onAdminDuplicate}
                        onAdminQuickMoveStatus={onAdminQuickMoveStatus}
                        onAdminMovePosition={onAdminMovePosition}
                        onTrainerEdit={onTrainerEdit}
                        onTrainerDelete={onTrainerDelete}
                      />
                    ))
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>

      <div className="hidden lg:flex max-w-300! mx-auto gap-4 items-start overflow-x-auto! pb-4">
        {statuses.map((status, index) => {
          const columnFeatures = getFeaturesByStatus(status.id);
          const isDraggingOver = dragOverStatusId === status.id;

          return (
            <div
              key={status.id}
              onDragOver={(e) => handleDragOver(e, status.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status.id)}
              className={`space-y-3 p-3.5 rounded-2xl border transition-all duration-200 min-w-80 min-h-130 flex flex-col ${isDraggingOver
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border/40 bg-card/20"
                }`}
            >
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: status.color || "#888" }}
                  />
                  <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-foreground truncate">
                    {status.name}
                  </h3>
                  {(status as any).isPublic === false && (
                    <span title="Coluna interna visível apenas para superadmin">
                      <Lock className="size-3 text-amber-500 shrink-0" />
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-md">
                    {columnFeatures.length}
                  </span>

                  {isSuperAdmin && (
                    <>
                      {onAdminAddInColumn && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onAdminAddInColumn(status.id)}
                          title={`Adicionar card em ${status.name}`}
                          className="size-6 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Opções da coluna"
                            className="size-6 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <MoreVertical className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-54 rounded-xl p-1.5 shadow-xl border border-border/60">
                          {onAdminEditStatus && (
                            <DropdownMenuItem
                              onClick={() => onAdminEditStatus(status)}
                              className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                            >
                              <Edit2 className="size-3.5 text-amber-500" />
                              Editar Coluna
                            </DropdownMenuItem>
                          )}

                          {onAdminMoveAllCards && columnFeatures.length > 0 && (
                            <DropdownMenuItem
                              onClick={() => onAdminMoveAllCards(status, columnFeatures.length)}
                              className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                            >
                              <ArrowRightLeft className="size-3.5 text-blue-500" />
                              Mover Todos os Cards ({columnFeatures.length})
                            </DropdownMenuItem>
                          )}

                          {onAdminReorderStatus && (
                            <>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem
                                disabled={index === 0}
                                onClick={() => onAdminReorderStatus(status.id, "LEFT")}
                                className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                              >
                                <ArrowLeft className="size-3.5 text-muted-foreground" />
                                Mover para a Esquerda
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={index === statuses.length - 1}
                                onClick={() => onAdminReorderStatus(status.id, "RIGHT")}
                                className="text-xs font-medium gap-2 rounded-lg py-1.5 cursor-pointer"
                              >
                                <ArrowRight className="size-3.5 text-muted-foreground" />
                                Mover para a Direita
                              </DropdownMenuItem>
                            </>
                          )}

                          {onAdminDeleteStatus && (
                            <>
                              <DropdownMenuSeparator className="my-1" />
                              <DropdownMenuItem
                                onClick={() => onAdminDeleteStatus(status, columnFeatures.length)}
                                className="text-xs font-medium gap-2 text-rose-500 hover:text-rose-600 focus:text-rose-600 rounded-lg py-1.5 cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                                Excluir Coluna
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2.5 flex-1">
                {columnFeatures.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border/30 rounded-xl space-y-1.5 bg-card/10 my-auto">
                    <Inbox className="size-4 mx-auto text-muted-foreground/30" />
                    <p className="text-[11px] text-muted-foreground font-mono">Sem itens nesta coluna</p>
                    {isSuperAdmin && onAdminAddInColumn && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => onAdminAddInColumn(status.id)}
                        className="text-xs text-primary font-mono h-auto p-0 cursor-pointer"
                      >
                        + Criar primeiro card
                      </Button>
                    )}
                  </div>
                ) : (
                  columnFeatures.map((feature) => (
                    <RoadmapCard
                      key={feature.id}
                      feature={feature}
                      statuses={statuses}
                      currentUserId={currentUserId}
                      onOpenDetails={onOpenDetails}
                      onToggleVote={onToggleVote}
                      isSuperAdmin={isSuperAdmin}
                      onAdminEdit={onAdminEdit}
                      onAdminMerge={onAdminMerge}
                      onAdminDelete={onAdminDelete}
                      onAdminDuplicate={onAdminDuplicate}
                      onAdminQuickMoveStatus={onAdminQuickMoveStatus}
                      onAdminMovePosition={onAdminMovePosition}
                      onTrainerEdit={onTrainerEdit}
                      onTrainerDelete={onTrainerDelete}
                    />
                  ))
                )}
              </div>

              {isSuperAdmin && onAdminAddInColumn && columnFeatures.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAdminAddInColumn(status.id)}
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-secondary/60 text-xs font-mono font-medium gap-1.5 h-8 rounded-xl px-2.5 cursor-pointer"
                >
                  <Plus className="size-3 text-primary" />
                  <span>Adicionar card</span>
                </Button>
              )}
            </div>
          );
        })}

        {isSuperAdmin && onAdminCreateStatus && (
          <button
            type="button"
            onClick={onAdminCreateStatus}
            className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-border/40 hover:border-primary/60 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground min-h-[520px] w-full min-w-[260px] cursor-pointer group"
          >
            <div className="size-10 rounded-xl bg-secondary/60 group-hover:bg-primary/10 group-hover:text-primary flex items-center justify-center transition-colors">
              <Plus className="size-5" />
            </div>
            <span className="font-mono font-bold text-xs uppercase tracking-wider">Nova Coluna</span>
            <p className="text-[10px] text-muted-foreground text-center font-mono">
              Adicionar nova etapa ao fluxo
            </p>
          </button>
        )}
      </div>
    </div>
  );
}
