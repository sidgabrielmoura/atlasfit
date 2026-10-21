import { Prisma } from "@prisma/client";
import prisma from "./prisma";

/** Legacy WorkspacePayment uses Float; aggregate without transferring payment history. */
export async function personalPaymentSummary(workspaceId: string, now = new Date()) {
  const months = Array.from({ length: 7 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - 6 + i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { start, end };
  });
  const current = months[6];
  const monthly = months.map((month, i) => Prisma.sql`COALESCE(sum(amount) FILTER (WHERE status='pago' AND "createdAt">=${month.start} AND "createdAt"<${month.end}),0)::float8 AS ${Prisma.raw(`"month${i}"`)}`);
  const [row] = await prisma.$queryRaw<Array<Record<string, number>>>(Prisma.sql`
    SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status='pago')::int AS paid_count,
      count(*) FILTER (WHERE status='pendente')::int AS pending_count,
      count(*) FILTER (WHERE status='atrasado')::int AS overdue,
      count(*) FILTER (WHERE "createdAt">=${current.start} AND "createdAt"<${current.end})::int AS current_count,
      count(*) FILTER (WHERE status='atrasado' AND "createdAt">=${current.start} AND "createdAt"<${current.end})::int AS current_overdue,
      count(*) FILTER (WHERE status='pago' AND "createdAt">=${current.start} AND "createdAt"<${current.end})::int AS current_paid,
      COALESCE(avg(amount) FILTER (WHERE status='pago'),0)::float8 AS average,
      ${Prisma.join(monthly)}
    FROM "WorkspacePayment" WHERE "workspaceId"=${workspaceId}
  `);
  const mrr = row.month6;
  const denominator = row.current_count || row.total;
  const overdue = row.current_count ? row.current_overdue : row.overdue;
  return {
    statusCounts: { pago: row.paid_count, pendente: row.pending_count, atrasado: row.overdue },
    mrr, avgTicket: row.current_paid ? mrr / row.current_paid : row.average,
    churnRate: denominator ? Number((overdue / denominator * 100).toFixed(1)) : 0,
    allTimeChurn: row.total ? Number((row.overdue / row.total * 100).toFixed(1)) : 0,
    months: months.map((month, i) => ({ start: month.start, revenue: row[`month${i}`] })),
  };
}
