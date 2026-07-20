"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useSnapshot } from "valtio";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Users,
  Target,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  Trash2,
  Calendar,
  Zap,
  Phone,
  Mail,
  MessageSquare,
  DollarSign,
  Briefcase,
  AlertCircle,
  FileText,
  Clock3,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  PlusCircle,
  UserCheck,
  Copy,
  Tag as TagIcon,
  Settings,
  Paperclip,
  TrendingDown,
  ChevronDown,
  Minimize2,
  ListPlus
} from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import { compressImage } from "@/lib/image-compress";
import { workspaceStore } from "@/stores/workspace.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";

interface Tag {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt: string;
}

interface CustomFieldDefinition {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  options: string | null;
  createdAt: string;
}

interface CustomFieldValue {
  id: string;
  leadId: string;
  fieldDefinitionId: string;
  value: string;
  definition?: CustomFieldDefinition;
}

interface LeadFile {
  id: string;
  leadId: string;
  fileName: string;
  fileSize: string;
  url: string;
  objectKey: string | null;
  mimeType: string | null;
  size: number | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Task {
  id: string;
  leadId: string;
  title: string;
  status: string;
  dueDate: string | null;
  time: string | null;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface Activity {
  id: string;
  leadId: string;
  content: string;
  createdAt: string;
}

interface Lead {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  goal: string | null;
  source: string | null;
  notes: string | null;
  potentialValue: number | null;
  status: string;
  lostReason: string | null;
  lostReasonDetails: string | null;
  createdAt: string;
  updatedAt: string;
  tasks: Task[];
  activities: Activity[];
  tags: Tag[];
  customValues: CustomFieldValue[];
  files: LeadFile[];
}

interface Metrics {
  totalLeads: number;
  newLeads: number;
  inNegotiation: number;
  converted: number;
  lostLeads: number;
  conversionRate: number;
  potentialRevenue: number;
  closedRevenue: number;
  averageConversionTime: number;
}

const COLUMNS = [
  { id: "new", name: "Novos Leads", color: "bg-zinc-400 dark:bg-zinc-500" },
  { id: "contacted", name: "Contato Realizado", color: "bg-zinc-400 dark:bg-zinc-500" },
  { id: "scheduled", name: "Avaliação Agendada", color: "bg-zinc-400 dark:bg-zinc-500" },
  { id: "proposal", name: "Proposta Enviada", color: "bg-zinc-400 dark:bg-zinc-500" },
  { id: "negotiation", name: "Negociação", color: "bg-zinc-400 dark:bg-zinc-500" },
  { id: "won", name: "Fechado", color: "bg-zinc-400 dark:bg-zinc-500" },
  { id: "lost", name: "Perdido", color: "bg-zinc-400 dark:bg-zinc-500" }
];

const TAG_COLORS = [
  { class: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded-full", colorName: "Cinza" },
  { class: "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full", colorName: "Verde" },
  { class: "bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-full", colorName: "Azul" },
  { class: "bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded-full", colorName: "Roxo" },
  { class: "bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full", colorName: "Laranja" },
  { class: "bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full", colorName: "Vermelho" },
  { class: "bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full", colorName: "Ciano" }
];


export default function CRMPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  const [crmTab, setCrmTab] = useState<"board" | "analytics">("board");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalLeads: 0,
    newLeads: 0,
    inNegotiation: 0,
    converted: 0,
    lostLeads: 0,
    conversionRate: 0,
    potentialRevenue: 0,
    closedRevenue: 0,
    averageConversionTime: 0
  });
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [valueSort, setValueSort] = useState("all");
  const [activeMobileColumn, setActiveMobileColumn] = useState("new");

  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [customFieldDefinitions, setCustomFieldDefinitions] = useState<CustomFieldDefinition[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");
  const [newLeadWhatsapp, setNewLeadWhatsapp] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadInstagram, setNewLeadInstagram] = useState("");
  const [newLeadGoal, setNewLeadGoal] = useState("");
  const [newLeadSource, setNewLeadSource] = useState("Instagram");
  const [newLeadValue, setNewLeadValue] = useState("");
  const [newLeadNotes, setNewLeadNotes] = useState("");
  const [newLeadTags, setNewLeadTags] = useState<string[]>([]);
  const [newLeadCustomValues, setNewLeadCustomValues] = useState<Record<string, string>>({});

  const [isTagSettingsOpen, setIsTagSettingsOpen] = useState(false);
  const [isCustomFieldsSettingsOpen, setIsCustomFieldsSettingsOpen] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0].class);
  const [isTagCreating, setIsTagCreating] = useState(false);
  const [newTagInlineName, setNewTagInlineName] = useState("");
  const [newTagInlineColor, setNewTagInlineColor] = useState(TAG_COLORS[0].class);
  const [isTagInlineCreating, setIsTagInlineCreating] = useState(false);
  const [togglingTagName, setTogglingTagName] = useState<string | null>(null);
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [isFieldCreating, setIsFieldCreating] = useState(false);
  const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);
  const [isDeletingTag, setIsDeletingTag] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomFieldDefinition | null>(null);
  const [isDeletingField, setIsDeletingField] = useState(false);

  const [draftWhatsapp, setDraftWhatsapp] = useState("");
  const [draftPhone, setDraftPhone] = useState("");
  const [draftInstagram, setDraftInstagram] = useState("");
  const [draftGoal, setDraftGoal] = useState("");
  const [draftPotentialValue, setDraftPotentialValue] = useState("");
  const [draftSource, setDraftSource] = useState("");
  const [draftCustomValues, setDraftCustomValues] = useState<Record<string, string>>({});
  const [isSavingFicha, setIsSavingFicha] = useState(false);

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState("ficha");

  const [newNote, setNewNote] = useState("");
  const [newNoteLoading, setNewNoteLoading] = useState(false);
  const [newManualActivity, setNewManualActivity] = useState("");
  const [newManualActivityLoading, setNewManualActivityLoading] = useState(false);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskTime, setNewTaskTime] = useState("09:00");
  const [newTaskPriority, setNewTaskPriority] = useState("MEDIA");
  const [newTaskLoading, setNewTaskLoading] = useState(false);
  const [updatingTaskIds, setUpdatingTaskIds] = useState<string[]>([]);

  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);
  const [convertName, setConvertName] = useState("");
  const [convertEmail, setConvertEmail] = useState("");
  const [convertWhatsapp, setConvertWhatsapp] = useState("");
  const [convertPlan, setConvertPlan] = useState("Mensal");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedToken, setConvertedToken] = useState<string | null>(null);

  const [isLostReasonOpen, setIsLostReasonOpen] = useState(false);
  const [lostLeadId, setLostLeadId] = useState<string | null>(null);
  const [lostReason, setLostReason] = useState("Preço");
  const [lostReasonDetails, setLostReasonDetails] = useState("");
  const [lostReasonLoading, setLostReasonLoading] = useState(false);

  const [fileUploadLoading, setFileUploadLoading] = useState(false);
  const [collapsedColumns, setCollapsedColumns] = useState<string[]>(["lost"]);

  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const fetchLeads = useCallback(async (silent = false) => {
    if (!activeWorkspaceId) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/personal/crm?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLeads(data.leads || []);
      setMetrics(data.metrics);
    } catch {
      if (!silent) toast.error("Não foi possível carregar os leads.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [activeWorkspaceId]);

  const fetchTagsAndFields = useCallback(async () => {
    if (!activeWorkspaceId) return;
    try {
      const [tagsRes, fieldsRes] = await Promise.all([
        fetch(`/api/personal/crm/tags?workspaceId=${activeWorkspaceId}`),
        fetch(`/api/personal/crm/custom-fields?workspaceId=${activeWorkspaceId}`)
      ]);
      if (tagsRes.ok) setAvailableTags(await tagsRes.json());
      if (fieldsRes.ok) setCustomFieldDefinitions(await fieldsRes.json());
    } catch (err) {
      console.error(err);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    fetchLeads();
    fetchTagsAndFields();
  }, [fetchLeads, fetchTagsAndFields]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;

    setCreateLoading(true);
    try {
      const customValuesPayload = Object.entries(newLeadCustomValues)
        .filter(([_, val]) => val.trim() !== "")
        .map(([defId, val]) => ({ fieldDefinitionId: defId, value: val }));

      const tagsPayload = newLeadTags.map((name) => {
        const found = availableTags.find((t) => t.name === name);
        return { name, color: found ? found.color : "bg-primary/20" };
      });

      const res = await fetch("/api/personal/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          name: newLeadName,
          phone: newLeadPhone,
          whatsapp: newLeadWhatsapp,
          email: newLeadEmail,
          instagram: newLeadInstagram,
          goal: newLeadGoal,
          source: newLeadSource,
          notes: newLeadNotes,
          potentialValue: newLeadValue,
          status: "new",
          tags: tagsPayload,
          customValues: customValuesPayload,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Lead cadastrado com sucesso!");
      setIsCreateOpen(false);
      setNewLeadName("");
      setNewLeadPhone("");
      setNewLeadWhatsapp("");
      setNewLeadEmail("");
      setNewLeadInstagram("");
      setNewLeadGoal("");
      setNewLeadSource("Instagram");
      setNewLeadValue("");
      setNewLeadNotes("");
      setNewLeadTags([]);
      setNewLeadCustomValues({});
      fetchLeads();
    } catch {
      toast.error("Erro ao cadastrar o lead.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCreateTag = async () => {
    if (!activeWorkspaceId || !tagName.trim()) return;
    setIsTagCreating(true);
    try {
      const res = await fetch("/api/personal/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          name: tagName.trim(),
          color: tagColor,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Etiqueta criada!");
      setTagName("");
      fetchTagsAndFields();
    } catch {
      toast.error("Erro ao criar etiqueta.");
    } finally {
      setIsTagCreating(false);
    }
  };

  const handleCreateTagInline = async () => {
    if (!activeWorkspaceId || !newTagInlineName.trim() || !detailLead) return;
    setIsTagInlineCreating(true);
    try {
      const res = await fetch("/api/personal/crm/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          name: newTagInlineName.trim(),
          color: newTagInlineColor,
        }),
      });
      if (!res.ok) throw new Error();
      const createdTag = await res.json();
      toast.success("Etiqueta criada!");
      setNewTagInlineName("");
      setAvailableTags((prev) => [...prev, createdTag]);
      const nextTags = [...detailLead.tags, createdTag];
      await handleUpdateLeadField({ tags: nextTags });
    } catch {
      toast.error("Erro ao criar etiqueta.");
    } finally {
      setIsTagInlineCreating(false);
    }
  };

  const handleCreateCustomField = async () => {
    if (!activeWorkspaceId || !fieldName.trim()) return;
    setIsFieldCreating(true);
    try {
      const res = await fetch("/api/personal/crm/custom-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          name: fieldName.trim(),
          type: fieldType,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Campo personalizado criado!");
      setFieldName("");
      fetchTagsAndFields();
    } catch {
      toast.error("Erro ao criar campo.");
    } finally {
      setIsFieldCreating(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!tagToDelete) return;
    setIsDeletingTag(true);
    try {
      const res = await fetch(`/api/personal/crm/tags?tagId=${tagToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Etiqueta excluída!");
      setTagToDelete(null);
      fetchTagsAndFields();
      fetchLeads();
      if (detailLead) {
        const detailRes = await fetch(`/api/personal/crm/${detailLead.id}`);
        if (detailRes.ok) {
          const updatedLead = await detailRes.json();
          setDetailLead(updatedLead);
        }
      }
    } catch {
      toast.error("Erro ao excluir etiqueta.");
    } finally {
      setIsDeletingTag(false);
    }
  };

  const handleDeleteCustomField = async () => {
    if (!fieldToDelete) return;
    setIsDeletingField(true);
    try {
      const res = await fetch(`/api/personal/crm/custom-fields?fieldId=${fieldToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Campo excluído!");
      setFieldToDelete(null);
      fetchTagsAndFields();
      fetchLeads();
      if (detailLead) {
        const detailRes = await fetch(`/api/personal/crm/${detailLead.id}`);
        if (detailRes.ok) {
          const updatedLead = await detailRes.json();
          setDetailLead(updatedLead);
        }
      }
    } catch {
      toast.error("Erro ao excluir campo.");
    } finally {
      setIsDeletingField(false);
    }
  };

  const handleOpenDetail = async (leadId: string) => {
    setSelectedLeadId(leadId);
    setIsDetailOpen(true);
    setDetailLoading(true);
    setActiveDetailTab("ficha");
    try {
      const res = await fetch(`/api/personal/crm/${leadId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDetailLead(data);
      setNewNote(data.notes || "");

      setDraftWhatsapp(data.whatsapp || "");
      setDraftPhone(data.phone || "");
      setDraftInstagram(data.instagram || "");
      setDraftGoal(data.goal || "");
      setDraftPotentialValue(data.potentialValue !== null ? String(data.potentialValue) : "");
      setDraftSource(data.source || "");

      const customVals: Record<string, string> = {};
      if (data.customValues) {
        data.customValues.forEach((cv: any) => {
          customVals[cv.fieldDefinitionId] = cv.value;
        });
      }
      setDraftCustomValues(customVals);
    } catch {
      toast.error("Não foi possível carregar os detalhes.");
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveFicha = async () => {
    if (!detailLead) return;
    setIsSavingFicha(true);
    try {
      const customValuesPayload = Object.entries(draftCustomValues)
        .filter(([_, val]) => val.trim() !== "")
        .map(([defId, val]) => ({ fieldDefinitionId: defId, value: val }));

      const updatedFields = {
        whatsapp: draftWhatsapp || null,
        phone: draftPhone || null,
        instagram: draftInstagram || null,
        goal: draftGoal || null,
        potentialValue: draftPotentialValue ? parseFloat(draftPotentialValue) : null,
        source: draftSource || null,
        customValues: customValuesPayload,
      };

      const res = await fetch(`/api/personal/crm/${detailLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setDetailLead(data);
      fetchLeads(true);
      toast.success("Ficha do lead salva!");
    } catch {
      toast.error("Erro ao salvar a ficha.");
    } finally {
      setIsSavingFicha(false);
    }
  };

  const handleUpdateLeadField = async (updatedFields: Partial<Lead>) => {
    if (!detailLead) return;
    try {
      const res = await fetch(`/api/personal/crm/${detailLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailLead(data);
        fetchLeads(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotes = async () => {
    if (!detailLead) return;
    setNewNoteLoading(true);
    try {
      await handleUpdateLeadField({ notes: newNote });
      toast.success("Notas salvas!");
    } catch {
      toast.error("Erro ao salvar notas.");
    } finally {
      setNewNoteLoading(false);
    }
  };

  const handleAddManualActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailLead || !newManualActivity.trim()) return;
    setNewManualActivityLoading(true);
    try {
      const res = await fetch(`/api/personal/crm/${detailLead.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newManualActivity.trim() }),
      });
      if (!res.ok) throw new Error();
      const newAct = await res.json();
      setDetailLead((prev) => prev ? {
        ...prev,
        activities: [newAct, ...prev.activities]
      } : null);
      setNewManualActivity("");
      toast.success("Contato registrado!");
    } catch {
      toast.error("Erro ao registrar atividade.");
    } finally {
      setNewManualActivityLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailLead || !newTaskTitle.trim()) return;
    setNewTaskLoading(true);
    try {
      const res = await fetch(`/api/personal/crm/${detailLead.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          dueDate: newTaskDueDate || null,
          time: newTaskTime,
          priority: newTaskPriority,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDetailLead((prev) => prev ? {
        ...prev,
        tasks: [data, ...prev.tasks],
        activities: [
          { id: `act_${Date.now()}`, leadId: prev.id, content: `Tarefa criada: "${newTaskTitle}"`, createdAt: new Date().toISOString() },
          ...prev.activities
        ]
      } : null);
      setNewTaskTitle("");
      setNewTaskDueDate("");
      toast.success("Tarefa adicionada!");
    } catch {
      toast.error("Erro ao adicionar tarefa.");
    } finally {
      setNewTaskLoading(false);
    }
  };

  const handleToggleTaskStatus = async (taskId: string, currentStatus: string) => {
    if (!detailLead) return;
    const nextStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    setUpdatingTaskIds((prev) => [...prev, taskId]);
    try {
      const res = await fetch(`/api/personal/crm/${detailLead.id}/tasks`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: nextStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setDetailLead((prev) => prev ? {
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? updated : t)),
        activities: [
          {
            id: `act_${Date.now()}`,
            leadId: prev.id,
            content: `Tarefa "${updated.title}" marcada como ${nextStatus === "COMPLETED" ? "Concluída" : "Pendente"}`,
            createdAt: new Date().toISOString()
          },
          ...prev.activities
        ]
      } : null);
    } catch {
      toast.error("Erro ao atualizar tarefa.");
    } finally {
      setUpdatingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!detailLead) return;
    setUpdatingTaskIds((prev) => [...prev, taskId]);
    try {
      const res = await fetch(`/api/personal/crm/${detailLead.id}/tasks?taskId=${taskId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDetailLead((prev) => prev ? {
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId)
      } : null);
      toast.success("Tarefa removida.");
    } catch {
      toast.error("Erro ao remover tarefa.");
    } finally {
      setUpdatingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!detailLead || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setFileUploadLoading(true);
    const toastId = toast.loading(`Enviando arquivo ${file.name}...`);
    try {
      let fileToUpload = file;
      if (file.type.startsWith("image/")) {
        try {
          fileToUpload = await compressImage(file);
        } catch (err) {
          console.warn("Failing compression, uploading original:", err);
        }
      }

      const presignedRes = await fetch("/api/storage/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: detailLead.workspaceId,
          fileName: fileToUpload.name,
          contentType: fileToUpload.type,
          fileSize: fileToUpload.size,
          targetType: "student_file",
        }),
      });

      if (!presignedRes.ok) throw new Error();
      const { uploadUrl, fileUrl, objectKey } = await presignedRes.json();

      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": fileToUpload.type },
        body: fileToUpload,
      });

      if (!uploadRes.ok) throw new Error();

      const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
      };

      const linkRes = await fetch(`/api/personal/crm/${detailLead.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileToUpload.name,
          fileSize: formatSize(fileToUpload.size),
          url: fileUrl,
          objectKey,
          mimeType: fileToUpload.type,
          size: fileToUpload.size,
        }),
      });

      if (!linkRes.ok) throw new Error();
      const newFileObj = await linkRes.json();

      setDetailLead((prev) => prev ? {
        ...prev,
        files: [newFileObj, ...prev.files],
        activities: [
          { id: `act_${Date.now()}`, leadId: prev.id, content: `Arquivo anexado: ${file.name}`, createdAt: new Date().toISOString() },
          ...prev.activities
        ]
      } : null);

      toast.success("Arquivo enviado com sucesso!", { id: toastId });
    } catch {
      toast.error("Erro ao fazer upload do arquivo.", { id: toastId });
    } finally {
      setFileUploadLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!detailLead) return;
    try {
      const res = await fetch(`/api/personal/crm/${detailLead.id}/files?fileId=${fileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setDetailLead((prev) => prev ? {
        ...prev,
        files: prev.files.filter((f) => f.id !== fileId)
      } : null);
      toast.success("Arquivo excluído.");
    } catch {
      toast.error("Erro ao excluir arquivo.");
    }
  };

  const handleUpdateStatusDirect = async (leadId: string, status: string) => {
    if (status === "lost") {
      setLostLeadId(leadId);
      setLostReason("Preço");
      setLostReasonDetails("");
      setIsLostReasonOpen(true);
      return;
    }

    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status } : l))
    );

    try {
      const res = await fetch("/api/personal/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status })
      });
      if (!res.ok) throw new Error();
      fetchLeads(true);
      if (status === "won") {
        const lead = leads.find((l) => l.id === leadId);
        if (lead) triggerConvertDialog(lead);
      }
    } catch {
      setLeads(previousLeads);
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleSaveLostReason = async () => {
    if (!lostLeadId) return;
    setLostReasonLoading(true);
    const previousLeads = [...leads];

    setLeads((prev) =>
      prev.map((l) => (l.id === lostLeadId ? { ...l, status: "lost" } : l))
    );

    try {
      const res = await fetch("/api/personal/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lostLeadId,
          status: "lost",
          lostReason,
          lostReasonDetails,
        }),
      });

      if (!res.ok) throw new Error();

      setIsLostReasonOpen(false);
      setLostLeadId(null);
      fetchLeads(true);
      toast.success("Lead atualizado como Perdido.");
    } catch {
      setLeads(previousLeads);
      toast.error("Erro ao salvar motivo da perda.");
    } finally {
      setLostReasonLoading(false);
    }
  };

  const triggerConvertDialog = (lead: Lead) => {
    setConvertLeadId(lead.id);
    setConvertName(lead.name);
    setConvertEmail(lead.email || "");
    setConvertWhatsapp(lead.whatsapp || lead.phone || "");
    setConvertPlan("Mensal");
    setConvertedToken(null);
    setIsConvertOpen(true);
  };

  const handleConvertStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertLeadId) return;
    if (!convertEmail.trim()) {
      toast.error("O e-mail é obrigatório para criar o acesso do aluno.");
      return;
    }

    setIsConverting(true);
    try {
      const res = await fetch(`/api/personal/crm/${convertLeadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: convertEmail,
          whatsapp: convertWhatsapp,
          plan: convertPlan,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao converter lead");
      }

      const data = await res.json();
      setConvertedToken(data.setupToken);
      toast.success("Lead convertido em Aluno com sucesso!");
      fetchLeads();
      if (detailLead && detailLead.id === convertLeadId) {
        handleOpenDetail(convertLeadId);
      }
    } catch (err: any) {
      toast.error(err.message || "Não foi possível converter o lead.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("Deseja realmente remover este lead? Esta ação é irreversível.")) return;
    try {
      const res = await fetch(`/api/personal/crm/${leadId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Lead excluído.");
      setIsDetailOpen(false);
      fetchLeads();
    } catch {
      toast.error("Erro ao excluir lead.");
    }
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData("text/plain", leadId);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumnId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumnId(null);
    const leadId = e.dataTransfer.getData("text/plain") || draggedLeadId;
    if (!leadId) return;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === targetColumnId) return;

    if (targetColumnId === "lost") {
      setLostLeadId(leadId);
      setLostReason("Preço");
      setLostReasonDetails("");
      setIsLostReasonOpen(true);
      setDraggedLeadId(null);
      return;
    }

    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetColumnId } : l))
    );

    try {
      const res = await fetch("/api/personal/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, status: targetColumnId })
      });

      if (!res.ok) throw new Error();
      fetchLeads(true);

      if (targetColumnId === "won") {
        triggerConvertDialog(lead);
      }
    } catch {
      setLeads(previousLeads);
      toast.error("Erro ao atualizar status.");
    } finally {
      setDraggedLeadId(null);
    }
  };

  const handleMoveLeadStatus = async (lead: Lead, direction: "prev" | "next") => {
    const currentIndex = COLUMNS.findIndex((c) => c.id === lead.status);
    if (currentIndex === -1) return;

    const nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= COLUMNS.length) return;

    const targetColumnId = COLUMNS[nextIndex].id;

    if (targetColumnId === "lost") {
      setLostLeadId(lead.id);
      setLostReason("Preço");
      setLostReasonDetails("");
      setIsLostReasonOpen(true);
      return;
    }

    const previousLeads = [...leads];
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: targetColumnId } : l))
    );

    try {
      const res = await fetch("/api/personal/crm", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, status: targetColumnId })
      });

      if (!res.ok) throw new Error();
      fetchLeads(true);

      if (targetColumnId === "won") {
        triggerConvertDialog(lead);
      }
    } catch {
      setLeads(previousLeads);
      toast.error("Erro ao atualizar status.");
    }
  };

  const getInitials = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getSourceBadgeColor = (source: string | null) => {
    return "bg-secondary text-muted-foreground border-none rounded-full";
  };

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "ALTA":
        return "bg-destructive/10 text-destructive border-none rounded-full";
      case "MEDIA":
        return "bg-warning/10 text-warning border-none rounded-full";
      default:
        return "bg-secondary text-muted-foreground border-none rounded-full";
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 6000);
    const days = Math.floor(hours / 24);

    if (mins < 60) return `${mins} min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    return `${days}d atrás`;
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone && lead.phone.includes(searchQuery)) ||
      (lead.whatsapp && lead.whatsapp.includes(searchQuery)) ||
      (lead.instagram && lead.instagram.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesOrigin = originFilter === "all" || lead.source === originFilter;
    const matchesGoal = goalFilter === "all" || lead.goal === goalFilter;
    const matchesTag = tagFilter === "all" || lead.tags.some((t) => t.name === tagFilter);

    return matchesSearch && matchesOrigin && matchesGoal && matchesTag;
  });

  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (valueSort === "desc") return (b.potentialValue || 0) - (a.potentialValue || 0);
    if (valueSort === "asc") return (a.potentialValue || 0) - (b.potentialValue || 0);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleToggleTagOnLead = async (tagNameStr: string) => {
    if (!detailLead) return;
    setTogglingTagName(tagNameStr);
    try {
      const hasTag = detailLead.tags.some((t) => t.name === tagNameStr);
      let nextTags = [...detailLead.tags];

      if (hasTag) {
        nextTags = nextTags.filter((t) => t.name !== tagNameStr);
      } else {
        const fullTag = availableTags.find((t) => t.name === tagNameStr);
        if (fullTag) {
          nextTags.push(fullTag);
        } else {
          nextTags.push({ id: `temp_${Date.now()}`, workspaceId: detailLead.workspaceId, name: tagNameStr, color: "bg-primary/20", createdAt: "" });
        }
      }

      await handleUpdateLeadField({ tags: nextTags });
    } finally {
      setTogglingTagName(null);
    }
  };

  const handleUpdateCustomFieldValue = async (definitionId: string, value: string) => {
    if (!detailLead) return;
    const updatedValues = detailLead.customValues.some((cv) => cv.fieldDefinitionId === definitionId)
      ? detailLead.customValues.map((cv) => cv.fieldDefinitionId === definitionId ? { ...cv, value } : cv)
      : [...detailLead.customValues, { id: `temp_val_${Date.now()}`, leadId: detailLead.id, fieldDefinitionId: definitionId, value }];

    try {
      const res = await fetch(`/api/personal/crm/${detailLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customValues: updatedValues }),
      });
      if (res.ok) {
        const data = await res.json();
        setDetailLead(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const chartData = COLUMNS.map((col) => ({
    name: col.name,
    leads: leads.filter((l) => l.status === col.id).length,
  }));

  const originDataMap = leads.reduce((acc: Record<string, number>, lead) => {
    const src = lead.source || "Outro";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});

  const originChartData = Object.entries(originDataMap).map(([name, value]) => ({
    name,
    value,
  }));

  const goalDataMap = leads.reduce((acc: Record<string, number>, lead) => {
    const gl = lead.goal || "Outro";
    acc[gl] = (acc[gl] || 0) + 1;
    return acc;
  }, {});

  const goalChartData = Object.entries(goalDataMap).map(([name, value]) => ({
    name,
    value,
  }));

  const COLORS = ["hsl(var(--primary))", "hsl(var(--primary)/0.85)", "hsl(var(--primary)/0.7)", "hsl(var(--primary)/0.55)", "hsl(var(--primary)/0.4)", "hsl(var(--primary)/0.25)", "hsl(var(--muted-foreground)/0.3)"];

  return (
    <div className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden space-y-8 p-4 md:p-8 animate-in fade-in duration-300 select-none">
      <div className="flex flex-col items-end gap-4">
        <div className="w-full">
          <h2 className="text-3xl font-extrabold tracking-tight">CRM</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie seu funil comercial, acompanhe leads de vendas e converta novos alunos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            className="rounded-lg flex-1 min-w-fit border-border text-xs font-semibold gap-2 h-9 shrink-0"
            onClick={() => setIsTagSettingsOpen(true)}
          >
            <TagIcon className="size-4 text-muted-foreground" />
            <span>Etiquetas</span>
          </Button>

          <Button
            variant="outline"
            className="rounded-lg flex-1 min-w-fit border-border text-xs font-semibold gap-2 h-9 shrink-0"
            onClick={() => setIsCustomFieldsSettingsOpen(true)}
          >
            <Settings className="size-4 text-muted-foreground" />
            <span>Campos Extra</span>
          </Button>

          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-primary flex-1 min-w-fit text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold gap-2 h-9 px-4 shrink-0"
          >
            <Plus className="size-4" />
            <span>Novo Lead</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card
          onClick={() => {
            setSearchQuery("");
            setOriginFilter("all");
            setGoalFilter("all");
            setTagFilter("all");
          }}
          className="border border-border bg-card shadow-xs rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total de Leads</span>
              <p className="text-xl font-bold tracking-tight text-foreground">{metrics.totalLeads}</p>
            </div>
            <Users className="size-5 text-muted-foreground/80 shrink-0" />
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setSearchQuery("");
            setOriginFilter("all");
            setGoalFilter("all");
            setTagFilter("all");
            setActiveMobileColumn("new");
          }}
          className="border border-border bg-card shadow-xs rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Novos Leads</span>
              <p className="text-xl font-bold tracking-tight text-foreground">{metrics.newLeads}</p>
            </div>
            <PlusCircle className="size-5 text-muted-foreground/80 shrink-0" />
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setSearchQuery("");
            setOriginFilter("all");
            setGoalFilter("all");
            setTagFilter("all");
            setActiveMobileColumn("negotiation");
          }}
          className="border border-border bg-card shadow-xs rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Em Negociação</span>
              <p className="text-xl font-bold tracking-tight text-foreground">{metrics.inNegotiation}</p>
            </div>
            <TrendingUp className="size-5 text-muted-foreground/80 shrink-0" />
          </CardContent>
        </Card>

        <Card
          onClick={() => {
            setSearchQuery("");
            setOriginFilter("all");
            setGoalFilter("all");
            setTagFilter("all");
            setActiveMobileColumn("won");
          }}
          className="border border-border bg-card shadow-xs rounded-xl cursor-pointer hover:bg-secondary/40 transition-colors"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Conversão</span>
              <p className="text-xl font-bold tracking-tight text-emerald-500">{metrics.conversionRate}%</p>
            </div>
            <UserCheck className="size-5 text-emerald-500/80 shrink-0" />
          </CardContent>
        </Card>

        <Card className="border border-border bg-card shadow-xs rounded-xl col-span-2 md:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Receita Fechada</span>
              <p className="text-xl font-bold tracking-tight text-emerald-500">R$ {metrics.closedRevenue}</p>
              <span className="text-[9px] text-muted-foreground block mt-0.5">Prevista: R$ {metrics.potentialRevenue}</span>
            </div>
            <DollarSign className="size-5 text-emerald-500/80 shrink-0" />
          </CardContent>
        </Card>
      </div>

      <div className="flex border-b border-border w-full gap-8">
        <button
          onClick={() => setCrmTab("board")}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative border-b-2 border-transparent",
            crmTab === "board" ? "text-foreground border-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Funil Comercial
        </button>
        <button
          onClick={() => setCrmTab("analytics")}
          className={cn(
            "pb-3 text-sm font-semibold transition-all relative border-b-2 border-transparent",
            crmTab === "analytics" ? "text-foreground border-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          Análise e Relatórios
        </button>
      </div>

      {crmTab === "board" ? (
        <>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card p-4 rounded-xl border border-border">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome, email, instagram..."
                className="pl-9 h-9 rounded-lg border-border bg-background text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <div className="flex-1 min-w-30 lg:flex-none">
                <Select value={originFilter} onValueChange={setOriginFilter}>
                  <SelectTrigger className="rounded-lg h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="all">Todas Origens</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Site">Site</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-30 lg:flex-none">
                <Select value={goalFilter} onValueChange={setGoalFilter}>
                  <SelectTrigger className="rounded-lg h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="Objetivo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="all">Todos Objetivos</SelectItem>
                    <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="Condicionamento">Condicionamento</SelectItem>
                    <SelectItem value="Saúde">Saúde</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-30 lg:flex-none">
                <Select value={tagFilter} onValueChange={setTagFilter}>
                  <SelectTrigger className="rounded-lg h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="Etiqueta" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="all">Todas Etiquetas</SelectItem>
                    {availableTags.map((t) => (
                      <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[120px] lg:flex-none">
                <Select value={valueSort} onValueChange={setValueSort}>
                  <SelectTrigger className="rounded-lg h-9 w-full bg-background text-xs">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg">
                    <SelectItem value="all">Mais recente</SelectItem>
                    <SelectItem value="desc">Valor: Maior primeiro</SelectItem>
                    <SelectItem value="asc">Valor: Menor primeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="md:hidden flex flex-1 overflow-x-auto gap-2 scrollbar-none">
            {COLUMNS.map((col) => {
              const colLeads = sortedLeads.filter((l) => l.status === col.id);
              const isActive = activeMobileColumn === col.id;

              return (
                <button
                  key={col.id}
                  onClick={() => setActiveMobileColumn(col.id)}
                  className={cn(
                    "flex items-center gap-1.5 shrink-0 px-4 py-2 border rounded-xl font-bold text-xs transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary/15 text-muted-foreground border-border/30"
                  )}
                >
                  <span className={cn("size-2 rounded-full shrink-0", col.color)} />
                  <span>{col.name}</span>
                  <Badge variant="secondary" className="px-1.5 py-0 rounded text-[10px] shrink-0">
                    {colLeads.length}
                  </Badge>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {[...Array(7)].map((_, idx) => (
                <div key={idx} className="flex flex-col shrink-0 bg-secondary/5 border border-border/20 rounded-2xl p-4 gap-4">
                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-8 rounded" />
                  </div>
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="hidden md:flex gap-4 items-start w-full max-w-[calc(100dvw-335px)] mx-auto overflow-x-auto scrollbar-none">
                {COLUMNS.map((col) => {
                  const colLeads = sortedLeads.filter((l) => l.status === col.id);
                  const isOver = dragOverColumnId === col.id;
                  const isCollapsed = collapsedColumns.includes(col.id);

                  if (isCollapsed) {
                    return (
                      <div
                        key={col.id}
                        onClick={() => setCollapsedColumns(prev => prev.filter(id => id !== col.id))}
                        className="flex flex-col shrink-0 w-12 items-center bg-secondary/5 hover:bg-secondary/15 rounded-xl py-4 border border-border/20 cursor-pointer select-none transition-all duration-200"
                        title={`Expandir coluna ${col.name}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className={cn("size-2 rounded-full", col.color)} />
                          <span className="bg-secondary/40 text-[9px] font-bold text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {colLeads.length}
                          </span>
                        </div>
                        <div className="flex-1 flex items-center justify-center min-h-60">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground rotate-90 whitespace-nowrap origin-center">
                            {col.name}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={col.id}
                      onDragOver={(e) => handleDragOver(e, col.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, col.id)}
                      className={cn(
                        "flex flex-col shrink-0 w-72 bg-secondary/10 rounded-xl p-3.5 transition-all duration-200",
                        isOver && "bg-secondary/20"
                      )}
                    >
                      <div className="flex items-center justify-between pb-2 border-none">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={cn("size-2 rounded-full shrink-0", col.color)} />
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{col.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="bg-secondary/40 text-[10px] font-medium text-muted-foreground px-2 py-0.5 rounded-full">
                            {colLeads.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCollapsedColumns(prev => [...prev, col.id])}
                            className="size-5 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
                            title="Recolher coluna"
                          >
                            <Minimize2 className="size-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 mt-3 min-h-75 overflow-y-auto max-h-150 scrollbar-none">
                        {colLeads.map((lead) => {
                          const hasOverdueTask = lead.tasks.some(
                            (t) => t.status === "PENDING" && t.dueDate && new Date(t.dueDate) < new Date()
                          );
                          const lastActivityDate = lead.activities.length > 0 ? new Date(lead.activities[0].createdAt) : new Date(lead.createdAt);
                          const diffTime = Math.abs(new Date().getTime() - lastActivityDate.getTime());
                          const isInactive = diffTime / (1000 * 60 * 60 * 24) > 5;

                          return (
                            <div
                              key={lead.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, lead.id)}
                              onClick={() => handleOpenDetail(lead.id)}
                              className="group border border-border/60 hover:border-border hover:shadow-xs bg-card rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all duration-150 relative space-y-2.5"
                            >
                              {isInactive && lead.status !== "won" && lead.status !== "lost" && (
                                <span className="absolute top-2.5 right-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-semibold py-0.5 px-2 rounded-full">
                                  Sem Contato
                                </span>
                              )}
                              {hasOverdueTask && (
                                <span className="absolute top-2.5 right-2.5 bg-destructive/10 text-destructive text-[9px] font-semibold py-0.5 px-2 rounded-full">
                                  Atrasado
                                </span>
                              )}

                              <div className="flex items-center gap-2">
                                <Avatar className="size-8 border border-border/30 shrink-0">
                                  <AvatarFallback className="bg-secondary text-muted-foreground font-semibold text-xs">
                                    {getInitials(lead.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <section className="flex justify-between items-center w-full gap-2 min-w-0">
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-medium text-xs block text-foreground truncate leading-tight">{lead.name}</h4>
                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{lead.email || "Sem e-mail"}</p>
                                  </div>
                                  <span className="text-[9px] font-medium tracking-wide bg-secondary text-muted-foreground/90 px-1.5 py-0.5 rounded-full shrink-0">
                                    {lead.source || "Outro"}
                                  </span>
                                </section>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {lead.tags.slice(0, 2).map((t) => (
                                  <span key={t.id} className="text-[9px] font-medium bg-secondary/60 text-muted-foreground px-2 py-0.5 rounded-full shrink-0">
                                    {t.name}
                                  </span>
                                ))}
                              </div>

                              <div className="space-y-1.5 text-[10px] text-muted-foreground/80 pt-1 flex flex-col">
                                {lead.goal && (
                                  <div className="flex items-center gap-1.5">
                                    <Target className="size-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{lead.goal}</span>
                                  </div>
                                )}
                                {(lead.phone || lead.whatsapp) && (
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="size-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{lead.whatsapp || lead.phone}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px]">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3 text-muted-foreground/70 shrink-0" />
                                  {formatRelativeTime(lead.createdAt)}
                                </span>
                                <span className="font-bold text-foreground">
                                  {lead.potentialValue !== null ? `R$ ${lead.potentialValue}` : "R$ 0"}
                                </span>
                              </div>
                            </div>
                          );
                        })}

                        {colLeads.length === 0 && (
                          <div className="py-12 border border-dashed border-border/60 rounded-xl text-center">
                            <span className="text-xs text-muted-foreground">Nenhum lead nesta etapa.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="md:hidden flex flex-col gap-3">
                {(() => {
                  const colLeads = sortedLeads.filter((l) => l.status === activeMobileColumn);
                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
                        <span className={cn("size-2 rounded-full", COLUMNS.find((c) => c.id === activeMobileColumn)?.color)} />
                        <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                          {COLUMNS.find((c) => c.id === activeMobileColumn)?.name} ({colLeads.length})
                        </span>
                      </div>

                      {colLeads.map((lead) => {
                        const hasOverdueTask = lead.tasks.some(
                          (t) => t.status === "PENDING" && t.dueDate && new Date(t.dueDate) < new Date()
                        );
                        const lastActivityDate = lead.activities.length > 0 ? new Date(lead.activities[0].createdAt) : new Date(lead.createdAt);
                        const diffTime = Math.abs(new Date().getTime() - lastActivityDate.getTime());
                        const isInactive = diffTime / (1000 * 60 * 60 * 24) > 5;

                        return (
                          <Card
                            key={lead.id}
                            onClick={() => handleOpenDetail(lead.id)}
                            className="border-border bg-card rounded-lg relative hover:shadow-xs transition-shadow"
                          >
                            {isInactive && lead.status !== "won" && lead.status !== "lost" && (
                              <span className="absolute top-2.5 right-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-semibold py-0.5 px-2 rounded-full">
                                Sem Contato
                              </span>
                            )}
                            {hasOverdueTask && (
                              <span className="absolute top-2.5 right-2.5 bg-destructive/10 text-destructive text-[9px] font-semibold py-0.5 px-2 rounded-full">
                                Atrasado
                              </span>
                            )}

                            <CardContent className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Avatar className="size-8 border border-border/30 shrink-0">
                                    <AvatarFallback className="bg-secondary text-muted-foreground font-semibold text-xs">
                                      {getInitials(lead.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-semibold text-xs truncate text-foreground leading-none">
                                    {lead.name}
                                  </span>
                                </div>
                                <span className="text-[9px] font-medium tracking-wide bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                                  {lead.source || "Outro"}
                                </span>
                              </div>

                              <div className="space-y-1.5 text-[11px] text-muted-foreground">
                                {lead.goal && (
                                  <div className="flex items-center gap-1.5">
                                    <Target className="size-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{lead.goal}</span>
                                  </div>
                                )}
                                {(lead.phone || lead.whatsapp) && (
                                  <div className="flex items-center gap-1.5">
                                    <Phone className="size-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">{lead.whatsapp || lead.phone}</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-border/20 text-[10px]">
                                <span className="text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3 shrink-0" />
                                  {formatRelativeTime(lead.createdAt)}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-foreground text-xs mr-1">
                                    {lead.potentialValue !== null ? `R$ ${lead.potentialValue}` : "R$ 0"}
                                  </span>
                                  <div className="flex items-center gap-1 border border-border/30 rounded-lg p-0.5 bg-secondary/15">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-lg hover:bg-secondary shrink-0"
                                      disabled={COLUMNS.findIndex((c) => c.id === lead.status) === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveLeadStatus(lead, "prev");
                                      }}
                                    >
                                      <ChevronLeft className="size-3.5 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-6 w-6 rounded-lg hover:bg-secondary shrink-0"
                                      disabled={COLUMNS.findIndex((c) => c.id === lead.status) === COLUMNS.length - 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMoveLeadStatus(lead, "next");
                                      }}
                                    >
                                      <ChevronRight className="size-3.5 text-muted-foreground" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {colLeads.length === 0 && (
                        <div className="py-12 border border-dashed border-border/60 rounded-xl text-center">
                          <span className="text-xs text-muted-foreground">Nenhum lead nesta etapa.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border border-border bg-card shadow-xs rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Distribuição por Etapa</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" style={{ stroke: "hsl(var(--border))" }} />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "8px" }} />
                  <Bar dataKey="leads" fill="currentColor" className="fill-primary text-primary" style={{ fill: "hsl(var(--primary))" }} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border border-border bg-card shadow-xs rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Origem dos Contatos</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={originChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="currentColor"
                    className="fill-primary text-primary"
                    style={{ fill: "hsl(var(--primary))" }}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {originChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="currentColor" style={{ fill: COLORS[index % COLORS.length] }} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "8px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border border-border bg-card shadow-xs rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Principais Objetivos</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={goalChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" style={{ stroke: "hsl(var(--border))" }} />
                  <XAxis type="number" stroke="currentColor" className="text-muted-foreground" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="currentColor" className="text-muted-foreground" fontSize={10} width={100} tickLine={false} axisLine={false} />
                  <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", color: "hsl(var(--popover-foreground))", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="currentColor" className="fill-primary/80 text-primary" style={{ fill: "hsl(var(--primary)/0.8)" }} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="border border-border bg-card shadow-xs rounded-xl p-6 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Indicadores Comerciais</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Tempo Médio de Fechamento</span>
                  <p className="text-xl font-bold tracking-tight text-foreground">{metrics.averageConversionTime} dias</p>
                </div>
                <div className="bg-secondary/40 p-4 rounded-xl border border-border/50 space-y-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Leads Perdidos</span>
                  <p className="text-xl font-bold tracking-tight text-destructive">{metrics.lostLeads}</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary/40 p-4 rounded-xl border border-border/50 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Funil de Conversão Financeira</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>Receita Fechada</span>
                  <span className="text-emerald-500">R$ {metrics.closedRevenue}</span>
                </div>
                <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${metrics.potentialRevenue + metrics.closedRevenue > 0
                        ? (metrics.closedRevenue / (metrics.potentialRevenue + metrics.closedRevenue)) * 100
                        : 0
                        }%`
                    }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-semibold">
                  <span>Negociação Prevista</span>
                  <span>R$ {metrics.potentialRevenue}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-xl rounded-2xl! overflow-y-auto! border-border/40 bg-card">
          <form onSubmit={handleCreateLead}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Cadastrar Novo Lead</DialogTitle>
              <DialogDescription>
                Insira as informações do lead para começar a gerenciar sua negociação.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome Completo</label>
                <Input
                  required
                  placeholder="Ex: João da Silva"
                  className="rounded-xl h-11 border-border bg-secondary/10"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Telefone</label>
                <Input
                  placeholder="Ex: (11) 99999-9999"
                  className="rounded-xl h-11 border-border bg-secondary/10"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(formatPhone(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">WhatsApp</label>
                <Input
                  placeholder="Ex: (11) 99999-9999"
                  className="rounded-xl h-11 border-border bg-secondary/10"
                  value={newLeadWhatsapp}
                  onChange={(e) => setNewLeadWhatsapp(formatPhone(e.target.value))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">E-mail</label>
                <Input
                  type="email"
                  placeholder="Ex: joao@exemplo.com"
                  className="rounded-xl h-11 border-border bg-secondary/10"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Instagram (@usuario)</label>
                <Input
                  placeholder="Ex: joao.silva"
                  className="rounded-xl h-11 border-border bg-secondary/10"
                  value={newLeadInstagram}
                  onChange={(e) => setNewLeadInstagram(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Objetivo</label>
                <Select value={newLeadGoal} onValueChange={setNewLeadGoal}>
                  <SelectTrigger className="rounded-xl h-11 w-full border-border bg-secondary/10 font-semibold text-xs">
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="Condicionamento">Condicionamento</SelectItem>
                    <SelectItem value="Saúde">Saúde e Bem-estar</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Origem do Contato</label>
                <Select value={newLeadSource} onValueChange={setNewLeadSource}>
                  <SelectTrigger className="rounded-xl h-11 w-full border-border bg-secondary/10 font-semibold text-xs">
                    <SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="Facebook">Facebook</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Site">Site público</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Valor Potencial Estimado (R$ / mensal)</label>
                <Input
                  type="number"
                  placeholder="Ex: 149"
                  className="rounded-xl h-11 border-border bg-secondary/10"
                  value={newLeadValue}
                  onChange={(e) => setNewLeadValue(e.target.value)}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Etiquetas (Tags)</label>
                <div className="flex flex-wrap gap-2 p-3 bg-secondary/10 border border-border/30 rounded-xl">
                  {availableTags.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">Crie etiquetas antes de vincular.</span>
                  ) : (
                    availableTags.map((tag) => {
                      const isSelected = newLeadTags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setNewLeadTags((prev) => prev.filter((t) => t !== tag.name));
                            } else {
                              setNewLeadTags((prev) => [...prev, tag.name]);
                            }
                          }}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all",
                            isSelected ? tag.color + "border-none!" : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700"
                          )}
                        >
                          {tag.name}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {customFieldDefinitions.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">{field.name}</label>
                  <Input
                    placeholder={`Inserir ${field.name.toLowerCase()}...`}
                    className="rounded-xl h-11 border-border bg-secondary/10"
                    value={newLeadCustomValues[field.id] || ""}
                    onChange={(e) => setNewLeadCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                  />
                </div>
              ))}

              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Observações Iniciais</label>
                <Textarea
                  placeholder="Dores no joelho, prefere treinar pela manhã, etc."
                  className="rounded-xl border-border bg-secondary/10 min-h-20"
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="rounded-xl font-bold shadow-md" disabled={createLoading}>
                {createLoading ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
                <span>Cadastrar Lead</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full! sm:max-w-4xl! overflow-y-auto border-l border-border/50 bg-card p-0 select-none">
          <div className="sr-only">
            <SheetTitle>Detalhes do Lead</SheetTitle>
            <SheetDescription>Informações e gerenciamento de tarefas do lead selecionado.</SheetDescription>
          </div>
          {detailLoading || !detailLead ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="animate-spin size-8 text-primary" />
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                Carregando detalhes do lead...
              </span>
            </div>
          ) : (
            <div className="flex flex-col h-full justify-between">
              <div>
                <div className="p-4 sm:p-6 border-b border-border/30 bg-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-10 border border-border/30">
                        <AvatarFallback className="bg-primary/10 text-primary font-black text-sm">
                          {getInitials(detailLead.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <SheetTitle className="text-xl font-extrabold">{detailLead.name}</SheetTitle>
                        <SheetDescription className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                          {detailLead.email || "Sem e-mail"}
                        </SheetDescription>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 max-sm:w-full">
                    {detailLead.status !== "won" && (
                      <Button
                        size="sm"
                        onClick={() => triggerConvertDialog(detailLead)}
                        className="bg-emerald-600 flex-1 sm:flex-none hover:bg-emerald-500 text-white rounded-xl font-bold h-9 shadow-md gap-1.5"
                      >
                        <UserCheck className="size-4" />
                        <span>Tornar Aluno</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-xl h-9 font-bold max-sm:px-3"
                      onClick={() => handleDeleteLead(detailLead.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="w-full">
                    <div className="w-full overflow-x-auto scrollbar-none pb-1">
                      <TabsList className="flex w-max md:w-full md:grid md:grid-cols-5 h-10 bg-secondary/10 border border-border/30 rounded-xl p-1 mb-6 gap-1 md:gap-0">
                        <TabsTrigger value="ficha" className="text-xs font-bold rounded-lg px-4 md:px-0">Ficha</TabsTrigger>
                        <TabsTrigger value="tarefas" className="text-xs font-bold rounded-lg px-4 md:px-0">Tarefas</TabsTrigger>
                        <TabsTrigger value="notas" className="text-xs font-bold rounded-lg px-4 md:px-0">Notas</TabsTrigger>
                        <TabsTrigger value="arquivos" className="text-xs font-bold rounded-lg px-4 md:px-0">Arquivos</TabsTrigger>
                        <TabsTrigger value="timeline" className="text-xs font-bold rounded-lg px-4 md:px-0">Histórico</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="ficha" className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-secondary/15 p-5 rounded-2xl border border-border/30">
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">WhatsApp</span>
                          <Input
                            className="bg-background rounded-lg border-border"
                            value={draftWhatsapp}
                            onChange={(e) => setDraftWhatsapp(formatPhone(e.target.value))}
                            placeholder="Ex: (11) 99999-9999"
                          />
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Telefone</span>
                          <Input
                            className="bg-background rounded-lg border-border"
                            value={draftPhone}
                            onChange={(e) => setDraftPhone(formatPhone(e.target.value))}
                            placeholder="Ex: (11) 99999-9999"
                          />
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Instagram</span>
                          <Input
                            className="bg-background rounded-lg border-border"
                            value={draftInstagram}
                            onChange={(e) => setDraftInstagram(e.target.value)}
                            placeholder="Instagram..."
                          />
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Objetivo</span>
                          <Input
                            className="bg-background rounded-lg border-border"
                            value={draftGoal}
                            onChange={(e) => setDraftGoal(e.target.value)}
                            placeholder="Objetivo..."
                          />
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor Estimado</span>
                          <Input
                            type="number"
                            className="bg-background rounded-lg border-border text-emerald-500 font-bold"
                            value={draftPotentialValue}
                            onChange={(e) => setDraftPotentialValue(e.target.value)}
                            placeholder="R$ 0"
                          />
                        </div>
                        <div className="space-y-0.5 text-xs">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Origem</span>
                          <Input
                            className="bg-background rounded-lg border-border"
                            value={draftSource}
                            onChange={(e) => setDraftSource(e.target.value)}
                            placeholder="Origem..."
                          />
                        </div>
                        {detailLead.status === "lost" && (
                          <div className="col-span-2 space-y-0.5 text-xs bg-red-500/10 p-4 rounded-xl border border-red-500/20">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Motivo da Perda</span>
                            <p className="font-extrabold text-sm text-foreground">{detailLead.lostReason}</p>
                            {detailLead.lostReasonDetails && (
                              <p className="text-muted-foreground text-xs mt-1">{detailLead.lostReasonDetails}</p>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Etiquetas (Tags)</h4>
                        <div className="p-4 bg-secondary/5 border border-border/30 rounded-2xl space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {availableTags.map((tag) => {
                              const hasTag = detailLead.tags.some((t) => t.name === tag.name);
                              const isToggling = togglingTagName === tag.name;
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  disabled={togglingTagName !== null}
                                  onClick={() => handleToggleTagOnLead(tag.name)}
                                  className={cn(
                                    "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5",
                                    hasTag ? cn(tag.color, "border-transparent!") : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80",
                                    isToggling && "opacity-70 cursor-wait"
                                  )}
                                >
                                  {isToggling && <Loader2 className="animate-spin size-3 shrink-0" />}
                                  <span>{tag.name}</span>
                                </button>
                              );
                            })}
                            {availableTags.length === 0 && (
                              <span className="text-xs text-muted-foreground">Nenhuma etiqueta disponível.</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/20 max-sm:grid max-sm:grid-cols-2">
                            <Input
                              placeholder="Nova etiqueta..."
                              className="h-8 text-xs rounded-lg bg-background border-border w-full max-sm:col-span-2"
                              value={newTagInlineName}
                              onChange={(e) => setNewTagInlineName(e.target.value)}
                            />
                            <Select value={newTagInlineColor} onValueChange={setNewTagInlineColor}>
                              <SelectTrigger className="h-8 text-xs rounded-lg bg-background border border-border px-3 w-full">
                                <SelectValue placeholder="Cor" />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg">
                                {TAG_COLORS.map((tc) => (
                                  <SelectItem key={tc.class} value={tc.class}>{tc.colorName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              className="h-8 px-3 rounded-lg text-xs font-bold w-full"
                              onClick={handleCreateTagInline}
                              disabled={isTagInlineCreating}
                            >
                              {isTagInlineCreating ? <Loader2 className="animate-spin size-3 mr-1" /> : <Plus className="size-3 mr-1" />}
                              {isTagInlineCreating ? "Criando..." : "Criar"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Campos Personalizados</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-secondary/5 border border-border/30 rounded-2xl">
                          {customFieldDefinitions.map((field) => {
                            return (
                              <div key={field.id} className="space-y-1">
                                <label className="text-[10px] font-bold text-muted-foreground uppercase">{field.name}</label>
                                <Input
                                  className="bg-background rounded-lg border-border"
                                  value={draftCustomValues[field.id] || ""}
                                  placeholder={`Preencher ${field.name.toLowerCase()}...`}
                                  onChange={(e) => setDraftCustomValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                                />
                              </div>
                            );
                          })}
                          {customFieldDefinitions.length === 0 && (
                            <span className="text-xs text-muted-foreground col-span-2 text-center py-4">Nenhum campo personalizado cadastrado.</span>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end pt-4 border-t border-border/20 max-sm:w-full">
                        <Button
                          onClick={handleSaveFicha}
                          disabled={isSavingFicha}
                          className="bg-primary text-primary-foreground font-black px-6 py-2 h-11 rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/95 flex items-center gap-2 max-sm:w-full max-sm:justify-center"
                        >
                          {isSavingFicha ? <Loader2 className="animate-spin size-4" /> : null}
                          <span>{isSavingFicha ? "Salvando..." : "Salvar Ficha"}</span>
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="tarefas" className="space-y-6">
                      <form onSubmit={handleAddTask} className="flex flex-col md:flex-row gap-3 bg-secondary/5 p-4 rounded-xl border border-border/30">
                        <Input
                          required
                          placeholder="Adicionar tarefa (ex: Enviar proposta...)"
                          className="rounded-xl py-3 text-sm border-border bg-background flex-1"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                        />
                        <div className="grid grid-cols-2 md:flex gap-2 items-center">
                          <Input
                            type="date"
                            className="rounded-xl h-10 border-border bg-background text-xs w-full md:w-36"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                          />
                          <Select value={newTaskPriority} onValueChange={setNewTaskPriority}>
                            <SelectTrigger className="rounded-xl h-10 border-border bg-background font-semibold text-xs w-full md:w-28">
                              <SelectValue placeholder="Prioridade" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="BAIXA">Baixa</SelectItem>
                              <SelectItem value="MEDIA">Média</SelectItem>
                              <SelectItem value="ALTA">Alta</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            type="submit"
                            disabled={newTaskLoading}
                            className="rounded-xl h-10 font-bold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center gap-1.5 col-span-2 md:col-span-1 md:px-4 shrink-0"
                          >
                            {newTaskLoading ? <Loader2 className="animate-spin size-4" /> : <Plus className="size-4" />}
                            <span className="md:hidden">{newTaskLoading ? "Adicionando..." : "Adicionar Tarefa"}</span>
                          </Button>
                        </div>
                      </form>

                      <div className="space-y-2.5">
                        {detailLead.tasks.map((task) => {
                          const isUpdating = updatingTaskIds.includes(task.id);
                          const isDone = task.status === "COMPLETED";

                          return (
                            <div
                              key={task.id}
                              className={cn(
                                "flex items-center justify-between p-3.5 rounded-xl border border-border/30 transition-all",
                                isDone ? "bg-secondary/5 opacity-60" : "bg-secondary/10"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 rounded-full shrink-0 border border-border/80 hover:bg-primary/20 flex items-center justify-center"
                                  disabled={isUpdating}
                                  onClick={() => handleToggleTaskStatus(task.id, task.status)}
                                >
                                  {isUpdating ? (
                                    <Loader2 className="animate-spin size-3 text-muted-foreground" />
                                  ) : (
                                    isDone && <Check className="size-3.5 text-emerald-500" />
                                  )}
                                </Button>
                                <div>
                                  <p className={cn("text-xs font-bold text-foreground", isDone && "line-through")}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {task.dueDate && (
                                      <span className="text-[9px] text-muted-foreground flex items-center gap-1 font-semibold">
                                        <Calendar className="size-3 shrink-0" />
                                        {new Date(task.dueDate).toLocaleDateString("pt-BR")}
                                      </span>
                                    )}
                                    <Badge className={cn("text-[8px] font-black uppercase tracking-wider py-0 px-1 border rounded", getPriorityBadgeColor(task.priority))}>
                                      {task.priority}
                                    </Badge>
                                  </div>
                                </div>
                              </div>

                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                disabled={isUpdating}
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          );
                        })}

                        {detailLead.tasks.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-border/60 rounded-xl">
                            <span className="text-xs text-muted-foreground">Nenhuma tarefa cadastrada.</span>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="notas" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">Anotações do Personal</h4>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={newNoteLoading}
                          className="h-8 text-[10px] uppercase font-bold rounded-lg"
                        >
                          {newNoteLoading ? <Loader2 className="animate-spin size-3 mr-1.5" /> : null}
                          Salvar Notas
                        </Button>
                      </div>
                      <Textarea
                        placeholder="Insira notas permanentes sobre o lead..."
                        className="min-h-[200px] rounded-2xl bg-secondary/10 border-border"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                      />
                    </TabsContent>

                    <TabsContent value="arquivos" className="space-y-6">
                      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-border/60 rounded-2xl bg-secondary/5">
                        <Paperclip className="size-8 text-muted-foreground mb-3" />
                        <span className="text-xs font-bold text-foreground">Anexe laudos, exames ou contratos</span>
                        <span className="text-[10px] text-muted-foreground mt-1 mb-4">PDF, Imagens, Planilhas até 20MB</span>
                        <input
                          type="file"
                          className="hidden"
                          id="lead-file-upload"
                          onChange={handleFileUpload}
                          disabled={fileUploadLoading}
                        />
                        <Button
                          type="button"
                          disabled={fileUploadLoading}
                          onClick={() => document.getElementById("lead-file-upload")?.click()}
                          className="rounded-xl font-bold"
                        >
                          {fileUploadLoading ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
                          Escolher Arquivo
                        </Button>
                      </div>

                      <div className="space-y-2.5">
                        {detailLead.files.map((file) => (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-3.5 bg-secondary/10 border border-border/30 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="size-5 text-primary shrink-0" />
                              <div>
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-foreground hover:underline"
                                >
                                  {file.fileName}
                                </a>
                                <span className="text-[9px] text-muted-foreground block">
                                  {file.fileSize} | Enviado por {file.uploadedBy}
                                </span>
                              </div>
                            </div>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteFile(file.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        ))}

                        {detailLead.files.length === 0 && (
                          <div className="text-center py-6 border border-dashed border-border/60 rounded-xl">
                            <span className="text-xs text-muted-foreground">Nenhum arquivo anexado.</span>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="timeline" className="space-y-6">
                      <form onSubmit={handleAddManualActivity} className="flex gap-2">
                        <Input
                          required
                          placeholder="Registrar nova interação ou contato..."
                          className="rounded-xl h-10 border-border bg-secondary/10 text-xs flex-1"
                          value={newManualActivity}
                          onChange={(e) => setNewManualActivity(e.target.value)}
                        />
                        <Button
                          type="submit"
                          disabled={newManualActivityLoading}
                          className="h-10 text-[10px] uppercase font-bold rounded-xl"
                        >
                          {newManualActivityLoading ? <Loader2 className="animate-spin size-3 mr-2" /> : null}
                          {newManualActivityLoading ? "Registrando..." : "Registrar"}
                        </Button>
                      </form>

                      <div className="relative border-l border-border/50 pl-4 ml-2 space-y-5 pt-2">
                        {detailLead.activities.map((act) => (
                          <div key={act.id} className="relative">
                            <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary ring-4 ring-card" />
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-foreground leading-normal">
                                {act.content}
                              </p>
                              <span className="text-[9px] text-muted-foreground block font-medium">
                                {new Date(act.createdAt).toLocaleString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>

              <div className="p-4 border-t border-border/30 bg-secondary/5 text-right">
                <Button variant="outline" className="rounded-xl text-xs font-bold" onClick={() => setIsDetailOpen(false)}>
                  Fechar Detalhes
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/40 bg-card">
          <form onSubmit={handleConvertStudent}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Matricular Aluno</DialogTitle>
              <DialogDescription>
                Converta o lead em aluno para liberar os treinos e o acesso à plataforma.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {convertedToken ? (
                <div className="space-y-4 text-center">
                  <div className="size-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
                    <Check className="size-6" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">Matrícula Realizada com Sucesso!</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Compartilhe o link de onboarding abaixo com o aluno para que ele crie a senha e acesse o aplicativo.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-secondary/15 rounded-xl border border-border/30 text-xs">
                    <span className="font-mono text-muted-foreground truncate select-all flex-1">
                      {window.location.origin}/student-setup?token={convertedToken}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/student-setup?token=${convertedToken}`);
                        toast.success("Link copiado!");
                      }}
                      className="size-8 rounded-lg"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Nome</label>
                    <Input
                      required
                      placeholder="Ex: João da Silva"
                      className="rounded-xl h-11 border-border bg-secondary/10"
                      value={convertName}
                      onChange={(e) => setConvertName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">E-mail</label>
                    <Input
                      type="email"
                      required
                      placeholder="Ex: maria@exemplo.com"
                      className="rounded-xl h-11 border-border bg-secondary/10"
                      value={convertEmail}
                      onChange={(e) => setConvertEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">WhatsApp</label>
                    <Input
                      placeholder="Ex: (11) 99999-9999"
                      className="rounded-xl h-11 border-border bg-secondary/10"
                      value={convertWhatsapp}
                      onChange={(e) => setConvertWhatsapp(formatPhone(e.target.value))}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Plano Inicial</label>
                    <Select value={convertPlan} onValueChange={setConvertPlan}>
                      <SelectTrigger className="rounded-xl w-full h-11 border-border bg-secondary/10 font-semibold text-xs">
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              {convertedToken ? (
                <Button
                  type="button"
                  onClick={() => setIsConvertOpen(false)}
                  className="rounded-xl font-bold w-full"
                >
                  Fechar
                </Button>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setIsConvertOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isConverting} className="rounded-xl font-bold shadow-md bg-emerald-600 hover:bg-emerald-500 text-white">
                    {isConverting ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
                    <span>Matricular Aluno</span>
                  </Button>
                </>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isLostReasonOpen} onOpenChange={setIsLostReasonOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/40 bg-card">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Motivo da Perda</DialogTitle>
            <DialogDescription>
              Indique o motivo pelo qual esta negociação não pôde ser fechada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Motivo</label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger className="rounded-xl h-11 w-full border-border bg-secondary/10 font-semibold text-xs">
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="Preço">Preço alto</SelectItem>
                  <SelectItem value="Sem interesse">Sem interesse atual</SelectItem>
                  <SelectItem value="Escolheu outro profissional">Escolheu outro profissional</SelectItem>
                  <SelectItem value="Não respondeu">Não respondeu às tentativas</SelectItem>
                  <SelectItem value="Sem tempo">Sem tempo disponível</SelectItem>
                  <SelectItem value="Outro">Outro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Observações detalhadas</label>
              <Textarea
                placeholder="Explique com mais detalhes a razão da perda comercial..."
                className="rounded-xl border-border bg-secondary/10 min-h-20"
                value={lostReasonDetails}
                onChange={(e) => setLostReasonDetails(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setIsLostReasonOpen(false);
                setLostLeadId(null);
                fetchLeads();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveLostReason}
              disabled={lostReasonLoading}
              className="rounded-xl font-bold shadow-md bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {lostReasonLoading ? <Loader2 className="animate-spin size-4 mr-2" /> : null}
              <span>Salvar e Fechar</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isTagSettingsOpen} onOpenChange={setIsTagSettingsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl! border-border/40 bg-card p-6 select-none">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <TagIcon className="size-4.5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">Gerenciar Etiquetas</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Crie ou exclua etiquetas organizacionais para categorizar seus leads comerciais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Seção Nova Etiqueta */}
            <div className="space-y-3 p-4 bg-secondary/15 rounded-2xl border border-border/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Nova Etiqueta</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Input
                    placeholder="Nome da etiqueta..."
                    className="rounded-xl h-10 border-border bg-background text-xs"
                    value={tagName}
                    onChange={(e) => setTagName(e.target.value)}
                    disabled={isTagCreating}
                  />
                </div>
                <div className="space-y-1">
                  <Select value={tagColor} onValueChange={setTagColor} disabled={isTagCreating}>
                    <SelectTrigger className="rounded-xl h-10 w-full border border-border bg-background font-semibold text-xs px-3">
                      <SelectValue placeholder="Cor" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {TAG_COLORS.map((tc, idx) => (
                        <SelectItem key={idx} value={tc.class}>{tc.colorName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleCreateTag}
                disabled={isTagCreating || !tagName.trim()}
                className="rounded-xl h-10 w-full font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isTagCreating ? (
                  <>
                    <Loader2 className="animate-spin size-3.5" />
                    <span>Criando Etiqueta...</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-3.5" />
                    <span>Criar Etiqueta</span>
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-border/30" />

            {/* Seção Etiquetas Existentes */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block ml-1">Etiquetas Existentes</span>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted">
                {availableTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between p-1 bg-background border border-border/30 rounded-sm hover:border-border/60 hover:bg-secondary/5 transition-all"
                  >
                    <Badge className={cn("text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-sm! border shadow-2xs", tag.color)}>
                      {tag.name}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      onClick={() => setTagToDelete(tag)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {availableTags.length === 0 && (
                  <div className="py-8 text-center border border-dashed border-border/50 rounded-2xl bg-secondary/5">
                    <TagIcon className="size-5 text-muted-foreground/45 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">Nenhuma etiqueta cadastrada.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsTagSettingsOpen(false)}
              className="rounded-xl w-full border-border/80 h-10 text-xs font-bold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCustomFieldsSettingsOpen} onOpenChange={setIsCustomFieldsSettingsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border/40 bg-card p-6 select-none">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                <ListPlus className="size-4.5 text-primary" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">Campos Personalizados</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground mt-1">
              Crie campos adicionais para registrar na ficha de todos os leads do seu funil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Seção Novo Campo */}
            <div className="space-y-3 p-4 bg-secondary/15 rounded-2xl border border-border/30">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground ml-1">Novo Campo Extra</span>
              <div className="space-y-3">
                <Input
                  placeholder="Nome do campo (ex: Profissão, Link do Insta)..."
                  className="rounded-xl h-10 border-border bg-background text-xs"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  disabled={isFieldCreating}
                />
                <Button
                  onClick={handleCreateCustomField}
                  disabled={isFieldCreating || !fieldName.trim()}
                  className="rounded-xl h-10 w-full font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {isFieldCreating ? (
                    <>
                      <Loader2 className="animate-spin size-3.5" />
                      <span>Criando Campo...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="size-3.5" />
                      <span>Criar Campo</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="border-t border-border/30" />

            {/* Seção Campos Existentes */}
            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block ml-1">Campos Existentes</span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-muted">
                {customFieldDefinitions.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-2.5 bg-background border border-border/30 rounded-xl hover:border-border/60 hover:bg-secondary/5 transition-all"
                  >
                    <div className="flex items-center gap-2 pl-1.5">
                      <FileText className="size-3.5 text-muted-foreground" />
                      <span className="text-xs font-bold text-foreground">{field.name}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg cursor-pointer"
                      onClick={() => setFieldToDelete(field)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                ))}
                {customFieldDefinitions.length === 0 && (
                  <div className="py-8 text-center border border-dashed border-border/50 rounded-2xl bg-secondary/5">
                    <ListPlus className="size-5 text-muted-foreground/45 mx-auto mb-2" />
                    <span className="text-xs text-muted-foreground">Nenhum campo personalizado cadastrado.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCustomFieldsSettingsOpen(false)}
              className="rounded-xl w-full border-border/80 h-10 text-xs font-bold"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Deletion Alert Dialogs */}
      <AlertDialog open={!!tagToDelete} onOpenChange={(open) => !open && setTagToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-border/40 bg-card select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
              Essa ação não poderá ser desfeita. A etiqueta "{tagToDelete?.name}" será removida de todos os leads associados do seu funil comercial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeletingTag} className="rounded-xl h-10 text-xs font-bold border-border/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingTag}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteTag();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-10 text-xs font-bold"
            >
              {isDeletingTag ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!fieldToDelete} onOpenChange={(open) => !open && setFieldToDelete(null)}>
        <AlertDialogContent className="rounded-2xl border-border/40 bg-card select-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground mt-1">
              Essa ação não poderá ser desfeita. O campo personalizado "{fieldToDelete?.name}" e todos os valores preenchidos na ficha dos leads serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isDeletingField} className="rounded-xl h-10 text-xs font-bold border-border/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeletingField}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteCustomField();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl h-10 text-xs font-bold"
            >
              {isDeletingField ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
