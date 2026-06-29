# Planejamento do Sistema de Notificações da AtlasFit

Este documento contém o planejamento de arquitetura e casos de uso do futuro sistema de notificações da AtlasFit, a ser integrado nos próximos ciclos de desenvolvimento.

---

## Casos de Uso Comerciais e de CRM

1. **Lead Parado sem Movimentação**
   - **Gatilho**: O lead permanece na mesma etapa do pipeline por mais de 5 dias úteis sem interações salvas no histórico.
   - **Destinatário**: Personal Trainer (dono do lead).
   - **Canais**: Notificação In-App (Sininho) e Alerta via WhatsApp/Email.

2. **Tarefa Comercial Vencida**
   - **Gatilho**: Uma tarefa vinculada a um lead atinge a data de prazo e não é marcada como concluída.
   - **Destinatário**: Personal Trainer.
   - **Canais**: Push Notification e In-App.

3. **Novo Lead Captado**
   - **Gatilho**: Um visitante preenche o formulário público ou inicia contato comercial por um canal integrado.
   - **Destinatário**: Personal Trainer.
   - **Canais**: Push Notification, In-App e Email.

4. **Compromisso na Agenda Hoje**
   - **Gatilho**: Agenda do dia contém uma tarefa do tipo "CRM" ou "Avaliação". Disparado às 08:00 do dia do compromisso.
   - **Destinatário**: Personal Trainer.
   - **Canais**: Email diário de resumo e In-App.

5. **Convite de Onboarding Enviado/Aceito**
   - **Gatilho**: O link de ativação foi gerado para o aluno, ou o aluno concluiu o onboarding com sucesso.
   - **Destinatário**: Personal Trainer.
   - **Canais**: In-App.

---

## Arquitetura Proposta

### 1. Modelo de Banco de Dados (Prisma)

```prisma
model Notification {
  id          String   @id @default(cuid())
  userId      String
  title       String
  message     String
  type        String   // "INFO", "WARNING", "DANGER", "SUCCESS"
  category    String   // "CRM", "WORKOUT", "BILLING", "ONBOARDING"
  read        Boolean  @default(false)
  link        String?  // Rota interna para redirecionar ao clicar
  createdAt   DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

### 2. Fluxo em Tempo Real (WebSockets / Server-Sent Events)
- Criar um endpoint `/api/notifications/subscribe` usando Next.js Route Handlers baseados em SSE (Server-Sent Events) para transmitir novas notificações instantaneamente sem necessidade de polling.
- Integrar um hook `useNotifications` no frontend para sincronizar o contador de não lidas e exibir Toasts flutuantes (usando Sonner).

### 3. Integração com WhatsApp/Email
- Disparar mensagens transacionais via API (como Twilio ou Z-API para WhatsApp, e Resend ou SendGrid para e-mails) encapsuladas em workers em background (ex: utilizando Trigger.dev ou BullMQ).
