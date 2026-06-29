"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { login } from "./actions";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AuthFormProps {
  type: "student" | "trainer" | "admin";
  title: string;
  subtitle: string;
}

export function AuthForm({ type, title, subtitle }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const router = useRouter();
  const autoSubmitActive = useRef(false);

  // Cooldown timer effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const callbackUrl = type === "admin"
    ? "/superadmin/dashboard"
    : type === "student"
      ? "/select-workspace"
      : "/personal/dashboard";

  // Auto-submit OTP when 6 digits are entered
  useEffect(() => {
    if (otpValue.length === 6 && requires2FA && !autoSubmitActive.current) {
      autoSubmitActive.current = true;
      const autoSubmit = async () => {
        setIsLoading(true);
        const toastId = toast.loading("Verificando código de segurança...");
        try {
          const result = await login({
            email: emailVal,
            password: passwordVal,
            code: otpValue,
            redirectTo: callbackUrl,
          });

          if (result?.error) {
            toast.error(result.error, { id: toastId });
            autoSubmitActive.current = false;
            setIsLoading(false);
            return;
          }

          toast.success("Acesso autorizado! Bem-vindo de volta.", { id: toastId });
          const realCallbackUrl = result.role === "SUPERADMIN"
            ? "/superadmin/dashboard"
            : result.role === "TRAINER"
              ? "/personal/dashboard"
              : "/select-workspace";

          window.location.href = realCallbackUrl;
        } catch (error) {
          toast.error("Código incorreto ou expirado. Tente novamente.", { id: toastId });
          autoSubmitActive.current = false;
          setIsLoading(false);
        }
      };
      autoSubmit();
    }
  }, [otpValue, requires2FA, emailVal, passwordVal, callbackUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = emailVal || (formData.get("email") as string);
    const password = passwordVal || (formData.get("password") as string);

    try {
      if (requires2FA) {
        if (otpValue.length !== 6) {
          toast.error("O código de verificação deve ter 6 dígitos.");
          setIsLoading(false);
          return;
        }

        const result = await login({
          email,
          password,
          code: otpValue,
          redirectTo: callbackUrl,
        });

        if (result?.error) {
          toast.error(result.error);
          setIsLoading(false);
          return;
        }

        toast.success("Acesso autorizado!");
        const realCallbackUrl = result.role === "SUPERADMIN"
          ? "/superadmin/dashboard"
          : result.role === "TRAINER"
            ? "/personal/dashboard"
            : "/select-workspace";

        window.location.href = realCallbackUrl;
        return;
      }

      // Check credentials first
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

      if (result?.requires2FA) {
        setEmailVal(email);
        setPasswordVal(password);
        setRequires2FA(true);
        setResendCooldown(60);
        setIsLoading(false);
        autoSubmitActive.current = false;
        toast.success("Código de segurança enviado ao seu e-mail!");
        return;
      }

      // Redirect if direct login
      toast.success("Bem-vindo de volta!");
      const realCallbackUrl = result.role === "SUPERADMIN"
        ? "/superadmin/dashboard"
        : result.role === "TRAINER"
          ? "/personal/dashboard"
          : "/select-workspace";

      window.location.href = realCallbackUrl;
    } catch (error) {
      toast.error("Ocorreu um erro ao entrar. Tente novamente.");
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setIsLoading(true);
    const toastId = toast.loading("Enviando novo código...");
    try {
      const result = await login({
        email: emailVal,
        password: passwordVal,
        redirectTo: callbackUrl,
      });

      if (result?.error) {
        toast.error(result.error, { id: toastId });
      } else {
        toast.success("Novo código de verificação enviado!", { id: toastId });
        setOtpValue("");
        autoSubmitActive.current = false;
        setResendCooldown(60);
      }
    } catch (err) {
      toast.error("Erro ao reenviar o código.", { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="space-y-8 w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-extrabold tracking-tight">Verifique seu e-mail</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Enviamos um código de segurança de 6 dígitos para o e-mail: <strong className="text-foreground">{emailVal}</strong>. Insira-o abaixo para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={setOtpValue}
              disabled={isLoading}
              containerClassName="justify-center"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            type="submit"
            disabled={isLoading || otpValue.length !== 6}
            className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 gap-2 group overflow-hidden relative cursor-pointer"
          >
            {isLoading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
              />
            ) : (
              <>
                Confirmar Código
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </Button>
        </form>

        <div className="flex flex-col items-center space-y-4 text-center">
          <button
            type="button"
            disabled={isLoading || resendCooldown > 0}
            onClick={handleResendOTP}
            className="text-sm font-bold text-primary hover:underline disabled:opacity-50 disabled:no-underline cursor-pointer"
          >
            {resendCooldown > 0
              ? `Reenviar código em ${resendCooldown}s`
              : "Não recebeu o código? Reenviar"}
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setRequires2FA(false);
              setOtpValue("");
              autoSubmitActive.current = false;
            }}
            className="text-xs text-muted-foreground hover:underline font-semibold cursor-pointer"
          >
            Voltar para o login
          </button>
        </div>
      </div>
    );
  }

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
              <Button variant="link" asChild className="h-auto p-0 text-xs text-primary font-semibold">
                <Link href={`/auth/forgot-password?role=${type}`}>
                  Esqueceu a senha?
                </Link>
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
          className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20 gap-2 group overflow-hidden relative cursor-pointer"
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

      {type === 'trainer' && (
        <div className="text-center text-sm">
          <span className="text-muted-foreground">Não tem uma conta? </span>
          <Link href={"/auth/register"} className="font-bold text-primary hover:underline">
            Criar uma conta
          </Link>
        </div>
      )}
    </div>
  );
}
