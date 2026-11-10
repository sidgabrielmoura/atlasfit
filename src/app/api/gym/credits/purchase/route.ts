import { NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";
import { requireGymWorkspaceAccess, handleWorkspaceAccessError } from "@/modules/workspaces/application/guard";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { AbacatePay, resolvePublicImageUrl } from "@/lib/abacatepay";
import { isValidCpfCnpj } from "@/lib/cpf-validator";
import { isAllowedOrigin, validateApplicationOrigin } from "@/lib/auth/application-origin";
import { readPrivacyJsonRequest } from "@/lib/privacy/request-body";

const purchaseSchema = z.object({ packageId: z.string().min(1).max(100), workspaceId: z.string().min(1).max(100), billing: z.object({ taxId: z.string().max(18), cellphone: z.string().max(20) }).strict() }).strict();
export async function POST(req: Request) {
  try {
    const origin = req.headers.get("origin");
    if (req.headers.get("sec-fetch-site") === "cross-site" || (origin && !isAllowedOrigin(origin))) return new NextResponse("Origem inválida.", { status: 403 });
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Não autorizado.", { status: 401 });
    const parsed = purchaseSchema.safeParse(await readPrivacyJsonRequest(req, 2048));
    if (!parsed.success) return new NextResponse("Informe o pacote, academia e dados reais do pagador.", { status: 400 });
    const { packageId, workspaceId, billing } = parsed.data;
    await requireGymWorkspaceAccess({ workspaceId, capability: "students.manage" });
    const intent = req.headers.get("idempotency-key");
    if (!intent || !/^[\w:.-]{8,128}$/.test(intent)) return new NextResponse("Identificação da tentativa obrigatória.", { status: 400 });
    const taxId = billing.taxId.replace(/\D/g, "");
    const cellphone = billing.cellphone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, email: true } });
    if (!isValidCpfCnpj(taxId) || !/^\d{2}9\d{8}$/.test(cellphone) || !user?.name?.trim() || !z.email().safeParse(user.email).success) return new NextResponse("Confira CPF/CNPJ e celular do pagador, nome e email do perfil.", { status: 400 });
    const pkg = await prisma.creditPackage.findFirst({ where: { id: packageId, isActive: true } });
    if (!pkg) return new NextResponse("Pacote indisponível.", { status: 404 });
    if (!Number.isSafeInteger(pkg.priceInCents) || pkg.priceInCents < 100 || !Number.isSafeInteger(pkg.credits) || pkg.credits < 1) return new NextResponse("Condições do pacote inválidas.", { status: 409 });
    const key = createHash("sha256").update(JSON.stringify([workspaceId, session.user.id, intent])).digest("hex");
    const previous = await prisma.creditPurchase.findUnique({ where: { checkoutRequestKey: key } });
    if (previous) {
      if (previous.packageId !== pkg.id || previous.amountInCents !== pkg.priceInCents || previous.credits !== pkg.credits) return new NextResponse("Tentativa já utilizada com outras condições.", { status: 409 });
      if (previous.status === "PENDING" && previous.abacatePayUrl) return NextResponse.json({ purchaseId: previous.id, checkoutUrl: previous.abacatePayUrl });
      return new NextResponse("Compra já recebida. Consulte a situação antes de iniciar outra tentativa.", { status: 409 });
    }
    const secret = process.env.ABACATEPAY_API_KEY;
    if (!secret || secret === "abc_dev_placeholder") return new NextResponse("Pagamento temporariamente indisponível.", { status: 503 });
    const provider = AbacatePay({ secret });
    const productKey = `${pkg.id}:${pkg.priceInCents}:${pkg.credits}`;
    let productId: string | undefined;
    const products = await provider.products.list();
    const items = Array.isArray(products) ? products : (products as any)?.data || [];
    productId = items.find((item: any) => item.externalId === productKey)?.id;
    if (!productId) {
      const imageUrl = resolvePublicImageUrl(pkg.imageUrl);
      const product = await provider.products.create({ externalId: productKey, name: pkg.name, price: pkg.priceInCents, currency: "BRL", description: pkg.description || `${pkg.credits} créditos`, ...(imageUrl ? { imageUrl } : {}) });
      productId = product.id;
    }
    if (!productId) return new NextResponse("Produto de pagamento indisponível.", { status: 503 });
    const purchase = await prisma.creditPurchase.create({ data: { workspaceId, packageId, userId: session.user.id, amountInCents: pkg.priceInCents, credits: pkg.credits, status: "PENDING", checkoutRequestKey: key } });
    const base = validateApplicationOrigin(process.env.AUTH_URL || process.env.NEXTAUTH_URL || process.env.APP_URL || "https://app.atlasfit.site");
    const checkout = await provider.checkouts.create({ methods: ["PIX"], items: [{ id: productId, quantity: 1 }], customer: { name: user.name!.trim(), email: user.email!, cellphone, taxId }, externalId: purchase.id, returnUrl: `${base}/gym/credits`, completionUrl: `${base}/gym/credits?status=success`, metadata: { workspaceId, packageId, userId: session.user.id } });
    if (!checkout.id || !checkout.url?.startsWith("https://")) throw new Error("INVALID_PROVIDER_CHECKOUT");
    await prisma.creditPurchase.update({ where: { id: purchase.id }, data: { abacatePayBillingId: checkout.id, abacatePayUrl: checkout.url } });
    return NextResponse.json({ purchaseId: purchase.id, checkoutUrl: checkout.url });
  } catch (error) {
    const denied = handleWorkspaceAccessError(error); if (denied) return denied;
    console.error("[GYM_CREDITS_CHECKOUT]", { errorType: error instanceof Error ? error.name : "UnknownError" });
    return new NextResponse("Não foi possível iniciar a compra. Consulte sua situação antes de tentar novamente.", { status: 503 });
  }
}
