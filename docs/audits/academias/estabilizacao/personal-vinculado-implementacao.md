# PERSONAL vinculado — implementação final

13/10/2026. A experiência afiliada foi implementada na área PERSONAL existente. O [estudo anterior](personal-vinculado-estudo.md) conserva o diagnóstico histórico. Os resultados da versão entregue estão no [manifesto final](verificacoes-entrega-final.json).

O vínculo GYM `TRAINER`, global ou de unidade ativa, autoriza `/personal/academy` e o chat compartilhado. Uma conta `USER` mantém seu papel global. A licença da academia e o vínculo são revalidados no servidor; trial e assinatura pessoais não financiam nem bloqueiam essa operação. Seleção, cookie, store e branding continuam comuns, com troca por Server Action autenticada.

| Jornada | Comportamento implementado |
|---|---|
| Navegação GYM | Sidebar e menu móvel operacionais. Captação, CRM, carteira, finanças PERSONAL, growth, assinatura e configurações privadas ficam ocultos. APIs/actions PERSONAL recusam contexto GYM. Moedas, banner e consulta da assinatura deixam de ser pré-carregados nesse contexto. |
| Alunos e saúde | Lista e detalhe GYM existentes, limitados às unidades/alunos autorizados e às atribuições atuais. Avaliações, fotos, arquivos e treinos usam seus serviços GYM. A área financeira PERSONAL não é reutilizada como autoridade da academia. |
| Treinos | Biblioteca e editor GYM existentes; navegação conserva `/personal/academy?view=workouts`. Limites de biblioteca institucional, atribuição e prescrição permanecem nos serviços. |
| Agenda | Calendar existente adaptado para `/api/gym/agenda`. Avaliação, check-in e lembrete, com data civil e horário validados. Cada tarefa pertence ao autor e ao workspace; autoria não pode ser injetada nem alterada. Leitura/mutação revalidam atribuição do aluno. Não inclui aula coletiva, financeiro, captação ou alteração de streak no GET. |
| Notificações | Sino compartilhado usa `/api/notifications`, com usuário e workspace revalidados, limite de leitura e proteção para IDs de outro contexto. Preferências pessoais usam endpoint comum de conta. Evento realtime solicita nova leitura autorizada; o payload não entra diretamente na lista de outro tenant. |
| Assessoria privada | Criação e onboarding usam o mesmo serviço, com transação serializável, lock por usuário e quota do plano PERSONAL vigente. A academia e seus administradores não são adicionados ao novo workspace. Não muda GlobalRole. |
| Trial e quota | Primeiro PERSONAL elegível pode iniciar o trial de 30 dias. Leitura, concorrência e apagar/recriar workspace não renovam o trial único. Plano vencido e licença GYM não concedem quota pessoal. |
| Expiração | Acesso explícito ao PERSONAL vencido mantém o paywall; APIs operacionais retornam 402. O paywall permite voltar à academia. A entrada padrão retorna à única academia licenciada quando não há experiência PERSONAL vigente; com mais de uma academia válida, conserva seleção. Contexto estrangeiro nunca é trocado no meio de mutação. |
| Checkout | CPF/CNPJ e celular legítimos são validados antes do gateway. Origem vem da configuração protegida. Gateway ausente retorna 503 sem transação ou aprovação fictícia. Assinatura vencida é apresentada como vencida, evitando loop entre dashboard e paywall. |

A migration `20261012170000_affiliated_personal_agenda` conserva tarefas legadas sem autor, acrescenta autoria e índice por workspace/autor/data, FK ao usuário, FK composta ao membro do mesmo workspace e gatilho de imutabilidade em GYM. A cadeia de oito migrations foi aplicada, repetida e comparada em banco novo. O banco configurado não foi migrado.

As evidências usam contas, documentos e cobranças sintéticos. A conferência humana de identidade/representação, leitor de tela, piloto hospedado, scheduler publicado e homologação financeira real continuam no [roteiro manual](homologacao-manual-quatro.md). Turmas, CRM, hardware e gateway GYM permanecem retirados; o financeiro GYM permanece local/manual.
