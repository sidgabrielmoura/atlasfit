# Webhooks, entregas e baseline — 07/10/2026

Este lote avança os achados 011, 027, 029, 031, 043, 044, 046, 047, 049 e 050. Não encerra os 26 achados abertos nem representa implantação em produção.

## Comportamento implementado

O webhook aplica os efeitos financeiros, registra entregas pendentes e conclui o evento na mesma transação serializável. Uma falha não deixa baixa financeira sem a entrega correspondente. Eventos antigos presos em PROCESSING podem ser retomados; payload ausente, adulterado ou incompatível fica em revisão. Falhas recuperáveis usam backoff e limite de tentativas, sem sobrescrever a conclusão de outro worker.

Cobranças novas PERSONAL recebem vínculo explícito com WorkspacePayment e workspace do titular. A baixa não escolhe dívidas pelo nome. As consultas de sincronização do personal e do aluno usam o mesmo processamento; CONFIRMED conserva a obrigação pendente e não preenche paidAt. Repetições e concorrência entre consulta e webhook não pagam a próxima mensalidade. Cobranças históricas sem vínculo, estornos sem valores líquidos comprovados e eventos não suportados ficam em revisão. Split, valores reais de taxas e demais eventos PERSONAL permanecem pendentes.

A outbox cifra o conteúdo, compara fingerprint da tentativa, usa leases com token e conserva recibos. O envio ocorre fora da transação financeira. Erros de configuração/provedor não viram sucesso. Resend usa o mesmo conteúdo e chave nos retries; depois da janela operacional de idempotência, a entrega exige revisão. Ably recebe ID estável e deliveryId; seus eventos financeiros são sinais para recarregar estado. Isso não equivale a uma garantia ilimitada de entrega exatamente uma vez. Transferências de recuperação com resultado incerto precisam de reconciliação, sem repetição cega.

Preferências recebem validação estrita e merge por categoria/flag dentro de transação. Primeira leitura concorrente não sobrescreve escolhas. O bloqueio do usuário permite a checagem de chave estrangeira da inicialização; o retry também reconhece deadlock do adapter PostgreSQL. O endpoint devolve 400 para JSON ou preferências inválidas.

Comunicação GYM continua IN_APP. O POST requer requestKey UUID, que deve permanecer igual ao repetir uma tentativa. Conteúdo diferente com a mesma chave retorna 409. Comprovante, destinatários e notificações são persistidos juntos; um retry usa o conjunto original e revalida a autoridade do remetente. Não existe consumidor de interface desse endpoint no código atual. Os canais genéricos PERSONAL de notificações/push ainda precisam ser migrados para entrega durável.

## Execução operacional

O endpoint `/api/cron/deliveries` exige `Authorization: Bearer <CRON_SECRET>`, recupera até 100 webhooks e processa até 100 entregas por chamada. Retorna 503 para falhas/revisões desta execução e registra duração/contagem, sem conteúdo ou credenciais. É necessário instalar um scheduler no ambiente de hospedagem e acompanhar backlog, revisões e falhas. O endpoint não instala o scheduler.

`minimizeDeliveredPayloads` remove somente conteúdo operacional de entregas SENT/SKIPPED antigas e conserva recibo/fingerprint/chave. Sua execução periódica e a política de retenção de payloads financeiros continuam pendentes. Nenhuma política jurídica de retenção foi presumida.

## Ambientes encontrados e verificações reais

O usuário autorizou o uso dos serviços reais em 07/10/2026. As configurações estão no `.env`; os relatórios não incluem valores de credenciais. Não foi encontrado documento de separação de homologação. O Asaas está configurado como PRODUCTION e não recebeu comandos financeiros nesta verificação.

| Serviço | Verificação | Limite |
|---|---|---|
| R2 | PNG binário via PUT assinado; HEAD e hash do GET; tamanho adulterado rejeitado; inventário do prefixo de teste; exclusão do objeto criado e HEAD 404 | Não verifica ainda as jornadas HTTP de quota/reserva ou o inventário completo de órfãos legados |
| Ably | Publicação pela outbox em canal sintético; repetição do mesmo ID; uma mensagem no histórico | Reautorização do cliente após troca de workspace permanece pendente |
| Resend | Envio a delivered@resend.dev pela outbox; repetição devolve o mesmo recibo | Aceitação pela API não comprova renderização em caixa postal, convite real ou leitura |
| Banco configurado | Transação READ ONLY, contagens agregadas e schema para SQL preliminar | Nenhum dado real alterado; documentos e vínculos das sete cobranças sem workspace não foram conciliados |

O [inventário real](inventario-legado-real.json) encontrou zero grupos de matrículas vigentes duplicadas, zero assinaturas/faturas/contas de gateway GYM e zero webhooks presos ou em revisão. Há sete cobranças sem workspace. A coluna de vínculo com obrigação e a outbox ainda não existem no banco configurado. A ausência de duplicidades não significa que o índice parcial já foi implantado.

Scripts reproduzíveis: `node scripts/gym-check-services.cjs` e `node scripts/gym-legacy-inventory.cjs`. Os testes externos usam banco descartável, canal sintético, endereço oficial de teste e arquivo temporário. Credenciais Asaas e carteira principal não são repassadas ao processo de teste.

## Baseline e implantação

A configuração explícita `prisma.baseline.config.ts` usa `prisma/baseline-migrations`. A cadeia histórica em `prisma/migrations` permanece intacta e continua inadequada para uma instalação vazia. Não executar a cadeia histórica para criar um banco novo.

Uma baseline integral foi gerada e aplicada em `atlasfit_gym_baseline_20261007`. Preserva 14 checks, quatro funções, quatro triggers e sete índices parciais, incluindo uma matrícula vigente por aluno/academia. O segundo migrate deploy não encontrou alterações; migrate diff encontrou zero diferenças com o schema. O [relatório de baseline](verificacoes-baseline.json) contém os resultados e hash do SQL. Os testes locais de migração usaram somente bancos descartáveis.

O [preview de transição](transicao-legado-preview.json) registra o SQL gerado por leitura do schema real. Não contém DROP TABLE/COLUMN/TYPE nem mudanças destrutivas identificadas pelo script. O [ensaio de transição](verificacoes-transicao-legado.json) aplicou esse SQL em uma cópia descartável do schema, sem copiar dados reais, e preservou sete cobranças sintéticas com valores/identidades originais e sem inventar os vínculos ausentes. As invariantes adicionais foram incluídas; migrate diff confirmou zero diferenças antes de marcar a baseline como aplicada. O [ensaio de histórico](verificacoes-baseline-historico.json) acrescentou uma migration histórica sintética e confirmou deploy/status sem pendências.

O export do Prisma perdeu predicados de índices parciais; o ensaio corrigiu somente a cópia descartável usando definições verificadas. A implantação real deve conferir as definições dos índices, checks e triggers, além do histórico efetivo e seus checksums. Faltam preflight, backfills sustentados por documentação e implantação. Não executar a baseline sobre tabelas existentes e não usar migrate resolve para ocultar diferenças. A implantação continua no achado 046.

## Evidências e fontes

O [manifesto deste lote](verificacoes-entregas.json) preserva resultados de testes e hashes das fontes. A [lista do restante](pendencias-restantes.md) mantém explícito o que falta.

Resultado final: 256 testes de integração PostgreSQL, os 59 casos HTTP da suíte em 15 lotes, três verificações reais sintéticas de serviços e TypeScript completo aprovados. Os casos fora de cada filtro HTTP não foram contados como aprovados; o conjunto dos lotes cobre os 59 casos únicos. Falhas intermediárias também foram preservadas. A suíte HTTP não substitui as jornadas visuais e de acessibilidade restantes.

Referências oficiais consultadas: [Resend: chaves de idempotência](https://resend.com/docs/dashboard/emails/idempotency-keys), [Ably: idempotência](https://ably.com/docs/platform/architecture/idempotency), [R2: AWS SDK v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/) e [Prisma: baseline](https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/baselining).
