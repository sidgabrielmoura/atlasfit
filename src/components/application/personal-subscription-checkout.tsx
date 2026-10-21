"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { isValidCpfCnpj } from "@/lib/cpf-validator";

export function PersonalSubscriptionCheckout({ plan, onClose }: {
  plan: { id: string; name: string } | null;
  onClose: () => void;
}) {
  const [taxId, setTaxId] = useState("");
  const [cellphone, setCellphone] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!plan || pending) return;
    if (!isValidCpfCnpj(taxId)) { setError("Informe um CPF ou CNPJ válido do pagador."); return; }
    const phone = cellphone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    if (!/^\d{2}9\d{8}$/.test(phone)) { setError("Informe um celular com DDD, com 11 dígitos."); return; }
    setPending(true); setError("");
    try {
      const response = await fetch("/api/personal/subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, billing: { taxId, cellphone } }),
      });
      if (!response.ok) throw new Error((await response.text()) || "Não foi possível iniciar o pagamento.");
      const result = await response.json();
      if (typeof result.checkoutUrl !== "string" || !result.checkoutUrl.startsWith("https://")) throw new Error("O gateway não retornou um checkout válido.");
      toast.success("Checkout gerado. Abrindo pagamento...");
      window.location.assign(result.checkoutUrl);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível iniciar o pagamento.");
      setPending(false);
    }
  }

  return <Dialog open={plan !== null} onOpenChange={open => { if (!open && !pending) { setError(""); onClose(); } }}>
    <DialogContent onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle>Assinar {plan?.name}</DialogTitle>
        <DialogDescription>Confirme os dados do pagador para abrir o checkout seguro.</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-6">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="personal-billing-tax-id">CPF ou CNPJ do pagador</FieldLabel>
            <Input id="personal-billing-tax-id" value={taxId} onChange={event => setTaxId(event.target.value)} inputMode="numeric" maxLength={18} required disabled={pending} autoComplete="off" />
          </Field>
          <Field>
            <FieldLabel htmlFor="personal-billing-cellphone">Celular com DDD</FieldLabel>
            <Input id="personal-billing-cellphone" value={cellphone} onChange={event => setCellphone(event.target.value)} type="tel" autoComplete="tel-national" maxLength={20} required disabled={pending} />
            <FieldDescription>Os dados são usados neste pagamento e não alteram seu perfil.</FieldDescription>
          </Field>
        </FieldGroup>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">{pending ? "Abrindo checkout..." : "Continuar para pagamento"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
