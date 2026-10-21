"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export function GymLinkConfirmation({ requestId, token }: { requestId: string; token: string }) {
  const [data, setData] = useState<{ gymName: string; unitName: string; authorized: boolean } | null>(null);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    let live = true;
    fetch(`/api/user/gym-link?${new URLSearchParams({ requestId, token })}`, { cache: "no-store" }).then(async res => { const body = await res.json(); if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : body.error?.message); if (live) setData(body); }).catch(e => { if (live) setMessage(e.message || "Convite indisponível."); });
    return () => { live = false; };
  }, [requestId, token]);
  async function accept() {
    setBusy(true); setMessage("");
    try { const res = await fetch("/api/user/gym-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, token, accepted: true }) }); const body = await res.json(); if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : body.error?.message); setData(d => d ? { ...d, authorized: true } : d); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Falha ao confirmar."); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-xl px-5 py-16"><Card><CardHeader><CardTitle>Autorizar vínculo com academia</CardTitle></CardHeader><CardContent className="space-y-4">
    {data ? <><p>A academia <strong>{data.gymName}</strong>, unidade <strong>{data.unitName}</strong>, solicitou seu cadastro como aluno.</p><p className="text-sm text-muted-foreground">Ao confirmar, você autoriza a academia a vincular sua identidade e manter seus registros locais. Os dados de saúde de outras academias ou assessorias permanecem separados. A contratação do plano exige aceite próprio.</p>{data.authorized ? <p role="status">Autorização registrada. Informe a academia para concluir o cadastro.</p> : <Button onClick={accept} disabled={busy}>{busy ? "Confirmando…" : "Autorizar meu vínculo"}</Button>}</> : !message && <p role="status">Conferindo convite…</p>}
    {message && <p role="alert">{message}</p>}{!data && message && <a href={`/auth/student?callbackUrl=${encodeURIComponent(`/account/gym-link?${new URLSearchParams({ requestId, token })}`)}`} className="underline">Entrar com minha conta</a>}
  </CardContent></Card></main>;
}
