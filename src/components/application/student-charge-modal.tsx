"use client";

import { useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { QrCode, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { centsToCurrencyString, currencyStringToCents, calculatePlatformFee } from "@/modules/payments/domain/fee-calculator";

interface StudentChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (billing?: any) => void;
  studentUserId?: string;
  studentName?: string;
}

const MAX_CHARGE_CENTS = BigInt(10000000);
const MIN_CHARGE_CENTS = BigInt(100);

export function StudentChargeModal({
  isOpen,
  onClose,
  onSuccess,
  studentUserId = "",
  studentName = "Aluno"
}: StudentChargeModalProps) {
  const { activeWorkspaceId } = useSnapshot(workspaceStore);
  const [title, setTitle] = useState("Consultoria Mensal de Treino");
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("150,00");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  
  const todayObj = new Date();
  const todayISO = todayObj.toISOString().split("T")[0];
  const maxDateObj = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const maxDateISO = maxDateObj.toISOString().split("T")[0];

  const defaultDueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [dueDateStr, setDueDateStr] = useState(defaultDueDate);
  
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(studentUserId);
  const [createdBilling, setCreatedBilling] = useState<{
    id: string;
    pixCopyPaste?: string;
    hostedInvoiceUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (studentUserId) {
      setSelectedStudentId(studentUserId);
    }
  }, [studentUserId]);

  useEffect(() => {
    if (isOpen) {
      const wsId = activeWorkspaceId || workspaceStore.activeWorkspaceId;
      const url = wsId ? `/api/personal/clients?workspaceId=${wsId}` : `/api/personal/clients`;

      fetch(url)
        .then((r) => r.json())
        .then((clientsData) => {
          if (Array.isArray(clientsData)) {
            setStudents(clientsData);
            if (clientsData.length > 0) {
              const currentExists = clientsData.some((s) => s.id === selectedStudentId);
              if (!currentExists && !studentUserId) {
                setSelectedStudentId(clientsData[0].id);
              }
            }
          }
        })
        .catch(() => { });
    }
  }, [isOpen, activeWorkspaceId, studentUserId]);

  const grossCents = currencyStringToCents(amountStr);
  const feeCalc = grossCents > BigInt(0) && grossCents <= MAX_CHARGE_CENTS
    ? calculatePlatformFee({
      grossAmountInCents: grossCents,
      platformPercentage: 3.5,
      platformFixedInCents: BigInt(100)
    })
    : null;

  const handleAmountChange = (val: string) => {
    const cleaned = val.replace(/[^0-9.,]/g, "");
    const parts = cleaned.split(/[,.]/);
    if (parts[0] && parts[0].length > 6) {
      return;
    }
    setAmountStr(cleaned);
  };

  const handleDueDateChange = (val: string) => {
    setDueDateStr(val);
    if (val) {
      if (val < todayISO) {
        toast.error("A data de vencimento não pode ser no passado.");
      } else if (val > maxDateISO) {
        toast.error("A data de vencimento não pode ultrapassar 1 ano no futuro.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudentId) {
      toast.error("Por favor, selecione um aluno para emitir a cobrança.");
      return;
    }

    if (grossCents < MIN_CHARGE_CENTS) {
      toast.error("O valor mínimo para cobrança é R$ 1,00.");
      return;
    }

    if (grossCents > MAX_CHARGE_CENTS) {
      toast.error("O valor máximo permitido para uma cobrança é R$ 100.000,00.");
      return;
    }

    if (!dueDateStr) {
      toast.error("Informe uma data de vencimento válida.");
      return;
    }

    if (dueDateStr < todayISO) {
      toast.error("A data de vencimento não pode ser no passado.");
      return;
    }

    if (dueDateStr > maxDateISO) {
      toast.error("A data de vencimento não pode ultrapassar 1 ano no futuro.");
      return;
    }

    setLoading(true);

    try {
      const idempotencyKey = `BILL_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch("/api/personal/billings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentUserId: selectedStudentId,
          title,
          description: description || undefined,
          amountInCents: Number(grossCents),
          paymentMethod,
          dueDate: dueDateStr,
          idempotencyKey
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Falha ao gerar cobrança");
      }

      toast.success("Cobrança criada com sucesso!");
      setCreatedBilling(data.billing);
      if (onSuccess) onSuccess(data.billing);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro na cobrança";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (createdBilling?.pixCopyPaste) {
      navigator.clipboard.writeText(createdBilling.pixCopyPaste);
      setCopied(true);
      toast.success("Código Pix copia e cola copiado!");
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleResetModal = () => {
    setCreatedBilling(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && handleResetModal()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="size-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-1">
            <QrCode className="size-5 text-primary" />
          </div>
          <DialogTitle className="text-lg font-bold">Cobrar Aluno</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Gere um Pix QR Code ou fatura de cobrança direta para o seu aluno.
          </DialogDescription>
        </DialogHeader>

        {createdBilling ? (
          <div className="py-2 space-y-4">
            <div className="p-4 py-6 rounded-2xl overflow-hidden relative bg-emerald-500/10 border border-emerald-500/15 space-y-1">
              <h4 className="text-sm font-bold text-emerald-400">Cobrança Gerada com Sucesso!</h4>
              <p className="text-xs text-muted-foreground">
                O pagamento foi registrado e o link de cobrança está disponível.
              </p>

              <div className="absolute h-[190%] -top-10 w-30 inset-0 mx-auto rotate-[30deg] opacity-30 -z-10 bg-linear-to-r from-transparent via-emerald-500/50 to-transparent" />
            </div>

            {createdBilling.pixCopyPaste && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Código Pix Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={createdBilling.pixCopyPaste}
                    className="h-9 text-xs font-mono bg-muted/50 truncate"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCopyPix}
                    className="h-9 px-3 gap-1.5 text-xs"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Copiado" : "Copiar"}</span>
                  </Button>
                </div>
              </div>
            )}

            {createdBilling.hostedInvoiceUrl && (
              <div className="pt-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full h-10! rounded-xl py-6! text-xs font-semibold"
                >
                  <a href={createdBilling.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                    Abrir Fatura / Boleto em Nova Aba
                  </a>
                </Button>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button onClick={handleResetModal} className="w-full h-9 text-xs font-bold">
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Aluno Destinatário</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={loading}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Selecione um aluno" />
                </SelectTrigger>
                <SelectContent>
                  {students.length > 0 ? (
                    students.map((st) => (
                      <SelectItem key={st.id} value={st.id}>
                        {st.name} ({st.email})
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value={studentUserId || "default"}>
                      {studentName}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título da Cobrança</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Consultoria Mensal de Treino"
                className="h-9 text-xs"
                disabled={loading}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Valor (R$)</Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Máx: R$ 100.000,00</span>
                </div>
                <Input
                  value={amountStr}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="150,00"
                  maxLength={10}
                  className="h-9 text-xs font-bold"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Vencimento</Label>
                <Input
                  type="date"
                  min={todayISO}
                  max={maxDateISO}
                  value={dueDateStr}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="h-9 text-xs"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={loading}>
                <SelectTrigger className="h-9 text-xs w-full">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">Pix QR Code (Instantâneo)</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão de Crédito À Vista</SelectItem>
                  <SelectItem value="CREDIT_CARD_RECURRING">Assinatura Recorrente Mensal (Cartão)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {grossCents > MAX_CHARGE_CENTS && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>O valor máximo permitido para uma cobrança é de R$ 100.000,00.</span>
              </div>
            )}

            {dueDateStr && (dueDateStr < todayISO || dueDateStr > maxDateISO) && (
              <div className="p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="size-4 shrink-0" />
                <span>
                  {dueDateStr < todayISO
                    ? "A data de vencimento não pode ser anterior a hoje."
                    : "A data de vencimento não pode ultrapassar 1 ano no futuro."}
                </span>
              </div>
            )}

            {feeCalc && grossCents <= MAX_CHARGE_CENTS && (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/50 space-y-1 text-[11px]">
                <div className="flex justify-between text-muted-foreground">
                  <span>Valor Cobrado:</span>
                  <span className="font-semibold text-foreground">{centsToCurrencyString(feeCalc.grossAmountInCents)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tarifa AtlasFit (3,5% + R$ 1,00):</span>
                  <span className="font-semibold text-amber-500">-{centsToCurrencyString(feeCalc.platformFeeInCents)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border/40 font-bold text-foreground">
                  <span>Você Recebe (Estimado):</span>
                  <span className="text-emerald-500">{centsToCurrencyString(feeCalc.personalNetInCents)}</span>
                </div>
              </div>
            )}

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
                disabled={
                  loading ||
                  grossCents < MIN_CHARGE_CENTS ||
                  grossCents > MAX_CHARGE_CENTS ||
                  !dueDateStr ||
                  dueDateStr < todayISO ||
                  dueDateStr > maxDateISO
                }
                className="h-9 text-xs gap-1.5 font-bold"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Gerando Cobrança...</span>
                  </>
                ) : (
                  <span>Gerar Cobrança</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
