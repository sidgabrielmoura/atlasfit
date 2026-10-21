# Troca de plano e renovação com novo contrato — 03/10/2026

Implementação incremental; não representa conclusão de todos os achados do módulo.

## Decisão confirmada e representação

O usuário escolheu **troca imediata após novo aceite, com ajuste financeiro aprovado pela gestão**. O fluxo anterior calculava crédito sobre o preço contratado, sem comprovar recebimento, alterava a matrícula em uso e reutilizava seu aceite. A renovação também podia ativar uma matrícula pendente sem novas condições aceitas.

`GymEnrollment` continua representando o contrato. A revisão cria outro registro, ligado ao anterior por `supersedesEnrollmentId`, em `PENDING_ACCEPTANCE`. O contrato anterior, sua assinatura, suas obrigações e seus recebimentos não são reescritos. Esta ligação representa uma sucessão contratual, não concede duas matrículas ativas. Um índice parcial permite somente uma revisão não encerrada por contrato anterior. A política geral de múltiplas matrículas independentes continua aguardando decisão.

Campos aditivos: `supersedesEnrollmentId`, `changeKind`, `changeRequestKey`, `changeRequestFingerprint`, `initialChargeInCents`, `changeApprovedByUserId`, `changeReason`. A chave e o fingerprint não são incluídos nos DTOs públicos de matrícula. O pagador e a unidade são herdados; sua compatibilidade é novamente conferida pelo servidor.

## Jornada ponta a ponta

| Etapa | Autoridade e efeito efetivo |
|---|---|
| Preparar troca | Ator precisa `enrollments.manage`, `invoices.issue` e `workspace.manage` na unidade real. A confirmação financeira é literal `true`; o boolean não concede autoridade. Plano e versão precisam estar ativos na mesma academia. Motivo obrigatório e valor inicial em centavos inteiros, não negativos e apresentáveis sem perda de precisão. |
| Prévia | Mostra o novo preço, a data de início prevista e recebimentos persistidos como string exata. Crédito automático é zero. Não grava dados. |
| Preparar renovação | Exige contrato anteriormente ativado, com aceite, em ACTIVE ou EXPIRED, sem cancelamento/pausa. Usa a mesma versão ainda disponível e sua duração/preço. Não aceita duração arbitrária nem agendamento legado enviado pelo cliente. |
| Novo contrato | Novo registro `PENDING_ACCEPTANCE`, acesso falso, taxa de matrícula zero. Início imediato usa a data da proposta; renovação antecipada começa no término anterior; troca futura começa no próximo vencimento, ou término quando não há vencimento configurado. Datas são apresentadas ao signatário. |
| Aceitar | Portais existentes do aluno adulto e do responsável exibem outro contrato. Digest cobre preço, vigência, versão, contrato anterior, valor inicial e justificativa. Identidade, representação, licença e plano são conferidos. Contrato anterior é bloqueado e revalidado antes de aceitar. |
| Gerar obrigação | O aceite cria atomicamente a primeira fatura da revisão, com o valor aprovado, número de ciclo 1 e chave de recorrência. Falha de pagador/geração desfaz também o aceite e a transição. Nenhum recebimento é inventado. Ciclos posteriores aguardam ativação. |
| Receber | Utiliza o financeiro manual existente, conta/unidade autorizadas, alocação e operador. Pagamento parcial mantém saldo e não permite ativação. |
| Ativar | Exige novo aceite, vigência, licença válida e a fatura canônica de ciclo 1 integralmente satisfeita no valor aprovado. Não aceita `paymentVerified` como prova nem override para dispensar uma obrigação positiva da revisão. Revalida o contrato anterior. |
| Substituir | Na mesma transação, anterior fica CANCELLED, sem acesso, com geração encerrada; novo fica ACTIVE. Eventos e auditorias relacionam ambos. Faturas e recebimentos anteriores permanecem. Retry não repete a substituição. |
| Próximos ciclos | Preço da versão nova, separado do ajuste inicial. Recorrência continua interna, sem gateway, wallet ou onboarding financeiro. |

Uma obrigação inicial zero aprovada pela gestão pode ser registrada como PAID com total e recebido iguais a zero; não cria GymPayment nem entrada de caixa. O valor aprovado representa a primeira obrigação da nova contratação. Não reduz dívidas anteriores e não representa devolução de dinheiro. Uma correção de recebimento anterior usa a reversão rastreável existente; créditos legados exigem reconciliação, sem reaproveitamento automático. Não foi acrescentada uma estrutura contábil de crédito/devolução parcial.

Troca futura e renovação antecipada **não são ativadas automaticamente**: após aceite e recebimento, a gestão ativa quando a nova vigência começar. A proposta pode ser cancelada pelo fluxo de cancelamento existente, preservando seu histórico. O contrato anterior permanece até a substituição; não se promete troca imediata antes das condições efetivas.

## Autorização, concorrência e recuperação

- Transações Serializable com retry limitado e bloqueio do contrato anterior. Aceite e ativação bloqueiam primeiro o anterior e depois a revisão.
- Repetição com a mesma chave/conteúdo/ator retorna a mesma revisão, após nova autorização. Conteúdo divergente retorna 409; permissão revogada retorna 403. Outra proposta em aberto retorna 409.
- FK da relação de sucessão usa Restrict; histórico não é eliminado por exclusão da matrícula anterior. Índice parcial impede propostas vigentes duplicadas também no banco.
- Assinatura externa, crédito ou versão programada legados impedem a nova revisão até reconciliação explícita. Nenhuma operação externa foi cancelada.
- Pausa, cancelamento, mudança de unidade ou incompatibilidade posterior impedem confirmação/ativação. Obrigações já aceitas permanecem para reconciliação, sem apagar fatos.
- Sessão de impersonação não registra aceite pelo aluno/responsável. A consulta de suporte não equivale à manifestação do signatário.
- Lista e detalhe de matrículas consultam grants e unidades autorizadas dentro da mesma transação da leitura. Papel legado local não lê todas as unidades; filtro de unidade alheia retorna 403 e detalhe alheio retorna 404. API e SSR usam ator atual.

## Interface

O diálogo antigo de pró-rata foi substituído por seleção do plano, início da vigência, valor da obrigação inicial, justificativa e aprovação explícita da gestão. Usa Select, Input, Label, Checkbox e Dialog existentes, com altura limitada e rolagem. A ação só aparece para gestão habilitada; o servidor decide sobre a unidade de cada matrícula.

Os toasts informam preparação pendente de aceite/recebimento/ativação. A renovação não anuncia acesso atualizado antes da ativação. O financeiro distingue retry de um recebimento já revertido. Não houve inspeção visual de desktop/mobile/teclado nesta etapa.

## Arquivos e migration

| Responsabilidade | Fontes |
|---|---|
| Contrato de entrada, prévia, proposta e autoridade | `src/modules/workspaces/application/enrollment-revision.ts` |
| Facade, DTO monetário e leituras por unidade | `src/modules/workspaces/application/enrollment-service.ts` |
| Novo aceite e obrigação atômicos | `src/modules/workspaces/application/enrollment-contract.ts` |
| Ativação e substituição | `src/modules/workspaces/application/enrollment-activation.ts` |
| Valor inicial e ciclos seguintes | `src/modules/workspaces/application/manual-subscription-service.ts` |
| Unidade/permissão de consulta e apresentação | `src/modules/workspaces/application/gym-unit-access.ts` |
| APIs estritas | `src/app/api/gym/enrollments/route.ts`, `[id]/route.ts`, `[id]/change-plan/route.ts`, `[id]/renew/route.ts`, `[id]/simulate-change-plan/route.ts` |
| Interface | `src/app/(gym)/gym/enrollments/page.tsx`, `enrollments-client.tsx`, `src/app/(gym)/gym/finance/finance-client.tsx` |
| Migration | `prisma/migrations/20261003010000_gym_contract_revisions/migration.sql` |

Migration aplicada exclusivamente ao PostgreSQL descartável `127.0.0.1:56432/atlasfit_gym_stabilization_20261001`, por `scripts/gym-apply-revision-isolated.cjs`. Colunas nullable preservam registros existentes. Sem backfill de crédito, sem exclusão/cancelamento real e sem aplicação em ambientes existentes. O índice parcial e check monetário são SQL complementares ao schema Prisma. A cadeia histórica continua com o bloqueio previamente documentado; esta aplicação isolada não comprova implantação.

O helper de pró-rata nominal e cálculo antigo de renovação ficaram sem consumidores e foram retirados. O mock comercial antigo `gym-034.test.ts` foi preservado em `.tmp/gym-retired-sources` e substituído por cenários com PostgreSQL real, aceite e pagamentos. [Manifesto e hash](retirada-testes-comerciais.json). A retirada acompanha a mudança de regra; não declara a suíte antiga aprovada.

## Verificações e limites

Resultados individualizados e falhas anteriores: [verificacoes-isoladas.json](verificacoes-isoladas.json).

- `contract-revisions`: 43 casos aprovados, 0 falhas, reunindo revisão, contrato, pausa, financeiro manual e unidades. A primeira execução teve 42 aprovações e 1 falha na fixture de grant; o raw anterior permanece. A última execução ampla antecede a ampliação das consultas por unidade.
- `contract-revisions-specific`: quatro cenários compostos de PostgreSQL real, ampliados com unidade, revogação, licença, rollback e mudança posterior do contrato anterior. O artefato registra a última execução e não presume execução de casos fora do arquivo.
- `http-contract-revisions`: uma jornada HTTP autenticada, com gestor restrito à unidade, lista/detalhe, plano/aceite/baixa/ativação reais e recusa de assinatura em impersonação. O filtro deixa 27 casos sem execução; não representa homologação do navegador ou entrega de MFA por e-mail.
- Prisma generate e validate aprovados. [Typecheck do lote](typecheck-revisao-contratual.json); compilação não prova comportamento operacional.

PERSONAL não utiliza os comandos/schema de matrícula GYM alterados. Sua carteira, CRM e calendário permanecem. Isso não substitui a regressão final dos portais nem a implementação do personal vinculado, ainda reservada para a última etapa.

Pendências: política geral de matrículas simultâneas e geração durante pausa, fechamento integral de GYM-AUD-022/030, reconciliação de assinaturas/créditos/agendamentos legados, revisão de cancelamento de uma proposta com obrigação já paga, todos os caminhos de licença/autorização do módulo, UX visual e cadeia histórica de migrations. Não se declara o módulo estabilizado por este lote.
