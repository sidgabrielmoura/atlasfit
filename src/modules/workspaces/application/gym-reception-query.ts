import { Prisma } from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { WorkspaceAccessError } from "../domain/types";
import { getGymUnitAccess } from "./gym-unit-access";
import { reportCalendarRange } from "../domain/gym-report-calendar";
import { reportDateBoundary } from "../domain/gym-report-metrics";

const receptionQuery = z.object({
  workspaceId: z.string().min(1),
  actorUserId: z.string().min(1),
  unitId: z.string().min(1).optional(),
  page: z.number().int().min(1).max(10_000).default(1),
}).strict();

export type ReceptionStudent = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  registrationNumber: string | null;
  status: string;
  financialStatus: "OVERDUE" | "OPEN" | "SETTLED" | "NONE" | null;
  planName: string;
  photoUrl: string | null;
  lastCheckIn: string | null;
};

export type ReceptionSummary = {
  total: number;
  activeCount: number;
  overdueCount: number;
  settledCount: number;
};

const PAGE_SIZE = 30;

/** Read-only snapshot; no billing, provisioning or equipment command is started here. */
export async function getGymReceptionSnapshot(raw: unknown) {
  const parsed = receptionQuery.safeParse(raw);
  if (!parsed.success) throw new WorkspaceAccessError(400, "INVALID_REQUEST", "Unidade ou página inválida.");
  const input = parsed.data;

  return prisma.$transaction(async (tx) => {
    const access = await getGymUnitAccess(tx, input.workspaceId, input.actorUserId, "students.read");
    const scope = {
      ...access,
      units: access.units.map(({ id, name, canReadFinance }) => ({ id, name, canReadFinance })),
    };

    const unit = input.unitId ? scope.units.find((item) => item.id === input.unitId) : scope.units[0];
    if (input.unitId && !unit) {
      throw new WorkspaceAccessError(403, "INSUFFICIENT_PERMISSIONS", "Unidade indisponível para este operador.");
    }

    if (!unit && !scope.includeUnassigned) {
      return {
        ...scope,
        selectedUnitId: "",
        students: [],
        page: 1,
        pageSize: PAGE_SIZE,
        total: 0,
        hasNext: false,
        summary: { total: 0, activeCount: 0, overdueCount: 0, settledCount: 0 },
      };
    }

    const canReadFinance = unit ? unit.canReadFinance : scope.includeUnassigned;
    const timezone = (await tx.gymSettings.findUnique({ where: { workspaceId: input.workspaceId }, select: { timezone: true } }))?.timezone || "America/Sao_Paulo";
    const now = new Date();
    const today = reportDateBoundary(reportCalendarRange(now, timezone, "7d").endDate, timezone, false);
    const currentContract: Prisma.GymEnrollmentWhereInput = {
      workspaceId: input.workspaceId, status: { in: ["ACTIVE", "PAUSED"] }, startDate: { lte: now }, activatedAt: { not: null },
      AND: [{ OR: [{ autoRenew: true }, { endDate: null }, { endDate: { gt: now } }] }, { OR: [{ cancellationEffectiveDate: null }, { cancellationEffectiveDate: { gt: now } }] }],
    };

    const where: Prisma.WorkspaceMemberWhereInput = {
      workspaceId: input.workspaceId,
      ...(unit ? { unitId: unit.id } : {}),
      isActive: true,
      studentProfile: { isNot: null },
      OR: [
        { role: "STUDENT", roleGrants: { none: {} } },
        {
          roleGrants: {
            some: {
              role: "STUDENT",
              revokedAt: null,
              ...(unit ? { OR: [{ unitId: null }, { unitId: unit.id }] } : {}),
            },
          },
        },
      ],
    };

    const total = await tx.workspaceMember.count({ where });
    const page = Math.min(input.page, Math.max(1, Math.ceil(total / PAGE_SIZE)));

    const rows = await tx.workspaceMember.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      select: {
        id: true,
        user: { select: { name: true, email: true, image: true, whatsapp: true } },
        studentProfile: { select: { registrationNumber: true, status: true } },
        accessLogs: {
          where: { workspaceId: input.workspaceId, granted: true, direction: "ENTRY" },
          orderBy: { accessedAt: "desc" },
          take: 1,
          select: { accessedAt: true },
        },
        gymEnrollments: {
          where: {
            ...currentContract,
            workspaceId: input.workspaceId,
            ...(unit ? { OR: [{ unitId: unit.id }, { unitId: null }] } : {}),
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: {
            status: true,
            planVersion: { select: { name: true, plan: { select: { workspaceId: true } } } },
          },
        },
      },
    });

    const ids = rows.map((item) => item.id);
    const invoiceScope: Prisma.GymInvoiceWhereInput = {
      workspaceId: input.workspaceId,
      studentMemberId: { in: ids },
      status: { in: ["OPEN", "PARTIALLY_PAID", "PAID"] },
      ...(unit
        ? {
            OR: [
              { enrollment: { unitId: unit.id, workspaceId: input.workspaceId } },
              { enrollmentId: null },
              { enrollment: { unitId: null, workspaceId: input.workspaceId } },
            ],
          }
        : {}),
    };

    // Aggregate indicators in the database instead of loading every historical invoice
    const overdueCondition: Prisma.GymInvoiceWhereInput = { workspaceId: input.workspaceId, status: { in: ["OPEN", "PARTIALLY_PAID"] }, balanceRemainingInCents: { gt: BigInt(0) }, dueDate: { lt: today } };
    const activePeople: Prisma.WorkspaceMemberWhereInput = { ...where, gymEnrollments: { some: { ...currentContract, status: "ACTIVE" } } };
    const [overdue, open, invoiced, totalActiveEnrollments, totalOverdueInvoices, settledPeople] = await Promise.all([
      canReadFinance
        ? tx.gymInvoice.groupBy({
            by: ["studentMemberId"],
            where: { ...invoiceScope, ...overdueCondition, studentMemberId: { in: ids } },
          })
        : [],
      canReadFinance
        ? tx.gymInvoice.groupBy({
            by: ["studentMemberId"],
            where: { ...invoiceScope, balanceRemainingInCents: { gt: BigInt(0) } },
          })
        : [],
      canReadFinance ? tx.gymInvoice.groupBy({ by: ["studentMemberId"], where: invoiceScope }) : [],
      tx.workspaceMember.count({ where: activePeople }),
      canReadFinance
        ? tx.workspaceMember.count({ where: { ...where, invoices: { some: overdueCondition } } })
        : 0,
      canReadFinance ? tx.workspaceMember.count({ where: { ...activePeople, invoices: { some: { workspaceId: input.workspaceId, status: { in: ["OPEN", "PARTIALLY_PAID", "PAID"] } }, none: overdueCondition } } }) : 0,
    ]);

    const overdueIds = new Set(overdue.map((item) => item.studentMemberId));
    const openIds = new Set(open.map((item) => item.studentMemberId));
    const invoicedIds = new Set(invoiced.map((item) => item.studentMemberId));

    const students: ReceptionStudent[] = rows.map((item) => {
      const contract = item.gymEnrollments[0];
      const validContract =
        contract?.planVersion?.plan?.workspaceId === input.workspaceId ? contract : undefined;

      const lastAccess = item.accessLogs[0]?.accessedAt;
      const lastCheckIn = lastAccess ? lastAccess.toISOString() : null;

      return {
        id: item.id,
        name: item.user.name || "Aluno sem nome",
        email: item.user.email,
        whatsapp: item.user.whatsapp,
        registrationNumber: item.studentProfile?.registrationNumber || null,
        status:
          item.studentProfile?.status !== "ACTIVE"
            ? "INACTIVE"
            : validContract?.status || "NOT_ENROLLED",
        financialStatus: !canReadFinance
          ? null
          : overdueIds.has(item.id)
            ? "OVERDUE"
            : openIds.has(item.id)
              ? "OPEN"
              : invoicedIds.has(item.id)
                ? "SETTLED"
                : "NONE",
        planName: validContract?.planVersion?.name || "Sem matrícula",
        photoUrl: item.user.image,
        lastCheckIn,
      };
    });

    return {
      ...scope,
      selectedUnitId: unit?.id || "",
      students,
      page,
      pageSize: PAGE_SIZE,
      total,
      hasNext: page * PAGE_SIZE < total,
      summary: {
        total,
        activeCount: totalActiveEnrollments,
        overdueCount: totalOverdueInvoices,
        settledCount: settledPeople,
      },
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
