import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function GymLoading() {
  return (
    <div className="space-y-6 max-w-400 mx-auto animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 max-w-full rounded-xl" />
          <Skeleton className="h-4 w-80 max-w-full rounded-lg" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
          <Skeleton className="h-8 w-32 rounded-xl" />
        </div>
      </div>

      {/* KPI Card Container Skeleton */}
      <Card className="border-border/50 bg-card/40 rounded-2xl p-4 space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4.5 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          <Skeleton className="size-8 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-border/50 bg-background/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-24 rounded" />
                    <Skeleton className="h-6 w-28 rounded-lg" />
                  </div>
                  <Skeleton className="size-8 rounded-lg shrink-0" />
                </div>
                <Skeleton className="h-3 w-32 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </Card>

      {/* Main Grid Content Skeleton (2/3 + 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Charts) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="space-y-1.5 pb-2">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="h-3 w-56 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[230px] w-full rounded-xl" />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="space-y-1.5 pb-2">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-28 rounded" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="space-y-1.5 pb-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full rounded-xl" />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="space-y-1.5 pb-2">
                <Skeleton className="h-5 w-40 rounded" />
                <Skeleton className="h-3 w-36 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[200px] w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="space-y-1.5 pb-2">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[180px] w-full rounded-xl" />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="space-y-1.5 pb-2">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="h-3 w-40 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[180px] w-full rounded-xl" />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Column (Side operational cards) */}
        <div className="space-y-6">
          {[1, 2, 3, 4].map((cardIdx) => (
            <Card key={cardIdx} className="border-border/50">
              <CardHeader className="space-y-1.5 pb-3">
                <Skeleton className="h-5 w-44 rounded" />
                <Skeleton className="h-3 w-48 rounded" />
              </CardHeader>
              <CardContent className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-32 rounded" />
                      <Skeleton className="h-3 w-44 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
