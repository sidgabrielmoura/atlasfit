"use client";

import { GymMetricCard } from "@/components/application/gym-page";
import { useRequestAttempt } from "@/hooks/use-request-attempt";
import { accountsResponseSchema, expenseCategoriesResponseSchema, suppliersResponseSchema, type InternalAccount } from "./internal-finance-contract";
import { SelectGroup } from "@/components/ui/select";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  TrendingDown,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Clock,
  FileText,
  Trash2,
  Building,
  Tag
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { GymCashExpenseService } from "@/modules/workspaces/application/cash-drawer-expense-service";
import { parseBrlCents } from "@/modules/workspaces/domain/currency-input";
type Expense = Awaited<ReturnType<GymCashExpenseService["listExpenses"]>>["expenses"][number];
type ExpensePayment = Expense["payments"][number];

interface ExpensesTabProps {
  workspaceId: string;
  canManage: boolean;
  canReverse: boolean;
}

export function ExpensesTab({ workspaceId, canManage, canReverse }: ExpensesTabProps) {
  const activeLoad = useRef<AbortController | null>(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [kpis, setKpis] = useState({ totalPendingInCents: 0, totalPaidInCents: 0, totalOverdueInCents: 0 });
  const [categories, setCategories] = useState<Awaited<ReturnType<GymCashExpenseService["listExpenseCategories"]>>>([]);
  const [suppliers, setSuppliers] = useState<Awaited<ReturnType<GymCashExpenseService["listSuppliers"]>>>([]);
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [expenseUnitId, setExpenseUnitId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [historyExpense, setHistoryExpense] = useState<Expense | null>(null);
  const [reversing, setReversing] = useState<{ expenseId: string; payment: ExpensePayment } | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modais
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedExpenseToPay, setSelectedExpenseToPay] = useState<Expense | null>(null);

  const [isCancelAlertOpen, setIsCancelAlertOpen] = useState(false);
  const [selectedExpenseToCancel, setSelectedExpenseToCancel] = useState<Expense | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  // Formulário Nova Despesa
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [competenceMonth, setCompetenceMonth] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [description, setDescription] = useState("");
  const [paidImmediately, setPaidImmediately] = useState(false);
  const [immediateAccountId, setImmediateAccountId] = useState("");

  // Formulário Baixa
  const [payAccountId, setPayAccountId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("PIX");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const expenseAttempt = useRequestAttempt(`GYM:${workspaceId}:EXPENSE`);
  const paymentAttempt = useRequestAttempt(`GYM:${workspaceId}:EXPENSE_PAYMENT:${selectedExpenseToPay?.id || "none"}`);

  const fetchExpenses = async () => {
    activeLoad.current?.abort();
    const request = new AbortController(); activeLoad.current = request;
    try {
      setLoading(true);
      setLoadError(null);
      const params = new URLSearchParams({ workspaceId });
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);

      const [expRes, catRes, supRes, accRes] = await Promise.all([
        fetch(`/api/gym/finance/expenses?${params.toString()}`, { signal: request.signal }),
        fetch(`/api/gym/finance/expenses/categories?workspaceId=${workspaceId}`, { signal: request.signal }),
        fetch(`/api/gym/finance/suppliers?workspaceId=${workspaceId}`, { signal: request.signal }),
        fetch(`/api/gym/finance/accounts?workspaceId=${workspaceId}`, { signal: request.signal })
      ]);
      if (![expRes, catRes, supRes, accRes].every(response => response.ok)) throw new Error("Não foi possível carregar as despesas e contas. Tente novamente.");

      if (expRes.ok) {
        const data = await expRes.json();
        setExpenses(data.expenses || []);
        setKpis(data.kpis || { totalPendingInCents: 0, totalPaidInCents: 0, totalOverdueInCents: 0 });
      }

      if (catRes.ok) {
        const catData = expenseCategoriesResponseSchema.parse(await catRes.json());
        setCategories(catData.categories);
      }

      if (supRes.ok) {
        const supData = suppliersResponseSchema.parse(await supRes.json());
        setSuppliers(supData.suppliers);
      }

      if (accRes.ok) {
        const accData = accountsResponseSchema.parse(await accRes.json());
        setAccounts(accData.accounts);
        setUnits(accData.units);
        setIncludeUnassigned(accData.includeUnassigned);
        setExpenseUnitId(previous => accData.units.some(unit => unit.id === previous) || (previous === "central" && accData.includeUnassigned) ? previous : accData.units[0]?.id || (accData.includeUnassigned ? "central" : ""));
      }
    } catch (err: unknown) {
      if (request.signal.aborted) return;
      setLoadError(err instanceof Error ? err.message : "Falha ao carregar despesas.");
      toast.error(err instanceof Error ? err.message : "Erro ao carregar despesas.");
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    setExpenses([]); setHistoryExpense(null); setReversing(null);
    fetchExpenses();
    return () => { activeLoad.current?.abort(); };
  }, [workspaceId, statusFilter]);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const initializeCategories = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/gym/finance/expenses/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, initializeDefaults: true }) });
      if (!response.ok) throw new Error("Não foi possível preparar as categorias.");
      const data = expenseCategoriesResponseSchema.parse(await response.json());
      setCategories(data.categories);
      toast.success("Categorias disponíveis.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Falha ao preparar categorias.");
    } finally { setIsSubmitting(false); }
  };

  // 1. Criar Despesa
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!expenseUnitId) { toast.error("Selecione a unidade da despesa."); return; }

    const valueInCents = parseBrlCents(amount);
    if (valueInCents === null || valueInCents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    if (!categoryId) {
      toast.error("Selecione uma categoria de despesa.");
      return;
    }

    if (paidImmediately && !immediateAccountId) {
      toast.error("Selecione a conta financeira de onde o valor foi pago.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gym/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          idempotencyKey: expenseAttempt.keyFor(JSON.stringify({ workspaceId, expenseUnitId, title, categoryId, supplierId, amountInCents: valueInCents, dueDate, competenceMonth, documentNumber, description, paidImmediately, immediateAccountId })),
          unitId: expenseUnitId === "central" ? undefined : expenseUnitId,
          title,
          categoryId,
          supplierId: supplierId || undefined,
          amountInCents: valueInCents,
          dueDate: new Date(dueDate).toISOString(),
          competenceMonth: competenceMonth || undefined,
          documentNumber: documentNumber || undefined,
          description: description || undefined,
          paidImmediately,
          financialAccountId: paidImmediately ? immediateAccountId : undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao criar despesa.");
      }

      toast.success("Despesa registrada com sucesso!");
      expenseAttempt.confirmed();
      setIsNewExpenseOpen(false);
      setTitle("");
      setAmount("");
      setDueDate("");
      setCompetenceMonth("");
      setCategoryId("");
      setSupplierId("");
      setDocumentNumber("");
      setDescription("");
      setPaidImmediately(false);
      setImmediateAccountId("");
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao registrar despesa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Baixar / Quitar Despesa
  const handlePayExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !selectedExpenseToPay) return;

    if (!payAccountId) {
      toast.error("Selecione a conta bancária/caixa de pagamento.");
      return;
    }

    const valueInCents = parseBrlCents(payAmount);
    if (valueInCents === null || valueInCents <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/gym/finance/expenses/${selectedExpenseToPay.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          idempotencyKey: paymentAttempt.keyFor(JSON.stringify({ workspaceId, expenseId: selectedExpenseToPay.id, financialAccountId: payAccountId, paidAmountInCents: valueInCents, paymentMethod: payMethod })),
          financialAccountId: payAccountId,
          paidAmountInCents: valueInCents,
          paymentMethod: payMethod
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao baixar despesa.");
      }

      const result: { status: string } = await res.json();
      toast.success(result.status === "PAID" ? "Despesa quitada." : "Pagamento parcial registrado.");
      paymentAttempt.confirmed();
      setIsPayModalOpen(false);
      setSelectedExpenseToPay(null);
      setPayAccountId("");
      setPayAmount("");
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao baixar despesa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Cancelar Despesa
  const handleCancelExpense = async () => {
    if (isSubmitting || !selectedExpenseToCancel) return;

    if (!cancellationReason || cancellationReason.trim().length < 5) {
      toast.error("A justificativa é obrigatória (mínimo 5 caracteres).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/gym/finance/expenses/${selectedExpenseToCancel.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          cancellationReason
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao cancelar despesa.");
      }

      toast.success("Despesa cancelada com sucesso!");
      setIsCancelAlertOpen(false);
      setSelectedExpenseToCancel(null);
      setCancellationReason("");
      fetchExpenses();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao cancelar despesa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReversePayment = async () => {
    if (!reversing || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/gym/finance/expenses/${reversing.expenseId}/payments/${reversing.payment.id}/reverse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, reversalReason }) });
      if (!response.ok) {
        const result: { error?: { message?: string } } = await response.json();
        throw new Error(result.error?.message || "Não foi possível reverter o pagamento.");
      }
      setReversing(null); setHistoryExpense(null); setReversalReason("");
      toast.success("Pagamento revertido. Saldo recomposto.");
      await fetchExpenses();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao reverter pagamento."); }
    finally { setIsSubmitting(false); }
  };
  if (loadError && !loading) return <Card><CardContent className="space-y-3 p-6"><p role="alert" className="text-sm">{loadError}</p><Button variant="outline" onClick={fetchExpenses}>Tentar novamente</Button></CardContent></Card>;
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0 [&>*]:min-w-0">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIS DE DESPESAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0 [&>*]:min-w-0">
        <GymMetricCard title={<>Contas a Pagar (Pendentes)</>} value={<>{formatCurrency(kpis.totalPendingInCents)}</>} description={<>Obrigações vigentes</>} icon={Clock} />

        <GymMetricCard title={<>Despesas Pagas</>} value={<>{formatCurrency(kpis.totalPaidInCents)}</>} description={<>Baixas efetivadas no caixa e bancos</>} icon={CheckCircle2} />

        <GymMetricCard title={<>Despesas Vencidas</>} value={<>{formatCurrency(kpis.totalOverdueInCents)}</>} description={<>Requer atenção imediata</>} icon={AlertCircle} />
      </div>

      {/* TABELA DE DESPESAS */}
      <Card className="min-w-0 border-border/50">
        <CardHeader className="min-w-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Obrigações a Pagar & Saídas Efetivas</CardTitle>
            <CardDescription className="text-sm">
              Controle por competência e caixa, fornecedores e conciliação de contas.
            </CardDescription>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
<SelectGroup>
                <SelectItem value="ALL">Todos os status</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="PAID">Pagas</SelectItem>
                <SelectItem value="OVERDUE">Vencidas</SelectItem>
                <SelectItem value="CANCELLED">Canceladas</SelectItem>
              </SelectGroup>
</SelectContent>
            </Select>

            {canManage && (
              <Button size="sm" onClick={() => setIsNewExpenseOpen(true)} className="gap-1.5 h-8 text-xs">
                <PlusCircle className="h-4 w-4" /> Nova Despesa
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma despesa cadastrada para os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título / Fornecedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">{exp.title}</span>
                          <span className="text-xs text-muted-foreground">{exp.supplierName}</span>
                          {exp.documentNumber && (
                            <span className="text-[10px] font-mono text-muted-foreground">Doc: {exp.documentNumber}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-[11px]"
                          style={{ borderColor: exp.category.color || undefined, color: exp.category.color || undefined }}
                        >
                          {exp.category.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(exp.dueDate).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {exp.competenceMonth}
                      </TableCell>
                      <TableCell className="text-sm font-bold">
                        {formatCurrency(exp.totalInCents)}
                        {exp.paidAmountInCents > 0 && exp.balanceRemainingInCents > 0 && <p className="text-xs font-normal text-muted-foreground">Pago {formatCurrency(exp.paidAmountInCents)} · Saldo {formatCurrency(exp.balanceRemainingInCents)}</p>}
                      </TableCell>
                      <TableCell>
                        {exp.status === "PAID" && (
                          <Badge className="bg-emerald-600 text-[10px]">Paga</Badge>
                        )}
                        {exp.status === "PENDING" && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">Pendente</Badge>
                        )}
                        {exp.status === "OVERDUE" && (
                          <Badge variant="destructive" className="text-[10px]">Vencida</Badge>
                        )}
                        {exp.status === "CANCELLED" && (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">Cancelada</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {(exp.status === "PENDING" || exp.status === "OVERDUE") && canManage && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedExpenseToPay(exp);
                                setPayAmount((exp.balanceRemainingInCents / 100).toFixed(2).replace(".", ","));
                                setIsPayModalOpen(true);
                              }}
                              className="h-7 text-xs gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Pagar
                            </Button>
                            <Button
                              disabled={exp.paidAmountInCents > 0}
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedExpenseToCancel(exp);
                                setIsCancelAlertOpen(true);
                              }}
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                        {exp.status === "PAID" && (
                          <span className="text-[11px] text-muted-foreground">
                            Paga em {exp.paidAt ? new Date(exp.paidAt).toLocaleDateString("pt-BR") : "—"}
                          </span>
                        )}
                        {exp.payments.length > 0 && <Button size="sm" variant="ghost" onClick={() => setHistoryExpense(exp)}>Pagamentos</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL NOVA DESPESA */}
      <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
        <DialogContent className="sm:max-w-lg sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-destructive" /> Registrar Obrigação / Despesa
            </DialogTitle>
            <DialogDescription>
              Cadastre contas a pagar com competência contábil e fornecedor.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="expenseUnit">Unidade *</Label>
              <Select value={expenseUnitId} onValueChange={setExpenseUnitId}>
                <SelectTrigger id="expenseUnit"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {units.map(unit => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                  {includeUnassigned && <SelectItem value="central">Central da academia</SelectItem>}
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0 [&>*]:min-w-0">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="expTitle">Título da Despesa *</Label>
                <Input
                  id="expTitle"
                  required
                  placeholder="Ex: Aluguel do Galpão - Outubro/2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expAmount">Valor Nominal (R$) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                  <Input
                    id="expAmount"
                    required
                    placeholder="1.500,00"
                    className="pl-9 font-bold"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expDueDate">Data de Vencimento *</Label>
                <Input
                  id="expDueDate"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expCategory">Categoria de Despesa *</Label>
                {categories.length === 0 && canManage && <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={initializeCategories}>Preparar categorias padrão</Button>}
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full min-w-0" id="expCategory">
                    <SelectValue placeholder="Selecione a categoria..." />
                  </SelectTrigger>
                  <SelectContent>
<SelectGroup>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expSupplier">Fornecedor (Opcional)</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="w-full min-w-0" id="expSupplier">
                    <SelectValue placeholder="Selecione ou deixe avulso..." />
                  </SelectTrigger>
                  <SelectContent>
<SelectGroup>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.tradeName}
                      </SelectItem>
                    ))}
                  </SelectGroup>
</SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expComp">Mês de Competência</Label>
                <Input
                  id="expComp"
                  placeholder="Ex: 2026-10"
                  value={competenceMonth}
                  onChange={(e) => setCompetenceMonth(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expDoc">Número da NF / Boleto</Label>
                <Input
                  id="expDoc"
                  placeholder="Ex: NF-445588"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="expDesc">Observações / Descrição</Label>
                <Textarea
                  id="expDesc"
                  placeholder="Detalhes adicionais..."
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            {/* MARCAR COMO PAGA IMEDIATAMENTE */}
            <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  id="paidImmediateCheck"
                  checked={paidImmediately}
                  onChange={(e) => setPaidImmediately(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <Label htmlFor="paidImmediateCheck" className="text-xs font-semibold cursor-pointer">
                  Já foi paga agora (dar baixa imediata)
                </Label>
              </div>

              {paidImmediately && (
                <div className="space-y-1">
                  <Label htmlFor="immediateAcc" className="text-xs">Conta Financeira de Saída *</Label>
                  <Select value={immediateAccountId} onValueChange={setImmediateAccountId}>
                    <SelectTrigger id="immediateAcc" className="text-xs h-8 w-full min-w-0">
                      <SelectValue placeholder="Selecione a conta de onde o dinheiro saiu..." />
                    </SelectTrigger>
                    <SelectContent>
<SelectGroup>
                      {accounts.filter(account => account.unitId === null || account.unitId === expenseUnitId).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} ({formatCurrency(a.balanceInCents)})
                        </SelectItem>
                      ))}
                    </SelectGroup>
</SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewExpenseOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                Registrar Despesa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL BAIXAR / QUITAR DESPESA */}
      <Dialog open={isPayModalOpen} onOpenChange={setIsPayModalOpen}>
        <DialogContent className="sm:max-w-md sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Baixar / Quitar Despesa
            </DialogTitle>
            <DialogDescription>
              Selecione a conta financeira de saída e confirme a quitação.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePayExpense} className="space-y-4 pt-2">
            {selectedExpenseToPay && (
              <div className="p-3 rounded-lg border bg-muted/30 text-xs space-y-1">
                <p><strong>Despesa:</strong> {selectedExpenseToPay.title}</p>
                <p><strong>Valor Nominal:</strong> {formatCurrency(selectedExpenseToPay.amountInCents)}</p>
                <p><strong>Vencimento:</strong> {new Date(selectedExpenseToPay.dueDate).toLocaleDateString("pt-BR")}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="payAcc">Conta Financeira de Saída *</Label>
              <Select value={payAccountId} onValueChange={setPayAccountId}>
                <SelectTrigger className="w-full min-w-0" id="payAcc">
                  <SelectValue placeholder="Selecione o banco ou caixa..." />
                </SelectTrigger>
                <SelectContent>
<SelectGroup>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({formatCurrency(a.balanceInCents)})
                    </SelectItem>
                  ))}
                </SelectGroup>
</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payAmountVal">Valor Efetivamente Pago (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                <Input
                  id="payAmountVal"
                  required
                  className="pl-9 font-bold"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payMethodSel">Forma de Pagamento</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="w-full min-w-0" id="payMethodSel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
<SelectGroup>
                  <SelectItem value="PIX">Pix / Transferência Instantânea</SelectItem>
                  <SelectItem value="BOLETO">Boleto Bancário</SelectItem>
                  <SelectItem value="CASH">Dinheiro (Caixa da Recepção)</SelectItem>
                  <SelectItem value="DEBIT">Cartão Débito</SelectItem>
                </SelectGroup>
</SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPayModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Confirmar Pagamento
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={historyExpense !== null} onOpenChange={open => { if (!open) setHistoryExpense(null); }}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader><DialogTitle>Pagamentos</DialogTitle><DialogDescription>{historyExpense?.title}</DialogDescription></DialogHeader>
          {historyExpense && historyExpense.paymentsCount > historyExpense.payments.length && <p className="text-sm text-muted-foreground">Exibindo os 100 pagamentos mais recentes.</p>}
          <div className="space-y-3">
            {historyExpense?.payments.map(payment => <div key={payment.id} className="space-y-1 rounded-md border p-3">
              <p className="font-medium">{formatCurrency(payment.amountInCents)} {payment.reversedAt && <Badge variant="outline">Revertido</Badge>}</p>
              <p className="text-sm text-muted-foreground">{new Date(payment.paidAt).toLocaleDateString("pt-BR")} · {payment.paymentMethod || "Forma não informada"}</p>
              <p className="text-sm">{payment.accountName} · {payment.operatorName || "Operador registrado"}</p>
              {canReverse && !payment.reversedAt && <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => { setReversalReason(""); setReversing({ expenseId: historyExpense.id, payment }); }}>Reverter pagamento</Button>}
            </div>)}
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={reversing !== null} onOpenChange={open => { if (!open && !isSubmitting) setReversing(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Reverter pagamento?</AlertDialogTitle><AlertDialogDescription>A compensação recompõe o saldo da despesa e da conta. O registro original permanece no histórico. Em dinheiro, é necessário caixa aberto nesta conta.</AlertDialogDescription></AlertDialogHeader>
          <div className="space-y-2"><Label htmlFor="expense-reversal-reason">Motivo</Label><Textarea id="expense-reversal-reason" value={reversalReason} onChange={event => setReversalReason(event.target.value)} maxLength={2000} /></div>
          <AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>Voltar</AlertDialogCancel><Button variant="destructive" disabled={isSubmitting || reversalReason.trim().length < 5} onClick={handleReversePayment}>{isSubmitting ? "Revertendo…" : "Confirmar reversão"}</Button></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ALERT DIALOG CANCELAR DESPESA */}
      <AlertDialog open={isCancelAlertOpen} onOpenChange={setIsCancelAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação cancelará a obrigação financeira no sistema. Uma justificativa é obrigatória para fins de auditoria contábil.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancelReason">Justificativa do Cancelamento *</Label>
            <Textarea
              id="cancelReason"
              required
              placeholder="Ex: Fornecedor cancelou o contrato / cobrança indevida emitida..."
              rows={3}
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelExpense}
              disabled={isSubmitting || cancellationReason.trim().length < 5}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Cancelando..." : "Confirmar Cancelamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
