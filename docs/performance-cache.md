# CPU e cache do AtlasFit

Implementação de 07/11/2026 para reduzir trabalho repetido nas Functions. O cache persistente usa o Data Cache nativo do Next (`unstable_cache`), sem Redis ou serviço adicional. Não é necessário ativar Cache Components nem alterar a estratégia de renderização das áreas autenticadas.

## Dados reutilizáveis

| Conteúdo | Validade | Invalidação imediata |
| --- | --- | --- |
| Nome da plataforma e contatos públicos de suporte | 5 minutos | PATCH de configurações e limpeza manual |
| IDs/nomes do catálogo público de exercícios | 5 minutos | Criação, edição, exclusão, mesclagem e limpeza de exercícios pelo superadmin |
| Grupos musculares | 5 minutos | Criação pelo superadmin e limpeza manual |

As funções e tags estão em `src/lib/cache/public-data.ts`. Somente dados públicos entram nesse cache. O catálogo mantém o filtro que oculta exercícios particulares de treinos; as rotas mantêm a autenticação e a autorização antes de consultar o catálogo. Cookies, sessões, permissões, saldos, cobranças e dados pessoais não são armazenados no cache compartilhado. Falhas de banco continuam sendo falhas, sem gravar um resultado vazio de fallback.

A invalidação usa `revalidateTag(tag, { expire: 0 })` depois da gravação confirmada. A próxima leitura consulta o banco, sem servir a versão anterior. Novos escritores desses dados precisam invalidar a tag correspondente; alterações por SQL, scripts ou jobs externos aparecem após a revalidação por tempo. O carregador de catálogo usado por jobs/CLI continua disponível sem depender de um contexto HTTP do Next.

Os grupos padrão são conferidos apenas durante o carregamento do cache. Se faltarem grupos, um único `createMany` com `skipDuplicates` inicializa os ausentes. Isso substitui os 12 upserts por leitura da rota do superadmin.

## Menos chamadas e processamento

- O proxy executa nas áreas PERSONAL, STUDENT, GYM, GUARDIAN, SUPERADMIN e em `/api/gym`. Arquivos públicos e demais APIs deixam de iniciar esse proxy. A verificação de origem de mutações GYM e o cabeçalho de caminho usado pela afiliação PERSONAL permanecem.
- Páginas públicas conhecidas não fazem a consulta inicial de sessão. Convites, ativação de conta, onboarding e seleção de workspace continuam consultando a sessão. A biblioteca Auth.js mantém sua sincronização e revalidação de sessão; não há cache persistente de autenticação.
- Privacidade, campanhas e registro FCM globais são montados após autenticação nas páginas que utilizam sessão. O conteúdo estático da central de privacidade pode ser pré-renderizado; termos e política continuam consultando a versão vigente em cada requisição com `connection()`.
- Banner, card e popup compartilham a leitura de campanhas por até 5 segundos no navegador. A chave inclui usuário, versão da sessão, papel e URL com workspace. Falhas não são reutilizadas; respostas atrasadas de um componente desmontado são ignoradas. Escritas e eventos continuam sendo enviados individualmente.
- O login que já validou senha e fatores usa a prova interna, atômica e de uso único para concluir a autenticação. O segundo bcrypt foi removido desse caminho. Login direto ainda verifica senha, e MFA continua exigindo prova. Bloqueio, elegibilidade, política atual e manutenção são revalidados.
- A comparação de exercícios reutiliza nomes repetidos dentro do lote, evita cálculos de similaridade cujo limite máximo não pode vencer e encerra a busca ao encontrar pontuação máxima, preservando o desempate por ID.
- A retenção opt-in de payloads de webhooks passou do job de entregas para a rotina horária `process-recurrence`. Os endpoints e segredos do agendador continuam iguais. O timer de limpeza do rate limit em memória não é iniciado na configuração de produção com contadores compartilhados.

## Verificação

Os testes em `src/lib/__tests__/public-data-cache.test.ts` usam o cache real do Next para verificar reutilização, expiração e invalidação. Os testes de autorização verificam senha, MFA, prova inválida/reutilizada, bloqueio e alterações de versão/senha; `tests/gym/login-authorization.integration.ts` verifica consumo concorrente no PostgreSQL descartável. Os testes de rotas verificam exclusão de assets e preservação das fronteiras protegidas.

Na validação de 07/11, os 393 testes unitários passaram. A suíte PostgreSQL completa executada teve 393 aprovações e uma falha em `audit-remediation.integration.ts`: exclusão de funcionário retornou 200, embora o teste espere 404. O fluxo de exclusão não foi alterado nesta otimização. Os seis testes novos de autorização de login passaram separadamente, incluindo consumo concorrente, expiração e invalidação por senha/versão/bloqueio.

O TypeScript e a compilação de produção passaram. A verificação usou configuração isolada, banco PostgreSQL descartável e integrações externas desabilitadas; não executou publicação nem migração do banco em produção.

Um cenário de navegador com os componentes reais e transporte HTTP sintético verificou zero chamadas de sessão/campanhas na página pública, uma consulta de sessão ao entrar na área privada, nenhuma consulta adicional ao navegar entre páginas privadas e uma consulta de campanhas para banner, card e popup juntos. Também verificou troca de usuário/workspace e preservação da sessão nos convites. O provedor permanece montado entre navegações; ao entrar na área privada, usa o refresh do próprio Auth.js para atualizar também o estado interno de sessão. Revalidar esse cenário ao atualizar o NextAuth.

Em uma medição local sintética, com 5.000 candidatos, 100 nomes e sete amostras, a mediana de CPU da comparação de exercícios caiu de 3.734 ms para 63 ms. Cem conjuntos sintéticos também produziram resultados idênticos aos da implementação anterior. Esse resultado se limita ao comparador; não estima a redução global da Vercel.

Após publicar, comparar Active CPU e quantidade de invocações por função em períodos com tráfego equivalente. Observar separadamente `/api/auth/session`, `/api/engage/active`, catálogos, renderizações de páginas e jobs. Tempo esperando banco/serviços externos não equivale a Active CPU. As alterações de código não removem uma suspensão de cota já aplicada pela Vercel.
