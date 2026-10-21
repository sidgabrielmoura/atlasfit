import { POST as deviceTokenPOST, DELETE as deviceTokenDELETE } from "@/app/api/notifications/device-token/route";
import { personalCommercialContextResponse } from "@/lib/personal-commercial-context";

export async function POST(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  return deviceTokenPOST(req);
}
export async function DELETE(req: Request) {
  const restricted = await personalCommercialContextResponse(); if (restricted) return restricted;
  return deviceTokenDELETE(req);
}
