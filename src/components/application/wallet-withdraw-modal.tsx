"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowUpRight, ShieldAlert, Loader2 } from "lucide-react";
import { centsToCurrencyString, currencyStringToCents } from "@/modules/payments/domain/fee-calculator";

interface WalletWithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableBalanceInCents: bigint;
}

export function WalletWithdrawModal({
  isOpen,
  onClose,
  onSuccess,
  availableBalanceInCents
}: WalletWithdrawModalProps) {
  const [amountStr, setAmountStr] = useState("");
  const [pixKeyType, setPixKeyType] = useState("CPF");
  const [pixKey, setPixKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfirmAlert, setShowConfirmAlert] = useState(false);

  const parsedCents = currencyStringToCents(amountStr);

  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.,]/g, "");
    const parts = cleaned.split(/[,.]/);
    if (parts[0] && parts[0].length > 6) {
      return;
    }
    setAmountStr(cleaned);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedCents <= BigInt(0)) {
      toast.error("Informe um valor válido para o saque.");
      return;
    }

    if (parsedCents < BigInt(1000)) {
      toast.error("O valor mínimo para saque é R$ 10,00.");
      return;
    }

    if (parsedCents > availableBalanceInCents) {
      toast.error("O valor solicitado excede seu saldo disponível.");
      return;
    }

    if (!pixKey.trim()) {
      toast.error("Informe sua chave Pix de destino.");
      return;
    }

    setShowConfirmAlert(true);
  };

  const handleExecutePayout = async () => {
    setShowConfirmAlert(false);
    setLoading(true);

    try {
      const idempotencyKey = `PAYOUT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch("/api/personal/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountInCents: Number(parsedCents),
          pixKeyType,
          pixKey,
          idempotencyKey
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao solicitar transferência Pix");
      }

      toast.success("Solicitação de saque enviada com sucesso!");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro no saque";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="size-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-1">
              <ArrowUpRight className="size-5 text-emerald-500" />
            </div>
            <DialogTitle className="text-lg font-bold">Solicitar Saque via Pix</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Saldo disponível para resgate: <strong className="text-foreground">{centsToCurrencyString(availableBalanceInCents)}</strong>
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleOpenConfirm} className="space-y-3.5 py-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Valor do Saque (R$)</Label>
              <Input
                type="text"
                value={amountStr}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0,00"
                maxLength={10}
                className="h-9 text-xs font-bold"
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Chave</Label>
                <Select value={pixKeyType} onValueChange={setPixKeyType} disabled={loading}>
                  <SelectTrigger className="h-9 text-xs w-full">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CPF">CPF</SelectItem>
                    <SelectItem value="CNPJ">CNPJ</SelectItem>
                    <SelectItem value="EMAIL">E-mail</SelectItem>
                    <SelectItem value="PHONE">Telefone</SelectItem>
                    <SelectItem value="RANDOM">Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Chave Pix</Label>
                <Input
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Sua chave Pix"
                  className="h-9 text-xs"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <span>
                A chave Pix cadastrada deve pertencer obrigatoriamente à mesma titularidade do cadastro no parceiro financeiro.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="h-9 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || parsedCents <= BigInt(0) || parsedCents > availableBalanceInCents}
                className="h-9 text-xs gap-1 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <span>Continuar para Confirmação</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmAlert} onOpenChange={setShowConfirmAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Confirma a transferência via Pix?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Você está prestes a transferir <strong className="text-foreground">{centsToCurrencyString(parsedCents)}</strong> para a chave Pix:
              </p>
              <p className="p-2 rounded-lg bg-muted border border-border font-mono text-xs text-foreground font-semibold">
                {pixKey} ({pixKeyType})
              </p>
              <p className="text-[11px]">
                Esta operação não poderá ser desfeita após a confirmação.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading} className="h-9 text-xs">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecutePayout}
              disabled={loading}
              className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Confirmar Saque
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
