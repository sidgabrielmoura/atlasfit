import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function StudentLoading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-24 w-full animate-pulse">
      {/* 1. Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-muted" />
          <Skeleton className="h-4 w-72 bg-muted" />
        </div>
        <Skeleton className="h-8 w-40 bg-muted rounded-full shrink-0" />
      </div>

      {/* 2. Hero Card Skeleton */}
      <Card className="border border-border/50 bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-24 bg-muted rounded" />
              <Skeleton className="h-7 w-60 bg-muted rounded" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-4 w-20 bg-muted rounded" />
              <Skeleton className="h-4 w-28 bg-muted rounded" />
            </div>
          </div>
          <Skeleton className="h-12 w-full md:w-36 bg-muted rounded-xl shrink-0" />
        </CardContent>
      </Card>

      {/* 3. KPI / Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="border border-border/50 bg-card rounded-2xl">
            <CardContent className="p-4 flex flex-col justify-between h-28">
              <div className="flex justify-between items-start">
                <Skeleton className="h-3 w-16 bg-muted" />
                <Skeleton className="size-8 rounded-lg bg-muted" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-6 w-16 bg-muted" />
                <Skeleton className="h-3 w-20 bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Large Main Panel Skeleton */}
      <Card className="border border-border/50 bg-card rounded-2xl p-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-44 bg-muted" />
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-secondary/10 rounded-xl border border-border/20">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-lg bg-muted" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32 bg-muted" />
                    <Skeleton className="h-3 w-48 bg-muted" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 bg-muted rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
