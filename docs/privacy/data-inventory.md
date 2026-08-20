# ATLASFIT — INVENTÁRIO DE DADOS PESSOAIS (ROPA / DATA INVENTORY)

Este documento registra a matriz completa de inventário de operações de tratamento de dados pessoais (Art. 37 da LGPD - Lei nº 13.709/2018) da plataforma AtlasFit.

---

## 1. Dados Cadastrais e de Identificação

| Dado | Titular | Origem | Finalidade | Base Legal (LGPD) | Sensível? | Armazenamento | Acesso | Retenção | Compartilhamento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Nome Completo** | Personal / Aluno | Formulário de Cadastro / Onboarding | Identificação da conta e personalização de treinos | Art. 7º, V (Contrato) | Não | PostgreSQL (`User.name`) | Próprio titular, Personal vinculado, Superadmin | Vigência da conta + 5 anos | Provedor de e-mail (Resend) |
| **E-mail** | Personal / Aluno | Cadastro / Convite | Autenticação, recuperação de senha e notificações | Art. 7º, V (Contrato) | Não | PostgreSQL (`User.email`) | Próprio titular, Personal vinculado, Superadmin | Vigência da conta + 5 anos | Resend (envio de e-mails transacionais) |
| **Data de Nascimento** | Personal / Aluno | Cadastro / Setup de Senha / Onboarding | Validação etária de elegibilidade (18+) e cálculo metabólico | Art. 7º, V (Contrato) e Art. 11, II, "f" (Tutela de Saúde) | Não | PostgreSQL (`User.birthDate`) | Próprio titular, Personal vinculado | Vigência da conta | Nenhum |
| **CPF / CNPJ** | Personal / Aluno | Cadastro / Faturamento / Asaas | Emissão fiscal, compliance bancário e combate a fraude | Art. 7º, II (Obrigação Legal) e V (Contrato) | Não | PostgreSQL (`User.cpfCnpj`) | Próprio titular, Personal (Aluno), Superadmin | 5 anos (Código Tributário) | Asaas / Gateway de Pagamento |
| **WhatsApp / Telefone** | Personal / Aluno | Cadastro / Perfil | Comunicação direta de suporte e lembretes de treino | Art. 7º, V (Contrato) / Art. 7º, I (Consentimento p/ promoções) | Não | PostgreSQL (`User.whatsapp`) | Próprio titular, Personal vinculado | Vigência da conta | Nenhum (envio via cliente) |
| **CREF** | Personal Trainer | Configurações de Perfil | Comprovação de habilitação técnica profissional | Art. 7º, V (Contrato) e Art. 7º, II (Regulamentação Profissional) | Não | PostgreSQL (`User.cref`) | Próprio titular, Alunos vinculados | Vigência da conta + 5 anos | Nenhum |

---

## 2. Dados Pessoais Sensíveis (Saúde, Biometria e Físicos)

| Dado | Titular | Origem | Finalidade | Base Legal (LGPD) | Sensível? | Armazenamento | Acesso | Retenção | Compartilhamento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Peso e Altura** | Aluno | Onboarding / Avaliações / Check-ins | Prescrição de treino, cálculo de IMC e evolução física | Art. 11, II, "f" (Procedimento de Saúde) | **SIM** | PostgreSQL (`StudentProgress`, `PhysicalEvaluation`) | Aluno, Personal vinculado | Vigência do vínculo com o Personal | Nenhum |
| **Dobras Cutâneas (Pollock)** | Aluno | Avaliação Física | Cálculo de % de gordura e densidade corporal | Art. 11, II, "f" (Procedimento de Saúde) | **SIM** | PostgreSQL (`PhysicalEvaluation.dobras`) | Aluno, Personal vinculado | Vigência do vínculo com o Personal | Nenhum |
| **Histórico de Lesões / Dores** | Aluno | Anamnese / Onboarding | Prevenção de lesões e restrições biomecânicas | Art. 11, II, "f" (Tutela de Saúde) | **SIM** | PostgreSQL (`User.medicalConditions`, `PhysicalEvaluation.anamnese`) | Aluno, Personal vinculado | Vigência do vínculo com o Personal | Nenhum |
| **Fotos de Evolução Corporal** | Aluno | Upload pelo Aluno / Personal | Acompanhamento visual da composição corporal | Art. 11, I (Consentimento Específico) e Art. 11, II, "f" | **SIM** | Cloudflare R2 (`StudentProgressPhoto.objectKey`) | Aluno, Personal vinculado (via URL assinada) | Até solicitação de exclusão ou fim do contrato | Cloudflare R2 (Armazenamento criptografado) |
| **Laudos e Exames Médicos** | Aluno | Upload de Arquivos | Adequação de intensidade cardiorrespiratória | Art. 11, II, "f" (Procedimento de Saúde) | **SIM** | Cloudflare R2 (`StudentFile.objectKey`) | Aluno, Personal vinculado (via URL assinada) | Até solicitação de exclusão ou fim do contrato | Cloudflare R2 |

---

## 3. Dados Financeiros e de Cobrança

| Dado | Titular | Origem | Finalidade | Base Legal (LGPD) | Armazenamento | Retenção | Compartilhamento |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Cobranças e Faturas** | Personal / Aluno | Atlas Pay / Asaas / AbacatePay | Cobrança de mensalidades e controle de inadimplência | Art. 7º, V (Contrato) e Art. 7º, II (Obrigação Legal) | PostgreSQL (`Payment`, `PaymentProviderAccount`) | 5 anos (Legislação fiscal/bancária) | Asaas Gestão Financeira S.A., AbacatePay |
| **Dados Bancários / Chave PIX** | Personal Trainer | Configuração Atlas Pay | Liquidação de repasses e saques de consultoria | Art. 7º, V (Contrato) | PostgreSQL (`PaymentProviderAccount`) | 5 anos | Asaas |
| **Dados de Cartão de Crédito** | Aluno / Personal | Checkout transparente | Pagamento de assinaturas | Art. 7º, V (Contrato) | **NÃO ARMAZENADO NO ATLASFIT** (Processado tokenizado no gateway) | Conforme gateway (PCI-DSS) | Asaas / AbacatePay |

---

## 4. Dados Técnicos, de Conexão e Auditoria

| Dado | Titular | Origem | Finalidade | Base Legal (LGPD) | Armazenamento | Retenção |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Endereço IP e Timestamp** | Qualquer usuário | Requisições HTTP | Cumprimento do Marco Civil da Internet (Art. 15 da Lei 12.965/2014) e segurança | Art. 7º, II (Obrigação Legal) | PostgreSQL (`AuditLog.ip`, `LegalAcceptance.ipAddress`) | Mínimo 6 meses (Marco Civil) |
| **Logs de Auditoria** | Usuários / Admins | Ações críticas (login, exclusão, impersonation) | Rastreabilidade de segurança e combate a fraudes | Art. 7º, IX (Legítimo Interesse) e Art. 7º, II | PostgreSQL (`AuditLog`) com redação automática de PII | 1 ano |
| **Histórico de Aceite Legal** | Usuários | Registro de Aceite de Termos | Evidência de contratação e ciência das políticas | Art. 7º, II e V (Defesa em Processo e Contrato) | PostgreSQL (`LegalAcceptance` com SHA-256) | Prazo prescricional civil (5 anos) |
