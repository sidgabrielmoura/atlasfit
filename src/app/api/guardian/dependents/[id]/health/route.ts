import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { readGymHealthProfile } from "@/modules/workspaces/application/gym-health-profile";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth(); if (!session?.user?.id || session.user.isImpersonated) return NextResponse.json({ error: { message: "Sessão própria obrigatória." } }, { status: 401 });
    const { id } = await params; const workspaceId = z.string().min(1).max(100).parse(new URL(req.url).searchParams.get("workspaceId"));
    const guardian = await prisma.gymGuardian.findFirst({ where: { id, workspaceId, guardianUserId: session.user.id, revokedAt: null, hasHealthAccess: true }, select: { studentMemberId: true } });
    if (!guardian) return NextResponse.json({ error: { message: "Poder de acesso à saúde obrigatório." } }, { status: 403 });
    return NextResponse.json(await readGymHealthProfile(workspaceId, guardian.studentMemberId, session.user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return handleWorkspaceAccessError(error) || NextResponse.json({ error: { message: "Saúde indisponível." } }, { status: 400 }); }
}
