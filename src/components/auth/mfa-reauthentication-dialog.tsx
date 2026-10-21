"use client";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function useMfaReauthentication() {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [password, setPassword] = useState(""), [code, setCode] = useState(""), [step, setStep] = useState<"PASSWORD" | "EMAIL" | "TOTP">("PASSWORD"), [error, setError] = useState("");
  const pending = useRef<{ resolve: (proof: string) => void; reject: (error: Error) => void } | null>(null);
  useEffect(() => () => { pending.current?.reject(new Error("Confirmação interrompida.")); pending.current = null; }, []);
  function cancel() { pending.current?.reject(new Error("Confirmação cancelada.")); pending.current = null; setOpen(false); setPassword(""); setCode(""); }
  function authenticate(): Promise<string> {
    if (pending.current) return Promise.reject(new Error("Há uma confirmação em andamento."));
    setPassword(""); setCode(""); setStep("PASSWORD"); setError(""); setOpen(true);
    return new Promise((resolve, reject) => { pending.current = { resolve, reject }; });
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError("");
    try {
      const response = await fetch("/api/superadmin/security/reauthenticate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password, ...(step === "EMAIL" ? { code } : step === "TOTP" ? { totpCode: code } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Não foi possível confirmar sua identidade.");
      if (result.success && typeof result.reauthenticationProof === "string") { pending.current?.resolve(result.reauthenticationProof); pending.current = null; setOpen(false); setPassword(""); setCode(""); }
      else if (result.step === "EMAIL" || result.step === "TOTP") { setStep(result.step); setCode(""); }
      else throw new Error("Confirmação incompleta. Tente novamente.");
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Falha na confirmação."); }
    finally { setBusy(false); }
  }
  const dialog = <Dialog open={open} onOpenChange={value => { if (!value && !busy) cancel(); }}><DialogContent>
    <DialogHeader><DialogTitle>Confirmar alteração de segurança</DialogTitle><DialogDescription>Confirme sua senha e os fatores atuais antes de alterar a proteção da conta.</DialogDescription></DialogHeader>
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-1"><label htmlFor="mfa-confirm-password">Senha atual</label><Input id="mfa-confirm-password" type="password" autoComplete="current-password" value={password} maxLength={256} disabled={busy} required onChange={event => setPassword(event.target.value)} /></div>
      {step !== "PASSWORD" && <div className="space-y-1"><label htmlFor="mfa-confirm-code">{step === "EMAIL" ? "Código enviado ao e-mail" : "Código do autenticador atual ou backup"}</label><Input key={step} autoFocus id="mfa-confirm-code" autoComplete="one-time-code" value={code} maxLength={32} disabled={busy} required onChange={event => setCode(event.target.value)} /></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={cancel}>Cancelar</Button><Button type="submit" disabled={busy || !password || (step !== "PASSWORD" && !code)}>{busy ? "Confirmando…" : "Confirmar identidade"}</Button></div>
    </form>
  </DialogContent></Dialog>;
  return { authenticate, dialog };
}
