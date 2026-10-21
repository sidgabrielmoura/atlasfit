import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { avatarResponse } from "@/lib/avatar-response";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response(null, { status: 401 });
  if (new URL(req.url).searchParams.get("userId") !== session.user.id) return new Response(null, { status: 403 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { image: true } });
  return avatarResponse(user?.image);
}
