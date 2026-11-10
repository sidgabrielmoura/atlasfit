"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
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
   AlertTriangle,
   ShieldAlert,
   DollarSign,
   Activity,
   ArrowUpRight,
   ArrowDownRight,
   CalendarDays,
   Users,
   MessageSquare,
   AlertCircle,
   Clock,
   Smartphone,
   CheckCircle2,
   X,
   UploadCloud,
   ImageIcon,
   Building,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { superAdminActions, useSuperAdminSnapshot } from "@/stores/superadmin.store";
import { toast } from "sonner";
import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
} from "@/components/ui/dialog";
import { buildAutoFeatures, updateFeaturesWithFields } from "@/components/application/plan-features";
import { PlanFormFields } from "@/components/application/plan-form-fields";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function PlanCarousel({
   plans,
   isLoading,
   onSelectPlan,
   isGym = false,
}: {
   plans: any[];
   isLoading: boolean;
   onSelectPlan: (plan: any) => void;
   isGym?: boolean;
}) {
   const trackRef = useRef<HTMLDivElement>(null);
   const [activeIndex, setActiveIndex] = useState(0);

   const cardWidth = useCallback(() => {
      const track = trackRef.current;
      if (!track) return 0;
      const card = track.querySelector<HTMLElement>("[data-card]");
      if (!card) return 0;
      const gap = 16;
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
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 py-4 w-full">
            {Array.from({ length: 4 }).map((_, i) => (
               <div key={i} className="p-4 border border-border/80 rounded-2xl bg-card space-y-3 shadow-xs">
                  <div className="flex justify-between items-center">
                     <Skeleton className="h-5 w-24 rounded-md" />
                     <Skeleton className="h-4 w-12 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-20 rounded-md" />
                  <Skeleton className="h-3 w-full rounded-md" />
                  <div className="space-y-1.5 pt-2 border-t border-border/40">
                     <Skeleton className="h-3 w-4/5 rounded-md" />
                     <Skeleton className="h-3 w-3/4 rounded-md" />
                  </div>
               </div>
            ))}
         </div>
      );
   }

   if (plans.length === 0) {
      return (
         <div className="p-8 border border-dashed border-border/60 rounded-2xl bg-secondary/10 text-center space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">
               Nenhum plano cadastrado nesta categoria.
            </p>
         </div>
      );
   }

   return (
      <div className="space-y-3 lg:max-w-[calc(100vw-25rem)] flex-1 w-full mx-auto">
         <div className="relative group/carousel">
            <button
               onClick={() => scrollToIndex(activeIndex - 1)}
               disabled={activeIndex === 0}
               aria-label="Anterior"
               className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 size-8 rounded-full bg-background border border-border/60 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-0 disabled:pointer-events-none"
            >
               <ChevronLeft className="size-4" />
            </button>

            <div
               ref={trackRef}
               className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory px-1 pb-1 no-scrollbar"
               style={{ scrollbarWidth: "none" }}
            >
               {plans.map((plan: any) => {
                  const subsCount = (plan._count?.subscriptions || 0) + (plan._count?.workspaceSubscriptions || 0);
                  return (
                     <div
                        key={plan.id}
                        data-card
                        className="snap-start shrink-0 w-[230px] sm:w-[245px] lg:w-[260px]"
                     >
                        <Card
                           onClick={() => onSelectPlan(plan)}
                           className="border-border/50 p-0 bg-card/60 overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all duration-300 group h-full flex flex-col cursor-pointer select-none"
                        >
                           {plan.imageUrl ? (
                              <div className="relative h-20 w-full overflow-hidden border-b border-border/40 bg-secondary/30 shrink-0">
                                 <img
                                    src={plan.imageUrl}
                                    alt={plan.name}
                                    className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                                 />
                                 <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                              </div>
                           ) : (
                              <div className="px-4 pt-3 flex items-center justify-between">
                                 <div className="p-1.5 rounded-lg bg-secondary border border-border/40 text-primary">
                                    {isGym ? <Building className="size-4" /> : <ShieldCheck className="size-4" />}
                                 </div>
                                 <Badge
                                    variant="outline"
                                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0 border-border bg-secondary/30"
                                 >
                                    {plan.paymentMethods === "CARD" ? "Cartão" : plan.paymentMethods === "PIX,CARD" ? "Pix + Cartão" : "PIX"}
                                 </Badge>
                              </div>
                           )}

                           <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                              <div>
                                 <div className="flex items-center justify-between gap-1">
                                    <h3 className="text-sm font-bold tracking-tight truncate text-foreground group-hover:text-primary transition-colors">
                                       {plan.name}
                                    </h3>
                                    <Badge
                                       variant="secondary"
                                       className="text-[9px] font-extrabold px-1.5 py-0 bg-primary/10 text-primary border-primary/20 shrink-0"
                                    >
                                       {subsCount} {subsCount === 1 ? "ativo" : "ativos"}
                                    </Badge>
                                 </div>
                                 <p className="text-base font-extrabold text-primary mt-1">
                                    R$ {plan.price}/{plan.interval === "year" ? "ano" : "mês"}
                                 </p>
                              </div>

                              <div className="space-y-1.5 text-[10px] font-bold text-muted-foreground pt-1 border-t border-border/40">
                                 {isGym ? (
                                    <>
                                       <div className="flex items-center justify-between">
                                          <span>Filiais:</span>
                                          <span className="text-foreground">{plan.maxWorkspaces || 1}</span>
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <span>Equipe/Filial:</span>
                                          <span className="text-foreground">{plan.maxStaff || 10}</span>
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <span>Alunos/Filial:</span>
                                          <span className="text-foreground">
                                             {plan.maxStudents !== null && plan.maxStudents !== undefined
                                                ? `${plan.maxStudents}`
                                                : "Ilimitado"}
                                          </span>
                                       </div>
                                    </>
                                 ) : (
                                    <>
                                       <div className="flex items-center justify-between">
                                          <span>Alunos:</span>
                                          <span className="text-foreground">
                                             {plan.maxStudents !== null && plan.maxStudents !== undefined
                                                ? `${plan.maxStudents}`
                                                : "Ilimitado"}
                                          </span>
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <span>Importações:</span>
                                          <span className="text-foreground">
                                             {plan.importQuota !== null && plan.importQuota !== undefined && plan.importQuota > 0
                                                ? `${plan.importQuota}/mês`
                                                : "Ilimitadas"}
                                          </span>
                                       </div>
                                       <div className="flex items-center justify-between">
                                          <span>Armazenamento:</span>
                                          <span className="text-foreground">
                                             {plan.storageLimitMb >= 1024
                                                ? `${(plan.storageLimitMb / 1024).toFixed(0)} GB`
                                                : `${plan.storageLimitMb} MB`}
                                          </span>
                                       </div>
                                    </>
                                 )}
                              </div>

                              <Button
                                 variant="ghost"
                                 size="sm"
                                 className="w-full h-7 text-[10px] font-black uppercase tracking-wider text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 gap-1 rounded-lg transition-all"
                              >
                                 Ver Detalhes <ArrowRight className="size-3" />
                              </Button>
                           </div>
                        </Card>
                     </div>
                  );
               })}
            </div>

            <button
               onClick={() => scrollToIndex(activeIndex + 1)}
               disabled={activeIndex >= plans.length - 1}
               aria-label="Próximo"
               className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 size-8 rounded-full bg-background border border-border/60 shadow-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-0 disabled:pointer-events-none"
            >
               <ChevronRight className="size-4" />
            </button>
         </div>

         {plans.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
               {plans.map((_, i) => (
                  <button
                     key={i}
                     onClick={() => scrollToIndex(i)}
                     aria-label={`Ir para plano ${i + 1}`}
                     className={cn(
                        "rounded-full transition-all duration-300",
                        i === activeIndex ? "w-4 h-1.5 bg-primary" : "size-1.5 bg-border hover:bg-primary/40"
                     )}
                  />
               ))}
            </div>
         )}
      </div>
   );
}

function SectionHeader({ title, icon: Icon, description }: { title: string; icon: any; description: string }) {
   return (
      <div className="flex items-center gap-4 mb-6 px-1">
         <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Icon className="size-5" />
         </div>
         <div>
            <h2 className="text-lg font-bold tracking-tight leading-none">{title}</h2>
            <p className="text-xs text-muted-foreground mt-1 font-medium uppercase tracking-wider">{description}</p>
         </div>
      </div>
   );
}

export default function SubscriptionsManagementPage() {
   const snap = useSuperAdminSnapshot();
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [isEditModalOpen, setIsEditModalOpen] = useState(false);
   const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
   const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<any>(null);
   const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
   const [isWarningActiveTrainersOpen, setIsWarningActiveTrainersOpen] = useState(false);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [isDeleting, setIsDeleting] = useState(false);
   const [selectedPlan, setSelectedPlan] = useState<any>(null);

   const defaultQuota = "25";
   const defaultStudents = "50";
   const defaultWs = "1";
   const defaultStorage = "1024";
   const defaultFeatures = buildAutoFeatures(defaultStudents, defaultQuota, defaultWs, defaultStorage).join(", ");

   const [formData, setFormData] = useState<{
      name: string;
      price: string;
      interval: string;
      features: string;
      imageUrl: string;
      maxWorkspaces: string;
      maxStudents: string;
      importQuota: string;
      storageLimitMb: string;
      paymentMethods: string;
      type: "PERSONAL" | "GYM";
      maxStaff: string;
   }>({
      name: "",
      price: "",
      interval: "month",
      features: defaultFeatures,
      imageUrl: "",
      maxWorkspaces: defaultWs,
      maxStudents: defaultStudents,
      importQuota: defaultQuota,
      storageLimitMb: defaultStorage,
      paymentMethods: "PIX",
      type: "PERSONAL",
      maxStaff: "10",
   });

   const [editFormData, setEditFormData] = useState<{
      name: string;
      price: string;
      interval: string;
      features: string;
      imageUrl: string;
      maxWorkspaces: string;
      maxStudents: string;
      importQuota: string;
      storageLimitMb: string;
      paymentMethods: string;
      type: "PERSONAL" | "GYM";
      maxStaff: string;
   }>({
      name: "",
      price: "",
      interval: "month",
      features: "",
      imageUrl: "",
      maxWorkspaces: "1",
      maxStudents: "",
      importQuota: defaultQuota,
      storageLimitMb: defaultStorage,
      paymentMethods: "PIX",
      type: "PERSONAL",
      maxStaff: "10",
   });

   const [isUploadingImage, setIsUploadingImage] = useState(false);
   const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const [editPendingImageFile, setEditPendingImageFile] = useState<File | null>(null);
   const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
   const [mounted, setMounted] = useState(false);

   const uploadImageFile = async (file: File): Promise<string> => {
      const presignedRes = await fetch("/api/storage/presigned", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            fileName: file.name,
            contentType: file.type || "image/jpeg",
            fileSize: file.size,
            targetType: "campaign_banner",
         }),
      });
      if (!presignedRes.ok) {
         throw new Error("Erro ao obter URL para upload da imagem.");
      }
      const { uploadUrl, fileUrl } = await presignedRes.json();
      const putRes = await fetch(uploadUrl, {
         method: "PUT",
         headers: { "Content-Type": file.type || "image/jpeg" },
         body: file,
      });
      if (!putRes.ok) {
         throw new Error("Erro ao enviar arquivo para o armazenamento.");
      }
      return fileUrl;
   };

   useEffect(() => {
      setMounted(true);
      superAdminActions.fetchPlans();
      superAdminActions.fetchSubscriptions();
   }, []);

   const openCreateModal = (type: "PERSONAL" | "GYM" = "PERSONAL") => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setPendingImageFile(null);
      setImagePreview(null);
      const isGym = type === "GYM";
      const ws = isGym ? "3" : "1";
      const students = isGym ? "500" : "50";
      const quota = "25";
      const storage = isGym ? "5120" : "1024";
      const features = buildAutoFeatures(students, quota, ws, storage).join(", ");
      setFormData({
         name: "",
         price: "",
         interval: "month",
         features,
         imageUrl: "",
         maxWorkspaces: ws,
         maxStudents: students,
         importQuota: quota,
         storageLimitMb: storage,
         paymentMethods: "PIX",
         type,
         maxStaff: isGym ? "15" : "10",
      });
      setIsModalOpen(true);
   };

   const openPlanDetails = (plan: any) => {
      setSelectedPlanForDetails(plan);
      setIsDetailsModalOpen(true);
   };

   const handleEditFromDetails = () => {
      if (!selectedPlanForDetails) return;
      const planToEdit = selectedPlanForDetails;
      setIsDetailsModalOpen(false);
      openEditModal(planToEdit);
   };

   const handleDeleteFromDetails = (e?: React.MouseEvent) => {
      if (!selectedPlanForDetails) return;
      setSelectedPlan(selectedPlanForDetails);
      setIsDetailsModalOpen(false);
      setIsConfirmDeleteOpen(true);
   };

   const handleCreatePlan = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      try {
         let finalImageUrl = formData.imageUrl.trim() || null;
         if (pendingImageFile) {
            setIsUploadingImage(true);
            try {
               finalImageUrl = await uploadImageFile(pendingImageFile);
            } finally {
               setIsUploadingImage(false);
            }
         }

         await superAdminActions.createPlan({
            name: formData.name,
            price: parseFloat(formData.price),
            interval: formData.interval,
            features: formData.features,
            imageUrl: finalImageUrl,
            maxWorkspaces: parseInt(formData.maxWorkspaces) || 1,
            maxStudents: formData.maxStudents ? parseInt(formData.maxStudents) : null,
            importQuota: formData.importQuota ? parseInt(formData.importQuota) : 25,
            storageLimitMb: formData.storageLimitMb ? parseInt(formData.storageLimitMb) : 1024,
            paymentMethods: formData.paymentMethods,
            type: formData.type || "PERSONAL",
            maxStaff: formData.type === "GYM" ? parseInt(formData.maxStaff) || 10 : null,
         });
         toast.success("Plano criado com sucesso!");
         if (imagePreview) URL.revokeObjectURL(imagePreview);
         setPendingImageFile(null);
         setImagePreview(null);
         setIsModalOpen(false);
      } catch (error: any) {
         toast.error(error.message || "Erro ao criar plano.");
      } finally {
         setIsSubmitting(false);
         setIsUploadingImage(false);
      }
   };

   const handleUpdatePlan = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedPlan) return;
      setIsSubmitting(true);
      try {
         let finalImageUrl = editFormData.imageUrl.trim() || null;
         if (editPendingImageFile) {
            setIsUploadingImage(true);
            try {
               finalImageUrl = await uploadImageFile(editPendingImageFile);
            } finally {
               setIsUploadingImage(false);
            }
         }

         await superAdminActions.updatePlan(selectedPlan.id, {
            name: editFormData.name,
            price: parseFloat(editFormData.price),
            interval: editFormData.interval,
            features: editFormData.features,
            imageUrl: finalImageUrl,
            maxWorkspaces: parseInt(editFormData.maxWorkspaces) || 1,
            maxStudents: editFormData.maxStudents ? parseInt(editFormData.maxStudents) : null,
            importQuota: editFormData.importQuota ? parseInt(editFormData.importQuota) : 25,
            storageLimitMb: editFormData.storageLimitMb ? parseInt(editFormData.storageLimitMb) : 1024,
            paymentMethods: editFormData.paymentMethods,
            type: editFormData.type || "PERSONAL",
            maxStaff: editFormData.type === "GYM" ? parseInt(editFormData.maxStaff) || 10 : null,
         });
         toast.success("Plano atualizado com sucesso!");
         if (editImagePreview) URL.revokeObjectURL(editImagePreview);
         setEditPendingImageFile(null);
         setEditImagePreview(null);
         setIsEditModalOpen(false);
      } catch (error: any) {
         toast.error(error.message || "Erro ao atualizar plano.");
      } finally {
         setIsSubmitting(false);
         setIsUploadingImage(false);
      }
   };

   const handleDeletePlan = async () => {
      if (!selectedPlan) return;

      setIsDeleting(true);
      try {
         await superAdminActions.deletePlan(selectedPlan.id);
         toast.success("Plano excluído com sucesso!");
         setIsConfirmDeleteOpen(false);
         setSelectedPlan(null);
      } catch (error: any) {
         setIsConfirmDeleteOpen(false);
         if (
            error.message &&
            (error.message.includes("active subscriptions") ||
               error.message.includes("trainers ativos") ||
               error.message.includes("assinaturas") ||
               error.message.includes("400"))
         ) {
            setIsWarningActiveTrainersOpen(true);
         } else {
            toast.error(error.message || "Erro ao excluir plano.");
         }
      } finally {
         setIsDeleting(false);
      }
   };

   const triggerDeleteConfirmation = (e?: React.MouseEvent) => {
      if (e) {
         e.preventDefault();
         e.stopPropagation();
      }
      setIsEditModalOpen(false);
      setIsConfirmDeleteOpen(true);
   };

   const openEditModal = (plan: any) => {
      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
      setEditPendingImageFile(null);
      setEditImagePreview(null);
      setSelectedPlan(plan);
      const initialQuota = plan.importQuota !== null && plan.importQuota !== undefined ? plan.importQuota.toString() : "25";
      const initialStudents = plan.maxStudents !== null && plan.maxStudents !== undefined ? plan.maxStudents.toString() : "";
      const initialWs = (plan.maxWorkspaces ?? 1).toString();
      const initialStorage = plan.storageLimitMb !== null && plan.storageLimitMb !== undefined ? plan.storageLimitMb.toString() : "1024";
      const initialStaff = (plan.maxStaff ?? 10).toString();
      const syncedFeatures = updateFeaturesWithFields(plan.features || "", initialStudents, initialQuota, initialWs, initialStorage);

      setEditFormData({
         name: plan.name,
         price: plan.price.toString(),
         interval: plan.interval || "month",
         features: syncedFeatures,
         imageUrl: plan.imageUrl || "",
         maxWorkspaces: initialWs,
         maxStudents: initialStudents,
         importQuota: initialQuota,
         storageLimitMb: initialStorage,
         paymentMethods: plan.paymentMethods || "PIX",
         type: (plan.type === "GYM" ? "GYM" : "PERSONAL") as "PERSONAL" | "GYM",
         maxStaff: initialStaff,
      });
      setIsEditModalOpen(true);
   };

   const dynamicPlans = snap.plans || [];
   const personalPlans = dynamicPlans.filter((p: any) => p.type !== "GYM");
   const gymPlans = dynamicPlans.filter((p: any) => p.type === "GYM");

   const activeSubsCount = dynamicPlans.reduce(
      (acc: number, plan: any) => acc + (plan._count?.subscriptions || 0) + (plan._count?.workspaceSubscriptions || 0),
      0
   );
   const estimatedMrr = dynamicPlans.reduce(
      (acc: number, plan: any) => acc + plan.price * ((plan._count?.subscriptions || 0) + (plan._count?.workspaceSubscriptions || 0)),
      0
   );

   const chartData = snap.subscriptionMetrics?.activeSubsHistory || [];

   return (
      <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700">
         <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6 border-b border-border/40 pb-6 md:pb-8">
            <div className="space-y-1">
               <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                  <ShieldAlert className="size-4" />
                  Global Control Panel
               </div>
               <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">Gestão de Assinaturas</h1>
               <p className="text-muted-foreground text-xs sm:text-sm font-medium">Configuração de planos, precificação e acompanhamento de receita recorrente em tempo real.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
               <Button
                  onClick={() => openCreateModal("PERSONAL")}
                  variant="outline"
                  className="h-11 rounded-xl gap-2 font-bold cursor-pointer border-border/60 hover:bg-secondary transition-all duration-200 text-xs"
               >
                  <Plus className="size-4" /> Novo Plano Personal
               </Button>
               <Button
                  onClick={() => openCreateModal("GYM")}
                  className="h-11 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer hover:bg-primary/90 transition-all duration-200 text-xs"
               >
                  <Building className="size-4" /> Novo Plano Academia
               </Button>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <Card className="lg:col-span-7 border-border/40 bg-card/50 shadow-sm overflow-hidden flex flex-col justify-between">
               <div className="p-5 md:p-6 pb-2">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Evolução de Assinaturas (SaaS)</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">Crescimento de treinadores ativos nos últimos 6 meses</p>
               </div>
               <CardContent className="pt-4 flex-1">
                  <div className="h-[250px] w-full min-w-0">
                     {mounted && (
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                           <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                              <defs>
                                 <linearGradient id="fillGrowth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
                                 </linearGradient>
                              </defs>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/30" />
                              <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} className="text-[10px] font-bold text-muted-foreground" />
                              <YAxis tickLine={false} axisLine={false} className="text-[10px] font-bold text-muted-foreground" />
                              <Tooltip contentStyle={{ background: "rgba(9, 9, 11, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "12px", fontSize: "11px" }} />
                              <Area type="monotone" dataKey="total" name="Assinantes" stroke="var(--primary)" strokeWidth={2.5} fill="url(#fillGrowth)" />
                           </AreaChart>
                        </ResponsiveContainer>
                     )}
                  </div>
               </CardContent>
            </Card>

            {/* Grid de Cards de Métricas */}
            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-6 items-stretch">
               {/* MRR Estimado */}
               <Card className="border-border/40 bg-card/50 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                     <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                           <DollarSign className="size-4" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10">
                           <ArrowUpRight className="size-3" /> +12.4%
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">MRR Estimado (SaaS)</p>
                        <h3 className="text-2xl font-black tracking-tight mt-1">
                           {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(estimatedMrr)}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Faturamento recorrente estimado</p>
                     </div>
                  </CardContent>
               </Card>

               {/* Assinantes Ativos */}
               <Card className="border-border/40 bg-card/50 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                     <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                           <Users className="size-4" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10">
                           <ArrowUpRight className="size-3" /> +8.1%
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Treinadores Ativos</p>
                        <h3 className="text-2xl font-black tracking-tight mt-1">{activeSubsCount}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Contas ativas na plataforma</p>
                     </div>
                  </CardContent>
               </Card>

               {/* LTV Estimado */}
               <Card className="border-border/40 bg-card/50 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                     <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                           <Target className="size-4" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10">
                           <ArrowUpRight className="size-3" /> +5.0%
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">LTV Médio (Global)</p>
                        <h3 className="text-2xl font-black tracking-tight mt-1">
                           {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(snap.subscriptionMetrics?.avgLtv || 0)}
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">LTV calculado em 12 meses</p>
                     </div>
                  </CardContent>
               </Card>

               {/* Conversão de Trial */}
               <Card className="border-border/40 bg-card/50 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                     <div className="flex items-center justify-between">
                        <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                           <TrendingUp className="size-4" />
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-500/10">
                           <ArrowUpRight className="size-3" /> +2.1%
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conversão Trial</p>
                        <h3 className="text-2xl font-black tracking-tight mt-1">
                           {(snap.subscriptionMetrics?.trialConversionRate || 0).toFixed(1)}%
                        </h3>
                        <p className="text-[10px] text-muted-foreground mt-1 font-medium">Conversão de testes em plano pago</p>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>

         {/* 3. Seções de Planos e Ofertas (Personal e Academias) */}
         <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <SectionHeader
                  title="Planos para Personal Trainers"
                  icon={ShieldCheck}
                  description="Ofertas globais voltadas para consultorias e profissionais autônomos"
               />
               <Button
                  onClick={() => openCreateModal("PERSONAL")}
                  variant="outline"
                  className="h-9 rounded-xl gap-2 font-bold cursor-pointer border-border/60 hover:bg-secondary transition-all text-xs"
               >
                  <Plus className="size-3.5" /> Novo Plano Personal
               </Button>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 items-center">
               <div className="min-w-0 w-full flex-1 mx-auto">
                  <PlanCarousel
                     plans={personalPlans as any[]}
                     isLoading={snap.isLoading}
                     onSelectPlan={openPlanDetails}
                     isGym={false}
                  />
               </div>
            </div>
         </section>

         <section className="space-y-6 pt-4 border-t border-border/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
               <SectionHeader
                  title="Planos para Academias & Franquias"
                  icon={Building}
                  description="Ofertas globais com múltiplas filiais e funcionários por unidade"
               />
               <Button
                  onClick={() => openCreateModal("GYM")}
                  className="h-9 rounded-xl gap-2 font-bold bg-primary text-primary-foreground shadow-sm cursor-pointer hover:bg-primary/90 transition-all text-xs"
               >
                  <Building className="size-3.5" /> Novo Plano Academia
               </Button>
            </div>
            <div className="flex flex-col lg:flex-row gap-6 items-center">
               <div className="min-w-0 w-full flex-1 mx-auto">
                  <PlanCarousel
                     plans={gymPlans as any[]}
                     isLoading={snap.isLoading}
                     onSelectPlan={openPlanDetails}
                     isGym={true}
                  />
               </div>
            </div>
         </section>

         {/* 4. Dashboard Estratégico de Assinaturas e Métricas de Conversão */}
         <section className="space-y-6">
            {/* Impending Expiration Warning Banner */}
            {snap.subscriptionMetrics?.impendingTrialExpirations?.count > 0 && (
               <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-amber-500/5"
               >
                  <div className="flex items-start gap-3">
                     <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mt-0.5 sm:mt-0 shrink-0">
                        <AlertTriangle className="size-4.5 animate-pulse" />
                     </div>
                     <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-500">Free Trials Expirando Brevemente</h4>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium leading-relaxed">
                           Há <strong className="text-white font-black">{snap.subscriptionMetrics.impendingTrialExpirations.count} treinador(es)</strong> com período de avaliação terminando em menos de 3 dias. Fale com eles para impulsionar a conversão da plataforma!
                        </p>
                     </div>
                  </div>
               </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
               <div className="lg:col-span-8 space-y-6">
                  <Tabs defaultValue="activities" className="w-full space-y-6">
                     <TabsList className="flex flex-row flex-nowrap h-12 gap-2 bg-secondary/30 p-1.5 rounded-2xl border border-border/40 w-full justify-start overflow-x-auto no-scrollbar scrollbar-none whitespace-nowrap">
                        <TabsTrigger value="activities" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0 whitespace-nowrap">
                           Atividade Recente
                        </TabsTrigger>
                        <TabsTrigger value="free_trials" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0 whitespace-nowrap">
                           Free Trials ({snap.subscriptionMetrics?.freeTrials?.count ?? 0})
                        </TabsTrigger>
                        <TabsTrigger value="pre_subs" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0 whitespace-nowrap">
                           Pré-Assinaturas ({snap.subscriptionMetrics?.preSubscriptions?.count ?? 0})
                        </TabsTrigger>
                        <TabsTrigger value="delinquent" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0 whitespace-nowrap">
                           Atrasados/Expirados ({snap.subscriptionMetrics?.delinquentTrainers?.count ?? 0})
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm shrink-0 whitespace-nowrap">
                           Histórico de Pagamentos
                        </TabsTrigger>
                     </TabsList>

                     {/* Tab 1: Atividade Recente */}
                     <TabsContent value="activities" className="space-y-4 outline-none">
                        <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
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
                                 (snap.subscriptions || []).slice(0, 10).map((sub: any, idx: number) => (
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
                     </TabsContent>

                     {/* Tab 2: Free Trials */}
                     <TabsContent value="free_trials" className="space-y-4 outline-none">
                        <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
                           <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                       <th className="p-4 sm:p-5">Treinador</th>
                                       <th className="p-4 sm:p-5">Período de Teste</th>
                                       <th className="p-4 sm:p-5">Tempo Restante</th>
                                       <th className="p-4 sm:p-5 text-right">Ações</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-border/30 text-xs font-medium">
                                    {!snap.subscriptionMetrics?.freeTrials?.list || snap.subscriptionMetrics.freeTrials.list.length === 0 ? (
                                       <tr>
                                          <td colSpan={4} className="p-12 text-center text-muted-foreground">
                                             <p className="font-bold uppercase tracking-widest italic opacity-50">Nenhum treinador em Free Trial atualmente</p>
                                          </td>
                                       </tr>
                                    ) : (
                                       snap.subscriptionMetrics.freeTrials.list.map((trial: any) => (
                                          <tr key={trial.id} className="hover:bg-secondary/10 transition-colors">
                                             <td className="p-4 sm:p-5">
                                                <div className="flex items-center gap-3">
                                                   <div className="size-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold animate-in fade-in duration-300">
                                                      {trial.name.slice(0, 2).toUpperCase()}
                                                   </div>
                                                   <div>
                                                      <p className="font-bold text-white leading-none">{trial.name}</p>
                                                      <p className="text-[10px] text-muted-foreground mt-1">{trial.email}</p>
                                                   </div>
                                                </div>
                                             </td>
                                             <td className="p-4 sm:p-5 text-neutral-400">
                                                {new Date(trial.startDate).toLocaleDateString()} a {new Date(trial.endDate).toLocaleDateString()}
                                             </td>
                                             <td className="p-4 sm:p-5">
                                                <Badge className={cn(
                                                   "font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 border",
                                                   trial.daysRemaining <= 3
                                                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                )}>
                                                   {trial.daysRemaining} {trial.daysRemaining === 1 ? "dia" : "dias"} restante(s)
                                                </Badge>
                                             </td>
                                             <td className="p-4 sm:p-5 text-right">
                                                {trial.whatsapp && trial.whatsapp !== "Não cadastrado" ? (
                                                   <a
                                                      href={`https://wa.me/${trial.whatsapp.replace(/\D/g, "")}`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                   >
                                                      <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold gap-1 border-primary/20 text-primary hover:bg-primary/10 cursor-pointer">
                                                         <MessageSquare className="size-3" /> WhatsApp
                                                      </Button>
                                                   </a>
                                                ) : (
                                                   <span className="text-[10px] text-muted-foreground italic">Sem WhatsApp</span>
                                                )}
                                             </td>
                                          </tr>
                                       ))
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </Card>
                     </TabsContent>

                     {/* Tab 3: Pré-Assinaturas */}
                     <TabsContent value="pre_subs" className="space-y-4 outline-none">
                        <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
                           <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                       <th className="p-4 sm:p-5">Treinador</th>
                                       <th className="p-4 sm:p-5">Plano Selecionado</th>
                                       <th className="p-4 sm:p-5">Valor</th>
                                       <th className="p-4 sm:p-5">Programado Para</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-border/30 text-xs font-medium">
                                    {!snap.subscriptionMetrics?.preSubscriptions?.list || snap.subscriptionMetrics.preSubscriptions.list.length === 0 ? (
                                       <tr>
                                          <td colSpan={4} className="p-12 text-center text-muted-foreground">
                                             <p className="font-bold uppercase tracking-widest italic opacity-50">Nenhuma pré-assinatura registrada no momento</p>
                                          </td>
                                       </tr>
                                    ) : (
                                       snap.subscriptionMetrics.preSubscriptions.list.map((sub: any) => (
                                          <tr key={sub.id} className="hover:bg-secondary/10 transition-colors">
                                             <td className="p-4 sm:p-5">
                                                <div className="flex items-center gap-3">
                                                   <div className="size-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold">
                                                      {sub.name.slice(0, 2).toUpperCase()}
                                                   </div>
                                                   <div>
                                                      <p className="font-bold text-white leading-none">{sub.name}</p>
                                                      <p className="text-[10px] text-muted-foreground mt-1">{sub.email}</p>
                                                   </div>
                                                </div>
                                             </td>
                                             <td className="p-4 sm:p-5 text-white font-bold">
                                                {sub.planName}
                                             </td>
                                             <td className="p-4 sm:p-5 text-primary font-black">
                                                R$ {sub.amount.toFixed(2)}
                                             </td>
                                             <td className="p-4 sm:p-5">
                                                <div className="flex items-center gap-1.5 text-emerald-500 font-bold">
                                                   <CheckCircle2 className="size-3.5" />
                                                   <span>{new Date(sub.startDate).toLocaleDateString()}</span>
                                                </div>
                                             </td>
                                          </tr>
                                       ))
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </Card>
                     </TabsContent>

                     {/* Tab 4: Atrasados e Expirados */}
                     <TabsContent value="delinquent" className="space-y-4 outline-none">
                        <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
                           <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                       <th className="p-4 sm:p-5">Treinador</th>
                                       <th className="p-4 sm:p-5">Status</th>
                                       <th className="p-4 sm:p-5">Data Limite</th>
                                       <th className="p-4 sm:p-5 text-right">Recuperação</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-border/30 text-xs font-medium">
                                    {!snap.subscriptionMetrics?.delinquentTrainers?.list || snap.subscriptionMetrics.delinquentTrainers.list.length === 0 ? (
                                       <tr>
                                          <td colSpan={4} className="p-12 text-center text-muted-foreground">
                                             <p className="font-bold uppercase tracking-widest text-emerald-500 flex items-center justify-center gap-1.5 opacity-80">
                                                <CheckCircle2 className="size-4 animate-in zoom-in duration-300" /> 100% Adimplente! Nenhum treinador em atraso.
                                             </p>
                                          </td>
                                       </tr>
                                    ) : (
                                       snap.subscriptionMetrics.delinquentTrainers.list.map((del: any) => {
                                          const textMsg = encodeURIComponent(
                                             `Olá ${del.name}, tudo bem? Sou da equipe AtlasFit. Notei que o seu período de testes/mensalidade expirou recentemente. Gostaria de uma condição especial ou de ajuda para reativar seu acesso e continuar gerenciando seus alunos?`
                                          );
                                          return (
                                             <tr key={del.id} className="hover:bg-secondary/10 transition-colors">
                                                <td className="p-4 sm:p-5">
                                                   <div className="flex items-center gap-3">
                                                      <div className="size-8 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center font-bold">
                                                         {del.name.slice(0, 2).toUpperCase()}
                                                      </div>
                                                      <div>
                                                         <p className="font-bold text-white leading-none">{del.name}</p>
                                                         <p className="text-[10px] text-muted-foreground mt-1">{del.email}</p>
                                                      </div>
                                                   </div>
                                                </td>
                                                <td className="p-4 sm:p-5">
                                                   <Badge variant="destructive" className="font-bold text-[9px] uppercase tracking-wider px-2 py-0.5">
                                                      {del.status}
                                                   </Badge>
                                                </td>
                                                <td className="p-4 sm:p-5 text-neutral-400">
                                                   {new Date(del.date).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 sm:p-5 text-right">
                                                   {del.whatsapp && del.whatsapp !== "Não cadastrado" ? (
                                                      <a
                                                         href={`https://wa.me/${del.whatsapp.replace(/\D/g, "")}?text=${textMsg}`}
                                                         target="_blank"
                                                         rel="noopener noreferrer"
                                                      >
                                                         <Button variant="default" size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1 bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md shadow-emerald-600/10 transition-all duration-200">
                                                            <MessageSquare className="size-3" /> Recuperar
                                                         </Button>
                                                      </a>
                                                   ) : (
                                                      <span className="text-[10px] text-muted-foreground italic">Sem WhatsApp</span>
                                                   )}
                                                </td>
                                             </tr>
                                          );
                                       })
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </Card>
                     </TabsContent>

                     {/* Tab 5: Histórico de Faturamento */}
                     <TabsContent value="transactions" className="space-y-4 outline-none">
                        <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden">
                           <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                 <thead>
                                    <tr className="border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                       <th className="p-4 sm:p-5">ID / Data</th>
                                       <th className="p-4 sm:p-5">Treinador</th>
                                       <th className="p-4 sm:p-5">Método / Descrição</th>
                                       <th className="p-4 sm:p-5">Valor</th>
                                       <th className="p-4 sm:p-5 text-right">Status</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-border/30 text-xs font-medium">
                                    {!snap.subscriptionMetrics?.transactionsHistory || snap.subscriptionMetrics.transactionsHistory.length === 0 ? (
                                       <tr>
                                          <td colSpan={5} className="p-12 text-center text-muted-foreground">
                                             <p className="font-bold uppercase tracking-widest italic opacity-50">Nenhuma transação financeira registrada no momento</p>
                                          </td>
                                       </tr>
                                    ) : (
                                       snap.subscriptionMetrics.transactionsHistory.map((tx: any) => (
                                          <tr key={tx.id} className="hover:bg-secondary/10 transition-colors">
                                             <td className="p-4 sm:p-5">
                                                <p className="font-bold text-white font-mono text-[10px] select-all">{tx.id}</p>
                                                <p className="text-[9px] text-muted-foreground mt-1 font-bold">{new Date(tx.date).toLocaleString()}</p>
                                             </td>
                                             <td className="p-4 sm:p-5">
                                                <p className="font-bold text-white leading-none">{tx.userName}</p>
                                                <p className="text-[10px] text-muted-foreground mt-1">{tx.userEmail}</p>
                                             </td>
                                             <td className="p-4 sm:p-5">
                                                <div className="flex items-center gap-1.5">
                                                   <Badge variant="outline" className="text-[8px] tracking-wider uppercase font-black px-1.5 py-0 border-border/60">
                                                      {tx.paymentMethod}
                                                   </Badge>
                                                   <span className="text-[11px] text-neutral-400">{tx.description}</span>
                                                </div>
                                             </td>
                                             <td className="p-4 sm:p-5 text-primary font-black">
                                                R$ {tx.amount.toFixed(2)}
                                             </td>
                                             <td className="p-4 sm:p-5 text-right">
                                                <Badge className={cn(
                                                   "font-bold text-[9px] uppercase tracking-wider px-2 py-0.5 border",
                                                   tx.status === "APPROVED"
                                                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                      : tx.status === "PENDING"
                                                         ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                         : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                                )}>
                                                   {tx.status === "APPROVED" ? "Aprovado" : tx.status === "PENDING" ? "Pendente" : "Falhou"}
                                                </Badge>
                                             </td>
                                          </tr>
                                       ))
                                    )}
                                 </tbody>
                              </table>
                           </div>
                        </Card>
                     </TabsContent>
                  </Tabs>
               </div>

               {/* Painel Lateral: Trials e Conversão (4 cols) */}
               <div className="lg:col-span-4 space-y-6 animate-in slide-in-from-right duration-500">
                  <SectionHeader title="Trials e Conversão" icon={BadgeCheck} description="Metas e desempenho de testes grátis" />
                  <Card className="border-none bg-primary text-primary-foreground p-6 sm:p-8 space-y-6 shadow-xl shadow-primary/20">
                     <div className="size-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30">
                        <BadgeCheck className="size-6" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black tracking-tight leading-none">Trials Ativos</h3>
                        <p className="text-xs text-primary-foreground/70 font-medium">
                           Você tem <strong className="text-white font-black">{snap.subscriptionMetrics?.freeTrials?.count ?? 0} usuários</strong> em período de teste hoje.
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
                        <Button className="w-full h-11 rounded-xl bg-white text-primary font-black uppercase tracking-widest text-[10px] hover:bg-white/90 cursor-pointer">
                           Ver Funil de Conversão
                        </Button>
                     </div>
                  </Card>
               </div>
            </div>
         </section>

         {/* Modal de Detalhes Completos do Plano */}
         <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
            <DialogContent className="max-w-2xl rounded-2xl border-border/60 bg-card p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
               <DialogHeader className="space-y-3 pb-4 border-b border-border/40">
                  <div className="flex items-center justify-between gap-3">
                     <Badge
                        variant="outline"
                        className={cn(
                           "text-[10px] font-black uppercase px-2.5 py-1",
                           selectedPlanForDetails?.type === "GYM"
                              ? "border-amber-500/30 text-amber-500 bg-amber-500/10"
                              : "border-primary/30 text-primary bg-primary/10"
                        )}
                     >
                        {selectedPlanForDetails?.type === "GYM" ? "Academia & Franquia" : "Personal Trainer"}
                     </Badge>
                     <Badge variant="outline" className="text-[10px] font-extrabold uppercase px-2 py-0.5 border-border">
                        {selectedPlanForDetails?.paymentMethods === "CARD"
                           ? "Cartão"
                           : selectedPlanForDetails?.paymentMethods === "PIX,CARD"
                           ? "Pix + Cartão"
                           : "PIX"}
                     </Badge>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                     <DialogTitle className="text-2xl font-black tracking-tight">{selectedPlanForDetails?.name}</DialogTitle>
                     <span className="text-2xl font-black text-primary">
                        R$ {selectedPlanForDetails?.price?.toFixed(2)}
                        <span className="text-xs font-semibold text-muted-foreground ml-1">
                           /{selectedPlanForDetails?.interval === "year" ? "ano" : "mês"}
                        </span>
                     </span>
                  </div>
               </DialogHeader>

               <div className="space-y-6 py-4 overflow-y-auto pr-1">
                  {selectedPlanForDetails?.imageUrl && (
                     <div className="relative h-44 w-full rounded-xl overflow-hidden border border-border/40 bg-secondary/30 shrink-0">
                        <img
                           src={selectedPlanForDetails.imageUrl}
                           alt={selectedPlanForDetails.name}
                           className="size-full object-cover"
                        />
                     </div>
                  )}

                  {/* Grid de Informações e Capacidade */}
                  <div className="space-y-2">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Capacidade e Recursos do Plano
                     </h4>
                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl border border-border/50 bg-secondary/20 space-y-1">
                           <span className="text-[10px] font-semibold text-muted-foreground uppercase">Assinantes Ativos</span>
                           <p className="text-sm font-bold text-foreground">
                              {(selectedPlanForDetails?._count?.subscriptions || 0) +
                                 (selectedPlanForDetails?._count?.workspaceSubscriptions || 0)}{" "}
                              contas
                           </p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/50 bg-secondary/20 space-y-1">
                           <span className="text-[10px] font-semibold text-muted-foreground uppercase">Limite de Alunos</span>
                           <p className="text-sm font-bold text-foreground">
                              {selectedPlanForDetails?.maxStudents ? `${selectedPlanForDetails.maxStudents}` : "Ilimitado"}
                           </p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/50 bg-secondary/20 space-y-1">
                           <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                              {selectedPlanForDetails?.type === "GYM" ? "Filiais Permitidas" : "Workspaces"}
                           </span>
                           <p className="text-sm font-bold text-foreground">
                              {selectedPlanForDetails?.maxWorkspaces || 1}
                           </p>
                        </div>
                        {selectedPlanForDetails?.type === "GYM" && (
                           <div className="p-3 rounded-xl border border-border/50 bg-secondary/20 space-y-1">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                                 Funcionários / Filial
                              </span>
                              <p className="text-sm font-bold text-foreground">
                                 {selectedPlanForDetails?.maxStaff || 10} colaboradores
                              </p>
                           </div>
                        )}
                        <div className="p-3 rounded-xl border border-border/50 bg-secondary/20 space-y-1">
                           <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                              Quota de Importações
                           </span>
                           <p className="text-sm font-bold text-foreground">
                              {selectedPlanForDetails?.importQuota > 0
                                 ? `${selectedPlanForDetails.importQuota}/mês`
                                 : "Ilimitada"}
                           </p>
                        </div>
                        <div className="p-3 rounded-xl border border-border/50 bg-secondary/20 space-y-1">
                           <span className="text-[10px] font-semibold text-muted-foreground uppercase">Armazenamento</span>
                           <p className="text-sm font-bold text-foreground">
                              {selectedPlanForDetails?.storageLimitMb >= 1024
                                 ? `${Math.round(selectedPlanForDetails.storageLimitMb / 1024)} GB`
                                 : `${selectedPlanForDetails?.storageLimitMb || 1024} MB`}
                           </p>
                        </div>
                     </div>
                  </div>

                  {/* Vantagens / Features list */}
                  <div className="space-y-2">
                     <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Vantagens e Destaques
                     </h4>
                     <div className="p-4 rounded-xl border border-border/50 bg-secondary/10 space-y-2">
                        {selectedPlanForDetails?.features ? (
                           selectedPlanForDetails.features.split(",").map((feature: string, idx: number) => (
                              <div key={idx} className="flex items-center gap-2 text-xs">
                                 <CheckCircle2 className="size-4 text-primary shrink-0" />
                                 <span className="font-medium text-foreground">{feature.trim()}</span>
                              </div>
                           ))
                        ) : (
                           <p className="text-xs text-muted-foreground italic">Nenhuma vantagem customizada cadastrada.</p>
                        )}
                     </div>
                  </div>
               </div>

               <DialogFooter className="pt-4 border-t border-border/40 flex flex-col-reverse sm:flex-row justify-between gap-3">
                  <Button
                     variant="ghost"
                     type="button"
                     onClick={() => handleDeleteFromDetails()}
                     disabled={isDeleting}
                     className="rounded-xl hover:bg-rose-500/10 h-10 font-bold hover:text-rose-600 transition-all cursor-pointer text-xs"
                  >
                     <Trash2 className="size-4 mr-1 text-rose-500" /> Excluir Plano
                  </Button>

                  <div className="flex gap-2">
                     <Button
                        variant="outline"
                        onClick={() => setIsDetailsModalOpen(false)}
                        className="rounded-xl h-10 font-semibold text-xs"
                     >
                        Fechar
                     </Button>
                     <Button
                        onClick={handleEditFromDetails}
                        className="rounded-xl h-10 px-6 font-bold gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-sm"
                     >
                        <Settings2 className="size-4" /> Editar Plano
                     </Button>
                  </div>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog
            open={isModalOpen}
            onOpenChange={(open) => {
               setIsModalOpen(open);
               if (!open) {
                  if (imagePreview) URL.revokeObjectURL(imagePreview);
                  setPendingImageFile(null);
                  setImagePreview(null);
               }
            }}
         >
            <DialogContent className="max-w-3xl overflow-auto! rounded-2xl!">
               <DialogHeader>
                  <DialogTitle className="text-xl font-black tracking-tight">
                     {formData.type === "GYM" ? "Novo Plano para Academias & Franquias" : "Novo Plano para Personal Trainer"}
                  </DialogTitle>
               </DialogHeader>
               <form onSubmit={handleCreatePlan} className="py-4">
                  <PlanFormFields idPrefix="plan" value={formData} onChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}>
                        <div className="space-y-2 pt-2 border-t border-border/40">
                           <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                 Imagem do Plano
                              </Label>
                              {(imagePreview || formData.imageUrl) && (
                                 <button
                                    type="button"
                                    onClick={() => {
                                       if (imagePreview) URL.revokeObjectURL(imagePreview);
                                       setPendingImageFile(null);
                                       setImagePreview(null);
                                       setFormData((f) => ({ ...f, imageUrl: "" }));
                                    }}
                                    className="text-[10px] truncate text-destructive hover:underline font-bold"
                                 >
                                    Remover imagem
                                 </button>
                              )}
                           </div>
                           <div className="flex gap-2">
                              <Input
                                 value={pendingImageFile ? `[Arquivo selecionado] ${pendingImageFile.name}` : formData.imageUrl}
                                 onChange={(e) => {
                                    if (imagePreview) URL.revokeObjectURL(imagePreview);
                                    setPendingImageFile(null);
                                    setImagePreview(null);
                                    setFormData((f) => ({ ...f, imageUrl: e.target.value }));
                                 }}
                                 placeholder="https://... ou selecione um arquivo"
                                 className="h-10 rounded-xl text-xs"
                                 disabled={isSubmitting}
                              />
                              <label className="cursor-pointer">
                                 <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isSubmitting}
                                    onChange={(e) => {
                                       const file = e.target.files?.[0];
                                       if (!file) return;
                                       if (imagePreview) URL.revokeObjectURL(imagePreview);
                                       const url = URL.createObjectURL(file);
                                       setPendingImageFile(file);
                                       setImagePreview(url);
                                       e.target.value = "";
                                    }}
                                 />
                                 <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    className="h-10 rounded-xl px-3 shrink-0 gap-1.5 font-bold text-xs"
                                    asChild
                                 >
                                    <span>
                                       <UploadCloud className="size-3.5" />
                                       Selecionar
                                    </span>
                                 </Button>
                              </label>
                           </div>
                           {(imagePreview || formData.imageUrl) && (
                              <div className="relative mt-2 rounded-xl border border-border/50 overflow-hidden bg-secondary/20 h-28 flex items-center justify-center group">
                                 <img
                                    src={imagePreview || formData.imageUrl}
                                    alt="Preview"
                                    className="h-full w-full object-contain p-2"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => {
                                       if (imagePreview) URL.revokeObjectURL(imagePreview);
                                       setPendingImageFile(null);
                                       setImagePreview(null);
                                       setFormData((f) => ({ ...f, imageUrl: "" }));
                                    }}
                                    className="absolute top-2 right-2 size-6 rounded-full bg-background/80 hover:bg-destructive hover:text-white flex items-center justify-center text-muted-foreground transition-colors shadow-sm"
                                    title="Remover imagem"
                                 >
                                    <X className="size-3.5" />
                                 </button>
                              </div>
                           )}
                        </div>
                  </PlanFormFields>

                  <DialogFooter className="pt-6 gap-2">
                     <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="rounded-xl font-bold">
                        Cancelar
                     </Button>
                     <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-8 font-black gap-2">
                        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                        {isSubmitting ? (isUploadingImage ? "Enviando imagem..." : "Criando...") : "Criar Plano"}
                     </Button>
                  </DialogFooter>
               </form>
            </DialogContent>
         </Dialog>

         <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-3xl rounded-2xl! overflow-auto! no-scrollbar border-primary/20 shadow-2xl shadow-primary/10">
               <DialogHeader className="flex flex-row items-center justify-between space-y-0">
                  <DialogTitle className="text-xl font-black tracking-tight">Editar Oferta</DialogTitle>
               </DialogHeader>
               <form onSubmit={handleUpdatePlan} className="py-4">
                  <PlanFormFields idPrefix="edit-plan" value={editFormData} onChange={(updates) => setEditFormData(prev => ({ ...prev, ...updates }))}>
                        <div className="space-y-2 pt-2 border-t border-border/40">
                           <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                 Imagem do Plano
                              </Label>
                              {(editImagePreview || editFormData.imageUrl) && (
                                 <button
                                    type="button"
                                    onClick={() => {
                                       if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                       setEditPendingImageFile(null);
                                       setEditImagePreview(null);
                                       setEditFormData((f) => ({ ...f, imageUrl: "" }));
                                    }}
                                    className="text-[10px] truncate text-destructive hover:underline font-bold"
                                 >
                                    Remover imagem
                                 </button>
                              )}
                           </div>
                           <div className="flex gap-2">
                              <Input
                                 value={editPendingImageFile ? `[Arquivo selecionado] ${editPendingImageFile.name}` : editFormData.imageUrl}
                                 onChange={(e) => {
                                    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                    setEditPendingImageFile(null);
                                    setEditImagePreview(null);
                                    setEditFormData((f) => ({ ...f, imageUrl: e.target.value }));
                                 }}
                                 placeholder="https://... ou selecione um arquivo"
                                 className="h-10 rounded-xl text-xs"
                                 disabled={isSubmitting}
                              />
                              <label className="cursor-pointer">
                                 <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    disabled={isSubmitting}
                                    onChange={(e) => {
                                       const file = e.target.files?.[0];
                                       if (!file) return;
                                       if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                       const url = URL.createObjectURL(file);
                                       setEditPendingImageFile(file);
                                       setEditImagePreview(url);
                                       e.target.value = "";
                                    }}
                                 />
                                 <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isSubmitting}
                                    className="h-10 rounded-xl px-3 shrink-0 gap-1.5 font-bold text-xs"
                                    asChild
                                 >
                                    <span>
                                       <UploadCloud className="size-3.5" />
                                       Selecionar
                                    </span>
                                 </Button>
                              </label>
                           </div>
                           {(editImagePreview || editFormData.imageUrl) && (
                              <div className="relative mt-2 rounded-xl border border-border/50 overflow-hidden bg-secondary/20 h-28 flex items-center justify-center group">
                                 <img
                                    src={editImagePreview || editFormData.imageUrl}
                                    alt="Preview"
                                    className="h-full w-full object-contain p-2"
                                 />
                                 <button
                                    type="button"
                                    onClick={() => {
                                       if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                                       setEditPendingImageFile(null);
                                       setEditImagePreview(null);
                                       setEditFormData((f) => ({ ...f, imageUrl: "" }));
                                    }}
                                    className="absolute top-2 right-2 size-6 rounded-full bg-background/80 hover:bg-destructive hover:text-white flex items-center justify-center text-muted-foreground transition-colors shadow-sm"
                                    title="Remover imagem"
                                 >
                                    <X className="size-3.5" />
                                 </button>
                              </div>
                           )}
                        </div>
                  </PlanFormFields>

                  <DialogFooter className="pt-6 gap-2">
                     <div className="w-full flex justify-between">
                        <Button
                           variant="ghost"
                           type="button"
                           onClick={(e) => triggerDeleteConfirmation(e)}
                           disabled={isSubmitting || isDeleting}
                           className="rounded-xl hover:bg-rose-500/10 h-11! font-black hover:text-rose-600 transition-all cursor-pointer"
                        >
                           <Trash2 className="size-4" /> Deletar
                        </Button>

                        <div className="flex gap-2">
                           <Button type="submit" disabled={isSubmitting} className="rounded-xl h-11 px-8 font-black gap-2 cursor-pointer">
                              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                              {isSubmitting ? (isUploadingImage ? "Enviando imagem..." : "Salvando...") : "Salvar Alterações"}                           </Button>
                        </div>
                     </div>
                  </DialogFooter>
               </form>
            </DialogContent>
         </Dialog>

         <Dialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
            <DialogContent className="max-w-md rounded-2xl border-rose-500/20 shadow-2xl shadow-rose-500/5">
               <DialogHeader className="space-y-3">
                  <div className="mx-auto size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20">
                     <Trash2 className="size-6" />
                  </div>
                  <DialogTitle className="text-xl font-black tracking-tight text-center">Excluir Plano?</DialogTitle>
                  <p className="text-sm text-muted-foreground text-center">
                     Tem certeza que deseja excluir o plano <strong className="text-foreground">{selectedPlan?.name}</strong>? Esta ação é irreversível e removerá o produto do catálogo do AbacatePay.
                  </p>
               </DialogHeader>
               <DialogFooter className="pt-4 gap-2 sm:justify-center">
                  <Button
                     type="button"
                     variant="ghost"
                     onClick={() => setIsConfirmDeleteOpen(false)}
                     className="rounded-xl font-bold"
                  >
                     Cancelar
                  </Button>
                  <Button
                     type="button"
                     variant="destructive"
                     onClick={handleDeletePlan}
                     disabled={isDeleting}
                     className="rounded-xl h-11 px-8 font-black gap-2 bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 cursor-pointer"
                  >
                     {isDeleting && <Loader2 className="size-4 animate-spin" />}
                     Excluir Definitivamente
                  </Button>
               </DialogFooter>
            </DialogContent>
         </Dialog>

         <Dialog open={isWarningActiveTrainersOpen} onOpenChange={setIsWarningActiveTrainersOpen}>
            <DialogContent className="max-w-md rounded-2xl border-amber-500/20 shadow-2xl shadow-amber-500/5">
               <DialogHeader className="space-y-3">
                  <div className="mx-auto size-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                     <AlertTriangle className="size-6" />
                  </div>
                  <DialogTitle className="text-xl font-black tracking-tight text-center">Ação Bloqueada</DialogTitle>
                  <div className="text-sm text-muted-foreground text-center space-y-2">
                     <p>
                        Não é possível excluir o plano <strong className="text-foreground">{selectedPlan?.name}</strong> porque existem <strong>personal trainers ativos</strong> utilizando esta oferta no momento.
                     </p>
                     <p className="text-xs border border-amber-500/10 bg-amber-500/5 p-3 rounded-lg text-amber-700 dark:text-amber-500 font-medium">
                        ⚠️ Para excluir este plano com segurança, primeiro você precisa migrar os assinantes ativos para outra oferta no painel de controle.
                     </p>
                  </div>
               </DialogHeader>
               <DialogFooter className="pt-4 sm:justify-center">
                  <Button
                     type="button"
                     onClick={() => setIsWarningActiveTrainersOpen(false)}
                     className="rounded-xl h-11 px-8 font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer"
                  >
                     Entendido
                  </Button>
               </DialogFooter>
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
