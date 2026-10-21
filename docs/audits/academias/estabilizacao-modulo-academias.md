# Estabilização do módulo de academias

Trabalho em andamento. A auditoria original e seus anexos permanecem como evidência histórica. Este documento registra alterações implementadas e verificações; não declara o módulo homologado antes dos testes operacionais.

A posição anterior ao novo escopo está preservada nos resultados históricos; o marco atual está registrado abaixo.

<!-- escopo-atual-inicio -->
## Escopo atual após instrução de 02/10

CRM, aulas e equipamentos GYM foram retirados das fontes operacionais. [Retirada e verificação](estabilizacao/retirada-modulos.md) substituem o escopo dos lotes físicos abaixo, mantidos como histórico. O personal vinculado será a última etapa: reutilizar a área PERSONAL com operações/visibilidade próprias do GYM e workspace autônomo privado, trial/quota/paywall existentes. Essa etapa ainda não foi implementada.

Posição atual após implementação e verificações: 36 achados corrigidos e verificados, 13 retirados do escopo, 2 implementados aguardando verificação específica e 14 pendentes. São 16 achados abertos, detalhados na lista exaustiva.
<!-- escopo-atual-fim -->

## Estado inicial e isolamento

Checkout `56f221bfebcf7aabe48fa4bba760d57372804398`, com alterações locais anteriores em 42 arquivos rastreados e o módulo GYM ainda não rastreado pelo Git. O [snapshot inicial](estabilizacao/estado-inicial.json) registra hashes de 935 arquivos e o status, sem copiar credenciais ou valores de ambiente. Nenhum reset, seed, migration ou operação financeira foi executado contra o banco configurado.

PostgreSQL 17.11 portátil foi baixado da distribuição oficial EDB para `.tmp/gym-stabilization`. Cluster próprio, endereço `127.0.0.1`, porta `56432`, banco `atlasfit_gym_stabilization_20261001`, sem conexão com bancos existentes. O início foi autorizado pelo sandbox. O schema completo gerado por `prisma migrate diff --from-empty` criou 135 tabelas; isso verifica o schema atual, ainda não a cadeia histórica de migrations. Testes usam somente dados sintéticos e integrações externas desabilitadas.

O [lote de pausa efetiva e financeiro por unidade](estabilizacao/pausa-e-escopo-financeiro.md) registra as alterações de 03/10, migration aditiva, 34 cenários PostgreSQL e jornada HTTP, incluindo a nova decisão de troca imediata com aceite e aprovação financeira.

A [troca e renovação com novo contrato](estabilizacao/revisao-contratual-manual.md) implementa a decisão de 03/10: aprovação real da gestão, novo aceite, obrigação inicial própria e substituição atômica após recebimento/ativação. Lista/detalhe respeitam unidade; sessão de suporte não assina pelo aluno. O anexo registra migration e provas, sem declarar concluídos achados compostos.

O [lote de caixa, repetição e unidades](estabilizacao/caixa-retry-unidades.md) consolida transferências/sangrias únicas, replay sem editar turno fechado e leitura autorizada de contas/turnos/despesas. PostgreSQL e HTTP verificaram as invariantes; interface e SSR completo seguem com limitações explícitas.

Os [relatórios por unidade e carteira](estabilizacao/relatorios-escopo-unidades.md) e a [jornada financeira com catálogo autorizado](estabilizacao/financeiro-unidades-catalogo.md) conectam consultas, página e comandos. Validação focal e limites estão nos anexos; os achados compostos continuam abertos.

A [administração e suspensão de workspace](estabilizacao/administracao-suspensao-workspace.md) completa GYM-AUD-014: estado persistido, atualização estrita, titularidade atômica e feedback de recarga. PostgreSQL/HTTP/TypeScript aprovados; homologação visual continua pendente.

O [lote de equipe, convites e desligamento por unidade](estabilizacao/equipe-convites-unidades.md) completa GYM-AUD-004 e GYM-AUD-024 no escopo atual. Consultas, SSR e comandos compartilham autoridade; convite tem entrega manual explícita e aceite/cookie verificados. PERSONAL conserva identidade/vínculo; sua experiência afiliada permanece por último.

O [lote de indicadores temporais](estabilizacao/indicadores-temporais.md) separa posição atual de eventos do período, corrige normalização contratual/renovação/coorte e atraso civil. PostgreSQL, HTTP e tipos verificam o lote; GYM-AUD-036 permanece parcial nos dados legados, histórico completo e limites descritos. A continuação das consultas SuperAdmin está no anexo seguinte.

O [lote de indicadores SuperAdmin](estabilizacao/superadmin-indicadores.md) separa contratos dos alunos de licenças SaaS, elimina percentuais fixos e histórico sem fatos suficientes, normaliza ciclos e reduz os DTOs de transações. PostgreSQL (10), HTTP (4) e tipos verificam o lote; reconciliação legada, desempenho e homologação visual seguem pendentes.

## Arquitetura e sequência

O limite de empresa é Workspace GYM; GymUnit identifica a unidade. User mantém identidade global, WorkspaceMember e grants mantêm participação e autoridade local. GymPlanVersion preserva condições contratadas. GymEnrollment representa o contrato; GymInvoice, a obrigação; GymPayment, o recebimento; GymPaymentAllocation, a alocação. O livro de caixa registra entradas e compensações.

Consolidação incremental: autorização e DTOs; autenticação/contexto; financeiro manual e transição externa; jornadas de pessoas/contratos; marca e configuração; experiência operacional sem CRM/aulas/equipamentos; regressão e interface. Serviços PERSONAL continuam responsáveis por assinatura pessoal e integrações pessoais.

Lotes recentes: [ativação e decisão sobre menores](estabilizacao/ativacao-conta.md), [importação com prévia no servidor](estabilizacao/importacao.md) e [caixa/despesas](estabilizacao/caixa-despesas.md). O acompanhamento continua em andamento; nenhuma implantação foi realizada.

O lote de 02/10 acrescenta [cadastro, responsáveis, contratos e extrato do aluno](estabilizacao/cadastro-responsaveis.md): cadastro/CRM transacionais, ficha local, representação atual, aceite do conteúdo exibido, componente contratual nos portais e leitura financeira GYM sem gateway. A sidebar estudantil usa a seleção comum. A inspeção visual e o ciclo completo de matrícula continuam pendentes.

A [configuração global do superadmin](estabilizacao/configuracao-global.md) foi reorganizada com componentes existentes, controles comprovados e ajuda secundária. Rascunho e aplicado são distintos; gravação parcial exige baseline e compara concorrência no banco, com auditoria atômica. A página relê os valores antes de confirmar sucesso e oferece recuperação de erro. Defaults só afetam novas academias. Interação visual/teclado/mobile continua pendente.

O [lote do portal estudantil](estabilizacao/portal-aluno-contexto.md) vincula dashboard, treinos e bloqueio ao contexto atual, retira listeners de wallet no GYM, protege a gravação da prescrição e impede restauração de papel revogado por perfil persistido. Preserva execução de treino com origem conhecida no mesmo workspace; troca/logout limpa dados. O extrato usa fotografia consistente do banco. Os cenários HTTP positivos incluem treino compartilhado e cobrança legada PERSONAL.

## Matriz PERSONAL × GYM

O [estudo do personal vinculado](estabilizacao/personal-vinculado-estudo.md) registra a leitura adicional de autenticação, criação, trial, paywall, navegação, aluno, agenda e marca. A implementação específica permanece por último; a matriz distingue evidência lida de jornada ainda não verificada.

O [lote de biblioteca e prescrição de treinos](estabilizacao/treinos-biblioteca-prescricao.md) conecta `/gym/workouts`, corrige substituição não atômica de exercícios e valida autoridade atual, unidade, atribuição e catálogo. Prescrição tem retry idempotente; cópia conserva métodos/grupos/preferências. Edição avançada e homologação visual permanecem pendentes. PERSONAL conserva seus handlers/componentes; os resultados HTTP e regressão abaixo distinguem cobertura parcial de conclusão do módulo.

O [lote de acesso/agente/credenciais](estabilizacao/acesso-agente-credenciais.md) separa avaliação de comando físico, protege retirada/ACK/replay e torna atômicos os relatos online/offline. Biométrica/facial permanece indisponível; QR/RFID exige contexto e sincronização em etapas. A [recepção por unidade](estabilizacao/recepcao-unidades.md) aplica escopo do servidor, paginação e situações baseadas em contratos/faturas, sem heurística de atividade. Esses lotes não homologam hardware ou navegador.

A [recuperação de equipamentos](estabilizacao/recuperacao-equipamentos.md) preserva histórico na origem, gera sincronização verificável no destino e aceita relato tardio limitado do dispositivo retirado. Abertura contínua retorna indisponibilidade, sem falsear ativação física; encerramento de registro legado é local e auditado. Os limites de processamento, interface de substituição e homologação permanecem explícitos.

Veja a [matriz de alinhamento atual](estabilizacao/alinhamento-personal-gym.md), com os sete eixos exigidos e a profundidade real da leitura/verificação. A tabela abaixo registra o ponto de partida; não é uma declaração de jornadas completas.

| Jornada | PERSONAL encontrado | GYM encontrado | Reuso e diferença | Verificação necessária |
|---|---|---|---|---|
| Workspace | Store Valtio e switcher; seleção inicial usa cookie | Mesmo switcher, layout sem inicialização de marca | Uma action para cookie, store, rota e refresh; quotas PERSONAL separadas | Duas empresas, perfis e reload |
| Marca | Nome, slug, slogan, cor, logo, marca-d’água e capa persistem em Workspace | Campos existem, configuração não os oferece | Reutilizar armazenamento e componentes; autorização workspace/manage e licença GYM | Persistência, contraste, aluno e troca |
| Identidade | Perfil do treinador em User | Operadores e alunos globais com cadastro local | Perfil global não deve mudar por preferência local | Usuário compartilhado entre empresas |
| Alunos/equipe | APIs próprias com papéis legados | Member/Profile/RoleGrant e unidade | Reutilizar UI e serviços comuns só após verificar autorização | Assignment e multipapéis |
| Treinos/saúde/arquivos | Workout/Evaluation/StudentFile compartilhados | Adapters GYM e cliente órfão | Reutilizar edição e exibição; licença e ACL próprias | Regressão de treino e arquivo |
| Financeiro | Mensalidade de assessoria e SaaS pessoal são distintos | Invoice/Payment e carteira externa misturados | Reutilizar apresentação e contas internas; recorrência GYM é local e manual | Transações e concorrência em PostgreSQL |

Matriz ainda em aprofundamento: calendário, avaliações, arquivos, ingresso, financeiro e portal PERSONAL precisam de leitura completa e regressão específica antes de concluir equivalência.

## Matriz de personalização

| Recurso existente PERSONAL | Persistência | Equivalência GYM | Estado de implementação |
|---|---|---|---|
| Nome e slug | Workspace.name/slug | Identificação da academia | Formulário e API implementados; persistência/isolamento verificadas em PostgreSQL |
| Slogan | Workspace.slogan | Apresentação local da marca | Implementado; persistência verificada |
| Cor principal | Workspace.primaryColor | Navegação, ações, foco e destaques | HEX validado, fallback e foreground calculados; navegador/mobile pendentes |
| Logo | logoUrl/logoKey | Marca da academia | Formulário/upload integrados; validação efetiva do objeto R2 ainda pendente |
| Marca-d’água | watermarkUrl/watermarkKey | Material de treino da academia | Edição integrada; material de treino e upload real ainda não homologados |
| Capa de treino | workoutCoverUrl/workoutCoverKey | Material de treino da academia | Edição integrada; material de treino e upload real ainda não homologados |
| Dados profissionais pessoais | User | Perfil de colaborador, quando aplicável | Não copiar como identidade da academia |

O [ciclo financeiro local e a transição dos eventos externos](estabilizacao/ciclo-financeiro-local.md) registram o lote atual, evidências e decisões pendentes.

## Financeiro manual e retirada da wallet

Direção autorizada: novas obrigações recorrentes são internas, por competência/vencimento; baixa registra dinheiro recebido e seu operador. Pagamento parcial mantém saldo. Reversão preserva o recebimento original e gera compensação de alocação/caixa. Cancelamento contratual é uma operação distinta.

A página financeira não carrega mais perfil/saldo/subconta/cobrança externa. As abas e formulário de onboarding foram retirados. Oito endpoints exclusivos e os métodos de saque, refund externo, onboarding, emissão externa e conciliação automática respondem 410. A configuração de assinatura e geração de ciclos passou para serviço manual; tentativa PROVIDER é recusada. `/api/gym/finance/legacy` oferece consulta limitada, sem segredos ou comandos. Registros, subcontas e eventos não foram apagados; matrícula com referência externa exige revisão administrativa antes da transição, evitando mensalidade local duplicada sobre cobrança externa. Processamento de webhook legado ainda requer estabilização e verificação específica.

`ManualSubscriptionService`: primeira fatura comum inclui plano e taxa de matrícula; revisão contratual usa o valor inicial aprovado, sem nova taxa; ciclos subsequentes incluem o plano. Chave única de recorrência por matrícula/competência e transação Serializable protegem retry/concorrência. Calendário conserva o dia de referência e limita ao último dia do mês (31/janeiro → 28/fevereiro → 31/março). A geração não pressupõe recebimento. Encerrar recorrência desativa novas gerações e conserva contrato, faturas e recebimentos; cancelar matrícula é ação distinta.

`ManualFinanceService`: alocações somam exatamente o recebimento; saldo é relido dentro da transação; conta pertence à academia; dinheiro exige caixa do operador aberto. Reversão mantém pagamento e alocações originais, recompõe saldos e grava compensação negativa no caixa. Registro é idempotente com chave por academia e fingerprint do conteúdo. `issueManualInvoice` valida relações e desconto; ID de aprovador recebido do cliente não concede alçada. Ativação consulta fatura quitada e aceite persistidos; `paymentVerified` do cliente é ignorado.

O [lote de caixa e despesas](estabilizacao/caixa-despesas.md) acrescenta validação transacional de contas/unidades/operadores, concorrência de saldo e fechamento, baixa parcial de despesa, ledger individual, idempotência de criação/baixa e reversão compensatória. Histórico agregado anterior permanece intacto; não foi fabricado recibo para registros antigos. GYM-AUD-018 e GYM-AUD-026 estão corrigidos e verificados nas condições originais; GYM-AUD-036 permanece parcial nas pendências descritas.

## Decisões e migrações

- `20261005000000_gym_manual_invoice_retry` adiciona chave única e fingerprint nullable para emissão avulsa. Retry não cria nova obrigação e revalida autorização; histórico preservado. Aplicada somente ao banco descartável; consumidores de emissão precisam enviar chave estável e implantação/baseline continuam pendentes.

- `20261003020000_gym_cash_movement_retry` adiciona chave única/fingerprint nullable para movimento e transferência. Histórico preservado, aplicada somente ao banco descartável. Clientes atuais enviam chave estável; implantação/baseline seguem pendentes.

- Troca imediata autorizada pelo usuário exige novo aceite e ajuste financeiro aprovado pela gestão. Contrato sucessor conserva o histórico anterior; crédito nominal automático foi retirado. A nova vigência e obrigação são exibidas para confirmação, e ativação exige recebimento integral ou obrigação zero explicitamente aprovada.
- `20261003010000_gym_contract_revisions` adiciona ligação de sucessão, metadados de aprovação/retry e valor inicial, com FK Restrict, check não negativo e índice de revisão vigente. Aplicada somente ao banco descartável; baseline/implantação continuam pendentes.

- Suspensão impede operações ordinárias; superadmin conserva recuperação administrativa. Caminhos físicos/offline foram retirados e pertencem a uma task futura separada.
- Grants são autoridade após provisionamento: um grant revogado ou de outra unidade não recupera o papel legado. Um papel legado só vale quando nunca houve grants.
- Pedido de privacidade é solicitação pendente; autoridade local não pode apagar User global ou consentimentos de outros vínculos.
- Dinheiro é armazenado em BigInt centavos; inputs precisam de inteiros e conversões de apresentação não podem arredondar silenciosamente.
- `20261001000000_auth_session_revocation` adiciona User.sessionVersion com default zero. Aplicação depende desta migration; nenhuma aplicação em ambiente existente foi realizada.
- `20261001010000_gym_manual_finance` acrescenta chave de recorrência, fingerprint, conta do recebimento e unicidade de alocação. Duplicidades históricas precisam de prévia/reconciliação antes do índice; não foram eliminadas automaticamente.
- `20261001020000_gym_invitation_profile` persiste CREF/cargo do convite. Alteração aditiva aplicada somente ao banco descartável.
- `20261001030000_gym_booking_concurrency` impede reserva e fila ativas duplicadas por sessão/aluno com índices parciais; preserva registros encerrados.
- `20261001040000_gym_global_role_concurrency` impede grants globais ativos duplicados por membro/papel. A prévia aborta se houver duplicidades; não elimina histórico revogado. Aplicada somente no banco descartável.
- `20261001050000_gym_expense_receipts` acrescenta pagamentos individuais e chaves de retry, checks de valor/reversão e índices parciais de turno OPEN por operador/conta. Prévia aborta conflitos históricos. Aplicada e verificada somente no banco descartável; não existe autorização implícita para executar em produção.
- `20261001060000_setup_token_expiry` adiciona prazo nullable de convite; novos caminhos revisados usam 48 horas. Legado sem prazo exige reemissão explícita, sem exclusão automática. Aplicada somente no PostgreSQL descartável. Prévia de importação tem uma hora e usa entidades existentes.
- `20261002000000_gym_student_registration_integrity` acrescenta escopo/chave/fingerprint de cadastro, backfill pelo membro, unicidade tenant/matrícula e triggers de coerência com escritores legados. Prévia aborta órfãos/duplicidades sem renumerar ou apagar histórico. Aplicada somente ao PostgreSQL descartável; cadeia histórica e implantação permanecem pendentes.
- A cadeia histórica foi executada separadamente em `atlasfit_gym_migrations_20261001`, inicialmente vazio: falhou na segunda migration, `20260810041500_add_activation_fee_recovery_operations`, por ausência de `PaymentProviderAccount` (P3018/42P01). A primeira migration cria um modelo compartilhado bastante anterior ao schema atual, inclusive assinatura por workspace versus assinatura pessoal por usuário. Isso impede tratar a geração direta do schema como comprovação da cadeia. O [resultado sanitizado](estabilizacao/cadeia-migrations.txt) conserva a falha. Não foram reescritas migrations históricas nem inferido o estado de produção. Instalação nova e transição de bases existentes precisam de estratégias distintas com prévias.
- `20261002010000_gym_device_command_integrity` acrescenta unicidade dispositivo/chave e trigger de pertencimento academia/unidade/dispositivo. Prévia interrompe conflitos sem apagar histórico. Aplicada e verificada somente no PostgreSQL descartável; implantação permanece pendente.

Perguntas de produto apresentadas e ainda sem resposta: uma ou várias matrículas simultâneas; geração durante pausa. Não considerar essas políticas concluídas. O bloqueio defensivo de geração em matrícula PAUSED não é homologação da regra de cobrança/retomada. Tolerância de inadimplência continua dependente das políticas já persistidas; não foi inventada regra de retenção legal.

Decisão confirmada pelo usuário: **menor acessa pelo responsável; conta própria aguarda revisão dos termos**. Cadastro do aluno e histórico permanecem. A elegibilidade atual é conferida em Credentials/MFA/JWT/reset/setup; novas importações e cadastro assistido reconhecido como menor não emitem convite próprio. O encaminhamento do responsável verificado está implementado, mas criação/identificação/aceites e portal completos ainda requerem integração. Nenhum documento legal foi reescrito.

## Alterações e testes

Primeiras alterações: guard de suspensão e unidade; seleção explícita de User nos serviços GYM; omissão de token de cartão nas consultas de matrícula; PATCH aluno exige gestão; recepção exige acesso; prova de autenticação única; sessão com versão e papel atual; switcher conectado à action; layout GYM inicializa marca; criação/exclusão PERSONAL separadas do GYM; cron sem segredo rejeitado; pedido de privacidade sem anonimização global.

`node scripts/test-gym-isolated.cjs`: **139 aprovações e 0 falhas** na última execução concluída. PostgreSQL real descartável, incluindo helpers puros e HEAD de storage simulado. Cobre financeiro/recorrência, marca, privacidade, convites, titularidade/handover, grants, vagas/fila, responsáveis/saúde, realtime, provisionamento/licença, MFA/reset/setup, ACL/quota, CSV, caixa/despesas, importação/menor, portal estudantil, acesso/credenciais/comandos/eventos/cache e recepção por unidade. Aprovação do conjunto não homologa navegador, R2 ou hardware.

`node scripts/test-gym-http.cjs`: **22 aprovações e 6 falhas** na última execução concluída. Aplicação copiada sem credenciais externas em .tmp/gym-http-app, porta 31173. Abrange autenticação/revogação, tenant/suspensão/wallet 410, responsável sem equipe, DTO/MFA administrativos, contexto por cookie/tipo, ACL/upload, operações PERSONAL, caixa/despesa, Server Actions de setup, menor e importação. Cookie/prova MFA de fixture não homologam switcher ou entrega de e-mail. A primeira ampliação teve 13 aprovações e uma falha de 120 segundos com compilações a frio; a repetição foi interrompida pelo restart do daemon. Resultados posteriores não apagam essa limitação.

`node scripts/test-gym-personal-regression.cjs`: **77 aprovações e 0 falhas** no subconjunto de seis arquivos compartilhados, após o lote de treinos. Algumas fixtures espelham lógica; não prova os portais PERSONAL. São subconjunto da suíte existente.

`node scripts/test-gym-existing.cjs`: **239 aprovações e 173 falhas**, sem skips, nos 412 casos existentes. Antes da importação nova eram 305/107. Aumento registrado sem presumir que toda falha seja fixture. Mocks/licenças/grants/atores e contratos antigos foram identificados, mas classificação individual/correção de código ou testes continua pendente. Nenhum guard foi afrouxado para obter aprovação.

<!-- verificacoes-focais-inicio -->
Lotes focados com resultados próprios, preservando a última execução completa:

- `node scripts/test-gym-setup-isolated.cjs`: 8 aprovações, 0 falhas, 0 casos não executados; setup/MFA de conta e política de menor. Filtros não aprovam casos excluídos e não substituem a suíte completa.
- `node scripts/test-gym-workout-http.cjs`: 2 aprovações, 0 falhas, 26 casos não executados; biblioteca/prescrição e autoridade de instrutor. Filtros não aprovam casos excluídos e não substituem a suíte completa.
- `node scripts/test-gym-config-isolated.cjs`: 11 aprovações, 0 falhas, 0 casos não executados; configuração global, concorrência/baseline/rollback e regressão de treinos. Filtros não aprovam casos excluídos e não substituem a suíte completa.
- `node scripts/test-gym-config-http.cjs`: 1 aprovações, 0 falhas, 28 casos não executados; contrato HTTP global, persistência/conflito/payload/revogação. Filtros não aprovam casos excluídos e não substituem a suíte completa.
<!-- verificacoes-focais-fim -->

TypeScript passou após o lote de configuração global e o leitor JSON compartilhado (`npx.cmd tsc --noEmit --incremental false`, saída 0). Uma execução intermediária apontou o código novo de conflito ausente da união de erros; a união foi corrigida e a repetição passou. A análise do escopo do compilador identificou 878 entradas e nenhuma dentro de .tmp; a cópia HTTP não foi excluída artificialmente para obter aprovação. Houve uma falha intermediária na discriminação da resposta de setup, corrigida por narrowing explícito; nova execução passou. O [registro sanitizado das execuções](estabilizacao/verificacoes-isoladas.json) contém comandos, resultados e nomes de casos, sem credenciais ou valores de fixtures. Aviso do driver sobre consultas paralelas numa mesma conexão ainda precisa ser localizado. Uma primeira execução HTTP da despesa retornou 500 porque o processo conservava o Prisma Client anterior à geração do modelo novo; o servidor descartável foi reiniciado e o teste passou. Ocorreram execuções intermediárias de 11/6 e 16/7 durante reinício automático do Next por memória. O código instalado confirma reinício ao atingir 80% do limite de heap; isso explica desconexões, sem concluir que toda falha futura seja infraestrutura. Execuções anteriores de 20, 21 e 22 cenários passaram. Os resultados posteriores e as falhas são preservados; não são medição de produção.

<!-- limites-execucao-focal -->
O host de teste possui aproximadamente 15,69 GiB de RAM. Durante a suíte HTTP longa, restaram cerca de 0,59 GiB disponíveis; após encerrar o Next descartável, havia 3,74 GiB. A execução completa mais recente terminou com 22 aprovações e seis desconexões durante restart por heap. A cópia isolada preserva arquivos sem mudanças, usa otimização de memória de webpack e mantém o React Compiler; a configuração de produção não foi alterada. Falta de memória motivou execução por lotes e encerramento do daemon entre lotes. Falhas de download de fontes por EACCES exigiram autorização do comando do servidor para acesso público à rede; nenhum segredo externo foi habilitado. Lotes focais posteriores aprovados não transformam a última suíte completa em aprovação. Não há benchmark de produção.

As tentativas anteriores de controle visual falharam por runtime/permissão/browser indisponível. Em 05/10/2026, a [validação no navegador do responsável](estabilizacao/validacao-visual-responsavel.md) foi concluída para cinco jornadas com Chrome instalado e Playwright temporário, em aplicação/DB isolados. Capturas, teclado, recuperações e correções específicas estão registrados. As demais superfícies, outros tamanhos/temas, acessibilidade sistemática e integrações reais permanecem pendentes.

O [acompanhamento dos 65 achados](estabilizacao/tratamento-achados.md) registra situação original, intervenção, arquivos, dependências e evidência individual.

As [falhas da suíte existente](estabilizacao/falhas-suite-existente.md) são listadas individualmente por arquivo/teste/sintoma, com hipóteses e classificação de causa ainda pendente. Não são descartadas como mocks nem usadas para afrouxar controles. O catálogo de 65 achados e o documento principal da auditoria foram lidos integralmente. A leitura integral dos inventários extensos, dicionário, cobertura e planos, assim como o estudo completo das jornadas PERSONAL, ainda não foi concluída; as matrizes explicitam a profundidade disponível.

## Dependências e limites atuais

CRM GYM, aulas e hardware foram retirados da operação por revisão de escopo. Referências de homologação física nos anexos anteriores são históricas e pertencem à futura task separada, não à conclusão do escopo atual. Produção, agendamento implantado, estado real das assinaturas externas, saldos e pedidos de saque não foram inspecionados. O inventário legado será baseado nos dados sintéticos locais e em consultas administrativas preparadas, sem presumir ausência de operações reais.

Documentação operacional histórica também contém afirmações que não constituem evidência: runbooks anunciam PITR/backup/agente instalado e reconciliação via gateway; checklist inclui wallet e expectativas físicas. A retirada autorizada da wallet prevalece. Não executar esses caminhos históricos como parte do financeiro manual; capacidade física e ambiente implantado exigem confirmação própria.


O [portal do responsável: extrato e documentos](estabilizacao/portal-responsavel-financeiro-aceites.md) implementa leitura financeira com poder específico, termos e ciência de privacidade vinculados ao conteúdo exibido, para contas já verificadas. PostgreSQL 27/0, HTTP 4/0 (34 casos fora do filtro) e TypeScript completo passaram. Ingresso seguro do responsável, conferência operacional e validação visual permanecem pendentes; os achados compostos conservam seus estados anteriores.


Continuidade: o [ingresso do responsável por convite](estabilizacao/ingresso-responsavel.md) implementa emissão/reemissão assistida, criação pelo próprio adulto e vínculo de conta existente mediante login. Convite de 48 horas/uso único, identidade, documentos e auditoria são revalidados na transação. PostgreSQL 28/0, HTTP 6/0 (34 fora do filtro) e TypeScript completo passaram. A dependência de ingresso tem agora este fluxo implementado; conferência humana real, entrega automática, casos legados e validação visual continuam pendentes. Os achados compostos conservam seus estados anteriores.


A [validação visual do responsável](estabilizacao/validacao-visual-responsavel.md) acrescenta cinco jornadas aprovadas em desktop/celular, onze capturas e correções de vigência de documentos, rolagem da ficha e PATCH que repunha parentesco/poderes omitidos. PostgreSQL 23/0, unitários de privacidade 22/0 e TypeScript completo exit 0. As pendências visuais dos parágrafos anteriores passam a referir-se às demais jornadas; os achados compostos e a homologação externa conservam seus estados.

## Reaceite e estabilidade do cliente — 05/10

O [lote de reaceite, preferências e analytics](estabilizacao/reaceite-preferencias-analytics.md) completa três pendências observadas na validação visual anterior e o tratamento de rejeições no setup/cleanup Ably. PostgreSQL 12/0, HTTP focal 3/0, unitários 31/0, TypeScript completo 0 e seis jornadas no navegador com zero pageerror. Achados compostos permanecem abertos. A [lista exaustiva do restante](estabilizacao/pendencias-restantes.md) reúne os 40 achados abertos e Personal vinculado por último.

## Políticas de matrícula aprovadas — 05/10

O usuário confirmou geração suspensa durante pausa e uma matrícula ativa por aluno/academia. O [lote de políticas de matrícula](estabilizacao/politicas-matricula-pausa.md) aplica checagens transacionais, filtro/revalidação da geração e prepara índice parcial com preflight. PostgreSQL 46/0, HTTP 2/0, SQL da migration 2/0 e TypeScript completo 0. Não houve aplicação da migration à tabela pública/banco configurado/produção. Competências após pausas longas, legado, migrações e jornadas completas continuam pendentes; a [lista exaustiva](estabilizacao/pendencias-restantes.md) foi atualizada.


<!-- authority-20261006 -->
## Sete tópicos do ponto 1 — 06/10

O [lote de autoridade, licença e quotas](estabilizacao/autoridade-licenca-quotas.md) completa permissões, unidades, titularidade, suspensão, licenças, quotas e auditoria no GYM mantido. Verificação final: 207 integrações PostgreSQL, quatro HTTP focais, um unitário com SDK S3 real e TypeScript completo aprovados. Os achados 001, 002, 003, 015, 042 e 053 foram atualizados com evidências; restam 34 achados abertos. Migração/produção, bucket legado, R2/Ably reais e jornadas visuais continuam nos achados próprios. A DDL de auditoria/inventário foi aplicada somente ao banco descartável. Resultados intermediários preservados no manifesto; evidências anteriores continuam históricas. A [lista exaustiva do restante](estabilizacao/pendencias-restantes.md) foi regenerada.


<!-- privacy-20261006 -->
## Privacidade, saúde, identidade e representação — 06/10

O [ponto 2](estabilizacao/privacidade-saude-identidade.md) completa o escopo local dos achados 005/007/008/009/010/060. Saúde local, autorização de vínculo, pedidos e exclusão com retenção/retry, portabilidade com binários, portal do responsável e transição de maioridade foram implementados e verificados. Resultado: 229 PostgreSQL/0 falhas, quatro HTTP focais/0 falhas/48 fora do filtro, três jornadas Chrome/4 capturas/0 pageerror e TypeScript completo exit 0. Migration aplicada apenas ao banco descartável. Revisão jurídica, R2 real, legado e implantação permanecem explícitos. O [manifesto](estabilizacao/verificacoes-privacidade.json) preserva resultados e hashes; a [lista de tudo que falta](estabilizacao/pendencias-restantes.md) contém 28 achados abertos.


<!-- transitions-20261007 -->
## Transições contratuais, cancelamento e reconciliação — 07/10

O [ponto 3](estabilizacao/transicoes-cancelamento-reconciliacao.md) completa os comandos e formulários locais. Pausa pula vencimentos suspensos sem retroatividade; troca/renovação exigem novo aceite, recebimento e ativação. Cancelamento encerra propostas e pausas sem apagar obrigações. Revisão administrativa inclui contratos externos históricos, faturas, contas e movimentos de caixa, com evidência imutável e sem receita fictícia. Resultado: 245 PostgreSQL/0 falhas, quatro HTTP focais/0 falhas/52 excluídos, seis jornadas Chrome/0 pageerror e TypeScript exit 0. Migrations somente no banco descartável. Achados 021/023 fechados no escopo local; legado/índice/implantação permanecem em 022/030/043/046. O [manifesto](estabilizacao/verificacoes-transicoes.json) e a [lista completa do restante](estabilizacao/pendencias-restantes.md) registram a posição atual: 26 achados abertos.


<!-- deliveries-20261007 -->
## Webhooks, entregas e baseline — 07/10

O [lote de entregas](estabilizacao/entregas-webhooks-baseline.md) implementa webhook transacional, recuperação PROCESSING, outbox cifrada, preferências concorrentes e comunicação GYM idempotente. Verificação: 256 integrações, 59 HTTP completos, três serviços reais sintéticos e TypeScript aprovados. Baseline fresca/repetida e transição existente com sete cobranças sintéticas passaram; histórico antigo sintético coexistiu com deploy/status. Inventário real somente READ ONLY. O [manifesto](estabilizacao/verificacoes-entregas.json) preserva resultados e hashes. Implantação, conferência documental e as demais jornadas continuam na [lista dos 26 achados abertos](estabilizacao/pendencias-restantes.md).


<!-- realtime-20261007 -->
## Realtime por contexto — 07/10

O [achado 049](estabilizacao/realtime-contexto.md) foi corrigido e verificado: ACL explícita por workspace/vínculo, troca de conexão no React, callbacks antigos descartados e leitura/publicação estrangeiras recusadas no Ably real. O [manifesto](estabilizacao/verificacoes-realtime.json) registra 258 integrações, 77 testes PERSONAL, 60 HTTP e cinco cenários React aprovados. Restam 25 achados abertos; implantação e política global de autenticação continuam em 043/065.


<!-- configuration-browser-20261008 -->
## Configurações verificadas — 08/10

Os achados 013 e 016 foram corrigidos e verificados em sete cenários Chrome/Next/PostgreSQL. Endereço de unidade, recarga, falha de confirmação, concorrência, teclado e celular passaram. O [manifesto](estabilizacao/verificacoes-configuracoes.json) conserva resultados, capturas e falhas intermediárias. Restam 23 achados abertos.


<!-- security-20261008 -->
## MFA e encerramento — 08/10

O achado 064 foi corrigido e verificado. O encerramento próprio 057 foi implementado e testado, conservando pendência de política/purga. O [manifesto](estabilizacao/verificacoes-seguranca-encerramento.json) registra 264 integrações, 16 testes focais, cinco HTTP, quatro cenários Chrome e TypeScript aprovados. Restam 22 achados abertos.


<!-- bigint-20261008 -->
## Serialização verificada — 08/10

O achado 012 foi corrigido e verificado em duas jornadas HTTP com settings completo e valores acima de 2^53, incluindo configuração, atualização administrativa, dependentes, extrato e SSR. O [manifesto](estabilizacao/verificacoes-bigint.json) define as superfícies e limites verificados. Restam 21 achados abertos.


<!-- csv-consumidor-20261008 -->
## CSV em consumidor nativo — 08/10

O achado 059 foi corrigido e verificado com abertura, salvamento e reabertura das exportações reais sintéticas no LibreOffice. A verificação detectou e corrigiu perda de centavos em números grandes, que agora são texto. [Evidências e limites](estabilizacao/verificacoes-csv-consumidor.json). Restam 20 achados abertos.


<!-- treinos-avancados-20261008 -->
## Treinos e navegação mantida — 08/10

O achado 045 foi corrigido e verificado: métodos/grupos, preservação de fichas, revisão concorrente e recepção/biblioteca navegáveis na aplicação real. [Manifesto](estabilizacao/verificacoes-treinos-avancados.json). Restam 19 achados abertos.


<!-- contexto-workspace-20261009 -->
## Contexto e trial — 09/10

O achado 048 foi corrigido e verificado: seleção/recarga, papéis, retorno GYM/PERSONAL, quota, trial revogado e upgrade real. [Manifesto](estabilizacao/verificacoes-contexto-workspace.json). Restam 18 achados abertos.


<!-- session-revocation-20261009 -->
## Sessões e impersonação — 09/10

O achado 065 foi corrigido e verificado: papel/credenciais atuais, revogação, troca de senha, grants de suporte/retorno, auditoria e expiração global. [Detalhamento](estabilizacao/sessao-revogacao.md) e [manifesto](estabilizacao/verificacoes-sessao-revogacao.json). Restam 17 achados abertos.


<!-- storage-dashboard-20261009 -->
## Armazenamento administrativo — 09/10

Paginação, busca, filtros, agregação global, retry e teclado verificados. [Detalhamento](estabilizacao/storage-dashboard.md) e [manifesto](estabilizacao/verificacoes-storage-dashboard.json). O achado 052 permanece parcial e o total continua em 17 achados abertos.


<!-- student-ingress-20261009 -->
## Ingresso do aluno e interrupção solicitada — 09/10

Achado 020 corrigido e verificado. [Detalhamento](estabilizacao/ingresso-aluno.md) e [manifesto](estabilizacao/verificacoes-ingresso-aluno.json). Restam 16 achados abertos. Lote em andamento concluído; demais implementações interrompidas a pedido do usuário. [Lista para retomada](estabilizacao/pendencias-restantes.md).
