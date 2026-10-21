# Central de Configurações de Academias no SuperAdmin & Permissões de Acesso (Feature Flags) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Criar uma central completa de configurações para academias dentro do SuperAdmin com rigorosa fidelidade estética ao layout existente, acompanhada por um motor de permissões de acesso (feature flags) capaz de ocultar integralmente (zero footprint) todas as telas, menus, atalhos, métricas e menções a catracas e hardware de acesso na área de academias enquanto a integração estiver pendente.

**Architecture:** A solução utiliza um modelo hierárquico baseado em `SystemSetting` e `GymSettings`, com resolução centralizada no `EntitlementsService`. As configurações globais são auditadas imutavelmente no `AuditLog` e propagadas via context/props do Next.js Server Components para os Client Components do tenant `(gym)`. Quando a feature de catracas estiver desligada, componentes condicionais suprimem rotas, abas, links e textos sensíveis com fallback elegante e segurança em camada de API.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Prisma ORM, PostgreSQL, TailwindCSS, shadcn/ui, Valtio, Lucide Icons, Sonner (Toasts), Framer Motion.

---

## Mapeamento de Arquivos

### Arquivos a Criar:
- `src/app/(superadmin)/superadmin/gym-settings/page.tsx` (Página principal de configurações de academias do SuperAdmin)
- `src/app/api/superadmin/gym-settings/route.ts` (API route com GET/PATCH para parametrização global de academias)
- `src/modules/workspaces/application/gym-feature-flags-service.ts` (Serviço de resolução e auditoria de feature flags de academias)
- `src/modules/workspaces/__tests__/gym-turnstiles-killswitch.test.ts` (Testes automatizados da ocultação e bloqueio de catracas)

### Arquivos a Modificar:
- `src/components/application/superadmin-sidebar.tsx` (Adição do item "Configurações de Academias" no menu)
- `src/modules/workspaces/application/entitlements-service.ts` (Integração da flag `turnstilesEnabled` com a configuração do SuperAdmin)
- `src/app/(gym)/layout.tsx` (Resolução no servidor das features ativas da academia)
- `src/components/application/gym-sidebar.tsx` (Condicionamento do item "Catracas & Acesso" à flag ativa)
- `src/components/application/gym-mobile-navbar.tsx` (Condicionamento do botão "Catracas" à flag ativa)
- `src/app/(gym)/gym/access/page.tsx` (Bloqueio e redirecionamento caso o módulo esteja inativo)
- `src/app/(gym)/gym/reception/page.tsx` & `reception-client.tsx` (Ocultação da aba de hardware, remoção de card e botões de catraca, adaptação de copy)
- `src/app/(gym)/gym/dashboard/page.tsx` & `dashboard-client.tsx` (Ocultação de alertas de dispositivos offline, remoção de links e ajuste de histórico de passagens)
- `src/app/(gym)/gym/analytics/analytics-client.tsx` (Ocultação da aba de telemetria de catracas)
- `src/app/(gym)/gym/enrollments/enrollments-client.tsx` (Ajuste de textos em modais de matrícula)

---

## Tarefas de Implementação

### Task 1: Serviço de Feature Flags & Resolução Centralizada no EntitlementsService

**Files:**
- Create: `src/modules/workspaces/application/gym-feature-flags-service.ts`
- Modify: `src/modules/workspaces/application/entitlements-service.ts`
- Modify: `src/modules/workspaces/index.ts`
- Test: `src/modules/workspaces/__tests__/gym-turnstiles-killswitch.test.ts`

**Step 1: Escrever teste de unidade verificando a resolução da feature flag de catracas**

```typescript
// src/modules/workspaces/__tests__/gym-turnstiles-killswitch.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GymFeatureFlagsService } from "../application/gym-feature-flags-service";
import prisma from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  default: {
    systemSetting: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    gymSettings: {
      findUnique: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  },
}));

describe("GymFeatureFlagsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar turnstilesEnabled = false quando a flag global estiver desligada no SuperAdmin", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      key: "gym_module_turnstiles_enabled",
      value: "false",
    });

    const isEnabled = await GymFeatureFlagsService.isTurnstilesEnabled("ws-gym-1");
    expect(isEnabled).toBe(false);
  });

  it("deve retornar turnstilesEnabled = true quando a flag global estiver ligada e workspace ativo", async () => {
    (prisma.systemSetting.findUnique as any).mockResolvedValue({
      key: "gym_module_turnstiles_enabled",
      value: "true",
    });

    const isEnabled = await GymFeatureFlagsService.isTurnstilesEnabled("ws-gym-1");
    expect(isEnabled).toBe(true);
  });
});
```

**Step 2: Executar teste para verificar falha (RED)**

Run: `npx vitest run src/modules/workspaces/__tests__/gym-turnstiles-killswitch.test.ts`
Expected: FAIL ("GymFeatureFlagsService not defined")

**Step 3: Implementar `GymFeatureFlagsService`**

```typescript
// src/modules/workspaces/application/gym-feature-flags-service.ts
import prisma from "@/lib/prisma";

export interface GymGlobalConfigs {
  // Módulos & Feature Flags
  turnstilesEnabled: boolean;
  biometricsEnabled: boolean;
  classesEnabled: boolean;
  crmEnabled: boolean;
  assistedImportEnabled: boolean;
  
  // Políticas Padrão
  defaultBillingGraceDays: number;
  defaultAllowMinorSelfCheckin: boolean;
  defaultRequireGuardianSignature: boolean;
  defaultBiometricMode: string;
  defaultMaxReceptionistDiscountPercent: number;
  defaultMaxReceptionistDiscountCents: number;

  // Limites Padrão de Licenciamento
  defaultMaxStudents: number;
  defaultMaxStaff: number;
  defaultMaxUnits: number;
  defaultMaxDevices: number;
  defaultStorageLimitMb: number;

  // Hardware & Gateway
  primaryHardwareDriver: string;
  heartbeatIntervalSec: number;
  allowEmergencyContingency: boolean;
}

export const GYM_CONFIG_KEYS = {
  TURNSTILES_ENABLED: "gym_module_turnstiles_enabled",
  BIOMETRICS_ENABLED: "gym_module_biometrics_enabled",
  CLASSES_ENABLED: "gym_module_classes_enabled",
  CRM_ENABLED: "gym_module_crm_enabled",
  ASSISTED_IMPORT_ENABLED: "gym_module_assisted_import_enabled",
  BILLING_GRACE_DAYS: "gym_default_billing_grace_days",
  MINOR_SELF_CHECKIN: "gym_default_minor_self_checkin",
  GUARDIAN_SIGNATURE: "gym_default_require_guardian_signature",
  BIOMETRIC_MODE: "gym_default_biometric_mode",
  MAX_RECEPTIONIST_DISCOUNT_PERCENT: "gym_default_max_receptionist_discount_percent",
  MAX_RECEPTIONIST_DISCOUNT_CENTS: "gym_default_max_receptionist_discount_cents",
  DEFAULT_MAX_STUDENTS: "gym_default_max_students",
  DEFAULT_MAX_STAFF: "gym_default_max_staff",
  DEFAULT_MAX_UNITS: "gym_default_max_units",
  DEFAULT_MAX_DEVICES: "gym_default_max_devices",
  DEFAULT_STORAGE_MB: "gym_default_storage_mb",
  HARDWARE_DRIVER: "gym_hardware_driver_primary",
  HEARTBEAT_INTERVAL: "gym_hardware_heartbeat_interval_sec",
  EMERGENCY_CONTINGENCY: "gym_hardware_emergency_contingency",
} as const;

export class GymFeatureFlagsService {
  /**
   * Verifica se o módulo de catracas está habilitado globalmente.
   */
  static async isTurnstilesEnabled(workspaceId?: string): Promise<boolean> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: GYM_CONFIG_KEYS.TURNSTILES_ENABLED },
      });
      // Padrão seguro: se não configurado ou "false", o módulo permanece DESATIVADO
      if (!setting || setting.value !== "true") {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém todas as configurações de academias consolidadas.
   */
  static async getGymGlobalConfigs(): Promise<GymGlobalConfigs> {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: { startsWith: "gym_" },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    return {
      turnstilesEnabled: map.get(GYM_CONFIG_KEYS.TURNSTILES_ENABLED) === "true",
      biometricsEnabled: map.get(GYM_CONFIG_KEYS.BIOMETRICS_ENABLED) !== "false",
      classesEnabled: map.get(GYM_CONFIG_KEYS.CLASSES_ENABLED) !== "false",
      crmEnabled: map.get(GYM_CONFIG_KEYS.CRM_ENABLED) !== "false",
      assistedImportEnabled: map.get(GYM_CONFIG_KEYS.ASSISTED_IMPORT_ENABLED) !== "false",
      defaultBillingGraceDays: Number(map.get(GYM_CONFIG_KEYS.BILLING_GRACE_DAYS) || 5),
      defaultAllowMinorSelfCheckin: map.get(GYM_CONFIG_KEYS.MINOR_SELF_CHECKIN) === "true",
      defaultRequireGuardianSignature: map.get(GYM_CONFIG_KEYS.GUARDIAN_SIGNATURE) !== "false",
      defaultBiometricMode: map.get(GYM_CONFIG_KEYS.BIOMETRIC_MODE) || "HYBRID",
      defaultMaxReceptionistDiscountPercent: Number(map.get(GYM_CONFIG_KEYS.MAX_RECEPTIONIST_DISCOUNT_PERCENT) || 10),
      defaultMaxReceptionistDiscountCents: Number(map.get(GYM_CONFIG_KEYS.MAX_RECEPTIONIST_DISCOUNT_CENTS) || 2000),
      defaultMaxStudents: Number(map.get(GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS) || 500),
      defaultMaxStaff: Number(map.get(GYM_CONFIG_KEYS.DEFAULT_MAX_STAFF) || 30),
      defaultMaxUnits: Number(map.get(GYM_CONFIG_KEYS.DEFAULT_MAX_UNITS) || 3),
      defaultMaxDevices: Number(map.get(GYM_CONFIG_KEYS.DEFAULT_MAX_DEVICES) || 10),
      defaultStorageLimitMb: Number(map.get(GYM_CONFIG_KEYS.DEFAULT_STORAGE_MB) || 5120),
      primaryHardwareDriver: map.get(GYM_CONFIG_KEYS.HARDWARE_DRIVER) || "CONTROL_ID",
      heartbeatIntervalSec: Number(map.get(GYM_CONFIG_KEYS.HEARTBEAT_INTERVAL) || 30),
      allowEmergencyContingency: map.get(GYM_CONFIG_KEYS.EMERGENCY_CONTINGENCY) !== "false",
    };
  }

  /**
   * Atualiza configurações globais de academias com auditoria completa.
   */
  static async updateGymGlobalConfigs(
    configs: Partial<GymGlobalConfigs>,
    adminUserId: string,
    reason?: string
  ): Promise<void> {
    const entries: Array<{ key: string; value: string; description: string }> = [];

    if (configs.turnstilesEnabled !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.TURNSTILES_ENABLED,
        value: String(configs.turnstilesEnabled),
        description: "Módulo de Catracas & Controle de Acesso Físico",
      });
    }
    if (configs.biometricsEnabled !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.BIOMETRICS_ENABLED,
        value: String(configs.biometricsEnabled),
        description: "Módulo de Biometria & Reconhecimento Facial",
      });
    }
    if (configs.classesEnabled !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.CLASSES_ENABLED,
        value: String(configs.classesEnabled),
        description: "Módulo de Aulas Coletivas",
      });
    }
    if (configs.crmEnabled !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.CRM_ENABLED,
        value: String(configs.crmEnabled),
        description: "Módulo de CRM & Prospecção",
      });
    }
    if (configs.defaultBillingGraceDays !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.BILLING_GRACE_DAYS,
        value: String(configs.defaultBillingGraceDays),
        description: "Tolerância Padrão de Inadimplência (Dias)",
      });
    }
    if (configs.defaultAllowMinorSelfCheckin !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.MINOR_SELF_CHECKIN,
        value: String(configs.defaultAllowMinorSelfCheckin),
        description: "Check-in de Menores Desacompanhados",
      });
    }
    if (configs.defaultRequireGuardianSignature !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.GUARDIAN_SIGNATURE,
        value: String(configs.defaultRequireGuardianSignature),
        description: "Assinatura Obrigatória de Responsável para Menores",
      });
    }
    if (configs.defaultBiometricMode !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.BIOMETRIC_MODE,
        value: String(configs.defaultBiometricMode),
        description: "Modo Padrão de Validação Biométrica",
      });
    }
    if (configs.defaultMaxStudents !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.DEFAULT_MAX_STUDENTS,
        value: String(configs.defaultMaxStudents),
        description: "Cota Padrão de Alunos por Academia",
      });
    }
    if (configs.defaultMaxStaff !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.DEFAULT_MAX_STAFF,
        value: String(configs.defaultMaxStaff),
        description: "Cota Padrão de Equipe por Academia",
      });
    }
    if (configs.defaultMaxUnits !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.DEFAULT_MAX_UNITS,
        value: String(configs.defaultMaxUnits),
        description: "Cota Padrão de Unidades Filiais",
      });
    }
    if (configs.defaultMaxDevices !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.DEFAULT_MAX_DEVICES,
        value: String(configs.defaultMaxDevices),
        description: "Cota Padrão de Catracas por Academia",
      });
    }
    if (configs.primaryHardwareDriver !== undefined) {
      entries.push({
        key: GYM_CONFIG_KEYS.HARDWARE_DRIVER,
        value: String(configs.primaryHardwareDriver),
        description: "Driver Homologado de Catraca",
      });
    }

    await prisma.$transaction(async (tx) => {
      for (const entry of entries) {
        await tx.systemSetting.upsert({
          where: { key: entry.key },
          update: { value: entry.value },
          create: { key: entry.key, value: entry.value, description: entry.description },
        });
      }

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: `SUPERADMIN_UPDATE_GYM_CONFIGS: ${entries.map((e) => `${e.key}=${e.value}`).join(", ")}`,
          entity: "SystemSetting",
          severity: "warning",
          ip: "127.0.0.1",
        },
      });
    });
  }
}
```

**Step 4: Integrar no `EntitlementsService.resolveEntitlements`**
- No `EntitlementsService`:
  ```typescript
  const turnstilesGlobal = await GymFeatureFlagsService.isTurnstilesEnabled(workspaceId);
  ...
  features: {
    biometricsEnabled: isEntitled,
    turnstilesEnabled: isEntitled && turnstilesGlobal,
    classesEnabled: isEntitled,
    financialReportsEnabled: isEntitled,
  }
  ```

**Step 5: Rodar testes e verificar aprovação (GREEN)**

Run: `npx vitest run src/modules/workspaces/__tests__/gym-turnstiles-killswitch.test.ts`
Expected: PASS

---

### Task 2: API Route do SuperAdmin para Gestão de Configurações de Academias

**Files:**
- Create: `src/app/api/superadmin/gym-settings/route.ts`

**Step 1: Implementar endpoint seguro com validação de SuperAdmin e Rate Limiting**

- Validar sessão: `session?.user?.role === "SUPERADMIN"`
- `GET`: Retorna todas as configurações via `GymFeatureFlagsService.getGymGlobalConfigs()`.
- `PATCH`: Valida o payload estritamente com whitelist, sem permitir campos desconhecidos. Chama `updateGymGlobalConfigs` e registra auditoria.

```typescript
// src/app/api/superadmin/gym-settings/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { GymFeatureFlagsService } from "@/modules/workspaces/application/gym-feature-flags-service";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const configs = await GymFeatureFlagsService.getGymGlobalConfigs();
    return NextResponse.json(configs);
  } catch (error) {
    console.error("[GYM_SETTINGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await req.json();
    const { configs, reason } = body;

    if (!configs || typeof configs !== "object") {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    await GymFeatureFlagsService.updateGymGlobalConfigs(configs, session.user.id, reason);
    const updated = await GymFeatureFlagsService.getGymGlobalConfigs();

    return NextResponse.json({ success: true, configs: updated });
  } catch (error: any) {
    console.error("[GYM_SETTINGS_PATCH]", error);
    return new NextResponse(error.message || "Internal Error", { status: 500 });
  }
}
```

---

### Task 3: Navegação na Sidebar do SuperAdmin

**Files:**
- Modify: `src/components/application/superadmin-sidebar.tsx`

**Step 1: Adicionar item de Configurações de Academias**
No grupo `accountsNavItems` ou `platformNavItems`:
```typescript
const accountsNavItems = [
  { title: "Usuários", href: "/superadmin/users", icon: Users },
  { title: "Workspaces", href: "/superadmin/workspaces", icon: Building2 },
  { title: "Configurações de Academias", href: "/superadmin/gym-settings", icon: Dumbbell },
];
```

---

### Task 4: Criar Página Completa `/superadmin/gym-settings/page.tsx` com Padrão 1:1

**Files:**
- Create: `src/app/(superadmin)/superadmin/gym-settings/page.tsx`

**Arquitetura Visual da Página:**
1. **Cabeçalho**:
   - Título: "Configurações Globais de Academias"
   - Subtítulo: "Parâmetros centrais, diretrizes de licenciamento e controle de módulos para o ecossistema de academias."
   - Badge Dinâmico: Se `turnstilesEnabled === false`, exibe alerta âmbar pulsante: `"Módulo de Catracas Inativo (Modo Preparação)"`.
2. **Seção 1: Módulos & Permissões de Acesso (Feature Flags)**:
   - Destaque especial para o **Kill Switch de Catracas & Hardware**:
     - Card com borda temática e ícone `ShieldCheck` / `Power`.
     - Switch de alternância.
     - Quando o usuário tentar desativar, abre obrigatoriamente um `AlertDialog` de confirmação:
       - Título: *"Desativar Módulo de Catracas em Todas as Academias?"*
       - Descrição: *"Ao desativar, todas as telas, atalhos, relatórios e menções a catracas serão imediatamente removidos de todas as academias da plataforma. Alunos e recepcionistas não verão referências a catracas até que a integração seja homologada."*
       - Botão Confirmar: `variant="destructive"` com loading indicator.
     - Outros switches: Biometria Facial, Aulas Coletivas, CRM e Importação Assistida.
3. **Seção 2: Políticas Operacionais Padrão (Regras de Negócio Globais)**:
   - Tolerância de Inadimplência (Dias).
   - Check-in de Menores Desacompanhados (Switch).
   - Assinatura Obrigatória de Responsável para Menores (Switch).
   - Modo de Validação Biométrica Padrão (`Select`: Híbrido, Facial 1:1, Impressão Digital).
   - Teto de Desconto de Balcão para Recepcionistas (`Input` de % e `Input` de R$).
4. **Seção 3: Limites & Parâmetros de Licenciamento Padrão**:
   - Cota padrão de Alunos por academia.
   - Cota de Staff / Funcionários.
   - Cota de Unidades Filiais.
   - Cota de Catracas / Terminais autorizados.
   - Limite de Armazenamento Cloud (MB).
5. **Seção 4: Hardware & Gateway de Comunicação de Catracas**:
   - Fabricante Principal Homologado (`Select`: Control iD, Henry, Topdata, Intelbras).
   - Intervalo de Heartbeat esperado (Segundos).
   - Modo de Contingência de Emergência em Queda de Conexão (Switch).
6. **Seção 5: Segurança, Auditoria & Privacidade LGPD em Academias**:
   - Exigência de 2FA obrigatório para administradores e gestores de academia.
   - Expurgo físico de dados biométricos em cancelamentos de alunos.
7. **Botão Flutuante/Fixo de Salvar Alterações**:
   - Com estado de `isSaving`, ícone `Loader2` animado, desabilitado durante envio e toast via Sonner.

---

### Task 5: Ocultação Total (Zero Footprint) no Tenant de Academias (`(gym)`)

**Files:**
- Modify: `src/app/(gym)/layout.tsx`
- Modify: `src/components/application/gym-sidebar.tsx`
- Modify: `src/components/application/gym-mobile-navbar.tsx`
- Modify: `src/app/(gym)/gym/access/page.tsx`
- Modify: `src/app/(gym)/gym/reception/reception-client.tsx`
- Modify: `src/app/(gym)/gym/dashboard/dashboard-client.tsx`
- Modify: `src/app/(gym)/gym/dashboard/page.tsx`
- Modify: `src/app/(gym)/gym/analytics/analytics-client.tsx`
- Modify: `src/app/(gym)/gym/enrollments/enrollments-client.tsx`

**Step 1: Resolver no Servidor e Prover para o Layout**
No `src/app/(gym)/layout.tsx`:
```typescript
const entitlements = await EntitlementsService.resolveEntitlements(context.workspaceId);
const turnstilesEnabled = entitlements.features.turnstilesEnabled;
```
Repassar `turnstilesEnabled` para o `GymSidebar` e `GymMobileNavbar` (via props ou store sync).

**Step 2: Ocultar na Sidebar (`gym-sidebar.tsx`)**
```typescript
// Filtrar "Catracas & Acesso" se turnstilesEnabled for false
const accessItems = turnstilesEnabled ? [operationNavItems[5]] : [];
...
{turnstilesEnabled && renderNavGroup("Controle de Acesso", accessItems)}
```

**Step 3: Ocultar na Mobile Navbar (`gym-mobile-navbar.tsx`)**
```typescript
const navItems = [
  { title: "Início", href: "/gym/dashboard", icon: LayoutDashboard },
  { title: "Recepção", href: "/gym/reception", icon: UserCheck },
  { title: "Alunos", href: "/gym/students", icon: Users },
  ...(turnstilesEnabled ? [{ title: "Catracas", href: "/gym/access", icon: ShieldCheck }] : []),
];
```

**Step 4: Proteger a Rota `/gym/access/page.tsx`**
```typescript
const entitlements = await EntitlementsService.resolveEntitlements(workspaceId);
if (!entitlements.features.turnstilesEnabled) {
  redirect("/gym/dashboard");
}
```

**Step 5: Ocultar e Adaptar a Recepção (`reception-client.tsx`)**
- Quando `!turnstilesEnabled`:
  - A aba `Catracas & Telemetria` (`value="devices"`) NÃO é renderizada no `TabsList` e nem no `TabsContent`.
  - O card `Catracas online` é omitido ou substituído por métrica de atendimento diário.
  - O botão `Liberar giro` e os comandos de catraca são omitidos.
  - Subtítulo da página: `"Consulta rápida de alunos e atendimento de balcão."` (em vez de `"liberação física de catracas"`).
  - Placeholder de busca: `"Buscar aluno por nome ou CPF..."` (em vez de `"Buscar aluno ou catraca..."`).

**Step 6: Ocultar e Adaptar o Dashboard (`dashboard-client.tsx`)**
- Quando `!turnstilesEnabled`:
  - No card de atenção: o item `dispositivos offline` NÃO é renderizado.
  - Na seção `Últimos acessos`: o link para `/gym/access` é omitido; a coluna do nome do dispositivo é suprimida; título vira `"Últimas Presenças"`.

**Step 7: Ocultar no Analytics (`analytics-client.tsx`)**
- A aba `Catracas & Telemetria` é omitida quando o módulo estiver inativo.

**Step 8: Adaptar Matrículas (`enrollments-client.tsx`)**
- Título do modal: `"Ativar Matrícula"` (em vez de `"Ativar Matrícula & Liberar Catraca"`).
- Toasts: `"Matrícula ativada com sucesso!"` (em vez de `"Acesso físico liberado na catraca"`).

---

## Verificação e Testes

1. **Teste Automatizado de Feature Flag**:
   - Rodar `npx vitest run src/modules/workspaces/__tests__/gym-turnstiles-killswitch.test.ts`.
2. **Type Check Completo**:
   - Rodar `npx tsc --noEmit` garantindo ausência de erros de tipagem.
3. **Validação E2E no Navegador**:
   - Acessar `/superadmin/gym-settings`, alternar a flag de catracas para desligada e salvar com confirmação modal.
   - Verificar auditoria gerada no `/superadmin/logs`.
   - Acessar `/gym/dashboard`, `/gym/reception` e verificar que nenhuma menção ou botão de catraca aparece.
   - Tentar acessar `/gym/access` via URL direta e certificar o redirecionamento imediato.
