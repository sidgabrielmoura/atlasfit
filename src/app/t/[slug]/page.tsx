import prisma from "@/lib/prisma";
import { CaptureForm } from "./capture-form";
import { Flame, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CapturePageProps {
  params: Promise<{ slug: string }>;
}

export default async function CapturePage({ params }: CapturePageProps) {
  const { slug } = await params;

  // 1. Fetch workspace by slug
  const workspace = await prisma.workspace.findUnique({
    where: { slug: slug.toLowerCase() },
  });

  // Helper render function for not found state
  const renderNotFound = () => (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-[60%] h-[60%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-md w-full bg-neutral-900/40 backdrop-blur-3xl border border-neutral-800/60 p-8 md:p-12 rounded-[2.5rem] shadow-2xl text-center flex flex-col items-center space-y-6">
        {/* Logo Branding */}
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary rounded-xl">
            <Flame className="size-6 text-black" />
          </div>
          <span className="text-xl font-black italic tracking-tighter">ATLASFIT</span>
        </div>

        <div className="size-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive mb-2 shadow-lg shadow-destructive/5 animate-pulse">
          <AlertCircle className="size-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight uppercase">Profissional Não Encontrado</h1>
          <p className="text-neutral-400 text-sm leading-relaxed font-medium">
            Não conseguimos encontrar um profissional ativo associado a este link de captação. Por favor, verifique a URL ou entre em contato diretamente com o seu treinador.
          </p>
        </div>

        <Button
          asChild
          className="w-full h-12 rounded-xl text-sm font-bold shadow-lg shadow-primary/10 gap-2 mt-4 hover:scale-[1.01] active:scale-[0.99] transition-all bg-primary hover:bg-primary/95 text-black border-none"
        >
          <Link href="/">
            Voltar ao Início
          </Link>
        </Button>
      </div>
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

  // 3. Verify if owner has active trial or active subscription
  const isOwnerTrialActive = owner.freeTrial ? new Date() <= new Date(owner.freeTrial.endDate) : false;
  const isOwnerSubscriptionActive = owner.subscription ? owner.subscription.status === "active" : false;

  if (!isOwnerTrialActive && !isOwnerSubscriptionActive) {
    return renderNotFound();
  }

  // Construct the formatted workspace prop for CaptureForm
  const formattedWorkspace = {
    name: workspace.name,
    slug: workspace.slug,
    logoUrl: workspace.logoUrl,
    primaryColor: workspace.primaryColor || "#0ea5e9",
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
