"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { guardianInvitationInfoSchema } from "@/modules/workspaces/domain/guardian-ingress";
import { guardianPortalError } from "@/modules/workspaces/domain/guardian-portal";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function GuardianInviteClient() {
  const token = useSearchParams().get("token") || "";
  const { data: session, status } = useSession();
  const [info, setInfo] = useState<z.infer<typeof guardianInvitationInfoSchema> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [cpf, setCpf] = useState(""); const [birthDate, setBirthDate] = useState("");
  const [password, setPassword] = useState(""); const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [terms, setTerms] = useState(false); const [privacy, setPrivacy] = useState(false);
  const [document, setDocument] = useState<"terms" | "privacy" | null>(null);
  const [confirming, setConfirming] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false); const lock = useRef(false);
  const destination = `/auth/guardian-invite?token=${token}`;
  const login = `/auth/gym?callbackUrl=${encodeURIComponent(destination)}`;
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setInfo(null); setError(null); setTerms(false); setPrivacy(false);
    void (async () => {
      try {
        const response = await fetch(`/api/guardian/ingress?token=${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(guardianPortalError(body, "Convite indisponível."));
        const parsed = guardianInvitationInfoSchema.parse(body);
        if (!controller.signal.aborted) setInfo(parsed);
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof z.ZodError ? "Resposta indisponível. Tente novamente." : failure instanceof Error ? failure.message : "Falha ao carregar convite."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    })(); return () => controller.abort();
  }, [token, reload]);
  async function claim() {
    if (!info || lock.current || !terms || !privacy || status === "loading") return;
    lock.current = true; setSubmitting(true); setSubmissionError(null);
    try {
      const mode = status === "authenticated" ? "LINK" : "CREATE";
      const response = await fetch("/api/guardian/ingress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, mode, ...(mode === "CREATE" ? { cpf, birthDate, password } : {}), acceptedTerms: terms, acceptedPrivacy: privacy, termsId: info.terms.id, termsHash: info.terms.hash, privacyId: info.privacy.id, privacyHash: info.privacy.hash }) });
      const body: unknown = await response.json();
      if (!response.ok) { if (response.status === 409) setReload(value => value + 1); throw new Error(guardianPortalError(body, "Falha ao concluir o vínculo.")); }
      z.object({ success: z.literal(true), destination: z.literal("/guardian/dependents") }).parse(body);
      setPassword(""); setPasswordConfirmation(""); setSuccess(true); setConfirming(false);
      toast.success("Vínculo do responsável confirmado.");
    } catch (failure) { setSubmissionError(failure instanceof z.ZodError ? "Resposta inválida. Confira o vínculo antes de tentar novamente." : failure instanceof Error ? failure.message : "Falha ao concluir o vínculo."); setConfirming(false); }
    finally { lock.current = false; setSubmitting(false); }
  }
  if (success) return <Card className="w-full max-w-xl"><CardHeader><CardTitle>Vínculo confirmado</CardTitle><CardDescription>Sua conta foi vinculada ao responsável conferido pela academia.</CardDescription></CardHeader><CardContent><Button asChild><Link href={status === "authenticated" ? "/guardian/dependents" : "/auth/gym?callbackUrl=%2Fguardian%2Fdependents"}>{status === "authenticated" ? "Abrir meus dependentes" : "Entrar com minha conta"}</Link></Button></CardContent></Card>;
  return <Card className="w-full max-w-xl">
    <CardHeader><CardTitle>Convite do responsável</CardTitle><CardDescription>Confirme sua própria conta para acompanhar o dependente na {info?.workspaceName || "academia"}.</CardDescription></CardHeader>
    <CardContent className="flex flex-col gap-5">
      {(error || submissionError) && <Alert variant="destructive"><AlertDescription>{submissionError || error}<Button variant="outline" disabled={loading || submitting} onClick={() => { setSubmissionError(null); setReload(value => value + 1); }}>Tentar novamente</Button></AlertDescription></Alert>}
      {loading || status === "loading" ? <div role="status" aria-label="Validando convite" className="flex flex-col gap-5"><Skeleton className="h-6 w-56" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /><Skeleton className="h-24 w-full" /></div> : info && <>
        <p className="text-sm">Conta destinatária: <strong className="break-all">{info.email}</strong>. Convite válido até {new Date(info.expiresAt).toLocaleString("pt-BR")}.</p>
        {status === "authenticated" ? <p className="text-sm text-muted-foreground">Conta autenticada: {session?.user?.email}. O vínculo exige o mesmo e-mail e a identidade adulta conferida.</p> : <Button asChild variant="outline"><Link href={login}>Já tenho conta: entrar para vincular</Link></Button>}
        <form onSubmit={event => { event.preventDefault(); if (status !== "authenticated" && password !== passwordConfirmation) { setSubmissionError("As senhas não coincidem."); return; } setConfirming(true); }} className="flex flex-col gap-5">
          <FieldGroup>
            {status !== "authenticated" && <>
              <Field><FieldLabel htmlFor="guardian-ingress-cpf">Seu CPF</FieldLabel><Input id="guardian-ingress-cpf" value={cpf} onChange={event => setCpf(event.target.value)} required inputMode="numeric" maxLength={20} disabled={submitting} /></Field>
              <Field><FieldLabel htmlFor="guardian-ingress-birth">Seu nascimento (18 anos ou mais)</FieldLabel><Input id="guardian-ingress-birth" type="date" value={birthDate} onChange={event => setBirthDate(event.target.value)} required disabled={submitting} /></Field>
              <Field><FieldLabel htmlFor="guardian-ingress-password">Senha da sua nova conta</FieldLabel><Input id="guardian-ingress-password" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} onChange={event => setPassword(event.target.value)} required disabled={submitting} /></Field>
              <Field><FieldLabel htmlFor="guardian-ingress-password-confirmation">Confirmar senha</FieldLabel><Input id="guardian-ingress-password-confirmation" type="password" autoComplete="new-password" minLength={8} maxLength={72} value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} required disabled={submitting} /></Field>
            </>}
            <Field orientation="horizontal"><Checkbox id="guardian-ingress-terms" checked={terms} onCheckedChange={value => setTerms(value === true)} disabled={submitting} /><FieldLabel htmlFor="guardian-ingress-terms">Li e aceito os termos para minha própria conta.</FieldLabel></Field>
            <Button type="button" variant="outline" onClick={() => setDocument("terms")}>Ler termos — {info.terms.version}</Button>
            <Field orientation="horizontal"><Checkbox id="guardian-ingress-privacy" checked={privacy} onCheckedChange={value => setPrivacy(value === true)} disabled={submitting} /><FieldLabel htmlFor="guardian-ingress-privacy">Li e estou ciente da política de privacidade para minha conta.</FieldLabel></Field>
            <Button type="button" variant="outline" onClick={() => setDocument("privacy")}>Ler privacidade — {info.privacy.version}</Button>
          </FieldGroup>
          <Button disabled={submitting || !terms || !privacy} type="submit">{submitting ? <><Loader2 data-icon="inline-start" className="animate-spin" /> Concluindo…</> : status === "authenticated" ? "Confirmar vínculo" : "Criar minha conta e vincular"}</Button>
        </form>
      </>}
    </CardContent>
    <Dialog open={Boolean(document)} onOpenChange={open => { if (!open) setDocument(null); }}><DialogContent className="max-h-[85dvh] overflow-y-auto"><DialogHeader><DialogTitle>{document && info?.[document].title}</DialogTitle><DialogDescription>Versão {document && info?.[document].version}</DialogDescription></DialogHeader><div className="whitespace-pre-wrap break-words text-sm">{document && info?.[document].content}</div></DialogContent></Dialog>
    <Dialog open={confirming} onOpenChange={open => { if (!submitting) setConfirming(open); }}><DialogContent showCloseButton={!submitting}><DialogHeader><DialogTitle>Confirmar sua conta de responsável?</DialogTitle><DialogDescription>Você confirma os documentos da sua conta e o vínculo conferido pela academia. Os poderes são os registrados na ficha do responsável.</DialogDescription></DialogHeader><DialogFooter><Button autoFocus variant="outline" disabled={submitting} onClick={() => setConfirming(false)}>Cancelar</Button><Button disabled={submitting} onClick={() => { void claim(); }}>{submitting ? "Concluindo…" : "Confirmar"}</Button></DialogFooter></DialogContent></Dialog>
  </Card>;
}
