"use client";

import { NewMigrationView } from "@/components/migration/new-migration-view";

export default function PersonalNewMigrationPage() {
  return (
    <NewMigrationView
      role="personal"
      baseRoute="/personal/clients/migrate"
      creditsRoute="/personal/credits"
      apiBasePath="/api/personal/migration"
      creditsApiBasePath="/api/personal/credits"
    />
  );
}
