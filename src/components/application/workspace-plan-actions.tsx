"use client";

import { useRef, useState } from "react";
import { Globe, Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanFormFields, type PlanFormValue } from "./plan-form-fields";
import { buildAutoFeatures } from "./plan-features";

interface AssignedPlan {
  id: string; name: string; price: number; interval: string;
  features: string | null; imageUrl: string | null; maxWorkspaces: number;
  maxStudents: number | null; importQuota: number; storageLimitMb: number;
  paymentMethods: string | null; customWorkspaceId: string | null; publishedGlobalPlanId: string | null;
}
interface WorkspacePlanContext {
  id: string; type: string;
  isPlanPublishedGlobally?: boolean;
  subscription?: {
    plan?: AssignedPlan | null; billingControlType: string;
    periodicity: string | null; paymentMethod: string | null; nextDueDate: string | null;
    autoSuspendEnabled: boolean; toleranceDays: number;
  } | null;
}
interface WorkspacePlanForm extends PlanFormValue {
  isRecurring: boolean; periodicity: string; paymentMethod: string;
  nextDueDate: string; autoSuspendEnabled: boolean; toleranceDays: string;
}
function initialForm(workspace: WorkspacePlanContext, edit: boolean): WorkspacePlanForm {
  const sub = edit ? workspace.subscription : null;
  const plan = sub?.plan;
  const paymentMethods = plan?.paymentMethods === "CREDIT_CARD" ? "CARD" : plan?.paymentMethods ?? "PIX";
  return {
    name: plan?.name ?? "", price: plan ? String(plan.price) : "", interval: plan?.interval ?? "month",
    imageUrl: plan?.imageUrl ?? "", maxWorkspaces: String(plan?.maxWorkspaces ?? 1),
    maxStudents: plan?.maxStudents == null ? "" : String(plan.maxStudents),
    importQuota: String(plan?.importQuota ?? 25), storageLimitMb: String(plan?.storageLimitMb ?? 1024),
    paymentMethods,
    features: plan?.features ?? buildAutoFeatures("", "25", "1", "1024").join(", "),
    isRecurring: sub ? sub.billingControlType === "MANUAL" : true,
    periodicity: sub?.periodicity ?? (plan?.interval === "year" ? "ANUAL" : "MENSAL"),
    paymentMethod: sub?.paymentMethod ?? "PIX",
    nextDueDate: sub?.nextDueDate ? new Date(sub.nextDueDate).toISOString().split("T")[0] : new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    autoSuspendEnabled: sub?.autoSuspendEnabled ?? true, toleranceDays: String(sub?.toleranceDays ?? 5),
  };
}

export function WorkspacePlanActions({ workspace, onChanged, compact = false }: {
  workspace: WorkspacePlanContext; onChanged: () => Promise<unknown>; compact?: boolean;
}) {
  const plan = workspace.subscription?.plan;
  const [mode, setMode] = useState<"create" | "edit" | null>(null);
  const [form, setForm] = useState(() => initialForm(workspace, false));
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isGlobal = !!plan && !plan.customWorkspaceId;
  const published = isGlobal || !!plan?.publishedGlobalPlanId || !!workspace.isPlanPublishedGlobally;

  function open(next: "create" | "edit") {
    if (busy.current || (next === "edit" && !plan)) return;
    setEditingPlanId(next === "edit" ? plan!.id : null);
    setForm(initialForm(workspace, next === "edit"));
    setScopeOpen(false);
    setMode(next);
  }

  function updatePaymentMethod(paymentMethods: string) {
    setForm(prev => ({
      ...prev,
      paymentMethods,
      paymentMethod: paymentMethods === "PIX,CARD"
        ? (["CARD", "CREDIT_CARD"].includes(prev.paymentMethod) ? prev.paymentMethod : "PIX")
        : paymentMethods,
    }));
  }

  async function mutate(method: string, body: unknown, message: string) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    try {
      const res = await fetch(`/api/superadmin/workspaces/${workspace.id}/custom-plan`, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível alterar o plano.");
      toast.success(message);
      setMode(null);
      setScopeOpen(false);
      setDeleteOpen(false);
      const refreshed = await onChanged();
      if (refreshed === false) toast.error("Alteração salva. Recarregue a página para atualizar os dados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o plano.");
    } finally { busy.current = false; setPending(false); }
  }

  function save(scope?: "WORKSPACE" | "GLOBAL") {
    if (!formRef.current?.reportValidity() || !mode || (mode === "create" && !scope)) return;
    const { interval: _interval, ...fields } = form;
    return mutate(mode === "edit" ? "PATCH" : "POST", {
      ...fields, name: fields.name.trim(), price: Number(fields.price),
      paymentMethod: fields.paymentMethods === "PIX,CARD"
        ? (["CARD", "CREDIT_CARD"].includes(fields.paymentMethod) ? fields.paymentMethod : "PIX")
        : fields.paymentMethods,
      maxWorkspaces: Number(fields.maxWorkspaces), maxStudents: fields.maxStudents === "" ? null : Number(fields.maxStudents),
      importQuota: Number(fields.importQuota), storageLimitMb: Number(fields.storageLimitMb), toleranceDays: Number(fields.toleranceDays),
      nextDueDate: fields.nextDueDate || null,
      ...(mode === "edit" ? { planId: editingPlanId } : { scope }),
    }, mode === "edit" ? "Plano atualizado com sucesso!" : "Novo plano criado e atribuído com sucesso!");
  }

  function publish() {
    if (!plan || published) return;
    return mutate("PUT", { planId: plan.id }, "Plano disponibilizado no catálogo global!");
  }

  return <>
    <div className="flex flex-wrap items-center gap-2">
      {compact ? <Button className="h-auto min-h-10 w-full whitespace-normal" disabled={pending} onClick={() => open(plan ? "edit" : "create")}>
        <Pencil data-icon="inline-start" />{plan ? "Editar plano" : "Atribuir novo plano personalizado"}
      </Button> : <>
        <Button size="sm" className="h-auto min-h-9 whitespace-normal" disabled={pending} onClick={() => open("create")}><Plus data-icon="inline-start" />Atribuir novo plano personalizado</Button>
        {plan && <DropdownMenu>
          <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Opções do plano" disabled={pending}><MoreHorizontal /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => open("edit")}><Pencil />Editar</DropdownMenuItem>
              <DropdownMenuItem disabled={published} onSelect={publish}><Globe />Atribuir global</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup><DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}><Trash2 />Deletar</DropdownMenuItem></DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>}
        {plan && <Badge variant="outline">{isGlobal ? "Global" : published ? "Publicado globalmente" : "Exclusivo do workspace"}</Badge>}
      </>}
    </div>

    <Dialog open={mode !== null} onOpenChange={value => { if (!value && !pending) { setMode(null); setScopeOpen(false); } }}>
      <DialogContent className="flex! flex-col gap-0 p-0! overflow-hidden! sm:max-w-3xl sm:max-h-[90dvh]">
        <DialogHeader className="shrink-0 px-6 py-5 pr-14">
          <DialogTitle>{mode === "edit" ? "Editar plano" : "Atribuir novo plano personalizado"}</DialogTitle>
          <DialogDescription>Defina os dados do plano, as vantagens e as regras de cobrança da assinatura.</DialogDescription>
        </DialogHeader>
        <Separator />
        <form ref={formRef} onSubmit={e => { e.preventDefault(); if (mode === "edit") void save(); else setScopeOpen(true); }} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-6 py-5">
            <fieldset disabled={pending} className="min-w-0">
              <PlanFormFields
                idPrefix={`workspace-${workspace.id}-${compact ? "compact" : "main"}`}
                value={form}
                onChange={updates => setForm(prev => ({ ...prev, ...updates }))}
                billingFields={<>
                  <Field>
                    <FieldLabel htmlFor={`periodicity-${compact}`}>Periodicidade</FieldLabel>
                    <Select value={form.periodicity} onValueChange={periodicity => setForm(prev => ({ ...prev, periodicity }))}>
                      <SelectTrigger id={`periodicity-${compact}`} className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup>
                        <SelectItem value="MENSAL">Mensal</SelectItem>
                        <SelectItem value="TRIMESTRAL">Trimestral</SelectItem>
                        <SelectItem value="SEMESTRAL">Semestral</SelectItem>
                        <SelectItem value="ANUAL">Anual</SelectItem>
                      </SelectGroup></SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`payment-${compact}`}>Forma de pagamento</FieldLabel>
                    <Select value={form.paymentMethods} onValueChange={updatePaymentMethod}>
                      <SelectTrigger id={`payment-${compact}`} className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectGroup>
                        <SelectItem value="PIX">PIX</SelectItem>
                        <SelectItem value="BOLETO">Boleto bancário</SelectItem>
                        <SelectItem value="CARD">Cartão de crédito</SelectItem>
                        <SelectItem value="PIX,CARD">PIX e cartão</SelectItem>
                      </SelectGroup></SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`due-${compact}`}>Próximo vencimento</FieldLabel>
                    <Input id={`due-${compact}`} type="date" required value={form.nextDueDate} onChange={e => setForm(prev => ({ ...prev, nextDueDate: e.target.value }))} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`tolerance-${compact}`}>Dias de tolerância</FieldLabel>
                    <Input id={`tolerance-${compact}`} type="number" required min="0" value={form.toleranceDays} onChange={e => setForm(prev => ({ ...prev, toleranceDays: e.target.value }))} />
                    <FieldDescription>Prazo após o vencimento.</FieldDescription>
                  </Field>
                  <Field className="justify-start rounded-xl border border-border/40 bg-secondary/15 p-2">
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldLabel htmlFor={`suspend-${compact}`}>Suspensão automática</FieldLabel>
                      </FieldContent>
                      <Switch id={`suspend-${compact}`} checked={form.autoSuspendEnabled} onCheckedChange={autoSuspendEnabled => setForm(prev => ({ ...prev, autoSuspendEnabled }))} />
                    </Field>
                    <FieldDescription>Após os dias de tolerância.</FieldDescription>
                  </Field>
                </>}
              >
                <Separator />
                <Field>
                  <FieldLabel htmlFor={`plan-image-${compact}`}>Imagem do Plano (URL)</FieldLabel>
                  <Input id={`plan-image-${compact}`} type="url" value={form.imageUrl} onChange={e => setForm(prev => ({ ...prev, imageUrl: e.target.value }))} placeholder="https://..." />
                </Field>
              </PlanFormFields>
            </fieldset>
          </div>
          <Separator />
          <DialogFooter className="shrink-0 px-6 py-4">
            <Button type="button" variant="ghost" disabled={pending} onClick={() => setMode(null)}>Cancelar</Button>
            <Popover open={scopeOpen} onOpenChange={setScopeOpen}>
              <PopoverAnchor asChild><Button type="submit" disabled={pending}>{pending && <Loader2 data-icon="inline-start" className="animate-spin" />}{mode === "edit" ? "Salvar alterações" : "Criar plano"}</Button></PopoverAnchor>
              <PopoverContent align="end" className="w-80">
                <p className="font-medium">Onde disponibilizar este plano?</p>
                <p className="text-sm text-muted-foreground">O plano será atribuído a este workspace em qualquer opção.</p>
                <Button type="button" variant="outline" disabled={pending} onClick={() => save("WORKSPACE")}>Somente este workspace</Button>
                <Button type="button" disabled={pending} onClick={() => save("GLOBAL")}><Globe data-icon="inline-start" />Criar como plano global</Button>
              </PopoverContent>
            </Popover>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={deleteOpen} onOpenChange={value => { if (!pending) setDeleteOpen(value); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Deletar plano da assinatura?</AlertDialogTitle><AlertDialogDescription>
          O plano {plan?.name} será removido e a assinatura será cancelada. {isGlobal ? "A oferta global continuará no catálogo." : "O plano exclusivo será excluído quando não houver histórico vinculado."}
          {workspace.type !== "GYM" && " A alteração afeta a assinatura do titular e os workspaces atendidos por ela."}
        </AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button variant="destructive" disabled={pending} onClick={() => plan && mutate("DELETE", { planId: plan.id }, "Plano removido da assinatura.")}>{pending && <Loader2 className="animate-spin" />}Deletar plano</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
