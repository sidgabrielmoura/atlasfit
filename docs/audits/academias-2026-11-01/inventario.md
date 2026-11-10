# Inventário técnico da área de academias

Data: 01/11/2026. Complemento do [relatório](relatorio.md). Levantamento estático do workspace em andamento; presença de um caminho não significa homologação funcional.

## Contagem

| Item | Quantidade |
|---|---:|
| pages | 21 |
| gymRouteFiles | 113 |
| gymHttpHandlers | 169 |
| workspaceServices | 107 |
| prismaModels | 143 |
| gymModels | 42 |
| unitTestFiles | 37 |
| integrationFiles | 51 |
| gymScripts | 245 |

## Todas as páginas do grupo GYM

| Arquivo | Linhas | Guard identificado diretamente |
|---|---:|---|
| [src/app/(gym)/gym/analytics/page.tsx](../../../src/app/(gym)/gym/analytics/page.tsx) | 17 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/coins/page.tsx](../../../src/app/(gym)/gym/coins/page.tsx) | 13 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/credits/page.tsx](../../../src/app/(gym)/gym/credits/page.tsx) | 13 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/dashboard/page.tsx](../../../src/app/(gym)/gym/dashboard/page.tsx) | 62 | requireGymWorkspaceAccess |
| [src/app/(gym)/gym/enrollments/page.tsx](../../../src/app/(gym)/gym/enrollments/page.tsx) | 67 | requireGymWorkspaceAccess |
| [src/app/(gym)/gym/finance/page.tsx](../../../src/app/(gym)/gym/finance/page.tsx) | 23 | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/(gym)/gym/import/new/page.tsx](../../../src/app/(gym)/gym/import/new/page.tsx) | 16 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/import/page.tsx](../../../src/app/(gym)/gym/import/page.tsx) | 19 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/import/[id]/page.tsx](../../../src/app/(gym)/gym/import/[id]/page.tsx) | 21 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/plans/page.tsx](../../../src/app/(gym)/gym/plans/page.tsx) | 45 | requireWorkspaceAccess |
| [src/app/(gym)/gym/reception/page.tsx](../../../src/app/(gym)/gym/reception/page.tsx) | 66 | requireGymWorkspaceAccess |
| [src/app/(gym)/gym/reconciliation/page.tsx](../../../src/app/(gym)/gym/reconciliation/page.tsx) | 31 | requireGymWorkspaceAccess |
| [src/app/(gym)/gym/settings/page.tsx](../../../src/app/(gym)/gym/settings/page.tsx) | 76 | requireWorkspaceAccess |
| [src/app/(gym)/gym/staff/page.tsx](../../../src/app/(gym)/gym/staff/page.tsx) | 20 | requireGymWorkspaceAccess |
| [src/app/(gym)/gym/students/page.tsx](../../../src/app/(gym)/gym/students/page.tsx) | 51 | requireWorkspaceAccess |
| [src/app/(gym)/gym/students/[id]/page.tsx](../../../src/app/(gym)/gym/students/[id]/page.tsx) | 22 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/subscription/page.tsx](../../../src/app/(gym)/gym/subscription/page.tsx) | 8 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/workouts/new/page.tsx](../../../src/app/(gym)/gym/workouts/new/page.tsx) | 1346 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/workouts/page.tsx](../../../src/app/(gym)/gym/workouts/page.tsx) | 40 | requireGymWorkspaceAccess |
| [src/app/(gym)/gym/workouts/[id]/edit/page.tsx](../../../src/app/(gym)/gym/workouts/[id]/edit/page.tsx) | 1433 | No layout/serviço ou componente cliente; conferir a cadeia |
| [src/app/(gym)/gym/workouts/[id]/page.tsx](../../../src/app/(gym)/gym/workouts/[id]/page.tsx) | 527 | No layout/serviço ou componente cliente; conferir a cadeia |

## Todos os arquivos de endpoints GYM

Esta tabela é um índice de localização, não um laudo de ausência de autenticação. Há rotas que delegam acesso a helpers e a serviços. Os caminhos compartilhados de chat, storage, sessão, pagamentos SaaS, aluno e responsável também foram considerados nos fluxos do relatório.

| Caminho sob /api/gym | Métodos exportados | Guard/helper reconhecido na rota |
|---|---|---|
| [src/app/api/gym/agenda/route.ts](../../../src/app/api/gym/agenda/route.ts) | GET, POST, PATCH, DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/analytics/export/route.ts](../../../src/app/api/gym/analytics/export/route.ts) | POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/analytics/kpis/route.ts](../../../src/app/api/gym/analytics/kpis/route.ts) | GET | requireGymWorkspaceAccess |
| [src/app/api/gym/communication/notifications/route.ts](../../../src/app/api/gym/communication/notifications/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/credits/balance/route.ts](../../../src/app/api/gym/credits/balance/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/credits/packages/route.ts](../../../src/app/api/gym/credits/packages/route.ts) | GET | Delegado; ver imports/serviço |
| [src/app/api/gym/credits/purchase/route.ts](../../../src/app/api/gym/credits/purchase/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/dashboard/route.ts](../../../src/app/api/gym/dashboard/route.ts) | GET | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/cron-expire/route.ts](../../../src/app/api/gym/enrollments/cron-expire/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/route.ts](../../../src/app/api/gym/enrollments/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/accept/route.ts](../../../src/app/api/gym/enrollments/[id]/accept/route.ts) | GET, POST | Delegado; ver imports/serviço |
| [src/app/api/gym/enrollments/[id]/activate/route.ts](../../../src/app/api/gym/enrollments/[id]/activate/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/cancel/route.ts](../../../src/app/api/gym/enrollments/[id]/cancel/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/cancel/withdraw/route.ts](../../../src/app/api/gym/enrollments/[id]/cancel/withdraw/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/change-plan/route.ts](../../../src/app/api/gym/enrollments/[id]/change-plan/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/pause/route.ts](../../../src/app/api/gym/enrollments/[id]/pause/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/renew/route.ts](../../../src/app/api/gym/enrollments/[id]/renew/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/resume/route.ts](../../../src/app/api/gym/enrollments/[id]/resume/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/route.ts](../../../src/app/api/gym/enrollments/[id]/route.ts) | GET, PATCH | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/simulate-change-plan/route.ts](../../../src/app/api/gym/enrollments/[id]/simulate-change-plan/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/subscription/cycle/route.ts](../../../src/app/api/gym/enrollments/[id]/subscription/cycle/route.ts) | POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/subscription/reconcile/route.ts](../../../src/app/api/gym/enrollments/[id]/subscription/reconcile/route.ts) | POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/enrollments/[id]/subscription/route.ts](../../../src/app/api/gym/enrollments/[id]/subscription/route.ts) | POST, DELETE | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/finance/accounts/route.ts](../../../src/app/api/gym/finance/accounts/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/billings/route.ts](../../../src/app/api/gym/finance/billings/route.ts) | GET, POST | retiredGymGatewayOperation |
| [src/app/api/gym/finance/billings/[id]/refund/route.ts](../../../src/app/api/gym/finance/billings/[id]/refund/route.ts) | POST | retiredGymGatewayOperation |
| [src/app/api/gym/finance/cash-drawer/close/route.ts](../../../src/app/api/gym/finance/cash-drawer/close/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/cash-drawer/movements/route.ts](../../../src/app/api/gym/finance/cash-drawer/movements/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/cash-drawer/reconcile/route.ts](../../../src/app/api/gym/finance/cash-drawer/reconcile/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/cash-drawer/route.ts](../../../src/app/api/gym/finance/cash-drawer/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/expenses/categories/route.ts](../../../src/app/api/gym/finance/expenses/categories/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/expenses/route.ts](../../../src/app/api/gym/finance/expenses/route.ts) | GET, POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/finance/expenses/[id]/cancel/route.ts](../../../src/app/api/gym/finance/expenses/[id]/cancel/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/expenses/[id]/pay/route.ts](../../../src/app/api/gym/finance/expenses/[id]/pay/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/expenses/[id]/payments/[paymentId]/reverse/route.ts](../../../src/app/api/gym/finance/expenses/[id]/payments/[paymentId]/reverse/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/invoices/route.ts](../../../src/app/api/gym/finance/invoices/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/legacy/route.ts](../../../src/app/api/gym/finance/legacy/route.ts) | GET | assertGymFinanceAuthority, requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/finance/payments/route.ts](../../../src/app/api/gym/finance/payments/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/payments/[id]/receipt/route.ts](../../../src/app/api/gym/finance/payments/[id]/receipt/route.ts) | GET | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/payments/[id]/reverse/route.ts](../../../src/app/api/gym/finance/payments/[id]/reverse/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/payments/[id]/route.ts](../../../src/app/api/gym/finance/payments/[id]/route.ts) | PATCH, DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/profile/route.ts](../../../src/app/api/gym/finance/profile/route.ts) | GET, POST | retiredGymGatewayOperation |
| [src/app/api/gym/finance/reconciliation/reprocess/route.ts](../../../src/app/api/gym/finance/reconciliation/reprocess/route.ts) | POST | retiredGymGatewayOperation |
| [src/app/api/gym/finance/reconciliation/route.ts](../../../src/app/api/gym/finance/reconciliation/route.ts) | GET, POST | retiredGymGatewayOperation |
| [src/app/api/gym/finance/suppliers/route.ts](../../../src/app/api/gym/finance/suppliers/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/sync-balance/route.ts](../../../src/app/api/gym/finance/sync-balance/route.ts) | POST | retiredGymGatewayOperation |
| [src/app/api/gym/finance/transfers/route.ts](../../../src/app/api/gym/finance/transfers/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/finance/wallet/payout/route.ts](../../../src/app/api/gym/finance/wallet/payout/route.ts) | POST | retiredGymGatewayOperation |
| [src/app/api/gym/finance/wallet/route.ts](../../../src/app/api/gym/finance/wallet/route.ts) | GET | retiredGymGatewayOperation |
| [src/app/api/gym/guardians/[id]/invite/route.ts](../../../src/app/api/gym/guardians/[id]/invite/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/guardians/[id]/route.ts](../../../src/app/api/gym/guardians/[id]/route.ts) | PATCH, DELETE | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/guardians/[id]/verify/route.ts](../../../src/app/api/gym/guardians/[id]/verify/route.ts) | POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/import/commit/route.ts](../../../src/app/api/gym/import/commit/route.ts) | POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/import/preview/route.ts](../../../src/app/api/gym/import/preview/route.ts) | POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/import/template/route.ts](../../../src/app/api/gym/import/template/route.ts) | GET | Delegado; ver imports/serviço |
| [src/app/api/gym/invitations/accept/route.ts](../../../src/app/api/gym/invitations/accept/route.ts) | GET, POST | Delegado; ver imports/serviço |
| [src/app/api/gym/invitations/route.ts](../../../src/app/api/gym/invitations/route.ts) | GET | Delegado; ver imports/serviço |
| [src/app/api/gym/invitations/[id]/route.ts](../../../src/app/api/gym/invitations/[id]/route.ts) | DELETE | Delegado; ver imports/serviço |
| [src/app/api/gym/migration/route.ts](../../../src/app/api/gym/migration/route.ts) | POST, GET | requireGymWorkspaceAccess |
| [src/app/api/gym/migration/[id]/commit/route.ts](../../../src/app/api/gym/migration/[id]/commit/route.ts) | POST | Delegado; ver imports/serviço |
| [src/app/api/gym/migration/[id]/pause/route.ts](../../../src/app/api/gym/migration/[id]/pause/route.ts) | POST | Delegado; ver imports/serviço |
| [src/app/api/gym/migration/[id]/preview/route.ts](../../../src/app/api/gym/migration/[id]/preview/route.ts) | GET, POST | Delegado; ver imports/serviço |
| [src/app/api/gym/migration/[id]/process/route.ts](../../../src/app/api/gym/migration/[id]/process/route.ts) | POST | Delegado; ver imports/serviço |
| [src/app/api/gym/migration/[id]/records/route.ts](../../../src/app/api/gym/migration/[id]/records/route.ts) | GET | Delegado; ver imports/serviço |
| [src/app/api/gym/migration/[id]/records/[recordId]/route.ts](../../../src/app/api/gym/migration/[id]/records/[recordId]/route.ts) | PATCH, DELETE | Delegado; ver imports/serviço |
| [src/app/api/gym/migration/[id]/route.ts](../../../src/app/api/gym/migration/[id]/route.ts) | GET, DELETE | Delegado; ver imports/serviço |
| [src/app/api/gym/plans/route.ts](../../../src/app/api/gym/plans/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/plans/[id]/route.ts](../../../src/app/api/gym/plans/[id]/route.ts) | GET, PATCH | requireGymWorkspaceAccess |
| [src/app/api/gym/plans/[id]/versions/route.ts](../../../src/app/api/gym/plans/[id]/versions/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/privacy/delete-request/route.ts](../../../src/app/api/gym/privacy/delete-request/route.ts) | POST | requireGymPrivacyAccess, requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/privacy/export/route.ts](../../../src/app/api/gym/privacy/export/route.ts) | POST | requireGymPrivacyAccess, requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/privacy/requests/route.ts](../../../src/app/api/gym/privacy/requests/route.ts) | GET, POST | requireGymWorkspaceAccess, requireGymPrivacyAccess |
| [src/app/api/gym/reviews/route.ts](../../../src/app/api/gym/reviews/route.ts) | GET | requireGymWorkspaceAccess |
| [src/app/api/gym/reviews/[kind]/[id]/route.ts](../../../src/app/api/gym/reviews/[kind]/[id]/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/settings/branding/route.ts](../../../src/app/api/gym/settings/branding/route.ts) | GET, PATCH | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/settings/closure/route.ts](../../../src/app/api/gym/settings/closure/route.ts) | GET, POST | Delegado; ver imports/serviço |
| [src/app/api/gym/settings/transfer-ownership/route.ts](../../../src/app/api/gym/settings/transfer-ownership/route.ts) | POST | Delegado; ver imports/serviço |
| [src/app/api/gym/staff/route.ts](../../../src/app/api/gym/staff/route.ts) | GET, POST | Delegado; ver imports/serviço |
| [src/app/api/gym/staff/[id]/route.ts](../../../src/app/api/gym/staff/[id]/route.ts) | GET, PATCH, DELETE | Delegado; ver imports/serviço |
| [src/app/api/gym/staff/[id]/terminate/route.ts](../../../src/app/api/gym/staff/[id]/terminate/route.ts) | POST | Delegado; ver imports/serviço |
| [src/app/api/gym/students/check-duplicate/route.ts](../../../src/app/api/gym/students/check-duplicate/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/students/identity-link/route.ts](../../../src/app/api/gym/students/identity-link/route.ts) | POST, GET | requireGymWorkspaceAccess, assertActorAuthority |
| [src/app/api/gym/students/route.ts](../../../src/app/api/gym/students/route.ts) | GET, POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/students/[id]/cancel/route.ts](../../../src/app/api/gym/students/[id]/cancel/route.ts) | POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/students/[id]/evaluations/route.ts](../../../src/app/api/gym/students/[id]/evaluations/route.ts) | GET, POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/students/[id]/evaluations/[evalId]/route.ts](../../../src/app/api/gym/students/[id]/evaluations/[evalId]/route.ts) | DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/files/route.ts](../../../src/app/api/gym/students/[id]/files/route.ts) | GET, POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/students/[id]/files/[fileId]/route.ts](../../../src/app/api/gym/students/[id]/files/[fileId]/route.ts) | DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/finance/route.ts](../../../src/app/api/gym/students/[id]/finance/route.ts) | GET, POST, PUT | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/guardians/route.ts](../../../src/app/api/gym/students/[id]/guardians/route.ts) | GET, POST | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/students/[id]/health-profile/route.ts](../../../src/app/api/gym/students/[id]/health-profile/route.ts) | GET, PATCH | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/invite/route.ts](../../../src/app/api/gym/students/[id]/invite/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/majority/route.ts](../../../src/app/api/gym/students/[id]/majority/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/progress/photos/request/route.ts](../../../src/app/api/gym/students/[id]/progress/photos/request/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/progress/photos/route.ts](../../../src/app/api/gym/students/[id]/progress/photos/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/progress/photos/[photoId]/route.ts](../../../src/app/api/gym/students/[id]/progress/photos/[photoId]/route.ts) | PATCH, DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/progress/route.ts](../../../src/app/api/gym/students/[id]/progress/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/progress/[progressId]/route.ts](../../../src/app/api/gym/students/[id]/progress/[progressId]/route.ts) | DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/route.ts](../../../src/app/api/gym/students/[id]/route.ts) | GET, PATCH, DELETE | requireGymWorkspaceAccess, requireWorkspaceAccess |
| [src/app/api/gym/students/[id]/workout-logs/route.ts](../../../src/app/api/gym/students/[id]/workout-logs/route.ts) | GET | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/workouts/route.ts](../../../src/app/api/gym/students/[id]/workouts/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/students/[id]/workouts/[workoutId]/route.ts](../../../src/app/api/gym/students/[id]/workouts/[workoutId]/route.ts) | PATCH, DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/subscription/route.ts](../../../src/app/api/gym/subscription/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/assign/route.ts](../../../src/app/api/gym/workouts/assign/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/exercises/route.ts](../../../src/app/api/gym/workouts/exercises/route.ts) | GET | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/muscle-groups/route.ts](../../../src/app/api/gym/workouts/muscle-groups/route.ts) | GET | Delegado; ver imports/serviço |
| [src/app/api/gym/workouts/route.ts](../../../src/app/api/gym/workouts/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/students/route.ts](../../../src/app/api/gym/workouts/students/route.ts) | GET | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/templates/route.ts](../../../src/app/api/gym/workouts/templates/route.ts) | GET, POST | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/templates/[id]/advanced/route.ts](../../../src/app/api/gym/workouts/templates/[id]/advanced/route.ts) | GET, PATCH | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/templates/[id]/route.ts](../../../src/app/api/gym/workouts/templates/[id]/route.ts) | PATCH, DELETE | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/[id]/duplicate/route.ts](../../../src/app/api/gym/workouts/[id]/duplicate/route.ts) | POST | requireGymWorkspaceAccess |
| [src/app/api/gym/workouts/[id]/route.ts](../../../src/app/api/gym/workouts/[id]/route.ts) | GET, PUT, DELETE | requireGymWorkspaceAccess |

## Todos os arquivos da aplicação de workspaces

Inclui serviços compartilhados por PERSONAL e GYM. A revisão aprofundada priorizou as cadeias de autoridade, contratos, financeiro, dados pessoais e importação.

| Arquivo | Linhas |
|---|---:|
| [src/modules/workspaces/application/actions.ts](../../../src/modules/workspaces/application/actions.ts) | 98 |
| [src/modules/workspaces/application/actor-authority.ts](../../../src/modules/workspaces/application/actor-authority.ts) | 23 |
| [src/modules/workspaces/application/backfill-service.ts](../../../src/modules/workspaces/application/backfill-service.ts) | 132 |
| [src/modules/workspaces/application/branding-service.ts](../../../src/modules/workspaces/application/branding-service.ts) | 62 |
| [src/modules/workspaces/application/cash-drawer-expense-service.ts](../../../src/modules/workspaces/application/cash-drawer-expense-service.ts) | 481 |
| [src/modules/workspaces/application/cash-mutations.ts](../../../src/modules/workspaces/application/cash-mutations.ts) | 306 |
| [src/modules/workspaces/application/chat-authority.ts](../../../src/modules/workspaces/application/chat-authority.ts) | 40 |
| [src/modules/workspaces/application/context-service.ts](../../../src/modules/workspaces/application/context-service.ts) | 220 |
| [src/modules/workspaces/application/enrollment-activation.ts](../../../src/modules/workspaces/application/enrollment-activation.ts) | 56 |
| [src/modules/workspaces/application/enrollment-cancellation-effects.ts](../../../src/modules/workspaces/application/enrollment-cancellation-effects.ts) | 13 |
| [src/modules/workspaces/application/enrollment-cancellation.ts](../../../src/modules/workspaces/application/enrollment-cancellation.ts) | 57 |
| [src/modules/workspaces/application/enrollment-closure-job.ts](../../../src/modules/workspaces/application/enrollment-closure-job.ts) | 40 |
| [src/modules/workspaces/application/enrollment-contract.ts](../../../src/modules/workspaces/application/enrollment-contract.ts) | 97 |
| [src/modules/workspaces/application/enrollment-creation.ts](../../../src/modules/workspaces/application/enrollment-creation.ts) | 68 |
| [src/modules/workspaces/application/enrollment-lock.ts](../../../src/modules/workspaces/application/enrollment-lock.ts) | 7 |
| [src/modules/workspaces/application/enrollment-pause.ts](../../../src/modules/workspaces/application/enrollment-pause.ts) | 155 |
| [src/modules/workspaces/application/enrollment-revision.ts](../../../src/modules/workspaces/application/enrollment-revision.ts) | 102 |
| [src/modules/workspaces/application/enrollment-service.ts](../../../src/modules/workspaces/application/enrollment-service.ts) | 362 |
| [src/modules/workspaces/application/enrollment-uniqueness.ts](../../../src/modules/workspaces/application/enrollment-uniqueness.ts) | 13 |
| [src/modules/workspaces/application/enrollment-update.ts](../../../src/modules/workspaces/application/enrollment-update.ts) | 142 |
| [src/modules/workspaces/application/entitlements-service.ts](../../../src/modules/workspaces/application/entitlements-service.ts) | 264 |
| [src/modules/workspaces/application/guard.ts](../../../src/modules/workspaces/application/guard.ts) | 275 |
| [src/modules/workspaces/application/guardian-commands.ts](../../../src/modules/workspaces/application/guardian-commands.ts) | 99 |
| [src/modules/workspaces/application/guardian-identity.ts](../../../src/modules/workspaces/application/guardian-identity.ts) | 18 |
| [src/modules/workspaces/application/guardian-ingress-http.ts](../../../src/modules/workspaces/application/guardian-ingress-http.ts) | 12 |
| [src/modules/workspaces/application/guardian-ingress.ts](../../../src/modules/workspaces/application/guardian-ingress.ts) | 114 |
| [src/modules/workspaces/application/guardian-legal-commands.ts](../../../src/modules/workspaces/application/guardian-legal-commands.ts) | 38 |
| [src/modules/workspaces/application/guardian-portal.ts](../../../src/modules/workspaces/application/guardian-portal.ts) | 73 |
| [src/modules/workspaces/application/guardian-privacy.ts](../../../src/modules/workspaces/application/guardian-privacy.ts) | 21 |
| [src/modules/workspaces/application/gym-administrative-review.ts](../../../src/modules/workspaces/application/gym-administrative-review.ts) | 206 |
| [src/modules/workspaces/application/gym-analytics-service.ts](../../../src/modules/workspaces/application/gym-analytics-service.ts) | 398 |
| [src/modules/workspaces/application/gym-assessment-service.ts](../../../src/modules/workspaces/application/gym-assessment-service.ts) | 247 |
| [src/modules/workspaces/application/gym-chat-contacts.ts](../../../src/modules/workspaces/application/gym-chat-contacts.ts) | 50 |
| [src/modules/workspaces/application/gym-closure.ts](../../../src/modules/workspaces/application/gym-closure.ts) | 91 |
| [src/modules/workspaces/application/gym-communication-service.ts](../../../src/modules/workspaces/application/gym-communication-service.ts) | 63 |
| [src/modules/workspaces/application/gym-dashboard-metrics.ts](../../../src/modules/workspaces/application/gym-dashboard-metrics.ts) | 655 |
| [src/modules/workspaces/application/gym-expense-catalog.ts](../../../src/modules/workspaces/application/gym-expense-catalog.ts) | 74 |
| [src/modules/workspaces/application/gym-feature-flags-service.ts](../../../src/modules/workspaces/application/gym-feature-flags-service.ts) | 78 |
| [src/modules/workspaces/application/gym-finance-http.ts](../../../src/modules/workspaces/application/gym-finance-http.ts) | 11 |
| [src/modules/workspaces/application/gym-finance-page-data.ts](../../../src/modules/workspaces/application/gym-finance-page-data.ts) | 44 |
| [src/modules/workspaces/application/gym-financial-service.ts](../../../src/modules/workspaces/application/gym-financial-service.ts) | 340 |
| [src/modules/workspaces/application/gym-health-profile.ts](../../../src/modules/workspaces/application/gym-health-profile.ts) | 31 |
| [src/modules/workspaces/application/gym-identity-link.ts](../../../src/modules/workspaces/application/gym-identity-link.ts) | 70 |
| [src/modules/workspaces/application/gym-identity-lookup.ts](../../../src/modules/workspaces/application/gym-identity-lookup.ts) | 30 |
| [src/modules/workspaces/application/gym-import-commands.ts](../../../src/modules/workspaces/application/gym-import-commands.ts) | 206 |
| [src/modules/workspaces/application/gym-import-service.ts](../../../src/modules/workspaces/application/gym-import-service.ts) | 117 |
| [src/modules/workspaces/application/gym-license.ts](../../../src/modules/workspaces/application/gym-license.ts) | 26 |
| [src/modules/workspaces/application/gym-majority-transition.ts](../../../src/modules/workspaces/application/gym-majority-transition.ts) | 38 |
| [src/modules/workspaces/application/gym-module-authority.ts](../../../src/modules/workspaces/application/gym-module-authority.ts) | 21 |
| [src/modules/workspaces/application/gym-offboarding-service.ts](../../../src/modules/workspaces/application/gym-offboarding-service.ts) | 77 |
| [src/modules/workspaces/application/gym-personal-agenda.ts](../../../src/modules/workspaces/application/gym-personal-agenda.ts) | 60 |
| [src/modules/workspaces/application/gym-privacy-archive.ts](../../../src/modules/workspaces/application/gym-privacy-archive.ts) | 31 |
| [src/modules/workspaces/application/gym-privacy-authority.ts](../../../src/modules/workspaces/application/gym-privacy-authority.ts) | 28 |
| [src/modules/workspaces/application/gym-privacy-requests.ts](../../../src/modules/workspaces/application/gym-privacy-requests.ts) | 185 |
| [src/modules/workspaces/application/gym-progress-commands.ts](../../../src/modules/workspaces/application/gym-progress-commands.ts) | 33 |
| [src/modules/workspaces/application/gym-progress-photo.ts](../../../src/modules/workspaces/application/gym-progress-photo.ts) | 26 |
| [src/modules/workspaces/application/gym-provisioning.ts](../../../src/modules/workspaces/application/gym-provisioning.ts) | 50 |
| [src/modules/workspaces/application/gym-purge.ts](../../../src/modules/workspaces/application/gym-purge.ts) | 167 |
| [src/modules/workspaces/application/gym-reception-query.ts](../../../src/modules/workspaces/application/gym-reception-query.ts) | 233 |
| [src/modules/workspaces/application/gym-report-authority.ts](../../../src/modules/workspaces/application/gym-report-authority.ts) | 49 |
| [src/modules/workspaces/application/gym-report-contract-aggregates.ts](../../../src/modules/workspaces/application/gym-report-contract-aggregates.ts) | 92 |
| [src/modules/workspaces/application/gym-report-financial-aggregates.ts](../../../src/modules/workspaces/application/gym-report-financial-aggregates.ts) | 72 |
| [src/modules/workspaces/application/gym-selectors.ts](../../../src/modules/workspaces/application/gym-selectors.ts) | 29 |
| [src/modules/workspaces/application/gym-service.ts](../../../src/modules/workspaces/application/gym-service.ts) | 109 |
| [src/modules/workspaces/application/gym-staff-http.ts](../../../src/modules/workspaces/application/gym-staff-http.ts) | 28 |
| [src/modules/workspaces/application/gym-staff-query.ts](../../../src/modules/workspaces/application/gym-staff-query.ts) | 93 |
| [src/modules/workspaces/application/gym-storage-reconciliation.ts](../../../src/modules/workspaces/application/gym-storage-reconciliation.ts) | 82 |
| [src/modules/workspaces/application/gym-storage.ts](../../../src/modules/workspaces/application/gym-storage.ts) | 127 |
| [src/modules/workspaces/application/gym-student-commands.ts](../../../src/modules/workspaces/application/gym-student-commands.ts) | 210 |
| [src/modules/workspaces/application/gym-student-finance.ts](../../../src/modules/workspaces/application/gym-student-finance.ts) | 46 |
| [src/modules/workspaces/application/gym-student-health-events.ts](../../../src/modules/workspaces/application/gym-student-health-events.ts) | 43 |
| [src/modules/workspaces/application/gym-student-ingress.ts](../../../src/modules/workspaces/application/gym-student-ingress.ts) | 114 |
| [src/modules/workspaces/application/gym-student-offboarding.ts](../../../src/modules/workspaces/application/gym-student-offboarding.ts) | 42 |
| [src/modules/workspaces/application/gym-student-queries.ts](../../../src/modules/workspaces/application/gym-student-queries.ts) | 136 |
| [src/modules/workspaces/application/gym-student-service.ts](../../../src/modules/workspaces/application/gym-student-service.ts) | 128 |
| [src/modules/workspaces/application/gym-unit-access.ts](../../../src/modules/workspaces/application/gym-unit-access.ts) | 32 |
| [src/modules/workspaces/application/gym-unit-commands.ts](../../../src/modules/workspaces/application/gym-unit-commands.ts) | 56 |
| [src/modules/workspaces/application/gym-workout-advanced.ts](../../../src/modules/workspaces/application/gym-workout-advanced.ts) | 53 |
| [src/modules/workspaces/application/gym-workout-commands.ts](../../../src/modules/workspaces/application/gym-workout-commands.ts) | 170 |
| [src/modules/workspaces/application/gym-workout-http.ts](../../../src/modules/workspaces/application/gym-workout-http.ts) | 21 |
| [src/modules/workspaces/application/gym-workout-query.ts](../../../src/modules/workspaces/application/gym-workout-query.ts) | 57 |
| [src/modules/workspaces/application/gym-workout-service.ts](../../../src/modules/workspaces/application/gym-workout-service.ts) | 53 |
| [src/modules/workspaces/application/invoice-service.ts](../../../src/modules/workspaces/application/invoice-service.ts) | 486 |
| [src/modules/workspaces/application/manual-finance-authority.ts](../../../src/modules/workspaces/application/manual-finance-authority.ts) | 55 |
| [src/modules/workspaces/application/manual-finance-service.ts](../../../src/modules/workspaces/application/manual-finance-service.ts) | 147 |
| [src/modules/workspaces/application/manual-invoice-service.ts](../../../src/modules/workspaces/application/manual-invoice-service.ts) | 72 |
| [src/modules/workspaces/application/manual-subscription-service.ts](../../../src/modules/workspaces/application/manual-subscription-service.ts) | 148 |
| [src/modules/workspaces/application/minor-service.ts](../../../src/modules/workspaces/application/minor-service.ts) | 99 |
| [src/modules/workspaces/application/ownership-service.ts](../../../src/modules/workspaces/application/ownership-service.ts) | 94 |
| [src/modules/workspaces/application/payer-service.ts](../../../src/modules/workspaces/application/payer-service.ts) | 38 |
| [src/modules/workspaces/application/personal-affiliation.ts](../../../src/modules/workspaces/application/personal-affiliation.ts) | 123 |
| [src/modules/workspaces/application/personal-student-authority.ts](../../../src/modules/workspaces/application/personal-student-authority.ts) | 25 |
| [src/modules/workspaces/application/plan-service.ts](../../../src/modules/workspaces/application/plan-service.ts) | 114 |
| [src/modules/workspaces/application/privacy-service.ts](../../../src/modules/workspaces/application/privacy-service.ts) | 118 |
| [src/modules/workspaces/application/realtime-capabilities.ts](../../../src/modules/workspaces/application/realtime-capabilities.ts) | 55 |
| [src/modules/workspaces/application/retired-gym-gateway.ts](../../../src/modules/workspaces/application/retired-gym-gateway.ts) | 21 |
| [src/modules/workspaces/application/staff-capacity.ts](../../../src/modules/workspaces/application/staff-capacity.ts) | 18 |
| [src/modules/workspaces/application/staff-mutations.ts](../../../src/modules/workspaces/application/staff-mutations.ts) | 135 |
| [src/modules/workspaces/application/staff-service.ts](../../../src/modules/workspaces/application/staff-service.ts) | 55 |
| [src/modules/workspaces/application/student-authority.ts](../../../src/modules/workspaces/application/student-authority.ts) | 42 |
| [src/modules/workspaces/application/student-file-mutations.ts](../../../src/modules/workspaces/application/student-file-mutations.ts) | 55 |
| [src/modules/workspaces/application/subscription-service.ts](../../../src/modules/workspaces/application/subscription-service.ts) | 27 |
| [src/modules/workspaces/application/superadmin-finance.ts](../../../src/modules/workspaces/application/superadmin-finance.ts) | 94 |
| [src/modules/workspaces/application/superadmin-service.ts](../../../src/modules/workspaces/application/superadmin-service.ts) | 55 |
| [src/modules/workspaces/application/team-lifecycle.ts](../../../src/modules/workspaces/application/team-lifecycle.ts) | 139 |
| [src/modules/workspaces/application/transaction.ts](../../../src/modules/workspaces/application/transaction.ts) | 48 |
| [src/modules/workspaces/application/workspace-administration.ts](../../../src/modules/workspaces/application/workspace-administration.ts) | 64 |

## Modelos do schema atual

Total: 143; 42 nomes iniciam com Gym. Os modelos globais/compartilhados também fazem parte da fronteira da academia. Referência: [prisma/schema.prisma](../../../prisma/schema.prisma).

- User — linha 31.
- UserTotpDevice — linha 170.
- Workspace — linha 183.
- WorkspaceMember — linha 263.
- Plan — linha 335.
- Subscription — linha 361.
- FreeTrial — linha 384.
- Transaction — linha 395.
- Coupon — linha 411.
- AuditLog — linha 423.
- GymStorageObject — linha 439.
- Account — linha 455.
- Session — linha 474.
- VerificationToken — linha 482.
- PasswordResetToken — linha 492.
- CreditGrantChallenge — linha 502.
- MuscleGroup — linha 523.
- Exercise — linha 532.
- TrainerVideo — linha 553.
- TrainerVideoExercise — linha 576.
- Workout — linha 591.
- WorkoutExercise — linha 620.
- SystemSetting — linha 645.
- SubscriptionActivity — linha 655.
- SystemIntegration — linha 667.
- ExerciseAdjustmentRequest — linha 681.
- AdjustmentMessage — linha 698.
- WorkspacePlan — linha 714.
- WorkspacePayment — linha 728.
- PendingStudent — linha 755.
- TrainerTask — linha 771.
- StudentProgress — linha 795.
- StudentProgressPhoto — linha 834.
- PhysicalEvaluation — linha 858.
- StudentFile — linha 887.
- WorkoutLog — linha 911.
- DailyFeedback — linha 935.
- WorkoutExerciseGroup — linha 962.
- EngageExperience — linha 1007.
- EngageBanner — linha 1043.
- EngageUserStatus — linha 1061.
- EngageEventLog — linha 1081.
- EngagePushNotification — linha 1105.
- EngagePushLog — linha 1155.
- Lead — linha 1176.
- LeadActivity — linha 1208.
- LeadTask — linha 1219.
- Tag — linha 1235.
- CustomFieldDefinition — linha 1249.
- CustomFieldValue — linha 1264.
- LeadFile — linha 1278.
- NotificationDevice — linha 1296.
- Notification — linha 1312.
- NotificationPreference — linha 1341.
- ReferralCommission — linha 1350.
- PayoutRequest — linha 1370.
- Conversation — linha 1409.
- ConversationParticipant — linha 1424.
- Message — linha 1440.
- DataDeletionRequest — linha 1463.
- ImportJob — linha 1554.
- ImportSource — linha 1603.
- ImportRecord — linha 1631.
- ImportEntityResult — linha 1665.
- GeminiUsageLog — linha 1683.
- CreditPackage — linha 1709.
- AbacateWebhookReceipt — linha 1726.
- CreditPurchase — linha 1733.
- PaymentProviderAccount — linha 1878.
- WalletBalanceSnapshot — linha 1930.
- GatewayCustomer — linha 1949.
- PersonalBillingPlan — linha 1975.
- StudentSubscription — linha 1996.
- StudentBilling — linha 2029.
- ActivationFeeRecoveryOperation — linha 2102.
- PaymentAttempt — linha 2121.
- PaymentSplit — linha 2138.
- WalletLedgerEntry — linha 2158.
- WalletPayoutRequest — linha 2188.
- PaymentWebhookEvent — linha 2216.
- DeliveryOutbox — linha 2249.
- GymPurgeJob — linha 2277.
- GymPurgeReceipt — linha 2298.
- GymCommunicationDispatch — linha 2306.
- FeeRuleVersion — linha 2323.
- FinancialReconciliationRun — linha 2340.
- FinancialAuditLog — linha 2354.
- RoadmapStatus — linha 2370.
- RoadmapCategory — linha 2383.
- RoadmapFeature — linha 2395.
- RoadmapVote — linha 2438.
- RoadmapComment — linha 2450.
- RoadmapPoll — linha 2474.
- RoadmapPollOption — linha 2492.
- RoadmapPollVote — linha 2503.
- RoadmapAuditLog — linha 2518.
- LegalDocument — linha 2593.
- LegalAcceptance — linha 2612.
- PrivacyConsent — linha 2640.
- DataSubjectRequest — linha 2657.
- SecurityIncident — linha 2682.
- GymSettings — linha 2705.
- GymUnit — linha 2724.
- WorkspaceRoleGrant — linha 2762.
- WorkspaceInvitation — linha 2780.
- GymStaffProfile — linha 2803.
- GymStudentProfile — linha 2819.
- GymGuardian — linha 2848.
- WorkspaceSubscription — linha 2887.
- GymPlan — linha 2935.
- GymPlanVersion — linha 2951.
- GymEnrollment — linha 2980.
- GymContractAcceptance — linha 3067.
- GymEnrollmentEvent — linha 3088.
- GymEnrollmentPause — linha 3106.
- GymInvoice — linha 3189.
- GymInvoiceItem — linha 3256.
- GymPayment — linha 3275.
- GymPaymentAllocation — linha 3328.
- GymFinancialAccount — linha 3376.
- GymAccountTransfer — linha 3406.
- GymExpenseCategory — linha 3431.
- GymSupplier — linha 3448.
- GymExpense — linha 3469.
- GymExpensePayment — linha 3519.
- GymCashDrawerSession — linha 3541.
- GymCashDrawerMovement — linha 3579.
- GymReconciliationDivergence — linha 3618.
- GymAdministrativeReview — linha 3647.
- GymModality — linha 3681.
- GymRoom — linha 3702.
- GymClassSchedule — linha 3722.
- GymClassSession — linha 3756.
- GymClassBooking — linha 3819.
- GymClassWaitlist — linha 3850.
- GymAccessGrant — linha 3892.
- GymAccessOverride — linha 3922.
- GymAccessDecisionLog — linha 3947.
- GymAccessDevice — linha 4008.
- GymDeviceCommand — linha 4055.
- GymAccessLog — linha 4084.
- GymAccessReconciliationDivergence — linha 4138.
- ScheduledJobState — linha 4171.

## Reconstituição estática do histórico padrão

55 arquivos SQL no diretório padrão. 59 nomes de tabelas aparecem em CREATE TABLE; 84 modelos do schema não têm CREATE TABLE nesse histórico. Isto identifica uma lacuna estática, não substitui execução de migrations nem comparação com banco implantado. Existe um histórico alternativo em prisma/baseline-migrations.

Modelos sem criação identificada no histórico padrão:

UserTotpDevice, FreeTrial, Transaction, Coupon, PasswordResetToken, MuscleGroup, Exercise, TrainerVideo, TrainerVideoExercise, Workout, WorkoutExercise, SystemSetting, SubscriptionActivity, SystemIntegration, ExerciseAdjustmentRequest, AdjustmentMessage, WorkspacePlan, WorkspacePayment, PendingStudent, TrainerTask, StudentProgress, StudentProgressPhoto, PhysicalEvaluation, StudentFile, WorkoutLog, DailyFeedback, WorkoutExerciseGroup, EngageExperience, EngageBanner, EngageUserStatus, EngageEventLog, EngagePushNotification, EngagePushLog, Lead, LeadActivity, LeadTask, Tag, CustomFieldDefinition, CustomFieldValue, LeadFile, NotificationDevice, Notification, NotificationPreference, ReferralCommission, PayoutRequest, Conversation, ConversationParticipant, Message, DataDeletionRequest, ImportJob, ImportSource, ImportRecord, ImportEntityResult, GeminiUsageLog, CreditPackage, CreditPurchase, PaymentProviderAccount, WalletBalanceSnapshot, GatewayCustomer, PersonalBillingPlan, StudentSubscription, StudentBilling, PaymentAttempt, PaymentSplit, WalletLedgerEntry, WalletPayoutRequest, PaymentWebhookEvent, FeeRuleVersion, FinancialReconciliationRun, FinancialAuditLog, RoadmapStatus, RoadmapCategory, RoadmapFeature, RoadmapVote, RoadmapComment, RoadmapPoll, RoadmapPollOption, RoadmapPollVote, RoadmapAuditLog, LegalDocument, LegalAcceptance, PrivacyConsent, DataSubjectRequest, SecurityIncident
