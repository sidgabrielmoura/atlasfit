# Conclusão de seis achados — 09/10/2026

O pedido desta etapa foi continuar a implementação até restarem dez achados e parar antes de iniciar o restante. Foram concluídos os defeitos de implementação de **022, 027, 036, 043, 044 e 051**. A auditoria original não foi alterada. O histórico anterior de cada tratamento foi preservado.

“Corrigido e verificado” descreve o código e os cenários isolados indicados abaixo. Não declara implantação nem homologação operacional de produção. A aplicação do schema, do índice de matrícula, do scheduler e das configurações externas continua explicitamente bloqueada pela etapa de implantação **046**. Reconciliação financeira real continua em **029/030/031**, e homologação transversal em **050**.

| Achado | Resultado e critério de verificação |
|---|---|
| 022 | Transições financeiras e contratuais usam fatos persistidos e novo aceite; pausa suspende geração e retomada não cobra o intervalo pausado. Matrícula independente vigente é única na aplicação e no índice parcial da baseline. Concorrência/replay foram exercitados; teste direto no schema instalado recusa segundo contrato ACTIVE/PAUSED e permite novo contrato após encerramento. O índice real ainda precisa ser implantado em 046. |
| 027 | Fatura deriva a identidade do membro e a matrícula do mesmo aluno/tenant. Menor exige responsável financeiro atual e verificado; terceiro livre e snapshot legado não provam vínculo. Pagador personalizado deve corresponder ao cadastro verificado, e dados da fatura vêm do servidor. Documento global divergente bloqueia nova emissão; ID sem documento correspondente não é usado como identidade do pagador. UUID/retry conserva uma obrigação. Isso não comprova representação humana/jurídica, ainda em 019. |
| 036 | Caixa usa fatos paidAt/reversedAt, alocação autorizada, despesas efetivamente pagas e centavos inteiros. Aging usa dias civis e saldos atuais. Lacunas históricas são exibidas, sem números fictícios. SaaS usa referência do catálogo com vigência e cobertura explícitas; transações e referência são somadas no PostgreSQL, sem materializar todas as linhas. Exportação de passagens retirada da UI porque o módulo foi retirado. Histórico/desempenho dos outros conjuntos continua em 052; documentação dos dados reais em 030. |
| 043 | Quatro cron exigem somente CRON_SECRET dedicado no cabeçalho Bearer, em tempo constante. Query, constantes antigas e credenciais de login não autorizam jobs. Execução manual de push exige administrador persistido. Recorrência PERSONAL é limitada, transacional, concorrente e produz dívida pendente; os envios ficam na mesma transação e não dizem “pagamento recebido”. GYM não entra na rotina PERSONAL. Agenda executável está em vercel.json; recibos de execução e consulta de saúde detectam ausência, atraso, falha e backlog. Scheduler hospedado não foi instalado: essa aplicação/observação está na etapa 046. |
| 044 | Mensagem e entregas genéricas são persistidas atomicamente com recibo de intenção e fingerprint. Email/Ably/PUSH usam jobs cifrados separados, preferências e vínculo revalidados antes do envio. FCM mantém dispositivos distintos do mesmo navegador, e remoção de token é limitada ao usuário. Campanhas gravam log/fan-out/contador juntos, com deduplicação diária; falha não consome o destinatário. UI de teste anuncia fila, sem confirmar entrega. Destinatário consulta apenas seus estados; superadmin vê agregados sem tokens/payloads. |
| 051 | A página global citada pelo achado passou em Chrome a 360/390/1280 pixels, claro/escuro, teclado, nomes acessíveis, contraste e foco. GET com falha sai do skeleton e oferece retry; PATCH com falha mantém o rascunho; gravação real isolada é confirmada por releitura/reload e a configuração sintética é restaurada. Leitor de tela humano não foi exercitado; demais superfícies e homologação transversal continuam em 050. |

## Entrega e resultado incerto

O recibo interno NOTIFICATION, com estado SKIPPED, registra apenas que o fan-out foi gravado na transação. Não representa envio externo. Os jobs filhos têm seus próprios estados QUEUED, PROCESSING, RETRY, SENT, SKIPPED ou REVIEW_REQUIRED. A rota do destinatário retorna contagens por canal/estado e não revela conteúdo operacional.

SENT significa aceite do provedor. Não comprova chegada à caixa de entrada nem exibição no dispositivo. Resend conserva a mesma renderização e chave no retry; após a janela de deduplicação, o job exige revisão. Ably também limita retries à janela segura de deduplicação; depois exige revisão. FCM não oferece chave de idempotência do servidor: erro com resultado incerto ou recuperação de lease após tentativa de envio exige revisão, sem reenviar automaticamente. Falta de configuração anterior a qualquer envio pode ser recuperada. Preferência, e-mail, dispositivo ou acesso alterados cancelam a entrega obsoleta.

Os cenários novos usam PostgreSQL real e transportes controlados, com falha e recuperação explícitas. Não são um teste de push em aparelho real. As evidências históricas de Resend/Ably reais sintéticos permanecem delimitadas nos manifestos anteriores; não houve envio externo neste lote.

## Scheduler e observabilidade

vercel.json contém as quatro agendas, em UTC. É uma configuração para implantação em Vercel e não uma afirmação de que o projeto está hospedado ali ou de que as agendas já estão instaladas. A plataforma/plano e a execução observada devem ser conferidos no momento da implantação. As frequências menores que um dia requerem suporte do plano de hospedagem. Em outro ambiente, o scheduler precisa chamar os mesmos endpoints autenticados, nas mesmas frequências, sem segredo na URL.

| Endpoint | Agenda UTC | Tolerância para observação de atraso |
|---|---|---|
| /api/cron/gym-recurrence | */15 * * * * | 30 minutos |
| /api/cron/process-recurrence | 7 * * * * | 120 minutos |
| /api/cron/deliveries | */2 * * * * | 10 minutos |
| /api/cron/engage-push | */15 * * * * | 30 minutos |

Configurar CRON_SECRET aleatório e dedicado no servidor/scheduler, com pelo menos 16 caracteres. Não reutilizar AUTH_SECRET ou credenciais de provedor. Configurar Resend, Ably e Firebase Admin conforme o ambiente, com segredo de cifra compatível com os jobs existentes. Não disparar o cron financeiro real para testar configuração sem revisão do inventário financeiro e autorização da implantação.

GET /api/superadmin/operations/deliveries exige superadmin persistido e devolve últimos recibos de cron, atraso/ausência/falha e backlog agregado. NEVER_OBSERVED permanece até uma execução ser registrada. Após implantação, confirmar agendas habilitadas e recibos sucessivos, verificar recuperação com uma entrega sintética autorizada e conectar o monitor aos alertas operacionais. Essas verificações continuam pendentes em 046; o teste HTTP isolado confirmou healthy=false e NEVER_OBSERVED, sem inventar sucesso.

Referências usadas: [autenticação e operação de cron na Vercel](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [idempotência Resend](https://resend.com/docs/dashboard/emails/idempotency-keys), [REST publish Ably](https://ably.com/docs/pub-sub/api/javascript/rest/channel), [idempotência Ably](https://ably.com/docs/platform/architecture/idempotency) e [Firebase Admin Messaging](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk).

## Evidências e limites

Resultados, comandos, falhas intermediárias e hashes de fontes constam no [manifesto desta etapa](verificacoes-conclusao-seis.json), no [journal de testes](verificacoes-isoladas.json), no [schema instalado e jornadas novas](verificacoes-conclusao-schema.json), na [verificação HTTP](verificacoes-notificacoes-http.json) e na [configuração global no navegador](verificacoes-configuracao-a11y.json).

A regressão completa usa o banco sintético habitual, que contém fixtures históricas. As jornadas novas de pagador/notificação foram verificadas também em outro banco vazio com a cadeia final de migrations. A suíte de constraints cria seu próprio banco instalado. Não foi afirmado que toda fixture antiga roda com as novas constraints; essa revisão transversal permanece em 050.

Não houve alteração do banco configurado, backfill real, implantação, commit ou push. Permanecem abertos **011, 019, 029, 030, 031, 046, 047, 050, 052 e 057**. PERSONAL vinculado continua como última etapa adicional, sem criar outro ID no catálogo.
