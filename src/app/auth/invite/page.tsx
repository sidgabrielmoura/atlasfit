"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { gymPublicInvitationSchema } from "@/modules/workspaces/domain/gym-staff-contract";
import { workspaceAdministrationErrorMessage } from "@/modules/workspaces/domain/workspace-administration-contract";

function InviteContent() {
  const token = useSearchParams().get("token");
  const { data: session, status } = useSession();
  const [invitation, setInvitation] = useState<z.infer<typeof gymPublicInvitationSchema> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(null); setInvitation(null);
    async function load() {
      try {
        if (!token || !/^[a-f0-9]{64}$/i.test(token)) throw new Error("Link de convite inválido.");
        const response = await fetch(`/api/gym/invitations/accept?token=${encodeURIComponent(token)}`, { signal: controller.signal, cache: "no-store" });
        const body: unknown = await response.json();
        if (!response.ok) throw new Error(workspaceAdministrationErrorMessage(body, "Convite indisponível."));
        if (!controller.signal.aborted) setInvitation(gymPublicInvitationSchema.parse(body));
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Falha ao carregar o convite.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [token, reload]);
  async function accept() {
    if (!token || accepting) return;
    setAccepting(true);
    try {
      const response = await fetch("/api/gym/invitations/accept", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(workspaceAdministrationErrorMessage(body, "Falha ao aceitar o convite."));
      z.object({ success: z.literal(true), workspaceId: z.string() }).parse(body);
      toast.success("Convite aceito.");
      // Reload server context and client stores from the committed workspace cookie.
      window.location.assign("/dashboard");
    } catch (failure) { toast.error(failure instanceof Error ? failure.message : "Falha ao aceitar o convite."); setAccepting(false); }
  }
  const destination = `/auth/invite?token=${token ?? ""}`;
  const callback = encodeURIComponent(destination);
  return <Card className="w-full max-w-md">
    <CardHeader><CardTitle>{invitation?.workspace.name ?? "Convite para equipe"}</CardTitle><CardDescription>Entre com a conta destinatária para participar.</CardDescription></CardHeader>
    <CardContent className="space-y-4">
      {loading ? <Skeleton className="h-24 w-full" /> : error ? <div role="alert" className="space-y-3"><p className="text-sm">{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Tentar novamente</Button></div> : invitation && <>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <dt className="text-muted-foreground">Destinatário</dt><dd className="break-all">{invitation.email}</dd>
          <dt className="text-muted-foreground">Função</dt><dd>{{ MANAGER: "Gerente", TRAINER: "Personal", RECEPTIONIST: "Recepção", FINANCE: "Financeiro", ASSISTANT: "Assistente", OWNER: "Titular", STUDENT: "Aluno" }[invitation.role]}</dd>
          <dt className="text-muted-foreground">Unidade</dt><dd>{invitation.unit?.name ?? "Todas as unidades"}</dd>
          <dt className="text-muted-foreground">Válido até</dt><dd>{new Date(invitation.expiresAt).toLocaleString("pt-BR")}</dd>
        </dl>
        {status === "loading" ? <Skeleton className="h-10 w-full" /> : status === "authenticated" ? <>
          <p className="text-sm text-muted-foreground">Conta: {session.user?.email}</p>
          <Button className="w-full" disabled={accepting} onClick={() => { void accept(); }}>{accepting ? "Aceitando…" : "Aceitar convite"}</Button>
        </> : <div className="space-y-3">
          <Button asChild className="w-full"><Link href={`/auth/gym?callbackUrl=${callback}`}>Entrar com a conta destinatária</Link></Button>
          <p className="text-sm text-muted-foreground">Ainda sem conta? O cadastro pessoal é gratuito durante o trial.</p>
          <Button asChild variant="outline" className="w-full"><Link href={`/auth/register?callbackUrl=${callback}`}>Criar conta pessoal</Link></Button>
        </div>}
      </>}
    </CardContent>
  </Card>;
}
export default function InviteAcceptancePage() {
  return <main className="flex min-h-screen items-center justify-center bg-background p-4"><Suspense fallback={<Skeleton className="h-64 w-full max-w-md" />}><InviteContent /></Suspense></main>;
}
