"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { resetPassword } from "@/components/auth/actions";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("/auth/trainer");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Token de acesso inválido ou expirado.");
      return;
    }

    if (password.length < 6) {
      toast.error("A senha deve conter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await resetPassword(token, password);

      if (result.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      // Map role to login URL
      let targetLogin = "/auth/trainer";
      if (result.role === "SUPERADMIN") {
        targetLogin = "/auth/admin";
      } else if (result.role === "STUDENT") {
        targetLogin = "/auth/student";
      } else if (result.role === "TRAINER") {
        targetLogin = "/auth/trainer";
      }
      setRedirectUrl(targetLogin);

      toast.success("Senha redefinida com sucesso! 🎉");
      setIsSuccess(true);

      setTimeout(() => {
        router.push(targetLogin);
      }, 3000);
    } catch (error) {
      toast.error("Ocorreu um erro ao redefinir a senha. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-6 text-center max-w-sm mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-destructive/10 text-destructive rounded-full animate-pulse">
            <AlertTriangle className="size-12" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Token Inválido</h2>
          <p className="text-muted-foreground">
            O link de redefinição de senha é inválido, expirou ou já foi utilizado. Por favor, solicite um novo link.
          </p>
        </div>
        <Button asChild className="w-full h-14 rounded-2xl text-lg font-bold">
          <Link href="/auth/forgot-password" className="flex items-center justify-center gap-2">
            <ArrowLeft className="size-5" /> Solicitar Novo Link
          </Link>
        </Button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center max-w-sm mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full animate-bounce">
            <CheckCircle2 className="size-12" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight font-black">Senha Redefinida!</h2>
          <p className="text-muted-foreground font-medium">
            Sua senha foi redefinida com sucesso. Você será redirecionado para a página de login em instantes...
          </p>
        </div>
        <Button asChild className="w-full h-14 rounded-2xl text-lg font-bold mt-4 shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700 text-white border-none">
          <Link href={redirectUrl} className="flex items-center justify-center gap-2">
            Ir para Login <ArrowRight className="size-5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-sm mx-auto">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight font-black">Nova Senha</h2>
        <p className="text-muted-foreground">
          Escolha uma nova senha segura para acessar sua conta no AtlasFit.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="No mínimo 6 caracteres"
                className="pl-10 pr-10 h-12 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-12 w-12 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita a nova senha"
                className="pl-10 pr-10 h-12 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-12 w-12 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 gap-2 group overflow-hidden relative"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
              <span>Redefinindo...</span>
            </div>
          ) : (
            <>
              Redefinir Senha
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      backgroundImage="/auth-bgs/trainer.png"
      role="personal"
    >
      <Suspense fallback={
        <div className="flex items-center justify-center h-48">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="size-8 border-4 border-primary/30 border-t-primary rounded-full"
          />
        </div>
      }>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
