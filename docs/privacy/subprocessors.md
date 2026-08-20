# ATLASFIT — LISTA DE SUBPROCESSADORES DE DADOS

Este documento lista todos os provedores e fornecedores terceirizados que tratam ou armazenam dados pessoais em nome do AtlasFit.

---

| Fornecedor / Subprocessador | Serviço / Função | Categoria de Dados Tratados | Localização dos Servidores | Transferência Internacional? | Mecanismo de Salvaguarda |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Neon Tech Inc.** | Banco de Dados Relacional (PostgreSQL Serverless) | Todos os dados cadastrais, financeiros, treinos e logs | Estados Unidos (AWS `us-east-1`) | **Sim** | Cláusulas Padrão Contratuais / Criptografia TLS 1.3 em trânsito e AES-256 em repouso |
| **Cloudflare Inc.** | Armazenamento de Objetos (Cloudflare R2 Storage) e CDN | Fotos corporais, vídeos de exercícios, PDFs de exames e logos | Estados Unidos / Global | **Sim** | Criptografia em repouso / Acesso restrito via presigned URLs |
| **Google LLC (Gemini API)** | Extração e OCR de planilhas/PDFs na Migração Inteligente | Conteúdo textual de planilhas de alunos e treinos | Estados Unidos | **Sim** | Camada de sanitização interna (remoção de CPF/senhas) antes do envio / API corporativa com garantia de não-treinamento de modelos |
| **Asaas Gestão Financeira S.A.** | Gateway de Pagamentos, Subcontas e Atlas Pay | Nome, CPF/CNPJ, dados bancários, chave PIX, cobranças | Brasil | Não | Instituição de Pagamento regulada pelo Banco Central do Brasil |
| **AbacatePay Soluções de Pagamento Ltda.** | Processamento de Assinaturas e Checkout PIX | Nome, e-mail, CPF, status de assinaturas | Brasil | Não | Gateway brasileiro de pagamentos em conformidade com o BACEN |
| **Resend Inc.** | Disparo de E-mails Transacionais (2FA, Setup de Senha, Convites) | Nome e endereço de e-mail | Estados Unidos | **Sim** | Criptografia TLS e chaves autenticadas via DKIM/SPF/DMARC |
| **Ably Realtime Ltd.** | Mensageria e WebSockets em Tempo Real (Chat, Progresso de Migração) | IDs de eventos, notificações de progresso, status online | Reino Unido / Estados Unidos | **Sim** | Dados efêmeros em trânsito com autenticação por token |
| **Google LLC (Firebase FCM)** | Notificações Push (PWA / Mobile) | Device Tokens e títulos/corpos de notificações | Estados Unidos | **Sim** | Tokens anônimos de push notification |
| **Vercel Inc.** | Hospedagem Serverless e Edge Network | Logs temporários de requisições HTTP, endereços IP | Estados Unidos / Global | **Sim** | Conexões HTTPS forçadas, headers de segurança (HSTS, CSP) |
