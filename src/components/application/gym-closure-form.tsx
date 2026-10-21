"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Preview = { alreadyClosed: boolean; canClose: boolean; retained: { members: number; contracts: number; invoices: number; files: number; objects: number }; blockers: Record<string, number | boolean> };
type ClosureRequest = { workspaceId: string; requestKey: string; confirmationSlug: string; reason: string };
const blockerLabels: Record<string, string> = { externalLicense: "assinatura externa da licença", externalEnrollments: "assinaturas externas de matrículas", externalMembers: "assinaturas externas de membros", providerAccount: "conta de gateway legada", externalBillings: "cobranças externas pendentes", openCashDrawers: "caixas abertos", runningImports: "importações em andamento" };

export function GymClosureForm({ workspaceId, slug }: { workspaceId: string; slug: string }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null), [reason, setReason] = useState(""), [confirmation, setConfirmation] = useState("");
  const [receipt, setReceipt] = useState(""), [purgeAfter, setPurgeAfter] = useState(""), [uncertain, setUncertain] = useState(false);
  const submitted = useRef<ClosureRequest | null>(null);
  async function loadPreview() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/gym/settings/closure?workspaceId=${encodeURIComponent(workspaceId)}`, { cache: "no-store" });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "Não foi possível conferir o encerramento.");
      setPreview(result.data); setOpen(true);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Falha ao conferir a academia."); }
    finally { setBusy(false); }
  }
  async function closeWorkspace() {
    if (busy) return;
    const body = submitted.current ?? { workspaceId, requestKey: crypto.randomUUID(), confirmationSlug: confirmation.trim(), reason: reason.trim() };
    submitted.current = body; setBusy(true); setError("");
    try {
      const response = await fetch("/api/gym/settings/closure", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status < 500) { submitted.current = null; setUncertain(false); }
        throw new Error(result.error?.message || "Não foi possível confirmar o encerramento.");
      }
      setReceipt(result.data.receiptId); setPurgeAfter(result.data.purgeAfter); setUncertain(false); setOpen(false);
    } catch (failure) {
      if (submitted.current) setUncertain(true);
      setError(failure instanceof Error ? failure.message : "Resposta indisponível. Repita a mesma solicitação para conferir o recibo.");
    } finally { setBusy(false); }
  }
  return <Card className="min-w-0 border-border/50">
    <CardHeader><CardTitle className="text-sm">Encerramento da academia</CardTitle><CardDescription>Interrompe acesso, novas mensalidades e convites. Os dados e arquivos da academia serão eliminados em até um mês após o encerramento.</CardDescription></CardHeader>
    <CardContent className="space-y-3">
      {receipt ? <div role="status" className="space-y-2 text-sm"><p>Academia encerrada. Recibo: <span className="break-all">{receipt}</span>.</p>{purgeAfter && <p>Os dados serão eliminados até {new Date(purgeAfter).toLocaleString("pt-BR")}.</p>}<a href="/select-workspace" className="underline">Selecionar outro workspace</a></div> : <Button variant="outline" disabled={busy} onClick={loadPreview}>{busy ? "Conferindo…" : "Revisar encerramento"}</Button>}
      {error && !open && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <AlertDialog open={open} onOpenChange={value => { if (!busy) setOpen(value); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Encerrar a academia?</AlertDialogTitle><AlertDialogDescription>Os dados, contratos, histórico e arquivos serão eliminados definitivamente em até um mês. O superadmin pode antecipar a purga. Contas utilizadas em outros workspaces serão preservadas. Regularize as assinaturas externas antes de encerrar.</AlertDialogDescription></AlertDialogHeader>
          {preview?.alreadyClosed ? <p role="status">Academia já encerrada. Consulte a administração para revisar o histórico.</p> : <>
            {preview && <p className="text-sm">Ficarão disponíveis até a purga {preview.retained.members} vínculos, {preview.retained.contracts} contratos, {preview.retained.invoices} faturas e {preview.retained.files} arquivos.</p>}
            {preview && !preview.canClose && <div role="alert" className="text-sm"><p>Regularize antes de encerrar:</p><ul className="list-disc pl-5">{Object.entries(preview.blockers).filter(([, value]) => Boolean(value)).map(([key]) => <li key={key}>{blockerLabels[key] || key}</li>)}</ul></div>}
            <div className="space-y-1"><label htmlFor="gym-closure-reason" className="text-sm">Motivo do encerramento</label><Input id="gym-closure-reason" value={reason} maxLength={2000} disabled={busy || uncertain} onChange={event => setReason(event.target.value)} /></div>
            <div className="space-y-1"><label htmlFor="gym-closure-confirmation" className="break-all text-sm">Digite {slug} para confirmar</label><Input id="gym-closure-confirmation" value={confirmation} disabled={busy || uncertain} onChange={event => setConfirmation(event.target.value)} /></div>
          </>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {uncertain && <p className="text-sm">A resposta não confirmou o resultado. Repita a mesma solicitação; o recibo impede executar o encerramento duas vezes.</p>}
          <AlertDialogFooter><AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel><Button variant="destructive" disabled={busy || preview?.alreadyClosed || !preview?.canClose || confirmation.trim() !== slug || reason.trim().length < 10} onClick={closeWorkspace}>{busy ? "Encerrando…" : uncertain ? "Conferir mesma solicitação" : "Confirmar encerramento"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CardContent>
  </Card>;
}
