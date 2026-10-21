# Validação no navegador do ingresso e portal do responsável — 05/10/2026

Este lote continua o [ingresso por convite](ingresso-responsavel.md). Foram exercitadas cinco jornadas em Chrome 154, com aplicação e PostgreSQL descartáveis, dados exclusivamente sintéticos, desktop 1440 × 1000 e celular 390 × 844. A revisão das capturas identificou defeitos que as verificações HTTP anteriores não demonstravam.

## Correções

O seletor global de documentos considerava uma publicação com vigência futura. Agora exige publicação e vigência já iniciadas e ordena por vigência, publicação e ID, como o ingresso. A conformidade da própria conta exige documento e hash atuais, com representado nulo; aceite em representação do dependente não substitui esse registro. Aceites próprios antigos com contexto de workspace, como STUDENT_ONBOARDING, continuam reconhecidos. Nenhum texto jurídico real foi alterado. O contrato legado do POST de reaceite global, baseado em tipo/versão, não recebeu a proteção por hash do POST de ingresso neste lote.

A ficha do aluno comprimia o cartão dos responsáveis no celular, cortando seus controles. As linhas da grade do diálogo agora conservam a altura do conteúdo e a ficha rola. A checagem específica mediu 684 pixels de conteúdo em um cartão de 684 pixels, além das verificações de largura. Compare [antes da rolagem](visual-responsavel/operador-mobile-antes-rolagem.png) e [captura final](visual-responsavel/operador-mobile.png).

O PATCH do responsável herdava valores padrão do cadastro: trocar apenas o e-mail também alterava MAE para PAI e podia repor poderes omitidos. Os padrões foram retirados do schema de atualização, inclusive na segunda validação no serviço. A mudança real de contato continua invalidando a conferência; repetir o mesmo contato preserva a conferência. Alterar o poder de contato de emergência também invalida a conferência. O teste cobre poderes legais/financeiros/emergência previamente falsos e saúde previamente verdadeira. A comparação de [antes do PATCH corrigido](visual-responsavel/operador-mobile-antes-patch.png) com a captura final mostra o parentesco preservado. Dados históricos não foram corrigidos automaticamente.

## Jornadas verificadas

1. Convite no celular: Skeleton, leitura do documento, Escape, confirmação com foco inicial em Cancelar, Tab contido no diálogo e cancelamento sem criação de conta.
2. Criação pelo formulário: conflito após alteração do documento com o mesmo ID, mensagem preservada, nova confirmação, criação e login real com a senha escolhida; a conta chega ao portal e seus aceites próprios são reconhecidos.
3. Extrato no celular: indisponibilidade 503 simulada até tentar novamente, resposta financeira real na recuperação e exibição exata de R$ 90.071.992.547.409,93 em quatro locais, sem corte horizontal do texto monetário.
4. Portal desktop: reaceite da própria conta após revisão do conteúdo e ciência de privacidade registrada separadamente em representação do dependente.
5. Operador: abrir ficha, cancelar emissão sem nova auditoria de convite, emitir, copiar o link pelo clipboard real, atualizar contato sem alterar os demais campos, bloquear emissão após invalidar a conferência e registrar nova conferência no celular.

Resultado final: **cinco jornadas passaram, zero falhas nas asserções**. Onze capturas foram inspecionadas; nenhuma excedeu a largura de seu viewport. Os documentos e o extrato usam rolagem interna: capturas full-page não mostram de uma vez todo o conteúdo rolável. Capturas do documento móvel podem incluir a página de fundo abaixo dos 844 pixels do viewport.

**PostgreSQL real descartável:** 23 testes passaram, zero falhas, nos quatro arquivos de conformidade, ingresso, portal e cadastro. São três casos agrupados novos e vinte regressões. **Suíte unitária de privacidade existente:** 22 aprovações, zero falhas; seus mocks não substituem o banco real. **TypeScript completo:** saída 0. A preparação visual de fixtures não é contada como teste funcional. Resultados, comandos e hashes estão em [verificacoes-validacao-visual-responsavel.json](verificacoes-validacao-visual-responsavel.json).

## Execuções intermediárias e limites

Os relatórios das rodadas foram preservados em visual-responsavel/rodadas. Houve falha no bloqueio simulado do carregamento, interrupção do servidor, seleção indevida de documento futuro, simulação 503 consumida pela montagem repetida de desenvolvimento, seletor de teste que esperava uma tabela e limites de espera de 15 segundos atingidos durante compilação inicial de rotas. O teste passou a usar o botão acessível da lista real, manter o 503 até a recuperação explícita e aguardar respostas de desenvolvimento por até 60 segundos. As asserções de resultado foram conservadas. Uma rodada com cinco aprovações ainda apresentava corte do cartão e outra ainda mostrava parentesco alterado: a inspeção humana das imagens motivou correções e novas asserções.

As primeiras execuções do teste de contato falharam na fixture: cadastro inicial de menor exige representante legal e começa sem acesso à saúde. A fixture foi corrigida para preparar a restrição e o poder de saúde posteriores, sem afrouxar esses controles. Os resultados brutos anteriores permanecem registrados.

O runtime de controle de navegador não iniciou; utilizou-se Playwright temporário com o Chrome instalado, sem alterar dependências da aplicação. Chamadas a origens externas foram bloqueadas; apenas o servidor isolado foi acessado pelo navegador. Firebase sem projectId gerou erro assíncrono e indicador de desenvolvimento nas imagens; Ably retornou 503 por ausência de configuração. Também se observaram corridas P2002 na criação concorrente de preferências de notificação durante as execuções. Esses problemas compartilhados não foram corrigidos nem convertidos em homologação externa. Avisos de configuração Vitest e consultas paralelas do driver PostgreSQL permanecem.

A validação cobre essas cinco jornadas, não toda a aplicação: outros tamanhos, tema claro, contraste sistemático, leitor de tela, vínculo de conta existente pelo formulário de convite, portal de saúde completo e fluxos legados continuam pendentes. Conferência documental e entrega reais, revisão jurídica e produção não foram homologadas. As aprovações não encerram os achados compostos. CRM, turmas, hardware e gateway GYM continuam retirados; Personal vinculado à academia permanece como última etapa.
