import prisma from "@/lib/prisma";
import { Flame, Clock, CheckCircle2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PendingPageProps {
  params: Promise<{ slug: string }>;
}

export default async function PendingPage({ params }: PendingPageProps) {
  const { slug } = await params;

  // Fetch workspace and owner to personalize the confirmation page
  const workspace = await prisma.workspace.findUnique({
    where: { slug: slug.toLowerCase() },
  });

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
  const whatsappNumber = owner?.whatsapp?.replace(/\D/g, "") || "";
  const whatsappText = encodeURIComponent(
    `Olá ${trainerName}, acabei de fazer meu pré-cadastro na assessoria ${workspace?.name || "AtlasFit"} e gostaria de solicitar a liberação do meu acesso!`
  );
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/55${whatsappNumber}?text=${whatsappText}`
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 relative">
      {/* Dynamic Branding Injector */}
      {workspace?.primaryColor && (
        <style dangerouslySetInnerHTML={{
          __html: `
            :root, .dark {
              --primary: ${workspace.primaryColor} !important;
              --ring: ${workspace.primaryColor} !important;
            }
          `
        }} />
      )}

      <div className="relative z-10 max-w-lg w-full bg-neutral-900 border border-neutral-800 p-8 md:p-10 rounded-2xl flex flex-col items-center space-y-8">
        {/* Logo Branding */}
        <div className="flex items-center gap-2">
          {workspace?.logoUrl ? (
            <img src={workspace.logoUrl} alt={workspace.name} className="h-10 w-auto object-contain rounded-lg" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary rounded-lg">
                <Flame className="size-6 text-black" />
              </div>
              <span className="text-xl font-black italic tracking-tighter uppercase">{workspace?.name || "ATLASFIT"}</span>
            </div>
          )}
        </div>

        {/* Status Graphic */}
        <div className="relative flex items-center justify-center">
          <div className="size-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Clock className="size-8 animate-spin" style={{ animationDuration: "3s" }} />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-3">
          <span className="text-xs uppercase font-extrabold tracking-widest text-primary">Solicitação Enviada!</span>
          <h1 className="text-3xl font-black tracking-tight uppercase leading-none">Pré-cadastro Concluído</h1>
          <p className="text-neutral-400 text-sm leading-relaxed max-w-sm mx-auto">
            Seus dados foram enviados para <strong className="text-white font-bold">{trainerName}</strong> da assessoria <strong className="text-white font-bold">{workspace?.name || "AtlasFit"}</strong> e estão aguardando liberação.
          </p>
        </div>

        {/* Steps Card */}
        <div className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs uppercase font-bold tracking-wider text-neutral-300">Próximas Etapas:</h3>
          <div className="space-y-3.5">
            {[
              {
                title: "Análise de Perfil",
                desc: "Seu treinador analisará suas informações e plano selecionado.",
              },
              {
                title: "Liberação de Acesso",
                desc: "Você receberá um e-mail contendo a confirmação e link para a planilha.",
              },
              {
                title: "Início dos Treinos",
                desc: "Basta efetuar login utilizando o e-mail e a senha cadastrados.",
              },
            ].map((step, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="size-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="size-3 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-neutral-200">{step.title}</h4>
                  <p className="text-[11px] text-neutral-500 leading-snug">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="w-full flex flex-col gap-3">
          {whatsappUrl ? (
            <Button
              asChild
              className="w-full h-12 rounded-lg text-sm font-semibold gap-2 bg-emerald-500 hover:bg-emerald-600 text-neutral-950 border-none transition-colors cursor-pointer"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="size-4 text-neutral-950" />
                Avisar Treinador no WhatsApp
              </a>
            </Button>
          ) : (
            <div className="text-[11px] text-center text-neutral-500 leading-relaxed">
              O treinador será notificado e liberará seu acesso em breve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
