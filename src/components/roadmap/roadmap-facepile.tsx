"use client";

import React from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Interactor {
  id: string;
  name?: string | null;
  image?: string | null;
}

interface RoadmapFacepileProps {
  interactors?: Interactor[];
  maxDisplay?: number;
  className?: string;
}

export function RoadmapFacepile({ interactors = [], maxDisplay = 3, className = "" }: RoadmapFacepileProps) {
  if (!interactors || interactors.length === 0) return null;

  const displayList = interactors.slice(0, maxDisplay);

  return (
    <div className={`flex items-center -space-x-2 ${className}`}>
      {displayList.map((user, idx) => (
        <Avatar
          key={user.id || idx}
          className="size-6 border-2 border-background ring-1 ring-border/20 transition-transform duration-200 hover:scale-110 hover:z-10"
        >
          {user.image ? (
            <AvatarImage src={user.image} alt={user.name || "Personal"} />
          ) : null}
          <AvatarFallback className="text-[8px] font-bold uppercase bg-primary/20 text-primary">
            {user.name ? user.name[0] : "P"}
          </AvatarFallback>
        </Avatar>
      ))}
    </div>
  );
}
