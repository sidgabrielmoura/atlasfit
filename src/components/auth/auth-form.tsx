"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { login } from "./actions";

interface AuthFormProps {
  type: "student" | "trainer" | "admin";
  title: string;
  subtitle: string;
}

export function AuthForm({ type, title, subtitle }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const callbackUrl = type === "admin"
      ? "/superadmin/dashboard"
      : type === "student"
      ? "/select-workspace"
      : "/personal/dashboard";

    try {
      const result = await login({
        email,
        password,
        redirectTo: callbackUrl,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success("Bem-vindo de volta!");
      window.location.href = callbackUrl;
    } catch (error) {
      toast.error("Ocorreu um erro ao entrar. Tente novamente.");
      setIsLoading(false);
    }
  };

  const getThemeColor = () => {
    switch (type) {
      case "trainer": return "text-primary";
      case "admin": return "text-blue-600";
      default: return "text-primary";
    }
  };

  return (
    <div className="space-y-8 w-full max-w-sm mx-auto">
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                placeholder="seu@email.com"
                type="email"
                className="pl-10 h-12 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Button variant="link" className="h-auto p-0 text-xs text-primary font-semibold">
                Esqueceu a senha?
              </Button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                className="pl-10 pr-10 h-12 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-12 w-12 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2 px-1">
            <Checkbox id="remember" className="rounded-md" />
            <label htmlFor="remember" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
              Lembrar de mim
            </label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 gap-2 group overflow-hidden relative"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
            />
          ) : (
            <>
              Entrar Agora
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>

      <div className="text-center text-sm">
        <span className="text-muted-foreground">Não tem uma conta? </span>
        <Link href="#" className="font-bold text-primary hover:underline">
          Criar conta grátis
        </Link>
      </div>
    </div>
  );
}
