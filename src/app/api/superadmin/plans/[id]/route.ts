import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { AbacatePay } from "@/lib/abacatepay";
import { logSystemError } from "@/lib/logger";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, price, interval, features, maxWorkspaces, maxStudents } = body;

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        name,
        price: price ? parseFloat(price) : undefined,
        interval,
        features,
        maxWorkspaces: maxWorkspaces !== undefined ? parseInt(maxWorkspaces) : undefined,
        maxStudents: maxStudents !== undefined ? (maxStudents === "" || maxStudents === null ? null : parseInt(maxStudents)) : undefined
      }
    });

    return NextResponse.json(plan);
  } catch (error) {
    await logSystemError({ action: "PATCH_PLAN", error, entity: "PLAN", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (session?.user?.role !== "SUPERADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if there are active subscriptions before deleting
    const subscriptionsCount = await prisma.subscription.count({
      where: {
        planId: id,
        OR: [
          { status: "active" },
          { status: "ACTIVE" }
        ]
      }
    });

    if (subscriptionsCount > 0) {
      return new NextResponse("Cannot delete plan with active subscriptions", { status: 400 });
    }

    // Remover do AbacatePay
    try {
      const apiKey = process.env.ABACATEPAY_API_KEY;
      if (apiKey && apiKey !== "abc_dev_placeholder") {
        const abacate = AbacatePay({ secret: apiKey });
        const response = await abacate.products.list();
        
        let products: any[] = [];
        if (Array.isArray(response)) {
          products = response;
        } else if (response && typeof response === "object") {
          // A sdk as vezes retorna num formato de página
          if (Array.isArray((response as any).data)) products = (response as any).data;
          else if (Array.isArray((response as any).products)) products = (response as any).products;
        }

        const existingProduct = products.find((p: any) => p.externalId === id);
        if (existingProduct) {
          await abacate.products.delete({ id: existingProduct.id });
          console.log(`Product deleted from AbacatePay: ${existingProduct.id}`);
        } else {
          console.log(`Product with externalId ${id} not found on AbacatePay.`);
        }
      }
    } catch (abacateError) {
      console.error("Erro ao remover produto do AbacatePay:", abacateError);
      await logSystemError({ action: "DELETE_PLAN_SYNC_ABACATEPAY", error: abacateError, entity: "PLAN", entityId: id });
      // We don't block DB deletion if AbacatePay fails, but we logged it.
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETION",
        entity: "PLAN",
        entityId: id,
        severity: "warning"
      }
    });

    await prisma.plan.delete({
      where: { id }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    await logSystemError({ action: "DELETE_PLAN", error, entity: "PLAN", entityId: id });
    return new NextResponse("Internal Error", { status: 500 });
  }
}
