import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay } from "@/lib/abacatepay";

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "SUPERADMIN") return null;
  return session;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return new NextResponse("Não autorizado.", { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, description, credits, priceInCents, isHighlighted, sortOrder, isActive } = body;

    const existing = await prisma.creditPackage.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Pacote não encontrado.", { status: 404 });

    const updated = await prisma.creditPackage.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(credits !== undefined && { credits: parseInt(credits) }),
        ...(priceInCents !== undefined && { priceInCents: parseInt(priceInCents) }),
        ...(isHighlighted !== undefined && { isHighlighted }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (existing.abacatePayProductId && (name !== undefined || priceInCents !== undefined || description !== undefined)) {
      try {
        const apiKey = process.env.ABACATEPAY_API_KEY;
        if (apiKey && apiKey !== "abc_dev_placeholder") {
          const abacatePay = AbacatePay({ secret: apiKey });
          await abacatePay.products.update(existing.abacatePayProductId, {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description }),
            ...(priceInCents !== undefined && { price: parseInt(priceInCents) }),
          });
        }
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json(updated);
  } catch {
    return new NextResponse("Erro ao atualizar pacote.", { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSuperAdmin();
  if (!session) return new NextResponse("Não autorizado.", { status: 401 });

  const { id } = await params;

  try {
    const existing = await prisma.creditPackage.findUnique({
      where: { id },
      include: { _count: { select: { purchases: true } } },
    });

    if (!existing) return new NextResponse("Pacote não encontrado.", { status: 404 });

    if (existing._count.purchases > 0) {
      await prisma.creditPackage.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({ deleted: false, deactivated: true });
    }

    if (existing.abacatePayProductId) {
      try {
        const apiKey = process.env.ABACATEPAY_API_KEY;
        if (apiKey && apiKey !== "abc_dev_placeholder") {
          const abacatePay = AbacatePay({ secret: apiKey });
          await abacatePay.products.delete(existing.abacatePayProductId);
        }
      } catch {
        // Non-blocking
      }
    }

    await prisma.creditPackage.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch {
    return new NextResponse("Erro ao excluir pacote.", { status: 500 });
  }
}
