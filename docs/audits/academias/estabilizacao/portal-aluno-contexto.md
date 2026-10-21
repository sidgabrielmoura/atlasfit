# Portal do aluno: contexto, treinos e financeiro

Lote de 02/10/2026, posterior ao [cadastro e contratos](cadastro-responsaveis.md). Implementação incremental; não conclui a estabilização dos 65 achados nem a homologação dos portais.

## Condições encontradas e alterações

| Entrada | Condição anterior confirmada | Implementação atual | Evidência e limite |
|---|---|---|---|
| `/api/student/dashboard` | Primeiro vínculo STUDENT, independentemente do cookie; resumo por nome em WorkspacePayment também no GYM | Resolver comum do workspace; DTO de identidade selecionado; GYM usa obrigações/alocações locais, centavos exatos e indicação de financeiro manual | HTTP de usuário com PERSONAL e GYM e obrigação acima de MAX_SAFE_INTEGER; métricas e timezone completos permanecem pendentes |
| `/api/student/lock-status` | StudentBilling de todos os vínculos definia bloqueio legado | PERSONAL limitado ao workspace e, no legado nullable, conta pessoal de seu proprietário. GYM retorna modalidade manual, sem consultar wallet ou impor o bloqueio PERSONAL | HTTP com cobrança local, cobrança de outra assessoria e cobrança externa histórica GYM; não comprova direito físico de entrada |
| `/api/student/workouts` GET | Primeiro vínculo; modelos da academia e prescrições eram misturados | GYM: somente prescrições próprias ativas. PERSONAL: preserva treinos próprios/compartilhados. Histórico não inclui definição de treino de outro workspace | HTTP positivo e negativo; bibliotecas e CRUD de profissionais ainda exigem aprofundamento |
| `/api/student/workouts` POST | WorkoutId não era ligado ao workspace e aluno antes da persistência | Contexto comum, seleção explícita do treino autorizado, Zod de valores/séries e pertencimento de IDs de exercícios. Modelo GYM, treino alheio, inativo ou de outro workspace são recusados | HTTP de negativas sem logs e execução legítima PERSONAL/GYM com preferências externas desligadas; retry, transação do log/indicadores e concorrência do modo restrito ainda pendentes |
| Vídeos de prescrição GYM | Links também aceitavam vídeos do profissional em outro workspace | Vídeo GYM exige workspace da prescrição. PERSONAL mantém o compartilhamento anterior | Alteração de query; cenário positivo/negativo específico de vídeos ainda pendente |
| Histórico mal vinculado | WorkoutLog tinha workspace próprio sem cruzar workspace de Workout relacionado | Leituras de dashboard e treinos exigem workout.workspaceId correspondente | Nenhum registro antigo removido; reconciliação de logs inconsistentes permanece pendente |
| Papel estudantil | Perfil persistido podia restaurar acesso após revogação de STUDENT | Histórico de grants é autoritativo; STUDENT ativo precisa ser global ou da unidade do vínculo. Perfil/papel legado só têm fallback sem qualquer histórico de grants | PostgreSQL/HTTP de revogação com sessão existente. Perfis multipapel históricos sem STUDENT explícito precisam de reconciliação, sem promoção automática |
| Store de execução | Cargas e timer persistiam globalmente entre workspaces | Execução guarda workspaceId; troca/logout limpa dados. Inicialização/reload do mesmo workspace preserva execução com origem conhecida | Teste de store em Node; localStorage/browser ainda não verificados. Execução antiga sem origem confiável é descartada na primeira seleção |
| Clientes dashboard/treinos | Fetch inicial único, listeners wallet também no GYM | Dashboard remove consulta/listener de bloqueio sem consumidor. Treinos só consultam bloqueio/ouvem wallet no PERSONAL. Mudança de contexto limpa dados, aborta request anterior e verifica workspace da resposta | TypeScript e contrato HTTP; corrida no navegador/teclado/mobile ainda pendente |
| Extrato GYM | Agregados e lista tinham fotografias de banco potencialmente diferentes | RepeatableRead para identificação, obrigações, recebimentos e indicadores. Reversão continua visível e excluída do recebido líquido | PostgreSQL real: oito leituras concorrentes com baixa preservam recebido + saldo; lista/histórico continuam paginados/limitados |

## Regra de bloqueio e preservação do PERSONAL

`GYM_MANUAL` em lock-status significa que o bloqueio legado da wallet PERSONAL não se aplica. Não significa contrato ativo, catraca liberada, dispensa de mensalidade ou bypass de uma avaliação física. A política física, matrícula, reservas e projeções ainda precisam convergir nos achados 022/023/038–041/062–063.

O resumo GYM mostra mensalidades internas e recebimentos registrados. Não mostra saldo de gateway. Históricos externos permanecem no banco e não são cancelados, processados ou baixados por essa leitura. O PERSONAL continua com seu contrato de cobranças, PIX e bloqueio anterior, agora limitado ao vínculo selecionado. O adapter atual grava o payload PIX em texto na coluna historicamente chamada `pixPayloadEncrypted`; não foi inventado um protocolo de descriptografia ou removido PIX funcional com base apenas nesse nome. A nomenclatura/armazenamento precisa de revisão própria.

A leitura/gravação legítima de treino PERSONAL compartilhado foi exercitada via HTTP. A regressão compartilhada selecionada teve 77 aprovações. Isso não homologa assinatura externa, checkout, entrega de mensagens ou todos os portais PERSONAL.

## Arquivos e cobertura

| Responsabilidade | Arquivos | Pendência |
|---|---|---|
| Seleção e papel atual | `src/lib/student-auth.ts`, `src/modules/workspaces/domain/student-membership.ts`, `student-authority.ts`, `enrollment-contract.ts` | Aplicar regra e unidade a todos os portais/caminhos alternativos; teste específico de aceite com grant revogado |
| Cobranças PERSONAIS | `src/lib/student-billing-scope.ts`, `/api/student/finance`, `/api/student/lock-status` | Settlement legado por nome, consultas externas PERSONAL e eventos legados GYM |
| Treinos e dashboard | `src/lib/student-workout-scope.ts`, `/api/student/workouts`, `/api/student/dashboard` | Idempotência/atomicidade, paginação, timezone, direitos contratuais, efeitos secundários recuperáveis |
| Cliente e execução | Páginas `student/dashboard`, `student/workouts`; `workspace.store.ts`, `workout.store.ts` | Persistência real, troca durante gravação, timers/UI, material impresso e demais páginas com contexto antigo |
| Extrato local | `gym-student-finance.ts` | Explicitar limitações de histórico e recuperação administrativa de vínculo suspenso; medir consultas |
| Testes | `tests/gym/http.spec.ts`, `tests/gym/student-context.integration.ts` | Browser real, vídeos, logs legados adulterados e concorrência restrita de treino |

As leituras GET de dashboard/treinos ainda recalculam streak e podem escrever no vínculo. Esse efeito anterior foi preservado neste lote; separar consultas e projeção de indicadores continua pendente. Nenhum fluxo foi declarado totalmente somente leitura por causa do extrato financeiro.

## Verificações e ocorrências

- Antes deste lote: PostgreSQL 109/0 e HTTP 17/0.
- Ampliação: PostgreSQL 112/0 e HTTP 20/0, incluindo helpers/store, autenticação e respostas reais do Next com banco descartável. Os artefatos atuais estão em [verificações](verificacoes-isoladas.json).
- Uma execução intermediária HTTP teve 11 aprovações e seis `fetch failed`. O processo Next registrou reinício automático por limiar de memória. O runner isolado passou a reservar heap de até 8 GiB, em máquina de 16 GiB, mantendo porta local e credenciais externas ausentes. Isso é ajuste de ambiente de testes, sem alteração da configuração de produção.
- Duas falhas intermediárias na ampliação PostgreSQL eram erros dos novos fixtures: campo inexistente de RoleGrant e enum de pagamento inválido. Foram corrigidos conforme schema real, sem afrouxar autorizações ou resultados esperados.
- TypeScript e verificações finais devem ser consultados pelo resultado concluído, não por sessão ainda em andamento. A suíte antiga permanece com 131 falhas no último levantamento, individualizadas em [falhas-suite-existente.md](falhas-suite-existente.md).

O catálogo completo `achados.md` e o documento principal da auditoria foram lidos integralmente nesta continuação. Inventários extensos, dicionário, cobertura e planos ainda possuem leitura integral pendente; não confundir conclusão dessa leitura com conclusão dos achados.
