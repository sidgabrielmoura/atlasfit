"use client";

import { CreditsView } from "@/components/migration/credits-view";

export default function GymCreditsPage() {
  return (
    <CreditsView
      role="gym"
      apiBasePath="/api/gym/credits"
    />
  );
}
