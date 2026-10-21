# Portal do responsável: extrato e documentos — 05/10/2026

Este lote implementa consulta financeira e registro dos documentos da plataforma para responsáveis já vinculados e verificados. Continua os achados de representação, ingresso, privacidade e precisão monetária. A criação segura da conta do responsável e a conferência operacional da representação permanecem pendentes; o portal completo não está homologado.

## Autoridade e dados

Lista, extrato e documentos revalidam a conta adulta vinculada, CPF correspondente à identidade conferida, vínculo não revogado, academia e aluno ativos, grants STUDENT atuais e unidade coerente e ativa. A idade é derivada da data de nascimento persistida, sem confiar em isMinor legado. A consulta deixa de autorizar representação quando o aluno atinge a maioridade; conserva os registros e não cria conta, restaura grants ou executa desligamento automático.

Poderes legal, financeiro e de saúde são independentes. O extrato exige poder financeiro; documentos e contratos exigem representação legal. Idade/data de nascimento são omitidas para vínculo exclusivamente financeiro. Liberação médica só aparece com poder de saúde. Não são retornados CPF, senha, tokens, observações de verificação, anamnese global ou dados do pagador. A lista é limitada a 100 vínculos verificados; contratos apresentados são limitados aos 20 mais recentes nas situações selecionadas.

Autoridade e fatos financeiros ou legais são lidos na mesma transação Serializable. Revogação, suspensão, mudança de identidade ou perda de grants impedem novas consultas e retries. Uma tela já aberta não recebe revogação em tempo real; as operações seguintes revalidam a autoridade.

## Extrato financeiro local

O responsável usa o mesmo extrato do portal do aluno, com endpoint próprio, escopo da academia e paginação de 30 faturas. Obrigações com matrícula incoerente ou plano de outra academia são excluídas. Recebimentos alocados de outra academia não entram nos totais ou recibos. Rascunhos não são apresentados.

Saldo e atraso somam obrigações OPEN/PARTIALLY_PAID com saldo positivo. Recebido soma alocações ACTIVE de recebimentos CONFIRMED. Reversões permanecem identificadas nos recibos e não compõem recebido. Valores são strings de centavos e a apresentação utiliza BigInt, inclusive acima do limite seguro de Number. Atraso começa após o dia civil do vencimento no fuso da academia. O DTO identifica horário da consulta e base CURRENT; não reconstitui posição histórica. Cada fatura mostra até 50 alocações, com indicação quando há mais.

A consulta não altera pagador, emite cobranças, baixa pagamentos ou consulta gateway. Financeiro GYM continua local e manual.

## Documentos e interface

Termos e política de privacidade são carregados do documento publicado e vigente, com versão, conteúdo e hash conferido. O POST exige confirmação literal, ID e hash do conteúdo exibido. Alteração do conteúdo com o mesmo ID exige recarga e nova confirmação. Aceites concorrentes/repetidos retornam o registro existente após revalidar autoridade e documento. Privacidade registra PRIVACY_ACKNOWLEDGED; termos registram TERMS_ACCEPTED, com representado, academia e auditoria. Uma sessão de suporte por impersonação não pode registrar o aceite.

O registro jurídico da plataforma não ativa contrato comercial, matrícula ou obrigação financeira. Documentos reais não foram reescritos; os testes usam textos sintéticos.

A interface oferece extrato, termos e privacidade conforme os poderes, confirma o registro em diálogo e apresenta data do aceite vigente. Consultas abortam respostas antigas, usam Skeleton, erro recuperável e estado vazio. Falha de recarga limpa a lista para não apresentar poderes anteriores como atuais. Envio bloqueia repetição e fechamento do diálogo durante o registro.

## Evidências e limites

PostgreSQL descartável real: **27 testes passaram, zero falhas**, sendo três testes agrupados novos e 24 regressões de cadastro, elegibilidade, contexto estudantil e contrato. HTTP isolado: **quatro jornadas passaram, zero falhas, 34 casos fora do filtro**, com autenticação Credentials real, SSR do portal, extrato, poderes independentes, revogação, hash alterado, ciência de privacidade, impersonação e regressão do contrato do aluno. TypeScript completo: **saída 0**.

Os resultados finais estão em verificacoes-isoladas.json, labels guardian-portal e guardian-portal-http; comandos, hashes e execuções intermediárias constam em verificacoes-portal-responsavel.json. Falhas intermediárias de fixture (nome de relação, campo do pagador e número de recibo fixo) foram corrigidas; uma estrutura JSX intermediária também foi corrigida antes da checagem final. As assertivas de precisão, autorização e paginação foram mantidas. Arquivos brutos permanecem no diretório descartável. Avisos de configuração Vitest e consultas paralelas do driver PostgreSQL continuam registrados.

HTTP e compilação não homologam interação visual, teclado, mobile ou recuperação visual. Ingresso/reemissão da conta do responsável, conferência humana da representação, revisão jurídica, portal de saúde completo, conciliação de dados legados e implantação continuam pendentes. Nenhuma migration, seed, operação de produção, mensagem ou integração externa foi executada. CRM, turmas, hardware e gateway GYM permanecem retirados; Personal vinculado à academia continua como última etapa.
