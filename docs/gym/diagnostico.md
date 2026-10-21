# AtlasFit — Diagnóstico para Expansão a Academias

Data: 24/09/2026. Repositório: `C:/Users/gabriel/development/atlasfit`. Branch `main`, commit `56f221b` de 23/09/2026. Working tree limpo antes e depois das verificações.

**Conclusão:** a expansão é viável dentro do projeto atual. Há bons componentes reutilizáveis, mas autorização, modelagem financeira e histórico de migrações precisam ser estabilizados antes de conectar uma academia com múltiplos funcionários e catraca. A primeira entrega solicitada inclui uma unidade, aulas, catraca biométrica e alunos menores de idade.

## 1. Alcance e limites da análise

Foi inventariada a estrutura de `src`, suas 78 páginas e 194 arquivos de rotas, e os 94 modelos do schema Prisma. A leitura detalhada concentrou-se nos caminhos de autenticação, seleção de workspace, alunos, onboarding, treinos, avaliações, agenda, CRM, cobranças, recorrência, carteira, webhooks, storage, privacidade e integrações. Foram lidas as quatro regras locais em `.agents/rules`, a referência de Asaas e a skill `using-ably`.

O inventário lista páginas, endpoints, modelos e testes. Inventário completo de caminhos não significa execução funcional de todas as telas ou auditoria formal de segurança de cada linha.

Não consultei dados de produção, arquivos de segredos, painel do gateway, equipamento físico nem configuração real de infraestrutura. O schema no banco e o funcionamento em produção continuam sujeitos a validação. Nenhum arquivo do projeto foi modificado; os documentos estão na pasta `outputs` desta tarefa.

## 2. Base tecnológica observada

| Camada | Situação no projeto | Consequência para a expansão |
|---|---|---|
| Aplicação | Next.js 16.2.6, App Router, React 19.2.4, TypeScript estrito | Manter a aplicação e adicionar grupo `(gym)` |
| Banco | PostgreSQL, Prisma 7, adapter `pg`, singleton com extensão de consultas | Manter; tornar contexto do tenant explícito |
| Autenticação | NextAuth v5 beta, Credentials, PrismaAdapter, JWT | Reaproveitar identidade; mudar autorização e destino de navegação |
| UI | Tailwind 4, shadcn/Radix/Base UI, Figtree, dark mode, Lucide, Sonner | Compor a interface com os componentes locais |
| Estado | Valtio; `workspace.store.ts` persistido em localStorage | Incluir tipo/contexto e limpar dados ao alternar conta/workspace |
| APIs | Route Handlers e algumas Server Actions; respostas e validação heterogêneas | Novos handlers finos, Zod, services e DTOs uniformes |
| Organização de domínio | Boa referência em `src/modules/payments/{domain,application,providers,security,webhooks}` | Usar a mesma separação nos novos módulos |
| Pagamentos | AbacatePay na assinatura SaaS; Asaas na carteira/cobrança de alunos | Preservar a separação comercial dos dois fluxos |
| Comunicação | Ably, Firebase Cloud Messaging, Resend, chat próprio | Reaproveitar serviços após revisão de escopo/permissões |
| Arquivos | Cloudflare R2 via API S3; upload, proxy e quotas | Reaproveitar para contratos/anexos privados |
| Importação | CSV/planilhas, Gemini, revisão, deduplicação, commit e créditos | Adaptar importação de matrículas, responsáveis e saldos |
| PWA | Service worker com fallback offline | Não resolve operação offline de catraca |
| Data Connect | Schema de exemplo de filmes e SDK gerado; nenhuma referência de consumo encontrada no código de produto pesquisado | Não eleger esse caminho como segundo banco da expansão |

As versões acima são as declaradas no `package.json`; não constituem recomendação de atualização de dependências.

## 3. O que já existe e como reaproveitar

| Domínio | Base encontrada | Adaptação necessária |
|---|---|---|
| Organização | `Workspace`, marca, slug, proprietário, membros, seleção | `type=GYM`, unidade, configurações, permissões e licença da academia |
| Alunos | `User` + `WorkspaceMember`, pendentes, cadastro, convite, inativação | Matrícula contratual separada, responsáveis, histórico e cadastro sem login obrigatório |
| Profissionais | Dados de perfil em `User`, papéis `TRAINER` e `ASSISTANT` no schema | Gestão de equipe, convites, vínculo aluno-profissional, turnos e revogação |
| Treinos | Catálogo, ficha individual, grupos/métodos, vídeos e execução | Biblioteca da academia, autoria preservada e acesso por atribuição |
| Avaliações | Avaliações físicas, anamnese, medidas, fotos e arquivos | Escopo por aluno autorizado; não liberar dados de saúde para recepção |
| Agenda | `TrainerTask`, calendário, tarefas CRM | Criar aulas/sessões/reservas; tarefa não representa lotação ou presença |
| Financeiro simples | `WorkspacePlan`, `WorkspacePayment`, recorrência em membro | Legado; não usar como núcleo de cobrança da academia |
| Carteira | Conta, cobrança, assinatura, split, ledger, payout, webhook | Generalizar titularidade para academia e corrigir conciliação |
| CRM | Leads, atividades, tarefas, tags, campos e conversão | Preservar origem, responsável comercial e vínculo com matrícula |
| Comunicação | Chat, notificações, e-mails e Engage | Audiência por papel/atribuição e tratamento específico de menores |
| Governança | Documentos legais, aceite, consentimento, exportação e exclusão | Responsável atuando por menor, finalidade/workspace e integração com dispositivo |
| Superadmin | Gestão de usuários, workspaces, planos, pagamentos, logs e suporte | Tipo de workspace, licença gym, saúde das integrações e suporte auditado |

## 4. Achados que condicionam a implementação

Prioridades abaixo são para o planejamento. São evidências estáticas do código; não afirmam que ocorreu incidente em produção.

### D01 — Autorização insuficiente em rotas compartilhadas · bloqueador

`src/middleware.ts:7` exclui `/api` do matcher. Portanto, as APIs dependem integralmente das verificações dos próprios handlers.

Em `src/app/api/personal/clients/route.ts:34`, a autorização testa somente `userId` e `workspaceId`, sem restringir papel ou exigir vínculo ativo. Padrões semelhantes aparecem em financeiro, organização e avaliações. O GET de alunos devolve `setupToken` em `clients/route.ts:84`.

**Implicação:** não basta proteger `/gym` ou esconder menus. Um aluno ou funcionário sem permissão pode continuar chamando uma API antiga. Antes do piloto, aplicar guard central e DTO sem credenciais a todas as rotas que possam alcançar dados de uma academia, incluindo Server Actions e arquivos.

### D02 — Baixa financeira ampla · bloqueador

`src/modules/payments/webhooks/webhook-processor.ts:138` executa `workspacePayment.updateMany` filtrando somente workspace e status pendente, marcando todos como pagos após confirmar uma cobrança. O mesmo padrão aparece em `src/app/api/student/finance/route.ts:82`; revisar também a sincronização em `payment-service.ts`.

**Implicação:** uma confirmação não identifica univocamente a dívida quitada. Corrigir vínculo por ID de recebível/cobrança, proteger a transição e testar dois alunos com várias dívidas antes de acoplar financeiro à entrada física.

### D03 — Financeiro sem vínculo forte com aluno e tenant · bloqueador

`prisma/schema.prisma:552`: `WorkspacePayment` guarda `studentName`, `planName` e `amount Float`, sem FK de aluno, matrícula ou cobrança externa. `src/app/api/personal/clients/[id]/finance/route.ts:74` busca pagamentos por nome.

`schema.prisma:1671`: `PaymentProviderAccount.personalUserId` é único. `StudentBilling` (`:1809`) e `StudentSubscription` (`:1776`) não têm `workspaceId`. O serviço de criação recebe o personal e escolhe associações por `findFirst` (`payment-service.ts:297` e `:406`).

**Implicação:** homônimos, alteração de nome, múltiplos vínculos e titularidade da academia ficam frágeis. Separar ator, aluno beneficiário, pagador e estabelecimento recebedor. Dados ambíguos não podem ser migrados automaticamente por nome.

### D04 — Recorrência interna pode presumir recebimento · bloqueador

`src/lib/recurrence.ts:109` define `status=pago` quando `billingControlType=AUTOMATIC`, sem confirmação externa nessa rotina. O GET financeiro chama o processador (`src/app/api/personal/finance/route.ts:34`).

**Implicação:** geração recorrente e liquidação precisam ser operações distintas. GET não deve gerar cobrança ou alterar pagamento. Escolher apenas um gerador por contrato/ciclo e exigir evidência de pagamento ou baixa manual auditada.

### D05 — Retentativa de webhook e convergência incompletas · bloqueador

`webhook-processor.ts:43` retorna `DUPLICATE` para qualquer evento existente, inclusive falho. O evento persiste hash, mas esse caminho não armazena o payload necessário para replay (`:56`). A lógica de negócio é aguardada dentro do receptor; a falha é gravada como `FAILED_RETRYABLE`, mas a resposta final ainda usa `PROCESSED`.

Há chaves de ledger diferentes para confirmação, liquidação e sincronização pelo aluno. Isso exige provar que o mesmo efeito econômico não é contado várias vezes, e que evento atrasado não regride um estado liquidado para confirmado.

**Implicação:** inbox persistente com conteúdo mínimo suficiente, worker com claim/lease, transições e efeitos únicos, replay e reconciliação. O ID do evento e o ID do efeito econômico resolvem problemas distintos. O Asaas documenta entrega ao menos uma vez e deduplicação por evento. [Fonte oficial](https://docs.asaas.com/docs/como-implementar-idempotencia-em-webhooks).

### D06 — Histórico de migrações não reproduz o schema atual · bloqueador

Foram encontradas somente duas migrações SQL: a inicial cria nove tabelas e a posterior cria uma tabela de recuperação de taxa, alterando tabelas que não aparecem na inicial. O schema atual tem 94 modelos. A inicial também declara `GlobalRole` sem TRAINER/STUDENT e `Subscription.workspaceId`, divergindo do schema atual.

**Implicação:** o histórico versionado, sozinho, não monta o modelo atual em banco vazio. Isso é evidência de lacuna no histórico, não comprovação de corrupção no banco real. Fazer inventário de schema/migrations do ambiente em cópia controlada, baseline revisado e ensaio de upgrade antes de novas migrations. Não executar reset nem marcar migrations aplicadas sem comparação.

### D07 — Papel global e licença individual restringem a expansão · arquitetura

`src/auth.config.ts`, `src/app/dashboard/page.tsx` e os layouts roteiam por `User.role`. O layout do personal exige assinatura/trial do próprio usuário. `getPersonalWorkspaces` e a seleção atual não retornam um conjunto explícito de capacidades por workspace.

**Implicação:** um funcionário não deve comprar assinatura para trabalhar na academia, e um personal deve conseguir ser aluno em outro contexto. Autorizar por vínculo/papel/contexto, com entitlement da academia; manter compatibilidade com o personal atual.

### D08 — Regras 18+ atravessam vários fluxos · escopo confirmado

`src/lib/privacy/age-validator.ts:19` usa mínimo 18. Há chamadas explícitas no cadastro, setup de senha, onboarding do aluno, cadastro de clientes e commit de importação. A política está documentada como decisão comercial em `docs/privacy/legal-decisions.md`.

**Implicação:** não resolver trocando o número 18 por 0. A academia precisa de validação por contexto, representante identificado, aceite por titular representado, comunicação e privacidade adequadas à idade. A regra dos outros módulos permanece em vigor.

### D09 — Indicadores misturam fatos e aproximações · necessário para lançamento

`src/app/api/personal/dashboard/route.ts:113` estima receita por preços fixos de nomes de planos; `:517` usa frequência 3,8 quando há alunos; `:533` projeta receita multiplicando por 1,1. O indicador chamado MRR soma pagamentos do mês por `createdAt`; inadimplência aparece com nome de churn.

**Implicação:** reaproveitar componentes de gráficos, mas criar métricas da academia com fórmulas e fontes explícitas. Frequência de academia vem de entrada/presença, não de execução de treino ou uso do app.

### D10 — Realtime sem capacidade explicitamente delimitada · necessário para lançamento

`src/app/api/ably/token/route.ts:16` cria token com `clientId`, sem `capability`. Não inspecionei as permissões da API key no painel; portanto, não é possível afirmar seu alcance real.

**Implicação:** restringir canais e operações no servidor conforme vínculo e finalidade. Recepção não pode assinar eventos financeiros ou de saúde; remoção de membro precisa revogar acesso. [Documentação de capabilities](https://ably.com/docs/auth/capabilities).

### D11 — Exclusão de pessoa não equivale a desligamento da academia · necessário para lançamento

`src/lib/privacy/erasure.service.ts:139` pode apagar alunos sem outros vínculos, apagar workspaces do titular (`:168`) e remover o usuário. Existem FKs financeiras Restrict, portanto uma exclusão pode também falhar após passos anteriores.

**Implicação:** separar desligamento de funcionário, cancelamento de matrícula, transferência de proprietário, encerramento da empresa e atendimento de pedido de exclusão. Usar plano de execução recuperável, retenção por categoria e anonimização quando aplicável; nunca aplicar apagamento global para uma simples desativação de matrícula.

### D12 — Agendamento e catraca ainda são domínios novos · escopo

`TrainerTask` tem título, hora, data local e aluno opcional. Não há entidades próprias para turma, vagas, reserva, espera, presença física, dispositivo, credencial biométrica ou concessão offline no schema analisado.

**Implicação:** não estender `TrainerTask` com campos soltos para tentar representar aulas. Criar domínios próprios e uma interface de adaptadores para o equipamento.

### D13 — Operação precisa sair do ciclo de leitura de tela · infraestrutura

Há rate limit em memória (`src/lib/rate-limit.ts`) e rotinas dependentes de chamadas HTTP; o cron de recorrência só rejeita token incorreto se `CRON_SECRET` estiver definido. Não foi encontrada configuração `.github` de CI neste checkout. Isso não prova ausência de CI externo.

**Implicação:** exigir segredo e falhar fechado nos jobs, persistir tarefas e estabelecer execução garantida com monitoramento. Rate limit local não coordena múltiplas instâncias. Não executar controlador de catraca como efeito colateral de uma requisição de página.

### D14 — Dados globais e arquivos precisam de autorização mais granular · arquitetura

`User` contém dados de saúde e contato compartilhados entre workspaces. `storage/file/route.ts` permite acesso de OWNER/TRAINER por workspace e tem regras amplas de anexos de chat por associação ao workspace.

**Implicação:** campos operacionais/saúde da academia devem ser do vínculo ou avaliação local, com projeção mínima por papel. Arquivo privado deve ser autorizado pelo recurso e, em chat, pela conversa; o caminho do objeto não substitui essa verificação.

## 5. Verificações executadas

| Verificação | Resultado | Limite |
|---|---|---|
| `npm test -- --reporter=dot` | 5 arquivos, 66 testes aprovados | Suíte atual tem testes unitários/mocks; não comprova isolamento ponta a ponta |
| `tsc --noEmit --incremental false --pretty false` | Exit code 0, nenhum diagnóstico | Não valida comportamento de negócio ou banco real |
| `git status --short` | Limpo | Nenhuma mudança de produto nesta análise |
| Leitura das migrations | Divergência estrutural documentada | Banco real não consultado |

Avisos não bloqueantes observados nos testes: formato de configuração do Vite para futura mudança de loader e ausência de `RESEND_API_KEY` no processo de teste. Não houve envio de e-mails de teste. Não rodei build de produção, seed, migration ou instalação de dependências.

## 6. Regras locais que devem orientar as telas

- `.agents/rules/configlayout.md`: reutilizar componentes de `src/components/ui`, composição shadcn, dark mode e responsividade.
- `.agents/rules/asyncloader.md`: feedback imediato, submit bloqueado, estados de sucesso/erro e prevenção de clique duplo.
- `.agents/rules/skelletonsloaders.md`: skeleton equivalente ao conteúdo, estados vazio/carregando/erro/sucesso.
- `.agents/rules/confirmationmodals.md`: confirmação visual contextual nas ações destrutivas e em massa. Trata-se de comportamento da interface a implementar; não exigiu interromper este planejamento.

Não é necessário trocar framework, ORM, biblioteca de componentes ou todo o chat para entregar a expansão. A refatoração prioritária deve se concentrar nos limites de acesso, integridade financeira e serviços compartilhados.
