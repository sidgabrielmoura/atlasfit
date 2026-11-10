"use client";

import { use } from "react";
import { MigrationReviewView } from "@/components/migration/migration-review-view";

export default function PersonalReviewJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <MigrationReviewView
      jobId={id}
      role="personal"
      baseRoute="/personal/clients/migrate"
      backRoute="/personal/clients/migrate"
      creditsRoute="/personal/credits"
      apiBasePath="/api/personal/migration"
      exercisesApiUrl="/api/personal/workouts/exercises"
    />
  );
}
