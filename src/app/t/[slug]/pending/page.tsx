import prisma from "@/lib/prisma";
import { Clock, CheckCircle2, MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { findWorkspaceBySlugOrAlias } from "@/lib/workspace-lookup";

interface PendingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PendingPage({ params }: PendingPageProps) {
  const { slug } = await params;

  // 1. Fetch workspace via cascade lookup (slug, alias, name)
  const workspace = await findWorkspaceBySlugOrAlias(slug);

  const owner = workspace
    ? await prisma.user.findUnique({
        where: { id: workspace.ownerId },
        select: {
          name: true,
          whatsapp: true,
        },
      })
    : null;

  const trainerName = owner?.name || "seu personal trainer";
  const workspaceName = workspace?.name || "AtlasFit";
  const whatsappNumber = owner?.whatsapp?.replace(/\D/g, "") || "";
  const whatsappText = encodeURIComponent(
    `Olá ${trainerName}, acabei de fazer meu pré-cadastro na assessoria ${workspaceName} e gostaria de solicitar a liberação do meu acesso!`
  );
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${whatsappText}`
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      <meta name="theme-color" content={workspace?.primaryColor || "#2B4FCC"} />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />

      {/* Dynamic Branding Injector */}
      {workspace?.primaryColor && (
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root, .dark {
                --primary: ${workspace.primaryColor} !important;
                --ring: ${workspace.primaryColor} !important;
              }
            `,
          }}
        />
      )}

      {/* Background glow effects */}
      <div className="absolute top-[15%] left-[20%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[20%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />

      <Card className="relative z-10 max-w-lg w-full border-border/60 bg-card/80 backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden">
        <CardContent className="p-8 md:p-10 flex flex-col items-center space-y-6">
          {/* Logo Branding */}
          <div className="flex items-center justify-center mb-1">
            {workspace?.logoUrl ? (
              <img
                src={workspace.logoUrl}
                alt={workspaceName}
                className="h-11 w-auto max-w-[200px] object-contain rounded-lg"
              />
            ) : (
              <div className="flex justify-center">
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
            )}
          </div>

          {/* Status Graphic */}
          <div className="relative flex items-center justify-center">
            <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Clock className="size-8" />
            </div>
          </div>

          {/* Message Header */}
          <div className="text-center space-y-2.5">
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/25 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider"
            >
              Aguardando Liberação
            </Badge>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
              Pré-cadastro Concluído
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto font-medium">
              Seus dados foram enviados com sucesso para <strong className="text-foreground font-semibold">{trainerName}</strong> na assessoria <strong className="text-foreground font-semibold">{workspaceName}</strong>.
            </p>
          </div>

          {/* Next Steps Card */}
          <div className="w-full bg-muted/40 border border-border/50 rounded-xl p-5 space-y-4 text-left">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              <span>Próximas Etapas:</span>
            </div>
            <div className="space-y-3.5">
              {[
                {
                  title: "Análise de Perfil",
                  desc: "Seu treinador analisará suas informações e seu plano selecionado.",
                },
                {
                  title: "Liberação de Acesso",
                  desc: "Você receberá uma notificação assim que a sua ficha for autorizada.",
                },
                {
                  title: "Início dos Treinos",
                  desc: "Basta efetuar login utilizando seu e-mail e a senha cadastrados.",
                },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="size-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="size-3 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-foreground">{step.title}</h4>
                    <p className="text-[11px] text-muted-foreground leading-snug">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="w-full flex flex-col gap-3 pt-1">
            {whatsappUrl ? (
              <Button
                asChild
                className="w-full h-11 rounded-xl text-sm font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer border-none"
              >
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="size-4" />
                  Avisar Treinador no WhatsApp
                </a>
              </Button>
            ) : (
              <div className="text-xs text-center text-muted-foreground leading-relaxed p-2 bg-muted/30 border border-border/40 rounded-lg">
                O seu treinador será notificado e liberará seu acesso em breve.
              </div>
            )}

            <Button
              asChild
              variant="outline"
              className="w-full h-11 rounded-xl text-sm font-semibold border-border/60 hover:bg-accent cursor-pointer"
            >
              <Link href="/login">
                Já tem acesso liberado? Fazer Login
                <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
