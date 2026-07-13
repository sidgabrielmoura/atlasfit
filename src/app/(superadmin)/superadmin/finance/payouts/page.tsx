"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  Users,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Search,
  Check,
  X,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function SuperAdminPayoutsPage() {
  const [payouts, setPayouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Payout action state
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [actionType, setActionType] = useState<"PAGO" | "REJEITADO" | null>(null);
  const [rejectedReason, setRejectedReason] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const fetchPayouts = async () => {
    try {
      const res = await fetch("/api/superadmin/payouts");
      if (!res.ok) throw new Error("Erro ao carregar solicitações de saques.");
      const result = await res.json();
      setPayouts(result);
    } catch (err: any) {
      toast.error(err.message || "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const handleProcessPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayout || !actionType) return;

    if (actionType === "REJEITADO" && !rejectedReason.trim()) {
      toast.error("Por favor, informe a justificativa da rejeição.");
      return;
    }

    setSubmitLoading(true);

    try {
      const res = await fetch("/api/superadmin/payouts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPayout.id,
          status: actionType,
          rejectedReason: actionType === "REJEITADO" ? rejectedReason.trim() : undefined
        })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success(
        actionType === "PAGO"
          ? "Solicitação marcada como PAGA! 🎉"
          : "Solicitação REJEITADA com sucesso. ❌"
      );

      setSelectedPayout(null);
      setActionType(null);
      setRejectedReason("");

      // Refresh list
      setLoading(true);
      fetchPayouts();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar saque.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter payouts
  const filteredPayouts = payouts.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.user?.name?.toLowerCase().includes(query) ||
      p.user?.email?.toLowerCase().includes(query) ||
      p.pixKey?.toLowerCase().includes(query)
    );
  });

  const pendingPayouts = filteredPayouts.filter((p) => p.status === "PENDENTE");
  const processedPayouts = filteredPayouts.filter((p) => p.status !== "PENDENTE");

  // Sum calculations
  const totalPendingVal = payouts
    .filter((p) => p.status === "PENDENTE")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPaidVal = payouts
    .filter((p) => p.status === "PAGO")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <DollarSign className="size-4" />
            Payout Ledger
          </div>
          <h1 className="text-3xl font-black tracking-tight">Solicitações de Saque</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Gerencie e libere transferências PIX pendentes dos personal trainers afiliados.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          {/* 2. Top Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Pendente (PIX)</p>
                  <h3 className="text-2xl font-black tracking-tight mt-1 text-amber-600 dark:text-amber-500">
                    {totalPendingVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Pago (PIX)</p>
                  <h3 className="text-2xl font-black tracking-tight mt-1 text-emerald-600 dark:text-emerald-500">
                    {totalPaidVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="size-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Solicitações Pendentes</p>
                  <h3 className="text-2xl font-black tracking-tight mt-1">
                    {payouts.filter((p) => p.status === "PENDENTE").length}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Users className="size-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 3. Search and Action Section */}
          <div className="space-y-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por personal ou chave..."
                className="pl-9 rounded-xl bg-card border-border/50 h-10 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Pending Requests List */}
            <div className="space-y-4">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <Clock className="size-5 text-amber-600 dark:text-amber-400" /> Saques Aguardando Análise ({pendingPayouts.length})
              </h2>

              <Card className="border-border/40 overflow-hidden p-0 space-y-0!">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-secondary/10 border-b border-border/40">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal Trainer</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destinatário (Chave PIX)</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data da Solicitação</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {pendingPayouts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-sm font-medium text-muted-foreground opacity-60">
                              Nenhuma solicitação de saque pendente encontrada.
                            </td>
                          </tr>
                        ) : (
                          pendingPayouts.map((payout) => {
                            const dateObj = new Date(payout.createdAt);
                            const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(dateObj);

                            return (
                              <tr key={payout.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">{payout.user?.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-semibold">{payout.user?.email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-black text-primary">
                                    {payout.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">{payout.pixKey}</span>
                                    <span className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">
                                      {payout.pixKeyType}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                                  {formattedDate}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedPayout(payout);
                                        setActionType("REJEITADO");
                                      }}
                                      className="h-8 rounded-lg text-rose-500 hover:bg-rose-500/10 border-rose-500/20 text-xs font-bold cursor-pointer"
                                    >
                                      Rejeitar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPayout(payout);
                                        setActionType("PAGO");
                                      }}
                                      className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1 border-none cursor-pointer"
                                    >
                                      <Check className="size-3.5" /> Pagar PIX
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Processed Requests History */}
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                <CheckCircle2 className="size-5 text-emerald-500" /> Histórico Geral de Transferências ({processedPayouts.length})
              </h2>

              <Card className="border-border/40 overflow-hidden p-0 space-y-0!">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-secondary/10 border-b border-border/40">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal Trainer</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Valor</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destinatário (Chave PIX)</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status / Justificativa</th>
                          <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Data da Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {processedPayouts.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center text-sm font-medium text-muted-foreground opacity-60">
                              Nenhuma transferência registrada no histórico.
                            </td>
                          </tr>
                        ) : (
                          processedPayouts.map((payout) => {
                            const dateObj = payout.paidAt ? new Date(payout.paidAt) : new Date(payout.updatedAt);
                            const formattedDate = new Intl.DateTimeFormat('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }).format(dateObj);

                            return (
                              <tr key={payout.id} className="hover:bg-secondary/20 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-sm font-bold">{payout.user?.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-semibold">{payout.user?.email}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <span className="text-sm font-black text-foreground">
                                    {payout.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">{payout.pixKey}</span>
                                    <span className="text-[9px] text-muted-foreground mt-0.5 font-bold uppercase tracking-wider">
                                      {payout.pixKeyType}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col items-start gap-1">
                                    <span className={cn(
                                      "text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider",
                                      payout.status === "PAGO" ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                    )}>
                                      {payout.status === "PAGO" ? "Pago / Transferido" : "Recusado"}
                                    </span>
                                    {payout.status === "REJEITADO" && payout.rejectedReason && (
                                      <span className="text-[10px] text-rose-500 leading-tight max-w-[200px] truncate font-semibold" title={payout.rejectedReason}>
                                        {payout.rejectedReason}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-xs font-bold text-muted-foreground">
                                  {formattedDate}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* 4. Action Confirmation Dialogs */}
      <Dialog open={!!selectedPayout && !!actionType} onOpenChange={(open) => {
        if (!open) {
          setSelectedPayout(null);
          setActionType(null);
          setRejectedReason("");
        }
      }}>
        <DialogContent className="max-w-md rounded-2xl!">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight">
              {actionType === "PAGO" ? "Confirmar Pagamento PIX" : "Recusar Solicitação de Saque"}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-muted-foreground">
              {actionType === "PAGO"
                ? "Certifique-se de que transferiu o valor no banco antes de confirmar."
                : "Informe o motivo para que o personal trainer seja notificado."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProcessPayout} className="space-y-4 py-3">
            {/* Context Details */}
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3 font-sans">
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-xs text-neutral-400 font-bold">Solicitante:</span>
                <span className="text-xs text-white font-black">{selectedPayout?.user?.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-xs text-neutral-400 font-bold">Valor do Saque:</span>
                <span className="text-xs text-primary font-black">
                  {selectedPayout?.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-400 font-bold">Chave PIX ({selectedPayout?.pixKeyType}):</span>
                <span className="text-xs text-white font-mono font-bold select-all bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800">
                  {selectedPayout?.pixKey}
                </span>
              </div>
            </div>

            {actionType === "REJEITADO" && (
              <div className="space-y-1.5">
                <Label htmlFor="reject-reason" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Justificativa</Label>
                <Textarea
                  required
                  id="reject-reason"
                  placeholder="Ex: Chave PIX inválida, dados incorretos..."
                  className="rounded-xl border-border/40 focus:border-rose-500 h-24"
                  value={rejectedReason}
                  onChange={(e) => setRejectedReason(e.target.value)}
                />
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setSelectedPayout(null);
                  setActionType(null);
                  setRejectedReason("");
                }}
                className="rounded-xl font-bold cursor-pointer"
                disabled={submitLoading}
              >
                Voltar
              </Button>
              {actionType === "PAGO" ? (
                <Button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-xl h-11 px-6 font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-lg shadow-emerald-500/10 gap-1.5 border-none"
                >
                  {submitLoading && <Loader2 className="size-4 animate-spin" />}
                  Confirmar Transferência
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={submitLoading}
                  className="rounded-xl h-11 px-6 font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-lg shadow-rose-500/10 gap-1.5 border-none"
                >
                  {submitLoading && <Loader2 className="size-4 animate-spin" />}
                  Recusar Saque
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
