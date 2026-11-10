"use client";

import { NewMigrationView } from "@/components/migration/new-migration-view";

export default function GymNewImportPage() {
  return (
    <NewMigrationView
      role="gym"
      baseRoute="/gym/import"
      creditsRoute="/gym/credits"
      apiBasePath="/api/gym/migration"
      creditsApiBasePath="/api/gym/credits"
    />
  );
}
