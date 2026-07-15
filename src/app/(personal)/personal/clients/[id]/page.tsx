"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Plus,
  Dumbbell,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  Activity,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MessageCircle,
  CheckCircle2,
  Check,
  LineChart,
  ClipboardCheck,
  DollarSign,
  Folder,
  Trophy,
  ChevronDown,
  ChevronUp,
  User,
  Zap,
  Flame,
  ArrowUp,
  ArrowDown,
  Info,
  Timer,
  Heart,
  Camera,
  Scale,
  Ruler,
  TrendingUp,
  TrendingDown,
  Calendar,
  Image,
  Sparkles,
  Link2,
  FileText,
  Play,
  X
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PhysicalEvaluationFormModal } from "@/components/application/physical-evaluation-form-modal";
import { ExercisePreviewModal } from "@/components/application/exercise-preview-modal";
import { PhysicalEvaluationDetailModal } from "@/components/application/physical-evaluation-detail-modal";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from "recharts";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSnapshot } from "valtio";
import { workspaceStore } from "@/stores/workspace.store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Mapeamento dos dias da semana
const DAYS_OF_WEEK = [
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 0, label: "Domingo", short: "Dom" },
];

interface ClientProfilePageProps {
  params: Promise<{ id: string }>;
}

export default function ClientProfilePage({ params }: ClientProfilePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id: studentId } = use(params);

  // Active Workspace
  const workspaceSnap = useSnapshot(workspaceStore);
  const activeWorkspaceId = workspaceSnap.activeWorkspaceId;

  // Active Tab
  const defaultTab = searchParams.get("tab") || "treinos";
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Planning Tab States
  const [selectedPlanningDay, setSelectedPlanningDay] = useState<number>(1); // 1 = Segunda-feira
  const [planningViewMode, setPlanningViewMode] = useState<"day" | "week">("day");

  // Edit Workout - Grouping and Method States
  const [editGroups, setEditGroups] = useState<any[]>([]);
  const [editSelectedIndexes, setEditSelectedIndexes] = useState<number[]>([]);
  const [editSelectMode, setEditSelectMode] = useState(false);
  const [editGroupType, setEditGroupType] = useState<"BISET" | "TRISET" | "CIRCUIT">("BISET");
  const [editCircuitRounds, setEditCircuitRounds] = useState(3);
  const [editCircuitRest, setEditCircuitRest] = useState(60);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);

  // Edit Workout - Method Dialog States per exercise
  const [editMethodDialogOpen, setEditMethodDialogOpen] = useState(false);
  const [editActiveExerciseIndex, setEditActiveExerciseIndex] = useState<number | null>(null);
  const [editActiveMethodType, setEditActiveMethodType] = useState<"NONE" | "DROPSET" | "REST_PAUSE">("NONE");
  const [editDropsCount, setEditDropsCount] = useState(2);
  const [editDropsReduction, setEditDropsReduction] = useState(20);
  const [editRestPauseTime, setEditRestPauseTime] = useState(15);
  const [editRestPauseRounds, setEditRestPauseRounds] = useState(2);

  const getEditGroupLabel = (groupId: string) => {
    const group = editGroups.find((g) => g.id === groupId);
    if (!group) return "";
    const groupIndex = editGroups.findIndex((g) => g.id === groupId);
    const letter = String.fromCharCode(65 + groupIndex);
    const typeLabel = group.type === "BISET" ? "Biset" : group.type === "TRISET" ? "Triset" : "Circuito";
    return `${typeLabel} ${letter}`;
  };

  const handleOpenEditMethodDialog = (index: number) => {
    const ex = editExercises[index];
    setEditActiveExerciseIndex(index);
    setEditActiveMethodType(ex.methodType || "NONE");
    if (ex.methodType === "DROPSET") {
      setEditDropsCount(ex.methodConfig?.drops || 2);
      setEditDropsReduction(ex.methodConfig?.reduction || 20);
    } else if (ex.methodType === "REST_PAUSE") {
      setEditRestPauseTime(ex.methodConfig?.pause || 15);
      setEditRestPauseRounds(ex.methodConfig?.rounds || 2);
    } else {
      setEditDropsCount(2);
      setEditDropsReduction(20);
      setEditRestPauseTime(15);
      setEditRestPauseRounds(2);
    }
    setEditMethodDialogOpen(true);
  };

  const handleSaveEditMethod = () => {
    if (editActiveExerciseIndex === null) return;
    setEditExercises(prev => prev.map((ex, idx) => {
      if (idx !== editActiveExerciseIndex) return ex;
      let config = null;
      if (editActiveMethodType === "DROPSET") {
        config = { drops: Number(editDropsCount), reduction: Number(editDropsReduction) };
      } else if (editActiveMethodType === "REST_PAUSE") {
        config = { pause: Number(editRestPauseTime), rounds: Number(editRestPauseRounds) };
      }
      return {
        ...ex,
        methodType: editActiveMethodType,
        methodConfig: config
      };
    }));
    setEditMethodDialogOpen(false);
    setEditActiveExerciseIndex(null);
    toast.success("Método configurado com sucesso!");
  };

  const handleOpenEditGroupDialog = () => {
    if (editSelectedIndexes.length < 2) {
      toast.error("Selecione pelo menos 2 exercícios para agrupar.");
      return;
    }
    if (editSelectedIndexes.length >= 3) {
      setEditGroupType("TRISET");
    } else {
      setEditGroupType("BISET");
    }
    setEditGroupDialogOpen(true);
  };

  const handleConfirmEditGrouping = () => {
    const minRequired = editGroupType === "TRISET" ? 3 : 2;
    if (editSelectedIndexes.length < minRequired) {
      toast.error(`O método ${editGroupType} exige pelo menos ${minRequired} exercícios.`);
      return;
    }
    const tempGroupId = `group-${Date.now()}`;
    const newGroup = {
      id: tempGroupId,
      type: editGroupType,
      config: editGroupType === "CIRCUIT" ? { rounds: Number(editCircuitRounds), restBetweenRounds: Number(editCircuitRest) } : null
    };
    setEditGroups(prev => [...prev, newGroup]);
    setEditExercises(prev => prev.map((ex, idx) => {
      if (editSelectedIndexes.includes(idx)) {
        return { ...ex, groupId: tempGroupId };
      }
      return ex;
    }));
    setEditSelectedIndexes([]);
    setEditSelectMode(false);
    setEditGroupDialogOpen(false);
    toast.success("Exercícios agrupados com sucesso!");
  };

  const handleEditUngroup = (groupId: string) => {
    setEditExercises(prev => prev.map(ex => {
      if (ex.groupId === groupId) {
        const { groupId: _, ...rest } = ex;
        return rest;
      }
      return ex;
    }));
    setEditGroups(prev => prev.filter(g => g.id !== groupId));
    toast.success("Exercícios desagrupados!");
  };


  const [student, setStudent] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [studentWorkouts, setStudentWorkouts] = useState<any[]>([]);
  const [loadingWorkouts, setLoadingWorkouts] = useState(true);

  const [templates, setTemplates] = useState<any[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [expandedWorkouts, setExpandedWorkouts] = useState<string[]>([]);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState<any>(null);

  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [submittingDelete, setSubmittingDelete] = useState(false);

  const [assignType, setAssignType] = useState<"library" | "custom">("library");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [assignDayOfWeek, setAssignDayOfWeek] = useState("1");

  const [customName, setCustomName] = useState("");
  const [customGoal, setCustomGoal] = useState("Hipertrofia");
  const [customDifficulty, setCustomDifficulty] = useState("Intermediário");
  const [customDuration, setCustomDuration] = useState("60 min");
  const [customRestBetweenExercises, setCustomRestBetweenExercises] = useState("2 min");
  const [customMuscleGroup, setCustomMuscleGroup] = useState("");
  const [customExercises, setCustomExercises] = useState<any[]>([]);

  const [customMethodDialogOpen, setCustomMethodDialogOpen] = useState(false);
  const [customActiveExerciseIndex, setCustomActiveExerciseIndex] = useState<number | null>(null);
  const [customActiveMethodType, setCustomActiveMethodType] = useState<"NONE" | "DROPSET" | "REST_PAUSE">("NONE");
  const [customDropsCount, setCustomDropsCount] = useState(2);
  const [customDropsReduction, setCustomDropsReduction] = useState(20);
  const [customRestPauseTime, setCustomRestPauseTime] = useState(15);
  const [customRestPauseRounds, setCustomRestPauseRounds] = useState(2);

  const [dbExercises, setDbExercises] = useState<any[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(false);
  const [muscleGroups, setMuscleGroups] = useState<any[]>([]);
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState("");
  const [exerciseDialogOpen, setExerciseDialogOpen] = useState(false);
  const [tempSelected, setTempSelected] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editRestBetweenExercises, setEditRestBetweenExercises] = useState("2 min");
  const [editMuscleGroup, setEditMuscleGroup] = useState("");
  const [editDayOfWeek, setEditDayOfWeek] = useState("1");
  const [editExercises, setEditExercises] = useState<any[]>([]);
  const [previewExercise, setPreviewExercise] = useState<any>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const [progressHistory, setProgressHistory] = useState<any[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [submittingProgress, setSubmittingProgress] = useState(false);
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [submittingPhoto, setSubmittingPhoto] = useState(false);
  const [requestingUpdate, setRequestingUpdate] = useState(false);

  const [isDeleteProgressAlertOpen, setIsDeleteProgressAlertOpen] = useState(false);
  const [progressToDelete, setProgressToDelete] = useState<any>(null);
  const [submittingDeleteProgress, setSubmittingDeleteProgress] = useState(false);
  const [isDeletePhotoAlertOpen, setIsDeletePhotoAlertOpen] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState<any>(null);
  const [submittingDeletePhoto, setSubmittingDeletePhoto] = useState(false);

  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Form Medidas states
  const [progressDate, setProgressDate] = useState(getLocalDateString);
  const [progressWeight, setProgressWeight] = useState("");
  const [progressHeight, setProgressHeight] = useState("");
  const [progressBodyFat, setProgressBodyFat] = useState("");
  const [progressMuscleMass, setProgressMuscleMass] = useState("");
  const [progressChest, setProgressChest] = useState("");
  const [progressWaist, setProgressWaist] = useState("");
  const [progressAbdomen, setProgressAbdomen] = useState("");
  const [progressHips, setProgressHips] = useState("");
  const [progressRightArm, setProgressRightArm] = useState("");
  const [progressLeftArm, setProgressLeftArm] = useState("");
  const [progressRightForearm, setProgressRightForearm] = useState("");
  const [progressLeftForearm, setProgressLeftForearm] = useState("");
  const [progressRightThigh, setProgressRightThigh] = useState("");
  const [progressLeftThigh, setProgressLeftThigh] = useState("");
  const [progressRightCalf, setProgressRightCalf] = useState("");
  const [progressLeftCalf, setProgressLeftCalf] = useState("");
  const [progressNotes, setProgressNotes] = useState("");

  // Form Photo states
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoDate, setNewPhotoDate] = useState(getLocalDateString);
  const [newPhotoComment, setNewPhotoComment] = useState("");

  // ==================== NEW STATES: PHYSICAL EVALUATIONS ====================
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);
  const [isEvalModalOpen, setIsEvalModalOpen] = useState(false);
  const [selectedEval, setSelectedEval] = useState<any>(null);
  const [isEvalDetailModalOpen, setIsEvalDetailModalOpen] = useState(false);
  const [isDeleteEvalAlertOpen, setIsDeleteEvalAlertOpen] = useState(false);
  const [evalToDelete, setEvalToDelete] = useState<any>(null);
  const [submittingEval, setSubmittingEval] = useState(false);
  const [submittingDeleteEval, setSubmittingDeleteEval] = useState(false);

  // ==================== NEW STATES: INDIVIDUAL CLIENT WORKOUT FEEDBACK LOGS ====================
  const [workoutLogs, setWorkoutLogs] = useState<any[]>([]);
  const [loadingWorkoutLogs, setLoadingWorkoutLogs] = useState(false);
  const [dailyFeedbacks, setDailyFeedbacks] = useState<any[]>([]);

  // ==================== NEW STATES: INDIVIDUAL CLIENT FINANCIALS ====================
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentMetrics, setPaymentMetrics] = useState<any>({
    totalReceived: 0,
    totalPending: 0,
    totalOverdue: 0,
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditPaymentModalOpen, setIsEditPaymentModalOpen] = useState(false);
  const [isDeletePaymentAlertOpen, setIsDeletePaymentAlertOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<any>(null);

  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [submittingDeletePayment, setSubmittingDeletePayment] = useState(false);

  // ==================== NEW STATES: INDIVIDUAL CLIENT FINANCIALS RECURRENCE ====================
  const [recurrence, setRecurrence] = useState<any>(null);
  const [submittingRecurrence, setSubmittingRecurrence] = useState(false);
  const [isReopenPaymentAlertOpen, setIsReopenPaymentAlertOpen] = useState(false);
  const [paymentToReopen, setPaymentToReopen] = useState<any>(null);

  // Recurrence form fields
  const [recControlType, setRecControlType] = useState("MANUAL"); // MANUAL, CONFIRMATION, AUTOMATIC
  const [recPrice, setRecPrice] = useState("0");
  const [recPeriodicity, setRecPeriodicity] = useState("MENSAL");
  const [recCustomCount, setRecCustomCount] = useState("1");
  const [recCustomUnit, setRecCustomUnit] = useState("meses");
  const [recDueDay, setRecDueDay] = useState("10");
  const [recFirstDueDate, setRecFirstDueDate] = useState(getLocalDateString);
  const [recStartDate, setRecStartDate] = useState(getLocalDateString);
  const [recDescription, setRecDescription] = useState("Mensalidade de Assessoria");
  const [recCategory, setRecCategory] = useState("Mensalidade");
  const [recPaymentMethod, setRecPaymentMethod] = useState("PIX");
  const [recIsActive, setRecIsActive] = useState(true);

  const [paymentPlanName, setPaymentPlanName] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("pendente");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [paymentDate, setPaymentDate] = useState(getLocalDateString);

  // ==================== NEW STATES: INDIVIDUAL CLIENT FILES & DOCUMENTS ====================
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [fileFilter, setFileFilter] = useState("todos"); // "todos" | "exames" | "dieta_treino" | "outros"

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDeleteFileAlertOpen, setIsDeleteFileAlertOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<any>(null);

  const [submittingUpload, setSubmittingUpload] = useState(false);
  const [submittingDeleteFile, setSubmittingDeleteFile] = useState(false);

  // Upload Form states
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("exames"); // "exames" | "dieta_treino" | "outros"
  const [uploadType, setUploadType] = useState("file"); // "file" | "link"
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileSize, setUploadFileSize] = useState("");
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);



  // Load student profile
  useEffect(() => {
    if (searchParams.get("newEval") === "true") {
      setIsEvalModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    const fetchStudentProfile = async () => {
      try {
        setLoadingProfile(true);
        const res = await fetch(`/api/personal/clients/${studentId}?workspaceId=${activeWorkspaceId}`);
        if (!res.ok) {
          throw new Error("Não foi possível carregar o perfil do aluno.");
        }
        const data = await res.json();
        setStudent(data);
      } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Erro ao buscar dados do aluno.");
        router.push("/personal/clients");
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchStudentProfile();
  }, [studentId, activeWorkspaceId]);

  // Load student workouts & template library
  const fetchStudentWorkouts = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingWorkouts(true);
      const res = await fetch(`/api/personal/clients/${studentId}/workouts?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setStudentWorkouts(data);
        // Expand all workouts by default on load for visual clarity
        setExpandedWorkouts(data.map((w: any) => w.id));
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar treinos semanais.");
    } finally {
      setLoadingWorkouts(false);
    }
  };

  const fetchWorkspaceTemplates = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingTemplates(true);
      const res = await fetch(`/api/personal/workouts?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
        if (data.length > 0) {
          setSelectedTemplateId(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchStudentWorkouts();
      fetchWorkspaceTemplates();
    }
  }, [studentId, activeWorkspaceId]);

  // Fetch muscle groups for dynamic creation
  const loadMuscleGroups = async () => {
    if (muscleGroups.length > 0) return;
    try {
      const res = await fetch("/api/personal/workouts/muscle-groups");
      if (res.ok) {
        const data = await res.json();
        setMuscleGroups(data);
        if (data.length > 0) {
          setSelectedMuscleGroupId(data[0].id);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Fetch exercises when muscle group changes in dialog
  useEffect(() => {
    if (!selectedMuscleGroupId) return;

    const fetchExercises = async () => {
      try {
        setLoadingExercises(true);
        setSearchQuery("");
        const res = await fetch(`/api/personal/workouts/exercises?muscleGroupId=${selectedMuscleGroupId}`);
        if (res.ok) {
          const data = await res.json();
          setDbExercises(data);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingExercises(false);
      }
    };

    fetchExercises();
  }, [selectedMuscleGroupId]);

  // Toggle workout expansion
  const toggleExpandWorkout = (workoutId: string) => {
    setExpandedWorkouts((prev) =>
      prev.includes(workoutId)
        ? prev.filter((id) => id !== workoutId)
        : [...prev, workoutId]
    );
  };

  // WhatsApp click handler
  const handleWhatsAppClick = () => {
    if (student?.whatsapp) {
      const cleanPhone = student.whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/55${cleanPhone}`, "_blank");
    } else {
      toast.error("Este aluno não possui WhatsApp cadastrado.");
    }
  };

  // Custom Method Dialog Handlers
  const handleOpenCustomMethodDialog = (index: number) => {
    const ex = customExercises[index];
    setCustomActiveExerciseIndex(index);
    setCustomActiveMethodType(ex.methodType || "NONE");
    if (ex.methodType === "DROPSET") {
      setCustomDropsCount(ex.methodConfig?.drops || 2);
      setCustomDropsReduction(ex.methodConfig?.reduction || 20);
    } else if (ex.methodType === "REST_PAUSE") {
      setCustomRestPauseTime(ex.methodConfig?.pause || 15);
      setCustomRestPauseRounds(ex.methodConfig?.rounds || 2);
    } else {
      setCustomDropsCount(2);
      setCustomDropsReduction(20);
      setCustomRestPauseTime(15);
      setCustomRestPauseRounds(2);
    }
    setCustomMethodDialogOpen(true);
  };

  const handleSaveCustomMethod = () => {
    if (customActiveExerciseIndex === null) return;
    setCustomExercises(prev => prev.map((ex, idx) => {
      if (idx !== customActiveExerciseIndex) return ex;
      let config = null;
      if (customActiveMethodType === "DROPSET") {
        config = { drops: Number(customDropsCount), reduction: Number(customDropsReduction) };
      } else if (customActiveMethodType === "REST_PAUSE") {
        config = { pause: Number(customRestPauseTime), rounds: Number(customRestPauseRounds) };
      }
      return {
        ...ex,
        methodType: customActiveMethodType,
        methodConfig: config
      };
    }));
    setCustomMethodDialogOpen(false);
    setCustomActiveExerciseIndex(null);
    toast.success("Método configurado com sucesso!");
  };

  // Assign/Create Workout submit
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (assignType === "library" && !selectedTemplateId) {
      toast.warning("Por favor, selecione um modelo de treino da biblioteca.");
      return;
    }

    if (assignType === "custom" && !customName.trim()) {
      toast.warning("Por favor, informe o nome do treino exclusivo.");
      return;
    }

    try {
      setSubmittingAssign(true);
      const payload: any = {
        workspaceId: activeWorkspaceId,
        dayOfWeek: Number(assignDayOfWeek),
      };

      if (assignType === "library") {
        payload.cloneFromWorkoutId = selectedTemplateId;
      } else {
        payload.name = customName;
        payload.goal = customGoal;
        payload.difficulty = customDifficulty;
        payload.duration = customDuration;
        payload.restBetweenExercises = customRestBetweenExercises;
        payload.muscleGroupLabel = customMuscleGroup || "Geral";
        payload.exercises = customExercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          sets: Math.max(1, Number(ex.sets) || 1),
          reps: ex.reps,
          rest: ex.rest,
          load: ex.load || "",
          methodType: ex.methodType || "NONE",
          methodConfig: ex.methodConfig || null,
        }));
      }

      const res = await fetch(`/api/personal/clients/${studentId}/workouts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao atribuir treino.");
      }

      toast.success("Treino atribuído com sucesso!");
      setIsAssignModalOpen(false);

      // Reset forms
      setCustomName("");
      setCustomGoal("Hipertrofia");
      setCustomDifficulty("Intermediário");
      setCustomDuration("60 min");
      setCustomRestBetweenExercises("2 min");
      setCustomMuscleGroup("");
      setCustomExercises([]);

      fetchStudentWorkouts();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao associar treino.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  // Trigger Edit modal prep
  const handleTriggerEdit = (workout: any) => {
    setSelectedWorkoutToEdit(workout);
    setEditName(workout.name);
    setEditGoal(workout.goal);
    setEditDifficulty(workout.difficulty);
    setEditDuration(workout.duration);
    setEditRestBetweenExercises(workout.restBetweenExercises || "2 min");
    setEditMuscleGroup(workout.muscleGroupLabel || "Geral");
    setEditDayOfWeek(String(workout.dayOfWeek));

    // Load groups
    const loadedGroups = workout.exerciseGroups || [];
    setEditGroups(
      loadedGroups.map((g: any) => ({
        id: g.id,
        type: g.type,
        config: g.config,
      }))
    );

    setEditExercises(
      workout.exercises.map((ex: any) => {
        const repsStr = ex.reps || "10";
        const restStr = ex.rest || "60s";
        const loadStr = ex.load || "";

        const repsArr = String(repsStr).split(",").map((s: string) => s.trim());
        const restArr = String(restStr).split(",").map((s: string) => s.trim());
        const loadArr = String(loadStr).split(",").map((s: string) => s.trim());

        const isIndividual = repsArr.length > 1 || restArr.length > 1 || loadArr.length > 1;

        const individualSets = Array.from({ length: ex.sets }, (_, si) => ({
          reps: repsArr[si] || repsArr[0] || "10",
          rest: restArr[si] || restArr[0] || "60s",
          load: loadArr[si] || loadArr[0] || "",
        }));

        return {
          exerciseId: ex.exercise.id,
          name: ex.exercise.name,
          videoUrl: ex.exercise.videoUrl,
          muscleGroup: ex.exercise.muscleGroups && ex.exercise.muscleGroups.length > 0
            ? ex.exercise.muscleGroups.map((g: any) => g.name).join(", ")
            : (ex.exercise.muscleGroup?.name || "Geral"),
          sets: ex.sets,
          reps: repsStr,
          rest: restStr,
          load: loadStr,
          isIndividual,
          individualSets,
          methodType: ex.methodType || "NONE",
          methodConfig: ex.methodConfig || null,
          groupId: ex.groupId || null,
        };
      })
    );
    setIsEditModalOpen(true);
    loadMuscleGroups();
  };

  // Submit Edit Workout
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.warning("Por favor, preencha o nome do treino.");
      return;
    }

    try {
      setSubmittingEdit(true);
      const res = await fetch(`/api/personal/clients/${studentId}/workouts/${selectedWorkoutToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          goal: editGoal,
          difficulty: editDifficulty,
          duration: editDuration,
          restBetweenExercises: editRestBetweenExercises,
          muscleGroupLabel: editMuscleGroup,
          dayOfWeek: Number(editDayOfWeek),
          exercises: editExercises.map((ex) => ({
            exerciseId: ex.exerciseId,
            sets: Math.max(1, Number(ex.sets) || 1),
            reps: ex.reps,
            rest: ex.rest,
            load: ex.load || "",
            methodType: ex.methodType || "NONE",
            methodConfig: ex.methodConfig || null,
            groupId: ex.groupId || null,
          })),
          groups: editGroups.map((g) => ({
            id: g.id,
            type: g.type,
            config: g.config || null,
          })),
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao editar treino.");
      }

      toast.success("Treino atualizado com sucesso!");
      setIsEditModalOpen(false);
      fetchStudentWorkouts();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar alterações no treino.");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Trigger Delete workout
  const handleTriggerDelete = (workout: any) => {
    setWorkoutToDelete(workout);
    setIsDeleteAlertOpen(true);
  };

  // Submit Delete Workout
  const handleDeleteConfirm = async () => {
    if (!workoutToDelete) return;
    try {
      setSubmittingDelete(true);
      const res = await fetch(`/api/personal/clients/${studentId}/workouts/${workoutToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Erro ao excluir treino.");
      }

      toast.success("Treino desvinculado com sucesso.");
      setIsDeleteAlertOpen(false);
      fetchStudentWorkouts();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao remover treino.");
    } finally {
      setSubmittingDelete(false);
      setWorkoutToDelete(null);
    }
  };

  // Custom Exercise Builder Handlers
  const handleOpenExerciseDialog = () => {
    setTempSelected([]);
    setExerciseDialogOpen(true);
    loadMuscleGroups();
  };

  const handleToggleTempSelected = (exercise: any) => {
    if (tempSelected.some((ex) => ex.id === exercise.id)) {
      setTempSelected((prev) => prev.filter((ex) => ex.id !== exercise.id));
    } else {
      setTempSelected((prev) => [...prev, exercise]);
    }
  };

  const handleConfirmAddExercises = () => {
    const isEdit = isEditModalOpen;
    const targetSetter = isEdit ? setEditExercises : setCustomExercises;
    const currentList = isEdit ? editExercises : customExercises;

    const newExercises = tempSelected.map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      videoUrl: exercise.videoUrl,
      muscleGroup: muscleGroups.find((g) => g.id === selectedMuscleGroupId)?.name || "Geral",
      sets: 4,
      reps: "10",
      rest: "60s",
      load: "",
      isIndividual: false,
      individualSets: Array.from({ length: 4 }, () => ({
        reps: "10",
        load: "",
        rest: "60s",
      })),
    }));

    // Filter duplicates
    const filtered = newExercises.filter(
      (ne) => !currentList.some((se: any) => se.exerciseId === ne.exerciseId)
    );

    if (filtered.length < newExercises.length) {
      toast.info("Alguns exercícios já haviam sido adicionados e foram ignorados.");
    }

    targetSetter((prev) => [...prev, ...filtered]);
    setTempSelected([]);
    setExerciseDialogOpen(false);
    toast.success(`${filtered.length} exercício(s) adicionado(s) com sucesso!`);
  };

  const handleUpdateExerciseField = (index: number, field: string, value: any, isEdit: boolean) => {
    const setter = isEdit ? setEditExercises : setCustomExercises;
    setter((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;

        const updated = { ...ex, [field]: value };
        const isBodyweight = String(ex.load || "").toLowerCase().includes("p.c");

        // If updating sets, resize the individualSets array accordingly
        if (field === "sets") {
          if (value === "") {
            updated.sets = "";
          } else {
            const parsed = parseInt(value, 10);
            const setsCount = isNaN(parsed) ? 1 : Math.max(1, parsed);
            updated.sets = setsCount;
            const currentSets = ex.individualSets || [];

            const repsArr = String(ex.reps).split(",").map(s => s.trim());
            const loadArr = String(ex.load).split(",").map(s => s.trim());
            const restArr = String(ex.rest).split(",").map(s => s.trim());
            const fallbackReps = repsArr[0] || "10";
            const fallbackLoad = isBodyweight ? "p.c." : (loadArr[0] || "");
            const fallbackRest = restArr[0] || "60s";

            updated.individualSets = Array.from({ length: setsCount }, (_, si) => {
              if (currentSets[si]) {
                return {
                  reps: currentSets[si].reps,
                  load: currentSets[si].load,
                  rest: currentSets[si].rest
                };
              }
              const lastSet = currentSets[currentSets.length - 1];
              return {
                reps: lastSet?.reps || fallbackReps,
                load: lastSet?.load || fallbackLoad,
                rest: lastSet?.rest || fallbackRest
              };
            });

            if (updated.isIndividual) {
              updated.reps = updated.individualSets.map((s: any) => s.reps).join(", ");
              updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
              updated.rest = updated.individualSets.map((s: any) => s.rest).join(", ");
            }
          }
        }

        // If not customized individually, keep individualSets elements matched with uniform values
        if (!updated.isIndividual && updated.sets !== "") {
          updated.individualSets = Array.from({ length: Number(updated.sets) || 1 }, () => ({
            reps: updated.reps || "10",
            load: isBodyweight ? "p.c." : (updated.load || ""),
            rest: updated.rest || "60s",
          }));
        }

        return updated;
      })
    );
  };

  const handleUpdateIndividualSetField = (exerciseIndex: number, setIndex: number, field: string, value: string, isEdit: boolean) => {
    const setter = isEdit ? setEditExercises : setCustomExercises;
    setter((prev) =>
      prev.map((ex, i) => {
        if (i !== exerciseIndex) return ex;

        const updatedSets = (ex.individualSets || []).map((s: any, si: number) =>
          si === setIndex ? { ...s, [field]: value } : s
        );

        return {
          ...ex,
          individualSets: updatedSets,
          reps: updatedSets.map((s: any) => s.reps).join(", "),
          rest: updatedSets.map((s: any) => s.rest).join(", "),
          load: updatedSets.map((s: any) => s.load).join(", "),
        };
      })
    );
  };

  const handleToggleIndividual = (index: number, checked: boolean, isEdit: boolean) => {
    const setter = isEdit ? setEditExercises : setCustomExercises;
    setter((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;

        const updated = { ...ex, isIndividual: checked };
        const isBodyweight = String(ex.load || "").toLowerCase().includes("p.c");

        if (checked) {
          const repsArr = String(ex.reps).split(",").map((s) => s.trim());
          const restArr = String(ex.rest).split(",").map((s) => s.trim());
          const loadArr = String(ex.load).split(",").map((s) => s.trim());

          updated.individualSets = Array.from({ length: ex.sets }, (_, si) => ({
            reps: repsArr[si] || repsArr[0] || "10",
            rest: restArr[si] || restArr[0] || "60s",
            load: isBodyweight ? "p.c." : (loadArr[si] || loadArr[0] || ""),
          }));

          updated.reps = updated.individualSets.map((s: any) => s.reps).join(", ");
          updated.rest = updated.individualSets.map((s: any) => s.rest).join(", ");
          updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
        } else {
          const firstSet = ex.individualSets?.[0] || { reps: "10", rest: "60s", load: isBodyweight ? "p.c." : "" };
          const finalLoad = isBodyweight ? "p.c." : firstSet.load;
          updated.reps = firstSet.reps;
          updated.rest = firstSet.rest;
          updated.load = finalLoad;
          updated.individualSets = Array.from({ length: ex.sets }, () => ({
            reps: firstSet.reps,
            rest: firstSet.rest,
            load: finalLoad,
          }));
        }

        return updated;
      })
    );
  };

  const handleToggleBodyweight = (index: number, checked: boolean, isEdit: boolean) => {
    const setter = isEdit ? setEditExercises : setCustomExercises;
    setter((prev) =>
      prev.map((ex, i) => {
        if (i !== index) return ex;

        const loadVal = checked ? "p.c." : "";
        const updated = { ...ex };

        if (ex.isIndividual) {
          updated.individualSets = (ex.individualSets || []).map((s: any) => ({
            ...s,
            load: loadVal,
          }));
          updated.load = updated.individualSets.map((s: any) => s.load).join(", ");
        } else {
          updated.load = loadVal;
          updated.individualSets = Array.from({ length: Number(ex.sets) || 1 }, () => ({
            reps: ex.reps || "10",
            rest: ex.rest || "60s",
            load: loadVal,
          }));
        }

        return updated;
      })
    );
  };

  const removeExerciseFromCustomList = (index: number) => {
    setCustomExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExerciseFromEditList = (index: number) => {
    const removedEx = editExercises[index];
    const newList = editExercises.filter((_, i) => i !== index);

    if (removedEx.groupId) {
      const remainingInGroup = newList.filter(ex => ex.groupId === removedEx.groupId);
      if (remainingInGroup.length < 2) {
        setEditGroups(prev => prev.filter(g => g.id !== removedEx.groupId));
        newList.forEach(ex => {
          if (ex.groupId === removedEx.groupId) {
            delete ex.groupId;
          }
        });
      }
    }

    setEditExercises(newList);
  };

  // Reorder Exercises inside form builder
  const moveExerciseInCustom = (index: number, dir: "up" | "down") => {
    if (dir === "up" && index === 0) return;
    if (dir === "down" && index === customExercises.length - 1) return;
    const targetIdx = dir === "up" ? index - 1 : index + 1;
    const copy = [...customExercises];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setCustomExercises(copy);
  };

  const moveExerciseInEdit = (index: number, dir: "up" | "down") => {
    if (dir === "up" && index === 0) return;
    if (dir === "down" && index === editExercises.length - 1) return;
    const targetIdx = dir === "up" ? index - 1 : index + 1;
    const copy = [...editExercises];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    setEditExercises(copy);
  };

  // Render weekly layout
  const workoutsByDay = (dayVal: number) => {
    return studentWorkouts.filter((w) => w.dayOfWeek === dayVal);
  };

  // ==================== FETCHERS & EFFECT FOR PROGRESS ====================
  const fetchStudentProgress = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingProgress(true);
      const res = await fetch(`/api/personal/clients/${studentId}/progress?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setProgressHistory(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar histórico de progresso.");
    } finally {
      setLoadingProgress(false);
    }
  };

  const fetchStudentPhotos = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingPhotos(true);
      const res = await fetch(`/api/personal/clients/${studentId}/progress/photos?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar fotos de evolução.");
    } finally {
      setLoadingPhotos(false);
    }
  };

  // ==================== FETCHERS & EFFECT FOR EVALUATIONS ====================
  const fetchStudentEvaluations = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingEvaluations(true);
      const res = await fetch(`/api/personal/clients/${studentId}/evaluations?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setEvaluations(data);
      } else {
        toast.error("Erro ao carregar avaliações físicas.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar avaliações.");
    } finally {
      setLoadingEvaluations(false);
    }
  };

  const fetchStudentPayments = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingPayments(true);
      const res = await fetch(`/api/personal/clients/${studentId}/finance?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data.payments);
        setPaymentMetrics(data.metrics);
        setRecurrence(data.recurrence);
        if (data.recurrence) {
          setRecControlType(data.recurrence.billingControlType || "MANUAL");
          setRecPrice(String(data.recurrence.billingPrice || 0));
          setRecPeriodicity(data.recurrence.billingPeriodicity || "MENSAL");
          setRecCustomCount(String(data.recurrence.billingCustomIntervalCount || 1));
          setRecCustomUnit(data.recurrence.billingCustomIntervalUnit || "meses");
          setRecDueDay(String(data.recurrence.billingDueDay || 10));
          setRecFirstDueDate(data.recurrence.billingFirstDueDate || new Date().toISOString().split("T")[0]);
          setRecStartDate(data.recurrence.billingStartDate || new Date().toISOString().split("T")[0]);
          setRecDescription(data.recurrence.billingDescription || "Mensalidade de Assessoria");
          setRecCategory(data.recurrence.billingCategory || "Mensalidade");
          setRecPaymentMethod(data.recurrence.billingPaymentMethod || "PIX");
          setRecIsActive(data.recurrence.billingIsActive ?? true);
        }
      } else {
        toast.error("Erro ao carregar histórico financeiro.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro de conexão ao carregar financeiro.");
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchStudentFiles = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingFiles(true);
      const res = await fetch(`/api/personal/clients/${studentId}/files?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      } else {
        toast.error("Erro ao carregar arquivos.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao carregar central de arquivos.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const fetchStudentWorkoutLogs = async () => {
    if (!activeWorkspaceId) return;
    try {
      setLoadingWorkoutLogs(true);
      const res = await fetch(`/api/personal/clients/${studentId}/workout-logs?workspaceId=${activeWorkspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setWorkoutLogs(data.logs || []);
        setDailyFeedbacks(data.dailyFeedbacks || []);
      } else {
        toast.error("Erro ao carregar feedbacks de treinos.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Falha ao se conectar à API de feedbacks.");
    } finally {
      setLoadingWorkoutLogs(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadName.trim()) {
      toast.warning("Por favor, preencha o nome do arquivo ou documento.");
      return;
    }
    if (uploadType === "link" && !uploadUrl.trim()) {
      toast.warning("Por favor, informe a URL do link externo.");
      return;
    }
    if (uploadType === "file" && (!selectedFileObj || !uploadFileName)) {
      toast.warning("Por favor, selecione ou arraste um arquivo.");
      return;
    }

    try {
      setSubmittingUpload(true);

      let finalUrl = uploadUrl;
      let finalKey = null;
      let finalMimeType = null;
      let finalSize = null;

      if (uploadType === "file" && selectedFileObj) {
        // 1. Get presigned URL
        const presignedRes = await fetch("/api/storage/presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspaceId: activeWorkspaceId,
            studentId: studentId,
            fileName: selectedFileObj.name,
            contentType: selectedFileObj.type,
            fileSize: selectedFileObj.size,
            targetType: "student_file",
          }),
        });

        if (!presignedRes.ok) {
          const txt = await presignedRes.text();
          throw new Error(txt || "Erro ao obter URL de upload.");
        }

        const { uploadUrl: putUrl, fileUrl, objectKey } = await presignedRes.json();

        // 2. Put file to Cloudflare R2
        const putRes = await fetch(putUrl, {
          method: "PUT",
          headers: { "Content-Type": selectedFileObj.type },
          body: selectedFileObj,
        });

        if (!putRes.ok) {
          throw new Error("Erro no upload do arquivo para o servidor de armazenamento.");
        }

        finalUrl = fileUrl;
        finalKey = objectKey;
        finalMimeType = selectedFileObj.type;
        finalSize = selectedFileObj.size;
      }

      const payload = {
        workspaceId: activeWorkspaceId,
        name: uploadName,
        category: uploadCategory,
        type: uploadType,
        fileName: uploadType === "file" ? uploadFileName : null,
        fileSize: uploadType === "file" ? uploadFileSize : "Link",
        url: finalUrl,
        notes: uploadNotes.trim() || null,
        objectKey: finalKey,
        mimeType: finalMimeType,
        size: finalSize,
      };

      const res = await fetch(`/api/personal/clients/${studentId}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao salvar arquivo.");
      }

      toast.success("Arquivo enviado com sucesso!");

      // Reset form fields
      setUploadName("");
      setUploadCategory("exames");
      setUploadType("file");
      setUploadUrl("");
      setUploadNotes("");
      setUploadFileName("");
      setUploadFileSize("");
      setSelectedFileObj(null);
      setIsUploadModalOpen(false);

      fetchStudentFiles();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao enviar o arquivo.");
    } finally {
      setSubmittingUpload(false);
    }
  };

  const handleDeleteFileConfirm = async () => {
    if (!fileToDelete) return;
    try {
      setSubmittingDeleteFile(true);
      const res = await fetch(`/api/personal/clients/${studentId}/files/${fileToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao excluir arquivo.");
      }

      toast.success("Arquivo excluído com sucesso.");
      setIsDeleteFileAlertOpen(false);
      setFileToDelete(null);
      fetchStudentFiles();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao excluir arquivo.");
    } finally {
      setSubmittingDeleteFile(false);
    }
  };

  useEffect(() => {
    if (activeWorkspaceId && activeTab === "progresso") {
      fetchStudentProgress();
      fetchStudentPhotos();
    }
    if (activeWorkspaceId && activeTab === "avaliacoes") {
      fetchStudentEvaluations();
    }
    if (activeWorkspaceId && activeTab === "financeiro") {
      fetchStudentPayments();
    }
    if (activeWorkspaceId && activeTab === "arquivos") {
      fetchStudentFiles();
    }
    if (activeWorkspaceId && activeTab === "feedbacks") {
      fetchStudentWorkoutLogs();
    }
  }, [studentId, activeWorkspaceId, activeTab]);



  const handleTriggerDeleteEval = (evaluation: any) => {
    setEvalToDelete(evaluation);
    setIsDeleteEvalAlertOpen(true);
  };

  const handleDeleteEvalConfirm = async () => {
    if (!evalToDelete) return;
    try {
      setSubmittingDeleteEval(true);
      const res = await fetch(`/api/personal/clients/${studentId}/evaluations/${evalToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao excluir avaliação.");
      }

      toast.success("Avaliação excluída com sucesso.");
      setIsDeleteEvalAlertOpen(false);
      setEvalToDelete(null);
      fetchStudentEvaluations();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao excluir avaliação.");
    } finally {
      setSubmittingDeleteEval(false);
    }
  };

  // ==================== ACTIONS & HANDLERS FOR PROGRESS ====================
  const handleRequestUpdate = async () => {
    if (!activeWorkspaceId) {
      toast.error("Nenhum workspace ativo selecionado.");
      return;
    }
    try {
      setRequestingUpdate(true);
      const res = await fetch(`/api/personal/clients/${studentId}/progress/photos/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Erro ao enviar solicitação.");
      }

      toast.success("Solicitação de foto de progresso enviada com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao solicitar atualização.");
    } finally {
      setRequestingUpdate(false);
    }
  };

  const handleToggleLikePhoto = async (photoId: string, currentLiked: boolean) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, trainerLiked: !currentLiked } : p))
    );
    try {
      const res = await fetch(`/api/personal/clients/${studentId}/progress/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trainerLiked: !currentLiked }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar curtida.");
      toast.success(!currentLiked ? "Físico curtido!" : "Curtida removida.");
    } catch (error) {
      console.error(error);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, trainerLiked: currentLiked } : p))
      );
      toast.error("Erro ao curtir foto.");
    }
  };

  const handleUpdatePhotoComment = async (photoId: string, comment: string) => {
    try {
      const res = await fetch(`/api/personal/clients/${studentId}/progress/photos/${photoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar comentário.");
      toast.success("Comentário atualizado!");
      fetchStudentPhotos();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao salvar comentário.");
    }
  };

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressWeight && !progressBodyFat && !progressChest && !progressWaist && !progressAbdomen && !progressHips) {
      toast.warning("Por favor, preencha pelo menos um campo de medida.");
      return;
    }
    try {
      setSubmittingProgress(true);
      const res = await fetch(`/api/personal/clients/${studentId}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          date: progressDate,
          weight: progressWeight,
          height: progressHeight,
          bodyFat: progressBodyFat,
          muscleMass: progressMuscleMass,
          chest: progressChest,
          waist: progressWaist,
          abdomen: progressAbdomen,
          hips: progressHips,
          rightArm: progressRightArm,
          leftArm: progressLeftArm,
          rightForearm: progressRightForearm,
          leftForearm: progressLeftForearm,
          rightThigh: progressRightThigh,
          leftThigh: progressLeftThigh,
          rightCalf: progressRightCalf,
          leftCalf: progressLeftCalf,
          notes: progressNotes,
        }),
      });
      if (!res.ok) throw new Error(await res.text() || "Erro ao registrar progresso.");
      toast.success("Medidas corporais registradas com sucesso!");
      setIsProgressModalOpen(false);
      setProgressWeight("");
      setProgressHeight("");
      setProgressBodyFat("");
      setProgressMuscleMass("");
      setProgressChest("");
      setProgressWaist("");
      setProgressAbdomen("");
      setProgressHips("");
      setProgressRightArm("");
      setProgressLeftArm("");
      setProgressRightForearm("");
      setProgressLeftForearm("");
      setProgressRightThigh("");
      setProgressLeftThigh("");
      setProgressRightCalf("");
      setProgressLeftCalf("");
      setProgressNotes("");
      fetchStudentProgress();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar medidas.");
    } finally {
      setSubmittingProgress(false);
    }
  };

  const handleTriggerDeleteProgress = (prog: any) => {
    setProgressToDelete(prog);
    setIsDeleteProgressAlertOpen(true);
  };

  const handleDeleteProgressConfirm = async () => {
    if (!progressToDelete) return;
    try {
      setSubmittingDeleteProgress(true);
      const res = await fetch(`/api/personal/clients/${studentId}/progress/${progressToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir medida.");
      toast.success("Registro de medidas removido com sucesso.");
      setIsDeleteProgressAlertOpen(false);
      fetchStudentProgress();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao excluir registro.");
    } finally {
      setSubmittingDeleteProgress(false);
      setProgressToDelete(null);
    }
  };

  const handlePhotoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoUrl.trim()) {
      toast.warning("Por favor, selecione ou insira a URL da foto.");
      return;
    }
    try {
      setSubmittingPhoto(true);
      const res = await fetch(`/api/personal/clients/${studentId}/progress/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          photoUrl: newPhotoUrl,
          date: newPhotoDate,
          comment: newPhotoComment,
        }),
      });
      if (!res.ok) throw new Error(await res.text() || "Erro ao adicionar foto.");
      toast.success("Foto de evolução adicionada com sucesso!");
      setIsPhotoModalOpen(false);
      setNewPhotoUrl("");
      setNewPhotoComment("");
      fetchStudentPhotos();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao adicionar foto.");
    } finally {
      setSubmittingPhoto(false);
    }
  };

  const handleTriggerDeletePhoto = (photo: any) => {
    setPhotoToDelete(photo);
    setIsDeletePhotoAlertOpen(true);
  };

  const handleDeletePhotoConfirm = async () => {
    if (!photoToDelete) return;
    try {
      setSubmittingDeletePhoto(true);
      const res = await fetch(`/api/personal/clients/${studentId}/progress/photos/${photoToDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir foto.");
      toast.success("Foto removida da linha do tempo.");
      setIsDeletePhotoAlertOpen(false);
      fetchStudentPhotos();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao excluir foto.");
    } finally {
      setSubmittingDeletePhoto(false);
      setPhotoToDelete(null);
    }
  };

  // ==================== ACTIONS & HANDLERS FOR INDIVIDUAL CLIENT FINANCIALS ====================
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPlanName.trim() || !paymentAmount) {
      toast.warning("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/personal/clients/${studentId}/finance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          planName: paymentPlanName,
          amount: parseFloat(paymentAmount),
          status: paymentStatus,
          method: paymentMethod,
          createdAt: paymentDate,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao registrar faturamento.");
      }

      toast.success("Lançamento financeiro registrado com sucesso!");
      setIsPaymentModalOpen(false);

      // Reset form
      setPaymentPlanName("");
      setPaymentAmount("");
      setPaymentStatus("pendente");
      setPaymentMethod("PIX");
      setPaymentDate(new Date().toISOString().split("T")[0]);

      fetchStudentPayments();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao registrar faturamento.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleTriggerEditPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPaymentPlanName(payment.planName);
    setPaymentAmount(String(payment.amount));
    setPaymentStatus(payment.status);
    setPaymentMethod(payment.method);
    setPaymentDate(payment.createdAt.split("T")[0]);
    setIsEditPaymentModalOpen(true);
  };

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPlanName.trim() || !paymentAmount) {
      toast.warning("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await fetch(`/api/personal/finance/payments/${selectedPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: paymentPlanName,
          amount: parseFloat(paymentAmount),
          status: paymentStatus,
          method: paymentMethod,
          createdAt: paymentDate,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao editar faturamento.");
      }

      toast.success("Faturamento editado com sucesso!");
      setIsEditPaymentModalOpen(false);

      // Reset form
      setPaymentPlanName("");
      setPaymentAmount("");
      setPaymentStatus("pendente");
      setPaymentMethod("PIX");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setSelectedPayment(null);

      fetchStudentPayments();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao editar faturamento.");
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleTriggerDeletePayment = (payment: any) => {
    setPaymentToDelete(payment);
    setIsDeletePaymentAlertOpen(true);
  };

  const handleDeletePaymentConfirm = async () => {
    if (!paymentToDelete) return;
    try {
      setSubmittingDeletePayment(true);
      const res = await fetch(`/api/personal/finance/payments/${paymentToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao excluir faturamento.");
      }

      toast.success("Faturamento excluído com sucesso!");
      setIsDeletePaymentAlertOpen(false);
      setPaymentToDelete(null);
      fetchStudentPayments();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao excluir faturamento.");
    } finally {
      setSubmittingDeletePayment(false);
    }
  };

  const handleSaveRecurrence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingRecurrence(true);
      const res = await fetch(`/api/personal/clients/${studentId}/finance`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: activeWorkspaceId,
          billingControlType: recControlType,
          billingPrice: parseFloat(recPrice) || 0,
          billingPeriodicity: recPeriodicity,
          billingCustomIntervalCount: parseInt(recCustomCount) || 1,
          billingCustomIntervalUnit: recCustomUnit,
          billingDueDay: parseInt(recDueDay) || 10,
          billingFirstDueDate: recFirstDueDate ? new Date(recFirstDueDate).toISOString() : null,
          billingStartDate: recStartDate ? new Date(recStartDate).toISOString() : null,
          billingDescription: recDescription,
          billingCategory: recCategory,
          billingPaymentMethod: recPaymentMethod,
          billingIsActive: recIsActive,
          planEndDate: recControlType !== "MANUAL" ? new Date(recFirstDueDate).toISOString() : null,
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao salvar recorrência.");
      }

      toast.success("Configuração de recorrência atualizada!");
      fetchStudentPayments();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao salvar recorrência.");
    } finally {
      setSubmittingRecurrence(false);
    }
  };

  const handleReopenPaymentConfirm = async () => {
    if (!paymentToReopen) return;
    try {
      const res = await fetch(`/api/personal/finance/payments/${paymentToReopen.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pendente",
        }),
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Erro ao reabrir faturamento.");
      }

      toast.success("Cobrança reaberta com sucesso!");
      setIsReopenPaymentAlertOpen(false);
      setPaymentToReopen(null);
      fetchStudentPayments();
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao reabrir faturamento.");
    }
  };

  const CIRCUMFERENCES = [
    { key: "chest", label: "Peitoral" },
    { key: "waist", label: "Cintura" },
    { key: "abdomen", label: "Abdômen" },
    { key: "hips", label: "Quadril" },
    { key: "rightArm", label: "Braço Direito" },
    { key: "leftArm", label: "Braço Esquerdo" },
    { key: "rightForearm", label: "Antebraço Dir." },
    { key: "leftForearm", label: "Antebraço Esq." },
    { key: "rightThigh", label: "Coxa Direita" },
    { key: "leftThigh", label: "Coxa Esquerda" },
    { key: "rightCalf", label: "Panturrilha Dir." },
    { key: "leftCalf", label: "Panturrilha Esq." },
  ];

  const latestMed = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1] : null;
  const prevMed = progressHistory.length > 1 ? progressHistory[progressHistory.length - 2] : null;

  const getVariation = (field: string) => {
    if (!latestMed || !prevMed) return null;
    const curVal = latestMed[field];
    const preVal = prevMed[field];
    if (curVal === null || preVal === null || curVal === undefined || preVal === undefined) return null;
    return curVal - preVal;
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-300">

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/personal/clients" className="hover:text-foreground flex items-center transition-colors">
          <ChevronLeft className="size-4 mr-0.5" /> Voltar para Alunos
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Perfil do Aluno</span>
      </div>

      {/* Profile Header Block */}
      {loadingProfile ? (
        <Card className="border overflow-hidden bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md border border-border/30 dark:border-border/10 rounded-2xl">
          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6 relative">
            <Skeleton className="size-20 rounded-full bg-muted dark:bg-zinc-800/80 shrink-0" />
            <div className="flex-1 space-y-3 w-full flex flex-col items-center sm:items-start">
              <Skeleton className="h-7 w-48 bg-muted dark:bg-zinc-800/80 rounded-lg" />
              <Skeleton className="h-4 w-32 bg-muted dark:bg-zinc-800/80 rounded" />
              <div className="w-full flex gap-3 mt-2 pt-2 border-t border-border/50 dark:border-white/[0.04] justify-center sm:justify-start">
                <Skeleton className="h-5 w-24 bg-muted dark:bg-zinc-800/80 rounded" />
                <Skeleton className="h-5 w-28 bg-muted dark:bg-zinc-800/80 rounded" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border p-0 overflow-hidden relative shadow-2xl bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md border border-border/30 dark:border-border/10 rounded-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-border/30 dark:via-white/10 to-transparent" />
          <div className="absolute -top-24 -left-20 w-48 h-48 rounded-full bg-emerald-500/2 blur-[80px]" />
          <div className="absolute -bottom-24 -right-20 w-48 h-48 rounded-full bg-blue-500/2 blur-[80px]" />

          <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="relative group shrink-0">
                <div className="absolute inset-0 bg-linear-to-tr from-emerald-500 to-blue-500 rounded-full blur-sm opacity-15 group-hover:opacity-25 transition-opacity duration-500" />
                <Avatar className="size-20 border border-border dark:border-border/80 dark:border-white/8 shadow-2xl relative z-10 bg-muted dark:bg-zinc-900">
                  <AvatarImage src={student?.image} />
                  <AvatarFallback className="bg-linear-to-tr from-muted to-muted/80 text-foreground dark:from-zinc-900 dark:to-zinc-950 dark: font-medium text-2xl tracking-wide flex items-center justify-center">
                    {student?.avatarFallback}
                  </AvatarFallback>
                </Avatar>
                <span className={cn(
                  "absolute bottom-0 right-0 w-4.5 h-4.5 rounded-full border border-card dark:border-zinc-950 z-20 flex items-center justify-center shadow-lg",
                  student?.isActive ? "bg-emerald-500" : "bg-rose-500"
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </span>
              </div>

              <div className="space-y-2 flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-wrap justify-center sm:justify-start">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">{student?.name}</h1>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border w-fit mx-auto sm:mx-0",
                    student?.isActive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                  )}>
                    <span className={cn("w-1 h-1 rounded-full", student?.isActive ? "bg-emerald-400" : "bg-rose-400")} />
                    {student?.isActive ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground font-light">{student?.email}</p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-2.5 gap-x-4 pt-3.5 mt-1 border-t border-border/50 dark:border-white/[0.04] text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Plano:</span>
                    <strong className="text-foreground font-medium">{student?.plan || "Mensal"}</strong>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-muted/50 dark:bg-zinc-800 hidden sm:inline-block" />
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">Acesso:</span>
                    <strong className="text-foreground font-medium">{student?.lastActive}</strong>
                  </div>
                  {student?.streak > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted/50 dark:bg-zinc-800 hidden sm:inline-block" />
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400/90 font-medium">
                        <Flame className="size-3.5 fill-amber-500/10 animate-pulse mr-0.5" />
                        <span>{student?.streak} dias seguidos</span>
                      </div>
                    </>
                  )}
                  {student?.bestStreak > 0 && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted/50 dark:bg-zinc-800 hidden sm:inline-block" />
                      <div className="flex items-center gap-1 text-yellow-500/90 font-medium">
                        <Trophy className="size-3.5 mr-0.5" />
                        <span>Recorde: {student?.bestStreak} dias</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto shrink-0 flex justify-center mt-2 md:mt-0">
              <Button
                variant="outline"
                className="group gap-2 w-full sm:w-auto bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300 font-medium rounded-xl px-5 h-10 text-xs tracking-wider uppercase hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_20px_rgba(16,185,129,0.02)]"
                onClick={handleWhatsAppClick}
              >
                <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                <span>Conversar no WhatsApp</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Tabbed Layout Control */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted p-1 border border-border rounded-xl flex overflow-x-auto no-scrollbar whitespace-nowrap md:w-fit gap-1 w-full justify-start scrollbar-none scroll-smooth">
          <TabsTrigger
            value="treinos"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Dumbbell className="size-4 shrink-0" /> Treinos Semanais
          </TabsTrigger>
          <TabsTrigger
            value="progresso"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <LineChart className="size-4 shrink-0" /> Progresso Individual
          </TabsTrigger>
          <TabsTrigger
            value="avaliacoes"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <ClipboardCheck className="size-4 shrink-0" /> Avaliações
          </TabsTrigger>
          <TabsTrigger
            value="financeiro"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <DollarSign className="size-4 shrink-0" /> Financeiro
          </TabsTrigger>
          <TabsTrigger
            value="arquivos"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Folder className="size-4 shrink-0" /> Arquivos
          </TabsTrigger>
          <TabsTrigger
            value="feedbacks"
            className="gap-2 font-semibold text-xs sm:text-sm py-2 px-4 rounded-lg shrink-0 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold"
          >
            <Trophy className="size-4 shrink-0" /> Feedbacks de Treino
          </TabsTrigger>
        </TabsList>

        <TabsContent value="treinos" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Planejamento de Treino Semanal</h2>
              <p className="text-sm text-muted-foreground">Distribua os treinos do aluno ao longo da semana para acompanhamento fácil.</p>
            </div>
            <Button
              className="gap-2 max-sm:w-full font-bold px-4 shadow-md bg-blue-600 hover:bg-blue-500  border-none shrink-0 cursor-pointer"
              onClick={() => {
                loadMuscleGroups();
                setAssignDayOfWeek(String(selectedPlanningDay));
                setIsAssignModalOpen(true);
              }}
            >
              <Plus className="size-4" /> Atribuir / Criar Treino
            </Button>
          </div>

          {!loadingWorkouts && studentWorkouts.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-muted/10 dark:bg-zinc-900/10 p-3 rounded-2xl border border-border/30">
              {/* Display Mode Selector */}
              <div className="flex bg-muted/60 dark:bg-zinc-900/60 p-1 rounded-xl border border-border/40 w-fit shrink-0">
                <button
                  type="button"
                  onClick={() => setPlanningViewMode("day")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    planningViewMode === "day"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Visão por Dia
                </button>
                <button
                  type="button"
                  onClick={() => setPlanningViewMode("week")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                    planningViewMode === "week"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Semana Completa
                </button>
              </div>

              {/* Horizontal Day Selector Strip */}
              {planningViewMode === "day" && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 justify-start sm:justify-end w-full">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayWorkouts = workoutsByDay(day.value);
                    const hasWorkout = dayWorkouts.length > 0;
                    const isSelected = selectedPlanningDay === day.value;

                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setSelectedPlanningDay(day.value)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shrink-0",
                          isSelected
                            ? "bg-primary/10 border-primary text-primary ring-1 ring-primary/20"
                            : hasWorkout
                              ? "bg-card border-border hover:bg-muted/50 text-foreground"
                              : "bg-muted/10 border-border/30 text-muted-foreground/60 hover:bg-muted/20"
                        )}
                      >
                        <span>{day.short}</span>
                        {hasWorkout && (
                          <span className={cn(
                            "size-1.5 rounded-full",
                            isSelected ? "bg-primary" : "bg-blue-500"
                          )} />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {loadingWorkouts ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="border border-border/30 rounded-xl p-5 space-y-4 animate-pulse bg-muted/10 dark:bg-neutral-900/10">
                  <div className="h-6 w-40 bg-neutral-800 rounded" />
                  <div className="h-4 w-60 bg-neutral-800 rounded" />
                  <div className="h-20 bg-neutral-800/40 rounded-lg" />
                </div>
              ))}
            </div>
          ) : studentWorkouts.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-border/50 rounded-2xl bg-muted/10 dark:bg-neutral-900/10 flex flex-col items-center justify-center w-full mx-auto">
              <Dumbbell className="size-12 text-muted-foreground/60 mb-4 animate-bounce" />
              <h3 className="font-bold text-lg text-foreground mb-1">Nenhum treino atribuído</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm px-4">
                Este aluno ainda não possui uma agenda de treinos ativa. Clique abaixo para iniciar o planejamento.
              </p>
              <Button
                variant="outline"
                className="font-semibold border-border dark:border-neutral-800 cursor-pointer"
                onClick={() => {
                  loadMuscleGroups();
                  setAssignDayOfWeek(String(selectedPlanningDay));
                  setIsAssignModalOpen(true);
                }}
              >
                <Plus className="size-4 mr-2" /> Atribuir Primeiro Treino
              </Button>
            </div>
          ) : (
            // Weekly Layout Schedule
            <div className="space-y-6">
              {planningViewMode === "day" ? (
                (() => {
                  const dayWorkouts = workoutsByDay(selectedPlanningDay);
                  if (dayWorkouts.length === 0) {
                    return (
                      <div className="py-16 text-center border border-dashed border-border/60 rounded-2xl bg-muted/5 dark:bg-neutral-900/5 flex flex-col items-center justify-center p-6">
                        <Calendar className="size-8 text-muted-foreground/45 mb-3" />
                        <h3 className="font-bold text-sm text-foreground">Dia de Descanso ou Sem Treino</h3>
                        <p className="text-xs text-muted-foreground max-w-xs mt-1">
                          Não há treinos planejados para esta {DAYS_OF_WEEK.find(d => d.value === selectedPlanningDay)?.label.toLowerCase()}.
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-4 text-xs font-bold text-primary hover:bg-primary/5 rounded-lg border border-primary/20 cursor-pointer"
                          onClick={() => {
                            loadMuscleGroups();
                            setAssignDayOfWeek(String(selectedPlanningDay));
                            setIsAssignModalOpen(true);
                          }}
                        >
                          <Plus className="size-3.5 mr-1" /> Atribuir Treino para este dia
                        </Button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {dayWorkouts.map((workout) => {
                        const isExpanded = expandedWorkouts.includes(workout.id);
                        return (
                          <Card
                            key={workout.id}
                            className="bg-card dark:bg-zinc-950 p-0 border border-border dark:border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all shadow-md"
                          >
                            <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2.5 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-base text-foreground leading-tight">{workout.name}</h4>
                                    <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 bg-muted dark:bg-zinc-900 border-border text-muted-foreground rounded-md tracking-wider">
                                      {workout.muscleGroupLabel || "Geral"}
                                    </Badge>
                                    {(() => {
                                      const methodBadges = [];
                                      const hasDropset = workout.exercises?.some((ex: any) => ex.methodType === "DROPSET");
                                      const hasRestPause = workout.exercises?.some((ex: any) => ex.methodType === "REST_PAUSE");

                                      if (hasDropset) {
                                        methodBadges.push(
                                          <Badge key="dropset" className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/20 rounded-md tracking-wider">
                                            Dropset
                                          </Badge>
                                        );
                                      }
                                      if (hasRestPause) {
                                        methodBadges.push(
                                          <Badge key="rest_pause" className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-500/10 text-purple-400 border-purple-500/20 rounded-md tracking-wider">
                                            Rest-Pause
                                          </Badge>
                                        );
                                      }

                                      // Groups
                                      if (workout.exerciseGroups && workout.exerciseGroups.length > 0) {
                                        workout.exerciseGroups.forEach((g: any, gIdx: number) => {
                                          const letter = String.fromCharCode(65 + gIdx);
                                          const typeLabel = g.type === "BISET" ? "Biset" : g.type === "TRISET" ? "Triset" : "Circuito";
                                          methodBadges.push(
                                            <Badge key={g.id} className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-md tracking-wider">
                                              🔗 {typeLabel} {letter}
                                            </Badge>
                                          );
                                        });
                                      }

                                      return methodBadges;
                                    })()}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground font-medium">
                                    <span>{workout.goal}</span>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span>{workout.duration}</span>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span>{workout.difficulty}</span>
                                    <span className="text-muted-foreground/30">•</span>
                                    <span>Descanso: {workout.restBetweenExercises || "2 min"}</span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                    onClick={() => toggleExpandWorkout(workout.id)}
                                    title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                                  >
                                    {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                  </Button>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                                        <MoreVertical className="size-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 bg-muted dark:bg-zinc-900 border border-border dark:border-zinc-800">
                                      <DropdownMenuItem className="cursor-pointer font-medium" onClick={() => handleTriggerEdit(workout)}>
                                        <Edit2 className="mr-2 size-4 text-muted-foreground" /> Editar treino
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="bg-border dark:bg-neutral-850" />
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive cursor-pointer font-medium"
                                        onClick={() => handleTriggerDelete(workout)}
                                      >
                                        <Trash2 className="mr-2 size-4 text-destructive/80" /> Desvincular treino
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="border-t border-border dark:border-zinc-900 pt-4 mt-1 space-y-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Lista de Exercícios</span>
                                    <Badge className="bg-muted dark:bg-zinc-900 text-muted-foreground font-bold border border-border dark:border-zinc-800 text-[10px]">
                                      {workout.exercises?.length || 0} exercícios
                                    </Badge>
                                  </div>

                                  {(!workout.exercises || workout.exercises.length === 0) ? (
                                    <p className="text-xs text-muted-foreground py-2 text-center">Nenhum exercício cadastrado para este treino.</p>
                                  ) : (
                                    <div className="space-y-2 max-h-75 overflow-y-auto pr-1 scrollbar-thin">
                                      {workout.exercises.map((we: any, idx: number) => {
                                        const repsArr = String(we.reps || "10").split(",").map((s: string) => s.trim());
                                        const restArr = String(we.rest || "60s").split(",").map((s: string) => s.trim());
                                        const loadArr = String(we.load || "").split(",").map((s: string) => s.trim());

                                        return (
                                          <div
                                            key={we.id}
                                            className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-muted/35 dark:bg-zinc-900/35 border border-border/40 hover:bg-muted/65 dark:hover:bg-zinc-900/65 transition-colors"
                                          >
                                            <span className="flex items-center justify-center size-6 shrink-0 rounded-lg bg-muted dark:bg-zinc-900 border border-border/50 text-[10px] font-black text-muted-foreground">
                                              {idx + 1}
                                            </span>
                                            <div className="flex flex-col w-full gap-2.5 min-w-0">
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                  <span className="text-xs font-bold text-foreground block leading-none">
                                                    {we.exercise?.name}
                                                  </span>
                                                  {we.groupId && (
                                                    <Badge className="h-4 px-1.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                                                      🔗 {(() => {
                                                        const g = workout.exerciseGroups?.find((group: any) => group.id === we.groupId);
                                                        if (!g) return "Grupo";
                                                        const gIdx = workout.exerciseGroups?.findIndex((group: any) => group.id === we.groupId);
                                                        const letter = String.fromCharCode(65 + gIdx);
                                                        return `${g.type === "BISET" ? "Biset" : g.type === "TRISET" ? "Triset" : "Circuito"} ${letter}`;
                                                      })()}
                                                    </Badge>
                                                  )}
                                                  {we.methodType === "DROPSET" && (
                                                    <Badge className="h-4 px-1.5 text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                                                      Dropset {we.methodConfig?.drops && `(${we.methodConfig.drops}q -${we.methodConfig.reduction}%)`}
                                                    </Badge>
                                                  )}
                                                  {we.methodType === "REST_PAUSE" && (
                                                    <Badge className="h-4 px-1.5 text-[8px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                                                      Rest-Pause {we.methodConfig?.rounds && `(${we.methodConfig.rounds}r ${we.methodConfig.pause}s)`}
                                                    </Badge>
                                                  )}
                                                </div>
                                                <span className="text-[9px] text-muted-foreground/80 block truncate uppercase font-bold tracking-wider">
                                                  {we.exercise?.muscleGroups && we.exercise.muscleGroups.length > 0
                                                    ? we.exercise.muscleGroups.map((g: any) => g.name).join(", ")
                                                    : (we.exercise?.muscleGroup?.name || "Geral")}
                                                </span>
                                              </div>

                                              <div className="flex w-fit items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground bg-muted/60 dark:bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-border/60">
                                                <span className="font-bold text-foreground">{we.sets}</span>
                                                <span>séries</span>
                                                <span className="text-border/40">|</span>
                                                <span className="font-bold text-foreground">{repsArr[0] || "10"}</span>
                                                <span>reps</span>
                                                {loadArr[0] && (
                                                  <>
                                                    <span className="text-border/40">|</span>
                                                    {loadArr[0].toLowerCase().includes("p.c") ? (
                                                      <span className="font-bold text-primary">Peso do Corpo</span>
                                                    ) : (
                                                      <>
                                                        <span className="font-bold text-foreground">{loadArr[0]}</span>
                                                        <span>kg</span>
                                                      </>
                                                    )}
                                                  </>
                                                )}
                                                {restArr[0] && (
                                                  <>
                                                    <span className="text-border/40">|</span>
                                                    <span className="font-bold text-foreground">{restArr[0]}</span>
                                                    <span>desc</span>
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })()
              ) : (
                <div className="space-y-6">
                  {DAYS_OF_WEEK.map((day) => {
                    const dayWorkouts = workoutsByDay(day.value);
                    if (dayWorkouts.length === 0) return null;

                    return (
                      <div key={day.value} className="space-y-3 bg-muted/10 dark:bg-zinc-900/10 border border-border/30 rounded-2xl p-4 sm:p-5">
                        <div className="flex items-center gap-2 border-b border-border/30 dark:border-zinc-900 pb-2">
                          <span className="font-black text-sm text-primary uppercase tracking-wider">{day.label}</span>
                          <Badge variant="secondary" className="bg-primary/5 text-primary text-[9px] uppercase font-bold py-0 px-2 rounded-md">
                            {dayWorkouts.length} {dayWorkouts.length === 1 ? "Treino" : "Treinos"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {dayWorkouts.map((workout) => {
                            const isExpanded = expandedWorkouts.includes(workout.id);
                            return (
                              <Card
                                key={workout.id}
                                className="bg-card dark:bg-zinc-950 p-0 border border-border dark:border-zinc-900 rounded-2xl overflow-hidden hover:border-zinc-800 transition-all shadow-md"
                              >
                                <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full gap-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="space-y-2 min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-base text-foreground leading-tight">{workout.name}</h4>
                                        <Badge variant="outline" className="text-[9px] font-black uppercase px-2 py-0.5 bg-muted dark:bg-zinc-900 border-border text-muted-foreground rounded-md tracking-wider">
                                          {workout.muscleGroupLabel || "Geral"}
                                        </Badge>
                                        {(() => {
                                          const methodBadges = [];
                                          const hasDropset = workout.exercises?.some((ex: any) => ex.methodType === "DROPSET");
                                          const hasRestPause = workout.exercises?.some((ex: any) => ex.methodType === "REST_PAUSE");

                                          if (hasDropset) {
                                            methodBadges.push(
                                              <Badge key="dropset" className="text-[9px] font-black uppercase px-2 py-0.5 bg-amber-500/10 text-amber-400 border-amber-500/20 rounded-md tracking-wider">
                                                Dropset
                                              </Badge>
                                            );
                                          }
                                          if (hasRestPause) {
                                            methodBadges.push(
                                              <Badge key="rest_pause" className="text-[9px] font-black uppercase px-2 py-0.5 bg-purple-500/10 text-purple-400 border-purple-500/20 rounded-md tracking-wider">
                                                Rest-Pause
                                              </Badge>
                                            );
                                          }

                                          // Groups
                                          if (workout.exerciseGroups && workout.exerciseGroups.length > 0) {
                                            workout.exerciseGroups.forEach((g: any, gIdx: number) => {
                                              const letter = String.fromCharCode(65 + gIdx);
                                              const typeLabel = g.type === "BISET" ? "Biset" : g.type === "TRISET" ? "Triset" : "Circuito";
                                              methodBadges.push(
                                                <Badge key={g.id} className="text-[9px] font-black uppercase px-2 py-0.5 bg-blue-500/10 text-blue-400 border-blue-500/20 rounded-md tracking-wider">
                                                  🔗 {typeLabel} {letter}
                                                </Badge>
                                              );
                                            });
                                          }

                                          return methodBadges;
                                        })()}
                                      </div>

                                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground font-medium">
                                        <span>{workout.goal}</span>
                                        <span className="text-muted-foreground/30">•</span>
                                        <span>{workout.duration}</span>
                                        <span className="text-muted-foreground/30">•</span>
                                        <span>{workout.difficulty}</span>
                                        <span className="text-muted-foreground/30">•</span>
                                        <span>Descanso: {workout.restBetweenExercises || "2 min"}</span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                                        onClick={() => toggleExpandWorkout(workout.id)}
                                        title={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
                                      >
                                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                      </Button>

                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                                            <MoreVertical className="size-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 bg-muted dark:bg-zinc-900 border border-border dark:border-zinc-800">
                                          <DropdownMenuItem className="cursor-pointer font-medium" onClick={() => handleTriggerEdit(workout)}>
                                            <Edit2 className="mr-2 size-4 text-muted-foreground" /> Editar treino
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator className="bg-border dark:bg-neutral-850" />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive cursor-pointer font-medium"
                                            onClick={() => handleTriggerDelete(workout)}
                                          >
                                            <Trash2 className="mr-2 size-4 text-destructive/80" /> Desvincular treino
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>

                                  {isExpanded && (
                                    <div className="border-t border-border dark:border-zinc-900 pt-4 mt-1 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Lista de Exercícios</span>
                                        <Badge className="bg-muted dark:bg-zinc-900 text-muted-foreground font-bold border border-border dark:border-zinc-800 text-[10px]">
                                          {workout.exercises?.length || 0} exercícios
                                        </Badge>
                                      </div>

                                      {(!workout.exercises || workout.exercises.length === 0) ? (
                                        <p className="text-xs text-muted-foreground py-2 text-center">Nenhum exercício cadastrado para este treino.</p>
                                      ) : (
                                        <div className="space-y-2 max-h-75 overflow-y-auto pr-1 scrollbar-thin">
                                          {workout.exercises.map((we: any, idx: number) => {
                                            const repsArr = String(we.reps || "10").split(",").map((s: string) => s.trim());
                                            const restArr = String(we.rest || "60s").split(",").map((s: string) => s.trim());
                                            const loadArr = String(we.load || "").split(",").map((s: string) => s.trim());

                                            return (
                                              <div
                                                key={we.id}
                                                className="flex items-center justify-between gap-4 p-2.5 rounded-xl bg-muted/35 dark:bg-zinc-900/35 border border-border/40 hover:bg-muted/65 dark:hover:bg-zinc-900/65 transition-colors"
                                              >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                  <span className="flex items-center justify-center size-6 shrink-0 rounded-lg bg-muted dark:bg-zinc-900 border border-border/50 text-[10px] font-black text-muted-foreground">
                                                    {idx + 1}
                                                  </span>
                                                  <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                      {we.exercise?.videoUrl && (
                                                        <Button
                                                          type="button"
                                                          variant="ghost"
                                                          size="icon"
                                                          onClick={() => {
                                                            setPreviewExercise(we.exercise);
                                                            setIsPreviewModalOpen(true);
                                                          }}
                                                          className="h-5 w-5 text-primary hover:bg-primary/10 hover:text-primary rounded shrink-0 p-0"
                                                          title="Visualizar execução"
                                                        >
                                                          <Play className="size-3 fill-primary" />
                                                        </Button>
                                                      )}
                                                      <span className="text-xs font-bold text-foreground block leading-none">
                                                        {we.exercise?.name}
                                                      </span>
                                                      {we.groupId && (
                                                        <Badge className="h-4 px-1.5 text-[8px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded">
                                                          🔗 {(() => {
                                                            const g = workout.exerciseGroups?.find((group: any) => group.id === we.groupId);
                                                            if (!g) return "Grupo";
                                                            const gIdx = workout.exerciseGroups?.findIndex((group: any) => group.id === we.groupId);
                                                            const letter = String.fromCharCode(65 + gIdx);
                                                            return `${g.type === "BISET" ? "Biset" : g.type === "TRISET" ? "Triset" : "Circuito"} ${letter}`;
                                                          })()}
                                                        </Badge>
                                                      )}
                                                      {we.methodType === "DROPSET" && (
                                                        <Badge className="h-4 px-1.5 text-[8px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded">
                                                          Dropset {we.methodConfig?.drops && `(${we.methodConfig.drops}q -${we.methodConfig.reduction}%)`}
                                                        </Badge>
                                                      )}
                                                      {we.methodType === "REST_PAUSE" && (
                                                        <Badge className="h-4 px-1.5 text-[8px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded">
                                                          Rest-Pause {we.methodConfig?.rounds && `(${we.methodConfig.rounds}r ${we.methodConfig.pause}s)`}
                                                        </Badge>
                                                      )}
                                                    </div>
                                                    <span className="text-[9px] text-muted-foreground/80 block truncate uppercase font-bold tracking-wider">
                                                      {we.exercise?.muscleGroups && we.exercise.muscleGroups.length > 0
                                                        ? we.exercise.muscleGroups.map((g: any) => g.name).join(", ")
                                                        : (we.exercise?.muscleGroup?.name || "Geral")}
                                                    </span>
                                                  </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground bg-muted/60 dark:bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-border/60">
                                                  <span className="font-bold text-foreground">{we.sets}</span>
                                                  <span>séries</span>
                                                  <span className="text-border/40">|</span>
                                                  <span className="font-bold text-foreground">{repsArr[0] || "10"}</span>
                                                  <span>reps</span>
                                                  {loadArr[0] && (
                                                    <>
                                                      <span className="text-border/40">|</span>
                                                      {loadArr[0].toLowerCase().includes("p.c") ? (
                                                        <span className="font-bold text-primary">Peso do Corpo</span>
                                                      ) : (
                                                        <>
                                                          <span className="font-bold text-foreground">{loadArr[0]}</span>
                                                          <span>kg</span>
                                                        </>
                                                      )}
                                                    </>
                                                  )}
                                                  {restArr[0] && (
                                                    <>
                                                      <span className="text-border/40">|</span>
                                                      <span className="font-bold text-foreground">{restArr[0]}</span>
                                                      <span>desc</span>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 2: INDIVIDUAL PROGRESS & TIMELINE ==================== */}
        <TabsContent value="progresso" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/30 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Scale className="size-5 text-primary" /> Progresso e Evolução do Aluno
              </h2>
              <p className="text-sm text-muted-foreground">Monitore o histórico de medidas corporais, composição física e registro fotográfico.</p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                onClick={() => setIsProgressModalOpen(true)}
                className="bg-primary text-neutral-950 hover:bg-primary/95 font-bold text-xs flex-1 sm:flex-none"
              >
                <Plus className="size-4 mr-1" /> Registrar Medidas
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsPhotoModalOpen(true)}
                className="border-border dark:border-neutral-800 text-foreground hover:bg-muted dark:hover:bg-neutral-900 font-bold text-xs flex-1 sm:flex-none"
              >
                <Camera className="size-4 mr-1 text-primary" /> Adicionar Foto
              </Button>
            </div>
          </div>

          {/* 1. VISUAL TIMELINE CAROUSEL OF PHOTOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                Linha do Tempo Visual de Evolução
              </span>
              <Badge className="bg-muted dark:bg-neutral-900 border border-border dark:border-neutral-800 text-muted-foreground text-[10px] font-bold">
                {photos.length} Fotos Registradas
              </Badge>
            </div>

            <Card className="border border-border/30 bg-card dark:bg-neutral-950 p-6 relative overflow-hidden">

              {loadingPhotos ? (
                <div className="flex gap-6 overflow-x-auto pb-4 pt-2">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="w-48 shrink-0 space-y-3">
                      <Skeleton className="h-60 bg-muted dark:bg-neutral-900 w-full rounded-xl" />
                      <Skeleton className="h-4 bg-muted dark:bg-neutral-900 w-24" />
                    </div>
                  ))}
                </div>
              ) : photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center relative z-10">
                  <div className="p-3 bg-muted dark:bg-neutral-900 rounded-full text-muted-foreground mb-3">
                    <Image className="size-8 text-muted-foreground/60" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Nenhuma foto de evolução ainda</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Adicione fotos ou clique em "Solicitar Foto" para enviar uma notificação de atualização ao aluno.
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={requestingUpdate}
                      onClick={handleRequestUpdate}
                      className="text-xs bg-popover border-border text-foreground font-bold hover:bg-muted/80 dark:hover:bg-neutral-800"
                    >
                      {requestingUpdate ? <Loader2 className="size-3 mr-1 animate-spin" /> : null}
                      Solicitar Foto
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setIsPhotoModalOpen(true)}
                      className="text-xs bg-primary text-neutral-950 font-bold hover:bg-primary/90"
                    >
                      Adicionar Foto
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-6 overflow-x-auto pb-4 pt-2 scrollbar-thin relative z-10 no-scrollbar">
                  {photos.map((p) => (
                    <div key={p.id} className="w-48 shrink-0 relative group">
                      {/* Photo card block */}
                      <div className="w-full bg-muted dark:bg-neutral-900 border border-border/80 dark:border-neutral-800/80 rounded-xl p-2 shadow-xl hover:border-primary/50 hover:shadow-primary/5 transition-all duration-300 flex flex-col gap-2">
                        <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-card dark:bg-neutral-950">
                          <img
                            src={p.photoUrl}
                            alt={`Evolução ${new Date(p.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}`}
                            className="object-cover w-full h-full"
                          />
                          {/* Trash Delete Overlay */}
                          <button
                            type="button"
                            onClick={() => handleTriggerDeletePhoto(p)}
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-card dark:bg-neutral-950/80 text-destructive border border-border dark:border-neutral-800 opacity-0 group-hover:opacity-100 transition-opacity active:scale-90"
                            title="Remover foto"
                          >
                            <Trash2 className="size-3.5" />
                          </button>

                          {/* Heart Button Overlay */}
                          <button
                            type="button"
                            onClick={() => handleToggleLikePhoto(p.id, p.trainerLiked)}
                            className={cn(
                              "absolute bottom-2 right-2 p-1.5 rounded-full border shadow-md active:scale-90 transition-all backdrop-blur-sm",
                              p.trainerLiked
                                ? "bg-red-500 border-red-400 "
                                : "bg-card dark:bg-neutral-950/70 border-border dark:border-neutral-800 text-muted-foreground hover:"
                            )}
                            title={p.trainerLiked ? "Remover curtida" : "Curtir evolução"}
                          >
                            <Heart className={cn("size-3.5", p.trainerLiked ? "fill-current" : "")} />
                          </button>
                        </div>

                        {/* Date underneath */}
                        <div className="px-1 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Calendar className="size-3 text-primary shrink-0" />
                            {new Date(p.date).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              timeZone: "UTC",
                            })}
                          </span>
                        </div>

                        {/* Comment Input */}
                        <div className="px-1">
                          <input
                            type="text"
                            defaultValue={p.comment || ""}
                            placeholder="Adicionar feedback..."
                            className="w-full bg-card dark:bg-neutral-950 border border-border/80 dark:border-neutral-800/80 text-[10px] rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                            onBlur={(e) => handleUpdatePhotoComment(p.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleUpdatePhotoComment(p.id, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Request Photo Card inside Timeline */}
                  <div className="w-48 shrink-0 relative group">
                    <div className="w-full bg-muted/40 dark:bg-neutral-900/40 border border-dashed border-border dark:border-neutral-800 rounded-xl p-3 flex flex-col items-center justify-center aspect-[3/4] text-center gap-2 hover:bg-muted dark:bg-muted dark:bg-neutral-900/60 transition-colors">
                      <div className="p-2 rounded-full bg-primary/10 text-primary">
                        <Camera className="size-5" />
                      </div>
                      <span className="text-xs font-bold text-foreground">Solicitar Foto</span>
                      <p className="text-[9px] text-muted-foreground leading-normal max-w-[120px]">
                        Peça para o aluno enviar uma foto do físico atual
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={requestingUpdate}
                        onClick={handleRequestUpdate}
                        className="w-full text-[10px] h-7 bg-card dark:bg-neutral-950 border-border dark:border-neutral-800 text-foreground font-bold hover:bg-muted dark:bg-neutral-900 mt-1"
                      >
                        {requestingUpdate ? (
                          <>
                            <Loader2 className="size-3 mr-1 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          "Solicitar agora"
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsPhotoModalOpen(true)}
                        className="w-full text-[9px] h-6 text-muted-foreground hover:text-foreground font-semibold flex items-center justify-center gap-0.5"
                      >
                        <Plus className="size-2.5" /> Registrar Foto
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* 2. CHARTS & VARIATION METRICS BLOCK */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Charts Left Column */}
            <div className="lg:col-span-7 space-y-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="size-4 text-primary shrink-0" /> Histórico Gráfico Individual
              </span>
              <Card className="border border-border/30 bg-card dark:bg-neutral-950 p-6 flex flex-col min-h-[380px] justify-between">
                {loadingProgress ? (
                  <div className="space-y-4 w-full h-[300px] flex flex-col justify-center">
                    <Skeleton className="h-6 bg-muted dark:bg-neutral-900 w-32" />
                    <Skeleton className="h-[220px] bg-muted dark:bg-neutral-900 w-full rounded-xl" />
                  </div>
                ) : progressHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center h-full">
                    <div className="p-3 bg-muted dark:bg-neutral-900 rounded-full text-muted-foreground mb-3">
                      <Scale className="size-8 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">Sem dados históricos</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                      Adicione a primeira avaliação antropométrica para começar a traçar as curvas de evolução de peso e gordura corporal do seu aluno.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsProgressModalOpen(true)}
                      className="bg-primary text-neutral-950 font-bold hover:bg-primary/90 text-xs"
                    >
                      <Plus className="size-3.5 mr-1" /> Registrar Medidas
                    </Button>
                  </div>
                ) : (
                  <Tabs defaultValue="pesoChart" className="w-full space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <TabsList className="bg-muted border border-border p-0.5">
                        <TabsTrigger
                          value="pesoChart"
                          className="data-[state=active]:bg-background text-xs font-semibold py-1 px-3"
                        >
                          Peso Corporal (kg)
                        </TabsTrigger>
                        <TabsTrigger
                          value="bfChart"
                          className="data-[state=active]:bg-background text-xs font-semibold py-1 px-3"
                        >
                          Gordura Corporal (%)
                        </TabsTrigger>
                      </TabsList>
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                        Evolução Recente
                      </span>
                    </div>

                    <TabsContent value="pesoChart" className="outline-none">
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={progressHistory.map((item) => ({
                              date: new Date(item.date).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              }),
                              weight: item.weight || 0,
                            }))}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              labelClassName="text-[10px] font-bold text-muted-foreground"
                              itemStyle={{ color: "#0ea5e9", fontSize: "11px", fontWeight: "bold" }}
                            />
                            <Area
                              type="monotone"
                              dataKey="weight"
                              name="Peso"
                              stroke="#0ea5e9"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#weightGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>

                    <TabsContent value="bfChart" className="outline-none">
                      <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={progressHistory.map((item) => ({
                              date: new Date(item.date).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              }),
                              bf: item.bodyFat || 0,
                            }))}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="bfGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#eab308" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} domain={["auto", "auto"]} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: "hsl(var(--popover))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "8px",
                              }}
                              labelClassName="text-[10px] font-bold text-muted-foreground"
                              itemStyle={{ color: "#eab308", fontSize: "11px", fontWeight: "bold" }}
                            />
                            <Area
                              type="monotone"
                              dataKey="bf"
                              name="Gordura"
                              stroke="#eab308"
                              strokeWidth={2.5}
                              fillOpacity={1}
                              fill="url(#bfGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </TabsContent>
                  </Tabs>
                )}
              </Card>
            </div>

            {/* Comparison Cards Right Column */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="size-4 text-primary shrink-0" /> Circunferências e Comparação
                </span>
                {prevMed && (
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[9px] font-bold">
                    Últimas 2 Medições
                  </Badge>
                )}
              </div>

              <Card className="border border-border/30 bg-card dark:bg-neutral-950 p-4">
                {loadingProgress ? (
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 4, 5, 6].map((x) => (
                      <Skeleton key={x} className="h-16 bg-muted dark:bg-neutral-900 w-full rounded-lg" />
                    ))}
                  </div>
                ) : !latestMed ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center h-full text-muted-foreground text-xs">
                    <Activity className="size-8 text-neutral-700 mb-2" />
                    Cadastre uma medida para ver as comparações corporais.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Weight and BF comparative badges */}
                    <div className="grid grid-cols-2 gap-3 p-3 bg-muted dark:bg-neutral-900 rounded-xl border border-border dark:border-neutral-800">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Peso</span>
                        <span className="text-sm font-extrabold text-foreground">{latestMed.weight ? `${latestMed.weight} kg` : "--"}</span>
                        {(() => {
                          const diff = getVariation("weight");
                          if (diff === null) return null;
                          return (
                            <span className={cn(
                              "text-[10px] font-bold flex items-center gap-0.5 mt-0.5",
                              diff > 0 ? "text-emerald-600 dark:text-emerald-400" : diff < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                            )}>
                              {diff > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                              {diff > 0 ? `+${diff.toFixed(1)}kg` : `${diff.toFixed(1)}kg`}
                            </span>
                          );
                        })()}
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground block uppercase">Gordura (BF)</span>
                        <span className="text-sm font-extrabold text-foreground">{latestMed.bodyFat ? `${latestMed.bodyFat}%` : "--"}</span>
                        {(() => {
                          const diff = getVariation("bodyFat");
                          if (diff === null) return null;
                          return (
                            <span className={cn(
                              "text-[10px] font-bold flex items-center gap-0.5 mt-0.5",
                              diff < 0 ? "text-emerald-600 dark:text-emerald-400" : diff > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
                            )}>
                              {diff > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                              {diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Scrollable list of circumferences */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-2 gap-2 h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                      {CIRCUMFERENCES.map((circ) => {
                        const curVal = latestMed[circ.key];
                        const diff = getVariation(circ.key);
                        return (
                          <div
                            key={circ.key}
                            className="bg-muted dark:bg-muted dark:bg-neutral-900/60 hover:bg-muted dark:bg-neutral-900 border border-border/80 dark:border-neutral-800/80 rounded-lg p-2 flex flex-col justify-between transition-colors"
                          >
                            <span className="text-[10px] font-bold text-muted-foreground truncate">{circ.label}</span>
                            <div className="flex items-baseline justify-between mt-1 flex-wrap">
                              <span className="text-xs font-extrabold text-foreground">
                                {curVal ? `${curVal} cm` : "--"}
                              </span>
                              {diff !== null && diff !== 0 && (
                                <Badge className={cn(
                                  "text-[8px] font-bold px-1.5 py-0 rounded border leading-none shrink-0",
                                  diff > 0
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                                )}>
                                  {diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* 3. HISTORICAL MEASUREMENT LOG LIST */}
          <div className="space-y-4">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="size-4 text-primary shrink-0" /> Histórico de Registros
            </span>
            <Card className="border border-border/30 p-0 bg-card dark:bg-neutral-950 overflow-hidden">
              {loadingProgress ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-10 bg-muted dark:bg-neutral-900 w-full" />
                  <Skeleton className="h-8 bg-muted dark:bg-neutral-900 w-full" />
                  <Skeleton className="h-8 bg-muted dark:bg-neutral-900 w-full" />
                </div>
              ) : progressHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">Nenhum registro de medida antropométrica encontrado.</p>
              ) : (
                <>
                  {/* Desktop View Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-border dark:border-neutral-900 bg-muted/40 dark:bg-neutral-900/40 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                          <th className="p-3">Data</th>
                          <th className="p-3">Peso</th>
                          <th className="p-3">Altura</th>
                          <th className="p-3">Gordura (BF%)</th>
                          <th className="p-3">Massa Magra%</th>
                          <th className="p-3">Notas</th>
                          <th className="p-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {progressHistory
                          .slice()
                          .reverse()
                          .map((prog) => (
                            <tr key={prog.id} className="border-b border-border dark:border-neutral-900 hover:bg-muted dark:bg-neutral-900/30 transition-colors">
                              <td className="p-3 font-semibold text-foreground">
                                {new Date(prog.date).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="p-3 font-medium text-foreground">{prog.weight ? `${prog.weight} kg` : "--"}</td>
                              <td className="p-3 text-muted-foreground">{prog.height ? `${prog.height} cm` : "--"}</td>
                              <td className="p-3 text-foreground font-medium">{prog.bodyFat ? `${prog.bodyFat}%` : "--"}</td>
                              <td className="p-3 text-muted-foreground">{prog.muscleMass ? `${prog.muscleMass}%` : "--"}</td>
                              <td className="p-3 max-w-[200px] truncate text-muted-foreground" title={prog.notes || ""}>
                                {prog.notes || "--"}
                              </td>
                              <td className="p-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleTriggerDeleteProgress(prog)}
                                  className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                                  title="Excluir medição"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Stacked Card View */}
                  <div className="block sm:hidden divide-y divide-border/50 dark:divide-neutral-900">
                    {progressHistory
                      .slice()
                      .reverse()
                      .map((prog) => (
                        <div key={prog.id} className="p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-sm text-foreground">
                              {new Date(prog.date).toLocaleDateString("pt-BR")}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleTriggerDeleteProgress(prog)}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg active:scale-95 transition-all"
                              title="Excluir medição"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-lg border border-border dark:border-neutral-900">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Peso</span>
                              <span className="font-extrabold text-foreground">{prog.weight ? `${prog.weight} kg` : "--"}</span>
                            </div>
                            <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-lg border border-border dark:border-neutral-900">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Altura</span>
                              <span className="font-semibold text-muted-foreground">{prog.height ? `${prog.height} cm` : "--"}</span>
                            </div>
                            <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-lg border border-border dark:border-neutral-900">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Gordura (BF%)</span>
                              <span className="font-extrabold text-foreground">{prog.bodyFat ? `${prog.bodyFat}%` : "--"}</span>
                            </div>
                            <div className="bg-muted/40 dark:bg-neutral-900/40 p-2.5 rounded-lg border border-border dark:border-neutral-900">
                              <span className="text-[10px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Massa Magra%</span>
                              <span className="font-semibold text-muted-foreground">{prog.muscleMass ? `${prog.muscleMass}%` : "--"}</span>
                            </div>
                          </div>

                          {prog.notes && (
                            <div className="bg-muted/20 dark:bg-neutral-900/20 p-2.5 rounded-lg border border-border/50 dark:border-neutral-900/50 text-xs">
                              <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-1">Notas</span>
                              <p className="text-muted-foreground font-medium whitespace-pre-wrap">{prog.notes}</p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TAB 3: PHYSICAL EVALUATIONS ==================== */}
        <TabsContent value="avaliacoes" className="space-y-6 outline-none focus-visible:ring-0">
          {(() => {
            const latestEval = evaluations.length > 0 ? evaluations[0] : null;
            const prevEval = evaluations.length > 1 ? evaluations[1] : null;

            const getEvalVariation = (field: "weight" | "bodyFat" | "muscleMass") => {
              if (!latestEval || !prevEval) return null;
              const curVal = latestEval[field];
              const preVal = prevEval[field];
              if (curVal === undefined || preVal === undefined) return null;
              return curVal - preVal;
            };

            const weightVar = getEvalVariation("weight");
            const bfVar = getEvalVariation("bodyFat");
            const muscleVar = getEvalVariation("muscleMass");

            const latestFatMass = latestEval?.weight && latestEval?.bodyFat
              ? (latestEval.weight * (latestEval.bodyFat / 100))
              : null;
            const latestLeanMass = latestEval?.weight && latestEval?.bodyFat
              ? (latestEval.weight * (1 - latestEval.bodyFat / 100))
              : null;

            return (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight  flex items-center gap-2">
                      <ClipboardCheck className="size-5 text-yellow-600 dark:text-yellow-500" />
                      Avaliações Físicas e Anamneses
                    </h2>
                    <p className="text-sm text-neutral-450 font-light">Registre adipometrias de 7 dobras, bioimpedâncias e questionários de anamnese.</p>
                  </div>
                  <Button
                    className="gap-2 font-bold max-sm:w-full px-4 shadow-md bg-yellow-600 hover:bg-yellow-500 text-neutral-950 border-none shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all rounded-xl text-xs h-10 uppercase tracking-wider"
                    onClick={() => setIsEvalModalOpen(true)}
                  >
                    <Plus className="size-4" /> Registrar Avaliação
                  </Button>
                </div>

                {loadingEvaluations ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, i) => (
                        <Card key={i} className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-zinc-950/40 p-5 space-y-3 rounded-2xl animate-pulse">
                          <Skeleton className="h-4 w-24 bg-muted dark:bg-zinc-900" />
                          <Skeleton className="h-8 w-16 bg-muted dark:bg-zinc-900" />
                          <Skeleton className="h-3 w-32 bg-muted dark:bg-zinc-900" />
                        </Card>
                      ))}
                    </div>
                    <Card className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-zinc-950/40 rounded-2xl p-6 space-y-4 animate-pulse">
                      <Skeleton className="h-6 w-48 bg-muted dark:bg-zinc-900" />
                      <Skeleton className="h-12 bg-muted dark:bg-zinc-900 w-full" />
                      <Skeleton className="h-12 bg-muted dark:bg-zinc-900 w-full" />
                    </Card>
                  </div>
                ) : evaluations.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-border/50 dark:border-white/[0.06] rounded-2xl bg-muted/20 dark:bg-zinc-950/20 flex flex-col items-center justify-center w-full mx-auto p-6">
                    <ClipboardCheck className="size-12 text-muted-foreground mb-4 animate-pulse" />
                    <h3 className="font-bold text-lg text-foreground mb-1">Nenhuma avaliação cadastrada</h3>
                    <p className="text-sm text-neutral-450 mb-6 max-w-sm px-4">
                      Este aluno ainda não possui avaliações físicas registradas. Registre a primeira avaliação por dobras cutâneas ou bioimpedância para começar a rastrear a evolução.
                    </p>
                    <Button
                      variant="outline"
                      className="font-semibold border-border/60 dark:border-white/[0.08] hover:bg-muted dark:bg-zinc-900/60 rounded-xl"
                      onClick={() => setIsEvalModalOpen(true)}
                    >
                      <Plus className="size-4 mr-2" /> Registrar Primeira Avaliação
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Highlights Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Peso Card */}
                      <Card className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md border border-border/30 dark:border-border/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-full group hover:border-border/80 dark:border-white/[0.12] transition-all">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/5 to-transparent" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Último Peso</span>
                            <Scale className="size-4.5 text-muted-foreground shrink-0" />
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-foreground">{latestEval?.weight ? `${latestEval.weight}` : "--"}</span>
                            <span className="text-xs font-semibold text-muted-foreground">kg</span>
                          </div>
                        </div>
                        <div className="pt-3.5 border-t border-border/50 dark:border-white/[0.04] mt-3 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-light">Evolução:</span>
                          {weightVar !== null ? (
                            <Badge className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0",
                              weightVar < 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                : weightVar > 0
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                                  : "bg-zinc-500/10 text-muted-foreground border-zinc-500/25"
                            )}>
                              {weightVar > 0 ? `+${weightVar.toFixed(1)} kg` : `${weightVar.toFixed(1)} kg`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-light">Primeiro registro</span>
                          )}
                        </div>
                      </Card>

                      {/* BF Card */}
                      <Card className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md border border-border/30 dark:border-border/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-full group hover:border-border/80 dark:border-white/[0.12] transition-all">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/5 to-transparent" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Gordura Corporal</span>
                            <Flame className="size-4.5 text-rose-500/70 shrink-0" />
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-rose-600 dark:text-rose-600 dark:text-rose-400">{latestEval?.bodyFat ? `${latestEval.bodyFat}` : "--"}</span>
                            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">%</span>
                          </div>
                        </div>
                        <div className="pt-3.5 border-t border-border/50 dark:border-white/[0.04] mt-3 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-light">Evolução:</span>
                          {bfVar !== null ? (
                            <Badge className={cn(
                              "text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none shrink-0",
                              bfVar < 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25"
                                : bfVar > 0
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25"
                                  : "bg-zinc-500/10 text-muted-foreground border-zinc-500/25"
                            )}>
                              {bfVar > 0 ? `+${bfVar.toFixed(1)}%` : `${bfVar.toFixed(1)}%`}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground font-light">Primeiro registro</span>
                          )}
                        </div>
                      </Card>

                      {/* Massa Magra Card */}
                      <Card className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md border border-border/30 dark:border-border/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-full group hover:border-border/80 dark:border-white/[0.12] transition-all">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/5 to-transparent" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Massa Magra</span>
                            <Dumbbell className="size-4.5 text-emerald-500/80 shrink-0" />
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-600 dark:text-emerald-400">
                              {latestLeanMass ? latestLeanMass.toFixed(1) : latestEval?.muscleMass ? `${latestEval.muscleMass}` : "--"}
                            </span>
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{latestLeanMass ? "kg" : "%"}</span>
                          </div>
                        </div>
                        <div className="pt-3.5 border-t border-border/50 dark:border-white/[0.04] mt-3 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-light">Músculo Estimado:</span>
                          <span className="text-muted-foreground font-medium">
                            {latestLeanMass && latestEval?.bodyFat ? `${(100 - latestEval.bodyFat).toFixed(1)}%` : "--"}
                          </span>
                        </div>
                      </Card>

                      {/* Massa Gorda Card */}
                      <Card className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-zinc-950/40 backdrop-blur-md border border-border/30 dark:border-border/10 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between h-full group hover:border-border/80 dark:border-white/[0.12] transition-all">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border/20 dark:via-white/5 to-transparent" />
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="text-xs font-semibold uppercase tracking-wider">Massa Gorda</span>
                            <Activity className="size-4.5 text-muted-foreground shrink-0" />
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-foreground">
                              {latestFatMass ? latestFatMass.toFixed(1) : "--"}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">kg</span>
                          </div>
                        </div>
                        <div className="pt-3.5 border-t border-border/50 dark:border-white/[0.04] mt-3 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-light">Método Ativo:</span>
                          <span className="text-yellow-500/80 font-bold truncate max-w-[120px]" title={latestEval?.type}>
                            {latestEval?.type?.split(" ")[0] || "Geral"}
                          </span>
                        </div>
                      </Card>
                    </div>

                    {/* Historical Evaluations Card Log */}
                    <div className="space-y-4">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="size-4 text-primary shrink-0" /> Histórico de Registros
                      </span>
                      <Card className="border p-0 bg-card/40 dark:bg-zinc-950/40 rounded-2xl overflow-hidden shadow-2xl">
                        {/* Desktop View Table */}
                        <div className="hidden sm:block overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b bg-muted/40 dark:bg-muted dark:bg-zinc-900/40 text-muted-foreground uppercase font-bold tracking-wider text-[10px]">
                                <th className="p-4">Data</th>
                                <th className="p-4">Método / Tipo</th>
                                <th className="p-4">Peso</th>
                                <th className="p-4">Gordura (BF%)</th>
                                <th className="p-4">Massa Magra (%)</th>
                                <th className="p-4 text-center">Protocolo / Dobras</th>
                                <th className="p-4 text-right">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {evaluations.map((ev) => {
                                const skinfoldSum = ev.dobras
                                  ? Object.values(ev.dobras).reduce((acc: number, cur: any) => acc + (parseFloat(cur) || 0), 0)
                                  : 0;
                                return (
                                  <tr key={ev.id} className="border-b border-border/50 dark:border-white/[0.04] hover:bg-muted/30 dark:bg-muted dark:bg-zinc-900/30 transition-colors">
                                    <td className="p-4 font-semibold text-foreground">
                                      {new Date(ev.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                    </td>
                                    <td className="p-4">
                                      <Badge variant="outline" className="bg-muted dark:bg-zinc-900/50 text-muted-foreground border-border/50 dark:border-white/[0.04] font-medium text-[10px]">
                                        {ev.type}
                                      </Badge>
                                    </td>
                                    <td className="p-4 font-bold text-foreground">{ev.weight} kg</td>
                                    <td className="p-4 text-rose-600 dark:text-rose-600 dark:text-rose-400 font-bold">{ev.bodyFat ? `${ev.bodyFat}%` : "--"}</td>
                                    <td className="p-4 text-emerald-600 dark:text-emerald-600 dark:text-emerald-400 font-bold">{ev.muscleMass ? `${ev.muscleMass}%` : "--"}</td>
                                    <td className="p-4 text-center">
                                      {ev.dobras ? (
                                        <span className="text-muted-foreground font-medium">
                                          7 dobras ({skinfoldSum.toFixed(1)} mm)
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground font-light">Bioimpedância</span>
                                      )}
                                    </td>
                                    <td className="p-4 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-8 font-semibold border-border/60 dark:border-white/[0.08] hover:bg-muted dark:bg-zinc-900 text-xs text-muted-foreground hover: rounded-lg px-2.5 active:scale-95 transition-all"
                                          onClick={() => {
                                            setSelectedEval(ev);
                                            setIsEvalDetailModalOpen(true);
                                          }}
                                        >
                                          <Activity className="size-3.5 mr-1 text-yellow-500 shrink-0" /> Detalhes
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleTriggerDeleteEval(ev)}
                                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg active:scale-95 transition-all"
                                          title="Excluir avaliação"
                                        >
                                          <Trash2 className="size-4 shrink-0" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Stacked Card View */}
                        <div className="block sm:hidden divide-y divide-border/50 dark:divide-zinc-900/60">
                          {evaluations.map((ev) => {
                            const skinfoldSum = ev.dobras
                              ? Object.values(ev.dobras).reduce((acc: number, cur: any) => acc + (parseFloat(cur) || 0), 0)
                              : 0;
                            return (
                              <div key={ev.id} className="p-4 space-y-4">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <span className="font-extrabold text-sm text-foreground">
                                      {new Date(ev.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                                    </span>
                                    <span className="block text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                                      {ev.type}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs font-semibold border-border/60 dark:border-white/[0.08] hover:bg-muted dark:bg-zinc-900 text-muted-foreground rounded-lg px-2.5 active:scale-95 transition-all"
                                      onClick={() => {
                                        setSelectedEval(ev);
                                        setIsEvalDetailModalOpen(true);
                                      }}
                                    >
                                      <Activity className="size-3 text-yellow-500 mr-1 shrink-0" /> Ver
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleTriggerDeleteEval(ev)}
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg active:scale-95 transition-all"
                                    >
                                      <Trash2 className="size-4 shrink-0" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2.5 text-xs">
                                  <div className="bg-muted/40 dark:bg-muted dark:bg-zinc-900/40 p-2 rounded-xl border border-border/50 dark:border-white/[0.04]">
                                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Peso</span>
                                    <span className="font-extrabold ">{ev.weight} kg</span>
                                  </div>
                                  <div className="bg-muted/40 dark:bg-muted dark:bg-zinc-900/40 p-2 rounded-xl border border-border/50 dark:border-white/[0.04]">
                                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Gordura (BF)</span>
                                    <span className="font-extrabold text-rose-600 dark:text-rose-600 dark:text-rose-400">{ev.bodyFat ? `${ev.bodyFat}%` : "--"}</span>
                                  </div>
                                  <div className="bg-muted/40 dark:bg-muted dark:bg-zinc-900/40 p-2 rounded-xl border border-border/50 dark:border-white/[0.04]">
                                    <span className="text-[9px] text-muted-foreground block uppercase font-bold tracking-wider mb-0.5">Massa Magra</span>
                                    <span className="font-extrabold text-emerald-600 dark:text-emerald-600 dark:text-emerald-400">{ev.muscleMass ? `${ev.muscleMass}%` : "--"}</span>
                                  </div>
                                </div>

                                {ev.dobras && (
                                  <div className="bg-muted dark:bg-zinc-900/20 p-2.5 rounded-xl border border-border/50 dark:border-white/[0.04] text-[11px] flex justify-between items-center text-muted-foreground">
                                    <span className="font-medium text-muted-foreground">Adipometria (7 Dobras):</span>
                                    <span className="font-bold text-foreground bg-muted dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-border/50 dark:border-white/[0.04] text-[10px]">
                                      Soma: {skinfoldSum.toFixed(1)} mm
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </TabsContent>

        {/* ==================== TAB 4: FINANCES ==================== */}
        <TabsContent value="financeiro" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 dark:border-white/[0.06] pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight  flex items-center gap-2">
                <DollarSign className="size-5 text-emerald-500" />
                Histórico Financeiro
              </h2>
              <p className="text-sm text-muted-foreground">Gerencie a ficha financeira individual, mensalidades e pendências do aluno.</p>
            </div>
            <Button
              onClick={() => {
                setPaymentPlanName(`Mensalidade — Plano ${student?.plan || "Mensal"}`);
                setPaymentAmount("");
                setPaymentStatus("pendente");
                setPaymentMethod("PIX");
                setPaymentDate(new Date().toISOString().split("T")[0]);
                setIsPaymentModalOpen(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl transition-all duration-300 w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10"
            >
              <Plus className="size-4" /> Registrar Lançamento
            </Button>
          </div>

          {loadingPayments ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="border border-border/50 dark:border-white/[0.04] bg-muted/20 dark:bg-zinc-950/20 backdrop-blur-md p-6 rounded-2xl">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <Skeleton className="h-3 w-20 bg-muted dark:bg-zinc-800/80 rounded" />
                        <Skeleton className="h-6 w-32 bg-muted dark:bg-zinc-800/80 rounded-lg" />
                      </div>
                      <Skeleton className="size-9 rounded-xl bg-muted dark:bg-zinc-800/80" />
                    </div>
                  </Card>
                ))}
              </div>
              {/* Recurrence Skeleton */}
              <Card className="border border-border/50 dark:border-white/[0.06] bg-muted/20 dark:bg-zinc-950/20 backdrop-blur-md rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-10 rounded-xl bg-muted dark:bg-zinc-800/80" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48 bg-muted dark:bg-zinc-800/80 rounded" />
                    <Skeleton className="h-3 w-64 bg-muted dark:bg-zinc-800/80 rounded" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <Skeleton className="h-10 w-full bg-muted dark:bg-zinc-800/80 rounded-xl" />
                  <Skeleton className="h-10 w-full bg-muted dark:bg-zinc-800/80 rounded-xl" />
                  <Skeleton className="h-10 w-full bg-muted dark:bg-zinc-800/80 rounded-xl" />
                </div>
              </Card>

              {/* Transactions Skeleton */}
              <Card className="border border-border/50 dark:border-white/[0.06] bg-muted/20 dark:bg-zinc-950/20 backdrop-blur-md rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center pb-2">
                  <Skeleton className="h-5 w-40 bg-muted dark:bg-zinc-800/80 rounded" />
                  <Skeleton className="h-8 w-24 bg-muted dark:bg-zinc-800/80 rounded-lg" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-14 w-full bg-muted dark:bg-muted dark:bg-zinc-800/50 rounded-xl" />
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Received Card */}
                <Card className="border border-border/50 dark:border-white/[0.04] bg-card/30 dark:bg-zinc-950/30 backdrop-blur-md p-6 rounded-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/[0.02] blur-2xl group-hover:bg-emerald-500/[0.04] transition-all duration-500" />
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Recebido</p>
                      <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight mt-1">
                        {(paymentMetrics?.totalReceived || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </h3>
                    </div>
                    <div className="size-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                      <DollarSign className="size-5" />
                    </div>
                  </div>
                </Card>

                {/* Pending Card */}
                <Card className="border border-border/50 dark:border-white/[0.04] bg-card/30 dark:bg-zinc-950/30 backdrop-blur-md p-6 rounded-2xl relative overflow-hidden group hover:border-amber-500/20 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/[0.02] blur-2xl group-hover:bg-amber-500/[0.04] transition-all duration-500" />
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Pendente</p>
                      <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight mt-1">
                        {(paymentMetrics?.totalPending || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </h3>
                    </div>
                    <div className="size-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
                      <Clock className="size-5" />
                    </div>
                  </div>
                </Card>

                {/* Overdue Card */}
                <Card className="border border-border/50 dark:border-white/[0.04] bg-card/30 dark:bg-zinc-950/30 backdrop-blur-md p-6 rounded-2xl relative overflow-hidden group hover:border-rose-500/20 transition-all duration-500">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-rose-500/[0.02] blur-2xl group-hover:bg-rose-500/[0.04] transition-all duration-500" />
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">Atrasado</p>
                      <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight mt-1">
                        {(paymentMetrics?.totalOverdue || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </h3>
                    </div>
                    <div className="size-10 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                      <AlertTriangle className="size-5" />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Recorrência Card */}
              <Card className="border border-border/50 dark:border-white/[0.04] bg-card/30 dark:bg-zinc-950/30 backdrop-blur-md p-6 rounded-2xl relative overflow-hidden group transition-all duration-500">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/[0.01] blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4 mb-6">
                  <div className="size-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-500 shrink-0">
                    <RefreshCw className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Controle de Recorrência Financeira</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Automatize e programe a geração de faturas para este aluno.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveRecurrence} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="recControlType" className="text-xs font-bold text-muted-foreground">Tipo de Controle</Label>
                      <Select value={recControlType} onValueChange={(val) => setRecControlType(val)}>
                        <SelectTrigger id="recControlType" className="bg-muted/50 w-full dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent className="bg-muted dark:bg-zinc-900 border-border/60 dark:border-white/[0.08]">
                          <SelectItem value="MANUAL" className="text-xs">Manual (Sem automação)</SelectItem>
                          <SelectItem value="CONFIRMATION" className="text-xs">Recorrência com confirmação</SelectItem>
                          <SelectItem value="AUTOMATIC" className="text-xs">Recorrência automática (Baixa auto)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {recControlType !== "MANUAL" && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="recPrice" className="text-xs font-bold text-muted-foreground">Valor Recorrente (R$)</Label>
                          <Input
                            id="recPrice"
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="bg-muted/50 dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl focus-visible:ring-0 focus-visible:ring-offset-0"
                            value={recPrice}
                            onChange={(e) => setRecPrice(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="recPaymentMethod" className="text-xs font-bold text-muted-foreground">Método de Pagamento</Label>
                          <Select value={recPaymentMethod} onValueChange={(val) => setRecPaymentMethod(val)}>
                            <SelectTrigger id="recPaymentMethod" className="bg-muted/50 dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl">
                              <SelectValue placeholder="Método" />
                            </SelectTrigger>
                            <SelectContent className="bg-muted dark:bg-zinc-900 border-border/60 dark:border-white/[0.08]">
                              <SelectItem value="PIX" className="text-xs">PIX</SelectItem>
                              <SelectItem value="CREDIT_CARD" className="text-xs">Cartão de Crédito</SelectItem>
                              <SelectItem value="BOLETO" className="text-xs">Boleto</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>

                  {recControlType === "MANUAL" ? (
                    <div className="p-4 bg-muted/20 dark:bg-zinc-950/20 border border-border/50 dark:border-white/[0.04] rounded-xl text-xs text-muted-foreground">
                      O controle financeiro está definido como <strong>Manual</strong>. O sistema não gerará faturas automaticamente para este aluno. Utilize o botão "Registrar Lançamento" acima para cadastrar transações manualmente.
                    </div>
                  ) : (
                    <div className="space-y-4 pt-2 border-t border-border/40 dark:border-white/[0.04]">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="recPeriodicity" className="text-xs font-bold text-muted-foreground">Periodicidade</Label>
                          <Select value={recPeriodicity} onValueChange={(val) => setRecPeriodicity(val)}>
                            <SelectTrigger id="recPeriodicity" className="bg-muted/50 w-full dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl">
                              <SelectValue placeholder="Periodicidade" />
                            </SelectTrigger>
                            <SelectContent className="bg-muted dark:bg-zinc-900 border-border/60 dark:border-white/[0.08]">
                              <SelectItem value="MENSAL" className="text-xs">Mensal</SelectItem>
                              <SelectItem value="QUINZENAL" className="text-xs">Quinzenal</SelectItem>
                              <SelectItem value="SEMANAL" className="text-xs">Semanal</SelectItem>
                              <SelectItem value="ANUAL" className="text-xs">Anual</SelectItem>
                              <SelectItem value="PERSONALIZADA" className="text-xs">Personalizada</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {recPeriodicity === "PERSONALIZADA" && (
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <Label htmlFor="recCustomCount" className="text-xs font-bold text-muted-foreground">A cada</Label>
                              <Input
                                id="recCustomCount"
                                type="number"
                                min="1"
                                className="bg-muted/50 dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl "
                                value={recCustomCount}
                                onChange={(e) => setRecCustomCount(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label htmlFor="recCustomUnit" className="text-xs font-bold text-muted-foreground">Unidade</Label>
                              <Select value={recCustomUnit} onValueChange={(val) => setRecCustomUnit(val)}>
                                <SelectTrigger id="recCustomUnit" className="bg-muted/50 w-full dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-12 text-xs rounded-xl ">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-muted dark:bg-zinc-900 border-border/60 dark:border-white/[0.08]">
                                  <SelectItem value="dias" className="text-xs">dias</SelectItem>
                                  <SelectItem value="semanas" className="text-xs">semanas</SelectItem>
                                  <SelectItem value="meses" className="text-xs">meses</SelectItem>
                                  <SelectItem value="anos" className="text-xs">anos</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {(recPeriodicity === "MENSAL" || recPeriodicity === "ANUAL" || (recPeriodicity === "PERSONALIZADA" && (recCustomUnit === "meses" || recCustomUnit === "anos"))) && (
                          <div className="space-y-1.5">
                            <Label htmlFor="recDueDay" className="text-xs font-bold text-muted-foreground">Dia do Vencimento (1 a 31)</Label>
                            <Input
                              id="recDueDay"
                              type="number"
                              min="1"
                              max="31"
                              className="bg-muted/50 dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl "
                              value={recDueDay}
                              onChange={(e) => setRecDueDay(e.target.value)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="recFirstDueDate" className="text-xs font-bold text-muted-foreground">Data da Primeira Cobrança</Label>
                          <Input
                            id="recFirstDueDate"
                            type="date"
                            className="bg-muted/50 dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl "
                            value={recFirstDueDate}
                            onChange={(e) => setRecFirstDueDate(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="recStartDate" className="text-xs font-bold text-muted-foreground">Início da Recorrência</Label>
                          <Input
                            id="recStartDate"
                            type="date"
                            className="bg-muted/50 dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl "
                            value={recStartDate}
                            onChange={(e) => setRecStartDate(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="recDescription" className="text-xs font-bold text-muted-foreground">Descrição da Cobrança</Label>
                          <Input
                            id="recDescription"
                            placeholder="Ex: Mensalidade de Assessoria"
                            className="bg-muted/50 dark:bg-zinc-900/60 border-border/50 dark:border-white/[0.06] h-10 text-xs rounded-xl "
                            value={recDescription}
                            onChange={(e) => setRecDescription(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-muted/20 dark:bg-zinc-950/20 border border-border/50 dark:border-white/[0.04] rounded-xl">
                        <div className="space-y-0.5">
                          <span className="block text-xs font-bold ">Recorrência Ativa</span>
                          <span className="block text-[10px] text-muted-foreground">Se desmarcado, novas faturas recorrentes não serão geradas.</span>
                        </div>
                        <input
                          type="checkbox"
                          className="size-4 accent-emerald-500 rounded cursor-pointer"
                          checked={recIsActive}
                          onChange={(e) => setRecIsActive(e.target.checked)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={submittingRecurrence}
                      className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-xl text-xs h-9 px-6 transition-all duration-300 shadow-md shadow-emerald-500/10"
                    >
                      {submittingRecurrence ? (
                        <>
                          <Loader2 className="animate-spin size-3.5 mr-2" />
                          Salvando...
                        </>
                      ) : (
                        "Salvar Configuração de Recorrência"
                      )}
                    </Button>
                  </div>
                </form>
              </Card>

              {/* Transactions list */}
              {payments.length === 0 ? (
                <Card className="border border-border/50 dark:border-white/[0.04] p-8 text-center bg-muted/20 dark:bg-zinc-950/20 backdrop-blur-md rounded-2xl">
                  <DollarSign className="size-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-bold text-foreground mb-1">Nenhum lançamento encontrado</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Não existem lançamentos financeiros cadastrados ou gerados para este aluno. Clique em "Registrar Lançamento" acima para cadastrar manualmente.
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-foreground tracking-tight px-1">Lançamentos e Histórico</h3>

                  {/* Desktop Ledger View */}
                  <div className="hidden sm:block border border-border/50 dark:border-white/[0.06] bg-muted/20 dark:bg-zinc-950/20 backdrop-blur-md rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/50 dark:border-white/[0.06] bg-white/[0.01] text-xs font-bold tracking-wider text-muted-foreground uppercase">
                            <th className="py-4 px-6">Data</th>
                            <th className="py-4 px-6">Descrição</th>
                            <th className="py-4 px-6">Valor</th>
                            <th className="py-4 px-6">Método</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 dark:divide-white/[0.04] text-sm text-muted-foreground">
                          {payments.map((payment) => (
                            <tr key={payment.id} className="hover:bg-muted/20 dark:hover:bg-white/[0.02] transition-colors group">
                              <td className="py-4 px-6 font-medium">
                                {new Date(payment.createdAt).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="py-4 px-6 font-semibold text-foreground">{payment.planName}</td>
                              <td className="py-4 px-6 font-bold">
                                {payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </td>
                              <td className="py-4 px-6">
                                <Badge className="bg-white/[0.04] text-muted-foreground border border-border/50 dark:border-white/[0.06] rounded-md font-bold px-2 py-0.5 text-xs">
                                  {payment.method}
                                </Badge>
                              </td>
                              <td className="py-4 px-6">
                                <Badge
                                  className={cn(
                                    "font-bold rounded-full border px-2.5 py-0.5 text-xs",
                                    payment.status === "pago" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                                    payment.status === "pendente" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                                    payment.status === "atrasado" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                  )}
                                >
                                  {payment.status === "pago" && "Pago"}
                                  {payment.status === "pendente" && "Pendente"}
                                  {payment.status === "atrasado" && "Atrasado"}
                                </Badge>
                              </td>
                              <td className="py-4 px-6 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="size-8 p-0 rounded-lg hover:bg-muted dark:hover:bg-white/5 text-muted-foreground hover: transition-colors">
                                      <MoreVertical className="size-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover border border-border text-foreground rounded-xl">
                                    {payment.status === "pago" && payment.billingOrigin === "RECURRENCE" && (
                                      <>
                                        <DropdownMenuItem onClick={() => {
                                          setPaymentToReopen(payment);
                                          setIsReopenPaymentAlertOpen(true);
                                        }} className="gap-2 cursor-pointer focus:bg-muted dark:focus:bg-white/5 focus: rounded-lg py-2">
                                          <RefreshCw className="size-3.5 text-amber-500" />
                                          Reabrir Cobrança
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                                      </>
                                    )}
                                    <DropdownMenuItem onClick={() => handleTriggerEditPayment(payment)} className="gap-2 cursor-pointer focus:bg-muted dark:focus:bg-white/5 focus: rounded-lg py-2">
                                      <Edit2 className="size-3.5 text-blue-400" />
                                      Editar Lançamento
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator className="bg-white/[0.06]" />
                                    <DropdownMenuItem onClick={() => handleTriggerDeletePayment(payment)} className="gap-2 cursor-pointer text-rose-600 dark:text-rose-400 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400 rounded-lg py-2">
                                      <Trash2 className="size-3.5" />
                                      Excluir Lançamento
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Cards Stack View (No horizontal scroll) */}
                  <div className="block sm:hidden space-y-3">
                    {payments.map((payment) => (
                      <Card key={payment.id} className="border border-border/50 dark:border-white/[0.06] bg-card/30 dark:bg-zinc-950/30 backdrop-blur-md p-4 rounded-xl relative overflow-hidden flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString("pt-BR")}</p>
                            <h4 className="font-semibold text-foreground text-sm mt-1 truncate">{payment.planName}</h4>
                          </div>

                          {/* Compact Action Menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="size-8 p-0 rounded-lg hover:bg-muted dark:hover:bg-white/5 text-muted-foreground hover: transition-colors shrink-0">
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-popover border border-border text-foreground rounded-xl">
                              {payment.status === "pago" && payment.billingOrigin === "RECURRENCE" && (
                                <>
                                  <DropdownMenuItem onClick={() => {
                                    setPaymentToReopen(payment);
                                    setIsReopenPaymentAlertOpen(true);
                                  }} className="gap-2 cursor-pointer focus:bg-muted dark:focus:bg-white/5 focus: rounded-lg py-2 text-xs">
                                    <RefreshCw className="size-3.5 text-amber-500" />
                                    Reabrir Cobrança
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleTriggerEditPayment(payment)} className="gap-2 cursor-pointer focus:bg-muted dark:focus:bg-white/5 focus: rounded-lg py-2 text-xs">
                                <Edit2 className="size-3.5 text-blue-400" />
                                Editar Lançamento
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-white/[0.06]" />
                              <DropdownMenuItem onClick={() => handleTriggerDeletePayment(payment)} className="gap-2 cursor-pointer text-rose-600 dark:text-rose-400 focus:bg-rose-500/10 focus:text-rose-600 dark:text-rose-400 rounded-lg py-2 text-xs">
                                <Trash2 className="size-3.5" />
                                Excluir Lançamento
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between border-t border-border/50 dark:border-white/[0.04] pt-2 mt-1">
                          <div className="flex items-center gap-1.5">
                            <Badge className="bg-white/[0.04] text-muted-foreground border border-border/50 dark:border-white/[0.06] rounded-md font-bold px-2 py-0.5 text-[10px]">
                              {payment.method}
                            </Badge>
                            <Badge
                              className={cn(
                                "font-bold rounded-full border px-2 py-0.5 text-[10px]",
                                payment.status === "pago" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                                payment.status === "pendente" && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                                payment.status === "atrasado" && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                              )}
                            >
                              {payment.status === "pago" && "Pago"}
                              {payment.status === "pendente" && "Pendente"}
                              {payment.status === "atrasado" && "Atrasado"}
                            </Badge>
                          </div>
                          <span className="font-bold text-foreground text-base">
                            {payment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>

                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 5: FILES PLACEHOLDER ==================== */}
        <TabsContent value="arquivos" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">Central de Arquivos e Documentos</h2>
              <p className="text-sm text-muted-foreground">Exames médicos, laudos, fotos de postura, planilhas e PDFs importantes.</p>
            </div>
            <Button
              className="gap-2 font-bold px-4 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground border-none shrink-0 w-full sm:w-auto"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <Plus className="size-4" /> Enviar Arquivo
            </Button>
          </div>

          {loadingFiles ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
                ))}
              </div>
              <Skeleton className="h-12 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card
                  onClick={() => setFileFilter("todos")}
                  className={cn(
                    "cursor-pointer transition-all border p-4 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden select-none hover:border-primary/40 rounded-xl",
                    fileFilter === "todos" ? "border-primary/60 shadow-lg shadow-primary/5 bg-primary/5" : "border-border/50 dark:border-white/[0.06]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Todos</span>
                    <Folder className={cn("size-4", fileFilter === "todos" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{files.length}</div>
                </Card>

                <Card
                  onClick={() => setFileFilter("exames")}
                  className={cn(
                    "cursor-pointer transition-all border p-4 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden select-none hover:border-primary/40 rounded-xl",
                    fileFilter === "exames" ? "border-primary/60 shadow-lg shadow-primary/5 bg-primary/5" : "border-border/50 dark:border-white/[0.06]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Laudos e Exames</span>
                    <Activity className={cn("size-4", fileFilter === "exames" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{files.filter(f => f.category === "exames").length}</div>
                </Card>

                <Card
                  onClick={() => setFileFilter("dieta_treino")}
                  className={cn(
                    "cursor-pointer transition-all border p-4 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden select-none hover:border-primary/40 rounded-xl",
                    fileFilter === "dieta_treino" ? "border-primary/60 shadow-lg shadow-primary/5 bg-primary/5" : "border-border/50 dark:border-white/[0.06]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Planos e Treinos</span>
                    <Dumbbell className={cn("size-4", fileFilter === "dieta_treino" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{files.filter(f => f.category === "dieta_treino").length}</div>
                </Card>

                <Card
                  onClick={() => setFileFilter("outros")}
                  className={cn(
                    "cursor-pointer transition-all border p-4 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden select-none hover:border-primary/40 rounded-xl",
                    fileFilter === "outros" ? "border-primary/60 shadow-lg shadow-primary/5 bg-primary/5" : "border-border/50 dark:border-white/[0.06]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Outros</span>
                    <Info className={cn("size-4", fileFilter === "outros" ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-foreground">{files.filter(f => f.category === "outros").length}</div>
                </Card>
              </div>

              <div className="flex items-center gap-3 bg-muted/20 dark:bg-neutral-950/20 p-3 rounded-xl border border-border/50 dark:border-white/[0.04]">
                <div className="relative flex-1">
                  <Input
                    placeholder="Buscar arquivos por nome..."
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    className="w-full bg-muted dark:bg-muted border-border dark:border-neutral-800 focus-visible:ring-primary pl-9 text-xs sm:text-sm h-10 rounded-lg text-foreground"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {(() => {
                const filteredFiles = files.filter((f) => {
                  const matchesSearch = f.name.toLowerCase().includes(fileSearch.toLowerCase()) ||
                    (f.notes && f.notes.toLowerCase().includes(fileSearch.toLowerCase())) ||
                    (f.fileName && f.fileName.toLowerCase().includes(fileSearch.toLowerCase()));
                  if (fileFilter === "todos") return matchesSearch;
                  return matchesSearch && f.category === fileFilter;
                });

                if (filteredFiles.length === 0) {
                  return (
                    <div className="py-16 text-center border border-border/50 dark:border-white/4 bg-muted/20 dark:bg-neutral-950/20 rounded-2xl flex flex-col items-center justify-center">
                      <Folder className="size-12 text-muted-foreground/60 mb-4 animate-pulse" />
                      <h3 className="font-bold text-lg text-foreground mb-1">Nenhum arquivo encontrado</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm px-4">
                        Nenhum arquivo ou link compartilhado corresponde aos filtros ou termos de pesquisa ativos.
                      </p>
                      <Button
                        variant="outline"
                        className="font-semibold border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900"
                        onClick={() => {
                          setFileSearch("");
                          setFileFilter("todos");
                          setIsUploadModalOpen(true);
                        }}
                      >
                        <Plus className="size-4 mr-2" /> Enviar Novo Arquivo
                      </Button>
                    </div>
                  );
                }

                const getFileIcon = (file: any) => {
                  const name = file.name.toLowerCase();
                  const fileName = file.fileName ? file.fileName.toLowerCase() : "";
                  const isPdf = name.includes(".pdf") || fileName.includes(".pdf");
                  const isImage = name.includes(".jpg") || name.includes(".png") || name.includes(".jpeg") || fileName.includes(".jpg") || fileName.includes(".png") || fileName.includes(".jpeg");
                  const isExcel = name.includes(".xls") || name.includes(".xlsx") || name.includes(".csv") || fileName.includes(".xls") || fileName.includes(".xlsx") || fileName.includes(".csv");

                  if (file.type === "link") {
                    return (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors">
                        <Link2 className="size-5 shrink-0" />
                      </div>
                    );
                  }
                  if (isPdf) {
                    return (
                      <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-455 hover:bg-rose-500/20 transition-colors">
                        <FileText className="size-5 shrink-0" />
                      </div>
                    );
                  }
                  if (isExcel) {
                    return (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-455 hover:bg-emerald-500/20 transition-colors">
                        <Activity className="size-5 shrink-0" />
                      </div>
                    );
                  }
                  if (isImage) {
                    return (
                      <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-450 hover:bg-blue-500/20 transition-colors">
                        <Camera className="size-5 shrink-0" />
                      </div>
                    );
                  }
                  return (
                    <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-colors">
                      <Folder className="size-5 shrink-0" />
                    </div>
                  );
                };

                return (
                  <>
                    {/* Desktop View Table */}
                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border/50 dark:border-white/[0.06] bg-muted dark:bg-muted dark:bg-neutral-900/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="py-4 px-5">Documento</th>
                            <th className="py-4 px-5">Categoria</th>
                            <th className="py-4 px-5">Tamanho / Tipo</th>
                            <th className="py-4 px-5">Data de Envio</th>
                            <th className="py-4 px-5">Notas / Laudos</th>
                            <th className="py-4 px-5 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 dark:divide-white/[0.04] text-xs sm:text-sm">
                          {filteredFiles.map((file) => (
                            <tr key={file.id} className="hover:bg-muted/10 dark:hover:bg-white/[0.01] transition-colors group">
                              <td className="py-4 px-5 font-semibold text-foreground">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(file)}
                                  <div className="min-w-0">
                                    <span className="block truncate max-w-[240px]">{file.name}</span>
                                    {file.fileName && (
                                      <span className="block text-[10px] text-muted-foreground font-mono truncate max-w-[200px]">{file.fileName}</span>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-5">
                                <span className={cn(
                                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold border",
                                  file.category === "exames" && "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/10",
                                  file.category === "dieta_treino" && "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10",
                                  file.category === "outros" && "bg-blue-500/5 text-blue-400 border-blue-500/10"
                                )}>
                                  {file.category === "exames" ? "Exame/Laudo" : file.category === "dieta_treino" ? "Planos/Treinos" : "Outros"}
                                </span>
                              </td>
                              <td className="py-4 px-5 font-mono text-neutral-450 text-xs">
                                {file.fileSize || "Link"}
                              </td>
                              <td className="py-4 px-5 text-muted-foreground">
                                {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                              </td>
                              <td className="py-4 px-5 text-neutral-450 max-w-[220px] truncate text-xs">
                                {file.notes || "—"}
                              </td>
                              <td className="py-4 px-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/80 dark:hover:bg-neutral-800"
                                    asChild
                                  >
                                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-950/20"
                                    onClick={() => {
                                      setFileToDelete(file);
                                      setIsDeleteFileAlertOpen(true);
                                    }}
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="block sm:hidden space-y-3">
                      {filteredFiles.map((file) => (
                        <Card key={file.id} className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-neutral-950/40 p-4 relative overflow-hidden backdrop-blur-md rounded-xl">
                          <div className="flex items-start gap-3">
                            {getFileIcon(file)}
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-sm text-foreground truncate">{file.name}</h4>
                              {file.fileName && (
                                <span className="block text-[10px] text-muted-foreground font-mono truncate">{file.fileName}</span>
                              )}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                  file.category === "exames" && "bg-rose-500/5 text-rose-600 dark:text-rose-400 border-rose-500/10",
                                  file.category === "dieta_treino" && "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10",
                                  file.category === "outros" && "bg-blue-500/5 text-blue-400 border-blue-500/10"
                                )}>
                                  {file.category === "exames" ? "Exame/Laudo" : file.category === "dieta_treino" ? "Planos/Treinos" : "Outros"}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono">{file.fileSize || "Link"}</span>
                                <span className="text-[10px] text-muted-foreground">{new Date(file.createdAt).toLocaleDateString("pt-BR")}</span>
                              </div>
                              {file.notes && (
                                <p className="mt-2 text-xs text-muted-foreground bg-white/[0.02] p-2 rounded-lg border border-border/50 dark:border-white/[0.04]">
                                  {file.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2 border-t border-border/50 dark:border-white/[0.04] mt-3 pt-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs h-8 border-border dark:border-neutral-800 gap-1.5"
                              asChild
                            >
                              <a href={file.url} target="_blank" rel="noopener noreferrer">
                                Visualizar
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-8 text-rose-500 hover:bg-rose-950/20"
                              onClick={() => {
                                setFileToDelete(file);
                                setIsDeleteFileAlertOpen(true);
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </TabsContent>

        {/* ==================== TAB 6: STUDENT WORKOUT LOGS / FEEDBACKS ==================== */}
        <TabsContent value="feedbacks" className="space-y-6 outline-none focus-visible:ring-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/30 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Trophy className="size-5 text-amber-500" /> Feedbacks e Recuperação Diária (Recovery)
              </h2>
              <p className="text-sm text-muted-foreground">Acompanhe a percepção de esforço de treinos e o estado de bem-estar diário (recovery) do aluno.</p>
            </div>
          </div>

          {loadingWorkoutLogs ? (
            <div className="space-y-6">
              {/* Skeletons represent the final layout precisely as per skelletonsloaders.md */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-4">
                  <Skeleton className="h-44 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
                  <Skeleton className="h-28 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
                </div>
                <div className="lg:col-span-7">
                  <Skeleton className="h-[350px] bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
                </div>
              </div>
              <Skeleton className="h-12 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 bg-muted/40 dark:bg-neutral-900/40 border border-border/40 dark:border-border dark:border-neutral-800/40 rounded-xl" />
                ))}
              </div>
            </div>
          ) : workoutLogs.length === 0 && dailyFeedbacks.length === 0 ? (
            <Card className="border border-dashed border-border dark:border-neutral-800 bg-muted/20 dark:bg-neutral-950/20 p-8 rounded-2xl text-center">
              <CardContent className="flex flex-col items-center justify-center space-y-4 pt-6">
                <div className="p-4 rounded-full bg-muted dark:bg-neutral-900/80 text-muted-foreground border border-border dark:border-neutral-800">
                  <Trophy className="size-8 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-foreground">Nenhum feedback de treino ou recovery</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Este aluno ainda não concluiu nenhum treino e não enviou diários de bem-estar para este workspace.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {(() => {
                const logsWithEffort = workoutLogs.filter((l: any) => l.effortScore !== null);
                const avgEffort = logsWithEffort.length > 0
                  ? (logsWithEffort.reduce((sum: number, l: any) => sum + l.effortScore, 0) / logsWithEffort.length).toFixed(1)
                  : "N/A";

                let avgLabel = "N/A";
                let avgColor = "text-muted-foreground";
                const avgNum = parseFloat(avgEffort);
                if (!isNaN(avgNum)) {
                  if (avgNum >= 4.5) {
                    avgLabel = "Muito Difícil 💀";
                    avgColor = "text-rose-600 dark:text-rose-600 dark:text-rose-400";
                  } else if (avgNum >= 3.5) {
                    avgLabel = "Difícil 🥵";
                    avgColor = "text-amber-600 dark:text-amber-600 dark:text-amber-400";
                  } else if (avgNum >= 2.5) {
                    avgLabel = "Moderado 👍";
                    avgColor = "text-sky-600 dark:text-sky-600 dark:text-sky-400";
                  } else if (avgNum >= 1.5) {
                    avgLabel = "Fácil 🙂";
                    avgColor = "text-green-600 dark:text-green-600 dark:text-green-400";
                  } else {
                    avgLabel = "Muito Fácil 😴";
                    avgColor = "text-emerald-600 dark:text-emerald-600 dark:text-emerald-400";
                  }
                }

                const lastLog = workoutLogs[0];
                const formatLogDate = (dateStr: string) => {
                  try {
                    const date = new Date(dateStr);
                    return date.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                  } catch (e) {
                    return dateStr;
                  }
                };

                // Recovery Metrics calculation
                const recentFeedbacks = dailyFeedbacks || [];
                const avgEnergy = recentFeedbacks.length > 0
                  ? Math.round(recentFeedbacks.reduce((sum, f) => sum + f.energy, 0) / recentFeedbacks.length)
                  : null;
                const avgFatigue = recentFeedbacks.length > 0
                  ? Math.round(recentFeedbacks.reduce((sum, f) => sum + f.fatigue, 0) / recentFeedbacks.length)
                  : null;
                const avgHumor = recentFeedbacks.length > 0
                  ? Math.round(recentFeedbacks.reduce((sum, f) => sum + f.humor, 0) / recentFeedbacks.length)
                  : null;

                let recoveryStatus = "Sem dados";
                let recoveryAdvice = "Nenhum registro de bem-estar diário cadastrado recentemente.";
                let recoveryColor = "bg-popover border-border text-neutral-450";

                if (avgEnergy !== null && avgFatigue !== null && avgHumor !== null) {
                  if (avgFatigue > 75 && avgEnergy < 40) {
                    recoveryStatus = "Fadiga Crônica Alta 🚨";
                    recoveryAdvice = "O aluno apresenta fadiga extrema e baixa energia. Recomendado reduzir volume de treinos ou agendar regenerativo.";
                    recoveryColor = "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-600 dark:text-rose-400";
                  } else if (avgFatigue > 60) {
                    recoveryStatus = "Fadiga Acumulada ⚠️";
                    recoveryAdvice = "Fadiga moderadamente elevada. Monitore a intensidade das cargas e aumente o tempo de descanso.";
                    recoveryColor = "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-600 dark:text-amber-400";
                  } else if (avgEnergy > 70 && avgFatigue < 45) {
                    recoveryStatus = "Pronto para Sobrecarga 🔥";
                    recoveryAdvice = "Excelente recuperação! Fase ideal para aplicar sobrecarga progressiva e treinos de alta intensidade.";
                    recoveryColor = "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-600 dark:text-emerald-400";
                  } else {
                    recoveryStatus = "Equilíbrio Estável 👍";
                    recoveryAdvice = "Recuperação muscular estável. Siga o planejamento padrão estabelecido.";
                    recoveryColor = "bg-sky-500/10 border-sky-500/20 text-sky-600 dark:text-sky-600 dark:text-sky-400";
                  }
                }

                return (
                  <>
                    {/* Metrics row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Metric Card 1 */}
                      <Card className="border border-border/50 dark:border-white/[0.06] p-4 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Treinos Concluídos</span>
                          <Trophy className="size-4 text-amber-500" />
                        </div>
                        <div className="mt-2 text-2xl font-black text-foreground">{workoutLogs.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Registrados no aplicativo do aluno</p>
                      </Card>

                      {/* Metric Card 2 */}
                      <Card className="border border-border/50 dark:border-white/[0.06] p-4 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Percepção de Esforço Média</span>
                          <Activity className="size-4 text-rose-500" />
                        </div>
                        <div className={cn("mt-2 text-2xl font-black flex items-baseline gap-2", avgColor)}>
                          {avgEffort}
                          {avgLabel !== "N/A" && (
                            <span className="text-xs font-normal text-neutral-450">({avgLabel})</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Média de esforço percebido pelo aluno</p>
                      </Card>

                      {/* Metric Card 3 */}
                      <Card className="border border-border/50 dark:border-white/[0.06] p-4 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden rounded-xl">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status do Recovery</span>
                          <Heart className="size-4 text-emerald-500" />
                        </div>
                        <div className="mt-2 text-lg font-black text-foreground">
                          {avgEnergy !== null ? recoveryStatus : "Sem Dados Diários"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {avgEnergy !== null ? "Calculado a partir de energia e fadiga" : "Aluno deve responder no app"}
                        </p>
                      </Card>
                    </div>

                    {/* Well-being Recovery Panel Dashboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                      {/* Left Side Recovery Diagnostics */}
                      <div className="lg:col-span-5 space-y-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="size-4 text-primary" /> Diagnóstico de Recovery (7D)
                        </span>

                        <Card className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md rounded-xl p-5 space-y-5">

                          {/* Recovery Averages Indicators */}
                          <div className="space-y-4">
                            {/* Energia Indicator */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                  <span className="size-2 rounded-full bg-emerald-500" /> Energia Diária
                                </span>
                                <span className="font-extrabold text-foreground">{avgEnergy !== null ? `${avgEnergy}%` : "Sem dados"}</span>
                              </div>
                              <Progress value={avgEnergy || 0} className="h-2 rounded-full bg-muted dark:bg-neutral-900" />
                            </div>

                            {/* Fadiga Indicator */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                  <span className="size-2 rounded-full bg-rose-500" /> Fadiga Muscular
                                </span>
                                <span className="font-extrabold text-foreground">{avgFatigue !== null ? `${avgFatigue}%` : "Sem dados"}</span>
                              </div>
                              <Progress value={avgFatigue || 0} className="h-2 rounded-full bg-muted dark:bg-neutral-900" />
                            </div>

                            {/* Humor Indicator */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                                  <span className="size-2 rounded-full bg-sky-500" /> Humor e Estresse
                                </span>
                                <span className="font-extrabold text-foreground">{avgHumor !== null ? `${avgHumor}%` : "Sem dados"}</span>
                              </div>
                              <Progress value={avgHumor || 0} className="h-2 rounded-full bg-muted dark:bg-neutral-900" />
                            </div>
                          </div>

                          {/* Advice Card Box */}
                          <div className={cn("p-4 rounded-xl border", recoveryColor)}>
                            <h5 className="text-xs font-black uppercase tracking-wider mb-1.5">Recomendação do Recovery</h5>
                            <p className="text-xs leading-relaxed font-medium">{recoveryAdvice}</p>
                          </div>
                        </Card>
                      </div>

                      {/* Right Side Recovery Chart */}
                      <div className="lg:col-span-7 space-y-4">
                        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="size-4 text-primary" /> Curvas de Estresse e Recovery (30D)
                        </span>

                        <Card className="border border-border/50 dark:border-white/[0.06] p-6 bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md relative overflow-hidden rounded-xl min-h-[310px] flex flex-col justify-between">
                          {recentFeedbacks.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground text-xs py-16">
                              Nenhum registro de feedback diário (bem-estar/recovery) recente.
                            </div>
                          ) : (
                            <div className="h-[210px] w-full mt-2">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                  data={recentFeedbacks.slice().reverse().map((f) => ({
                                    date: new Date(f.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                                    energia: f.energy,
                                    fadiga: f.fatigue,
                                    humor: f.humor,
                                  }))}
                                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} />
                                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} domain={[0, 100]} />
                                  <RechartsTooltip
                                    contentStyle={{
                                      backgroundColor: "hsl(var(--popover))",
                                      border: "1px solid hsl(var(--border))",
                                      borderRadius: "8px",
                                    }}
                                    labelClassName="text-[10px] font-bold text-muted-foreground"
                                    itemStyle={{ fontSize: "11px", fontWeight: "bold" }}
                                  />
                                  <Area type="monotone" dataKey="energia" name="Energia" stroke="#10b981" strokeWidth={2.5} fill="none" />
                                  <Area type="monotone" dataKey="fadiga" name="Fadiga" stroke="#f43f5e" strokeWidth={2.5} fill="none" />
                                  <Area type="monotone" dataKey="humor" name="Humor" stroke="#0ea5e9" strokeWidth={2.5} fill="none" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </Card>
                      </div>
                    </div>

                    {/* Workout Logs Section */}
                    <div className="space-y-4">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Trophy className="size-4 text-primary" /> Histórico de Logs de Treino
                      </span>

                      {workoutLogs.length === 0 ? (
                        <Card className="border border-dashed border-border dark:border-neutral-800 bg-muted/20 dark:bg-neutral-950/20 p-6 rounded-xl text-center text-xs text-muted-foreground">
                          Nenhum log de treino finalizado recentemente.
                        </Card>
                      ) : (
                        <>
                          {/* Desktop View Table */}
                          <div className="hidden md:block overflow-hidden border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-neutral-950/40 backdrop-blur-md rounded-xl">
                            <Table>
                              <TableHeader className="bg-muted dark:bg-muted dark:bg-neutral-900/60 border-b border-border/50 dark:border-white/[0.06]">
                                <TableRow className="hover:bg-transparent border-b border-border/50 dark:border-white/[0.06]">
                                  <TableHead className="text-muted-foreground font-bold w-[20%]">Data / Hora</TableHead>
                                  <TableHead className="text-muted-foreground font-bold w-[25%]">Treino Concluído</TableHead>
                                  <TableHead className="text-muted-foreground font-bold w-[20%]">Grupo Muscular</TableHead>
                                  <TableHead className="text-muted-foreground font-bold w-[20%]">Percepção de Esforço</TableHead>
                                  <TableHead className="text-muted-foreground font-bold w-[15%]">Feedback Adicional</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {workoutLogs.map((log: any) => {
                                  let effortBadge = null;
                                  switch (log.effortScore) {
                                    case 1:
                                      effortBadge = (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                          😴 Muito Fácil
                                        </Badge>
                                      );
                                      break;
                                    case 2:
                                      effortBadge = (
                                        <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                          🙂 Fácil
                                        </Badge>
                                      );
                                      break;
                                    case 3:
                                      effortBadge = (
                                        <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                          👍 Moderado
                                        </Badge>
                                      );
                                      break;
                                    case 4:
                                      effortBadge = (
                                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-600 dark:text-amber-400 border border-amber-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                          🥵 Difícil
                                        </Badge>
                                      );
                                      break;
                                    case 5:
                                      effortBadge = (
                                        <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                          💀 Muito Difícil
                                        </Badge>
                                      );
                                      break;
                                    default:
                                      effortBadge = <span className="text-muted-foreground text-xs">—</span>;
                                  }

                                  return (
                                    <TableRow key={log.id} className="border-b border-border/50 dark:border-white/[0.04] hover:bg-muted dark:bg-neutral-900/30 transition-colors">
                                      <TableCell className="font-medium text-xs text-neutral-300">
                                        {formatLogDate(log.completedAt)}
                                      </TableCell>
                                      <TableCell className="font-bold text-sm text-foreground">
                                        {log.workout?.name || "Treino Excluído"}
                                      </TableCell>
                                      <TableCell className="text-xs font-semibold text-muted-foreground">
                                        {log.workout?.muscleGroupLabel || "Geral"}
                                      </TableCell>
                                      <TableCell>{effortBadge}</TableCell>
                                      <TableCell>
                                        {log.feedback ? (
                                          <div className="flex items-start gap-1.5 bg-muted dark:bg-muted dark:bg-neutral-900/60 p-2 rounded-lg border border-border dark:border-neutral-800 text-xs italic text-neutral-300 max-w-[280px]">
                                            <MessageCircle className="size-3.5 shrink-0 text-primary mt-0.5" />
                                            <span className="truncate block" title={log.feedback}>
                                              "{log.feedback}"
                                            </span>
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground/60 text-xs italic">Sem comentário</span>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Mobile View Cards */}
                          <div className="block md:hidden space-y-3">
                            {workoutLogs.map((log: any) => {
                              let effortBadge = null;
                              switch (log.effortScore) {
                                case 1:
                                  effortBadge = (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                      😴 Muito Fácil
                                    </Badge>
                                  );
                                  break;
                                case 2:
                                  effortBadge = (
                                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                      🙂 Fácil
                                    </Badge>
                                  );
                                  break;
                                case 3:
                                  effortBadge = (
                                    <Badge className="bg-sky-500/10 text-sky-600 dark:text-sky-600 dark:text-sky-400 border border-sky-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                      👍 Moderado
                                    </Badge>
                                  );
                                  break;
                                case 4:
                                  effortBadge = (
                                    <Badge className="bg-amber-500/10 text-amber-455 border border-amber-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                      🥵 Difícil
                                    </Badge>
                                  );
                                  break;
                                case 5:
                                  effortBadge = (
                                    <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-600 dark:text-rose-400 border border-rose-500/20 shadow-none font-bold text-xs gap-1 py-1 px-2.5">
                                      💀 Muito Difícil
                                    </Badge>
                                  );
                                  break;
                                default:
                                  effortBadge = <span className="text-muted-foreground text-xs">—</span>;
                              }

                              return (
                                <Card key={log.id} className="border border-border/50 dark:border-white/[0.06] bg-card/40 dark:bg-neutral-950/40 p-4 rounded-xl space-y-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-bold text-foreground text-sm">{log.workout?.name || "Treino Excluído"}</h4>
                                      <p className="text-xs text-neutral-450 mt-0.5">{log.workout?.muscleGroupLabel || "Geral"}</p>
                                    </div>
                                    <span className="text-[10px] text-muted-foreground font-medium">
                                      {formatLogDate(log.completedAt)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">Esforço:</span>
                                    {effortBadge}
                                  </div>

                                  {log.feedback && (
                                    <div className="flex items-start gap-2 bg-muted dark:bg-muted dark:bg-neutral-900/60 p-2.5 rounded-lg border border-border dark:border-neutral-800 text-xs italic text-neutral-300">
                                      <MessageCircle className="size-4 shrink-0 text-primary mt-0.5" />
                                      <span>"{log.feedback}"</span>
                                    </div>
                                  )}
                                </Card>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-3xl bg-popover border border-border text-foreground max-h-[90vh] overflow-y-auto!">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
              <Dumbbell className="size-5 text-primary" /> Planejar Novo Treino para o Aluno
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escolha entre importar um treino pronto da biblioteca do seu workspace ou montar um treino totalmente personalizado e exclusivo para o aluno.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:grid sm:grid-cols-2 p-1 bg-muted border border-border rounded-lg my-2 gap-1.5 sm:gap-0">
            <button
              type="button"
              className={cn(
                "py-2 text-sm font-semibold rounded-md transition-all text-center",
                assignType === "library"
                  ? "bg-neutral-800 text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setAssignType("library")}
            >
              Usar Treino da Biblioteca
            </button>
            <button
              type="button"
              className={cn(
                "py-2 text-sm font-semibold rounded-md transition-all text-center",
                assignType === "custom"
                  ? "bg-neutral-800 text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => {
                setAssignType("custom");
                loadMuscleGroups();
              }}
            >
              Criar Treino Exclusivo
            </button>
          </div>

          <form onSubmit={handleAssignSubmit} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="assignDayOfWeek" className="font-bold text-foreground">Dia de Execução Semanal</Label>
                <Select value={assignDayOfWeek} onValueChange={setAssignDayOfWeek}>
                  <SelectTrigger id="assignDayOfWeek" className="bg-background border-border h-10 w-full min-w-0 max-w-full">
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {assignType === "library" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="templateSelect" className="font-bold text-neutral-300">Selecione o Treino Pronto</Label>
                  {loadingTemplates ? (
                    <Skeleton className="h-10 bg-border dark:bg-neutral-850 w-full" />
                  ) : templates.length === 0 ? (
                    <div className="p-4 border border-dashed border-border dark:border-neutral-800 rounded-lg text-center bg-muted dark:bg-neutral-900/30 text-xs text-muted-foreground">
                      Nenhum modelo de treino cadastrado na biblioteca. Crie um na aba principal de treinos.
                    </div>
                  ) : (
                    <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                      <SelectTrigger id="templateSelect" className="bg-background border-border h-10 w-full min-w-0 max-w-full *:data-[slot=select-value]:block *:data-[slot=select-value]:truncate *:data-[slot=select-value]:text-xs">
                        <SelectValue placeholder="Escolha um treino..." />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        {templates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name} ({t.muscleGroupLabel || "Geral"}) - {t.goal} / {t.duration}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )}

            {assignType === "custom" && (
              <div className="space-y-4 border-t border-border dark:border-neutral-900 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customName" className="font-bold text-neutral-300">Nome do Treino</Label>
                    <Input
                      id="customName"
                      placeholder="Ex: Treino A - Hipertrofia Peitoral"
                      className="bg-background border-border h-10"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customMuscleGroup" className="font-bold text-neutral-300">Grupamento Muscular Principal</Label>
                    <Input
                      id="customMuscleGroup"
                      placeholder="Ex: Peito e Tríceps"
                      className="bg-background border-border h-10"
                      value={customMuscleGroup}
                      onChange={(e) => setCustomMuscleGroup(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customGoal" className="font-bold text-neutral-300">Objetivo</Label>
                    <Select value={customGoal} onValueChange={setCustomGoal}>
                      <SelectTrigger id="customGoal" className="bg-background border-border h-10 w-full min-w-0 max-w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                        <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                        <SelectItem value="Força">Força</SelectItem>
                        <SelectItem value="Resistência">Resistência</SelectItem>
                        <SelectItem value="Definição">Definição</SelectItem>
                        <SelectItem value="Cardio">Cardio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customDifficulty" className="font-bold text-neutral-300">Dificuldade</Label>
                    <Select value={customDifficulty} onValueChange={setCustomDifficulty}>
                      <SelectTrigger id="customDifficulty" className="bg-background border-border h-10 w-full min-w-0 max-w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="Iniciante">Iniciante</SelectItem>
                        <SelectItem value="Intermediário">Intermediário</SelectItem>
                        <SelectItem value="Avançado">Avançado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customDuration" className="font-bold text-neutral-300">Duração Estimada</Label>
                    <Input
                      id="customDuration"
                      placeholder="Ex: 60 min"
                      className="bg-background border-border h-10"
                      value={customDuration}
                      onChange={(e) => setCustomDuration(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customRestBetweenExercises" className="font-bold text-neutral-300">Descanso Exercícios</Label>
                    <Input
                      id="customRestBetweenExercises"
                      placeholder="Ex: 2 min"
                      className="bg-background border-border h-10"
                      value={customRestBetweenExercises}
                      onChange={(e) => setCustomRestBetweenExercises(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-border dark:border-neutral-900">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm uppercase text-muted-foreground tracking-wider">Exercícios do Treino</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 font-semibold border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900 text-xs"
                      onClick={handleOpenExerciseDialog}
                    >
                      <Plus className="size-3.5 mr-1" /> Adicionar Exercício
                    </Button>
                  </div>

                  {customExercises.length === 0 ? (
                    <div className="p-6 border border-dashed border-border dark:border-neutral-800 rounded-xl text-center bg-card dark:bg-neutral-950 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                      <Info className="size-4 text-blue-500/80 shrink-0" />
                      <span>Nenhum exercício adicionado a este treino exclusivo ainda.</span>
                    </div>
                  ) : (
                    <div className="space-y-3 overflow-y-auto pr-1">
                      {customExercises.map((ex, idx) => (
                        <div
                          key={ex.exerciseId}
                          className="p-3.5 border border-border rounded-xl bg-background/50 hover:bg-background/80 transition flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center relative"
                        >
                          <div className="flex-1 flex flex-col gap-3">
                            {/* Top Row: Info & Badges + Positioning & Delete Actions */}
                            <div className="flex flex-row items-start justify-between gap-3 min-w-0">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <button
                                  type="button"
                                  disabled={!ex.videoUrl}
                                  onClick={() => {
                                    setPreviewExercise({
                                      id: ex.exerciseId,
                                      name: ex.name,
                                      videoUrl: ex.videoUrl,
                                      muscleGroup: { name: ex.muscleGroup }
                                    });
                                    setIsPreviewModalOpen(true);
                                  }}
                                  className={cn(
                                    "size-8 sm:size-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border transition-all relative group/thumb",
                                    ex.videoUrl ? "hover:border-primary/50 cursor-pointer" : "cursor-default"
                                  )}
                                >
                                  <Activity className="size-4 text-primary group-hover/thumb:scale-110 transition-transform" />
                                  {ex.videoUrl && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg">
                                      <Play className="size-3 fill-white " />
                                    </div>
                                  )}
                                </button>
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-sm text-foreground truncate">{ex.name}</h4>
                                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                    <Badge variant="secondary" className="text-[9px] bg-secondary/80 text-muted-foreground px-1.5 py-0">
                                      {ex.muscleGroup}
                                    </Badge>

                                    {ex.methodType === "DROPSET" && (
                                      <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0">
                                        Dropset
                                      </Badge>
                                    )}

                                    {ex.methodType === "REST_PAUSE" && (
                                      <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-1.5 py-0">
                                        Rest-Pause
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-0.5 shrink-0">
                                {ex.videoUrl && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setPreviewExercise({
                                        id: ex.exerciseId,
                                        name: ex.name,
                                        videoUrl: ex.videoUrl,
                                        muscleGroup: { name: ex.muscleGroup }
                                      });
                                      setIsPreviewModalOpen(true);
                                    }}
                                    className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                    title="Visualizar execução"
                                  >
                                    <Play className="size-4 fill-primary" />
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moveExerciseInCustom(idx, "up")}
                                  disabled={idx === 0}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                                >
                                  <ArrowUp className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => moveExerciseInCustom(idx, "down")}
                                  disabled={idx === customExercises.length - 1}
                                  className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                                >
                                  <ArrowDown className="size-4" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeExerciseFromCustomList(idx)}
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Middle Row: Inputs + Method configuration */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/10 sm:border-0">
                              {!ex.isIndividual && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-72 shrink-0">
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                                    <Input
                                      type="number"
                                      value={ex.sets}
                                      onChange={(e) => handleUpdateExerciseField(idx, "sets", e.target.value, false)}
                                      className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                      min={1}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Reps</span>
                                    <Input
                                      type="text"
                                      value={ex.reps}
                                      onChange={(e) => handleUpdateExerciseField(idx, "reps", e.target.value, false)}
                                      className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                      placeholder="Ex: 10"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground pl-0.5 flex items-center gap-0.5 select-none">
                                      Carga
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Info className="size-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs bg-neutral-900 border border-neutral-800  p-2.5 rounded-xl shadow-xl">
                                            Se não for atribuída uma carga, o próprio aluno que vai colocar quando estiver treinando.
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    </span>
                                    <Input
                                      type="text"
                                      value={String(ex.load || "").toLowerCase().includes("p.c") ? "p.c." : (ex.load || "")}
                                      onChange={(e) => handleUpdateExerciseField(idx, "load", e.target.value, false)}
                                      disabled={String(ex.load || "").toLowerCase().includes("p.c")}
                                      className="h-8 bg-card border-border w-full text-center text-xs px-1 disabled:opacity-80 font-semibold"
                                      placeholder={String(ex.load || "").toLowerCase().includes("p.c") ? "p.c." : "Auto"}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Desc.</span>
                                    <Input
                                      type="text"
                                      value={ex.rest || "60s"}
                                      onChange={(e) => handleUpdateExerciseField(idx, "rest", e.target.value, false)}
                                      className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                      placeholder="Ex: 60s"
                                    />
                                  </div>
                                </div>
                              )}

                              {ex.isIndividual && (
                                <div className="space-y-1 w-full sm:w-24 shrink-0">
                                  <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                                  <Input
                                    type="number"
                                    value={ex.sets}
                                    onChange={(e) => handleUpdateExerciseField(idx, "sets", e.target.value, false)}
                                    className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                    min={1}
                                  />
                                </div>
                              )}

                              <div className="flex items-center justify-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenCustomMethodDialog(idx)}
                                  className="h-8 w-full sm:w-auto gap-1 text-xs border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 shrink-0"
                                >
                                  Método
                                </Button>
                              </div>
                            </div>

                            {/* Bottom Row: Checkboxes */}
                            <div className="flex flex-wrap items-center gap-4 px-0.5">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`custom-individual-${idx}`}
                                  checked={ex.isIndividual || false}
                                  onCheckedChange={(checked) => handleToggleIndividual(idx, !!checked, false)}
                                  className="rounded size-3.5"
                                />
                                <label
                                  htmlFor={`custom-individual-${idx}`}
                                  className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none"
                                >
                                  Configurar séries individualmente
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`custom-bodyweight-${idx}`}
                                  checked={String(ex.load || "").toLowerCase().includes("p.c")}
                                  onCheckedChange={(checked) => handleToggleBodyweight(idx, !!checked, false)}
                                  className="rounded size-3.5"
                                />
                                <label
                                  htmlFor={`custom-bodyweight-${idx}`}
                                  className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none"
                                >
                                  Peso do corpo
                                </label>
                              </div>
                            </div>

                            {/* Individual Sets */}
                            {ex.isIndividual && (
                              <div className="mt-1 border-t border-border/40 pt-3 space-y-2.5">
                                <div className="grid grid-cols-[30px_1fr_1fr_1fr] gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                                  <div>Série</div>
                                  <div>Reps</div>
                                  <div className="flex items-center gap-0.5 select-none">
                                    Carga
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="size-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs bg-neutral-900 border border-neutral-800  p-2.5 rounded-xl shadow-xl">
                                          Se não for atribuída uma carga, o próprio aluno que vai colocar quando estiver treinando.
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <div>Descanso</div>
                                </div>

                                <div className="space-y-1.5">
                                  {Array.from({ length: ex.sets }).map((_, si) => {
                                    const setItem = ex.individualSets?.[si] || { reps: "10", load: "", rest: "60s" };
                                    return (
                                      <div key={si} className="grid grid-cols-[30px_1fr_1fr_1fr] gap-2 items-center">
                                        <span className="text-xs font-semibold text-neutral-400 pl-0.5">#{si + 1}</span>
                                        <Input
                                          type="text"
                                          value={setItem.reps}
                                          onChange={(e) => handleUpdateIndividualSetField(idx, si, "reps", e.target.value, false)}
                                          className="h-8 bg-card border-border text-center text-xs font-semibold"
                                          placeholder="10"
                                        />
                                        <Input
                                          type="text"
                                          value={String(setItem.load || "").toLowerCase().includes("p.c") ? "p.c." : setItem.load}
                                          onChange={(e) => handleUpdateIndividualSetField(idx, si, "load", e.target.value, false)}
                                          disabled={String(setItem.load || "").toLowerCase().includes("p.c")}
                                          className="h-8 bg-card border-border text-center text-xs font-semibold disabled:opacity-80"
                                          placeholder={String(setItem.load || "").toLowerCase().includes("p.c") ? "p.c." : "Auto"}
                                        />
                                        <Input
                                          type="text"
                                          value={setItem.rest}
                                          onChange={(e) => handleUpdateIndividualSetField(idx, si, "rest", e.target.value, false)}
                                          className="h-8 bg-card border-border text-center text-xs font-semibold"
                                          placeholder="60s"
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                className="border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900"
                onClick={() => setIsAssignModalOpen(false)}
                disabled={submittingAssign}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 font-semibold px-5"
                disabled={submittingAssign}
              >
                {submittingAssign ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" />
                    Atribuindo...
                  </>
                ) : (
                  "Salvar no Cronograma"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-3xl bg-popover border border-border text-foreground max-h-[90vh] overflow-y-auto!">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
              <Edit2 className="size-5 text-primary" /> Editar Treino do Aluno
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Modifique os metadados do treino ou ajuste o cronograma semanal de exercícios específicos para este aluno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editDayOfWeek" className="font-bold text-neutral-300">Dia de Execução Semanal</Label>
                <Select value={editDayOfWeek} onValueChange={setEditDayOfWeek}>
                  <SelectTrigger id="editDayOfWeek" className="bg-background border-border h-10 w-full min-w-0 max-w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editName" className="font-bold text-neutral-300">Nome do Treino</Label>
                <Input
                  id="editName"
                  className="bg-background border-border h-10"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editMuscleGroup" className="font-bold text-neutral-300">Grupamento Muscular Principal</Label>
                <Input
                  id="editMuscleGroup"
                  className="bg-background border-border h-10"
                  value={editMuscleGroup}
                  onChange={(e) => setEditMuscleGroup(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editGoal" className="font-bold text-neutral-300">Objetivo</Label>
                <Select value={editGoal} onValueChange={setEditGoal}>
                  <SelectTrigger id="editGoal" className="bg-background border-border h-10 w-full min-w-0 max-w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="Emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="Força">Força</SelectItem>
                    <SelectItem value="Resistência">Resistência</SelectItem>
                    <SelectItem value="Definição">Definição</SelectItem>
                    <SelectItem value="Cardio">Cardio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDifficulty" className="font-bold text-neutral-300">Dificuldade</Label>
                <Select value={editDifficulty} onValueChange={setEditDifficulty}>
                  <SelectTrigger id="editDifficulty" className="bg-background border-border h-10 w-full min-w-0 max-w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="Iniciante">Iniciante</SelectItem>
                    <SelectItem value="Intermediário">Intermediário</SelectItem>
                    <SelectItem value="Avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDuration" className="font-bold text-neutral-300">Duração Estimada</Label>
                <Input
                  id="editDuration"
                  className="bg-background border-border h-10"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editRestBetweenExercises" className="font-bold text-neutral-300">Descanso Exercícios</Label>
                <Input
                  id="editRestBetweenExercises"
                  placeholder="Ex: 2 min"
                  className="bg-background border-border h-10"
                  value={editRestBetweenExercises}
                  onChange={(e) => setEditRestBetweenExercises(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-border dark:border-neutral-900">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <span className="font-extrabold text-sm uppercase text-muted-foreground tracking-wider">Exercícios Cadastrados</span>
                <div className="flex flex-wrap items-center gap-2">
                  {editExercises.length >= 2 && (
                    <Button
                      type="button"
                      variant={editSelectMode ? "default" : "outline"}
                      onClick={() => {
                        setEditSelectMode(!editSelectMode);
                        setEditSelectedIndexes([]);
                      }}
                      size="sm"
                      className="h-8 text-xs font-semibold"
                    >
                      {editSelectMode ? "Cancelar Seleção" : "Selecionar Exercícios"}
                    </Button>
                  )}

                  {editSelectMode && editSelectedIndexes.length >= 2 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenEditGroupDialog}
                      size="sm"
                      className="h-8 text-xs font-semibold border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 gap-1"
                    >
                      Agrupar ({editSelectedIndexes.length})
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 font-semibold border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900 text-xs"
                    onClick={() => setExerciseDialogOpen(true)}
                  >
                    <Plus className="size-3.5 mr-1" /> Adicionar Exercício
                  </Button>
                </div>
              </div>

              {editExercises.length === 0 ? (
                <div className="p-6 border border-dashed border-border dark:border-neutral-800 rounded-xl text-center bg-card dark:bg-neutral-950 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <Info className="size-4 text-blue-500/80 shrink-0" />
                  <span>Sem exercícios listados. Adicione algum exercício acima.</span>
                </div>
              ) : (
                <div className="space-y-3 pr-1">
                  {editExercises.map((ex, idx) => (
                    <div
                      key={ex.exerciseId}
                      className="p-3.5 border border-border rounded-xl bg-background/50 hover:bg-background/80 transition flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center relative"
                    >
                      {editSelectMode && (
                        <div className="flex items-center shrink-0">
                          <Checkbox
                            checked={editSelectedIndexes.includes(idx)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setEditSelectedIndexes(prev => [...prev, idx]);
                              } else {
                                setEditSelectedIndexes(prev => prev.filter(i => i !== idx));
                              }
                            }}
                            className="mr-2 sm:mr-0"
                          />
                        </div>
                      )}

                      <div className="flex-1 flex flex-col gap-3">
                        {/* Top Row: Info & Badges + Positioning & Delete Actions */}
                        <div className="flex flex-row items-start justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <button
                              type="button"
                              disabled={!ex.videoUrl}
                              onClick={() => {
                                setPreviewExercise({
                                  id: ex.exerciseId,
                                  name: ex.name,
                                  videoUrl: ex.videoUrl,
                                  muscleGroup: { name: ex.muscleGroup }
                                });
                                setIsPreviewModalOpen(true);
                              }}
                              className={cn(
                                "size-8 sm:size-9 rounded-lg bg-secondary flex items-center justify-center shrink-0 border border-border transition-all relative group/thumb",
                                ex.videoUrl ? "hover:border-primary/50 cursor-pointer" : "cursor-default"
                              )}
                            >
                              <Activity className="size-4 text-primary group-hover/thumb:scale-110 transition-transform" />
                              {ex.videoUrl && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg">
                                  <Play className="size-3 fill-white " />
                                </div>
                              )}
                            </button>
                            <div className="min-w-0">
                              <h4 className="font-semibold text-sm text-foreground truncate">{ex.name}</h4>
                              <div className="flex flex-wrap items-center gap-1 mt-0.5">
                                <Badge variant="secondary" className="text-[9px] bg-secondary/80 text-muted-foreground px-1.5 py-0">
                                  {ex.muscleGroup}
                                </Badge>

                                {ex.groupId && (
                                  <Badge className="bg-primary/10 text-primary border border-primary/20 text-[9px] font-bold gap-1 pr-1 px-1.5 py-0">
                                    🔗 {getEditGroupLabel(ex.groupId)}
                                    <button
                                      type="button"
                                      onClick={() => handleEditUngroup(ex.groupId)}
                                      className="hover:text-destructive text-neutral-500 font-bold text-[10px] leading-none"
                                    >
                                      &times;
                                    </button>
                                  </Badge>
                                )}

                                {ex.methodType === "DROPSET" && (
                                  <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0">
                                    Dropset
                                  </Badge>
                                )}

                                {ex.methodType === "REST_PAUSE" && (
                                  <Badge className="bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold px-1.5 py-0">
                                    Rest-Pause
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 shrink-0">
                            {ex.videoUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setPreviewExercise({
                                    id: ex.exerciseId,
                                    name: ex.name,
                                    videoUrl: ex.videoUrl,
                                    muscleGroup: { name: ex.muscleGroup }
                                  });
                                  setIsPreviewModalOpen(true);
                                }}
                                className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                                title="Visualizar execução"
                              >
                                <Play className="size-4 fill-primary" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveExerciseInEdit(idx, "up")}
                              disabled={idx === 0}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => moveExerciseInEdit(idx, "down")}
                              disabled={idx === editExercises.length - 1}
                              className="h-8 w-8 text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                              <ArrowDown className="size-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeExerciseFromEditList(idx)}
                              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Middle Row: Inputs + Method configuration */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/10 sm:border-0">
                          {!ex.isIndividual && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full sm:w-72 shrink-0">
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                                <Input
                                  type="number"
                                  value={ex.sets}
                                  onChange={(e) => handleUpdateExerciseField(idx, "sets", e.target.value, true)}
                                  className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                  min={1}
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Reps</span>
                                <Input
                                  type="text"
                                  value={ex.reps}
                                  onChange={(e) => handleUpdateExerciseField(idx, "reps", e.target.value, true)}
                                  className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                  placeholder="Ex: 10"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-bold text-muted-foreground pl-0.5 flex items-center gap-0.5 select-none">
                                  Carga
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="size-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs bg-neutral-900 border border-neutral-800  p-2.5 rounded-xl shadow-xl">
                                        Se não for atribuída uma carga, o próprio aluno que vai colocar quando estiver treinando.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </span>
                                <Input
                                  type="text"
                                  value={ex.load || ""}
                                  onChange={(e) => handleUpdateExerciseField(idx, "load", e.target.value, true)}
                                  className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                  placeholder="Auto"
                                />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Desc.</span>
                                <Input
                                  type="text"
                                  value={ex.rest || "60s"}
                                  onChange={(e) => handleUpdateExerciseField(idx, "rest", e.target.value, true)}
                                  className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                  placeholder="Ex: 60s"
                                />
                              </div>
                            </div>
                          )}

                          {ex.isIndividual && (
                            <div className="space-y-1 w-full sm:w-24 shrink-0">
                              <span className="text-[9px] uppercase font-bold text-muted-foreground block pl-0.5">Séries</span>
                              <Input
                                type="number"
                                value={ex.sets}
                                onChange={(e) => handleUpdateExerciseField(idx, "sets", e.target.value, true)}
                                className="h-8 bg-card border-border w-full text-center text-xs px-1"
                                min={1}
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEditMethodDialog(idx)}
                              className="h-8 w-full sm:w-auto gap-1 text-xs border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/40 shrink-0"
                            >
                              Método
                            </Button>
                          </div>
                        </div>

                        {/* Bottom Row: Checkboxes */}
                        <div className="flex flex-wrap items-center gap-4 px-0.5">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`edit-individual-${idx}`}
                              checked={ex.isIndividual || false}
                              onCheckedChange={(checked) => handleToggleIndividual(idx, !!checked, true)}
                              className="rounded size-3.5"
                            />
                            <label
                              htmlFor={`edit-individual-${idx}`}
                              className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none"
                            >
                              Configurar séries individualmente
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id={`edit-bodyweight-${idx}`}
                              checked={String(ex.load || "").toLowerCase().includes("p.c")}
                              onCheckedChange={(checked) => handleToggleBodyweight(idx, !!checked, true)}
                              className="rounded size-3.5"
                            />
                            <label
                              htmlFor={`edit-bodyweight-${idx}`}
                              className="text-[11px] text-muted-foreground cursor-pointer font-medium select-none"
                            >
                              Peso do corpo
                            </label>
                          </div>
                        </div>

                        {/* Individual Sets */}
                        {ex.isIndividual && (
                          <div className="mt-1 border-t border-border/40 pt-3 space-y-2.5">
                            <div className="grid grid-cols-[30px_1fr_1fr_1fr] gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
                              <div>Série</div>
                              <div>Reps</div>
                              <div className="flex items-center gap-0.5 select-none">
                                Carga
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="size-3 text-muted-foreground hover:text-foreground cursor-pointer shrink-0" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs bg-neutral-900 border border-neutral-800  p-2.5 rounded-xl shadow-xl">
                                      Se não for atribuída uma carga, o próprio aluno que vai colocar quando estiver treinando.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <div>Descanso</div>
                            </div>

                            <div className="space-y-1.5">
                              {Array.from({ length: ex.sets }).map((_, si) => {
                                const setItem = ex.individualSets?.[si] || { reps: "10", load: "", rest: "60s" };
                                return (
                                  <div key={si} className="grid grid-cols-[30px_1fr_1fr_1fr] gap-2 items-center">
                                    <span className="text-xs font-semibold text-neutral-400 pl-0.5">#{si + 1}</span>
                                    <Input
                                      type="text"
                                      value={setItem.reps}
                                      onChange={(e) => handleUpdateIndividualSetField(idx, si, "reps", e.target.value, true)}
                                      className="h-8 bg-card border-border text-center text-xs font-semibold"
                                      placeholder="10"
                                    />
                                    <Input
                                      type="text"
                                      value={String(setItem.load || "").toLowerCase().includes("p.c") ? "p.c." : setItem.load}
                                      onChange={(e) => handleUpdateIndividualSetField(idx, si, "load", e.target.value, true)}
                                      disabled={String(setItem.load || "").toLowerCase().includes("p.c")}
                                      className="h-8 bg-card border-border text-center text-xs font-semibold disabled:opacity-80"
                                      placeholder={String(setItem.load || "").toLowerCase().includes("p.c") ? "p.c." : "Auto"}
                                    />
                                    <Input
                                      type="text"
                                      value={setItem.rest}
                                      onChange={(e) => handleUpdateIndividualSetField(idx, si, "rest", e.target.value, true)}
                                      className="h-8 bg-card border-border text-center text-xs font-semibold"
                                      placeholder="60s"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button
                type="button"
                variant="outline"
                className="border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900"
                onClick={() => setIsEditModalOpen(false)}
                disabled={submittingEdit}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 font-semibold px-5"
                disabled={submittingEdit}
              >
                {submittingEdit ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={exerciseDialogOpen} onOpenChange={setExerciseDialogOpen}>
        <DialogContent className="max-w-md w-[95%] overflow-y-auto! rounded-xl!">
          <DialogHeader>
            <DialogTitle>Pesquisar Exercício</DialogTitle>
            <DialogDescription>Selecione um grupamento muscular e selecione os exercícios desejados.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Grupamento Muscular
              </span>
              {muscleGroups.length === 0 ? (
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 3, 4].map((n) => (
                    <Skeleton key={n} className="h-8 w-16 rounded-full" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {muscleGroups.map((group) => {
                    const isActive = selectedMuscleGroupId === group.id;
                    return (
                      <Button
                        key={group.id}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedMuscleGroupId(group.id)}
                        className={cn(
                          "h-8 px-3 rounded-full flex-1 text-xs font-medium transition-all",
                          isActive
                            ? "bg-primary text-black hover:bg-primary/90"
                            : "border-border hover:bg-secondary/40 text-muted-foreground"
                        )}
                      >
                        {group.name}
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Exercícios Disponíveis
              </span>
              <Input
                type="text"
                placeholder="Pesquisar exercício pelo nome..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 bg-card border-border text-xs mb-2"
              />
              <div className="border border-border rounded-lg bg-background max-h-50 overflow-y-auto p-2 space-y-1">
                {loadingExercises ? (
                  <div className="space-y-1 py-2">
                    {[1, 2, 3, 4].map((n) => (
                      <Skeleton key={n} className="h-9 w-full rounded-md" />
                    ))}
                  </div>
                ) : dbExercises.filter((ex) =>
                  ex.name.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                  <div className="py-10 text-center text-xs text-muted-foreground">
                    {searchQuery
                      ? "Nenhum exercício corresponde à sua pesquisa."
                      : "Nenhum exercício registrado para este grupo."}
                  </div>
                ) : (
                  dbExercises
                    .filter((ex) =>
                      ex.name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((exercise) => {
                      const isEdit = isEditModalOpen;
                      const currentList = isEdit ? editExercises : customExercises;
                      const isAdded = currentList.some((ex: any) => ex.exerciseId === exercise.id);
                      const isChecked = tempSelected.some((ex) => ex.id === exercise.id);
                      return (
                        <div
                          key={exercise.id}
                          className={cn(
                            "w-full p-2.5 rounded-md flex items-center justify-between transition text-sm border gap-2",
                            isAdded
                              ? "bg-muted/20 border-transparent opacity-60"
                              : isChecked
                                ? "bg-primary/10 border-primary/50 text-primary"
                                : "bg-transparent border-transparent hover:bg-secondary/40 text-foreground"
                          )}
                        >
                          <button
                            type="button"
                            disabled={isAdded}
                            onClick={() => handleToggleTempSelected(exercise)}
                            className="flex-1 text-left font-medium min-w-0 truncate disabled:cursor-not-allowed"
                          >
                            {exercise.name}
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {exercise.videoUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewExercise(exercise);
                                  setIsPreviewModalOpen(true);
                                }}
                              >
                                <Play className="size-3.5 fill-muted-foreground" />
                              </Button>
                            )}
                            <button
                              type="button"
                              disabled={isAdded}
                              onClick={() => handleToggleTempSelected(exercise)}
                              className="shrink-0 flex items-center justify-center size-5 rounded-md border border-neutral-700 bg-neutral-950 disabled:cursor-not-allowed"
                            >
                              {(isAdded || isChecked) && (
                                <Check className={cn("size-3.5", isAdded ? "text-muted-foreground" : "text-primary")} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {tempSelected.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/40">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Exercícios Selecionados ({tempSelected.length})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                  {tempSelected.map((ex) => (
                    <Badge
                      key={ex.id}
                      variant="secondary"
                      className="gap-1 px-2.5 py-1 min-w-fit flex-1 text-xs font-medium bg-secondary text-foreground rounded-full border border-border"
                    >
                      {ex.name}
                      <button
                        type="button"
                        onClick={() => setTempSelected((prev) => prev.filter((item) => item.id !== ex.id))}
                        className="hover:text-destructive text-neutral-500 font-bold ml-1 text-sm"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-border mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setTempSelected([]);
                  setExerciseDialogOpen(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmAddExercises}
                disabled={tempSelected.length === 0}
                className="gap-1.5"
              >
                Confirmar Adição ({tempSelected.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== ALERT DIALOG: CONFIRM DELETION ==================== */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-card dark:bg-neutral-950 border border-border dark:border-neutral-850 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">Remover Treino Semanal?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Esta ação desvinculará o treino <strong className="text-foreground font-semibold">"{workoutToDelete?.name}"</strong> da agenda semanal do aluno.
              O treino e sua distribuição de exercícios não serão mais exibidos neste dia da semana. Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900 text-foreground"
              disabled={submittingDelete}
              onClick={() => {
                setIsDeleteAlertOpen(false);
                setWorkoutToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/85  font-bold"
              disabled={submittingDelete}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
            >
              {submittingDelete ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Removendo...
                </>
              ) : (
                "Sim, Remover Treino"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Workout - Individual Exercise Method Dialog */}
      <Dialog open={editMethodDialogOpen} onOpenChange={setEditMethodDialogOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl bg-popover border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Configurar Método Avançado</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escolha um método para aplicar a este exercício específico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "NONE", label: "Nenhum" },
                { id: "DROPSET", label: "Dropset" },
                { id: "REST_PAUSE", label: "Rest-Pause" }
              ].map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={editActiveMethodType === m.id ? "default" : "outline"}
                  onClick={() => setEditActiveMethodType(m.id as any)}
                  className="h-9 text-xs"
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {editActiveMethodType === "DROPSET" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Quedas (Drops)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={editDropsCount === d ? "default" : "outline"}
                        onClick={() => setEditDropsCount(d)}
                        className="h-9 text-xs"
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Redução da Carga
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 40].map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={editDropsReduction === r ? "default" : "outline"}
                        onClick={() => setEditDropsReduction(r)}
                        className="h-9 text-xs"
                      >
                        {r}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {editActiveMethodType === "REST_PAUSE" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Tempo de Pausa
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 20].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={editRestPauseTime === p ? "default" : "outline"}
                        onClick={() => setEditRestPauseTime(p)}
                        className="h-9 text-xs"
                      >
                        {p}s
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Repetições de Pausa (Rounds)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={editRestPauseRounds === r ? "default" : "outline"}
                        onClick={() => setEditRestPauseRounds(r)}
                        className="h-9 text-xs"
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditMethodDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveEditMethod}
              >
                Salvar Método
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Workout - Method Configuration Dialog */}
      <Dialog open={customMethodDialogOpen} onOpenChange={setCustomMethodDialogOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl bg-popover border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Configurar Método Avançado</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Escolha um método para aplicar a este exercício específico.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "NONE", label: "Nenhum" },
                { id: "DROPSET", label: "Dropset" },
                { id: "REST_PAUSE", label: "Rest-Pause" }
              ].map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={customActiveMethodType === m.id ? "default" : "outline"}
                  onClick={() => setCustomActiveMethodType(m.id as any)}
                  className="h-9 text-xs"
                >
                  {m.label}
                </Button>
              ))}
            </div>

            {customActiveMethodType === "DROPSET" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Quedas (Drops)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={customDropsCount === d ? "default" : "outline"}
                        onClick={() => setCustomDropsCount(d)}
                        className="h-9 text-xs"
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Redução da Carga
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[10, 20, 30, 40].map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={customDropsReduction === r ? "default" : "outline"}
                        onClick={() => setCustomDropsReduction(r)}
                        className="h-9 text-xs"
                      >
                        {r}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {customActiveMethodType === "REST_PAUSE" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Tempo de Pausa
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[10, 15, 20].map((p) => (
                      <Button
                        key={p}
                        type="button"
                        variant={customRestPauseTime === p ? "default" : "outline"}
                        onClick={() => setCustomRestPauseTime(p)}
                        className="h-9 text-xs"
                      >
                        {p}s
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Repetições de Pausa (Rounds)
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((r) => (
                      <Button
                        key={r}
                        type="button"
                        variant={customRestPauseRounds === r ? "default" : "outline"}
                        onClick={() => setCustomRestPauseRounds(r)}
                        className="h-9 text-xs"
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomMethodDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSaveCustomMethod}
              >
                Salvar Método
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Workout - Group Configuration Dialog */}
      <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
        <DialogContent className="max-w-md w-[95%] rounded-xl bg-popover border border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Agrupar Exercícios</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Crie um método agrupado para os exercícios selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Tipo do Grupo
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "BISET", label: "Biset" },
                  { id: "TRISET", label: "Triset" },
                  { id: "CIRCUIT", label: "Circuito" }
                ].map((t) => {
                  const minEx = t.id === "TRISET" ? 3 : 2;
                  const isBlocked = editSelectedIndexes.length < minEx;
                  return (
                    <Button
                      key={t.id}
                      type="button"
                      disabled={isBlocked}
                      variant={editGroupType === t.id ? "default" : "outline"}
                      onClick={() => setEditGroupType(t.id as any)}
                      className={cn("h-10 text-xs flex flex-col items-center justify-center gap-0.5", isBlocked && "opacity-45")}
                    >
                      <span>{t.label}</span>
                      <span className="text-[8px] opacity-70">mín. {minEx} ex.</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {editGroupType === "CIRCUIT" && (
              <div className="space-y-4 border-t border-border/40 pt-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Número de Voltas
                  </Label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((v) => (
                      <Button
                        key={v}
                        type="button"
                        variant={editCircuitRounds === v ? "default" : "outline"}
                        onClick={() => setEditCircuitRounds(v)}
                        className="h-9 text-xs"
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                    Descanso entre voltas
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: 30, label: "30s" },
                      { val: 60, label: "60s" },
                      { val: 90, label: "90s" },
                      { val: 120, label: "120s" }
                    ].map((d) => (
                      <Button
                        key={d.val}
                        type="button"
                        variant={editCircuitRest === d.val ? "default" : "outline"}
                        onClick={() => setEditCircuitRest(d.val)}
                        className="h-9 text-xs"
                      >
                        {d.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditGroupDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleConfirmEditGrouping}
              >
                Criar Grupo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-3xl bg-popover border border-border text-foreground max-h-[90vh] overflow-y-auto!">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
              <Scale className="size-5 text-primary" /> Registrar Novas Medidas Corporais
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Insira o peso, altura, composição corporal e as circunferências do aluno. Deixe campos em branco caso não tenham sido mensurados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleProgressSubmit} className="space-y-6 pt-2">
            {/* Seção 1: Geral e Composição */}
            <div className="space-y-3 bg-muted/10 dark:bg-neutral-900/10 border border-border dark:border-neutral-900 rounded-xl p-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border dark:border-neutral-900 pb-1.5">
                <Activity className="size-3.5" /> Informações Gerais e Composição
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label htmlFor="progressDate" className="text-[11px] font-bold text-neutral-300">Data Registro</Label>
                  <Input
                    id="progressDate"
                    type="date"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressDate}
                    onChange={(e) => setProgressDate(e.target.value)}
                    disabled={submittingProgress}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressWeight" className="text-[11px] font-bold text-neutral-300">Peso (kg)</Label>
                  <Input
                    id="progressWeight"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 82.5"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressWeight}
                    onChange={(e) => setProgressWeight(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressHeight" className="text-[11px] font-bold text-neutral-300">Altura (cm)</Label>
                  <Input
                    id="progressHeight"
                    type="number"
                    placeholder="Ex: 178"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressHeight}
                    onChange={(e) => setProgressHeight(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressBodyFat" className="text-[11px] font-bold text-neutral-300">Gordura (BF%)</Label>
                  <Input
                    id="progressBodyFat"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 14.5"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressBodyFat}
                    onChange={(e) => setProgressBodyFat(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressMuscleMass" className="text-[11px] font-bold text-neutral-300">Massa Magra%</Label>
                  <Input
                    id="progressMuscleMass"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 42.0"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressMuscleMass}
                    onChange={(e) => setProgressMuscleMass(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
              </div>
            </div>

            {/* Seção 2: Membros Superiores */}
            <div className="space-y-3 bg-muted/10 dark:bg-neutral-900/10 border border-border dark:border-neutral-900 rounded-xl p-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border dark:border-neutral-900 pb-1.5">
                <Ruler className="size-3.5" /> Tronco e Membros Superiores (cm)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="progressChest" className="text-[11px] font-bold text-neutral-300">Tórax / Peito</Label>
                  <Input
                    id="progressChest"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 104"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressChest}
                    onChange={(e) => setProgressChest(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressWaist" className="text-[11px] font-bold text-neutral-300">Cintura</Label>
                  <Input
                    id="progressWaist"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 80"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressWaist}
                    onChange={(e) => setProgressWaist(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressAbdomen" className="text-[11px] font-bold text-neutral-300">Abdômen</Label>
                  <Input
                    id="progressAbdomen"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 85"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressAbdomen}
                    onChange={(e) => setProgressAbdomen(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressHips" className="text-[11px] font-bold text-neutral-300">Quadril</Label>
                  <Input
                    id="progressHips"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 96"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressHips}
                    onChange={(e) => setProgressHips(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressRightArm" className="text-[11px] font-bold text-neutral-300">Braço Direito</Label>
                  <Input
                    id="progressRightArm"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 38"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressRightArm}
                    onChange={(e) => setProgressRightArm(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressLeftArm" className="text-[11px] font-bold text-neutral-300">Braço Esquerdo</Label>
                  <Input
                    id="progressLeftArm"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 37.5"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressLeftArm}
                    onChange={(e) => setProgressLeftArm(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressRightForearm" className="text-[11px] font-bold text-neutral-300">Antebraço Dir.</Label>
                  <Input
                    id="progressRightForearm"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 30"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressRightForearm}
                    onChange={(e) => setProgressRightForearm(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressLeftForearm" className="text-[11px] font-bold text-neutral-300">Antebraço Esq.</Label>
                  <Input
                    id="progressLeftForearm"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 29.5"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressLeftForearm}
                    onChange={(e) => setProgressLeftForearm(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
              </div>
            </div>

            {/* Seção 3: Membros Inferiores */}
            <div className="space-y-3 bg-muted/10 dark:bg-neutral-900/10 border border-border dark:border-neutral-900 rounded-xl p-4">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border dark:border-neutral-900 pb-1.5">
                <Ruler className="size-3.5" /> Membros Inferiores (cm)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="progressRightThigh" className="text-[11px] font-bold text-neutral-300">Coxa Direita</Label>
                  <Input
                    id="progressRightThigh"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 56"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressRightThigh}
                    onChange={(e) => setProgressRightThigh(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressLeftThigh" className="text-[11px] font-bold text-neutral-300">Coxa Esquerda</Label>
                  <Input
                    id="progressLeftThigh"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 55.5"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressLeftThigh}
                    onChange={(e) => setProgressLeftThigh(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressRightCalf" className="text-[11px] font-bold text-neutral-300">Panturrilha Dir.</Label>
                  <Input
                    id="progressRightCalf"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 38"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressRightCalf}
                    onChange={(e) => setProgressRightCalf(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="progressLeftCalf" className="text-[11px] font-bold text-neutral-300">Panturrilha Esq.</Label>
                  <Input
                    id="progressLeftCalf"
                    type="number"
                    step="0.1"
                    placeholder="Ex: 37.5"
                    className="bg-popover border-border h-9 text-xs"
                    value={progressLeftCalf}
                    onChange={(e) => setProgressLeftCalf(e.target.value)}
                    disabled={submittingProgress}
                  />
                </div>
              </div>
            </div>

            {/* Seção 4: Notas e Observações */}
            <div className="space-y-2">
              <Label htmlFor="progressNotes" className="text-xs font-semibold text-neutral-300">Notas / Observações Gerais</Label>
              <textarea
                id="progressNotes"
                placeholder="Insira observações relevantes sobre o estado físico, dieta ou limitações clínicas do aluno..."
                className="w-full bg-muted dark:bg-neutral-900 border border-border dark:border-neutral-800 text-xs rounded-lg p-3 min-h-[80px] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground transition-all"
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                disabled={submittingProgress}
              />
            </div>

            <DialogFooter className="gap-2 mt-4 pt-4 border-t border-border dark:border-neutral-900">
              <Button
                type="button"
                variant="outline"
                className="border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900 text-xs"
                onClick={() => setIsProgressModalOpen(false)}
                disabled={submittingProgress}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary text-neutral-950 hover:bg-primary/90 font-bold text-xs"
                disabled={submittingProgress}
              >
                {submittingProgress ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" />
                    Registrando...
                  </>
                ) : (
                  "Salvar Medições"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG 5: ADICIONAR FOTO DE EVOLUÇÃO ==================== */}
      <Dialog open={isPhotoModalOpen} onOpenChange={setIsPhotoModalOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-lg bg-popover border border-border text-foreground max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold flex items-center gap-2 text-foreground">
              <Camera className="size-5 text-primary" /> Adicionar Foto de Evolução
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Selecione uma foto de evolução do seu computador para adicionar ao histórico visual de progresso do aluno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePhotoSubmit} className="space-y-4 pt-2">
            {/* File Upload / Drag-and-drop Dropzone */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-neutral-300">Arquivo de Imagem</Label>

              {!newPhotoUrl ? (
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 dark:border-neutral-800 rounded-2xl p-6 bg-muted/20 dark:bg-neutral-900/10 hover:bg-muted/40 dark:hover:bg-neutral-900/20 transition-all relative group cursor-pointer min-h-[140px]">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 5 * 1024 * 1024) {
                          toast.error("A imagem deve ter no máximo 5MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewPhotoUrl(reader.result as string);
                          toast.success("Imagem carregada com sucesso!");
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center text-center space-y-2 pointer-events-none">
                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Camera className="size-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Selecione uma imagem de evolução</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">PNG, JPG ou JPEG de até 5MB</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-border dark:border-neutral-800 bg-muted/40 dark:bg-neutral-900/25 p-3 flex flex-col items-center justify-center gap-3">
                  <div className="relative aspect-[3/4] w-36 rounded-lg overflow-hidden border border-border dark:border-neutral-800 shadow-md">
                    <img
                      src={newPhotoUrl}
                      alt="Preview da evolução"
                      className="object-cover w-full h-full"
                    />
                    <button
                      type="button"
                      onClick={() => setNewPhotoUrl("")}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-neutral-950/80  hover:bg-red-500 transition-colors active:scale-90"
                      title="Remover imagem"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Imagem Selecionada</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newPhotoDate" className="text-xs font-semibold text-neutral-300">Data do Registro</Label>
                  <Input
                    id="newPhotoDate"
                    type="date"
                    className="bg-popover border-border h-9 text-xs"
                    value={newPhotoDate}
                    onChange={(e) => setNewPhotoDate(e.target.value)}
                    disabled={submittingPhoto}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPhotoComment" className="text-xs font-semibold text-neutral-300">Feedback / Comentário Inicial</Label>
                  <Input
                    id="newPhotoComment"
                    placeholder="Ex: Excelente progresso visual."
                    className="bg-popover border-border h-9 text-xs"
                    value={newPhotoComment}
                    onChange={(e) => setNewPhotoComment(e.target.value)}
                    disabled={submittingPhoto}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4 pt-4 border-t border-border dark:border-neutral-900">
              <Button
                type="button"
                variant="outline"
                className="border-border dark:border-neutral-800 hover:bg-muted dark:bg-neutral-900 text-xs"
                onClick={() => setIsPhotoModalOpen(false)}
                disabled={submittingPhoto}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary text-neutral-950 hover:bg-primary/90 font-bold text-xs"
                disabled={submittingPhoto || !newPhotoUrl}
              >
                {submittingPhoto ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" />
                    Adicionando...
                  </>
                ) : (
                  "Adicionar Foto"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== ALERT DIALOG: CONFIRM DELETE MEASUREMENT ==================== */}
      <AlertDialog open={isDeleteProgressAlertOpen} onOpenChange={setIsDeleteProgressAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">Excluir Registro de Medidas?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Você tem certeza que deseja remover esta avaliação registrada no dia <strong className="text-foreground font-semibold">{progressToDelete ? new Date(progressToDelete.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""}</strong>?
              Essa ação é irreversível e removerá permanentemente os valores do peso ({progressToDelete?.weight} kg) e circunferências associadas dos históricos e gráficos do aluno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="border-border hover:bg-muted text-foreground"
              disabled={submittingDeleteProgress}
              onClick={() => {
                setIsDeleteProgressAlertOpen(false);
                setProgressToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/85  font-bold"
              disabled={submittingDeleteProgress}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteProgressConfirm();
              }}
            >
              {submittingDeleteProgress ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Excluindo...
                </>
              ) : (
                "Sim, Excluir Medida"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== ALERT DIALOG: CONFIRM DELETE PHOTO ==================== */}
      <AlertDialog open={isDeletePhotoAlertOpen} onOpenChange={setIsDeletePhotoAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground">Remover Foto da Linha do Tempo?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Tem certeza absoluta que deseja excluir a foto de evolução física enviada em <strong className="text-foreground font-semibold">{photoToDelete ? new Date(photoToDelete.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""}</strong>?
              Essa imagem será apagada permanentemente do banco de dados e sumirá da linha do tempo. Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              className="border-border hover:bg-muted text-foreground"
              disabled={submittingDeletePhoto}
              onClick={() => {
                setIsDeletePhotoAlertOpen(false);
                setPhotoToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/85  font-bold"
              disabled={submittingDeletePhoto}
              onClick={(e) => {
                e.preventDefault();
                handleDeletePhotoConfirm();
              }}
            >
              {submittingDeletePhoto ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Removendo...
                </>
              ) : (
                "Sim, Remover Foto"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PhysicalEvaluationFormModal
        isOpen={isEvalModalOpen}
        onClose={() => setIsEvalModalOpen(false)}
        studentId={studentId}
        workspaceId={activeWorkspaceId || ""}
        studentName={student?.name}
        studentGender={student?.gender}
        studentBirthDate={student?.birthDate}
        studentHeight={student?.height}
        studentWeight={student?.weight}
        studentObjective={student?.objective}
        onSuccess={fetchStudentEvaluations}
      />

      <PhysicalEvaluationDetailModal
        isOpen={isEvalDetailModalOpen}
        onClose={() => setIsEvalDetailModalOpen(false)}
        evaluation={selectedEval}
      />

      {/* ==================== ALERT DIALOG: CONFIRM DELETE PHYSICAL EVALUATION ==================== */}
      <AlertDialog open={isDeleteEvalAlertOpen} onOpenChange={setIsDeleteEvalAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500 shrink-0 animate-bounce" /> Excluir Registro de Avaliação Física?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Você tem certeza que deseja remover a avaliação física registrada no dia <strong className="text-foreground font-semibold">{evalToDelete ? new Date(evalToDelete.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : ""}</strong>?
              Esta ação é <span className="text-rose-600 dark:text-rose-455 font-semibold underline">totalmente irreversível</span> e removerá permanentemente os valores associados de peso ({evalToDelete?.weight} kg), percentual de gordura ({evalToDelete?.bodyFat}%) e todos os históricos e dados antropométricos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs"
              disabled={submittingDeleteEval}
              onClick={() => {
                setIsDeleteEvalAlertOpen(false);
                setEvalToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500  font-bold rounded-xl text-xs"
              disabled={submittingDeleteEval}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteEvalConfirm();
              }}
            >
              {submittingDeleteEval ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Removendo...
                </>
              ) : (
                "Sim, Excluir Avaliação"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== DIALOG: REGISTRAR LANÇAMENTO ==================== */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md bg-card border border-border text-foreground rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
              <DollarSign className="size-5 text-emerald-600 dark:text-emerald-400" /> Registrar Lançamento
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Adicione uma mensalidade, taxa ou cobrança para a ficha financeira do aluno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePaymentSubmit} className="space-y-4 pt-2">
            {/* Descrição / Plano */}
            <div className="space-y-1.5">
              <Label htmlFor="paymentPlanName" className="text-xs font-bold text-muted-foreground">Descrição / Plano *</Label>
              <Input
                id="paymentPlanName"
                placeholder="Ex: Mensalidade - Plano Trimestral"
                className="bg-secondary/50 border-border focus:border-emerald-500/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                value={paymentPlanName}
                onChange={(e) => setPaymentPlanName(e.target.value)}
                disabled={submittingPayment}
                required
              />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="paymentAmount" className="text-xs font-bold text-muted-foreground">Valor (R$) *</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="bg-secondary/50 border-border focus:border-emerald-500/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={submittingPayment}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentDate" className="text-xs font-bold text-muted-foreground">Data de Vencimento *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  className="bg-secondary/50 border-border focus:border-emerald-500/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={submittingPayment}
                  required
                />
              </div>
            </div>

            {/* Status e Método */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="paymentStatus" className="text-xs font-bold text-muted-foreground">Status de Pagamento</Label>
                <Select value={paymentStatus} onValueChange={(val) => setPaymentStatus(val as any)} disabled={submittingPayment}>
                  <SelectTrigger id="paymentStatus" className="bg-secondary/50 border-border h-10 text-xs rounded-xl text-foreground w-full min-w-0 max-w-full focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="pago" className="text-xs">Pago</SelectItem>
                    <SelectItem value="pendente" className="text-xs">Pendente</SelectItem>
                    <SelectItem value="atrasado" className="text-xs">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paymentMethod" className="text-xs font-bold text-muted-foreground">Método de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)} disabled={submittingPayment}>
                  <SelectTrigger id="paymentMethod" className="bg-secondary/50 w-full! border-border h-12 text-xs rounded-xl text-foreground min-w-0 max-w-full focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="PIX" className="text-xs">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD" className="text-xs">Cartão de Crédito</SelectItem>
                    <SelectItem value="BOLETO" className="text-xs">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="border-border hover:bg-muted text-xs rounded-xl text-muted-foreground hover:text-foreground"
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={submittingPayment}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs rounded-xl transition-all"
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Lançamento"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DIALOG: EDITAR LANÇAMENTO ==================== */}
      <Dialog open={isEditPaymentModalOpen} onOpenChange={setIsEditPaymentModalOpen}>
        <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-md bg-card border border-border text-foreground rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
              <Edit2 className="size-4 text-blue-400" /> Editar Lançamento
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Atualize as informações do lançamento financeiro do aluno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditPaymentSubmit} className="space-y-4 pt-2">
            {/* Descrição / Plano */}
            <div className="space-y-1.5">
              <Label htmlFor="editPaymentPlanName" className="text-xs font-bold text-muted-foreground">Descrição / Plano *</Label>
              <Input
                id="editPaymentPlanName"
                placeholder="Ex: Mensalidade - Plano Trimestral"
                className="bg-secondary/50 border-border focus:border-blue-500/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                value={paymentPlanName}
                onChange={(e) => setPaymentPlanName(e.target.value)}
                disabled={submittingPayment}
                required
              />
            </div>

            {/* Valor e Data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editPaymentAmount" className="text-xs font-bold text-muted-foreground">Valor (R$) *</Label>
                <Input
                  id="editPaymentAmount"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  className="bg-secondary/50 border-border focus:border-blue-500/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  disabled={submittingPayment}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPaymentDate" className="text-xs font-bold text-muted-foreground">Data de Vencimento *</Label>
                <Input
                  id="editPaymentDate"
                  type="date"
                  className="bg-secondary/50 border-border focus:border-blue-500/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={submittingPayment}
                  required
                />
              </div>
            </div>

            {/* Status e Método */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="editPaymentStatus" className="text-xs font-bold text-muted-foreground">Status de Pagamento</Label>
                <Select value={paymentStatus} onValueChange={(val) => setPaymentStatus(val as any)} disabled={submittingPayment}>
                  <SelectTrigger id="editPaymentStatus" className="bg-secondary/50 border-border h-10 text-xs rounded-xl text-foreground w-full min-w-0 max-w-full focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="pago" className="text-xs">Pago</SelectItem>
                    <SelectItem value="pendente" className="text-xs">Pendente</SelectItem>
                    <SelectItem value="atrasado" className="text-xs">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="editPaymentMethod" className="text-xs font-bold text-muted-foreground">Método de Pagamento</Label>
                <Select value={paymentMethod} onValueChange={(val) => setPaymentMethod(val)} disabled={submittingPayment}>
                  <SelectTrigger id="editPaymentMethod" className="bg-secondary/50 border-border h-10 text-xs rounded-xl text-foreground w-full min-w-0 max-w-full focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Selecione o método" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="PIX" className="text-xs">PIX</SelectItem>
                    <SelectItem value="CREDIT_CARD" className="text-xs">Cartão de Crédito</SelectItem>
                    <SelectItem value="BOLETO" className="text-xs">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="border-border hover:bg-muted text-xs rounded-xl text-muted-foreground hover:text-foreground"
                onClick={() => setIsEditPaymentModalOpen(false)}
                disabled={submittingPayment}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500  font-bold text-xs rounded-xl transition-all"
                disabled={submittingPayment}
              >
                {submittingPayment ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alterações"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== ALERT DIALOG: CONFIRM DELETE PAYMENT ==================== */}
      <AlertDialog open={isDeletePaymentAlertOpen} onOpenChange={setIsDeletePaymentAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500 shrink-0 animate-bounce" /> Excluir Lançamento Financeiro?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Você tem certeza que deseja remover o lançamento <strong className="text-foreground font-semibold">{paymentToDelete?.planName}</strong> no valor de <strong className="text-foreground font-semibold">{(paymentToDelete?.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>?
              Esta ação é <span className="text-rose-600 dark:text-rose-455 font-semibold underline">totalmente irreversível</span> e removerá permanentemente o lançamento da ficha financeira e do histórico do aluno.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs"
              disabled={submittingDeletePayment}
              onClick={() => {
                setIsDeletePaymentAlertOpen(false);
                setPaymentToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500  font-bold rounded-xl text-xs"
              disabled={submittingDeletePayment}
              onClick={(e) => {
                e.preventDefault();
                handleDeletePaymentConfirm();
              }}
            >
              {submittingDeletePayment ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Removendo...
                </>
              ) : (
                "Sim, Excluir Lançamento"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== ALERT DIALOG: CONFIRM REOPEN PAYMENT ==================== */}
      <AlertDialog open={isReopenPaymentAlertOpen} onOpenChange={setIsReopenPaymentAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <RefreshCw className="size-5 text-amber-500 shrink-0 animate-spin" /> Reabrir Cobrança?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Tem certeza que deseja reabrir a cobrança <strong className="text-foreground font-semibold">{paymentToReopen?.planName}</strong> no valor de <strong className="text-foreground font-semibold">{(paymentToReopen?.amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>?
              O status do pagamento voltará para <span className="text-amber-500 font-semibold">Pendente</span> e a baixa automática ou manual anterior será revogada, mantendo o histórico de criação intacto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs"
              onClick={() => {
                setIsReopenPaymentAlertOpen(false);
                setPaymentToReopen(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold rounded-xl text-xs"
              onClick={(e) => {
                e.preventDefault();
                handleReopenPaymentConfirm();
              }}
            >
              Sim, Reabrir Cobrança
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ==================== DIALOG: COMPARTILHAR ARQUIVO ==================== */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="w-full bg-card border border-border text-foreground rounded-2xl! shadow-2xl overflow-y-auto! max-h-[90vh]">
          <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-primary/20 to-transparent" />
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-foreground">
              <Folder className="size-5 text-primary" /> Compartilhar Novo Arquivo
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Envie exames médicos, PDFs de planos ou links na nuvem diretamente para a ficha do aluno.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4 pt-2">
            {/* Nome / Título */}
            <div className="space-y-1.5">
              <Label htmlFor="uploadName" className="text-xs font-bold text-muted-foreground">Título do Documento *</Label>
              <Input
                id="uploadName"
                placeholder="Ex: Exame de Sangue - Check-up Junho"
                className="bg-secondary/50 border-border/50 focus:border-primary/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                disabled={submittingUpload}
                required
              />
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label htmlFor="uploadCategory" className="text-xs font-bold text-muted-foreground">Categoria</Label>
              <Select value={uploadCategory} onValueChange={(val) => setUploadCategory(val)} disabled={submittingUpload}>
                <SelectTrigger id="uploadCategory" className="bg-secondary/50 border-border/50 h-10 text-xs rounded-xl text-foreground w-full min-w-0 max-w-full focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="exames" className="text-xs">Exame / Laudo Médico</SelectItem>
                  <SelectItem value="dieta_treino" className="text-xs">Plano de Treino / Dieta</SelectItem>
                  <SelectItem value="outros" className="text-xs">Outros / Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Origem: Arquivo Local ou Link Nuvem */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">Origem do Arquivo</Label>
              <div className="grid grid-cols-2 p-1 bg-secondary border border-border/50 rounded-xl gap-1">
                <button
                  type="button"
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5",
                    uploadType === "file"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setUploadType("file")}
                  disabled={submittingUpload}
                >
                  <FileText className="size-3.5" /> Arquivo Local
                </button>
                <button
                  type="button"
                  className={cn(
                    "py-1.5 text-xs font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5",
                    uploadType === "link"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setUploadType("link")}
                  disabled={submittingUpload}
                >
                  <Link2 className="size-3.5" /> Link Externo
                </button>
              </div>
            </div>

            {/* Condicional de Upload de Arquivo Local */}
            {uploadType === "file" && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-muted-foreground">Arquivo Local *</Label>
                <div
                  onClick={() => {
                    if (!submittingUpload) {
                      document.getElementById("hidden-file-input")?.click();
                    }
                  }}
                  className={cn(
                    "border border-dashed border-border/60 hover:border-primary/40 rounded-xl p-6 text-center cursor-pointer transition-all bg-muted/30 hover:bg-muted/60 flex flex-col items-center justify-center gap-2 group select-none",
                    uploadFileName ? "border-emerald-500/30 bg-emerald-500/[0.02]" : ""
                  )}
                >
                  <input
                    id="hidden-file-input"
                    type="file"
                    className="hidden"
                    disabled={submittingUpload}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploadFileName(file.name);
                        const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                        setUploadFileSize(`${sizeMB} MB`);
                        setSelectedFileObj(file);
                        if (!uploadName) {
                          const cleanName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                          setUploadName(cleanName.replace(/[-_]/g, ' '));
                        }
                      }
                    }}
                  />
                  {uploadFileName ? (
                    <>
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
                        <CheckCircle2 className="size-6 shrink-0" />
                      </div>
                      <div className="min-w-0 max-w-full">
                        <span className="block text-xs font-semibold text-foreground truncate px-4">{uploadFileName}</span>
                        <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">{uploadFileSize}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-primary transition-colors mt-1 underline">
                        Clique para alterar o arquivo
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="p-2 bg-secondary border border-border/50 text-muted-foreground rounded-lg group-hover:text-primary group-hover:border-primary/20 transition-all">
                        <Plus className="size-6 shrink-0" />
                      </div>
                      <div>
                        <span className="block text-xs font-semibold text-muted-foreground">Escolher arquivo PDF, JPG ou Excel</span>
                        <span className="block text-[10px] text-muted-foreground mt-0.5">Tamanho máximo recomendado: 10 MB</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Condicional de Link Externo */}
            {uploadType === "link" && (
              <div className="space-y-1.5">
                <Label htmlFor="uploadUrl" className="text-xs font-bold text-muted-foreground">URL do Link Externo *</Label>
                <div className="relative">
                  <Input
                    id="uploadUrl"
                    placeholder="https://docs.google.com/spreadsheets/d/... ou Notion"
                    className="bg-secondary/50 border-border/50 focus:border-primary/50 h-10 text-xs rounded-xl text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 pl-8"
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    disabled={submittingUpload}
                    required
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Link2 className="size-3.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Notas adicionais */}
            <div className="space-y-1.5">
              <Label htmlFor="uploadNotes" className="text-xs font-bold text-muted-foreground">Notas / Observações (Opcional)</Label>
              <textarea
                id="uploadNotes"
                placeholder="Adicione observações, lembretes clínicos ou instruções importantes para este documento..."
                rows={3}
                className="bg-secondary/50 border-border/50 focus:border-primary/50 w-full p-3 text-xs rounded-xl text-foreground focus:outline-none focus:ring-0 focus:ring-offset-0 resize-none font-sans"
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                disabled={submittingUpload}
              />
            </div>

            <DialogFooter className="gap-2 mt-4 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                className="border-border hover:bg-muted text-xs rounded-xl text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadName("");
                  setUploadCategory("exames");
                  setUploadType("file");
                  setUploadUrl("");
                  setUploadNotes("");
                  setUploadFileName("");
                  setUploadFileSize("");
                }}
                disabled={submittingUpload}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-primary hover:bg-primary/95 text-primary-foreground font-bold text-xs rounded-xl transition-all"
                disabled={submittingUpload}
              >
                {submittingUpload ? (
                  <>
                    <Loader2 className="animate-spin size-4 mr-2" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Arquivo"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== ALERT DIALOG: CONFIRM DELETE FILE ==================== */}
      <AlertDialog open={isDeleteFileAlertOpen} onOpenChange={setIsDeleteFileAlertOpen}>
        <AlertDialogContent className="bg-card border border-border text-foreground rounded-2xl shadow-2xl">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="size-5 text-rose-500 shrink-0 animate-bounce" /> Excluir Arquivo Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs leading-relaxed">
              Você tem certeza que deseja remover o arquivo <strong className="text-foreground font-semibold">{fileToDelete?.name}</strong>?
              Esta ação é <span className="text-rose-600 dark:text-rose-655 font-semibold underline">totalmente irreversível</span>. O arquivo será removido da central e o aluno não terá mais acesso a ele.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 mt-2">
            <AlertDialogCancel
              className="border-border hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl text-xs"
              disabled={submittingDeleteFile}
              onClick={() => {
                setIsDeleteFileAlertOpen(false);
                setFileToDelete(null);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-500  font-bold rounded-xl text-xs"
              disabled={submittingDeleteFile}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteFileConfirm();
              }}
            >
              {submittingDeleteFile ? (
                <>
                  <Loader2 className="animate-spin size-4 mr-2" />
                  Excluindo...
                </>
              ) : (
                "Sim, Excluir Arquivo"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExercisePreviewModal
        exercise={previewExercise}
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
      />
    </div>
  );
}
