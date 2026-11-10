"use client";

import { CreditsView } from "@/components/migration/credits-view";

export default function PersonalCreditsPage() {
  return (
    <div className="mx-auto w-full max-w-400 p-4 md:p-6 lg:p-8">
      <CreditsView
        role="personal"
        apiBasePath="/api/personal/credits"
      />
    </div>
  );
}
