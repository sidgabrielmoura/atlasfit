"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Loader2, Calendar, CreditCard, Banknote } from "lucide-react";
import { toast } from "sonner";

interface ManualPaymentDialogProps {
  workspace: {
    id: string;
    name: string;
    type: string;
    ownerId: string;
    subscription?: {
      id?: string;
      priceInCents?: number | null;
      periodicity?: string | null;
      nextDueDate?: string | null;
      plan?: {
        name: string;
        price: number;
        interval?: string;
      } | null;
    } | null;
  };
  onSuccess?: () => void;
  triggerButton?: React.ReactNode;
}

export function ManualPaymentDialog({
  workspace,
  onSuccess,
  triggerButton,
}: ManualPaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calcula valor padrão sugerido
  const defaultPrice = workspace.subscription?.priceInCents
    ? (workspace.subscription.priceInCents / 100).toFixed(2)
    : workspace.subscription?.plan?.price
      ? String(workspace.subscription.plan.price)
      : "89.90";

  // Calcula sugestão de próxima data de vencimento (+30 dias ou próximo mês)
  const defaultNextDueDate = (() => {
    const current = workspace.subscription?.nextDueDate
      ? new Date(workspace.subscription.nextDueDate)
      : new Date();
    const next = new Date(current);
    next.setMonth(next.getMonth() + 1);
    return next.toISOString().split("T")[0];
  })();

  const [amount, setAmount] = useState(defaultPrice);
  const [paymentMethod, setPaymentMethod] = useState("DINHEIRO");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [nextDueDate, setNextDueDate] = useState(defaultNextDueDate);
  const [description, setDescription] = useState(
    `Pagamento manual de plano - ${workspace.name}`
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/superadmin/finance/manual-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: workspace.type === "GYM" ? "GYM" : "PERSONAL",
          userId: workspace.ownerId,
          workspaceId: workspace.type === "GYM" ? workspace.id : undefined,
          amount: numAmount,
          paymentMethod,
          description,
          paidAt,
          nextDueDate: nextDueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erro ao registrar pagamento manual.");
      }

      toast.success("Pagamento registrado com sucesso! Assinatura liberada e ciclo atualizado.");
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Falha na comunicação com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            size="sm"
            variant="outline"
            className="text-xs font-bold gap-1.5 rounded-xl border-border/60 hover:bg-secondary/40 cursor-pointer h-9"
          >
            <Banknote className="size-3.5 text-emerald-500" />
            Lançar Pagamento Manual
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-2xl! bg-card border-border/40 font-sans">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0">
              <DollarSign className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black tracking-tight text-foreground">
                Lançar Pagamento Manual
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Registre o recebimento em dinheiro ou PIX direto para liberar o plano.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Informações da Assinatura */}
          <div className="p-3 rounded-xl border border-border/40 bg-secondary/15 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Workspace:</span>
              <span className="font-bold text-foreground">{workspace.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground font-medium">Plano:</span>
              <span className="font-bold text-foreground">
                {workspace.subscription?.plan?.name || "Plano Personal"}
              </span>
            </div>
          </div>

          {/* Valor e Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-amount" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Valor Pago (R$) *
              </Label>
              <Input
                id="manual-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="rounded-xl h-10 border-border/40 focus:border-primary font-bold text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manual-method" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Forma de Pagamento *
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="manual-method" className="rounded-xl h-10 border-border/40 text-xs font-bold w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="DINHEIRO" className="text-xs font-medium">Dinheiro / Espécie</SelectItem>
                  <SelectItem value="PIX" className="text-xs font-medium">PIX Direto</SelectItem>
                  <SelectItem value="CARTAO" className="text-xs font-medium">Cartão de Crédito</SelectItem>
                  <SelectItem value="TRANSFERENCIA" className="text-xs font-medium">Transferência / TED</SelectItem>
                  <SelectItem value="BOLETO" className="text-xs font-medium">Boleto Pago</SelectItem>
                  <SelectItem value="OUTRO" className="text-xs font-medium">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-paid-at" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3 text-muted-foreground" />
                Data do Pagamento *
              </Label>
              <Input
                id="manual-paid-at"
                type="date"
                required
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="rounded-xl h-10 border-border/40 text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="manual-next-due" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Calendar className="size-3 text-primary" />
                Próximo Vencimento
              </Label>
              <Input
                id="manual-next-due"
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="rounded-xl h-10 border-border/40 text-xs font-medium"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="manual-desc" className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Descrição / Observação
            </Label>
            <Input
              id="manual-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mensalidade paga em dinheiro"
              className="rounded-xl h-10 border-border/40 text-xs font-medium"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="rounded-xl font-bold text-xs h-10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="rounded-xl h-10 px-6 text-xs font-black uppercase tracking-wider gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CreditCard className="size-3.5" />
                  Confirmar Pagamento
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
