import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ablyRest } from "@/lib/ably";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Não autorizado.", { status: 401 });
    }

    // Set the client ID to the authenticated user ID
    const clientId = session.user.id;

    // Request token with standard capabilities and client ID matching user ID
    const tokenRequest = await ablyRest.auth.createTokenRequest({
      clientId,
    });

    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("[API Ably Token] Error generating token request:", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
