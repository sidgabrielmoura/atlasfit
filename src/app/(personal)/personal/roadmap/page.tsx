"use client";

import React, { useEffect, useState, useCallback } from "react";
import { RoadmapHeader } from "@/components/roadmap/roadmap-header";
import { RoadmapPoll } from "@/components/roadmap/roadmap-poll";
import { RoadmapPastDecisions } from "@/components/roadmap/roadmap-past-decisions";
import { RoadmapBoard } from "@/components/roadmap/roadmap-board";
import { FeatureCardData } from "@/components/roadmap/roadmap-card";
import { RoadmapFeatureModal } from "@/components/roadmap/roadmap-feature-modal";
import { RoadmapSuggestModal } from "@/components/roadmap/roadmap-suggest-modal";
import { RoadmapMySuggestionsModal } from "@/components/roadmap/roadmap-my-suggestions-modal";
import { RoadmapEditSuggestionModal } from "@/components/roadmap/roadmap-edit-suggestion-modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { useAbly } from "@/providers/ably-provider";
import { useSession } from "next-auth/react";

export default function PersonalRoadmapPage() {
  const { data: session } = useSession();
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
  const [sort, setSort] = useState("popular");

  // Modals
  const [activeFeatureId, setActiveFeatureId] = useState<string | null>(null);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isMySuggestionsModalOpen, setIsMySuggestionsModalOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<FeatureCardData | null>(null);

  const ably = useAbly();
  const currentUserId = session?.user?.id;

  const fetchRoadmap = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryId && categoryId !== "ALL") params.set("categoryId", categoryId);
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
  }, [search, categoryId, sort]);

  const fetchPoll = useCallback(async () => {
    try {
      const res = await fetch("/api/roadmap/polls/active");
      if (res.ok) {
        const json = await res.json();
        if (json && json.id) setPoll(json);
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

  // Real-time feature votes via Ably
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

  // INSTANT OPTIMISTIC FEATURE VOTING FOR PERSONAL TRAINER
  const handleToggleVote = async (featureId: string) => {
    // Optimistic board update
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
      // Rollback
      fetchRoadmap();
      throw new Error("Erro ao registrar voto");
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

  const handleTrainerDelete = async (featureId: string) => {
    try {
      const res = await fetch(`/api/roadmap/features/${featureId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Erro ao excluir sugestão");
      }

      toast.success("Sugestão excluída com sucesso!");
      fetchRoadmap();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir sugestão.");
    }
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 space-y-5 max-w-[1600px] mx-auto">
      {/* Header */}
      <RoadmapHeader
        stats={data.stats}
        onOpenSuggestModal={() => setIsSuggestModalOpen(true)}
        onOpenMySuggestionsModal={() => setIsMySuggestionsModalOpen(true)}
      />

      {/* Community Poll */}
      {poll && <RoadmapPoll poll={poll} onVote={handlePollVote} />}

      {/* Past Decisions Collapsible Card */}
      <RoadmapPastDecisions />

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card/30 p-3 rounded-xl border border-border/30">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Pesquisar ideias..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-lg h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-[140px] rounded-lg h-9 text-xs bg-background">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="ALL" className="text-xs">Todas</SelectItem>
              {data.categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[130px] rounded-lg h-9 text-xs bg-background">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="popular" className="text-xs">Mais Votadas</SelectItem>
              <SelectItem value="recent" className="text-xs">Mais Recentes</SelectItem>
              <SelectItem value="comments" className="text-xs">Mais Comentadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Board Content */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Skeleton className="h-[350px] rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
          <Skeleton className="h-[350px] rounded-xl" />
        </div>
      ) : (
        <RoadmapBoard
          statuses={data.statuses}
          features={data.features}
          currentUserId={currentUserId}
          onOpenDetails={(id) => setActiveFeatureId(id)}
          onToggleVote={handleToggleVote}
          onOpenSuggestModal={() => setIsSuggestModalOpen(true)}
          onTrainerEdit={(feature) => setEditingSuggestion(feature)}
          onTrainerDelete={handleTrainerDelete}
        />
      )}

      {/* Modals */}
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

      <RoadmapEditSuggestionModal
        feature={editingSuggestion}
        categories={data.categories}
        onClose={() => setEditingSuggestion(null)}
        onSuccess={fetchRoadmap}
        isSuperAdmin={false}
      />
    </div>
  );
}
