# Ponto 2 — privacidade, saúde, identidade e representação

Lote de 06/10/2026, no escopo GYM mantido. Conclui a implementação local dos achados 005, 007, 008, 009, 010 e 060. O [manifesto verificável](verificacoes-privacidade.json) registra fontes, resultados brutos e capturas; a [lista completa do restante](pendencias-restantes.md) preserva os demais trabalhos. Não representa revisão jurídica nem homologação de serviços externos.

## 1. Minimização de dados e logs

DTOs mantidos de gestão e configurações usam identidade permitida, sem senha, setup token, segredo MFA, token de cartão ou saúde global. Recepção/financeiro consultam cadastro sem notas médicas. Logs e metadados de auditoria removem credenciais, contatos, documentos e campos de saúde; erros Prisma são registrados pelo tipo, sem seus argumentos. A fila não apresenta os desafios internos usados para vincular uma conta existente.

## 2. Saúde local e autorização

Anamnese, onboarding e medidas da academia usam GymStudentProfile e StudentProgress do workspace selecionado. Não há cópia automática de saúde de User nem escrita da saúde de outras empresas. Perfil, avaliações, evolução, arquivos e consumidores estudantis compartilhados aplicam autoridade atual, unidade e atribuição. Todas as categorias de arquivos são consideradas sensíveis: mudar a categoria para “outros” não libera leitura. Solicitação que restringe o tratamento bloqueia leituras e novas gravações operacionais, inclusive para suporte e acesso aos arquivos.

Entradas têm limites de tamanho, tipos e medidas finitas. Feedback e execução de treino GYM revalidam autoridade e bloqueio dentro da transação, com auditoria e atualização de histórico atômicas. A execução não replica o feedback de saúde em uma notificação de CRM.

## 3. Conta existente e comprovação de vínculo

A consulta global exige identificador completo e retorna somente um desafio opaco, vinculado ao operador, à academia e à unidade. POST evita CPF/e-mail na URL da consulta; o limite persistido é de 20 consultas por hora. O desafio dura 15 minutos. O convite de autorização dura 48 horas, conserva apenas hash do token e tem entrega manual explícita.

A própria conta adulta, ou representante legal adulto previamente conferido do menor, confirma o vínculo. Matrícula revalida prova, ator, unidade, prazo e representação, consumindo-a na mesma transação. Saber um CPF/e-mail ou receber um ID global não autoriza o cadastro. Importação não vincula pessoas globais externas por conta própria. Login mantém retorno somente às páginas locais permitidas, sem redirecionamento aberto.

## 4. Solicitações, exclusão, retenção e retomada

O titular pode enviar pedidos pelo centro de privacidade; a gestão recebe fila paginada, verifica identidade, inicia análise e registra resposta. Direitos sobre dados locais conservados continuam disponíveis após desligamento, suspensão ou licença encerrada, por `/account/gym-privacy`. Essa exceção não habilita operação comercial nem exportação espontânea. A academia não anonimiza User, consentimentos globais ou outros workspaces. O mecanismo global antigo de exclusão é bloqueado quando há participação ou titularidade GYM, exigindo coordenação própria.

Exclusão exige decisão por grupo, motivos e datas futuras de revisão para retenções. Saúde, treino e arquivos podem ser eliminados; cadastro, contratos/finanças, aceites/auditoria, comunicações e identidade global ficam conservados com justificativa explícita. Nenhum prazo legal é presumido pelo software. Resultado é “Atendido com retenções”, jamais expurgo completo.

O bloqueio operacional e a decisão são persistidos antes da exclusão externa. Cada objeto precisa de referência privada verificável; anexos de avaliação não podem apontar para marca ou recursos não reconciliados. Referências compartilhadas com outros titulares ou comunicações conservadas impedem a exclusão. Falha externa mantém PROCESSING, registros e consumo de armazenamento. Retry explícito ou cron retoma a decisão persistida; somente confirmação externa libera inventário e permite finalizar a remoção dos registros. Mudança de identidade/representação exige nova conferência. A decisão em execução não pode ser substituída silenciosamente.

Depois de bloqueio, novo pedido específico OTHER, em revisão e com identidade conferida, pode permitir retomada. Exige nova finalidade, fundamento e referência de evidência; não reconstitui dados eliminados nem registra consentimento legal fictício.

## 5. Portabilidade com dados e arquivos

O dossiê local exige privacy.manage e autoridade sobre o titular. Inclui cadastro local, perfis, contratos e versões/aceites/eventos, obrigações/recebimentos, avaliações, medidas, fotos, arquivos, treinos, execuções, feedback, mensagens próprias, representação e pedidos. Não inclui saúde global, credenciais ou mensagens privadas de outras pessoas. Valores financeiros são strings decimais em centavos. Não há corte silencioso de 500 medidas: o teste exporta 501 registros.

Os anexos são obtidos somente por chaves privadas reconhecidas; URLs externas arbitrárias não são acessadas. Bytes são embutidos em base64, com tamanho, MIME e SHA-256. Pacotes admitem até 100 MB e 1.000 anexos; o limite da exportação própria é cumulativo entre workspaces. Arquivos incompletos, não vinculados ou sem tamanho verificável impedem a declaração de conclusão e exigem reconciliação/atendimento em lotes. O pedido termina após a geração efetiva, com entrega ao titular ainda não confirmada: disponibilização deve usar canal conferido. A exportação própria também inclui dados locais, contratos, finanças, mensagens próprias e os arquivos vinculados.

## 6. Responsáveis e maioridade

O portal tem consulta de saúde somente para poder hasHealthAccess atual. Representante legal conferido pode solicitar direitos do menor; poder financeiro sozinho não o autoriza. Autoridade e idade canônica são revalidadas ao enviar e processar, inclusive quando houve revogação posterior à abertura do pedido. Depois da maioridade, representação de saúde é retirada sem apagar o histórico contratual do pagador.

Comando, edição e job de maioridade compartilham a transição: nascimento canônico válido, auditoria única, retirada de representação legal/saúde e sinalização de aceite próprio necessário. Identidades inconsistentes não são corrigidas por suposição. O job seleciona até 100 candidatos elegíveis por rodada. Cadastro/importação preservam a numeração administrativa transacional e as regras de menor já verificadas nos lotes anteriores. Login próprio do menor continua bloqueado até a revisão jurídica externa.

## Verificação e limites

- PostgreSQL descartável: 229 testes de regressão, zero falhas; inclui 22 casos específicos de privacidade/saúde e os lotes anteriores.
- HTTP focal: quatro cenários completos, zero falhas; 48 casos históricos fora do filtro, sem declaração de homologação HTTP integral.
- Navegador Chrome: três jornadas aprovadas, quatro capturas, desktop 1440 px/celular 390 px, sem transbordamento horizontal nem pageerror. Inclui autorização própria de vínculo, saúde e pedido real do responsável, foco/fechamento por teclado, revisão e download efetivo do dossiê.
- TypeScript completo, sem incremental: exit 0. A prova final e execuções intermediárias estão no manifesto.
- Migration `20261006010000_gym_privacy_health`: três campos nullable e índice de fila, aplicada apenas à tabela pública do PostgreSQL descartável. Não foi aplicada ao banco configurado ou à produção. Não há backfill de saúde global.

O atendimento separa solicitação, identidade, processamento e resposta; as referências legais são os [direitos do titular, LGPD art. 18](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) e a [orientação da ANPD ao titular](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados). Bases legais, adequação dos documentos, consentimentos específicos, prazos reais de retenção e conferência documental dependem da revisão externa em 019. Não se presume que ciência de política de privacidade equivalha a consentimento específico de saúde.

Permanecem: 019 (revisão jurídica/representação real), 020 (entrega real e jornadas legadas restantes), 043 (scheduler implantado/observabilidade), 046 (baseline/migrations/banco legado), 047 (R2 real, inventário e arquivos históricos), 050/051 (demais jornadas/acessibilidade), 057 (encerramento coordenado da academia) e os outros itens da lista exaustiva. Solicitações globais PLATFORM_DSR e encerramento integral da plataforma não são homologados por este lote local. CRM, turmas, hardware e gateway GYM permanecem retirados; PERSONAL vinculado continua por último.
