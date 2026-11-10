"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Coins, Loader2, X, ShieldCheck, Mail, Sparkles } from "lucide-react";

interface CreditGrantSectionProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    importCredits?: number | null;
  };
  onCreditsUpdated: (newCredits: number) => void;
}

interface ActiveChallenge {
  challengeId: string;
  amount: number;
  expiresInSeconds: number;
  superadminEmail: string;
  expiresAtMs: number;
}

export function CreditGrantSection({ user, onCreditsUpdated }: CreditGrantSectionProps) {
  const [creditAmount, setCreditAmount] = useState<number | "">("");
  const [isRequesting, setIsRequesting] = useState(false);

  // Verification popup state
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Live timer countdown & progress calculation
  useEffect(() => {
    if (!activeChallenge) return;

    const totalSeconds = activeChallenge.expiresInSeconds || 300;

    const updateTimer = () => {
      const remainingMs = activeChallenge.expiresAtMs - Date.now();
      const sec = Math.max(0, Math.ceil(remainingMs / 1000));
      setRemainingSeconds(sec);

      if (sec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        toast.error("Tempo limite de validação expirado. Solicite novamente.");
        handleClosePopup();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeChallenge]);

  const handleClosePopup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActiveChallenge(null);
    setOtpCode("");
    setIsVerifying(false);
    setFailedAttempts(0);
  };

  const handleRequestCredits = async () => {
    const amount = typeof creditAmount === "number" ? creditAmount : parseInt(String(creditAmount), 10);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error("Informe uma quantidade válida de créditos.");
      return;
    }

    setIsRequesting(true);
    try {
      const res = await fetch(`/api/superadmin/users/${user.id}/credits/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Erro ao solicitar código de validação.");
      }

      const totalSec = data.expiresInSeconds || 300;
      setActiveChallenge({
        challengeId: data.challengeId,
        amount,
        expiresInSeconds: totalSec,
        superadminEmail: data.superadminEmail,
        expiresAtMs: Date.now() + totalSec * 1000,
      });

      setOtpCode("");
      setFailedAttempts(0);
      setRemainingSeconds(totalSec);
      toast.info("Código de verificação enviado para seu e-mail!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao solicitar concessão de créditos.");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleConfirmCode = async (codeToSubmit: string) => {
    if (!activeChallenge || isVerifying) return;

    setIsVerifying(true);
    try {
      const res = await fetch(`/api/superadmin/users/${user.id}/credits/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: activeChallenge.challengeId,
          code: codeToSubmit,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.codeExhausted) {
          toast.error("Código incorreto 3 vezes. Operação cancelada por segurança.");
          handleClosePopup();
          return;
        }

        const newFailed = failedAttempts + 1;
        setFailedAttempts(newFailed);
        setOtpCode("");

        if (newFailed >= 3) {
          toast.error("Código incorreto 3 vezes. Operação cancelada por segurança.");
          handleClosePopup();
          return;
        }

        toast.error(data.error || `Código incorreto. Restam ${3 - newFailed} tentativa(s).`);
        return;
      }

      // Success!
      toast.success(`+${activeChallenge.amount.toLocaleString()} créditos concedidos com sucesso!`);
      if (typeof data.newCredits === "number") {
        onCreditsUpdated(data.newCredits);
      }
      setCreditAmount("");
      handleClosePopup();
    } catch (err: any) {
      toast.error(err.message || "Erro ao validar código.");
      setOtpCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtpCode(value);
    if (value.length === 6 && !isVerifying) {
      handleConfirmCode(value);
    }
  };

  // Format mm:ss
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const totalSec = activeChallenge?.expiresInSeconds || 300;
  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / totalSec) * 100));

  return (
    <>
      {/* SEÇÃO PRINCIPAL DE CRÉDITOS */}
      <Card className="border-border/40 shadow-xs bg-card/50 lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-border/30">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <Coins className="size-5 text-primary" /> Créditos de Importação (IA)
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest mt-0.5">
              Concessão administrativa com validação segura por e-mail e auditoria
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="font-bold text-xs px-3 py-1 bg-primary/10 text-primary border-primary/20 rounded-xl"
          >
            Saldo: {(user.importCredits ?? 0).toLocaleString()} créditos
          </Badge>
        </CardHeader>

        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border/30 bg-secondary/15">
            <div className="space-y-1 max-w-lg">
              <p className="text-sm font-bold text-foreground">Adicionar Créditos</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Insira a quantidade desejada. Por segurança, você receberá um código de 6 dígitos no seu e-mail de superadmin para autorizar a operação.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative">
                <Input
                  type="number"
                  min="1"
                  step="100"
                  placeholder="Ex: 1000"
                  value={creditAmount}
                  onChange={(e) => {
                    const val = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                    setCreditAmount(isNaN(Number(val)) ? "" : val);
                  }}
                  disabled={isRequesting || !!activeChallenge}
                  className="h-10 text-xs rounded-xl w-full sm:w-40 font-bold bg-background border-border/60"
                />
              </div>

              <div className="flex items-center gap-1.5">
                {[500, 1000, 5000].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isRequesting || !!activeChallenge}
                    onClick={() => setCreditAmount(amt)}
                    className="h-10 text-[11px] px-2.5 rounded-xl font-bold border-border/40 hover:bg-secondary/40 shrink-0"
                  >
                    +{amt.toLocaleString()}
                  </Button>
                ))}
              </div>

              <Button
                type="button"
                onClick={handleRequestCredits}
                disabled={isRequesting || !creditAmount || Number(creditAmount) <= 0 || !!activeChallenge}
                className="h-10 rounded-xl text-xs font-bold gap-2 bg-primary text-primary-foreground shadow-xs shrink-0"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    Enviando código...
                  </>
                ) : (
                  <>
                    <Coins className="size-3.5" />
                    Adicionar Créditos
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* POPUP FLUTUANTE NO CANTO INFERIOR DIREITO */}
      {activeChallenge && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100%-2rem)] sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="relative p-5 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl flex flex-col gap-3.5 overflow-hidden">
            {/* Close button */}
            <button
              type="button"
              onClick={handleClosePopup}
              disabled={isVerifying}
              className="absolute top-3.5 right-3.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label="Fechar validação"
            >
              <X className="size-4" />
            </button>

            {/* Header info */}
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                  Validar Concessão
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Código de 6 dígitos enviado por e-mail
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center pt-1 pb-1 w-full! max-w-full!">
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={handleOtpChange}
                disabled={isVerifying}
                containerClassName="justify-center gap-1.5 w-full! max-w-full!"
              >
                <InputOTPGroup className="gap-1.5 w-full! max-w-full!">
                  <InputOTPSlot index={0} className="size-9 sm:size-10 w-full! text-base font-bold rounded-lg" />
                  <InputOTPSlot index={1} className="size-9 sm:size-10 w-full! text-base font-bold rounded-lg" />
                  <InputOTPSlot index={2} className="size-9 sm:size-10 w-full! text-base font-bold rounded-lg" />
                  <InputOTPSlot index={3} className="size-9 sm:size-10 w-full! text-base font-bold rounded-lg" />
                  <InputOTPSlot index={4} className="size-9 sm:size-10 w-full! text-base font-bold rounded-lg" />
                  <InputOTPSlot index={5} className="size-9 sm:size-10 w-full! text-base font-bold rounded-lg" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                {isVerifying ? (
                  <span className="flex items-center gap-1.5 text-primary font-bold">
                    <Loader2 className="size-3 animate-spin" /> Validando...
                  </span>
                ) : failedAttempts > 0 ? (
                  <span className="text-destructive font-medium">
                    Tentativas: {failedAttempts}/3
                  </span>
                ) : (
                  <span>Insira os 6 dígitos</span>
                )}
              </div>

              <span className="font-mono text-muted-foreground font-bold">
                {formatTimer(remainingSeconds)}
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/40 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-linear"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
