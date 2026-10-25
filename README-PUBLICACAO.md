# AtlasFit — publicação manual

Entrega de código-fonte em 13/10/2026, na pasta atual do projeto. A publicação será feita pelo usuário. Código, assets, package-lock, SDK local Data Connect, schema, histórico e cadeia de oito migrations, scripts, testes e instruções estão disponíveis nessa pasta. A compilação deve ser feita no host de destino.

Use **Node.js 24 e npm**. A instalação limpa foi validada em Windows com Node 24.14.1; o host deve conferir a instalação em seu próprio sistema. `package-lock.json` é o lock da entrega. O SDK `file:src/dataconnect-generated` já está no projeto.

## Preparação e configuração

Envie o código para o host pelo seu fluxo de publicação. Não envie `.env`, credenciais, exportações do banco, `.tmp`, `node_modules` ou `.next`; cadastre as variáveis no ambiente protegido do host usando [.env.example](.env.example) como modelo. A origem deve ser a URL HTTPS que serve a aplicação: ajuste `AUTH_URL`, `APP_URL`, `NEXT_PUBLIC_APP_URL` e `ATLASFIT_CRON_ORIGIN` para a mesma origem, sem caminho. Os domínios consultados responderam pela Vercel; o projeto também pode ser compilado em uma aplicação Node.js na Hostinger.

Preencha `DATABASE_URL`, `AUTH_SECRET` e `CRON_SECRET` com valores reais e protegidos. Configure R2, Resend, Ably, Firebase e gateways conforme os recursos utilizados. Os segredos Firebase ficam nas variáveis, sem arquivo de service account publicado. Não reutilize a chave master Asaas como chave da subconta e não altere o ambiente de contas persistidas para fazer testes. Sandbox precisa de configuração separada. AbacatePay é o gateway da assinatura da plataforma PERSONAL; Asaas atende cobranças e saques PERSONAL. Financeiro GYM permanece local/manual.

```sh
npm ci
npx prisma generate
```

## Banco vazio

Somente para um banco novo, vazio, destinado à aplicação:

```sh
npx prisma migrate deploy --config prisma.baseline.config.ts
npx prisma migrate status --config prisma.baseline.config.ts
npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code --config prisma.baseline.config.ts
```

A cadeia reproduzível está em `prisma/baseline-migrations`. Ela termina em `20261012170000_affiliated_personal_agenda`, que acrescenta autoria da agenda, vínculo composto ao membro e proteção contra mudança de autor. Tarefas legadas sem autor não são atribuídas por inferência. O histórico original em `prisma/migrations` foi conservado. Não execute automaticamente a cadeia histórica completa em um banco já existente.

## Banco existente

Guarde backup com restauração conferida e suspenda escritores durante a janela de transição. Gere inventário/preflight em leitura e revise a transição para o schema atual. O preflight do banco configurado nesta sessão ainda não autoriza migrar; o banco real não foi alterado. Não use `migrate reset`, `db push --accept-data-loss` ou marcação indiscriminada de migrations.

```sh
node scripts/gym-financial-inventory.cjs
node scripts/gym-tenant-preflight.cjs --configured
node scripts/gym-prepare-legacy-transition.cjs
```

O SQL gerado é uma prévia e requer revisão. Ele não substitui a conferência de dados nem todos os invariantes customizados. Preserve os nomes/checksums históricos. Use o [guia de implantação](docs/audits/academias/estabilizacao/implantacao-manual-hostinger.md) para a transição, os jobs e a conferência final. As sete cobranças PERSONAL antigas e o saldo GYM de R$ 150,00 sem comprovantes continuam em revisão; vínculos, recebimentos e créditos não foram inventados.

## Compilar e iniciar

Depois de confirmar o schema do ambiente:

Em bancos que já usam o histórico de `prisma/migrations`, confira as pendências com
`npx prisma migrate status` e aplique as migrações revisadas com `npm run db:migrate`
antes de iniciar a nova versão. `prisma generate` atualiza somente o cliente;
não cria colunas no banco. Por exemplo, a migração
`20261022120000_workspace_plan_scope` cria `Plan.customWorkspaceId` e
`Plan.publishedGlobalPlanId`, necessários para carregar planos e workspaces.
Para bancos legados ou com o histórico de baseline, siga a transição descrita acima.

```sh
npm run build
npm start
```

Configure o painel para instalar com `npm ci`, compilar com `npm run build` e iniciar com `npm start`. O Next.js usa `PORT` quando fornecida pelo host. Cadastre a agenda de `vercel.json` no agendador do ambiente, caso ele não seja Vercel. O executor `scripts/run-scheduled-job.cjs` usa `ATLASFIT_CRON_ORIGIN` e `CRON_SECRET`; `--check` valida sua configuração sem executar o job.

## Aceite da publicação

Confirme login, seleção de workspace e papéis locais, alunos/treinos/agenda do personal afiliado, troca GYM/PERSONAL, paywall e retorno à academia. Confirme upload/leitura privada R2, entregas e os recibos de cada job. Use o [roteiro de homologação](docs/audits/academias/estabilizacao/homologacao-manual-quatro.md). O [manifesto de verificação](docs/audits/academias/estabilizacao/verificacoes-entrega-final.json) registra os hashes do código validado.

As verificações locais estão no [relatório da entrega](docs/audits/academias/estabilizacao/entrega-final-manual.md). Homologação financeira externa, comprovação documental e aceites humanos dependem do ambiente/operadores reais. Nenhuma implantação ou transação financeira externa foi feita nesta entrega.
