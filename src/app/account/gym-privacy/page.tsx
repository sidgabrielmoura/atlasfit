import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import { assertGymPrivacyAuthority } from "@/modules/workspaces/application/gym-privacy-authority";
import { GymPrivacyRequests } from "@/components/privacy/gym-privacy-requests";
export const metadata = { title: "Atendimento de privacidade | AtlasFit", robots: { index: false, follow: false } };
export default async function PrivacyManagementPage({ searchParams }: { searchParams: Promise<{ workspaceId?: string }> }) {
  const session = await auth(); if (!session?.user?.id) redirect("/auth/student?callbackUrl=" + encodeURIComponent("/account/gym-privacy"));
  const { workspaceId } = await searchParams;
  const candidates = await prisma.workspace.findMany({ where: { type: "GYM", members: { some: { userId: session.user.id, isActive: true } } }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 100 });
  const allowed = [];
  for (const candidate of candidates) { try { await assertGymPrivacyAuthority(prisma, candidate.id, session.user.id); allowed.push(candidate); } catch { /* An unrelated professional role grants no privacy access. */ } }
  if (workspaceId && !allowed.some(row => row.id === workspaceId)) await assertGymPrivacyAuthority(prisma, workspaceId, session.user.id);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8"><h1 className="text-2xl font-semibold">Atendimento de privacidade</h1><p>Este atendimento permanece disponível após a suspensão ou o encerramento comercial da academia.</p><nav aria-label="Academias para atendimento" className="flex flex-wrap gap-3">{allowed.map(row => <a key={row.id} className="rounded-lg border px-3 py-2 underline" href={`/account/gym-privacy?workspaceId=${encodeURIComponent(row.id)}`}>{row.name}</a>)}</nav>{workspaceId ? <GymPrivacyRequests workspaceId={workspaceId} /> : <p>Selecione uma academia em que você possui poderes atuais de gestão de privacidade.</p>}</main>;
}
