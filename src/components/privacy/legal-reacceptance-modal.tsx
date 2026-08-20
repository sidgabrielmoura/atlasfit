"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PendingDoc {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  contentHash: string;
}

export function LegalReacceptanceModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [acceptedCheckbox, setAcceptedCheckbox] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkCompliance() {
      try {
        const res = await fetch("/api/user/privacy");
        if (!res.ok) return;
        const data = await res.json();
        if (data?.compliance && !data.compliance.isCompliant && data.compliance.pendingDocuments?.length > 0) {
          setPendingDocs(data.compliance.pendingDocuments);
          setIsOpen(true);
        }
      } catch (err) {
        // Silent fail for non-authenticated sessions
      }
    }

    checkCompliance();
  }, []);

  if (!isOpen || pendingDocs.length === 0) return null;

  const currentDoc = pendingDocs[0];

  const handleAccept = async () => {
    if (!acceptedCheckbox) {
      toast.error("Por favor, marque a caixa de confirmação para prosseguir.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/user/privacy/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentType: currentDoc.type,
          documentVersion: currentDoc.version,
        }),
      });

      if (!res.ok) {
        throw new Error("Erro ao registrar aceite.");
      }

      toast.success("Atualização aceita com sucesso!");
      const nextPending = pendingDocs.slice(1);
      if (nextPending.length > 0) {
        setPendingDocs(nextPending);
        setAcceptedCheckbox(false);
      } else {
        setIsOpen(false);
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao registrar aceite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { }}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6 gap-4" showCloseButton={false}>
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <span className="text-xs font-bold uppercase tracking-wider">Governança e Transparência</span>
          </div>
          <DialogTitle className="text-xl font-extrabold tracking-tight">
            {currentDoc.title} (v{currentDoc.version})
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Atualizamos nossos termos legais. Para continuar utilizando a plataforma com total segurança e conformidade jurídica, leia o documento e confirme o seu aceite.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto rounded-xl border border-border/50 bg-secondary/20 p-4 text-xs font-sans text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-60">
          {currentDoc.content}
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="confirmReacceptance"
              checked={acceptedCheckbox}
              onCheckedChange={(checked) => setAcceptedCheckbox(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="confirmReacceptance" className="text-xs text-foreground cursor-pointer select-none leading-snug">
              Li, compreendi e concordo integralmente com a versão {currentDoc.version} de {currentDoc.title}.
            </label>
          </div>

          <div className="text-[11px] text-muted-foreground">
            Você pode consultar a íntegra e histórico na nossa{" "}
            <Link href="/privacidade" target="_blank" className="text-primary underline">
              Central de Privacidade
            </Link>
            .
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button
            onClick={handleAccept}
            disabled={!acceptedCheckbox || isSubmitting}
            className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Registrando Aceite...
              </>
            ) : (
              <>
                Concordar e Continuar
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
