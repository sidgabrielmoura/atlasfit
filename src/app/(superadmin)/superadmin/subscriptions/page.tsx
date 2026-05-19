"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
   BadgeCheck,
   Plus,
   Settings2,
   ShieldCheck,
   Zap,
   TrendingUp,
   ArrowRight,
   Target,
   BarChart3,
   Loader2,
   ChevronLeft,
   ChevronRight,
   Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSnapshot } from "valtio";
import { superAdminStore, superAdminActions } from "@/stores/superadmin.store";
import { toast } from "sonner";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function PlanCarousel({ plans, isLoading, onEdit }: { plans: any[]; isLoading: boolean; onEdit: (plan: any) => void }) {
   const trackRef = useRef<HTMLDivElement>(null);
   const [activeIndex, setActiveIndex] = useState(0);

   const cardWidth = useCallback(() => {
      const track = trackRef.current;
      if (!track) return 0;
      const card = track.querySelector<HTMLElement>("[data-card]");
      if (!card) return 0;
      const gap = 24;
      return card.offsetWidth + gap;
   }, []);

   const scrollToIndex = useCallback(
      (index: number) => {
         const track = trackRef.current;
         if (!track || plans.length === 0) return;
         const clamped = Math.max(0, Math.min(index, plans.length - 1));
         track.scrollTo({ left: clamped * cardWidth(), behavior: "smooth" });
         setActiveIndex(clamped);
      },
      [plans.length, cardWidth]
   );

   useEffect(() => {
      const track = trackRef.current;
      if (!track) return;
      const onScroll = () => {
         const cw = cardWidth();
         if (cw === 0) return;
         const idx = Math.round(track.scrollLeft / cw);
         setActiveIndex(idx);
      };
      track.addEventListener("scroll", onScroll, { passive: true });
      return () => track.removeEventListener("scroll", onScroll);
   }, [cardWidth]);

   if (isLoading && plans.length === 0) {
      return (
         <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
               Carregando planos...
            </p>
         </div>
      );
   }

   return (
      <div className="space-y-4 lg:max-w-[calc(100vw-25rem)] flex-1 w-full mx-auto">
         <div className="relative group/carousel">
            <button
               onClick={() => scrollToIndex(activeIndex - 1)}
               disabled={activeIndex === 0}
               aria-label="Anterior"
               className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 size-9 rounded-full bg-background border border-border/60 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-0 disabled:pointer-events-none"
            >
               <ChevronLeft className="size-4" />
            </button>

            <div
               ref={trackRef}
               className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 pb-1 no-scrollbar"
               style={{ scrollbarWidth: "none" }}
            >
               {plans.map((plan: any) => (
                  <div
                     key={plan.id}
                     data-card
                     className="snap-start shrink-0 w-[min(320px,80vw)] sm:w-72 lg:w-80"
                  >
                     <Card className="border-border/40 p-0 bg-card/50 overflow-hidden hover:border-primary/30 transition-all duration-300 group h-full">
                        <div className="p-6 space-y-4">
                           <div className="flex items-center justify-between">
                              <div className="p-2 rounded-lg bg-secondary border border-border/40 text-primary">
                                 <ShieldCheck className="size-5" />
                              </div>
                              <Button
                                 variant="ghost"
                                 size="icon"
                                 onClick={() => onEdit(plan)}
                                 className="size-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                              >
                                 <Settings2 className="size-4 text-muted-foreground" />
                              </Button>
                           </div>
                           <div>
                              <h3 className="text-xl font-black tracking-tight">{plan.name}</h3>
                              <p className="text-lg font-bold text-primary mt-1">
                                 R$ {plan.price}/{plan.interval === "year" ? "ano" : "mês"}
                              </p>
                           </div>
                           <div className="space-y-2 pt-2">
                              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                 <span>ATIVOS</span>
                                 <span>{plan._count?.subscriptions || 0}</span>
                              </div>
                              <div className="w-full h-1 bg-secondary rounded-full overflow-hidden">
                                 <div
                                    className="bg-primary h-full rounded-full transition-all duration-700"
                                    style={{
                                       width: `${Math.min(
                                          ((plan._count?.subscriptions || 0) / 100) * 100,
                                          100
                                       )}%`,
                                    }}
                                 />
                              </div>
                           </div>
                           <p className="text-[10px] text-muted-foreground font-medium leading-relaxed italic">
                              {plan.features || "Sem descrição"}
                           </p>
                        </div>
                        <div className="bg-secondary/20 p-3 border-t border-border/40 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                           <Button
                              variant="ghost"
                              onClick={() => onEdit(plan)}
                              className="w-full h-8 text-[10px] font-black uppercase tracking-widest gap-2"
                           >
                              Editar Oferta <ArrowRight className="size-3" />
                           </Button>
                        </div>
                     </Card>
                  </div>
               ))}
            </div>

            <button
               onClick={() => scrollToIndex(activeIndex + 1)}
               disabled={activeIndex >= plans.length - 1}
               aria-label="Próximo"
               className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 size-9 rounded-full bg-background border border-border/60 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-0 disabled:pointer-events-none"
            >
               <ChevronRight className="size-4" />
            </button>
         </div>

         {plans.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1">
               {plans.map((_, i) => (
                  <button
                     key={i}
                     onClick={() => scrollToIndex(i)}
                     aria-label={`Ir para plano ${i + 1}`}
                     className={cn(
                        "rounded-full transition-all duration-300",
                        i === activeIndex
                           ? "w-5 h-2 bg-primary"
                           : "size-2 bg-border hover:bg-primary/40"
                     )}
                  />
               ))}
            </div>
         )}
      </div>
   );
}

export default function SubscriptionsManagementPage() {
   const snap = useSnapshot(superAdminStore);
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [selectedPlan, setSelectedPlan] = useState<any>(null);
   const [formData, setFormData] = useState({ name: "", price: "", interval: "month", features: "", maxWorkspaces: "1" });
   const [editFormData, setEditFormData] = useState({ name: "", price: "", interval: "month", features: "", maxWorkspaces: "1" });

   useEffect(() => {
      superAdminActions.fetchPlans();
      superAdminActions.fetchSubscriptions();
   }, []);

   const handleCreatePlan = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         await superAdminActions.createPlan({
            name: formData.name,
            price: parseFloat(formData.price),
            interval: formData.interval,
            features: formData.features,
            maxWorkspaces: parseInt(formData.maxWorkspaces) || 1,
         });
         toast.success("Plano criado com sucesso!");
         setIsModalOpen(false);
         setFormData({ name: "", price: "", interval: "month", features: "", maxWorkspaces: "1" });
      } catch (error: any) {
         toast.error(error.message || "Erro ao criar plano.");
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleUpdatePlan = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPlan) return;
      setIsSubmitting(true);
      try {
         await superAdminActions.updatePlan(selectedPlan.id, {
            name: editFormData.name,
            price: parseFloat(editFormData.price),
            interval: editFormData.interval,
            features: editFormData.features,
            maxWorkspaces: parseInt(editFormData.maxWorkspaces) || 1,
         });
         toast.success("Plano atualizado com sucesso!");
         setIsEditModalOpen(false);
      } catch (error: any) {
         toast.error(error.message || "Erro ao atualizar plano.");
      } finally {
         setIsSubmitting(false);
      }
   };

   const handleDeletePlan = async () => {
      if (!selectedPlan) return;
      if (!confirm("Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.")) return;

      setIsSubmitting(true);
      try {
         await superAdminActions.deletePlan(selectedPlan.id);
         toast.success("Plano excluído com sucesso!");
         setIsEditModalOpen(false);
      } catch (error: any) {
         toast.error(error.message || "Erro ao excluir plano.");
      } finally {
         setIsSubmitting(false);
      }
   };

   const openEditModal = (plan: any) => {
      setSelectedPlan(plan);
      setEditFormData({
         name: plan.name,
         price: plan.price.toString(),
         interval: plan.interval || "month",
         features: plan.features || "",
         maxWorkspaces: (plan.maxWorkspaces ?? 1).toString(),
      });
      setIsEditModalOpen(true);
   };

   const dynamicPlans = snap.plans || [];

   return (
      <div className="p-4 sm:p-6 md:p-8 space-y-8 md:space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-500">

         <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1">
               <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Gestão de Assinaturas</h1>
               <p className="text-muted-foreground text-sm font-medium">
                  Configuração de planos, precificação e monitoramento de conversão.
               </p>
            </div>
            <Button
               onClick={() => setIsModalOpen(true)}
               className="w-full sm:w-auto h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20"
            >
               <Plus className="size-4" /> CRIAR NOVO PLANO
            </Button>
         </div>

         <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="min-w-0 w-full flex-1 mx-auto">
               <div className="flex items-center gap-3 px-1 mb-5">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                     <ShieldCheck className="size-4" />
                  </div>
                  <h2 className="text-lg font-bold tracking-tight leading-none">Planos da Plataforma</h2>
               </div>
               <PlanCarousel
                  plans={dynamicPlans as any[]}
                  isLoading={snap.isLoading}
                  onEdit={openEditModal}
               />
            </div>
         </div>

         <div className="flex max-md:flex-col items-center gap-6">
            <div className="space-y-6 flex-1">
               <div className="flex items-center gap-3 px-1">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                     <BarChart3 className="size-5" />
                  </div>
                  <div>
                     <h2 className="text-xl font-bold tracking-tight leading-none">Métricas de Assinatura</h2>
                     <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">
                        Performance de vendas e retenção por plano
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <Card className="border-border/40 bg-emerald-500/5 overflow-hidden">
                     <CardContent className="p-5 md:p-6 flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                           <TrendingUp className="size-6" />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">
                              Taxa de Conversão Trial
                           </p>
                           <h3 className="text-2xl font-black tracking-tight mt-0.5">24.5%</h3>
                           <p className="text-[10px] text-emerald-600 font-bold">+2.1% este mês</p>
                        </div>
                     </CardContent>
                  </Card>

                  <Card className="border-border/40 bg-blue-500/5 overflow-hidden">
                     <CardContent className="p-5 md:p-6 flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                           <Target className="size-6" />
                        </div>
                        <div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700/60">
                              LTV Médio (Global)
                           </p>
                           <h3 className="text-2xl font-black tracking-tight mt-0.5">R$ 1.150</h3>
                           <p className="text-[10px] text-blue-600 font-bold">Base: 12 meses</p>
                        </div>
                     </CardContent>
                  </Card>
               </div>

               <Card className="border-border/40 shadow-sm overflow-hidden">
                  <div className="p-5 md:p-6 border-b border-border/40 flex items-center justify-between">
                     <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        Últimas Atividades de Assinatura
                     </h3>
                     <Button variant="ghost" size="sm" className="text-xs font-bold text-primary">
                        Ver histórico completo
                     </Button>
                  </div>
                  <div className="divide-y divide-border/30">
                     {snap.isLoading && (snap.subscriptions || []).length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">
                           <Loader2 className="size-6 animate-spin mx-auto mb-2 text-primary" />
                           <p className="text-xs font-bold uppercase tracking-widest">Carregando histórico...</p>
                        </div>
                     ) : (snap.subscriptions || []).length === 0 ? (
                        <div className="p-12 text-center text-muted-foreground border-2 border-dashed border-border/20 m-4 rounded-xl">
                           <p className="text-xs font-bold uppercase tracking-widest italic opacity-50">Nenhuma atividade registrada no momento</p>
                        </div>
                     ) : (
                        (snap.subscriptions || []).map((sub: any, idx: number) => (
                           <div
                              key={idx}
                              className="px-4 sm:px-6 py-4 flex items-center justify-between hover:bg-secondary/10 transition-colors"
                           >
                              <div className="flex items-center gap-3 min-w-0">
                                 <div
                                    className={cn(
                                       "size-8 rounded-lg flex items-center justify-center shrink-0",
                                       sub.status === "active" || sub.type === "NEW_SUBSCRIPTION"
                                          ? "bg-emerald-500/10 text-emerald-600"
                                          : "bg-rose-500/10 text-rose-600"
                                    )}
                                 >
                                    {sub.status === "active" || sub.type === "NEW_SUBSCRIPTION" ? (
                                       <Zap className="size-4" />
                                    ) : (
                                       <XCircle className="size-4" />
                                    )}
                                 </div>
                                 <div className="min-w-0">
                                    <p className="text-sm font-bold truncate">{sub.workspace?.name || "Desconhecido"}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                                       {sub.type === "CANCELLATION" ? "Cancelou:" : "Assinou:"} {sub.plan?.name}
                                    </p>
                                 </div>
                              </div>
                              <div className="text-right shrink-0 pl-4">
                                 <p
                                    className={cn(
                                       "text-sm font-black",
                                       sub.status !== "active" ? "text-rose-600" : "text-primary"
                                    )}
                                 >
                                    {sub.status === "active" ? "+" : "-"} R$ {sub.plan?.price}
                                 </p>
                                 <p className="text-[10px] text-muted-foreground font-bold">
                                    {new Date(sub.createdAt || sub.startDate).toLocaleDateString()}
                                 </p>
                              </div>
                           </div>
                        ))
                     )}
                  </div>
               </Card>
            </div>

            <div className="min-w-50 max-w-100 w-full">
               <Card className="border-none bg-primary text-primary-foreground p-6 sm:p-8 space-y-6 shadow-xl shadow-primary/20">
                  <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
                     <BadgeCheck className="size-6" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black tracking-tight leading-none">Trials Ativos</h3>
                     <p className="text-xs text-primary-foreground/70 font-medium">
                        Você tem 142 usuários em período de teste hoje.
                     </p>
                  </div>
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em]">
                           <span>META DE CONVERSÃO</span>
                           <span>82%</span>
                        </div>
                        <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                           <div className="bg-white h-full rounded-full" style={{ width: "82%" }} />
                        </div>
                     </div>
                     <Button className="w-full h-11 rounded-xl bg-white text-primary font-black uppercase tracking-widest text-[10px] hover:bg-white/90">
                        Ver Funil de Conversão
                     </Button>
                  </div>
               </Card>
            </div>
         </div>

         <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-md rounded-2xl">
               <DialogHeader>
                  <DialogTitle className="text-xl font-black tracking-tight">Novo Plano de Assinatura</DialogTitle>
               </DialogHeader>
               <form onSubmit={handleCreatePlan} className="space-y-4 py-4">
                  <div className="space-y-2">
                     <Label htmlFor="plan-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Plano</Label>
                     <Input
                        id="plan-name"
                        required
                        placeholder="Ex: Pro Unlimited"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Modelo de Cobrança</Label>
                     <Tabs
                        value={formData.interval}
                        onValueChange={(val) => setFormData({ ...formData, interval: val })}
                        className="w-full"
                     >
                        <TabsList className="grid w-full grid-cols-2 rounded-xl h-11 p-1 bg-secondary/50">
                           <TabsTrigger value="month" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                              Mensal
                           </TabsTrigger>
                           <TabsTrigger value="year" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                              Anual
                           </TabsTrigger>
                        </TabsList>
                     </Tabs>
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="plan-price" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Valor {formData.interval === "year" ? "Anual" : "Mensal"} (R$)
                     </Label>
                     <Input
                        id="plan-price"
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="plan-workspaces" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite de Workspaces</Label>
                     <Input
                        id="plan-workspaces"
                        type="number"
                        min="1"
                        required
                        placeholder="1"
                        value={formData.maxWorkspaces}
                        onChange={(e) => setFormData({ ...formData, maxWorkspaces: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="plan-features" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destaques (separados por vírgula)</Label>
                     <Input
                        id="plan-features"
                        placeholder="Ex: Alunos Ilimitados, Relatórios, etc."
                        value={formData.features}
                        onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <DialogFooter className="pt-4 gap-2">
                     <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
                        Cancelar
                     </Button>
                     <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-8 font-black gap-2">
                        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                        Criar Plano
                     </Button>
                  </DialogFooter>
               </form>
            </DialogContent>
         </Dialog>

         <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-md rounded-2xl border-primary/20 shadow-2xl shadow-primary/10">
               <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                  <DialogTitle className="text-xl font-black tracking-tight">Editar Oferta</DialogTitle>
               </DialogHeader>
               <form onSubmit={handleUpdatePlan} className="space-y-4 py-4">
                  <div className="space-y-2">
                     <Label htmlFor="edit-plan-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nome do Plano</Label>
                     <Input
                        id="edit-plan-name"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Modelo de Cobrança</Label>
                     <Tabs
                        value={editFormData.interval}
                        onValueChange={(val) => setEditFormData({ ...editFormData, interval: val })}
                        className="w-full"
                     >
                        <TabsList className="grid w-full grid-cols-2 rounded-xl h-11 p-1 bg-secondary/50">
                           <TabsTrigger value="month" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                              Mensal
                           </TabsTrigger>
                           <TabsTrigger value="year" className="rounded-lg font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm">
                              Anual
                           </TabsTrigger>
                        </TabsList>
                     </Tabs>
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="edit-plan-price" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Valor {editFormData.interval === "year" ? "Anual" : "Mensal"} (R$)
                     </Label>
                     <Input
                        id="edit-plan-price"
                        type="number"
                        step="0.01"
                        required
                        value={editFormData.price}
                        onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="edit-plan-workspaces" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Limite de Workspaces</Label>
                     <Input
                        id="edit-plan-workspaces"
                        type="number"
                        min="1"
                        required
                        placeholder="1"
                        value={editFormData.maxWorkspaces}
                        onChange={(e) => setEditFormData({ ...editFormData, maxWorkspaces: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="edit-plan-features" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Destaques</Label>
                     <Input
                        id="edit-plan-features"
                        value={editFormData.features}
                        onChange={(e) => setEditFormData({ ...editFormData, features: e.target.value })}
                        className="rounded-xl h-11"
                     />
                  </div>
                  <DialogFooter className="pt-4 gap-2">
                     <div className="w-full flex justify-between">
                        <Button
                           variant="ghost"
                           onClick={handleDeletePlan}
                           disabled={isSubmitting}
                           className="rounded-xl hover:bg-rose-500/10 h-11! font-black hover:text-rose-600 transition-all cursor-pointer"
                        >
                           <Trash2 className="size-4" /> Deletar
                        </Button>

                        <div className="flex gap-2">
                           <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-8 font-black gap-2 cursor-pointer">
                              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                              Salvar Alterações
                           </Button>
                        </div>
                     </div>
                  </DialogFooter>
               </form>
            </DialogContent>
         </Dialog>
      </div>
   );
}

function XCircle({ className }: { className?: string }) {
   return (
      <svg
         xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         className={className}
      >
         <circle cx="12" cy="12" r="10" />
         <path d="m15 9-6 6" />
         <path d="m9 9 6 6" />
      </svg>
   );
}
