"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { guardianStaffItemSchema, guardianInvitationIssuedSchema } from "@/modules/workspaces/domain/guardian-ingress";
import { guardianPortalError } from "@/modules/workspaces/domain/guardian-portal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

type Guardian = z.infer<typeof guardianStaffItemSchema>;
export function GymGuardianIngress({ workspaceId, studentMemberId }: { workspaceId: string; studentMemberId: string }) {
  const [rows, setRows] = useState<Guardian[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState<{ guardian: Guardian; action: "VERIFY" | "INVITE" | "CONTACT" } | null>(null);
  const [notes, setNotes] = useState(""); const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false); const [copying, setCopying] = useState(false); const lock = useRef(false);
  const [issued, setIssued] = useState<z.infer<typeof guardianInvitationIssuedSchema> | null>(null);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null); setRows([]);
    void (async () => {
      try {
        const response = await fetch(`/api/gym/students/${encodeURIComponent(studentMemberId)}/guardians?workspaceId=${encodeURIComponent(workspaceId)}`, { signal: controller.signal, cache: "no-store" });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(guardianPortalError(body, "Falha ao carregar responsáveis."));
        const list = z.array(guardianStaffItemSchema).parse(body);
        if (!controller.signal.aborted) setRows(list);
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof z.ZodError ? "Resposta indisponível. Tente novamente." : failure instanceof Error ? failure.message : "Falha ao carregar responsáveis."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })(); return () => controller.abort();
  }, [workspaceId, studentMemberId, reload]);
  async function submit() {
    if (!selected || lock.current) return;
    lock.current = true; setBusy(true); setError(null); setIssued(null);
    try {
      const { guardian, action } = selected;
      const suffix = action === "VERIFY" ? "/verify" : action === "INVITE" ? "/invite" : "";
      const response = await fetch(`/api/gym/guardians/${guardian.id}${suffix}`, { method: action === "CONTACT" ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, ...(action === "VERIFY" ? { notes } : action === "INVITE" ? { confirmed: true } : { email }) }) });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(guardianPortalError(body, "Falha na operação do responsável."));
      if (action === "INVITE") setIssued(guardianInvitationIssuedSchema.parse(body));
      else guardianStaffItemSchema.parse(body);
      toast.success(action === "INVITE" ? "Convite emitido. Entregue o link ao responsável conferido." : action === "VERIFY" ? "Conferência registrada." : "Contato atualizado. Faça uma nova conferência antes do convite.");
      setSelected(null); setReload(value => value + 1);
    } catch (failure) { setError(failure instanceof z.ZodError ? "Resposta inválida. Recarregue e confira o resultado." : failure instanceof Error ? failure.message : "Falha na operação."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Card>
    <CardHeader><CardTitle>Ingresso dos responsáveis</CardTitle><CardDescription>Confira presencialmente a identidade e a representação antes de entregar o convite. A conta do menor continua sem acesso próprio.</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}<Button type="button" variant="outline" disabled={loading || busy} onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></AlertDescription></Alert>}
      {loading ? <div role="status" aria-label="Carregando responsáveis" className="flex flex-col gap-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-24 w-full" /></div> : !error && rows.length === 0 ? <Empty><EmptyHeader><EmptyTitle>Nenhum responsável cadastrado</EmptyTitle><EmptyDescription>Cadastre o responsável na ficha do aluno antes de iniciar seu ingresso.</EmptyDescription></EmptyHeader></Empty> : rows.map(guardian => <div key={guardian.id} className="flex flex-col gap-3 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium">{guardian.name} — {guardian.relationship}</span><Badge variant={guardian.verifiedAt ? "secondary" : "outline"}>{guardian.verifiedAt ? "Conferido" : "Conferência pendente"}</Badge></div>
        <p className="break-all text-sm text-muted-foreground">{guardian.email || "E-mail não informado"}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => { setEmail(guardian.email || ""); setSelected({ guardian, action: "CONTACT" }); }}>Atualizar e-mail</Button>
          <Button type="button" variant="outline" onClick={() => { setNotes(""); setSelected({ guardian, action: "VERIFY" }); }}>Registrar conferência</Button>
          <Button type="button" disabled={!guardian.verifiedAt || !guardian.email} onClick={() => setSelected({ guardian, action: "INVITE" })}>Emitir / reemitir convite</Button>
        </div>
      </div>)}
      {issued && <Alert><AlertDescription><div className="flex flex-col gap-3"><p>Entregue este link somente ao responsável conferido. Válido até {new Date(issued.expiresAt).toLocaleString("pt-BR")}. Um novo convite invalida o anterior.</p><Input aria-label="Link de ingresso do responsável" readOnly value={typeof window === "undefined" ? issued.invitationPath : window.location.origin + issued.invitationPath} /><Button type="button" variant="outline" disabled={copying} onClick={() => { setCopying(true); void navigator.clipboard.writeText(window.location.origin + issued.invitationPath).then(() => toast.success("Link copiado.")).catch(() => toast.error("Não foi possível copiar. Selecione o link manualmente.")).finally(() => setCopying(false)); }}>{copying ? "Copiando…" : "Copiar link"}</Button></div></AlertDescription></Alert>}
    </CardContent>
    <Dialog open={Boolean(selected)} onOpenChange={open => { if (!open && !busy) setSelected(null); }}><DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>{selected?.action === "INVITE" ? "Emitir convite do responsável?" : selected?.action === "VERIFY" ? "Registrar conferência de representação" : "Atualizar contato do responsável"}</DialogTitle><DialogDescription>{selected?.guardian.name}. {selected?.action === "INVITE" ? "Este convite vence em 48 horas e invalida o anterior. Entregue-o ao destinatário conferido; quem já tem conta precisa entrar nela." : selected?.action === "VERIFY" ? "Registre quais documentos de identidade e representação você conferiu. Esta ação depende da conferência realizada pelo operador." : "Alterar o e-mail retira a conferência anterior e invalida convites pendentes."}</DialogDescription></DialogHeader>
      <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); void submit(); }}>
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
        <FieldGroup>{selected?.action === "VERIFY" && <Field><FieldLabel htmlFor="guardian-verification-notes">Registro da conferência</FieldLabel><Textarea id="guardian-verification-notes" value={notes} onChange={event => setNotes(event.target.value)} required minLength={10} maxLength={2000} disabled={busy} /></Field>}{selected?.action === "CONTACT" && <Field><FieldLabel htmlFor="guardian-contact-email">E-mail conferido do responsável</FieldLabel><Input id="guardian-contact-email" type="email" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} disabled={busy} /></Field>}</FieldGroup>
        <DialogFooter><Button autoFocus type="button" variant="outline" disabled={busy} onClick={() => setSelected(null)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? <><Loader2 data-icon="inline-start" className="animate-spin" /> Registrando…</> : "Confirmar"}</Button></DialogFooter>
      </form>
    </DialogContent></Dialog>
  </Card>;
}
