"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  QrCode,
  CreditCard,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock3,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useAbly } from "@/providers/ably-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BillingStatusResponse {
  status: "OK" | "UPCOMING" | "WARNING" | "LOCKED";
  daysUntilLock: number | null;
  dueDate: string | null;
  toleranceLimit?: string | null;
  toleranceDays?: number | null;
  amountInCents?: number | null;
  inGracePeriod?: boolean;
  hasCpf?: boolean;
  userCpf?: string | null;
  planName?: string;
  isManual?: boolean;
}

interface ChargeData {
  isPaid?: boolean;
  transactionId?: string;
  paymentId?: string;
  invoiceUrl?: string;
  amountFormatted?: string;
  pixQrCodeBase64?: string | null;
  pixCopiaECola?: string | null;
  pixExpirationDate?: string | null;
  planName?: string;
  dueDate?: string;
}

function formatCpf(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function GracePeriodModal() {
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activePaymentTab, setActivePaymentTab] = useState<"pix" | "card">("pix");
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    expired: boolean;
  } | null>(null);

  // Estados de formulário e cobrança
  const [cpfInput, setCpfInput] = useState("");
  const [showCpfField, setShowCpfField] = useState(false);
  const [chargeData, setChargeData] = useState<ChargeData | null>(null);
  const [isGeneratingCharge, setIsGeneratingCharge] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Busca o status de faturamento
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/platform/billing-status");
      if (!res.ok) return;
      const data: BillingStatusResponse = await res.json();
      setBillingStatus(data);

      if (data.status === "WARNING") {
        setIsOpen(true);
        if (data.hasCpf === false) {
          setShowCpfField(true);
        } else if (data.userCpf) {
          setCpfInput(formatCpf(data.userCpf));
        }
      }
    } catch {
      // Silencioso para não degradar a experiência do usuário
    }
  }, []);

  const { data: session } = useSession();
  const ably = useAbly();

  // Escuta confirmação em tempo real via Ably
  useEffect(() => {
    if (!ably || !session?.user?.id || !isOpen) return;

    const channel = ably.channels.get(`user:${session.user.id}`);
    const onSubscriptionUpdated = (message: any) => {
      const status = message?.data?.status;
      if (status === "active") {
        setIsPaymentConfirmed(true);
        toast.success("Pagamento confirmado! Acesso regularizado.");
        setTimeout(() => {
          setIsOpen(false);
          window.location.reload();
        }, 1500);
      }
    };

    channel.subscribe("subscription:updated", onSubscriptionUpdated);

    return () => {
      channel.unsubscribe("subscription:updated", onSubscriptionUpdated);
    };
  }, [ably, session?.user?.id, isOpen]);

  // 2. Contador de precisão em tempo real
  useEffect(() => {
    if (!billingStatus?.toleranceLimit && !billingStatus?.dueDate) return;

    const limitDate = billingStatus.toleranceLimit
      ? new Date(billingStatus.toleranceLimit).getTime()
      : billingStatus.dueDate
        ? new Date(billingStatus.dueDate).getTime() + (billingStatus.toleranceDays ?? 5) * 86400000
        : null;

    if (!limitDate) return;

    const updateCountdown = () => {
      const now = Date.now();
      const diff = limitDate - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true });
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, expired: false });
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [billingStatus]);

  // 3. Emissão da cobrança no gateway
  const handleGenerateCharge = async () => {
    const rawCpf = cpfInput.replace(/\D/g, "");
    if (showCpfField && rawCpf.length !== 11) {
      toast.error("Informe um CPF válido (11 dígitos).");
      return;
    }

    setIsGeneratingCharge(true);
    try {
      const res = await fetch("/api/personal/subscription/asaas-charge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cpf: rawCpf || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "CPF_REQUIRED" || /cpf/i.test(data.error || "")) {
          setShowCpfField(true);
          throw new Error("Por favor, informe seu CPF abaixo para emitir a cobrança no Asaas.");
        }
        throw new Error(data.error || "Não foi possível gerar a cobrança.");
      }

      if (data.isPaid) {
        setIsPaymentConfirmed(true);
        toast.success("Pagamento identificado com sucesso.");
        setTimeout(() => {
          setIsOpen(false);
          window.location.reload();
        }, 1200);
        return;
      }

      setChargeData(data);
    } catch (err: any) {
      toast.error(err.message || "Falha na comunicação com o provedor de pagamentos.");
    } finally {
      setIsGeneratingCharge(false);
    }
  };

  // 4. Copiar código PIX com feedback direto
  const handleCopyPix = () => {
    if (!chargeData?.pixCopiaECola) return;
    navigator.clipboard.writeText(chargeData.pixCopiaECola);
    setCopiedPix(true);
    toast.success("Chave PIX copiada");
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // 5. Verificação imediata do pagamento
  const handleCheckPayment = async () => {
    if (!chargeData?.transactionId) return;
    setIsCheckingPayment(true);
    try {
      const res = await fetch(
        `/api/personal/subscription/asaas-charge?transactionId=${chargeData.transactionId}`
      );
      const data = await res.json();
      if (data.confirmed) {
        setIsPaymentConfirmed(true);
        toast.success("Pagamento confirmado. Assinatura renovada.");
        setTimeout(() => {
          setIsOpen(false);
          window.location.reload();
        }, 1200);
      } else {
        toast.info("Aguardando confirmação bancária. Pode levar alguns instantes.");
      }
    } catch {
      toast.error("Não foi possível consultar a compensação agora.");
    } finally {
      setIsCheckingPayment(false);
    }
  };

  if (!isOpen || billingStatus?.status !== "WARNING") {
    return null;
  }

  const formattedAmount = billingStatus.amountInCents
    ? (billingStatus.amountInCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    : "R$ 89,90";

  const formattedDueDate = billingStatus.dueDate
    ? new Date(billingStatus.dueDate).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    })
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-lg! p-0 border-border/60 bg-background font-sans shadow-xl flex items-center overflow-hidden! rounded-2xl!"
        onPointerDownOutside={(e) => {
          if (!isPaymentConfirmed) e.preventDefault();
        }}
      >
        <div className="absolute -top-10 size-50 bg-primary/20 -z-10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 right-0 size-100 bg-primary/20 -z-20 rounded-full blur-3xl" />
        {isPaymentConfirmed ? (
          <div className="p-8 text-center space-y-3">
            <div className="size-10 rounded-full bg-foreground/5 text-foreground flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">
                Pagamento confirmado
              </h3>
              <p className="text-xs text-muted-foreground">
                Sua assinatura foi renovada e seu acesso está garantido.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <DialogHeader className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                  Faturamento
                </span>
              </div>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                Renovação da Assinatura
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                A fatura do seu plano venceu. Seu acesso segue temporariamente liberado para evitar impacto na sua rotina com os alunos.
              </DialogDescription>
            </DialogHeader>

            {/* Painel Monolítico de Resumo: Prazo & Fatura */}
            <div className="rounded-xl border border-border/60 bg-muted/30 divide-y divide-border/40">
              {/* Cronômetro de Precisão */}
              <div className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  <span>Acesso bloqueia em</span>
                </div>
                {timeLeft && (
                  <div className="font-mono text-xs font-semibold tabular-nums tracking-tight text-foreground">
                    {timeLeft.days > 0 && `${timeLeft.days}d `}
                    {String(timeLeft.hours).padStart(2, "0")}h{" "}
                    {String(timeLeft.minutes).padStart(2, "0")}m{" "}
                    <span className="text-muted-foreground">
                      {String(timeLeft.seconds).padStart(2, "0")}s
                    </span>
                  </div>
                )}
              </div>

              {/* Linha Contábil */}
              <div className="p-3.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-medium text-foreground block">
                    {billingStatus.planName || "Plano Personal"}
                  </span>
                  {formattedDueDate && (
                    <span className="text-[11px] text-muted-foreground block font-mono">
                      Venceu em {formattedDueDate}
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-semibold text-foreground tracking-tight block">
                    {formattedAmount}
                  </span>
                  <span className="text-[10px] text-muted-foreground block uppercase font-mono tracking-wider">
                    Total
                  </span>
                </div>
              </div>
            </div>

            {/* Campo de CPF sutil (exigido pelo BACEN / Asaas se não cadastrado) */}
            {showCpfField && !chargeData && (
              <div className="space-y-1.5 text-left animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>CPF DO TITULAR</span>
                  <span className="text-[10px] text-muted-foreground/70">Exigência regulatória Asaas</span>
                </div>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpfInput}
                  onChange={(e) => setCpfInput(formatCpf(e.target.value))}
                  className="h-9 font-mono text-xs rounded-lg border-border/60 bg-muted/20"
                  maxLength={14}
                  autoFocus
                />
              </div>
            )}

            {/* Fluxo de Cobrança */}
            {chargeData ? (
              <div className="space-y-4">
                {/* Seletor de Método de Pagamento */}
                <Tabs
                  value={activePaymentTab}
                  onValueChange={(val) => setActivePaymentTab(val as "pix" | "card")}
                  className="w-full"
                >
                  <TabsList className="w-full grid grid-cols-2 h-9 p-1 bg-muted/60 rounded-lg">
                    <TabsTrigger
                      value="pix"
                      className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                      <QrCode className="size-3.5 mr-1.5" />
                      PIX Instantâneo
                    </TabsTrigger>
                    <TabsTrigger
                      value="card"
                      className="text-xs font-medium rounded-md data-[state=active]:bg-background data-[state=active]:shadow-xs"
                    >
                      <CreditCard className="size-3.5 mr-1.5" />
                      Cartão
                    </TabsTrigger>
                  </TabsList>

                  {/* Aba PIX */}
                  <TabsContent value="pix" className="pt-3 space-y-3">
                    {chargeData.pixQrCodeBase64 && (
                      <div className="flex justify-center py-2">
                        <div className="p-3 bg-white rounded-xl border border-border/50 shadow-xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={chargeData.pixQrCodeBase64}
                            alt="QR Code PIX"
                            className="size-36 block"
                          />
                        </div>
                      </div>
                    )}

                    {chargeData.pixCopiaECola && (
                      <div className="flex items-center max-w-80 mx-auto gap-2 p-1.5 pl-3 rounded-lg border border-border/60 bg-muted/20 text-xs">
                        <h1 className="font-mono text-[11px] text-muted-foreground truncate flex-1">
                          {chargeData.pixCopiaECola}
                        </h1>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleCopyPix}
                          className="h-7 px-2.5 text-xs font-medium rounded-md shrink-0 cursor-pointer"
                        >
                          {copiedPix ? (
                            <>
                              <Check className="size-3 text-emerald-500 mr-1" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="size-3 mr-1" />
                              Copiar
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="card" className="pt-3 space-y-3">
                    <div className="p-4 rounded-xl border border-border/60 bg-muted/20 text-center space-y-2">
                      <CreditCard className="size-5 mx-auto text-muted-foreground" />
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-foreground">
                          Pagamento via Cartão no Asaas
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Conclua em ambiente criptografado e seguro.
                        </p>
                      </div>
                      {chargeData.invoiceUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(chargeData.invoiceUrl, "_blank", "noopener,noreferrer")}
                          className="w-full text-xs font-medium h-9 rounded-lg gap-1.5 cursor-pointer mt-1"
                        >
                          Abrir fatura de pagamento
                          <ExternalLink className="size-3 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="space-y-2 pt-1 border-t border-border/40">
                  <Button
                    type="button"
                    onClick={handleCheckPayment}
                    disabled={isCheckingPayment}
                    className="w-full h-9 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/95 cursor-pointer transition-all"
                  >
                    {isCheckingPayment ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin mr-1.5" />
                        Verificando compensação...
                      </>
                    ) : (
                      "Já efetuei o pagamento"
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                    className="w-full h-8 rounded-lg text-xs font-normal text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    Lembrar mais tarde
                  </Button>
                </div>
              </div>
            ) : (
              /* Estado Inicial: Ação Direta */
              <div className="space-y-2 pt-1">
                <Button
                  type="button"
                  onClick={handleGenerateCharge}
                  disabled={isGeneratingCharge}
                  className="w-full h-10 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs cursor-pointer transition-all"
                >
                  {isGeneratingCharge ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      Gerando cobrança...
                    </>
                  ) : (
                    "Regularizar fatura agora"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="w-full h-8 rounded-lg text-xs font-normal text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Lembrar mais tarde
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
