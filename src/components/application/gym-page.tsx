import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";

/** Page rhythm and typography follow the personal workspace. */
export function GymPageHeader({ title, description, badge, actions }: {
  title: ReactNode;
  description?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-foreground md:text-3xl [overflow-wrap:anywhere]">{title}</h1>
          {badge}
        </div>
        {description && <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 [&>div]:max-w-full [&_[data-slot=button]]:max-w-full [&_[data-slot=button]]:whitespace-normal">{actions}</div>}
    </div>
  );
}

/** Same size, surfaces and icon treatment as the personal dashboard KPI cards. */
export function GymMetricCard({ title, value, description, icon: Icon }: {
  title: ReactNode;
  value: ReactNode;
  description?: ReactNode;
  icon: LucideIcon;
}) {
  return (
    <Card size="sm" className="relative h-full min-w-0 gap-2 overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xs">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">{title}</CardTitle>
          <p className="text-lg font-bold tracking-tight tabular-nums [overflow-wrap:anywhere] sm:text-xl">{value}</p>
        </div>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-8">
          <Icon className="size-3.5 sm:size-4" aria-hidden="true" />
        </div>
      </CardHeader>
      {description && <CardContent className="mt-auto text-[10px] text-muted-foreground [overflow-wrap:anywhere] sm:text-xs">{description}</CardContent>}
    </Card>
  );
}

export function GymEmptyState({ icon: Icon, title, description, className }: {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
}) {
  return <Empty className={className}>
    <EmptyHeader>
      <EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia>
      <EmptyTitle>{title}</EmptyTitle>
      {description && <EmptyDescription>{description}</EmptyDescription>}
    </EmptyHeader>
  </Empty>;
}
