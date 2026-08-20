# ATLASFIT — DIRETRIZES DE PRIVACY BY DESIGN & DEFAULT

A plataforma AtlasFit adota o princípio de **Privacy by Design e Privacy by Default** (Privacidade desde a Concepção e por Padrão) em todo o seu ciclo de vida de desenvolvimento de software.

---

## 1. Minimização de Dados (Data Minimization)
- **Coleta Estrita:** O sistema apenas solicita dados estritamente necessários para a execução dos serviços contratados.
- **Formulários Públicos:** O formulário de captação de leads (`/t/[slug]`) não coleta CPF, data de nascimento ou dados de saúde.
- **Camada de IA:** O serviço `sanitizeTextForGemini` limpa dados pessoais diretos (CPFs, CNPJs, tokens e senhas) antes de qualquer envio de texto para processamento de IA.

## 2. Validação Etária Centralizada no Backend
- A regra de lançamento **AtlasFit 18+** é imposta pelo servidor via `validateAgeEligibility`.
- Não se confia exclusivamente em restrições de frontend (`<input type="date">`).
- Cadastro de contas, onboarding e importação de menores são interceptados e bloqueados diretamente no backend.

## 3. Isolamento Estrito Multi-Tenant (Tenant Isolation & Anti-IDOR)
- Cada consulta a recursos sensíveis (alunos, treinos, avaliações físicas, fotos, transações) valida obrigatoriamente a cadeia de permissões:
  `Sessão Autenticada → Workspace Ativo → Associação de Membro → Recurso Alvo`.
- Personal A não consegue consultar, alterar ou excluir dados pertencentes a alunos do Personal B.

## 4. Redação Automática em Logs (Log Sanitization)
- O módulo `logger.ts` implementa filtro por expressão regular que mascara automaticamente senhas, tokens Bearer, CPFs, números de cartão e CVVs antes de gravar em stdout ou no PostgreSQL (`AuditLog`).

## 5. Versionamento Imutável de Documentos Legais
- Termos de Uso e Políticas de Privacidade são armazenados no banco com versionamento semântico (`v1.0`, `v1.1`, `v2.0`) e cálculo do hash SHA-256 do conteúdo.
- O aceite do usuário grava a versão exata e o hash do documento vigente no momento da assinatura.
- Nenhuma versão publicada pode ser alterada silenciosamente.
