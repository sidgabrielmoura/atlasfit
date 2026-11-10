# Correções da auditoria de academias

Implementação validada em 04/11/2026, no checkout local. O [diagnóstico de 01/11](relatorio.md) permanece como registro histórico. Nenhuma migration, cobrança, mensagem ou operação de hardware foi executada em produção.

Atualização de 05/11/2026: por orientação do responsável pelo projeto, a importação GYM voltou a usar os mesmos formatos e a mesma lógica de extração da área PERSONAL. O bloqueio adicional de IA foi removido da tela, das rotas e do processamento compartilhado.

### Texto bruto: cards sem dados (05/11/2026)

A consulta de leitura do caso reportado confirmou que a extração havia produzido somente IDs temporários de aluno e treino. O schema aceitava essas estruturas, e os valores padrão completavam o resultado com campos vazios. A tela estava exibindo o que já havia sido salvo.

- O schema enviado ao Gemini agora exige as propriedades esperadas, incluindo CPF/CNPJ. Respostas esqueléticas são recusadas antes da criação de registros e do desconto de créditos, permitindo a tentativa pelo modelo alternativo.
- Telefones e documentos do texto usam marcadores com um mapa local reversível; o sanitizador não elimina mais um telefone de 11 dígitos. Os dados são restaurados antes da normalização, preservando a associação devolvida pelo extrator.
- O CPF/CNPJ segue pela normalização até a revisão e a gravação; a tela permite conferir/editar o documento e o nascimento. O calendário do prompt foi alinhado ao sistema: domingo=0 e segunda=1.
- Um teste real no Gemini com texto totalmente fictício, no formato do caso reportado, extraiu aluno, contato, documento, segunda-feira e quatro exercícios com séries/repetições. As rotas e os cards foram verificados com dados sintéticos no navegador, inclusive no celular.
- Validação: 336 testes unitários, 14 integrações selecionadas, typecheck e build aprovados. Resposta vazia repetida não gera cards nem desconta créditos nos testes de regressão.

O rascunho do caso reportado foi apenas consultado, sem alteração. Os cards gravados anteriormente não são reextraídos ao recarregar a página; é necessária uma nova extração usando a versão corrigida.

## Resultado por achado

| Achado | Resultado desta rodada |
| --- | --- |
| A01 — isolamento dos treinos | GET, edição, desativação e cópia passam pelo domínio GYM, com workspace, unidade, modelo ativo e autoridade de autoria/gestão. IDs estrangeiros ou fichas individuais não são aceitos pela biblioteca. A desativação preserva histórico. |
| A02 — financeiro paralelo | A ficha GYM usa faturas, recebimentos e alocações por vínculo. Escritas financeiras legadas retornam 410; nomes iguais não combinam extratos. |
| A03 — alteração de contrato aceito | PATCH comercial permite apenas proposta ainda não aceita. Condições aceitas exigem revisão contratual; preço fora de catálogo exige gestão. A interface explica essa restrição. |
| A04 — dados de saúde | O DTO não seleciona medidas globais. Saúde autorizada vem da academia atual e respeita vínculo, capacidade e restrições de privacidade. |
| A05 — importação genérica | O commit GYM tem serviço próprio: unidade explícita, perfil local, capacidade, identidade, responsáveis e autorização de saúde. O commit genérico recusa GYM. A confirmação da tela envia a versão da prévia e a unidade escolhida. |
| A06 — licença da academia | Checkout tem pedido local, plano/valor esperado e contexto organizacional. Ativação, renovação, falha e cancelamento não alteram a assinatura PERSONAL. Licença expirada pode ser regularizada pela gestão. A licença guarda o pedido que a ativou; reembolso de pedido antigo não suspende a substituta. Falta homologar os eventos reais do gateway antes da publicação. |
| A07 — crédito em duas carteiras | A transição atômica PENDING → PAID credita apenas a carteira GYM ou PERSONAL correspondente. Replay não credita novamente. Saldos históricos não foram apagados ou recalculados sem conciliação. |
| A08 — checkout inconsistente | Dados de pagador reais e validados, origem configurada, chave estável por tentativa e pedido persistido antes da chamada externa. Retorno do checkout não é tratado como confirmação de pagamento. Valores divergentes não liberam crédito/licença. |
| A09 — dependências | Next/Auth, Prisma e dependências transitivas atualizados; audit final com zero alertas. Overrides limitados a grpc-js e uuid do ExcelJS. CSS do shadcn preservado localmente com licença MIT, sem carregar a CLI no aplicativo. |
| A10 — reconstrução do banco | Baseline completo, migrations incrementais e comandos que escolhem o histórico correto. Bootstrap de banco vazio e diff com schema validados. Banco existente sem histórico é recusado para evitar adoção arbitrária. |
| A11 — busca da recepção | Melhoria de busca global mantida para a próxima etapa, conforme solicitado. Não é apresentada como concluída. |
| A12 — recepção e contagens | Pessoas não são inferidas subtraindo faturas de contratos. Contrato vigente não é substituído por proposta mais nova. Ausência de informação financeira não aparece como autorização física de entrada. Datas seguem o calendário da academia. |
| A13 — conversa inexistente | A ação quebrada da ficha GYM foi retirada. Novo módulo de comunicação entre funcionários continua fora desta rodada. |
| A14 — adaptador da ficha | Rotas e workspace corrigidos; preferências retornam o formato esperado; financeiro canônico substitui os formulários legados GYM. A academia não altera nome, telefone ou nascimento da identidade global por esse caminho. O redesenho da ficha e a evolução de permissões permanecem para depois. |
| A15 — prazo e renovação | Contratos com renovação automática não expiram nos indicadores apenas porque passou o prazo inicial. Cancelamento e contratos sem renovação conservam seus limites de vigência. |
| A16 — indicadores | Períodos e agrupamentos usam timezone da academia e accessedAt. Frequência conta somente entradas concedidas. Ranking considera a semana; risco é filtrado e ordenado pela última entrada antes do limite, sem preencher ausência física com uso do aplicativo. |
| A17 — biblioteca e retries | A página conserva a paginação do servidor, oferece navegação entre páginas e aplica os filtros ao servidor. Detalhe/editor/desativação levam workspace. Repetir prescrição após falha conserva a chave da mesma intenção. Seletores mais completos ficam para a evolução de busca. |
| A18 — importação e realtime | Catálogo usa endpoint GYM. Token concede subscribe ao canal de migração apenas para o contexto/capacidade autorizados. Não há wildcard de academias. |
| A19 — publicação de planos | Publicação/gestão do catálogo contratual exige workspace.manage. Capacidade de matrícula da recepção não publica planos ou termos. |
| A20 — verificações reproduzíveis | Comando oficial de integração com banco local isolado e pipeline de unitários, integração e build. Fixtures antigas foram compatibilizadas com as constraints e com o controle explícito do worker. Testes que comprovavam comportamento vulnerável viraram regressões. Jornadas selecionadas foram verificadas no navegador. |
| A21 — gargalos | Entitlements usa contagens no banco; listagem de planos não transporta termos completos; biblioteca mantém páginas; risco não amostra 120 pessoas antes de ordenar. Recorrência tem lote limitado e verifica trabalho restante, inclusive ciclos atrasados de uma mesma matrícula. Dimensionamento e p95 de produção continuam dependentes de medição no ambiente real. |
| A22 — proteção HTTP e MFA | Origem das mutações GYM validada no proxy e no wrapper; corpo limitado nos adaptadores corrigidos; CSP básica; rate limit compartilhado em PostgreSQL em produção. TOTP novo é cifrado e recuperação usa hash; legado é convertido no uso ou pelo comando de manutenção abaixo. |
| A23 — operação | Runbooks corrigidos para distinguir backend implementado de hardware/infraestrutura homologados. Cron usa Bearer, tem agenda documentada e janelas de saúde coerentes; buckets expirados têm limpeza limitada. Bootstrap e restauração lógica foram ensaiados localmente. Agenda, alertas, PITR, retenção e recuperação de objetos de produção ainda precisam ser comprovados no ambiente publicado. |
| A24 — envio de dados à IA | Fluxo alinhado ao PERSONAL por decisão do responsável em 05/11/2026: PDF, imagens, texto livre e fallback de planilhas por IA disponíveis nas duas áreas, com o mesmo extrator e sanitizador textual. Não há bloqueio adicional por ser GYM. As correções de autoridade, unidade e persistência local da academia permanecem. |
| A25 — exclusão de aluno | A lista chama desligamento coordenado, com autoridade e unidade verificadas. Funcionário não é excluído como aluno; identidade global, faturas e histórico são preservados. |

## Evidências de validação

- **323 testes unitários aprovados**, em `npm test -- --no-file-parallelism`.
- **376 testes de integração aprovados**, sem falhas ou ignorados, em `npm run test:gym`. PostgreSQL 17 local, com dados exclusivamente sintéticos.
- Os [12 casos adicionais da auditoria](../../../tests/gym/audit-remediation.integration.ts), incluídos nessa suíte, exercitam rotas, isolamento, desligamento, extrato, saúde, contrato, carteiras, licença/reenvio/reembolso, importação, rate limit concorrente e dashboard com timezone.
- Typecheck das fontes, testes e configurações aprovado; build Next 16.4.3 aprovado em pasta isolada.
- Navegador real com servidor Next de produção e banco local: paginação, filtro, detalhe, editor e importação local; sem erros de JavaScript nessas jornadas. Conferência mobile em 390 × 844.
- `npm audit`: **0 vulnerabilidades conhecidas** na consulta final de 04/11/2026. Isso não representa certificação de segurança do aplicativo.
- Bootstrap em banco vazio: diff Prisma vazio; comando normal de upgrade também aprovado. Dump lógico restaurado em outro banco com contagens, centavos de faturas/pagamentos/alocações e constraints/triggers preservados.
- Conversão de MFA ensaiada em banco vazio separado: dry-run não escreve, aplicação cifra segredos/transforma códigos e repetição não altera registros já convertidos.

Os resultados locais ficam em `.tmp/gym-fixes/`. Não representam teste de carga de produção, teste físico de catracas, entrega real de mensagens ou homologação comercial do gateway. As jornadas de browser selecionadas não cobrem todas as páginas e combinações de papéis.

## Aplicação no ambiente publicado

1. Conferir o histórico e backup do banco antes de executar **npm run db:migrate**. Para instalação realmente vazia, usar **npm run db:bootstrap**. Não usar db push para substituir o histórico. As novas migrations estão nas duas linhagens, incluindo o vínculo da licença ao pedido.
2. Manter estável a chave de criptografia usada pela aplicação: MFA_ENCRYPTION_KEY ou, no fallback, AUTH_SECRET. Uma mudança de chave exige recifragem planejada; não trocar a chave de dados já cifrados. Em um ambiente de manutenção com as dependências instaladas, executar **npm run db:mfa-secrets** para conferir a conversão e **npm run db:mfa-secrets -- --apply** para aplicá-la com a mesma chave. A execução de produção não foi feita nesta tarefa.
3. Configurar o agendador conforme [cron-jobs.md](../../cron-jobs.md), com Authorization Bearer, repetição de backlog e alertas. Confirmar uma execução automática real e realizar a homologação dos eventos do provedor de pagamentos antes de liberar o checkout.

Busca da recepção, redesenho de ficha, novas regras de permissões, chat/equipe, agenda e integração física continuam como evolução de produto. A rodada não apresenta esses módulos como entregues.
