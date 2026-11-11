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
  X,
  Minus,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useAbly } from "@/providers/ably-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRegisterBottomAlert, useIsModalOpen } from "@/hooks/use-bottom-alert";

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
  isExpired?: boolean;
  transactionId?: string;
  paymentId?: string;
  invoiceUrl?: string;
  amountFormatted?: string;
  amountInCents?: number;
  pixQrCodeBase64?: string | null;
  pixCopiaECola?: string | null;
  pixExpirationDate?: string | null;
  planName?: string;
  dueDate?: string;
  createdAt?: string;
}

function formatCpf(val: string) {
  const digits = val.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatTimer(sec: number) {
  const hours = Math.floor(sec / 3600);
  const mins = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }
  return `${String(mins).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function GracePeriodModal() {
  const [billingStatus, setBillingStatus] = useState<BillingStatusResponse | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isAlertMinimized, setIsAlertMinimized] = useState(false);
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
  const [chargeExpiredNotice, setChargeExpiredNotice] = useState(false);
  const [chargeSecondsLeft, setChargeSecondsLeft] = useState<number | null>(null);
  const [chargeTotalSeconds, setChargeTotalSeconds] = useState<number>(3600);
  const [isGeneratingCharge, setIsGeneratingCharge] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chargeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const isModalOpen = useIsModalOpen();

  const isAlertVisible = isAlertOpen && !!chargeData && !isOpen;
  useRegisterBottomAlert("grace-period-charge", alertRef, isAlertVisible);

  // 1. Busca o status de faturamento e restaura cobrança pendente se houver
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

        // Busca se já existe uma cobrança ativa pendente no Asaas
        try {
          const chargeRes = await fetch("/api/personal/subscription/asaas-charge?active=true");
          if (chargeRes.ok) {
            const chargeJson = await chargeRes.json();
            if (chargeJson.activeCharge) {
              if (chargeJson.activeCharge.isPaid) {
                setIsPaymentConfirmed(true);
                return;
              }
              if (chargeJson.activeCharge.isExpired) {
                setChargeExpiredNotice(true);
              } else {
                setChargeData(chargeJson.activeCharge);
              }
            }
          }
        } catch {
          // Silencioso se não houver cobrança ativa
        }
      }
    } catch {
      // Silencioso para não degradar a experiência do usuário
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const { data: session } = useSession();
  const ably = useAbly();

  // Escuta confirmação, expiração e falha em tempo real via Ably
  useEffect(() => {
    if (!ably || !session?.user?.id) return;

    const channel = ably.channels.get(`user:${session.user.id}`);

    // Pagamento confirmado
    const onSubscriptionUpdated = (message: any) => {
      const status = message?.data?.status;
      if (status === "active") {
        setIsAlertOpen(false);
        setIsPaymentConfirmed(true);
        setIsOpen(true);
        toast.success("Pagamento confirmado! Acesso regularizado.");
        setTimeout(() => {
          setIsOpen(false);
          window.location.reload();
        }, 1500);
      }
    };

    // Tempo de cobrança excedeu
    const onChargeExpired = () => {
      setIsAlertOpen(false);
      setChargeData(null);
      setChargeExpiredNotice(true);
      setIsOpen(true);
      toast.warning("O prazo de pagamento desta cobrança expirou. Uma nova cobrança pode ser gerada.");
    };

    // Pagamento negado / falhou
    const onPaymentFailed = () => {
      toast.error("O pagamento foi recusado pela instituição bancária. Tente novamente via PIX.");
      setIsAlertOpen(false);
      setIsOpen(true);
    };

    channel.subscribe("subscription:updated", onSubscriptionUpdated);
    channel.subscribe("subscription:charge_expired", onChargeExpired);
    channel.subscribe("subscription:payment_failed", onPaymentFailed);

    return () => {
      channel.unsubscribe("subscription:updated", onSubscriptionUpdated);
      channel.unsubscribe("subscription:charge_expired", onChargeExpired);
      channel.unsubscribe("subscription:payment_failed", onPaymentFailed);
    };
  }, [ably, session?.user?.id]);

  // 2. Contador de tolerância de acesso em tempo real
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

  // 3. Contador de tempo e barra de progresso da cobrança aberta (PIX) - Máximo 3 horas
  useEffect(() => {
    if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);

    if (!chargeData) {
      setChargeSecondsLeft(null);
      return;
    }

    const createdAt = chargeData.createdAt ? new Date(chargeData.createdAt).getTime() : Date.now();
    const MAX_LIMIT_MS = 3 * 60 * 60 * 1000; // Máximo estrito de 3 horas
    const maxExpiresAt = createdAt + MAX_LIMIT_MS;

    let expiresAt = maxExpiresAt;
    if (chargeData.pixExpirationDate) {
      const parsed = new Date(chargeData.pixExpirationDate.replace(" ", "T")).getTime();
      if (!isNaN(parsed) && parsed < maxExpiresAt) {
        expiresAt = parsed;
      }
    }

    const total = Math.max(60, Math.min(3 * 3600, Math.floor((expiresAt - createdAt) / 1000)));
    setChargeTotalSeconds(total);

    const updateChargeTimer = () => {
      const now = Date.now();
      const diffSec = Math.floor((expiresAt - now) / 1000);

      if (diffSec <= 0) {
        setChargeSecondsLeft(0);
        if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);

        // Cobrança expirou: o alert desaparece e o modal reaparece instantaneamente!
        setIsAlertOpen(false);
        setChargeData(null);
        setChargeExpiredNotice(true);
        setIsOpen(true);
        toast.warning("O prazo de pagamento desta cobrança expirou.");
        return;
      }

      setChargeSecondsLeft(diffSec);
    };

    updateChargeTimer();
    chargeIntervalRef.current = setInterval(updateChargeTimer, 1000);

    return () => {
      if (chargeIntervalRef.current) clearInterval(chargeIntervalRef.current);
    };
  }, [chargeData]);

  const chargeProgressPercent =
    chargeSecondsLeft !== null
      ? Math.max(0, Math.min(100, (chargeSecondsLeft / chargeTotalSeconds) * 100))
      : 100;

  // 4. Emissão da cobrança no gateway
  const handleGenerateCharge = async () => {
    const rawCpf = cpfInput.replace(/\D/g, "");
    if (showCpfField && rawCpf.length !== 11) {
      toast.error("Informe um CPF válido (11 dígitos).");
      return;
    }

    setIsGeneratingCharge(true);
    setChargeExpiredNotice(false);
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
          setIsAlertOpen(false);
          window.location.reload();
        }, 1200);
        return;
      }

      setChargeData(data);
      setIsOpen(true); // Garante permanência aberta do modal com a cobrança
    } catch (err: any) {
      toast.error(err.message || "Falha na comunicação com o provedor de pagamentos.");
    } finally {
      setIsGeneratingCharge(false);
    }
  };

  // 5. Copiar código PIX com feedback direto
  const handleCopyPix = () => {
    if (!chargeData?.pixCopiaECola) return;
    navigator.clipboard.writeText(chargeData.pixCopiaECola);
    setCopiedPix(true);
    toast.success("Código PIX copiado para a área de transferência.");
    setTimeout(() => setCopiedPix(false), 2000);
  };

  // 6. Verificação imediata do pagamento
  const handleCheckPayment = async () => {
    if (!chargeData?.transactionId) return;
    setIsCheckingPayment(true);
    try {
      const res = await fetch(
        `/api/personal/subscription/asaas-charge?transactionId=${chargeData.transactionId}`
      );
      const data = await res.json();
      if (data.confirmed) {
        setIsAlertOpen(false);
        setIsPaymentConfirmed(true);
        setIsOpen(true);
        toast.success("Pagamento confirmado. Assinatura renovada.");
        setTimeout(() => {
          setIsOpen(false);
          window.location.reload();
        }, 1200);
      } else {
        toast.info("Aguardando compensação bancária. Pode levar alguns instantes.");
      }
    } catch {
      toast.error("Não foi possível consultar a compensação agora.");
    } finally {
      setIsCheckingPayment(false);
    }
  };

  // 7. Fechamento centralizado do modal:
  // Se o usuário fechar o modal de qualquer forma (X no celular/desktop, ESC ou botões),
  // e houver cobrança em aberto, o alerta flutuante no canto inferior direito abre instantaneamente!
  const handleModalOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && chargeData && !isPaymentConfirmed) {
      setIsAlertOpen(true);
      setIsAlertMinimized(false);
    }
  };

  const handlePostpone = () => {
    handleModalOpenChange(false);
  };

  if (billingStatus?.status !== "WARNING") {
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
    <>
      {/* MODAL PRINCIPAL */}
      <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
        <DialogContent
          className="max-w-lg! p-0 border-border/60 bg-background font-sans shadow-xl flex items-center overflow-hidden! rounded-2xl!"
          onPointerDownOutside={(e) => {
            if (!isPaymentConfirmed) e.preventDefault();
          }}
        >
          <div className="absolute -top-10 size-50 bg-primary/20 -z-10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 right-0 size-100 bg-primary/20 -z-20 rounded-full blur-3xl" />

          {isPaymentConfirmed ? (
            <div className="p-8 text-center space-y-3 w-full">
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
            <div className="p-6 space-y-5 w-full">
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

              {/* Aviso caso a cobrança anterior tenha expirado */}
              {chargeExpiredNotice && !chargeData && (
                <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-500 flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold block">Cobrança anterior expirada</span>
                    <span className="text-[11px] text-amber-500/90 block">
                      O prazo limite de pagamento da última via venceu. Gere uma nova cobrança abaixo para regularizar seu acesso.
                    </span>
                  </div>
                </div>
              )}

              {/* Painel Monolítico de Resumo: Prazo & Fatura */}
              <div className="rounded-xl border border-border/60 bg-muted/30 divide-y divide-border/40">
                {/* Cronômetro de Precisão da Tolerância */}
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
                      {chargeData?.amountFormatted || formattedAmount}
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

              {/* Fluxo de Cobrança com QR Code ou Cartão */}
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
                          <div className="size-36 bg-white rounded-xl overflow-hidden border border-border/50 shadow-xs">
                            <img
                              src={chargeData.pixQrCodeBase64}
                              alt="QR Code PIX"
                              className="block"
                            />
                          </div>
                        </div>
                      )}

                      {chargeData.pixCopiaECola && (
                        <div className="flex items-center max-w-80 mx-auto gap-2 p-1.5 pl-3 rounded-lg border border-border/60 bg-muted/20 text-xs">
                          <span className="font-mono text-[11px] text-muted-foreground truncate flex-1 select-all">
                            {chargeData.pixCopiaECola}
                          </span>
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

                      {chargeSecondsLeft !== null && (
                        <div className="text-center">
                          <span className="text-[11px] font-mono text-muted-foreground">
                            Tempo restante para este código: <strong className="text-foreground">{formatTimer(chargeSecondsLeft)}</strong>
                          </span>
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
                      onClick={handlePostpone}
                      className="w-full h-8 rounded-lg text-xs font-normal text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Deixar para mais tarde
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
                    onClick={() => handleModalOpenChange(false)}
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

      {/* ALERT FLUTUANTE NO CANTO INFERIOR DIREITO (DESKTOP) OU BASE CENTRALIZADA EMPILHADA COM A NAVBAR (MOBILE) */}
      {isAlertVisible && (
        <div
          ref={alertRef}
          className={cn(
            "fixed z-30 animate-in fade-in slide-in-from-bottom-5 duration-300 font-sans select-none transition-[opacity] duration-300",
            // Mobile: centralizado na base com safe-area, com a mesma largura e alinhamento da navbar
            "max-md:bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] max-md:left-1/2 max-md:-translate-x-1/2 max-md:w-[calc(100%-2rem)] max-md:max-w-sm",
            // Desktop: canto inferior direito tradicional
            "md:bottom-5 md:right-5 md:left-auto md:translate-x-0",
            isAlertMinimized
              ? "md:w-auto md:max-w-[calc(100vw-2.5rem)]"
              : "md:w-[380px] md:max-w-[calc(100vw-2rem)]",
            isModalOpen && "opacity-0 pointer-events-none invisible"
          )}
        >
          {isAlertMinimized ? (
            /* Card Minimizado: Fininho e compacto, apenas com "Cobrança em aberto", tempo e barra de progresso */
            <div
              onClick={() => setIsAlertMinimized(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsAlertMinimized(false);
                }
              }}
              className="relative px-3.5 py-2.5 bg-card/95 backdrop-blur-md border border-border/80 hover:border-primary/50 shadow-xl rounded-2xl flex items-center justify-between gap-3.5 overflow-hidden text-foreground cursor-pointer transition-all duration-300 group hover:shadow-2xl w-full"
              title="Clique para expandir a cobrança"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20 group-hover:scale-105 transition-transform">
                  <Clock3 className="size-3.5" />
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold uppercase tracking-wider text-foreground whitespace-nowrap">
                    Cobrança em aberto
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/10 text-amber-500 font-mono">
                    PIX
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {chargeSecondsLeft !== null && (
                  <span className="font-mono text-xs text-muted-foreground tabular-nums font-semibold">
                    {formatTimer(chargeSecondsLeft)}
                  </span>
                )}
                <div
                  className="text-muted-foreground group-hover:text-foreground transition-colors p-1 rounded-md"
                  aria-label="Expandir detalhes"
                >
                  <ChevronUp className="size-4" />
                </div>
              </div>

              {/* Barra de Progresso Regredindo na base do alert minimizado */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-linear"
                  style={{ width: `${chargeProgressPercent}%` }}
                />
              </div>
            </div>
          ) : (
            /* Card Expandido */
            <div className="relative p-4 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-2xl flex flex-col gap-1 overflow-hidden text-foreground transition-all duration-300">
              {/* Botão de Minimizar (substitui o X anterior) */}
              <button
                type="button"
                onClick={() => setIsAlertMinimized(true)}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1 rounded-md hover:bg-muted/50"
                title="Minimizar alerta"
                aria-label="Minimizar alerta"
              >
                <Minus className="size-4" />
              </button>

              <div className="flex items-center gap-2.5 pr-8">
                <div className="size-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 border border-amber-500/20">
                  <Clock3 className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Cobrança em aberto
                    </h4>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 font-mono">
                      PIX
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {chargeData.planName || "Plano Personal"} • {chargeData.amountFormatted || formattedAmount}
                  </p>
                </div>
              </div>

              {/* Layout Desktop: Texto explicativo + Contador + QR Code ao lado */}
              <div className="hidden md:flex items-end justify-between gap-3 pt-1">
                <div className="space-y-2 flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Escaneie o QR Code no seu banco para ativar agora.
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setIsAlertOpen(false);
                        setIsOpen(true);
                      }}
                      className="h-7 px-2.5 text-xs font-medium rounded-lg cursor-pointer"
                    >
                      Abrir detalhes
                    </Button>
                    {chargeSecondsLeft !== null && (
                      <span className="font-mono text-xs text-muted-foreground tabular-nums font-semibold">
                        {formatTimer(chargeSecondsLeft)}
                      </span>
                    )}
                  </div>
                </div>

                {chargeData.pixQrCodeBase64 && (
                  <div
                    onClick={() => {
                      setIsAlertOpen(false);
                      setIsOpen(true);
                    }}
                    title="Clique para ampliar"
                    className="size-30 bg-white overflow-hidden rounded-xl border border-border shadow-xs cursor-pointer hover:scale-105 transition-transform shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={chargeData.pixQrCodeBase64}
                      alt="QR Code PIX"
                      className="block"
                    />
                  </div>
                )}
              </div>

              {/* Layout Mobile: Código Copia e Cola com botão Copiar */}
              <div className="flex md:hidden flex-col gap-2.5 pt-1 pb-1">
                <p className="text-[11px] text-muted-foreground">
                  Copie o código PIX abaixo e pague no app do seu banco:
                </p>

                {chargeData.pixCopiaECola && (
                  <div className="flex items-center gap-2 p-1.5 pl-2.5 rounded-lg border border-border/70 bg-muted/30 text-xs">
                    <span className="font-mono text-[11px] text-muted-foreground truncate flex-1 select-all">
                      {chargeData.pixCopiaECola}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyPix}
                      className="h-7 px-2 text-xs font-medium rounded-md shrink-0 cursor-pointer"
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

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsAlertOpen(false);
                      setIsOpen(true);
                    }}
                    className="h-7 px-2.5 text-xs font-medium rounded-lg"
                  >
                    Ver detalhes
                  </Button>
                  {chargeSecondsLeft !== null && (
                    <span className="font-mono text-xs text-muted-foreground tabular-nums font-semibold">
                      Expira em {formatTimer(chargeSecondsLeft)}
                    </span>
                  )}
                </div>
              </div>

              {/* Barra de Progresso Regredindo na base do alert */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/40 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 ease-linear"
                  style={{ width: `${chargeProgressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
