"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MoreVertical,
  MessageCircle,
  Dumbbell,
  LineChart,
  ClipboardCheck,
  DollarSign,
  Folder,
  Plus,
  Search,
  KeyRound,
  Edit2,
  Ban,
  CheckCircle2,
  Trash2,
  Flame,
  Loader2,
  Calendar,
  Smartphone,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

interface Student {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  isActive: boolean;
  plan: string;
  image: string;
  streak: number;
  progress: number;
  avatarFallback: string;
  lastActive: string;
  setupToken?: string | null;
  hasPassword?: boolean;
}

interface PendingStudent {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  plan: string;
  avatarFallback: string;
  createdAt: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Core Data
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Pending Students Data
  const [pendingStudents, setPendingStudents] = useState<PendingStudent[]>([]);
  const workspacePlans = ["Mensal", "Trimestral", "Semestral", "Anual", "Outro"];
  const [pendingLoading, setPendingLoading] = useState(false);
  const [approvingIds, setApprovingIds] = useState<string[]>([]);
  const [selectedPending, setSelectedPending] = useState<PendingStudent | null>(null);

  // Dialog Visibility & Loaders
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  const [isToggleActiveOpen, setIsToggleActiveOpen] = useState(false);
  const [toggleActiveLoading, setToggleActiveLoading] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Dialogs for Pending Students
  const [isEditPendingOpen, setIsEditPendingOpen] = useState(false);
  const [editPendingLoading, setEditPendingLoading] = useState(false);
  const [isRejectPendingOpen, setIsRejectPendingOpen] = useState(false);
  const [rejectPendingLoading, setRejectPendingLoading] = useState(false);

  // Selected Target Student for CRUD
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [plan, setPlan] = useState("Mensal");

  // Helper to format WhatsApp phone masking
  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length <= 2) {
      setWhatsapp(raw);
    } else if (raw.length <= 6) {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2)}`);
    } else if (raw.length <= 10) {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`);
    } else {
      setWhatsapp(`(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`);
    }
  };

  // Fetch students from workspace
  const fetchStudents = async () => {
    if (!activeWorkspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/personal/clients?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setStudents(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível carregar os alunos.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch pending students
  const fetchPendingStudents = async () => {
    if (!activeWorkspaceId) return;
    setPendingLoading(true);
    try {
      const res = await fetch(`/api/personal/clients/pending?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data = await res.json();
      setPendingStudents(data);
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível carregar os pré-cadastros.");
    } finally {
      setPendingLoading(false);
    }
  };

  // Approve Pending Student (Convert to Official)
  const handleApprovePending = async (pendingId: string) => {
    if (!activeWorkspaceId) return;
    setApprovingIds(prev => [...prev, pendingId]);
    try {
      const res = await fetch("/api/personal/clients/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pendingId,
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Aluno aprovado e ativado com sucesso! 🎓");
      fetchStudents();
      fetchPendingStudents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao aprovar aluno.");
    } finally {
      setApprovingIds(prev => prev.filter(id => id !== pendingId));
    }
  };

  // Reject/Remove Pending Student
  const handleRejectPending = async () => {
    if (!activeWorkspaceId || !selectedPending) return;
    setRejectPendingLoading(true);
    try {
      const res = await fetch(
        `/api/personal/clients/pending?id=${selectedPending.id}&workspaceId=${activeWorkspaceId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Pré-cadastro recusado/removido com sucesso.");
      setIsRejectPendingOpen(false);
      fetchPendingStudents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao recusar pré-cadastro.");
    } finally {
      setRejectPendingLoading(false);
    }
  };

  // Edit Pending Student
  const handleEditPending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !selectedPending) return;
    setEditPendingLoading(true);

    try {
      const res = await fetch("/api/personal/clients/pending", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedPending.id,
          workspaceId: activeWorkspaceId,
          name,
          email,
          whatsapp,
          plan,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Pré-cadastro atualizado! 💾");
      setIsEditPendingOpen(false);
      fetchPendingStudents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar pré-cadastro.");
    } finally {
      setEditPendingLoading(false);
    }
  };

  const triggerEditPending = (ps: PendingStudent) => {
    setSelectedPending(ps);
    setName(ps.name);
    setEmail(ps.email);
    setWhatsapp(ps.whatsapp || "");
    setPlan(ps.plan);
    setIsEditPendingOpen(true);
  };

  useEffect(() => {
    fetchStudents();
    fetchPendingStudents();
  }, [activeWorkspaceId]);

  // Combine dynamic workspace plans and the active plan if any
  const getPlanOptions = (currentPlanValue?: string) => {
    const plansSet = new Set<string>();

    // 1. Add workspace plans if fetched
    workspacePlans.forEach((p) => plansSet.add(p));

    // 2. Add the currently selected/saved plan value so it's guaranteed to be listed and selected
    if (currentPlanValue) {
      plansSet.add(currentPlanValue);
    }

    return Array.from(plansSet);
  };

  // Create Student Handler
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) return;
    setCreateLoading(true);

    try {
      const res = await fetch("/api/personal/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          name,
          email,
          whatsapp,
          plan,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Aluno cadastrado com sucesso! 🎉");
      setIsCreateOpen(false);
      // Reset form
      setName("");
      setEmail("");
      setWhatsapp("");
      setPlan(workspacePlans.length > 0 ? workspacePlans[0] : "Mensal");

      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao cadastrar aluno.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Edit Student Info Handler
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !selectedStudent) return;
    setEditLoading(true);

    try {
      const res = await fetch("/api/personal/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudent.id,
          workspaceId: activeWorkspaceId,
          name,
          email,
          whatsapp,
          plan,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Informações do aluno atualizadas! 💾");
      setIsEditOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar informações.");
    } finally {
      setEditLoading(false);
    }
  };



  // Toggle Active Status Handler
  const handleToggleActive = async () => {
    if (!activeWorkspaceId || !selectedStudent) return;
    setToggleActiveLoading(true);

    try {
      const res = await fetch("/api/personal/clients", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedStudent.id,
          workspaceId: activeWorkspaceId,
          isActive: !selectedStudent.isActive,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success(
        selectedStudent.isActive
          ? "Acesso do aluno inativado com sucesso!"
          : "Acesso do aluno reativado com sucesso!"
      );
      setIsToggleActiveOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar status do aluno.");
    } finally {
      setToggleActiveLoading(false);
    }
  };

  // Delete Student Handler
  const handleDeleteStudent = async () => {
    if (!activeWorkspaceId || !selectedStudent) return;
    setDeleteLoading(true);

    try {
      const res = await fetch(
        `/api/personal/clients?userId=${selectedStudent.id}&workspaceId=${activeWorkspaceId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        throw new Error(await res.text());
      }

      toast.success("Aluno excluído com sucesso.");
      setIsDeleteOpen(false);
      fetchStudents();
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir aluno.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Trigger Edit Modal Setup
  const triggerEdit = (student: Student) => {
    setSelectedStudent(student);
    setName(student.name);
    setEmail(student.email);
    setWhatsapp(student.whatsapp);
    setPlan(student.plan);
    setIsEditOpen(true);
  };



  // Trigger Toggle Active Modal Setup
  const triggerToggleActive = (student: Student) => {
    setSelectedStudent(student);
    setIsToggleActiveOpen(true);
  };

  // Trigger Delete Modal Setup
  const triggerDelete = (student: Student) => {
    setSelectedStudent(student);
    setIsDeleteOpen(true);
  };

  // Client filtering client-side
  const filteredStudents = students.filter((student) => {
    const matchesSearch = student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? student.isActive
          : !student.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Alunos</h2>
          <p className="text-muted-foreground mt-1">Gerencie seus alunos e acompanhe o progresso.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg w-full sm:w-auto">
            <Button
              variant={statusFilter === "all" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 rounded-md px-3 flex-1 sm:flex-none", statusFilter === "all" && "bg-background shadow-sm")}
              onClick={() => setStatusFilter("all")}
            >
              Todos
            </Button>
            <Button
              variant={statusFilter === "active" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 rounded-md px-3 flex-1 sm:flex-none", statusFilter === "active" && "bg-background shadow-sm")}
              onClick={() => setStatusFilter("active")}
            >
              Ativos
            </Button>
            <Button
              variant={statusFilter === "inactive" ? "secondary" : "ghost"}
              size="sm"
              className={cn("h-8 rounded-md px-3 flex-1 sm:flex-none", statusFilter === "inactive" && "bg-background shadow-sm")}
              onClick={() => setStatusFilter("inactive")}
            >
              Inativos
            </Button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar aluno..."
              className="pl-9 bg-card border-border h-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button
            className="shrink-0 gap-2 h-10 w-full sm:w-auto font-medium"
            onClick={() => {
              setName("");
              setEmail("");
              setWhatsapp("");
              setPlan(workspacePlans.length > 0 ? workspacePlans[0] : "Mensal");
              setIsCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            <span>Novo Aluno</span>
          </Button>
        </div>
      </div>

      {/* Seção de Alunos Pendentes */}
      {pendingStudents.length > 0 && (
        <div className="space-y-5 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
            <div className="flex items-center gap-2">
              <UserPlus className="size-5 text-blue-500 dark:text-blue-400 shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold tracking-tight text-foreground">
                  Solicitações de Pré-cadastro
                </h3>
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold px-2 py-0.5 rounded-full text-[11px]">
                  {pendingStudents.length} {pendingStudents.length === 1 ? "pendente" : "pendentes"}
                </Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Aprove ou gerencie os pré-cadastros públicos recebidos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pendingStudents.map((ps) => (
              <Card
                key={ps.id}
                className="overflow-hidden bg-neutral-950 border border-neutral-800 rounded-xl flex flex-col justify-between"
              >
                <CardContent className="p-5 flex flex-col h-full justify-between gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 border border-neutral-800 shrink-0">
                        <AvatarImage />
                        <AvatarFallback className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-xs">
                          {ps.avatarFallback}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-sm leading-none text-foreground truncate">{ps.name}</h4>
                        <span className="text-xs text-muted-foreground block truncate mt-1">{ps.email}</span>
                      </div>
                    </div>
                    <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15 font-bold text-[9px] uppercase tracking-wider shrink-0 px-2 py-0.5 rounded">
                      {ps.plan}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-xs text-muted-foreground border-y border-neutral-800 py-2.5 my-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-muted-foreground/80">
                        <Smartphone className="size-3.5 text-blue-500/70 shrink-0" />
                        WhatsApp:
                      </span>
                      <span className="text-foreground font-medium truncate">
                        {ps.whatsapp || "Não preenchido"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-muted-foreground/80">
                        <Calendar className="size-3.5 text-blue-500/70 shrink-0" />
                        Cadastrado em:
                      </span>
                      <span className="text-foreground font-medium shrink-0">{ps.createdAt}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-0.5">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-neutral-800 h-8 font-medium transition-colors"
                        onClick={() => {
                          setSelectedPending(ps);
                          setIsRejectPendingOpen(true);
                        }}
                      >
                        <Trash2 className="size-3.5 mr-1.5" /> Recusar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-muted-foreground hover:bg-secondary hover:text-foreground border-neutral-800 h-8 font-medium transition-colors"
                        onClick={() => triggerEditPending(ps)}
                      >
                        <Edit2 className="size-3.5 mr-1.5" /> Editar
                      </Button>
                    </div>
                    <Button
                      className="w-full gap-2 h-9 font-semibold bg-blue-600 hover:bg-blue-500 text-white border-none shadow-none rounded-lg transition-colors"
                      onClick={() => handleApprovePending(ps.id)}
                      disabled={approvingIds.includes(ps.id)}
                    >
                      {approvingIds.includes(ps.id) ? (
                        <Loader2 className="animate-spin size-4" />
                      ) : (
                        <CheckCircle2 className="size-4" />
                      )}
                      Tornar Aluno Oficial
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid/Loading Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden border border-border/50 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-20 bg-muted rounded" />
                </div>
              </div>
              <div className="h-8 bg-muted rounded" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="h-9 bg-muted rounded" />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filteredStudents.length === 0 ? (
            <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-secondary/5 flex flex-col items-center justify-center">
              <p className="text-muted-foreground font-medium text-lg">Nenhum aluno cadastrado neste workspace.</p>
              <p className="text-xs text-muted-foreground mt-1">Cadastre seu primeiro aluno clicando no botão acima.</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <motion.div key={student.id} variants={item as any}>
                <Card className="overflow-hidden hover:border-primary/50 transition-colors duration-300 p-0 relative bg-card border border-border/50">
                  <CardContent className="p-0">
                    {/* Header & Info */}
                    <div className="p-5 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12 border-2 border-background shadow-sm">
                            <AvatarImage src={student?.image} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {student.avatarFallback}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-lg leading-none mb-1 text-foreground">{student.name}</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] uppercase font-bold tracking-wider px-1.5 py-0",
                                  student.isActive
                                    ? "bg-success/10 text-success border-success/20 dark:bg-emerald-500/10 dark:text-emerald-400"
                                    : "bg-destructive/10 text-destructive border-destructive/20 dark:bg-rose-500/10 dark:text-rose-400"
                                )}
                              >
                                {student.isActive ? "Ativo" : "Inativo"}
                              </Badge>
                              {!student.hasPassword && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0 bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                                >
                                  Senha Pendente
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">{student.plan}</span>
                              {student.streak > 0 && (
                                <div className="flex items-center gap-0.5 text-xs font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                  <Flame className="size-3" />
                                  <span>{student.streak} dias</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                              <MoreVertical className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => triggerEdit(student)}>
                              <Edit2 className="mr-2 size-4" /> Editar informações
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className={cn("cursor-pointer", student.isActive ? "text-amber-500 focus:text-amber-600" : "text-emerald-500 focus:text-emerald-600")}
                              onClick={() => triggerToggleActive(student)}
                            >
                              <Ban className="mr-2 size-4" />
                              {student.isActive ? "Inativar acesso" : "Reativar acesso"}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => triggerDelete(student)}>
                              <Trash2 className="mr-2 size-4" /> Excluir aluno
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Micro Info */}
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground bg-secondary/20 rounded-md p-2 border border-border/20">
                        <span className="flex items-center gap-1">Último acesso: <strong className="text-foreground font-medium">{student.lastActive}</strong></span>
                        <span className="flex items-center gap-1">Progresso: <strong className="text-foreground font-medium">{student.progress}%</strong></span>
                      </div>

                      {/* Setup password token link sharing */}
                      {!student.hasPassword && student.setupToken && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs font-semibold gap-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 h-9 transition-colors cursor-pointer"
                            onClick={() => {
                              const link = `${window.location.origin}/auth/setup-password?token=${student.setupToken}`;
                              navigator.clipboard.writeText(link);
                              toast.success("Link de acesso copiado com sucesso!");
                            }}
                          >
                            <KeyRound className="size-4 shrink-0 text-amber-500" />
                            <span>Copiar Link de Acesso</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Actions Footer */}
                    <div className="bg-secondary/15 border-t border-border/50 p-3 flex gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-9 font-bold bg-background text-foreground hover:bg-secondary border-border/60 justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Ações</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-48">
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/personal/clients/${student.id}?tab=treinos`)}
                          >
                            <Dumbbell className="mr-2 size-4 text-muted-foreground" />
                            <span>Treino</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/personal/clients/${student.id}?tab=progresso`)}
                          >
                            <LineChart className="mr-2 size-4 text-muted-foreground" />
                            <span>Progresso</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/personal/clients/${student.id}?tab=avaliacoes`)}
                          >
                            <ClipboardCheck className="mr-2 size-4 text-muted-foreground" />
                            <span>Avaliações</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/personal/clients/${student.id}?tab=financeiro`)}
                          >
                            <DollarSign className="mr-2 size-4 text-muted-foreground" />
                            <span>Financeiro</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/personal/clients/${student.id}?tab=arquivos`)}
                          >
                            <Folder className="mr-2 size-4 text-muted-foreground" />
                            <span>Arquivos</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-9 font-bold bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border-emerald-500/20 hover:border-emerald-500 justify-center gap-1.5 cursor-pointer transition-colors"
                        onClick={() => {
                          if (student.whatsapp) {
                            const cleanPhone = student.whatsapp.replace(/\D/g, "");
                            window.open(`https://wa.me/55${cleanPhone}`, "_blank");
                          } else {
                            toast.error("Este aluno não possui WhatsApp cadastrado.");
                          }
                        }}
                      >
                        <MessageCircle className="size-4 shrink-0" />
                        <span>WhatsApp</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Cadastrar Novo Aluno
            </DialogTitle>
            <DialogDescription>
              Preencha os campos abaixo para cadastrar manualmente um aluno no seu workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Nome Completo</Label>
              <Input
                id="create-name"
                required
                placeholder="Ex: João da Silva"
                className="bg-background border-border"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">E-mail</Label>
              <Input
                id="create-email"
                type="email"
                required
                placeholder="Ex: joao@email.com"
                className="bg-background border-border"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-whatsapp">WhatsApp</Label>
              <Input
                id="create-whatsapp"
                placeholder="(11) 99999-9999"
                className="bg-background border-border"
                value={whatsapp}
                onChange={handleWhatsAppChange}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={createLoading}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 font-medium" disabled={createLoading}>
                {createLoading ? <Loader2 className="animate-spin size-4" /> : <Plus className="size-4" />}
                Cadastrar Aluno
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Editar Aluno (PUT) */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="size-5 text-primary" /> Editar Informações
            </DialogTitle>
            <DialogDescription>
              Modifique as informações cadastrais e o plano do aluno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStudent} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                required
                className="bg-background border-border"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">E-mail</Label>
              <Input
                id="edit-email"
                type="email"
                required
                className="bg-background border-border"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-whatsapp">WhatsApp</Label>
              <Input
                id="edit-whatsapp"
                placeholder="(11) 99999-9999"
                className="bg-background border-border"
                value={whatsapp}
                onChange={handleWhatsAppChange}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={editLoading}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 font-medium" disabled={editLoading}>
                {editLoading ? <Loader2 className="animate-spin size-4" /> : <CheckCircle2 className="size-4" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>



      {/* DIALOG 4: Inativar / Ativar Acesso (PUT) */}
      <Dialog open={isToggleActiveOpen} onOpenChange={setIsToggleActiveOpen}>
        <DialogContent className="max-w-sm bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Ban className="size-5 text-amber-500" /> Confirmar Alteração
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza que deseja <strong>{selectedStudent?.isActive ? "inativar" : "ativar"}</strong> o acesso de <strong>{selectedStudent?.name}</strong>?
              {selectedStudent?.isActive && " O aluno não conseguirá fazer login ou ver seus treinos."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsToggleActiveOpen(false)} disabled={toggleActiveLoading}>
              Cancelar
            </Button>
            <Button
              className={cn("gap-2 font-medium", selectedStudent?.isActive ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-emerald-500 hover:bg-emerald-600 text-white")}
              disabled={toggleActiveLoading}
              onClick={handleToggleActive}
            >
              {toggleActiveLoading && <Loader2 className="animate-spin size-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 5: Excluir Aluno (DELETE) */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-sm bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-5 text-destructive" /> Excluir Aluno Permanentemente
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza que deseja excluir <strong>{selectedStudent?.name}</strong>? Esta ação removerá o aluno deste workspace de forma irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="gap-2 font-medium"
              disabled={deleteLoading}
              onClick={handleDeleteStudent}
            >
              {deleteLoading && <Loader2 className="animate-spin size-4" />}
              Excluir Permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 6: Editar Pré-Cadastro Pendente */}
      <Dialog open={isEditPendingOpen} onOpenChange={setIsEditPendingOpen}>
        <DialogContent className="max-w-md bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="size-5 text-blue-500" /> Editar Pré-Cadastro
            </DialogTitle>
            <DialogDescription>
              Modifique as informações recebidas no link de captação.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditPending} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-pending-name">Nome Completo</Label>
              <Input
                id="edit-pending-name"
                required
                className="bg-background border-border"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-pending-email">E-mail</Label>
              <Input
                id="edit-pending-email"
                type="email"
                required
                className="bg-background border-border"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-pending-whatsapp">WhatsApp</Label>
              <Input
                id="edit-pending-whatsapp"
                placeholder="(11) 99999-9999"
                className="bg-background border-border"
                value={whatsapp}
                onChange={handleWhatsAppChange}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditPendingOpen(false)} disabled={editPendingLoading}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 font-semibold bg-blue-600 hover:bg-blue-500 text-white border-none transition-colors" disabled={editPendingLoading}>
                {editPendingLoading ? <Loader2 className="animate-spin size-4" /> : <CheckCircle2 className="size-4" />}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 7: Recusar Pré-Cadastro (DELETE) */}
      <Dialog open={isRejectPendingOpen} onOpenChange={setIsRejectPendingOpen}>
        <DialogContent className="max-w-sm bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-5 text-destructive" /> Recusar Pré-Cadastro
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza que deseja recusar e excluir o pré-cadastro de <strong>{selectedPending?.name}</strong>? Esta ação é irreversível.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsRejectPendingOpen(false)} disabled={rejectPendingLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="gap-2 font-medium"
              disabled={rejectPendingLoading}
              onClick={handleRejectPending}
            >
              {rejectPendingLoading && <Loader2 className="animate-spin size-4" />}
              Recusar Matrícula
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
