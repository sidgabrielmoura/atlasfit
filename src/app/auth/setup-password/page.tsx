"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { setupPassword, getSetupInfo } from "@/components/auth/actions";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, ArrowRight, CheckCircle2, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { isValidCPF, formatCPF } from "@/lib/cpf-validator";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

function SetupPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [needsCpf, setNeedsCpf] = useState(false);
  const [needsBirthDate, setNeedsBirthDate] = useState(false);
  const [needsEmail, setNeedsEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [infoRevision, setInfoRevision] = useState(0);
  const [documents, setDocuments] = useState<{ termsDocumentId: string; privacyDocumentId: string; termsDocumentHash: string; privacyDocumentHash: string; terms: { version: string; content: string }; privacy: { version: string; content: string } } | null>(null);
  const [documentOpen, setDocumentOpen] = useState<"terms" | "privacy" | null>(null);

  useEffect(() => {
    let active = true; setInfoLoading(true); setInfoError(null); setDocuments(null); setAcceptedTerms(false); setAcceptedPrivacy(false);
    getSetupInfo(token).then(res => {
      if (!active) return;
      if ("success" in res && res.success) { setNeedsCpf(res.needsCpf); setNeedsBirthDate(res.needsBirthDate); setNeedsEmail("needsEmail" in res && res.needsEmail === true); setDocuments(res); }
      else setInfoError(res.error || "Não foi possível validar o convite.");
    }).catch(() => { if (active) setInfoError("Não foi possível validar o convite. Tente novamente."); }).finally(() => { if (active) setInfoLoading(false); });
    return () => { active = false; };
  }, [token, infoRevision]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !documents || infoLoading) {
      toast.error("Token de acesso inválido ou expirado.");
      return;
    }

    if (needsCpf) {
      if (!cpfCnpj) {
        toast.error("O CPF é obrigatório para concluir o cadastro.");
        return;
      }
      if (!isValidCPF(cpfCnpj)) {
        toast.error("O CPF informado é inválido. Digite um CPF válido com 11 dígitos.");
        return;
      }
    }

    if (needsBirthDate && !birthDate) {
      toast.error("A data de nascimento é obrigatória para verificação de elegibilidade (18+).");
      return;
    }

    if (!acceptedTerms || !acceptedPrivacy) {
      toast.error("Você deve ler e aceitar os Termos de Uso e estar ciente da Política de Privacidade.");
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
      const result = await setupPassword(
        token,
        password,
        needsCpf ? cpfCnpj : undefined,
        needsBirthDate ? birthDate : undefined,
        acceptedTerms,
        acceptedPrivacy,
        documents.termsDocumentId,
        documents.privacyDocumentId,
        needsEmail ? email : undefined,
        documents.termsDocumentHash,
        documents.privacyDocumentHash
      );

      if ("error" in result && result.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success("Senha criada com sucesso! 🎉");
      setIsSuccess(true);

      setTimeout(() => {
        router.push("/auth/student");
      }, 2000);
    } catch (error) {
      toast.error("Ocorreu um erro ao definir a senha. Tente novamente.");
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-6 text-center max-w-sm mx-auto">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-full animate-bounce">
            <CheckCircle2 className="size-12" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Tudo pronto!</h2>
          <p className="text-muted-foreground">
            Sua senha foi configurada com sucesso. Você será redirecionado para a página de login em instantes...
          </p>
        </div>
      </div>
    );
  }

  if (infoLoading) return <div className="w-full max-w-sm space-y-4" aria-label="Validando convite"><Skeleton className="h-8 w-48" /><Skeleton className="h-48 w-full" /></div>;
  if (infoError) return <div className="max-w-sm space-y-4"><p role="alert" className="text-sm">{infoError}</p><Button variant="outline" onClick={() => setInfoRevision(value => value + 1)}>Tentar novamente</Button><Link href="/auth/student" className="block text-sm underline">Ir para login</Link></div>;
  return (
    <div className="space-y-6 w-full max-w-sm mx-auto">
      <Dialog open={documentOpen !== null} onOpenChange={open => { if (!open) setDocumentOpen(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{documentOpen === "terms" ? "Termos de Uso" : "Política de Privacidade"}</DialogTitle><DialogDescription>Versão {documentOpen && documents?.[documentOpen].version}</DialogDescription></DialogHeader>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{documentOpen && documents?.[documentOpen].content}</div>
        </DialogContent>
      </Dialog>
      <div className="space-y-2 text-center md:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight">Crie sua Senha</h2>
        <p className="text-muted-foreground text-xs">
          Defina sua senha de acesso para ativar sua conta de aluno no AtlasFit (exclusivo para maiores de 18 anos).
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3.5">
          {needsCpf && (
            <div className="space-y-1.5">
              <Label htmlFor="cpf" className="font-semibold text-xs uppercase tracking-wider">
                CPF do Aluno (Obrigatório)
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="cpf"
                  required
                  placeholder="000.000.000-00"
                  className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-xs"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(formatCPF(e.target.value))}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {needsBirthDate && (
            <div className="space-y-1.5">
              <Label htmlFor="birthDate" className="font-semibold text-xs uppercase tracking-wider">
                Data de Nascimento (18+)
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  id="birthDate"
                  type="date"
                  required
                  max={new Date().toISOString().split("T")[0]}
                  className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-xs"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {needsEmail && <div className="space-y-1.5"><Label htmlFor="setup-email">Seu e-mail para login</Label><Input id="setup-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={isLoading} autoComplete="email" /></div>}
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="No mínimo 6 caracteres"
                className="pl-10 pr-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-xs"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repita a nova senha"
                className="pl-10 pr-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-secondary/50 transition-all text-xs"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-11 w-11 text-muted-foreground hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
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
              <button type="button" onClick={() => setDocumentOpen("terms")} className="font-semibold text-primary hover:underline">
                Termos de Uso
              </button>{" "}
              do AtlasFit.
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
              <button type="button" onClick={() => setDocumentOpen("privacy")} className="font-semibold text-primary hover:underline">
                Política de Privacidade
              </button>
              .
            </label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={isLoading || !token || !documents || !acceptedTerms || !acceptedPrivacy}
          className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20 gap-2 group overflow-hidden relative"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              className="size-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
            />
          ) : (
            <>
              Confirmar Senha e Ativar Conta
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

export default function SetupPasswordPage() {
  return (
    <AuthLayout
      backgroundImage="/auth-bgs/student.png"
      role="aluno"
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
        <SetupPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
