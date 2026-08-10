# Plano de Implementação Revisado e Auditável: AtlasFit Wallet

**Versão:** 2.0  
**Data da revisão:** 05/08/2026  
**Estratégia recomendada:** subcontas BaaS + split de pagamentos, começando com **um único provedor**  
**Status:** não iniciar produção antes da conclusão da Etapa 0

---

## 1. Objetivo do documento

Este documento substitui o plano inicial da **AtlasFit Wallet** e define uma arquitetura financeira mais segura, conciliável e preparada para cobrança de mensalidades dos alunos.

A AtlasFit Wallet permitirá que o personal:

- ative uma conta ou subconta financeira mantida por um provedor parceiro;
- cobre mensalidades e cobranças avulsas dos seus alunos;
- acompanhe pagamentos confirmados, valores em liquidação e saldo disponível;
- receba o valor líquido das cobranças após tarifas aplicáveis;
- solicite transferências para uma conta ou chave Pix de sua titularidade;
- acompanhe estornos, atrasos, falhas e movimentações em um extrato auditável.

> [!IMPORTANT]
> A AtlasFit não deve custodiar dinheiro, manter um saldo financeiro próprio do personal nem se apresentar como banco. O dinheiro e o saldo real devem permanecer no provedor financeiro. O AtlasFit será responsável pela experiência, orquestração, regras comerciais, conciliação, auditoria e visualização dos dados.

---

## 2. Correções conceituais obrigatórias em relação ao plano anterior

### 🔴 CRÍTICO 1 — Não prometer “isenção fiscal” ou “fim da bitributação”

O uso de subcontas e split pode promover segregação financeira entre:

- valor devido ao personal;
- tarifa do provedor;
- comissão da AtlasFit;
- eventuais reservas, antecipações e estornos.

Entretanto, a arquitetura técnica **não garante** que a AtlasFit pagará impostos somente sobre a comissão, nem elimina automaticamente riscos tributários.

A redação correta para produto, contrato e documentação é:

> O modelo de subcontas e split promove segregação financeira entre os valores do personal e a remuneração da plataforma, sujeito à validação jurídica, fiscal e contábil.

Antes da produção, devem ser definidos:

- quem presta o serviço ao aluno;
- quem aparece como recebedor da cobrança;
- quem emite nota fiscal e sobre qual valor;
- natureza jurídica da comissão da AtlasFit;
- responsabilidades por cancelamentos, chargebacks e reembolsos;
- obrigações do personal como PF, MEI ou PJ;
- texto dos termos de uso e política de privacidade.

### 🔴 CRÍTICO 2 — O gateway é a fonte oficial do saldo

Os campos locais `availableBalance` e `pendingBalance` não podem ser incrementados como se fossem o saldo financeiro oficial.

O saldo oficial deve ser consultado no provedor. No AtlasFit, esses valores serão apenas **snapshots sincronizados** para melhorar a interface.

O sistema deve sempre considerar:

```text
Saldo oficial = saldo retornado pelo provedor financeiro
Saldo local = fotografia/cache para leitura e auditoria
Ledger local = histórico interno dos fatos processados
```

Antes de qualquer transferência, o saldo deve ser consultado novamente no gateway.

### 🔴 CRÍTICO 3 — A cobrança deve ser criada na conta correta

No modelo recomendado:

1. o personal possui uma subconta aprovada;
2. a cobrança do aluno é criada autenticando-se em nome da subconta do personal;
3. a comissão da AtlasFit é enviada à conta Master por split;
4. o restante permanece na conta do personal;
5. a tarifa do gateway é aplicada de acordo com as regras do provedor.

Não criar a cobrança na conta Master sem validar precisamente o modelo comercial do provedor. Isso pode inverter o fluxo financeiro, alterar responsabilidades e produzir um split inválido.

### 🔴 CRÍTICO 4 — `PAYMENT_CONFIRMED` não é igual a `PAYMENT_RECEIVED`

Os eventos devem possuir significados separados:

- `CONFIRMED`: pagamento aprovado ou reconhecido, mas possivelmente ainda não disponível;
- `SETTLED/RECEIVED`: valor efetivamente liquidado;
- `AVAILABLE`: saldo elegível para transferência, conforme resposta do gateway.

Um pagamento de cartão pode ser confirmado muito antes de ficar disponível. Creditar o saldo disponível nos dois eventos pode duplicar valores.

### 🔴 CRÍTICO 5 — O webhook não pode executar a operação diretamente sem idempotência

O mesmo evento pode chegar mais de uma vez, atrasado ou fora de ordem.

O endpoint de webhook deve:

1. validar a autenticidade conforme o provedor;
2. persistir o evento bruto com identificador único;
3. responder HTTP `2xx` rapidamente;
4. publicar o evento em fila;
5. processá-lo de forma idempotente;
6. registrar tentativas e erros;
7. enviar falhas permanentes para uma dead-letter queue;
8. reconciliar posteriormente com a API do provedor.

### 🔴 CRÍTICO 6 — Mensalidade exige assinatura, não apenas cobrança avulsa

A principal proposta da Wallet é cobrar mensalidades. Portanto, o domínio precisa incluir:

- plano de cobrança do personal;
- assinatura do aluno;
- ciclo mensal;
- autorização de pagamento;
- cobranças geradas por ciclo;
- tentativas e retentativas;
- inadimplência;
- pausa, cancelamento e reativação;
- Pix Automático ou cartão tokenizado, em fase apropriada.

Sem esse módulo, a funcionalidade será apenas um gerador de cobranças avulsas.

### 🔴 CRÍTICO 7 — Registros financeiros não podem ser apagados em cascata

É proibido utilizar `onDelete: Cascade` em:

- cobranças;
- tentativas de pagamento;
- extrato;
- webhooks;
- saques;
- estornos;
- conciliações;
- regras de tarifa;
- auditorias.

A exclusão de um usuário deve ser lógica (`deletedAt`) e os registros financeiros devem permanecer pelo período de retenção definido juridicamente.

### 🔴 CRÍTICO 8 — A tarifa exibida ao personal deve separar estimativa e valor real

O cálculo não pode considerar somente:

```text
Valor bruto - taxa AtlasFit = valor líquido do personal
```

O cálculo real pode incluir:

```text
Valor bruto
- tarifa do gateway
- comissão AtlasFit
- tarifa fixa AtlasFit
- antecipação, quando aplicável
- ajustes ou retenções
= valor líquido do personal
```

O sistema deve guardar valores **estimados** na criação e valores **efetivos** após liquidação.

### 🔴 CRÍTICO 9 — Saque precisa de proteção além de `prisma.$transaction`

Uma transação local não impede divergência com o gateway.

O fluxo deve incluir:

- autenticação recente ou segundo fator;
- consulta do saldo oficial;
- reserva local de valor;
- chave de idempotência;
- persistência do identificador retornado pelo gateway;
- confirmação assíncrona;
- reconciliação;
- limite por operação e por dia;
- bloqueio temporário após alteração da chave Pix;
- auditoria de todas as alterações bancárias.

### 🔴 CRÍTICO 10 — Estornos e chargebacks podem deixar o personal negativo

O sistema deve definir o que acontece quando:

1. o aluno paga;
2. o personal transfere o valor;
3. ocorre um estorno ou chargeback posteriormente.

Regra recomendada:

- registrar débito no ledger;
- permitir saldo negativo controlado;
- bloquear novas transferências;
- compensar o débito com recebimentos futuros;
- colocar a conta em análise quando o limite de risco for excedido;
- permitir cobrança ou recuperação contratual do personal;
- manter reserva preventiva para cartão, se necessária.

---

## 3. Decisões obrigatórias antes de implementar

### ETAPA 0 — Validação comercial, jurídica e operacional

Esta etapa bloqueia a produção.

#### 0.1 Escolher um único provedor para o MVP

Recomendação: avaliar Asaas e Efí, selecionar um e implementar integralmente antes de criar uma abstração multi-provider.

Critérios de decisão:

- disponibilidade comercial de BaaS/subcontas para o AtlasFit;
- criação de contas PF, MEI e PJ;
- KYC e envio de documentos;
- split Pix, cartão e recorrência;
- Pix Automático;
- API de saldo;
- transferências Pix;
- estornos e chargebacks;
- checkout hospedado e tokenização;
- SLA, suporte e limites;
- custos por cobrança, split, saque e antecipação;
- homologação de marca branca;
- exigências de identificação do provedor;
- qualidade do sandbox;
- disponibilidade de webhooks para todos os eventos necessários.

> [!WARNING]
> Não assumir que basta criar uma conta e consumir a API. Produtos BaaS e de subcontas podem exigir aprovação comercial, análise de risco e contrato específico.

#### 0.2 Definir o fluxo jurídico do dinheiro

Documentar em diagrama e contrato:

- quem é o prestador do serviço;
- quem é o credor da mensalidade;
- quem emite a cobrança;
- quem recebe o valor principal;
- qual valor pertence à AtlasFit;
- quem responde pelo reembolso;
- quem suporta chargeback e fraude;
- quem emite nota fiscal;
- como funciona para personal PF, MEI e PJ.

#### 0.3 Aprovação contábil e jurídica

Obter parecer sobre:

- tributação da comissão;
- retenções aplicáveis;
- emissão fiscal;
- política de reembolso;
- responsabilidade solidária;
- LGPD;
- uso das expressões “carteira”, “saldo”, “conta” e “saque” na interface;
- termos exigidos pelo provedor financeiro.

#### 0.4 Definir escopo do MVP

O MVP não deve começar com tudo.

**Fase 1 recomendada:**

- um provedor;
- subconta do personal;
- KYC;
- cobrança Pix avulsa;
- split AtlasFit;
- saldo consultado no gateway;
- extrato interno;
- checkout Pix;
- webhooks idempotentes;
- conciliação automática;
- sem cartão;
- sem boleto;
- sem Pix Automático;
- sem antecipação;
- preferencialmente sem saque customizado, caso o provedor já possua um fluxo próprio seguro.

**Fase 2:** mensalidades, assinatura e Pix Automático.  
**Fase 3:** cartão recorrente, transferência interna, estornos avançados e gestão de risco.  
**Fase 4:** infraestrutura para loja virtual.

---

## 4. Princípios arquiteturais não negociáveis

### 4.1 Fonte de verdade

| Informação | Fonte oficial | Uso no AtlasFit |
|---|---|---|
| Saldo disponível | Gateway | Snapshot para interface |
| Status KYC | Gateway | Espelho local sincronizado |
| Liquidação da cobrança | Gateway | Estado local derivado |
| Valor efetivo de tarifas | Gateway | Conciliação e relatório |
| Assinatura comercial | AtlasFit | Regra de negócio local |
| Relação personal-aluno | AtlasFit | Autorização e ownership |
| Ledger AtlasFit | AtlasFit | Auditoria dos eventos processados |

### 4.2 Valores monetários

Escolher um único padrão e utilizá-lo em todo o domínio.

**Recomendação:** armazenar dinheiro em centavos usando `BigInt`.

Exemplo:

```text
R$ 150,00 = 15000 centavos
```

Regras:

- nunca usar `Float` ou `Number` para cálculo financeiro;
- criar helpers para converter e formatar valores;
- definir estratégia de arredondamento;
- executar testes de centavos;
- serializar `BigInt` explicitamente nas APIs;
- armazenar sempre a moeda, inicialmente `BRL`.

### 4.3 Imutabilidade

- eventos recebidos não são alterados;
- entradas do ledger não são editadas nem apagadas;
- correções são novas entradas de reversão;
- tarifas usadas em uma cobrança são congeladas;
- payloads sensíveis devem ser sanitizados ou criptografados;
- alterações administrativas geram auditoria.

### 4.4 Idempotência

Operações financeiras mutáveis devem aceitar ou gerar `idempotencyKey`:

- criação de subconta;
- criação de cobrança;
- criação de assinatura;
- tentativa de pagamento;
- reembolso;
- transferência;
- processamento de webhook.

### 4.5 Multi-tenant e ownership

Toda operação deve validar:

- o personal autenticado é dono da subconta;
- o aluno pertence ao personal;
- a cobrança pertence àquele vínculo;
- o personal não pode consultar cobrança de outro personal;
- o aluno só pode abrir cobranças públicas autorizadas;
- o superadmin possui acesso limitado, auditado e baseado em função.

---

## 5. Arquitetura de alto nível

```text
Aluno / Personal
       ↓
AtlasFit Web/App
       ↓
API interna AtlasFit
       ↓
Serviço de pagamentos
       ↓
Adapter do provedor selecionado
       ↓
Gateway financeiro
       ↓
Webhook Inbox → Fila → Processadores idempotentes
       ↓
Banco AtlasFit + Ledger + Snapshots + Auditoria
       ↓
Jobs de reconciliação
```

### Componentes recomendados

```text
/src/modules/payments/
  domain/
  application/
  infrastructure/
  providers/asaas/       # apenas o provedor do MVP
  webhooks/
  reconciliation/
  security/
  jobs/
```

Evitar concentrar tudo em `/src/lib/baas-gateway.ts`.

---

## 6. Modelo de dados revisado

O schema abaixo representa os principais campos. Ele deve ser adaptado ao schema real do AtlasFit antes da migration.

### 6.1 Enums

```prisma
enum PaymentProvider {
  ASAAS
  EFI
}

enum ProviderEnvironment {
  SANDBOX
  PRODUCTION
}

enum FinancialAccountStatus {
  NOT_STARTED
  ONBOARDING
  PENDING_DOCUMENTS
  UNDER_REVIEW
  APPROVED
  REJECTED
  SUSPENDED
  BLOCKED
  CLOSED
}

enum KycStatus {
  NOT_STARTED
  PENDING
  DOCUMENTS_REQUIRED
  UNDER_REVIEW
  APPROVED
  REJECTED
}

enum PaymentMethod {
  PIX
  PIX_AUTOMATIC
  CREDIT_CARD
  BOLETO
}

enum BillingStatus {
  DRAFT
  CREATING
  PENDING
  CONFIRMED
  SETTLED
  AVAILABLE
  OVERDUE
  CANCELLED
  PARTIALLY_REFUNDED
  REFUNDED
  CHARGEBACK_REQUESTED
  CHARGEBACK_DISPUTE
  CHARGEBACKED
  FAILED
}

enum SubscriptionStatus {
  DRAFT
  PENDING_AUTHORIZATION
  ACTIVE
  PAST_DUE
  PAUSED
  CANCELLED
  EXPIRED
  FAILED
}

enum PayoutStatus {
  REQUESTED
  RESERVED
  SUBMITTED
  PROCESSING
  COMPLETED
  FAILED_RETRYABLE
  FAILED_FINAL
  CANCELLED
  REVERSED
}

enum LedgerEntryType {
  PAYMENT_CONFIRMED
  PAYMENT_SETTLED
  PAYMENT_AVAILABLE
  GATEWAY_FEE
  PLATFORM_FEE
  PAYOUT_RESERVED
  PAYOUT_COMPLETED
  PAYOUT_RELEASED
  REFUND
  PARTIAL_REFUND
  CHARGEBACK
  CHARGEBACK_REVERSAL
  ADJUSTMENT
}

enum LedgerDirection {
  CREDIT
  DEBIT
}

enum WebhookProcessingStatus {
  RECEIVED
  QUEUED
  PROCESSING
  PROCESSED
  IGNORED
  FAILED_RETRYABLE
  FAILED_FINAL
}

enum ReconciliationStatus {
  RUNNING
  MATCHED
  DIVERGENCES_FOUND
  FAILED
}
```

### 6.2 Conta financeira do personal

```prisma
model PaymentProviderAccount {
  id                         String                   @id @default(cuid())
  personalUserId             String                   @unique
  personalUser               User                     @relation(fields: [personalUserId], references: [id], onDelete: Restrict)

  provider                   PaymentProvider
  environment                ProviderEnvironment
  providerAccountId          String
  providerWalletId           String?
  providerCredentialSecretId String?                  // Referência externa; nunca a API key em texto puro

  status                     FinancialAccountStatus   @default(NOT_STARTED)
  kycStatus                  KycStatus                @default(NOT_STARTED)
  providerStatus             String?
  providerStatusReason       String?

  legalNameMasked            String?
  documentLast4              String?
  payoutDestinationMasked    String?

  lastProviderSyncAt         DateTime?
  approvedAt                 DateTime?
  suspendedAt                DateTime?
  closedAt                   DateTime?
  deletedAt                  DateTime?

  balanceSnapshots           WalletBalanceSnapshot[]
  billings                   StudentBilling[]
  subscriptions              StudentSubscription[]
  payouts                    PayoutRequest[]
  ledgerEntries              WalletLedgerEntry[]

  createdAt                  DateTime                 @default(now())
  updatedAt                  DateTime                 @updatedAt

  @@unique([provider, environment, providerAccountId])
  @@index([status, kycStatus])
}
```

> [!IMPORTANT]
> CPF/CNPJ completo, conta bancária, chave Pix e credenciais só devem ser armazenados localmente quando estritamente necessários. Priorizar dados mascarados e identificadores do provedor.

### 6.3 Snapshot de saldo

```prisma
model WalletBalanceSnapshot {
  id                     String                 @id @default(cuid())
  providerAccountId      String
  account                PaymentProviderAccount @relation(fields: [providerAccountId], references: [id], onDelete: Restrict)

  availableAmountInCents BigInt
  pendingAmountInCents   BigInt
  blockedAmountInCents   BigInt                 @default(0)
  negativeAmountInCents  BigInt                 @default(0)
  currency               String                 @default("BRL")

  providerSnapshotId     String?
  providerPayloadHash    String?
  capturedAt             DateTime
  createdAt              DateTime               @default(now())

  @@index([providerAccountId, capturedAt])
}
```

Snapshots não são atualizados. Cada sincronização cria uma nova linha.

### 6.4 Pagador no gateway

```prisma
model GatewayCustomer {
  id                  String          @id @default(cuid())
  provider            PaymentProvider
  environment         ProviderEnvironment
  personalUserId      String
  studentUserId       String
  providerCustomerId  String
  nameSnapshot        String
  documentLast4       String?
  deletedAt           DateTime?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  @@unique([provider, environment, personalUserId, studentUserId])
  @@unique([provider, environment, providerCustomerId])
  @@index([personalUserId, studentUserId])
}
```

Não reutilizar automaticamente o mesmo pagador entre personais sem avaliar o isolamento exigido pelo provedor.

### 6.5 Plano de mensalidade

```prisma
model PersonalBillingPlan {
  id                       String    @id @default(cuid())
  personalUserId           String
  name                     String
  description              String?
  amountInCents            BigInt
  currency                 String    @default("BRL")
  intervalMonths           Int       @default(1)
  preferredPaymentMethod   PaymentMethod
  dueDay                   Int?
  trialDays                Int       @default(0)
  isActive                 Boolean   @default(true)
  deletedAt                DateTime?
  createdAt                DateTime  @default(now())
  updatedAt                DateTime  @updatedAt

  subscriptions            StudentSubscription[]

  @@index([personalUserId, isActive])
}
```

### 6.6 Assinatura do aluno

```prisma
model StudentSubscription {
  id                              String                  @id @default(cuid())
  providerAccountId               String
  account                         PaymentProviderAccount  @relation(fields: [providerAccountId], references: [id], onDelete: Restrict)

  planId                          String
  plan                            PersonalBillingPlan     @relation(fields: [planId], references: [id], onDelete: Restrict)

  studentUserId                   String
  providerSubscriptionId          String?
  providerAuthorizationId         String?

  status                          SubscriptionStatus      @default(DRAFT)
  paymentMethod                   PaymentMethod
  amountInCentsSnapshot           BigInt
  feeRuleVersionId                String

  currentPeriodStart              DateTime?
  currentPeriodEnd                DateTime?
  nextBillingAt                   DateTime?
  pausedAt                        DateTime?
  cancelledAt                     DateTime?
  cancellationReason              String?

  billings                        StudentBilling[]

  createdAt                       DateTime                @default(now())
  updatedAt                       DateTime                @updatedAt

  @@index([studentUserId, status])
  @@index([providerAccountId, status, nextBillingAt])
}
```

### 6.7 Cobrança

```prisma
model StudentBilling {
  id                              String                  @id @default(cuid())
  providerAccountId               String
  account                         PaymentProviderAccount  @relation(fields: [providerAccountId], references: [id], onDelete: Restrict)

  subscriptionId                  String?
  subscription                    StudentSubscription?    @relation(fields: [subscriptionId], references: [id], onDelete: Restrict)

  studentUserId                   String
  gatewayCustomerId               String?
  providerBillingId               String?
  providerStatus                  String?

  idempotencyKey                  String                  @unique
  billingReference                String                  @unique
  title                           String
  description                     String?

  grossAmountInCents              BigInt
  gatewayFeeEstimatedInCents      BigInt                  @default(0)
  gatewayFeeActualInCents         BigInt?
  platformFeeEstimatedInCents     BigInt                  @default(0)
  platformFeeActualInCents        BigInt?
  personalNetEstimatedInCents     BigInt
  personalNetActualInCents        BigInt?
  currency                        String                  @default("BRL")
  feeRuleVersionId                String

  paymentMethod                   PaymentMethod
  status                          BillingStatus           @default(DRAFT)
  dueDate                         DateTime
  confirmedAt                     DateTime?
  settledAt                       DateTime?
  availableAt                     DateTime?
  paidAt                          DateTime?
  overdueAt                       DateTime?
  refundedAt                      DateTime?
  chargebackAt                    DateTime?

  hostedInvoiceUrl                String?
  pixPayloadEncrypted             String?
  pixExpirationAt                 DateTime?

  attempts                        PaymentAttempt[]
  splits                          PaymentSplit[]
  ledgerEntries                   WalletLedgerEntry[]

  createdAt                       DateTime                @default(now())
  updatedAt                       DateTime                @updatedAt

  @@unique([providerAccountId, providerBillingId])
  @@index([studentUserId, status, dueDate])
  @@index([providerAccountId, status, createdAt])
}
```

### 6.8 Tentativas de pagamento

```prisma
model PaymentAttempt {
  id                      String          @id @default(cuid())
  billingId               String
  billing                 StudentBilling  @relation(fields: [billingId], references: [id], onDelete: Restrict)

  providerAttemptId       String?
  attemptNumber           Int
  status                  String
  failureCode             String?
  failureMessageSanitized String?
  attemptedAt             DateTime
  nextRetryAt             DateTime?
  createdAt               DateTime        @default(now())

  @@unique([billingId, attemptNumber])
}
```

### 6.9 Split

```prisma
model PaymentSplit {
  id                       String          @id @default(cuid())
  billingId                String
  billing                  StudentBilling  @relation(fields: [billingId], references: [id], onDelete: Restrict)

  receiverType             String          // PLATFORM | PERSONAL | PARTNER
  providerWalletId         String?
  splitType                String          // FIXED | PERCENTAGE
  configuredValue          Decimal
  estimatedAmountInCents   BigInt
  actualAmountInCents      BigInt?
  providerSplitId          String?
  providerStatus           String?
  refusalReason            String?
  createdAt                DateTime        @default(now())
  updatedAt                DateTime        @updatedAt

  @@index([billingId, receiverType])
}
```

### 6.10 Ledger auditável

```prisma
model WalletLedgerEntry {
  id                         String                  @id @default(cuid())
  providerAccountId          String
  account                    PaymentProviderAccount  @relation(fields: [providerAccountId], references: [id], onDelete: Restrict)

  billingId                  String?
  billing                    StudentBilling?         @relation(fields: [billingId], references: [id], onDelete: Restrict)

  payoutId                   String?
  providerEventId            String?
  providerTransactionId      String?
  idempotencyKey             String                  @unique

  type                       LedgerEntryType
  direction                  LedgerDirection
  amountInCents              BigInt
  currency                   String                  @default("BRL")
  occurredAt                 DateTime
  recordedAt                 DateTime                @default(now())

  reversalOfEntryId          String?
  description                String
  metadataSanitized          Json?

  @@index([providerAccountId, occurredAt])
  @@index([billingId])
  @@index([payoutId])
  @@index([providerEventId])
}
```

O ledger não deve conter `updatedAt` ou endpoint de edição.

### 6.11 Solicitação de transferência

```prisma
model PayoutRequest {
  id                        String                  @id @default(cuid())
  providerAccountId         String
  account                   PaymentProviderAccount  @relation(fields: [providerAccountId], references: [id], onDelete: Restrict)

  requestedByUserId         String
  idempotencyKey            String                  @unique
  amountInCents             BigInt
  currency                  String                  @default("BRL")
  destinationMasked         String
  destinationFingerprint    String

  providerTransferId        String?
  providerStatus            String?
  status                    PayoutStatus             @default(REQUESTED)
  failureCode               String?
  failureReasonSanitized    String?

  requestedAt               DateTime                 @default(now())
  submittedAt               DateTime?
  completedAt               DateTime?
  failedAt                  DateTime?
  reversedAt                DateTime?

  @@unique([providerAccountId, providerTransferId])
  @@index([providerAccountId, status, requestedAt])
}
```

Não salvar a chave Pix completa nesse modelo. Utilize destino tokenizado no provedor ou armazenamento criptografado separado.

### 6.12 Inbox de webhooks

```prisma
model PaymentWebhookEvent {
  id                       String                    @id @default(cuid())
  provider                 PaymentProvider
  environment              ProviderEnvironment
  providerEventId          String
  eventType                String
  resourceType             String?
  resourceId               String?

  authenticityValidated   Boolean
  payloadEncrypted         String?
  payloadHash              String
  processingStatus         WebhookProcessingStatus  @default(RECEIVED)
  processingAttempts       Int                       @default(0)
  lastErrorSanitized       String?

  receivedAt               DateTime                  @default(now())
  queuedAt                 DateTime?
  processedAt              DateTime?

  @@unique([provider, environment, providerEventId])
  @@index([processingStatus, receivedAt])
  @@index([resourceType, resourceId])
}
```

### 6.13 Regras de tarifa versionadas

```prisma
model FeeRuleVersion {
  id                         String          @id @default(cuid())
  version                    Int             @unique
  paymentMethod              PaymentMethod
  platformPercentage         Decimal
  platformFixedInCents       BigInt
  minPlatformFeeInCents      BigInt?
  maxPlatformFeeInCents      BigInt?
  gatewayFeePolicy           String
  activeFrom                 DateTime
  activeUntil                DateTime?
  createdByUserId            String
  createdAt                  DateTime        @default(now())

  @@index([paymentMethod, activeFrom, activeUntil])
}
```

Alterar uma taxa cria nova versão. Nunca recalcular cobrança histórica com tarifa atual.

### 6.14 Conciliação e auditoria

```prisma
model FinancialReconciliationRun {
  id                    String                @id @default(cuid())
  provider              PaymentProvider
  environment           ProviderEnvironment
  status                ReconciliationStatus @default(RUNNING)
  periodStart           DateTime
  periodEnd             DateTime
  checkedResources      Int                   @default(0)
  divergencesFound      Int                   @default(0)
  summary               Json?
  startedAt             DateTime              @default(now())
  finishedAt            DateTime?
}

model FinancialAuditLog {
  id                    String    @id @default(cuid())
  actorUserId           String?
  actorType             String
  action                String
  resourceType          String
  resourceId            String
  ipHash                String?
  userAgentSanitized    String?
  metadataSanitized     Json?
  createdAt             DateTime  @default(now())

  @@index([resourceType, resourceId, createdAt])
  @@index([actorUserId, createdAt])
}
```

---

## 7. Gestão de credenciais e segredos

### 7.1 Variáveis de ambiente

Variáveis globais podem conter somente credenciais da conta Master e identificadores não sensíveis:

```env
PAYMENT_PROVIDER="asaas"
PAYMENT_ENVIRONMENT="sandbox"
PAYMENT_MASTER_API_SECRET_REF="secret://atlasfit/payments/master-api-key"
PAYMENT_MASTER_WALLET_ID="..."
PAYMENT_WEBHOOK_AUTH_SECRET_REF="secret://atlasfit/payments/webhook-token"
PAYMENT_DEFAULT_CURRENCY="BRL"
PAYMENT_MIN_PAYOUT_IN_CENTS="1000"
```

### 7.2 Credenciais das subcontas

A API key da subconta:

- não pode ser salva em texto puro no banco;
- não pode aparecer em logs;
- não pode ser enviada ao frontend;
- não pode ser incluída em mensagens de erro;
- deve ser armazenada em secret manager ou criptografada com KMS;
- deve possuir rotação ou plano de revogação;
- deve ser acessível somente pelo backend de pagamentos.

### 7.3 Ambientes

Nunca misturar sandbox e produção.

Cada registro financeiro deve possuir:

- provedor;
- ambiente;
- identificador externo.

Não depender apenas de uma variável global para interpretar registros antigos.

---

## 8. Adapter do provedor

Criar uma interface interna, mesmo utilizando apenas um provedor no MVP:

```ts
interface PaymentProviderAdapter {
  createFinancialAccount(input: CreateAccountInput): Promise<CreateAccountResult>;
  getFinancialAccountStatus(account: ProviderAccountRef): Promise<AccountStatusResult>;
  createOrGetCustomer(input: CreateCustomerInput): Promise<CustomerResult>;
  createOneTimeCharge(input: CreateChargeInput): Promise<ChargeResult>;
  createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult>;
  cancelSubscription(input: CancelSubscriptionInput): Promise<void>;
  refundCharge(input: RefundInput): Promise<RefundResult>;
  getCharge(input: GetChargeInput): Promise<ChargeResult>;
  getBalance(input: GetBalanceInput): Promise<BalanceResult>;
  requestPayout(input: RequestPayoutInput): Promise<PayoutResult>;
  getPayout(input: GetPayoutInput): Promise<PayoutResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifiedWebhook>;
  normalizeWebhook(input: VerifiedWebhook): Promise<NormalizedFinancialEvent>;
}
```

> [!IMPORTANT]
> A interface não significa que Asaas e Efí se comportam da mesma forma. Cada adapter deverá mapear autenticação, split, webhooks, certificados, recorrência e estados próprios.

---

## 9. Onboarding e KYC do personal

### 9.1 Fluxo

```text
Personal solicita ativação
        ↓
AtlasFit valida elegibilidade interna
        ↓
Aceite dos termos financeiros
        ↓
Coleta mínima de dados
        ↓
Criação da subconta
        ↓
Armazenamento seguro dos identificadores e segredo
        ↓
Envio de documentos ou redirecionamento ao onboarding do provedor
        ↓
Acompanhamento por webhook + reconciliação
        ↓
Conta aprovada
        ↓
Liberação gradual de cobranças
```

### 9.2 Regras

- impedir duas contas financeiras por personal no mesmo provedor/ambiente;
- não permitir cobranças enquanto KYC não estiver aprovado;
- armazenar apenas o mínimo necessário;
- mostrar status e pendências de forma clara;
- tratar rejeição, suspensão e necessidade de documentos;
- permitir retomada do fluxo;
- auditar aceite de termos com versão e data;
- bloquear operação em conta encerrada ou suspensa.

### 9.3 Interface

Wizard recomendado:

1. explicação do funcionamento e responsabilidades;
2. tipo de cadastro: PF, MEI ou PJ;
3. dados de identificação;
4. endereço;
5. envio/redirecionamento de documentos;
6. destino de recebimento, quando aplicável;
7. aceite dos termos;
8. acompanhamento da análise.

Não prometer aprovação instantânea.

---

## 10. Criação de cobrança avulsa

### 10.1 Endpoint

```text
POST /api/personal/payments/billings
```

### 10.2 Validações obrigatórias

- personal autenticado;
- subconta aprovada;
- aluno pertencente ao personal;
- aluno ativo ou elegível para cobrança;
- valor mínimo e máximo permitido;
- vencimento válido;
- método permitido na fase atual;
- regra de tarifa ativa;
- limite de risco não excedido;
- idempotency key obrigatória;
- ausência de cobrança duplicada para a mesma referência.

### 10.3 Fluxo transacional

```text
1. Validar ownership e elegibilidade
2. Criar billing local com status CREATING
3. Congelar FeeRuleVersion
4. Criar/obter cliente no gateway
5. Carregar credencial da subconta
6. Criar cobrança em nome da subconta
7. Configurar split da comissão AtlasFit
8. Persistir providerBillingId, URLs e estimativas
9. Atualizar billing para PENDING
10. Retornar checkout/QR Code ao frontend
```

Se ocorrer timeout depois do envio ao provedor:

- não criar outra cobrança imediatamente;
- consultar pelo identificador/idempotency key;
- executar job de recuperação;
- deixar o billing em `CREATING` ou `PENDING_RECONCILIATION` até confirmação.

### 10.4 Cálculo exibido

Exibir:

```text
Valor cobrado do aluno
Tarifa AtlasFit
Tarifa financeira estimada
Valor líquido estimado para o personal
```

Aviso:

> O valor líquido é uma estimativa. O valor efetivo depende das tarifas, liquidação, antecipação, estornos e regras do provedor financeiro.

---

## 11. Mensalidades e assinaturas

### 11.1 Fase recomendada

Implementar após a cobrança Pix avulsa estar homologada e conciliada.

### 11.2 Métodos

Prioridade sugerida:

1. Pix Automático;
2. cartão recorrente tokenizado;
3. boleto recorrente, se houver demanda.

### 11.3 Fluxo da assinatura

```text
Personal cria plano
        ↓
Associa plano ao aluno
        ↓
Aluno revisa condições
        ↓
Aluno autoriza meio recorrente
        ↓
Assinatura fica ACTIVE
        ↓
Cada ciclo gera uma StudentBilling
        ↓
Gateway cobra e envia eventos
        ↓
AtlasFit atualiza pagamento e acesso
        ↓
Falhas entram em dunning/retentativa
```

### 11.4 Dunning e inadimplência

Definir regras configuráveis:

- aviso antes do vencimento;
- aviso no vencimento;
- retentativas;
- período de tolerância;
- suspensão de acesso;
- reativação após pagamento;
- cancelamento automático ou manual;
- registro de todos os contatos enviados.

Não bloquear o aluno automaticamente por um único webhook de falha sem considerar retentativas e período de tolerância.

### 11.5 Alteração de preço

Mudança no plano não deve alterar silenciosamente assinaturas ativas.

Opções:

- aplicar somente a novos alunos;
- criar nova versão do plano;
- solicitar aceite do aluno;
- definir data futura de vigência.

---

## 12. Webhooks

### 12.1 Rotas separadas por provedor

```text
POST /api/webhooks/payments/asaas
POST /api/webhooks/payments/efi
```

Não criar uma validação HMAC genérica. Cada provedor possui mecanismos próprios.

### 12.2 Fluxo do endpoint

```text
1. Ler corpo bruto
2. Validar token, assinatura, certificado ou mecanismo do provedor
3. Extrair providerEventId
4. Calcular hash do payload
5. Inserir PaymentWebhookEvent com unique constraint
6. Se duplicado, responder 2xx sem reprocessar
7. Publicar em fila
8. Responder 2xx rapidamente
```

### 12.3 Processador

```text
1. Adquirir lock lógico do evento
2. Normalizar evento do provedor
3. Localizar recurso local
4. Consultar o gateway quando o evento for insuficiente ou contraditório
5. Validar transição de estado
6. Aplicar alteração dentro de transação local
7. Criar entradas de ledger idempotentes
8. Registrar auditoria
9. Atualizar status do evento
10. Disparar notificações fora da transação financeira
```

### 12.4 Máquina de estados

Não atualizar status com simples atribuição.

Exemplo de transições:

```text
DRAFT → CREATING → PENDING
PENDING → CONFIRMED
CONFIRMED → SETTLED
SETTLED → AVAILABLE
PENDING → OVERDUE
PENDING/CONFIRMED → CANCELLED
CONFIRMED/SETTLED/AVAILABLE → PARTIALLY_REFUNDED
CONFIRMED/SETTLED/AVAILABLE → REFUNDED
CONFIRMED/SETTLED/AVAILABLE → CHARGEBACK_REQUESTED
CHARGEBACK_REQUESTED → CHARGEBACK_DISPUTE
CHARGEBACK_DISPUTE → CHARGEBACKED ou estado anterior por reversão
```

Eventos fora de ordem devem ser comparados com o estado oficial do gateway antes de alterar o registro.

### 12.5 Eventos mínimos

Mapear, conforme o provedor:

- conta criada;
- documentos pendentes;
- conta aprovada;
- conta rejeitada;
- cobrança criada;
- pagamento confirmado;
- pagamento recebido/liquidado;
- pagamento vencido;
- pagamento cancelado;
- estorno total;
- estorno parcial;
- chargeback solicitado;
- disputa de chargeback;
- transferência criada;
- transferência processando;
- transferência concluída;
- transferência falhou;
- transferência cancelada ou revertida;
- split pendente;
- split processado;
- split recusado;
- split estornado;
- assinatura criada, alterada, pausada ou cancelada;
- autorização de Pix Automático criada, rejeitada ou cancelada.

---

## 13. Ledger, saldo e conciliação

### 13.1 Ledger

O ledger registra fatos financeiros internos, mas não substitui o extrato do gateway.

Cada entrada deve possuir:

- chave idempotente;
- data do fato;
- data do registro;
- valor e moeda;
- direção;
- tipo;
- identificador do evento;
- identificador da transação externa;
- referência de reversão;
- descrição clara.

### 13.2 Saldo

Não executar:

```ts
wallet.availableBalance += netAmount;
```

como fonte definitiva.

Executar:

```text
Evento financeiro processado
        ↓
Ledger atualizado
        ↓
Consulta de saldo no provedor
        ↓
Novo WalletBalanceSnapshot
        ↓
Interface atualizada
```

### 13.3 Reconciliação

Criar jobs:

#### Reconciliação frequente

- cobranças recentes;
- transferências em processamento;
- contas com eventos falhos;
- status de KYC;
- snapshot de saldo.

#### Reconciliação diária

- comparar cobranças do período;
- comparar tarifas;
- comparar splits;
- comparar estornos;
- comparar transferências;
- verificar eventos ausentes;
- gerar relatório de divergências.

#### Tratamento de divergências

- não corrigir silenciosamente;
- registrar diferença;
- tentar sincronização automática segura;
- abrir alerta para superadmin;
- permitir resolução manual auditada;
- nunca editar o ledger histórico para “bater”.

---

## 14. Transferências para o personal

### 14.1 Decisão de produto

Antes de criar um botão de transferência dentro do AtlasFit, avaliar se o provedor já oferece uma experiência segura e suficiente.

Para o MVP, pode ser mais seguro:

- exibir o saldo;
- redirecionar o personal ao ambiente do provedor para transferir;
- trazer a operação para o AtlasFit somente após maturidade da integração.

### 14.2 Fluxo interno, quando habilitado

```text
1. Autenticação recente ou 2FA
2. Verificação do status da conta
3. Consulta do saldo oficial
4. Validação de limites, reservas e saldo negativo
5. Validação de destino previamente verificado
6. Criação de PayoutRequest REQUESTED
7. Reserva lógica local
8. Envio com idempotency key
9. Persistência imediata do providerTransferId
10. Status SUBMITTED/PROCESSING
11. Confirmação por webhook
12. Reconciliação
13. Novo snapshot de saldo
```

### 14.3 Controles antifraude

- limite mínimo;
- limite máximo por operação;
- limite diário e mensal;
- janela de segurança após troca do destino;
- notificação de alteração de destino;
- 2FA;
- detecção de nova sessão/dispositivo;
- revisão manual para comportamento anômalo;
- bloqueio por KYC ou chargeback;
- destinatário obrigatoriamente de mesma titularidade, conforme regra do provedor;
- chave ou conta mascarada na interface;
- logs sem dados completos.

### 14.4 Timeout e retry

Se o gateway retornar timeout, não reenviar sem consulta.

A transferência pode ter sido criada mesmo sem resposta ao AtlasFit. O sistema deve recuperar pelo `idempotencyKey` ou consultar operações recentes.

---

## 15. Estornos, chargebacks e saldo negativo

### 15.1 Estorno

Suportar:

- total;
- parcial;
- solicitado;
- processando;
- concluído;
- falhou;
- revertido.

Todo estorno deve gerar nova entrada no ledger, nunca editar a entrada original.

### 15.2 Chargeback

Fluxo mínimo:

```text
Chargeback solicitado
        ↓
Bloquear valor/reserva quando aplicável
        ↓
Notificar personal
        ↓
Receber documentos de contestação, se disponível
        ↓
Acompanhar disputa
        ↓
Registrar vitória ou perda
        ↓
Atualizar risco e saldo
```

### 15.3 Saldo negativo

Definir política contratual:

- novos recebimentos compensam dívida;
- transferências ficam bloqueadas;
- conta pode ser suspensa;
- AtlasFit pode cobrar o personal;
- limite de tolerância configurável;
- superadmin recebe alerta;
- personal visualiza motivo e histórico.

---

## 16. Checkout e segurança de cartão

### 16.1 MVP Pix

A página pública deve mostrar:

- personal responsável;
- descrição da cobrança;
- aluno, quando apropriado e protegido;
- valor;
- vencimento;
- QR Code/Pix Copia e Cola;
- estado do pagamento;
- informações do provedor exigidas;
- suporte e política de cancelamento.

### 16.2 URLs públicas

Não utilizar identificadores sequenciais ou previsíveis.

Usar token público aleatório:

```text
/pay/{publicBillingToken}
```

O token deve:

- possuir alta entropia;
- poder expirar;
- ser revogável;
- não conceder acesso a outros dados do aluno;
- não expor IDs internos.

### 16.3 Cartão

Quando implementado:

- usar checkout hospedado, iframe oficial ou tokenização direta pelo provedor;
- nunca enviar número do cartão ou CVV ao backend AtlasFit;
- nunca registrar payload de cartão;
- nunca armazenar CVV;
- revisar o escopo PCI DSS;
- utilizar token de pagamento do provedor;
- aplicar 3DS ou controles antifraude quando disponíveis.

---

## 17. Endpoints internos revisados

### Conta financeira

```text
POST   /api/personal/wallet/onboarding
GET    /api/personal/wallet/account
POST   /api/personal/wallet/account/sync
GET    /api/personal/wallet/balance
GET    /api/personal/wallet/transactions
```

### Planos e assinaturas

```text
POST   /api/personal/billing-plans
PATCH  /api/personal/billing-plans/:id
DELETE /api/personal/billing-plans/:id        # soft delete
POST   /api/personal/subscriptions
PATCH  /api/personal/subscriptions/:id/pause
PATCH  /api/personal/subscriptions/:id/resume
POST   /api/personal/subscriptions/:id/cancel
```

### Cobranças

```text
POST   /api/personal/billings
GET    /api/personal/billings
GET    /api/personal/billings/:id
POST   /api/personal/billings/:id/refund
POST   /api/personal/billings/:id/resend
```

### Transferências

```text
POST   /api/personal/payouts
GET    /api/personal/payouts
GET    /api/personal/payouts/:id
```

### Webhooks

```text
POST   /api/webhooks/payments/asaas
POST   /api/webhooks/payments/efi
```

### Regras obrigatórias

- autenticação e autorização em todas as rotas privadas;
- rate limit;
- idempotency key em rotas mutáveis;
- schemas Zod;
- logs com `correlationId`;
- respostas sem dados bancários completos;
- erro público genérico e erro interno sanitizado;
- CSRF quando aplicável;
- nenhuma operação financeira em Server Action sem as mesmas proteções da API.

---

## 18. Interface do personal

### 18.1 Painel da Wallet

Cards:

- saldo disponível no provedor;
- saldo em processamento;
- saldo bloqueado ou negativo;
- recebido no mês;
- mensalidades pendentes;
- mensalidades atrasadas;
- tarifas AtlasFit;
- tarifas financeiras;
- última sincronização.

Ações:

- cobrar aluno;
- criar plano mensal;
- gerenciar assinaturas;
- ver inadimplentes;
- transferir saldo, se habilitado;
- atualizar documentos;
- acessar suporte financeiro.

### 18.2 Estados obrigatórios

- carregando;
- sem Wallet;
- onboarding incompleto;
- aguardando documentos;
- em análise;
- aprovado;
- rejeitado;
- suspenso;
- sincronização atrasada;
- gateway indisponível;
- saldo indisponível temporariamente;
- conta com saldo negativo.

### 18.3 Extrato

Colunas:

- data do fato;
- data de processamento;
- aluno;
- cobrança;
- método;
- tipo de movimentação;
- bruto;
- tarifa do gateway;
- tarifa AtlasFit;
- líquido;
- status;
- origem/provedor.

Filtros:

- período;
- aluno;
- método;
- status;
- entrada/saída;
- mensalidade/avulsa;
- estorno/chargeback/transferência.

### 18.4 Transparência

Usar termos como:

- “Saldo informado pelo provedor”;
- “Valor líquido estimado”;
- “Aguardando liquidação”;
- “Pagamento confirmado, ainda não disponível”;
- “Última atualização em...”;
- “Transferência sujeita à análise e aos limites do provedor”.

Não usar “instantâneo” como garantia absoluta.

---

## 19. Experiência do aluno

### 19.1 Área de pagamentos

O aluno deve visualizar:

- plano atual;
- valor;
- periodicidade;
- próxima cobrança;
- pagamentos anteriores;
- cobranças pendentes;
- método autorizado;
- opção de atualizar meio de pagamento;
- cancelamento, conforme política;
- recibos e comprovantes disponíveis;
- dados do personal prestador.

### 19.2 Notificações

- cobrança criada;
- lembrete de vencimento;
- pagamento confirmado;
- pagamento falhou;
- mensalidade atrasada;
- retentativa agendada;
- assinatura pausada/cancelada;
- reembolso iniciado/concluído.

Não enviar detalhes financeiros sensíveis por WhatsApp ou push.

---

## 20. Painel de superadmin

### 20.1 Visão operacional

- contas por status KYC;
- volume transacionado;
- valores confirmados, liquidados e disponíveis;
- receita AtlasFit realizada;
- tarifas do gateway;
- transferências pendentes;
- webhooks com falha;
- divergências de conciliação;
- estornos e chargebacks;
- contas negativas;
- alertas de risco.

### 20.2 Ações restritas

- bloquear funcionalidade financeira;
- solicitar nova sincronização;
- reenfileirar webhook;
- marcar divergência como investigada;
- criar nova versão de tarifa;
- suspender transferências;
- iniciar atendimento.

Ações manuais não devem:

- alterar saldo diretamente;
- editar ledger;
- marcar transferência como concluída sem confirmação do provedor;
- excluir cobrança ou evento.

Toda ação administrativa gera `FinancialAuditLog`.

### 20.3 Tarifas

Não permitir editar uma taxa “global” que afete operações existentes.

Fluxo:

1. criar nova versão;
2. definir início da vigência;
3. simular impacto;
4. registrar quem alterou;
5. notificar personais quando necessário;
6. manter histórico.

---

## 21. Segurança e LGPD

### 21.1 Minimização

Não armazenar localmente o que o provedor pode manter com segurança.

Priorizar:

- IDs externos;
- status;
- dados mascarados;
- fingerprints;
- referências a segredos.

### 21.2 Criptografia

- TLS em trânsito;
- criptografia de campos sensíveis em repouso;
- KMS ou secret manager para credenciais;
- chaves separadas por ambiente;
- rotação;
- backups criptografados.

### 21.3 Controle de acesso

- RBAC;
- princípio do menor privilégio;
- 2FA para ações críticas;
- reautenticação para transferência e alteração bancária;
- sessões revogáveis;
- auditoria de acesso administrativo.

### 21.4 Logs

Nunca registrar:

- API keys;
- certificados;
- CPF/CNPJ completo;
- chave Pix completa;
- dados completos de cartão;
- CVV;
- payloads financeiros brutos sem sanitização;
- links secretos de onboarding.

### 21.5 Retenção e exclusão

Definir com jurídico:

- prazo de retenção de eventos;
- prazo de retenção de cobranças e extratos;
- anonimização após encerramento;
- resposta a solicitação do titular;
- preservação obrigatória de registros financeiros;
- descarte seguro.

### 21.6 Incidentes

Criar playbook para:

- vazamento de credencial;
- webhook comprometido;
- transferência suspeita;
- divergência de saldo;
- indisponibilidade do provedor;
- chargeback em massa;
- exposição de dados pessoais.

---

## 22. Observabilidade e operação

### 22.1 Métricas

- tempo de criação de cobrança;
- taxa de sucesso;
- pagamentos por método;
- tempo entre confirmação e liquidação;
- webhooks recebidos, duplicados e falhos;
- tamanho da fila;
- idade do evento mais antigo;
- transferências falhas;
- divergências de conciliação;
- contas com sync atrasado;
- chargeback rate;
- saldo negativo agregado;
- receita AtlasFit realizada.

### 22.2 Alertas

- aumento de erros do gateway;
- webhook sem eventos por período anormal;
- fila parada;
- reconciliação divergente;
- tentativa de transferência duplicada;
- credencial inválida;
- KYC suspenso;
- taxa de chargeback acima do limite;
- saldo exibido desatualizado;
- divergência entre valor estimado e realizado.

### 22.3 Correlation ID

Uma operação deve poder ser rastreada por:

- `correlationId` interno;
- `idempotencyKey`;
- `providerEventId`;
- `providerBillingId`;
- `providerTransferId`;
- `billingReference`.

---

## 23. Plano de testes revisado

### 23.1 Unidade

- cálculo de tarifas;
- arredondamento;
- máquina de estados;
- ownership;
- limites;
- conversão para centavos;
- normalização de eventos;
- reversões do ledger;
- mascaramento de dados.

### 23.2 Integração

- criar subconta;
- recuperar status KYC;
- criar cliente;
- criar cobrança na subconta;
- aplicar split;
- consultar cobrança;
- consultar saldo;
- solicitar estorno;
- solicitar transferência;
- simular mensalidade.

### 23.3 Webhooks

Testar obrigatoriamente:

1. evento válido;
2. evento com autenticação inválida;
3. evento duplicado;
4. evento fora de ordem;
5. evento atrasado;
6. recurso inexistente;
7. payload inesperado;
8. processamento com erro temporário;
9. processamento com erro permanente;
10. retry;
11. dead-letter queue;
12. reprocessamento manual;
13. mesmo evento em sandbox e produção;
14. split recusado;
15. split estornado.

### 23.4 Concorrência e idempotência

- dois cliques em cobrança;
- duas requisições com mesma idempotency key;
- duas instâncias processando o mesmo evento;
- duas transferências simultâneas;
- timeout depois de o gateway aceitar a operação;
- retry após timeout;
- webhook durante reconciliação;
- mudança de status simultânea.

### 23.5 Estorno e chargeback

- estorno antes de liquidar;
- estorno depois de liquidar;
- estorno parcial;
- estorno após transferência;
- chargeback com saldo disponível;
- chargeback com saldo zerado;
- chargeback com saldo negativo;
- disputa ganha;
- disputa perdida;
- reversão de chargeback.

### 23.6 Segurança

- personal acessando aluno de outro personal;
- aluno acessando cobrança de outro aluno;
- token público previsível;
- replay de webhook;
- vazamento de segredo em erro;
- rate limit;
- CSRF;
- alteração de destino sem reautenticação;
- acesso superadmin sem permissão;
- logs contendo dados sensíveis.

### 23.7 Falhas do provedor

- API fora do ar;
- latência alta;
- resposta `429`;
- resposta `500`;
- certificado expirado;
- credencial revogada;
- saldo indisponível;
- cobrança criada sem resposta;
- transferência criada sem resposta;
- webhook interrompido por várias horas.

### 23.8 Testes de aceitação

O MVP só pode avançar quando:

- nenhum webhook duplicado altera saldo/ledger duas vezes;
- uma cobrança criada com timeout não é duplicada;
- o saldo exibido possui timestamp e origem;
- uma transferência concorrente não gera gasto duplo;
- eventos fora de ordem não corrompem estados;
- divergências são detectadas pela conciliação;
- exclusão do usuário não apaga histórico;
- nenhum segredo aparece no frontend ou logs;
- tarifas históricas permanecem congeladas;
- o split é confirmado no provedor;
- estorno cria reversão auditável.

---

## 24. Estratégia de rollout

### Fase 0 — Descoberta e contrato

- selecionar provedor;
- obter aprovação BaaS;
- levantar preços e limites;
- validar fluxo fiscal e contratual;
- definir termos;
- desenhar estados e eventos reais do provedor.

### Fase 1 — Sandbox interno

- uma conta Master;
- duas subcontas de teste;
- Pix avulso;
- split;
- webhook inbox;
- ledger;
- snapshot;
- reconciliação;
- sem usuários reais.

### Fase 2 — Piloto fechado

- 3 a 5 personais convidados;
- limites baixos;
- somente Pix;
- acompanhamento manual diário;
- suporte direto;
- transferência pelo provedor ou com revisão manual;
- termos específicos do piloto.

### Fase 3 — Beta controlado

- 20 a 50 personais;
- alertas automáticos;
- conciliação diária;
- limites por perfil;
- estorno básico;
- painel superadmin completo;
- playbook de incidentes.

### Fase 4 — Mensalidades

- planos;
- assinaturas;
- Pix Automático;
- inadimplência;
- retentativas;
- cancelamento;
- métricas de MRR processado.

### Fase 5 — Cartão e transferência completa

- checkout/tokenização;
- PCI revisado;
- chargebacks;
- reservas;
- antifraude;
- 2FA;
- transferência no AtlasFit.

### Fase 6 — Base para loja virtual

- pedidos;
- produtos;
- múltiplos recebedores;
- reembolso por item;
- comissões;
- parceiros;
- regras fiscais e logísticas próprias.

---

## 25. Checklist de produção

### Comercial e jurídico

- [ ] Contrato BaaS/subcontas aprovado pelo provedor
- [ ] Modelo fiscal validado
- [ ] Termos de uso atualizados
- [ ] Política de privacidade atualizada
- [ ] Política de reembolso definida
- [ ] Política de chargeback definida
- [ ] Responsabilidade por emissão fiscal definida
- [ ] Comunicação e nomenclatura aprovadas

### Arquitetura

- [ ] Um provedor selecionado
- [ ] Adapter implementado
- [ ] Segredos em secret manager
- [ ] Ambiente isolado
- [ ] Idempotência implementada
- [ ] Webhook inbox implementada
- [ ] Fila e DLQ implementadas
- [ ] Ledger imutável
- [ ] Snapshot de saldo
- [ ] Reconciliação
- [ ] Soft delete
- [ ] Fee rules versionadas

### Segurança

- [ ] RBAC
- [ ] 2FA para ações críticas
- [ ] Reautenticação
- [ ] Rate limit
- [ ] Campos criptografados
- [ ] Logs sanitizados
- [ ] Auditoria administrativa
- [ ] Plano de incidentes
- [ ] Testes de ownership
- [ ] Revisão LGPD

### Operação

- [ ] Dashboards
- [ ] Alertas
- [ ] Runbook de falha do gateway
- [ ] Runbook de divergência
- [ ] Runbook de chargeback
- [ ] Suporte financeiro
- [ ] Reconciliação diária
- [ ] Piloto concluído
- [ ] Critérios de rollback

---

## 26. Critérios de não implementação

A funcionalidade não deve ser liberada em produção quando qualquer item abaixo for verdadeiro:

- não existe contrato ou aprovação de BaaS;
- não está definido quem emite e recebe a cobrança;
- a API key da subconta está em texto puro;
- o saldo local é tratado como oficial;
- `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED` creditam o mesmo valor;
- webhooks não são idempotentes;
- não existe reconciliação;
- registros financeiros usam exclusão em cascata;
- não há política de estorno e chargeback;
- a transferência depende apenas de `prisma.$transaction`;
- o checkout envia cartão ao backend AtlasFit;
- tarifas antigas podem ser alteradas;
- não há trilha de auditoria;
- não há monitoramento de falhas;
- afirmações tributárias não foram validadas.

---

## 27. Ordem recomendada de implementação técnica

1. fechar decisão do provedor e mapear eventos reais;
2. criar módulo de pagamentos isolado;
3. implementar secret management;
4. criar modelos de conta, cliente, tarifa e webhook;
5. implementar onboarding/KYC;
6. implementar cobrança Pix avulsa;
7. implementar split;
8. implementar webhook inbox e fila;
9. implementar máquina de estados;
10. implementar ledger;
11. implementar snapshot de saldo;
12. implementar reconciliação;
13. implementar UI do personal e aluno;
14. implementar superadmin operacional;
15. executar sandbox e testes de falha;
16. liberar piloto fechado;
17. implementar planos e assinaturas;
18. implementar Pix Automático;
19. implementar transferência interna;
20. implementar cartão e chargebacks.

---

## 28. Decisões em aberto

Antes de transformar este plano em tarefas de código, responder:

1. Qual será o único provedor do MVP?
2. O provedor aprovou o AtlasFit para BaaS/subcontas?
3. Personal PF poderá receber ou será necessário MEI/PJ?
4. A cobrança será emitida juridicamente por quem?
5. Quem emitirá nota fiscal para o aluno?
6. Qual será a taxa AtlasFit?
7. A AtlasFit absorverá ou repassará a tarifa do gateway?
8. O aluno verá a tarifa separadamente?
9. O MVP terá somente Pix?
10. A transferência será feita no AtlasFit ou no ambiente do provedor?
11. Qual será a política de estorno?
12. Qual será a política de chargeback e saldo negativo?
13. Quando o acesso do aluno será suspenso por inadimplência?
14. Quais limites serão aplicados no piloto?
15. Quais dados sensíveis realmente precisam ficar no AtlasFit?
16. Qual sistema de filas será utilizado?
17. Qual serviço de secret management será utilizado?
18. Qual será a frequência de conciliação?
19. Quem receberá alertas financeiros críticos?
20. Qual será o procedimento de rollback e congelamento de operações?

---

## 29. Resultado esperado

Ao final da implementação, o AtlasFit deverá oferecer uma camada financeira em que:

- o personal possui uma conta aprovada no provedor;
- o aluno paga dentro de uma experiência integrada;
- o dinheiro é processado e custodiado pelo parceiro financeiro;
- a comissão da AtlasFit é segregada por split;
- o saldo exibido é sincronizado com a fonte oficial;
- todas as mudanças são processadas de forma idempotente;
- mensalidades possuem ciclo, autorização, atraso e cancelamento;
- transferências possuem segurança e reconciliação;
- estornos e chargebacks não corrompem o extrato;
- nenhuma movimentação financeira pode ser apagada ou alterada silenciosamente;
- a plataforma está preparada para evoluir futuramente para uma loja virtual.

---

## 30. Referências oficiais para validação durante a implementação

A documentação do provedor selecionado deve ser considerada a fonte técnica oficial. As regras podem mudar, portanto, revisar novamente antes de cada etapa de produção.

- Asaas — criação de subcontas e retorno de `apiKey`/`walletId`;
- Asaas — subcontas BaaS e responsabilidades da Conta Pai;
- Asaas — split de pagamentos;
- Asaas — webhooks, autenticação, idempotência e eventos de cobranças;
- Asaas — eventos de assinaturas e Pix Automático;
- Efí — credenciais e autorização;
- Efí — split de cobranças e split Pix;
- Efí — webhooks Pix e Pix Automático;
- Banco Central — Pix Automático e normas do Pix;
- LGPD — Lei nº 13.709/2018;
- PCI Security Standards Council — requisitos para tratamento de dados de cartão.

