"use client";

import React, { useEffect, useState } from "react";
import { Check, Users, Lock, RefreshCw, Clock, Trophy, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAbly } from "@/providers/ably-provider";
import { RoadmapFacepile } from "./roadmap-facepile";
import { toast } from "sonner";

interface PollOption {
  id: string;
  title: string;
  voteCount: number;
  percentage: number;
  isUserChoice: boolean;
}

interface PollData {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  totalVotes: number;
  allowVoteChange?: boolean;
  userVotedOptionId?: string | null;
  options: PollOption[];
  endsAt?: string | null;
  winner?: PollOption | null;
  recentInteractors?: Array<{ id: string; name?: string | null; image?: string | null }>;
}

interface RoadmapPollProps {
  poll: PollData | null;
  onVote: (pollId: string, optionId: string) => Promise<void>;
  isSuperAdmin?: boolean;
  onAdminEditPoll?: (poll: PollData) => void;
}

export function RoadmapPoll({ poll: initialPoll, onVote, isSuperAdmin, onAdminEditPoll }: RoadmapPollProps) {
  const [poll, setPoll] = useState<PollData | null>(initialPoll);
  const [userChoiceId, setUserChoiceId] = useState<string | null>(initialPoll?.userVotedOptionId || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const ably = useAbly();

  useEffect(() => {
    setPoll(initialPoll);
    setUserChoiceId(initialPoll?.userVotedOptionId || null);
  }, [initialPoll]);

  // Real-Time Countdown Timer for Poll Deadline
  useEffect(() => {
    if (!poll?.endsAt || poll?.status === "CLOSED") {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const diff = new Date(poll.endsAt!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Encerrada");
        setPoll((prev) => (prev ? { ...prev, status: "CLOSED" } : null));
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [poll?.endsAt, poll?.status]);

  // Real-time updates via Ably
  useEffect(() => {
    if (!ably || !poll?.id) return;

    const channel = ably.channels.get("roadmap:polls");
    const handlePollUpdate = (message: any) => {
      const payload = message.data;
      if (payload && payload.pollId === poll.id) {
        setPoll((prev) => {
          if (!prev) return null;
          const updatedOptions = prev.options.map((opt) => {
            const match = payload.options?.find((o: any) => o.id === opt.id);
            if (match) {
              return {
                ...opt,
                voteCount: match.voteCount,
                percentage: match.percentage,
              };
            }
            return opt;
          });

          return {
            ...prev,
            totalVotes: payload.totalVotes ?? prev.totalVotes,
            options: updatedOptions,
            recentInteractors: payload.recentInteractors || prev.recentInteractors,
          };
        });
      }
    };

    channel.subscribe("poll-voted", handlePollUpdate);
    return () => {
      channel.unsubscribe("poll-voted", handlePollUpdate);
    };
  }, [ably, poll?.id]);

  if (!poll || !poll.options || poll.options.length === 0) return null;

  const isClosed = poll.status === "CLOSED" || (timeLeft === "Encerrada");
  const allowVoteChange = poll.allowVoteChange ?? true;
  const isPollLockedForUser = isClosed || (!allowVoteChange && userChoiceId !== null);

  const winningOption = poll.winner || (isClosed ? [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0] : null);

  // 100% INSTANT OPTIMISTIC VOTING
  const handleOptionClick = async (optionId: string) => {
    if (isClosed || userChoiceId === optionId || isSubmitting) return;

    if (isPollLockedForUser) {
      toast.error("Esta enquete não permite alterar o voto. Seu voto é definitivo.");
      return;
    }

    const previousPoll = poll;
    const previousChoice = userChoiceId;

    // Calculate instant optimistic options
    let newTotalVotes = poll.totalVotes;
    if (!previousChoice) {
      newTotalVotes += 1;
    }

    const nextOptions = poll.options.map((opt) => {
      let nextVoteCount = opt.voteCount;
      if (opt.id === optionId) {
        nextVoteCount += 1;
      } else if (opt.id === previousChoice) {
        nextVoteCount = Math.max(0, nextVoteCount - 1);
      }
      return {
        ...opt,
        voteCount: nextVoteCount,
      };
    });

    const optionsWithPercentages = nextOptions.map((opt) => ({
      ...opt,
      percentage: newTotalVotes > 0 ? Math.round((opt.voteCount / newTotalVotes) * 100) : 0,
      isUserChoice: opt.id === optionId,
    }));

    // UPDATE UI INSTANTLY
    setPoll({
      ...poll,
      totalVotes: newTotalVotes,
      userVotedOptionId: optionId,
      options: optionsWithPercentages,
    });
    setUserChoiceId(optionId);
    setIsSubmitting(true);

    try {
      await onVote(poll.id, optionId);
    } catch (error: any) {
      setPoll(previousPoll);
      setUserChoiceId(previousChoice);
      toast.error(error.message || "Erro ao registrar voto.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm space-y-4">
      {/* Minimal Header with Explicit Vote Policy Indicator & Countdown */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              Enquete da Comunidade
            </span>

            {/* Explicit policy badge */}
            <span
              className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded border flex items-center gap-1 ${
                isClosed
                  ? "border-border/40 text-muted-foreground bg-secondary/30"
                  : isPollLockedForUser
                  ? "border-border/40 text-muted-foreground bg-secondary/30"
                  : allowVoteChange
                  ? "border-primary/30 text-primary bg-primary/10"
                  : "border-border/40 text-muted-foreground bg-secondary/30"
              }`}
            >
              {isClosed ? (
                <>
                  <Check className="size-2.5 stroke-[3]" />
                  <span>Enquete Encerrada</span>
                </>
              ) : isPollLockedForUser ? (
                <>
                  <Lock className="size-2.5" />
                  <span>Voto único gravado (definitivo)</span>
                </>
              ) : allowVoteChange ? (
                <>
                  <RefreshCw className="size-2.5" />
                  <span>Permite alterar voto</span>
                </>
              ) : (
                <>
                  <Lock className="size-2.5" />
                  <span>Voto único definitivo</span>
                </>
              )}
            </span>
          </div>

          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">{poll.title}</h2>
          {poll.description && <p className="text-xs text-muted-foreground leading-snug">{poll.description}</p>}
        </div>

        {/* Right side: Countdown & Stats & Instagram-style Avatars & Superadmin Control */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {/* Overlapping Avatars (Facepile) */}
          <RoadmapFacepile interactors={poll.recentInteractors} />

          {/* Countdown Timer */}
          {timeLeft && !isClosed && (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md">
              <Clock className="size-3 animate-pulse" />
              <span>{timeLeft}</span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono bg-secondary/40 px-2.5 py-1 rounded-md">
            <Users className="size-3 text-primary" />
            <span>{poll.totalVotes} votos</span>
          </div>

          {/* Superadmin Manage Button */}
          {isSuperAdmin && onAdminEditPoll && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdminEditPoll(poll)}
              className="h-7 px-2 text-xs font-mono font-bold gap-1 border-border/40 text-muted-foreground hover:text-foreground"
            >
              <Settings className="size-3" />
              <span>Gerenciar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Friendly Winner Banner if Poll Closed */}
      {isClosed && winningOption && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between text-xs animate-in fade-in duration-300">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="size-4 text-primary shrink-0" />
            <span className="font-bold text-primary truncate">Decisão da Comunidade: {winningOption.title}</span>
          </div>
          <span className="font-mono text-xs font-extrabold text-primary shrink-0">
            {winningOption.percentage}% ({winningOption.voteCount} votos)
          </span>
        </div>
      )}

      {/* Progress Bars Options */}
      <div className="space-y-2">
        {poll.options.map((option) => {
          const isSelected = userChoiceId === option.id;
          const percentage = option.percentage || 0;
          const isDisabled = isClosed || (isPollLockedForUser && !isSelected);

          return (
            <div
              key={option.id}
              onClick={() => !isDisabled && handleOptionClick(option.id)}
              className={`group relative overflow-hidden rounded-lg border p-3 transition-all duration-150 select-none ${
                isDisabled
                  ? "border-border/30 bg-background/30 opacity-70 cursor-not-allowed pointer-events-none"
                  : isSelected
                  ? "border-primary bg-primary/10 cursor-default"
                  : "border-border/40 bg-background/50 hover:border-primary/40 hover:bg-background cursor-pointer"
              }`}
            >
              {/* Progress fill bar */}
              <div
                className={`absolute top-0 left-0 bottom-0 transition-all duration-300 ease-out ${
                  isSelected ? "bg-primary/25" : "bg-secondary/60 group-hover:bg-secondary/80"
                }`}
                style={{ width: `${percentage}%` }}
              />

              {/* Progress content */}
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`size-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-muted-foreground/30 bg-background"
                    }`}
                  >
                    {isSelected && <Check className="size-2.5 stroke-[3]" />}
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate">{option.title}</span>
                </div>

                <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
                  <span className="text-[10px] text-muted-foreground">{option.voteCount}</span>
                  <span className={`font-bold ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                    {percentage}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
