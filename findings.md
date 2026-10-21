# Findings: Análise SuperAdmin vs Área de Academias (AtlasFit)

## 1. Mapeamento Completo das Seções do SuperAdmin

Atualmente, o SuperAdmin do AtlasFit possui 18 rotas principais agrupadas no `SuperAdminSidebar`:

| Grupo na Sidebar | Rota | Finalidade / Escopo |
|---|---|---|
| **Painel de Controle** | `/superadmin/dashboard` | Dashboard executivo com MRR, novas assinaturas, churn e monitoramento de saúde. |
| **Gestão de Usuários e Contas** | `/superadmin/users` | Gestão de usuários globais, papéis (`SUPERADMIN`, `TRAINER`, `STUDENT`, `USER`), status 2FA/3FA, impersonate e auditoria. |
| | `/superadmin/workspaces` | Listagem geral de Workspaces com filtro por tipo (`PERSONAL` vs `GYM`), status ativo/suspenso. |
| | `/superadmin/workspaces/[id]` | Deep view do workspace. Para tipo `GYM`, possui a aba "Academia & Unidades" com limites de licença e unidades filiais. |
| **Operações Financeiras e BaaS** | `/superadmin/finance` | Visão financeira global da plataforma, volume transacionado e taxas. |
| | `/superadmin/finance/payouts` | Gestão e aprovação de solicitações de saque de personais/parceiros. |
| | `/superadmin/asaas` | Telemetria e métricas do Asaas (BaaS, contas digitais, webhooks). |
| | `/superadmin/abacatepay` | Métricas de pagamentos Pix via gateway AbacatePay. |
| **Recursos da Plataforma** | `/superadmin/roadmap` | Gestão do roadmap público/interno e votação de features. |
| | `/superadmin/ai` | Gestão de agentes de IA (Gemini), créditos e consumo de tokens. |
| | `/superadmin/credits` | Pacotes e créditos de importação assistida de planilhas. |
| | `/superadmin/storage` | Armazenamento Cloud em S3 por tenant/usuário. |
| | `/superadmin/exercises` | Biblioteca global de exercícios, mídias e grupos musculares. |
| | `/superadmin/files` | Arquivos e documentos mestres do sistema. |
| | `/superadmin/subscriptions` | Planos SaaS da plataforma AtlasFit (preços, ciclos de cobrança). |
| | `/superadmin/engage` | Campanhas de push notifications e engajamento. |
| **Auditoria e Definições** | `/superadmin/logs` | Logs de auditoria imutáveis com ator, severidade, IP e correlação. |
| | `/superadmin/settings` | Configurações gerais da infraestrutura: Geral & Branding, Segurança (3FA/TOTP), Manutenção, Integrações de Sistema. |

### Lacuna Identificada no SuperAdmin:
Não existe hoje uma central dedicada para **Configurações de Academias**. As configurações de academias estão fragmentadas apenas dentro da página individual de cada workspace (`/superadmin/workspaces/[id]`), sem parametrização de políticas corporativas padrão, sem um catálogo de hardware/catracas homologadas, e principalmente **sem uma central de permissões/feature flags que controle o ciclo de vida dos módulos de academia (especialmente catracas)**.

---

## 2. Mapeamento Completo da Área Destinada a Academias (`(gym)/gym`)

A área de academias possui 14 rotas no layout `GymLayout`:

| Rota Gym | Nome / Propósito | Dependência de Hardware / Catraca Identificada |
|---|---|---|
| `/gym/dashboard` | Visão Geral da Academia | **ALTA**: Mostra "Últimos acessos" (com link para `/gym/access`), alerta de "X dispositivos offline" no card "Precisa de atenção", e métricas de passagens físicas. |
| `/gym/reception` | Recepção & Balcão | **CRÍTICA**: Possui aba inteira "Catracas & Telemetria", card "Catracas online", botão "Liberar giro avulso", comando de "Contingência / Liberação de Emergência", busca "Buscar aluno ou catraca...", histórico de passagens físicas. |
| `/gym/access` | Catracas & Acesso | **100% EXCLUSIVA**: Monitoramento de telemetria Control iD, heartbeat, logs de giros, comandos remotos (UNLOCK, PUSH, CLEAR). Deve ser completamente ocultada e bloqueada quando a feature estiver desativada. |
| `/gym/students` | Gestão de Alunos | **MÉDIA**: Detalhes do aluno citam "acesso à catraca", bloqueio presencial de menores e biometria. |
| `/gym/enrollments` | Matrículas & Contratos | **MÉDIA**: Modais de matrícula citam "Liberar Catraca", "Manter acesso à catraca", "Bloquear catraca imediatamente". |
| `/gym/plans` | Catálogo de Planos | **BAIXA**: Planos com regras de acesso horário/unidade. |
| `/gym/staff` | Gestão de Equipe | **BAIXA**: Descrição do cargo de Recepcionista cita "Operação e catracas". |
| `/gym/finance` | Financeiro & Métricas | **BAIXA**: DRE e caixa diário; aba de métricas possui menção a passagens físicas. |
| `/gym/analytics` | Inteligência e Relatórios | **MÉDIA**: Aba "Catracas & Telemetria" com análise de motivos de bloqueio na catraca e logs de passagem. |
| `/gym/import` | Importação Assistida | **BAIXA**: Importador possui campo para "Credenciais de catraca / tag RFID". |
| `/gym/settings` | Configurações Locais | **BAIXA**: LGPD, governança, unidades físicas. |
| `/gym/classes` | Aulas Coletivas | **NENHUMA**: Grade de horários e reservas. |
| `/gym/crm` | CRM & Leads | **NENHUMA**: Funil de vendas. |
| `/gym/workouts` | Treinos | **NENHUMA**: Prescrição de treinos. |

---

## 3. Elementos de UI que OBRIGATORIAMENTE Devem Ser Ocultados/Adaptados ao Desativar Catracas

1. **Sidebar Gym (`gym-sidebar.tsx`)**: Ocultar item `Catracas & Acesso` (`/gym/access`).
2. **Mobile Navbar (`gym-mobile-navbar.tsx`)**: Ocultar botão `Catracas`.
3. **Página `/gym/access`**: Guard no servidor bloqueando acesso com redirecionamento limpo para `/gym/dashboard`.
4. **Recepção (`reception-client.tsx` & `page.tsx`)**:
   - Ocultar aba `Catracas & Telemetria de Hardware`.
   - Ocultar card de métrica `Catracas online`.
   - Ocultar botão `Liberar giro avulso` e `Liberação de Emergência`.
   - Ajustar textos: De "liberação física de catracas" para "Check-in e atendimento no balcão".
   - Ajustar placeholder de busca de "Buscar aluno ou catraca..." para "Buscar aluno por nome ou CPF...".
   - Modais de diagnóstico suprimem termos de giro de catraca.
5. **Dashboard (`dashboard-client.tsx` & `page.tsx`)**:
   - Ocultar alerta de `dispositivos offline` do card de atenção.
   - Na seção "Últimos acessos", remover o link `Ver catracas (/gym/access)` e a coluna de nome do dispositivo, apresentando apenas histórico de presenças manuais/balcão se houver.
6. **Analytics (`analytics-client.tsx`)**: Ocultar aba `Catracas & Telemetria`.
7. **Matrículas (`enrollments-client.tsx`)**: Ajustar cópias ("Ativar Matrícula" em vez de "Ativar Matrícula & Liberar Catraca").
8. **APIs**: Rotas `/api/gym/devices/*`, `/api/gym/access/*` e comandos remotos rejeitam requisições com `403 Forbidden` (`FEATURE_DISABLED`).

---

## 4. Padrão Visual do SuperAdmin a ser Seguido com Fidelidade 1:1

- **Cabeçalho de Página**:
  - `h1`: `text-2xl sm:text-3xl font-black tracking-tight`
  - Descrição: `text-muted-foreground text-xs sm:text-sm font-medium`
  - Badge de status de emergência / manutenção se aplicável.
- **Seções `SettingsSection`**:
  - Ícone temático dentro de `p-2 rounded-xl bg-primary/10 text-primary border border-primary/20`.
  - Título `text-xl font-bold tracking-tight` com subtítulo `text-[10px] text-muted-foreground font-black uppercase tracking-wider`.
  - Container `Card className="border-border/40 bg-card/50 p-0 shadow-sm overflow-hidden"`.
  - `CardContent className="p-6 md:p-8"`.
- **Componentes de Formulário**:
  - Labels em uppercase com tracking largo: `text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1`.
  - Inputs com altura fixa e bordas suaves: `h-11 rounded-xl border-border/60 bg-background`.
  - Switches em cards destacados: `p-4 sm:p-5 rounded-xl border border-border/40 bg-secondary/10 flex items-center justify-between`.
  - Botões de Ação: `h-11 rounded-xl px-8 font-black uppercase tracking-widest text-xs bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50`.
- **Diálogos de Confirmação (`AlertDialog`)**:
  - Destrutivos / Críticos com `variant="destructive"` e foco inicial no cancelar.
