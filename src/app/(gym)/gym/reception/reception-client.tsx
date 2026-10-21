"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  Users,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  UserCheck,
  RefreshCw,
  Loader2,
  PhoneCall,
  LayoutGrid,
  Table as TableIcon,
  DoorOpen,
  Plus,
  X,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  ReceptionStudent,
  ReceptionSummary,
} from "@/modules/workspaces/application/gym-reception-query";

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const statusLabels: Record<string, string> = {
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  INACTIVE: "Inativo",
  CANCELLED: "Cancelado",
  EXPIRED: "Expirado",
  NOT_ENROLLED: "Sem matrícula",
  PENDING_ACTIVATION: "Aguardando ativação",
};

const financeLabels: Record<string, string> = {
  SETTLED: "Em dia",
  OPEN: "Em aberto",
  OVERDUE: "Em atraso",
  NONE: "Sem mensalidade",
};

function formatLastCheckIn(isoDate: string | null): string {
  if (!isoDate) return "Nunca acessou";
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return diffMins <= 1 ? "Agora mesmo" : `Há ${diffMins} min`;
  }
  if (diffHours < 24) {
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `Hoje às ${hours}:${mins}`;
  }
  if (diffDays === 1) {
    const hours = date.getHours().toString().padStart(2, "0");
    const mins = date.getMinutes().toString().padStart(2, "0");
    return `Ontem às ${hours}:${mins}`;
  }
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

function getInitials(name: string): string {
  if (!name) return "AL";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function studentWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("55") && digits.length > 11 ? digits : `55${digits}`;
  return `https://wa.me/${international}`;
}

function ReceptionKPICard({
  title,
  value,
  subDetail,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string | number;
  subDetail: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "destructive";
}) {
  const iconColor =
    variant === "success"
      ? "text-emerald-500 bg-emerald-500/10"
      : variant === "destructive"
        ? "text-red-400 bg-red-400/10"
        : variant === "warning"
          ? "text-amber-400 bg-amber-400/10"
          : "text-primary bg-primary/10";

  return (
    <Card
      size="sm"
      className="relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xs hover:border-border/80 transition-all duration-200"
    >
      <CardContent className="p-3.5 sm:p-4 flex flex-col justify-between h-full">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
              {title}
            </p>
            <p className="text-xl sm:text-2xl font-bold tracking-tight">
              {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
            </p>
          </div>
          <div className={cn("flex size-8 items-center justify-center rounded-lg shrink-0", iconColor)}>
            <Icon className="size-4" />
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 pt-1 border-t border-border/30 truncate">
          {subDetail}
        </p>
      </CardContent>
    </Card>
  );
}

export function ReceptionClient({
  workspaceId,
  students,
  workspaceName,
  units,
  initialUnitId,
  page,
  total,
  hasNext,
  summary,
}: {
  workspaceId: string;
  students: ReceptionStudent[];
  workspaceName: string;
  units: { id: string; name: string; canReadFinance: boolean }[];
  initialUnitId: string;
  page: number;
  total: number;
  hasNext: boolean;
  summary?: ReceptionSummary;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "allowed" | "overdue" | "not_enrolled" | "inactive"
  >("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const activeUnit = useMemo(() => {
    return units.find((u) => u.id === initialUnitId) || units[0];
  }, [units, initialUnitId]);

  const handleUnitChange = (unitId: string) => {
    startTransition(() => {
      const query = new URLSearchParams({ unitId, page: "1" });
      router.push(`/gym/reception?${query}`);
      toast.info(`Alternando para ${units.find((u) => u.id === unitId)?.name || "unidade"}...`);
    });
  };

  const handlePageChange = (targetPage: number) => {
    startTransition(() => {
      const query = new URLSearchParams({
        ...(initialUnitId ? { unitId: initialUnitId } : {}),
        page: String(targetPage),
      });
      router.push(`/gym/reception?${query}`);
    });
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
      toast.success("Dados da recepção atualizados!");
    });
  };

  // Filtragem local instantânea em tempo de digitação
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.registrationNumber && s.registrationNumber.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const isAllowed = s.status === "ACTIVE" && s.financialStatus !== "OVERDUE";
      const isOverdue = s.financialStatus === "OVERDUE";
      const isNotEnrolled = s.status === "NOT_ENROLLED";
      const isInactive = s.status === "INACTIVE" || s.status === "PAUSED" || s.status === "CANCELLED";

      if (activeFilter === "allowed") return isAllowed;
      if (activeFilter === "overdue") return isOverdue;
      if (activeFilter === "not_enrolled") return isNotEnrolled;
      if (activeFilter === "inactive") return isInactive;

      return true;
    });
  }, [students, searchQuery, activeFilter]);

  const totalPages = Math.max(1, Math.ceil(total / 30));

  const stats = summary || {
    total,
    activeCount: students.filter((s) => s.status === "ACTIVE").length,
    overdueCount: students.filter((s) => s.financialStatus === "OVERDUE").length,
    settledCount: students.filter((s) => s.financialStatus === "SETTLED").length,
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 max-w-400 mx-auto"
      aria-busy={isPending}
    >
      {/* 1. Header Operacional da Recepção */}
      <motion.div
        variants={item}
        className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-black flex items-center gap-2">
              Recepção
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 flex flex-wrap items-center gap-2">
            <span>Controle operacional ao vivo de balcão e conferência de acesso.</span>
            {activeUnit ? (
              <span className="font-semibold text-foreground flex items-center gap-1">
                <Building2 className="size-3.5 text-primary" />
                {activeUnit.name}
              </span>
            ) : (
              <span className="text-foreground font-semibold">{workspaceName}</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="w-fit gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-background border-border/50 shadow-xs"
          >
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            Portaria Ativa
          </Badge>

          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleRefresh}
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border/50 cursor-pointer"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <RefreshCw className="size-3.5" />
            )}
            Atualizar
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 border-border/50 cursor-pointer"
          >
            <Link href="/gym/students">
              <Users className="size-3.5" />
              Gestão de Alunos
            </Link>
          </Button>

          <Button
            asChild
            size="sm"
            className="rounded-xl h-8 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
          >
            <Link href="/gym/students?action=new">
              <Plus className="size-3.5" />
              Nova Matrícula
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* 2. KPIs de Balcão e Portaria */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <ReceptionKPICard
            title="Total de Alunos"
            value={stats.total}
            subDetail="Cadastrados nesta unidade"
            icon={Users}
            variant="default"
          />

          <ReceptionKPICard
            title="Mensalidades em Dia"
            value={stats.settledCount}
            subDetail="Acesso regular e liquidado"
            icon={CheckCircle2}
            variant="success"
          />

          <ReceptionKPICard
            title="Pendências Financeiras"
            value={stats.overdueCount}
            subDetail="Mensalidades em atraso"
            icon={AlertTriangle}
            variant="destructive"
          />

          <ReceptionKPICard
            title="Matrículas Ativas"
            value={stats.activeCount}
            subDetail="Contratos vigentes no catálogo"
            icon={UserCheck}
            variant="default"
          />
        </div>
      </motion.div>

      {/* 3. Barra de Controles, Busca e Filtros de Balcão */}
      <motion.div variants={item}>
        <Card className="border-border/50 bg-card/40 rounded-2xl p-3.5 sm:p-4 space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Input de Busca */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email ou matrícula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-xs sm:text-sm rounded-xl bg-background/60 border-border/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de Unidade (quando houver mais de uma) */}
              {units.length > 1 && (
                <div className="min-w-[180px]">
                  <Select
                    value={initialUnitId}
                    disabled={isPending}
                    onValueChange={handleUnitChange}
                  >
                    <SelectTrigger className="h-9 text-xs font-semibold rounded-xl bg-background/60 border-border/50">
                      <SelectValue placeholder="Selecione a unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Alternador de Visualização (Grade / Tabela) */}
              <div className="flex items-center p-0.5 rounded-xl bg-muted/40 border border-border/40">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-lg cursor-pointer",
                    viewMode === "grid"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Visualização em Grade de Cards"
                >
                  <LayoutGrid className="size-3.5 mr-1" />
                  Cards
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode("table")}
                  className={cn(
                    "h-7 px-2.5 text-xs font-medium rounded-lg cursor-pointer",
                    viewMode === "table"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Visualização em Tabela Compacta"
                >
                  <TableIcon className="size-3.5 mr-1" />
                  Tabela
                </Button>
              </div>
            </div>
          </div>

          {/* Chips de Filtro Segmentados */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/30">
            <Button
              variant={activeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("all")}
              className="h-7 text-[11px] rounded-lg px-2.5 font-semibold cursor-pointer border-border/50"
            >
              Todos ({students.length})
            </Button>

            <Button
              variant={activeFilter === "allowed" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("allowed")}
              className={cn(
                "h-7 text-[11px] rounded-lg px-2.5 font-semibold cursor-pointer border-border/50",
                activeFilter === "allowed"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "text-emerald-500 hover:bg-emerald-500/10"
              )}
            >
              <CheckCircle2 className="size-3 mr-1" />
              Acesso Liberado
            </Button>

            <Button
              variant={activeFilter === "overdue" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("overdue")}
              className={cn(
                "h-7 text-[11px] rounded-lg px-2.5 font-semibold cursor-pointer border-border/50",
                activeFilter === "overdue"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "text-red-400 hover:bg-red-400/10"
              )}
            >
              <AlertTriangle className="size-3 mr-1" />
              Com Pendência
            </Button>

            <Button
              variant={activeFilter === "not_enrolled" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("not_enrolled")}
              className="h-7 text-[11px] rounded-lg px-2.5 font-semibold cursor-pointer border-border/50"
            >
              <AlertCircle className="size-3 mr-1" />
              Sem Matrícula
            </Button>

            <Button
              variant={activeFilter === "inactive" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter("inactive")}
              className="h-7 text-[11px] rounded-lg px-2.5 font-semibold cursor-pointer border-border/50"
            >
              <Clock className="size-3 mr-1" />
              Pausados / Inativos
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* 4. Renderização dos Alunos (Cards vs Tabela) com Estados de Loading */}
      {isPending ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="size-11 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>
              <Skeleton className="h-8 w-full rounded-xl" />
            </Card>
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <motion.div variants={item}>
          <Card className="border-border/50 bg-card/40 rounded-2xl p-10 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
              <div className="size-12 rounded-2xl bg-muted/50 flex items-center justify-center text-muted-foreground">
                <Users className="size-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-base text-foreground">
                  Nenhum aluno encontrado
                </h3>
                <p className="text-xs text-muted-foreground">
                  {searchQuery || activeFilter !== "all"
                    ? "Tente ajustar seus termos de busca ou filtros selecionados."
                    : "Esta unidade ainda não possui alunos registrados na recepção."}
                </p>
              </div>
              {(searchQuery || activeFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveFilter("all");
                  }}
                  className="rounded-xl text-xs font-semibold cursor-pointer mt-2"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </Card>
        </motion.div>
      ) : viewMode === "grid" ? (
        /* Visualização em Grade de Cards */
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filteredStudents.map((student) => {
            const isAllowed = student.status === "ACTIVE" && student.financialStatus !== "OVERDUE";
            const isOverdue = student.financialStatus === "OVERDUE";

            return (
              <motion.div key={student.id} variants={item}>
                <Card
                  className={cn(
                    "relative overflow-hidden border border-border/50 bg-background/50 backdrop-blur-xs hover:border-border/80 transition-all duration-200 h-full flex flex-col justify-between",
                    isOverdue && "border-red-400/40 bg-red-400/5",
                    isAllowed && "hover:border-emerald-500/40"
                  )}
                >
                  <CardContent className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                    {/* Linha Superior: Status de Entrada & Ações Rápidas */}
                    <div className="flex items-center justify-between gap-2">
                      {isAllowed ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1 rounded-full px-2.5 py-0.5"
                        >
                          <CheckCircle2 className="size-3" />
                          Acesso Liberado
                        </Badge>
                      ) : isOverdue ? (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-red-400/10 text-red-400 border-red-400/30 gap-1 rounded-full px-2.5 py-0.5"
                        >
                          <AlertTriangle className="size-3" />
                          Bloqueado · Pendência
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold bg-amber-400/10 text-amber-400 border-amber-400/30 gap-1 rounded-full px-2.5 py-0.5"
                        >
                          <AlertCircle className="size-3" />
                          Acesso Bloqueado
                        </Badge>
                      )}

                      <div className="flex items-center gap-1">
                        {student.whatsapp && (
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                            title="Contato via WhatsApp"
                          >
                            <a
                              href={studentWhatsAppUrl(student.whatsapp)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <PhoneCall className="size-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                          title="Abrir Ficha do Aluno"
                        >
                          <Link href={`/gym/students/${student.id}`}>
                            <ArrowUpRight className="size-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {/* Perfil do Aluno */}
                    <div className="flex items-start gap-3">
                      <Avatar className="size-11 border border-border/40 shrink-0">
                        {student.photoUrl && <AvatarImage src={student.photoUrl} alt={student.name} />}
                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                          {getInitials(student.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/gym/students/${student.id}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {student.name}
                        </Link>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {student.email || "Sem e-mail cadastrado"}
                        </p>
                        {student.registrationNumber && (
                          <span className="inline-block text-[10px] font-mono text-muted-foreground/80 mt-0.5">
                            Matrícula: {student.registrationNumber}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Detalhes do Plano & Situação Financeira */}
                    <div className="space-y-1.5 pt-2 border-t border-border/30 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-[11px]">Plano:</span>
                        <span className="font-semibold text-foreground text-[11px] truncate max-w-[170px]">
                          {student.planName}
                        </span>
                      </div>

                      {student.financialStatus && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-[11px]">Financeiro:</span>
                          <span
                            className={cn(
                              "font-bold text-[11px]",
                              student.financialStatus === "SETTLED" && "text-emerald-500",
                              student.financialStatus === "OVERDUE" && "text-red-400",
                              student.financialStatus === "OPEN" && "text-amber-400",
                              student.financialStatus === "NONE" && "text-muted-foreground"
                            )}
                          >
                            {financeLabels[student.financialStatus] || student.financialStatus}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-muted-foreground text-[11px] flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground/70" />
                          Último Acesso:
                        </span>
                        <span className="text-[11px] font-medium text-foreground">
                          {formatLastCheckIn(student.lastCheckIn)}
                        </span>
                      </div>
                    </div>

                    {/* Botão de Balcão Rápido */}
                    <div className="pt-1">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs font-semibold rounded-xl border-border/50 hover:bg-secondary cursor-pointer gap-1.5"
                      >
                        <Link href={`/gym/students/${student.id}`}>
                          Ver Ficha Completa
                          <ArrowUpRight className="size-3 text-muted-foreground" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : (
        /* Visualização em Tabela Compacta de Balcão */
        <motion.div variants={item}>
          <Card className="border-border/50 bg-background/50 backdrop-blur-xs rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-border/50">
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Aluno</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Plano</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Contrato</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Financeiro</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Entrada</TableHead>
                  <TableHead className="text-xs font-bold uppercase tracking-wider">Último Acesso</TableHead>
                  <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => {
                  const isAllowed = student.status === "ACTIVE" && student.financialStatus !== "OVERDUE";
                  const isOverdue = student.financialStatus === "OVERDUE";

                  return (
                    <TableRow key={student.id} className="border-border/30 hover:bg-muted/20">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-8 shrink-0">
                            {student.photoUrl && <AvatarImage src={student.photoUrl} alt={student.name} />}
                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                              {getInitials(student.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <Link
                              href={`/gym/students/${student.id}`}
                              className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors block truncate max-w-[180px]"
                            >
                              {student.name}
                            </Link>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[180px]">
                              {student.email || student.registrationNumber || "Sem matrícula"}
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="py-2.5 text-xs font-medium text-foreground">
                        {student.planName}
                      </TableCell>

                      <TableCell className="py-2.5">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {statusLabels[student.status] || student.status}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-2.5">
                        {student.financialStatus ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px] font-bold rounded-full",
                              student.financialStatus === "SETTLED" && "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                              student.financialStatus === "OVERDUE" && "text-red-400 bg-red-400/10 border-red-400/20",
                              student.financialStatus === "OPEN" && "text-amber-400 bg-amber-400/10 border-amber-400/20",
                              student.financialStatus === "NONE" && "text-muted-foreground"
                            )}
                          >
                            {financeLabels[student.financialStatus] || student.financialStatus}
                          </Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">-</span>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5">
                        {isAllowed ? (
                          <span className="text-xs font-bold text-emerald-500 flex items-center gap-1">
                            <CheckCircle2 className="size-3.5" /> Liberado
                          </span>
                        ) : isOverdue ? (
                          <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                            <AlertTriangle className="size-3.5" /> Pendência
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <AlertCircle className="size-3.5" /> Bloqueado
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="py-2.5 text-xs text-muted-foreground">
                        {formatLastCheckIn(student.lastCheckIn)}
                      </TableCell>

                      <TableCell className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {student.whatsapp && (
                            <Button
                              asChild
                              variant="ghost"
                              size="icon"
                              className="size-7 rounded-lg text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              title="WhatsApp"
                            >
                              <a
                                href={studentWhatsAppUrl(student.whatsapp)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <PhoneCall className="size-3.5" />
                              </a>
                            </Button>
                          )}
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs font-semibold gap-1 rounded-lg cursor-pointer text-primary hover:text-primary"
                          >
                            <Link href={`/gym/students/${student.id}`}>
                              Ficha <ArrowUpRight className="size-3" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </motion.div>
      )}

      {/* 5. Paginação da Recepção */}
      <motion.div
        variants={item}
        className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-muted-foreground"
      >
        <p>
          Exibindo {filteredStudents.length} de {total} alunos cadastrados · Página {page} de{" "}
          {totalPages}
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending || page <= 1}
            onClick={() => handlePageChange(page - 1)}
            className="rounded-xl h-8 text-xs font-semibold gap-1 border-border/50 cursor-pointer"
          >
            <ChevronLeft className="size-3.5" />
            Anterior
          </Button>

          <Button
            variant="outline"
            size="sm"
            disabled={isPending || !hasNext}
            onClick={() => handlePageChange(page + 1)}
            className="rounded-xl h-8 text-xs font-semibold gap-1 border-border/50 cursor-pointer"
          >
            Próxima
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
