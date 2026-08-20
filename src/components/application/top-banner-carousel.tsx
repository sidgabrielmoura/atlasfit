"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EngageBannerItem {
  id: string;
  imageUrl: string;
  title?: string | null;
  linkUrl?: string | null;
  targetRole: string;
  isActive: boolean;
  sortOrder?: number;
}

const bannerMemoryCache = new Map<string, EngageBannerItem[]>();
const bannerPendingRequests = new Map<string, Promise<EngageBannerItem[]>>();

export function clearBannerMemoryCache() {
  bannerMemoryCache.clear();
  bannerPendingRequests.clear();
}

async function fetchBannersWithCache(role: string): Promise<EngageBannerItem[]> {
  if (bannerMemoryCache.has(role)) {
    return bannerMemoryCache.get(role)!;
  }

  if (bannerPendingRequests.has(role)) {
    return bannerPendingRequests.get(role)!;
  }

  const fetchPromise = (async () => {
    try {
      const res = await fetch(`/api/banners?role=${role}`);
      if (res.ok) {
        const json: EngageBannerItem[] = await res.json();
        bannerMemoryCache.set(role, json);
        return json;
      }
    } catch {
    } finally {
      bannerPendingRequests.delete(role);
    }
    return [];
  })();

  bannerPendingRequests.set(role, fetchPromise);
  return fetchPromise;
}

interface TopBannerCarouselProps {
  role?: "PERSONAL" | "STUDENT" | "ALL";
  customBanners?: EngageBannerItem[];
  isPreview?: boolean;
}

export function TopBannerCarousel({ role = "ALL", customBanners, isPreview = false }: TopBannerCarouselProps) {
  const [banners, setBanners] = useState<EngageBannerItem[]>(() => {
    if (customBanners) return customBanners.filter(b => b.isActive);
    return bannerMemoryCache.get(role) || [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (customBanners) return false;
    return !bannerMemoryCache.has(role);
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (customBanners) {
      setBanners(customBanners.filter(b => b.isActive));
      setLoading(false);
      return;
    }

    let isMounted = true;

    fetchBannersWithCache(role).then((data) => {
      if (isMounted) {
        setBanners(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [role, customBanners]);

  useEffect(() => {
    if (banners.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 10000);

    return () => clearInterval(interval);
  }, [banners.length, isHovered]);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto pb-0 pt-4">
        <Skeleton className="h-36 sm:h-48 w-full rounded-3xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (banners.length === 0) {
    if (isPreview) {
      return (
        <div className="text-center pt-4 border border-dashed border-border rounded-3xl bg-muted/20 text-muted-foreground text-xs font-bold uppercase tracking-wider">
          Nenhum banner ativo para este perfil
        </div>
      );
    }
    return null;
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  };

  const handleBannerClick = (banner: EngageBannerItem) => {
    if (isPreview || !banner.linkUrl) return;
    if (banner.linkUrl.startsWith("http://") || banner.linkUrl.startsWith("https://")) {
      window.open(banner.linkUrl, "_blank");
    } else {
      window.location.href = banner.linkUrl;
    }
  };

  return (
    <div className={cn("w-full mx-auto select-none", isPreview ? "p-0" : "pt-4 pb-0 max-w-3xl")}>
      <div
        className="relative overflow-hidden rounded-3xl border border-border/60 mx-auto shadow-xl group transition-all w-full bg-card"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className="flex transition-transform duration-700 ease-in-out w-full max-w-3xl mx-auto"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {banners.map((banner) => {
            const hasLink = Boolean(banner.linkUrl);
            return (
              <div
                key={banner.id}
                onClick={() => handleBannerClick(banner)}
                className={cn(
                  "w-full shrink-0 relative overflow-hidden flex items-center justify-center min-h-25 bg-secondary/10",
                  hasLink && !isPreview && "cursor-pointer"
                )}
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.title || "Banner"}
                  className="w-full h-full object-contain rounded-3xl select-none"
                />

                {hasLink && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-md p-1.5 rounded-full border border-border text-foreground shadow-md pointer-events-none">
                    <ExternalLink className="size-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {banners.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-background/80 border border-border backdrop-blur-md flex items-center justify-center text-foreground hover:bg-background transition-opacity opacity-0 group-hover:opacity-100 z-20 cursor-pointer shadow-md"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 size-8 rounded-full bg-background/80 border border-border backdrop-blur-md flex items-center justify-center text-foreground hover:bg-background transition-opacity opacity-0 group-hover:opacity-100 z-20 cursor-pointer shadow-md"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="absolute bottom-1! left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20 min-h-5 sm:min-h-10">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    currentIndex === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
