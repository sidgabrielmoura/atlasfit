"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const contractSchema = z.object({ enrollmentId: z.string(), workspaceId: z.string(), workspaceName: z.string(), studentName: z.string(), content: z.string(), contractDigest: z.string().regex(/^[a-f0-9]{64}$/), signedAt: z.string().nullable(), status: z.string() });
const errorSchema = z.object({ error: z.object({ message: z.string() }) });
function errorMessage(data: unknown) { const error = errorSchema.safeParse(data); return error.success ? error.data.error.message : "Não foi possível carregar ou registrar o contrato."; }

export function GymContractAcceptance({ workspaceId, enrollmentId }: { workspaceId: string; enrollmentId: string }) {
  const router = useRouter(); const [open, setOpen] = useState(false); const [reload, setReload] = useState(0);
  const [contract, setContract] = useState<z.infer<typeof contractSchema> | null>(null); const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false); const [saving, setSaving] = useState(false);
  useEffect(() => {
    setContract(null); setError(null); setAccepted(false); if (!open) return;
    const controller = new AbortController();
    async function load() { try {
      const response = await fetch(`/api/gym/enrollments/${encodeURIComponent(enrollmentId)}/accept?workspaceId=${encodeURIComponent(workspaceId)}`, { signal: controller.signal }); const data: unknown = await response.json();
      if (!response.ok) throw new Error(errorMessage(data)); const parsed = contractSchema.parse(data);
      if (!controller.signal.aborted) setContract(parsed);
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Erro ao carregar contrato."); } }
    void load(); return () => controller.abort();
  }, [open, reload, workspaceId, enrollmentId]);
  async function confirm() {
    if (!contract || !accepted || saving) return; setSaving(true);
    try {
      const response = await fetch(`/api/gym/enrollments/${encodeURIComponent(enrollmentId)}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, accepted: true, contractDigest: contract.contractDigest }) }); const data: unknown = await response.json();
      if (!response.ok) { if (response.status === 409) setReload(value => value + 1); throw new Error(errorMessage(data)); }
      const updated = contractSchema.parse(data); if (!updated.signedAt) throw new Error("O servidor não confirmou o registro do aceite.");
      toast.success(updated.status === "PENDING_ACTIVATION" ? "Contrato confirmado. A matrícula aguarda ativação." : "O aceite registrado foi confirmado."); setOpen(false); router.refresh();
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Erro ao registrar aceite."); }
    finally { setSaving(false); }
  }
  const confirmationId = `gym-contract-confirm-${enrollmentId}`;
  return <Dialog open={open} onOpenChange={value => { if (!saving) setOpen(value); }}>
    <DialogTrigger asChild><Button size="sm" variant="outline">Consultar contrato</Button></DialogTrigger>
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader><DialogTitle>Contrato da matrícula</DialogTitle><DialogDescription>{contract ? `${contract.studentName} · ${contract.workspaceName}` : "Confira as condições antes de confirmar."}</DialogDescription></DialogHeader>
      {error ? <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></div> : contract ? <div className="space-y-4">
        <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap break-words rounded-md border p-4 font-sans text-sm leading-relaxed">{contract.content}</pre>
        {contract.signedAt ? <p role="status" className="text-sm">Aceite registrado em {new Date(contract.signedAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}.</p> : <div className="flex items-start gap-3"><Checkbox id={confirmationId} checked={accepted} onCheckedChange={value => setAccepted(value === true)} disabled={saving} /><Label htmlFor={confirmationId} className="text-sm leading-relaxed">Li e aceito as condições exibidas.</Label></div>}
        <p className="text-sm text-muted-foreground">O aceite não comprova pagamento nem libera acesso físico. A academia confirma o recebimento e a ativação separadamente.</p>
      </div> : <p role="status" className="py-6 text-sm">Carregando contrato…</p>}
      <DialogFooter><Button variant="outline" disabled={saving} onClick={() => setOpen(false)}>Fechar</Button>{contract && !contract.signedAt && <Button disabled={!accepted || saving} onClick={confirm}>{saving ? "Registrando…" : "Confirmar contrato"}</Button>}</DialogFooter>
    </DialogContent>
  </Dialog>;
}
