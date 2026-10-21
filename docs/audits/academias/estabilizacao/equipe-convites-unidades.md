# Equipe, convites e desligamento por unidade — 05/10/2026

## Operação consolidada

Página, APIs e serviço usam a mesma consulta autorizada de equipe, numa fotografia Serializable com os grants atuais. O ator é obrigatório. Gestor local consulta somente as unidades permitidas, incluindo profissionais com papel acumulado STUDENT/TRAINER. Grants revogados não recuperam o papel legado. Grants de outras unidades são omitidos; contagem e detalhe dos alunos atribuídos respeitam o escopo. As respostas selecionam campos explicitamente e não incluem senha, token de convite, hash ou informações de outra academia.

Lista e convites são paginados, com filtros validados e ordenação determinística. A página informa quantidades no escopo/filtros e identifica indicadores referentes à página. Convites expirados deixam de ocupar a lista operacional; consultar um convite não grava `EXPIRED` ou modifica o banco. A classificação efetiva considera a data em todas as validações pertinentes.

O formulário permite escolher apenas as unidades administráveis. A opção de todas as unidades exige autoridade global. Editar o perfil conserva a unidade e os papéis acumulados; o cliente envia novo papel somente quando alterado. O servidor continua revalidando autoridade sobre todas as concessões de equipe afetadas. Titularidade não é concedida por edição comum ou convite.

## Jornada de convite

1. Operador gera convite com função/unidade e dados profissionais. O servidor revalida academia, unidade, licença, quota de equipe mais convites válidos e duplicidades dentro da transação.
2. O retorno contém um link único, validade e `delivery: MANUAL_LINK`. Compartilhamento é manual; não há promessa de envio por e-mail. O hash não vai para a resposta; o link só é apresentado nessa geração.
3. A consulta pública apresenta destinatário mascarado e dados mínimos. O login mantém o retorno ao convite por um caminho local estritamente permitido; destinos externos ou outros caminhos não são aceitos como retorno dessa jornada.
4. Aceite exige conta autenticada com e-mail correspondente, convite pendente e não expirado, autoridade atual do remetente e quota atual. Claim, vínculo, grants, perfil profissional e auditoria são atômicos.
5. O cookie de workspace é atualizado após o commit. A interface navega com recarga completa pelo resolvedor comum, evitando manter store/tema/contexto da academia anterior.
6. Aceite simultâneo produz um único vínculo. Disputa entre aceite e revogação produz um único estado final consistente. Revogar exige autoridade na unidade do convite e grava auditoria na mesma transação; repetir uma revogação já concluída revalida autoridade.

O cadastro público existente continua sendo de conta pessoal autônoma, com trial e aceite próprios; o rótulo da tela informa essa diferença. Ele conserva o retorno ao convite. Este lote não implementa a última etapa do personal vinculado, não libera genericamente rotas PERSONAL para GYM e não altera a regra de criação de workspace pessoal.

## Desligamento e titularidade

Os dois caminhos HTTP de desligamento e as fachadas de serviço delegam ao comando único `offboardGymStaff`. Ele revalida autoridade antes de localizar o alvo, exige motivo, protege o titular registrado, confere todas as concessões de equipe e unidades dos alunos e valida o substituto. O papel legado de profissional fica limitado à sua unidade; não habilita repasse para outra unidade.

Repasse/desatribuição dos alunos, revogação de equipe, estado do membro, data do desligamento e auditoria são atômicos. Erro na validação não deixa um repasse parcial. Autoria de treinos/avaliações e recebimentos não é apagada. Um grant STUDENT ativo é preservado; perfil estudantil antigo sem autoridade vigente não restaura papel revogado. Identidade global e vínculos PERSONAL ou de outras academias permanecem intactos.

O uso da licença GYM também passou a contar autoridade de equipe vigente, em vez de contar a presença histórica de `GymStaffProfile`. Um profissional desligado que continua aluno não ocupa vaga de colaborador só porque seu perfil profissional foi conservado. A regra de contagem PERSONAL foi preservada. Esse cenário foi adicionado ao terceiro teste PostgreSQL; demais regras de licença continuam em GYM-AUD-042.

Titularidade usa o comando transacional já consolidado no [lote administrativo](administracao-suspensao-workspace.md). Grants globais nullable usam busca/criação protegida por unicidade, sem upsert de chave composta com `null as any`. Duas transferências concorrentes deixam um único titular. CRM, aulas e equipamentos GYM foram retirados por instrução do usuário: handover de aulas e comandos físicos não são dependências desta etapa.

## Interface e contratos

| Entrada | Consulta/comando | Estado e recuperação |
|---|---|---|
| `/gym/staff` | `getGymStaffPageData` | SSR autorizado, tabela e convites paginados |
| `GET /api/gym/staff` | `listGymStaff` | Filtros estritos, campos explícitos, grants/unidade dentro da transação |
| `GET /api/gym/staff/[id]` | `getGymStaffMember` | Recurso fora do escopo não é retornado; alunos atribuídos filtrados |
| `POST /api/gym/staff` | `inviteGymStaff` | Link manual de uso único; sucesso somente após persistência |
| `PATCH /api/gym/staff/[id]` | `updateGymStaff` | Payload estrito; sem coerção arbitrária de campos ou promoção de OWNER |
| `DELETE /api/gym/staff/[id]` e `POST .../terminate` | `offboardGymStaff` | Motivo/repasse/autoridade; modal permanece aberto em falha |
| `GET /api/gym/invitations` | `listGymInvitations` | DTO paginado; sem hashes; somente convites válidos no escopo |
| `DELETE /api/gym/invitations/[id]` | `revokeGymInvitation` | Autoridade local e disputa com aceite protegidas |
| `GET/POST /api/gym/invitations/accept` | consulta pública / aceite autenticado | 400 inválido, 403 conta/autoridade, 409 consumido/revogado, 410 expirado |

Contratos de corpo são limitados a 16 KiB, rejeitam chaves desconhecidas e não aceitam ator do cliente. IDs de academia divergentes entre corpo, cabeçalho e query são recusados; cookie ativo permanece verificado pelo guard. A lista de convites mudou de array solto para `{data,total,page,limit,totalPages}`; os consumidores internos localizados foram atualizados juntos.

Falha de recarga não apaga dados anteriores: a página identifica a informação como anterior e oferece nova tentativa. Requests anteriores são abortados para não substituir o resultado após mudança de filtro/contexto. Copiar confirma somente depois de a Clipboard API concluir; falha oferece cópia manual. Resultado de mutação persistida e falha posterior de recarga são apresentados separadamente.

## Verificação

| Lote | Resultado | O que demonstra |
|---|---|---|
| `staff-scope` | 3 testes agrupados PostgreSQL aprovados | Isolamento, DTO, papel acumulado, paginação, grants atuais, aceite/revogação concorrentes, expiração sem escrita, desligamento/rollback e preservação PERSONAL |
| `staff-invite-regression` | 11 aprovados; 38 fora do filtro | Quota/convites simultâneos, OWNER negado, transferência concorrente, grants globais únicos, repasse e preservação STUDENT/PERSONAL |
| `http-staff-scope` | 1 jornada aprovada; 32 fora do filtro | Credentials, SSR, APIs, ausência de campos sensíveis, unidade, perfil, convite/aceite/cookie, desligamento/repasse, revogação e mesma sessão recusada |
| TypeScript | Saída 0 | Árvore atual sem afrouxar tipos; sem novo `any` ou casts para superar checks |

Evidências, comandos, datas e hashes: [verificacoes-equipe-convites.json](verificacoes-equipe-convites.json). Somente PostgreSQL e aplicação descartáveis foram usados. Nenhuma migration foi necessária; não houve e-mail, notificação real, cobrança, operação de produção ou equipamento.

Falhas intermediárias foram mantidas nos arquivos brutos: chamada de teste sem query obrigatória, fixture com propriedade extra não tipada e autorização consultada após recurso já desligado. O último problema foi corrigido no serviço, mantendo a expectativa do teste; os demais corrigiram a configuração da chamada/fixture sem relaxar as assertivas de negócio.

## Estado dos achados e limites

- **GYM-AUD-004:** corrigido e verificado nas condições originais de identidade destinatária, consumo, validade e quota. Entrega atual é link manual explícito, não e-mail homologado.
- **GYM-AUD-024:** corrigido e verificado no escopo operacional atual: comando de desligamento/repasse único, proteção do titular, atomicidade e grants nullable; aulas/equipamentos retirados.
- GYM-AUD-001/002/003/005/048/050/051/052/060: este lote acrescenta cobertura, mas não encerra todas as superfícies desses achados compostos.

Navegador/mobile/teclado e cópia real não foram homologados por testes HTTP. Registros históricos com relações incompatíveis exigem revisão contextual; não foram alterados silenciosamente. Detalhe de profissional limita alunos a 100; consulta paginada desse detalhe e seleção remota de substitutos permanecem em GYM-AUD-052. Personal vinculado, workspace privado, quota, trial/paywall e regressão autônoma completa continuam na última etapa, conforme solicitado.
