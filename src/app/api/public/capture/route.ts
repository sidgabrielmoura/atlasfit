import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const limiter = await rateLimit(`capture:${ip}`, 5, 60000);

  if (!limiter.success) {
    return new NextResponse("Muitas requisições. Tente novamente mais tarde.", {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(limiter.limit),
        "X-RateLimit-Remaining": String(limiter.remaining),
        "X-RateLimit-Reset": String(limiter.reset),
      },
    });
  }

  try {
    const body = await req.json();
    const { workspaceSlug, name, email, whatsapp, plan } = body;

    if (!workspaceSlug || !name || !email || !plan) {
      return new NextResponse("Campos obrigatórios ausentes.", { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new NextResponse("Formato de e-mail inválido.", { status: 400 });
    }

    // 1. Find the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug.toLowerCase() },
    });

    if (!workspace) {
      return new NextResponse("Workspace não encontrado.", { status: 404 });
    }

    // 2. Check if email already exists as a User
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return new NextResponse(
        "Este e-mail já está cadastrado como aluno ativo. Por favor, faça login diretamente.",
        { status: 400 }
      );
    }

    // Check if whatsapp already exists as a User
    if (whatsapp) {
      const existingUserPhone = await prisma.user.findFirst({
        where: { whatsapp },
      });
      if (existingUserPhone) {
        return new NextResponse(
          "Este número de WhatsApp já está cadastrado como aluno ativo. Por favor, fale com seu treinador.",
          { status: 400 }
        );
      }
    }

    // 3. Check if email already exists as a Pending Student
    const existingPending = await prisma.pendingStudent.findUnique({
      where: { email },
    });

    if (existingPending) {
      return new NextResponse(
        "Este e-mail já possui um pré-cadastro em espera de aprovação.",
        { status: 400 }
      );
    }

    // Check if whatsapp already exists as a Pending Student
    if (whatsapp) {
      const existingPendingPhone = await prisma.pendingStudent.findFirst({
        where: { whatsapp },
      });
      if (existingPendingPhone) {
        return new NextResponse(
          "Este número de WhatsApp já possui um pré-cadastro em espera de aprovação.",
          { status: 400 }
        );
      }
    }

    // 5. Create the Pending Student
    await prisma.pendingStudent.create({
      data: {
        name,
        email,
        password: null,
        whatsapp,
        plan,
        workspaceId: workspace.id,
      },
    });

    return new NextResponse("Pré-cadastro realizado com sucesso.", { status: 201 });
  } catch (error) {
    console.error("Public capture error:", error);
    return new NextResponse("Erro interno do servidor.", { status: 500 });
  }
}
