# Documentação de Rotas de Cron — AtlasFit

Este documento reúne todas as rotas agendadas (Cron Jobs) do projeto AtlasFit, detalhando sua finalidade, funcionamento interno, regras de autenticação, métodos aceitos e recomendações de recorrência para agendadores externos.

---

## 1. Visão Geral e Arquitetura

Anteriormente, os cron jobs estavam registrados no arquivo `vercel.json`. Para permitir maior flexibilidade, controle de custos e desacoplamento de infraestrutura, os cron jobs foram migrados para um agendador externo (como [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), Upstash QStash, GitHub Actions ou crontab em servidor dedicado).

Todas as rotas de cron estão localizadas sob o caminho `/api/cron/*` (com exceção de rotas administrativas específicas).

---

## 2. Autenticação e Segurança (`CRON_SECRET`)

A segurança de todas as rotas de cron é centralizada na função `isCronAuthorized` em [`src/lib/cron-authorization.ts`](file:///c:/Users/gabriel/development/atlasfit/src/lib/cron-authorization.ts).

### Invariantes de Segurança
1. **Falha Fechada (Fail-Closed):** Se a variável de ambiente `CRON_SECRET` não estiver configurada no `.env` ou for vazia, a requisição é **rejeitada imediatamente com HTTP 401**.
2. **Comparação em Tempo Constante:** A validação utiliza `crypto.timingSafeEqual` do Node.js para mitigar ataques de temporização (*timing attacks*).
3. **Formas de Autenticação Suportadas:**
   - **Cabeçalho HTTP:** `Authorization: Bearer <CRON_SECRET>`
   - **Query Parameter (URL):** `?secret=<CRON_SECRET>`, `?key=<CRON_SECRET>` ou `?cron_secret=<CRON_SECRET>`
4. **Resposta em caso de Não Autorizado:** Retorna status `401 Unauthorized` com payload JSON padronizado:
   ```json
   {
     "error": {
       "code": "UNAUTHORIZED"
     }
   }
   ```

---

## 3. Catálogo de Rotas de Cron

### 3.1. Deliveries (Processamento de Entregas & Webhooks)
- **Caminho:** `/api/cron/deliveries`
- **Arquivo Fonte:** [`src/app/api/cron/deliveries/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/cron/deliveries/route.ts)
- **Método HTTP:** `GET`
- **Finalidade:**
  - **Drenagem da Fila de Entregas (`DeliveryOutbox`):** Processa itens de e-mail (Resend), notificações push (Firebase FCM), notificações in-app (Ably) e cobrança de taxas de ativação.
  - **Retentativa de Webhooks Recebidos:** Executa retentativas controladas com backoff exponencial para webhooks de pagamentos (Asaas) que falharam temporariamente.
  - **Retenção e Limpeza:** Executa a limpeza e minimização de cargas úteis de recibos antigos.
- **Relacionamento com o Disparo Reativo:** O AtlasFit agora conta com disparo reativo imediato via `triggerOutboxProcessing()`. Portanto, esta rota atua prioritariamente como **rede de segurança de retentativas e recuperação de falhas temporárias**.
- **Recorrência Recomendada:** A cada 1 hora (`0 * * * *`) ou a cada 30 minutos (`*/30 * * * *`).
- **Exemplo de URL:** `https://seu-dominio.com/api/cron/deliveries?secret=SEU_CRON_SECRET`

---

### 3.2. Gym Purge (Exclusão Definitiva de Academias Encerradas)
- **Caminho:** `/api/cron/gym-purge`
- **Arquivo Fonte:** [`src/app/api/cron/gym-purge/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/cron/gym-purge/route.ts)
- **Método HTTP:** `GET`
- **Finalidade:**
  - Aplica a política de privacidade e ciclo de vida: quando uma academia é encerrada, os dados permanecem retidos por **30 dias / 1 mês** para auditoria e eventuais exportações legais.
  - Após esse prazo (`purgeAfter <= now()`), este job exclui fisicamente os anexos e arquivos armazenados no bucket Cloudflare R2 e remove os registros operacionais do banco de dados PostgreSQL.
- **Recorrência Recomendada:** 1 vez ao dia de madrugada (`0 3 * * *`, às 03:00).
- **Exemplo de URL:** `https://seu-dominio.com/api/cron/gym-purge?secret=SEU_CRON_SECRET`

---

### 3.3. Gym Recurrence (Ciclo de Vida & Mensalidades de Academias)
- **Caminho:** `/api/cron/gym-recurrence`
- **Arquivo Fonte:** [`src/app/api/cron/gym-recurrence/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/cron/gym-recurrence/route.ts)
- **Método HTTP:** `GET`
- **Finalidade:**
  - **Fechamento e Pausas de Matrículas:** Pausa ou encerra matrículas locais cujos períodos de vigência ou pausa expiraram.
  - **Retentativas de Privacidade:** Processa retentativas de exclusão solicitadas por alunos via LGPD.
  - **Transição de Maioridade:** Identifica alunos menores de idade que completaram 18 anos, transferindo a titularidade contratual do responsável para o próprio aluno.
  - **Cobranças Manuais de Academias:** Processa mensalidades manuais de academias que atingiram a data de vencimento.
- **Recorrência Recomendada:** 1 vez ao dia de madrugada (`0 1 * * *`, às 01:00).
- **Exemplo de URL:** `https://seu-dominio.com/api/cron/gym-recurrence?secret=SEU_CRON_SECRET`

---

### 3.4. Engage Push (Disparo Automatizado de Engajamento para Alunos)
- **Caminho:** `/api/cron/engage-push`
- **Arquivo Fonte:** [`src/app/api/cron/engage-push/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/cron/engage-push/route.ts)
- **Método HTTP:** `GET` (o endpoint também possui `POST` protegido por sessão para disparos manuais de superadministradores).
- **Finalidade:**
  - Analisa regras de engajamento configuradas no estúdio de push notifications do superadmin:
    - **Inatividade:** Dispara notificações para alunos que não treinam há X dias.
    - **Streak Saver (Salvador de Sequência):** Notifica alunos entre as 17h e 21h (horário de Brasília) que ainda não treinaram no dia e correm risco de perder a sequência de treinos.
    - **Motivação Matinal:** Disparos matinais programados.
  - Respeita o limite de fadiga (máximo de 1 push por dia por aluno) e horários de descanso (quiet hours).
- **Recorrência Recomendada:** 2 vezes ao dia (`0 8,18 * * *`, às 08:00 e às 18:00).
- **Exemplo de URL:** `https://seu-dominio.com/api/cron/engage-push?secret=SEU_CRON_SECRET`

---

### 3.5. Process Recurrence (Cobranças Recorrentes Personal, Suspensões Manuais & Retenção)
- **Caminho:** `/api/cron/process-recurrence`
- **Arquivo Fonte:** [`src/app/api/cron/process-recurrence/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/cron/process-recurrence/route.ts)
- **Método HTTP:** `GET`
- **Finalidade:**
  - Processa a geração de mensalidades recorrentes para alunos do módulo **Personal Trainer** (planos mensais, trimestrais, semestrais ou personalizados).
  - Gera obrigações financeiras pendentes (`WorkspacePayment`) e agenda as notificações de cobrança para o aluno e o personal.
  - **Suspensão Automática de Lançamentos Manuais (Personal & Academia):** Avalia assinaturas da plataforma AtlasFit configuradas manualmente via SuperAdmin (`billingControlType: "MANUAL"` e `autoSuspendEnabled: true`). Se o pagamento estiver atrasado e ultrapassar os **dias de tolerância** configurados (`now > nextDueDate + toleranceDays`), o workspace correspondente é suspenso automaticamente (`isActive: false`), gerando log de auditoria e emitindo o evento Ably `workspace:suspended` para desconectar sessões ativas em tempo real.
  - Executa a política de retenção de payloads de migrações externas antigas.
- **Recorrência Recomendada:** 1 vez ao dia de madrugada (`0 2 * * *`, às 02:00).
- **Exemplo de URL:** `https://seu-dominio.com/api/cron/process-recurrence?secret=SEU_CRON_SECRET`

---

### 3.6. Rota Auxiliar Administrativa: Expirar Matrículas
- **Caminho:** `/api/gym/enrollments/cron-expire`
- **Arquivo Fonte:** [`src/app/api/gym/enrollments/cron-expire/route.ts`](file:///c:/Users/gabriel/development/atlasfit/src/app/api/gym/enrollments/cron-expire/route.ts)
- **Método HTTP:** `POST`
- **Finalidade:** Endpoint operacional para acionamento forçado do ciclo de expiração de matrículas de uma academia específica (recebendo `{ "workspaceId": "..." }`) ou global via `CRON_SECRET`.

---

## 4. Tabela Resumo para Agendadores

| Nome do Job | Rota Completa | Método | Expressão Cron | Frequência |
| :--- | :--- | :---: | :---: | :--- |
| **Deliveries** | `/api/cron/deliveries?secret=<CRON_SECRET>` | `GET` | `0 * * * *` | A cada 1 hora |
| **Gym Purge** | `/api/cron/gym-purge?secret=<CRON_SECRET>` | `GET` | `0 3 * * *` | Diariamente às 03:00 |
| **Gym Recurrence** | `/api/cron/gym-recurrence?secret=<CRON_SECRET>` | `GET` | `0 1 * * *` | Diariamente às 01:00 |
| **Engage Push** | `/api/cron/engage-push?secret=<CRON_SECRET>` | `GET` | `0 8,18 * * *` | Diariamente às 08:00 e 18:00 |
| **Process Recurrence** | `/api/cron/process-recurrence?secret=<CRON_SECRET>` | `GET` | `0 2 * * *` | Diariamente às 02:00 |

---

## 5. Manutenção e Boas Práticas

> [!IMPORTANT]
> Sempre que qualquer alteração de código envolver a criação, modificação de lógica, alteração de parâmetros ou exclusão de rotas de cron, este documento DEVE ser obrigatoriamente atualizado em conformidade com as regras do projeto em [`.agents/rules/documentation.md`](file:///c:/Users/gabriel/development/atlasfit/.agents/rules/documentation.md).
