"use client";

import { MigrationDashboardView } from "@/components/migration/migration-dashboard-view";

export default function PersonalMigrationDashboardPage() {
  return (
    <MigrationDashboardView
      role="personal"
      baseRoute="/personal/clients/migrate"
      backRoute="/personal/clients"
      creditsRoute="/personal/credits"
      apiBasePath="/api/personal/migration"
      creditsApiBasePath="/api/personal/credits"
      title="Importações de Alunos"
      description="Migração inteligente com consumo dinâmico de créditos e tempo real."
    />
  );
}
