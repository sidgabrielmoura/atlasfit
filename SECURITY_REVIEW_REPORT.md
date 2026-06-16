# Relatório de Revisão de Segurança e Hardening — AtlasFit

Este documento apresenta uma revisão completa de segurança, confiabilidade e proteção de dados do projeto **AtlasFit**, alinhada às diretrizes da OWASP e em conformidade com a LGPD (Lei Geral de Proteção de Dados).

---

## 1. Resumo Executivo

### Nível de Maturidade Atual de Segurança
Após a inspeção minuciosa da base de código, o AtlasFit apresenta um nível de maturidade de segurança **Intermediário-Avançado (Bom)**. A arquitetura emprega boas práticas padrão do ecossistema Next.js:
* Controle de sessão unificado via **NextAuth v5 (Beta)** com JWTs de expiração controlada.
* Restrição e separação de rotas por perfis utilizando callbacks e middlewares nativos.
* Consultas parametrizadas e isolamento lógico estruturado através do **Prisma ORM**, anulando riscos comuns de SQL Injection.
* Histórico detalhado de logs operacionais e tratamento centralizado de falhas críticas de sistema salvos na tabela `AuditLog`.

### Principais Riscos Encontrados
Durante a auditoria estática do código, identificamos e neutralizamos os seguintes vetores de risco críticos para produção:
1. **Exposição Indireta de Hash de Senhas (Sensitive Data Exposure)**: As rotas de Superadmin retornavam objetos `User` brutos do Prisma, expondo inadvertidamente os hashes de senhas dos usuários no payload JSON da resposta de rede.
2. **Ausência de Cabeçalhos de Segurança HTTP (HTTP Hardening)**: Respostas da aplicação não continham cabeçalhos essenciais contra XSS, Clickjacking e content-type sniffing.
3. **Riscos de Bypasses Multitenancy (Clonagem e Associação de Recursos)**:
   * A criação de treinos na rota de Personal Trainer permitia especificar qualquer `workspaceId` sem verificar a pertinência de workspace do criador.
   * A clonagem de treinos modelo permitia usar qualquer ID de treino do banco de dados, possibilitando a leitura e cópia não autorizada de modelos de treinos criados por outros instrutores/workspaces (Cross-Tenant cloning).
4. **Bypasses Criptográficos no Webhook de Pagamento**: Verificações incompletas de cabeçalho poderiam causar falhas ou simulações locais.
5. **Poluição / SPAM em Rotas Públicas**: A rota pública de captura de leads aceitava formatos inválidos ou incompletos de e-mail sem verificação de formato básico.

### Melhorias Aplicadas
Todas as vulnerabilidades e brechas de hardening mapeadas acima foram corrigidas. Além disso, foi implementado um sistema de **Rate Limiting** em memória nas rotas públicas e administrativas mais sensíveis para mitigar abusos de infraestrutura e brute-force.

---

## 2. Alterações Realizadas

| Arquivo Modificado | Motivo da Alteração | Benefício / Impacto |
| :--- | :--- | :--- |
| [`next.config.ts`](file:///c:/Users/gabriel/development/atlasfit/next.config.ts) | Ausência de cabeçalhos HTTP de segurança contra ataques no navegador. | Injeção global de cabeçalhos (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, etc.) para prevenção de Clickjacking e XSS. |
| [`src/lib/rate-limit.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/rate-limit.ts) | [NOVO] Ausência de proteção e controle contra inundação de requisições e ataques de brute-force. | Utilitário central de rate limiting em memória com sistema de autolimpeza periódica para prevenção de vazamento de memória. |
| [`src/app/api/personal/workouts/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/personal/workouts/route.ts) | Permissão de associar treinos a workspaces arbitrários de terceiros. | Validação estrita de workspace. O instrutor agora só pode criar treinos vinculados a workspaces em que possui associação de membro ativa. |
| [`src/app/api/personal/clients/[id]/workouts/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/personal/clients/%5Bid%5D/workouts/route.ts) | Brecha que permitia a clonagem de treinos modelo de qualquer workspace. | Proteção Cross-Tenant no fluxo de clonagem. O treino clonado deve pertencer ao mesmo workspace ou ser de autoria do instrutor ativo. |
| [`src/app/api/superadmin/users/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/superadmin/users/route.ts) | Exposição de hash de senhas na listagem geral de usuários do Superadmin. | Desestruturação e expurgo do campo `password` antes do envio do JSON. |
| [`src/app/api/superadmin/users/[id]/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/superadmin/users/%5Bid%5D/route.ts) | Exposição de hash de senhas nos payloads de detalhes (`GET`) e atualização (`PATCH`) de usuários. | Remoção segura do campo `password` no payload retornado aos dashboards do administrador. |
| [`src/app/api/superadmin/impersonate/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/superadmin/impersonate/route.ts) | Risco de abuso no endpoint administrativo de impersonação por meio de múltiplos acessos sucessivos. | Implementado limitador de 10 chamadas/minuto por ID de Superadmin para conter possíveis scripts maliciosos. |
| [`src/components/auth/actions.ts`](file:///c:/Users/gabriel/development/atlasfit/src/components/auth/actions.ts) | Vulnerabilidade a ataques de Credential Stuffing e brute-force de senhas. | Implementado rate limiting na action de login limitando o cliente a 5 tentativas/minuto por IP. |
| [`src/app/api/webhooks/abacatepay/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/webhooks/abacatepay/route.ts) | Risco de runtime crash na chamada de verificação de webhook do AbacatePay devido à ausência do cabeçalho de assinatura. | Validação explícita de cabeçalho `x-webhook-signature` em modo de produção, retornando `401 Unauthorized` preventivo se nulo. |
| [`src/app/api/public/capture/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/public/capture/route.ts) | Ingestão pública de strings arbitrárias de e-mail e vulnerabilidade a spam/inundação de banco de dados. | Validação formal de e-mail por regex e limitador de taxa (Rate Limit) de 5 requisições/minuto por IP address. |

---

## 3. Itens Revisados

Abaixo está o checklist de tudo o que foi analisado estaticamente durante a auditoria:

- [x] **Autenticação**: Uso de bcryptjs na criptografia das senhas (Salt Rounds = 10); Fluxo de expiração de tokens e controle dinâmico de sessão JWT.
- [x] **Rate Limiting**: Proteção de endpoints sensíveis (login, impersonação, e captura de leads) com controle de requisições por IP e janelas de expiração.
- [x] **Impersonation**: Mecanismo de personificação de usuários pelo Superadmin utiliza tokens criptográficos descartáveis de uso único (`VerificationToken` no banco de dados) com tempo de expiração curto (2 minutos).
- [x] **Autorização**: Validação de propriedade e pertinência de dados. Garante que personal trainers apenas acessem informações e alunos associados ao workspace em que trabalham.
- [x] **Validação de Inputs**: Análise estrutural de corpos de requisições, filtros e URLs dinâmicas nos endpoints REST.
- [x] **Segurança de APIs**: Controle e consistência nos retornos das APIs, tratamentos de exceção nos blocos `try/catch` de todas as rotas e prevenção de vazamentos de stacktraces em produção.
- [x] **Banco de Dados**: Modelagem de dados sensíveis na tabela `User` (peso, altura, condições médicas) e propagação em cascata de exclusões para evitar dados órfãos e estar em conformidade com a LGPD.
- [x] **Webhooks e Pagamentos**: Lógica de idempotência (validação de transação já aprovada antes do processamento) e integridade dos cupons promocionais.
- [x] **Cabeçalhos de Segurança (HTTP Hardening)**: Ajuste fino na infraestrutura de respostas HTTP nativas do Next.js.

---

## 4. Itens Pendentes (Necessitam de Ação Manual)

Como a análise foi estática e focada na base de código, os seguintes aspectos operacionais devem ser validados e aplicados manualmente nos ambientes de nuvem/infraestrutura:

### 1. Enforçar SSL Completo e Redirecionamento (HTTPS)
Toda a comunicação deve trafegar via HTTPS.
* **Ação**: No provedor de hospedagem (Vercel, Railway, Render, etc.), certifique-se de que a opção de redirecionamento automático de `HTTP` para `HTTPS` esteja ativada e que os certificados SSL/TLS estejam atualizados.

### 2. Substituição das Variáveis de Ambiente em Produção
* **Ação**: No arquivo `.env` local, constam chaves de desenvolvimento e credenciais expostas do Neon DB e AbacatePay. No painel da plataforma de deploy (produção), você **deve cadastrar novas chaves secretas**, incluindo:
  * Um `AUTH_SECRET` forte gerado aleatoriamente (ex: executando `openssl rand -base64 32`).
  * Credenciais de API (`ABACATEPAY_API_KEY`) e segredos de webhook (`ABACATEPAY_WEBHOOK_SECRET`) do ambiente Live/Produção do AbacatePay.
  * String de conexão segura para o banco de dados principal.

### 3. Configuração de DNS CAA e DNSSEC
Proteja os domínios contra interceptação ou emissão não autorizada de certificados.
* **Ação**: Adicione um registro CAA delegando permissão apenas para a autoridade certificadora desejada (ex. Let's Encrypt) e ative o DNSSEC no painel de registro do seu domínio.

---

## 5. Como Validar as Alterações

### Teste de Cabeçalhos de Segurança HTTP
Você pode testar a eficácia dos novos cabeçalhos fazendo uma requisição direta ao servidor local e inspecionando os headers de resposta.
```bash
curl -I http://localhost:3000
```
**Validação Esperada**: Os seguintes cabeçalhos devem aparecer na saída:
* `X-Frame-Options: DENY`
* `X-Content-Type-Options: nosniff`
* `Referrer-Policy: origin-when-cross-origin`
* `X-XSS-Protection: 1; mode=block`

### Teste de Rate Limiting (Captura de Leads e Login)
Faça requisições rápidas e consecutivas (mais de 5 requisições em menos de um minuto) para o endpoint `/api/public/capture` ou no formulário de login.
* **Validação Esperada**:
  * Para a API de captura: Retorna HTTP `429 Too Many Requests` com cabeçalhos `X-RateLimit-*`.
  * Para o Login: Retorna o erro `"Muitas tentativas de login. Tente novamente mais tarde."` na interface do usuário.

### Teste de Sanitização de Senha nas Rotas do Superadmin
Faça uma requisição autenticada como Superadmin para o endpoint `/api/superadmin/users` ou `/api/superadmin/users/[id]`.
* **Validação Esperada**: No objeto retornado, o campo `password` deve estar completamente ausente.

### Teste de Criação de Treino com Workspace Inválido
Tente fazer uma requisição `POST` para `/api/personal/workouts` passando um `workspaceId` aleatório que não pertença à sua conta.
* **Validação Esperada**: A API deve retornar `403 Forbidden` com a mensagem `"Acesso negado ao workspace informado."`.

---

## 6. Recomendações Futuras

### Curto Prazo (Próximos 30 dias)
* **Complexidade de Senha no Cadastro**: Fortalecer os requisitos de senha na rota `registerTrainer` (mínimo de 8 caracteres, exigindo pelo menos uma letra maiúscula, um número e um caractere especial).

### Médio Prazo (Próximos 6 meses)
* **Histórico de Consentimento de Termos (LGPD)**: Adicionar um histórico de versões de termos de serviço aceitos pelos usuários, rastreando a data e o consentimento explícito no banco de dados.
* **Sanitização de HTML contra XSS (Rich Text)**: A propriedade `bio` do Personal Trainer e `medicalConditions` do aluno podem vir a renderizar HTML. Certifique-se de usar pacotes como `isomorphic-dompurify` se estas informações forem exibidas no frontend sem sanitização prévia.

### Longo Prazo (Após 6 meses)
* **Auditorias de Terceiros e Pentests**: Contratar uma empresa de segurança terceirizada para realizar testes ofensivos em caixa-preta (Black Box Pentesting) e verificar vulnerabilidades em nível de infraestrutura de nuvem, APIs e integridade de sessões.
