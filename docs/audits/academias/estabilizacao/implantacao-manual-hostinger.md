# Implantação manual na Hostinger

Atualizado em 13/10/2026. O usuário informou que fará a publicação manualmente. Nenhuma publicação, migration ou backfill foi executado no banco configurado nesta etapa. npm ci em pasta nova e build completo com TypeScript passaram localmente; ver [relatório final](entrega-final-manual.md).

A Hostinger documenta Next.js em aplicações Node.js e versões 22/24; VPS usa configuração própria. Confirmar o produto contratado no painel antes de escolher o procedimento. Fontes: [aplicações Node.js](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/) e [cron no VPS](https://www.hostinger.com/ca/tutorials/cron-job/).

## Banco e código

1. Guardar backup com restauração conferida e suspender escritores durante a janela de transição. Não resetar o banco nem descartar o histórico antigo.
2. Atualizar o inventário com `node scripts/gym-financial-inventory.cjs` e o preflight com `node scripts/gym-tenant-preflight.cjs --configured`, usando o `.env` local protegido do ambiente pretendido. Esses comandos são somente leitura. O último preflight ainda não está pronto: duas relações têm schema indisponível, não divergências comprovadas de dados.
3. Gerar novamente a prévia com `node scripts/gym-prepare-legacy-transition.cjs`. O SQL é um rascunho do schema Prisma; não contém, sozinho, todos os gatilhos e checks customizados. A prévia desta etapa possui 10.085 bytes e zero instruções destrutivas detectadas. Revisar contra o snapshot e o histórico próprios antes de executá-la.
4. O ensaio `scripts/gym-test-legacy-transition.cjs` usa apenas um banco local novo: reconstrói o schema legado, acrescenta a transição, restaura as funções/checks/gatilhos/índices do schema final verificado e compara cada um dos 201 gatilhos antes de registrar a cadeia final. Conserva sete cobranças sintéticas sem workspace/obrigação. Esse ensaio não autoriza resolver migrations como aplicadas sem conferir os efeitos no banco real.
5. Em **banco vazio**, a cadeia explícita é `npx prisma migrate deploy --config prisma.baseline.config.ts`. Em **banco existente**, executar somente o plano de transição revisado. Não reaplicar migrations que criam índices/colunas já presentes. Registrar como aplicada apenas cada migration cujos efeitos completos tenham sido conferidos; não editar checksums antigos.
6. Conferir `npx prisma migrate status --config prisma.baseline.config.ts` e `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code --config prisma.baseline.config.ts`; revisar também os invariantes customizados, que o diff Prisma não cobre integralmente. Repetir o preflight após a transição.
7. No host, usar **npm e o package-lock.json atualizado**: executar `npm ci`, `npx prisma generate`, `npm run build` e `npm start`. A instalação limpa foi conferida em Windows com Node 24; o host ainda precisa validar sua própria instalação. O build completo usou as dependências locais existentes, em cópia sem credenciais externas. O `yarn.lock` conserva o estado histórico e não foi validado para esta publicação. Configurar no painel os comandos npm correspondentes e publicar somente depois da transição conferida.

A cadeia possui oito entradas: `0_atlasfit_20261007`, tenant relations, notification delivery, reference identity, bounded queries, retention hold, scheduled purge e affiliated personal agenda. Os históricos originais permanecem em `prisma/migrations`; a cadeia reproduzível fica em `prisma/baseline-migrations`.

## Ambiente e agendamento

Configurar os segredos no ambiente protegido da aplicação. Usar `DATABASE_URL`, `AUTH_SECRET`, origem pública de autenticação, `CRON_SECRET`, R2 e os provedores efetivamente habilitados. Para PERSONAL/Asaas, `ASAAS_ENVIRONMENT` aceita apenas `sandbox` ou `production`; a conta persistida precisa corresponder ao ambiente e ter sua chave de subconta cifrada válida. A chave master não substitui a chave da subconta. Ver [autenticação Asaas](https://docs.asaas.com/docs/authentication-2) e [chaves de API](https://docs.asaas.com/docs/api-keys).

O arquivo `vercel.json` descreve a agenda do projeto, mas sua presença não cria agendamentos na Hostinger. Cadastrar chamadas GET autenticadas para os jobs abaixo, no cron do VPS/hospedagem que suporte o comando ou em um agendador HTTP externo sob controle do operador.

| Job | Agenda cron | Atraso que a saúde considera anormal |
|---|---|---|
| `gym-recurrence` | `*/15 * * * *` | 30 minutos |
| `process-recurrence` | `7 * * * *` | 120 minutos |
| `deliveries` | `*/2 * * * *` | 10 minutos |
| `gym-purge` | `*/5 * * * *` | 15 minutos |
| `engage-push` | `*/15 * * * *` | 30 minutos |

O executor `scripts/run-scheduled-job.cjs` usa `ATLASFIT_CRON_ORIGIN=https://seu-dominio` e `CRON_SECRET` no ambiente do agendador. O processo do cron não herda automaticamente as variáveis do painel da aplicação. Em Node.js com suporte a `--env-file`, manter o arquivo de configuração do agendador fora da pasta pública, com acesso restrito. Exemplo de comando, substituindo os caminhos absolutos:

```sh
/usr/bin/node --env-file=/caminho-protegido/cron.env /caminho/atlasfit/scripts/run-scheduled-job.cjs --job=deliveries
```

O arquivo protegido contém apenas a origem e o segredo dedicado. Antes de agendar, validar com o mesmo comando acrescentando `--check`: essa opção não executa a tarefa. Na execução, o processo envia `Authorization: Bearer ...`, recusa redirecionamentos, interrompe a espera após 50 segundos e retorna código diferente de zero em falha. Um timeout mantém resultado incerto; a próxima agenda retoma pelos mecanismos de lease/idempotência da aplicação. O log do executor conserva apenas job, sucesso, status HTTP e duração.

Deixar `WEBHOOK_PAYLOAD_RETENTION_DAYS` ausente mantém a eliminação de payloads desabilitada. Configurar somente depois de definir a política operacional; o código aceita 30–3650 dias, preserva recibos/hashes/fatos e não elimina eventos pendentes. A purga GYM tem a regra de produto já definida: até um mês calendário após o encerramento. Não encerrar uma academia real para testar o job; usar uma academia sintética isolada.

## Aceite depois da publicação

Conferir autenticação dos jobs, recibos `CRON_SUCCEEDED`/`CRON_FAILED`, estados `NEVER_OBSERVED`/`STALE`/`FAILED`, backlog e revisões obrigatórias na saúde operacional. Direcionar falhas do executor e atrasos para o monitoramento do operador; o código de saída não comprova que um alerta externo foi recebido. Não reexecutar POST financeiro para resolver timeout.

Executar o [roteiro manual](homologacao-manual-quatro.md), conservar os recibos da execução e conferir os valores reais pelos comprovantes. As sete cobranças antigas e o saldo GYM sem documentação permanecem em revisão até existir evidência suficiente. Fazer rollback de aplicação somente para versão compatível com o schema; evitar rollback destrutivo de tabelas ou fatos financeiros.
