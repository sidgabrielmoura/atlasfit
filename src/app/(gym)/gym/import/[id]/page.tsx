"use client";

import { use } from "react";
import { MigrationReviewView } from "@/components/migration/migration-review-view";

export default function GymReviewImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <MigrationReviewView
      jobId={id}
      role="gym"
      baseRoute="/gym/import"
      backRoute="/gym/import"
      creditsRoute="/gym/credits"
      apiBasePath="/api/gym/migration"
      exercisesApiUrl="/api/gym/workouts/exercises"
    />
  );
}
