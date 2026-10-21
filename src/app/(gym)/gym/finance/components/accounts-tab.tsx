"use client";

import { SelectGroup } from "@/components/ui/select";
import { parseBrlCents } from "@/modules/workspaces/domain/currency-input";
import { useRequestAttempt } from "@/hooks/use-request-attempt";
import { useState, useEffect, useRef } from "react";
import { accountsResponseSchema, type InternalAccount } from "./internal-finance-contract";
import { toast } from "sonner";
import {
  Landmark,
  PlusCircle,
  ArrowRightLeft,
  RefreshCw,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface AccountsTabProps {
  workspaceId: string;
  canManage: boolean;
}

export function AccountsTab({ workspaceId, canManage }: AccountsTabProps) {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<InternalAccount[]>([]);
  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadVersion = useRef(0);

  // Modais
  const [isNewAccountOpen, setIsNewAccountOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Nova Conta
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("BANK_ACCOUNT");
  const [initialBalance, setInitialBalance] = useState("");
  const [bankName, setBankName] = useState("");
  const [agencyNumber, setAgencyNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  // Transferência
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferDescription, setTransferDescription] = useState("");
  const transferAttempt = useRequestAttempt(`GYM:${workspaceId}:TRANSFER`);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccounts = async () => {
    const version = ++loadVersion.current;
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch(`/api/gym/finance/accounts?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Erro ao carregar contas");
      const data = accountsResponseSchema.parse(await res.json());
      if (version !== loadVersion.current) return;
      setAccounts(data.accounts);
      setUnits(data.units);
      setIncludeUnassigned(data.includeUnassigned);
      setUnitId(previous => data.units.some(unit => unit.id === previous) || (previous === "central" && data.includeUnassigned) ? previous : data.units[0]?.id || (data.includeUnassigned ? "central" : ""));
    } catch (err) {
      if (version !== loadVersion.current) return;
      setAccounts([]);
      setLoadError(err instanceof Error ? err.message : "Falha ao carregar contas");
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    return () => { loadVersion.current++; };
  }, [workspaceId]);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // 1. Criar Conta
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!unitId) { toast.error("Selecione a unidade da conta."); return; }

    const initialBalanceInCents = initialBalance.trim() ? parseBrlCents(initialBalance) : 0;
    if (initialBalanceInCents === null) { toast.error("Informe um saldo inicial válido."); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gym/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          unitId: unitId === "central" ? undefined : unitId,
          name,
          accountType,
          initialBalanceInCents,
          bankName: bankName || undefined,
          agencyNumber: agencyNumber || undefined,
          accountNumber: accountNumber || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao criar conta.");
      }

      toast.success("Conta financeira criada com sucesso!");
      setIsNewAccountOpen(false);
      setName("");
      setInitialBalance("");
      setBankName("");
      setAgencyNumber("");
      setAccountNumber("");
      fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar conta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Transferência entre Contas
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!fromAccountId || !toAccountId) {
      toast.error("Selecione as contas de origem e destino.");
      return;
    }

    if (fromAccountId === toAccountId) {
      toast.error("As contas de origem e destino devem ser diferentes.");
      return;
    }

    const amountInCents = parseBrlCents(transferAmount);
    if (amountInCents === null || amountInCents <= 0) {
      toast.error("Informe um valor válido para transferência.");
      return;
    }

    const fromAcc = accounts.find((a) => a.id === fromAccountId);
    if (fromAcc && amountInCents > fromAcc.balanceInCents) {
      toast.error(`Saldo insuficiente na conta de origem (${formatCurrency(fromAcc.balanceInCents)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/gym/finance/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          fromAccountId,
          toAccountId,
          amountInCents,
          idempotencyKey: transferAttempt.keyFor(JSON.stringify({ workspaceId, fromAccountId, toAccountId, amountInCents, description: transferDescription || undefined })),
          description: transferDescription || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || err.error?.message || "Erro ao realizar transferência.");
      }

      transferAttempt.confirmed();
      toast.success("Transferência registrada.");
      setIsTransferOpen(false);
      setFromAccountId("");
      setToAccountId("");
      setTransferAmount("");
      setTransferDescription("");
      fetchAccounts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao transferir recursos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0 [&>*]:min-w-0">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const getAccountTypeBadge = (type: string) => {
    switch (type) {
      case "CASH":
        return <Badge variant="outline" className="text-emerald-600 border-emerald-500/30">Caixa Físico</Badge>;
      case "BANK_ACCOUNT":
        return <Badge variant="outline" className="text-blue-600 border-blue-500/30">Conta Bancária</Badge>;
      case "SAFE_RESERVE":
        return <Badge variant="outline" className="text-amber-600 border-amber-500/30">Cofre Reserva</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* CABEÇALHO */}
      <div className="flex min-w-0 flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-base font-semibold">Contas internas</h2>
          <p className="text-xs text-muted-foreground">
            Caixa, bancos e reservas por unidade.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferOpen(true)}
                className="gap-1.5 h-8 text-xs"
              >
                <ArrowRightLeft className="h-3.5 w-3.5" /> Transferência entre Contas
              </Button>
              <Button
                size="sm"
                onClick={() => setIsNewAccountOpen(true)}
                className="gap-1.5 h-8 text-xs"
              >
                <PlusCircle className="h-3.5 w-3.5" /> Nova Conta
              </Button>
            </>
          )}
        </div>
      </div>

      {loadError && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border p-4 text-sm"><AlertCircle className="h-4 w-4" />{loadError}<Button variant="outline" size="sm" onClick={fetchAccounts}>Tentar novamente</Button></div>}
      {!loadError && accounts.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma conta interna disponível nas suas unidades.</p>}
      {/* CARDS DE CONTAS FINANCEIRAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0 [&>*]:min-w-0">
        {accounts.map((acc) => (
          <Card key={acc.id} className="min-w-0 border-border/50 relative overflow-hidden">
            <CardHeader className="min-w-0">
              <div className="flex items-center justify-between">
                {getAccountTypeBadge(acc.accountType)}
                {acc.isDefault && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    Padrão
                  </Badge>
                )}
              </div>
              <CardTitle className="text-base font-bold mt-2">{acc.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{acc.unitName || "Central da academia"}</p>
              {acc.bankName && (
                <CardDescription className="text-sm">
                  {acc.bankName} {acc.agencyNumber ? `• Ag: ${acc.agencyNumber}` : ""} {acc.accountNumber ? `• Cc: ${acc.accountNumber}` : ""}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <span className="text-xs text-muted-foreground">Saldo registrado</span>
              <p className="text-2xl font-black text-foreground mt-0.5">
                {formatCurrency(acc.balanceInCents)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MODAL NOVA CONTA FINANCEIRA */}
      <Dialog open={isNewAccountOpen} onOpenChange={setIsNewAccountOpen}>
        <DialogContent className="sm:max-w-md sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" /> Adicionar Conta Financeira
            </DialogTitle>
            <DialogDescription>
              Cadastre contas bancárias, caixas físicos ou cofres de reserva da academia.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="accUnit">Unidade *</Label>
              <Select value={unitId} onValueChange={setUnitId}>
                <SelectTrigger id="accUnit"><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent><SelectGroup>
                  {units.map(unit => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}
                  {includeUnassigned && <SelectItem value="central">Central da academia</SelectItem>}
                </SelectGroup></SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accName">Nome da Conta *</Label>
              <Input
                id="accName"
                required
                placeholder="Ex: Itaú Conta Principal"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accType">Tipo de Conta *</Label>
              <Select value={accountType} onValueChange={setAccountType}>
                <SelectTrigger className="w-full min-w-0" id="accType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
<SelectGroup>
                  <SelectItem value="BANK_ACCOUNT">Conta Bancária</SelectItem>
                  <SelectItem value="CASH">Caixa Físico</SelectItem>
                  <SelectItem value="SAFE_RESERVE">Cofre / Reserva</SelectItem>
                  <SelectItem value="OTHER">Outra conta interna</SelectItem>
                </SelectGroup>
</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accInitBalance">Saldo de Implantação (R$)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                <Input
                  id="accInitBalance"
                  placeholder="0,00"
                  className="pl-9 font-semibold"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(e.target.value)}
                />
              </div>
            </div>

            {accountType === "BANK_ACCOUNT" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t min-w-0 [&>*]:min-w-0">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="accBank">Nome do Banco</Label>
                  <Input
                    id="accBank"
                    placeholder="Ex: Banco Itaú"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accAgency">Agência</Label>
                  <Input
                    id="accAgency"
                    placeholder="1234"
                    value={agencyNumber}
                    onChange={(e) => setAgencyNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accNumber">Conta Corrente</Label>
                  <Input
                    id="accNumber"
                    placeholder="56789-0"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewAccountOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                Cadastrar Conta
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL TRANSFERÊNCIA ENTRE CONTAS */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="sm:max-w-md sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" /> Transferência entre Contas
            </DialogTitle>
            <DialogDescription>
              Transfira valores entre caixa, cofre e bancos sem duplicar receitas ou despesas.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTransferSubmit} className="space-y-4 pt-2">
            <div className="p-3 rounded-lg border bg-blue-500/10 border-blue-500/20 text-xs text-blue-700 dark:text-blue-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-4 w-4" /> Movimentação Patrimonial Neutra
              </div>
              <p className="mt-1">
                Essa transferência apenas remaneja o saldo entre contas da academia e não altera seu faturamento (DRE).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromAcc">Conta de Origem (Debitar) *</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="w-full min-w-0" id="fromAcc">
                  <SelectValue placeholder="Selecione a conta de saída..." />
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
              <Label htmlFor="toAcc">Conta de Destino (Creditar) *</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="w-full min-w-0" id="toAcc">
                  <SelectValue placeholder="Selecione a conta de entrada..." />
                </SelectTrigger>
                <SelectContent>
<SelectGroup>
                  {accounts
                    .filter((a) => a.id !== fromAccountId)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} ({formatCurrency(a.balanceInCents)})
                      </SelectItem>
                    ))}
                </SelectGroup>
</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfAmount">Valor da Transferência (R$) *</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground text-sm">R$</span>
                <Input
                  id="transfAmount"
                  required
                  placeholder="500,00"
                  className="pl-9 font-bold"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transfDesc">Descrição / Motivo</Label>
              <Input
                id="transfDesc"
                placeholder="Ex: Depósito de sangria do caixa no banco"
                value={transferDescription}
                onChange={(e) => setTransferDescription(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsTransferOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
                Confirmar Transferência
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
