

"use client";

import { useState, useEffect } from "react";
import {
  Flame,
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Award,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CaptureFormProps {
  workspace: {
    name: string;
    slug: string;
    logoUrl?: string | null;
    primaryColor: string;
    slogan?: string | null;
    owner: {
      name: string;
      email: string;
      bio?: string | null;
      specialty?: string | null;
      city?: string | null;
      instagram?: string | null;
    } | null;
  };
}

export function CaptureForm({ workspace }: CaptureFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("Mensal");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isPending = localStorage.getItem(`atlasfit_pending_${workspace.slug}`);
      if (isPending === "true") {
        router.replace(`/t/${workspace.slug}/pending`);
      }
    }
  }, [workspace.slug, router]);

  const getInitials = (nameStr?: string | null) => {
    if (!nameStr) return "PT";
    return nameStr
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 2) {
      setWhatsapp(raw);
    } else if (raw.length <= 6) {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else if (raw.length <= 10) {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`);
    } else {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/public/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceSlug: workspace.slug,
          name,
          email,
          whatsapp,
          plan: selectedPlan,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      // Save registration state to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(`atlasfit_pending_${workspace.slug}`, "true");
      }

      toast.success("Pré-cadastro realizado com sucesso! 🎉");
      router.replace(`/t/${workspace.slug}/pending`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao efetuar cadastro.");
      setIsLoading(false);
    }
  };

  const trainer = workspace.owner;

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col lg:flex-row relative">
      {/* Dynamic Branding Injector */}
      <style dangerouslySetInnerHTML={{
        __html: `
          :root, .dark {
            --primary: ${workspace.primaryColor} !important;
            --ring: ${workspace.primaryColor} !important;
          }
        `
      }} />

      {/* Trainer Info Column (Left Side) */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 relative z-10 lg:max-w-2xl border-b lg:border-b-0 lg:border-r border-neutral-900">
        <div>
          {/* Logo Branding */}
          <div className="flex items-center gap-2 mb-12">
            {workspace.logoUrl ? (
              <img src={workspace.logoUrl} alt={workspace.name} className="h-10 w-auto object-contain rounded-lg" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary rounded-lg">
                  <Flame className="size-6 text-black" />
                </div>
                <span className="text-xl font-black italic tracking-tighter uppercase">{workspace.name}</span>
              </div>
            )}
          </div>

          {/* Trainer presentation card */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-xl bg-primary flex items-center justify-center text-black font-extrabold text-2xl">
                {getInitials(trainer?.name)}
              </div>
              <div>
                <span className="text-xs uppercase font-bold tracking-widest text-primary">Personal Trainer</span>
                <h1 className="text-3xl font-black tracking-tight">{trainer?.name || "Treinador Oficial"}</h1>
              </div>
            </div>

            {trainer?.specialty && (
              <div className="flex items-center gap-2 text-neutral-300 bg-neutral-900 w-fit px-3 py-1.5 rounded-lg border border-neutral-800">
                <Award className="size-4 text-primary" />
                <span className="text-sm font-medium">{trainer.specialty}</span>
              </div>
            )}

            <p className="text-neutral-400 leading-relaxed text-base">
              {workspace.slogan || trainer?.bio || "Bem-vindo à nossa assessoria esportiva! Juntos vamos montar um planejamento individualizado de treinos e acompanhamento focado 100% nos seus resultados e na melhora da sua performance física."}
            </p>

            {trainer?.city && (
              <div className="flex items-center gap-2 text-neutral-400 text-sm">
                <MapPin className="size-4 text-neutral-500" />
                <span>{trainer.city}</span>
              </div>
            )}
          </div>
        </div>

        {/* Workspace details / Plans checklist */}
        <div className="mt-12 space-y-6">
          <h2 className="text-lg font-bold tracking-tight text-neutral-200">O que você terá acesso:</h2>
          <div className="grid gap-3.5">
            {[
              "Planilha de treinos digital e intuitiva",
              "Vídeos explicativos para cada exercício",
              "Histórico de evolução de cargas e medidas",
              "Gráficos interativos de performance",
              "Comunicação integrada via WhatsApp"
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3 text-neutral-300 text-sm font-medium">
                <CheckCircle2 className="size-4 text-primary shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capture Form Column (Right Side) */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative z-10">
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-8 lg:p-10 rounded-2xl relative">
          <div className="space-y-2 mb-8">
            <div className="text-xs text-primary font-bold tracking-wider uppercase">
              Comece sua jornada
            </div>
            <h2 className="text-3xl font-black tracking-tight uppercase">Faça seu Pré-Cadastro</h2>
            <p className="text-neutral-400 text-sm">Insira seus dados para solicitar o acesso aos treinos.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="capture-name" className="text-neutral-300 text-xs font-semibold uppercase tracking-wider">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 size-4 text-neutral-500" />
                <Input
                  id="capture-name"
                  required
                  placeholder="Ex: Gabriel Moreira"
                  className="pl-10 h-12 rounded-lg bg-neutral-950 border-neutral-800 text-white focus:border-primary/50 transition-colors focus:ring-0"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capture-email" className="text-neutral-300 text-xs font-semibold uppercase tracking-wider">E-mail de Acesso</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 size-4 text-neutral-500" />
                <Input
                  id="capture-email"
                  type="email"
                  required
                  placeholder="Ex: gabriel@email.com"
                  className="pl-10 h-12 rounded-lg bg-neutral-950 border-neutral-800 text-white focus:border-primary/50 transition-colors focus:ring-0"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="capture-whatsapp" className="text-neutral-300 text-xs font-semibold uppercase tracking-wider">WhatsApp</Label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-3.5 size-4 text-neutral-500" />
                <Input
                  id="capture-whatsapp"
                  placeholder="(11) 99999-9999"
                  className="pl-10 h-12 rounded-lg bg-neutral-950 border-neutral-800 text-white focus:border-primary/50 transition-colors focus:ring-0"
                  value={whatsapp}
                  onChange={handleWhatsAppChange}
                />
              </div>
            </div>



            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-lg text-sm font-semibold gap-2 mt-4 transition-colors bg-primary hover:bg-primary/90 text-black border-none"
            >
              {isLoading ? (
                <div className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  Solicitar Matrícula
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
