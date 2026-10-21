# Estudo histórico do personal vinculado

Diagnóstico anterior à implementação. A experiência foi implementada em 13/10/2026; consulte [estado atual](personal-vinculado-implementacao.md). O texto abaixo conserva a leitura anterior e não descreve a versão entregue.

# Estudo da última etapa: personal vinculado

Este anexo registra evidência do estudo em andamento. A experiência afiliada **não foi implementada**. A correção de seleção/grants descrita abaixo pertence ao contexto compartilhado, sem liberar a área PERSONAL para GYM.

## Fronteiras encontradas

`GlobalRole` possui SUPERADMIN, TRAINER, STUDENT e USER; papel de conta não substitui WorkspaceRole. Convites GYM podem vincular USER como TRAINER, mas `auth.config.ts` e o layout PERSONAL atualmente exigem GlobalRole TRAINER. Alterar somente a sidebar não libera a jornada legítima e não protege as operações proibidas.

O layout PERSONAL usa `User.onboarded`, `Subscription`/`FreeTrial` pessoais para liberar toda a área. No contexto GYM, esse gate não pode financiar ou bloquear o trabalho contratado pela academia. No PERSONAL próprio, ele deve continuar seguindo a regra autônoma e o paywall existente.

## Matriz de alinhamento para implementação

| PERSONAL existente | GYM atual / solicitado | Parte reutilizável | Diferença legítima | Inconsistência a corrigir | Risco de regressão | Verificação necessária |
|---|---|---|---|---|---|---|
| Seleção inicial, switcher, cookie e store comuns | Personal da academia deve entrar na mesma área com contexto GYM | `selectActiveWorkspace`, context-service, initializer, branding e limpeza das stores | Papel vem de grants da academia/unidade; não de assinatura do proprietário | Seleção inicial e action usavam papéis globais diferentes da lista: corrigido com resolveNavigationRoles; rota TRAINER GYM ainda precisa mudar na última etapa | Papel de navegação não pode conceder autoridade global | HTTP deste lote confirma grant local/seleção/revogação; alternância visual e default GYM/PERSONAL pendentes |
| Sidebar oferece captação, CRM, wallet/financeiro, growth/engage/rewards, assinatura e settings | Ocultar todos esses destinos no GYM e negar APIs/actions; manter áreas operacionais | Mesma sidebar/layout/mobile, com capacidade/contexto recebido do servidor | PRIVATE PERSONAL continua completo quando elegível | Sidebar consulta assinatura mesmo no mount; moedas/banner e preload financeiro também precisam parar no GYM | Esconder abas enquanto dados proibidos continuam retornando | URL direta, requests adulterados, ausência de preload e ações de ambos os contextos |
| Dashboard consulta alunos, planos, pagamentos e histórico financeiro | Apenas operação sem financeiro GYM | Cards de atividade e estados assíncronos | Alunos e atividade por unidade/atribuição atual | API PERSONAL dashboard usa membership genérico e estimativas de receita; não reutilizar esses controles/estimativas como autoridade GYM | Alterar dashboard autônomo funcional | DTO operacional GYM sem montantes; PERSONAL mantém dados legítimos; concorrência de troca de workspace |
| Lista/detalhe de aluno, tabs, avaliações, fotos, arquivos e prescrições | Operar alunos atribuídos, sem tab/preload/endpoint financeiro | Componentes de aluno, treino, avaliação e arquivo | GYM saúde é local e atribuída; acesso pelo responsável para menores | Handlers PERSONAL foram protegidos contra GYM e precisam adapter seletivo; não remover expectedType globalmente. Client detalhe ainda carrega financeiro e aceita tab por URL | Vazamento global/entre unidades ou perda de edição PERSONAL | IDs de outro tenant/unidade/atribuído; local/global; avatar/saúde/arquivo; regressão PERSONAL |
| Modelos, cópia, prescrição e edição avançada de treino | Usar os mesmos componentes com autoridade GYM | Editor, duração/descanso/métodos, modelagem e store existentes | Biblioteca institucional e prescrição têm alçadas distintas | Serviços GYM protegidos existem; equivalência integral do editor e todos os efeitos ainda não foi verificada | Misturar modelo institucional e treino particular do treinador | CRUD/prescrição real, parâmetros adulterados e execução nos portais |
| Agenda/organização usa TrainerTask, alerta e contatos | Agenda operacional permitida; não reintroduzir o módulo de aulas GYM | Calendar/organização e formas existentes | Tarefa pessoal operacional não equivale a grade/reserva coletiva ou equipamento | Organização mistura alerta de captação, GET com decayStreaks e data por offset fixo; não copiar essas partes automaticamente | Voltar a anunciar aulas/hardware ou expor dados de outro professor | CRUD por autor/unidade/aluno, timezone e tipos anunciados |
| Assinatura e trial são únicos por User | Personal pode criar workspace próprio privado e trial autônomo | `FreeTrial.userId @unique`, Subscription, Plan.maxWorkspaces, paywall | Licença GYM não concede workspaces/quota pessoais e não é pagadora da assinatura privada | createWorkspace checa quota fora da transação e pode usar plano vencido; onboarding alternativo cria workspace sem quota demonstrada | Renovar trial apagando/criando workspace, duas criações simultâneas ou plan.maxWorkspaces inválido | Banco real para criação concorrente, trial único, plano vigente, downgrade e caminhos alternativos |
| Registro autônomo e criação superadmin TRAINER criam trial de 30 dias | Conta GYM USER pode não ter trial pessoal; primeiro PERSONAL deve seguir regra comum sem reset | Serviço único de criação/elegibilidade deve atender todos os caminhos autorizados | Criar o PERSONAL próprio não revela a academia como cliente/pagadora | Cadastro/convite GYM não comprova criação de FreeTrial; não presumir que esteja provisionado | Mudança de GlobalRole pode expor informação ou liberar área indevida | Elegibilidade por vínculo real, reuso de trial prévio, privacidade do workspace e onboarding |
| Paywall `/subscription-expired` consulta assinatura e redireciona quando válida | Expirado retorna por padrão ao GYM; acesso explícito PERSONAL mostra paywall com retorno à academia | Tela autônoma e contratação existentes | O link explícito deve preservar a intenção; não trocar tenant no meio de mutação | Layout, API subscription e entitlements usam regras diferentes de validade; paywall não tem retorno GYM demonstrado | Redirect loop, GYM bloqueado pelo trial ou acesso ao PERSONAL vencido por URL/API | Tempo congelado, reload/login, ação switcher, URL direta, retorno e limites de todas as APIs |
| Nome/slug/slogan/cor/logo/watermark/capa ficam em Workspace; perfil profissional em User | Branding GYM local, sem editar preferências privadas ou identidade global | Branding-service/form, uploads privados, defaults e foreground | Marca da academia é do workspace, não do usuário/assinatura pessoal | updateProfile tem efeitos globais; não expor no contexto GYM como configuração local | Sobrescrever marca PERSONAL/GYM na troca | Persistência/isolamento já testados; reload/browser/material e R2 reais pendentes |

## Matriz de personalização

| Recurso | Fonte PERSONAL | Equivalência GYM atual | Verificação / limite |
|---|---|---|---|
| Nome e slug | Workspace e branding action | Formulário/API de identificação e marca | Persistência/isolamento PostgreSQL; browser pendente |
| Slogan | Workspace.slogan | Preferência local da academia | Persistência PostgreSQL |
| Cor | Workspace.primaryColor | HEX validado, fallback, foreground e theme por workspace | Contraste calculado; aplicação visual/reload/troca pendentes |
| Logo | logoUrl/logoKey | Upload/contexto de marca da academia | Formulário e chaves validados; objeto R2 real pendente |
| Watermark e capa | watermarkUrl/Key, workoutCoverUrl/Key | Preferências locais para material de treino | Persistência/isolamento; material exportado/editor avançado pendentes |
| Perfil profissional | User e updateProfile | StaffProfile e ficha de colaborador quando aplicável | Não usar configuração GYM para mudar identidade global |

## Profundidade e pendências da leitura

| Área | Evidência lida neste aprofundamento | Ainda não pode ser chamada de jornada completa |
|---|---|---|
| Acesso/seleção | auth.config, layout PERSONAL, context-service, select-workspace page/action/client, actions de workspaces, switcher/store/initializer, schema de papéis | Todas as rotas diretas e expiração/contexto no browser |
| Criação/trial | createWorkspace, onboarding API, trechos de registro autônomo/criação administrativa, schema Subscription/FreeTrial/Plan e entitlements | Todos os produtores de trial/assinatura e fluxos de checkout; nenhum checkout real executado |
| Navegação | Sidebar, mobile e layout; preload da assinatura e widgets | Todos os destinos/actions sem workspace e menus secundários |
| Aluno/dashboard | Handlers de autoridade, listas/detalhe/dashboard, dependências de tabs/fetches e fronteiras já tratadas | Arquivos extensos foram lidos parcialmente; detalhe UI e dashboard não estão integralmente homologados |
| Avaliações/arquivos | Rotas e autoridade comuns; campos/persistência e efeitos encontrados | Mutações de User global nas avaliações, formulário completo e efeito de falha de e-mail |
| Agenda/organização | Entradas, GET organização, relação Calendar → API e tipos de task | CRUD completo/autor, timezone e portais |
| Marca | Actions de settings, serviço/form compartilhados e modelos | Material de treino, uploads reais e inspeção visual |

Não houve liberação genérica de endpoints PERSONAL para GYM, mudança de papel global ou implementação antecipada da experiência afiliada. Os riscos acima devem orientar a última etapa, mantendo a operação autônoma e negando permissões no servidor.
