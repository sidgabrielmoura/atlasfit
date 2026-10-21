# Inventário de APIs e contratos

Anexo do [diagnóstico](diagnostico-modulo-academias.md). Extração AST dos handlers, cruzada com a inspeção de serviços e consumidores descrita no relatório. Os trechos abaixo registram o contrato implementado, inclusive validações incompletas; não representam especificação aprovada. Não houve chamadas HTTP reais. Links `#L` identificam linhas do snapshot, podendo exigir abrir o arquivo no editor.

O middleware não protege `/api`: conferir o guard de cada operação. Guard compartilhado pode devolver 400/401/403/404; o catch local define a resposta restante. `anyCapability` é OU; `requiredCapabilities`/`allCapabilities` é E. Perfil efetivo depende dos grants e do fallback documentados em GYM-AUD-001/002.

| Método | Rota | Guard explícito | Implementação |
|---|---|---|---|
| GET | `/api/ably/token` | auth() | [src/app/api/ably/token/route.ts:5](<../../../src/app/api/ably/token/route.ts#L5>) |
| GET | `/api/cron/engage-push` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/cron/engage-push/route.ts:43](<../../../src/app/api/cron/engage-push/route.ts#L43>) |
| POST | `/api/cron/engage-push` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/cron/engage-push/route.ts:70](<../../../src/app/api/cron/engage-push/route.ts#L70>) |
| GET | `/api/cron/process-recurrence` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/cron/process-recurrence/route.ts:4](<../../../src/app/api/cron/process-recurrence/route.ts#L4>) |
| GET | `/api/guardian/dependents` | auth() | [src/app/api/guardian/dependents/route.ts:6](<../../../src/app/api/guardian/dependents/route.ts#L6>) |
| POST | `/api/guardian/dependents/[id]/accept-terms` | auth() | [src/app/api/guardian/dependents/[id]/accept-terms/route.ts:7](<../../../src/app/api/guardian/dependents/[id]/accept-terms/route.ts#L7>) |
| POST | `/api/guardian/dependents/[id]/classes/book` | requireWorkspaceAccess({ workspaceId }) | [src/app/api/guardian/dependents/[id]/classes/book/route.ts:8](<../../../src/app/api/guardian/dependents/[id]/classes/book/route.ts#L8>) |
| POST | `/api/guardian/dependents/[id]/classes/cancel` | requireWorkspaceAccess({ workspaceId }) | [src/app/api/guardian/dependents/[id]/classes/cancel/route.ts:8](<../../../src/app/api/guardian/dependents/[id]/classes/cancel/route.ts#L8>) |
| GET | `/api/gym/access/divergences` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "devices.manage", "workspace.manage"] }) | [src/app/api/gym/access/divergences/route.ts:8](<../../../src/app/api/gym/access/divergences/route.ts#L8>) |
| POST | `/api/gym/access/divergences/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.override", "devices.manage", "workspace.manage"] }) | [src/app/api/gym/access/divergences/[id]/route.ts:8](<../../../src/app/api/gym/access/divergences/[id]/route.ts#L8>) |
| POST | `/api/gym/access/evaluate` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "access.override", "devices.manage", "workspace.manage"] }) | [src/app/api/gym/access/evaluate/route.ts:8](<../../../src/app/api/gym/access/evaluate/route.ts#L8>) |
| POST | `/api/gym/access/grants/sync` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) | [src/app/api/gym/access/grants/sync/route.ts:8](<../../../src/app/api/gym/access/grants/sync/route.ts#L8>) |
| GET | `/api/gym/access/members/[id]/diagnostic` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "access.override", "students.read", "workspace.manage"] }) | [src/app/api/gym/access/members/[id]/diagnostic/route.ts:8](<../../../src/app/api/gym/access/members/[id]/diagnostic/route.ts#L8>) |
| GET | `/api/gym/access/overrides` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "access.override", "workspace.manage"] }) | [src/app/api/gym/access/overrides/route.ts:8](<../../../src/app/api/gym/access/overrides/route.ts#L8>) |
| POST | `/api/gym/access/overrides` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.override", "workspace.manage"] }) | [src/app/api/gym/access/overrides/route.ts:46](<../../../src/app/api/gym/access/overrides/route.ts#L46>) |
| POST | `/api/gym/access/overrides/[id]/revoke` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.override", "workspace.manage"] }) | [src/app/api/gym/access/overrides/[id]/revoke/route.ts:8](<../../../src/app/api/gym/access/overrides/[id]/revoke/route.ts#L8>) |
| POST | `/api/gym/analytics/export` | requireWorkspaceAccess({ workspaceId, anyCapability: isFinancial ? ["reports.finance", "workspace.manage"] : ["reports.operational", "reports.finance", "workspace.manage"], }) | [src/app/api/gym/analytics/export/route.ts:9](<../../../src/app/api/gym/analytics/export/route.ts#L9>) |
| GET | `/api/gym/analytics/kpis` | requireWorkspaceAccess({ workspaceId, anyCapability: ["reports.finance", "reports.operational", "workspace.manage"], }) | [src/app/api/gym/analytics/kpis/route.ts:8](<../../../src/app/api/gym/analytics/kpis/route.ts#L8>) |
| POST | `/api/gym/biometrics/enroll` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) | [src/app/api/gym/biometrics/enroll/route.ts:8](<../../../src/app/api/gym/biometrics/enroll/route.ts#L8>) |
| POST | `/api/gym/biometrics/revoke` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) | [src/app/api/gym/biometrics/revoke/route.ts:8](<../../../src/app/api/gym/biometrics/revoke/route.ts#L8>) |
| POST | `/api/gym/classes/bookings/[id]/attendance` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) | [src/app/api/gym/classes/bookings/[id]/attendance/route.ts:8](<../../../src/app/api/gym/classes/bookings/[id]/attendance/route.ts#L8>) |
| POST | `/api/gym/classes/bookings/[id]/cancel` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) | [src/app/api/gym/classes/bookings/[id]/cancel/route.ts:8](<../../../src/app/api/gym/classes/bookings/[id]/cancel/route.ts#L8>) |
| POST | `/api/gym/classes/bookings/[id]/revert` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) | [src/app/api/gym/classes/bookings/[id]/revert/route.ts:8](<../../../src/app/api/gym/classes/bookings/[id]/revert/route.ts#L8>) |
| GET | `/api/gym/classes/modalities` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) | [src/app/api/gym/classes/modalities/route.ts:8](<../../../src/app/api/gym/classes/modalities/route.ts#L8>) |
| POST | `/api/gym/classes/modalities` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/modalities/route.ts:40](<../../../src/app/api/gym/classes/modalities/route.ts#L40>) |
| PATCH | `/api/gym/classes/modalities/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/modalities/[id]/route.ts:8](<../../../src/app/api/gym/classes/modalities/[id]/route.ts#L8>) |
| DELETE | `/api/gym/classes/modalities/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/modalities/[id]/route.ts:69](<../../../src/app/api/gym/classes/modalities/[id]/route.ts#L69>) |
| GET | `/api/gym/classes/rooms` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) | [src/app/api/gym/classes/rooms/route.ts:8](<../../../src/app/api/gym/classes/rooms/route.ts#L8>) |
| POST | `/api/gym/classes/rooms` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/rooms/route.ts:41](<../../../src/app/api/gym/classes/rooms/route.ts#L41>) |
| PATCH | `/api/gym/classes/rooms/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/rooms/[id]/route.ts:8](<../../../src/app/api/gym/classes/rooms/[id]/route.ts#L8>) |
| DELETE | `/api/gym/classes/rooms/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/rooms/[id]/route.ts:63](<../../../src/app/api/gym/classes/rooms/[id]/route.ts#L63>) |
| GET | `/api/gym/classes/schedules` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) | [src/app/api/gym/classes/schedules/route.ts:8](<../../../src/app/api/gym/classes/schedules/route.ts#L8>) |
| POST | `/api/gym/classes/schedules` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/schedules/route.ts:55](<../../../src/app/api/gym/classes/schedules/route.ts#L55>) |
| PATCH | `/api/gym/classes/schedules/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/schedules/[id]/route.ts:8](<../../../src/app/api/gym/classes/schedules/[id]/route.ts#L8>) |
| DELETE | `/api/gym/classes/schedules/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/schedules/[id]/route.ts:81](<../../../src/app/api/gym/classes/schedules/[id]/route.ts#L81>) |
| GET | `/api/gym/classes/sessions` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) | [src/app/api/gym/classes/sessions/route.ts:9](<../../../src/app/api/gym/classes/sessions/route.ts#L9>) |
| POST | `/api/gym/classes/sessions` | requireWorkspaceAccess({ workspaceId: body.workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/sessions/route.ts:59](<../../../src/app/api/gym/classes/sessions/route.ts#L59>) |
| POST | `/api/gym/classes/sessions/[id]/book` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) | [src/app/api/gym/classes/sessions/[id]/book/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/book/route.ts#L8>) |
| POST | `/api/gym/classes/sessions/[id]/cancel` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/sessions/[id]/cancel/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/cancel/route.ts#L8>) |
| GET | `/api/gym/classes/sessions/[id]/roster` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) | [src/app/api/gym/classes/sessions/[id]/roster/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/roster/route.ts#L8>) |
| GET | `/api/gym/classes/sessions/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) | [src/app/api/gym/classes/sessions/[id]/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/route.ts#L8>) |
| POST | `/api/gym/classes/sessions/[id]/substitute` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) | [src/app/api/gym/classes/sessions/[id]/substitute/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/substitute/route.ts#L8>) |
| POST | `/api/gym/classes/sessions/[id]/waitlist` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) | [src/app/api/gym/classes/sessions/[id]/waitlist/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/waitlist/route.ts#L8>) |
| POST | `/api/gym/classes/waitlist/[id]/leave` | requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) | [src/app/api/gym/classes/waitlist/[id]/leave/route.ts:8](<../../../src/app/api/gym/classes/waitlist/[id]/leave/route.ts#L8>) |
| POST | `/api/gym/communication/notifications` | requireWorkspaceAccess({ workspaceId, anyCapability: ["communication.manage", "workspace.manage"] }) | [src/app/api/gym/communication/notifications/route.ts:8](<../../../src/app/api/gym/communication/notifications/route.ts#L8>) |
| GET | `/api/gym/crm/leads` | requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.read", "students.read", "workspace.manage"] }) | [src/app/api/gym/crm/leads/route.ts:8](<../../../src/app/api/gym/crm/leads/route.ts#L8>) |
| POST | `/api/gym/crm/leads` | requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.manage", "students.manage", "workspace.manage"] }) | [src/app/api/gym/crm/leads/route.ts:54](<../../../src/app/api/gym/crm/leads/route.ts#L54>) |
| POST | `/api/gym/crm/leads/[id]/convert` | requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.manage", "students.manage", "enrollments.manage", "workspace.manage"] }) | [src/app/api/gym/crm/leads/[id]/convert/route.ts:8](<../../../src/app/api/gym/crm/leads/[id]/convert/route.ts#L8>) |
| PATCH | `/api/gym/crm/leads/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.manage", "students.manage", "workspace.manage"] }) | [src/app/api/gym/crm/leads/[id]/route.ts:8](<../../../src/app/api/gym/crm/leads/[id]/route.ts#L8>) |
| POST | `/api/gym/devices/agent/ack` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/gym/devices/agent/ack/route.ts:16](<../../../src/app/api/gym/devices/agent/ack/route.ts#L16>) |
| POST | `/api/gym/devices/agent/heartbeat` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/gym/devices/agent/heartbeat/route.ts:16](<../../../src/app/api/gym/devices/agent/heartbeat/route.ts#L16>) |
| POST | `/api/gym/devices/agent/offline-cache` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/gym/devices/agent/offline-cache/route.ts:19](<../../../src/app/api/gym/devices/agent/offline-cache/route.ts#L19>) |
| POST | `/api/gym/devices/agent/passage` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/gym/devices/agent/passage/route.ts:16](<../../../src/app/api/gym/devices/agent/passage/route.ts#L16>) |
| POST | `/api/gym/devices/agent/pull` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/gym/devices/agent/pull/route.ts:16](<../../../src/app/api/gym/devices/agent/pull/route.ts#L16>) |
| POST | `/api/gym/devices/agent/sync-offline-events` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/gym/devices/agent/sync-offline-events/route.ts:19](<../../../src/app/api/gym/devices/agent/sync-offline-events/route.ts#L19>) |
| POST | `/api/gym/devices/commands/[id]/replay` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["devices.manage"] }) | [src/app/api/gym/devices/commands/[id]/replay/route.ts:15](<../../../src/app/api/gym/devices/commands/[id]/replay/route.ts#L15>) |
| GET | `/api/gym/devices` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.read", "workspace.manage"] }) | [src/app/api/gym/devices/route.ts:8](<../../../src/app/api/gym/devices/route.ts#L8>) |
| POST | `/api/gym/devices` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) | [src/app/api/gym/devices/route.ts:41](<../../../src/app/api/gym/devices/route.ts#L41>) |
| POST | `/api/gym/devices/[id]/command` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) | [src/app/api/gym/devices/[id]/command/route.ts:8](<../../../src/app/api/gym/devices/[id]/command/route.ts#L8>) |
| POST | `/api/gym/devices/[id]/contingency` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["devices.manage"] }) | [src/app/api/gym/devices/[id]/contingency/route.ts:15](<../../../src/app/api/gym/devices/[id]/contingency/route.ts#L15>) |
| POST | `/api/gym/devices/[id]/replace` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["devices.manage"] }) | [src/app/api/gym/devices/[id]/replace/route.ts:15](<../../../src/app/api/gym/devices/[id]/replace/route.ts#L15>) |
| POST | `/api/gym/devices/[id]/rotate-token` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) | [src/app/api/gym/devices/[id]/rotate-token/route.ts:8](<../../../src/app/api/gym/devices/[id]/rotate-token/route.ts#L8>) |
| GET | `/api/gym/devices/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.read", "workspace.manage"] }) | [src/app/api/gym/devices/[id]/route.ts:8](<../../../src/app/api/gym/devices/[id]/route.ts#L8>) |
| PATCH | `/api/gym/devices/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) | [src/app/api/gym/devices/[id]/route.ts:44](<../../../src/app/api/gym/devices/[id]/route.ts#L44>) |
| DELETE | `/api/gym/devices/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) | [src/app/api/gym/devices/[id]/route.ts:91](<../../../src/app/api/gym/devices/[id]/route.ts#L91>) |
| GET | `/api/gym/enrollments/check-access` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["access.read"], }) | [src/app/api/gym/enrollments/check-access/route.ts:9](<../../../src/app/api/gym/enrollments/check-access/route.ts#L9>) |
| POST | `/api/gym/enrollments/cron-expire` | requireWorkspaceAccess({ workspaceId: targetWorkspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/cron-expire/route.ts:9](<../../../src/app/api/gym/enrollments/cron-expire/route.ts#L9>) |
| GET | `/api/gym/enrollments` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) | [src/app/api/gym/enrollments/route.ts:10](<../../../src/app/api/gym/enrollments/route.ts#L10>) |
| POST | `/api/gym/enrollments` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/route.ts:59](<../../../src/app/api/gym/enrollments/route.ts#L59>) |
| POST | `/api/gym/enrollments/[id]/accept` | auth() | [src/app/api/gym/enrollments/[id]/accept/route.ts:10](<../../../src/app/api/gym/enrollments/[id]/accept/route.ts#L10>) |
| POST | `/api/gym/enrollments/[id]/activate` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/activate/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/activate/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/cancel` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/cancel/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/cancel/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/change-plan` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/change-plan/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/change-plan/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/pause` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/pause/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/pause/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/renew` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/renew/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/renew/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/resume` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/resume/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/resume/route.ts#L13>) |
| GET | `/api/gym/enrollments/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) | [src/app/api/gym/enrollments/[id]/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/simulate-change-plan` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/simulate-change-plan/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/simulate-change-plan/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/subscription/cycle` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/subscription/cycle/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/subscription/cycle/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/subscription/reconcile` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/subscription/reconcile/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/subscription/reconcile/route.ts#L13>) |
| POST | `/api/gym/enrollments/[id]/subscription` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/subscription/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/subscription/route.ts#L13>) |
| DELETE | `/api/gym/enrollments/[id]/subscription` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/enrollments/[id]/subscription/route.ts:75](<../../../src/app/api/gym/enrollments/[id]/subscription/route.ts#L75>) |
| GET | `/api/gym/finance/accounts` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/accounts/route.ts:9](<../../../src/app/api/gym/finance/accounts/route.ts#L9>) |
| POST | `/api/gym/finance/accounts` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/accounts/route.ts:40](<../../../src/app/api/gym/finance/accounts/route.ts#L40>) |
| GET | `/api/gym/finance/billings` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/billings/route.ts:9](<../../../src/app/api/gym/finance/billings/route.ts#L9>) |
| POST | `/api/gym/finance/billings` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/billings/route.ts:55](<../../../src/app/api/gym/finance/billings/route.ts#L55>) |
| POST | `/api/gym/finance/billings/[id]/refund` | requireWorkspaceAccess({ workspaceId, anyCapability: ["refunds.approve", "workspace.manage"] }) | [src/app/api/gym/finance/billings/[id]/refund/route.ts:8](<../../../src/app/api/gym/finance/billings/[id]/refund/route.ts#L8>) |
| POST | `/api/gym/finance/cash-drawer/close` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) | [src/app/api/gym/finance/cash-drawer/close/route.ts:8](<../../../src/app/api/gym/finance/cash-drawer/close/route.ts#L8>) |
| POST | `/api/gym/finance/cash-drawer/movements` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) | [src/app/api/gym/finance/cash-drawer/movements/route.ts:8](<../../../src/app/api/gym/finance/cash-drawer/movements/route.ts#L8>) |
| POST | `/api/gym/finance/cash-drawer/reconcile` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) | [src/app/api/gym/finance/cash-drawer/reconcile/route.ts:8](<../../../src/app/api/gym/finance/cash-drawer/reconcile/route.ts#L8>) |
| GET | `/api/gym/finance/cash-drawer` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.read"] }) | [src/app/api/gym/finance/cash-drawer/route.ts:9](<../../../src/app/api/gym/finance/cash-drawer/route.ts#L9>) |
| POST | `/api/gym/finance/cash-drawer` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) | [src/app/api/gym/finance/cash-drawer/route.ts:54](<../../../src/app/api/gym/finance/cash-drawer/route.ts#L54>) |
| GET | `/api/gym/finance/expenses/categories` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/expenses/categories/route.ts:8](<../../../src/app/api/gym/finance/expenses/categories/route.ts#L8>) |
| POST | `/api/gym/finance/expenses/categories` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/expenses/categories/route.ts:39](<../../../src/app/api/gym/finance/expenses/categories/route.ts#L39>) |
| GET | `/api/gym/finance/expenses` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/expenses/route.ts:9](<../../../src/app/api/gym/finance/expenses/route.ts#L9>) |
| POST | `/api/gym/finance/expenses` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/expenses/route.ts:59](<../../../src/app/api/gym/finance/expenses/route.ts#L59>) |
| POST | `/api/gym/finance/expenses/[id]/cancel` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/expenses/[id]/cancel/route.ts:8](<../../../src/app/api/gym/finance/expenses/[id]/cancel/route.ts#L8>) |
| POST | `/api/gym/finance/expenses/[id]/pay` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/expenses/[id]/pay/route.ts:8](<../../../src/app/api/gym/finance/expenses/[id]/pay/route.ts#L8>) |
| GET | `/api/gym/finance/invoices` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/invoices/route.ts:9](<../../../src/app/api/gym/finance/invoices/route.ts#L9>) |
| POST | `/api/gym/finance/invoices` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/invoices/route.ts:55](<../../../src/app/api/gym/finance/invoices/route.ts#L55>) |
| GET | `/api/gym/finance/payments` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.read"] }) | [src/app/api/gym/finance/payments/route.ts:9](<../../../src/app/api/gym/finance/payments/route.ts#L9>) |
| POST | `/api/gym/finance/payments` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) | [src/app/api/gym/finance/payments/route.ts:53](<../../../src/app/api/gym/finance/payments/route.ts#L53>) |
| GET | `/api/gym/finance/payments/[id]/receipt` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.read"] }) | [src/app/api/gym/finance/payments/[id]/receipt/route.ts:8](<../../../src/app/api/gym/finance/payments/[id]/receipt/route.ts#L8>) |
| POST | `/api/gym/finance/payments/[id]/reverse` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["refunds.approve"] }) | [src/app/api/gym/finance/payments/[id]/reverse/route.ts:8](<../../../src/app/api/gym/finance/payments/[id]/reverse/route.ts#L8>) |
| GET | `/api/gym/finance/profile` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["wallet.read"] }) | [src/app/api/gym/finance/profile/route.ts:8](<../../../src/app/api/gym/finance/profile/route.ts#L8>) |
| POST | `/api/gym/finance/profile` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) | [src/app/api/gym/finance/profile/route.ts:39](<../../../src/app/api/gym/finance/profile/route.ts#L39>) |
| POST | `/api/gym/finance/reconciliation/reprocess` | requireWorkspaceAccess({ workspaceId, anyCapability: ["invoices.issue", "workspace.manage"] }) | [src/app/api/gym/finance/reconciliation/reprocess/route.ts:8](<../../../src/app/api/gym/finance/reconciliation/reprocess/route.ts#L8>) |
| GET | `/api/gym/finance/reconciliation` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/reconciliation/route.ts:8](<../../../src/app/api/gym/finance/reconciliation/route.ts#L8>) |
| POST | `/api/gym/finance/reconciliation` | requireWorkspaceAccess({ workspaceId, anyCapability: ["invoices.issue", "workspace.manage"] }) | [src/app/api/gym/finance/reconciliation/route.ts:43](<../../../src/app/api/gym/finance/reconciliation/route.ts#L43>) |
| GET | `/api/gym/finance/suppliers` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/suppliers/route.ts:8](<../../../src/app/api/gym/finance/suppliers/route.ts#L8>) |
| POST | `/api/gym/finance/suppliers` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/suppliers/route.ts:39](<../../../src/app/api/gym/finance/suppliers/route.ts#L39>) |
| POST | `/api/gym/finance/sync-balance` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["wallet.read"] }) | [src/app/api/gym/finance/sync-balance/route.ts:8](<../../../src/app/api/gym/finance/sync-balance/route.ts#L8>) |
| POST | `/api/gym/finance/transfers` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) | [src/app/api/gym/finance/transfers/route.ts:8](<../../../src/app/api/gym/finance/transfers/route.ts#L8>) |
| POST | `/api/gym/finance/wallet/payout` | requireWorkspaceAccess({ workspaceId, anyCapability: ["wallet.withdraw", "workspace.manage"] }) | [src/app/api/gym/finance/wallet/payout/route.ts:8](<../../../src/app/api/gym/finance/wallet/payout/route.ts#L8>) |
| GET | `/api/gym/finance/wallet` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) | [src/app/api/gym/finance/wallet/route.ts:8](<../../../src/app/api/gym/finance/wallet/route.ts#L8>) |
| PATCH | `/api/gym/guardians/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) | [src/app/api/gym/guardians/[id]/route.ts:9](<../../../src/app/api/gym/guardians/[id]/route.ts#L9>) |
| DELETE | `/api/gym/guardians/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) | [src/app/api/gym/guardians/[id]/route.ts:59](<../../../src/app/api/gym/guardians/[id]/route.ts#L59>) |
| POST | `/api/gym/guardians/[id]/verify` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) | [src/app/api/gym/guardians/[id]/verify/route.ts:9](<../../../src/app/api/gym/guardians/[id]/verify/route.ts#L9>) |
| POST | `/api/gym/import/commit` | requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) | [src/app/api/gym/import/commit/route.ts:8](<../../../src/app/api/gym/import/commit/route.ts#L8>) |
| POST | `/api/gym/import/preview` | requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) | [src/app/api/gym/import/preview/route.ts:8](<../../../src/app/api/gym/import/preview/route.ts#L8>) |
| GET | `/api/gym/import/template` | auth() | [src/app/api/gym/import/template/route.ts:5](<../../../src/app/api/gym/import/template/route.ts#L5>) |
| GET | `/api/gym/invitations/accept` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/gym/invitations/accept/route.ts:7](<../../../src/app/api/gym/invitations/accept/route.ts#L7>) |
| POST | `/api/gym/invitations/accept` | auth() | [src/app/api/gym/invitations/accept/route.ts:40](<../../../src/app/api/gym/invitations/accept/route.ts#L40>) |
| GET | `/api/gym/invitations` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.read"], }) | [src/app/api/gym/invitations/route.ts:22](<../../../src/app/api/gym/invitations/route.ts#L22>) |
| DELETE | `/api/gym/invitations/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) | [src/app/api/gym/invitations/[id]/route.ts:22](<../../../src/app/api/gym/invitations/[id]/route.ts#L22>) |
| GET | `/api/gym/operations/health` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) | [src/app/api/gym/operations/health/route.ts:14](<../../../src/app/api/gym/operations/health/route.ts#L14>) |
| GET | `/api/gym/pilot/readiness` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) | [src/app/api/gym/pilot/readiness/route.ts:14](<../../../src/app/api/gym/pilot/readiness/route.ts#L14>) |
| GET | `/api/gym/plans` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) | [src/app/api/gym/plans/route.ts:9](<../../../src/app/api/gym/plans/route.ts#L9>) |
| POST | `/api/gym/plans` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/plans/route.ts:43](<../../../src/app/api/gym/plans/route.ts#L43>) |
| GET | `/api/gym/plans/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) | [src/app/api/gym/plans/[id]/route.ts:13](<../../../src/app/api/gym/plans/[id]/route.ts#L13>) |
| PATCH | `/api/gym/plans/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/plans/[id]/route.ts:46](<../../../src/app/api/gym/plans/[id]/route.ts#L46>) |
| POST | `/api/gym/plans/[id]/versions` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) | [src/app/api/gym/plans/[id]/versions/route.ts:13](<../../../src/app/api/gym/plans/[id]/versions/route.ts#L13>) |
| POST | `/api/gym/privacy/delete-request` | requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) | [src/app/api/gym/privacy/delete-request/route.ts:8](<../../../src/app/api/gym/privacy/delete-request/route.ts#L8>) |
| POST | `/api/gym/privacy/export` | requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage", "reports.operational"], }) | [src/app/api/gym/privacy/export/route.ts:8](<../../../src/app/api/gym/privacy/export/route.ts#L8>) |
| GET | `/api/gym/reception/feed` | requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "devices.manage", "workspace.manage"] }) | [src/app/api/gym/reception/feed/route.ts:8](<../../../src/app/api/gym/reception/feed/route.ts#L8>) |
| POST | `/api/gym/settings/transfer-ownership` | requireWorkspaceAccess({ workspaceId, anyCapability: ["workspace.manage"], }) | [src/app/api/gym/settings/transfer-ownership/route.ts:8](<../../../src/app/api/gym/settings/transfer-ownership/route.ts#L8>) |
| GET | `/api/gym/staff` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.read"], }) | [src/app/api/gym/staff/route.ts:23](<../../../src/app/api/gym/staff/route.ts#L23>) |
| POST | `/api/gym/staff` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) | [src/app/api/gym/staff/route.ts:61](<../../../src/app/api/gym/staff/route.ts#L61>) |
| GET | `/api/gym/staff/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.read"], }) | [src/app/api/gym/staff/[id]/route.ts:23](<../../../src/app/api/gym/staff/[id]/route.ts#L23>) |
| PATCH | `/api/gym/staff/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) | [src/app/api/gym/staff/[id]/route.ts:46](<../../../src/app/api/gym/staff/[id]/route.ts#L46>) |
| DELETE | `/api/gym/staff/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) | [src/app/api/gym/staff/[id]/route.ts:97](<../../../src/app/api/gym/staff/[id]/route.ts#L97>) |
| POST | `/api/gym/staff/[id]/terminate` | requireWorkspaceAccess({ workspaceId, anyCapability: ["staff.manage", "workspace.manage"], }) | [src/app/api/gym/staff/[id]/terminate/route.ts:12](<../../../src/app/api/gym/staff/[id]/terminate/route.ts#L12>) |
| GET | `/api/gym/students/check-duplicate` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) | [src/app/api/gym/students/check-duplicate/route.ts:9](<../../../src/app/api/gym/students/check-duplicate/route.ts#L9>) |
| GET | `/api/gym/students` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) | [src/app/api/gym/students/route.ts:9](<../../../src/app/api/gym/students/route.ts#L9>) |
| POST | `/api/gym/students` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) | [src/app/api/gym/students/route.ts:60](<../../../src/app/api/gym/students/route.ts#L60>) |
| POST | `/api/gym/students/[id]/cancel` | requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) | [src/app/api/gym/students/[id]/cancel/route.ts:12](<../../../src/app/api/gym/students/[id]/cancel/route.ts#L12>) |
| GET | `/api/gym/students/[id]/evaluations` | requireWorkspaceAccess({ workspaceId, anyCapability: ["health.read.assigned", "workspace.manage"] }) | [src/app/api/gym/students/[id]/evaluations/route.ts:8](<../../../src/app/api/gym/students/[id]/evaluations/route.ts#L8>) |
| POST | `/api/gym/students/[id]/evaluations` | requireWorkspaceAccess({ workspaceId, anyCapability: ["health.manage.assigned", "workspace.manage"] }) | [src/app/api/gym/students/[id]/evaluations/route.ts:49](<../../../src/app/api/gym/students/[id]/evaluations/route.ts#L49>) |
| GET | `/api/gym/students/[id]/files` | requireWorkspaceAccess({ workspaceId, anyCapability: ["students.read", "workspace.manage"] }) | [src/app/api/gym/students/[id]/files/route.ts:8](<../../../src/app/api/gym/students/[id]/files/route.ts#L8>) |
| POST | `/api/gym/students/[id]/files` | requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "health.manage.assigned", "workspace.manage"] }) | [src/app/api/gym/students/[id]/files/route.ts:49](<../../../src/app/api/gym/students/[id]/files/route.ts#L49>) |
| GET | `/api/gym/students/[id]/guardians` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) | [src/app/api/gym/students/[id]/guardians/route.ts:9](<../../../src/app/api/gym/students/[id]/guardians/route.ts#L9>) |
| POST | `/api/gym/students/[id]/guardians` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) | [src/app/api/gym/students/[id]/guardians/route.ts:49](<../../../src/app/api/gym/students/[id]/guardians/route.ts#L49>) |
| GET | `/api/gym/students/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) | [src/app/api/gym/students/[id]/route.ts:9](<../../../src/app/api/gym/students/[id]/route.ts#L9>) |
| PATCH | `/api/gym/students/[id]` | requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) | [src/app/api/gym/students/[id]/route.ts:50](<../../../src/app/api/gym/students/[id]/route.ts#L50>) |
| GET | `/api/gym/students/[id]/workouts` | requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.read", "workspace.manage"] }) | [src/app/api/gym/students/[id]/workouts/route.ts:8](<../../../src/app/api/gym/students/[id]/workouts/route.ts#L8>) |
| POST | `/api/gym/workouts/assign` | requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) | [src/app/api/gym/workouts/assign/route.ts:8](<../../../src/app/api/gym/workouts/assign/route.ts#L8>) |
| GET | `/api/gym/workouts/templates` | requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.read", "workspace.manage"] }) | [src/app/api/gym/workouts/templates/route.ts:8](<../../../src/app/api/gym/workouts/templates/route.ts#L8>) |
| POST | `/api/gym/workouts/templates` | requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) | [src/app/api/gym/workouts/templates/route.ts:52](<../../../src/app/api/gym/workouts/templates/route.ts#L52>) |
| PATCH | `/api/gym/workouts/templates/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) | [src/app/api/gym/workouts/templates/[id]/route.ts:8](<../../../src/app/api/gym/workouts/templates/[id]/route.ts#L8>) |
| DELETE | `/api/gym/workouts/templates/[id]` | requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) | [src/app/api/gym/workouts/templates/[id]/route.ts:68](<../../../src/app/api/gym/workouts/templates/[id]/route.ts#L68>) |
| GET | `/api/storage/file` | auth() | [src/app/api/storage/file/route.ts:6](<../../../src/app/api/storage/file/route.ts#L6>) |
| POST | `/api/storage/presigned` | auth() | [src/app/api/storage/presigned/route.ts:43](<../../../src/app/api/storage/presigned/route.ts#L43>) |
| GET | `/api/student/classes` | requireWorkspaceAccess({ workspaceId }) | [src/app/api/student/classes/route.ts:8](<../../../src/app/api/student/classes/route.ts#L8>) |
| GET | `/api/student/dashboard` | auth() | [src/app/api/student/dashboard/route.ts:6](<../../../src/app/api/student/dashboard/route.ts#L6>) |
| DELETE | `/api/student/finance/recurrence` | auth() | [src/app/api/student/finance/recurrence/route.ts:6](<../../../src/app/api/student/finance/recurrence/route.ts#L6>) |
| GET | `/api/student/finance` | auth() | [src/app/api/student/finance/route.ts:16](<../../../src/app/api/student/finance/route.ts#L16>) |
| POST | `/api/superadmin/asaas/disable-messaging` | auth() | [src/app/api/superadmin/asaas/disable-messaging/route.ts:6](<../../../src/app/api/superadmin/asaas/disable-messaging/route.ts#L6>) |
| POST | `/api/superadmin/asaas/provision-subaccount-key` | auth() | [src/app/api/superadmin/asaas/provision-subaccount-key/route.ts:35](<../../../src/app/api/superadmin/asaas/provision-subaccount-key/route.ts#L35>) |
| PUT | `/api/superadmin/asaas/provision-subaccount-key` | auth() | [src/app/api/superadmin/asaas/provision-subaccount-key/route.ts:77](<../../../src/app/api/superadmin/asaas/provision-subaccount-key/route.ts#L77>) |
| POST | `/api/superadmin/asaas/reconcile-fee-recovery` | auth() | [src/app/api/superadmin/asaas/reconcile-fee-recovery/route.ts:8](<../../../src/app/api/superadmin/asaas/reconcile-fee-recovery/route.ts#L8>) |
| GET | `/api/superadmin/asaas` | auth() | [src/app/api/superadmin/asaas/route.ts:9](<../../../src/app/api/superadmin/asaas/route.ts#L9>) |
| GET | `/api/superadmin/gym-settings` | auth() | [src/app/api/superadmin/gym-settings/route.ts:6](<../../../src/app/api/superadmin/gym-settings/route.ts#L6>) |
| PATCH | `/api/superadmin/gym-settings` | auth() | [src/app/api/superadmin/gym-settings/route.ts:22](<../../../src/app/api/superadmin/gym-settings/route.ts#L22>) |
| POST | `/api/superadmin/impersonate` | auth(); rateLimit(`impersonate:${session.user.id}:${ip}`, 10, 60000) | [src/app/api/superadmin/impersonate/route.ts:8](<../../../src/app/api/superadmin/impersonate/route.ts#L8>) |
| PATCH | `/api/superadmin/payments/[id]` | auth() | [src/app/api/superadmin/payments/[id]/route.ts:7](<../../../src/app/api/superadmin/payments/[id]/route.ts#L7>) |
| DELETE | `/api/superadmin/payments/[id]` | auth() | [src/app/api/superadmin/payments/[id]/route.ts:55](<../../../src/app/api/superadmin/payments/[id]/route.ts#L55>) |
| GET | `/api/superadmin/workspaces` | auth() | [src/app/api/superadmin/workspaces/route.ts:8](<../../../src/app/api/superadmin/workspaces/route.ts#L8>) |
| POST | `/api/superadmin/workspaces` | auth() | [src/app/api/superadmin/workspaces/route.ts:75](<../../../src/app/api/superadmin/workspaces/route.ts#L75>) |
| GET | `/api/superadmin/workspaces/[id]/gym-config` | auth() | [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:7](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L7>) |
| PATCH | `/api/superadmin/workspaces/[id]/gym-config` | auth() | [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:68](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L68>) |
| POST | `/api/superadmin/workspaces/[id]/gym-config` | auth() | [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:104](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L104>) |
| GET | `/api/superadmin/workspaces/[id]` | auth() | [src/app/api/superadmin/workspaces/[id]/route.ts:6](<../../../src/app/api/superadmin/workspaces/[id]/route.ts#L6>) |
| PATCH | `/api/superadmin/workspaces/[id]` | auth() | [src/app/api/superadmin/workspaces/[id]/route.ts:82](<../../../src/app/api/superadmin/workspaces/[id]/route.ts#L82>) |
| POST | `/api/webhooks/abacatepay/credits` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/webhooks/abacatepay/credits/route.ts:5](<../../../src/app/api/webhooks/abacatepay/credits/route.ts#L5>) |
| POST | `/api/webhooks/abacatepay` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/webhooks/abacatepay/route.ts:8](<../../../src/app/api/webhooks/abacatepay/route.ts#L8>) |
| POST | `/api/webhooks/payments/asaas` | Sem guard reconhecido pela extração; conferir autenticação inline/delegada | [src/app/api/webhooks/payments/asaas/route.ts:5](<../../../src/app/api/webhooks/payments/asaas/route.ts#L5>) |

## Contratos por operação

### GET /api/ably/token

- **Arquivo:** [src/app/api/ably/token/route.ts:5](<../../../src/app/api/ably/token/route.ts#L5>); linhas 5–29.
- **Finalidade implementada:** Consultar/obter dados por /api/ably/token; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user `; ` !ablyRest `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json(tokenRequest) ` Códigos/expressões status: 401, 503, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### GET /api/cron/engage-push

- **Arquivo:** [src/app/api/cron/engage-push/route.ts:43](<../../../src/app/api/cron/engage-push/route.ts#L43>); linhas 43–68.
- **Finalidade implementada:** Consultar/obter dados por EngagePushService.runAutomatedPushCycle; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/components/engage/push-notifications-studio.tsx](<../../../src/components/engage/push-notifications-studio.tsx>)
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` { authorized, isSuperadminSession } = await isAuthorized(req) `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("force") `
- **Condições de validação/erros:** ` !authorized `
- **Chamadas e efeitos delegados:** ` EngagePushService.runAutomatedPushCycle(force) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ success: true, timestamp: new Date().toISOString(), executionTimeMs: durationMs, forcedExecution: force, ...result }) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/cron/engage-push

- **Arquivo:** [src/app/api/cron/engage-push/route.ts:70](<../../../src/app/api/cron/engage-push/route.ts#L70>); linhas 70–72.
- **Finalidade implementada:** Executar a operação de /api/cron/engage-push; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/components/engage/push-notifications-studio.tsx](<../../../src/components/engage/push-notifications-studio.tsx>)
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** Nenhum if local; conferir serviço.
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** Resposta delegada/Response customizada. Códigos/expressões status: padrão do Response/serviço.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### GET /api/cron/process-recurrence

- **Arquivo:** [src/app/api/cron/process-recurrence/route.ts:4](<../../../src/app/api/cron/process-recurrence/route.ts#L4>); linhas 4–34.
- **Finalidade implementada:** Consultar/obter dados por /api/cron/process-recurrence; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("key") `
- **Condições de validação/erros:** ` cronSecret && providedToken !== cronSecret `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ success: true, message: "Processamento de recorrências executado com sucesso." }) `; ` NextResponse.json({ success: false, error: error.message || "Erro desconhecido" }, { status: 500 }) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### GET /api/guardian/dependents

- **Arquivo:** [src/app/api/guardian/dependents/route.ts:6](<../../../src/app/api/guardian/dependents/route.ts#L6>); linhas 6–25.
- **Finalidade implementada:** Consultar/obter dados por minorService.listDependentsForGuardian; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user?.id `
- **Chamadas e efeitos delegados:** ` minorService.listDependentsForGuardian(session.user.id) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "UNAUTHORIZED", message: "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json(dependents) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar dependentes." } }, { status: 500 } ) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/minor-service.ts:379](<../../../src/modules/workspaces/application/minor-service.ts#L379>) (MinorService.listDependentsForGuardian): consultas/escritas ` prisma.user.findUnique {where: { id: guardianUserId }} `; ` prisma.gymGuardian.findMany {where: { OR: orConditions, revokedAt: null, }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/guardian/dependents/[id]/accept-terms

- **Arquivo:** [src/app/api/guardian/dependents/[id]/accept-terms/route.ts:7](<../../../src/app/api/guardian/dependents/[id]/accept-terms/route.ts#L7>); linhas 7–52.
- **Finalidade implementada:** Executar a operação de minorService.recordMinorLegalAcceptance; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(guardian)/guardian/dependents/dependents-client.tsx](<../../../src/app/(guardian)/guardian/dependents/dependents-client.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id: guardianId } = await params `; ` req.json() `; ` { workspaceId, documentType = "TERMS", documentVersion } = body `
- **Condições de validação/erros:** ` !session?.user?.id `; ` !workspaceId `
- **Chamadas e efeitos delegados:** ` minorService.recordMinorLegalAcceptance({ workspaceId, guardianId, guardianUserId: session.user.id, documentType: documentType as LegalDocumentType, documentVersion, ipAddress, userAgent, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "UNAUTHORIZED", message: "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(acceptance, { status: 201 }) `; ` NextResponse.json( { error: { code: error.code || "INTERNAL_ERROR", message: error.message || "Erro ao registrar aceite de termos." } }, { status: error.statusCode || 500 } ) ` Códigos/expressões status: 401, 400, 201, error.statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/minor-service.ts:290](<../../../src/modules/workspaces/application/minor-service.ts#L290>) (MinorService.recordMinorLegalAcceptance): consultas/escritas ` prisma.gymGuardian.findFirst {where: { id: guardianId, workspaceId, revokedAt: null, isLegalRepresentative: true, }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados LegalAcceptanceService.recordAcceptance

### POST /api/guardian/dependents/[id]/classes/book

- **Arquivo:** [src/app/api/guardian/dependents/[id]/classes/book/route.ts:8](<../../../src/app/api/guardian/dependents/[id]/classes/book/route.ts#L8>); linhas 8–60.
- **Finalidade implementada:** Executar a operação de gymBookingService.bookClassForDependent; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId }) `.
- **Entradas, filtros e paginação:** ` { id: dependentMemberId } = await params `; ` req.json() `; ` { workspaceId, sessionId, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !sessionId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.bookClassForDependent({ workspaceId: context.workspaceId, sessionId, dependentMemberId, guardianUserId: context.userId, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID da sessão de aula é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(booking, { status: 201 }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao reservar aula para o dependente." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:932](<../../../src/modules/workspaces/application/gym-booking-service.ts#L932>) (GymBookingService.bookClassForDependent): consultas/escritas ` prisma.gymGuardian.findFirst {where: { workspaceId, studentMemberId: dependentMemberId, guardianUserId, isLegalRepresentative: true, verifiedAt: { not: null }, revokedAt: null }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/guardian/dependents/[id]/classes/cancel

- **Arquivo:** [src/app/api/guardian/dependents/[id]/classes/cancel/route.ts:8](<../../../src/app/api/guardian/dependents/[id]/classes/cancel/route.ts#L8>); linhas 8–59.
- **Finalidade implementada:** Executar a operação de gymBookingService.cancelBookingForDependent; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId }) `.
- **Entradas, filtros e paginação:** ` { id: dependentMemberId } = await params `; ` req.json() `; ` { workspaceId, bookingId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !bookingId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.cancelBookingForDependent({ workspaceId: context.workspaceId, bookingId, dependentMemberId, guardianUserId: context.userId, reason }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID da reserva é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao cancelar aula do dependente." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:965](<../../../src/modules/workspaces/application/gym-booking-service.ts#L965>) (GymBookingService.cancelBookingForDependent): consultas/escritas ` prisma.gymGuardian.findFirst {where: { workspaceId, studentMemberId: dependentMemberId, guardianUserId, isLegalRepresentative: true, verifiedAt: { not: null }, revokedAt: null }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/access/divergences

- **Arquivo:** [src/app/api/gym/access/divergences/route.ts:8](<../../../src/app/api/gym/access/divergences/route.ts#L8>); linhas 8–45.
- **Finalidade implementada:** Consultar/obter dados por gymOfflineReconciliationService.listDivergences; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `; ` searchParams.get("status") `; ` searchParams.get("severity") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymOfflineReconciliationService.listDivergences( context.workspaceId, { unitId, status, severity, limit } ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ divergences }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao listar divergências de reconciliação." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-offline-reconciliation-service.ts:576](<../../../src/modules/workspaces/application/gym-offline-reconciliation-service.ts#L576>) (GymOfflineReconciliationService.listDivergences): consultas/escritas ` prisma.gymAccessReconciliationDivergence.findMany {where} `; paginação/ordem ` orderBy: { detectedAt: "desc" } `; ` take: Math.min(Math.max(limit, 1), 100) `; efeitos delegados não identificados

### POST /api/gym/access/divergences/[id]

- **Arquivo:** [src/app/api/gym/access/divergences/[id]/route.ts:8](<../../../src/app/api/gym/access/divergences/[id]/route.ts#L8>); linhas 8–65.
- **Finalidade implementada:** Executar a operação de gymOfflineReconciliationService.dismissDivergence, gymOfflineReconciliationService.resolveDivergence; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.override", "devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { action = "RESOLVE", workspaceId, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` action === "DISMISS" `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymOfflineReconciliationService.dismissDivergence({ workspaceId: context.workspaceId, divergenceId: id, userId: context.userId, dismissalReason: notes }) `; ` gymOfflineReconciliationService.resolveDivergence({ workspaceId: context.workspaceId, divergenceId: id, userId: context.userId, resolutionNotes: notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, message: "Divergência descartada com sucesso.", divergence: updated }) `; ` NextResponse.json({ success: true, message: "Divergência resolvida com sucesso.", divergence: updated }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao processar ação na divergência." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-offline-reconciliation-service.ts:634](<../../../src/modules/workspaces/application/gym-offline-reconciliation-service.ts#L634>) (GymOfflineReconciliationService.dismissDivergence): consultas/escritas ` prisma.gymAccessReconciliationDivergence.findFirst {where: { id: divergenceId, workspaceId }} `; ` prisma.gymAccessReconciliationDivergence.update {where: { id: divergenceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-offline-reconciliation-service.ts:601](<../../../src/modules/workspaces/application/gym-offline-reconciliation-service.ts#L601>) (GymOfflineReconciliationService.resolveDivergence): consultas/escritas ` prisma.gymAccessReconciliationDivergence.findFirst {where: { id: divergenceId, workspaceId }} `; ` prisma.gymAccessReconciliationDivergence.update {where: { id: divergenceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/access/evaluate

- **Arquivo:** [src/app/api/gym/access/evaluate/route.ts:8](<../../../src/app/api/gym/access/evaluate/route.ts#L8>); linhas 8–75.
- **Finalidade implementada:** Executar a operação de gymAccessPolicyService.evaluateAccess; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "access.override", "devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, unitId, deviceId, studentMemberId, credentialCode, timestamp, evaluatorType } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !unitId `; ` !studentMemberId && !credentialCode `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAccessPolicyService.evaluateAccess({ workspaceId: context.workspaceId, unitId, deviceId, studentMemberId, credentialCode, timestamp: timestamp ? new Date(timestamp) : new Date(), evaluatorType: evaluatorType || "TURNSTILE_ENGINE", evaluatedByUserId: context.userId, persistLog: true }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "UNIT_REQUIRED", message: "ID da unidade física é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "STUDENT_OR_CREDENTIAL_REQUIRED", message: "Informe o ID do aluno ou o código da credencial física." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao avaliar política de acesso à academia." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-access-policy-service.ts:155](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L155>) (GymAccessPolicyService.evaluateAccess): consultas/escritas ` prisma.gymUnit.findFirst {where: { id: unitId, workspaceId }} `; ` prisma.gymSettings.findUnique {where: { workspaceId }} `; ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymAccessGrant.findFirst {where: { workspaceId, credentialCode: credentialCode.trim() }} `; ` prisma.gymAccessOverride.findFirst {where: { workspaceId, studentMemberId: member.id, isActive: true, validFrom: { lte: timestamp }, validUntil: { gte: timestamp }, OR: [{ unitId: null }, { unitId: unit.id }] }} `; ` prisma.gymEnrollment.findMany {where: { workspaceId, studentMemberId: member.id }} `; ` prisma.gymInvoice.findMany {where: { workspaceId, studentMemberId: member.id, status: { in: [GymInvoiceStatus.OPEN, GymInvoiceStatus.PARTIALLY_PAID] }, dueDate: { lt: timestamp }, balanceRemainingInCents: { gt: BigInt(0) } }} `; ` prisma.gymDeviceCommand.create `; paginação/ordem ` orderBy: { validUntil: "desc" } `; ` orderBy: { createdAt: "desc" } `; ` orderBy: { dueDate: "asc" } `; efeitos delegados não identificados

### POST /api/gym/access/grants/sync

- **Arquivo:** [src/app/api/gym/access/grants/sync/route.ts:8](<../../../src/app/api/gym/access/grants/sync/route.ts#L8>); linhas 8–53.
- **Finalidade implementada:** Executar a operação de gymAccessPolicyService.projectGrantsForMember, gymAccessPolicyService.projectGrantsForWorkspace; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentMemberId, credentialType, credentialCode } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` studentMemberId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAccessPolicyService.projectGrantsForMember({ workspaceId: context.workspaceId, studentMemberId, credentialType, credentialCode }) `; ` gymAccessPolicyService.projectGrantsForWorkspace(context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, grant }) `; ` NextResponse.json({ success: true, ...summary }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao sincronizar grants de acesso à catraca." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-access-policy-service.ts:759](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L759>) (GymAccessPolicyService.projectGrantsForMember): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { workspaceId, studentMemberId, status: GymEnrollmentStatus.ACTIVE }} `; ` prisma.gymAccessGrant.findFirst {where: { workspaceId, studentMemberId, credentialType }} `; ` prisma.gymAccessGrant.update {where: { id: existing.id }} `; ` prisma.gymAccessGrant.update {where: { id: existingGrant.id }} `; ` prisma.gymAccessGrant.create `; paginação/ordem ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

[src/modules/workspaces/application/gym-access-policy-service.ts:846](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L846>) (GymAccessPolicyService.projectGrantsForWorkspace): consultas/escritas ` prisma.workspaceMember.findMany {where: { workspaceId, role: "STUDENT", isActive: true }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/access/members/[id]/diagnostic

- **Arquivo:** [src/app/api/gym/access/members/[id]/diagnostic/route.ts:8](<../../../src/app/api/gym/access/members/[id]/diagnostic/route.ts#L8>); linhas 8–52.
- **Finalidade implementada:** Consultar/obter dados por gymAccessPolicyService.getStudentAccessDiagnostic; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "access.override", "students.read", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: studentMemberId } = await params `; ` url.searchParams.get("workspaceId") `; ` url.searchParams.get("unitId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAccessPolicyService.getStudentAccessDiagnostic( context.workspaceId, studentMemberId, unitId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(diagnostic) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao consultar diagnóstico de acesso do aluno." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-access-policy-service.ts:980](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L980>) (GymAccessPolicyService.getStudentAccessDiagnostic): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymUnit.findMany {where: { workspaceId, isActive: true }} `; ` prisma.gymAccessGrant.findMany {where: { workspaceId, studentMemberId: member.id }} `; ` prisma.gymAccessOverride.findMany {where: { workspaceId, studentMemberId: member.id, isActive: true, validUntil: { gte: now } }} `; ` prisma.gymAccessDecisionLog.findMany {where: { workspaceId, studentMemberId: member.id }} `; paginação/ordem ` orderBy: { evaluatedAt: "desc" } `; ` take: 10 `; efeitos delegados não identificados

### GET /api/gym/access/overrides

- **Arquivo:** [src/app/api/gym/access/overrides/route.ts:8](<../../../src/app/api/gym/access/overrides/route.ts#L8>); linhas 8–44.
- **Finalidade implementada:** Consultar/obter dados por gymAccessPolicyService.listActiveOverrides; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "access.override", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` url.searchParams.get("workspaceId") `; ` url.searchParams.get("unitId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAccessPolicyService.listActiveOverrides(context.workspaceId, unitId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(overrides) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao consultar liberações de acesso ativas." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-access-policy-service.ts:955](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L955>) (GymAccessPolicyService.listActiveOverrides): consultas/escritas ` prisma.gymAccessOverride.findMany {where: { workspaceId, isActive: true, validUntil: { gte: now }, ...(unitId ? { OR: [{ unitId: null }, { unitId }] } : {}) }} `; paginação/ordem ` orderBy: { validUntil: "desc" } `; efeitos delegados não identificados

### POST /api/gym/access/overrides

- **Arquivo:** [src/app/api/gym/access/overrides/route.ts:46](<../../../src/app/api/gym/access/overrides/route.ts#L46>); linhas 46–115.
- **Finalidade implementada:** Executar a operação de gymAccessPolicyService.createAccessOverride; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.override", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentMemberId, unitId, reason, validUntil } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId `; ` !reason || !reason.trim() `; ` !validUntil `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAccessPolicyService.createAccessOverride({ workspaceId: context.workspaceId, studentMemberId, unitId, grantedByUserId: context.userId, reason: reason.trim(), validUntil: new Date(validUntil) }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "STUDENT_REQUIRED", message: "ID do aluno é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "ACCESS_OVERRIDE_REASON_REQUIRED", message: "A justificativa da liberação excepcional é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALID_UNTIL_REQUIRED", message: "O prazo de validade da liberação é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(override, { status: 201 }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao conceder liberação de acesso manual." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-access-policy-service.ts:871](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L871>) (GymAccessPolicyService.createAccessOverride): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymAccessOverride.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/access/overrides/[id]/revoke

- **Arquivo:** [src/app/api/gym/access/overrides/[id]/revoke/route.ts:8](<../../../src/app/api/gym/access/overrides/[id]/revoke/route.ts#L8>); linhas 8–59.
- **Finalidade implementada:** Executar a operação de gymAccessPolicyService.revokeAccessOverride; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.override", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: overrideId } = await params `; ` req.json() `; ` { workspaceId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !reason || !reason.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAccessPolicyService.revokeAccessOverride({ workspaceId: context.workspaceId, overrideId, revokedByUserId: context.userId, reason: reason.trim() }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "REASON_REQUIRED", message: "O motivo da revogação da liberação é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(revoked) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao revogar liberação excepcional de acesso." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-access-policy-service.ts:920](<../../../src/modules/workspaces/application/gym-access-policy-service.ts#L920>) (GymAccessPolicyService.revokeAccessOverride): consultas/escritas ` prisma.gymAccessOverride.findFirst {where: { id: overrideId, workspaceId }} `; ` prisma.gymAccessOverride.update {where: { id: override.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/analytics/export

- **Arquivo:** [src/app/api/gym/analytics/export/route.ts:9](<../../../src/app/api/gym/analytics/export/route.ts#L9>); linhas 9–64.
- **Finalidade implementada:** Executar a operação de GymAnalyticsService.exportData; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/analytics/analytics-client.tsx](<../../../src/app/(gym)/gym/analytics/analytics-client.tsx>); [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: isFinancial ? ["reports.finance", "workspace.manage"] : ["reports.operational", "reports.finance", "workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, exportType, startDate, endDate, unitId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !exportType `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymAnalyticsService.exportData({ workspaceId: context.workspaceId, exportType, startDate, endDate, unitId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "EXPORT_TYPE_REQUIRED", message: "Tipo de exportação é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao gerar arquivo de exportação." } }, { status: 500 } ) ` Códigos/expressões status: 400, 200, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-analytics-service.ts:708](<../../../src/modules/workspaces/application/gym-analytics-service.ts#L708>) (GymAnalyticsService.exportData): consultas/escritas ` prisma.workspaceMember.findMany {where: { workspaceId, role: "STUDENT", ...(unitId ? { gymEnrollments: { some: { unitId } } } : {}), }} `; ` prisma.gymEnrollment.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), createdAt: { gte: start, lte: end }, }} `; ` prisma.gymInvoice.findMany {where: { workspaceId, dueDate: { gte: start, lte: end }, }} `; ` prisma.gymPayment.findMany {where: { workspaceId, createdAt: { gte: start, lte: end }, }} `; ` prisma.gymAccessLog.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), accessedAt: { gte: start, lte: end }, }} `; ` prisma.gymClassBooking.findMany {where: { workspaceId, session: { sessionDate: { gte: start, lte: end }, ...(unitId ? { unitId } : {}), }, }} `; paginação/ordem ` take: 1 `; ` orderBy: { createdAt: "desc" } `; ` orderBy: { dueDate: "desc" } `; ` orderBy: { accessedAt: "desc" } `; ` take: 5000 `; efeitos delegados não identificados

### GET /api/gym/analytics/kpis

- **Arquivo:** [src/app/api/gym/analytics/kpis/route.ts:8](<../../../src/app/api/gym/analytics/kpis/route.ts#L8>); linhas 8–86.
- **Finalidade implementada:** Consultar/obter dados por GymAnalyticsService.getOverview; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/analytics/analytics-client.tsx](<../../../src/app/(gym)/gym/analytics/analytics-client.tsx>); [src/app/(gym)/gym/dashboard/dashboard-client.tsx](<../../../src/app/(gym)/gym/dashboard/dashboard-client.tsx>); [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["reports.finance", "reports.operational", "workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("startDate") `; ` searchParams.get("endDate") `; ` searchParams.get("unitId") `; ` searchParams.get("timezone") `; ` searchParams.get("assignedStaffId") `
- **Condições de validação/erros:** ` !workspaceId `; ` !hasFinancialAccess && context.memberId `; ` !hasFinancialAccess `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymAnalyticsService.getOverview({ workspaceId: context.workspaceId, startDate, endDate, unitId, assignedStaffId, timezone, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ data: overview }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao consolidar métricas da academia." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-analytics-service.ts:124](<../../../src/modules/workspaces/application/gym-analytics-service.ts#L124>) (GymAnalyticsService.getOverview): consultas/escritas ` prisma.gymEnrollment.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), status: GymEnrollmentStatus.ACTIVE, startDate: { lte: end }, OR: [{ endDate: null }, { endDate: { gte: start } }], }} `; ` prisma.gymEnrollment.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), status: GymEnrollmentStatus.PAUSED, }} `; ` prisma.gymEnrollment.count {where: { workspaceId, ...(unitId ? { unitId } : {}), createdAt: { gte: start, lte: end }, }} `; ` prisma.gymEnrollment.count {where: { workspaceId, ...(unitId ? { unitId } : {}), status: GymEnrollmentStatus.CANCELLED, updatedAt: { gte: start, lte: end }, }} `; ` prisma.gymEnrollmentEvent.count {where: { workspaceId, createdAt: { gte: start, lte: end }, toStatus: GymEnrollmentStatus.ACTIVE, reason: { contains: "RENEW" }, }} `; ` prisma.gymPayment.findMany {where: { workspaceId, createdAt: { gte: start, lte: end }, }} `; ` prisma.gymExpense.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), status: GymExpenseStatus.PAID, paidAt: { gte: start, lte: end }, }} `; ` prisma.gymInvoice.findMany {where: { workspaceId, status: { in: [GymInvoiceStatus.OPEN, GymInvoiceStatus.PARTIALLY_PAID] }, }} `; ` prisma.gymInvoice.findMany {where: { workspaceId, dueDate: { lte: end }, status: { notIn: [GymInvoiceStatus.DRAFT, GymInvoiceStatus.CANCELLED] }, }} `; ` prisma.gymAccessLog.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), accessedAt: { gte: start, lte: end }, }} `; ` prisma.gymAccessLog.findMany {where: { workspaceId, granted: true, direction: GymAccessDirection.ENTRY, accessedAt: { gte: fifteenDaysAgo }, studentMemberId: { in: Array.from(activeStudentMemberIds) }, }} `; ` prisma.gymAccessLog.findMany {where: { workspaceId, granted: true, direction: GymAccessDirection.ENTRY, accessedAt: { gte: thirtyDaysAgo }, studentMemberId: { in: Array.from(activeStudentMemberIds) }, }} `; ` prisma.gymClassSession.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), sessionDate: { gte: start, lte: end }, }} `; ` prisma.gymAccessDecisionLog.count {where: { workspaceId, ...(unitId ? { unitId } : {}), evaluatedAt: { gte: start, lte: end }, }} `; ` prisma.gymAccessDecisionLog.count {where: { workspaceId, ...(unitId ? { unitId } : {}), evaluatedAt: { gte: start, lte: end }, decision: GymAccessDecision.GRANTED, }} `; ` prisma.gymAccessDecisionLog.count {where: { workspaceId, ...(unitId ? { unitId } : {}), evaluatedAt: { gte: start, lte: end }, decision: GymAccessDecision.DENIED, }} `; ` prisma.gymAccessDevice.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), isActive: true, }} `; ` prisma.gymAccessDecisionLog.findMany {where: { workspaceId, ...(unitId ? { unitId } : {}), evaluatedAt: { gte: start, lte: end }, decision: GymAccessDecision.DENIED, }} `; ` prisma.lead.count {where: { workspaceId, createdAt: { gte: start, lte: end }, }} `; ` prisma.lead.count {where: { workspaceId, status: "converted", updatedAt: { gte: start, lte: end }, }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/biometrics/enroll

- **Arquivo:** [src/app/api/gym/biometrics/enroll/route.ts:8](<../../../src/app/api/gym/biometrics/enroll/route.ts#L8>); linhas 8–69.
- **Finalidade implementada:** Executar a operação de gymBiometricsService.enrollBiometricCredential; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentMemberId, credentialType = "QR_CODE", credentialValue, guardianConsentAcknowledged } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId `; ` !credentialValue `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBiometricsService.enrollBiometricCredential({ workspaceId: context.workspaceId, studentMemberId, credentialType, credentialValue, enrolledByUserId: context.userId, guardianConsentAcknowledged: Boolean(guardianConsentAcknowledged) }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "STUDENT_REQUIRED", message: "ID do aluno é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "CREDENTIAL_VALUE_REQUIRED", message: "Valor ou código da credencial é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, message: "Credencial cadastrada e sincronizada com sucesso.", ...result }, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao cadastrar credencial biométrica." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-biometrics-service.ts:107](<../../../src/modules/workspaces/application/gym-biometrics-service.ts#L107>) (GymBiometricsService.enrollBiometricCredential): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymAccessGrant.findFirst {where: { workspaceId, studentMemberId }} `; ` prisma.gymAccessGrant.update {where: { id: grant.id }} `; ` prisma.gymAccessGrant.create `; ` prisma.privacyConsent.upsert {where: { userId_purpose: { userId: member.userId, purpose: "BIOMETRIC_DATA_PROCESSING" } }} `; ` prisma.gymAccessDevice.findMany {where: { workspaceId, isActive: true, ...(member.unitId ? { unitId: member.unitId } : {}) }} `; ` prisma.gymDeviceCommand.create `; ` prisma.auditLog.create `; paginação/ordem ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

### POST /api/gym/biometrics/revoke

- **Arquivo:** [src/app/api/gym/biometrics/revoke/route.ts:8](<../../../src/app/api/gym/biometrics/revoke/route.ts#L8>); linhas 8–57.
- **Finalidade implementada:** Executar a operação de gymBiometricsService.revokeBiometricCredential; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentMemberId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId `; ` !reason || !reason.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBiometricsService.revokeBiometricCredential({ workspaceId: context.workspaceId, studentMemberId, revokedByUserId: context.userId, reason }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "STUDENT_REQUIRED", message: "ID do aluno é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "REASON_REQUIRED", message: "A justificativa da exclusão/revogação é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao revogar credencial biométrica." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-biometrics-service.ts:278](<../../../src/modules/workspaces/application/gym-biometrics-service.ts#L278>) (GymBiometricsService.revokeBiometricCredential): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymAccessGrant.findFirst {where: { workspaceId, studentMemberId }} `; ` prisma.gymAccessGrant.update {where: { id: grant.id }} `; ` prisma.privacyConsent.updateMany {where: { userId: member.userId, purpose: "BIOMETRIC_DATA_PROCESSING" }} `; ` prisma.gymAccessDevice.findMany {where: { workspaceId, isActive: true, ...(member.unitId ? { unitId: member.unitId } : {}) }} `; ` prisma.gymDeviceCommand.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/classes/bookings/[id]/attendance

- **Arquivo:** [src/app/api/gym/classes/bookings/[id]/attendance/route.ts:8](<../../../src/app/api/gym/classes/bookings/[id]/attendance/route.ts#L8>); linhas 8–64.
- **Finalidade implementada:** Executar a operação de gymBookingService.recordNoShow, gymBookingService.recordAttendance; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: bookingId } = await params `; ` req.json() `; ` { workspaceId, status, staffMemberId, method, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` status === "NO_SHOW" `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.recordNoShow({ workspaceId: context.workspaceId, bookingId, actorUserId: context.userId, notes }) `; ` gymBookingService.recordAttendance({ workspaceId: context.workspaceId, bookingId, actorUserId: context.userId, staffMemberId, method: method || "MANUAL_STAFF" }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao registrar presença na aula." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:812](<../../../src/modules/workspaces/application/gym-booking-service.ts#L812>) (GymBookingService.recordNoShow): consultas/escritas ` prisma.gymClassBooking.findFirst {where: { id: bookingId, workspaceId }} `; ` prisma.gymClassBooking.update {where: { id: booking.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-booking-service.ts:750](<../../../src/modules/workspaces/application/gym-booking-service.ts#L750>) (GymBookingService.recordAttendance): consultas/escritas ` prisma.gymClassBooking.findFirst {where: { id: bookingId, workspaceId }} `; ` prisma.gymClassBooking.update {where: { id: booking.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/classes/bookings/[id]/cancel

- **Arquivo:** [src/app/api/gym/classes/bookings/[id]/cancel/route.ts:8](<../../../src/app/api/gym/classes/bookings/[id]/cancel/route.ts#L8>); linhas 8–52.
- **Finalidade implementada:** Executar a operação de gymBookingService.cancelBooking; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: bookingId } = await params `; ` req.json() `; ` { workspaceId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.cancelBooking({ bookingId, workspaceId: context.workspaceId, cancelledByUserId: context.userId, reason }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao cancelar reserva." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:464](<../../../src/modules/workspaces/application/gym-booking-service.ts#L464>) (GymBookingService.cancelBooking): consultas/escritas ` prisma.gymClassBooking.findFirst {where: { id: bookingId, workspaceId }} `; ` tx.gymClassBooking.update {where: { id: booking.id }} `; ` tx.gymClassSession.update {where: { id: booking.sessionId }} `; ` tx.gymClassWaitlist.findFirst {where: { sessionId: booking.sessionId, status: GymClassWaitlistStatus.WAITING }} `; ` tx.gymClassBooking.create `; ` tx.gymClassWaitlist.update {where: { id: nextInLine.id }} `; ` tx.auditLog.create `; paginação/ordem ` orderBy: { position: "asc" } `; efeitos delegados não identificados

### POST /api/gym/classes/bookings/[id]/revert

- **Arquivo:** [src/app/api/gym/classes/bookings/[id]/revert/route.ts:8](<../../../src/app/api/gym/classes/bookings/[id]/revert/route.ts#L8>); linhas 8–51.
- **Finalidade implementada:** Executar a operação de gymBookingService.revertAttendance; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: bookingId } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.revertAttendance({ workspaceId: context.workspaceId, bookingId, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao reverter status de presença." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:874](<../../../src/modules/workspaces/application/gym-booking-service.ts#L874>) (GymBookingService.revertAttendance): consultas/escritas ` prisma.gymClassBooking.findFirst {where: { id: bookingId, workspaceId }} `; ` prisma.gymClassBooking.update {where: { id: booking.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/classes/modalities

- **Arquivo:** [src/app/api/gym/classes/modalities/route.ts:8](<../../../src/app/api/gym/classes/modalities/route.ts#L8>); linhas 8–38.
- **Finalidade implementada:** Consultar/obter dados por gymClassService.listModalities; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("activeOnly") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.listModalities(context.workspaceId, { activeOnly }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(modalities) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar modalidades." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:152](<../../../src/modules/workspaces/application/gym-class-service.ts#L152>) (GymClassService.listModalities): consultas/escritas ` prisma.gymModality.findMany {where} `; paginação/ordem ` orderBy: { name: "asc" } `; efeitos delegados não identificados

### POST /api/gym/classes/modalities

- **Arquivo:** [src/app/api/gym/classes/modalities/route.ts:40](<../../../src/app/api/gym/classes/modalities/route.ts#L40>); linhas 40–99.
- **Finalidade implementada:** Executar a operação de gymClassService.createModality; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, name, description, color, icon, defaultDurationMinutes, defaultCapacity } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !name || !name.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.createModality({ workspaceId: context.workspaceId, actorUserId: context.userId, name: name.trim(), description, color, icon, defaultDurationMinutes, defaultCapacity }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "O nome da modalidade é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(modality, { status: 201 }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao cadastrar modalidade." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:172](<../../../src/modules/workspaces/application/gym-class-service.ts#L172>) (GymClassService.createModality): consultas/escritas ` prisma.gymModality.findFirst {where: { workspaceId: input.workspaceId, name: { equals: trimmedName, mode: "insensitive" } }} `; ` prisma.gymModality.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### PATCH /api/gym/classes/modalities/[id]

- **Arquivo:** [src/app/api/gym/classes/modalities/[id]/route.ts:8](<../../../src/app/api/gym/classes/modalities/[id]/route.ts#L8>); linhas 8–67.
- **Finalidade implementada:** Executar a operação de gymClassService.updateModality; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: modalityId } = await params `; ` req.json() `; ` { workspaceId, name, description, color, icon, defaultDurationMinutes, defaultCapacity, isActive } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.updateModality({ modalityId, workspaceId: context.workspaceId, actorUserId: context.userId, name, description, color, icon, defaultDurationMinutes, defaultCapacity, isActive }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao atualizar modalidade." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:219](<../../../src/modules/workspaces/application/gym-class-service.ts#L219>) (GymClassService.updateModality): consultas/escritas ` prisma.gymModality.findFirst {where: { id: input.modalityId, workspaceId: input.workspaceId }} `; ` prisma.gymModality.findFirst {where: { workspaceId: input.workspaceId, name: { equals: trimmedName, mode: "insensitive" }, id: { not: modality.id } }} `; ` prisma.gymModality.update {where: { id: modality.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### DELETE /api/gym/classes/modalities/[id]

- **Arquivo:** [src/app/api/gym/classes/modalities/[id]/route.ts:69](<../../../src/app/api/gym/classes/modalities/[id]/route.ts#L69>); linhas 69–112.
- **Finalidade implementada:** Executar a operação de gymClassService.deleteModality; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: modalityId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.deleteModality( modalityId, context.workspaceId, context.userId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(deactivated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao desativar modalidade." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:281](<../../../src/modules/workspaces/application/gym-class-service.ts#L281>) (GymClassService.deleteModality): consultas/escritas ` prisma.gymModality.findFirst {where: { id: modalityId, workspaceId }} `; ` prisma.gymModality.update {where: { id: modality.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/classes/rooms

- **Arquivo:** [src/app/api/gym/classes/rooms/route.ts:8](<../../../src/app/api/gym/classes/rooms/route.ts#L8>); linhas 8–39.
- **Finalidade implementada:** Consultar/obter dados por gymClassService.listRooms; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `; ` searchParams.get("activeOnly") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.listRooms(context.workspaceId, { unitId, activeOnly }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(rooms) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar salas." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:312](<../../../src/modules/workspaces/application/gym-class-service.ts#L312>) (GymClassService.listRooms): consultas/escritas ` prisma.gymRoom.findMany {where} `; paginação/ordem ` orderBy: { name: "asc" } `; efeitos delegados não identificados

### POST /api/gym/classes/rooms

- **Arquivo:** [src/app/api/gym/classes/rooms/route.ts:41](<../../../src/app/api/gym/classes/rooms/route.ts#L41>); linhas 41–103.
- **Finalidade implementada:** Executar a operação de gymClassService.createRoom; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, unitId, name, description, maxCapacity } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !unitId `; ` !name || !name.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.createRoom({ workspaceId: context.workspaceId, unitId, actorUserId: context.userId, name: name.trim(), description, maxCapacity: Number(maxCapacity) || 30 }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "A filial/unidade é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "O nome da sala é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(room, { status: 201 }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao cadastrar sala." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:338](<../../../src/modules/workspaces/application/gym-class-service.ts#L338>) (GymClassService.createRoom): consultas/escritas ` prisma.gymUnit.findFirst {where: { id: input.unitId, workspaceId: input.workspaceId }} `; ` prisma.gymRoom.findFirst {where: { workspaceId: input.workspaceId, unitId: input.unitId, name: { equals: trimmedName, mode: "insensitive" } }} `; ` prisma.gymRoom.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### PATCH /api/gym/classes/rooms/[id]

- **Arquivo:** [src/app/api/gym/classes/rooms/[id]/route.ts:8](<../../../src/app/api/gym/classes/rooms/[id]/route.ts#L8>); linhas 8–61.
- **Finalidade implementada:** Executar a operação de gymClassService.updateRoom; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: roomId } = await params `; ` req.json() `; ` { workspaceId, name, description, maxCapacity, isActive } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.updateRoom({ roomId, workspaceId: context.workspaceId, actorUserId: context.userId, name, description, maxCapacity: maxCapacity ? Number(maxCapacity) : undefined, isActive }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao atualizar sala." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:400](<../../../src/modules/workspaces/application/gym-class-service.ts#L400>) (GymClassService.updateRoom): consultas/escritas ` prisma.gymRoom.findFirst {where: { id: input.roomId, workspaceId: input.workspaceId }} `; ` prisma.gymRoom.findFirst {where: { workspaceId: input.workspaceId, unitId: room.unitId, name: { equals: trimmedName, mode: "insensitive" }, id: { not: room.id } }} `; ` prisma.gymRoom.update {where: { id: room.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### DELETE /api/gym/classes/rooms/[id]

- **Arquivo:** [src/app/api/gym/classes/rooms/[id]/route.ts:63](<../../../src/app/api/gym/classes/rooms/[id]/route.ts#L63>); linhas 63–106.
- **Finalidade implementada:** Executar a operação de gymClassService.deleteRoom; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: roomId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.deleteRoom( roomId, context.workspaceId, context.userId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(deactivated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao desativar sala." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:467](<../../../src/modules/workspaces/application/gym-class-service.ts#L467>) (GymClassService.deleteRoom): consultas/escritas ` prisma.gymRoom.findFirst {where: { id: roomId, workspaceId }} `; ` prisma.gymRoom.update {where: { id: room.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/classes/schedules

- **Arquivo:** [src/app/api/gym/classes/schedules/route.ts:8](<../../../src/app/api/gym/classes/schedules/route.ts#L8>); linhas 8–53.
- **Finalidade implementada:** Consultar/obter dados por gymClassService.listSchedules; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `; ` searchParams.get("modalityId") `; ` searchParams.get("roomId") `; ` searchParams.get("instructorStaffId") `; ` searchParams.get("dayOfWeek") `; ` searchParams.get("activeOnly") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.listSchedules(context.workspaceId, { unitId, modalityId, roomId, instructorStaffId, dayOfWeek, activeOnly }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(schedules) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar grade de aulas." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:498](<../../../src/modules/workspaces/application/gym-class-service.ts#L498>) (GymClassService.listSchedules): consultas/escritas ` prisma.gymClassSchedule.findMany {where} `; paginação/ordem ` orderBy: [ { dayOfWeek: "asc" }, { startTime: "asc" } ] `; efeitos delegados não identificados

### POST /api/gym/classes/schedules

- **Arquivo:** [src/app/api/gym/classes/schedules/route.ts:55](<../../../src/app/api/gym/classes/schedules/route.ts#L55>); linhas 55–149.
- **Finalidade implementada:** Executar a operação de gymClassService.createSchedule; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, unitId, modalityId, roomId, instructorStaffId, dayOfWeek, startTime, endTime, capacity, allowWaitlist, maxWaitlist, startDate, endDate, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !unitId || !modalityId || !roomId || !instructorStaffId `; ` dayOfWeek === undefined || dayOfWeek === null `; ` !startTime || !endTime `; ` !capacity || Number(capacity) <= 0 `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.createSchedule({ workspaceId: context.workspaceId, unitId, modalityId, roomId, instructorStaffId, dayOfWeek: Number(dayOfWeek), startTime, endTime, capacity: Number(capacity), allowWaitlist, maxWaitlist: maxWaitlist ? Number(maxWaitlist) : undefined, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, notes, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Unidade, modalidade, sala e professor são campos obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Dia da semana é obrigatório (0 a 6)." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Horários de início e término são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_CAPACITY", message: "A capacidade de vagas deve ser maior que zero." } }, { status: 400 } ) `; ` NextResponse.json(schedule, { status: 201 }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao criar horário na grade." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:543](<../../../src/modules/workspaces/application/gym-class-service.ts#L543>) (GymClassService.createSchedule): consultas/escritas ` prisma.gymRoom.findFirst {where: { id: input.roomId, workspaceId: input.workspaceId }} `; ` prisma.gymModality.findFirst {where: { id: input.modalityId, workspaceId: input.workspaceId }} `; ` prisma.workspaceMember.findFirst {where: { id: input.instructorStaffId, workspaceId: input.workspaceId, isActive: true }} `; ` prisma.gymClassSchedule.findMany {where: { workspaceId: input.workspaceId, roomId: input.roomId, dayOfWeek: input.dayOfWeek, isActive: true }} `; ` prisma.gymClassSchedule.findMany {where: { workspaceId: input.workspaceId, instructorStaffId: input.instructorStaffId, dayOfWeek: input.dayOfWeek, isActive: true }} `; ` prisma.gymClassSchedule.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### PATCH /api/gym/classes/schedules/[id]

- **Arquivo:** [src/app/api/gym/classes/schedules/[id]/route.ts:8](<../../../src/app/api/gym/classes/schedules/[id]/route.ts#L8>); linhas 8–79.
- **Finalidade implementada:** Executar a operação de gymClassService.updateSchedule; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: scheduleId } = await params `; ` req.json() `; ` { workspaceId, modalityId, roomId, instructorStaffId, dayOfWeek, startTime, endTime, capacity, allowWaitlist, maxWaitlist, startDate, endDate, isActive, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.updateSchedule({ scheduleId, workspaceId: context.workspaceId, actorUserId: context.userId, modalityId, roomId, instructorStaffId, dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : undefined, startTime, endTime, capacity: capacity ? Number(capacity) : undefined, allowWaitlist, maxWaitlist: maxWaitlist ? Number(maxWaitlist) : undefined, startDate: startDate ? new Date(startDate) : undefined, endDate: endDate ? new Date(endDate) : undefined, isActive, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao atualizar horário da grade." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:693](<../../../src/modules/workspaces/application/gym-class-service.ts#L693>) (GymClassService.updateSchedule): consultas/escritas ` prisma.gymClassSchedule.findFirst {where: { id: input.scheduleId, workspaceId: input.workspaceId }} `; ` prisma.gymRoom.findFirst {where: { id: targetRoomId, workspaceId: input.workspaceId }} `; ` prisma.gymClassSchedule.findMany {where: { workspaceId: input.workspaceId, roomId: targetRoomId, dayOfWeek: targetDayOfWeek, isActive: true, id: { not: schedule.id } }} `; ` prisma.gymClassSchedule.findMany {where: { workspaceId: input.workspaceId, instructorStaffId: targetInstructorId, dayOfWeek: targetDayOfWeek, isActive: true, id: { not: schedule.id } }} `; ` prisma.gymClassSchedule.update {where: { id: schedule.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### DELETE /api/gym/classes/schedules/[id]

- **Arquivo:** [src/app/api/gym/classes/schedules/[id]/route.ts:81](<../../../src/app/api/gym/classes/schedules/[id]/route.ts#L81>); linhas 81–124.
- **Finalidade implementada:** Executar a operação de gymClassService.deleteSchedule; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: scheduleId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.deleteSchedule( scheduleId, context.workspaceId, context.userId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(deactivated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao desativar horário da grade." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:822](<../../../src/modules/workspaces/application/gym-class-service.ts#L822>) (GymClassService.deleteSchedule): consultas/escritas ` prisma.gymClassSchedule.findFirst {where: { id: scheduleId, workspaceId }} `; ` prisma.gymClassSchedule.update {where: { id: schedule.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/classes/sessions

- **Arquivo:** [src/app/api/gym/classes/sessions/route.ts:9](<../../../src/app/api/gym/classes/sessions/route.ts#L9>); linhas 9–57.
- **Finalidade implementada:** Consultar/obter dados por gymClassService.listSessions; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `; ` searchParams.get("modalityId") `; ` searchParams.get("roomId") `; ` searchParams.get("instructorStaffId") `; ` searchParams.get("status") `; ` searchParams.get("fromDate") `; ` searchParams.get("toDate") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.listSessions(context.workspaceId, { unitId, modalityId, roomId, instructorStaffId, status, fromDate, toDate }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(sessions) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar sessões de aula." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:984](<../../../src/modules/workspaces/application/gym-class-service.ts#L984>) (GymClassService.listSessions): consultas/escritas ` prisma.gymClassSession.findMany {where} `; paginação/ordem ` orderBy: [ { sessionDate: "asc" }, { startsAt: "asc" } ] `; efeitos delegados não identificados

### POST /api/gym/classes/sessions

- **Arquivo:** [src/app/api/gym/classes/sessions/route.ts:59](<../../../src/app/api/gym/classes/sessions/route.ts#L59>); linhas 59–149.
- **Finalidade implementada:** Executar a operação de gymClassService.generateSessionsFromSchedules, gymClassService.createManualSession; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId: body.workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { action = "generate" } = body `; ` { fromDate, toDate, unitId } = body `; ` { unitId, modalityId, roomId, instructorStaffId, sessionDate, startsAt, endsAt, capacity, allowWaitlist, maxWaitlist, notes } = body `
- **Condições de validação/erros:** ` action === "generate" `; ` !fromDate || !toDate `; ` action === "manual" `; ` !unitId || !modalityId || !roomId || !instructorStaffId || !sessionDate || !startsAt || !endsAt `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.generateSessionsFromSchedules({ workspaceId: context.workspaceId, fromDate: new Date(fromDate), toDate: new Date(toDate), unitId, actorUserId: context.userId }) `; ` gymClassService.createManualSession({ workspaceId: context.workspaceId, unitId, modalityId, roomId, instructorStaffId, sessionDate: new Date(sessionDate), startsAt: new Date(startsAt), endsAt: new Date(endsAt), capacity: Number(capacity) || 20, allowWaitlist, maxWaitlist: maxWaitlist ? Number(maxWaitlist) : undefined, notes, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Datas de início (fromDate) e fim (toDate) são obrigatórias para expansão da grade." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Todos os dados da aula avulsa são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(session, { status: 201 }) `; ` NextResponse.json( { error: { code: "INVALID_ACTION", message: "Ação não suportada." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao processar requisição de sessões." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:859](<../../../src/modules/workspaces/application/gym-class-service.ts#L859>) (GymClassService.generateSessionsFromSchedules): consultas/escritas ` prisma.gymClassSchedule.findMany {where: scheduleWhere} `; ` prisma.gymClassSession.findUnique {where: { scheduleId_sessionDate: { scheduleId: sched.id, sessionDate } }} `; ` prisma.gymClassSession.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-class-service.ts:1234](<../../../src/modules/workspaces/application/gym-class-service.ts#L1234>) (GymClassService.createManualSession): consultas/escritas ` prisma.gymRoom.findFirst {where: { id: input.roomId, workspaceId: input.workspaceId }} `; ` prisma.gymClassSession.findFirst {where: { workspaceId: input.workspaceId, roomId: input.roomId, sessionDate: input.sessionDate, status: { not: GymClassSessionStatus.CANCELLED }, AND: [ { startsAt: { lt: input.endsAt } }, { endsAt: { gt: input.startsAt } } ] }} `; ` prisma.gymClassSession.findFirst {where: { workspaceId: input.workspaceId, sessionDate: input.sessionDate, status: { not: GymClassSessionStatus.CANCELLED }, OR: [ { instructorStaffId: input.instructorStaffId }, { substituteInstructorStaffId: input.instructorStaffId } ], AND: [ { startsAt: { lt: input.endsAt } }, { endsAt: { gt: input.startsAt } } ] }} `; ` prisma.gymClassSession.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/classes/sessions/[id]/book

- **Arquivo:** [src/app/api/gym/classes/sessions/[id]/book/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/book/route.ts#L8>); linhas 8–61.
- **Finalidade implementada:** Executar a operação de gymBookingService.bookClass; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: sessionId } = await params `; ` req.json() `; ` { workspaceId, studentMemberId, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.bookClass({ sessionId, workspaceId: context.workspaceId, studentMemberId, bookedByUserId: context.userId, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "O aluno para a reserva é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(booking, { status: 201 }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao realizar reserva de aula." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:98](<../../../src/modules/workspaces/application/gym-booking-service.ts#L98>) (GymBookingService.bookClass): consultas/escritas ` prisma.gymClassSession.findFirst {where: { id: sessionId, workspaceId }} `; ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId, isActive: true }} `; ` prisma.gymClassBooking.count {where: { workspaceId, studentMemberId, status: { in: [GymClassBookingStatus.CONFIRMED, GymClassBookingStatus.ATTENDED] }, bookedAt: { gte: cycleStart } }} `; ` prisma.gymClassBooking.count {where: { workspaceId, studentMemberId, status: GymClassBookingStatus.CONFIRMED, session: { startsAt: { gt: now } } }} `; ` prisma.gymClassBooking.findFirst {where: { sessionId, studentMemberId, status: GymClassBookingStatus.CONFIRMED }} `; ` prisma.gymClassWaitlist.findFirst {where: { sessionId, studentMemberId, status: { in: [GymClassWaitlistStatus.WAITING, GymClassWaitlistStatus.OFFERED] } }} `; ` tx.gymClassSession.findUnique {where: { id: sessionId }} `; ` tx.gymClassSession.update {where: { id: sessionId }} `; ` tx.gymClassBooking.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/classes/sessions/[id]/cancel

- **Arquivo:** [src/app/api/gym/classes/sessions/[id]/cancel/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/cancel/route.ts#L8>); linhas 8–59.
- **Finalidade implementada:** Executar a operação de gymClassService.cancelSession; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: sessionId } = await params `; ` req.json() `; ` { workspaceId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !reason || !reason.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.cancelSession({ sessionId, workspaceId: context.workspaceId, reason: reason.trim(), actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "CANCELLATION_REASON_REQUIRED", message: "A justificativa do cancelamento da aula é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao cancelar sessão da aula." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:1180](<../../../src/modules/workspaces/application/gym-class-service.ts#L1180>) (GymClassService.cancelSession): consultas/escritas ` prisma.gymClassSession.findFirst {where: { id: sessionId, workspaceId }} `; ` prisma.gymClassSession.update {where: { id: session.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/classes/sessions/[id]/roster

- **Arquivo:** [src/app/api/gym/classes/sessions/[id]/roster/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/roster/route.ts#L8>); linhas 8–47.
- **Finalidade implementada:** Consultar/obter dados por gymBookingService.listSessionRoster; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: sessionId } = await params `; ` url.searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.listSessionRoster(context.workspaceId, sessionId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(roster) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao consultar lista de chamada da aula." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:647](<../../../src/modules/workspaces/application/gym-booking-service.ts#L647>) (GymBookingService.listSessionRoster): consultas/escritas ` prisma.gymClassSession.findFirst {where: { id: sessionId, workspaceId }} `; paginação/ordem ` orderBy: { bookedAt: "asc" } `; ` orderBy: { position: "asc" } `; efeitos delegados não identificados

### GET /api/gym/classes/sessions/[id]

- **Arquivo:** [src/app/api/gym/classes/sessions/[id]/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/route.ts#L8>); linhas 8–41.
- **Finalidade implementada:** Consultar/obter dados por gymClassService.getSessionById; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["classes.read"] }) `.
- **Entradas, filtros e paginação:** ` { id: sessionId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.getSessionById(sessionId, context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(session) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao buscar sessão de aula." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:1043](<../../../src/modules/workspaces/application/gym-class-service.ts#L1043>) (GymClassService.getSessionById): consultas/escritas ` prisma.gymClassSession.findFirst {where: { id: sessionId, workspaceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/classes/sessions/[id]/substitute

- **Arquivo:** [src/app/api/gym/classes/sessions/[id]/substitute/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/substitute/route.ts#L8>); linhas 8–67.
- **Finalidade implementada:** Executar a operação de gymClassService.substituteInstructor; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: sessionId } = await params `; ` req.json() `; ` { workspaceId, substituteInstructorStaffId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !substituteInstructorStaffId `; ` !reason || !reason.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymClassService.substituteInstructor({ sessionId, workspaceId: context.workspaceId, substituteInstructorStaffId, reason: reason.trim(), actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "O professor substituto é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "SUBSTITUTE_REASON_REQUIRED", message: "A justificativa da substituição é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao registrar professor substituto." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-class-service.ts:1077](<../../../src/modules/workspaces/application/gym-class-service.ts#L1077>) (GymClassService.substituteInstructor): consultas/escritas ` prisma.gymClassSession.findFirst {where: { id: sessionId, workspaceId }} `; ` prisma.workspaceMember.findFirst {where: { id: substituteInstructorStaffId, workspaceId, isActive: true }} `; ` prisma.gymClassSession.findFirst {where: { workspaceId, id: { not: session.id }, sessionDate: session.sessionDate, status: { not: GymClassSessionStatus.CANCELLED }, OR: [ { instructorStaffId: substitute.id }, { substituteInstructorStaffId: substitute.id } ], AND: [ { startsAt: { lt: session.endsAt } }, { endsAt: { gt: session.startsAt } } ] }} `; ` prisma.gymClassSession.update {where: { id: session.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/classes/sessions/[id]/waitlist

- **Arquivo:** [src/app/api/gym/classes/sessions/[id]/waitlist/route.ts:8](<../../../src/app/api/gym/classes/sessions/[id]/waitlist/route.ts#L8>); linhas 8–59.
- **Finalidade implementada:** Executar a operação de gymBookingService.joinWaitlist; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/classes/classes-client.tsx](<../../../src/app/(gym)/gym/classes/classes-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: sessionId } = await params `; ` req.json() `; ` { workspaceId, studentMemberId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.joinWaitlist({ sessionId, workspaceId: context.workspaceId, studentMemberId, requestedByUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "O aluno para a lista de espera é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(waitlist, { status: 201 }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao entrar na lista de espera." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, 201, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:335](<../../../src/modules/workspaces/application/gym-booking-service.ts#L335>) (GymBookingService.joinWaitlist): consultas/escritas ` prisma.gymClassSession.findFirst {where: { id: sessionId, workspaceId }} `; ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId, isActive: true }} `; ` prisma.gymClassBooking.findFirst {where: { sessionId, studentMemberId, status: GymClassBookingStatus.CONFIRMED }} `; ` prisma.gymClassWaitlist.findFirst {where: { sessionId, studentMemberId, status: { in: [GymClassWaitlistStatus.WAITING, GymClassWaitlistStatus.OFFERED] } }} `; ` tx.gymClassSession.findUnique {where: { id: sessionId }} `; ` tx.gymClassSession.update {where: { id: sessionId }} `; ` tx.gymClassWaitlist.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/classes/waitlist/[id]/leave

- **Arquivo:** [src/app/api/gym/classes/waitlist/[id]/leave/route.ts:8](<../../../src/app/api/gym/classes/waitlist/[id]/leave/route.ts#L8>); linhas 8–51.
- **Finalidade implementada:** Executar a operação de gymBookingService.leaveWaitlist; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["classes.read", "classes.manage", "bookings.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: waitlistId } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.leaveWaitlist({ waitlistId, workspaceId: context.workspaceId, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao sair da lista de espera." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:595](<../../../src/modules/workspaces/application/gym-booking-service.ts#L595>) (GymBookingService.leaveWaitlist): consultas/escritas ` prisma.gymClassWaitlist.findFirst {where: { id: waitlistId, workspaceId }} `; ` tx.gymClassWaitlist.update {where: { id: entry.id }} `; ` tx.gymClassSession.update {where: { id: entry.sessionId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/communication/notifications

- **Arquivo:** [src/app/api/gym/communication/notifications/route.ts:8](<../../../src/app/api/gym/communication/notifications/route.ts#L8>); linhas 8–82.
- **Finalidade implementada:** Executar a operação de gymCommunicationService.sendTargetedNotification; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/crm/crm-client.tsx](<../../../src/app/(gym)/gym/crm/crm-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["communication.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, title, message, targetAudience, targetFilter, channel, customDeepLink } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !title || !title.trim() `; ` !message || !message.trim() `; ` !targetAudience `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCommunicationService.sendTargetedNotification({ workspaceId: context.workspaceId, senderUserId: context.userId, title, message, targetAudience, targetFilter, channel, customDeepLink }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "TITLE_REQUIRED", message: "O título da mensagem é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "MESSAGE_REQUIRED", message: "A mensagem é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "AUDIENCE_REQUIRED", message: "A audiência alvo é obrigatória." } }, { status: 400 } ) `; `` NextResponse.json( { ...result, message: `Notificação enviada com sucesso para ${result.recipientsCount} destinatários.` }, { status: 201 } ) ``; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao enviar notificação." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-communication-service.ts:56](<../../../src/modules/workspaces/application/gym-communication-service.ts#L56>) (GymCommunicationService.sendTargetedNotification): consultas/escritas ` prisma.workspaceMember.findMany {where: { workspaceId, role: "STUDENT", isActive: true }} `; ` prisma.workspaceMember.findMany {where: { workspaceId, role: "STUDENT", isActive: true, unitId: targetFilter.unitId }} `; ` prisma.gymClassBooking.findMany {where: bookingWhere} `; ` prisma.gymGuardian.findMany {where: { workspaceId, isLegalRepresentative: true, revokedAt: null }} `; ` prisma.notification.createMany `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/crm/leads

- **Arquivo:** [src/app/api/gym/crm/leads/route.ts:8](<../../../src/app/api/gym/crm/leads/route.ts#L8>); linhas 8–52.
- **Finalidade implementada:** Consultar/obter dados por gymCrmService.listGymLeads; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/crm/crm-client.tsx](<../../../src/app/(gym)/gym/crm/crm-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.read", "students.read", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("status") `; ` searchParams.get("source") `; ` searchParams.get("ownerId") `; ` searchParams.get("search") `; ` searchParams.get("page") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCrmService.listGymLeads({ workspaceId: context.workspaceId, status, source, ownerId, search, page, limit }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao listar leads do CRM." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-crm-service.ts:73](<../../../src/modules/workspaces/application/gym-crm-service.ts#L73>) (GymCrmService.listGymLeads): consultas/escritas ` prisma.lead.count {where} `; ` prisma.lead.findMany {where} `; ` prisma.lead.findMany {where: { workspaceId }} `; paginação/ordem ` take: limit `; ` orderBy: { createdAt: "desc" } `; ` take: 3 `; efeitos delegados não identificados

### POST /api/gym/crm/leads

- **Arquivo:** [src/app/api/gym/crm/leads/route.ts:54](<../../../src/app/api/gym/crm/leads/route.ts#L54>); linhas 54–110.
- **Finalidade implementada:** Executar a operação de gymCrmService.createGymLead; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/crm/crm-client.tsx](<../../../src/app/(gym)/gym/crm/crm-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.manage", "students.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, name, phone, whatsapp, email, instagram, goal, source, notes, potentialValue } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCrmService.createGymLead({ workspaceId: context.workspaceId, actorUserId: context.userId, name, phone, whatsapp, email, instagram, goal, source, notes, potentialValue: potentialValue !== undefined && potentialValue !== null ? Number(potentialValue) : null }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { success: true, message: "Lead cadastrado com sucesso.", lead }, { status: 201 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao criar lead." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-crm-service.ts:156](<../../../src/modules/workspaces/application/gym-crm-service.ts#L156>) (GymCrmService.createGymLead): consultas/escritas ` prisma.lead.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/crm/leads/[id]/convert

- **Arquivo:** [src/app/api/gym/crm/leads/[id]/convert/route.ts:8](<../../../src/app/api/gym/crm/leads/[id]/convert/route.ts#L8>); linhas 8–68.
- **Finalidade implementada:** Executar a operação de gymCrmService.convertLeadToStudent; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/crm/crm-client.tsx](<../../../src/app/(gym)/gym/crm/crm-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.manage", "students.manage", "enrollments.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, unitId, assignedStaffId, planVersionId, cpfCnpj, birthDate, gender, guardian } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCrmService.convertLeadToStudent({ workspaceId: context.workspaceId, leadId: id, actorUserId: context.userId, unitId, assignedStaffId, planVersionId, cpfCnpj, birthDate, gender, guardian }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { ...result, message: "Lead convertido em aluno com sucesso!" }, { status: 201 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao converter lead em aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-crm-service.ts:273](<../../../src/modules/workspaces/application/gym-crm-service.ts#L273>) (GymCrmService.convertLeadToStudent): consultas/escritas ` prisma.lead.findFirst {where: { id: leadId, workspaceId }} `; ` prisma.user.findUnique {where: { email: lead.email }} `; ` prisma.user.findFirst {where: { cpfCnpj }} `; ` prisma.user.create `; ` prisma.workspaceMember.findFirst {where: { workspaceId, userId: user.id }} `; ` prisma.workspaceMember.create `; ` prisma.workspaceMember.update {where: { id: member.id }} `; ` prisma.user.findUnique {where: { email: guardian.email }} `; ` prisma.user.findFirst {where: { cpfCnpj: guardian.cpf }} `; ` prisma.gymGuardian.create `; ` prisma.gymStudentProfile.findUnique {where: { memberId: member.id }} `; ` prisma.gymStudentProfile.create `; ` prisma.gymPlanVersion.findUnique {where: { id: planVersionId }} `; ` prisma.gymEnrollment.create `; ` prisma.lead.update {where: { id: leadId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### PATCH /api/gym/crm/leads/[id]

- **Arquivo:** [src/app/api/gym/crm/leads/[id]/route.ts:8](<../../../src/app/api/gym/crm/leads/[id]/route.ts#L8>); linhas 8–63.
- **Finalidade implementada:** Executar a operação de gymCrmService.updateGymLeadStatus; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/crm/crm-client.tsx](<../../../src/app/(gym)/gym/crm/crm-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["crm.manage", "students.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, status, notes, lostReason, lostReasonDetails } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !status `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCrmService.updateGymLeadStatus( context.workspaceId, id, context.userId, status, notes, lostReason, lostReasonDetails ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "STATUS_REQUIRED", message: "O status é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, lead }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao atualizar lead." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-crm-service.ts:217](<../../../src/modules/workspaces/application/gym-crm-service.ts#L217>) (GymCrmService.updateGymLeadStatus): consultas/escritas ` prisma.lead.findFirst {where: { id: leadId, workspaceId }} `; ` prisma.lead.update {where: { id: leadId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/agent/ack

- **Arquivo:** [src/app/api/gym/devices/agent/ack/route.ts:16](<../../../src/app/api/gym/devices/agent/ack/route.ts#L16>); linhas 16–75.
- **Finalidade implementada:** Executar a operação de gymDeviceService.authenticateDevice, gymDeviceService.acknowledgeCommand; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { commandId, status, rawResult, errorMessage } = body `
- **Condições de validação/erros:** ` !rawToken `; ` !commandId `; ` status !== "ACKNOWLEDGED" && status !== "FAILED" `; ` error?.status === 401 || error?.code === "DEVICE_UNAUTHORIZED" || error?.code === "INVALID_DEVICE_TOKEN" `; ` error?.status === 404 || error?.code === "COMMAND_NOT_FOUND" `
- **Chamadas e efeitos delegados:** ` gymDeviceService.authenticateDevice(rawToken) `; ` gymDeviceService.acknowledgeCommand({ deviceId: device.id, commandId, status, rawResult, errorMessage }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "DEVICE_TOKEN_REQUIRED", message: "Token de dispositivo não fornecido." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "COMMAND_ID_REQUIRED", message: "ID do comando é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_STATUS", message: "Status deve ser ACKNOWLEDGED ou FAILED." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, command }) `; ` NextResponse.json( { error: { code: error.code || "UNAUTHORIZED", message: error.message || "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: error.code || "NOT_FOUND", message: error.message || "Comando não encontrado." } }, { status: 404 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao registrar confirmação do comando." } }, { status: 500 } ) ` Códigos/expressões status: 401, 400, 404, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:209](<../../../src/modules/workspaces/application/gym-device-service.ts#L209>) (GymDeviceService.authenticateDevice): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { deviceTokenHash: computedHash }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-device-service.ts:449](<../../../src/modules/workspaces/application/gym-device-service.ts#L449>) (GymDeviceService.acknowledgeCommand): consultas/escritas ` prisma.gymDeviceCommand.findFirst {where: { id: commandId, deviceId }} `; ` prisma.gymDeviceCommand.update {where: { id: commandId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/agent/heartbeat

- **Arquivo:** [src/app/api/gym/devices/agent/heartbeat/route.ts:16](<../../../src/app/api/gym/devices/agent/heartbeat/route.ts#L16>); linhas 16–59.
- **Finalidade implementada:** Executar a operação de gymDeviceService.authenticateDevice, gymDeviceService.handleDeviceHeartbeat; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` req.json() `
- **Condições de validação/erros:** ` !rawToken `; ` error?.status === 401 || error?.code === "DEVICE_UNAUTHORIZED" || error?.code === "INVALID_DEVICE_TOKEN" `
- **Chamadas e efeitos delegados:** ` gymDeviceService.authenticateDevice(rawToken) `; ` gymDeviceService.handleDeviceHeartbeat({ deviceId: device.id, firmwareVersion: body.firmwareVersion, ipAddress: body.ipAddress, cpuUsage: body.cpuUsage, memoryUsage: body.memoryUsage, localTime: body.localTime }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "DEVICE_TOKEN_REQUIRED", message: "Token de dispositivo não fornecido." } }, { status: 401 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: error.code || "UNAUTHORIZED", message: error.message || "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao processar heartbeat do agente." } }, { status: 500 } ) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:209](<../../../src/modules/workspaces/application/gym-device-service.ts#L209>) (GymDeviceService.authenticateDevice): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { deviceTokenHash: computedHash }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-device-service.ts:482](<../../../src/modules/workspaces/application/gym-device-service.ts#L482>) (GymDeviceService.handleDeviceHeartbeat): consultas/escritas ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; ` prisma.gymDeviceCommand.count {where: { deviceId, status: "PENDING", OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/agent/offline-cache

- **Arquivo:** [src/app/api/gym/devices/agent/offline-cache/route.ts:19](<../../../src/app/api/gym/devices/agent/offline-cache/route.ts#L19>); linhas 19–61.
- **Finalidade implementada:** Executar a operação de gymDeviceService.authenticateDevice, gymOfflineReconciliationService.getOfflineGrantsCache; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` req.json() `
- **Condições de validação/erros:** ` !rawToken `; ` body.ttlHours && Number(body.ttlHours) > 0 `; ` error?.status === 401 || error?.code === "DEVICE_UNAUTHORIZED" || error?.code === "INVALID_DEVICE_TOKEN" `
- **Chamadas e efeitos delegados:** ` gymDeviceService.authenticateDevice(rawToken) `; ` gymOfflineReconciliationService.getOfflineGrantsCache( device.id, ttlHours ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "DEVICE_TOKEN_REQUIRED", message: "Token de dispositivo não fornecido." } }, { status: 401 } ) `; ` NextResponse.json(cacheSnapshot) `; ` NextResponse.json( { error: { code: error.code || "UNAUTHORIZED", message: error.message || "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao gerar cache offline de concessões." } }, { status: 500 } ) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:209](<../../../src/modules/workspaces/application/gym-device-service.ts#L209>) (GymDeviceService.authenticateDevice): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { deviceTokenHash: computedHash }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-offline-reconciliation-service.ts:116](<../../../src/modules/workspaces/application/gym-offline-reconciliation-service.ts#L116>) (GymOfflineReconciliationService.getOfflineGrantsCache): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { id: deviceId }} `; ` prisma.gymAccessGrant.findMany {where: { workspaceId: device.workspaceId, status: "ACTIVE", OR: [ { validUntil: null }, { validUntil: { gt: now } } ] }} `; ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/agent/passage

- **Arquivo:** [src/app/api/gym/devices/agent/passage/route.ts:16](<../../../src/app/api/gym/devices/agent/passage/route.ts#L16>); linhas 16–78.
- **Finalidade implementada:** Executar a operação de gymDeviceService.authenticateDevice, gymDeviceService.recordTurnstilePassage; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { externalPersonId, studentMemberId, credentialType, credentialCode, granted, direction, reasonCode, rawEvent, accessedAt } = body `
- **Condições de validação/erros:** ` !rawToken `; ` error?.status === 401 || error?.code === "DEVICE_UNAUTHORIZED" || error?.code === "INVALID_DEVICE_TOKEN" `
- **Chamadas e efeitos delegados:** ` gymDeviceService.authenticateDevice(rawToken) `; ` gymDeviceService.recordTurnstilePassage({ deviceId: device.id, externalPersonId, studentMemberId, credentialType, credentialCode, granted: granted !== undefined ? Boolean(granted) : true, direction: direction === "EXIT" ? "EXIT" : "ENTRY", reasonCode, rawEvent, accessedAt: accessedAt ? new Date(accessedAt) : new Date() }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "DEVICE_TOKEN_REQUIRED", message: "Token de dispositivo não fornecido." } }, { status: 401 } ) `; ` NextResponse.json({ success: true, log: { id: log.id, direction: log.direction, granted: log.granted, reasonCode: log.reasonCode, accessedAt: log.accessedAt } }, { status: 201 }) `; ` NextResponse.json( { error: { code: error.code || "UNAUTHORIZED", message: error.message || "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao registrar passagem do dispositivo." } }, { status: 500 } ) ` Códigos/expressões status: 401, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:209](<../../../src/modules/workspaces/application/gym-device-service.ts#L209>) (GymDeviceService.authenticateDevice): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { deviceTokenHash: computedHash }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-device-service.ts:530](<../../../src/modules/workspaces/application/gym-device-service.ts#L530>) (GymDeviceService.recordTurnstilePassage): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { id: deviceId }} `; ` prisma.gymStudentProfile.findFirst {where: { registrationNumber: externalPersonId, member: { workspaceId: device.workspaceId } }} `; ` prisma.gymAccessGrant.findFirst {where: { workspaceId: device.workspaceId, credentialCode, status: "ACTIVE" }} `; ` prisma.gymAccessLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/agent/pull

- **Arquivo:** [src/app/api/gym/devices/agent/pull/route.ts:16](<../../../src/app/api/gym/devices/agent/pull/route.ts#L16>); linhas 16–59.
- **Finalidade implementada:** Executar a operação de gymDeviceService.authenticateDevice, gymDeviceService.pollPendingCommands; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` req.json() `
- **Condições de validação/erros:** ` !rawToken `; ` body.limit && Number(body.limit) > 0 `; ` error?.status === 401 || error?.code === "DEVICE_UNAUTHORIZED" || error?.code === "INVALID_DEVICE_TOKEN" `
- **Chamadas e efeitos delegados:** ` gymDeviceService.authenticateDevice(rawToken) `; ` gymDeviceService.pollPendingCommands(device.id, limit) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "DEVICE_TOKEN_REQUIRED", message: "Token de dispositivo não fornecido." } }, { status: 401 } ) `; ` NextResponse.json({ deviceId: device.id, commandsCount: commands.length, commands }) `; ` NextResponse.json( { error: { code: error.code || "UNAUTHORIZED", message: error.message || "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao buscar comandos para o agente." } }, { status: 500 } ) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:209](<../../../src/modules/workspaces/application/gym-device-service.ts#L209>) (GymDeviceService.authenticateDevice): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { deviceTokenHash: computedHash }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-device-service.ts:395](<../../../src/modules/workspaces/application/gym-device-service.ts#L395>) (GymDeviceService.pollPendingCommands): consultas/escritas ` prisma.gymDeviceCommand.updateMany {where: { deviceId, status: "PENDING", expiresAt: { lt: now } }} `; ` prisma.gymDeviceCommand.findMany {where: { deviceId, status: "PENDING", OR: [ { expiresAt: null }, { expiresAt: { gte: now } } ] }} `; ` prisma.gymDeviceCommand.updateMany {where: { id: { in: commandIds } }} `; paginação/ordem ` orderBy: [ { priority: "desc" }, { createdAt: "asc" } ] `; ` take: Math.min(Math.max(limit, 1), 50) `; efeitos delegados não identificados

### POST /api/gym/devices/agent/sync-offline-events

- **Arquivo:** [src/app/api/gym/devices/agent/sync-offline-events/route.ts:19](<../../../src/app/api/gym/devices/agent/sync-offline-events/route.ts#L19>); linhas 19–62.
- **Finalidade implementada:** Executar a operação de gymDeviceService.authenticateDevice, gymOfflineReconciliationService.syncOfflineEventsBatch; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { agentLocalTime, events } = body `
- **Condições de validação/erros:** ` !rawToken `; ` !Array.isArray(events) `; ` error?.status === 401 || error?.code === "DEVICE_UNAUTHORIZED" || error?.code === "INVALID_DEVICE_TOKEN" `
- **Chamadas e efeitos delegados:** ` gymDeviceService.authenticateDevice(rawToken) `; ` gymOfflineReconciliationService.syncOfflineEventsBatch({ deviceId: device.id, agentLocalTime, events }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "DEVICE_TOKEN_REQUIRED", message: "Token de dispositivo não fornecido." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "INVALID_EVENTS_LIST", message: "A lista de eventos offline deve ser um array." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, ...result }) `; ` NextResponse.json( { error: { code: error.code || "UNAUTHORIZED", message: error.message || "Não autorizado." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao sincronizar eventos offline." } }, { status: 500 } ) ` Códigos/expressões status: 401, 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:209](<../../../src/modules/workspaces/application/gym-device-service.ts#L209>) (GymDeviceService.authenticateDevice): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { deviceTokenHash: computedHash }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-offline-reconciliation-service.ts:238](<../../../src/modules/workspaces/application/gym-offline-reconciliation-service.ts#L238>) (GymOfflineReconciliationService.syncOfflineEventsBatch): consultas/escritas ` prisma.gymAccessDevice.findUnique {where: { id: deviceId }} `; ` prisma.gymAccessLog.findUnique {where: { deduplicationKey }} `; ` prisma.gymStudentProfile.findFirst {where: { registrationNumber: evt.externalPersonId, member: { workspaceId: device.workspaceId } }} `; ` prisma.gymAccessGrant.findFirst {where: { workspaceId: device.workspaceId, credentialCode: evt.credentialCode }} `; ` prisma.workspaceMember.findFirst {where: { id: resolvedStudentId, workspaceId: device.workspaceId }} `; ` prisma.gymAccessGrant.findFirst {where: { workspaceId: device.workspaceId, studentMemberId: resolvedStudentId, status: "ACTIVE" }} `; ` prisma.gymAccessLog.create `; ` prisma.gymAccessReconciliationDivergence.create `; ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/commands/[id]/replay

- **Arquivo:** [src/app/api/gym/devices/commands/[id]/replay/route.ts:15](<../../../src/app/api/gym/devices/commands/[id]/replay/route.ts#L15>); linhas 15–59.
- **Finalidade implementada:** Executar a operação de recoveryService.replayDeviceCommand; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["devices.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: commandId } = await params `; ` request.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !commandId `; ` accessResponse `
- **Chamadas e efeitos delegados:** ` recoveryService.replayDeviceCommand({ workspaceId, commandId, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: "O campo workspaceId é obrigatório." }, { status: 400 } ) `; ` NextResponse.json( { error: "O identificador do comando é obrigatório." }, { status: 400 } ) `; ` NextResponse.json({ success: true, command: replayed }) `; ` NextResponse.json( { error: error?.message || "Erro ao reenfileirar comando." }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-recovery-service.ts:58](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L58>) (GymRecoveryService.replayDeviceCommand): consultas/escritas ` prisma.gymDeviceCommand.findFirst {where: { id: commandId, workspaceId }} `; ` prisma.gymDeviceCommand.update {where: { id: commandId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/devices

- **Arquivo:** [src/app/api/gym/devices/route.ts:8](<../../../src/app/api/gym/devices/route.ts#L8>); linhas 8–39.
- **Finalidade implementada:** Consultar/obter dados por gymDeviceService.listDevices; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.read", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymDeviceService.listDevices(context.workspaceId, unitId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ devices }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao listar dispositivos de acesso." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:611](<../../../src/modules/workspaces/application/gym-device-service.ts#L611>) (GymDeviceService.listDevices): consultas/escritas ` prisma.gymAccessDevice.findMany {where} `; paginação/ordem ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

### POST /api/gym/devices

- **Arquivo:** [src/app/api/gym/devices/route.ts:41](<../../../src/app/api/gym/devices/route.ts#L41>); linhas 41–109.
- **Finalidade implementada:** Executar a operação de gymDeviceService.provisionDevice; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, unitId, name, deviceType, manufacturer, model, serialNumber, ipAddress, port, externalDeviceId, config } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !unitId `; ` !name || typeof name !== "string" `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymDeviceService.provisionDevice({ workspaceId: context.workspaceId, unitId, name, deviceType, manufacturer, model, serialNumber, ipAddress, port: port ? Number(port) : undefined, externalDeviceId, config }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "UNIT_REQUIRED", message: "ID da unidade é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "NAME_REQUIRED", message: "Nome do dispositivo é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao provisionar dispositivo." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:115](<../../../src/modules/workspaces/application/gym-device-service.ts#L115>) (GymDeviceService.provisionDevice): consultas/escritas ` prisma.gymUnit.findFirst {where: { id: unitId, workspaceId }} `; ` prisma.gymAccessDevice.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/[id]/command

- **Arquivo:** [src/app/api/gym/devices/[id]/command/route.ts:8](<../../../src/app/api/gym/devices/[id]/command/route.ts#L8>); linhas 8–72.
- **Finalidade implementada:** Executar a operação de gymDeviceService.queueCommand; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.override", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, commandType, idempotencyKey, priority, expiresInSeconds, customPayload, studentMemberId, credentialCode, relayDurationMs, direction } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !commandType `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymDeviceService.queueCommand({ workspaceId: context.workspaceId, deviceId: id, commandType, idempotencyKey, priority, expiresInSeconds, customPayload, studentMemberId, credentialCode, relayDurationMs, direction }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "COMMAND_TYPE_REQUIRED", message: "Tipo de comando é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ command }, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao emitir comando para o dispositivo." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:249](<../../../src/modules/workspaces/application/gym-device-service.ts#L249>) (GymDeviceService.queueCommand): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: deviceId, workspaceId }} `; ` prisma.gymDeviceCommand.findFirst {where: { deviceId, idempotencyKey }} `; ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymDeviceCommand.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/[id]/contingency

- **Arquivo:** [src/app/api/gym/devices/[id]/contingency/route.ts:15](<../../../src/app/api/gym/devices/[id]/contingency/route.ts#L15>); linhas 15–77.
- **Finalidade implementada:** Executar a operação de recoveryService.enableDeviceContingency, recoveryService.disableDeviceContingency; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["devices.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: deviceId } = await params `; ` request.json() `; ` { workspaceId, action, reason, resolutionNotes, durationMinutes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !deviceId `; ` action === "ENABLE" `; ` action === "DISABLE" `; ` accessResponse `
- **Chamadas e efeitos delegados:** ` recoveryService.enableDeviceContingency({ workspaceId, deviceId, reason: reason || "Ativação de contingência operacional da recepção", durationMinutes: durationMinutes ? Number(durationMinutes) : 120, actorUserId: context.userId }) `; ` recoveryService.disableDeviceContingency({ workspaceId, deviceId, resolutionNotes: resolutionNotes || "Contingência finalizada com sucesso.", actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: "O campo workspaceId é obrigatório." }, { status: 400 } ) `; ` NextResponse.json( { error: "O identificador do dispositivo é obrigatório." }, { status: 400 } ) `; ` NextResponse.json({ success: true, device: result }) `; ` NextResponse.json({ success: true, device: result }) `; ` NextResponse.json( { error: "Ação inválida. Utilize 'ENABLE' ou 'DISABLE'." }, { status: 400 } ) `; ` NextResponse.json( { error: error?.message || "Erro ao alterar modo de contingência do dispositivo." }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-recovery-service.ts:110](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L110>) (GymRecoveryService.enableDeviceContingency): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: deviceId, workspaceId }} `; ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-recovery-service.ts:159](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L159>) (GymRecoveryService.disableDeviceContingency): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: deviceId, workspaceId }} `; ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/[id]/replace

- **Arquivo:** [src/app/api/gym/devices/[id]/replace/route.ts:15](<../../../src/app/api/gym/devices/[id]/replace/route.ts#L15>); linhas 15–68.
- **Finalidade implementada:** Executar a operação de recoveryService.replaceDevice; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["devices.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: oldDeviceId } = await params `; ` request.json() `; ` { workspaceId, newDeviceId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !oldDeviceId || !newDeviceId `; ` !reason || !reason.trim() `; ` accessResponse `
- **Chamadas e efeitos delegados:** ` recoveryService.replaceDevice({ workspaceId, oldDeviceId, newDeviceId, reason, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: "O campo workspaceId é obrigatório." }, { status: 400 } ) `; ` NextResponse.json( { error: "Os identificadores oldDeviceId e newDeviceId são obrigatórios." }, { status: 400 } ) `; ` NextResponse.json( { error: "O motivo da substituição do equipamento é obrigatório." }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: error?.message || "Erro ao substituir equipamento." }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-recovery-service.ts:211](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L211>) (GymRecoveryService.replaceDevice): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: oldDeviceId, workspaceId }} `; ` prisma.gymAccessDevice.findFirst {where: { id: newDeviceId, workspaceId }} `; ` tx.gymAccessDevice.update {where: { id: oldDeviceId }} `; ` tx.gymDeviceCommand.updateMany {where: { deviceId: oldDeviceId, status: GymDeviceCommandStatus.PENDING }} `; ` tx.gymDeviceCommand.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/devices/[id]/rotate-token

- **Arquivo:** [src/app/api/gym/devices/[id]/rotate-token/route.ts:8](<../../../src/app/api/gym/devices/[id]/rotate-token/route.ts#L8>); linhas 8–42.
- **Finalidade implementada:** Executar a operação de gymDeviceService.rotateDeviceToken; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymDeviceService.rotateDeviceToken(context.workspaceId, id) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao rotacionar token do dispositivo." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:177](<../../../src/modules/workspaces/application/gym-device-service.ts#L177>) (GymDeviceService.rotateDeviceToken): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: deviceId, workspaceId }} `; ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/devices/[id]

- **Arquivo:** [src/app/api/gym/devices/[id]/route.ts:8](<../../../src/app/api/gym/devices/[id]/route.ts#L8>); linhas 8–42.
- **Finalidade implementada:** Consultar/obter dados por gymDeviceService.getDeviceDetails; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "access.read", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymDeviceService.getDeviceDetails(context.workspaceId, id) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ device }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao obter detalhes do dispositivo." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:657](<../../../src/modules/workspaces/application/gym-device-service.ts#L657>) (GymDeviceService.getDeviceDetails): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: deviceId, workspaceId }} `; paginação/ordem ` take: 20 `; ` orderBy: { createdAt: "desc" } `; ` orderBy: { accessedAt: "desc" } `; efeitos delegados não identificados

### PATCH /api/gym/devices/[id]

- **Arquivo:** [src/app/api/gym/devices/[id]/route.ts:44](<../../../src/app/api/gym/devices/[id]/route.ts#L44>); linhas 44–89.
- **Finalidade implementada:** Executar a operação de gymDeviceService.updateDevice; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, name, deviceType, model, serialNumber, ipAddress, port, status, config } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymDeviceService.updateDevice({ workspaceId: context.workspaceId, deviceId: id, name, deviceType, model, serialNumber, ipAddress, port: port !== undefined ? Number(port) : undefined, status, config }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ device: updated }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao atualizar dispositivo." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:691](<../../../src/modules/workspaces/application/gym-device-service.ts#L691>) (GymDeviceService.updateDevice): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: deviceId, workspaceId }} `; ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### DELETE /api/gym/devices/[id]

- **Arquivo:** [src/app/api/gym/devices/[id]/route.ts:91](<../../../src/app/api/gym/devices/[id]/route.ts#L91>); linhas 91–125.
- **Finalidade implementada:** Executar a operação de gymDeviceService.deactivateDevice; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymDeviceService.deactivateDevice(context.workspaceId, id) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao desativar dispositivo." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-device-service.ts:722](<../../../src/modules/workspaces/application/gym-device-service.ts#L722>) (GymDeviceService.deactivateDevice): consultas/escritas ` prisma.gymAccessDevice.findFirst {where: { id: deviceId, workspaceId }} `; ` prisma.gymAccessDevice.update {where: { id: deviceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/enrollments/check-access

- **Arquivo:** [src/app/api/gym/enrollments/check-access/route.ts:9](<../../../src/app/api/gym/enrollments/check-access/route.ts#L9>); linhas 9–50.
- **Finalidade implementada:** Consultar/obter dados por gymEnrollmentService.checkStudentTurnstileAccess; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["access.read"], }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("studentMemberId") `; ` searchParams.get("unitId") `
- **Condições de validação/erros:** ` !workspaceId || !studentMemberId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.checkStudentTurnstileAccess({ workspaceId: context.workspaceId, studentMemberId, unitId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "workspaceId e studentMemberId são obrigatórios.", }, }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao verificar acesso da catraca." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:954](<../../../src/modules/workspaces/application/enrollment-service.ts#L954>) (GymEnrollmentService.checkStudentTurnstileAccess): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { workspaceId, studentMemberId, status: GymEnrollmentStatus.ACTIVE, }} `; ` prisma.gymEnrollment.findFirst {where: { workspaceId, studentMemberId }} `; paginação/ordem ` orderBy: { createdAt: "desc" } `; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/cron-expire

- **Arquivo:** [src/app/api/gym/enrollments/cron-expire/route.ts:9](<../../../src/app/api/gym/enrollments/cron-expire/route.ts#L9>); linhas 9–67.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.processExpiredEnrollments; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId: targetWorkspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `
- **Condições de validação/erros:** ` !isCronAuthorized `; ` !targetWorkspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.processExpiredEnrollments(workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "UNAUTHORIZED", message: "Acesso não autorizado. Chave de cron ou workspaceId obrigatório.", }, }, { status: 401 } ) `; ` NextResponse.json({ success: true, result, executedAt: new Date().toISOString(), }) `; ` NextResponse.json( { error: { code: "CRON_EXPIRE_FAILED", message: error.message || "Erro ao processar expiração de matrículas.", }, }, { status: 500 } ) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:1361](<../../../src/modules/workspaces/application/enrollment-service.ts#L1361>) (GymEnrollmentService.processExpiredEnrollments): consultas/escritas ` prisma.gymEnrollment.findMany {where: { ...(workspaceId ? { workspaceId } : {}), status: { not: GymEnrollmentStatus.CANCELLED }, cancellationEffectiveDate: { lte: now }, }} `; ` tx.gymEnrollment.update {where: { id: enrollment.id }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; ` prisma.gymEnrollment.findMany {where: { ...(workspaceId ? { workspaceId } : {}), status: GymEnrollmentStatus.ACTIVE, endDate: { lt: now }, autoRenew: false, }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/enrollments

- **Arquivo:** [src/app/api/gym/enrollments/route.ts:10](<../../../src/app/api/gym/enrollments/route.ts#L10>); linhas 10–56.
- **Finalidade implementada:** Consultar/obter dados por gymEnrollmentService.listEnrollments; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("status") `; ` searchParams.get("studentMemberId") `; ` searchParams.get("unitId") `; ` searchParams.get("planId") `; ` searchParams.get("search") `; ` searchParams.get("page") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.listEnrollments(context.workspaceId, { status, studentMemberId, unitId, planId, search, page, limit, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar matrículas." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:833](<../../../src/modules/workspaces/application/enrollment-service.ts#L833>) (GymEnrollmentService.listEnrollments): consultas/escritas ` prisma.gymEnrollment.count {where} `; ` prisma.gymEnrollment.findMany {where} `; paginação/ordem ` take: limit `; ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

### POST /api/gym/enrollments

- **Arquivo:** [src/app/api/gym/enrollments/route.ts:59](<../../../src/app/api/gym/enrollments/route.ts#L59>); linhas 59–136.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.createEnrollment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId } = body `; ` { studentMemberId, planVersionId, unitId, startDate, autoRenew, customPriceInCents, billingPayerUserId, billingPayerGuardianId, billingPayerName, billingPayerCpf, billingPayerEmail, billingPayerPhone, } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId || !planVersionId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.createEnrollment({ workspaceId: context.workspaceId, studentMemberId, planVersionId, unitId, startDate, autoRenew, customPriceInCents, billingPayerUserId, billingPayerGuardianId, billingPayerName, billingPayerCpf, billingPayerEmail, billingPayerPhone, actorUserId: context.userId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Aluno e versão do plano são obrigatórios para a matrícula.", }, }, { status: 400 } ) `; ` NextResponse.json(enrollment, { status: 201 }) `; ` NextResponse.json( { error: { code: "ENROLLMENT_CREATION_FAILED", message: error.message || "Erro ao criar matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 400, 201.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:154](<../../../src/modules/workspaces/application/enrollment-service.ts#L154>) (GymEnrollmentService.createEnrollment): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymPlanVersion.findFirst {where: { id: planVersionId }} `; ` tx.gymEnrollment.create `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/accept

- **Arquivo:** [src/app/api/gym/enrollments/[id]/accept/route.ts:10](<../../../src/app/api/gym/enrollments/[id]/accept/route.ts#L10>); linhas 10–59.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.acceptContract; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId } = body `; ` req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() `; ` req.headers.get("x-forwarded-for")?.split(",") `
- **Condições de validação/erros:** ` !session?.user?.id `; ` !workspaceId `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.acceptContract({ enrollmentId, workspaceId, signerUserId: session.user.id, ipAddress, userAgent, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "UNAUTHORIZED", message: "Autenticação obrigatória." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: "ACCEPT_CONTRACT_FAILED", message: error.message || "Erro ao assinar contrato da matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 401, 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:313](<../../../src/modules/workspaces/application/enrollment-service.ts#L313>) (GymEnrollmentService.acceptContract): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` tx.gymContractAcceptance.create `; ` tx.gymEnrollment.update {where: { id: enrollmentId }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/activate

- **Arquivo:** [src/app/api/gym/enrollments/[id]/activate/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/activate/route.ts#L13>); linhas 13–55.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.activateEnrollment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, paymentVerified, overrideReason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.activateEnrollment({ enrollmentId, workspaceId: context.workspaceId, actorUserId: context.userId, paymentVerified: Boolean(paymentVerified), overrideReason, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(activated) `; ` NextResponse.json( { error: { code: "ACTIVATION_FAILED", message: error.message || "Erro ao ativar matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:452](<../../../src/modules/workspaces/application/enrollment-service.ts#L452>) (GymEnrollmentService.activateEnrollment): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` tx.gymEnrollment.update {where: { id: enrollmentId }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/cancel

- **Arquivo:** [src/app/api/gym/enrollments/[id]/cancel/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/cancel/route.ts#L13>); linhas 13–60.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.cancelEnrollment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, reason, immediate } = body `
- **Condições de validação/erros:** ` !workspaceId || !reason `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.cancelEnrollment({ enrollmentId, workspaceId: context.workspaceId, reason, actorUserId: context.userId, immediate: immediate !== undefined ? Boolean(immediate) : true, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "ID do workspace e motivo do cancelamento são obrigatórios.", }, }, { status: 400 } ) `; ` NextResponse.json(cancelled) `; ` NextResponse.json( { error: { code: "CANCEL_FAILED", message: error.message || "Erro ao cancelar matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:719](<../../../src/modules/workspaces/application/enrollment-service.ts#L719>) (GymEnrollmentService.cancelEnrollment): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` tx.gymEnrollment.update {where: { id: enrollmentId }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/change-plan

- **Arquivo:** [src/app/api/gym/enrollments/[id]/change-plan/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/change-plan/route.ts#L13>); linhas 13–73.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.changePlan; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, newPlanVersionId, mode, reason } = body `
- **Condições de validação/erros:** ` !workspaceId || !newPlanVersionId || !mode `; ` mode !== "IMMEDIATE" && mode !== "NEXT_CYCLE" `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.changePlan({ enrollmentId, workspaceId: context.workspaceId, newPlanVersionId, mode, actorUserId: context.userId, reason, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Workspace, novo plano e modalidade de troca são obrigatórios.", }, }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Modalidade de troca deve ser IMMEDIATE ou NEXT_CYCLE.", }, }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: "CHANGE_PLAN_FAILED", message: error.message || "Erro ao alterar plano da matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:1119](<../../../src/modules/workspaces/application/enrollment-service.ts#L1119>) (GymEnrollmentService.changePlan): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` prisma.gymPlanVersion.findFirst {where: { id: newPlanVersionId }} `; ` tx.gymEnrollment.update {where: { id: enrollmentId }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/pause

- **Arquivo:** [src/app/api/gym/enrollments/[id]/pause/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/pause/route.ts#L13>); linhas 13–62.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.pauseEnrollment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, startDate, endDate, reason, extendEndDate } = body `
- **Condições de validação/erros:** ` !workspaceId || !startDate || !endDate || !reason `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.pauseEnrollment({ enrollmentId, workspaceId: context.workspaceId, startDate, endDate, reason, actorUserId: context.userId, extendEndDate: extendEndDate !== undefined ? Boolean(extendEndDate) : true, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Workspace, data inicial, data final e motivo são obrigatórios.", }, }, { status: 400 } ) `; ` NextResponse.json(paused) `; ` NextResponse.json( { error: { code: "PAUSE_FAILED", message: error.message || "Erro ao pausar matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:548](<../../../src/modules/workspaces/application/enrollment-service.ts#L548>) (GymEnrollmentService.pauseEnrollment): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` tx.gymEnrollmentPause.create `; ` tx.gymEnrollment.update {where: { id: enrollmentId }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/renew

- **Arquivo:** [src/app/api/gym/enrollments/[id]/renew/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/renew/route.ts#L13>); linhas 13–60.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.renewEnrollment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, durationDays, useScheduledPlanVersion } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.renewEnrollment({ enrollmentId, workspaceId: context.workspaceId, actorUserId: context.userId, durationDays: durationDays ? Number(durationDays) : undefined, useScheduledPlanVersion: useScheduledPlanVersion !== undefined ? Boolean(useScheduledPlanVersion) : true, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "ID do workspace é obrigatório.", }, }, { status: 400 } ) `; ` NextResponse.json(renewed) `; ` NextResponse.json( { error: { code: "RENEW_FAILED", message: error.message || "Erro ao renovar matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:1268](<../../../src/modules/workspaces/application/enrollment-service.ts#L1268>) (GymEnrollmentService.renewEnrollment): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` tx.gymEnrollment.update {where: { id: enrollmentId }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/resume

- **Arquivo:** [src/app/api/gym/enrollments/[id]/resume/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/resume/route.ts#L13>); linhas 13–53.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.resumeEnrollment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.resumeEnrollment({ enrollmentId, workspaceId: context.workspaceId, actorUserId: context.userId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(resumed) `; ` NextResponse.json( { error: { code: "RESUME_FAILED", message: error.message || "Erro ao retomar matrícula.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:625](<../../../src/modules/workspaces/application/enrollment-service.ts#L625>) (GymEnrollmentService.resumeEnrollment): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` tx.gymEnrollmentPause.update {where: { id: openPause.id }} `; ` tx.gymEnrollment.update {where: { id: enrollmentId }} `; ` tx.gymEnrollmentEvent.create `; ` tx.auditLog.create `; paginação/ordem ` orderBy: { createdAt: "desc" } `; ` take: 1 `; efeitos delegados GymEnrollmentService.serializeEnrollment

### GET /api/gym/enrollments/[id]

- **Arquivo:** [src/app/api/gym/enrollments/[id]/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/route.ts#L13>); linhas 13–51.
- **Finalidade implementada:** Consultar/obter dados por gymEnrollmentService.getEnrollmentById; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.getEnrollmentById( enrollmentId, context.workspaceId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(enrollment) `; ` NextResponse.json( { error: { code: "ENROLLMENT_NOT_FOUND", message: error.message || "Matrícula não encontrada.", }, }, { status: 404 } ) ` Códigos/expressões status: 400, 404.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:903](<../../../src/modules/workspaces/application/enrollment-service.ts#L903>) (GymEnrollmentService.getEnrollmentById): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; paginação/ordem ` orderBy: { createdAt: "desc" } `; efeitos delegados GymEnrollmentService.serializeEnrollment

### POST /api/gym/enrollments/[id]/simulate-change-plan

- **Arquivo:** [src/app/api/gym/enrollments/[id]/simulate-change-plan/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/simulate-change-plan/route.ts#L13>); linhas 13–72.
- **Finalidade implementada:** Executar a operação de gymEnrollmentService.simulatePlanChange; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, newPlanVersionId, mode, changeDate } = body `
- **Condições de validação/erros:** ` !workspaceId || !newPlanVersionId || !mode `; ` mode !== "IMMEDIATE" && mode !== "NEXT_CYCLE" `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymEnrollmentService.simulatePlanChange({ enrollmentId, workspaceId: context.workspaceId, newPlanVersionId, mode, changeDate: changeDate ? new Date(changeDate) : undefined, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Workspace, novo plano e modalidade (IMMEDIATE ou NEXT_CYCLE) são obrigatórios.", }, }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Modalidade de troca deve ser IMMEDIATE ou NEXT_CYCLE.", }, }, { status: 400 } ) `; ` NextResponse.json(simulation) `; ` NextResponse.json( { error: { code: "SIMULATION_FAILED", message: error.message || "Erro ao simular alteração de plano.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/enrollment-service.ts:1058](<../../../src/modules/workspaces/application/enrollment-service.ts#L1058>) (GymEnrollmentService.simulatePlanChange): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` prisma.gymPlanVersion.findFirst {where: { id: newPlanVersionId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/enrollments/[id]/subscription/cycle

- **Arquivo:** [src/app/api/gym/enrollments/[id]/subscription/cycle/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/subscription/cycle/route.ts#L13>); linhas 13–55.
- **Finalidade implementada:** Executar a operação de gymSubscriptionService.generateCycleInvoice; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, competenceMonth, dueDate } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymSubscriptionService.generateCycleInvoice({ workspaceId: context.workspaceId, enrollmentId, actorUserId: context.userId, competenceMonth, dueDate: dueDate ? new Date(dueDate) : undefined }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: error.code || "CYCLE_GENERATION_FAILED", message: error.message || "Erro ao gerar fatura do ciclo." } }, { status: error.statusCode || 400 } ) ` Códigos/expressões status: 400, error.statusCode || 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/subscription-service.ts:369](<../../../src/modules/workspaces/application/subscription-service.ts#L369>) (GymSubscriptionService.generateCycleInvoice): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` prisma.gymInvoice.findFirst {where: { enrollmentId, competenceMonth, status: { notIn: [GymInvoiceStatus.CANCELLED] } }} `; ` tx.gymInvoice.create `; ` tx.gymEnrollment.update {where: { id: enrollment.id }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados gymFinancialService.resolveEffectivePayer

### POST /api/gym/enrollments/[id]/subscription/reconcile

- **Arquivo:** [src/app/api/gym/enrollments/[id]/subscription/reconcile/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/subscription/reconcile/route.ts#L13>); linhas 13–53.
- **Finalidade implementada:** Executar a operação de gymSubscriptionService.reconcileSubscription; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymSubscriptionService.reconcileSubscription({ workspaceId: context.workspaceId, enrollmentId, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: error.code || "RECONCILIATION_FAILED", message: error.message || "Erro ao reconciliar assinatura com o gateway." } }, { status: error.statusCode || 400 } ) ` Códigos/expressões status: 400, error.statusCode || 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/subscription-service.ts:601](<../../../src/modules/workspaces/application/subscription-service.ts#L601>) (GymSubscriptionService.reconcileSubscription): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` prisma.paymentProviderAccount.findFirst {where: { workspaceId, profileType: "WORKSPACE" }} `; ` prisma.gymInvoice.findFirst {where: { OR: [ { billing: { providerBillingId: chargeId } }, { providerSubscriptionId: enrollment.providerSubscriptionId, dueDate: new Date(charge.dueDate) } ] }} `; ` tx.gymInvoice.update {where: { id: invoice!.id }} `; ` tx.gymPayment.create `; ` tx.gymPaymentAllocation.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados gymEnrollmentService.activateEnrollment

### POST /api/gym/enrollments/[id]/subscription

- **Arquivo:** [src/app/api/gym/enrollments/[id]/subscription/route.ts:13](<../../../src/app/api/gym/enrollments/[id]/subscription/route.ts#L13>); linhas 13–72.
- **Finalidade implementada:** Executar a operação de gymSubscriptionService.setupEnrollmentSubscription; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, recurrenceMode, billingType, customFirstDueDate, creditCardToken, creditCardData } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !recurrenceMode || !billingType `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymSubscriptionService.setupEnrollmentSubscription({ workspaceId: context.workspaceId, enrollmentId, actorUserId: context.userId, recurrenceMode, billingType, customFirstDueDate: customFirstDueDate ? new Date(customFirstDueDate) : undefined, creditCardToken, creditCardData }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Modo de recorrência e tipo de cobrança são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: error.code || "SUBSCRIPTION_SETUP_FAILED", message: error.message || "Erro ao configurar recorrência da matrícula." } }, { status: error.statusCode || 400 } ) ` Códigos/expressões status: 400, error.statusCode || 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/subscription-service.ts:113](<../../../src/modules/workspaces/application/subscription-service.ts#L113>) (GymSubscriptionService.setupEnrollmentSubscription): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` prisma.paymentProviderAccount.findFirst {where: { workspaceId, profileType: "WORKSPACE" }} `; ` tx.gymEnrollment.update {where: { id: enrollment.id }} `; ` tx.gymInvoice.findFirst {where: { enrollmentId: enrollment.id, competenceMonth }} `; ` tx.gymInvoice.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados gymFinancialService.resolveEffectivePayer, gymFinancialService.getOrCreatePayerGatewayCustomer

### DELETE /api/gym/enrollments/[id]/subscription

- **Arquivo:** [src/app/api/gym/enrollments/[id]/subscription/route.ts:75](<../../../src/app/api/gym/enrollments/[id]/subscription/route.ts#L75>); linhas 75–124.
- **Finalidade implementada:** Executar a operação de gymSubscriptionService.cancelSubscription; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/enrollments/enrollments-client.tsx](<../../../src/app/(gym)/gym/enrollments/enrollments-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: enrollmentId } = await params `; ` req.json() `; ` { workspaceId, cancellationReason, immediate } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !cancellationReason || !cancellationReason.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymSubscriptionService.cancelSubscription({ workspaceId: context.workspaceId, enrollmentId, actorUserId: context.userId, cancellationReason, immediate: Boolean(immediate) }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "REASON_REQUIRED", message: "Motivo do cancelamento da assinatura é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: error.code || "SUBSCRIPTION_CANCEL_FAILED", message: error.message || "Erro ao cancelar assinatura." } }, { status: error.statusCode || 400 } ) ` Códigos/expressões status: 400, error.statusCode || 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/subscription-service.ts:512](<../../../src/modules/workspaces/application/subscription-service.ts#L512>) (GymSubscriptionService.cancelSubscription): consultas/escritas ` prisma.gymEnrollment.findFirst {where: { id: enrollmentId, workspaceId }} `; ` prisma.paymentProviderAccount.findFirst {where: { workspaceId, profileType: "WORKSPACE" }} `; ` tx.gymEnrollment.update {where: { id: enrollment.id }} `; ` tx.gymInvoice.updateMany {where: { enrollmentId: enrollment.id, status: GymInvoiceStatus.OPEN, dueDate: { gt: new Date() } }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/accounts

- **Arquivo:** [src/app/api/gym/finance/accounts/route.ts:9](<../../../src/app/api/gym/finance/accounts/route.ts#L9>); linhas 9–38.
- **Finalidade implementada:** Consultar/obter dados por gymCashExpenseService.listFinancialAccounts; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/accounts-tab.tsx](<../../../src/app/(gym)/gym/finance/components/accounts-tab.tsx>); [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.listFinancialAccounts(context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ accounts }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar contas financeiras." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:176](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L176>) (GymCashExpenseService.listFinancialAccounts): consultas/escritas ` prisma.gymFinancialAccount.findMany {where: { workspaceId, isActive: true }} `; paginação/ordem ` orderBy: [{ isDefault: "desc" }, { name: "asc" }] `; efeitos delegados não identificados

### POST /api/gym/finance/accounts

- **Arquivo:** [src/app/api/gym/finance/accounts/route.ts:40](<../../../src/app/api/gym/finance/accounts/route.ts#L40>); linhas 40–98.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.createFinancialAccount; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/accounts-tab.tsx](<../../../src/app/(gym)/gym/finance/components/accounts-tab.tsx>); [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, unitId, name, accountType = GymFinancialAccountType.CASH, initialBalanceInCents = 0, bankName, agencyNumber, accountNumber, isDefault = false } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !name || !name.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.createFinancialAccount({ workspaceId: context.workspaceId, unitId, name, accountType, initialBalanceInCents, bankName, agencyNumber, accountNumber, isDefault, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "O nome da conta é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(account, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao criar conta financeira." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:209](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L209>) (GymCashExpenseService.createFinancialAccount): consultas/escritas ` tx.gymFinancialAccount.updateMany {where: { workspaceId, isDefault: true }} `; ` tx.gymFinancialAccount.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/billings

- **Arquivo:** [src/app/api/gym/finance/billings/route.ts:9](<../../../src/app/api/gym/finance/billings/route.ts#L9>); linhas 9–53.
- **Finalidade implementada:** Consultar/obter dados por gymFinancialService.listGymBillings; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("status") `; ` searchParams.get("enrollmentId") `; ` searchParams.get("studentUserId") `; ` searchParams.get("payerCpfCnpj") `; ` searchParams.get("page") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymFinancialService.listGymBillings(context.workspaceId, { status, enrollmentId, studentUserId, payerCpfCnpj, page, limit }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar cobranças da academia." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-financial-service.ts:692](<../../../src/modules/workspaces/application/gym-financial-service.ts#L692>) (GymFinancialService.listGymBillings): consultas/escritas ` prisma.studentBilling.count {where} `; ` prisma.studentBilling.findMany {where} `; ` prisma.user.findMany {where: { id: { in: studentUserIds } }} `; paginação/ordem ` orderBy: { createdAt: "desc" } `; ` take: limit `; efeitos delegados não identificados

### POST /api/gym/finance/billings

- **Arquivo:** [src/app/api/gym/finance/billings/route.ts:55](<../../../src/app/api/gym/finance/billings/route.ts#L55>); linhas 55–121.
- **Finalidade implementada:** Executar a operação de gymFinancialService.createGymBilling; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentUserId, studentMemberId, enrollmentId, title, description, amountInCents, paymentMethod, dueDate, guardianId, customPayer, preferredPayerType, idempotencyKey } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentUserId || !title || !amountInCents || !paymentMethod || !dueDate `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymFinancialService.createGymBilling({ workspaceId: context.workspaceId, actorUserId: context.userId, studentUserId, studentMemberId, enrollmentId, title, description, amountInCents: BigInt(amountInCents), paymentMethod: paymentMethod as WalletPaymentMethod, dueDate: new Date(dueDate), idempotencyKey, guardianId, customPayer, preferredPayerType }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_FAILED", message: "Aluno, título, valor, forma de pagamento e vencimento são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(billing, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: error.message || "Erro ao emitir cobrança da academia." } }, { status: error.status || 500 } ) ` Códigos/expressões status: 400, 201, error.status || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-financial-service.ts:517](<../../../src/modules/workspaces/application/gym-financial-service.ts#L517>) (GymFinancialService.createGymBilling): consultas/escritas ` prisma.paymentProviderAccount.findUnique {where: { workspaceId }} `; ` prisma.studentBilling.create `; ` prisma.paymentSplit.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/billings/[id]/refund

- **Arquivo:** [src/app/api/gym/finance/billings/[id]/refund/route.ts:8](<../../../src/app/api/gym/finance/billings/[id]/refund/route.ts#L8>); linhas 8–69.
- **Finalidade implementada:** Executar a operação de gymWalletReconciliationService.refundOnlineBilling; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["refunds.approve", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id: billingId } = await params `; ` req.json() `; ` { workspaceId, refundAmountInCents, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !reason || !reason.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWalletReconciliationService.refundOnlineBilling({ billingId, workspaceId: context.workspaceId, actorUserId: context.userId, refundAmountInCents: refundAmountInCents ? BigInt(refundAmountInCents) : undefined, reason: reason.trim(), userCapabilities: Array.from(context.capabilities) }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "REFUND_REASON_REQUIRED", message: "A justificativa do estorno é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, billing: { id: refund.id, status: refund.status, refundedAt: refund.refundedAt, refundReason: refund.refundReason } }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao estornar cobrança online." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, refund.status, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:739](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L739>) (GymWalletReconciliationService.refundOnlineBilling): consultas/escritas ` prisma.studentBilling.findFirst {where: { id: input.billingId, workspaceId: input.workspaceId }} `; ` tx.studentBilling.update {where: { id: billing.id }} `; ` tx.walletLedgerEntry.create `; ` tx.gymInvoice.update {where: { id: inv.id }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/cash-drawer/close

- **Arquivo:** [src/app/api/gym/finance/cash-drawer/close/route.ts:8](<../../../src/app/api/gym/finance/cash-drawer/close/route.ts#L8>); linhas 8–58.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.closeCashDrawer; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx](<../../../src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, sessionId, actualCashInCents, differenceReason, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !sessionId || actualCashInCents === undefined || actualCashInCents === null `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.closeCashDrawer({ workspaceId: context.workspaceId, sessionId, actualCashInCents, differenceReason, notes, closedByUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID da sessão e valor em dinheiro contado são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao fechar sessão de caixa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:1206](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L1206>) (GymCashExpenseService.closeCashDrawer): consultas/escritas ` prisma.gymCashDrawerSession.findFirst {where: { id: sessionId, workspaceId }} `; ` tx.gymCashDrawerMovement.create `; ` tx.gymCashDrawerSession.update {where: { id: sessionId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/cash-drawer/movements

- **Arquivo:** [src/app/api/gym/finance/cash-drawer/movements/route.ts:8](<../../../src/app/api/gym/finance/cash-drawer/movements/route.ts#L8>); linhas 8–67.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.recordCashMovement; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx](<../../../src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, sessionId, movementType, amountInCents, description, destinationAccountId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !sessionId || !movementType || !amountInCents `; ` !["SUPPLY", "BLEED"].includes(movementType) `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.recordCashMovement({ workspaceId: context.workspaceId, sessionId, movementType, amountInCents, description, destinationAccountId, performedByUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID da sessão, tipo e valor são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Tipo de movimentação deve ser SUPPLY (Suprimento) ou BLEED (Sangria)." } }, { status: 400 } ) `; ` NextResponse.json(movement, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao registrar movimentação de caixa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:1102](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L1102>) (GymCashExpenseService.recordCashMovement): consultas/escritas ` prisma.gymCashDrawerSession.findFirst {where: { id: sessionId, workspaceId }} `; ` tx.gymCashDrawerMovement.create `; ` tx.gymFinancialAccount.update {where: { id: session.financialAccountId }} `; ` tx.gymFinancialAccount.update {where: { id: destinationAccountId }} `; ` tx.gymAccountTransfer.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/cash-drawer/reconcile

- **Arquivo:** [src/app/api/gym/finance/cash-drawer/reconcile/route.ts:8](<../../../src/app/api/gym/finance/cash-drawer/reconcile/route.ts#L8>); linhas 8–54.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.reconcileCashDrawer; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx](<../../../src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, sessionId, reconciliationNotes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !sessionId || !reconciliationNotes || !reconciliationNotes.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.reconcileCashDrawer({ workspaceId: context.workspaceId, sessionId, reconciliationNotes, reconciledByUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID da sessão e notas de reconciliação são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao reconciliar sessão de caixa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:1324](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L1324>) (GymCashExpenseService.reconcileCashDrawer): consultas/escritas ` prisma.gymCashDrawerSession.findFirst {where: { id: sessionId, workspaceId }} `; ` prisma.gymCashDrawerSession.update {where: { id: sessionId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/cash-drawer

- **Arquivo:** [src/app/api/gym/finance/cash-drawer/route.ts:9](<../../../src/app/api/gym/finance/cash-drawer/route.ts#L9>); linhas 9–52.
- **Finalidade implementada:** Consultar/obter dados por gymCashExpenseService.getCurrentSession, gymCashExpenseService.listCashDrawerSessions; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx](<../../../src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("status") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.getCurrentSession( context.workspaceId, context.userId ) `; ` gymCashExpenseService.listCashDrawerSessions({ workspaceId: context.workspaceId, status: statusParam, limit: 20 }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ currentSession, history }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao consultar informações do caixa." } }, { status: 500 } ) ` Códigos/expressões status: 400, statusParam, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:940](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L940>) (GymCashExpenseService.getCurrentSession): consultas/escritas ` prisma.gymCashDrawerSession.findFirst {where: { workspaceId, openedByUserId: userId, status: GymCashDrawerStatus.OPEN }} `; paginação/ordem ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

[src/modules/workspaces/application/cash-drawer-expense-service.ts:1374](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L1374>) (GymCashExpenseService.listCashDrawerSessions): consultas/escritas ` prisma.gymCashDrawerSession.findMany {where} `; ` prisma.gymCashDrawerSession.count {where} `; paginação/ordem ` orderBy: { openedAt: "desc" } `; ` take: limit `; ` skip: offset `; efeitos delegados não identificados

### POST /api/gym/finance/cash-drawer

- **Arquivo:** [src/app/api/gym/finance/cash-drawer/route.ts:54](<../../../src/app/api/gym/finance/cash-drawer/route.ts#L54>); linhas 54–97.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.openCashDrawer; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx](<../../../src/app/(gym)/gym/finance/components/cash-drawer-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, unitId, financialAccountId, openingAmountInCents = 0, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.openCashDrawer({ workspaceId: context.workspaceId, unitId, financialAccountId, openingAmountInCents, notes, openedByUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(session, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao abrir sessão de caixa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:1002](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L1002>) (GymCashExpenseService.openCashDrawer): consultas/escritas ` prisma.gymCashDrawerSession.findFirst {where: { workspaceId, openedByUserId, status: GymCashDrawerStatus.OPEN }} `; ` tx.gymCashDrawerSession.create `; ` tx.gymCashDrawerMovement.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/expenses/categories

- **Arquivo:** [src/app/api/gym/finance/expenses/categories/route.ts:8](<../../../src/app/api/gym/finance/expenses/categories/route.ts#L8>); linhas 8–37.
- **Finalidade implementada:** Consultar/obter dados por gymCashExpenseService.listExpenseCategories; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.listExpenseCategories(context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ categories }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar categorias de despesa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:423](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L423>) (GymCashExpenseService.listExpenseCategories): consultas/escritas ` prisma.gymExpenseCategory.findMany {where: { workspaceId, isActive: true }} `; paginação/ordem ` orderBy: { name: "asc" } `; efeitos delegados não identificados

### POST /api/gym/finance/expenses/categories

- **Arquivo:** [src/app/api/gym/finance/expenses/categories/route.ts:39](<../../../src/app/api/gym/finance/expenses/categories/route.ts#L39>); linhas 39–74.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.createExpenseCategory; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, name, code, color } = body `
- **Condições de validação/erros:** ` !workspaceId || !name `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.createExpenseCategory({ workspaceId: context.workspaceId, name, code, color }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID do workspace e nome são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(category, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao criar categoria de despesa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:439](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L439>) (GymCashExpenseService.createExpenseCategory): consultas/escritas ` prisma.gymExpenseCategory.findFirst {where: { workspaceId, name }} `; ` prisma.gymExpenseCategory.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/expenses

- **Arquivo:** [src/app/api/gym/finance/expenses/route.ts:9](<../../../src/app/api/gym/finance/expenses/route.ts#L9>); linhas 9–57.
- **Finalidade implementada:** Consultar/obter dados por gymCashExpenseService.listExpenses; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("status") `; ` searchParams.get("competenceMonth") `; ` searchParams.get("categoryId") `; ` searchParams.get("supplierId") `; ` searchParams.get("search") `; ` searchParams.get("page") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.listExpenses({ workspaceId: context.workspaceId, status, competenceMonth, categoryId, supplierId, search, limit, offset }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar despesas." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:501](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L501>) (GymCashExpenseService.listExpenses): consultas/escritas ` prisma.gymExpense.findMany {where} `; ` prisma.gymExpense.count {where} `; ` prisma.gymExpense.groupBy {where: { workspaceId }} `; paginação/ordem ` orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }] `; ` take: limit `; ` skip: offset `; efeitos delegados não identificados

### POST /api/gym/finance/expenses

- **Arquivo:** [src/app/api/gym/finance/expenses/route.ts:59](<../../../src/app/api/gym/finance/expenses/route.ts#L59>); linhas 59–133.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.createExpense; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, unitId, supplierId, supplierName, categoryId, title, description, documentNumber, amountInCents, penaltyInCents = 0, discountInCents = 0, dueDate, competenceMonth, paidImmediately = false, financialAccountId, paymentMethod, paymentProofUrl } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !title || !categoryId || !amountInCents || !dueDate `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.createExpense({ workspaceId: context.workspaceId, unitId, supplierId, supplierName, categoryId, title, description, documentNumber, amountInCents, penaltyInCents, discountInCents, dueDate: new Date(dueDate), competenceMonth, paidImmediately, financialAccountId, paymentMethod, paymentProofUrl, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Título, categoria, valor e data de vencimento são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(expense, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao registrar despesa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:616](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L616>) (GymCashExpenseService.createExpense): consultas/escritas ` prisma.gymExpenseCategory.findFirst {where: { id: categoryId, workspaceId }} `; ` prisma.gymSupplier.findFirst {where: { id: supplierId, workspaceId }} `; ` tx.gymFinancialAccount.findFirst {where: { id: financialAccountId, workspaceId, isActive: true }} `; ` tx.gymFinancialAccount.update {where: { id: financialAccountId }} `; ` tx.gymExpense.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/expenses/[id]/cancel

- **Arquivo:** [src/app/api/gym/finance/expenses/[id]/cancel/route.ts:8](<../../../src/app/api/gym/finance/expenses/[id]/cancel/route.ts#L8>); linhas 8–54.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.cancelExpense; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, cancellationReason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !cancellationReason || cancellationReason.trim().length < 5 `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.cancelExpense({ workspaceId: context.workspaceId, expenseId: id, cancellationReason, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "A justificativa para cancelamento é obrigatória (mínimo 5 caracteres)." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao cancelar despesa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:879](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L879>) (GymCashExpenseService.cancelExpense): consultas/escritas ` prisma.gymExpense.findFirst {where: { id: expenseId, workspaceId }} `; ` prisma.gymExpense.update {where: { id: expenseId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/expenses/[id]/pay

- **Arquivo:** [src/app/api/gym/finance/expenses/[id]/pay/route.ts:8](<../../../src/app/api/gym/finance/expenses/[id]/pay/route.ts#L8>); linhas 8–65.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.payExpense; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, financialAccountId, paidAmountInCents, paidAt, paymentMethod, paymentProofUrl } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !financialAccountId || !paidAmountInCents `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.payExpense({ workspaceId: context.workspaceId, expenseId: id, financialAccountId, paidAmountInCents, paidAt: paidAt ? new Date(paidAt) : new Date(), paymentMethod, paymentProofUrl, actorUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Conta financeira e valor pago são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao baixar despesa." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:758](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L758>) (GymCashExpenseService.payExpense): consultas/escritas ` prisma.gymExpense.findFirst {where: { id: expenseId, workspaceId }} `; ` prisma.gymFinancialAccount.findFirst {where: { id: financialAccountId, workspaceId, isActive: true }} `; ` tx.gymFinancialAccount.update {where: { id: financialAccountId }} `; ` tx.gymExpense.update {where: { id: expenseId }} `; ` tx.gymCashDrawerSession.findFirst {where: { workspaceId, openedByUserId: actorUserId, status: GymCashDrawerStatus.OPEN }} `; ` tx.gymCashDrawerMovement.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/invoices

- **Arquivo:** [src/app/api/gym/finance/invoices/route.ts:9](<../../../src/app/api/gym/finance/invoices/route.ts#L9>); linhas 9–53.
- **Finalidade implementada:** Consultar/obter dados por gymInvoiceService.listInvoices; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("status") `; ` searchParams.get("studentMemberId") `; ` searchParams.get("enrollmentId") `; ` searchParams.get("search") `; ` searchParams.get("page") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymInvoiceService.listInvoices(context.workspaceId, { status, studentMemberId, enrollmentId, search, page, limit }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar faturas da academia." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/invoice-service.ts:742](<../../../src/modules/workspaces/application/invoice-service.ts#L742>) (GymInvoiceService.listInvoices): consultas/escritas ` prisma.gymInvoice.count {where} `; ` prisma.gymInvoice.findMany {where} `; paginação/ordem ` orderBy: { createdAt: "desc" } `; ` take: limit `; efeitos delegados não identificados

### POST /api/gym/finance/invoices

- **Arquivo:** [src/app/api/gym/finance/invoices/route.ts:55](<../../../src/app/api/gym/finance/invoices/route.ts#L55>); linhas 55–127.
- **Finalidade implementada:** Executar a operação de gymInvoiceService.createInvoice; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentMemberId, studentUserId, enrollmentId, title, description, dueDate, competenceMonth, items, discountInCents, discountPercentage, discountReason, discountAuthorizedByUserId, customPayer, preferredPayerType, guardianId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId || !title || !dueDate || !items || items.length === 0 `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymInvoiceService.createInvoice({ workspaceId: context.workspaceId, actorUserId: context.userId, studentMemberId, studentUserId, enrollmentId, title, description, dueDate: new Date(dueDate), competenceMonth, items, discountInCents: discountInCents ? BigInt(discountInCents) : undefined, discountPercentage: discountPercentage ? Number(discountPercentage) : undefined, discountReason, discountAuthorizedByUserId, customPayer, preferredPayerType, guardianId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_FAILED", message: "Aluno, título, data de vencimento e itens da fatura são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(invoice, { status: 201 }) `; ` NextResponse.json( { error: { code: error.code || "INTERNAL_ERROR", message: error.message || "Erro ao emitir fatura da academia." } }, { status: error.status || 500 } ) ` Códigos/expressões status: 400, 201, error.status || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/invoice-service.ts:137](<../../../src/modules/workspaces/application/invoice-service.ts#L137>) (GymInvoiceService.createInvoice): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymSettings.findUnique {where: { workspaceId }} `; ` prisma.workspaceMember.findFirst {where: { userId: actorUserId, workspaceId }} `; ` tx.gymInvoice.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados gymFinancialService.resolveEffectivePayer

### GET /api/gym/finance/payments

- **Arquivo:** [src/app/api/gym/finance/payments/route.ts:9](<../../../src/app/api/gym/finance/payments/route.ts#L9>); linhas 9–51.
- **Finalidade implementada:** Consultar/obter dados por gymInvoiceService.listPayments; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("status") `; ` searchParams.get("paymentMethod") `; ` searchParams.get("receivedByUserId") `; ` searchParams.get("page") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymInvoiceService.listPayments(context.workspaceId, { status, paymentMethod, receivedByUserId, page, limit }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar pagamentos presenciais." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/invoice-service.ts:811](<../../../src/modules/workspaces/application/invoice-service.ts#L811>) (GymInvoiceService.listPayments): consultas/escritas ` prisma.gymPayment.count {where} `; ` prisma.gymPayment.findMany {where} `; paginação/ordem ` orderBy: { paidAt: "desc" } `; ` take: limit `; efeitos delegados não identificados

### POST /api/gym/finance/payments

- **Arquivo:** [src/app/api/gym/finance/payments/route.ts:53](<../../../src/app/api/gym/finance/payments/route.ts#L53>); linhas 53–121.
- **Finalidade implementada:** Executar a operação de gymInvoiceService.recordInPersonPayment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.record"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, paymentMethod, amountInCents, allocations, idempotencyKey, payerName, payerCpfCnpj, posCardBrand, posAuthorizationCode, posNsu, posTerminalId, bankTransferProofUrl, bankTransferTransactionId, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !paymentMethod || !amountInCents || !allocations || allocations.length === 0 `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymInvoiceService.recordInPersonPayment({ workspaceId: context.workspaceId, actorUserId: context.userId, paymentMethod: paymentMethod as GymInPersonPaymentMethod, amountInCents: BigInt(amountInCents), allocations, idempotencyKey, payerName, payerCpfCnpj, posCardBrand, posAuthorizationCode, posNsu, posTerminalId, bankTransferProofUrl, bankTransferTransactionId, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_FAILED", message: "Forma de pagamento, valor total e pelo menos uma fatura alocada são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(payment, { status: 201 }) `; ` NextResponse.json( { error: { code: error.code || "INTERNAL_ERROR", message: error.message || "Erro ao registrar pagamento presencial." } }, { status: error.status || 500 } ) ` Códigos/expressões status: 400, 201, error.status || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/invoice-service.ts:322](<../../../src/modules/workspaces/application/invoice-service.ts#L322>) (GymInvoiceService.recordInPersonPayment): consultas/escritas ` prisma.gymPayment.findUnique {where: { idempotencyKey }} `; ` tx.gymInvoice.findFirst {where: { id: alloc.invoiceId, workspaceId }} `; ` tx.gymCashDrawerSession.findFirst {where: { workspaceId, openedByUserId: actorUserId, status: GymCashDrawerStatus.OPEN }} `; ` tx.gymPayment.create `; ` tx.gymCashDrawerMovement.create `; ` tx.gymFinancialAccount.update {where: { id: openCashSession.financialAccountId }} `; ` tx.gymPaymentAllocation.create `; ` tx.gymInvoice.update {where: { id: update.invoice.id }} `; ` tx.auditLog.create `; ` prisma.gymInvoice.findUnique {where: { id: alloc.invoiceId }} `; paginação/ordem sem paginação direta; efeitos delegados gymEnrollmentService.activateEnrollment

### GET /api/gym/finance/payments/[id]/receipt

- **Arquivo:** [src/app/api/gym/finance/payments/[id]/receipt/route.ts:8](<../../../src/app/api/gym/finance/payments/[id]/receipt/route.ts#L8>); linhas 8–41.
- **Finalidade implementada:** Consultar/obter dados por gymInvoiceService.getPaymentReceipt; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["payments.read"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymInvoiceService.getPaymentReceipt(context.workspaceId, id) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(receipt) `; ` NextResponse.json( { error: { code: error.code || "INTERNAL_ERROR", message: error.message || "Erro ao gerar recibo de pagamento." } }, { status: error.status || 500 } ) ` Códigos/expressões status: 400, error.status || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/invoice-service.ts:664](<../../../src/modules/workspaces/application/invoice-service.ts#L664>) (GymInvoiceService.getPaymentReceipt): consultas/escritas ` prisma.gymPayment.findFirst {where: { id: paymentId, workspaceId }} `; ` prisma.workspace.findUnique {where: { id: workspaceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/payments/[id]/reverse

- **Arquivo:** [src/app/api/gym/finance/payments/[id]/reverse/route.ts:8](<../../../src/app/api/gym/finance/payments/[id]/reverse/route.ts#L8>); linhas 8–54.
- **Finalidade implementada:** Executar a operação de gymInvoiceService.reversePayment; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["refunds.approve"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, reversalReason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !reversalReason || !reversalReason.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymInvoiceService.reversePayment({ workspaceId: context.workspaceId, paymentId: id, actorUserId: context.userId, reversalReason: reversalReason.trim() }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "REVERSAL_REASON_REQUIRED", message: "Justificativa da reversão é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json(reversed) `; ` NextResponse.json( { error: { code: error.code || "INTERNAL_ERROR", message: error.message || "Erro ao reverter pagamento." } }, { status: error.status || 500 } ) ` Códigos/expressões status: 400, error.status || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/invoice-service.ts:577](<../../../src/modules/workspaces/application/invoice-service.ts#L577>) (GymInvoiceService.reversePayment): consultas/escritas ` prisma.gymPayment.findFirst {where: { id: paymentId, workspaceId }} `; ` tx.gymPayment.update {where: { id: payment.id }} `; ` tx.gymPaymentAllocation.update {where: { id: alloc.id }} `; ` tx.gymInvoice.update {where: { id: invoice.id }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/profile

- **Arquivo:** [src/app/api/gym/finance/profile/route.ts:8](<../../../src/app/api/gym/finance/profile/route.ts#L8>); linhas 8–37.
- **Finalidade implementada:** Consultar/obter dados por gymFinancialService.getGymFinancialProfile; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["wallet.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymFinancialService.getGymFinancialProfile(context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(profile) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao buscar perfil financeiro da academia." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-financial-service.ts:139](<../../../src/modules/workspaces/application/gym-financial-service.ts#L139>) (GymFinancialService.getGymFinancialProfile): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; paginação/ordem ` orderBy: { capturedAt: "desc" } `; ` take: 1 `; efeitos delegados não identificados

### POST /api/gym/finance/profile

- **Arquivo:** [src/app/api/gym/finance/profile/route.ts:39](<../../../src/app/api/gym/finance/profile/route.ts#L39>); linhas 39–89.
- **Finalidade implementada:** Executar a operação de gymFinancialService.onboardGymAccount; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, name, cnpj, email, phone, postalCode, address, addressNumber, province, companyType, incomeValue } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !name || !cnpj || !email || !phone || !postalCode || !address || !addressNumber || !province `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymFinancialService.onboardGymAccount({ workspaceId: context.workspaceId, actorUserId: context.userId, name, cnpj, email, phone, postalCode, address, addressNumber, province, companyType, incomeValue: incomeValue ? Number(incomeValue) : undefined }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_FAILED", message: "Todos os campos de cadastro empresarial são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(profile, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: error.message || "Erro ao configurar perfil recebedor da academia." } }, { status: error.status || 500 } ) ` Códigos/expressões status: 400, 201, error.status || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-financial-service.ts:208](<../../../src/modules/workspaces/application/gym-financial-service.ts#L208>) (GymFinancialService.onboardGymAccount): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` prisma.paymentProviderAccount.update {where: { id: existing.id }} `; ` prisma.paymentProviderAccount.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/reconciliation/reprocess

- **Arquivo:** [src/app/api/gym/finance/reconciliation/reprocess/route.ts:8](<../../../src/app/api/gym/finance/reconciliation/reprocess/route.ts#L8>); linhas 8–63.
- **Finalidade implementada:** Executar a operação de gymWalletReconciliationService.reprocessDivergence; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/reconciliation-tab.tsx](<../../../src/app/(gym)/gym/finance/components/reconciliation-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["invoices.issue", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, divergenceId, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !divergenceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWalletReconciliationService.reprocessDivergence({ divergenceId, workspaceId: context.workspaceId, actorUserId: context.userId, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID da divergência é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, divergence: { id: resolved.id, status: resolved.status, resolvedAt: resolved.resolvedAt, resolutionNotes: resolved.resolutionNotes } }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao reprocessar divergência de conciliação." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, resolved.status, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:663](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L663>) (GymWalletReconciliationService.reprocessDivergence): consultas/escritas ` prisma.gymReconciliationDivergence.findFirst {where: { id: params.divergenceId, workspaceId: params.workspaceId }} `; ` prisma.gymInvoice.findUnique {where: { id: divergence.resourceId }} `; ` prisma.gymInvoice.update {where: { id: invoice.id }} `; ` prisma.gymReconciliationDivergence.update {where: { id: divergence.id }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/finance/reconciliation

- **Arquivo:** [src/app/api/gym/finance/reconciliation/route.ts:8](<../../../src/app/api/gym/finance/reconciliation/route.ts#L8>); linhas 8–41.
- **Finalidade implementada:** Consultar/obter dados por gymWalletReconciliationService.runReconciliation; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/reconciliation-tab.tsx](<../../../src/app/(gym)/gym/finance/components/reconciliation-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWalletReconciliationService.runReconciliation( context.workspaceId, context.userId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(report) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao executar conciliação financeira." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:412](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L412>) (GymWalletReconciliationService.runReconciliation): consultas/escritas ` prisma.gymInvoice.findMany {where: { workspaceId }} `; ` prisma.gymPayment.findMany {where: { workspaceId }} `; ` prisma.studentBilling.findMany {where: { workspaceId }} `; ` prisma.paymentProviderAccount.findUnique {where: { workspaceId }} `; ` prisma.gymReconciliationDivergence.findFirst {where: { workspaceId, resourceId: d.resourceId, divergenceType: d.divergenceType, status: GymDivergenceStatus.PENDING }} `; ` prisma.gymReconciliationDivergence.update {where: { id: existing.id }} `; ` prisma.gymReconciliationDivergence.create `; ` prisma.gymReconciliationDivergence.findMany {where: { workspaceId, status: GymDivergenceStatus.PENDING }} `; paginação/ordem ` orderBy: { capturedAt: "desc" } `; ` take: 1 `; ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

### POST /api/gym/finance/reconciliation

- **Arquivo:** [src/app/api/gym/finance/reconciliation/route.ts:43](<../../../src/app/api/gym/finance/reconciliation/route.ts#L43>); linhas 43–76.
- **Finalidade implementada:** Executar a operação de gymWalletReconciliationService.runReconciliation; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/reconciliation-tab.tsx](<../../../src/app/(gym)/gym/finance/components/reconciliation-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["invoices.issue", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWalletReconciliationService.runReconciliation( context.workspaceId, context.userId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(report) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao processar conciliação financeira." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:412](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L412>) (GymWalletReconciliationService.runReconciliation): consultas/escritas ` prisma.gymInvoice.findMany {where: { workspaceId }} `; ` prisma.gymPayment.findMany {where: { workspaceId }} `; ` prisma.studentBilling.findMany {where: { workspaceId }} `; ` prisma.paymentProviderAccount.findUnique {where: { workspaceId }} `; ` prisma.gymReconciliationDivergence.findFirst {where: { workspaceId, resourceId: d.resourceId, divergenceType: d.divergenceType, status: GymDivergenceStatus.PENDING }} `; ` prisma.gymReconciliationDivergence.update {where: { id: existing.id }} `; ` prisma.gymReconciliationDivergence.create `; ` prisma.gymReconciliationDivergence.findMany {where: { workspaceId, status: GymDivergenceStatus.PENDING }} `; paginação/ordem ` orderBy: { capturedAt: "desc" } `; ` take: 1 `; ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

### GET /api/gym/finance/suppliers

- **Arquivo:** [src/app/api/gym/finance/suppliers/route.ts:8](<../../../src/app/api/gym/finance/suppliers/route.ts#L8>); linhas 8–37.
- **Finalidade implementada:** Consultar/obter dados por gymCashExpenseService.listSuppliers; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.listSuppliers(context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ suppliers }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar fornecedores." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:460](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L460>) (GymCashExpenseService.listSuppliers): consultas/escritas ` prisma.gymSupplier.findMany {where: { workspaceId, isActive: true }} `; paginação/ordem ` orderBy: { tradeName: "asc" } `; efeitos delegados não identificados

### POST /api/gym/finance/suppliers

- **Arquivo:** [src/app/api/gym/finance/suppliers/route.ts:39](<../../../src/app/api/gym/finance/suppliers/route.ts#L39>); linhas 39–87.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.createSupplier; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/expenses-tab.tsx](<../../../src/app/(gym)/gym/finance/components/expenses-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, tradeName, corporateName, cnpjCpf, email, phone, contactName, notes } = body `
- **Condições de validação/erros:** ` !workspaceId || !tradeName `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.createSupplier({ workspaceId: context.workspaceId, tradeName, corporateName, cnpjCpf, email, phone, contactName, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "ID do workspace e Nome Fantasia são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(supplier, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao cadastrar fornecedor." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:477](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L477>) (GymCashExpenseService.createSupplier): consultas/escritas ` prisma.gymSupplier.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/sync-balance

- **Arquivo:** [src/app/api/gym/finance/sync-balance/route.ts:8](<../../../src/app/api/gym/finance/sync-balance/route.ts#L8>); linhas 8–37.
- **Finalidade implementada:** Executar a operação de gymFinancialService.syncGymBalance; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/wallet-tab.tsx](<../../../src/app/(gym)/gym/finance/components/wallet-tab.tsx>); [src/app/(gym)/gym/finance/finance-client.tsx](<../../../src/app/(gym)/gym/finance/finance-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["wallet.read"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymFinancialService.syncGymBalance(context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(balance) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: error.message || "Erro ao sincronizar saldo da academia." } }, { status: error.status || 500 } ) ` Códigos/expressões status: 400, error.status || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-financial-service.ts:781](<../../../src/modules/workspaces/application/gym-financial-service.ts#L781>) (GymFinancialService.syncGymBalance): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` prisma.walletBalanceSnapshot.create `; ` prisma.paymentProviderAccount.update {where: { id: account.id }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/transfers

- **Arquivo:** [src/app/api/gym/finance/transfers/route.ts:8](<../../../src/app/api/gym/finance/transfers/route.ts#L8>); linhas 8–60.
- **Finalidade implementada:** Executar a operação de gymCashExpenseService.transferBetweenAccounts; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/accounts-tab.tsx](<../../../src/app/(gym)/gym/finance/components/accounts-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.issue"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, fromAccountId, toAccountId, amountInCents, description, referenceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !fromAccountId || !toAccountId || !amountInCents `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymCashExpenseService.transferBetweenAccounts({ workspaceId: context.workspaceId, fromAccountId, toAccountId, amountInCents, description, referenceId, performedByUserId: context.userId }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "Conta de origem, destino e valor são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json(result, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao realizar transferência entre contas." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/cash-drawer-expense-service.ts:276](<../../../src/modules/workspaces/application/cash-drawer-expense-service.ts#L276>) (GymCashExpenseService.transferBetweenAccounts): consultas/escritas ` prisma.gymFinancialAccount.findFirst {where: { id: fromAccountId, workspaceId, isActive: true }} `; ` prisma.gymFinancialAccount.findFirst {where: { id: toAccountId, workspaceId, isActive: true }} `; ` tx.gymFinancialAccount.update {where: { id: fromAccountId }} `; ` tx.gymFinancialAccount.update {where: { id: toAccountId }} `; ` tx.gymAccountTransfer.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/finance/wallet/payout

- **Arquivo:** [src/app/api/gym/finance/wallet/payout/route.ts:8](<../../../src/app/api/gym/finance/wallet/payout/route.ts#L8>); linhas 8–81.
- **Finalidade implementada:** Executar a operação de gymWalletReconciliationService.requestWorkspacePayout; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/wallet-tab.tsx](<../../../src/app/(gym)/gym/finance/components/wallet-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["wallet.withdraw", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, amountInCents, pixKey, pixKeyType = "CNPJ", idempotencyKey } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !amountInCents || Number(amountInCents) <= 0 `; ` !pixKey || !pixKey.trim() `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWalletReconciliationService.requestWorkspacePayout({ workspaceId: context.workspaceId, actorUserId: context.userId, amountInCents: BigInt(amountInCents), pixKey: pixKey.trim(), pixKeyType, idempotencyKey, userCapabilities: Array.from(context.capabilities) }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_AMOUNT", message: "O valor de saque deve ser superior a zero." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_REQUEST", message: "A chave Pix de destino é obrigatória." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, payout: { id: payout.id, amountInCents: Number(payout.amountInCents), destinationMasked: payout.destinationMasked, status: payout.status, providerTransferId: payout.providerTransferId, submittedAt: payout.submittedAt } }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao solicitar saque da carteira." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, payout.status, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:277](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L277>) (GymWalletReconciliationService.requestWorkspacePayout): consultas/escritas ` prisma.paymentProviderAccount.findUnique {where: { workspaceId: input.workspaceId }} `; ` tx.walletPayoutRequest.create `; ` tx.walletLedgerEntry.create `; ` tx.walletBalanceSnapshot.update {where: { id: latestSnapshot.id }} `; ` tx.auditLog.create `; paginação/ordem ` orderBy: { capturedAt: "desc" } `; ` take: 1 `; efeitos delegados não identificados

### GET /api/gym/finance/wallet

- **Arquivo:** [src/app/api/gym/finance/wallet/route.ts:8](<../../../src/app/api/gym/finance/wallet/route.ts#L8>); linhas 8–41.
- **Finalidade implementada:** Consultar/obter dados por gymWalletReconciliationService.getWorkspaceWalletOverview; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/finance/components/wallet-tab.tsx](<../../../src/app/(gym)/gym/finance/components/wallet-tab.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["invoices.read"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWalletReconciliationService.getWorkspaceWalletOverview( context.workspaceId, context.userId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(overview) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao consultar carteira da academia." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-wallet-reconciliation-service.ts:122](<../../../src/modules/workspaces/application/gym-wallet-reconciliation-service.ts#L122>) (GymWalletReconciliationService.getWorkspaceWalletOverview): consultas/escritas ` prisma.paymentProviderAccount.findUnique {where: { workspaceId }} `; ` prisma.studentBilling.findMany {where: { workspaceId }} `; paginação/ordem ` orderBy: { capturedAt: "desc" } `; ` take: 1 `; ` orderBy: { requestedAt: "desc" } `; ` take: 10 `; ` orderBy: { occurredAt: "desc" } `; ` take: 20 `; efeitos delegados não identificados

### PATCH /api/gym/guardians/[id]

- **Arquivo:** [src/app/api/gym/guardians/[id]/route.ts:9](<../../../src/app/api/gym/guardians/[id]/route.ts#L9>); linhas 9–56.
- **Finalidade implementada:** Executar a operação de minorService.updateGuardian; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: guardianId } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` minorService.updateGuardian({ workspaceId: context.workspaceId, guardianId, actorUserId: context.userId, name: body.name, phone: body.phone, email: body.email, relationship: body.relationship, isLegalRepresentative: body.isLegalRepresentative, isFinancialResponsible: body.isFinancialResponsible, isEmergencyContact: body.isEmergencyContact, hasHealthAccess: body.hasHealthAccess, guardianUserId: body.guardianUserId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao atualizar responsável." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/minor-service.ts:149](<../../../src/modules/workspaces/application/minor-service.ts#L149>) (MinorService.updateGuardian): consultas/escritas ` prisma.gymGuardian.findFirst {where: { id: guardianId, workspaceId, revokedAt: null }} `; ` tx.gymGuardian.update {where: { id: guardianId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### DELETE /api/gym/guardians/[id]

- **Arquivo:** [src/app/api/gym/guardians/[id]/route.ts:59](<../../../src/app/api/gym/guardians/[id]/route.ts#L59>); linhas 59–99.
- **Finalidade implementada:** Executar a operação de minorService.revokeGuardian; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: guardianId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("reason") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` minorService.revokeGuardian( context.workspaceId, guardianId, context.userId, reason ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao revogar responsável." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/minor-service.ts:213](<../../../src/modules/workspaces/application/minor-service.ts#L213>) (MinorService.revokeGuardian): consultas/escritas ` prisma.gymGuardian.findFirst {where: { id: guardianId, workspaceId, revokedAt: null }} `; ` tx.gymGuardian.update {where: { id: guardianId }} `; ` tx.gymGuardian.count {where: { studentMemberId: guardian.studentMemberId, revokedAt: null, isLegalRepresentative: true, }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/guardians/[id]/verify

- **Arquivo:** [src/app/api/gym/guardians/[id]/verify/route.ts:9](<../../../src/app/api/gym/guardians/[id]/verify/route.ts#L9>); linhas 9–48.
- **Finalidade implementada:** Executar a operação de minorService.verifyGuardian; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: guardianId } = await params `; ` req.json() `; ` { workspaceId, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` minorService.verifyGuardian( context.workspaceId, guardianId, context.userId, notes ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(verified) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao validar documentos do responsável." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/minor-service.ts:257](<../../../src/modules/workspaces/application/minor-service.ts#L257>) (MinorService.verifyGuardian): consultas/escritas ` prisma.gymGuardian.findFirst {where: { id: guardianId, workspaceId, revokedAt: null }} `; ` prisma.gymGuardian.update {where: { id: guardianId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/import/commit

- **Arquivo:** [src/app/api/gym/import/commit/route.ts:8](<../../../src/app/api/gym/import/commit/route.ts#L8>); linhas 8–52.
- **Finalidade implementada:** Executar a operação de GymImportService.commitImport; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/import/import-client.tsx](<../../../src/app/(gym)/gym/import/import-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, importBatchHash, rows, unitId, overrideAmbiguities } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !importBatchHash || !rows || !Array.isArray(rows) || rows.length === 0 `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymImportService.commitImport({ workspaceId: context.workspaceId, importBatchHash, rows, unitId, actorUserId: context.userId, overrideAmbiguities, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "INVALID_BATCH_PAYLOAD", message: "Hash do lote e registros para importação são obrigatórios." } }, { status: 400 } ) `; ` NextResponse.json({ data: commitResult }) `; ` NextResponse.json( { error: { code: "IMPORT_COMMIT_FAILED", message: error.message || "Falha ao comitar lote de importação." } }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-import-service.ts:521](<../../../src/modules/workspaces/application/gym-import-service.ts#L521>) (GymImportService.commitImport): consultas/escritas ` prisma.importJob.findFirst {where: { workspaceId, idempotencyKey: importBatchHash, status: ImportJobStatus.COMPLETED, }} `; ` prisma.gymPlan.findMany {where: { workspaceId, isActive: true }} `; ` prisma.gymUnit.findFirst {where: { workspaceId, isActive: true }} `; ` tx.importJob.create `; ` tx.user.findFirst {where: { OR: orFilters }} `; ` tx.user.create `; ` tx.workspaceMember.findFirst {where: { workspaceId, userId, }} `; ` tx.workspaceMember.create `; ` tx.gymGuardian.findFirst {where: { workspaceId, studentMemberId: member.id, name: row.guardianName, }} `; ` tx.gymGuardian.create `; ` tx.gymEnrollment.create `; ` tx.gymInvoice.create `; ` tx.gymAccessGrant.create `; ` tx.importJob.update {where: { id: job.id }} `; ` tx.auditLog.create `; paginação/ordem ` orderBy: { version: "desc" } `; ` take: 1 `; efeitos delegados não identificados

### POST /api/gym/import/preview

- **Arquivo:** [src/app/api/gym/import/preview/route.ts:8](<../../../src/app/api/gym/import/preview/route.ts#L8>); linhas 8–50.
- **Finalidade implementada:** Executar a operação de GymImportService.previewImport; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/import/import-client.tsx](<../../../src/app/(gym)/gym/import/import-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, csvContent, unitId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !csvContent || typeof csvContent !== "string" `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymImportService.previewImport({ workspaceId: context.workspaceId, csvContent, unitId, actorUserId: context.userId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "CSV_CONTENT_REQUIRED", message: "Conteúdo do arquivo CSV é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ data: preview }) `; ` NextResponse.json( { error: { code: "IMPORT_PREVIEW_FAILED", message: error.message || "Falha ao processar prévia da importação." } }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-import-service.ts:198](<../../../src/modules/workspaces/application/gym-import-service.ts#L198>) (GymImportService.previewImport): consultas/escritas ` prisma.gymPlan.findMany {where: { workspaceId, isActive: true }} `; ` prisma.workspaceMember.findMany {where: { workspaceId, role: "STUDENT" }} `; paginação/ordem ` orderBy: { version: "desc" } `; ` take: 1 `; efeitos delegados GymImportService.parseCurrencyToCents

### GET /api/gym/import/template

- **Arquivo:** [src/app/api/gym/import/template/route.ts:5](<../../../src/app/api/gym/import/template/route.ts#L5>); linhas 5–31.
- **Finalidade implementada:** Consultar/obter dados por GymImportService.generateSampleCsv; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/import/import-client.tsx](<../../../src/app/(gym)/gym/import/import-client.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user?.id `
- **Chamadas e efeitos delegados:** ` GymImportService.generateSampleCsv() `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "UNAUTHORIZED", message: "Autenticação obrigatória." } }, { status: 401 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao gerar planilha modelo de importação." } }, { status: 500 } ) ` Códigos/expressões status: 401, 200, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-import-service.ts:91](<../../../src/modules/workspaces/application/gym-import-service.ts#L91>) (GymImportService.generateSampleCsv): consultas/escritas sem prisma/tx direto; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/invitations/accept

- **Arquivo:** [src/app/api/gym/invitations/accept/route.ts:7](<../../../src/app/api/gym/invitations/accept/route.ts#L7>); linhas 7–38.
- **Finalidade implementada:** Consultar/obter dados por staffService.getInvitationByToken; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>); [src/app/auth/invite/page.tsx](<../../../src/app/auth/invite/page.tsx>)
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` url.searchParams.get("token") `
- **Condições de validação/erros:** ` !token `; ` error.statusCode `
- **Chamadas e efeitos delegados:** ` staffService.getInvitationByToken(token) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Token de convite não fornecido." }, { status: 400 }) `; ` NextResponse.json({ valid: true, workspace: { id: invitation.workspace.id, name: invitation.workspace.name, slug: invitation.workspace.slug, logoUrl: invitation.workspace.logoUrl, type: invitation.workspace.type, }, role: invitation.role, unit: invitation.unit, email: invitation.email, expiresAt: invitation.expiresAt, }) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: "Erro ao validar convite." }, { status: 500 }) ` Códigos/expressões status: 400, error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:189](<../../../src/modules/workspaces/application/staff-service.ts#L189>) (StaffService.getInvitationByToken): consultas/escritas ` prisma.workspaceInvitation.findUnique {where: { tokenHash }} `; ` prisma.workspaceInvitation.update {where: { id: invitation.id }} `; paginação/ordem sem paginação direta; efeitos delegados StaffService.hashToken

### POST /api/gym/invitations/accept

- **Arquivo:** [src/app/api/gym/invitations/accept/route.ts:40](<../../../src/app/api/gym/invitations/accept/route.ts#L40>); linhas 40–70.
- **Finalidade implementada:** Executar a operação de staffService.acceptInvitation, WorkspaceContextService.setActiveWorkspaceCookie; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>); [src/app/auth/invite/page.tsx](<../../../src/app/auth/invite/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { token } = body `
- **Condições de validação/erros:** ` !session?.user?.id `; ` !token || typeof token !== "string" `; ` error.statusCode `
- **Chamadas e efeitos delegados:** ` staffService.acceptInvitation(token, session.user.id) `; ` WorkspaceContextService.setActiveWorkspaceCookie(result.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Você precisa estar conectado à sua conta para aceitar este convite.", code: "UNAUTHORIZED", }, { status: 401 }) `; ` NextResponse.json({ error: "Token de convite obrigatório." }, { status: 400 }) `; ` NextResponse.json(result) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: error.message || "Erro ao aceitar convite." }, { status: 500 }) ` Códigos/expressões status: 401, 400, error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:243](<../../../src/modules/workspaces/application/staff-service.ts#L243>) (StaffService.acceptInvitation): consultas/escritas ` prisma.user.findUnique {where: { id: userId }} `; ` tx.workspaceMember.findFirst {where: { workspaceId: invitation.workspaceId, userId: user.id, }} `; ` tx.workspaceMember.create `; ` tx.workspaceMember.update {where: { id: member.id }} `; ` tx.workspaceRoleGrant.findFirst {where: { memberId: member.id, role: invitation.role, unitId: invitation.unitId || null, revokedAt: null, }} `; ` tx.workspaceRoleGrant.create `; ` tx.gymStaffProfile.upsert {where: { memberId: member.id }} `; ` tx.workspaceInvitation.update {where: { id: invitation.id }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/context-service.ts:88](<../../../src/modules/workspaces/application/context-service.ts#L88>) (WorkspaceContextService.setActiveWorkspaceCookie): consultas/escritas sem prisma/tx direto; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/invitations

- **Arquivo:** [src/app/api/gym/invitations/route.ts:22](<../../../src/app/api/gym/invitations/route.ts#L22>); linhas 22–66.
- **Finalidade implementada:** Consultar/obter dados por /api/gym/invitations; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.read"], }) `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` error.statusCode `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** workspaceInvitation
- **Respostas e códigos locais:** ` NextResponse.json(sanitized) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: "Erro ao listar convites." }, { status: 500 }) ` Códigos/expressões status: "PENDING", inv.status, error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### DELETE /api/gym/invitations/[id]

- **Arquivo:** [src/app/api/gym/invitations/[id]/route.ts:22](<../../../src/app/api/gym/invitations/[id]/route.ts#L22>); linhas 22–48.
- **Finalidade implementada:** Executar a operação de staffService.revokeInvitation; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: invitationId } = await params `
- **Condições de validação/erros:** ` error.statusCode `
- **Chamadas e efeitos delegados:** ` staffService.revokeInvitation( invitationId, context.workspaceId, context.userId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ success: true, id: revoked.id }) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: error.message || "Erro ao revogar convite." }, { status: 500 }) ` Códigos/expressões status: error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:350](<../../../src/modules/workspaces/application/staff-service.ts#L350>) (StaffService.revokeInvitation): consultas/escritas ` prisma.workspaceInvitation.findFirst {where: { id: invitationId, workspaceId }} `; ` prisma.workspaceInvitation.update {where: { id: invitationId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/operations/health

- **Arquivo:** [src/app/api/gym/operations/health/route.ts:14](<../../../src/app/api/gym/operations/health/route.ts#L14>); linhas 14–44.
- **Finalidade implementada:** Consultar/obter dados por recoveryService.getOperationsHealthSummary; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(request.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessResponse `
- **Chamadas e efeitos delegados:** ` recoveryService.getOperationsHealthSummary(workspaceId, unitId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: "O parâmetro workspaceId é obrigatório." }, { status: 400 } ) `; ` NextResponse.json(summary) `; ` NextResponse.json( { error: error?.message || "Erro ao consultar saúde operacional." }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-recovery-service.ts:300](<../../../src/modules/workspaces/application/gym-recovery-service.ts#L300>) (GymRecoveryService.getOperationsHealthSummary): consultas/escritas ` prisma.gymDeviceCommand.count {where: { workspaceId, status: GymDeviceCommandStatus.FAILED, ...(unitId ? { device: { unitId } } : {}) }} `; ` prisma.gymAccessDevice.findMany {where: { ...deviceWhere, OR: [ { status: GymDeviceStatus.OFFLINE }, { lastHeartbeatAt: null }, { lastHeartbeatAt: { lt: fifteenMinutesAgo } } ] }} `; ` prisma.gymAccessDevice.count {where: { ...deviceWhere, contingencyMode: true }} `; ` prisma.gymAccessReconciliationDivergence.count {where: { workspaceId, status: GymAccessDivergenceStatus.OPEN, ...(unitId ? { unitId } : {}) }} `; ` prisma.gymCashDrawerSession.count {where: { workspaceId, status: GymCashDrawerStatus.OPEN, openedAt: { lt: twentyFourHoursAgo } }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/pilot/readiness

- **Arquivo:** [src/app/api/gym/pilot/readiness/route.ts:14](<../../../src/app/api/gym/pilot/readiness/route.ts#L14>); linhas 14–52.
- **Finalidade implementada:** Consultar/obter dados por readinessService.evaluateUnitPilotReadiness; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(request.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `
- **Condições de validação/erros:** ` !workspaceId `; ` !unitId `; ` accessResponse `
- **Chamadas e efeitos delegados:** ` readinessService.evaluateUnitPilotReadiness(workspaceId, unitId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: "O parâmetro workspaceId é obrigatório." }, { status: 400 } ) `; ` NextResponse.json( { error: "O parâmetro unitId é obrigatório." }, { status: 400 } ) `; ` NextResponse.json(readiness) `; ` NextResponse.json( { error: error?.message || "Erro ao avaliar prontidão da unidade para piloto." }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-pilot-readiness-service.ts:39](<../../../src/modules/workspaces/application/gym-pilot-readiness-service.ts#L39>) (GymPilotReadinessService.evaluateUnitPilotReadiness): consultas/escritas ` prisma.gymUnit.findFirst {where: { id: unitId, workspaceId }} `; ` prisma.gymPlan.findMany {where: { workspaceId, isActive: true }} `; ` prisma.workspaceMember.findMany {where: { workspaceId, isActive: true, role: { in: [WorkspaceRole.OWNER, WorkspaceRole.MANAGER, WorkspaceRole.RECEPTIONIST, WorkspaceRole.TRAINER] } }} `; paginação/ordem ` take: 1 `; efeitos delegados não identificados

### GET /api/gym/plans

- **Arquivo:** [src/app/api/gym/plans/route.ts:9](<../../../src/app/api/gym/plans/route.ts#L9>); linhas 9–40.
- **Finalidade implementada:** Consultar/obter dados por gymPlanService.listPlans; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/plans/plans-client.tsx](<../../../src/app/(gym)/gym/plans/plans-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("includeInactive") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymPlanService.listPlans(context.workspaceId, { includeInactive }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ plans }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao buscar catálogo de planos." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/plan-service.ts:310](<../../../src/modules/workspaces/application/plan-service.ts#L310>) (GymPlanService.listPlans): consultas/escritas ` prisma.gymPlan.findMany {where: whereClause} `; paginação/ordem ` orderBy: { version: "desc" } `; ` orderBy: { createdAt: "desc" } `; efeitos delegados GymPlanService.serializePlanVersion

### POST /api/gym/plans

- **Arquivo:** [src/app/api/gym/plans/route.ts:43](<../../../src/app/api/gym/plans/route.ts#L43>); linhas 43–120.
- **Finalidade implementada:** Executar a operação de gymPlanService.createPlan; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/plans/plans-client.tsx](<../../../src/app/(gym)/gym/plans/plans-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId } = body `; ` { name, description, priceInCents, enrollmentFeeInCents, billingCycle, durationDays, classCreditsPerCycle, allowedTimeStart, allowedTimeEnd, allowedDaysOfWeek, allowsAllUnits, termsText, termsVersion, } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !name || priceInCents === undefined || !billingCycle || !termsText `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymPlanService.createPlan({ workspaceId: context.workspaceId, actorUserId: context.userId, name, description, priceInCents, enrollmentFeeInCents, billingCycle, durationDays: durationDays ? parseInt(durationDays, 10) : undefined, classCreditsPerCycle: classCreditsPerCycle !== undefined && classCreditsPerCycle !== null && classCreditsPerCycle !== "" ? parseInt(classCreditsPerCycle, 10) : null, allowedTimeStart, allowedTimeEnd, allowedDaysOfWeek, allowsAllUnits: allowsAllUnits !== undefined ? Boolean(allowsAllUnits) : true, termsText, termsVersion, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Nome, preço, ciclo de cobrança e termos contratuais são obrigatórios.", }, }, { status: 400 } ) `; ` NextResponse.json(plan, { status: 201 }) `; ` NextResponse.json( { error: { code: "PLAN_CREATION_FAILED", message: error.message || "Erro ao criar plano." } }, { status: 400 } ) ` Códigos/expressões status: 400, 201.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/plan-service.ts:77](<../../../src/modules/workspaces/application/plan-service.ts#L77>) (GymPlanService.createPlan): consultas/escritas ` tx.gymPlan.create `; ` tx.gymPlanVersion.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados GymPlanService.serializePlanVersion

### GET /api/gym/plans/[id]

- **Arquivo:** [src/app/api/gym/plans/[id]/route.ts:13](<../../../src/app/api/gym/plans/[id]/route.ts#L13>); linhas 13–43.
- **Finalidade implementada:** Consultar/obter dados por gymPlanService.getPlanById; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/plans/plans-client.tsx](<../../../src/app/(gym)/gym/plans/plans-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.read"], }) `.
- **Entradas, filtros e paginação:** ` { id: planId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymPlanService.getPlanById(planId, context.workspaceId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(plan) `; ` NextResponse.json( { error: { code: "PLAN_NOT_FOUND", message: error.message || "Plano não encontrado." } }, { status: 404 } ) ` Códigos/expressões status: 400, 404.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/plan-service.ts:363](<../../../src/modules/workspaces/application/plan-service.ts#L363>) (GymPlanService.getPlanById): consultas/escritas ` prisma.gymPlan.findFirst {where: { id: planId, workspaceId }} `; paginação/ordem ` orderBy: { version: "desc" } `; efeitos delegados GymPlanService.serializePlanVersion

### PATCH /api/gym/plans/[id]

- **Arquivo:** [src/app/api/gym/plans/[id]/route.ts:46](<../../../src/app/api/gym/plans/[id]/route.ts#L46>); linhas 46–84.
- **Finalidade implementada:** Executar a operação de gymPlanService.updatePlanMetadata; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/plans/plans-client.tsx](<../../../src/app/(gym)/gym/plans/plans-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: planId } = await params `; ` req.json() `; ` { workspaceId, name, description, isActive } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymPlanService.updatePlanMetadata({ planId, workspaceId: context.workspaceId, actorUserId: context.userId, name, description, isActive, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: { code: "UPDATE_FAILED", message: error.message || "Erro ao atualizar plano." } }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/plan-service.ts:269](<../../../src/modules/workspaces/application/plan-service.ts#L269>) (GymPlanService.updatePlanMetadata): consultas/escritas ` prisma.gymPlan.findFirst {where: { id: planId, workspaceId }} `; ` tx.gymPlan.update {where: { id: planId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/gym/plans/[id]/versions

- **Arquivo:** [src/app/api/gym/plans/[id]/versions/route.ts:13](<../../../src/app/api/gym/plans/[id]/versions/route.ts#L13>); linhas 13–97.
- **Finalidade implementada:** Executar a operação de gymPlanService.publishNewVersion; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/plans/plans-client.tsx](<../../../src/app/(gym)/gym/plans/plans-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["enrollments.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: planId } = await params `; ` req.json() `; ` { workspaceId } = body `; ` { name, description, priceInCents, enrollmentFeeInCents, billingCycle, durationDays, classCreditsPerCycle, allowedTimeStart, allowedTimeEnd, allowedDaysOfWeek, allowsAllUnits, termsText, termsVersion, } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` priceInCents === undefined || !billingCycle || !termsText `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymPlanService.publishNewVersion({ planId, workspaceId: context.workspaceId, actorUserId: context.userId, name, description, priceInCents, enrollmentFeeInCents, billingCycle, durationDays: durationDays ? parseInt(durationDays, 10) : undefined, classCreditsPerCycle: classCreditsPerCycle !== undefined && classCreditsPerCycle !== null && classCreditsPerCycle !== "" ? parseInt(classCreditsPerCycle, 10) : null, allowedTimeStart, allowedTimeEnd, allowedDaysOfWeek, allowsAllUnits: allowsAllUnits !== undefined ? Boolean(allowsAllUnits) : true, termsText, termsVersion, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "VALIDATION_ERROR", message: "Preço, ciclo de cobrança e termos contratuais são obrigatórios.", }, }, { status: 400 } ) `; ` NextResponse.json(newVersion, { status: 201 }) `; ` NextResponse.json( { error: { code: "VERSION_PUBLISH_FAILED", message: error.message || "Erro ao publicar nova versão do plano.", }, }, { status: 400 } ) ` Códigos/expressões status: 400, 201.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/plan-service.ts:173](<../../../src/modules/workspaces/application/plan-service.ts#L173>) (GymPlanService.publishNewVersion): consultas/escritas ` prisma.gymPlan.findFirst {where: { id: planId, workspaceId }} `; ` tx.gymPlanVersion.updateMany {where: { planId, isActive: true }} `; ` tx.gymPlanVersion.create `; ` tx.auditLog.create `; paginação/ordem ` orderBy: { version: "desc" } `; ` take: 1 `; efeitos delegados GymPlanService.serializePlanVersion

### POST /api/gym/privacy/delete-request

- **Arquivo:** [src/app/api/gym/privacy/delete-request/route.ts:8](<../../../src/app/api/gym/privacy/delete-request/route.ts#L8>); linhas 8–50.
- **Finalidade implementada:** Executar a operação de GymOffboardingService.executeDataSubjectDeletion; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/settings/settings-client.tsx](<../../../src/app/(gym)/gym/settings/settings-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, targetUserId, reason } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !targetUserId `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymOffboardingService.executeDataSubjectDeletion({ workspaceId: context.workspaceId, targetUserId, actorUserId: context.userId, reason: reason || undefined, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "TARGET_USER_REQUIRED", message: "ID do titular de dados é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ data: result }) `; ` NextResponse.json( { error: { code: "PRIVACY_DELETE_FAILED", message: error.message || "Falha ao executar anonimização/exclusão sob a LGPD." } }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-offboarding-service.ts:529](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L529>) (GymOffboardingService.executeDataSubjectDeletion): consultas/escritas ` prisma.user.findUnique {where: { id: targetUserId }} `; ` prisma.workspaceMember.findFirst {where: { workspaceId, userId: targetUserId }} `; ` prisma.gymAccessDevice.findMany {where: { workspaceId, isActive: true }} `; ` tx.gymEnrollment.updateMany {where: { workspaceId, studentMemberId: member.id, status: { in: [GymEnrollmentStatus.ACTIVE, GymEnrollmentStatus.PAUSED, GymEnrollmentStatus.PENDING_ACTIVATION] }, }} `; ` tx.gymAccessGrant.updateMany {where: { workspaceId, studentMemberId: member.id, status: GymAccessGrantStatus.ACTIVE, }} `; ` tx.gymDeviceCommand.create `; ` tx.privacyConsent.updateMany {where: { userId: user.id, revokedAt: null }} `; ` tx.gymStudentProfile.update {where: { memberId: member.id }} `; ` tx.user.update {where: { id: user.id }} `; ` tx.workspaceMember.update {where: { id: member.id }} `; ` tx.workspaceRoleGrant.updateMany {where: { memberId: member.id, revokedAt: null }} `; ` tx.dataSubjectRequest.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados this.ownershipService.preventLastOwnerRemoval

### POST /api/gym/privacy/export

- **Arquivo:** [src/app/api/gym/privacy/export/route.ts:8](<../../../src/app/api/gym/privacy/export/route.ts#L8>); linhas 8–44.
- **Finalidade implementada:** Executar a operação de GymOffboardingService.exportDataSubjectDossier; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/settings/settings-client.tsx](<../../../src/app/(gym)/gym/settings/settings-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage", "reports.operational"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, targetUserId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymOffboardingService.exportDataSubjectDossier({ workspaceId: context.workspaceId, targetUserId: finalTargetUserId, actorUserId: context.userId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ data: dossier }) `; ` NextResponse.json( { error: { code: "PRIVACY_EXPORT_FAILED", message: error.message || "Falha ao exportar dossiê LGPD." } }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-offboarding-service.ts:332](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L332>) (GymOffboardingService.exportDataSubjectDossier): consultas/escritas ` prisma.user.findUnique {where: { id: targetUserId }} `; ` prisma.workspaceMember.findFirst {where: { workspaceId, userId: targetUserId }} `; ` prisma.gymInvoice.findMany {where: { workspaceId, studentMemberId: member.id }} `; ` prisma.legalAcceptance.findMany {where: { workspaceId, userId: targetUserId }} `; ` prisma.privacyConsent.findMany {where: { userId: targetUserId }} `; ` prisma.dataSubjectRequest.create `; paginação/ordem ` take: 500 `; ` orderBy: { accessedAt: "desc" } `; ` take: 200 `; ` orderBy: { bookedAt: "desc" } `; ` orderBy: { dueDate: "desc" } `; efeitos delegados não identificados

### GET /api/gym/reception/feed

- **Arquivo:** [src/app/api/gym/reception/feed/route.ts:8](<../../../src/app/api/gym/reception/feed/route.ts#L8>); linhas 8–51.
- **Finalidade implementada:** Consultar/obter dados por gymBiometricsService.getReceptionLiveFeed; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/access/access-client.tsx](<../../../src/app/(gym)/gym/access/access-client.tsx>); [src/app/(gym)/gym/reception/reception-client.tsx](<../../../src/app/(gym)/gym/reception/reception-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["access.read", "devices.manage", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("unitId") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` !unitId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBiometricsService.getReceptionLiveFeed( context.workspaceId, unitId, limit ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "UNIT_REQUIRED", message: "ID da unidade é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(feed) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao carregar feed da recepção." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-biometrics-service.ts:392](<../../../src/modules/workspaces/application/gym-biometrics-service.ts#L392>) (GymBiometricsService.getReceptionLiveFeed): consultas/escritas ` prisma.gymUnit.findFirst {where: { id: unitId, workspaceId }} `; ` prisma.gymAccessDevice.findMany {where: { workspaceId, unitId, isActive: true }} `; ` prisma.gymAccessLog.findMany {where: { workspaceId, unitId, accessedAt: { gte: todayStart } }} `; ` prisma.gymDeviceCommand.findMany {where: { workspaceId, device: { unitId } }} `; ` prisma.gymAccessReconciliationDivergence.count {where: { workspaceId, unitId, status: "OPEN" }} `; ` prisma.gymAccessReconciliationDivergence.findMany {where: { workspaceId, unitId, status: "OPEN" }} `; ` prisma.gymAccessLog.count {where: { workspaceId, unitId, accessedAt: { gte: todayStart }, granted: true }} `; paginação/ordem ` orderBy: { accessedAt: "desc" } `; ` take: safeLimit `; ` orderBy: { createdAt: "desc" } `; ` orderBy: { detectedAt: "desc" } `; efeitos delegados não identificados

### POST /api/gym/settings/transfer-ownership

- **Arquivo:** [src/app/api/gym/settings/transfer-ownership/route.ts:8](<../../../src/app/api/gym/settings/transfer-ownership/route.ts#L8>); linhas 8–56.
- **Finalidade implementada:** Executar a operação de GymOffboardingService.transferOwnership; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/settings/settings-client.tsx](<../../../src/app/(gym)/gym/settings/settings-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, targetUserId, demoteCurrentOwnerTo } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !targetUserId `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymOffboardingService.transferOwnership({ workspaceId: context.workspaceId, currentOwnerUserId: context.userId, targetUserId, actorUserId: context.userId, demoteCurrentOwnerTo, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "TARGET_USER_REQUIRED", message: "ID do novo proprietário é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ data: result }) `; ` NextResponse.json( { error: { code: "OWNERSHIP_TRANSFER_FAILED", message: error.message || "Falha ao transferir propriedade do workspace.", }, }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-offboarding-service.ts:158](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L158>) (GymOffboardingService.transferOwnership): consultas/escritas sem prisma/tx direto; paginação/ordem sem paginação direta; efeitos delegados this.ownershipService.transferWorkspaceOwnership

### GET /api/gym/staff

- **Arquivo:** [src/app/api/gym/staff/route.ts:23](<../../../src/app/api/gym/staff/route.ts#L23>); linhas 23–59.
- **Finalidade implementada:** Consultar/obter dados por staffService.listStaff; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.read"], }) `.
- **Entradas, filtros e paginação:** ` url.searchParams.get("search") `; ` url.searchParams.get("unitId") `; ` url.searchParams.get("role") `; ` url.searchParams.get("page") `; ` url.searchParams.get("limit") `
- **Condições de validação/erros:** ` error.statusCode `; ` error.message === "WORKSPACE_REQUIRED" `
- **Chamadas e efeitos delegados:** ` staffService.listStaff({ workspaceId: context.workspaceId, unitId, role, search, page: isNaN(page) ? 1 : page, limit: isNaN(limit) ? 50 : Math.min(limit, 100), }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json(result) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: "Identificador de workspace não fornecido." }, { status: 400 }) `; ` NextResponse.json({ error: "Erro interno ao listar colaboradores." }, { status: 500 }) ` Códigos/expressões status: error.statusCode, 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:384](<../../../src/modules/workspaces/application/staff-service.ts#L384>) (StaffService.listStaff): consultas/escritas ` prisma.workspaceMember.findMany {where} `; ` prisma.workspaceMember.count {where} `; paginação/ordem ` take: limit `; ` orderBy: [{ role: "asc" }, { createdAt: "desc" }] `; efeitos delegados não identificados

### POST /api/gym/staff

- **Arquivo:** [src/app/api/gym/staff/route.ts:61](<../../../src/app/api/gym/staff/route.ts#L61>); linhas 61–104.
- **Finalidade implementada:** Executar a operação de staffService.inviteStaffMember; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { email, role, unitId, cref, jobTitle } = body `
- **Condições de validação/erros:** ` !email || typeof email !== "string" || !email.includes("@") `; ` !role || !validRoles.includes(role) `; ` error.statusCode `; ` error.message === "WORKSPACE_REQUIRED" `
- **Chamadas e efeitos delegados:** ` staffService.inviteStaffMember({ workspaceId: context.workspaceId, email: email.trim(), role, unitId: unitId ? String(unitId).trim() : null, invitedById: context.userId, cref: cref ? String(cref).trim() : null, jobTitle: jobTitle ? String(jobTitle).trim() : null, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "E-mail válido é obrigatório." }, { status: 400 }) `; ` NextResponse.json({ error: "Papel de colaborador inválido. Escolha entre Gerente, Recepcionista, Financeiro ou Instrutor.", }, { status: 400 }) `; ` NextResponse.json(result, { status: 201 }) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: "Identificador de workspace não fornecido." }, { status: 400 }) `; ` NextResponse.json({ error: error.message || "Erro ao convidar colaborador." }, { status: 500 }) ` Códigos/expressões status: 400, 201, error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:60](<../../../src/modules/workspaces/application/staff-service.ts#L60>) (StaffService.inviteStaffMember): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` prisma.workspaceMember.count {where: { workspaceId, isActive: true, role: { not: "STUDENT" }, }} `; ` prisma.workspaceMember.findFirst {where: { workspaceId, user: { email: normalizedEmail }, isActive: true, }} `; ` prisma.gymUnit.findFirst {where: { id: unitId, workspaceId, isActive: true }} `; ` prisma.workspaceInvitation.updateMany {where: { workspaceId, email: normalizedEmail, status: "PENDING", }} `; ` prisma.workspaceInvitation.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados StaffService.hashToken

### GET /api/gym/staff/[id]

- **Arquivo:** [src/app/api/gym/staff/[id]/route.ts:23](<../../../src/app/api/gym/staff/[id]/route.ts#L23>); linhas 23–44.
- **Finalidade implementada:** Consultar/obter dados por staffService.getStaffMember; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.read"], }) `.
- **Entradas, filtros e paginação:** ` { id: memberId } = await params `
- **Condições de validação/erros:** ` error.statusCode `
- **Chamadas e efeitos delegados:** ` staffService.getStaffMember(context.workspaceId, memberId) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json(staffMember) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: error.message || "Erro ao consultar colaborador." }, { status: 500 }) ` Códigos/expressões status: error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:474](<../../../src/modules/workspaces/application/staff-service.ts#L474>) (StaffService.getStaffMember): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: memberId, workspaceId }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### PATCH /api/gym/staff/[id]

- **Arquivo:** [src/app/api/gym/staff/[id]/route.ts:46](<../../../src/app/api/gym/staff/[id]/route.ts#L46>); linhas 46–95.
- **Finalidade implementada:** Executar a operação de staffService.updateStaffMember; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: memberId } = await params `; ` req.json() `; ` { unitId, role, cref, jobTitle, bio, emergencyContactName, emergencyContactPhone, } = body `
- **Condições de validação/erros:** ` role && !validRoles.includes(role) `; ` error.statusCode `
- **Chamadas e efeitos delegados:** ` staffService.updateStaffMember({ workspaceId: context.workspaceId, memberId, actorUserId: context.userId, unitId: unitId !== undefined ? (unitId ? String(unitId).trim() : null) : undefined, role: role || undefined, cref: cref !== undefined ? (cref ? String(cref).trim() : null) : undefined, jobTitle: jobTitle !== undefined ? (jobTitle ? String(jobTitle).trim() : null) : undefined, bio: bio !== undefined ? (bio ? String(bio).trim() : null) : undefined, emergencyContactName: emergencyContactName !== undefined ? (emergencyContactName ? String(emergencyContactName).trim() : null) : undefined, emergencyContactPhone: emergencyContactPhone !== undefined ? (emergencyContactPhone ? String(emergencyContactPhone).trim() : null) : undefined, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Papel de colaborador inválido." }, { status: 400 }) `; ` NextResponse.json(updated) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: error.message || "Erro ao atualizar colaborador." }, { status: 500 }) ` Códigos/expressões status: 400, error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:514](<../../../src/modules/workspaces/application/staff-service.ts#L514>) (StaffService.updateStaffMember): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: memberId, workspaceId }} `; ` tx.workspaceMember.update {where: { id: memberId }} `; ` tx.gymStaffProfile.upsert {where: { memberId }} `; ` tx.workspaceRoleGrant.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados OwnershipService.preventLastOwnerRemoval

### DELETE /api/gym/staff/[id]

- **Arquivo:** [src/app/api/gym/staff/[id]/route.ts:97](<../../../src/app/api/gym/staff/[id]/route.ts#L97>); linhas 97–128.
- **Finalidade implementada:** Executar a operação de staffService.offboardStaffMember; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/staff/staff-client.tsx](<../../../src/app/(gym)/gym/staff/staff-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["staff.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: memberId } = await params `; ` req.json() `; ` { replacementStaffMemberId, reason } = body `
- **Condições de validação/erros:** ` error.statusCode `
- **Chamadas e efeitos delegados:** ` staffService.offboardStaffMember({ workspaceId: context.workspaceId, memberId, actorUserId: context.userId, replacementStaffMemberId: replacementStaffMemberId ? String(replacementStaffMemberId).trim() : null, reason: reason ? String(reason).trim() : undefined, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json(result) `; ` NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode }) `; ` NextResponse.json({ error: error.message || "Erro ao desligar colaborador." }, { status: 500 }) ` Códigos/expressões status: error.statusCode, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/staff-service.ts:610](<../../../src/modules/workspaces/application/staff-service.ts#L610>) (StaffService.offboardStaffMember): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: memberId, workspaceId }} `; ` prisma.workspaceMember.findFirst {where: { id: replacementStaffMemberId, workspaceId, isActive: true }} `; ` tx.workspaceMember.updateMany {where: { id: { in: studentIds }, workspaceId, }} `; ` tx.workspaceRoleGrant.updateMany {where: { memberId, revokedAt: null, }} `; ` tx.gymStaffProfile.upsert {where: { memberId }} `; ` tx.workspaceMember.update {where: { id: memberId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados OwnershipService.preventLastOwnerRemoval

### POST /api/gym/staff/[id]/terminate

- **Arquivo:** [src/app/api/gym/staff/[id]/terminate/route.ts:12](<../../../src/app/api/gym/staff/[id]/terminate/route.ts#L12>); linhas 12–55.
- **Finalidade implementada:** Executar a operação de GymOffboardingService.offboardStaffWithHandover; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["staff.manage", "workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: memberId } = await params `; ` req.json() `; ` { workspaceId, replacementStaffMemberId, reason, cancelFutureSessionsWithoutSubstitute = true, } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymOffboardingService.offboardStaffWithHandover({ workspaceId: context.workspaceId, memberId, actorUserId: context.userId, replacementStaffMemberId: replacementStaffMemberId || null, reason: reason || undefined, cancelFutureSessionsWithoutSubstitute, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ data: result }) `; ` NextResponse.json( { error: { code: "STAFF_TERMINATION_FAILED", message: error.message || "Falha ao desligar colaborador." } }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-offboarding-service.ts:68](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L68>) (GymOffboardingService.offboardStaffWithHandover): consultas/escritas ` tx.gymClassSession.findMany {where: { workspaceId, instructorStaffId: memberId, startsAt: { gte: now }, status: GymClassSessionStatus.SCHEDULED, }} `; ` tx.gymClassSession.updateMany {where: { id: { in: futureSessionIds } }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados this.staffService.offboardStaffMember

### GET /api/gym/students/check-duplicate

- **Arquivo:** [src/app/api/gym/students/check-duplicate/route.ts:9](<../../../src/app/api/gym/students/check-duplicate/route.ts#L9>); linhas 9–47.
- **Finalidade implementada:** Consultar/obter dados por gymStudentService.checkDuplicate; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/students/students-client.tsx](<../../../src/app/(gym)/gym/students/students-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("cpf") `; ` searchParams.get("email") `; ` searchParams.get("phone") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymStudentService.checkDuplicate(context.workspaceId, { cpf, email, phone, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao verificar duplicidade." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-student-service.ts:373](<../../../src/modules/workspaces/application/gym-student-service.ts#L373>) (GymStudentService.checkDuplicate): consultas/escritas ` prisma.user.findFirst {where: { OR: orConditions }} `; ` prisma.workspaceMember.findFirst {where: { workspaceId, userId: existingUser.id, }} `; paginação/ordem sem paginação direta; efeitos delegados GymStudentService.maskEmail, GymStudentService.maskCpf

### GET /api/gym/students

- **Arquivo:** [src/app/api/gym/students/route.ts:9](<../../../src/app/api/gym/students/route.ts#L9>); linhas 9–57.
- **Finalidade implementada:** Consultar/obter dados por gymStudentService.listStudents; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/students/students-client.tsx](<../../../src/app/(gym)/gym/students/students-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("page") `; ` searchParams.get("limit") `; ` searchParams.get("search") `; ` searchParams.get("unitId") `; ` searchParams.get("assignedStaffId") `; ` searchParams.get("status") `; ` searchParams.get("plan") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymStudentService.listStudents({ workspaceId: context.workspaceId, actorContext: context, page, limit, search, unitId, assignedStaffId, status, plan, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar alunos." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-student-service.ts:97](<../../../src/modules/workspaces/application/gym-student-service.ts#L97>) (GymStudentService.listStudents): consultas/escritas ` prisma.workspaceMember.findMany {where} `; ` prisma.workspaceMember.count {where} `; paginação/ordem ` take: safeLimit `; ` orderBy: [{ createdAt: "desc" }] `; efeitos delegados não identificados

### POST /api/gym/students

- **Arquivo:** [src/app/api/gym/students/route.ts:60](<../../../src/app/api/gym/students/route.ts#L60>); linhas 60–111.
- **Finalidade implementada:** Executar a operação de gymStudentService.registerStudent; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/students/students-client.tsx](<../../../src/app/(gym)/gym/students/students-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymStudentService.registerStudent({ workspaceId: context.workspaceId, actorUserId: context.userId, existingUserId: body.existingUserId || null, name: body.name, email: body.email || null, cpfCnpj: body.cpfCnpj || null, whatsapp: body.whatsapp || null, birthDate: body.birthDate || null, gender: body.gender || null, unitId: body.unitId || null, assignedStaffId: body.assignedStaffId || null, plan: body.plan || "Mensal", modality: body.modality || "PRESENCIAL", registrationNumber: body.registrationNumber || null, emergencyContactName: body.emergencyContactName || null, emergencyContactPhone: body.emergencyContactPhone || null, medicalClearance: Boolean(body.medicalClearance), medicalClearanceExpiresAt: body.medicalClearanceExpiresAt || null, notes: body.notes || null, guardian: body.guardian || null, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao cadastrar aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-student-service.ts:478](<../../../src/modules/workspaces/application/gym-student-service.ts#L478>) (GymStudentService.registerStudent): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` prisma.workspaceMember.count {where: { workspaceId, role: "STUDENT", isActive: true }} `; ` prisma.gymUnit.findFirst {where: { id: unitId, workspaceId, isActive: true }} `; ` prisma.workspaceMember.findFirst {where: { id: assignedStaffId, workspaceId, isActive: true, role: { not: "STUDENT" }, }} `; ` tx.user.findUnique {where: { id: existingUserId }} `; ` tx.workspaceMember.findFirst {where: { workspaceId, userId: existingUserId }} `; ` tx.user.update {where: { id: targetUserId }} `; ` tx.user.findUnique {where: { email: normalizedEmail }} `; ` tx.user.create `; ` tx.workspaceMember.create `; ` tx.gymGuardian.create `; ` tx.gymStudentProfile.create `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados MinorService.cleanCpf

### POST /api/gym/students/[id]/cancel

- **Arquivo:** [src/app/api/gym/students/[id]/cancel/route.ts:12](<../../../src/app/api/gym/students/[id]/cancel/route.ts#L12>); linhas 12–56.
- **Finalidade implementada:** Executar a operação de GymOffboardingService.cancelStudentWithHardwarePurge; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "workspace.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: studentMemberId } = await params `; ` req.json() `; ` { workspaceId, reason, immediate = true } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !reason || typeof reason !== "string" `; ` accessError `
- **Chamadas e efeitos delegados:** ` GymOffboardingService.cancelStudentWithHardwarePurge({ workspaceId: context.workspaceId, studentMemberId, actorUserId: context.userId, reason, immediate, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "REASON_REQUIRED", message: "Motivo do cancelamento do aluno é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ data: result }) `; ` NextResponse.json( { error: { code: "STUDENT_CANCEL_FAILED", message: error.message || "Falha ao cancelar aluno." } }, { status: 400 } ) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-offboarding-service.ts:187](<../../../src/modules/workspaces/application/gym-offboarding-service.ts#L187>) (GymOffboardingService.cancelStudentWithHardwarePurge): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.gymAccessDevice.findMany {where: { workspaceId, isActive: true, ...(studentMember.unitId ? { unitId: studentMember.unitId } : {}), }} `; ` tx.gymEnrollment.update {where: { id: enrollment.id }} `; ` tx.gymEnrollmentEvent.create `; ` tx.gymAccessGrant.update {where: { id: grant.id }} `; ` tx.gymDeviceCommand.create `; ` tx.gymClassBooking.updateMany {where: { studentMemberId: studentMember.id, status: GymClassBookingStatus.CONFIRMED, session: { startsAt: { gte: now }, }, }} `; ` tx.gymStudentProfile.updateMany {where: { memberId: studentMember.id }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/students/[id]/evaluations

- **Arquivo:** [src/app/api/gym/students/[id]/evaluations/route.ts:8](<../../../src/app/api/gym/students/[id]/evaluations/route.ts#L8>); linhas 8–47.
- **Finalidade implementada:** Consultar/obter dados por gymAssessmentService.listStudentPhysicalEvaluations; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["health.read.assigned", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAssessmentService.listStudentPhysicalEvaluations({ workspaceId: context.workspaceId, studentMemberId: id, requestorUserId: context.userId, requestorRoles: context.roles }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ evaluations }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao buscar avaliações físicas do aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-assessment-service.ts:155](<../../../src/modules/workspaces/application/gym-assessment-service.ts#L155>) (GymAssessmentService.listStudentPhysicalEvaluations): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.physicalEvaluation.findMany {where: { workspaceId, studentId: member.userId }} `; paginação/ordem ` orderBy: { date: "desc" } `; efeitos delegados não identificados

### POST /api/gym/students/[id]/evaluations

- **Arquivo:** [src/app/api/gym/students/[id]/evaluations/route.ts:49](<../../../src/app/api/gym/students/[id]/evaluations/route.ts#L49>); linhas 49–116.
- **Finalidade implementada:** Executar a operação de gymAssessmentService.createPhysicalEvaluation; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["health.manage.assigned", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, type, weight, height, bodyFat, muscleMass, dobras, anamnese, circunferencias, postural, dorMobilidade, testesFisicos, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAssessmentService.createPhysicalEvaluation({ workspaceId: context.workspaceId, studentMemberId: id, evaluatorUserId: context.userId, type, weight: Number(weight), height: Number(height), bodyFat: bodyFat !== undefined && bodyFat !== null ? Number(bodyFat) : null, muscleMass: muscleMass !== undefined && muscleMass !== null ? Number(muscleMass) : null, dobras, anamnese, circunferencias, postural, dorMobilidade, testesFisicos, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { success: true, message: "Avaliação física registrada com sucesso.", evaluation }, { status: 201 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao registrar avaliação física." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-assessment-service.ts:74](<../../../src/modules/workspaces/application/gym-assessment-service.ts#L74>) (GymAssessmentService.createPhysicalEvaluation): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.physicalEvaluation.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/students/[id]/files

- **Arquivo:** [src/app/api/gym/students/[id]/files/route.ts:8](<../../../src/app/api/gym/students/[id]/files/route.ts#L8>); linhas 8–47.
- **Finalidade implementada:** Consultar/obter dados por gymAssessmentService.listStudentFiles; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["students.read", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAssessmentService.listStudentFiles({ workspaceId: context.workspaceId, studentMemberId: id, requestorUserId: context.userId, requestorRoles: context.roles }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ files }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao buscar arquivos do aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-assessment-service.ts:313](<../../../src/modules/workspaces/application/gym-assessment-service.ts#L313>) (GymAssessmentService.listStudentFiles): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.studentFile.findMany {where} `; paginação/ordem ` orderBy: { createdAt: "desc" } `; efeitos delegados não identificados

### POST /api/gym/students/[id]/files

- **Arquivo:** [src/app/api/gym/students/[id]/files/route.ts:49](<../../../src/app/api/gym/students/[id]/files/route.ts#L49>); linhas 49–112.
- **Finalidade implementada:** Executar a operação de gymAssessmentService.uploadStudentFile; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["students.manage", "health.manage.assigned", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, name, category, type = "file", url, fileName, fileSizeFormatted, sizeInBytes, mimeType, objectKey, notes } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymAssessmentService.uploadStudentFile({ workspaceId: context.workspaceId, studentMemberId: id, uploadedByUserId: context.userId, name, category, type, url, fileName, fileSizeFormatted, sizeInBytes: sizeInBytes ? Number(sizeInBytes) : null, mimeType, objectKey, notes }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { success: true, message: "Arquivo anexado com sucesso.", file }, { status: 201 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao anexar arquivo." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-assessment-service.ts:235](<../../../src/modules/workspaces/application/gym-assessment-service.ts#L235>) (GymAssessmentService.uploadStudentFile): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.studentFile.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/students/[id]/guardians

- **Arquivo:** [src/app/api/gym/students/[id]/guardians/route.ts:9](<../../../src/app/api/gym/students/[id]/guardians/route.ts#L9>); linhas 9–46.
- **Finalidade implementada:** Consultar/obter dados por minorService.listStudentGuardians; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) `.
- **Entradas, filtros e paginação:** ` { id: studentMemberId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` minorService.listStudentGuardians( context.workspaceId, studentMemberId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(guardians) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao listar responsáveis." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/minor-service.ts:352](<../../../src/modules/workspaces/application/minor-service.ts#L352>) (MinorService.listStudentGuardians): consultas/escritas ` prisma.gymGuardian.findMany {where: { workspaceId, studentMemberId, revokedAt: null, }} `; paginação/ordem ` orderBy: [{ isLegalRepresentative: "desc" }, { createdAt: "asc" }] `; efeitos delegados não identificados

### POST /api/gym/students/[id]/guardians

- **Arquivo:** [src/app/api/gym/students/[id]/guardians/route.ts:49](<../../../src/app/api/gym/students/[id]/guardians/route.ts#L49>); linhas 49–97.
- **Finalidade implementada:** Executar a operação de minorService.addGuardian; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.manage"], }) `.
- **Entradas, filtros e paginação:** ` { id: studentMemberId } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` minorService.addGuardian({ workspaceId: context.workspaceId, studentMemberId, actorUserId: context.userId, name: body.name, cpf: body.cpf, phone: body.phone, email: body.email, relationship: body.relationship, isLegalRepresentative: body.isLegalRepresentative, isFinancialResponsible: body.isFinancialResponsible, isEmergencyContact: body.isEmergencyContact, hasHealthAccess: body.hasHealthAccess, guardianUserId: body.guardianUserId, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(guardian, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao vincular responsável." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/minor-service.ts:52](<../../../src/modules/workspaces/application/minor-service.ts#L52>) (MinorService.addGuardian): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.user.findFirst {where: { cpfCnpj: cleanedCpf }} `; ` tx.gymGuardian.create `; ` tx.workspaceMember.update {where: { id: studentMemberId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados MinorService.cleanCpf

### GET /api/gym/students/[id]

- **Arquivo:** [src/app/api/gym/students/[id]/route.ts:9](<../../../src/app/api/gym/students/[id]/route.ts#L9>); linhas 9–47.
- **Finalidade implementada:** Consultar/obter dados por gymStudentService.getStudentById; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/students/students-client.tsx](<../../../src/app/(gym)/gym/students/students-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) `.
- **Entradas, filtros e paginação:** ` { id: memberId } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymStudentService.getStudentById( context.workspaceId, memberId, context ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(student) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao obter detalhes do aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-student-service.ts:272](<../../../src/modules/workspaces/application/gym-student-service.ts#L272>) (GymStudentService.getStudentById): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: memberId, workspaceId, role: "STUDENT", }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### PATCH /api/gym/students/[id]

- **Arquivo:** [src/app/api/gym/students/[id]/route.ts:50](<../../../src/app/api/gym/students/[id]/route.ts#L50>); linhas 50–103.
- **Finalidade implementada:** Executar a operação de gymStudentService.updateStudent; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/students/students-client.tsx](<../../../src/app/(gym)/gym/students/students-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, requiredCapabilities: ["students.read"], }) `.
- **Entradas, filtros e paginação:** ` { id: memberId } = await params `; ` req.json() `; ` { workspaceId } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymStudentService.updateStudent({ workspaceId: context.workspaceId, memberId, actorContext: context, name: body.name, whatsapp: body.whatsapp, birthDate: body.birthDate, unitId: body.unitId, assignedStaffId: body.assignedStaffId, plan: body.plan, modality: body.modality, isActive: body.isActive, registrationNumber: body.registrationNumber, emergencyContactName: body.emergencyContactName, emergencyContactPhone: body.emergencyContactPhone, medicalClearance: body.medicalClearance, medicalClearanceExpiresAt: body.medicalClearanceExpiresAt, notes: body.notes, status: body.status, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Erro ao atualizar dados do aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, body.status, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-student-service.ts:744](<../../../src/modules/workspaces/application/gym-student-service.ts#L744>) (GymStudentService.updateStudent): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: memberId, workspaceId, role: "STUDENT" }} `; ` prisma.gymUnit.findFirst {where: { id: unitId, workspaceId, isActive: true }} `; ` prisma.workspaceMember.findFirst {where: { id: assignedStaffId, workspaceId, isActive: true, role: { not: "STUDENT" } }} `; ` tx.user.update {where: { id: existingMember.userId }} `; ` tx.workspaceMember.update {where: { id: memberId }} `; ` tx.gymStudentProfile.upsert {where: { memberId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/gym/students/[id]/workouts

- **Arquivo:** [src/app/api/gym/students/[id]/workouts/route.ts:8](<../../../src/app/api/gym/students/[id]/workouts/route.ts#L8>); linhas 8–42.
- **Finalidade implementada:** Consultar/obter dados por gymWorkoutService.getStudentWorkouts; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.read", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWorkoutService.getStudentWorkouts(context.workspaceId, id) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ workouts }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao buscar treinos do aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-workout-service.ts:505](<../../../src/modules/workspaces/application/gym-workout-service.ts#L505>) (GymWorkoutService.getStudentWorkouts): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.workout.findMany {where: { workspaceId, studentId: studentMember.userId, isActive: true }} `; paginação/ordem ` orderBy: { order: "asc" } `; ` orderBy: { dayOfWeek: "asc" } `; efeitos delegados não identificados

### POST /api/gym/workouts/assign

- **Arquivo:** [src/app/api/gym/workouts/assign/route.ts:8](<../../../src/app/api/gym/workouts/assign/route.ts#L8>); linhas 8–66.
- **Finalidade implementada:** Executar a operação de gymWorkoutService.assignWorkoutToStudent; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/workouts/workouts-client.tsx](<../../../src/app/(gym)/gym/workouts/workouts-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentMemberId, templateWorkoutId, customWorkout, dayOfWeek } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` !studentMemberId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWorkoutService.assignWorkoutToStudent({ workspaceId: context.workspaceId, studentMemberId, actorUserId: context.userId, actorMemberId: context.memberId, isManagerOrOwner, templateWorkoutId, customWorkout, dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : null }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { error: { code: "STUDENT_REQUIRED", message: "ID do aluno é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json( { success: true, message: "Treino atribuído com sucesso.", workout: assigned }, { status: 201 } ) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao prescrever treino ao aluno." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-workout-service.ts:360](<../../../src/modules/workspaces/application/gym-workout-service.ts#L360>) (GymWorkoutService.assignWorkoutToStudent): consultas/escritas ` prisma.workspaceMember.findFirst {where: { id: studentMemberId, workspaceId }} `; ` prisma.workout.findFirst {where: { id: templateWorkoutId, workspaceId, studentId: null, isActive: true }} `; ` prisma.workout.create `; ` prisma.auditLog.create `; paginação/ordem ` orderBy: { order: "asc" } `; efeitos delegados não identificados

### GET /api/gym/workouts/templates

- **Arquivo:** [src/app/api/gym/workouts/templates/route.ts:8](<../../../src/app/api/gym/workouts/templates/route.ts#L8>); linhas 8–50.
- **Finalidade implementada:** Consultar/obter dados por gymWorkoutService.listGymTemplates; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/workouts/workouts-client.tsx](<../../../src/app/(gym)/gym/workouts/workouts-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.read", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `; ` searchParams.get("search") `; ` searchParams.get("goal") `; ` searchParams.get("difficulty") `; ` searchParams.get("page") `; ` searchParams.get("limit") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWorkoutService.listGymTemplates({ workspaceId: context.workspaceId, search, goal, difficulty, page, limit }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao listar templates de treino." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-workout-service.ts:84](<../../../src/modules/workspaces/application/gym-workout-service.ts#L84>) (GymWorkoutService.listGymTemplates): consultas/escritas ` prisma.workout.count {where} `; ` prisma.workout.findMany {where} `; paginação/ordem ` take: limit `; ` orderBy: { createdAt: "desc" } `; ` orderBy: { order: "asc" } `; efeitos delegados não identificados

### POST /api/gym/workouts/templates

- **Arquivo:** [src/app/api/gym/workouts/templates/route.ts:52](<../../../src/app/api/gym/workouts/templates/route.ts#L52>); linhas 52–101.
- **Finalidade implementada:** Executar a operação de gymWorkoutService.createGymTemplate; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(gym)/gym/workouts/workouts-client.tsx](<../../../src/app/(gym)/gym/workouts/workouts-client.tsx>)
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, exercises } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWorkoutService.createGymTemplate({ workspaceId: context.workspaceId, creatorUserId: context.userId, name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, exercises: exercises || [] }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, workout }, { status: 201 }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao criar template de treino." } }, { status: 500 } ) ` Códigos/expressões status: 400, 201, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-workout-service.ts:156](<../../../src/modules/workspaces/application/gym-workout-service.ts#L156>) (GymWorkoutService.createGymTemplate): consultas/escritas ` prisma.workout.create `; ` prisma.auditLog.create `; paginação/ordem ` orderBy: { order: "asc" } `; efeitos delegados não identificados

### PATCH /api/gym/workouts/templates/[id]

- **Arquivo:** [src/app/api/gym/workouts/templates/[id]/route.ts:8](<../../../src/app/api/gym/workouts/templates/[id]/route.ts#L8>); linhas 8–66.
- **Finalidade implementada:** Executar a operação de gymWorkoutService.updateGymTemplate; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { workspaceId, name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, exercises } = body `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWorkoutService.updateGymTemplate({ workspaceId: context.workspaceId, templateId: id, actorUserId: context.userId, isManagerOrOwner, name, goal, difficulty, duration, muscleGroupLabel, restBetweenExercises, exercises }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ success: true, workout: updated }) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao atualizar template de treino." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-workout-service.ts:226](<../../../src/modules/workspaces/application/gym-workout-service.ts#L226>) (GymWorkoutService.updateGymTemplate): consultas/escritas ` prisma.workout.findFirst {where: { id: templateId, workspaceId, studentId: null }} `; ` prisma.workoutExercise.deleteMany {where: { workoutId: templateId }} `; ` prisma.workout.update {where: { id: templateId }} `; ` prisma.auditLog.create `; paginação/ordem ` orderBy: { order: "asc" } `; efeitos delegados não identificados

### DELETE /api/gym/workouts/templates/[id]

- **Arquivo:** [src/app/api/gym/workouts/templates/[id]/route.ts:68](<../../../src/app/api/gym/workouts/templates/[id]/route.ts#L68>); linhas 68–110.
- **Finalidade implementada:** Executar a operação de gymWorkoutService.deleteGymTemplate; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId, anyCapability: ["workouts.manage.assigned", "workspace.manage"] }) `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` { searchParams } = new URL(req.url) `; ` searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymWorkoutService.deleteGymTemplate( context.workspaceId, id, context.userId, isManagerOrOwner ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json(result) `; ` NextResponse.json( { error: { code: "INTERNAL_ERROR", message: "Falha ao excluir template de treino." } }, { status: 500 } ) ` Códigos/expressões status: 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-workout-service.ts:316](<../../../src/modules/workspaces/application/gym-workout-service.ts#L316>) (GymWorkoutService.deleteGymTemplate): consultas/escritas ` prisma.workout.findFirst {where: { id: templateId, workspaceId, studentId: null }} `; ` prisma.workout.update {where: { id: templateId }} `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/storage/file

- **Arquivo:** [src/app/api/storage/file/route.ts:6](<../../../src/app/api/storage/file/route.ts#L6>); linhas 6–187.
- **Finalidade implementada:** Consultar/obter dados por storageService.getObjectStream; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { searchParams } = new URL(req.url) `; ` searchParams.get("key") `; ` searchParams.get("download") `
- **Condições de validação/erros:** ` !key `; ` !isPublic `; ` !session?.user `; ` !isPublic && userId `; ` workspaceIndex !== -1 && parts[workspaceIndex + 1] `; ` !isTrainer `; ` isChatAttachment `; ` !isWorkspaceMember `; ` studentsIndex !== -1 && parts[studentsIndex + 1] `; ` dbFile `; ` !isSelfStudent `; ` dbFile && dbFile.studentId !== userId `; ` studentWorkspaceMember `; ` !isTrainer `; ` !fileObject.body `; ` fileObject.contentRange `; ` fileObject.contentLength !== undefined && fileObject.contentLength !== null `; ` fileObject.eTag `; ` fileObject.lastModified `; ` isPublic `; ` download === "true" `; ` error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404 `; ` error.name === "InvalidRange" || error.$metadata?.httpStatusCode === 416 `
- **Chamadas e efeitos delegados:** ` storageService.getObjectStream(key, rangeHeader) `
- **Entidades diretas:** workspaceMember, studentFile
- **Respostas e códigos locais:** Resposta delegada/Response customizada. Códigos/expressões status: 400, 401, 403, 404, fileObject.statusCode || 200, 416, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/storage/presigned

- **Arquivo:** [src/app/api/storage/presigned/route.ts:43](<../../../src/app/api/storage/presigned/route.ts#L43>); linhas 43–205.
- **Finalidade implementada:** Executar a operação de storageService.getPresignedUploadUrl; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(personal)/personal/clients/[id]/page.tsx](<../../../src/app/(personal)/personal/clients/[id]/page.tsx>); [src/app/(personal)/personal/crm/page.tsx](<../../../src/app/(personal)/personal/crm/page.tsx>); [src/app/(personal)/personal/engage/page.tsx](<../../../src/app/(personal)/personal/engage/page.tsx>); [src/app/(personal)/personal/files/page.tsx](<../../../src/app/(personal)/personal/files/page.tsx>); [src/app/(personal)/personal/settings/page.tsx](<../../../src/app/(personal)/personal/settings/page.tsx>); [src/app/(student)/student/evolution/page.tsx](<../../../src/app/(student)/student/evolution/page.tsx>); [src/app/(student)/student/settings/page.tsx](<../../../src/app/(student)/student/settings/page.tsx>); [src/app/(superadmin)/superadmin/credits/page.tsx](<../../../src/app/(superadmin)/superadmin/credits/page.tsx>); [src/app/(superadmin)/superadmin/engage/page.tsx](<../../../src/app/(superadmin)/superadmin/engage/page.tsx>); [src/app/(superadmin)/superadmin/subscriptions/page.tsx](<../../../src/app/(superadmin)/superadmin/subscriptions/page.tsx>); [src/app/personal-onboarding/page.tsx](<../../../src/app/personal-onboarding/page.tsx>); [src/components/application/physical-evaluation-form-modal.tsx](<../../../src/components/application/physical-evaluation-form-modal.tsx>); [src/components/chat/ChatContainer.tsx](<../../../src/components/chat/ChatContainer.tsx>); [src/components/chat/MassMessageModal.tsx](<../../../src/components/chat/MassMessageModal.tsx>); [src/components/chat/ShareAttachmentModals.tsx](<../../../src/components/chat/ShareAttachmentModals.tsx>); [src/components/engage/push-notifications-studio.tsx](<../../../src/components/engage/push-notifications-studio.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { workspaceId, studentId, fileName, contentType, fileSize, targetType } = body `
- **Condições de validação/erros:** ` !session?.user `; ` !fileName || !contentType || !fileSize || !targetType `; ` workspaceId && targetType !== "campaign" && targetType !== "campaign_banner" `; ` !quotaCheck.allowed `; ` fileSize > sizeLimit `; ` !allowedTypes.includes(cleanContentType) `; ` ["logo", "watermark", "workout_cover", "student_file", "chat_attachment"].includes(targetType) `; ` !workspaceId `; ` !member `; ` targetType === "progress_photo" `; ` !workspaceId || !studentId `; ` !studentMembership `; ` !isSelf && !isTrainer `; ` targetType === "avatar" `; ` targetType === "campaign" `; ` userObj?.role !== "SUPERADMIN" `
- **Chamadas e efeitos delegados:** ` storageService.getPresignedUploadUrl(key, contentType) `
- **Entidades diretas:** workspaceMember, user
- **Respostas e códigos locais:** ` NextResponse.json( { error: "STORAGE_EXCEEDED", message: quotaCheck.message || "Armazenamento lotado. Faça upgrade do seu plano para enviar mais arquivos." }, { status: 400 } ) `; ` NextResponse.json({ uploadUrl, fileUrl, objectKey: key, }) ` Códigos/expressões status: 401, 400, 403, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### GET /api/student/classes

- **Arquivo:** [src/app/api/student/classes/route.ts:8](<../../../src/app/api/student/classes/route.ts#L8>); linhas 8–48.
- **Finalidade implementada:** Consultar/obter dados por gymBookingService.listAvailableClassesForStudent; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` requireWorkspaceAccess({ workspaceId }) `.
- **Entradas, filtros e paginação:** ` url.searchParams.get("workspaceId") `
- **Condições de validação/erros:** ` !workspaceId `; ` accessError `
- **Chamadas e efeitos delegados:** ` gymBookingService.listAvailableClassesForStudent( context.workspaceId, context.memberId ) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json( { error: { code: "WORKSPACE_REQUIRED", message: "ID do workspace é obrigatório." } }, { status: 400 } ) `; ` NextResponse.json({ classes, studentMemberId: context.memberId }) `; ` NextResponse.json( { error: { code: (error as any).code || "INTERNAL_ERROR", message: (error as any).message || "Erro ao consultar aulas disponíveis." } }, { status: (error as any).statusCode || 500 } ) ` Códigos/expressões status: 400, (error as any).statusCode || 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-booking-service.ts:999](<../../../src/modules/workspaces/application/gym-booking-service.ts#L999>) (GymBookingService.listAvailableClassesForStudent): consultas/escritas ` prisma.gymClassSession.findMany {where: { workspaceId, sessionDate: { gte: fromDate, lte: toDate }, status: { not: GymClassSessionStatus.CANCELLED } }} `; paginação/ordem ` orderBy: { startsAt: "asc" } `; efeitos delegados não identificados

### GET /api/student/dashboard

- **Arquivo:** [src/app/api/student/dashboard/route.ts:6](<../../../src/app/api/student/dashboard/route.ts#L6>); linhas 6–515.
- **Finalidade implementada:** Consultar/obter dados por /api/student/dashboard; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(student)/student/dashboard/page.tsx](<../../../src/app/(student)/student/dashboard/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { streak, bestStreak: calculatedBestStreak } = await verifyAndDecayWorkspaceMemberStreak( member, workoutLogs.map((log) => log.completedAt) ) `
- **Condições de validação/erros:** ` !session?.user `; ` !member `; ` hasOverdue `; ` hasPending `; ` progressHistory.length > 1 `; ` firstWeight && lastWeight `; ` progressPhotos.some(p => p.comment) `; ` photoWithComment?.comment `; ` alerts.length === 0 `; ` !hasRecentPhoto `; ` !hasRecentProgress `; ` !dailyFeedbackToday `; ` !isCompletedToday `; ` !log.loads || typeof log.loads !== "object" `; ` we.exercise?.name `; ` !exerciseName || !Array.isArray(setLoads) `; ` !loadStr `; ` numericLoad > maxLoadInLog `; ` maxLoadInLog > 0 `; ` !existing `; ` maxLoadInLog > existing.maxLoad `; ` req.messages.length > 0 `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** workspaceMember, user, workout, studentProgress, physicalEvaluation, workoutLog, exerciseAdjustmentRequest, studentProgressPhoto, dailyFeedback, workspacePayment, notification
- **Respostas e códigos locais:** ` NextResponse.json(payload) ` Códigos/expressões status: 401, 404, paymentStatus, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### DELETE /api/student/finance/recurrence

- **Arquivo:** [src/app/api/student/finance/recurrence/route.ts:6](<../../../src/app/api/student/finance/recurrence/route.ts#L6>); linhas 6–29.
- **Finalidade implementada:** Executar a operação de paymentService.cancelStudentSubscription; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(student)/student/finance/page.tsx](<../../../src/app/(student)/student/finance/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user?.id `; ` !studentMember `
- **Chamadas e efeitos delegados:** ` paymentService.cancelStudentSubscription(studentUserId, studentMember.workspaceId) `
- **Entidades diretas:** workspaceMember
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Não autorizado" }, { status: 401 }) `; ` NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 }) `; ` NextResponse.json({ success: true, message: "Recorrência cancelada com sucesso!" }) `; ` NextResponse.json({ error: msg }, { status: 500 }) ` Códigos/expressões status: 401, 404, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/payments/application/payment-service.ts:761](<../../../src/modules/payments/application/payment-service.ts#L761>) (PaymentService.cancelStudentSubscription): consultas/escritas ` prisma.workspaceMember.findFirst {where: { userId: studentUserId, workspaceId, role: "STUDENT" }} `; ` prisma.paymentProviderAccount.findUnique {where: { personalUserId: member.workspace.ownerId }} `; ` prisma.workspaceMember.update {where: { id: member.id }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/student/finance

- **Arquivo:** [src/app/api/student/finance/route.ts:16](<../../../src/app/api/student/finance/route.ts#L16>); linhas 16–228.
- **Finalidade implementada:** Consultar/obter dados por /api/student/finance; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(student)/student/finance/page.tsx](<../../../src/app/(student)/student/finance/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user?.id `; ` !rateLimitResult.allowed `; ` !billing.providerBillingId || !billing.account?.providerAccountId `; ` remotePayment && ["RECEIVED", "CONFIRMED", "DUNNING_RECEIVED", "RECEIVED_IN_CASH"].includes(remotePayment.status) `; ` nextStatus `; ` !studentMember `; ` studentMember && studentMember.user?.name `; ` billing.account?.personalUserId `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** studentBilling, walletLedgerEntry, workspaceMember
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Não autorizado" }, { status: 401 }) `; ` NextResponse.json({ workspaceName: studentMember?.workspace?.name || "AtlasFit Workspace", activePlan: { name: "Consultoria AtlasFit", status: studentMember?.isActive ? "ATIVO" : "INATIVO", nextDueDate }, activeRecurrence, pendingBillings, paidBillings }) `; ` NextResponse.json({ error: msg }, { status: 500 }) ` Códigos/expressões status: 401, StudentBillingStatus.PENDING, b.status, studentMember?.isActive ? "ATIVO" : "INATIVO", 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/superadmin/asaas/disable-messaging

- **Arquivo:** [src/app/api/superadmin/asaas/disable-messaging/route.ts:6](<../../../src/app/api/superadmin/asaas/disable-messaging/route.ts#L6>); linhas 6–64.
- **Finalidade implementada:** Executar a operação de /api/superadmin/asaas/disable-messaging; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user || session.user.role !== "SUPERADMIN" `; ` !account?.providerAccountId `; ` res.ok `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** gatewayCustomer, paymentProviderAccount
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Acesso negado." }, { status: 403 }) `; ` NextResponse.json({ success: true, processedCount: customers.length, successCount, failedCount }) `; ` NextResponse.json({ error: msg }, { status: 500 }) ` Códigos/expressões status: 403, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/superadmin/asaas/provision-subaccount-key

- **Arquivo:** [src/app/api/superadmin/asaas/provision-subaccount-key/route.ts:35](<../../../src/app/api/superadmin/asaas/provision-subaccount-key/route.ts#L35>); linhas 35–75.
- **Finalidade implementada:** Executar a operação de /api/superadmin/asaas/provision-subaccount-key; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { encrypted, keyVersion } = encryptSubAccountApiKey(rawKey) `
- **Condições de validação/erros:** ` !session?.user?.id || session.user.role !== "SUPERADMIN" `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** paymentProviderAccount
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 }) `; ` NextResponse.json({ total: accounts.length, results }) ` Códigos/expressões status: 403.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### PUT /api/superadmin/asaas/provision-subaccount-key

- **Arquivo:** [src/app/api/superadmin/asaas/provision-subaccount-key/route.ts:77](<../../../src/app/api/superadmin/asaas/provision-subaccount-key/route.ts#L77>); linhas 77–113.
- **Finalidade implementada:** Executar a operação de /api/superadmin/asaas/provision-subaccount-key; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { encrypted, keyVersion } = encryptSubAccountApiKey(rawKey) `
- **Condições de validação/erros:** ` !session?.user?.id || session.user.role !== "SUPERADMIN" `; ` !body.providerAccountDbId `; ` !account `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** paymentProviderAccount
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 }) `; ` NextResponse.json({ error: "providerAccountDbId obrigatório" }, { status: 400 }) `; ` NextResponse.json({ error: "Conta não encontrada" }, { status: 404 }) `; ` NextResponse.json({ id: account.id, action: "rotated" }) `; ` NextResponse.json({ error: msg }, { status: 500 }) ` Códigos/expressões status: 403, 400, 404, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/superadmin/asaas/reconcile-fee-recovery

- **Arquivo:** [src/app/api/superadmin/asaas/reconcile-fee-recovery/route.ts:8](<../../../src/app/api/superadmin/asaas/reconcile-fee-recovery/route.ts#L8>); linhas 8–146.
- **Finalidade implementada:** Executar a operação de /api/superadmin/asaas/reconcile-fee-recovery; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user?.id || session.user.role !== "SUPERADMIN" `; ` !op.account.providerApiKeyEncrypted `; ` !asaasTransfer `; ` asaasStatus === "DONE" || asaasStatus === "CONFIRMED" `; ` currentOp?.status === "COMPLETED" `; ` account `; ` asaasStatus === "FAILED" || asaasStatus === "CANCELLED" `; ` account `; ` asaasStatus === "BLOCKED" || asaasStatus === "PENDING" || asaasStatus === "IN_BANK_PROCESSING" `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** activationFeeRecoveryOperation, paymentProviderAccount, walletLedgerEntry
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 }) `; ` NextResponse.json({ reconciled: results.length, results }) ` Códigos/expressões status: 403, { in: ["SUBMITTED", "RECONCILING", "BLOCKED"] }, "COMPLETED", asaasStatus === "CANCELLED" ? "CANCELLED" : "FAILED", "BLOCKED".
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### GET /api/superadmin/asaas

- **Arquivo:** [src/app/api/superadmin/asaas/route.ts:9](<../../../src/app/api/superadmin/asaas/route.ts#L9>); linhas 9–229.
- **Finalidade implementada:** Consultar/obter dados por /api/superadmin/asaas; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/asaas/page.tsx](<../../../src/app/(superadmin)/superadmin/asaas/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !session?.user?.id || session.user.role !== "SUPERADMIN" `; ` b.status === StudentBillingStatus.SETTLED || b.status === StudentBillingStatus.CONFIRMED `; ` monthlyMap.has(key) `; ` b.status === StudentBillingStatus.SETTLED || b.status === StudentBillingStatus.CONFIRMED `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** paymentProviderAccount, user, studentBilling, paymentWebhookEvent
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Acesso restrito a SuperAdmin" }, { status: 403 }) `; ` NextResponse.json({ environment: process.env.ASAAS_ENVIRONMENT || "sandbox", masterAvailableInCents, summary: { totalGrossMovedInCents: totalGrossMovedInCents.toString(), totalPlatformFeeInCents: totalPlatformFeeInCents.toString(), totalPersonalNetInCents: totalPersonalNetInCents.toString(), totalPendingInCents: totalPendingInCents.toString(), totalPayoutsCompletedInCents: totalPayoutsCompletedInCents.toString(), totalPayoutsProcessingInCents: totalPayoutsProcessingInCents.toString(), totalSubaccountsCount, approvedSubaccountsCount, pendingSubaccountsCount, rejectedSubaccountsCount, activeMoverAccounts, avgVolumePerSubaccountInCents, }, subaccountsList, monthlyChartData, paymentMethodsData, statusBreakdownData, recentEvents: recentEvents.map((e) => ({ ...e, queuedAt: e.queuedAt ? e.queuedAt.toISOString() : new Date().toISOString(), processedAt: e.processedAt ? e.processedAt.toISOString() : null })) }) `; ` NextResponse.json({ error: message }, { status: 500 }) ` Códigos/expressões status: 403, acc.status, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### GET /api/superadmin/gym-settings

- **Arquivo:** [src/app/api/superadmin/gym-settings/route.ts:6](<../../../src/app/api/superadmin/gym-settings/route.ts#L6>); linhas 6–20.
- **Finalidade implementada:** Consultar/obter dados por GymFeatureFlagsService.getGymGlobalConfigs; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/gym-settings/page.tsx](<../../../src/app/(superadmin)/superadmin/gym-settings/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" `
- **Chamadas e efeitos delegados:** ` GymFeatureFlagsService.getGymGlobalConfigs() `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }) `; ` NextResponse.json(configs) `; ` NextResponse.json({ error: "Erro interno ao carregar configurações." }, { status: 500 }) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-feature-flags-service.ts:79](<../../../src/modules/workspaces/application/gym-feature-flags-service.ts#L79>) (GymFeatureFlagsService.getGymGlobalConfigs): consultas/escritas ` prisma.systemSetting.findMany {where: { key: { startsWith: "gym_" }, }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### PATCH /api/superadmin/gym-settings

- **Arquivo:** [src/app/api/superadmin/gym-settings/route.ts:22](<../../../src/app/api/superadmin/gym-settings/route.ts#L22>); linhas 22–52.
- **Finalidade implementada:** Executar a operação de GymFeatureFlagsService.updateGymGlobalConfigs, GymFeatureFlagsService.getGymGlobalConfigs; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/gym-settings/page.tsx](<../../../src/app/(superadmin)/superadmin/gym-settings/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { configs, reason } = body `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" || !session.user?.id `; ` !configs || typeof configs !== "object" `
- **Chamadas e efeitos delegados:** ` GymFeatureFlagsService.updateGymGlobalConfigs(configs, session.user.id, reason) `; ` GymFeatureFlagsService.getGymGlobalConfigs() `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Acesso não autorizado." }, { status: 401 }) `; ` NextResponse.json({ error: "Payload de configurações inválido." }, { status: 400 }) `; ` NextResponse.json({ success: true, message: "Configurações globais de academias atualizadas com sucesso.", configs: updated, }) `; ` NextResponse.json( { error: error?.message || "Erro interno ao salvar configurações." }, { status: 500 } ) ` Códigos/expressões status: 401, 400, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/gym-feature-flags-service.ts:120](<../../../src/modules/workspaces/application/gym-feature-flags-service.ts#L120>) (GymFeatureFlagsService.updateGymGlobalConfigs): consultas/escritas ` tx.systemSetting.upsert {where: { key: entry.key }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/gym-feature-flags-service.ts:79](<../../../src/modules/workspaces/application/gym-feature-flags-service.ts#L79>) (GymFeatureFlagsService.getGymGlobalConfigs): consultas/escritas ` prisma.systemSetting.findMany {where: { key: { startsWith: "gym_" }, }} `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/superadmin/impersonate

- **Arquivo:** [src/app/api/superadmin/impersonate/route.ts:8](<../../../src/app/api/superadmin/impersonate/route.ts#L8>); linhas 8–79.
- **Finalidade implementada:** Executar a operação de /api/superadmin/impersonate; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/users/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/users/[id]/page.tsx>); [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** `` auth(); rateLimit(`impersonate:${session.user.id}:${ip}`, 10, 60000) ``.
- **Entradas, filtros e paginação:** ` req.json() `; ` { targetUserId, reason } = body `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" || !session?.user?.id `; ` !limiter.success `; ` !targetUserId `; ` !reason || typeof reason !== "string" || reason.trim().length < 5 `; ` !targetUser || !targetUser.email `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** user, verificationToken
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Não autorizado." }, { status: 401 }) `; ` NextResponse.json({ error: "Muitas requisições. Tente novamente mais tarde." }, { status: 429, headers: { "X-RateLimit-Limit": String(limiter.limit), "X-RateLimit-Remaining": String(limiter.remaining), "X-RateLimit-Reset": String(limiter.reset), }, }) `; ` NextResponse.json({ error: "O ID do usuário alvo é obrigatório." }, { status: 400 }) `; ` NextResponse.json({ error: "A justificativa/motivo do impersonation é obrigatória (mínimo de 5 caracteres) para fins de auditoria e conformidade de segurança.", }, { status: 400 }) `; ` NextResponse.json({ error: "Usuário alvo não encontrado ou não possui e-mail cadastrado." }, { status: 404 }) `; ` NextResponse.json({ token, email: targetUser.email }, { status: 200 }) `; ` NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 }) ` Códigos/expressões status: 401, 429, 400, 404, 200, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### PATCH /api/superadmin/payments/[id]

- **Arquivo:** [src/app/api/superadmin/payments/[id]/route.ts:7](<../../../src/app/api/superadmin/payments/[id]/route.ts#L7>); linhas 7–53.
- **Finalidade implementada:** Executar a operação de NotificationService.sendToSuperAdmins; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { status } = body `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" `; ` !id `; ` !status || !["pago", "pendente", "atrasado"].includes(status) `
- **Chamadas e efeitos delegados:** `` NotificationService.sendToSuperAdmins({ type: NotificationType.PAYMENT_CONFIRMED, category: NotificationCategory.FINANCE, title: "Status de Pagamento Atualizado 💳", description: `O pagamento no valor de R$ ${updatedPayment.amount.toFixed(2)} foi marcado como "${status}".`, priority: NotificationPriority.NORMAL, deepLink: "/superadmin/financial" }) ``
- **Entidades diretas:** workspacePayment
- **Respostas e códigos locais:** ` NextResponse.json(updatedPayment, { status: 200 }) ` Códigos/expressões status: 401, 400, 200, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### DELETE /api/superadmin/payments/[id]

- **Arquivo:** [src/app/api/superadmin/payments/[id]/route.ts:55](<../../../src/app/api/superadmin/payments/[id]/route.ts#L55>); linhas 55–81.
- **Finalidade implementada:** Executar a operação de /api/superadmin/payments/[id]; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id } = await params `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" `; ` !id `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** workspacePayment
- **Respostas e códigos locais:** Resposta delegada/Response customizada. Códigos/expressões status: 401, 400, 200, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### GET /api/superadmin/workspaces

- **Arquivo:** [src/app/api/superadmin/workspaces/route.ts:8](<../../../src/app/api/superadmin/workspaces/route.ts#L8>); linhas 8–73.
- **Finalidade implementada:** Consultar/obter dados por /api/superadmin/workspaces; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** workspace
- **Respostas e códigos locais:** ` NextResponse.json(formattedWorkspaces) ` Códigos/expressões status: 401, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/superadmin/workspaces

- **Arquivo:** [src/app/api/superadmin/workspaces/route.ts:75](<../../../src/app/api/superadmin/workspaces/route.ts#L75>); linhas 75–127.
- **Finalidade implementada:** Executar a operação de SuperAdminGymService.provisionWorkspace, NotificationService.sendToSuperAdmins; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` req.json() `; ` { name, slug, ownerId, type, maxStudents, maxStaff, maxUnits, maxDevices } = body `; ` { SuperAdminGymService } = await import("@/modules/workspaces") `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" || !session.user.id `; ` !name || !slug || !ownerId `
- **Chamadas e efeitos delegados:** ` SuperAdminGymService.provisionWorkspace( { name, slug, ownerId, type: type || "PERSONAL", maxStudents, maxStaff, maxUnits, maxDevices, }, session.user.id ) `; `` NotificationService.sendToSuperAdmins({ type: NotificationType.SYSTEM, category: NotificationCategory.SYSTEM, title: `Novo Workspace Criado (${newWorkspace.type}) 🏢`, description: `O workspace "${newWorkspace.name}" (${newWorkspace.slug}) foi provisionado com sucesso.`, priority: NotificationPriority.NORMAL, deepLink: "/superadmin/workspaces", }) ``
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json(newWorkspace, { status: 201 }) `; ` NextResponse.json( { error: error?.message || "Internal Error" }, { status: 400 } ) ` Códigos/expressões status: 401, 400, 201.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/superadmin-service.ts:47](<../../../src/modules/workspaces/application/superadmin-service.ts#L47>) (SuperAdminGymService.provisionWorkspace): consultas/escritas ` prisma.workspace.findUnique {where: { slug: sanitizedSlug }} `; ` tx.workspace.create `; ` tx.workspaceMember.create `; ` tx.workspaceRoleGrant.create `; ` tx.auditLog.create `; ` prisma.workspaceSubscription.update {where: { id: sub.id }} `; paginação/ordem sem paginação direta; efeitos delegados BackfillService.ensureGymSettingsAndDefaultUnit, EntitlementsService.ensureWorkspaceSubscription

### GET /api/superadmin/workspaces/[id]/gym-config

- **Arquivo:** [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:7](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L7>); linhas 7–66.
- **Finalidade implementada:** Consultar/obter dados por /api/superadmin/workspaces/[id]/gym-config; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id } = await params `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" `; ` !id `; ` !workspace `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** workspace
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Não autorizado." }, { status: 401 }) `; ` NextResponse.json({ error: "ID do workspace é obrigatório." }, { status: 400 }) `; ` NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 }) `; ` NextResponse.json({ workspaceId: workspace.id, name: workspace.name, slug: workspace.slug, type: workspace.type, isActive: workspace.isActive, settings: workspace.settings, subscription: workspace.subscription, units: workspace.units, metrics: { studentsCount, staffCount, unitsCount: workspace.units.length, devicesCount: 0, }, }) `; ` NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 }) ` Códigos/expressões status: 401, 400, 404, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### PATCH /api/superadmin/workspaces/[id]/gym-config

- **Arquivo:** [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:68](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L68>); linhas 68–102.
- **Finalidade implementada:** Executar a operação de SuperAdminGymService.updateGymConfig; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { settings, subscription, reason } = body `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" || !session.user.id `; ` !id `
- **Chamadas e efeitos delegados:** ` SuperAdminGymService.updateGymConfig({ workspaceId: id, adminUserId: session.user.id, reason, settings, subscription, }) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Não autorizado." }, { status: 401 }) `; ` NextResponse.json({ error: "ID do workspace é obrigatório." }, { status: 400 }) `; ` NextResponse.json(updated) `; ` NextResponse.json( { error: error?.message || "Erro ao atualizar configuração da academia." }, { status: 400 } ) ` Códigos/expressões status: 401, 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/superadmin-service.ts:129](<../../../src/modules/workspaces/application/superadmin-service.ts#L129>) (SuperAdminGymService.updateGymConfig): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` tx.gymSettings.upsert {where: { workspaceId }} `; ` tx.workspaceSubscription.upsert {where: { workspaceId }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/superadmin/workspaces/[id]/gym-config

- **Arquivo:** [src/app/api/superadmin/workspaces/[id]/gym-config/route.ts:104](<../../../src/app/api/superadmin/workspaces/[id]/gym-config/route.ts#L104>); linhas 104–129.
- **Finalidade implementada:** Executar a operação de SuperAdminGymService.addGymUnit; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" || !session.user.id `; ` !id `
- **Chamadas e efeitos delegados:** ` SuperAdminGymService.addGymUnit(id, body, session.user.id) `
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ error: "Não autorizado." }, { status: 401 }) `; ` NextResponse.json({ error: "ID do workspace é obrigatório." }, { status: 400 }) `; ` NextResponse.json(unit, { status: 201 }) `; ` NextResponse.json( { error: error?.message || "Erro ao adicionar unidade da academia." }, { status: 400 } ) ` Códigos/expressões status: 401, 400, 201.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/superadmin-service.ts:230](<../../../src/modules/workspaces/application/superadmin-service.ts#L230>) (SuperAdminGymService.addGymUnit): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` prisma.gymUnit.create `; ` prisma.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### GET /api/superadmin/workspaces/[id]

- **Arquivo:** [src/app/api/superadmin/workspaces/[id]/route.ts:6](<../../../src/app/api/superadmin/workspaces/[id]/route.ts#L6>); linhas 6–80.
- **Finalidade implementada:** Consultar/obter dados por /api/superadmin/workspaces/[id]; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id } = await params `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" `; ` !id `; ` !workspace `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** workspace
- **Respostas e códigos locais:** ` NextResponse.json({ ...workspace, owner, studentsCount, staffCount, mrr: mrrReal, }, { status: 200 }) ` Códigos/expressões status: 401, 400, 404, 200, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### PATCH /api/superadmin/workspaces/[id]

- **Arquivo:** [src/app/api/superadmin/workspaces/[id]/route.ts:82](<../../../src/app/api/superadmin/workspaces/[id]/route.ts#L82>); linhas 82–170.
- **Finalidade implementada:** Executar a operação de OwnershipService.transferWorkspaceOwnership, BackfillService.ensureGymSettingsAndDefaultUnit, EntitlementsService.ensureWorkspaceSubscription; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** [src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx](<../../../src/app/(superadmin)/superadmin/workspaces/[id]/page.tsx>)
- **Autenticação/autorização:** ` auth() `.
- **Entradas, filtros e paginação:** ` { id } = await params `; ` req.json() `; ` { name, slug, ownerId, isActive, type } = body `; ` { OwnershipService } = await import("@/modules/workspaces") `; ` { BackfillService, EntitlementsService } = await import("@/modules/workspaces") `
- **Condições de validação/erros:** ` session?.user?.role !== "SUPERADMIN" `; ` !id `; ` !existingWorkspace `; ` slug && slug.toLowerCase() !== existingWorkspace.slug `; ` existingSlug `; ` ownerId && ownerId !== existingWorkspace.ownerId `; ` updatedWorkspace.type === "GYM" `
- **Chamadas e efeitos delegados:** ` OwnershipService.transferWorkspaceOwnership({ workspaceId: id, currentOwnerUserId: existingWorkspace.ownerId, targetUserId: ownerId, auditActorId: session.user.id, }) `; ` BackfillService.ensureGymSettingsAndDefaultUnit(id) `; ` EntitlementsService.ensureWorkspaceSubscription(id) `
- **Entidades diretas:** workspace, auditLog
- **Respostas e códigos locais:** ` NextResponse.json(updatedWorkspace, { status: 200 }) ` Códigos/expressões status: 401, 400, 404, 200, 500.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

[src/modules/workspaces/application/ownership-service.ts:69](<../../../src/modules/workspaces/application/ownership-service.ts#L69>) (OwnershipService.transferWorkspaceOwnership): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` prisma.user.findUnique {where: { id: targetUserId }} `; ` prisma.user.findUnique {where: { id: currentOwnerUserId }} `; ` tx.workspaceMember.findFirst {where: { workspaceId, userId: targetUserId, }} `; ` tx.workspaceMember.create `; ` tx.workspaceMember.update {where: { id: targetMember.id }} `; ` tx.workspaceRoleGrant.upsert {where: { memberId_role_unitId: { memberId: targetMember.id, role: "OWNER", unitId: null as any, }, }} `; ` tx.workspace.update {where: { id: workspaceId }} `; ` tx.workspaceMember.findFirst {where: { workspaceId, userId: currentOwnerUserId, }} `; ` tx.workspaceMember.update {where: { id: currentOwnerMember.id }} `; ` tx.workspaceRoleGrant.updateMany {where: { memberId: currentOwnerMember.id, role: "OWNER", revokedAt: null, }} `; ` tx.workspaceRoleGrant.upsert {where: { memberId_role_unitId: { memberId: currentOwnerMember.id, role: demoteCurrentOwnerTo, unitId: null as any, }, }} `; ` tx.auditLog.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/ownership-service.ts:245](<../../../src/modules/workspaces/application/ownership-service.ts#L245>) (OwnershipService.transferWorkspaceOwnership): consultas/escritas sem prisma/tx direto; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/backfill-service.ts:47](<../../../src/modules/workspaces/application/backfill-service.ts#L47>) (BackfillService.ensureGymSettingsAndDefaultUnit): consultas/escritas ` prisma.workspace.findUnique {where: { id: workspaceId }} `; ` prisma.gymSettings.create `; ` prisma.gymUnit.create `; paginação/ordem ` take: 1 `; efeitos delegados não identificados

[src/modules/workspaces/application/backfill-service.ts:98](<../../../src/modules/workspaces/application/backfill-service.ts#L98>) (BackfillService.ensureGymSettingsAndDefaultUnit): consultas/escritas sem prisma/tx direto; paginação/ordem sem paginação direta; efeitos delegados não identificados

[src/modules/workspaces/application/entitlements-service.ts:43](<../../../src/modules/workspaces/application/entitlements-service.ts#L43>) (EntitlementsService.ensureWorkspaceSubscription): consultas/escritas ` prisma.workspaceSubscription.findUnique {where: { workspaceId }} `; ` prisma.workspaceSubscription.create `; paginação/ordem sem paginação direta; efeitos delegados não identificados

### POST /api/webhooks/abacatepay/credits

- **Arquivo:** [src/app/api/webhooks/abacatepay/credits/route.ts:5](<../../../src/app/api/webhooks/abacatepay/credits/route.ts#L5>); linhas 5–93.
- **Finalidade implementada:** Executar a operação de /api/webhooks/abacatepay/credits; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` req.json() `
- **Condições de validação/erros:** ` !devToken || !expectedToken || !devToken.includes(expectedToken.slice(0, 20)) `; ` event !== "billing.paid" && billing?.status !== "PAID" `; ` !billingId && !metadata?.workspaceId && !metadata?.userId `; ` !purchase && metadata?.userId && metadata?.packageId `; ` !pkg `; ` existing `; ` !purchase `; ` purchase.status === "PAID" `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** creditPurchase, creditPackage, user
- **Respostas e códigos locais:** ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) `; ` NextResponse.json({ received: true }) ` Códigos/expressões status: 401, "PAID".
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/webhooks/abacatepay

- **Arquivo:** [src/app/api/webhooks/abacatepay/route.ts:8](<../../../src/app/api/webhooks/abacatepay/route.ts#L8>); linhas 8–589.
- **Finalidade implementada:** Executar a operação de /api/webhooks/abacatepay; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** ` JSON.parse(rawBody) `; ` { event: eventType, data } = eventPayload `; ` { packageId, planId, userId, isPreSubscription } = metadata `; ` JSON.parse(metaCoupons) `
- **Condições de validação/erros:** ` webhookSecret && webhookSecret !== "whsec_placeholder" && apiKey && apiKey !== "abc_dev_placeholder" `; ` !signature `; ` !isValid `; ` !targetData `; ` eventType === "subscription.renewed" `; ` !targetUserId && subscriptionId `; ` existingSub `; ` !targetUserId && targetData.externalId `; ` txRecord `; ` !targetUserId `; ` !sub `; ` sub.plan.interval === "year" `; ` payingUser?.referredById `; ` eventType === "billing.paid" || eventType === "subscription.completed" || (eventType === "checkout.completed" && targetData.status === "PAID") `; ` packageId || (billingId && await prisma.creditPurchase.findFirst({ where: { OR: [{ abacatePayBillingId: billingId }, { id: transactionId }] } })) `; ` !purchase && packageId && targetUserId `; ` purchase `; ` purchase.status === "PAID" `; ` packageId && targetUserId `; ` pkg `; ` !transactionId || !userId || !planId `; ` Array.isArray(targetData.coupons) `; ` usedCoupons.length === 0 && targetData.billing && Array.isArray(targetData.billing.coupons) `; ` usedCoupons.length === 0 && targetData.metadata?.coupons `; ` typeof metaCoupons === "string" `; ` Array.isArray(parsed) `; ` Array.isArray(metaCoupons) `; ` !transaction `; ` transaction.status === "APPROVED" `; ` isPreSub `; ` freeTrial `; ` plan?.interval === "year" `; ` payingUser?.referredById `; ` !isPreSub `; ` coupon && coupon.isActive `; ` shouldDeactivate `; ` deactivatedCoupons.length > 0 && apiKey && apiKey !== "abc_dev_placeholder" `; ` existing `; ` abacateActive `; ` eventType === "subscription.cancelled" || eventType === "subscription.payment_failed" || eventType === "billing.failed" || eventType === "charge.failed" || eventType.includes("fail") || eventType.includes("past_due") || eventType.includes("unpaid") `; ` !userId && subscriptionId `; ` sub `; ` !userId && targetData.externalId `; ` transaction `; ` userId `; ` targetData.externalId `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** subscription, transaction, subscriptionActivity, user, referralCommission, auditLog, creditPurchase, creditPackage, freeTrial, plan, coupon
- **Respostas e códigos locais:** ` NextResponse.json({ success: true, processed: "subscription_renewed", newEndDate: renewedEndDate }) `; ` NextResponse.json({ success: true, message: "Já processado." }) `; ` NextResponse.json({ success: true, processed: "credit_purchase" }) `; ` NextResponse.json({ success: true, processed: "credit_purchase_direct" }) `; ` NextResponse.json({ success: true }) `; ` NextResponse.json({ received: true }) ` Códigos/expressões status: 401, 400, "active", "APPROVED", "success", "APROVADO", 500, "PENDING", "PAID", newStatus, "FAILED", "failed".
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

### POST /api/webhooks/payments/asaas

- **Arquivo:** [src/app/api/webhooks/payments/asaas/route.ts:5](<../../../src/app/api/webhooks/payments/asaas/route.ts#L5>); linhas 5–25.
- **Finalidade implementada:** Executar a operação de /api/webhooks/payments/asaas; detalhes e regras no fluxo da família correspondente do diagnóstico. GET com escrita é destacado nos achados.
- **Consumidores rastreados por chamadas:** Nenhum fetch literal compatível localizado. Pode ser chamada externa/indireta; isso não prova ausência de consumidor.
- **Autenticação/autorização:** ` Sem guard reconhecido pela extração; conferir autenticação inline/delegada `.
- **Entradas, filtros e paginação:** Parâmetros de rota ou delegação; ver handler.
- **Condições de validação/erros:** ` !rateLimitResult.allowed `
- **Chamadas e efeitos delegados:** Persistência inline/serviço não reconhecido: consultar arquivo.
- **Entidades diretas:** Delegadas ao serviço acima; ver abaixo/dicionário e fluxos.
- **Respostas e códigos locais:** ` NextResponse.json({ success: true, ...result }) `; ` NextResponse.json({ success: false, error: message }, { status: 400 }) ` Códigos/expressões status: 400.
- **Limites de confirmação:** contrato estático. Idempotência, pertencimento, efeitos financeiros e abuso precisam também das regras do serviço; ver os achados correspondentes. Ausência de paginação no handler não prova ausência no serviço.

**Rastreio da persistência e paginação do serviço chamado:**

Sem método de serviço reconhecido pelo índice. Conferir persistência inline ou dependência compartilhada citada no handler; lacuna explícita da extração.

