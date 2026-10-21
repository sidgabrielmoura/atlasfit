# Cadastro, responsáveis, contratos e extrato do aluno

Lote incremental de 02/10/2026. A decisão confirmada continua: **menor acessa pelo responsável; conta própria aguarda revisão dos termos**. Nenhum termo legal foi reescrito, mensagem enviada ou operação externa executada. Esta etapa não conclui os 65 achados.

## Cadastro e ficha

`gym-student-commands.ts` é a autoridade transacional do cadastro assistido e da atualização local. Interface e APIs usam schemas estritos; o ator vem da sessão. A transação Serializable relê unidade, grants, atribuição, licença e quota. Importação e cadastro usam a mesma contagem de capacidade; o teste de disputa da última vaga contempla ambos. A conversão de lead chama esse cadastro dentro da mesma transação.

| Entrada | Comportamento implementado | Limite restante |
|---|---|---|
| Novo aluno | Nascimento civil válido obrigatório; CPF quando informado é validado; responsável completo para menor; User USER; perfil/grant e auditoria atômicos | Entrega e reemissão de convite adulto ainda não integradas |
| Pessoa existente | ID deve corresponder ao CPF completo ou e-mail informado; nascimento persistido prevalece; identidade global não é sobrescrita | Conhecer o identificador não demonstra consentimento de ingresso; associação assistida precisa de jornada explícita |
| Retry | Chave e fingerprint persistidos; mesmo conteúdo devolve cadastro original; conteúdo divergente retorna conflito | Trocar a chave deliberadamente não substitui as regras de duplicidade |
| Unidade e profissional | Operador e profissional elegíveis na unidade real; uma unidade pode ser inferida somente quando é a única ativa | Transferência de unidade é recusada e aguarda jornada coordenada |
| Ficha | `students.manage` para campos locais; saúde exige poder próprio e atribuição; identidade global e plano contratual não são alterados por PATCH | Desativação ainda não coordena todos os contratos, reservas e projeções de acesso |
| Multipapel | Cadastro pode acrescentar participação estudantil sem remover equipe; toggle estudantil não desliga equipe implicitamente | Desligamento acumulado precisa do ciclo completo |
| Consultas | DTO explícito, saúde omitida sem poder, escopos por unidade/atribuição, paginação limitada e ordenação estável | Saúde em todos os outros adapters e dados globais ainda em revisão |
| Duplicidade | Somente CPF completo/e-mail; exige gestão; resultado mínimo com identificadores mascarados | A descoberta assistida de uma conta global continua exigindo avaliação de ingresso e finalidade |

O cadastro administrativo não comprova contrato, recebimento ou ativação. A UI deixou de oferecer um seletor de plano como se contratar fosse parte do POST de cadastro. Os metadados legados `WorkspaceMember.plan/modality` ainda precisam ser substituídos por apresentação baseada na matrícula real em todas as telas.

## Responsáveis

`guardian-commands.ts` centraliza adicionar, editar, conferir, revogar e consultar. Todas as mutações revalidam autoridade sobre o aluno/unidade dentro da transação. CPF, telefone, poderes e valores booleanos têm schema; responsável cadastrado permanece não verificado. Conta vinculada deve corresponder ao CPF e conter nascimento válido de adulto. Não há associação automática por CPF nem criação de conta com identidade presumida.

Verificação exige anotação de conferência de 10 a 2.000 caracteres e auditoria. Isso registra a declaração do operador; os testes não demonstram que um documento físico foi apresentado. Mudança de identidade, contato, parentesco ou poderes invalida a conferência. Poder de saúde não pode ser concedido por recepção sem autoridade de saúde. O DTO operacional não retorna CPF, conta completa ou campos de autenticação.

`hasVerifiedGuardianIdentity` relê identidade e maioridade da conta em operações representadas. CPF coincidente de outra conta não basta. O responsável legítimo não precisa ser funcionário ou aluno da academia. Revogação exige motivo, conserva histórico e registra severidade alta quando o menor perde o último representante legal. Não se afirma que essa revogação cancela contratos ou purga equipamento.

Persistem: convite/criação segura da conta do responsável, interface administrativa de associação/conferência, restrição de duplicidade e pertencimento no banco para todos os escritores legados, recuperação de identidade divergente e coordenação com acesso físico.

## Documento do AtlasFit versus contrato da academia

| Registro | Fonte exibida | Confirmação e persistência | Efeito |
|---|---|---|---|
| LegalAcceptance do portal | GET autenticado seleciona documento publicado, efetivo, hash coerente e representação atual | ID exato e `accepted=true`; nova versão exige recarregar; aceite e auditoria atômicos; retry não duplica | Registro do documento do AtlasFit, sem ativar matrícula ou acesso |
| GymContractAcceptance | GET `/api/gym/enrollments/:id/accept` entrega termos e condições persistidas da matrícula | `accepted=true` e digest do conteúdo exibido; dentro de Serializable revalida identidade, vínculo, unidade, licença, preço/datas/condições; snapshot e evento imutáveis | PENDING_ACCEPTANCE → PENDING_ACTIVATION, `accessGranted=false`; recebimento e ativação separados |

O modal anterior do portal mostrava um texto escrito no cliente e registrava outro documento. Agora mostra o conteúdo publicado como texto, com versão e confirmação acessível. Foram retiradas garantias de validade jurídica, autorização de biometria e liberação de catraca que esse registro não demonstra. A revisão jurídica do conteúdo publicado permanece externa a esta implementação.

O contrato inclui no snapshot: IDs da matrícula/versão/academia/unidade, preço e taxa em centavos exatos, início/fim, periodicidade, renovação, créditos de aula, unidades e restrições de horário/dias existentes. Alteração entre consulta e assinatura retorna conflito. Adulto assina em nome próprio; menor somente por representante legal atualmente verificado, com conta correspondente. Operador não pode confirmar no lugar do aluno. Contrato anterior permanece no snapshot mesmo se um escritor legado alterar a versão depois; isso não estabiliza, por si só, troca/renovação que ainda reutilizam aceites antigos.

O componente compartilhado `GymContractAcceptance` foi conectado ao portal do responsável e à página `/student/contracts`, anunciada somente em contexto GYM. Mostra documento, erro recuperável, confirmação e situação real. A página limita a lista aos 50 contratos próprios mais recentes; o portal limita 20 contratos por dependente. Desktop, mobile e teclado continuam aguardando inspeção visual.

## Extrato interno e fronteira PERSONAL

`/api/student/finance` resolve a seleção do servidor antes de qualquer caminho externo. GYM retorna DTO `GYM_MANUAL`: obrigações próprias paginadas (30), saldo, vencimento, competência e recebimentos alocados. Os totais são calculados na base inteira do aluno, independentemente da página; recebido considera somente alocações ACTIVE em pagamentos CONFIRMED locais. Reversão sai do recebido e permanece identificada no histórico. Até 50 recibos por obrigação, com limitação anunciada.

Nenhuma consulta de saldo externo, reconciliação, crédito de wallet ou efeito de gateway integra essa leitura. `/api/student/finance/recurrence` responde 410 em GYM e conserva os registros; cancelar matrícula é outro comando. O cliente financeiro GYM não subscreve `wallet:updated` nem exibe checkout, saldo de carteira ou cancelamento externo.

PERSONAL conserva sua interface e integração. Suas consultas agora usam o workspace selecionado e contas pessoais legadas sem workspace compatíveis com o titular; a leitura PERSONAL não deve processar cobranças GYM. Seu sincronizador antigo ainda possui efeitos de escrita ao consultar e liquidação por nome: exige estudo/regressão específicos, não foi copiado para o extrato GYM.

A sidebar estudantil deixou de selecionar a primeira empresa ou escrever um cookie alternativo. Carrega somente vínculos estudantis legítimos e usa `selectActiveWorkspace`, retorno servidor, store, rota e refresh. Troca real em navegador permanece pendente; testes HTTP com cookie de fixture não comprovam o switcher.

## Migration e compatibilidade

`20261002000000_gym_student_registration_integrity` adiciona escopo e chave/fingerprint de cadastro a GymStudentProfile. Faz backfill pelo membro, aborta órfãos/duplicidades históricas e cria unicidade da matrícula administrativa por academia. Trigger preenche o escopo de escritores legados e rejeita tenant incompatível; mudança do workspace de um membro com perfil também é rejeitada. Não renumera nem apaga dados automaticamente. Nullable permite preservar registros sem chave de retry anterior.

Aplicada apenas ao PostgreSQL descartável; Prisma Client gerado localmente. A cadeia histórica ainda falha em instalação vazia, antes desta migration. Implantação requer prévia dos dados e estratégia de baseline/transição; não executar contra base existente para contornar essa lacuna. Aceites usam entidades existentes, sem migration ou backfill fictício de contratos históricos.

## Cobertura e lacunas

| Área | Evidência rastreável | Ainda não comprovado |
|---|---|---|
| Cadastro/CRM/ficha/responsável | `tests/gym/student-registration.integration.ts`, PostgreSQL real; `tests/gym/http.spec.ts`, Next HTTP | Entrega, conferência física, jornada CRM (página ainda redireciona), UI administrativa de responsáveis |
| Contrato | `tests/gym/enrollment-contract.integration.ts`: concorrência, snapshot/digest, adulto/menor, grants/tenant/unidade/licença | Portal visual; criação comum, troca, renovação, pausa/cancelamento e efeito físico completos |
| Extrato | `tests/gym/manual-finance.integration.ts`: parcial/reversão/local/precisão; HTTP aluno e fronteira PERSONAL | Gateway PERSONAL real e histórico externo; filtros e indicadores das demais áreas |
| Compilação/regressão | Resultados e comandos em `verificacoes-isoladas.json`; suíte antiga com falhas preservadas | Não usar teste isolado, mock ou compilação como homologação geral |

As matrículas simultâneas e cobrança durante pausa continuam decisões essenciais sem resposta. Desativação administrativa de aluno, representante revogado e suspensão precisam convergir com contratos, reservas, cache e hardware. Nenhum desses achados é encerrado apenas por este lote.

## Continuação de 05/10 — decisões respondidas

As dúvidas históricas sobre matrícula simultânea e geração durante pausa receberam respostas: uma matrícula ativa por aluno/academia; geração suspensa durante pausa. Implementação e limites atuais estão em [políticas de matrícula e pausa](politicas-matricula-pausa.md). O estado deste anexo registra o lote anterior e não substitui essa continuação.
