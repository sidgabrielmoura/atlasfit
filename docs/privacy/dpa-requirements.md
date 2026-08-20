# ATLASFIT — REQUISITOS DE DPA E MATRIZ DE PAPÉIS LGPD

Este documento detalha os papéis de tratamento e os acordos de processamento de dados (DPA) aplicáveis às relações entre AtlasFit, Personal Trainers, Alunos e Fornecedores.

---

## 1. Matriz de Controladoria e Operação (LGPD Art. 5º, VI e VII)

| Operação / Fluxo | AtlasFit | Personal Trainer | Aluno | Justificativa Jurídica / Técnica |
| :--- | :--- | :--- | :--- | :--- |
| **Cadastro e Assinatura do Personal no SaaS** | **Controlador** | Titular | N/A | O AtlasFit define a finalidade, meios e preços do software contratado pelo Personal. |
| **Prescrição de Treinos, Anamnese e Avaliações de Alunos** | **Operador** | **Controlador** | Titular | O Personal Trainer define o plano de treino, coleta a anamnese e prescreve exercícios; o AtlasFit fornece a infraestrutura de processamento e armazenamento. *(Validação Jurídica Recomendada)* |
| **Intermediação de Pagamentos via Atlas Pay** | **Co-Controlador / Operador** | **Controlador** | Titular | O Personal define valores de planos; o AtlasFit e o Asaas executam a intermediação financeira e cumprem exigências regulatórias do BACEN. |
| **Armazenamento de Fotos de Evolução e Vídeos** | **Operador** | **Controlador** | Titular | Os arquivos são enviados para cumprimento do contrato entre Aluno e Personal Trainer, armazenados de forma criptografada no Cloudflare R2. |

---

## 2. Requisitos para Cláusulas de Tratamento de Dados (DPA no Contrato com Personal)

Ao assinar os Termos de Uso, o Personal Trainer reconhece e concorda que:
1. É o Controlador dos dados de seus alunos e possui base legal legítima para o cadastramento destes no sistema.
2. Instruirá seus alunos sobre o tratamento de dados pessoais de saúde e uso da plataforma.
3. O AtlasFit tratará os dados dos alunos estritamente conforme as instruções do Personal e para a finalidade de execução do SaaS.
4. O AtlasFit adota medidas técnicas de segurança da informação (criptografia, isolamento multi-tenant, expurgo de mídias).
