# Realtime por contexto selecionado — 07/10/2026

O achado 049 exige capacidades mínimas por vínculo e renovação/revogação no ciclo do cliente. A rota de token usa sessão atual, cookie de workspace e capabilities explícitas. Um workspace solicitado diferente do cookie retorna 409; seleção vazia ou duplicada retorna 400. Respostas de token usam `private, no-store`; o browser não recebe a chave do servidor.

Os canais de workspace, presença e conversas são limitados ao contexto selecionado, com vínculo ativo, licença GYM e autoridade atual por unidade/carteira. Sem seleção, ficam somente canais pessoais e globais autorizados. Chat de lista usa `user:<id>:workspace:<id>:chat`; eventos de outro workspace não entram na lista atual. O servidor distribui cada evento somente aos participantes com autoridade vigente.

O provedor React publica a instância pelo estado depois de `auth.authorize` confirmar a autorização. Uma troca fecha a conexão anterior e cria outra com token novo. O contexto fica indisponível durante essa transição. Callbacks de presença, conversas e importações e resultados de operações antigas não alteram o novo contexto. Autorizações fora de ordem, falhas e desmontagem não recuperam clientes fechados. O retorno rápido A/B/A também exige uma instância nova de A.

## Verificações

- Dois testes PostgreSQL conferem PERSONAL/GYM, conversas, seleção ausente/estrangeira, revogação de vínculo e licença encerrada.
- A fixture React e os stores reais no Chrome verificam cinco cenários de contexto, troca, retorno rápido, resultados atrasados, falha e desmontagem. O transporte é um mock controlado nessa fixture.
- Um teste HTTP real da aplicação isolada confere sessão, cookie, seleção divergente e serviço não configurado.
- O Ably real confirma dois contextos sintéticos: recebimento em A, fechamento, recebimento em B, leitura de A/usuário estrangeiro negada, publicação financeira pelo cliente negada e perda de acesso a B após nova autorização com vínculo revogado. Nenhum comando financeiro é executado.
- Regressão: 258 integrações PostgreSQL, 77 testes compartilhados PERSONAL e 60 casos HTTP aprovados. A primeira rodada PERSONAL teve uma fixture sem `$queryRaw`; a correção passou a simular o lock e verificar também que resultado incerto mantém uma única reserva e não repete a transferência. Resultados intermediários são preservados.

O [manifesto](verificacoes-realtime.json) contém fontes e evidências. O [lote anterior](entregas-webhooks-baseline.md) permanece histórico, com 256 integrações e 59 HTTP.

## Limites operacionais

A renovação consulta novamente vínculos, licença e sessão. Tokens emitidos têm TTL de até 60 segundos; revogação de vínculo não invalida instantaneamente uma credencial previamente emitida em outro cliente. A troca na interface fecha o cliente local imediatamente, e a autorização seguinte remove as capacidades. Revogação global de credenciais, deployment e demais políticas de autenticação permanecem nos achados 043/065. O teste real usa Node; a fixture do browser comprova o ciclo React separadamente. Não representa implantação ou homologação visual de toda a aplicação.

Referências oficiais: [Ably Auth: authorize](https://ably.com/docs/pub-sub/api/javascript/realtime/auth) e [Capabilities](https://ably.com/docs/auth/capabilities).
