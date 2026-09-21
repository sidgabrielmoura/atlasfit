import prisma from "@/lib/prisma";
import { CaptureForm } from "./capture-form";
import { AlertCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { findWorkspaceBySlugOrAlias } from "@/lib/workspace-lookup";

interface CapturePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CapturePage({ params }: CapturePageProps) {
  const { slug } = await params;

  // 1. Fetch workspace by slug, workspace name or trainer alias
  const workspace = await findWorkspaceBySlugOrAlias(slug);

  // Helper render function for not found state
  const renderNotFound = () => (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[15%] left-[20%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[20%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <Card className="relative z-10 max-w-md w-full border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardContent className="p-8 md:p-10 flex flex-col items-center text-center space-y-6">
          {/* Logo Branding */}
          <div className="flex justify-center mb-2">
            <Image
              src="/logos_atlasfit/atlasfit (4).png"
              alt="AtlasFit"
              width={160}
              height={50}
              priority
              className="object-contain dark:block hidden h-10 w-auto"
            />
            <Image
              src="/logos_atlasfit/atlasfit_black.png"
              alt="AtlasFit"
              width={160}
              height={50}
              priority
              className="object-contain dark:hidden block h-10 w-auto"
            />
          </div>

          <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-sm">
            <AlertCircle className="size-8" />
          </div>

          <div className="space-y-2">
            <Badge variant="destructive" className="px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider">
              Link Indisponível
            </Badge>
            <h1 className="text-2xl font-black tracking-tight uppercase">
              Profissional Não Encontrado
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed font-medium">
              Não conseguimos encontrar uma assessoria ou treinador ativo associado a este link de captação.
            </p>
          </div>

          <div className="p-4 bg-muted/40 border border-border/50 rounded-xl text-left w-full space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <HelpCircle className="size-3.5 text-primary shrink-0" />
              <span>O que você pode fazer?</span>
            </div>
            <ul className="text-[11px] text-muted-foreground leading-relaxed space-y-1 pl-4 list-disc">
              <li>Verifique se o link foi digitado corretamente na barra de endereços</li>
              <li>Solicite o link atualizado diretamente ao seu personal trainer</li>
            </ul>
          </div>

          <Button
            asChild
            className="w-full h-11 rounded-xl text-sm font-bold shadow-md gap-2 cursor-pointer"
          >
            <Link href="/">
              Voltar ao Início
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  if (!workspace || !workspace.isActive) {
    return renderNotFound();
  }

  // 2. Fetch owner details along with subscription and free trial
  const owner = await prisma.user.findUnique({
    where: { id: workspace.ownerId },
    include: {
      subscription: true,
      freeTrial: true,
    },
  });

  if (!owner) {
    return renderNotFound();
  }

  // 3. Verify if owner has active trial or active subscription (or is a test account)
  const isOwnerTrialActive = owner.freeTrial ? new Date() <= new Date(owner.freeTrial.endDate) : false;
  const isOwnerSubscriptionActive = owner.subscription 
    ? (owner.subscription.status.toLowerCase() === "active" || 
       (owner.subscription.status.toLowerCase() === "canceled" && owner.subscription.endDate && new Date() < new Date(owner.subscription.endDate)))
    : false;
  const isOwnerTestAccount = owner.isTestAccount || false;

  if (!isOwnerTrialActive && !isOwnerSubscriptionActive && !isOwnerTestAccount) {
    return renderNotFound();
  }

  // Construct the formatted workspace prop for CaptureForm
  const formattedWorkspace = {
    name: workspace.name,
    slug: workspace.slug,
    logoUrl: workspace.logoUrl,
    primaryColor: workspace.primaryColor || "#2B4FCC",
    slogan: workspace.slogan,
    owner: {
      name: owner.name || "Treinador AtlasFit",
      email: owner.email || "",
      bio: owner.bio,
      specialty: owner.specialty,
      city: owner.city,
      instagram: owner.instagram,
    },
  };

  return <CaptureForm workspace={formattedWorkspace} />;
}
