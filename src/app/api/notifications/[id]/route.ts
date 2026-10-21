import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notificationRequestScope } from "@/lib/notifications/request-scope";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { WorkspaceAccessError } from "@/modules/workspaces/domain/types";

async function handle(request: Request, params: Promise<{ id: string }>, method: "PATCH" | "DELETE") {
  try {
    const scope = await notificationRequestScope(request), { id } = await params;
    const where = { ...scope, id };
    const result = method === "PATCH" ? await prisma.notification.updateMany({ where, data: { isRead: true, readAt: new Date() } }) : await prisma.notification.deleteMany({ where });
    if (!result.count) throw new WorkspaceAccessError(404, "FORBIDDEN_RESOURCE", "Notificação indisponível neste contexto.");
    return NextResponse.json({ success: true });
  } catch (error) { const denied = handleWorkspaceAccessError(error); if (denied) return denied; throw error; }
}
export const PATCH = (request: Request, context: { params: Promise<{ id: string }> }) => handle(request, context.params, "PATCH");
export const DELETE = (request: Request, context: { params: Promise<{ id: string }> }) => handle(request, context.params, "DELETE");
