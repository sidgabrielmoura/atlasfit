import { describe, it, expect, vi, beforeEach } from "vitest";
import { seedGymAuthority } from "./gym-test-authority";
const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: {
 gymEnrollment: { findMany: vi.fn() }, gymInvoice: { findMany: vi.fn(), aggregate: vi.fn() },
 gymPayment: { groupBy: vi.fn(), count: vi.fn() }, gymPaymentAllocation: { aggregate: vi.fn() },
 gymExpensePayment: { aggregate: vi.fn() }, gymExpense: { aggregate: vi.fn() },
 workspaceMember: { findMany: vi.fn(), findFirst: vi.fn() }, gymSettings: { findUnique: vi.fn() }, $transaction: vi.fn(), $executeRaw: vi.fn(),
} as any }));
vi.mock("@/lib/prisma", () => ({ default: mockPrisma }));
import { GymAnalyticsService } from "../application/gym-analytics-service";
import { gymReportAuthority } from "../application/gym-report-authority";
import { gymReportFinancialAggregates } from "../application/gym-report-financial-aggregates";
import { monthlyContractCents, averageContractCents } from "../domain/gym-report-metrics";
import { GymInvoiceStatus } from "@prisma/client";
describe("GYM-071 · Métricas e exportações", () => {
 const workspaceId="ws-gym-metrics-1";
 const input={ workspaceId, start: new Date("2026-09-01T03:00:00Z"), end: new Date("2026-10-11T23:00:00Z"), now: new Date("2026-10-11T15:00:00Z"), timezone:"America/Sao_Paulo", invoiceScope:{workspaceId}, expenseScope:{workspaceId}, paymentScope:{workspaceId} };
 beforeEach(() => {
  vi.resetAllMocks();
  seedGymAuthority(mockPrisma,workspaceId,"owner",{"mock-report-author":"MANAGER","trainer":"TRAINER"});
  mockPrisma.$executeRaw.mockResolvedValue(0);
  mockPrisma.$transaction.mockImplementation(async (callback:any)=>callback(mockPrisma));
  mockPrisma.gymSettings.findUnique.mockResolvedValue(null);
  mockPrisma.gymPaymentAllocation.aggregate.mockResolvedValue({_sum:{allocatedAmountInCents:BigInt(0)}});
  mockPrisma.gymExpensePayment.aggregate.mockResolvedValue({_sum:{amountInCents:BigInt(0)}});
  mockPrisma.gymExpense.aggregate.mockResolvedValue({_sum:{paidAmountInCents:BigInt(0),amountInCents:BigInt(0)},_count:{_all:0}});
  mockPrisma.gymPayment.groupBy.mockResolvedValue([]); mockPrisma.gymPayment.count.mockResolvedValue(0);
  mockPrisma.gymInvoice.aggregate.mockResolvedValue({_sum:{balanceRemainingInCents:BigInt(0),totalInCents:BigInt(0)},_count:{_all:0}});
 });
 // SQL aggregation and lifecycle selection run against PostgreSQL in report-temporal/report-scope.integration.ts.
 it("normaliza cinco ciclos em centavos e calcula ticket médio sem aproximação decimal",()=>{
  const cycles=["MONTHLY","BIMONTHLY","QUARTERLY","SEMIANNUAL","ANNUAL"] as const;
  const prices=[12000,20000,30000,60000,120000];
  const total=cycles.reduce((sum,cycle,index)=>sum+monthlyContractCents(BigInt(prices[index]),cycle,30),BigInt(0));
  expect(total).toBe(BigInt(52000)); expect(averageContractCents(total,5)).toBe(10400);
 });
 it("restringe o instrutor à própria carteira com autoridade persistida",async()=>{
  const scope=await gymReportAuthority(mockPrisma,workspaceId,"trainer",{preferFinancial:false});
  expect(scope.financial).toBe(false);
  expect(scope.portfolio.OR).toContainEqual({unitId:null,assignedStaffId:"member-trainer"});
  await expect(gymReportAuthority(mockPrisma,workspaceId,"trainer",{preferFinancial:false,assignedStaffId:"other"})).rejects.toMatchObject({code:"INSUFFICIENT_PERMISSIONS"});
 });
 it("compensa estorno uma vez e preserva a data própria de cada fato",async()=>{
  mockPrisma.gymPaymentAllocation.aggregate.mockImplementation(async({where}:any)=>({_sum:{allocatedAmountInCents:BigInt(where.payment.reversedAt?5000:where.payment.paymentMethod?15000:30000)}}));
  mockPrisma.gymExpensePayment.aggregate.mockImplementation(async({where}:any)=>({_sum:{amountInCents:BigInt(where.reversedAt?0:8000)}}));
  mockPrisma.gymPayment.groupBy.mockResolvedValue([{paymentMethod:"CASH",_count:{_all:2}}]);
  const {cashFlow}=await gymReportFinancialAggregates(mockPrisma,input);
  expect(cashFlow).toMatchObject({grossReceivedInCents:30000,reversedOrRefundedInCents:5000,netReceivedInCents:25000,expensesPaidInCents:8000,netCashInCents:17000,paymentsByMethod:[{method:"CASH",count:2,totalInCents:15000}]});
  const calls=mockPrisma.gymPaymentAllocation.aggregate.mock.calls.map(([args]:any)=>args.where);
  expect(calls[0]).toMatchObject({invoice:{workspaceId},payment:{workspaceId,paidAt:{gte:input.start,lte:input.end}}});
  expect(calls[1].payment).toEqual({workspaceId,reversedAt:{gte:input.start,lte:input.end}});
 });
 it("calcula aging com limites civis e denominador explícito",async()=>{
  for(const value of [10000,5000,6000,7000,8000]) mockPrisma.gymInvoice.aggregate.mockResolvedValueOnce({_sum:{balanceRemainingInCents:BigInt(value)},_count:{_all:1}});
  mockPrisma.gymInvoice.aggregate.mockResolvedValueOnce({_sum:{totalInCents:BigInt(100000)}});
  const {accountsReceivable}=await gymReportFinancialAggregates(mockPrisma,input);
  expect(accountsReceivable).toEqual({totalReceivableInCents:36000,currentInCents:10000,overdue0to30InCents:5000,overdue31to60InCents:6000,overdue61to90InCents:7000,overdueOver90InCents:8000,totalOverdueInCents:26000,defaultRateNumeratorInCents:26000,defaultRateDenominatorInCents:100000,defaultRatePercentage:26,overdueInvoicesCount:4});
  const calls=mockPrisma.gymInvoice.aggregate.mock.calls.map(([args]:any)=>args.where);
  expect(calls[0].dueDate).toEqual({gte:new Date("2026-10-11T03:00:00Z")});
  expect(calls[1].dueDate.lt).toEqual(calls[0].dueDate.gte);
  expect(calls[5]).toMatchObject({workspaceId,status:{notIn:["DRAFT","CANCELLED","REFUNDED"]},dueDate:{lt:calls[0].dueDate.gte}});
 });
  describe("Exportações de Dados em CSV", () => {
    it("deve exportar relatório de alunos sanitizado com cabeçalho UTF-8 BOM", async () => {
      mockPrisma.workspaceMember.findMany.mockResolvedValue([
        {
          id: "mem-1",
          role: "STUDENT",
          isActive: true,
          isMinor: false,
          user: { name: "Carlos Aluno", email: "carlos@teste.com", whatsapp: "11999998888" },
          studentProfile: {
            registrationNumber: "MAT-2026-0001",
            status: "ACTIVE",
            enrolledAt: new Date("2026-01-15"),
          },
          gymEnrollments: [
            {
              planVersion: { name: "Plano Black" },
              endDate: new Date("2027-01-15"),
            },
          ],
        },
      ]);

      const result = await GymAnalyticsService.exportData({
        workspaceId, actorUserId: "mock-report-author",
        exportType: "STUDENTS",
      });

      expect(result.contentType).toBe("text/csv; charset=utf-8");
      expect(result.filename).toContain("atlasfit-alunos-");
      expect(result.rowCount).toBe(1);
      expect(result.content.startsWith("\uFEFF")).toBe(true); // UTF-8 BOM
      expect(result.content).toContain('"Carlos Aluno"');
      expect(result.content).toContain('"MAT-2026-0001"');
      expect(result.content).toContain('"Plano Black"');
      expect(result.content).not.toContain("password");
      expect(result.content).not.toContain("setupToken");
    });

    it("deve exportar relatório de faturas e saldos devedores", async () => {
      mockPrisma.gymInvoice.findMany.mockResolvedValue([
        {
          invoiceNumber: "FAT-202609-000001",
          competenceMonth: "2026-09",
          dueDate: new Date("2026-09-10"),
          totalInCents: BigInt(15000),
          paidAmountInCents: BigInt(5000),
          balanceRemainingInCents: BigInt(10000),
          status: GymInvoiceStatus.PARTIALLY_PAID,
          payerName: "Responsável Legal",
          studentMember: { user: { name: "Aluno Menor" } },
        },
      ]);

      const result = await GymAnalyticsService.exportData({
        workspaceId, actorUserId: "mock-report-author",
        exportType: "INVOICES",
      });

      expect(result.filename).toContain("atlasfit-faturas-");
      expect(result.rowCount).toBe(1);
      expect(result.content).toContain('"FAT-202609-000001"');
      expect(result.content).toContain('"150.00"'); // R$ 150,00
      expect(result.content).toContain('"100.00"'); // R$ 100,00 restante
      expect(result.content).toContain('"PARTIALLY_PAID"');
    });
  });
});
