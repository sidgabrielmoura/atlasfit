# Ingresso do responsável por convite — 05/10/2026

Este lote implementa emissão/reemissão assistida e ativação/vínculo da conta do responsável que já possui uma ficha conferida na academia. Continua o [portal financeiro e documentos](portal-responsavel-financeiro-aceites.md); a pendência anterior de criação da conta agora possui este fluxo específico. Não encerra a auditoria inteira nem substitui a conferência humana da identidade e representação.

## Jornada

Na ficha do aluno menor, o operador com permissão de gestão da unidade consulta os responsáveis cadastrados. Pode atualizar o e-mail, registrar a conferência de documentos e emitir um convite. As ações exigem confirmação em Dialog; mudança de contato invalida a conferência anterior e exige nova conferência antes da emissão. As notas devem registrar identidade, maioridade e representação que o operador conferiu. O software não autentica documentos apresentados nem comprova o parentesco automaticamente.

O convite exige ficha não revogada, conferência registrada, CPF válido, e-mail válido e pelo menos um poder legal, financeiro ou de saúde. Academia, aluno, grant estudantil e unidade precisam estar ativos e coerentes. Emissão e consumo revalidam a autoridade atual do operador emissor na unidade. A perda dessa autoridade torna o convite pendente indisponível; outro operador autorizado pode emitir um novo.

O link possui 32 bytes aleatórios, validade de 48 horas e uso único. Somente SHA-256 do token é armazenado em VerificationToken, em namespace próprio. Metadados contêm IDs e fingerprint, sem CPF, e-mail, senha ou notas. A fingerprint vincula a versão observada da ficha, conta vinculada e poderes. Reemissão substitui o convite pendente; concorrência mantém um convite válido. Alteração/reconferência da ficha, revogação, suspensão, perda do grant estudantil ou maioridade impedem consumo conforme o estado atual.

O operador recebe um link local para copiar e entregar ao responsável conferido. Não houve envio de e-mail ou mensagem, integração com provider ou teste de entrega. A emissão não cria conta nem autoriza o operador a definir senha do responsável. Se a resposta de emissão se perder, uma reemissão explícita gera novo link e invalida o anterior.

## Conta e documentos

Quem já possui conta deve autenticar-se para vincular. E-mail, CPF normalizado e maioridade persistidos precisam corresponder ao responsável conferido. O fluxo preserva nome global, senha, MFA, versão de sessão e outros vínculos. Uma conta já vinculada não é substituída pelo convite.

Quem ainda não possui conta informa CPF correspondente, nascimento adulto e senha de 8 a 72 bytes. A criação verifica e-mail sem distinção de caixa e CPF normalizado, inclusive pontuação e espaços legados. Não cria uma segunda conta para identidade encontrada; orienta entrar na conta correspondente ou conferir a situação com suporte. Não redefine contas preexistentes sem senha. Não existe nova restrição global de unicidade de CPF no banco; outros escritores e inconsistências legadas continuam pendentes. A consulta de CPF normalizado ainda não possui índice específico nem ensaio de carga.

A nova conta é USER, sem WorkspaceMember, grants de equipe, trial ou workspace Personal criado por este fluxo. O registro de conferência prévia é conservado e a conta fica vinculada ao responsável. O aluno menor continua sem conta própria autorizada. EmailVerified não é marcado por entrega assistida do convite; o processo não afirma prova automática de posse da caixa de e-mail.

Termos e privacidade vigentes são mostrados com ID, versão e hash do conteúdo. Ambos exigem confirmação explícita. Alteração do conteúdo com o mesmo ID exige recarga e nova confirmação. Os aceites GUARDIAN_INGRESS pertencem à conta adulta, sem representado ou academia; os documentos em representação do menor e o contrato comercial continuam separados. Nenhum documento legal real foi alterado; os testes usam textos sintéticos.

Criação/vínculo, consumo, aceites e auditoria ocorrem na mesma transação Serializable. Falha desfaz todas as alterações. Replay do convite consumido é recusado. Sessão de suporte por impersonação não pode emitir ou consumir convite. POST aceita somente application/json, limita o corpo e recusa origem externa; o consumo usa também o limitador de tentativas existente, em memória por processo. Isso não equivale a proteção distribuída ou ensaio de abuso em produção.

## Interface e evidências

A página de convite é pública com token, sem indexação e com política no-referrer. O endpoint informativo usa no-store e retorna apenas academia, e-mail destinatário, prazo e documentos. Não apresenta identidade fiscal, aluno, poderes, notas ou identificadores internos do vínculo. A tela possui Skeleton, erro recuperável, documentos em diálogo e confirmação antes de criar/vincular. Falha de consumo é preservada durante recarga dos documentos. Envio bloqueia repetição e fechamento da confirmação. Links de retorno de login permitem somente convites locais em formato estrito e /guardian/dependents; destinos externos continuam recusados.

**PostgreSQL descartável real:** 28 testes passaram, zero falhas; quatro testes agrupados novos e 24 regressões de portal, cadastro, setup e equipe/convites. **HTTP isolado:** seis jornadas passaram, zero falhas, 34 casos fora do filtro; duas jornadas novas e quatro regressões. **TypeScript completo:** saída 0.

Os testes verificam consumo/reemissão concorrentes, prazo, hash armazenado, CPF/idade, documento alterado, identidade autenticada, não redefinição de senha/MFA, perda de autoridade, unidade inativa, suspensão, revogação, maioridade e rollback por falha de auditoria. HTTP usa autenticação Credentials real, incluindo login com a senha criada no ingresso, rejeição de origem externa e de text/plain, impersonação, SSR da página pública e da gestão de alunos, e acesso ao portal sem papel de equipe.

Uma execução intermediária PostgreSQL teve 27 aprovações e uma falha: a API Prisma usada para introduzir a falha controlada de auditoria recusou ALTER parametrizado. O teste passou a usar SQL estático somente no banco descartável, sem interpolação externa; a restrição temporária é retirada em finally. Uma execução HTTP intermediária teve cinco aprovações e uma falha: o operador da fixture não tinha cookie de academia selecionada, e a página de gestão redirecionou para seleção. O contexto foi corrigido e o HTTP 200 esperado foi mantido. Resultados brutos e execuções anteriores são preservados.

Comandos/resultados estão em verificacoes-isoladas.json, labels guardian-ingress e guardian-ingress-http. Hashes, checagem de tipos e resumo das rodadas constam em verificacoes-ingresso-responsavel.json. Avisos preexistentes de configuração Vitest e consultas paralelas do driver PostgreSQL permanecem registrados.

## Continuidade

Cinco jornadas de ingresso, portal e operação assistida em desktop/celular, incluindo teclado e recuperações, foram verificadas no [lote visual posterior](validacao-visual-responsavel.md). As demais jornadas e a homologação integral continuam pendentes. Entrega automática, conferência documental real, revisão jurídica, tratamento coordenado de maioridade, recuperação de identidades legadas e portal de saúde completo continuam pendentes. Dados reais, produção e migrations não foram acessados ou alterados. O lote utiliza VerificationToken existente e não exige migration nova. CRM, turmas, hardware e gateway GYM permanecem retirados; Personal vinculado à academia continua como última etapa.
