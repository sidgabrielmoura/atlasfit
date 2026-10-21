import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { withAuditedRequest } from "@/lib/audited-request";
import { readJsonRequest, JsonRequestError } from "@/lib/http/read-json";
import { handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { assertSuperadmin } from "@/modules/workspaces/application/gym-provisioning";
import { deleteGymStorageOrphan } from "@/modules/workspaces/application/gym-storage-reconciliation";

export const DELETE = withAuditedRequest(async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    await assertSuperadmin(prisma, session.user.id);
    const body = z.object({ objectKey: z.string().min(1).max(1024) }).strict().safeParse(await readJsonRequest(request, 4096));
    if (!body.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
    return NextResponse.json(await deleteGymStorageOrphan((await params).id, body.data.objectKey, session.user.id));
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    if (error instanceof JsonRequestError) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: error.statusCode });
    return NextResponse.json({ error: "STORAGE_DELETE_UNAVAILABLE", message: "A capacidade permanece ocupada até confirmar a exclusão. Tente novamente." }, { status: 503 });
  }
});
