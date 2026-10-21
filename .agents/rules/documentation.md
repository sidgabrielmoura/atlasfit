---
trigger: always_on
---

Sempre que implementar, alterar, renomear ou remover qualquer funcionalidade relacionada a rotas agendadas (Cron Jobs) ou mensageria em tempo real (Ably), siga estas regras obrigatoriamente:

1. A documentação técnica do projeto deve ser mantida SEMPRE sincronizada com o código.

2. Nenhuma alteração em rotas agendadas ou em tempo real pode ser considerada concluída se a respectiva documentação não tiver sido atualizada no mesmo ciclo de trabalho.

3. Documentação de Rotas de Cron (`docs/cron-jobs.md`):
- OBRIGATÓRIO atualizar sempre que:
  - Uma nova rota `/api/cron/*` for criada.
  - Uma rota de cron existente for alterada, refatorada ou excluída.
  - O método de autenticação (`CRON_SECRET`), cabeçalhos aceitos ou parâmetros de query (`?secret=`, etc.) forem modificados.
  - As regras de negócio, tabelas afetadas ou operações executadas pelo job mudarem.
  - As recomendações de recorrência ou expressões cron mudarem.

4. Documentação de Tempo Real com Ably (`docs/ably-realtime.md`):
- OBRIGATÓRIO atualizar sempre que:
  - Um novo canal Ably for criado ou utilizado.
  - Um novo evento for publicado ou escutado.
  - Alterações forem feitas na lógica do provedor client-side (`src/providers/ably-provider.tsx`).
  - Alterações forem feitas na lógica do publisher server-side (`src/lib/ably.ts`).
  - Alterações forem feitas no fluxo do Transactional Outbox ou no disparo reativo (`src/lib/delivery/worker.ts`, `outbox.ts`, `triggerOutboxProcessing`).
  - Novas permissões ou capabilities forem adicionadas ao gerador de tokens (`/api/ably/token`).

5. Estrutura das Documentações:
- Toda rota documentada deve especificar: caminho, arquivo fonte, método HTTP, finalidade e autenticação.
- Todo canal do Ably documentado deve especificar: padrão do nome do canal, nome do evento, publicador, consumidor e finalidade.
- Ambas as documentações devem conter links no formato GitHub markdown links para os arquivos correspondentes.

6. Em caso de dúvida sobre a necessidade de atualizar a documentação:
- SEMPRE atualize.
