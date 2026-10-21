import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

type Input = { accountId: string; page: number; pageSize: number; search: string; typeFilter: string; statusFilter: string; methodFilter: string };
export async function walletTransactionsQuery(input: Input) {
  const { accountId, page, pageSize, search, typeFilter, statusFilter, methodFilter } = input;
  const items = Prisma.sql`
    SELECT b.id,'BILLING'::text AS "itemType",COALESCE(NULLIF(b.title,''),'Cobrança de Mensalidade') AS title,
      'Aluno: '||COALESCE(u.name,'Aluno') AS subtitle,COALESCE(u.name,'Aluno') AS "studentName",
      b."grossAmountInCents"::text AS "amountInCents",b."personalNetEstimatedInCents"::text AS "netAmountInCents",
      b.status::text AS status,b."paymentMethod"::text AS "paymentMethod",b."createdAt" AS "createdAt",
      NULL::text AS "destinationMasked",b."hostedInvoiceUrl",b."billingReference"
    FROM "StudentBilling" b LEFT JOIN "User" u ON u.id=b."studentUserId" WHERE b."providerAccountId"=${accountId} AND ${typeFilter !== "PAYOUT"}
    UNION ALL
    SELECT p.id,'PAYOUT','Saque Pix ('||COALESCE(NULLIF(p."destinationMasked",''),'Chave Pix')||')','Transferência enviada para sua conta',NULL,
      p."amountInCents"::text,p."amountInCents"::text,p.status::text,NULL,p."requestedAt",p."destinationMasked",NULL,NULL
    FROM "WalletPayoutRequest" p WHERE p."providerAccountId"=${accountId} AND ${typeFilter !== "BILLING"}
  `;
  const statuses = ["PAID", "SETTLED"].includes(statusFilter) ? ["SETTLED", "CONFIRMED", "COMPLETED"] : statusFilter === "PENDING" ? ["PENDING", "PROCESSING", "SUBMITTED"] : ["CANCELLED", "FAILED"].includes(statusFilter) ? ["CANCELLED", "FAILED", "REJECTED"] : [statusFilter];
  // LIKE wildcards in a user's search retain literal substring semantics.
  const pattern = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
  const filters = Prisma.sql`
    ${search ? Prisma.sql`(title ILIKE ${pattern} OR subtitle ILIKE ${pattern} OR "studentName" ILIKE ${pattern} OR "billingReference" ILIKE ${pattern} OR "destinationMasked" ILIKE ${pattern})` : Prisma.sql`TRUE`}
    AND ${statusFilter === "ALL" ? Prisma.sql`TRUE` : Prisma.sql`status IN (${Prisma.join(statuses)})`}
    AND ${methodFilter === "ALL" ? Prisma.sql`TRUE` : Prisma.sql`COALESCE("paymentMethod",'PIX')=${methodFilter}`}
  `;
  const [count] = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`WITH items AS (${items}) SELECT count(*)::int AS count FROM items WHERE ${filters}`);
  const rows = await prisma.$queryRaw<Array<Record<string, unknown> & { createdAt: Date }>>(Prisma.sql`WITH items AS (${items}) SELECT * FROM items WHERE ${filters} ORDER BY "createdAt" DESC,id DESC,"itemType" LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`);
  return { transactions: rows.map(row => ({ ...row, createdAt: row.createdAt.toISOString() })), pagination: { page, pageSize, totalItems: count.count, totalPages: Math.ceil(count.count / pageSize) || 1 } };
}
