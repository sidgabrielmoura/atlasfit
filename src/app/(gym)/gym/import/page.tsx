"use client";

import { MigrationDashboardView } from "@/components/migration/migration-dashboard-view";

export default function GymImportDashboardPage() {
  return (
    <MigrationDashboardView
      role="gym"
      baseRoute="/gym/import"
      backRoute="/gym/students"
      creditsRoute="/gym/credits"
      apiBasePath="/api/gym/migration"
      creditsApiBasePath="/api/gym/credits"
      title="Importação Assistida"
      description="Migração inteligente com IA e planilhas com consumo dinâmico de créditos para a academia."
    />
  );
}
