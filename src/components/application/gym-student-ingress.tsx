"use client";
import { useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { gymStudentInvitationIssuedSchema } from "@/modules/workspaces/domain/gym-student-ingress";
import { guardianPortalError } from "@/modules/workspaces/domain/guardian-portal";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function GymStudentIngress({ workspaceId, studentMemberId, hasEmail, active }: { workspaceId: string; studentMemberId: string; hasEmail: boolean; active: boolean }) {
  const [delivery, setDelivery] = useState<"MANUAL_LINK" | "EMAIL" | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<z.infer<typeof gymStudentInvitationIssuedSchema> | null>(null); const lock = useRef(false), requestKey = useRef("");
  function open(mode: "MANUAL_LINK" | "EMAIL") { requestKey.current = crypto.randomUUID(); setError(null); setResult(null); setDelivery(mode); }
  async function submit() {
    if (!delivery || lock.current) return; lock.current = true; setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/gym/students/${encodeURIComponent(studentMemberId)}/invite`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, requestKey: requestKey.current, confirmed: true, delivery }) });
      const body: unknown = await response.json(); if (!response.ok) throw new Error(guardianPortalError(body, "Não foi possível emitir o convite."));
      const issued = gymStudentInvitationIssuedSchema.parse(body); setResult(issued); setDelivery(null);
      toast.success(issued.delivery === "EMAIL" ? "Convite colocado na fila de envio." : issued.delivery === "MANUAL_LINK" ? "Link emitido para entrega ao aluno." : "A conta já possui acesso próprio.");
    } catch (failure) { setError(failure instanceof z.ZodError ? "Resposta do convite inválida. Tente novamente." : failure instanceof Error ? failure.message : "Falha ao emitir convite."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Card><CardHeader><CardTitle>Acesso ao portal do aluno</CardTitle><CardDescription>Alunos adultos configuram sua própria senha e aceitam os documentos exibidos. Quem já possui conta usa seu login; o convite não altera sua senha.</CardDescription></CardHeader><CardContent className="space-y-3">
    {!active && <p className="text-sm text-muted-foreground">Regularize o vínculo do aluno antes de emitir um convite.</p>}
    <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy || !active} onClick={() => open("MANUAL_LINK")}>Emitir / reemitir link do aluno</Button><Button type="button" disabled={busy || !active || !hasEmail} onClick={() => open("EMAIL")}>Enviar convite por e-mail</Button></div>
    {!hasEmail && <p className="text-sm text-muted-foreground">Entregue o link manualmente; o aluno informará seu próprio e-mail no ingresso.</p>}
    {error && !delivery && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {result?.delivery === "LOGIN_OWN" && <p className="text-sm">{result.message} <Link href={result.loginPath} className="underline">Página de login</Link></p>}
    {result?.delivery === "EMAIL" && <p role="status" className="text-sm">Convite na fila ({result.status}). A confirmação da fila não comprova entrega. Válido até {new Date(result.expiresAt).toLocaleString("pt-BR")}.</p>}
    {result?.delivery === "MANUAL_LINK" && <div className="space-y-2"><p className="text-sm">Entregue somente ao aluno conferido. Válido até {new Date(result.expiresAt).toLocaleString("pt-BR")}; um novo convite invalida o anterior.</p><Input aria-label="Link de ingresso do aluno" readOnly value={typeof window === "undefined" ? result.invitationPath : window.location.origin + result.invitationPath} /><Button type="button" variant="outline" onClick={() => { void navigator.clipboard.writeText(window.location.origin + result.invitationPath).then(() => toast.success("Link copiado.")).catch(() => toast.error("Selecione o link manualmente para copiar.")); }}>Copiar link do aluno</Button></div>}
  </CardContent><Dialog open={delivery !== null} onOpenChange={value => { if (!value && !busy) setDelivery(null); }}><DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>Emitir convite de acesso do aluno?</DialogTitle><DialogDescription>Válido por 48 horas e uso único. Um novo convite invalida os anteriores. {delivery === "EMAIL" ? "O envio usa o e-mail cadastrado e a fila de entrega." : "Entregue o link somente ao aluno cuja identidade foi conferida."}</DialogDescription></DialogHeader>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={() => setDelivery(null)}>Cancelar</Button><Button type="button" disabled={busy} onClick={() => void submit()}>{busy ? "Emitindo…" : "Confirmar emissão"}</Button></DialogFooter></DialogContent></Dialog></Card>;
}
