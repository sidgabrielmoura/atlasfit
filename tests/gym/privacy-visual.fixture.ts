import "./guardian-visual.fixture";
import { readFileSync, writeFileSync } from "node:fs";
import { it } from "vitest";
import prisma from "@/lib/prisma";
import { issueGymIdentityLink } from "@/modules/workspaces/application/gym-identity-link";
import { submitGymPrivacyRequest } from "@/modules/workspaces/application/gym-privacy-requests";
it("prepara saúde, pedidos e vínculo existentes exclusivamente para revisão visual sintética", async () => {
  const fixture = JSON.parse(readFileSync(".tmp/gym-stabilization/guardian-visual-fixture.json", "utf8"));
  await prisma.gymGuardian.update({ where: { id: fixture.linked.id }, data: { isLegalRepresentative: true, hasHealthAccess: true } });
  await prisma.gymStudentProfile.update({ where: { memberId: fixture.memberId }, data: { healthData: { medicalConditions: "Limitação exclusivamente sintética", objective: "Objetivo local sintético", experienceLevel: "Iniciante" } } });
  const member = await prisma.workspaceMember.findUniqueOrThrow({ where: { id: fixture.memberId }, select: { userId: true, unitId: true } });
  const invite = await issueGymIdentityLink({ workspaceId: fixture.workspaceId, unitId: member.unitId!, actorUserId: fixture.owner.id, targetUserId: fixture.parent.id, email: fixture.parent.email });
  const request = await submitGymPrivacyRequest({ workspaceId: fixture.workspaceId, targetUserId: member.userId, actorUserId: fixture.parent.id, guardianId: fixture.linked.id, type: "ACCESS", notes: "Solicitação sintética para verificar o atendimento no navegador." });
  writeFileSync(".tmp/gym-stabilization/privacy-visual-fixture.json", JSON.stringify({ ...fixture, invitationPath: invite.path, requestId: request.id }));
});
