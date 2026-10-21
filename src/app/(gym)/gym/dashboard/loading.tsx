import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GymDashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-6" aria-busy="true" aria-label="Carregando visão geral">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72 max-w-full" /></div>
        <Skeleton className="h-8 w-36" />
      </div>
      <Card className="gap-4 border-border/50 bg-card/40 p-3.5">
        <Skeleton className="h-8 w-52 max-w-full" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map(index => <Skeleton key={index} className="h-28 w-full" />)}</div>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {[0, 1].map((index) => <Card key={index} size="sm">
              <CardHeader><Skeleton className="h-5 w-40 max-w-full" /><Skeleton className="h-4 w-48 max-w-full" /></CardHeader>
              <CardContent><Skeleton className="h-40 w-full" /></CardContent>
            </Card>)}
          </div>
          <Card size="sm">
            <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-52 max-w-full" /></CardHeader>
            <CardContent className="flex flex-col gap-3">
              {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-11 w-full" />)}
            </CardContent>
          </Card>
        </div>
        <div className="flex min-w-0 flex-col gap-6">
        {[0, 1, 2].map((index) => (
          <Card key={index} size="sm">
            <CardHeader><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-48" /></CardHeader>
            <CardContent className="flex flex-col gap-4"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  );
}
