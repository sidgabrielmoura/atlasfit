# Ingresso próprio do aluno adulto — 09/10/2026

O cadastro assistido e a importação agora têm um caminho de ingresso pela ficha do aluno: emitir um link manual ou colocar o convite na fila de e-mail. O aluno configura sua própria senha e aceita os documentos vigentes. Contas existentes conservam a senha e só são vinculadas depois da autorização do titular em sua sessão própria. Menores continuam usando o ingresso do responsável já implementado; não recebem convite de conta própria.

## Comportamento implementado

- Convite de uso único, válido por 48 horas, com token aleatório e somente hash na tabela de verificação. Reemissão invalida os anteriores, inclusive setup legado. A página pública usa `no-referrer` e não retorna a identidade completa.
- Emissão revalida o operador, sua versão de sessão, licença, unidade, vínculo e permissão. Suporte por impersonação não emite o convite nem registra aceites. Claim exige uma sessão anônima, identidade adulta, CPF/e-mail coerentes e os IDs dos documentos atualmente publicados.
- Consumo transacional registra senha e dois aceites próprios, revoga credenciais anteriores e grava auditoria. Não cria trial, pagamento ou ativação comercial.
- E-mail usa outbox cifrada, idempotência, recibo e revalidação do convite antes de enviar. Convite revogado fica `SKIPPED`. A interface informa fila, sem anunciar entrega ao destinatário.
- Quando a conta já tem senha, a ficha oferece login próprio, preservando a credencial e o workspace PERSONAL privado. A autorização de vínculo existente é separada do aceite contratual.
- O formulário de vínculo existente não exige repetir nome e nascimento que a consulta de privacidade não divulga. Campos vazios são tratados corretamente e o servidor utiliza a identidade global autorizada, preservando seus dados.

## Evidências

O [manifesto deste lote](verificacoes-ingresso-aluno.json) contém resultados, artefatos e hashes. A validação combina PostgreSQL, HTTP no Next isolado, Chrome real, TypeScript e regressão PERSONAL. Cadastro/importação, concorrência, replay, prazo, revogação, menor, conta legada, identidade, documentos e falhas de entrega têm cenários próprios. Os testes HTTP fora do filtro não são declarados executados neste lote.

Na validação, foi removida a reatribuição de `console.error` a cada render do provider global: ela acumulava wrappers durante navegação/renderizações e ocultava erros. A checagem visual usa um novo contexto de navegador. Diagnósticos intermediários de timeout e reinício automático do Next por memória foram preservados separadamente do resultado final.

O ensaio final pré-compila páginas e APIs antes de abrir os formulários, para que compilações não reiniciem uma autorização pendente. Páginas, APIs, autenticação e banco são reais; o transporte funcional não é simulado. O cache do servidor de teste foi limitado para evitar acumular páginas de lotes anteriores.

A captura inicial do portal da conta existente mostra o carregamento. Uma conferência adicional confirmou HTTP 200, o workspace correto na API e o dashboard efetivamente renderizado, com captura separada `portal-conta-existente-carregado.png`.

O ensaio externo enviou apenas ao endereço sintético oficial do Resend, conservou o recibo e recusou processamento repetido. A consulta ao recibo retornou `not_found`; não há confirmação do evento de entrega, de caixa postal real, renderização ou spam. Referências oficiais: [endereços de teste](https://resend.com/docs/dashboard/emails/send-test-emails) e [consulta de e-mail](https://resend.com/docs/api-reference/emails/retrieve-email).

## Limites e encerramento solicitado

Dados de ingresso e browser são sintéticos em PostgreSQL e Next locais. Não houve implantação, alteração do banco real ou mensagem para clientes. Cron/scheduler operacional, retenção/purga, vínculos financeiros legados e revisão jurídica continuam nos respectivos achados abertos. A verificação visual do responsável pertence ao lote anterior e não foi repetida aqui.

Ao terminar este lote, o trabalho será interrompido conforme solicitado. A lista completa para retomada fica em [pendências restantes](pendencias-restantes.md).
