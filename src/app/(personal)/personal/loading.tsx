import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function PersonalLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 w-full animate-pulse">
      {/* 1. Title/Header Area Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56 bg-muted" />
          <Skeleton className="h-4 w-80 bg-muted" />
        </div>
        <Skeleton className="h-10 w-full sm:w-40 bg-muted rounded-xl shrink-0" />
      </div>

      {/* 2. Quick KPI Stats Grid Skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border border-border/50 bg-card rounded-2xl">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16 bg-muted" />
                <Skeleton className="size-8 rounded-lg bg-muted" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-7 w-20 bg-muted" />
                <Skeleton className="h-3 w-28 bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. Content Split Layout Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center px-1">
            <Skeleton className="h-4 w-36 bg-muted" />
            <Skeleton className="h-8 w-24 bg-muted rounded-lg" />
          </div>

          <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden">
            <CardContent className="p-0 divide-y divide-border/30">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Skeleton className="size-10 rounded-xl bg-muted shrink-0" />
                    <div className="space-y-2 min-w-0">
                      <Skeleton className="h-4.5 w-36 bg-muted" />
                      <Skeleton className="h-3 w-24 bg-muted" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-16 bg-muted rounded-full" />
                    <Skeleton className="size-8 rounded-lg bg-muted" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          <Card className="border border-border/50 bg-card rounded-2xl p-5 space-y-4">
            <Skeleton className="h-4 w-28 bg-muted" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-2 rounded-full bg-muted shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-full bg-muted" />
                  <Skeleton className="h-3 w-16 bg-muted" />
                </div>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
