"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RoadmapHeader } from "@/components/roadmap/roadmap-header";
import { RoadmapPoll } from "@/components/roadmap/roadmap-poll";
import { RoadmapPastDecisions } from "@/components/roadmap/roadmap-past-decisions";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { FeatureCardData, StatusOption } from "@/components/roadmap/roadmap-card";
import { RoadmapFeatureModal } from "@/components/roadmap/roadmap-feature-modal";
import { RoadmapSuggestModal } from "@/components/roadmap/roadmap-suggest-modal";
import { RoadmapMySuggestionsModal } from "@/components/roadmap/roadmap-my-suggestions-modal";
import { RoadmapCreateFeatureModal } from "@/components/roadmap/roadmap-create-feature-modal";
import { RoadmapCreatePollModal } from "@/components/roadmap/roadmap-create-poll-modal";
import { RoadmapEditPollModal } from "@/components/roadmap/roadmap-edit-poll-modal";
import { RoadmapEditFeatureModal } from "@/components/roadmap/roadmap-edit-feature-modal";
import { RoadmapMergeModal } from "@/components/roadmap/roadmap-merge-modal";
import { RoadmapMetricsModal } from "@/components/roadmap/roadmap-metrics-modal";
import { RoadmapCreateStatusModal } from "@/components/roadmap/roadmap-create-status-modal";
import { RoadmapEditStatusModal } from "@/components/roadmap/roadmap-edit-status-modal";
import { RoadmapDeleteStatusModal } from "@/components/roadmap/roadmap-delete-status-modal";
import { RoadmapMoveAllCardsModal } from "@/components/roadmap/roadmap-move-all-cards-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAbly } from "@/providers/ably-provider";
import { useSession } from "next-auth/react";

export default function SuperAdminRoadmapPage() {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [data, setData] = useState<{
    statuses: any[];
    categories: any[];
    features: any[];
    stats: { totalIdeas: number; totalVotes: number; totalReleased: number };
  }>({
    statuses: [],
    categories: [],
    features: [],
    stats: { totalIdeas: 0, totalVotes: 0, totalReleased: 0 },
  });

  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [source, setSource] = useState("ALL");
  const [sort, setSort] = useState("popular");

  // Modals
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isMySuggestionsModalOpen, setIsMySuggestionsModalOpen] = useState(false);

  // Admin Feature & Poll Modals & State
  const [isAdminCreateFeatureOpen, setIsAdminCreateFeatureOpen] = useState(false);
  const [initialCreateStatusId, setInitialCreateStatusId] = useState<string | undefined>(undefined);
  const [isAdminCreatePollOpen, setIsAdminCreatePollOpen] = useState(false);
  const [editingAdminPoll, setEditingAdminPoll] = useState<any | null>(null);
  const [isAdminMetricsOpen, setIsAdminMetricsOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<FeatureCardData | null>(null);
  const [mergingFeature, setMergingFeature] = useState<FeatureCardData | null>(null);

  // Admin Column / Status Modals & State
  const [isCreateStatusOpen, setIsCreateStatusOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<StatusOption | null>(null);
  const [deletingStatus, setDeletingStatus] = useState<StatusOption | null>(null);
  const [deletingCardCount, setDeletingCardCount] = useState(0);
  const [movingCardsStatus, setMovingCardsStatus] = useState<StatusOption | null>(null);
  const [movingCardsCount, setMovingCardsCount] = useState(0);

  const ably = useAbly();

  const fetchRoadmap = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId && categoryId !== "ALL") params.set("categoryId", categoryId);
      if (priority && priority !== "ALL") params.set("priority", priority);
      if (source && source !== "ALL") params.set("source", source);
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/roadmap/features?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar roadmap");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao carregar o roadmap.");
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, priority, source, sort]);

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch("/api/roadmap/polls/active");
      if (res.ok) {
        const json = await res.json();
        if (json && json.id) {
          setPoll(json);
        } else {
          setPoll(null);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchRoadmap();
  }, [fetchRoadmap]);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  // Real-time feature votes via Ably on Superadmin
  useEffect(() => {
    if (!ably) return;

    const channel = ably.channels.get("roadmap:features");
    const handleFeatureVote = (message: any) => {
      const { featureId, voteCount, recentInteractors } = message.data || {};
      if (featureId && typeof voteCount === "number") {
        setData((prev) => ({
          ...prev,
          features: prev.features.map((f) =>
            f.id === featureId
              ? { ...f, voteCount, recentInteractors: recentInteractors || f.recentInteractors }
              : f
          ),
          stats: {
            ...prev.stats,
            totalVotes: prev.features.reduce((acc, f) => acc + (f.id === featureId ? voteCount : f.voteCount), 0),
          },
        }));
      }
    };

    channel.subscribe("feature-voted", handleFeatureVote);
    return () => {
      channel.unsubscribe("feature-voted", handleFeatureVote);
    };
  }, [ably]);

  // INSTANT OPTIMISTIC VOTING
  const handleToggleVote = async (featureId: string) => {
    setData((prev) => {
      const target = prev.features.find((f) => f.id === featureId);
      if (!target) return prev;
      const nextVoted = !target.userHasVoted;
      const nextCount = nextVoted ? target.voteCount + 1 : Math.max(0, target.voteCount - 1);

      return {
        ...prev,
        features: prev.features.map((f) =>
          f.id === featureId ? { ...f, userHasVoted: nextVoted, voteCount: nextCount } : f
        ),
      };
    });

    const res = await fetch(`/api/roadmap/features/${featureId}/vote`, {
      method: "POST",
    });

    if (!res.ok) {
      fetchRoadmap();
      throw new Error("Erro ao votar");
    }

    return await res.json();
  };

  const handlePollVote = async (pollId: string, optionId: string) => {
    const res = await fetch("/api/roadmap/polls/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, optionId }),
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || "Erro ao registrar voto na enquete");
    }
  };

  const handleAdminDelete = async (featureId: string) => {
    try {
      const res = await fetch(`/api/superadmin/roadmap/features/${featureId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao arquivar funcionalidade");
      toast.success("Card excluído com sucesso!");
      fetchRoadmap();
    } catch (err: any) {
      toast.error(err.message || "Erro ao arquivar.");
    }
  };

  const handleAdminStatusChange = async (featureId: string, targetStatusId: string, newRank: number) => {
    try {
      // Optimistic update
      setData((prev) => ({
        ...prev,
        features: prev.features.map((f) => {
          if (f.id === featureId) {
            const targetStatus = prev.statuses.find((s) => s.id === targetStatusId);
            return {
              ...f,
              statusId: targetStatusId,
              status: targetStatus || f.status,
              rank: newRank,
            };
          }
          return f;
        }),
      }));

      const res = await fetch("/api/superadmin/roadmap/features", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          featureId,
          targetStatusId,
          newRank,
        }),
      });

      if (!res.ok) throw new Error("Erro ao mover card");
      toast.success("Status atualizado!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao mover card.");
      fetchRoadmap();
    }
  };

  const handleAdminQuickMoveStatus = async (featureId: string, targetStatusId: string) => {
    const targetFeatures = data.features.filter((f) => f.status.id === targetStatusId);
    const lastRank = targetFeatures.length > 0 ? Math.max(...targetFeatures.map((f: any) => f.rank || 0)) : 0;
    const newRank = lastRank + 1000;
    await handleAdminStatusChange(featureId, targetStatusId, newRank);
  };

  const [isActionRunning, setIsActionRunning] = useState(false);

  const handleAdminDuplicate = async (featureId: string) => {
    if (isActionRunning) return;
    setIsActionRunning(true);
    try {
      const res = await fetch(`/api/superadmin/roadmap/features/${featureId}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Erro ao duplicar card");
      }
      toast.success("Card duplicado com sucesso!");
      fetchRoadmap();
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar.");
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleAdminMovePosition = async (featureId: string, position: "TOP" | "BOTTOM") => {
    if (isActionRunning) return;
    setIsActionRunning(true);
    try {
      const res = await fetch(`/api/superadmin/roadmap/features/${featureId}/position`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Erro ao reposicionar card");
      }
      toast.success(position === "TOP" ? "Card movido para o topo!" : "Card movido para a base!");
      fetchRoadmap();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reposicionar.");
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleOpenAddInColumn = (statusId: string) => {
    setInitialCreateStatusId(statusId);
    setIsAdminCreateFeatureOpen(true);
  };

  const handleAdminReorderStatus = async (statusId: string, direction: "LEFT" | "RIGHT") => {
    if (isActionRunning) return;
    setIsActionRunning(true);
    try {
      const res = await fetch(`/api/superadmin/roadmap/statuses/${statusId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Erro ao reordenar coluna");
      }
      toast.success("Ordem da coluna atualizada!");
      fetchRoadmap();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reordenar coluna.");
    } finally {
      setIsActionRunning(false);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setCategoryId("ALL");
    setPriority("ALL");
    setSource("ALL");
    setSort("popular");
  };

  const hasActiveFilters = search || categoryId !== "ALL" || priority !== "ALL" || source !== "ALL" || sort !== "popular";

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-5 max-w-[1700px] mx-auto">
      {/* Header */}
      <RoadmapHeader
        stats={data.stats}
        onOpenSuggestModal={() => setIsSuggestModalOpen(true)}
        onOpenMySuggestionsModal={() => setIsMySuggestionsModalOpen(true)}
        isSuperAdmin={true}
        onOpenAdminFeatureModal={() => {
          setInitialCreateStatusId(undefined);
          setIsAdminCreateFeatureOpen(true);
        }}
        onOpenAdminStatusModal={() => setIsCreateStatusOpen(true)}
        onOpenAdminPollModal={() => setIsAdminCreatePollOpen(true)}
        onOpenAdminMetricsModal={() => setIsAdminMetricsOpen(true)}
      />

      {/* Community Poll */}
      {poll && (
        <RoadmapPoll
          poll={poll}
          onVote={handlePollVote}
          isSuperAdmin={true}
          onAdminEditPoll={(p) => setEditingAdminPoll(p)}
        />
      )}

      {/* Past Decisions Collapsible Card */}
      <RoadmapPastDecisions />

      {/* Search & Filter Toolbar with Rich Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card/40 p-3.5 rounded-2xl border border-border/40 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por título, requisitos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9.5 rounded-xl h-9 text-xs bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start lg:justify-end">
          {/* Category Filter */}
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[130px] rounded-xl h-9 text-xs bg-background">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL" className="text-xs">Todas Categorias</SelectItem>
              {data.categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-[125px] rounded-xl h-9 text-xs bg-background">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL" className="text-xs">Todas Prioridades</SelectItem>
              <SelectItem value="URGENT" className="text-xs font-bold text-rose-500">🔴 Urgente</SelectItem>
              <SelectItem value="HIGH" className="text-xs font-bold text-amber-500">🟠 Alta</SelectItem>
              <SelectItem value="MEDIUM" className="text-xs font-medium text-blue-400">🔵 Média</SelectItem>
              <SelectItem value="LOW" className="text-xs font-medium text-muted-foreground">⚪ Baixa</SelectItem>
            </SelectContent>
          </Select>

          {/* Source Filter */}
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[125px] rounded-xl h-9 text-xs bg-background">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL" className="text-xs">Todas Origens</SelectItem>
              <SelectItem value="ATLASFIT" className="text-xs font-medium">AtlasFit Oficial</SelectItem>
              <SelectItem value="COMMUNITY" className="text-xs font-medium">Comunidade</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[125px] rounded-xl h-9 text-xs bg-background">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="popular" className="text-xs">Mais Votadas</SelectItem>
              <SelectItem value="recent" className="text-xs">Mais Recentes</SelectItem>
              <SelectItem value="comments" className="text-xs">Mais Comentadas</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              title="Limpar filtros"
              className="h-9 px-2.5 rounded-xl text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <RotateCcw className="size-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Board Content with Drag & Drop & Column Controls */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Skeleton className="h-[450px] rounded-2xl" />
          <Skeleton className="h-[450px] rounded-2xl" />
          <Skeleton className="h-[450px] rounded-2xl" />
          <Skeleton className="h-[450px] rounded-2xl" />
        </div>
      ) : (
        <RoadmapBoard
          statuses={data.statuses}
          features={data.features}
          currentUserId={currentUserId}
          onOpenDetails={(id) => setActiveFeatureId(id)}
          onToggleVote={handleToggleVote}
          onOpenSuggestModal={() => setIsSuggestModalOpen(true)}
          isSuperAdmin={true}
          onAdminEdit={(feature) => setEditingFeature(feature)}
          onAdminMerge={(feature) => setMergingFeature(feature)}
          onAdminDelete={handleAdminDelete}
          onAdminStatusChange={handleAdminStatusChange}
          onAdminQuickMoveStatus={handleAdminQuickMoveStatus}
          onAdminDuplicate={handleAdminDuplicate}
          onAdminMovePosition={handleAdminMovePosition}
          onAdminAddInColumn={handleOpenAddInColumn}
          onAdminCreateStatus={() => setIsCreateStatusOpen(true)}
          onAdminEditStatus={(status) => setEditingStatus(status)}
          onAdminDeleteStatus={(status, cardCount) => {
            setDeletingStatus(status);
            setDeletingCardCount(cardCount);
          }}
          onAdminMoveAllCards={(status, cardCount) => {
            setMovingCardsStatus(status);
            setMovingCardsCount(cardCount);
          }}
          onAdminReorderStatus={handleAdminReorderStatus}
        />
      )}

      {/* Modals: Feature Details & Suggestion */}
      <RoadmapFeatureModal
        featureId={activeFeatureId}
        onClose={() => setActiveFeatureId(null)}
        onToggleVote={handleToggleVote}
      />

      <RoadmapSuggestModal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        categories={data.categories}
        onSuccess={fetchRoadmap}
        onOpenDetails={(id) => setActiveFeatureId(id)}
      />

      <RoadmapMySuggestionsModal
        isOpen={isMySuggestionsModalOpen}
        onClose={() => setIsMySuggestionsModalOpen(false)}
        onOpenDetails={(id) => setActiveFeatureId(id)}
      />

      {/* Modals: SuperAdmin Features */}
      <RoadmapCreateFeatureModal
        isOpen={isAdminCreateFeatureOpen}
        onClose={() => setIsAdminCreateFeatureOpen(false)}
        statuses={data.statuses}
        categories={data.categories}
        initialStatusId={initialCreateStatusId}
        onSuccess={fetchRoadmap}
      />

      <RoadmapEditFeatureModal
        feature={editingFeature}
        onClose={() => setEditingFeature(null)}
        statuses={data.statuses}
        categories={data.categories}
        onSuccess={fetchRoadmap}
      />

      <RoadmapMergeModal
        primaryFeature={mergingFeature}
        allFeatures={data.features}
        onClose={() => setMergingFeature(null)}
        onSuccess={fetchRoadmap}
      />

      {/* Modals: SuperAdmin Columns (Statuses) */}
      <RoadmapCreateStatusModal
        isOpen={isCreateStatusOpen}
        onClose={() => setIsCreateStatusOpen(false)}
        onSuccess={fetchRoadmap}
      />

      <RoadmapEditStatusModal
        status={editingStatus}
        onClose={() => setEditingStatus(null)}
        onSuccess={fetchRoadmap}
      />

      <RoadmapDeleteStatusModal
        status={deletingStatus}
        allStatuses={data.statuses}
        cardCount={deletingCardCount}
        onClose={() => {
          setDeletingStatus(null);
          setDeletingCardCount(0);
        }}
        onSuccess={fetchRoadmap}
      />

      <RoadmapMoveAllCardsModal
        sourceStatus={movingCardsStatus}
        allStatuses={data.statuses}
        cardCount={movingCardsCount}
        onClose={() => {
          setMovingCardsStatus(null);
          setMovingCardsCount(0);
        }}
        onSuccess={fetchRoadmap}
      />

      {/* Modals: SuperAdmin Polls & Metrics */}
      <RoadmapCreatePollModal
        isOpen={isAdminCreatePollOpen}
        onClose={() => setIsAdminCreatePollOpen(false)}
        onSuccess={fetchPoll}
      />

      <RoadmapEditPollModal
        poll={editingAdminPoll}
        onClose={() => setEditingAdminPoll(null)}
        onSuccess={fetchPoll}
      />

      <RoadmapMetricsModal
        isOpen={isAdminMetricsOpen}
        onClose={() => setIsAdminMetricsOpen(false)}
      />
    </div>
  );
}
