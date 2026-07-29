"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PackagePlus,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ShieldAlert,
  Coins,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreditPackage {
  id: string;
  name: string;
  description: string | null;
  credits: number;
  priceInCents: number;
  abacatePayProductId: string | null;
  isActive: boolean;
  isHighlighted: boolean;
  sortOrder: number;
  _count?: { purchases: number };
}

const emptyForm = {
  name: "",
  description: "",
  credits: "",
  priceInCents: "",
  isHighlighted: false,
  sortOrder: "0",
};

function PackageSkeleton() {
  return (
    <div className="border border-border/40 rounded-2xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/40 hover:bg-transparent">
            <TableHead><Skeleton className="h-3 w-24 rounded" /></TableHead>
            <TableHead><Skeleton className="h-3 w-16 rounded" /></TableHead>
            <TableHead><Skeleton className="h-3 w-16 rounded" /></TableHead>
            <TableHead><Skeleton className="h-3 w-20 rounded" /></TableHead>
            <TableHead><Skeleton className="h-3 w-12 rounded" /></TableHead>
            <TableHead><Skeleton className="h-3 w-20 rounded" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i} className="border-border/30 hover:bg-transparent">
              <TableCell><Skeleton className="h-4 w-32 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-12 rounded" /></TableCell>
              <TableCell><Skeleton className="h-4 w-16 rounded" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatBRL(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export default function CreditsManagementPage() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/credits/packages");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPackages(data);
    } catch {
      toast.error("Erro ao carregar pacotes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceVal = Math.round(parseFloat(form.priceInCents) * 100);
    if (isNaN(priceVal) || priceVal < 100) {
      toast.error("O preço mínimo permitido pelo AbacatePay é R$ 1,00.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/superadmin/credits/packages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          credits: parseInt(form.credits),
          priceInCents: priceVal,
          isHighlighted: form.isHighlighted,
          sortOrder: parseInt(form.sortOrder),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pacote criado com sucesso!");
      setIsCreateOpen(false);
      setForm(emptyForm);
      await fetchPackages();
    } catch {
      toast.error("Erro ao criar pacote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (pkg: CreditPackage) => {
    setSelected(pkg);
    setEditForm({
      name: pkg.name,
      description: pkg.description || "",
      credits: pkg.credits.toString(),
      priceInCents: (pkg.priceInCents / 100).toFixed(2),
      isHighlighted: pkg.isHighlighted,
      sortOrder: pkg.sortOrder.toString(),
    });
    setIsEditOpen(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const priceVal = Math.round(parseFloat(editForm.priceInCents) * 100);
    if (isNaN(priceVal) || priceVal < 100) {
      toast.error("O preço mínimo permitido pelo AbacatePay é R$ 1,00.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/superadmin/credits/packages/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          credits: parseInt(editForm.credits),
          priceInCents: priceVal,
          isHighlighted: editForm.isHighlighted,
          sortOrder: parseInt(editForm.sortOrder),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Pacote atualizado!");
      setIsEditOpen(false);
      await fetchPackages();
    } catch {
      toast.error("Erro ao atualizar pacote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/superadmin/credits/packages/${selected.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.deactivated) {
        toast.success("Pacote desativado (possui compras vinculadas).");
      } else {
        toast.success("Pacote excluído com sucesso.");
      }
      setIsDeleteOpen(false);
      await fetchPackages();
    } catch {
      toast.error("Erro ao excluir pacote.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async (pkg: CreditPackage) => {
    setTogglingId(pkg.id);
    try {
      const res = await fetch(`/api/superadmin/credits/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      if (!res.ok) throw new Error();
      toast.success(pkg.isActive ? "Pacote desativado." : "Pacote ativado.");
      await fetchPackages();
    } catch {
      toast.error("Erro ao alterar status.");
    } finally {
      setTogglingId(null);
    }
  };

  const handleSync = async (pkg: CreditPackage) => {
    setSyncingId(pkg.id);
    try {
      const res = await fetch(`/api/superadmin/credits/packages/${pkg.id}/sync`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      toast.success("Sincronizado com AbacatePay!");
      await fetchPackages();
    } catch (error: any) {
      toast.error(error.message || "Erro ao sincronizar.");
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1400px] mx-auto animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <ShieldAlert className="size-4" />
            Global Control Panel
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Créditos de Importação</h1>
          <p className="text-muted-foreground text-sm font-medium">
            Gerencie pacotes de créditos vendidos via AbacatePay para importações de alunos.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="w-full md:w-auto h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all duration-200"
        >
          <Plus className="size-4" /> CRIAR PACOTE
        </Button>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <PackagePlus className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight leading-none">Pacotes Disponíveis</h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
              Configuração e status de cada oferta
            </p>
          </div>
        </div>

        {isLoading ? (
          <PackageSkeleton />
        ) : packages.length === 0 ? (
          <div className="border-2 border-dashed border-border/30 rounded-2xl p-12 text-center space-y-3">
            <Coins className="size-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-bold text-muted-foreground">Nenhum pacote criado ainda.</p>
            <p className="text-xs text-muted-foreground/60">Crie o primeiro pacote de créditos acima.</p>
          </div>
        ) : (
          <div className="border border-border/40 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 hover:bg-transparent bg-secondary/20">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pacote</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Créditos</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">AbacatePay</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Compras</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow key={pkg.id} className="border-border/30 hover:bg-secondary/10 transition-colors">
                    <TableCell>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{pkg.name}</span>
                          {pkg.isHighlighted && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase tracking-wider">
                              Destaque
                            </Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[200px] truncate">{pkg.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold tabular-nums">{pkg.credits}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold tabular-nums">{formatBRL(pkg.priceInCents)}</span>
                    </TableCell>
                    <TableCell>
                      {pkg.abacatePayProductId ? (
                        <Badge className="text-[9px] px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-black uppercase tracking-wider">
                          Sincronizado
                        </Badge>
                      ) : (
                        <Badge className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-500 border-amber-500/20 font-black uppercase tracking-wider">
                          Pendente
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-bold tabular-nums text-muted-foreground">
                        {pkg._count?.purchases ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggle(pkg)}
                        disabled={togglingId === pkg.id}
                        className={cn(
                          "flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider transition-colors",
                          pkg.isActive ? "text-emerald-500" : "text-muted-foreground/50"
                        )}
                      >
                        {togglingId === pkg.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : pkg.isActive ? (
                          <ToggleRight className="size-5" />
                        ) : (
                          <ToggleLeft className="size-5" />
                        )}
                        {pkg.isActive ? "Ativo" : "Inativo"}
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSync(pkg)}
                          disabled={syncingId === pkg.id}
                          className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Sincronizar com AbacatePay"
                        >
                          {syncingId === pkg.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="size-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(pkg)}
                          className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          title="Editar pacote"
                        >
                          <Pencil className="size-3.5 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelected(pkg); setIsDeleteOpen(true); }}
                          className="size-8 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Excluir pacote"
                        >
                          <Trash2 className="size-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl!">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">Novo Pacote de Créditos</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Pacote</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Starter Pack"
                required
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Breve descrição exibida na oferta"
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Créditos</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.credits}
                  onChange={(e) => setForm((f) => ({ ...f, credits: e.target.value }))}
                  placeholder="10"
                  required
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço (R$)</Label>
                <Input
                  type="number"
                  min="1.00"
                  step="0.01"
                  value={form.priceInCents}
                  onChange={(e) => setForm((f) => ({ ...f, priceInCents: e.target.value }))}
                  placeholder="29.90"
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ordem</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end pb-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destaque</Label>
                  <Switch
                    checked={form.isHighlighted}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isHighlighted: v }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl gap-2 font-bold">
                {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Criando...</> : "Criar Pacote"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight">Editar Pacote</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Pacote</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
                className="h-10 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição</Label>
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Créditos</Label>
                <Input
                  type="number"
                  min="1"
                  value={editForm.credits}
                  onChange={(e) => setEditForm((f) => ({ ...f, credits: e.target.value }))}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preço (R$)</Label>
                <Input
                  type="number"
                  min="1.00"
                  step="0.01"
                  value={editForm.priceInCents}
                  onChange={(e) => setEditForm((f) => ({ ...f, priceInCents: e.target.value }))}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ordem</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.sortOrder}
                  onChange={(e) => setEditForm((f) => ({ ...f, sortOrder: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="flex flex-col justify-end pb-1 gap-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destaque</Label>
                  <Switch
                    checked={editForm.isHighlighted}
                    onCheckedChange={(v) => setEditForm((f) => ({ ...f, isHighlighted: v }))}
                  />
                </div>
              </div>
            </div>
            {selected && !selected.abacatePayProductId && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="size-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-amber-600 font-medium">
                  Pacote não sincronizado com AbacatePay. Use o botão de sync na tabela.
                </p>
              </div>
            )}
            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() => { setIsEditOpen(false); setIsDeleteOpen(true); }}
                className="rounded-xl mr-auto"
              >
                <Trash2 className="size-4 mr-2" /> Excluir
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl gap-2 font-bold">
                {isSubmitting ? <><Loader2 className="size-4 animate-spin" /> Salvando...</> : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black">Excluir Pacote?</AlertDialogTitle>
            <AlertDialogDescription>
              O pacote <strong>{selected?.name}</strong> será excluído permanentemente.
              Se houver compras vinculadas, ele será apenas desativado.
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" autoFocus>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {isDeleting ? <><Loader2 className="size-4 animate-spin" /> Excluindo...</> : "Sim, excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
