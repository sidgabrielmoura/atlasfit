# Redução de consumo do PostgreSQL — implementação

Data: 20/10/2026. Projeto: Atlasfit. Alterações locais, com migração validada em PostgreSQL descartável. Este documento distingue implementação de publicação e de economia financeira comprovada.

## Integridade e autorização

- `src/modules/payments/abacate-confirmation.ts`: todos os ingressos de créditos confirmam a mesma compra local por `UPDATE ... WHERE status='PENDING'`. Só o vencedor incrementa o saldo, na mesma transação. Uma falha desfaz ambos. Metadados de webhook não criam créditos sem pedido local. O pedido é persistido antes da chamada ao checkout.
- `src/app/api/webhooks/abacatepay/route.ts`: recibo persistente por ambiente, evento e pagamento; usa o ID do evento quando o pagamento não está disponível. Hash canônico detecta reutilização conflitante. Recibo e efeitos são atômicos. O bloqueio da assinatura também serializa ciclos diferentes do mesmo usuário. A ativação inicial usa transição condicional; falhas não rebaixam transações já aprovadas.
- A chave compartilhada de assinatura documentada pelo provedor é pública. Sua assinatura agora exige também o segredo da URL. HMAC com o segredo privado continua aceito. Produção sem configuração válida falha fechada. O endpoint legado de créditos verifica o token completo em tempo constante.
- `gym-dashboard-metrics.ts`: receita, planos, alunos, acessos, rankings, atividades e renovações usam a autoridade de unidade/carteira. Perfil operacional não recebe valores financeiros. Recebimentos com alocações em várias unidades usam apenas as parcelas autorizadas, inclusive na atividade recente.
- `personal/subscription/status`: consulta vinculada ao dono da transação, permitindo consulta pelo usuário com assinatura expirada. Consulta de créditos valida também o workspace recebido.

## Menos consultas repetidas e menos bytes

- `request-memo.ts`, `auth.ts`, `workspace-request-facts.ts`: sessão e fatos mínimos de workspace/membro reutilizados dentro do GET; React `cache` cobre a renderização no servidor. Não existe cache compartilhado de autorização com TTL entre requisições. Mutações e verificações transacionais continuam com leituras próprias. O inventário dos GETs está em `rotas-com-contexto.md`.
- Sessão e mensagens deixam de transportar o avatar inline. `api/user/avatar` e `api/chat/avatar` servem a imagem somente quando exibida, com autorização e cache privado de cinco minutos. Os URLs contêm identidade/versão e, no chat, conversa. Formulário de perfil reconhece o URL de leitura e não o grava como novo avatar.
- Dashboard PERSONAL: contagens, médias, distribuição de planos e pagamentos são agregados; listas de alunos/atividades são limitadas a cinco. Nenhum histórico completo de pagamentos, treinos ou JSON de logs é materializado para calcular indicadores. Recordes e cargas históricas passam a agregados SQL; não são artificialmente truncados às últimas semanas. Corrigido o cálculo que usava a última série positiva em vez da maior carga.
- Dashboard STUDENT: treinos usam contagem de exercícios, sem vídeos/catálogo inteiro; avaliação física limitada à última; logs operacionais restringidos à semana. Streak e recordes mantêm a história completa por agregação. Gráfico de peso usa a última medição real de até 24 meses com registros; evolução percentual mantém a primeira medição histórica como base. A legenda informa a base mensal.
- Financeiro PERSONAL: totais e histórico mensal independem da página da lista. Pagamentos e recorrências têm 50 linhas por página, busca aplicada antes do limite e ordem com desempate por ID. Recorrências são carregadas na aba correspondente. A lista do seletor de alunos usa projeção de identidade/contato e não recalcula streaks a cada atualização financeira. A paginação por página aceita no máximo 1.000; volumes que tornem esse offset caro exigem evolução para cursor e filtro temporal, medida com dados equivalentes.
- Extrato da carteira: filtros, junção de cobranças/saques, contagem e paginação no PostgreSQL. Páginas além dos antigos 200 registros de cada origem funcionam. Dados de outras contas são excluídos na origem.
- Financeiro STUDENT: leitura comum não consulta o provedor nem reconcilia pagamentos. Atualização manual usa POST, limite de taxa e lote de até dez pendências. Histórico paginado com totais agregados independentes da página e próximo vencimento independente da página. Webhooks permanecem a atualização automática financeira.
- Carteira: leitura de conta não executa recuperação/criação nem consulta KYC no provedor. Essas ações ficam na sincronização explícita. O endpoint de sincronização existente mantém sua autorização e limite de taxa.
- SUPERADMIN: contagens da base e seis pontos históricos de usuários em uma passagem agregada; sessões distintas contadas no banco. A tabela de sessões continua não sendo uma medida de usuários ativos reais com JWT: não se inventou uma métrica de atividade.

## Atualização em tempo real

- Capabilities Ably: uma leitura em lote dos participantes das conversas e um conjunto de contatos autorizados por academia; não há uma revalidação completa por conversa nem carregamento de avatares para gerar permissões. Continua com TTL de 60 segundos e consultas novas a cada emissão.
- Notificações e financeiro coalescem rajadas, permitem uma atualização em andamento e adiam invalidações em abas ocultas. O HTTP continua revalidando a autorização. Conteúdo de um evento não substitui o isolamento do endpoint.
- Financeiro GYM atualiza listas/KPIs já carregados sem repetir toda a renderização por `router.refresh()`.
- Chat: limite de 1–100 mensagens e ordenação `(createdAt,id)`; cursor usa a última mensagem entregue, corrigindo o salto de uma mensagem por página. Recibos de leitura só alteram contadores pendentes e só publicam/auditam quando houve mudança.
- Reajustes no SUPERADMIN usam Ably existente; polling de contingência fica em 30 segundos e suspende chamadas na aba oculta. PIX pendente usa Ably mais polling progressivo, sem chamadas simultâneas, pausa em segundo plano, encerra em erros de autorização e limita a janela automática a dez minutos, com verificação manual disponível.
- Temporizadores apenas visuais não foram tratados como consultas de banco.

## Jobs, importação e conexões

- `process-recurrence` processa PERSONAL. GYM permanece no job dedicado de 15 minutos. A implantação precisa instalar ambos os agendamentos.
- Pausas já iniciadas só retornam quando o fim está vencido; não ocupam o primeiro lote indefinidamente. Recorrências PERSONAL/GYM, pausas e privacidade persistem contagem de falhas e próxima tentativa, com espera exponencial e jitter. Uma entrada inválida deixa de bloquear os primeiros lotes em toda execução. Edições financeiras relevantes permitem nova tentativa. Purga conserva as verificações de tenant e recebe espera crescente de até um dia.
- Heartbeat usa uma linha por job em `ScheduledJobState`, em vez de um `AuditLog` novo por execução vazia. Histórico de auditoria financeira e recibos existentes permanecem. O monitor lê os estados em lote.
- Engage: audiência em páginas de 100 e até três destinatários em processamento. Deduplicação diária e fadiga são lidas em lote; streak só é consultado quando usado e reaproveitado no STREAK_SAVER. Limpeza de logs é um lote de até 500 na janela das 7h, em vez de uma exclusão sem limite a cada 15 minutos. Rotinas longas ainda precisam ser dimensionadas contra o timeout real da implantação; o cursor de audiência desta implementação é da execução, não um checkpoint persistente entre invocações.
- Relatórios GYM usam snapshot `REPEATABLE READ` somente de leitura; comandos financeiros mantêm `SERIALIZABLE`. Montagem final de CSV ocorre depois de liberar a conexão. Retentativas de conflitos recebem jitter.
- Novas fontes de importação usam o R2 existente, com prefixo de workspace/job, hash e metadados no banco. Fontes antigas em base64 permanecem legíveis. A extração lê uma fonte por vez e valida escopo, tamanho e hash do objeto. Ambos os caminhos de upload usam a mesma rotina, com limites por arquivo/lote e estado do job conferido sob bloqueio. Armazenamento das novas fontes entra na quota.
- Confirmação de importação tem claim condicional e conclusão na mesma transação dos dados; repetição não recria alunos depois de um commit cuja resposta se perdeu. Preview confere correspondências em lote. Até 500 registros por confirmação, espera de conexão de dez segundos e transação de até 30 segundos. Novos alunos usam ativação por convite existente, sem a senha fixa compartilhada e sem bcrypt dentro da transação. A leitura da lista deixa de marcar jobs como falhos após apenas dois minutos; recuperação de execução realmente interrompida exige revisão operacional do job, não uma leitura de tela.
- Retenção de fontes terminais em lotes de 25, somente com `IMPORT_SOURCE_RETENTION_DAYS` configurado. Preserva revisão em aberto, hashes, resultados, utilização de IA e registros financeiros. Objetos só perdem a referência depois de exclusão confirmada. Sem a variável, não limpa dados.
- Pool `pg`: máximo padrão mantido em dez; mínimo zero, idle de dez segundos e espera/conexão de dez segundos, configuráveis e validados. Não há ajuste de RAM ou `work_mem`. Amostragem opcional registra duração e ocupação/espera do pool sem SQL, parâmetros ou PII; padrão zero.

O teto potencial continua sendo dez conexões por processo multiplicado pelos processos simultâneos, somando jobs, previews e outros ambientes. Escolher outro máximo exige conhecer essa concorrência e o limite do endpoint; o pool do processo e o pooler do provedor são camadas distintas. RSS do Node, memória de conexão, operações de sort/hash e cache normal do PostgreSQL precisam ser observados separadamente.

## Migração e índices

`prisma/migrations/20261020000000_database_efficiency/migration.sql`, também na cadeia baseline:

| Objeto | Acesso que o justifica |
|---|---|
| `AbacateWebhookReceipt` | Repetição de efeitos de assinatura; créditos usam CAS do pedido local |
| `ScheduledJobState` | Estado operacional com crescimento limitado |
| Campos de retry nos quatro modelos | Seleção de trabalho que já pode ser tentado novamente |
| `WorkoutExercise(workoutId,order,id)` | Relação/ordenação dos exercícios de um treino |
| `WorkoutExercise(exerciseId)` | Referências e utilização de exercício |
| `WorkspaceMember(workspaceId,role,isActive)` | Contagens e listas por tenant e estado |
| `WorkoutLog(workspaceId,studentId,completedAt,id)` | Histórico/streak por aluno e tenant |
| `WorkoutLog(workspaceId,createdAt,id)` | Períodos dos indicadores de treino |
| `WorkspacePayment(workspaceId,createdAt,id)` | Listagem financeira estável |
| `Message(conversationId,createdAt,id)` | Paginação estável do chat |
| `EngagePushLog(userId,sentAt)` | Fadiga e deduplicação por lote/dia |

Cada índice acrescenta custo de escrita e armazenamento. O ensaio confirmou o acesso por treino; os demais precisam ser acompanhados em planos e frequência reais após publicação. Índices redundantes de aproximadamente 40 KiB encontrados na auditoria não justificam uma remoção automática. Constraints financeiras, unicidade e integridade entre tenants continuam presentes.

## Evidências e comparação

Os resultados consolidados ficam em `verificacoes.json`. Os testes usam exclusivamente PostgreSQL local em `127.0.0.1:56432`, com credenciais de provedores removidas e transportes simulados. A migração foi aplicada nessa base descartável.

Rodada final: **271 testes unitários e 40 testes PostgreSQL aprovados**, checagem de tipos sem erros e build isolado aprovado. As nove migrações baseline foram aplicadas localmente; a comparação da base com o schema Prisma retornou diferença vazia. Os arquivos da nova migração nas duas cadeias são idênticos. O container de teste foi parado ao final, mantendo os dados sintéticos para reprodução. Smoke autenticado no navegador e confirmação com os provedores reais fazem parte da publicação e não foram executados nesta etapa.

Para reproduzir as verificações, iniciar o container local `atlasfit-cost-audit-postgres` e executar, em sequência, `node scripts/test-database-efficiency.cjs --unit`, `node scripts/test-database-efficiency.cjs` e `node scripts/build-database-efficiency.cjs`. Os dois scripts fixam os alvos locais; o build usa cópia em `.tmp`, sem os arquivos `.env`, e preserva o servidor de desenvolvimento existente. A checagem adicional de tipos usa `node --max-old-space-size=4096 node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile .tmp/database-efficiency.tsbuildinfo`. Não executar essas verificações com URLs de produção. Uma execução simultânea de build, tipos e testes atingiu o timeout de 30 segundos da fixture de volume; os resultados finais registram a repetição sequencial.

O ensaio `database-efficiency-volume.integration.ts` comparou 50 alunos sintéticos com avatar de 64 KiB. A leitura completa produziu **3.365.901 bytes** de objetos serializados; o agregado equivalente de contagem/média produziu **45 bytes**. Esses tamanhos são desse indicador, não de toda a resposta do dashboard. Observação única: 246,1 ms versus 16,9 ms; não são estimativas de p95/p99 ou de produção.

Em aproximadamente 4.000 exercícios sintéticos, o plano por treino usou **82 blocos compartilhados sem o índice e 4 com ele**, para as mesmas 20 linhas. O índice foi removido apenas dentro de uma transação local revertida. `EXPLAIN ANALYZE` não foi executado em produção. Ordem dos ensaios/cache e outras fixtures afetam os tempos; a evidência principal é a diferença no acesso e no volume retornado.

Orçamento estático dos crons vazios, mantendo os agendamentos locais: aproximadamente **3.901 operações lógicas/dia**, contra 4.056 da auditoria, considerando silêncio das 22h–7h, nenhuma campanha ativa e retenção desativada. São 96 leituras GYM redundantes a menos e 59 chamadas de limpeza a menos. Upsert de heartbeat mantém a quantidade de escritas operacionais, mas limita o crescimento. SQL físico, comandos transacionais, execução efetiva e modelo de cobrança precisam ser medidos; estes números não são dinheiro.

Comparar em produção por pelo menos uma janela equivalente de uso, com mesmo volume, papéis/unidades, concorrência, múltiplas abas e cache frio/quente. Registrar SQL físico por operação, linhas/bytes, duração acumulada e frequência, p95/p99, CPU/CU-h, blocos/temporários/WAL, pool em espera, heap/RSS/GC e tempo ativo/suspensão. Conferir saldo em centavos, estornos, paginação completa, acesso revogado e isolamento. A soma de consultas menor sozinha não comprova economia: os agregados históricos transferem trabalho para o PostgreSQL.

## Publicação e pontos que dependem do ambiente

1. Confirmar commit/ambiente de destino e os cinco jobs efetivamente instalados. As versões locais e dependências já existentes podem diferir da imagem publicada; havia drift de Ably instalado versus lockfile.
2. Garantir backup recuperável e aplicar **a nova migração pela cadeia usada na instalação existente**, antes do novo código. A cadeia baseline completa serve para instalação vazia; não a executar sobre a base de produção já migrada. Os `CREATE INDEX` desta migração são convencionais e podem bloquear escritas durante a construção; medir sua duração numa cópia representativa e escolher a janela de publicação. Nenhuma migration foi aplicada em produção nesta implementação.
3. Confirmar a configuração do webhook no provedor antes de publicar a verificação mais estrita: segredo privado correto ou URL com `webhookSecret`, além da assinatura compartilhada. No endpoint legado, enviar o token inteiro. Não colocar valores de segredo em documentação/logs.
4. Confirmar leitura/escrita do R2 no ambiente de publicação; fazer upload e extração de uma fonte sintética em homologação. O código não transferiu nem apagou objetos reais nesta etapa.
5. Configurações opcionais: `DATABASE_POOL_MAX`, `DATABASE_POOL_IDLE_TIMEOUT_MS`, `DATABASE_POOL_CONNECTION_TIMEOUT_MS`, `DATABASE_QUERY_SAMPLE_RATE` (começar baixo, por janela limitada) e `IMPORT_SOURCE_RETENTION_DAYS` (somente depois de definir a política). Não editar `work_mem`, limites Neon, backup, branches ou Cloud SQL por suposição.
6. Executar smoke de dashboard por perfil/unidade, confirmação/repetição de pagamento, chat/reconexão e jobs, observando os novos estados. Para importação interrompida, conferir que não existe execução ativa e revisar o estado do job antes de liberar nova tentativa. Para rejeições definitivas de retry, revisar o código e a configuração antes de reativar o item.

Dependem de acesso/métricas: fatura e plano Neon, CU-h/tempo ativo e suspensão, branches/previews e retenção, inventário/permissões Cloud SQL, SKUs cobrados, região e instâncias reais da aplicação e logs de crons. A auditoria confirmou Neon como produção pela informação do usuário; Data Connect sem serviço listado na região configurada não prova ausência de instância Cloud SQL. Nenhum serviço foi desativado, nenhum agendamento remoto alterado e nenhuma economia em R$/mês foi inventada.

## Hábitos para funcionalidades novas

- Definir orçamento de SQL físico e de bytes por abertura/atualização de tela; testar também aba ociosa, evento pequeno e múltiplas abas.
- Listas com projeção e teto; contagem/totais independentes da página; ordenação com desempate. Evoluir offset para cursor quando o plano/volume justificar.
- Revisar índice junto do filtro/join/ordem e medir manutenção de escrita. Não adicionar um índice por campo.
- Jobs com seleção de pendências, lotes, concorrência limitada, idempotência e próxima tentativa persistida; checar timeout/lease reais e justiça entre workspaces.
- Retenção definida no desenho da tabela; recibos financeiros e deduplicação tratados separadamente do conteúdo operacional.
- Amostragem e alertas com janela/reset conhecidos, sem parâmetros pessoais. Revisão de consumo depois da publicação e em cada aumento relevante de volume.

Referências primárias: [Prisma 7 e conexões](https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/databases-connections), [pool pg](https://node-postgres.com/apis/pool), [webhooks AbacatePay](https://docs.abacatepay.com/pages/webhooks), [SDK S3 no R2](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/), [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/current/sql-explain.html).
