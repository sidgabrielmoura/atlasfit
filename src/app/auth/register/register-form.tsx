"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, User, Calendar, ArrowRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { registerTrainer } from "./actions";

export function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref") || "";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!acceptedTerms || !acceptedPrivacy) {
      toast.error("Você deve ler e aceitar os Termos de Uso e a Política de Privacidade.");
      return;
    }

    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const birthDate = formData.get("birthDate") as string;

    try {
      const result = await registerTrainer({
        name,
        email,
        password,
        birthDate,
        acceptedTerms,
        acceptedPrivacy,
        marketingConsent,
        referralCode,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success("Cadastro realizado com sucesso! Faça login para entrar.");
      router.push("/auth/trainer");
    } catch (error) {
      toast.error("Ocorreu um erro ao realizar o cadastro. Tente novamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-sm mx-auto">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">Criar Conta Grátis</h2>
        <p className="text-muted-foreground text-sm">Experimente a plataforma completa grátis por 30 dias (exclusivo para maiores de 18 anos).</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="name"
                name="name"
                placeholder="Seu nome"
                type="text"
                className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                max={new Date().toISOString().split("T")[0]}
                className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                placeholder="seu@email.com"
                type="email"
                className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="pl-10 pr-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Legal & Privacy Checkboxes */}
        <div className="space-y-2.5 pt-1 text-xs text-muted-foreground">
          <div className="flex items-start space-x-2">
            <Checkbox
              id="acceptedTerms"
              checked={acceptedTerms}
              onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="acceptedTerms" className="leading-snug cursor-pointer select-none">
              Li e concordo com os{" "}
              <Link href="/termos-de-uso" target="_blank" className="font-semibold text-primary hover:underline">
                Termos de Uso
              </Link>{" "}
              do AtlasFit (v1.0).
            </label>
          </div>

          <div className="flex items-start space-x-2">
            <Checkbox
              id="acceptedPrivacy"
              checked={acceptedPrivacy}
              onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="acceptedPrivacy" className="leading-snug cursor-pointer select-none">
              Estou ciente do tratamento dos meus dados conforme a{" "}
              <Link href="/politica-de-privacidade" target="_blank" className="font-semibold text-primary hover:underline">
                Política de Privacidade
              </Link>
              .
            </label>
          </div>

          <div className="flex items-start space-x-2 pt-1">
            <Checkbox
              id="marketingConsent"
              checked={marketingConsent}
              onCheckedChange={(checked) => setMarketingConsent(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="marketingConsent" className="leading-snug cursor-pointer select-none text-muted-foreground/80">
              (Opcional) Desejo receber comunicações de novidades e dicas por e-mail.
            </label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !acceptedTerms || !acceptedPrivacy}
          className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 gap-2 group overflow-hidden relative"
        >
          {isLoading ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
              Criando Conta...
            </>
          ) : (
            <>
              Criar Conta Grátis
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Já tem uma conta? </span>
        <Link href="/auth/trainer" className="font-bold text-primary hover:underline">
          Fazer Login
        </Link>
      </div>
    </div>
  );
}
