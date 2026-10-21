import { withRequestMemo } from "@/lib/request-memo";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { serializableTransaction } from "@/modules/workspaces/application/transaction";
import { notificationDeliveryStatus } from "@/lib/notifications/delivery";

async function handleGET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  try {
    const { id } = await context.params;
    const result = await serializableTransaction(tx => notificationDeliveryStatus(tx, session.user.id, id));
    return result ? NextResponse.json(result, { headers: { "Cache-Control": "no-store" } }) : NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  } catch { return NextResponse.json({ error: { code: "DELIVERY_STATUS_UNAVAILABLE" } }, { status: 503 }); }
}
export const GET = withRequestMemo(handleGET);
