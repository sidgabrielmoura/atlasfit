"use client";
import { useRequestAttempt } from "@/hooks/use-request-attempt";
import { parseBrlCents } from "@/modules/workspaces/domain/currency-input";

import { useState, useEffect, useRef } from "react";
import { accountsResponseSchema, drawerResponseSchema, type InternalAccount, type CurrentDrawer, type DrawerHistoryItem } from "./internal-finance-contract";
import { toast } from "sonner";
import {
  Lock,
  Unlock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  ShieldCheck,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface CashDrawerTabProps {
  workspaceId: string;
  canManage: boolean;
  canRecord: boolean;
}

export function CashDrawerTab({ workspaceId, canManage, canRecord }: CashDrawerTabProps) {
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState<CurrentDrawer>(null);
  const [history, setHistory] = useState<DrawerHistoryItem[]>([]);
  const [cashAccounts, setCashAccounts] = useState<InternalAccount[]>([]);
  const [openingAccountId, setOpeningAccountId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadVersion = useRef(0);

  // Modais
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<"SUPPLY" | "BLEED">("SUPPLY");
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [selectedSessionToReconcile, setSelectedSessionToReconcile] = useState<DrawerHistoryItem | null>(null);

  // Estados de formulário
  const [openingAmount, setOpeningAmount] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");

  const [movementAmount, setMovementAmount] = useState("");
  const [movementDescription, setMovementDescription] = useState("");
  const movementAttempt = useRequestAttempt(`GYM:${workspaceId}:CASH:${currentSession?.id || "closed"}`);

  const [countedAmount, setCountedAmount] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  const [reconcileNotes, setReconcileNotes] = useState("");

  // Loading states de ações assíncronas
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDrawerData = async () => {
    const version = ++loadVersion.current;
    try {
      setLoading(true);
      setLoadError(null);
      const [res, accountsRes] = await Promise.all([
        fetch(`/api/gym/finance/cash-drawer?workspaceId=${workspaceId}`),
        fetch(`/api/gym/finance/accounts?workspaceId=${workspaceId}`),
      ]);
      if (!res.ok || !accountsRes.ok) throw new Error("Erro ao carregar dados do caixa");
      const data = drawerResponseSchema.parse(await res.json());
      const accounts = accountsResponseSchema.parse(await accountsRes.json()).accounts.filter(account => account.accountType === "CASH");
      if (version !== loadVersion.current) return;
      setCurrentSession(data.currentSession);
      setHistory(data.history.sessions);
      setCashAccounts(accounts);
      setOpeningAccountId(previous => accounts.some(account => account.id === previous) ? previous : accounts[0]?.id || "");
    } catch (err) {
      if (version !== loadVersion.current) return;
      setCurrentSession(null);
      setHistory([]);
      setCashAccounts([]);
      setLoadError(err instanceof Error ? err.message : "Falha ao consultar caixa");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrawerData();
    return () => { loadVersion.current++; };
  }, [workspaceId]);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // 1. Abrir Caixa
  const handleOpenCashDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!cashAccounts.some(account => account.id === openingAccountId)) { toast.error("Selecione uma conta de caixa disponível."); return; }

    const valueInCents = parseBrlCents(openingAmount);
    if (valueInCents === null) {
      toast.error("Informe um fundo de troco válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gym/finance/cash-drawer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          financialAccountId: openingAccountId,
          openingAmountInCents: valueInCents,
          notes: openingNotes || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao abrir caixa");
      }

      toast.success("Sessão de caixa aberta com sucesso!");
      setIsOpenModalOpen(false);
      setOpeningAmount("");
      setOpeningNotes("");
      fetchDrawerData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao abrir caixa");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Registrar Suprimento ou Sangria
  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !currentSession) return;

    const valueInCents = parseBrlCents(movementAmount);
    if (valueInCents === null || valueInCents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gym/finance/cash-drawer/movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          sessionId: currentSession.id,
          idempotencyKey: movementAttempt.keyFor(JSON.stringify({ workspaceId, sessionId: currentSession.id, movementType, amountInCents: valueInCents, description: movementDescription || undefined })),
          movementType,
          amountInCents: valueInCents,
          description: movementDescription || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao registrar movimentação");
      }

      movementAttempt.confirmed();
      toast.success(`${movementType === "SUPPLY" ? "Suprimento" : "Sangria"} registrado.`);
      setIsMovementModalOpen(false);
      setMovementAmount("");
      setMovementDescription("");
      fetchDrawerData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao registrar movimentação");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Fechar Caixa
  const handleCloseCashDrawer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !currentSession) return;

    const countedCents = parseBrlCents(countedAmount);
    if (countedCents === null) {
      toast.error("Informe o valor físico contado.");
      return;
    }

    const expectedCents = currentSession.expectedCashInCents;
    const diff = countedCents - expectedCents;

    if (diff !== 0 && (!differenceReason || differenceReason.trim().length < 5)) {
      toast.error("A justificativa é obrigatória caso haja divergência (mínimo 5 caracteres).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gym/finance/cash-drawer/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          sessionId: currentSession.id,
          actualCashInCents: countedCents,
          differenceReason: diff !== 0 ? differenceReason : undefined,
          notes: closeNotes || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao fechar caixa");
      }

      toast.success("Sessão de caixa fechada com sucesso!");
      setIsCloseModalOpen(false);
      setCountedAmount("");
      setDifferenceReason("");
      setCloseNotes("");
      fetchDrawerData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao fechar caixa");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Reconciliação Gerencial
  const handleReconcileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedSessionToReconcile) return;

    if (!reconcileNotes || reconcileNotes.trim().length < 5) {
      toast.error("Informe as notas da auditoria gerencial.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gym/finance/cash-drawer/reconcile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          sessionId: selectedSessionToReconcile.id,
          reconciliationNotes: reconcileNotes
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao reconciliar caixa");
      }

      toast.success("Sessão de caixa auditada e reconciliada!");
      setIsReconcileModalOpen(false);
      setReconcileNotes("");
      setSelectedSessionToReconcile(null);
      fetchDrawerData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reconciliar caixa");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-w-0 [&>*]:min-w-0">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  // Cálculo de diferença no modal de fechamento
  const countedCentsLive = parseBrlCents(countedAmount);
  const liveDifference = currentSession && countedCentsLive !== null ? countedCentsLive - currentSession.expectedCashInCents : null;

  if (loadError) return <div role="alert" className="space-y-3 rounded-md border p-4 text-sm"><p>{loadError}</p><Button variant="outline" onClick={fetchDrawerData}>Tentar novamente</Button></div>;

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL DO CAIXA DO TURNO */}
      {currentSession ? (
        <Card className="min-w-0 border-emerald-500/30 bg-emerald-500/5">
          <CardHeader className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <Badge className="bg-emerald-600 text-white gap-1">
                  <Unlock className="h-3 w-3" /> Caixa Aberto
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">{currentSession.sessionNumber}</span>
              </div>
              <CardTitle className="text-lg font-bold mt-1">
                {currentSession.financialAccountName}
              </CardTitle>
              <CardDescription className="text-sm">
                Aberto em {new Date(currentSession.openedAt).toLocaleTimeString("pt-BR")} • Fundo inicial de {formatCurrency(currentSession.openingAmountInCents)}
              </CardDescription>
            </div>

            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {canRecord && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMovementType("SUPPLY");
                      setIsMovementModalOpen(true);
                    }}
                    className="gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                  >
                    <TrendingUp className="h-4 w-4" /> Suprimento
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMovementType("BLEED");
                      setIsMovementModalOpen(true);
                    }}
                    className="gap-1 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                  >
                    <TrendingDown className="h-4 w-4" /> Sangria
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setIsCloseModalOpen(true)}
                    className="gap-1"
                  >
                    <Lock className="h-4 w-4" /> Fechar Caixa
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 min-w-0 [&>*]:min-w-0">
              <div className="p-3 rounded-lg border bg-background/60">
                <span className="text-xs text-muted-foreground">Fundo Inicial</span>
                <p className="text-lg font-bold text-foreground">{formatCurrency(currentSession.openingAmountInCents)}</p>
              </div>
              <div className="p-3 rounded-lg border bg-background/60">
                <span className="text-xs text-muted-foreground">Movimentos do Turno</span>
                <p className="text-lg font-bold text-foreground">{currentSession.movementsCount} registros</p>
              </div>
              <div className="p-3 rounded-lg border bg-background/60">
                <span className="text-xs text-muted-foreground">Pagamentos Recebidos</span>
                <p className="text-lg font-bold text-foreground">{currentSession.paymentsCount} no balcão</p>
              </div>
              <div className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10">
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Saldo Físico Esperado</span>
                <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  {formatCurrency(currentSession.expectedCashInCents)}
                </p>
              </div>
            </div>

            {/* ÚLTIMAS MOVIMENTAÇÕES DO CAIXA ABERTO */}
            {currentSession.movements.length > 0 && (
              <div className="mt-4 border-t pt-3">
                <span className="text-xs font-semibold text-muted-foreground">Movimentações deste turno:</span>
                <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto pr-1">
                  {currentSession.movements.map((mov) => (
                    <div key={mov.id} className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/40 border">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {mov.movementType === "OPENING" && <Badge variant="outline" className="text-[10px]">Abertura</Badge>}
                        {mov.movementType === "SUPPLY" && <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">Suprimento (+)</Badge>}
                        {mov.movementType === "BLEED" && <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">Sangria (-)</Badge>}
                        {mov.movementType === "CASH_INFLOW_PAYMENT" && <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px]">Recebimento (+)</Badge>}
                        {mov.movementType === "EXPENSE_PAYMENT" && <Badge className="bg-red-500/10 text-red-600 border-red-500/30 text-[10px]">Despesa (-)</Badge>}
                        <span className="text-foreground">{mov.description}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-semibold">{formatCurrency(mov.amountInCents)}</span>
                        <span className="text-muted-foreground text-[10px]">{new Date(mov.createdAt).toLocaleTimeString("pt-BR")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="min-w-0 border-border/50">
          <CardHeader className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Lock className="h-5 w-5 text-muted-foreground" /> Caixa do Turno Fechado
              </CardTitle>
              <CardDescription className="text-sm">
                Nenhuma sessão de caixa aberta para você no momento. Abra o caixa para começar a receber pagamentos presenciais em dinheiro.
              </CardDescription>
            </div>
            {canRecord && (
              <Button disabled={!cashAccounts.length} onClick={() => setIsOpenModalOpen(true)} className="gap-1.5 mt-2 sm:mt-0">
                <Unlock className="h-4 w-4" /> Abrir Caixa da Recepção
              </Button>
            )}
          </CardHeader>
        </Card>
      )}

      {/* HISTÓRICO DE SESSÕES / TURNOS DE CAIXA */}
      <Card className="min-w-0 border-border/50">
        <CardHeader className="min-w-0 flex flex-col items-start justify-between gap-3 xl:flex-row xl:flex-wrap xl:items-center">
          <div>
            <CardTitle className="text-base font-semibold">Histórico de Sessões de Caixa</CardTitle>
            <CardDescription className="text-sm">
              Conferência de turnos anteriores, saldo esperado vs contado e justificativas de divergência.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDrawerData} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" /> Atualizar
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {history.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma sessão de caixa fechada encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número / Data</TableHead>
                    <TableHead>Operador</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Fundo Inicial</TableHead>
                    <TableHead>Esperado</TableHead>
                    <TableHead>Contado</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Auditoria</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((sess) => {
                    const diff = sess.differenceInCents || 0;
                    return (
                      <TableRow key={sess.id}>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="font-mono text-xs font-bold">{sess.sessionNumber}</span>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(sess.openedAt).toLocaleDateString("pt-BR")} ({new Date(sess.openedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              {sess.closedAt ? ` - ${new Date(sess.closedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {sess.openedByUserName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {sess.financialAccountName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatCurrency(sess.openingAmountInCents)}
                        </TableCell>
                        <TableCell className="text-sm font-semibold">
                          {formatCurrency(sess.expectedCashInCents)}
                        </TableCell>
                        <TableCell className="text-sm font-bold">
                          {sess.actualCashInCents !== null ? formatCurrency(sess.actualCashInCents) : "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {diff === 0 ? (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                              Exato (R$ 0,00)
                            </Badge>
                          ) : diff > 0 ? (
                            <div className="flex flex-col">
                              <Badge className="bg-emerald-600 text-[10px]">
                                Sobra: +{formatCurrency(diff)}
                              </Badge>
                              {sess.differenceReason && (
                                <span className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[140px]" title={sess.differenceReason}>
                                  {sess.differenceReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col">
                              <Badge variant="destructive" className="text-[10px]">
                                Falta: {formatCurrency(diff)}
                              </Badge>
                              {sess.differenceReason && (
                                <span className="text-[10px] text-red-500 mt-0.5 truncate max-w-[140px]" title={sess.differenceReason}>
                                  {sess.differenceReason}
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {sess.status === "OPEN" && <Badge className="bg-emerald-600 text-[10px]">Aberto</Badge>}
                          {sess.status === "CLOSED" && <Badge variant="outline" className="text-[10px]">Fechado</Badge>}
                          {sess.status === "RECONCILED" && (
                            <Badge className="bg-blue-600 text-white text-[10px] gap-0.5">
                              <ShieldCheck className="h-2.5 w-2.5" /> Reconciliado
                            </Badge>
                          )}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            {sess.status === "CLOSED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSessionToReconcile(sess);
                                  setIsReconcileModalOpen(true);
                                }}
                                className="h-7 text-xs gap-1"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Reconciliar
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: ABRIR CAIXA */}
      <Dialog open={isOpenModalOpen} onOpenChange={setIsOpenModalOpen}>
        <DialogContent className="sm:max-w-md sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-primary" /> Abertura de Caixa da Recepção
            </DialogTitle>
            <DialogDescription>
              Informe o fundo de troco inicial conferido fisicamente no início do turno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenCashDrawer} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="openingAccount">Conta de caixa *</Label>
              <Select value={openingAccountId} onValueChange={setOpeningAccountId}>
                <SelectTrigger id="openingAccount"><SelectValue placeholder="Selecione a conta" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {cashAccounts.map(account => <SelectItem key={account.id} value={account.id}>{account.name} · {account.unitName || "Central"}</SelectItem>)}
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="openingAmount">Fundo de Troco Inicial (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                <Input
                  id="openingAmount"
                  required
                  placeholder="150,00"
                  className="pl-9 font-semibold"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
              </div>
              <span className="text-[11px] text-muted-foreground">
                Valor em dinheiro/moedas colocado na gaveta para troco.
              </span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingNotes">Observações do Turno (Opcional)</Label>
              <Textarea
                id="openingNotes"
                placeholder="Ex: Turno da manhã. Gaveta física 01 conferida."
                rows={2}
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpenModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Abertura
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SUPRIMENTO / SANGRIA */}
      <Dialog open={isMovementModalOpen} onOpenChange={setIsMovementModalOpen}>
        <DialogContent className="sm:max-w-md sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {movementType === "SUPPLY" ? (
                <>
                  <TrendingUp className="h-5 w-5 text-emerald-600" /> Registrar Suprimento de Caixa
                </>
              ) : (
                <>
                  <TrendingDown className="h-5 w-5 text-amber-600" /> Registrar Sangria de Caixa
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {movementType === "SUPPLY"
                ? "Adição de dinheiro ou moedas para reforço de troco no caixa."
                : "Retirada de dinheiro da gaveta por segurança (depósito em cofre/banco)."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMovementSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="movAmount">Valor da Movimentação (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                <Input
                  id="movAmount"
                  required
                  placeholder="50,00"
                  className="pl-9 font-semibold"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="movDesc">Motivo / Descrição *</Label>
              <Input
                id="movDesc"
                required
                placeholder={movementType === "SUPPLY" ? "Ex: Adição de moedas de 1 real" : "Ex: Retirada de cédulas para envelope cofre"}
                value={movementDescription}
                onChange={(e) => setMovementDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsMovementModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar {movementType === "SUPPLY" ? "Suprimento" : "Sangria"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: FECHAR CAIXA */}
      <Dialog open={isCloseModalOpen} onOpenChange={setIsCloseModalOpen}>
        <DialogContent className="sm:max-w-lg sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" /> Fechamento e Conferência de Caixa
            </DialogTitle>
            <DialogDescription>
              Conte fisicamente todas as cédulas e moedas da gaveta para encerrar o turno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCloseCashDrawer} className="space-y-4 pt-2">
            {currentSession && (
              <div className="p-3 rounded-lg border bg-muted/30 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fundo inicial:</span>
                  <span className="font-mono">{formatCurrency(currentSession.openingAmountInCents)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1 text-sm text-foreground">
                  <span>Saldo Físico Esperado pelo Sistema:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(currentSession.expectedCashInCents)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="countedAmount">Valor em Dinheiro Contado na Gaveta (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                <Input
                  id="countedAmount"
                  required
                  placeholder="200,00"
                  className="pl-9 font-bold text-base"
                  value={countedAmount}
                  onChange={(e) => setCountedAmount(e.target.value)}
                />
              </div>
            </div>

            {/* FEEDBACK DE DIFERENÇA EM TEMPO REAL */}
            {liveDifference !== null && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                  liveDifference === 0
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  {liveDifference === 0 ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{liveDifference === 0 ? "Conferência Exata: Caixa 100% batido" : liveDifference > 0 ? "Sobra identificada no caixa" : "Falta identificada no caixa"}</span>
                </div>
                <span className="font-mono font-bold text-sm">
                  {liveDifference === 0 ? "R$ 0,00" : `${liveDifference > 0 ? "+" : ""}${formatCurrency(liveDifference)}`}
                </span>
              </div>
            )}

            {/* SE HOUVER DIVERGÊNCIA, JUSTIFICATIVA OBRIGATÓRIA */}
            {liveDifference !== null && liveDifference !== 0 && (
              <div className="space-y-2 p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                <Label htmlFor="diffReason" className="text-destructive font-semibold">
                  Justificativa da Divergência (Obrigatória pelo regulamento) *
                </Label>
                <Textarea
                  id="diffReason"
                  required
                  placeholder="Descreva detalhadamente o motivo da diferença apurada na gaveta..."
                  rows={2}
                  value={differenceReason}
                  onChange={(e) => setDifferenceReason(e.target.value)}
                />
                <span className="text-[11px] text-muted-foreground">
                  A justificativa será registrada na trilha de auditoria do fechamento.
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="closeNotes">Observações Finais</Label>
              <Textarea
                id="closeNotes"
                placeholder="Observações adicionais do fechamento..."
                rows={2}
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCloseModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Confirmar Fechamento do Caixa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: RECONCILIAÇÃO GERENCIAL */}
      <Dialog open={isReconcileModalOpen} onOpenChange={setIsReconcileModalOpen}>
        <DialogContent className="sm:max-w-md sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" /> Auditoria e Reconciliação Gerencial
            </DialogTitle>
            <DialogDescription>
              Homologação do turno pelo gerente ou proprietário da academia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReconcileSubmit} className="space-y-4 pt-2">
            {selectedSessionToReconcile && (
              <div className="p-3 rounded-lg border bg-muted/40 space-y-1 text-xs">
                <p><strong>Caixa:</strong> {selectedSessionToReconcile.sessionNumber}</p>
                <p><strong>Operador:</strong> {selectedSessionToReconcile.openedByUserName}</p>
                <p><strong>Esperado:</strong> {formatCurrency(selectedSessionToReconcile.expectedCashInCents)}</p>
                <p><strong>Contado:</strong> {selectedSessionToReconcile.actualCashInCents ? formatCurrency(selectedSessionToReconcile.actualCashInCents) : "—"}</p>
                {selectedSessionToReconcile.differenceReason && (
                  <p className="text-amber-600"><strong>Justificativa da diferença:</strong> {selectedSessionToReconcile.differenceReason}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recNotes">Parecer da Auditoria Gerencial *</Label>
              <Textarea
                id="recNotes"
                required
                placeholder="Ex: Envelopes de sangria conferidos e depositados no cofre. Aprovado."
                rows={3}
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsReconcileModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Homologar Reconciliação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
