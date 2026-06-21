"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import api from "@/lib/axios";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Megaphone, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Campaign {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  type: "PROMOTION" | "ANNOUNCEMENT" | "UPDATE";
  targetRole: "PERSONAL" | "STUDENT" | "ALL";
  buttonText: string | null;
  buttonLink: string | null;
  showOnlyOnce: boolean;
  priority: number;
}

export function CampaignModal() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize and load campaigns after the page has fully loaded
  useEffect(() => {
    const fetchActiveCampaigns = async () => {
      try {
        const { data } = await api.get<Campaign[]>("/campaigns/active");
        if (data && data.length > 0) {
          setCampaigns(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Failed to load active campaigns", error);
      } finally {
        setLoading(false);
      }
    };

    // Delay modal loading to ensure first render is clean and fast (UX rule)
    const handleLoad = () => {
      setTimeout(fetchActiveCampaigns, 1500);
    };

    if (document.readyState === "complete") {
      handleLoad();
    } else {
      window.addEventListener("load", handleLoad);
      return () => window.removeEventListener("load", handleLoad);
    }
  }, []);

  if (loading || campaigns.length === 0 || !isOpen) {
    return null;
  }

  const currentCampaign = campaigns[activeIndex];

  const logCampaignView = async (campaignId: string) => {
    try {
      await api.post(`/campaigns/${campaignId}/view`);
    } catch (error) {
      console.error("Failed to register campaign view", error);
    }
  };

  const handleNext = async () => {
    // Log view of current campaign when navigating away from it
    await logCampaignView(currentCampaign.id);

    if (activeIndex < campaigns.length - 1) {
      setActiveIndex((prev) => prev + 1);
    } else {
      setIsOpen(false);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  const handleDismiss = async () => {
    // Log view of the active campaign when dismissing
    await logCampaignView(currentCampaign.id);
    setIsOpen(false);
  };

  const handleCTAClick = async () => {
    // Log view of the active campaign on CTA click
    await logCampaignView(currentCampaign.id);
    if (currentCampaign.buttonLink) {
      window.open(currentCampaign.buttonLink, "_blank", "noopener,noreferrer");
    }
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDismiss}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal Content Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
            className={cn(
              "relative w-full max-w-sm sm:max-w-md overflow-hidden rounded-2xl",
              "bg-zinc-950/90 border border-white/10 shadow-2xl backdrop-blur-xl",
              "flex flex-col text-foreground p-5 space-y-4"
            )}
          >
            {/* Header: Badge & Close Button */}
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-[8px] font-black px-2 py-0.5 rounded border leading-none uppercase tracking-wider",
                  currentCampaign.type === "PROMOTION" &&
                  "bg-amber-500/10 text-amber-500 border-amber-500/20",
                  currentCampaign.type === "ANNOUNCEMENT" &&
                  "bg-rose-500/10 text-rose-500 border-rose-500/20",
                  currentCampaign.type === "UPDATE" &&
                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}
              >
                {currentCampaign.type === "PROMOTION" && "Promoção"}
                {currentCampaign.type === "ANNOUNCEMENT" && "Aviso"}
                {currentCampaign.type === "UPDATE" && "Novidade"}
              </span>

              <button
                onClick={handleDismiss}
                className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                aria-label="Fechar"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Banner Image */}
            {currentCampaign.imageUrl && (
              <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border border-white/5 select-none bg-zinc-900">
                <img
                  src={currentCampaign.imageUrl}
                  alt={currentCampaign.title}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            )}

            {/* Content Details */}
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-white leading-snug">
                {currentCampaign.title}
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed max-h-[120px] overflow-y-auto pr-1">
                {currentCampaign.description}
              </p>
            </div>

            {/* Navigation & Actions Footer */}
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-white/5">
              {/* Pagination Controls */}
              {campaigns.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    disabled={activeIndex === 0}
                    onClick={handlePrev}
                    className="size-7 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 text-white flex items-center justify-center border border-white/5 transition-all cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" />
                  </button>
                  <span className="text-[10px] font-bold text-zinc-400 tracking-wider bg-white/5 px-2 py-0.5 rounded border border-white/5">
                    {activeIndex + 1}/{campaigns.length}
                  </span>
                  <button
                    onClick={handleNext}
                    className="size-7 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-all cursor-pointer"
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-semibold uppercase tracking-wider select-none">
                  AtlasFit
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="rounded-lg font-bold text-xs hover:bg-white/5 transition-all h-8 px-3 text-zinc-400 hover:text-white"
                >
                  {campaigns.length > 1 && activeIndex < campaigns.length - 1 ? "Pular" : "Fechar"}
                </Button>

                {currentCampaign.buttonText ? (
                  <Button
                    size="sm"
                    onClick={handleCTAClick}
                    className="rounded-lg font-bold text-xs h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                  >
                    {currentCampaign.buttonText}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={handleDismiss}
                    className="rounded-lg font-bold text-xs h-8 px-4 bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                  >
                    Entendido
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
