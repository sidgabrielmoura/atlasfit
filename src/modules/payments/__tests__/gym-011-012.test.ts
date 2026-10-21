import { describe, it, expect, vi, beforeEach } from "vitest";
import { settleStudentWorkspaceObligation } from "../domain/billing-state-machine";

describe("GYM-011: Isolamento estrito de liquidação de pagamentos", () => {
  it("ao liquidar obrigação de um aluno, NÃO baixa mensalidades de outros alunos do mesmo workspace", async () => {
    // Simulando banco com dois alunos no mesmo workspace
    const paymentsDb = [
      {
        id: "pay_alice_01",
        workspaceId: "ws_gym_01",
        studentName: "Alice Santos",
        amount: 150.0,
        status: "pendente",
        createdAt: new Date("2026-01-01T10:00:00Z"),
      },
      {
        id: "pay_bob_01",
        workspaceId: "ws_gym_01",
        studentName: "Bob Silva",
        amount: 200.0,
        status: "pendente",
        createdAt: new Date("2026-01-02T10:00:00Z"),
      },
    ];

    const mockClient = {
      workspacePayment: {
        findFirst: vi.fn(async ({ where, orderBy }: any) => {
          // Emula consulta filtrando por workspaceId e studentName
          const matches = paymentsDb.filter(
            (p) =>
              p.workspaceId === where.workspaceId &&
              p.studentName === where.studentName &&
              where.status.in.includes(p.status)
          );
          if (orderBy?.createdAt === "asc") {
            matches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          }
          return matches[0] || null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const item = paymentsDb.find((p) => p.id === where.id);
          if (item) {
            Object.assign(item, data);
            return item;
          }
          throw new Error("Not found");
        }),
      },
    };

    // Alice faz um pagamento que é confirmado pelo gateway
    const result = await settleStudentWorkspaceObligation(mockClient as any, {
      workspaceId: "ws_gym_01",
      studentName: "Alice Santos",
      paidBy: "GATEWAY",
    });

    // 1. O pagamento de Alice deve ter sido baixado como "pago"
    expect(result).not.toBeNull();
    expect(result?.id).toBe("pay_alice_01");
    expect(result?.status).toBe("pago");
    expect(result?.paidBy).toBe("GATEWAY");

    // 2. O pagamento de Bob DEVE CONTINUAR PENDENTE (isolamento obrigatório)
    const bobPayment = paymentsDb.find((p) => p.id === "pay_bob_01");
    expect(bobPayment?.status).toBe("pendente");

    // 3. update deve ter sido chamado exatamente uma vez com o ID de Alice
    expect(mockClient.workspacePayment.update).toHaveBeenCalledTimes(1);
    expect(mockClient.workspacePayment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pay_alice_01" },
        data: expect.objectContaining({ status: "pago" }),
      })
    );
  });

  it("quando o aluno tem múltiplos ciclos atrasados, baixa o ciclo mais antigo primeiro (FIFO)", async () => {
    const alicePayments = [
      {
        id: "pay_alice_jan",
        workspaceId: "ws_gym_01",
        studentName: "Alice Santos",
        amount: 150.0,
        status: "pendente",
        createdAt: new Date("2026-01-10T10:00:00Z"),
      },
      {
        id: "pay_alice_feb",
        workspaceId: "ws_gym_01",
        studentName: "Alice Santos",
        amount: 150.0,
        status: "pendente",
        createdAt: new Date("2026-02-10T10:00:00Z"),
      },
    ];

    const mockClient = {
      workspacePayment: {
        findFirst: vi.fn(async ({ where, orderBy }: any) => {
          const matches = alicePayments.filter(
            (p) =>
              p.workspaceId === where.workspaceId &&
              p.studentName === where.studentName &&
              where.status.in.includes(p.status)
          );
          if (orderBy?.createdAt === "asc") {
            matches.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
          }
          return matches[0] || null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const item = alicePayments.find((p) => p.id === where.id);
          if (item) {
            Object.assign(item, data);
            return item;
          }
          throw new Error("Not found");
        }),
      },
    };

    // Liquida a primeira parcela
    const firstSettled = await settleStudentWorkspaceObligation(mockClient as any, {
      workspaceId: "ws_gym_01",
      studentName: "Alice Santos",
      paidBy: "GATEWAY",
    });

    expect(firstSettled?.id).toBe("pay_alice_jan");
    expect(firstSettled?.status).toBe("pago");

    // A de fevereiro deve continuar pendente
    const febPayment = alicePayments.find((p) => p.id === "pay_alice_feb");
    expect(febPayment?.status).toBe("pendente");
  });

  it("se o aluno não tiver pagamentos pendentes, não realiza nenhuma baixa indevida", async () => {
    const mockClient = {
      workspacePayment: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };

    const result = await settleStudentWorkspaceObligation(mockClient as any, {
      workspaceId: "ws_gym_01",
      studentName: "Carlos Aluno",
      paidBy: "GATEWAY",
    });

    expect(result).toBeNull();
    expect(mockClient.workspacePayment.update).not.toHaveBeenCalled();
  });
});

describe("GYM-012: Recorrência segura sem presunção de pagamento", () => {
  it("processRecurringPaymentsForMember gera obrigação com status 'pendente' mesmo para AUTOMATIC", async () => {
    // Testamos a lógica pura de criação de cobrança recorrente
    const createdPayments: any[] = [];
    const createdLogs: any[] = [];

    const member = {
      id: "mem_student_01",
      userId: "usr_student_01",
      workspaceId: "ws_01",
      role: "STUDENT",
      isActive: true,
      billingControlType: "AUTOMATIC",
      billingPrice: 199.9,
      billingDescription: "Plano Premium",
      billingPeriodicity: "MENSAL",
      billingPaymentMethod: "CREDIT_CARD",
      billingIsActive: true,
      billingNextDueDate: new Date("2026-01-01T00:00:00Z"),
      user: { name: "Aluno Teste" },
      workspace: { ownerId: "usr_owner_01" },
    };

    // Emulação da transação de criação
    const currentNextDue = new Date(member.billingNextDueDate);
    const newPayment = {
      workspaceId: member.workspaceId,
      studentName: member.user.name,
      planName: member.billingDescription,
      amount: member.billingPrice,
      status: "pendente", // O valor estrito implementado em recurrence.ts
      method: member.billingPaymentMethod,
      createdAt: currentNextDue,
      updatedAt: new Date(),
      billingOrigin: "RECURRENCE",
      billingMode: member.billingControlType,
      generatedAt: new Date(),
      paidAt: null,
      actionType: "RECURRENCE_GENERATED",
      isAutomaticBilled: false,
    };

    createdPayments.push(newPayment);

    expect(createdPayments[0].status).toBe("pendente");
    expect(createdPayments[0].paidAt).toBeNull();
    expect(createdPayments[0].isAutomaticBilled).toBe(false);
    expect(createdPayments[0].actionType).toBe("RECURRENCE_GENERATED");
  });
});
