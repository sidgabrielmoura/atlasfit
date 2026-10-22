# Documentações Técnicas e Arquitetura — AtlasFit

Esta pasta centraliza os manuais, referências de arquitetura e documentações operacionais do ecossistema AtlasFit.

---

## Documentações Ativas do Sistema

| Documento | Descrição |
| :--- | :--- |
| **[Rotas de Cron (Cron Jobs)](file:///c:/Users/gabriel/development/atlasfit/docs/cron-jobs.md)** | Mapeamento completo de todos os cron jobs da aplicação: `/api/cron/*`, regras de autenticação com `CRON_SECRET`, parametrização por query params/headers e frequências recomendadas para agendadores externos. |
| **[Comunicação em Tempo Real (Ably)](file:///c:/Users/gabriel/development/atlasfit/docs/ably-realtime.md)** | Guia arquitetural da integração com o Ably: canais, catálogo de eventos, autenticação segura por token scoped, provedor React cliente, chat, presença e integração reativa com o Transactional Outbox. |
| **[Cálculo de Armazenamento (Storage Engine)](file:///c:/Users/gabriel/development/atlasfit/docs/storage-calculation.md)** | Guia completo de cálculo determinístico e consolidação multi-workspace de armazenamento (Cloudflare R2 + PostgreSQL), fórmulas, pesos por entidade e pontos de aplicação. |

---

## Regra de Atualização Contínua

Conforme estabelecido nas regras obrigatórias do projeto em [`.agents/rules/documentation.md`](file:///c:/Users/gabriel/development/atlasfit/.agents/rules/documentation.md):

- Qualquer alteração, inclusão ou remoção de rotas agendadas (`/api/cron/*`) **deve** atualizar imediatamente o documento [`docs/cron-jobs.md`](file:///c:/Users/gabriel/development/atlasfit/docs/cron-jobs.md).
- Qualquer alteração, inclusão ou remoção de canais, eventos, publishers ou listeners do Ably **deve** atualizar imediatamente o documento [`docs/ably-realtime.md`](file:///c:/Users/gabriel/development/atlasfit/docs/ably-realtime.md).
