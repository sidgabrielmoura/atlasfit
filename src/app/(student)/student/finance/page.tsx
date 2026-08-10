"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Wallet,
  CheckCircle2,
  QrCode,
  ArrowUpRight,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Receipt
} from "lucide-react";
import { centsToCurrencyString } from "@/modules/payments/domain/fee-calculator";
import { useAbly } from "@/providers/ably-provider";

import { TopBannerCarousel } from "@/components/application/top-banner-carousel";

interface StudentFinanceData {
  workspaceName: string;
  activePlan: {
    name: string;
    status: string;
    nextDueDate: string | null;
  };
  activeRecurrence?: {
    id: string;
    price: number;
    periodicity: string;
    paymentMethod: string;
    source: string;
    asaasSubscriptionId?: string | null;
    createdAt: string;
    nextDueDate?: string | null;
    description?: string;
  } | null;
  pendingBillings: Array<{
    id: string;
    title: string;
    grossAmountInCents: string;
    dueDate: string;
    status: string;
    paymentMethod: string;
    pixCopyPaste?: string;
    hostedInvoiceUrl?: string;
  }>;
  paidBillings: Array<{
    id: string;
    title: string;
    grossAmountInCents: string;
    paidAt: string;
    paymentMethod: string;
    hostedInvoiceUrl?: string;
  }>;
}

export default function StudentFinancePage() {
  const { data: session } = useSession();
  const ablyClient = useAbly();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<StudentFinanceData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "PAID">("PENDING");
  const [selectedPixBilling, setSelectedPixBilling] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [cancelingRecurrence, setCancelingRecurrence] = useState(false);

  const fetchStudentFinance = async () => {
    try {
      const res = await fetch("/api/student/finance");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      toast.error("Falha ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRecurrence = async () => {
    try {
      setCancelingRecurrence(true);
      const res = await fetch("/api/student/finance/recurrence", {
        method: "DELETE"
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || "Erro ao cancelar recorrência.");
      }

      toast.success("Recorrência no cartão de crédito cancelada com sucesso!");
      setIsCancelAlertOpen(false);
      fetchStudentFinance();
    } catch (error: any) {
      toast.error(error.message || "Erro ao cancelar recorrência.");
    } finally {
      setCancelingRecurrence(false);
    }
  };

  const handleManualRefresh = async () => {
    setSyncing(true);
    try {
      await fetchStudentFinance();
      toast.success("Dados financeiros atualizados com sucesso!");
    } catch {
      toast.error("Falha ao atualizar dados.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStudentFinance();
  }, []);

  useEffect(() => {
    if (!ablyClient || !session?.user?.id) return;
    const userChannel = ablyClient.channels.get(`user:${session.user.id}`);

    const handleWalletUpdate = () => {
      toast.success("Pagamento confirmado em tempo real!", {
        description: "Seu histórico financeiro foi atualizado."
      });
      fetchStudentFinance();
    };

    userChannel.subscribe("wallet:updated", handleWalletUpdate);
    return () => {
      userChannel.unsubscribe("wallet:updated", handleWalletUpdate);
    };
  }, [ablyClient, session?.user?.id]);

  const handleCopyPix = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Código Pix Copia e Cola copiado!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const totalPendingCents = data?.pendingBillings.reduce(
    (acc, item) => acc + BigInt(item.grossAmountInCents),
    BigInt(0)
  ) || BigInt(0);

  const totalPaidCents = data?.paidBillings.reduce(
    (acc, item) => acc + BigInt(item.grossAmountInCents),
    BigInt(0)
  ) || BigInt(0);

  if (loading) {
    return <StudentFinanceSkeleton />;
  }

  const allItems = [
    ...(data?.pendingBillings.map((b) => ({ ...b, isPaid: false })) || []),
    ...(data?.paidBillings.map((b) => ({ ...b, isPaid: true, dueDate: b.paidAt })) || [])
  ].sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const filteredItems = activeTab === "PENDING"
    ? data?.pendingBillings.map((b) => ({ ...b, isPaid: false })) || []
    : activeTab === "PAID"
      ? data?.paidBillings.map((b) => ({ ...b, isPaid: true, dueDate: b.paidAt })) || []
      : allItems;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-350 mx-auto select-none bg-background min-h-screen text-foreground">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-1">
            <Wallet className="size-4" />
            Atlas Pay · Consultoria Aluno
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-black tracking-tight text-foreground">Portal Financeiro</h2>
            <Badge className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {data?.workspaceName}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm font-medium mt-1">
            Gestão de mensalidades, faturas pendentes e histórico de pagamentos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={syncing}
            className="h-10 text-xs gap-2 font-medium bg-background border-border text-foreground hover:bg-muted rounded-xl cursor-pointer"
          >
            <RefreshCw className={`size-4 ${syncing ? "animate-spin text-primary" : ""}`} />
            <span>{syncing ? "Sincronizando..." : "Atualizar"}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-card via-background to-primary/10 text-card-foreground p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
              Plano de Consultoria Ativo
            </span>
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              {data?.activePlan.status === "ATIVO" ? "Ativo" : "Inativo"}
            </Badge>
          </div>

          <div className="relative z-10 space-y-1">
            <span className="text-2xl sm:text-4xl font-black tracking-tight text-foreground block">
              {data?.activePlan.name}
            </span>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 pt-6 border-t border-border">
            <div>
              <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                Próximo Vencimento
              </span>
              <span className="text-lg sm:text-2xl font-extrabold text-primary mt-1 block font-mono">
                {data?.activePlan.nextDueDate
                  ? new Date(data.activePlan.nextDueDate).toLocaleDateString("pt-BR")
                  : "Sem faturas pendentes"}
              </span>
            </div>

            <div>
              <span className="text-xs font-semibold text-muted-foreground block uppercase tracking-wider">
                Total Pendente
              </span>
              <span className={`text-lg sm:text-2xl font-extrabold mt-1 block font-mono ${totalPendingCents > BigInt(0) ? "" : "text-emerald-600 dark:text-emerald-400"
                }`}>
                {centsToCurrencyString(totalPendingCents)}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <Card className="bg-card border-border p-6 rounded-3xl space-y-4 flex-1 flex flex-col justify-between text-card-foreground">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-5" />
              </div>
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Total Quitado</span>
                <span className="text-xl font-black text-foreground font-mono">{centsToCurrencyString(totalPaidCents)}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Todas as suas mensalidades quitadas e comprovantes de consultoria ficam sincronizados em tempo real.
            </p>

            {data?.pendingBillings && data.pendingBillings.length > 0 && (
              <Button
                onClick={() => setSelectedPixBilling(data.pendingBillings[0])}
                className="w-full h-11 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-xl gap-2 shadow-lg shadow-amber-500/20 cursor-pointer mt-2"
              >
                <QrCode className="size-4" />
                <span>Pagar Mensalidade Aberta</span>
              </Button>
            )}
          </Card>
        </div>
      </div>

      {data?.activeRecurrence && (
        <Card className="bg-card border-border p-6 sm:p-8 rounded-3xl space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div className="flex items-center gap-3.5">
              <div className="size-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                <RefreshCw className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base font-extrabold text-foreground">Recorrência no Cartão de Crédito</h3>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                    Ativa via Atlas Pay
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  Mensalidade debitada automaticamente todos os meses no seu cartão de crédito pelo Asaas.
                </p>
              </div>
            </div>

            <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-10 text-xs font-bold px-4 rounded-xl cursor-pointer shrink-0"
                >
                  Cancelar Recorrência
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border text-card-foreground">
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar Recorrência no Cartão?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Essa ação encerrará a cobrança recorrente automática mensal no seu cartão de crédito via Asaas. Nenhuma cobrança futura será realizada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={cancelingRecurrence}>Voltar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancelRecurrence}
                    disabled={cancelingRecurrence}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-bold"
                  >
                    {cancelingRecurrence ? "Cancelando..." : "Sim, Cancelar Recorrência"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="space-y-0.5">
              <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Valor Mensal</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                R$ {data.activeRecurrence.price.toFixed(2)}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Data de Início</span>
              <span className="text-sm font-bold text-foreground">
                {new Date(data.activeRecurrence.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>
            <div className="space-y-0.5">
              <span className="text-muted-foreground block text-[10px] uppercase font-extrabold">Próxima Cobrança</span>
              <span className="text-sm font-bold text-foreground">
                {data.activeRecurrence.nextDueDate ? new Date(data.activeRecurrence.nextDueDate).toLocaleDateString('pt-BR') : "Conforme ciclo mensal"}
              </span>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="size-5 text-primary" />
              Extrato & Lançamentos
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Histórico detalhado de cobranças, mensalidades e comprovantes.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-muted p-1 rounded-2xl border border-border self-start sm:self-auto">
            <Button
              onClick={() => setActiveTab("PENDING")}
              variant="ghost"
              className={`h-8 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "PENDING"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Pendentes ({data?.pendingBillings.length || 0})
            </Button>
            <Button
              onClick={() => setActiveTab("PAID")}
              variant="ghost"
              className={`h-8 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "PAID"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Quitados ({data?.paidBillings.length || 0})
            </Button>
            <Button
              onClick={() => setActiveTab("ALL")}
              variant="ghost"
              className={`h-8 px-3 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === "ALL"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              Tudo ({allItems.length})
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <Card className="bg-card border-border text-center py-12 px-4 space-y-3 rounded-3xl text-card-foreground">
              <div className="size-12 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground mx-auto">
                <CheckCircle2 className="size-6 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">Nenhum lançamento nesta aba</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Suas mensalidades e cobranças aparecerão organizadas aqui.
                </p>
              </div>
            </Card>
          ) : (
            filteredItems.map((item) => {
              const isPaid = (item as any).isPaid;

              return (
                <Card
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-card border border-border hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-card-foreground"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className={`size-10 rounded-2xl border flex items-center justify-center shrink-0 ${isPaid
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      }`}>
                      {isPaid ? <CheckCircle2 className="size-5" /> : <QrCode className="size-5" />}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-foreground">{item.title}</h4>
                        <Badge className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${isPaid
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                          }`}>
                          {isPaid ? "PAGO" : "PENDENTE"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isPaid ? "Quitado em " : "Vencimento em "}
                        <strong className="text-foreground font-semibold">
                          {new Date(item.dueDate).toLocaleDateString("pt-BR")}
                        </strong>
                        {" · "}
                        <span>{item.paymentMethod || "Pix / Cartão"}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                    <div className="text-left sm:text-right">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Valor</span>
                      <span className={`text-base font-extrabold font-mono ${isPaid ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        }`}>
                        {centsToCurrencyString(BigInt(item.grossAmountInCents))}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isPaid && (item as any).pixCopyPaste && (
                        <Button
                          size="sm"
                          onClick={() => setSelectedPixBilling(item)}
                          className="h-9 px-3.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-xl gap-1.5 shadow-md cursor-pointer"
                        >
                          <QrCode className="size-3.5" />
                          <span>Pagar</span>
                        </Button>
                      )}

                      {item.hostedInvoiceUrl && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-9 px-3 text-xs font-semibold rounded-xl bg-background border-border text-foreground hover:bg-muted gap-1 cursor-pointer"
                        >
                          <a href={item.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                            <span>{isPaid ? "Comprovante" : "Fatura"}</span>
                            <ArrowUpRight className="size-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={!!selectedPixBilling} onOpenChange={(open) => !open && setSelectedPixBilling(null)}>
        <DialogContent className="max-w-md bg-card border-border text-card-foreground rounded-3xl p-6">
          <DialogHeader>
            <div className="size-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-2">
              <QrCode className="size-6" />
            </div>
            <DialogTitle className="text-lg font-black text-foreground">Pagamento via Pix</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {selectedPixBilling?.title} · Valor:{" "}
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                {selectedPixBilling && centsToCurrencyString(BigInt(selectedPixBilling.grossAmountInCents))}
              </strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedPixBilling?.pixCopyPaste && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Código Pix Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={selectedPixBilling.pixCopyPaste}
                    className="h-10 text-xs font-mono bg-background border-input text-foreground truncate rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={() => handleCopyPix(selectedPixBilling.id, selectedPixBilling.pixCopyPaste)}
                    className="h-10 px-4 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-black gap-1.5 shrink-0 cursor-pointer"
                  >
                    {copiedId === selectedPixBilling.id ? (
                      <>
                        <Check className="size-4" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {selectedPixBilling?.hostedInvoiceUrl && (
              <Button
                asChild
                variant="outline"
                className="w-full h-10 text-xs font-semibold rounded-xl gap-1.5 bg-background border-border text-foreground hover:bg-muted cursor-pointer"
              >
                <a href={selectedPixBilling.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                  <span>Abrir Fatura Completa em Nova Aba</span>
                  <ExternalLink className="size-3.5" />
                </a>
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSelectedPixBilling(null)}
              className="w-full h-9 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-xl cursor-pointer"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StudentFinanceSkeleton() {
  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full max-w-350 mx-auto bg-background text-foreground min-h-screen animate-pulse">
      <div className="flex justify-between items-center border-b border-border pb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-60 rounded-xl bg-muted" />
          <Skeleton className="h-4 w-96 max-w-full rounded-lg bg-muted" />
        </div>
        <Skeleton className="h-10 w-28 rounded-xl bg-muted" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <Skeleton className="h-64 bg-muted rounded-3xl" />
        </div>
        <div className="lg:col-span-4">
          <Skeleton className="h-64 bg-muted rounded-3xl" />
        </div>
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40 rounded-lg bg-muted" />
          <Skeleton className="h-9 w-60 rounded-2xl bg-muted" />
        </div>

        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-2xl bg-muted" />
        ))}
      </div>
    </div>
  );
}
