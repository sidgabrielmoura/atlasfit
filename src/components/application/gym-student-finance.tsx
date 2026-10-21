"use client";
import { gymStatementSchema as statementSchema } from "@/modules/workspaces/domain/gym-statement";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useEffect, useState } from "react";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";

const apiErrorSchema = z.object({ error: z.union([z.string(), z.object({ message: z.string() })]) });
function errorMessage(value: unknown) { const parsed = apiErrorSchema.safeParse(value); return parsed.success ? typeof parsed.data.error === "string" ? parsed.data.error : parsed.data.error.message : "Não foi possível carregar o financeiro."; }
function brl(value: string) { const cents = BigInt(value); return `R$ ${(cents / BigInt(100)).toLocaleString("pt-BR")},${(cents % BigInt(100)).toString().padStart(2, "0")}`; }
const labels = { OPEN: "Em aberto", PARTIALLY_PAID: "Parcial", PAID: "Paga", CANCELLED: "Cancelada", REFUNDED: "Revertida" };

export function GymStudentFinance({ workspaceId, statementUrl = "/api/student/finance", showContractsLink = true }: { workspaceId: string; statementUrl?: string; showContractsLink?: boolean }) {
  const [page, setPage] = useState(1); const [reload, setReload] = useState(0); const [data, setData] = useState<z.infer<typeof statementSchema> | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setError(null);
    async function load() { try {
      const response = await fetch(statementUrl + (statementUrl.includes("?") ? "&" : "?") + "page=" + page, { signal: controller.signal }); const value: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(value)); const statement = statementSchema.parse(value);
      if (statement.workspaceId !== workspaceId) throw new Error("O contexto mudou. Selecione novamente a academia.");
      if (!controller.signal.aborted) setData(statement);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Erro ao carregar mensalidades."); } }
    void load(); return () => controller.abort();
  }, [workspaceId, statementUrl, page, reload]);
  return <div className="flex flex-col gap-6 p-4 md:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">Mensalidades</h1><p className="mt-1 text-sm text-muted-foreground">{data?.workspaceName || "Financeiro da academia"}</p></div>{showContractsLink && <Button asChild variant="outline"><Link href="/student/contracts">Contratos</Link></Button>}</div>
    {error ? <Card><CardContent className="flex flex-col gap-3 py-6"><Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert><Button variant="outline" onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></CardContent></Card> : !data ? <div role="status" aria-label="Carregando mensalidades" className="flex flex-col gap-4"><div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div><Skeleton className="h-40 rounded-xl" /><Skeleton className="h-40 rounded-xl" /></div> : <>
      <div className="grid gap-3 sm:grid-cols-3">{[["Recebido", data.totals.receivedInCents], ["Em aberto", data.totals.outstandingInCents], ["Vencido", data.totals.overdueInCents]].map(([label, value]) => <Card key={label}><CardHeader><CardDescription>{label}</CardDescription></CardHeader><CardContent><p className="text-xl font-semibold">{brl(value)}</p></CardContent></Card>)}</div>
      <p className="text-xs text-muted-foreground">Posição de {new Date(data.snapshot.asOf).toLocaleString("pt-BR", { timeZone: data.timezone })}. Vencimento hoje permanece em aberto.</p>
      <p className="text-sm text-muted-foreground">Os pagamentos são registrados pela academia. O saldo em aberto já considera recebimentos parciais e reversões registradas.</p>
      {data.invoices.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Nenhuma mensalidade registrada</EmptyTitle><EmptyDescription>A academia registra obrigações e recebimentos neste extrato.</EmptyDescription></EmptyHeader></Empty> : data.invoices.map(invoice => <Card key={invoice.id}><CardHeader><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle>{invoice.title}</CardTitle><CardDescription>Vencimento: {new Date(invoice.dueDate).toLocaleDateString("pt-BR", { timeZone: data.timezone })}{invoice.competenceMonth ? ` · Competência ${invoice.competenceMonth}` : ""}</CardDescription></div><Badge variant={invoice.overdue ? "destructive" : "outline"}>{invoice.overdue ? "Vencida" : labels[invoice.status]}</Badge></div></CardHeader><CardContent className="flex flex-col gap-4"><div className="flex flex-wrap gap-6 text-sm"><span>Valor: <strong>{brl(invoice.totalInCents)}</strong></span><span>Saldo: <strong>{brl(invoice.balanceInCents)}</strong></span></div>
        {invoice.receipts.length > 0 && <details className="text-sm"><summary className="cursor-pointer font-medium">Recebimentos registrados</summary><div className="mt-3 flex flex-col gap-2">{invoice.receipts.map(receipt => <p key={receipt.receiptNumber} className={receipt.reversed ? "text-muted-foreground" : undefined}>{brl(receipt.amountInCents)} · {new Date(receipt.paidAt).toLocaleDateString("pt-BR", { timeZone: data.timezone })} · Recibo {receipt.receiptNumber}{receipt.reversed ? " · Revertido" : ""}</p>)}{invoice.receiptsLimited && <p className="text-muted-foreground">Exibindo os 50 registros mais recentes. Solicite o histórico completo à academia.</p>}</div></details>}
      </CardContent></Card>)}
      <div className="flex items-center justify-between gap-3"><Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><span className="text-sm">Página {page} de {Math.max(1, data.pagination.totalPages)}</span><Button variant="outline" disabled={page >= data.pagination.totalPages} onClick={() => setPage(value => value + 1)}>Próxima</Button></div>
    </>}
  </div>;
}
