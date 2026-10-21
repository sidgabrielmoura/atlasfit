# Recepção e papéis por unidade — lote de 02/10/2026

Implementação parcial verificada em PostgreSQL descartável. A inspeção de desktop/mobile/teclado continua pendente. O feed e o contexto são protegidos no servidor; esconder um botão não substitui esses controles.

## Causa e mudança operacional

A página anterior exigia `access.read` sem unidade, recusando grants legítimos locais. Depois carregava todas as unidades e todos os membros com papel legado STUDENT da academia. A inadimplência era inferida de `billingPrice`, `streak` e `lastActive`; plano e última passagem vinham de campos genéricos do membro. Isso misturava autoridade, atividade de treino e dívida. O handler do feed recebia `unitId`, mas não o encaminhava ao guard.

| Responsabilidade | Implementação atual | Verificação |
|---|---|---|
| Anunciar workspace/rota | `resolveNavigationRoles` considera grants não revogados globais ou de unidades ativas; usado na seleção inicial e lista do switcher | Grant local anuncia RECEPTIONIST, mas `resolveAccessRoles` continua negando autoridade global |
| Autorizar unidade | `getGymUnitAccess` consulta academia, ator, membro, histórico de grants e unidades ativas; papel legado com unidade permanece local | Titular, grant local, legado local, aluno, revogação, inatividade e suspensão |
| Carregar alunos | `getGymReceptionSnapshot`, RepeatableRead, estudantes com perfil e papel vigente na unidade principal selecionada | Unidade B não aparece para operador A; nenhuma senha, CPF ou configuração de autenticação no DTO |
| Mostrar situação | Status do cadastro e contrato persistidos; indicadores separados de faturas não canceladas com saldo; última passagem relatada vem de GymAccessLog | Contrato pausado, saldo parcial vencido/aberto, pagamento integral e cancelamento |
| Paginar | 30 registros, ordenação estável por criação/ID, total/hasNext e página efetiva | 31 cadastros divididos em 30+1 sem repetição; parâmetros inválidos recusados |
| Trocar unidade/página | Navegação volta ao snapshot do servidor; limpa feed, diagnóstico e modais e deixa de operar dados antigos durante transição | Contrato de servidor verificado; comportamento visual ainda pendente |
| Consultar feed | Guard recebe unidade e limita `limit` a inteiro 1..50 | Verificação HTTP específica registrada no conjunto quando executada |
| Emitir giro | Botão depende de capacidade da unidade; conserva chave durante falha de rede e bloqueia operação em andamento | Idempotência do comando testada em PostgreSQL/HTTP; recuperação visual de erro pendente |

Busca, plano e situação filtram **a página atual**, explicitamente anunciado. Não foi implementada uma busca global de alunos disfarçada de filtro local. CPF integral foi substituído pelo número local de matrícula; nome/e-mail/foto permanecem necessários ao atendimento contextual. Situação ACTIVE é estado do contrato, sem provar recebimento, vigência completa, comando executado ou permissão física. `financialStatus` distingue ausência de mensalidades de saldo zerado.

## Cobertura e pendências

| Arquivo | Profundidade | Pendências |
|---|---|---|
| `application/gym-unit-access.ts` | Autoridade acompanhada com banco real | Aplicação às demais páginas; OWNER local/copropriedade não redefinidos |
| `application/gym-reception-query.ts` | Queries/seleções/DTO/paginação cruzados com schema e quatro testes | Múltiplos contratos, visitas em outra unidade e busca global contextual |
| `domain/access-roles.ts`, `application/context-service.ts`, `components/application/actions.ts` | Papéis de navegação separados dos papéis de autorização; lista inicial/switcher alinhadas | Escolha real no navegador e demais locais de seleção |
| `gym/reception/page.tsx`, `reception-client.tsx` | SSR/props/seleção/mensagens/controles revistos | Navegador, erro de navegação, mobile/teclado; cliente legado contém tipos pouco precisos ainda a consolidar |
| `api/gym/reception/feed/route.ts`, `gym-biometrics-service.ts` | Handler/capacidade/unidade e origem do feed acompanhados | Snapshot único de todo o feed, timezone civil, limite de equipamentos e autores alternativos |
| `tests/gym/reception-scope.integration.ts` | Quatro casos executados com PostgreSQL real | Jornadas HTTP/navegador não são automaticamente demonstradas por estes casos |

O conjunto PostgreSQL passou com 130 casos depois deste lote. Os resultados atuais, incluindo qualquer falha HTTP intermediária, constam de [verificacoes-isoladas.json](verificacoes-isoladas.json). A leitura não cria fatura, aceite, comando ou passagem. A contagem do feed ainda precisa distinguir entradas de saídas e sincronizar timezone com a política; não se afirma que todo indicador operacional esteja concluído.

Achados tratados parcialmente: GYM-AUD-002, 011, 036 e 048. Ver [contrato de acesso/agente](acesso-agente-credenciais.md) e [tratamento individual](tratamento-achados.md).
