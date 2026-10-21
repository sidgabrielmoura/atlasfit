# Ativação de conta e acesso de menores

Implementação incremental associada a GYM-AUD-020, 054, 060, 064 e 065. Não significa conclusão do ingresso, da verificação de responsáveis ou dos portais.

## Decisão confirmada pelo usuário

Menor acessa pelo responsável; conta própria aguarda revisão dos termos. O aluno continua representado por User/WorkspaceMember/GymStudentProfile para preservar identidade e registros, sem autorização de login próprio. Não foram alterados textos legais, apagadas senhas existentes ou cancelados vínculos.

- Importação nova de menor não emite setupToken. Cadastro assistido GYM também deixa token/prazo nulos quando reconhece menoridade.
- Credentials, política MFA e leitura de JWT verificam elegibilidade atual. Senha antiga ou sessão anterior não permite acesso próprio depois de a data persistida indicar menoridade.
- Reset e setup não habilitam uma conta inelegível. O pedido público de reset conserva resposta genérica e não envia mensagem para essa conta.
- Data de nascimento é a autoridade quando válida; flag GYM de menor sem data exige regularização, não uma data enviada pelo cliente. Adulto com data válida pode entrar mesmo que um flag local antigo ainda esteja pendente de atualização; isso não remove poderes do responsável automaticamente.
- Uma conta PERSONAL histórica sem data e sem vínculo marcado como menor permanece compatível. Não se presumiu que toda conta antiga é menor.
- `/dashboard` encaminha responsável sem WorkspaceMember para `/guardian/dependents` quando há vínculo verificado, não revogado, em academia/aluno ativos e poder legal, financeiro ou de saúde. O portal não exige ser funcionário.

Os comandos de associação/conferência e os aceites de documentos/contrato foram consolidados no [lote de cadastro e responsáveis](cadastro-responsaveis.md). Ainda faltam criação/convite da conta do responsável, interface administrativa completa, conferência física, agenda, tema por dependente e inspeção visual. O redirect não comprova essas tarefas.

## Setup transacional

`password-setup-service.ts` exige convite ainda válido e conta sem senha, CPF válido, data persistida/elegível e dois booleans literalmente verdadeiros. IDs dos documentos exibidos devem corresponder aos documentos publicados e efetivos atuais. Hash do conteúdo é conferido; não há seed automático ao abrir a página.

O consumo condicional do token, senha, sessionVersion e os dois LegalAcceptance são gravados na mesma transação Serializable. Não é possível usar setup como reset de conta existente. Passwords acima de 72 bytes UTF-8 são recusados, evitando truncamento silencioso do bcrypt. Documento alterado exige nova leitura e confirmação.

O DTO público não contém CPF, nascimento, e-mail, nome, senha ou token. A interface exibe conteúdo/versionamento como texto, identifica campos ausentes e permite recuperar erro de carregamento. Limites locais de tentativas foram adicionados às actions; confiança nos headers de proxy e coordenação entre instâncias continuam pendentes.

## Compatibilidade e links

Migration aditiva `20261001060000_setup_token_expiry` adiciona prazo nullable. Novos convites dos caminhos PERSONAL/GYM revisados usam prazo compartilhado de 48 horas. Token legado sem prazo é recusado e precisa de reemissão explícita; não foi apagado. A migration foi aplicada somente no PostgreSQL descartável. A cadeia histórica de migrations continua quebrada em instalação vazia.

A URL de onboarding foi corrigida de `/auth/setup` para `/auth/setup-password`. Reset usa origem de configuração validada, sem construir URL pelo Host da requisição. HTTPS é exigido fora de loopback; credenciais, query, fragment e caminho na origem são recusados. O default anterior foi preservado, sem afirmar que configurações de produção foram inspecionadas. Nenhum e-mail foi enviado.

As datas de nascimento aceitam calendário ISO e brasileiro válido, rejeitam rollover e usam data civil UTC para armazenamento e aniversário em America/Sao_Paulo. Isso evita que UTC midnight vire o dia anterior ao calcular idade num servidor com offset negativo. A uniformização de timezone em aulas, competências e equipamento ainda é independente e pendente.

## Evidências e pendências

| Verificação | Evidência | Limite |
|---|---|---|
| PostgreSQL setup | Aceites falsos, IDs adulterados, expiração/ausência de prazo, idade persistida, consumo concorrente, conta existente, limite UTF-8 | Documentos e contas sintéticos |
| HTTP Next Server Actions | Consulta dos documentos; recusa de aceite falso; sucesso fiel e replay recusado; dois registros no banco | Flight real, sem navegador/entrega de e-mail |
| PostgreSQL elegibilidade | Senha/reset/convite não habilitam menor; flag sem data; adulto conhecido e legado; aniversário antes/depois da meia-noite de São Paulo | Helpers e banco; não homologa responsável completo |
| Regressão compartilhada | 77 testes PERSONAL/shared selecionados passaram após mudança do validador | Subconjunto; nem todos exercitam serviços reais |

Cadastro comum e conversão de lead agora usam o mesmo comando canônico e preservam identidade global; concorrência/quota foram verificadas em PostgreSQL. Persistem riscos em outras entradas globais e escritores legados. Entrega GYM e recuperação de token expirado não estão concluídas. Tokens de setup/reset ainda não têm transição completa para digest. A política de conta própria não deve ser removida para acomodar esses caminhos.
