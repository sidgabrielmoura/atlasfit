"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  Send,
  Plus,
  Trash2,
  Edit2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Activity,
  Target,
  Clock,
  Radio,
  Sparkles,
  Smartphone,
  Upload,
  X,
  Image as ImageIcon,
  Link2,
  CheckCircle2,
  Flame,
  UserX,
  Wifi,
  Battery,
  Split,
  ShieldCheck,
  Zap,
  User,
  AlertTriangle,
  Check,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { compressImage } from "@/lib/image-compress";
import { cn } from "@/lib/utils";

export interface PushNotificationItem {
  id: string;
  title: string;
  body: string;
  titleB?: string | null;
  bodyB?: string | null;
  imageUrl?: string | null;
  targetRole: "ALL" | "STUDENT" | "TRAINER";
  targetPlan?: "ALL" | "FREE_TRIAL" | "ACTIVE_SUBSCRIPTION";
  triggerType: "SCHEDULED" | "INACTIVITY" | "STREAK_SAVER" | "WORKOUT_COMPLETED" | "ASSESSMENT_DUE" | "BROADCAST";
  deepLink: string;
  category: string;
  scheduleTime?: string | null;
  daysOfWeek?: string | null;
  inactivityDays?: number | null;
  isActive: boolean;
  priority: string;
  sentCount: number;
  sentCountB?: number;
  deliveredCount: number;
  clickCount: number;
  clickCountB?: number;
  conversionCount: number;
  conversionCountB?: number;
  createdAt: string;
  creator?: {
    name: string | null;
    email: string | null;
  } | null;
}

export interface PushMetricsData {
  totalSent: number;
  totalDelivered: number;
  totalClicked: number;
  totalConverted: number;
  deliveryRate: number;
  ctr: number;
  conversionRate: number;
  activeAutomations: number;
  chartTimeline: Array<{
    date: string;
    sent: number;
    clicked: number;
    converted: number;
    ctr: number;
  }>;
  triggerDistribution: Array<{
    trigger: string;
    name: string;
    count: number;
    percentage: number;
  }>;
}

const TEMPLATE_PRESETS = [
  {
    id: "streak",
    name: "Ofensiva: Não quebre sua sequência",
    title: "Não quebre sua ofensiva de {streak_dias} dias!",
    body: "{primeiro_nome}, seu treino de hoje ainda te espera. Mantenha sua constância!",
    titleB: "🔥 Sua sequência de {streak_dias} dias está em risco!",
    bodyB: "Falta pouco para o dia acabar. Faça seu treino de hoje agora mesmo!",
    triggerType: "STREAK_SAVER" as const,
    deepLink: "/student/workouts",
    category: "TRAINING"
  },
  {
    id: "daily",
    name: "Lembrete diário de treino (18:00)",
    title: "Hora do treino, {primeiro_nome}!",
    body: "Seu plano de treino está pronto no app. Vamos fechar a meta de hoje?",
    titleB: "Sua meta de hoje te espera, {primeiro_nome} 🎯",
    bodyB: "O personal preparou seu treino. 30 minutos de dedicação hoje!",
    triggerType: "SCHEDULED" as const,
    scheduleTime: "18:00",
    daysOfWeek: "1,2,3,4,5",
    deepLink: "/student/workouts",
    category: "TRAINING"
  },
  {
    id: "inactivity",
    name: "Inatividade: Aluno há 3 dias sem treinar",
    title: "Sentimos sua falta, {primeiro_nome}!",
    body: "Faz {dias_inativo} dias desde o seu último treino. Reserve 20 minutos hoje.",
    titleB: "Vamos retomar o foco, {primeiro_nome}?",
    bodyB: "Uma pequena pausa faz parte, mas voltar ao ritmo é o que gera resultados!",
    triggerType: "INACTIVITY" as const,
    inactivityDays: 3,
    deepLink: "/student/workouts",
    category: "TRAINING"
  },
  {
    id: "trainer",
    name: "Aviso de treinos para o Personal",
    title: "Novos treinos concluídos na sua assessoria",
    body: "Seus alunos completaram as rotinas de hoje. Acesse para acompanhar a evolução.",
    triggerType: "SCHEDULED" as const,
    targetRole: "TRAINER" as const,
    scheduleTime: "19:00",
    daysOfWeek: "1,2,3,4,5",
    deepLink: "/personal/dashboard",
    category: "SYSTEM"
  }
];

const TRIGGER_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  SCHEDULED: {
    label: "Horário Agendado (Diário - Fuso Brasília)",
    desc: "Dispara nos dias e horário configurados (Horário de Brasília). Cancela automaticamente se o aluno já treinou hoje."
  },
  STREAK_SAVER: {
    label: "Ofensiva & Sequência (Duolingo Style)",
    desc: "Alerta no final da tarde alunos que possuem sequência de 2+ dias consecutivos ativa e ainda não treinaram hoje."
  },
  INACTIVITY: {
    label: "Prevenção de Inatividade",
    desc: "Alerta alunos que não registram nenhum treino concluído há X dias (evita abandono e cancelamento)."
  },
  WORKOUT_COMPLETED: {
    label: "Treino Concluído",
    desc: "Disparado imediatamente após a conclusão de uma sessão de treino pelo aluno."
  },
  BROADCAST: {
    label: "Disparo Manual / Imediato",
    desc: "Mensagem avulsa para comunicados, ofertas, novidades e eventos pontuais."
  }
};

const PREDEFINED_DESTINATIONS = [
  { label: "Treinos do Aluno", value: "/student/workouts" },
  { label: "Evolução e Cargas", value: "/student/evolution" },
  { label: "Chat com Personal", value: "/student/chat" },
  { label: "Avaliação Física", value: "/student/assessments" },
  { label: "Dashboard do Personal", value: "/personal/dashboard" },
  { label: "Outro (Destino Personalizado)", value: "CUSTOM" },
];

export const DAYS_MAP = [
  { id: 0, label: "Dom", full: "Domingo" },
  { id: 1, label: "Seg", full: "Segunda" },
  { id: 2, label: "Ter", full: "Terça" },
  { id: 3, label: "Qua", full: "Quarta" },
  { id: 4, label: "Qui", full: "Quinta" },
  { id: 5, label: "Sex", full: "Sexta" },
  { id: 6, label: "Sáb", full: "Sábado" },
];

export function formatDaysOfWeek(daysString?: string | null): string {
  if (!daysString) return "Todos os dias";
  const days = daysString
    .split(",")
    .map((d) => parseInt(d.trim()))
    .filter((d) => !isNaN(d))
    .sort((a, b) => a - b);

  if (days.length === 7) return "Todos os dias";
  if (days.length === 5 && days.every((d, i) => d === i + 1)) return "Seg a Sex";
  if (days.length === 2 && days.includes(0) && days.includes(6)) return "Fim de semana";
  if (days.length === 0) return "Nenhum dia";
  return days.map((d) => DAYS_MAP.find((item) => item.id === d)?.label || String(d)).join(", ");
}

export function PushNotificationsStudio() {
  const [notifications, setNotifications] = useState<PushNotificationItem[]>([]);
  const [metrics, setMetrics] = useState<PushMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<PushNotificationItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    body: "",
    titleB: "",
    bodyB: "",
    enableAbTest: false,
    imageUrl: "",
    targetRole: "ALL" as "ALL" | "STUDENT" | "TRAINER",
    targetPlan: "ALL" as "ALL" | "FREE_TRIAL" | "ACTIVE_SUBSCRIPTION",
    triggerType: "SCHEDULED" as PushNotificationItem["triggerType"],
    destinationType: "/student/workouts",
    customDeepLink: "",
    category: "TRAINING",
    scheduleTime: "18:00",
    daysOfWeek: "1,2,3,4,5",
    inactivityDays: 3,
    isActive: true,
    priority: "HIGH",
  });

  // Preview Switcher
  const [previewVariant, setPreviewVariant] = useState<"A" | "B">("A");

  // Image Upload State
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action Dialogs
  const [itemToDelete, setItemToDelete] = useState<PushNotificationItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [itemToBroadcast, setItemToBroadcast] = useState<PushNotificationItem | null>(null);
  const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Test Push Modal State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [itemToTest, setItemToTest] = useState<PushNotificationItem | null>(null);
  const [testVariant, setTestVariant] = useState<"A" | "B">("A");
  const [testUsersList, setTestUsersList] = useState<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    activeDevicesCount: number;
  }>>([]);
  const [testSearchQuery, setTestSearchQuery] = useState("");
  const [selectedTestUser, setSelectedTestUser] = useState<{
    id: string;
    name: string;
    email: string;
    role: string;
    image?: string | null;
    activeDevicesCount: number;
  } | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    pushSent: boolean;
    devicesCount: number;
    inAppDelivered: boolean;
    message: string;
  } | null>(null);

  // Custom standalone test fields (when itemToTest is null)
  const [customTestTitle, setCustomTestTitle] = useState("Lembrete de Treino");
  const [customTestBody, setCustomTestBody] = useState("Fala {primeiro_nome}! Seu treino de hoje já está pronto no app.");
  const [customTestDeepLink, setCustomTestDeepLink] = useState("/student/workouts");

  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedTrigger !== "all") params.append("trigger", selectedTrigger);
      if (selectedStatus !== "all") params.append("status", selectedStatus);

      const res = await fetch(`/api/superadmin/engage/push?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setMetrics(data.metrics || null);
      } else {
        toast.error("Erro ao carregar notificações.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Falha ao comunicar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedTrigger, selectedStatus]);

  const handleOpenCreateModal = (presetId?: string) => {
    setPendingImageFile(null);
    setImagePreviewUrl("");
    setPreviewVariant("A");
    const preset = TEMPLATE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setFormData({
        title: preset.title,
        body: preset.body,
        titleB: preset.titleB || "",
        bodyB: preset.bodyB || "",
        enableAbTest: Boolean(preset.titleB),
        imageUrl: "",
        targetRole: (preset as any).targetRole || "ALL",
        targetPlan: "ALL",
        triggerType: preset.triggerType,
        destinationType: preset.deepLink,
        customDeepLink: "",
        category: preset.category,
        scheduleTime: (preset as any).scheduleTime || "18:00",
        daysOfWeek: (preset as any).daysOfWeek || "1,2,3,4,5",
        inactivityDays: (preset as any).inactivityDays || 3,
        isActive: true,
        priority: "HIGH",
      });
    } else {
      setFormData({
        title: "",
        body: "",
        titleB: "",
        bodyB: "",
        enableAbTest: false,
        imageUrl: "",
        targetRole: "ALL",
        targetPlan: "ALL",
        triggerType: "SCHEDULED",
        destinationType: "/student/workouts",
        customDeepLink: "",
        category: "TRAINING",
        scheduleTime: "18:00",
        daysOfWeek: "1,2,3,4,5",
        inactivityDays: 3,
        isActive: true,
        priority: "HIGH",
      });
    }
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: PushNotificationItem) => {
    const isPredefined = PREDEFINED_DESTINATIONS.some(
      (d) => d.value === item.deepLink && d.value !== "CUSTOM"
    );

    setPendingImageFile(null);
    setImagePreviewUrl(item.imageUrl || "");
    setPreviewVariant("A");
    setEditingItem(item);
    setFormData({
      title: item.title,
      body: item.body,
      titleB: item.titleB || "",
      bodyB: item.bodyB || "",
      enableAbTest: Boolean(item.titleB?.trim()),
      imageUrl: item.imageUrl || "",
      targetRole: item.targetRole,
      targetPlan: (item.targetPlan as any) || "ALL",
      triggerType: item.triggerType,
      destinationType: isPredefined ? item.deepLink : "CUSTOM",
      customDeepLink: isPredefined ? "" : item.deepLink,
      category: item.category,
      scheduleTime: item.scheduleTime || "18:00",
      daysOfWeek: item.daysOfWeek || "1,2,3,4,5",
      inactivityDays: item.inactivityDays || 3,
      isActive: item.isActive,
      priority: item.priority,
    });
    setIsModalOpen(true);
  };

  const handleInsertTagToTitle = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      title: prev.title ? `${prev.title} ${tag}` : tag,
    }));
  };

  const handleInsertTagToBody = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      body: prev.body ? `${prev.body} ${tag}` : tag,
    }));
  };

  const handleInsertTagToTitleB = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      titleB: prev.titleB ? `${prev.titleB} ${tag}` : tag,
    }));
  };

  const handleInsertTagToBodyB = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      bodyB: prev.bodyB ? `${prev.bodyB} ${tag}` : tag,
    }));
  };

  const handleToggleDayOfWeek = (dayId: number) => {
    const currentDays = formData.daysOfWeek
      ? formData.daysOfWeek
        .split(",")
        .map((d) => parseInt(d.trim()))
        .filter((d) => !isNaN(d))
      : [1, 2, 3, 4, 5];

    let updated: number[];
    if (currentDays.includes(dayId)) {
      if (currentDays.length <= 1) {
        toast.error("Selecione pelo menos um dia da semana.");
        return;
      }
      updated = currentDays.filter((d) => d !== dayId);
    } else {
      updated = [...currentDays, dayId];
    }

    updated.sort((a, b) => a - b);
    setFormData((prev) => ({ ...prev, daysOfWeek: updated.join(",") }));
  };

  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingImageFile(file);
    const localUrl = URL.createObjectURL(file);
    setImagePreviewUrl(localUrl);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = () => {
    setPendingImageFile(null);
    setImagePreviewUrl("");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFinalDeepLink = () => {
    if (formData.destinationType === "CUSTOM") {
      return formData.customDeepLink.trim() || "/student/workouts";
    }
    return formData.destinationType;
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error("Preencha o título e a mensagem da notificação.");
      return;
    }

    if (formData.enableAbTest && (!formData.titleB.trim() || !formData.bodyB.trim())) {
      toast.error("Preencha o título e mensagem da Variação B ou desative o Teste A/B.");
      return;
    }

    const deepLink = getFinalDeepLink();

    try {
      setIsSubmitting(true);

      let finalImageUrl = formData.imageUrl || "";

      // Só sobe a imagem para o R2 agora, no momento de salvar a notificação
      if (pendingImageFile) {
        setUploadingImage(true);
        const compressed = await compressImage(pendingImageFile);

        const presignedRes = await fetch("/api/storage/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: compressed.name || pendingImageFile.name,
            contentType: compressed.type || pendingImageFile.type,
            fileSize: compressed.size || pendingImageFile.size,
            targetType: "campaign_banner",
          }),
        });

        if (!presignedRes.ok) {
          throw new Error("Erro ao gerar URL de upload para a imagem.");
        }

        const { uploadUrl, fileUrl } = await presignedRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": compressed.type || pendingImageFile.type },
          body: compressed,
        });

        if (!putRes.ok) {
          throw new Error("Erro ao enviar a imagem para o storage.");
        }

        finalImageUrl = fileUrl;
        setUploadingImage(false);
      }

      const url = editingItem
        ? `/api/superadmin/engage/push/${editingItem.id}`
        : "/api/superadmin/engage/push";
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          titleB: formData.enableAbTest ? formData.titleB : null,
          bodyB: formData.enableAbTest ? formData.bodyB : null,
          imageUrl: finalImageUrl || null,
          deepLink,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Falha ao salvar notificação.");
      }

      toast.success(editingItem ? "Notificação atualizada com sucesso." : "Notificação criada com sucesso.");
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar requisição.");
    } finally {
      setIsSubmitting(false);
      setUploadingImage(false);
    }
  };

  const handleToggleActive = async (item: PushNotificationItem) => {
    try {
      const res = await fetch(`/api/superadmin/engage/push/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });

      if (res.ok) {
        toast.success(item.isActive ? "Automação pausada." : "Automação ativada.");
        fetchData();
      } else {
        toast.error("Erro ao alterar status da notificação.");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/superadmin/engage/push/${itemToDelete.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Notificação excluída com sucesso.");
        setIsDeleteDialogOpen(false);
        setItemToDelete(null);
        fetchData();
      } else {
        toast.error("Falha ao excluir notificação.");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchUsers = async (query = "") => {
    try {
      setIsSearchingUsers(true);
      const res = await fetch(`/api/superadmin/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setTestUsersList(data);
        if (data.length > 0 && !selectedTestUser) {
          setSelectedTestUser(data[0]);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar usuários para teste:", err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleOpenTestModal = (item?: PushNotificationItem | null) => {
    setItemToTest(item || null);
    setTestVariant("A");
    setTestResult(null);
    setTestSearchQuery("");
    setIsTestModalOpen(true);
    handleSearchUsers("");
  };

  const handleExecuteTestPush = async () => {
    if (!selectedTestUser) {
      toast.error("Selecione um usuário para receber a notificação de teste.");
      return;
    }

    try {
      setIsSendingTest(true);
      setTestResult(null);

      let url = "/api/superadmin/engage/push/test";
      let payload: any = {
        targetUserId: selectedTestUser.id,
        variant: testVariant,
      };

      if (itemToTest && itemToTest.id !== "form-preview") {
        url = `/api/superadmin/engage/push/${itemToTest.id}/test`;
        payload = {
          targetUserId: selectedTestUser.id,
          variant: testVariant,
        };
      } else if (itemToTest && itemToTest.id === "form-preview") {
        url = "/api/superadmin/engage/push/test";
        payload = {
          targetUserId: selectedTestUser.id,
          title: testVariant === "B" && itemToTest.titleB ? itemToTest.titleB : itemToTest.title,
          body: testVariant === "B" && itemToTest.bodyB ? itemToTest.bodyB : itemToTest.body,
          imageUrl: itemToTest.imageUrl || null,
          deepLink: itemToTest.deepLink || "/student/workouts",
          category: itemToTest.category || "TRAINING",
          priority: itemToTest.priority || "HIGH",
          variant: testVariant,
        };
      } else {
        url = "/api/superadmin/engage/push/test";
        payload = {
          targetUserId: selectedTestUser.id,
          title: customTestTitle,
          body: customTestBody,
          deepLink: customTestDeepLink,
          category: "TRAINING",
          priority: "HIGH",
          variant: "A",
        };
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Falha ao emitir notificação de teste.");
      }

      const data = await res.json();
      setTestResult({
        pushSent: data.pushSent,
        devicesCount: data.devicesCount,
        inAppDelivered: data.inAppDelivered,
        message: data.message,
      });

      toast.success(data.message || `Notificação de teste enviada para ${selectedTestUser.name}!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao emitir teste.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!itemToBroadcast) return;

    try {
      setIsBroadcasting(true);
      const res = await fetch(`/api/superadmin/engage/push/${itemToBroadcast.id}/broadcast`, {
        method: "POST",
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(data.message || "Disparo em massa iniciado com sucesso!");
        setIsBroadcastDialogOpen(false);
        setItemToBroadcast(null);
        fetchData();
      } else {
        const errText = await res.text();
        toast.error(errText || "Falha ao realizar disparo em massa.");
      }
    } catch {
      toast.error("Erro ao acionar broadcast.");
    } finally {
      setIsBroadcasting(false);
    }
  };

  const handleTriggerCronManual = async () => {
    try {
      setCronRunning(true);
      const res = await fetch("/api/cron/engage-push?force=true", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        toast.success(
          `Ciclo concluído: ${data.dispatchedCount} pushes disparados, ${data.skippedCount} ignorados por smart-abort.`
        );
        fetchData();
      } else {
        const errText = await res.text();
        toast.error(errText || "Falha na execução do cronjob.");
      }
    } catch {
      toast.error("Erro ao acionar o cronjob.");
    } finally {
      setCronRunning(false);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    const term = search.toLowerCase();
    return (
      n.title.toLowerCase().includes(term) ||
      n.body.toLowerCase().includes(term) ||
      (n.titleB && n.titleB.toLowerCase().includes(term))
    );
  });

  const getTriggerBadge = (type: PushNotificationItem["triggerType"]) => {
    switch (type) {
      case "STREAK_SAVER":
        return <Badge variant="secondary" className="text-[11px] font-semibold">Ofensiva</Badge>;
      case "SCHEDULED":
        return <Badge variant="secondary" className="text-[11px] font-semibold">Agendado</Badge>;
      case "INACTIVITY":
        return <Badge variant="secondary" className="text-[11px] font-semibold">Inatividade</Badge>;
      case "WORKOUT_COMPLETED":
        return <Badge variant="secondary" className="text-[11px] font-semibold">Treino Concluído</Badge>;
      case "BROADCAST":
        return <Badge variant="secondary" className="text-[11px] font-semibold">Broadcast</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px]">{type}</Badge>;
    }
  };

  // Dynamic tags used for preview interpolation
  const activeTitle = previewVariant === "B" && formData.titleB ? formData.titleB : formData.title;
  const activeBody = previewVariant === "B" && formData.bodyB ? formData.bodyB : formData.body;

  const interpolatedPreviewTitle = activeTitle
    ? activeTitle
      .replace(/{primeiro_nome}/gi, "Gabriel")
      .replace(/{nome_usuario}/gi, "Gabriel Moura")
      .replace(/{nome}/gi, "Gabriel")
      .replace(/{streak_dias}/gi, "5")
      .replace(/{dias_inativo}/gi, String(formData.inactivityDays || 3))
      .replace(/{nome_personal}/gi, "Lucas Personal")
    : "Hora do treino, Gabriel!";

  const interpolatedPreviewBody = activeBody
    ? activeBody
      .replace(/{primeiro_nome}/gi, "Gabriel")
      .replace(/{nome_usuario}/gi, "Gabriel Moura")
      .replace(/{nome}/gi, "Gabriel")
      .replace(/{streak_dias}/gi, "5")
      .replace(/{dias_inativo}/gi, String(formData.inactivityDays || 3))
      .replace(/{nome_personal}/gi, "Lucas Personal")
    : "Seu plano do dia está pronto no app. Vamos fechar a meta de hoje?";

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerCronManual}
            disabled={cronRunning}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", cronRunning && "animate-spin text-primary")} />
            {cronRunning ? "Executando..." : "Rodar Cronjob"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenTestModal(null)}
            className="h-9 rounded-xl text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Send className="size-3.5" />
            Emitir Teste
          </Button>

          <Button
            size="sm"
            onClick={() => handleOpenCreateModal()}
            className="h-9 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-xs cursor-pointer"
          >
            <Plus className="size-4" /> Nova Notificação
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border border-border/80 bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Disparos Totais</p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                {loading ? <Skeleton className="h-7 w-16" /> : (metrics?.totalSent.toLocaleString() || "0")}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics?.deliveryRate || 100}% entregues
              </p>
            </div>
            <div className="size-10 rounded-xl bg-secondary/80 flex items-center justify-center text-primary">
              <Send className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">CTR Médio (Cliques)</p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                {loading ? <Skeleton className="h-7 w-16" /> : `${metrics?.ctr || 0}%`}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics?.totalClicked.toLocaleString() || 0} aberturas
              </p>
            </div>
            <div className="size-10 rounded-xl bg-secondary/80 flex items-center justify-center text-primary">
              <Activity className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Conversão em Treinos</p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                {loading ? <Skeleton className="h-7 w-16" /> : `${metrics?.conversionRate || 0}%`}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {metrics?.totalConverted.toLocaleString() || 0} treinos pós-push
              </p>
            </div>
            <div className="size-10 rounded-xl bg-secondary/80 flex items-center justify-center text-primary">
              <Target className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/80 bg-card shadow-xs rounded-2xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Automações Ativas</p>
              <h3 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5">
                {loading ? <Skeleton className="h-7 w-16" /> : (metrics?.activeAutomations || 0)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Gatilhos inteligentes
              </p>
            </div>
            <div className="size-10 rounded-xl bg-secondary/80 flex items-center justify-center text-primary">
              <Bell className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Engagement Timeline Chart */}
        <Card className="lg:col-span-8 border border-border/80 p-0 bg-card shadow-xs rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold tracking-tight">Desempenho de Disparos e Cliques</h4>
                <p className="text-xs text-muted-foreground">Histórico dos últimos 14 dias</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-primary" /> Disparos
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-2 rounded-full bg-emerald-500" /> Cliques
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              {loading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : metrics?.chartTimeline && metrics.chartTimeline.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.chartTimeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorClicked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.4} />
                    <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      }}
                    />
                    <Area type="monotone" dataKey="sent" name="Disparos" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorSent)" />
                    <Area type="monotone" dataKey="clicked" name="Cliques" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorClicked)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                  Sem dados suficientes de disparos no período.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Trigger Distribution */}
        <Card className="lg:col-span-4 border border-border/80 bg-card shadow-xs rounded-2xl">
          <CardContent className="p-5 flex flex-col justify-between h-full">
            <div>
              <h4 className="text-sm font-bold tracking-tight">Distribuição por Gatilho</h4>
              <p className="text-xs text-muted-foreground mb-4">Volume por tipo de automação</p>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ) : metrics?.triggerDistribution && metrics.triggerDistribution.length > 0 ? (
                <div className="space-y-3">
                  {metrics.triggerDistribution.map((item) => (
                    <div key={item.trigger} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-foreground">{item.name}</span>
                        <span className="text-muted-foreground font-mono">{item.percentage}% ({item.count})</span>
                      </div>
                      <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-8 text-center">
                  Nenhum envio registrado até o momento.
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Proteção Anti-Spam: <strong>2 pushes / 24h</strong></span>
              <span>Silêncio: <strong>22h às 07h</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 4. Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs rounded-xl border-border/80 bg-card"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedTrigger} onValueChange={setSelectedTrigger}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-full sm:w-44 border-border/80 bg-card">
              <SelectValue placeholder="Todos os Gatilhos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os Gatilhos</SelectItem>
              <SelectItem value="SCHEDULED" className="text-xs">Agendado</SelectItem>
              <SelectItem value="STREAK_SAVER" className="text-xs">Ofensiva</SelectItem>
              <SelectItem value="INACTIVITY" className="text-xs">Inatividade</SelectItem>
              <SelectItem value="WORKOUT_COMPLETED" className="text-xs">Treino Concluído</SelectItem>
              <SelectItem value="BROADCAST" className="text-xs">Broadcast</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-9 text-xs rounded-xl w-full sm:w-32 border-border/80 bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos</SelectItem>
              <SelectItem value="active" className="text-xs">Ativos</SelectItem>
              <SelectItem value="inactive" className="text-xs">Pausados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. Notification Items List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))
        ) : filteredNotifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-card/50">
            <Bell className="size-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold">Nenhuma notificação encontrada</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Crie uma nova notificação push ou ajuste os filtros aplicados.
            </p>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const hasVariantB = Boolean(item.titleB);
            const totalSentBoth = item.sentCount + (item.sentCountB || 0);
            const totalClicksBoth = item.clickCount + (item.clickCountB || 0);
            const ctrCalculated = totalSentBoth > 0
              ? parseFloat(((totalClicksBoth / totalSentBoth) * 100).toFixed(1))
              : 0;

            const planBadge = item.targetPlan === "FREE_TRIAL"
              ? "Apenas Testes"
              : item.targetPlan === "ACTIVE_SUBSCRIPTION"
                ? "Apenas Assinantes"
                : null;

            return (
              <Card
                key={item.id}
                className={cn(
                  "border border-border/80 p-0 bg-card shadow-xs rounded-2xl transition-all duration-200 hover:border-border",
                  !item.isActive && "opacity-60 bg-muted/20"
                )}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      {getTriggerBadge(item.triggerType)}
                      <Badge variant="outline" className="text-[10px] font-normal">
                        {item.targetRole === "ALL" ? "Todos os Perfis" : item.targetRole === "STUDENT" ? "Alunos" : "Personais"}
                      </Badge>
                      {planBadge && (
                        <Badge variant="outline" className="text-[10px] font-normal bg-secondary/50 text-foreground">
                          {planBadge}
                        </Badge>
                      )}
                      {hasVariantB && (
                        <Badge variant="outline" className="text-[10px] font-bold border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1">
                          <Split className="size-2.5" /> A/B Ativo
                        </Badge>
                      )}
                      {item.scheduleTime && (
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" /> {item.scheduleTime} ({formatDaysOfWeek(item.daysOfWeek)})
                        </span>
                      )}
                      {item.inactivityDays && (
                        <span className="text-[11px] text-muted-foreground">
                          Após {item.inactivityDays} dias sem treino
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-bold tracking-tight text-foreground">{item.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.body}</p>
                      {hasVariantB && (
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 line-clamp-1 mt-0.5 italic">
                          <span className="font-semibold not-italic">Var B:</span> {item.titleB} — {item.bodyB}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground pt-1">
                      <span>Destino: <strong className="text-foreground font-mono text-[10px]">{item.deepLink}</strong></span>
                      {item.imageUrl && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <ImageIcon className="size-3" /> Imagem Anexada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right metrics & actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                    {/* Compact Metrics */}
                    <div className="text-right">
                      <p className="text-xs font-bold text-foreground">
                        {totalSentBoth.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">envios</span>
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        {ctrCalculated}% <span className="text-[10px] font-normal text-muted-foreground">CTR</span>
                      </p>
                      {hasVariantB && (
                        <p className="text-[9px] text-muted-foreground font-mono">
                          A: {item.clickCount} | B: {item.clickCountB || 0}
                        </p>
                      )}
                    </div>

                    {/* Switch & Menu */}
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={item.isActive}
                        onCheckedChange={() => handleToggleActive(item)}
                      />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="size-8 p-0 rounded-lg cursor-pointer">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => handleOpenTestModal(item)}
                            className="text-xs cursor-pointer gap-2"
                          >
                            <Send className="size-3.5 text-primary" /> Emitir Teste a Usuário...
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setItemToBroadcast(item);
                              setIsBroadcastDialogOpen(true);
                            }}
                            className="text-xs cursor-pointer gap-2"
                          >
                            <Send className="size-3.5 text-primary" /> Disparar Agora
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOpenEditModal(item)}
                            className="text-xs cursor-pointer gap-2"
                          >
                            <Edit2 className="size-3.5" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setItemToDelete(item);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-xs cursor-pointer text-destructive focus:text-destructive gap-2"
                          >
                            <Trash2 className="size-3.5" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 6. Modal de Criação / Edição */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent showCloseButton={false} className="max-w-4xl! p-0 overflow-hidden gap-0! bg-card border-border rounded-2xl! shadow-2xl! max-h-[92vh]! flex flex-col">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/50 bg-secondary/10 shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="text-base font-bold tracking-tight">
              {editingItem ? "Editar Notificação" : "Nova Notificação Push"}
            </DialogTitle>
            {!editingItem && (
              <Select onValueChange={(val) => handleOpenCreateModal(val)}>
                <SelectTrigger className="h-8 text-xs rounded-xl w-48 bg-card">
                  <SelectValue placeholder="Usar Modelo Pronto..." />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_PRESETS.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Column */}
            <form onSubmit={handleSubmitForm} className="lg:col-span-7 space-y-4">
              {/* Título com botões de tag */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Título da Notificação {formData.enableAbTest && "(Variação A)"}
                  </Label>
                  <span className="text-[10px] text-muted-foreground">{formData.title.length}/100</span>
                </div>
                <Input
                  placeholder="Ex: Hora do treino, {primeiro_nome}!"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl text-xs! h-9"
                  maxLength={100}
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Tags:</span>
                  {[
                    { label: "Nome", tag: "{primeiro_nome}" },
                    { label: "Streak", tag: "{streak_dias}" },
                    { label: "Inatividade", tag: "{dias_inativo}" },
                    { label: "Personal", tag: "{nome_personal}" },
                  ].map((chip) => (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() => handleInsertTagToTitle(chip.tag)}
                      className="px-2 py-0.5 rounded-md bg-secondary text-foreground hover:bg-muted border border-border text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      +{chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mensagem com botões de tag */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Mensagem da Notificação {formData.enableAbTest && "(Variação A)"}
                  </Label>
                  <span className="text-[10px] text-muted-foreground">{formData.body.length}/200</span>
                </div>
                <Textarea
                  placeholder="Ex: Seu plano do dia já está pronto no app. Vamos fechar a meta de hoje?"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="rounded-xl text-xs! resize-none"
                  rows={3}
                  maxLength={200}
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[10px] text-muted-foreground font-medium">Tags:</span>
                  {[
                    { label: "Nome", tag: "{primeiro_nome}" },
                    { label: "Streak", tag: "{streak_dias}" },
                    { label: "Inatividade", tag: "{dias_inativo}" },
                    { label: "Personal", tag: "{nome_personal}" },
                  ].map((chip) => (
                    <button
                      key={chip.tag}
                      type="button"
                      onClick={() => handleInsertTagToBody(chip.tag)}
                      className="px-2 py-0.5 rounded-md bg-secondary text-foreground hover:bg-muted border border-border text-[10px] font-medium transition-colors cursor-pointer"
                    >
                      +{chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Teste A/B */}
              <div className="rounded-xl border border-border/80 bg-secondary/15 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Split className="size-3.5 text-amber-500" /> Teste A/B de Mensagem
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Alterna 50/50 entre duas variações para descobrir qual gera mais cliques e treinos.
                    </p>
                  </div>
                  <Switch
                    checked={formData.enableAbTest}
                    onCheckedChange={(checked) => setFormData({ ...formData, enableAbTest: checked })}
                  />
                </div>

                {formData.enableAbTest && (
                  <div className="space-y-3 pt-2 border-t border-border/50 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                          Título (Variação B)
                        </Label>
                        <span className="text-[10px] text-muted-foreground">{formData.titleB.length}/100</span>
                      </div>
                      <Input
                        placeholder="Ex: 🔥 Sua sequência está em risco!"
                        value={formData.titleB}
                        onChange={(e) => setFormData({ ...formData, titleB: e.target.value })}
                        className="rounded-xl text-xs! h-9 border-amber-500/30"
                        maxLength={100}
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Tags:</span>
                        {[
                          { label: "Nome", tag: "{primeiro_nome}" },
                          { label: "Streak", tag: "{streak_dias}" },
                          { label: "Inatividade", tag: "{dias_inativo}" },
                          { label: "Personal", tag: "{nome_personal}" },
                        ].map((chip) => (
                          <button
                            key={chip.tag}
                            type="button"
                            onClick={() => handleInsertTagToTitleB(chip.tag)}
                            className="px-2 py-0.5 rounded-md bg-secondary text-foreground hover:bg-muted border border-border text-[10px] font-medium transition-colors cursor-pointer"
                          >
                            +{chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                          Mensagem (Variação B)
                        </Label>
                        <span className="text-[10px] text-muted-foreground">{formData.bodyB.length}/200</span>
                      </div>
                      <Textarea
                        placeholder="Ex: Falta pouco para fechar a meta de hoje. Não deixe para depois!"
                        value={formData.bodyB}
                        onChange={(e) => setFormData({ ...formData, bodyB: e.target.value })}
                        className="rounded-xl text-xs! resize-none border-amber-500/30"
                        rows={2}
                        maxLength={200}
                      />
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-muted-foreground font-medium">Tags:</span>
                        {[
                          { label: "Nome", tag: "{primeiro_nome}" },
                          { label: "Streak", tag: "{streak_dias}" },
                          { label: "Inatividade", tag: "{dias_inativo}" },
                          { label: "Personal", tag: "{nome_personal}" },
                        ].map((chip) => (
                          <button
                            key={chip.tag}
                            type="button"
                            onClick={() => handleInsertTagToBodyB(chip.tag)}
                            className="px-2 py-0.5 rounded-md bg-secondary text-foreground hover:bg-muted border border-border text-[10px] font-medium transition-colors cursor-pointer"
                          >
                            +{chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Campo para subir imagem na notificação (Rich Push) */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Imagem Opcional (Rich Push)
                </Label>

                {(imagePreviewUrl || formData.imageUrl) ? (
                  <div className="relative rounded-xl border border-border bg-secondary/30 p-2 flex items-center gap-3">
                    <img
                      src={imagePreviewUrl || formData.imageUrl}
                      alt="Banner Preview"
                      className="size-12 rounded-lg object-cover border border-border"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-medium truncate text-foreground">
                        {pendingImageFile ? pendingImageFile.name : "Imagem anexada"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {pendingImageFile ? `${(pendingImageFile.size / 1024).toFixed(0)} KB (será enviada ao salvar)` : formData.imageUrl}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveImage}
                      className="size-8 p-0 rounded-lg text-muted-foreground hover:text-destructive cursor-pointer"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileSelect}
                      className="hidden"
                      id="push-image-upload"
                    />
                    <label
                      htmlFor="push-image-upload"
                      className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-border/80 hover:border-primary/50 bg-secondary/15 hover:bg-secondary/30 transition-colors cursor-pointer text-xs text-muted-foreground"
                    >
                      <Upload className="size-4 text-primary" />
                      <span>Clique para anexar imagem da notificação (JPG, PNG ou WebP)</span>
                    </label>
                  </div>
                )}
              </div>

              {/* Gatilho e Público */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gatilho de Disparo</Label>
                  <Select
                    value={formData.triggerType}
                    onValueChange={(val: any) => setFormData({ ...formData, triggerType: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SCHEDULED" className="text-xs">Horário Agendado</SelectItem>
                      <SelectItem value="STREAK_SAVER" className="text-xs">Ofensiva & Sequência</SelectItem>
                      <SelectItem value="INACTIVITY" className="text-xs">Prevenção de Inatividade</SelectItem>
                      <SelectItem value="WORKOUT_COMPLETED" className="text-xs">Treino Concluído</SelectItem>
                      <SelectItem value="BROADCAST" className="text-xs">Broadcast (Avulso)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Perfil Alvo</Label>
                  <Select
                    value={formData.targetRole}
                    onValueChange={(val: any) => setFormData({ ...formData, targetRole: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">Todos os Usuários</SelectItem>
                      <SelectItem value="STUDENT" className="text-xs">Apenas Alunos</SelectItem>
                      <SelectItem value="TRAINER" className="text-xs">Apenas Personais</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Segmento de Plano</Label>
                  <Select
                    value={formData.targetPlan}
                    onValueChange={(val: any) => setFormData({ ...formData, targetPlan: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL" className="text-xs">Todos os Planos</SelectItem>
                      <SelectItem value="FREE_TRIAL" className="text-xs">Em Período de Testes</SelectItem>
                      <SelectItem value="ACTIVE_SUBSCRIPTION" className="text-xs">Assinantes Ativos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Caixa explicativa do gatilho selecionado */}
              {TRIGGER_DESCRIPTIONS[formData.triggerType] && (
                <div className="rounded-xl bg-secondary/25 border border-border/70 p-3 text-xs space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" />
                    {TRIGGER_DESCRIPTIONS[formData.triggerType].label}
                  </p>
                  <p className="text-muted-foreground leading-relaxed text-[11px]">
                    {TRIGGER_DESCRIPTIONS[formData.triggerType].desc}
                  </p>
                </div>
              )}

              {/* Condicionais por gatilho */}
              {formData.triggerType === "SCHEDULED" && (
                <div className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Horário de Disparo (Fuso Brasília)
                      </Label>
                      <Input
                        type="time"
                        value={formData.scheduleTime}
                        onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                        className="rounded-xl text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Frequência Selecionada
                      </Label>
                      <div className="h-9 px-3 rounded-xl border border-border/80 bg-secondary/20 flex items-center text-xs font-semibold text-foreground truncate">
                        {formatDaysOfWeek(formData.daysOfWeek)}
                      </div>
                    </div>
                  </div>

                  {/* Seletor Personalizado dos Dias da Semana */}
                  <div className="space-y-2 rounded-xl border border-border/80 bg-secondary/10 p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Personalizar Dias da Semana
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        Toque nos dias para ativar/desativar
                      </span>
                    </div>

                    {/* 7 botões/chips para cada dia */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {DAYS_MAP.map((day) => {
                        const selectedDays = formData.daysOfWeek
                          ? formData.daysOfWeek
                            .split(",")
                            .map((d) => parseInt(d.trim()))
                            .filter((d) => !isNaN(d))
                          : [];
                        const isSelected = selectedDays.includes(day.id);

                        return (
                          <button
                            key={day.id}
                            type="button"
                            onClick={() => handleToggleDayOfWeek(day.id)}
                            className={cn(
                              "h-9 rounded-xl text-xs font-bold transition-all duration-150 flex flex-col items-center justify-center cursor-pointer border select-none",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-secondary/40 text-muted-foreground hover:bg-secondary border-border/70 hover:text-foreground"
                            )}
                            title={day.full}
                          >
                            <span>{day.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Atalhos Rápidos */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
                      <span className="text-[10px] text-muted-foreground font-medium">Atalhos:</span>
                      {[
                        { label: "Seg a Sex", val: "1,2,3,4,5" },
                        { label: "Todos os dias", val: "0,1,2,3,4,5,6" },
                        { label: "Fim de Semana", val: "0,6" },
                        { label: "Seg, Qua, Sex", val: "1,3,5" },
                        { label: "Ter, Qui", val: "2,4" },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, daysOfWeek: preset.val }))}
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer border",
                            formData.daysOfWeek === preset.val
                              ? "bg-secondary text-primary font-bold border-primary/40"
                              : "bg-secondary/40 text-muted-foreground hover:bg-secondary border-border"
                          )}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {formData.triggerType === "INACTIVITY" && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dias de Inatividade</Label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={formData.inactivityDays}
                    onChange={(e) => setFormData({ ...formData, inactivityDays: parseInt(e.target.value) || 3 })}
                    className="rounded-xl text-xs h-9"
                  />
                </div>
              )}

              {/* Destino ao Clicar (Deep Link com suporte a Personalizado) */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Destino ao Clicar (Deep Link)</Label>
                <Select
                  value={formData.destinationType}
                  onValueChange={(val) => setFormData({ ...formData, destinationType: val })}
                >
                  <SelectTrigger className="rounded-xl text-xs h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_DESTINATIONS.map((dest) => (
                      <SelectItem key={dest.value} value={dest.value} className="text-xs">
                        {dest.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {formData.destinationType === "CUSTOM" && (
                  <div className="pt-1.5 space-y-1">
                    <Input
                      placeholder="Digite a rota interna ou link (ex: /student/nutrition ou /perfil)"
                      value={formData.customDeepLink}
                      onChange={(e) => setFormData({ ...formData, customDeepLink: e.target.value })}
                      className="rounded-xl text-xs h-9"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      O app abrirá automaticamente esta tela para o usuário quando ele tocar na notificação.
                    </p>
                  </div>
                )}
              </div>

              {/* Status Ativo Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-secondary/10">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold">Ativar automação imediatamente</Label>
                  <p className="text-[10px] text-muted-foreground">O Cronjob incluirá esta regra no próximo ciclo.</p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </form>

            {/* Preview Column (Fiel ao Smartphone iOS/Android) */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-4 bg-secondary/15 rounded-2xl border border-border/60">
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="size-3.5 text-primary" /> Pré-visualização Realista
                </span>

                {formData.enableAbTest && (
                  <div className="flex items-center gap-1 bg-secondary p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setPreviewVariant("A")}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer",
                        previewVariant === "A" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Var A
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewVariant("B")}
                      className={cn(
                        "px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors cursor-pointer",
                        previewVariant === "B" ? "bg-amber-500 text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Var B
                    </button>
                  </div>
                )}
              </div>

              {/* Smartphone Lockscreen Frame */}
              <div className="w-[280px] bg-neutral-950 rounded-[36px] border-[5px] border-neutral-800 p-4 shadow-2xl text-white select-none flex flex-col justify-between min-h-[460px] relative overflow-hidden">
                {/* Dynamic Island */}
                <div className="w-20 h-4 bg-black rounded-full mx-auto" />

                {/* Status Bar */}
                <div className="flex items-center justify-between text-[10px] text-neutral-400 font-semibold px-2 mt-1">
                  <span>18:42</span>
                  <div className="flex items-center gap-1">
                    <Wifi className="size-3" />
                    <Battery className="size-3" />
                  </div>
                </div>

                {/* Lockscreen Clock */}
                <div className="text-center my-4">
                  <p className="text-[10px] text-neutral-400 font-medium">Segunda-feira, 25 de Agosto</p>
                  <p className="text-4xl font-extrabold tracking-tight mt-0.5">18:42</p>
                </div>

                {/* Rich Push Notification Card */}
                <div className="bg-neutral-900/95 backdrop-blur-md border border-neutral-700/60 rounded-2xl p-3 shadow-xl space-y-2 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between text-[10px] text-neutral-400">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      <div className="size-4 rounded-md bg-primary flex items-center justify-center text-[9px] font-black text-white">
                        A
                      </div>
                      <span className="tracking-wide">ATLASFIT</span>
                      {formData.enableAbTest && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                          {previewVariant}
                        </span>
                      )}
                    </div>
                    <span>agora</span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white leading-snug">
                      {interpolatedPreviewTitle}
                    </p>

                    <p className="text-[11px] text-neutral-300 leading-relaxed">
                      {interpolatedPreviewBody}
                    </p>
                  </div>

                  {(imagePreviewUrl || formData.imageUrl) && (
                    <div className="rounded-xl overflow-hidden border border-neutral-800 mt-1.5 max-h-32 bg-black">
                      <img
                        src={imagePreviewUrl || formData.imageUrl}
                        alt="Push Media"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="pt-1.5 flex items-center justify-between text-[10px] text-neutral-400 border-t border-neutral-800/80">
                    <span className="truncate max-w-[170px] text-[9px] font-mono">
                      {getFinalDeepLink()}
                    </span>
                    <span className="text-primary font-bold text-[9px]">Abrir</span>
                  </div>
                </div>

                {/* Lockscreen Bottom Buttons */}
                <div className="flex items-center justify-between px-3 mt-4 text-neutral-400">
                  <div className="size-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs">
                    🔦
                  </div>
                  <div className="w-24 h-1 bg-neutral-700 rounded-full mx-auto" />
                  <div className="size-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs">
                    📷
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-5 border-t border-border/50 bg-secondary/10 shrink-0 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                handleOpenTestModal({
                  id: editingItem?.id || "form-preview",
                  title: formData.title || "Notificação de Teste",
                  body: formData.body || "Mensagem de teste",
                  titleB: formData.enableAbTest ? formData.titleB : null,
                  bodyB: formData.enableAbTest ? formData.bodyB : null,
                  imageUrl: imagePreviewUrl || formData.imageUrl || null,
                  deepLink: formData.destinationType === "CUSTOM" ? formData.customDeepLink || "/student/workouts" : formData.destinationType,
                  category: formData.category,
                  priority: formData.priority,
                  targetRole: formData.targetRole,
                  triggerType: formData.triggerType,
                  isActive: true,
                  sentCount: 0,
                  deliveredCount: 0,
                  clickCount: 0,
                  conversionCount: 0,
                  createdAt: new Date().toISOString(),
                });
              }}
              disabled={isSubmitting || !formData.title || !formData.body}
              className="rounded-xl text-xs h-9 font-semibold border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer gap-1.5"
            >
              <Sparkles className="size-3.5" /> Testar Envio
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
                className="rounded-xl text-xs h-9 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSubmitForm}
                disabled={isSubmitting}
                className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground shadow-xs cursor-pointer gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="size-3.5 animate-spin" />
                    {uploadingImage ? "Enviando Imagem..." : "Salvando..."}
                  </>
                ) : (
                  editingItem ? "Salvar Alterações" : "Criar Notificação"
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Dialog de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl bg-card border-border shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold">Excluir automação de notificação?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta ação removerá permanentemente o chamado <strong>"{itemToDelete?.title}"</strong> e seu histórico de logs e métricas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs h-9 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              disabled={isDeleting}
              className="rounded-xl text-xs h-9 font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {isDeleting ? "Excluindo..." : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 8. Dialog de Confirmação de Broadcast */}
      <AlertDialog open={isBroadcastDialogOpen} onOpenChange={setIsBroadcastDialogOpen}>
        <AlertDialogContent className="rounded-2xl! bg-card border-border shadow-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-4 text-primary" /> Disparo Imediato em Massa
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-1.5">
              <span>
                Você está prestes a disparar a notificação <strong>"{itemToBroadcast?.title}"</strong> imediatamente para todos os usuários elegíveis ({itemToBroadcast?.targetRole === "ALL" ? "Todos os perfis" : itemToBroadcast?.targetRole === "STUDENT" ? "Alunos" : "Personais"}).
              </span>
              <span className="block text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                Esta ação enviará uma notificação push real aos celulares dos usuários ativos.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBroadcasting} className="rounded-xl text-xs h-9 cursor-pointer">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSendBroadcast}
              disabled={isBroadcasting}
              className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              {isBroadcasting ? "Enviando aos usuários..." : "Confirmar Disparo"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl! overflow-y-auto! bg-card border-border shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b border-border/50 bg-secondary/10 shrink-0">
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Send className="size-4 text-primary" /> Emitir Notificação de Teste
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dispare uma notificação push a um usuário específico para validar a entrega instantânea.
            </p>
          </DialogHeader>

          <div className="p-4 sm:p-5 space-y-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
              <Zap className="size-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Envio Imediato Sem Bloqueios:</span>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Este disparo de teste ignora propositalmente a janela de silêncio noturno (22h às 07h), o limite de fadiga diária e as regras de anti-duplicação.
                </p>
              </div>
            </div>

            {itemToTest ? (
              <div className="rounded-xl border border-border bg-secondary/20 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Conteúdo a Emitir
                  </span>
                  {itemToTest.titleB && (
                    <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border">
                      <Button
                        type="button"
                        size="sm"
                        variant={testVariant === "A" ? "default" : "ghost"}
                        onClick={() => setTestVariant("A")}
                        className="h-6 text-[10px] px-2 rounded-md font-bold"
                      >
                        Variante A
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={testVariant === "B" ? "default" : "ghost"}
                        onClick={() => setTestVariant("B")}
                        className="h-6 text-[10px] px-2 rounded-md font-bold"
                      >
                        Variante B
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">
                    {testVariant === "B" && itemToTest.titleB ? itemToTest.titleB : itemToTest.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {testVariant === "B" && itemToTest.bodyB ? itemToTest.bodyB : itemToTest.body}
                  </p>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono pt-1">
                  Destino: {itemToTest.deepLink}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Título do Teste</Label>
                  <Input
                    value={customTestTitle}
                    onChange={(e) => setCustomTestTitle(e.target.value)}
                    placeholder="Ex: Hora do treino!"
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Mensagem do Teste</Label>
                  <Textarea
                    value={customTestBody}
                    onChange={(e) => setCustomTestBody(e.target.value)}
                    placeholder="Ex: Seu treino de hoje já está disponível..."
                    rows={2}
                    className="text-xs rounded-xl resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Link de Destino</Label>
                  <Input
                    value={customTestDeepLink}
                    onChange={(e) => setCustomTestDeepLink(e.target.value)}
                    placeholder="/student/workouts"
                    className="h-9 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>
            )}

            {/* Target User Selector */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Destinatário do Teste</Label>
                <span className="text-[11px] text-muted-foreground">
                  {testUsersList.length} usuários disponíveis
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por nome ou e-mail..."
                  value={testSearchQuery}
                  onChange={(e) => {
                    setTestSearchQuery(e.target.value);
                    handleSearchUsers(e.target.value);
                  }}
                  className="pl-8 h-9 text-xs rounded-xl"
                />
              </div>

              {/* Users list */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-secondary/10">
                {isSearchingUsers ? (
                  <div className="space-y-2 p-1">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : testUsersList.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    Nenhum usuário encontrado para a busca.
                  </div>
                ) : (
                  testUsersList.map((u) => {
                    const isSelected = selectedTestUser?.id === u.id;
                    const roleLabel = u.role === "STUDENT" ? "Aluno" : u.role === "TRAINER" ? "Personal" : "Superadmin";
                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedTestUser(u)}
                        className={cn(
                          "p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-all",
                          isSelected
                            ? "border-primary bg-primary/10 text-foreground font-medium"
                            : "border-border/60 hover:bg-muted/50 text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="size-7 rounded-full bg-secondary flex items-center justify-center text-[11px] font-bold shrink-0">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div className="truncate">
                            <p className="truncate font-semibold">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                            {roleLabel}
                          </Badge>
                          {u.activeDevicesCount > 0 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0 h-4 gap-1">
                              <Smartphone className="size-2.5" /> {u.activeDevicesCount} disp.
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[9px] px-1.5 py-0 h-4">
                              In-App
                            </Badge>
                          )}
                          {isSelected && <Check className="size-3.5 text-primary shrink-0 ml-1" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Test Result Confirmation Card */}
            {testResult && (
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1.5 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="size-4 shrink-0" />
                  <span>{testResult.message}</span>
                </div>
                <div className="text-[11px] text-muted-foreground pl-6 space-y-0.5">
                  <p>• Pushes enviados ao FCM: <strong>{testResult.devicesCount} dispositivo(s)</strong></p>
                  <p>• Notificação no aplicativo: <strong>{testResult.inAppDelivered ? "Gravada e transmitida" : "Pendente"}</strong></p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 sm:p-5 border-t border-border/50 bg-secondary/10 shrink-0 flex flex-row items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsTestModalOpen(false)}
              disabled={isSendingTest}
              className="rounded-xl text-xs h-9 cursor-pointer"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleExecuteTestPush}
              disabled={!selectedTestUser || isSendingTest}
              className="rounded-xl text-xs h-9 font-bold bg-primary text-primary-foreground shadow-xs cursor-pointer gap-1.5"
            >
              {isSendingTest ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  Disparando Teste...
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  Disparar Teste Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
