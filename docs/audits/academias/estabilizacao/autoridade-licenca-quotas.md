# Ponto 1 — permissões, unidades, titularidade, suspensão, licenças, quotas e auditoria

Lote de 06/10/2026. Implementação dos sete tópicos no escopo GYM mantido. Financeiro local/manual; CRM, turmas, hardware e gateway GYM permanecem retirados. PERSONAL vinculado à academia continua como etapa final separada.

## 1. Permissões

Os comandos revalidam o ator e os papéis atuais dentro de transações Serializable, incluindo retries. Grants revogados não restauram a coluna de papel legado. Administradores operacionais também obedecem suspensão e vigência; recuperação de licença, suspensão e titularidade usa comandos administrativos próprios. Os antigos métodos de unidades, perfil profissional e backfill exigem um ator autorizado.

## 2. Unidades

Papéis legados locais ficam restritos à unidade original, inclusive quando uma chamada omite a unidade. Leitura de catálogo compartilhado não concede gestão global. Seletores de profissionais reconhecem o titular registrado e os grants ativos das unidades permitidas. Chat, conversas existentes, anexos privados e novas capacidades realtime respeitam unidade/carteira. Presença GYM passa a canais individuais dentro do workspace; o cliente consulta apenas contatos autorizados.

## 3. Titularidade

Concessão/edição comum não promove OWNER nem rebaixa coproprietários históricos. Mudança de papel revoga o conjunto profissional anterior, com executor da revogação. Edição estudantil não desativa o titular registrado nem um vínculo com autoridade em outra unidade. Transferência mantém titular, membros, grants, quota e auditoria na mesma transação. Permanecer como STUDENT exige perfil estudantil existente em GYM. Desligamento coordenado preserva outros vínculos e o histórico.

## 4. Suspensão

Guard, comandos, consultas estudantis compartilhadas, saúde/arquivos mantidos, importação, armazenamento e chat revalidam a academia. Sessão já emitida e superadmin operacional não contornam a suspensão. Os jobs filtram academias operacionais antes de selecionar o lote e repetem a checagem na transação. Recuperação administrativa continua disponível; consultas de recuperação não iniciam analytics operacional indisponível.

## 5. Licenças

Somente ACTIVE vigente ou TRIAL com término futuro permite operação. Licença ausente, vencida, incompleta, cancelada ou PAST_DUE bloqueia. A data é calculada a cada consulta; não fica congelada no carregamento do módulo. Ler não provisiona trial. Flags mantidas, como importação assistida, são verificadas no servidor. Defaults globais são lidos na transação de provisionamento/atualização.

## 6. Quotas

Alunos, importação, equipe, convites, alteração de papel, transferência e unidades aplicam os limites na transação. Convites ativos reservam vagas; aceite revalida downgrade e converte a reserva em membro. Zero é um limite efetivo. Redução de licença conserva dados existentes e impede ampliação. A indicação de uso da equipe inclui convites pendentes.

O inventário `GymStorageObject` contabiliza arquivos, fotos, marca, anexos de chat e uploads em andamento. URLs de PUT assinam tamanho e tipo com o SDK S3 instalado. Finalização confere HEAD, finalidade, operador, tamanho real e quota na transação. Um arquivo não conta duas vezes. Histórico sem tamanho/inventário conferido bloqueia ampliação e exige reconciliação. Reserva vencida continua consumindo quota: pode existir um objeto órfão. Espaço só é liberado após exclusão física confirmada.

Recuperação operacional disponível ao superadmin autenticado:

- `POST /api/superadmin/workspaces/{id}/storage-reconcile`, corpo `{}` ou `{ "afterKey": "..." }`: confere até 50 objetos referenciados e retorna cursor, objetos sem mapeamento e continuação. Funciona para reconciliar histórico suspenso, vencido ou acima da quota.
- `DELETE /api/superadmin/workspaces/{id}/storage-orphans`, corpo `{ "objectKey": "..." }`: remove objeto inventariado sem referência e sem upload vigente. Falha externa conserva consumo e permite retry; objeto referenciado não é removido.

Esses endpoints não enumeram todo o bucket legado. Inventário externo do bucket, objetos antigos sem registro, arquivos reais e comportamento R2 ainda pertencem ao achado 047.

## 7. Auditoria

Contexto de requisição utiliza AsyncLocalStorage compartilhado entre bundles e Prisma. A identidade vem da sessão validada no servidor: executor real, usuário efetivo, impersonação, correlação, versão e fase. Corpo/header/query não escolhe o executor. Revogação da versão de sessão do administrador invalida impersonação já aberta. Login e logger compartilhado preservam a identidade original.

Comandos críticos de autoridade registram estado anterior/posterior e campos alterados sem copiar credenciais ou dados de saúde. Auditoria e gravação local confirmam ou revertem juntas; eventos de matrícula também conservam o executor real. Medidas, avaliações e fotos mantidas têm comandos transacionais. Limpeza de órfãos distingue solicitação externa de confirmação. Outbox, retry de notificações e homologação das demais jornadas globais continuam nos achados 044 e 065.

## Evidências e limites

Resultados, hashes de fontes e saídas integrais ficam em [verificacoes-autoridade.json](verificacoes-autoridade.json). Execuções intermediárias com falhas também são preservadas. Fixtures positivas antigas receberam licença explícita; casos de licença ausente, vencimento, suspensão, zero, concorrência e rollback continuam exercitados.

Banco PostgreSQL descartável específico, dados sintéticos e aplicação copiada sem `.env`, porta 31173. HEAD e exclusão física usam mocks; assinatura de PUT usa SDK S3 real com credenciais sintéticas, sem requisição externa. Não há homologação de R2, Ably real, produção ou da aplicação inteira. As jornadas visuais restantes e a suíte unitária global histórica continuam abertas.

A migration `20261005020000_gym_authority_audit_storage` foi preparada e sua DDL aplicada apenas ao schema público do banco descartável. Prisma Client foi gerado nesse ambiente. A cadeia completa de migrations, baseline legado e implantação continuam no achado 046. O índice parcial de matrícula do lote anterior continua preparado e não aplicado à tabela pública. Nenhum banco configurado ou produção foi alterado.

A [lista de tudo que ainda falta](pendencias-restantes.md) continua exaustiva. As regras aprovadas de pausa e matrícula seguem válidas; o calendário de retomada após pausa longa ainda aguarda a resposta já solicitada.
