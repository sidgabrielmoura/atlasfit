# ATLASFIT — POLÍTICA DE SEGURANÇA DA INFORMAÇÃO (PSI)

Este documento sintetiza as diretrizes e salvaguardas técnicas de segurança da informação adotadas na plataforma AtlasFit.

---

## 1. Gestão de Acessos e Autenticação
- **Senhas:** Criptografadas no banco utilizando `bcryptjs` com fator de custo (*salt rounds*) 10.
- **Autenticação em Dois Fatores (2FA):** Disponível para usuários e personal trainers com envio de OTP seguro por e-mail com expiração e rate limit.
- **Sessões e Cookies:** Cookies de sessão assinados, configurados com flags `HttpOnly`, `SameSite=Lax` e `Secure` (em produção).
- **Controle de Acesso Baseado em Papéis (RBAC):** Restrições estritas de nível de perfil (`SUPERADMIN`, `TRAINER`, `STUDENT`).

## 2. Proteção de Dados em Trânsito e Repouso
- **Trânsito:** Todas as comunicações utilizam TLS 1.3 obrigatório (HTTPS / WSS).
- **Repouso:** O banco de dados no Neon e o armazenamento no Cloudflare R2 utilizam criptografia AES-256 em repouso.
- **Credenciais Bancárias e API Keys:** Chaves de subcontas Asaas são criptografadas com AES-256-CBC antes de persistidas (`subaccount-crypto.ts`).

## 3. Isolamento Multi-Tenant & Prevenção de IDOR / BOLA
- Cada requisição que acessa clientes, treinos, avaliações ou finanças valida expressamente se o usuário autenticado é proprietário ou membro ativo do workspace ao qual o recurso pertence.

## 4. Gestão de Segredos e Ambientes
- Nenhuma chave de API, segredo ou token privado é comitado no repositório Git.
- Todos os segredos residem exclusivamente em variáveis de ambiente gerenciadas no provedor de hosting (Vercel) e arquivos `.env.local` (ignorados no `.gitignore`).
