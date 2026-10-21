"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const documentSchema = z.object({ id: z.string().min(1), type: z.enum(["TERMS", "PRIVACY"]), version: z.string().min(1), title: z.string(), content: z.string(), contentHash: z.string().regex(/^[a-f0-9]{64}$/) });
const complianceSchema = z.object({ compliance: z.object({ isCompliant: z.boolean(), pendingDocuments: z.array(documentSchema) }) });
type PendingDoc = z.infer<typeof documentSchema>;

export function LegalReacceptanceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const requestLock = useRef(false);

  const reloadDocuments = async (signal?: AbortSignal) => {
    const res = await fetch("/api/user/privacy", { cache: "no-store", signal });
    if (!res.ok) throw new Error("Não foi possível consultar os documentos. Tente recarregar.");
    const parsed = complianceSchema.safeParse(await res.json());
    if (!parsed.success || parsed.data.compliance.isCompliant !== (parsed.data.compliance.pendingDocuments.length === 0)) throw new Error("Não foi possível validar os documentos. Tente recarregar.");
    if (signal?.aborted) return;
    setPendingDocs(parsed.data.compliance.pendingDocuments);
    setAcceptedCheckbox(false);
    setNeedsReload(false);
    setIsOpen(!parsed.data.compliance.isCompliant);
  };

  useEffect(() => {
    const controller = new AbortController();
    // The component also appears on public pages; unauthenticated checks do not open a dialog.
    void reloadDocuments(controller.signal).catch(() => {});
    return () => controller.abort();
  }, []);

  if (!isOpen || pendingDocs.length === 0) return null;
  const currentDoc = pendingDocs[0];

  const retryReload = async () => {
    if (requestLock.current) return;
    requestLock.current = true;
    setIsSubmitting(true);
    try { await reloadDocuments(); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Erro ao consultar documentos."); }
    finally { requestLock.current = false; setIsSubmitting(false); }
  };

  const handleAccept = async () => {
    if (requestLock.current || !acceptedCheckbox || needsReload) return;
    requestLock.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/user/privacy/accept", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: currentDoc.id, documentType: currentDoc.type, documentVersion: currentDoc.version, documentHash: currentDoc.contentHash, accepted: true }),
      });
      if (res.status === 409) {
        setAcceptedCheckbox(false);
        setNeedsReload(true);
        setError("O documento mudou. Leia a versão atual e confirme novamente.");
        await reloadDocuments();
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(typeof body?.error === "string" ? body.error : "Erro ao registrar aceite. Tente novamente.");
      }
      const result = await res.json();
      if (result?.success !== true) throw new Error("Não foi possível confirmar o registro do aceite.");
      // A new document may have been published while this request was in flight.
      setAcceptedCheckbox(false);
      setNeedsReload(true);
      await reloadDocuments();
      toast.success("Atualização aceita com sucesso!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar aceite. Tente novamente.");
    } finally { requestLock.current = false; setIsSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto flex flex-col p-6 gap-4" showCloseButton={false}>
        <DialogHeader className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">Governança e Transparência</span>
          <DialogTitle className="text-xl font-extrabold tracking-tight">{currentDoc.title} (v{currentDoc.version})</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Atualizamos nossos termos legais. Leia o documento e confirme o seu aceite para continuar.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 shrink overflow-y-auto rounded-xl border border-border/50 bg-secondary/20 p-4 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60">{currentDoc.content}</div>
        {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
        <FieldGroup className="gap-3 pt-2">
          <Field orientation="horizontal">
            <Checkbox id="confirmReacceptance" checked={acceptedCheckbox} disabled={isSubmitting || needsReload} onCheckedChange={checked => setAcceptedCheckbox(checked === true)} className="mt-0.5" />
            <FieldLabel htmlFor="confirmReacceptance" className="text-xs leading-snug">Li, compreendi e concordo integralmente com a versão {currentDoc.version} de {currentDoc.title}.</FieldLabel>
          </Field>
          <div className="text-xs text-muted-foreground">Você pode consultar a íntegra e histórico na nossa <Link href="/privacidade" target="_blank" className="text-primary underline">Central de Privacidade</Link>.</div>
        </FieldGroup>
        <DialogFooter className="pt-2">
          {needsReload ? <Button onClick={retryReload} disabled={isSubmitting}>{isSubmitting ? "Recarregando..." : "Recarregar documentos"}</Button> :
            <Button onClick={handleAccept} disabled={!acceptedCheckbox || isSubmitting} className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold gap-2">
              {isSubmitting ? <><Loader2 className="size-4 animate-spin" />Registrando Aceite...</> : <>Concordar e Continuar<ArrowRight className="size-4" /></>}
            </Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
