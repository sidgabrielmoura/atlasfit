# Finalização técnica dos quatro achados restantes

12/10/2026. A etapa interrompida foi concluída nas verificações locais. **029, 030, 046 e 050 continuam abertos**, pois seus critérios restantes exigem documentos, execução no ambiente publicado ou aceite humano. O catálogo permanece com 65 IDs: 48 corrigidos e verificados, 13 retirados e quatro pendentes. Nenhuma publicação foi executada; o usuário fará a implantação manualmente.

## Resultados atuais

| Verificação | Resultado | Evidência |
|---|---|---|
| Unitários atuais | 262 aprovações, zero falhas/skips; exit 0 | [Manifesto](verificacoes-finalizacao-tecnica.json), seção unit |
| PostgreSQL descartável | 341 aprovações, zero falhas/skips; exit 0 | Manifesto, seção integration |
| HTTP isolado completo | 74 nomes distintos selecionados e executados, zero falhas; 19 lotes | [Lotes](verificacoes-http-lotes.json) e manifesto |
| Build de produção | Compilação, TypeScript e geração de páginas concluídos; exit 0 | [Build](verificacoes-final-build.json) |
| Instalação limpa | npm ci em pasta nova sem node_modules anterior; exit 0, Node 24/Windows | [Instalação](verificacoes-final-install.json) |
| Schema final | Sete migrations fresca/repetida, status e diff aprovados | [Schema](verificacoes-tenant-deploy.json) |
| Transição legada sintética | 7 cobranças sem vínculos preservadas; 200 gatilhos iguais; 36 nomes/checksums históricos coexistem com a cadeia nova | [Transição](verificacoes-transicao-legado.json) |

Os skips de cada lote HTTP correspondem a testes executados em outros lotes. O registrador comparou o conjunto completo de nomes selecionados com os nomes aprovados, sem duplicações nem casos ausentes. Os provedores financeiros e de comunicação destas regressões são controlados; nenhuma operação financeira externa foi executada.

## Correções e revalidação

A etapa anterior reconstruíra fixtures de equipe, cadastro, responsáveis, faturas, caixa, relatórios, importação e privacidade conforme autoridade, licença, unidade e regras atuais. A retomada confirmou o conjunto vigente inteiro. Casos antigos e módulos retirados não têm correspondência automática com as novas contagens; os caminhos retirados permanecem exercitados como recusas. As antigas 69 falhas foram superadas pela regressão atual, e os relatórios históricos permanecem disponíveis.

Um teste de recuperação financeira excedeu o limite ao carregar dinamicamente o grafo de módulos dentro do caso. PaymentService passou a ser importado antes do cronômetro do teste, mantendo as expectativas de uma reserva e um comando. Uma execução seguinte terminou com exit 1 e 261 aprovações, sem incluir o caso de gateway legado; esse caso passou isoladamente e a execução completa sequencial passou com todos os 262. A causa do erro do executor não foi determinada; os artefatos intermediários permanecem em .tmp/gym-stabilization.

A divergência intermediária no resumo global de armazenamento não se repetiu quando a integração foi executada sem a suíte HTTP concorrente. A expectativa de igualdade entre páginas foi preservada. Não se atribui uma causa definitiva a essa falha intermediária. A execução PostgreSQL completa atual tem exit 0.

O package-lock.json antigo não correspondia ao package.json. O lockfile preparado para as dependências atuais foi incorporado e npm ci passou em pasta nova com o SDK local em file:src/dataconnect-generated. O build usou dependências locais existentes, em cópia sem .env nem credenciais externas. A instalação limpa e a compilação são evidências distintas; não comprovam build com as dependências recém-instaladas nem instalação Linux no host. Os scripts gym-install-isolated.cjs, gym-build-isolated.cjs e test-gym-unit.cjs tornam as verificações repetíveis.

## Trabalho que permanece

| Achado | Critério restante |
|---|---|
| 029 | Homologar split, taxas, pagamento e estorno em Asaas controlado com credencial válida; conferir documentalmente as sete cobranças PERSONAL antigas. Timeout conserva revisão e referência, sem novo POST. |
| 030 | Conferir as sete cobranças e a origem do saldo GYM de R$ 150,00. O inventário não encontrou faturas, recebimentos ou despesas GYM que expliquem esse saldo; não criar lançamentos fictícios. |
| 046 | Executar a transição revisada, revalidar o preflight real e configurar scheduler, retenção e alertas na publicação manual. readyToMigrate continua false; dados reais e histórico com falhas não foram ensaiados pelo snapshot sintético. |
| 050 | Realizar leitor de tela humano, revisão de representação/documentos, piloto e medição de capacidade/latência hospedadas. Os testes automatizados não satisfazem esses critérios. |

O [inventário financeiro](inventario-financeiro-real.json) e a [investigação das cobranças](evidencias-cobrancas-legadas.json) são somente leitura. A documentação ausente não foi encontrada e não foi inferida por nome, valor ou vínculo de aluno. Nenhum backfill ou alteração do banco configurado, comando Asaas, exclusão de objeto legado, commit ou push foi realizado nesta retomada.

A publicação está preparada no [guia Hostinger](implantacao-manual-hostinger.md), e os aceites estão no [roteiro manual](homologacao-manual-quatro.md). PERSONAL vinculado à academia permanece como etapa adicional por último; o estudo não representa implementação. CRM, turmas, equipamentos e gateway GYM continuam retirados; o financeiro GYM continua local/manual.
