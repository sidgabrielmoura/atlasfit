# Task Plan: Configurações de Academias no SuperAdmin & Permissões de Acesso (Feature Flags)

## Visão Geral do Projeto
Implementar a central completa de Configurações de Academias no SuperAdmin do AtlasFit seguindo rigorosamente o design system e padrões de layout do SuperAdmin (`SettingsSection`, Cards, Inputs padronizados, Skeletons e Confirmações). Paralelamente, implementar o mecanismo robusto de permissões e controle de acesso a módulos (com foco imediato no Kill Switch de Catracas & Hardware), garantindo ocultação total (zero footprint) de páginas, menus, botões, gráficos e menções nas áreas da academia enquanto a integração estiver em desenvolvimento.

---

## Fases do Plano

### Fase 1: Análise e Especificação Arquitetural (Concluída)
- [x] Mapear todas as 18 rotas do SuperAdmin e identificar lacunas de parametrização de academias.
- [x] Mapear todas as 14 rotas da área de academias (`(gym)`) e listar acoplamentos com catracas/hardware.
- [x] Documentar o design system do SuperAdmin e regras globais de segurança/escalabilidade.
- [x] Salvar descobertas no `findings.md`.

### Fase 2: Modelagem de Dados & Serviço de Feature Flags (Concluída)
- [x] Definir chaves de `SystemSetting` para controle global de módulos de academias:
  - `gym_module_turnstiles_enabled` (Kill switch mestre de catracas)
  - `gym_module_biometrics_enabled` (Biometria facial/digital)
  - `gym_module_classes_enabled` (Aulas coletivas)
  - `gym_module_crm_enabled` (CRM e prospecção)
  - `gym_default_billing_grace_days` (Tolerância de inadimplência padrão)
  - `gym_default_minor_self_checkin` (Check-in de menores padrão)
  - `gym_default_require_guardian_signature` (Assinatura de responsável)
  - `gym_default_biometric_mode` (Modo biométrico padrão)
  - `gym_default_max_receptionist_discount` (Teto de desconto no balcão)
  - `gym_hardware_driver_primary` (Fabricante principal: Control iD, etc.)
  - `gym_hardware_heartbeat_interval_sec` (Frequência de telemetria)
- [x] Atualizar `EntitlementsService.resolveEntitlements()` para verificar as flags globais do SuperAdmin e expor `features.turnstilesEnabled`.
- [x] Criar API Route `/api/superadmin/gym-settings` para leitura e atualização atômica das configurações de academias, com validação de payload e log de auditoria `AuditLog`.

### Fase 3: Nova Página de Configurações de Academias no SuperAdmin (Concluída)
- [x] Adicionar item de navegação no `SuperAdminSidebar` ("Configurações de Academias" / `/superadmin/gym-settings`).
- [x] Criar a página `/superadmin/gym-settings/page.tsx` seguindo fielmente o layout de `/superadmin/settings/page.tsx`:
  - Seção 1: Módulos & Permissões de Acesso (Feature Flags com Kill Switch de Catracas, alerta visual e confirmação via `AlertDialog`).
  - Seção 2: Parâmetros Operacionais Padrão (Tolerância de inadimplência, regras de menores, teto de descontos de recepção).
  - Seção 3: Limites & Licenciamento Padrão (Alunos, equipe, unidades filiais, armazenamento).
  - Seção 4: Hardware & Gateway de Comunicação de Catracas (Fabricantes homologados, modo de contingência).
  - Seção 5: Segurança & Conformidade LGPD (2FA obrigatório para equipe, expurgo automático de hardware).
- [x] Implementar carregamento com `Skeleton` e feedback de salvamento com `toast` (Sonner), prevenindo double submit.

### Fase 4: Ocultação Total & Proteção da Área de Catracas no Tenant Gym (Concluída)
- [x] **Gym Layout & Sidebar (`gym-sidebar.tsx`)**: Ocultar item "Catracas & Acesso" (`/gym/access`) quando `turnstilesEnabled === false`.
- [x] **Mobile Navbar (`gym-mobile-navbar.tsx`)**: Ocultar o atalho "Catracas" quando inativo.
- [x] **Página `/gym/access`**: Guard no servidor redirecionando para `/gym/dashboard` caso a funcionalidade esteja desativada.
- [x] **Recepção (`/gym/reception`)**:
  - Ocultar a aba "Catracas & Telemetria" e "Reconciliação".
  - Ocultar card de métricas "Catracas online" (substituído por atendimento regular).
  - Ocultar botões "Liberar giro", "Contingência" e cadastros biométricos.
  - Adaptar títulos, descrições, placeholders e histórico no modal de diagnóstico removendo menções a catraca.
- [x] **Dashboard (`/gym/dashboard`)**:
  - Ocultar alerta de dispositivos offline no card "Precisa de atenção".
  - Ocultar link para `/gym/access` e neutralizar menções a catracas nos acessos recentes (apontando para `/gym/reception`).
- [x] **Analytics (`/gym/analytics`)**: Ocultar a aba "Catracas & Telemetria" e adaptar o texto de exportação de dados.
- [x] **Matrículas & Alunos (`/gym/enrollments`, `/gym/students`)**: Adaptar cópias e modais de liberação de catraca para acesso geral à academia.
- [x] **Importação & Configurações (`/gym/import`, `/gym/settings`)**: Neutralizar termos e referências a catracas físicas.

### Fase 5: Testes, Validação e Garantia de Qualidade (Concluída)
- [x] Testes unitários do Kill Switch criados em `src/modules/workspaces/__tests__/gym-turnstiles-killswitch.test.ts`.
- [x] 5/5 testes aprovados com 100% de sucesso (vitest run).
- [x] Verificação de isolamento multi-tenant, sanitização de inputs e registro de logs de auditoria no Prisma.
