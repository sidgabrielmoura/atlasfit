"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, ArrowRight, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/components/auth/actions";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role") || "trainer";
  
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      const res = await requestPasswordReset(email);
      if (res.error) {
        toast.error(res.error);
        setIsLoading(false);
        return;
      }
      
      toast.success(res.message || "E-mail de recuperação enviado com sucesso!");
      setIsSent(true);
    } catch (error) {
      toast.error("Ocorreu um erro ao processar sua solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleInfo = () => {
    switch (roleParam) {
      case "admin":
        return {
          bg: "/auth-bgs/admin.png",
          roleLabel: "administrador",
          loginUrl: "/auth/admin",
        };
      case "student":
        return {
          bg: "/auth-bgs/student.png",
          roleLabel: "aluno",
          loginUrl: "/auth/student",
        };
      default:
        return {
          bg: "/auth-bgs/trainer.png",
          roleLabel: "personal",
          loginUrl: "/auth/trainer",
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <AuthLayout backgroundImage={roleInfo.bg} role={roleInfo.roleLabel}>
      <div className="space-y-8 w-full max-w-sm mx-auto">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-extrabold tracking-tight">Recuperar Senha</h2>
          <p className="text-muted-foreground">
            {isSent 
              ? "Verifique seu e-mail para seguir as instruções de redefinição."
              : "Digite seu e-mail cadastrado para receber um link de redefinição de senha."}
          </p>
        </div>

        {isSent ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm text-center font-medium">
              E-mail de recuperação enviado! Se o e-mail estiver cadastrado, você receberá um link válido por 1 hora.
            </div>
            
            <Button asChild className="w-full h-14 rounded-2xl text-lg font-bold">
              <Link href={roleInfo.loginUrl} className="flex items-center justify-center gap-2">
                <ArrowLeft className="size-5" /> Voltar ao Login
              </Link>
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="email"
                  placeholder="seu@email.com"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 gap-2 group overflow-hidden relative"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Link
                    <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
              
              <div className="text-center">
                <Link href={roleInfo.loginUrl} className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1">
                  <ArrowLeft className="size-4" /> Voltar ao login
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-10 animate-spin text-primary" />
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
