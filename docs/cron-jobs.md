# Rotinas agendadas

Atualizado em 07/11/2026. Os endpoints existem no código; o agendamento externo e seus alertas precisam ser configurados e conferidos no ambiente publicado. Este documento não comprova execução em produção.

Todas as chamadas agendadas usam exclusivamente `Authorization: Bearer <CRON_SECRET>`, sobre HTTPS. Segredos em query string não são aceitos. Ausência de configuração ou token incorreto retorna 401 antes de executar o job. A validação está em [cron-authorization.ts](../src/lib/cron-authorization.ts).

| Caminho | Método | Finalidade | Frequência inicial sugerida |
| --- | --- | --- | --- |
| [/api/cron/deliveries](../src/app/api/cron/deliveries/route.ts) | GET | Recuperar webhooks e enviar outbox | A cada minuto |
| [/api/cron/gym-recurrence](../src/app/api/cron/gym-recurrence/route.ts) | GET | Fechamentos, pausas, maioridade, privacidade e ciclos locais GYM | A cada 5 minutos |
| [/api/cron/process-recurrence](../src/app/api/cron/process-recurrence/route.ts) | GET | Recorrência PERSONAL, suspensões manuais, retenção de fontes/payloads de webhooks e limpeza de limites expirados | A cada hora |
| [/api/cron/gym-purge](../src/app/api/cron/gym-purge/route.ts) | GET | Purga coordenada de academias encerradas após prazo e verificações | Diariamente; recuperar backlog conforme resposta |
| [/api/cron/engage-push](../src/app/api/cron/engage-push/route.ts) | GET | Ciclo de campanhas automatizadas | Conforme a janela das campanhas, inicialmente 08h e 18h |
| [/api/gym/enrollments/cron-expire](../src/app/api/gym/enrollments/cron-expire/route.ts) | POST | Executar fechamento de matrículas | Recuperação manual; normalmente coberto por gym-recurrence |

Os links acima apontam para os arquivos de cada rota. `cron-expire` aceita também sessão autenticada com `workspace.manage` e corpo JSON contendo `workspaceId`; essa alternativa limita a execução à academia autorizada. A execução manual de campanhas usa POST em engage-push, com autoridade SUPERADMIN persistida. Essas alternativas não alteram a autenticação do GET agendado.

## Lotes, falhas e recuperação

- O processamento de entregas consulta até 100 itens por chamada. O disparo reativo tenta até dois lotes de 25 após commit. O cron continua necessário para recuperar falhas e itens que excedam esses lotes.
- A recorrência GYM processa até 500 matrículas por chamada, emitindo no máximo um ciclo por matrícula por chamada. `hasMore` consulta a existência de trabalho elegível restante, inclusive vários ciclos atrasados da mesma matrícula.
- A retenção de payloads de webhooks roda em `process-recurrence`, com lotes de 100 e resultado em `webhookRetention`. Ela mantém a política opt-in e os recibos financeiros. Não executá-la a cada minuto reduz consultas de manutenção; a recuperação e entrega de webhooks continuam em `deliveries`.
- Ao receber `hasMore: true`, o agendador deve repetir a chamada após a conclusão anterior, com limite de tentativas e tempo por execução. Se atingir esse limite, registrar backlog e retomar na próxima janela. Nunca considerar o primeiro HTTP 200 como evidência de fila drenada.
- Repetições concorrentes usam locks, recibos e chaves de idempotência. Falhas transitórias respeitam `nextAttemptAt`/`billingRetryAt`; não antecipar esses campos por SQL para forçar envio.
- HTTP 503 pode indicar falha parcial recuperável. Consultar os resultados e os registros de saúde antes de repetir. Não criar novas intenções comerciais para contornar uma tentativa pendente.
- `process-recurrence` remove até 10.000 buckets de rate limit expirados por chamada, preservando janelas ativas. Fontes e recibos seguem suas políticas próprias de retenção.

## Verificação operacional

Conferir o último sucesso, duração, falhas e backlog em [cron-health.ts](../src/lib/cron-health.ts) e no painel operacional. Alertar quando não houver sucesso por mais de duas janelas previstas, quando houver `REVIEW_REQUIRED`, atraso crescente ou execução permanentemente em andamento. Ajustar os limites de atraso à agenda efetivamente instalada; não confundir um recibo de execução com confirmação de entrega ao destinatário.

Na publicação, registrar ambiente, URL sem segredo, frequência, timeout, responsável e destino de alerta. Fazer uma chamada autenticada controlada, conferir o recibo e observar a próxima execução automática. Nunca inserir o segredo em histórico de comandos, logs ou links de documentação.

As janelas atuais do monitor são 15 minutos para gym-recurrence, 120 para process-recurrence, 10 para deliveries, 16 horas para engage-push e 26 horas para gym-purge. Alterar a agenda exige revisar também essas janelas em cron-health.ts.

Os testes oficiais são `npm run test:gym` em PostgreSQL descartável. Os casos de autenticação, replay, concorrência e recuperação não enviam mensagens reais.
