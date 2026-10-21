"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GymPageHeader } from "@/components/application/gym-page";
import type { GymReviewKind, listGymAdministrativeReviewResources } from "@/modules/workspaces/application/gym-administrative-review";

type Listing = Awaited<ReturnType<typeof listGymAdministrativeReviewResources>>;
type Preview = { digest: string; blockers: string[]; snapshot: Record<string, any>; proposed: Record<string, any> };
const blockerLabels: Record<string, string> = {
  REVIEW_SOURCE_LIMIT: "Há mais registros do que o limite de uma revisão; confira o histórico em lotes menores",
  ACCOUNT_TENANT_REVIEW_REQUIRED: "Existem lançamentos vinculados a outra academia",
  CASH_TRANSFER_LINK_REVIEW_REQUIRED: "O vínculo entre caixa e transferência não corresponde à conta ou ao valor",
  UNLINKED_CASH_MOVEMENT_REVIEW_REQUIRED: "Classifique os movimentos antigos na aba de caixa antes de revisar esta conta",
  ALLOCATION_INTEGRITY_REQUIRED: "Existem alocações inconsistentes com seus recebimentos",
  INVOICE_AMOUNT_REVIEW_REQUIRED: "Os valores da obrigação e das alocações não correspondem",
  INVOICE_TRANSITION_REQUIRED: "Esta obrigação exige revisão do seu estado antes do saldo",
  LEGACY_ACCOUNT_FACTS_REVIEW_REQUIRED: "Existem recebimentos sem conta identificada ou despesas antigas sem pagamentos individuais; confira esses vínculos antes do saldo",
  EXTERNAL_ACCOUNT_REVIEW_REQUIRED: "Esta conta é externa e exige conferência própria do histórico; a academia usa contas internas",
};
const labels = { CONTRACT: "Contratos legados", INVOICE: "Faturas", ACCOUNT: "Contas internas", CASH_LINK: "Movimentos legados de caixa" };
function currency(value: unknown) {
  if (typeof value !== "string" || !/^-?\d+$/.test(value)) return "Não informado";
  const amount = BigInt(value), positive = amount < BigInt(0) ? -amount : amount;
  return `${amount < BigInt(0) ? "−" : ""}R$ ${(positive / BigInt(100)).toLocaleString("pt-BR")},${String(positive % BigInt(100)).padStart(2, "0")}`;
}
export function GymReconciliationClient({ workspaceId, initial }: { workspaceId: string; initial: Listing }) {
  const [kind, setKind] = useState<GymReviewKind>("CONTRACT"), [listing, setListing] = useState(initial), [busy, setBusy] = useState(false);
  const [target, setTarget] = useState<{ id: string; label: string } | null>(null), [preview, setPreview] = useState<Preview | null>(null);
  const [reason, setReason] = useState(""), [evidence, setEvidence] = useState(""), [approved, setApproved] = useState(false);
  const [closed, setClosed] = useState(false), [charges, setCharges] = useState(false), [schedule, setSchedule] = useState(false);
  const [credit, setCredit] = useState(""), [due, setDue] = useState(""), [opening, setOpening] = useState(""), [cycles, setCycles] = useState("0"), [requestKey, setRequestKey] = useState("");
  const [cashDisposition, setCashDisposition] = useState(""), [transferId, setTransferId] = useState("");
  async function request(url: string, options?: RequestInit) {
    const res = await fetch(url, options), data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "Não foi possível concluir a operação.");
    return data;
  }
  async function load(nextKind: GymReviewKind = kind, page = 1) {
    setBusy(true);
    try { const data = await request(`/api/gym/reviews?workspaceId=${encodeURIComponent(workspaceId)}&kind=${nextKind}&page=${page}`); setListing(data); setKind(nextKind); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao consultar."); } finally { setBusy(false); }
  }
  async function open(row: { id: string; label: string }) {
    setBusy(true);
    try {
      const data = await request(`/api/gym/reviews/${kind}/${row.id}?workspaceId=${encodeURIComponent(workspaceId)}`);
      setPreview(data); setTarget(row); setReason(""); setEvidence(""); setApproved(false); setClosed(false); setCharges(false); setSchedule(false); setCredit(""); setDue(""); setOpening(""); setCashDisposition(""); setTransferId(""); setCycles(String(data.snapshot.contract?.cycleCount || "0")); setRequestKey(crypto.randomUUID());
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao abrir revisão."); } finally { setBusy(false); }
  }
  async function commit(event: React.FormEvent) {
    event.preventDefault(); if (!target || !preview || busy) return;
    setBusy(true);
    try {
      const e = preview.snapshot.contract;
      const body = { workspaceId, requestKey, previewDigest: preview.digest, reason, evidenceReference: evidence, approved,
        ...(kind === "CONTRACT" ? { ...(e.providerSubscriptionId || e.recurrenceMode === "PROVIDER" ? { externalSubscriptionClosed: closed, externalChargesReviewed: charges, completedCycles: Number(cycles) } : {}), ...(BigInt(e.creditBalanceInCents) !== BigInt(0) ? { creditDisposition: credit } : {}), ...(e.scheduledPlanVersionId ? { cancelLegacyPlanSchedule: schedule } : {}), ...(due ? { nextDueDate: due } : {}) } : kind === "CASH_LINK" ? { cashMovementDisposition: cashDisposition, ...(cashDisposition === "INTERNAL_TRANSFER" ? { transferId } : {}) } : opening ? { openingAmountInCents: opening } : {}),
      };
      await request(`/api/gym/reviews/${kind}/${target.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      toast.success("Revisão registrada. Histórico preservado."); setTarget(null); setPreview(null); await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao aprovar. Reabra a revisão se os fatos mudaram."); } finally { setBusy(false); }
  }
  const contract = preview?.snapshot.contract, invoice = preview?.snapshot.invoice, account = preview?.snapshot.account;
  const duplicateOnly = contract && !contract.providerSubscriptionId && contract.recurrenceMode !== "PROVIDER" && BigInt(contract.creditBalanceInCents) === BigInt(0) && !contract.scheduledPlanVersionId;
  const draftOpening = /^\d{1,19}$/.test(opening) ? BigInt(opening) : null;
  const draftBalance = preview && (kind === "INVOICE" || kind === "ACCOUNT") ? kind === "INVOICE" ? BigInt(invoice.totalInCents) - BigInt(preview.snapshot.allocatedInCents) - (draftOpening ?? BigInt(invoice.openingPaidAmountInCents)) : BigInt(preview.snapshot.activityInCents) + (draftOpening ?? BigInt(account.initialBalanceInCents)) : null;
  return <div className="mx-auto max-w-5xl space-y-6">
    <GymPageHeader title="Revisão de contratos e saldos" description="Confira documentos e fatos financeiros antes de aprovar uma transição ou corrigir um saldo." />
    <p className="text-sm text-muted-foreground">Assinaturas externas exigem conferência manual no provedor. Esta revisão preserva contratos, faturas e recebimentos; não cancela cobranças externas nem gera receita.</p>
    <div className="flex flex-wrap gap-2" aria-label="Tipos de revisão">{(Object.keys(labels) as GymReviewKind[]).map(value => <Button key={value} disabled={busy} variant={kind === value ? "default" : "outline"} aria-pressed={kind === value} onClick={() => load(value)}>{labels[value]}</Button>)}<Button asChild variant="outline"><Link href="/gym/enrollments">Matrículas</Link></Button><Button asChild variant="outline"><Link href="/gym/finance">Financeiro</Link></Button></div>
    <Card><CardHeader><CardTitle>{labels[kind]}</CardTitle></CardHeader><CardContent className="space-y-3" aria-busy={busy}>
      {!listing.rows.length && <p className="text-sm text-muted-foreground">Nenhum registro nesta página.</p>}
      {listing.duplicateInventoryHasMore && <p role="status" className="text-sm text-muted-foreground">Duplicidades apresentadas em lotes de até 1.000 alunos. Regularize este lote e recarregue para os próximos.</p>}
      {listing.rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 border-b pb-3"><p className="min-w-0 break-words text-sm">{row.label}</p><Button variant="outline" disabled={busy} onClick={() => open(row)} aria-label={`Revisar ${row.label}`}>Revisar</Button></div>)}
      <div className="flex flex-wrap items-center justify-between gap-2"><Button variant="outline" disabled={busy || listing.page <= 1} onClick={() => load(kind, listing.page - 1)}>Anterior</Button><p className="text-sm" role="status">Página {listing.page} de {Math.max(1, listing.pages)} · {listing.total} registros</p><Button variant="outline" disabled={busy || listing.page >= listing.pages} onClick={() => load(kind, listing.page + 1)}>Próxima</Button></div>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Decisões registradas</CardTitle></CardHeader><CardContent className="space-y-3">{!listing.history.length && <p className="text-sm text-muted-foreground">Nenhuma decisão nesta página.</p>}{listing.history.map(item => <div key={item.id} className="space-y-1 border-b pb-3 text-sm"><p>{new Date(item.createdAt).toLocaleString("pt-BR")} · {item.reason}</p><p className="break-all text-muted-foreground">Registro: {item.id} · Recurso: {item.resourceId}</p><p className="break-words">Referência: {item.evidenceReference}</p></div>)}</CardContent></Card>
    <Dialog open={Boolean(target)} onOpenChange={open => { if (!open && !busy) { setTarget(null); setPreview(null); } }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Revisar {target?.label}</DialogTitle><DialogDescription>Confira os valores e apresente uma referência documental. A decisão ficará preservada no histórico.</DialogDescription></DialogHeader>
      {preview && <form onSubmit={commit} className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {contract && <><dt>Matrícula</dt><dd className="break-all">{contract.id}</dd><dt>Plano</dt><dd>{contract.planVersion.name}</dd><dt>Assinatura externa</dt><dd className="break-all">{contract.providerSubscriptionId || "Sem referência"}</dd><dt>Crédito legado</dt><dd>{currency(contract.creditBalanceInCents)}</dd><dt>Ciclos registrados</dt><dd>{contract.cycleCount}</dd><dt>Faturas preservadas</dt><dd>{preview.snapshot.invoices.length}</dd></>}
          {invoice && <><dt>Valor da obrigação</dt><dd>{currency(invoice.totalInCents)}</dd><dt>Pago registrado</dt><dd>{currency(invoice.paidAmountInCents)}</dd><dt>Recebimentos alocados</dt><dd>{currency(preview.snapshot.allocatedInCents)}</dd><dt>Pago calculado</dt><dd>{currency(preview.proposed.paidAmountInCents)}</dd><dt>Saldo calculado</dt><dd>{currency(preview.proposed.balanceRemainingInCents)}</dd></>}
          {account && <><dt>Saldo de abertura</dt><dd>{currency(account.initialBalanceInCents)}</dd><dt>Saldo registrado</dt><dd>{currency(account.balanceInCents)}</dd><dt>Movimentação líquida</dt><dd>{currency(preview.snapshot.activityInCents)}</dd><dt>Saldo calculado</dt><dd>{currency(preview.proposed.balanceInCents)}</dd></>}
          {kind === "CASH_LINK" && <><dt>Valor do movimento</dt><dd>{currency(preview.snapshot.movement.amountInCents)}</dd><dt>Data</dt><dd>{new Date(preview.snapshot.movement.createdAt).toLocaleString("pt-BR")}</dd></>}
        </dl>
        {!!preview.blockers.length && <div role="alert" className="rounded-lg bg-muted p-3 text-sm"><p>Revise os fatos individuais antes de aprovar este ajuste.</p><ul className="mt-2 list-disc space-y-1 pl-5">{preview.blockers.map(code => <li key={code}>{blockerLabels[code] || "Há uma inconsistência que exige conferência documental"}.</li>)}</ul></div>}
        {contract && preview.snapshot.liveContractsCount > 1 && <div role="alert" className="space-y-2 rounded-lg bg-muted p-3 text-sm"><p>Este aluno possui {preview.snapshot.liveContractsCount} matrículas ativas ou pausadas. Escolha o contrato que deve permanecer e cancele os demais, preservando suas obrigações.</p><Button asChild variant="outline"><Link href="/gym/enrollments">Regularizar matrículas</Link></Button></div>}
        {contract && <>
          {(contract.providerSubscriptionId || contract.recurrenceMode === "PROVIDER") && <><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={closed} onChange={e => setClosed(e.target.checked)} required />Conferi o encerramento da assinatura no provedor e possuo o comprovante.</label><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={charges} onChange={e => setCharges(e.target.checked)} required />Conferi todas as cobranças externas pendentes e seus destinos.</label><div className="space-y-2"><Label htmlFor="review-cycles">Ciclos já emitidos, incluindo os externos</Label><Input id="review-cycles" type="number" min={0} max={10000000} value={cycles} onChange={e => setCycles(e.target.value)} required /></div></>}
          {BigInt(contract.creditBalanceInCents) !== BigInt(0) && <div className="space-y-2"><Label htmlFor="review-credit">Destinação comprovada do crédito</Label><select id="review-credit" className="w-full rounded-md border bg-background p-2 text-sm" value={credit} onChange={e => setCredit(e.target.value)} required><option value="">Selecione</option><option value="EXTERNALLY_SETTLED">Liquidado fora do sistema, conforme documento</option><option value="INVALID_LEGACY_ENTRY">Lançamento legado incorreto, conforme revisão</option></select></div>}
          {contract.scheduledPlanVersionId && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={schedule} onChange={e => setSchedule(e.target.checked)} required />Retirar o agendamento legado. A nova troca será proposta com outro aceite.</label>}
          <div className="space-y-2"><Label htmlFor="review-due">Próximo vencimento local (opcional)</Label><Input id="review-due" type="date" value={due} onChange={e => setDue(e.target.value)} /><p className="text-xs text-muted-foreground">Sem data, a geração fica parada até uma configuração posterior. Nenhuma obrigação anterior será quitada.</p></div>
        </>}
        {kind === "CASH_LINK" && <><div className="space-y-2"><Label htmlFor="cash-disposition">Classificação comprovada</Label><select id="cash-disposition" className="w-full rounded-md border bg-background p-2 text-sm" value={cashDisposition} onChange={e => { setCashDisposition(e.target.value); setTransferId(""); }} required><option value="">Selecione</option><option value="INTERNAL_TRANSFER">Movimento de uma transferência interna</option><option value="STANDALONE_CASH">Movimento avulso de dinheiro, conforme documento</option></select></div>{cashDisposition === "INTERNAL_TRANSFER" && <div className="space-y-2"><Label htmlFor="cash-transfer">Transferência correspondente</Label><select id="cash-transfer" className="w-full rounded-md border bg-background p-2 text-sm" value={transferId} onChange={e => setTransferId(e.target.value)} required><option value="">Selecione a transferência conferida</option>{preview.snapshot.transfers.map((t: any) => <option key={t.id} value={t.id}>{new Date(t.transferredAt).toLocaleDateString("pt-BR")} · {t.fromAccount.name} → {t.toAccount.name} · {t.id}</option>)}</select></div>}<p className="text-xs text-muted-foreground">A classificação preserva o valor original. Depois dela, reabra a revisão da conta para conferir o saldo.</p></>}
        {(kind === "INVOICE" || kind === "ACCOUNT") && <div className="space-y-2"><Label htmlFor="review-opening">{kind === "INVOICE" ? "Valor pago antes da migração, em centavos (opcional)" : "Saldo de abertura comprovado, em centavos (opcional)"}</Label><Input id="review-opening" inputMode="numeric" pattern="[0-9]{1,19}" value={opening} onChange={e => setOpening(e.target.value)} /><p className="text-xs text-muted-foreground">Deixe vazio para manter o valor atual. A referência deve comprovar qualquer alteração. Este ajuste não cria novo recebimento.</p></div>}
        <div className="space-y-2"><Label htmlFor="review-reason">Justificativa</Label><Input id="review-reason" minLength={10} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} required /></div>
        {draftBalance !== null && <p role="status" className="text-sm">{kind === "INVOICE" ? "Saldo restante após a decisão" : "Saldo da conta após a decisão"}: {currency(draftBalance.toString())}</p>}
        <div className="space-y-2"><Label htmlFor="review-evidence">Referência do comprovante ou relatório</Label><Input id="review-evidence" minLength={5} maxLength={300} value={evidence} onChange={e => setEvidence(e.target.value)} required /></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} required />Conferi os fatos e aprovo esta decisão como gestor autorizado.</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setTarget(null)}>Voltar</Button><Button type="submit" disabled={busy || !approved || duplicateOnly || !!preview.blockers.length || (draftBalance !== null && draftBalance < BigInt(0))}>{busy ? "Registrando…" : "Registrar revisão"}</Button></div>
      </form>}
    </DialogContent></Dialog>
  </div>;
}
