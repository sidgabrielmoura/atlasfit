# Treinos: biblioteca e prescrição por academia

Estado: implementação funcional parcial do módulo, com validação de domínio em PostgreSQL. A conclusão deste lote não encerra GYM-AUD-045: aulas, CRM e o cliente de acessos têm pendências próprias. Não declara homologação de navegador, arquivos ou editor avançado.

## Operação conectada

`/gym/workouts` deixou de redirecionar para o dashboard. O servidor resolve a academia pelo contexto comum, confere o namespace GYM e carrega modelos autorizados com paginação e filtros. O snapshot define a identidade do componente cliente; refresh após uma mutação substitui o estado anterior. A marca segue o layout do workspace já implementado.

| Operação | Interface / contrato | Controle efetivo |
|---|---|---|
| Consultar modelos | Página SSR; GET `/api/gym/workouts/templates`, busca/objetivo/dificuldade, 20 por página, máximo 50 | Vínculo atual, academia ativa e `workouts.read` em pelo menos uma unidade autorizada. Biblioteca institucional compartilhada; nunca inclui workspace PERSONAL, legado sem workspace ou fichas de alunos |
| Criar modelo | Modal, POST `/api/gym/workouts/templates` | `workouts.manage.assigned` global; usuário criador derivado da sessão. Grant somente local não concede edição da biblioteca global |
| Editar modelo | Modal, PATCH `/api/gym/workouts/templates/:id` | Autor atual com capacidade global ou gestão atual. Boolean de gestor do cliente não é aceito. Exercícios substituídos e auditoria na mesma transação |
| Desativar modelo | Confirmação, DELETE `/api/gym/workouts/templates/:id` | Mesma autoridade de autoria/gestão; soft delete idempotente. Prescrições anteriores e histórico permanecem |
| Buscar alunos | GET `/api/gym/workouts/students`, nome/matrícula, 30 por página | Unidades atuais com capacidade de prescrição, perfil e vínculo STUDENT ativos. Instrutor vê somente atribuídos; grant STUDENT deve corresponder à unidade do aluno |
| Buscar exercícios | GET `/api/gym/workouts/exercises`, nome, 30 por página | Catálogo global já representado por Exercise: oficial, READY ou APPROVED, excluindo REJECTED. Solicitação pessoal pendente, inclusive do proprietário, não vira recurso institucional |
| Prescrever | POST `/api/gym/workouts/assign`, aluno + modelo ou ficha própria, dia 0–6/null, chave de idempotência | Academia/unidade/vínculo/atribuição atuais; fonte ativa do mesmo GYM; validação do catálogo. Retries concorrentes da mesma solicitação retornam a mesma ficha |
| Consultar ficha de aluno | GET `/api/gym/students/:id/workouts` | Autorização sobre aquele aluno e sua unidade no domínio; leitura geral do workspace não autoriza outro recurso. Até 20 fichas ativas |

Biblioteca global e prescrição por unidade são responsabilidades distintas. A permissão de navegação de instrutor local não o promove a gestor global. Responsável legal utiliza seu portal próprio; não recebe acesso às APIs de operador por ter representação legal.

## Integridade e contratos

- `gym-workout-contract.ts` valida tipos sem coerção arbitrária: nome, objetivos, duração, até 100 exercícios, séries inteiras positivas, textos limitados e ordem única. Criação exige ao menos um exercício. Payload HTTP tem limite efetivo de 256 KiB durante a leitura. Campos de ator/grants/gestor enviados pelo cliente são recusados.
- `gym-workout-service.ts` mantém a fachada pública; delega aos comandos atuais. Os parâmetros legados `isManagerOrOwner` e `actorMemberId` não concedem autoridade. Ausência de ator em leitura ou chave de prescrição é recusada, inclusive em chamadas diretas.
- Criação, edição, desativação e prescrição usam Serializable com retry de conflito. Auditoria e recalculação de uso dos exercícios participam da transação. Falha de validação ou auditoria não pode deixar um modelo sem seus exercícios.
- Idempotência da prescrição usa marcador e fingerprint auditados, com academia, ator e conteúdo normalizado. A autoridade atual é revalidada antes de retornar um retry. Chave reutilizada com outros dados retorna 409. Não depende de cache de processo nem de confirmação na interface.
- A cópia conserva séries, repetições, cargas, observações, descanso, método/configuração, overrides e grupos; recria os IDs dos grupos no destino. As preferências `allowRepsModification`, `allowCompleteView` e `allowSkipExercises` são copiadas como condições da ficha, sem depender da assinatura pessoal do proprietário.
- Edição simplificada dos exercícios de um modelo avançado retorna 409 antes de apagar qualquer linha. A tela oferece edição de identificação e preferências, mantendo exercícios avançados somente leitura. O editor avançado equivalente ao PERSONAL continua pendente.
- DTOs usam seleção explícita; não incluem senha, CPF, tokens, MFA, saúde ou payload interno do usuário. Erro inesperado retorna identificador de correlação; o log não imprime corpo de requisição, identidade ou segredo.
- Autorização sobre alunos também restringe o papel legado com unidade: um vínculo local sem grants não passa a consultar alunos de outra unidade. Trata-se de regra GYM; os adapters PERSONAL permanecem distintos.

## Alinhamento com PERSONAL

Referências inspecionadas neste lote: `personal/workouts/page.tsx` (lista, busca paginada de exercícios e efeitos assíncronos), `personal/workouts/[id]/edit/page.tsx` (formulário, descanso, duração, preferências e métodos), `/api/personal/workouts` (leitura, criação e transação de grupos/exercícios), `/api/personal/workouts/exercises` (catálogo, pedidos privados e vídeos), além dos handlers de edição/duplicação revisados anteriormente.

| PERSONAL existente | Equivalência GYM | Reuso | Diferença / pendência |
|---|---|---|---|
| Modelos pessoais e editor de exercícios | Modelos institucionais e prescrições locais | Entidades Workout, WorkoutExercise, WorkoutExerciseGroup; componentes UI existentes | Sem importar biblioteca privada do proprietário. Editor avançado GYM ainda indisponível |
| Duração e descanso com componentes comuns | Mesmos seletores no formulário GYM | WorkoutDurationSelect e RestTimeInput sem alterar implementação PERSONAL | Labels e agrupamento contextual GYM; teclado/mobile ainda não inspecionados |
| Preferências de execução por ficha | Três booleans editáveis/copiados | Mesmo schema/modelo e portal estudantil existente | Integração visual da execução e do responsável ainda precisa homologação |
| Pedido pessoal de exercício pendente | Somente catálogo compartilhado autorizado | Estados oficiais/aprovados já utilizados | Não copia a permissão por creatorId global, pois Exercise não tem workspace próprio |
| Prescrição para o vínculo do personal | Aluno da academia, unidade e instrutor atribuídos | Persistência compartilhada e experiência de formulário | GYM exige contexto e concessões locais atuais; não vincula receita/quota a assinatura PERSONAL |

Não foi copiada a coerção `Number(sets) || 4`, a conversão `Boolean(valor)` ou o uso de `any` dos handlers pessoais. A ausência de validações completas nos fluxos pessoais inspecionados continua registrada, sem reescrita geral destes handlers neste lote.

## Validação e limites

`tests/gym/workout-integrity.integration.ts` tem cinco cenários sobre PostgreSQL real descartável: isolamento PERSONAL/catálogo privado; grants, unidade e atribuição; quatro prescrições concorrentes com uma ficha/auditoria; métodos/grupos/preferências preservados; falha real de inserção na auditoria por trigger temporário com rollback integral. O trigger de injeção é criado exclusivamente no banco guardado de testes e removido em `finally`; não é migration do produto.

Os testes HTTP adicionados percorrem página SSR e operações reais, incluindo o instrutor local, spoof de boolean, revogação e retry. O resultado final de cada execução consta em [verificacoes-isoladas.json](verificacoes-isoladas.json); os artefatos intermediários não foram descartados. O subconjunto de quatro testes de treinos em `gym-070.test.ts` recebeu fixtures explícitas de ator/unidade/catálogo/estado e a chave de prescrição, mantendo as expectativas originais de isolamento e autoria. Mocks não substituem os cinco cenários PostgreSQL.

Pendências: edição/criação de métodos avançados na UI, arquivos/capas/vídeos de treino, histórico de execução completo e seus efeitos secundários, portal de treinos do responsável, avaliação visual desktop/mobile/teclado, performance em volume real. Histórico limitado da API não representa consulta integral. Paginação dos seletores não aumenta quota nem substitui a validação no ato de prescrever. Nenhuma migração, notificação externa ou operação em equipamento foi executada neste lote.
