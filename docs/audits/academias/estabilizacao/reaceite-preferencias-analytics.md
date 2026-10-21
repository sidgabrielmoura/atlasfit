# Reaceite próprio, preferências concorrentes e analytics opcional — 05/10/2026

Continuação dos problemas identificados na [validação visual do responsável](validacao-visual-responsavel.md). As alterações são compartilhadas e preservam o escopo GYM local/manual. Nenhum documento jurídico real foi alterado.

## Implementação

O reaceite próprio agora exige confirmação literal, tipo TERMS/PRIVACY, ID, versão e hash exatos. A transação relê o documento publicado e vigente, verifica o hash do conteúdo e a elegibilidade atual da conta. Documento alterado, despublicado ou futuro retorna 409 sem escrita. Aceites em representação não substituem o próprio; registros próprios anteriores continuam sendo reconhecidos. Repetições e concorrência produzem um aceite e uma auditoria. A falha de auditoria reverte o aceite.

A rota rejeita impersonação, origem externa, corpo não JSON, campos de autoridade e mais de 4096 bytes reais. Erros de infraestrutura não expõem mensagens do banco. O retorno é mínimo e não armazenável em cache; IP ausente não recebe um valor fictício. O onboarding legado mantém seu comando anterior; este lote protege o POST de reaceite e seu consumidor.

O modal usa bloqueio síncrono contra clique repetido, desabilita a confirmação durante o envio e relê a conformidade após gravação. Conflito invalida a caixa marcada e exige leitura/aceite renovados. Se a recarga falhar, mantém o documento anterior visível, bloqueia a confirmação e oferece recarregar; não anuncia conformidade com dados antigos.

A primeira leitura de preferências usa inserção com `skipDuplicates` e leitura do registro persistido. Isso evita P2002 na corrida de inicialização e preserva escolhas existentes. Atualizações concorrentes de preferências e entrega de notificações continuam fora da cobertura deste lote. A referência usada corresponde ao [Prisma Client v7](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference).

Analytics só é inicializado no navegador com apiKey/projectId/appId completos e suporte do SDK; falhas na verificação ou inicialização retornam ausência de analytics. A aplicação Firebase permanece disponível ao código FCM existente. Não se exige measurementId opcional nem se configura um projeto remoto. Referências: [suporte de Analytics](https://firebase.google.com/docs/reference/js/analytics#issupported) e [configuração web oficial](https://firebase.google.com/docs/analytics/web/get-started).

## Verificações e limites

Uma rodada intermediária revelou rejeições `Connection closed` no setup/cleanup Ably. As 16 operações de assinatura, presença e detach do provider e sino agora tratam rejeição e erro síncrono sem interromper os efeitos React. Mantêm a ordem imediata das operações e a autenticação por token existente. [Referência de canais](https://ably.com/docs/pub-sub/api/javascript/realtime/realtime-channel) e [presença](https://ably.com/docs/sdk/js/v2.0/interfaces/ably.RealtimePresence.html) confirmam os retornos Promise; tipos do SDK instalado 2.24.0 foram conferidos. CLI ausente e credenciais externas intencionalmente vazias no ambiente descartável: nenhum login, publicação ou teste real de conexão foi executado. Isso não resolve a reautorização de workspace nem homologa entrega real.

Resultados finais: **12 testes PostgreSQL, 3 HTTP e 31 unitários passaram, sem falhas; TypeScript completo saiu com código 0. Seis jornadas de navegador passaram, zero pageerror e 13 capturas.** O filtro HTTP deixou 40 casos sem executar. Resultados, comandos e hashes estão em [verificacoes-reaceite-runtime.json](verificacoes-reaceite-runtime.json). PostgreSQL/API/navegador usam exclusivamente a aplicação e o banco descartáveis, sem credenciais reais ou chamadas do navegador a origens externas.

As verificações não encerram os achados compostos 019, 044 ou 050. Conformidade legal global, processamento LGPD, atualização concorrente de preferências, outbox/entrega, configuração real do Ably/FCM, acessibilidade sistemática, integração externa e produção ainda exigem trabalho próprio. A consulta inicial do modal em páginas públicas não impõe compliance no servidor; enforcement dos demais consumidores permanece pendente.

A lista exaustiva está em [tudo que ainda falta](pendencias-restantes.md). Personal vinculado permanece como última etapa; CRM, turmas, hardware e gateway GYM continuam retirados.

A jornada nova comprovou conflito real de hash sem escrita, duas tentativas de clique com um envio, recarga 503 com confirmação bloqueada, retry, caixa desmarcada e aceite próprio do hash atualizado. Compare [falha de recarga](reaceite-runtime/reaceite-recarga-erro-desktop.png) e [documento atual](reaceite-runtime/reaceite-atual-desktop.png). As cinco jornadas anteriores de convite/portal/operador também passaram. A primeira rodada ficou no Skeleton durante compilação fria; seu resultado está preservado no manifesto.
