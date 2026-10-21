"use client";
import { Label } from "@/components/ui/label";
import { GymPageHeader, GymEmptyState } from "@/components/application/gym-page";
import { SelectGroup } from "@/components/ui/select";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCPF } from "@/lib/cpf-validator";
import {
  Users,
  Search,
  Plus,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Loader2,
  MessageCircle,
  UserPlus,
  Dumbbell,
  LineChart,
  ClipboardCheck,
  DollarSign,
  Folder,
  Edit2,
  Ban,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { parseBirthDate, civilAge } from "@/lib/privacy/civil-age";
import { z } from "zod";

function studentWhatsAppUrl(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const internationalPhone = digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${internationalPhone}`;
}

const nullableText = z.string().nullable();
const studentItemSchema = z.object({
  id: z.string(), userId: z.string(), name: z.string(), email: nullableText, cpfCnpj: nullableText, whatsapp: nullableText, birthDate: nullableText, image: nullableText,
  plan: z.string(), modality: z.string(), isActive: z.boolean(), isMinor: z.boolean(), unitId: nullableText, canReadHealth: z.boolean(), assignedStaffId: nullableText,
  assignedStaff: z.object({ id: z.string(), name: z.string(), role: z.string() }).nullable(),
  studentProfile: z.object({ id: z.string(), registrationNumber: nullableText, emergencyContactName: nullableText, emergencyContactPhone: nullableText, medicalClearance: z.boolean().optional(), medicalClearanceExpiresAt: nullableText.optional(), notes: nullableText.optional(), enrolledAt: z.string(), status: z.string() }).nullable(),
  createdAt: z.string(),
});
const studentListSchema = z.object({ students: z.array(studentItemSchema), pagination: z.object({ page: z.number().int(), limit: z.number().int(), total: z.number().int(), totalPages: z.number().int() }) });
type StudentItem = z.infer<typeof studentItemSchema>;
function message(error: unknown, fallback: string) { return error instanceof z.ZodError ? "Resposta do servidor inválida. Atualize e tente novamente." : error instanceof Error ? error.message : fallback; }

interface GymStudentsClientProps {
  workspaceId: string;
  workspaceName: string;
  initialStudentsData: {
    students: StudentItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  staffTrainers: Array<{ id: string; name: string; role: string; unitIds: string[] }>;
  units: Array<{ id: string; name: string; canManageStudents: boolean; canManageHealth: boolean }>;
  canManageStudents: boolean;
  isTrainerRestricted: boolean;
}

export function GymStudentsClient({
  workspaceId,
  workspaceName,
  initialStudentsData,
  staffTrainers,
  units,
  canManageStudents,
  isTrainerRestricted,
}: GymStudentsClientProps) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentItem[]>(initialStudentsData.students);
  const [pagination, setPagination] = useState(initialStudentsData.pagination);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedUnit, setSelectedUnit] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const listRequestId = useRef(0);

  // Personal trainers only
  const personalTrainers = staffTrainers.filter(
    (t) => t.role.toUpperCase() === "TRAINER" || t.role.toUpperCase() === "PERSONAL"
  );
  const availableTrainers = personalTrainers.length > 0 ? personalTrainers : staffTrainers.filter((t) => t.role.toUpperCase() !== "STUDENT");

  // Enrollment Dialog state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [duplicateResult, setDuplicateResult] = useState<{
    status: "IDLE" | "NOT_FOUND" | "EXISTING_USER_CAN_LINK" | "ALREADY_MEMBER";
    user?: { id: string; name: string | null; emailMasked: string | null; cpfMasked: string | null };
    memberId?: string;
  }>({ status: "IDLE" });

  const [registerForm, setRegisterForm] = useState({
    name: "",
    cpfCnpj: "",
    email: "",
    whatsapp: "",
    birthDate: "",
    gender: "MASCULINO",
    assignedStaffId: "",
    unitId: units.find(unit => unit.canManageStudents)?.id || "",
    plan: "Mensal",
    modality: "PRESENCIAL",
    registrationNumber: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    medicalClearance: false,
    notes: "",
    existingUserId: "",
    identityLinkProofId: "",
  });
  const [guardianForm, setGuardianForm] = useState({ name: "", cpf: "", phone: "", email: "", relationship: "PAI" });
  const registrationRequest = useRef<{ key: string; fingerprint: string } | null>(null);
  const registrationBirthDate = parseBirthDate(registerForm.birthDate);
  const registeringMinor = registrationBirthDate ? civilAge(registrationBirthDate) < 18 : false;
  const registrationHealth = units.find(unit => unit.id === registerForm.unitId)?.canManageHealth === true;
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);

  // Edit Dialog state (Padrão Personal)
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    whatsapp: "",
    assignedStaffId: "",
    emergencyContactPhone: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Status Change Dialog (Inativar / Ativar)
  const [studentToToggleStatus, setStudentToToggleStatus] = useState<StudentItem | null>(null);
  const [isToggleActiveOpen, setIsToggleActiveOpen] = useState(false);
  const [isSubmittingStatusToggle, setIsSubmittingStatusToggle] = useState(false);

  // Delete Alert Dialog
  const [studentToDelete, setStudentToDelete] = useState<StudentItem | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Fetch / Refresh students with current filters
  const fetchStudents = useCallback(async (page = 1) => {
    const requestId = ++listRequestId.current;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        workspaceId,
        page: String(page),
        limit: "20",
        status: selectedStatus,
      });

      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (selectedTrainer !== "ALL") params.set("assignedStaffId", selectedTrainer);
      if (selectedUnit !== "ALL") params.set("unitId", selectedUnit);

      const res = await fetch(`/api/gym/students?${params.toString()}`);
      if (!res.ok) throw new Error("Falha ao buscar alunos");

      const data = studentListSchema.parse(await res.json());
      if (requestId !== listRequestId.current) return;
      setStudents(data.students);
      setPagination(data.pagination);
      setListError(null);
    } catch (err) {
      if (requestId !== listRequestId.current) return;
      setListError(message(err, "Erro ao atualizar listagem de alunos."));
    } finally {
      if (requestId === listRequestId.current) setIsLoading(false);
    }
  }, [workspaceId, selectedStatus, selectedTrainer, selectedUnit, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => fetchStudents(1), 300);
    return () => { clearTimeout(timer); listRequestId.current++; };
  }, [fetchStudents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(1);
  };

  // Real-time automatic duplicate check as soon as CPF (11 digits) or valid email is typed
  useEffect(() => {
    if (!isRegisterOpen) return;
    const cleanCpf = registerForm.cpfCnpj.replace(/\D/g, "");
    const trimmedEmail = registerForm.email.trim();
    const isCpfComplete = cleanCpf.length === 11;
    const isEmailComplete = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

    if (!isCpfComplete && !isEmailComplete) {
      if (duplicateResult.status !== "IDLE") {
        setDuplicateResult({ status: "IDLE" });
        setRegisterForm((prev) => ({ ...prev, existingUserId: "", identityLinkProofId: "" }));
      }
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicate(true);
      try {
        const params = new URLSearchParams({ workspaceId });
        if (registerForm.unitId) params.set("unitId", registerForm.unitId);
        if (isCpfComplete) params.set("cpf", cleanCpf);
        if (isEmailComplete) params.set("email", trimmedEmail);

        const res = await fetch("/api/gym/students/check-duplicate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(Object.fromEntries(params)),
        });
        if (!res.ok) return;

        const data = z
          .object({
            status: z.enum(["NOT_FOUND", "EXISTING_USER_CAN_LINK", "ALREADY_MEMBER"]),
            user: z
              .object({
                id: z.string(),
                name: z.string().nullable(),
                emailMasked: z.string().nullable(),
                cpfMasked: z.string().nullable(),
              })
              .optional(),
            memberId: z.string().optional(),
          })
          .parse(await res.json());

        setDuplicateResult(data);
        if (data.status === "EXISTING_USER_CAN_LINK" && data.user) {
          setRegisterForm((prev) => ({
            ...prev,
            existingUserId: data.user!.id,
            name: data.user!.name || prev.name,
          }));
        } else {
          setRegisterForm((prev) => ({ ...prev, existingUserId: "" }));
        }
      } catch (err) {
        // quiet error on background check
      } finally {
        setIsCheckingDuplicate(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [isRegisterOpen, registerForm.cpfCnpj, registerForm.email, registerForm.unitId, workspaceId]);

  const [linkInvitation, setLinkInvitation] = useState<{ requestId: string; url: string; authorized: boolean } | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const issueLink = async () => {
    setLinkBusy(true);
    try {
      const res = await fetch("/api/gym/students/identity-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, unitId: registerForm.unitId, targetUserId: registerForm.existingUserId, email: registerForm.email || undefined, cpf: registerForm.cpfCnpj || undefined }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error?.message || "Convite não emitido.");
      setLinkInvitation({ requestId: body.requestId, url: new URL(body.path, window.location.origin).href, authorized: false });
      setRegisterForm(prev => ({ ...prev, identityLinkProofId: "" }));
    } catch (e) { toast.error(message(e, "Falha ao emitir convite.")); } finally { setLinkBusy(false); }
  };
  const checkLink = async () => {
    if (!linkInvitation) return; setLinkBusy(true);
    try { const res = await fetch("/api/gym/students/identity-link?" + new URLSearchParams({ workspaceId, requestId: linkInvitation.requestId }), { cache: "no-store" }); const body = await res.json(); if (!res.ok) throw new Error(body.error?.message || "Convite indisponível."); setLinkInvitation(prev => prev ? { ...prev, authorized: body.authorized } : prev); setRegisterForm(prev => ({ ...prev, existingUserId: body.authorized ? body.subjectUserId : prev.existingUserId, identityLinkProofId: body.authorized ? linkInvitation.requestId : "" })); toast.info(body.authorized ? "Titular autorizou o vínculo." : "Aguardando autorização do titular."); }
    catch (e) { toast.error(message(e, "Falha ao conferir autorização.")); } finally { setLinkBusy(false); }
  };
  // Submit assisted registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerForm.existingUserId && !registerForm.name.trim()) {
      toast.error("O nome do aluno é obrigatório.");
      return;
    }

    if (registerForm.existingUserId && !registerForm.identityLinkProofId) { toast.error("O titular deve autorizar o vínculo antes do cadastro."); return; }
    setIsSubmittingRegister(true);
    try {
      const payload = { workspaceId, ...registerForm, name: registerForm.name.trim() || undefined, ...(registeringMinor ? { guardian: { ...guardianForm, hasHealthAccess: false } } : {}), ...(registrationHealth ? { notes: registerForm.notes } : { notes: undefined, medicalClearance: undefined }) };
      const fingerprint = JSON.stringify(payload);
      if (!registrationRequest.current || registrationRequest.current.fingerprint !== fingerprint) registrationRequest.current = { key: crypto.randomUUID(), fingerprint };
      const res = await fetch("/api/gym/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotencyKey: registrationRequest.current.key }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao realizar matrícula");
      }

      toast.success("Aluno cadastrado. Contratação do plano e ativação são etapas próprias.");
      setIsRegisterOpen(false);
      resetRegisterForm();
      fetchStudents(1);
    } catch (err) {
      toast.error(message(err, "Falha no cadastro."));
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  const resetRegisterForm = () => {
    setRegisterForm({
      name: "",
      cpfCnpj: "",
      email: "",
      whatsapp: "",
      birthDate: "",
      gender: "MASCULINO",
      assignedStaffId: "",
      unitId: units.find(unit => unit.canManageStudents)?.id || "",
      plan: "Mensal",
      modality: "PRESENCIAL",
      registrationNumber: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      medicalClearance: false,
      notes: "",
      existingUserId: "",
      identityLinkProofId: "",
    });
    setGuardianForm({ name: "", cpf: "", phone: "", email: "", relationship: "PAI" });
    registrationRequest.current = null;
    setDuplicateResult({ status: "IDLE" });
    setLinkInvitation(null);
  };

  // Helper to format WhatsApp & Emergency phone masking: (XX) XXXXX-XXXX
  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 11);
    if (raw.length <= 2) return raw;
    if (raw.length <= 6) return `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    if (raw.length <= 10) return `(${raw.slice(0, 2)}) ${raw.slice(2, 6)}-${raw.slice(6)}`;
    return `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7, 11)}`;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((prev) => ({ ...prev, whatsapp: formatPhone(e.target.value) }));
  };

  const handleEmergencyPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((prev) => ({ ...prev, emergencyContactPhone: formatPhone(e.target.value) }));
  };

  // Open Edit Dialog
  const triggerEdit = (student: StudentItem) => {
    setSelectedStudent(student);
    setEditForm({
      name: student.name || "",
      whatsapp: formatPhone(student.whatsapp || ""),
      assignedStaffId: student.assignedStaffId || "",
      emergencyContactPhone: formatPhone(student.studentProfile?.emergencyContactPhone || ""),
    });
    setIsEditOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    if (!editForm.name.trim()) {
      toast.error("O nome do aluno é obrigatório.");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const res = await fetch(`/api/gym/students/${selectedStudent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: editForm.name.trim(),
          whatsapp: editForm.whatsapp.replace(/\D/g, "") || null,
          assignedStaffId: editForm.assignedStaffId || null,
          emergencyContactPhone: editForm.emergencyContactPhone.replace(/\D/g, "") || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao atualizar dados do aluno.");
      }

      toast.success("Informações do aluno atualizadas! 💾");
      setIsEditOpen(false);
      fetchStudents(pagination.page);
    } catch (err) {
      toast.error(message(err, "Falha na atualização."));
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Open Inactivate/Reactivate Dialog
  const triggerToggleActive = (student: StudentItem) => {
    setStudentToToggleStatus(student);
    setIsToggleActiveOpen(true);
  };

  // Toggle active/inactive status
  const handleToggleStatus = async () => {
    if (!studentToToggleStatus) return;

    setIsSubmittingStatusToggle(true);
    try {
      const newStatus = !studentToToggleStatus.isActive;
      const res = await fetch(`/api/gym/students/${studentToToggleStatus.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          isActive: newStatus,
          status: newStatus ? "ACTIVE" : "INACTIVE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao alterar situação.");
      }

      toast.success(
        studentToToggleStatus.isActive
          ? "Acesso do aluno inativado com sucesso!"
          : "Acesso do aluno reativado com sucesso!"
      );
      setIsToggleActiveOpen(false);
      setStudentToToggleStatus(null);
      fetchStudents(pagination.page);
    } catch (err) {
      toast.error(message(err, "Falha na alteração de situação."));
    } finally {
      setIsSubmittingStatusToggle(false);
    }
  };

  // Open Delete Dialog
  const triggerDelete = (student: StudentItem) => {
    setStudentToDelete(student);
    setIsDeleteOpen(true);
  };

  // Delete Student
  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    setIsSubmittingDelete(true);
    try {
      const res = await fetch(
        `/api/gym/students/${studentToDelete.id}?workspaceId=${workspaceId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Erro ao excluir aluno.");
      }

      toast.success("Aluno excluído com sucesso.");
      setIsDeleteOpen(false);
      setStudentToDelete(null);
      fetchStudents(pagination.page);
    } catch (err) {
      toast.error(message(err, "Falha ao excluir aluno."));
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <GymPageHeader
        title="Alunos"
        description={isTrainerRestricted ? "Acompanhe os alunos da sua carteira." : `Gerencie os alunos e as matrículas da ${workspaceName}.`}
        actions={
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-1 rounded-lg bg-secondary/30 p-1" role="group" aria-label="Filtrar situação dos alunos">
              {[{ value: "ALL", label: "Todos" }, { value: "ACTIVE", label: "Ativos" }, { value: "INACTIVE", label: "Inativos" }].map((status) => (
                <Button key={status.value} variant={selectedStatus === status.value ? "secondary" : "ghost"} size="sm" aria-pressed={selectedStatus === status.value} className={cn("h-8 flex-1 rounded-md px-3 sm:flex-none", selectedStatus === status.value && "bg-background shadow-sm")} onClick={() => setSelectedStatus(status.value)}>{status.label}</Button>
              ))}
            </div>
            {canManageStudents && <>
              <Button variant="outline" asChild className="h-10"><Link href="/gym/import">Importar alunos</Link></Button>
              <Button className="h-10 gap-2 font-medium" onClick={() => { resetRegisterForm(); setIsRegisterOpen(true); }}><Plus className="size-4" />Novo aluno</Button>
            </>}
          </div>
        }
      />

      <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <Select value={selectedUnit} onValueChange={setSelectedUnit}>
          <SelectTrigger aria-label="Filtrar unidade" className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="ALL">Unidades autorizadas</SelectItem>{units.map(unit => <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input type="search" aria-label="Buscar alunos" placeholder="Buscar por nome, matrícula, CPF ou contato..." className="h-10 bg-card pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        {!isTrainerRestricted && staffTrainers.length > 0 && (
          <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
            <SelectTrigger aria-label="Filtrar treinador responsável" className="w-full sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent><SelectGroup><SelectItem value="ALL">Todos os treinadores</SelectItem>{staffTrainers.map((trainer) => <SelectItem key={trainer.id} value={trainer.id}>{trainer.name}</SelectItem>)}</SelectGroup></SelectContent>
          </Select>
        )}
        {(searchTerm || selectedTrainer !== "ALL" || selectedStatus !== "ALL" || selectedUnit !== "ALL") && <Button type="button" variant="ghost" size="sm" onClick={() => { setSearchTerm(""); setSelectedTrainer("ALL"); setSelectedStatus("ALL"); setSelectedUnit("ALL"); }}>Limpar filtros</Button>}
        <p className="text-xs text-muted-foreground sm:ml-auto" aria-live="polite">{pagination.total} {pagination.total === 1 ? "aluno encontrado" : "alunos encontrados"}</p>
      </form>

      {listError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4"><p className="text-sm text-destructive">{listError}</p><Button variant="outline" size="sm" onClick={() => fetchStudents(pagination.page)}>Tentar novamente</Button></div>}

      {isLoading ? (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Carregando alunos">
          {Array.from({ length: 6 }, (_, index) => <Card key={index} className="gap-4 rounded-xl border-border/60 p-5 motion-safe:animate-pulse"><div className="flex items-center gap-3.5"><div className="size-11 rounded-full bg-muted" /><div className="flex-1 space-y-2"><div className="h-4 w-2/3 rounded bg-muted" /><div className="h-3 w-4/5 rounded bg-muted" /></div></div><div className="h-5 w-1/2 rounded bg-muted" /><div className="h-16 rounded bg-muted/50" /><div className="h-8 rounded bg-muted" /></Card>)}
        </div>
      ) : students.length === 0 ? (
        <GymEmptyState icon={Users} title="Nenhum aluno encontrado" description={searchTerm || selectedTrainer !== "ALL" || selectedStatus !== "ALL" ? "Ajuste a busca ou limpe os filtros para ver outros alunos." : "Cadastre o primeiro aluno para começar a acompanhar sua matrícula."} className="rounded-2xl border-2 border-dashed border-border bg-secondary/5 py-16" />
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
          {students.map((student) => (
            <Card key={student.id} className="group flex h-full flex-col justify-between overflow-hidden rounded-xl border border-border/60 bg-card p-0 shadow-xs transition-colors duration-200 hover:border-foreground/20">
              <CardContent className="flex h-full flex-col justify-between gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-3.5 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}`)} aria-label={`Ver perfil de ${student.name}`}>
                    <Avatar className="size-11 shrink-0 border border-border/40"><AvatarImage src={student.image || ""} alt={student.name} /><AvatarFallback className="bg-muted text-xs font-semibold text-muted-foreground">{student.name.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</AvatarFallback></Avatar>
                    <div className="min-w-0"><h3 className="truncate text-sm font-semibold leading-tight transition-colors group-hover:text-primary">{student.name}</h3><p className="mt-0.5 truncate text-xs text-muted-foreground">{student.email || "E-mail não informado"}</p></div>
                  </button>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="-mr-1.5 size-8 text-muted-foreground hover:text-foreground cursor-pointer" aria-label={`Ações de ${student.name}`}>
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}`)}>
                          <UserPlus className="mr-2 size-4 text-muted-foreground" /> Ver Perfil Completo
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}?tab=treinos`)}>
                          <Dumbbell className="mr-2 size-4 text-muted-foreground" /> Treinos
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}?tab=progresso`)}>
                          <LineChart className="mr-2 size-4 text-muted-foreground" /> Progresso
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}?tab=avaliacoes`)}>
                          <ClipboardCheck className="mr-2 size-4 text-muted-foreground" /> Avaliações
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}?tab=financeiro`)}>
                          <DollarSign className="mr-2 size-4 text-muted-foreground" /> Financeiro
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}?tab=arquivos`)}>
                          <Folder className="mr-2 size-4 text-muted-foreground" /> Arquivos
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="cursor-pointer" onClick={() => triggerEdit(student)}>
                          <Edit2 className="mr-2 size-4 text-muted-foreground" /> Editar informações
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className={cn("cursor-pointer", student.isActive ? "text-amber-500 focus:text-amber-600" : "text-emerald-500 focus:text-emerald-600")}
                          onClick={() => triggerToggleActive(student)}
                        >
                          <Ban className="mr-2 size-4" />
                          {student.isActive ? "Inativar acesso" : "Reativar acesso"}
                        </DropdownMenuItem>
                        {canManageStudents && (
                          <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => triggerDelete(student)}>
                            <Trash2 className="mr-2 size-4" /> Excluir aluno
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium", student.isActive ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "border-border/50 bg-muted text-muted-foreground")}><span className={cn("size-1.5 rounded-full", student.isActive ? "bg-emerald-500" : "bg-muted-foreground/60")} />{student.isActive ? "Ativo" : "Inativo"}</span>
                  <span className="text-[11px] font-medium text-muted-foreground">{student.plan} · {student.modality === "ONLINE" ? "Online" : "Presencial"}</span>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
                  <div className="min-w-0"><dt className="text-muted-foreground">Matrícula</dt><dd className="mt-0.5 truncate font-medium tabular-nums">{student.studentProfile?.registrationNumber || "Não informada"}</dd></div>
                  <div className="min-w-0"><dt className="text-muted-foreground">Treinador</dt><dd className="mt-0.5 truncate font-medium">{student.assignedStaff?.name || "Não atribuído"}</dd></div>
                  <div className="min-w-0"><dt className="text-muted-foreground">Telefone</dt><dd className="mt-0.5 font-medium">{student.whatsapp || "Não informado"}</dd></div>
                  <div className="min-w-0"><dt className="text-muted-foreground">Aluno desde</dt><dd className="mt-0.5 font-medium tabular-nums">{new Date(student.studentProfile?.enrolledAt || student.createdAt).toLocaleDateString("pt-BR")}</dd></div>
                </dl>

                <div className="mt-auto flex items-center gap-2 border-t border-border/40 pt-3">
                  <Button variant="secondary" size="sm" className="h-8 flex-1 gap-1.5 text-xs font-medium cursor-pointer" onClick={() => router.push(`/gym/students/${student.id}`)}>Ver perfil</Button>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border/60 px-3 text-xs font-medium text-muted-foreground hover:text-foreground" disabled={!student.whatsapp} asChild={Boolean(student.whatsapp)}>
                    {student.whatsapp ? <a href={studentWhatsAppUrl(student.whatsapp)} target="_blank" rel="noopener noreferrer" aria-label={`Abrir WhatsApp de ${student.name}`}><MessageCircle className="size-3.5" /><span>WhatsApp</span></a> : <><MessageCircle className="size-3.5" /><span>WhatsApp</span></>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
        <span className="text-xs text-muted-foreground">Mostrando {students.length} de {pagination.total} alunos</span>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={pagination.page <= 1 || isLoading} onClick={() => fetchStudents(pagination.page - 1)} className="h-8 gap-1"><ChevronLeft className="size-4" />Anterior</Button><span className="px-2 text-xs tabular-nums">{pagination.page} / {pagination.totalPages}</span><Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages || isLoading} onClick={() => fetchStudents(pagination.page + 1)} className="h-8 gap-1">Próxima<ChevronRight className="size-4" /></Button></div>
      </div>}

      {/* ========================================================================= */}
      {/* DIALOG: Nova Matrícula Assistida (Balcão de Recepção)                      */}
      {/* ========================================================================= */}
      <Dialog open={isRegisterOpen} onOpenChange={setIsRegisterOpen}>
        <DialogContent className="max-w-2xl sm:max-h-[calc(100dvh-3rem)] overflow-y-auto sm:overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo aluno</DialogTitle>
            <DialogDescription>
              Cadastre a pessoa e seu vínculo. O plano e seu aceite são contratados separadamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegisterSubmit} className="space-y-4 py-2">
            {units.length > 1 && (
              <div className="space-y-1">
                <label htmlFor="register-unit" className="text-sm font-medium">Unidade</label>
                <Select
                  value={registerForm.unitId}
                  onValueChange={(unitId) => setRegisterForm((prev) => ({ ...prev, unitId, assignedStaffId: "" }))}
                >
                  <SelectTrigger id="register-unit">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.filter((unit) => unit.canManageStudents).map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Real-time duplicate status banner */}
            {duplicateResult.status === "ALREADY_MEMBER" && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-start gap-2.5">
                <AlertCircle className="size-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Aluno já matriculado nesta academia</p>
                  <p className="mt-0.5 text-muted-foreground">
                    Este documento ou e-mail já possui vínculo cadastrado nesta academia. Localize-o na listagem principal.
                  </p>
                </div>
              </div>
            )}

            {duplicateResult.status === "EXISTING_USER_CAN_LINK" && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <p className="font-semibold">Conta AtlasFit localizada no ecossistema</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {duplicateResult.user?.name ? `${duplicateResult.user.name} • ` : ""}
                      {duplicateResult.user?.emailMasked || duplicateResult.user?.cpfMasked || "Identificado"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      A matrícula criará o vínculo com esta academia mantendo o cadastro e histórico do aluno intactos.
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={linkBusy} onClick={() => void issueLink()}>
                    Gerar link de autorização
                  </Button>
                  {linkInvitation && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-7 text-xs"
                        onClick={() => {
                          void navigator.clipboard.writeText(linkInvitation.url).then(() => toast.success("Link copiado.")).catch(() => toast.error("Copie o link pelo campo."));
                        }}
                      >
                        Copiar link
                      </Button>
                      <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={linkBusy} onClick={() => void checkLink()}>
                        Conferir autorização
                      </Button>
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {linkInvitation.authorized ? "✓ Autorizado pelo titular" : "Aguardando confirmação"}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Dados Pessoais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 [&>*]:min-w-0">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label htmlFor="register-cpf" className="text-sm font-medium">CPF</label>
                  {isCheckingDuplicate && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> Verificando...
                    </span>
                  )}
                </div>
                <Input
                  id="register-cpf"
                  placeholder="000.000.000-00"
                  value={registerForm.cpfCnpj}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, cpfCnpj: formatCPF(e.target.value) }))}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="register-name" className="text-sm font-medium">Nome completo</label>
                <Input
                  id="register-name"
                  required={!registerForm.existingUserId}
                  placeholder="Ex: João da Silva"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="register-whatsapp" className="text-sm font-medium">WhatsApp / Telefone</label>
                <Input
                  id="register-whatsapp"
                  placeholder="(00) 00000-0000"
                  value={registerForm.whatsapp}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, whatsapp: formatPhone(e.target.value) }))}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="register-email" className="text-sm font-medium">E-mail</label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="aluno@email.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="register-birth" className="text-sm font-medium">Nascimento</label>
                <Input
                  id="register-birth"
                  required={!registerForm.existingUserId}
                  type="date"
                  value={registerForm.birthDate}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, birthDate: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="register-staff" className="text-sm font-medium">Treinador responsável</label>
                <Select
                  value={registerForm.assignedStaffId || "NONE"}
                  onValueChange={(val) => setRegisterForm((prev) => ({ ...prev, assignedStaffId: val === "NONE" ? "" : val }))}
                >
                  <SelectTrigger id="register-staff" className="w-full min-w-0">
                    <SelectValue placeholder="Selecione um treinador" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="NONE">Sem atribuição</SelectItem>
                      {staffTrainers
                        .filter((staff) => !registerForm.unitId || staff.unitIds.includes(registerForm.unitId))
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.role})
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Responsável Legal (Apenas se menor) */}
            {registeringMinor && (
              <fieldset className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3.5">
                <legend className="px-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Responsável legal (Aluno menor de idade)
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="guardian-name" className="text-xs font-medium">Nome do responsável</label>
                    <Input
                      id="guardian-name"
                      required
                      placeholder="Ex: Carlos da Silva"
                      value={guardianForm.name}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="guardian-cpf" className="text-xs font-medium">CPF do responsável</label>
                    <Input
                      id="guardian-cpf"
                      required
                      placeholder="000.000.000-00"
                      value={guardianForm.cpf}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="guardian-phone" className="text-xs font-medium">Telefone</label>
                    <Input
                      id="guardian-phone"
                      required
                      placeholder="(00) 00000-0000"
                      value={guardianForm.phone}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="guardian-email" className="text-xs font-medium">E-mail (opcional)</label>
                    <Input
                      id="guardian-email"
                      type="email"
                      placeholder="responsavel@email.com"
                      value={guardianForm.email}
                      onChange={(e) => setGuardianForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="guardian-relationship" className="text-xs font-medium">Parentesco</label>
                    <Select
                      value={guardianForm.relationship}
                      onValueChange={(relationship) => setGuardianForm((prev) => ({ ...prev, relationship }))}
                    >
                      <SelectTrigger id="guardian-relationship">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAI">Pai</SelectItem>
                        <SelectItem value="MAE">Mãe</SelectItem>
                        <SelectItem value="TUTOR_LEGAL">Tutor legal</SelectItem>
                        <SelectItem value="OUTRO">Outro representante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>
            )}

            {/* Contato de Emergência */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0 [&>*]:min-w-0">
              <div className="space-y-1">
                <label className="text-xs font-medium">Contato de Emergência (Nome)</label>
                <Input
                  placeholder="Ex: Maria (Esposa)"
                  value={registerForm.emergencyContactName}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, emergencyContactName: e.target.value }))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium">Telefone de Emergência</label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={registerForm.emergencyContactPhone}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, emergencyContactPhone: formatPhone(e.target.value) }))}
                />
              </div>
            </div>

            {registrationHealth && (
              <div className="space-y-1">
                <label htmlFor="register-health-notes" className="text-xs font-medium">Observações de saúde</label>
                <Textarea
                  id="register-health-notes"
                  placeholder="Anotações internas sobre restrições ortopédicas ou observações..."
                  rows={2}
                  value={registerForm.notes}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisterOpen(false)}
                disabled={isSubmittingRegister}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmittingRegister || duplicateResult.status === "ALREADY_MEMBER"}
                className="gap-2"
              >
                {isSubmittingRegister ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando cadastro...
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4" />
                    Cadastrar aluno
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: Editar Aluno Simplificado (Padrão Personal)                       */}
      {/* ========================================================================= */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="size-5 text-primary" /> Editar Informações
            </DialogTitle>
            <DialogDescription>
              Modifique as informações cadastrais e o treinador do aluno.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                required
                className="bg-background border-border"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-whatsapp">WhatsApp</Label>
              <Input
                id="edit-whatsapp"
                placeholder="(11) 99999-9999"
                className="bg-background border-border"
                value={editForm.whatsapp}
                onChange={handleWhatsAppChange}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-trainer">Treinador Responsável</Label>
              <Select
                value={editForm.assignedStaffId || "NONE"}
                onValueChange={(val) =>
                  setEditForm((prev) => ({ ...prev, assignedStaffId: val === "NONE" ? "" : val }))
                }
                disabled={isTrainerRestricted}
              >
                <SelectTrigger id="edit-trainer" className="bg-background border-border w-full">
                  <SelectValue placeholder="Selecione o treinador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="NONE">Sem atribuição</SelectItem>
                    {availableTrainers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-emergency-phone">Contato de Emergência</Label>
              <Input
                id="edit-emergency-phone"
                placeholder="(11) 99999-9999"
                className="bg-background border-border"
                value={editForm.emergencyContactPhone}
                onChange={handleEmergencyPhoneChange}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditOpen(false)}
                disabled={isSubmittingEdit}
              >
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 font-medium" disabled={isSubmittingEdit}>
                {isSubmittingEdit ? (
                  <Loader2 className="animate-spin size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: Inativar / Reativar Acesso                                        */}
      {/* ========================================================================= */}
      <Dialog open={isToggleActiveOpen} onOpenChange={setIsToggleActiveOpen}>
        <DialogContent className="max-w-md bg-popover border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Ban className="size-5 text-amber-500" /> Confirmar Alteração
            </DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza que deseja <strong>{studentToToggleStatus?.isActive ? "inativar" : "ativar"}</strong> o acesso de <strong>{studentToToggleStatus?.name}</strong>?
              {studentToToggleStatus?.isActive && " O aluno não conseguirá fazer login ou acessar a academia."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setIsToggleActiveOpen(false)}
              disabled={isSubmittingStatusToggle}
            >
              Cancelar
            </Button>
            <Button
              className={cn(
                "gap-2 font-medium text-white",
                studentToToggleStatus?.isActive
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-emerald-500 hover:bg-emerald-600"
              )}
              disabled={isSubmittingStatusToggle}
              onClick={handleToggleStatus}
            >
              {isSubmittingStatusToggle && <Loader2 className="animate-spin size-4" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* ALERT DIALOG: Excluir Aluno Permanentemente                               */}
      {/* ========================================================================= */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent className="max-w-md bg-popover border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold flex items-center gap-2 text-destructive">
              <Trash2 className="size-5 text-destructive" /> Excluir Aluno Permanentemente
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Tem certeza que deseja excluir <strong>{studentToDelete?.name}</strong>? Esta ação removerá o aluno deste workspace de forma irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel disabled={isSubmittingDelete}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="gap-2 font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isSubmittingDelete}
              onClick={handleDeleteStudent}
            >
              {isSubmittingDelete && <Loader2 className="animate-spin size-4" />}
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
