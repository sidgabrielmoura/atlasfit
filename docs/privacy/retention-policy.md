# ATLASFIT — POLÍTICA DE RETENÇÃO E ELIMINAÇÃO DE DADOS

Este documento estabelece as diretrizes técnicas e os prazos de retenção de dados pessoais aplicados pela plataforma AtlasFit, harmonizando os direitos de eliminação do titular (Art. 18, VI, LGPD) com os deveres de conservação para cumprimento de obrigação legal e exercício regular de direitos (Art. 16, I e II, LGPD).

---

## 1. Prazos de Retenção por Categoria de Dado

| Categoria de Dado | Prazo de Retenção Ativa | Prazo de Retenção Pós-Cancelamento | Fundamento Legal da Conservação |
| :--- | :--- | :--- | :--- |
| **Registros de Conexão e IP** | Em tempo real | **6 meses** a contar da data de cada conexão | Art. 15 da Lei nº 12.965/2014 (Marco Civil da Internet) |
| **Dados Fiscais e Transações Financeiras** | Durante o contrato | **5 anos** a contar do término do exercício fiscal | Art. 173 e 174 do Código Tributário Nacional (CTN) e Código Civil (Art. 206, § 5º, I) |
| **Registros e Histórico de Aceite Legal** | Durante a conta ativa | **5 anos** após o encerramento da conta | Art. 206, § 5º do Código Civil (Prazo prescricional para comprovação de consentimento e termos contratuais) |
| **Logs de Auditoria de Segurança** | Durante a conta ativa | **1 ano** | Cumprimento de boas práticas de segurança da informação e rastreabilidade |
| **Fotos de Evolução e Vídeos no R2** | Durante a conta ativa | **Eliminação imediata (expurgo físico)** mediante solicitação de exclusão aprovada | Art. 18, VI da LGPD (Direito à Eliminação) |
| **Fichas de Treino e Anamnese** | Durante o vínculo | **Eliminação ou Pseudonimização** ao excluir a conta | Art. 16 da LGPD |

---

## 2. Fluxo Técnico de Expurgo (`ErasureService`)

Quando uma solicitação de exclusão definitiva é processada:

1. **Varredura de Mídias:** O serviço localiza todas as chaves de objetos associadas ao usuário no Cloudflare R2 (`StudentFile`, `StudentProgressPhoto`, `TrainerVideo`, `LeadFile`).
2. **Expurgo no Storage:** Executa chamada `deleteObject` na API S3 do Cloudflare R2 para cada arquivo físico.
3. **Inativação Financeira:** Marca e encerra subcontas de pagamento locais no status `CLOSED`.
4. **Exclusão no Banco Relacional:** Executa transação de remoção em cascata dos registros no PostgreSQL.
5. **Auditoria de Expurgo:** Registra evento `COMPLETE_DATA_ERASURE` com ID pseudonimizado no log de auditoria imutável.
