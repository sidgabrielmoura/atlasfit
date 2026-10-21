"use client";

import type { ComponentProps } from "react";
import { TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Keep the shared shadcn tabs and scroll only the tab strip on narrow screens. */
export function GymTabsList({ className, ...props }: ComponentProps<typeof TabsList>) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto pb-1">
      <TabsList className={cn("w-max max-w-none justify-start [&>[data-slot=tabs-trigger]]:shrink-0 [&>[data-slot=tabs-trigger]]:px-4", className)} {...props} />
    </div>
  );
}
