"use client";

import type { ReactNode } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function GymMetricsSection({ children, title = "Métricas de Performance" }: { children: ReactNode; title?: string }) {
  return (
    <Collapsible defaultOpen className="group/metrics min-w-0">
      <Card className="gap-4 border-border/50 bg-card/40 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider sm:text-sm">
            <BarChart3 className="size-4.5 shrink-0 text-primary" aria-hidden="true" />
            {title}
          </h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Expandir ou recolher ${title.toLowerCase()}`}>
              <ChevronDown className="transition-transform group-data-[state=closed]/metrics:-rotate-90" />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>{children}</CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
