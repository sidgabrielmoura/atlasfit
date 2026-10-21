import { redirect } from "next/navigation";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { getStudentWorkspaceMember } from "@/lib/student-auth";
import { GymContractAcceptance } from "@/components/application/gym-contract-acceptance";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const labels = { DRAFT: "Rascunho", PENDING_ACCEPTANCE: "Aguardando aceite", PENDING_ACTIVATION: "Aguardando ativação", ACTIVE: "Ativa", PAUSED: "Pausada", CANCELLED: "Cancelada", EXPIRED: "Encerrada" };

export default async function StudentGymContractsPage() {
  const session = await auth(); if (!session?.user?.id) redirect("/auth/student");
  const member = await getStudentWorkspaceMember(session.user.id); if (!member) redirect("/select-workspace");
  if (member.workspace.type !== "GYM") redirect("/student/finance");
  const contracts = await prisma.gymEnrollment.findMany({ where: { workspaceId: member.workspaceId, studentMemberId: member.id, planVersion: { plan: { workspaceId: member.workspaceId } } }, select: { id: true, status: true, planVersion: { select: { name: true } } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50 });
  return <div className="space-y-6 p-4 md:p-6">
    <div><h1 className="text-2xl font-semibold tracking-tight">Contratos</h1><p className="mt-1 text-sm text-muted-foreground">{member.workspace.name}</p></div>
    {contracts.length === 0 ? <Card><CardContent className="py-8 text-sm text-muted-foreground">Nenhum contrato cadastrado nesta academia.</CardContent></Card> : contracts.map(contract => <Card key={contract.id}><CardContent className="flex flex-wrap items-center justify-between gap-4 py-5"><div className="space-y-2"><h2 className="font-medium">{contract.planVersion.name}</h2><Badge variant="outline">{labels[contract.status]}</Badge></div><GymContractAcceptance workspaceId={member.workspaceId} enrollmentId={contract.id} /></CardContent></Card>)}
    {contracts.length === 50 && <p className="text-sm text-muted-foreground">Exibindo os 50 contratos mais recentes. Solicite históricos anteriores à academia.</p>}
  </div>;
}
