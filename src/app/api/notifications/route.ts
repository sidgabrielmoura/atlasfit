import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { notificationRequestScope } from "@/lib/notifications/request-scope";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";

async function handle(request: Request, method: "GET" | "PATCH" | "DELETE") {
  try {
    const where = await notificationRequestScope(request);
    if (method === "GET") return NextResponse.json(await prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }), { headers: { "Cache-Control": "private, no-store" } });
    if (method === "PATCH") await prisma.notification.updateMany({ where: { ...where, isRead: false }, data: { isRead: true, readAt: new Date() } });
    else await prisma.notification.deleteMany({ where });
    return NextResponse.json({ success: true });
  } catch (error) { const denied = handleWorkspaceAccessError(error); if (denied) return denied; throw error; }
}
export const GET = (request: Request) => handle(request, "GET");
export const PATCH = (request: Request) => handle(request, "PATCH");
export const DELETE = (request: Request) => handle(request, "DELETE");
