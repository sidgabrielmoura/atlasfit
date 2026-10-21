import { withAuditedRequest } from "@/lib/audited-request";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { SuperAdminGymService } from "@/modules/workspaces";
import { logSystemError } from "@/lib/logger";
import { gymConfigurationSchema, gymUnitSchema, serializeGymData } from "@/modules/workspaces/domain/gym-config";
import { EntitlementsService } from "@/modules/workspaces/application/entitlements-service";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

export const GET = withAuditedRequest(async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do workspace é obrigatório." }, { status: 400 });
  }

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        settings: true,
        subscription: {
          include: { plan: true },
        },
        units: {
          orderBy: { createdAt: "asc" },
        },
        members: {
          where: { isActive: true },
          select: { role: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace não encontrado." }, { status: 404 });
    }

    if (workspace.type !== "GYM") return NextResponse.json({ error: "Configuração exclusiva de academia." }, { status: 400 });
    const entitlements = await EntitlementsService.resolveEntitlements(id);

    return NextResponse.json(serializeGymData({
      workspaceId: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      type: workspace.type,
      isActive: workspace.isActive,
      settings: workspace.settings,
      subscription: workspace.subscription,
      units: workspace.units,
      metrics: {
        ...entitlements.usage,
      },
    }));
  } catch (error) {
    await logSystemError({ action: "GET_SUPERADMIN_GYM_CONFIG", error, entity: "WORKSPACE", entityId: id });
    return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });
  }
});

export const PATCH = withAuditedRequest(async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do workspace é obrigatório." }, { status: 400 });
  }

  try {
    const parsed = gymConfigurationSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const { settings, subscription, reason } = parsed.data;

    const updated = await SuperAdminGymService.updateGymConfig({
      workspaceId: id,
      adminUserId: session.user.id,
      reason,
      settings,
      subscription,
    });

    return NextResponse.json(serializeGymData(updated));
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    await logSystemError({ action: "PATCH_SUPERADMIN_GYM_CONFIG", error, entity: "WORKSPACE", entityId: id });
    return NextResponse.json(
      { error: "Erro ao atualizar configuração da academia." },
      { status: 400 }
    );
  }
});

export const POST = withAuditedRequest(async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (session?.user?.role !== "SUPERADMIN" || !session.user.id) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "ID do workspace é obrigatório." }, { status: 400 });
  }

  try {
    const parsed = gymUnitSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    const unit = await SuperAdminGymService.addGymUnit(id, parsed.data, session.user.id);
    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    if (error instanceof WorkspaceAccessError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
    await logSystemError({ action: "POST_SUPERADMIN_GYM_UNIT", error, entity: "WORKSPACE", entityId: id });
    return NextResponse.json(
      { error: "Erro ao adicionar unidade da academia." },
      { status: 400 }
    );
  }
});
