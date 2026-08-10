"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  HardDrive,
  Cloud,
  Database,
  Eye,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  FileText,
  RefreshCw,
  Download,
  ExternalLink,
  ShieldAlert,
  Server,
  Layers,
  UserCheck,
  Zap,
  ChevronLeft,
  ChevronRight,
  FileImage,
  FileSpreadsheet,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CloudflareFile {
  key: string;
  size: number;
  sizeFormatted: string;
  lastModified: string;
  eTag: string;
  fileUrl: string;
}

interface PersonalStorageMetric {
  userId: string;
  name: string;
  email: string;
  planName: string;
  storageLimitMb: number;
  isUnlimited: boolean;
  totalUsedBytes: number;
  totalUsedMb: number;
  totalUsedGb: number;
  percentageUsed: number;
  totalFiles: number;
  workspacesCount: number;
  status: "NORMAL" | "WARNING" | "EXCEEDED";
  isTestAccount?: boolean;
  isFreeTrial?: boolean;
}

interface StorageDataResponse {
  bucketStats: {
    bucketName: string;
    totalBytes: number;
    totalMb: number;
    totalGb: number;
    totalObjects: number;
    files: CloudflareFile[];
    liveCloudflare: boolean;
    error?: string;
  };
  personalsMetrics: PersonalStorageMetric[];
  summary: {
    totalPersonals: number;
    warningCount: number;
    exceededCount: number;
    normalCount: number;
    totalPersonalStorageMb: number;
  };
}

export default function SuperAdminStoragePage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<StorageDataResponse | null>(null);

  // Filters & Search for Personals Table
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NORMAL" | "WARNING" | "EXCEEDED" | "TEST">("ALL");

  // Filters & Pagination for R2 Files Table
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [fileTypeFilter, setFileTypeFilter] = useState<"ALL" | "IMAGES" | "DOCUMENTS" | "EXPORTS">("ALL");
  const [filePage, setFilePage] = useState(1);
  const filesPerPage = 10;

  // File Preview Modal
  const [selectedFile, setSelectedFile] = useState<CloudflareFile | null>(null);

  const fetchStorageData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch("/api/superadmin/storage");
      if (!res.ok) throw new Error("Falha ao carregar dados de armazenamento.");
      const json = await res.json();
      setData(json);
      if (isRefresh) toast.success("Dados de armazenamento atualizados com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao buscar métricas de armazenamento.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  const filteredPersonals = (data?.personalsMetrics || []).filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.planName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "TEST") return p.isTestAccount || p.isFreeTrial;
    return p.status === statusFilter;
  });

  const isImageFile = (key: string) => {
    const k = key.toLowerCase();
    return k.endsWith(".jpg") || k.endsWith(".jpeg") || k.endsWith(".png") || k.endsWith(".webp") || k.endsWith(".gif");
  };

  const filteredFiles = (data?.bucketStats.files || []).filter((file) => {
    const matchesSearch = file.key.toLowerCase().includes(fileSearchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (fileTypeFilter === "ALL") return true;

    const lowerKey = file.key.toLowerCase();
    const isImg = isImageFile(lowerKey);
    const isDoc = lowerKey.endsWith(".pdf") || lowerKey.endsWith(".xlsx") || lowerKey.endsWith(".csv") || lowerKey.endsWith(".docx") || lowerKey.endsWith(".txt");
    const isExport = lowerKey.includes("export") || lowerKey.includes("migration") || lowerKey.includes("backup");

    if (fileTypeFilter === "IMAGES") return isImg;
    if (fileTypeFilter === "DOCUMENTS") return isDoc;
    if (fileTypeFilter === "EXPORTS") return isExport;

    return true;
  });

  const totalFilePages = Math.max(1, Math.ceil(filteredFiles.length / filesPerPage));
  const currentFilePage = Math.min(filePage, totalFilePages);
  const paginatedFiles = filteredFiles.slice((currentFilePage - 1) * filesPerPage, currentFilePage * filesPerPage);

  const startFileIndex = (currentFilePage - 1) * filesPerPage + 1;
  const endFileIndex = Math.min(currentFilePage * filesPerPage, filteredFiles.length);

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
              <HardDrive className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Armazenamento C.R2</h1>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
                Métricas em tempo real, consumo por personal e explorador de arquivos ao vivo.
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={() => fetchStorageData(true)}
          disabled={loading || refreshing}
          variant="outline"
          className="h-10 px-4 rounded-xl font-bold gap-2 w-full sm:w-auto hover:bg-primary/5 hover:text-primary transition-all cursor-pointer shrink-0"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin text-primary")} />
          Atualizar Dados R2
        </Button>
      </div>

      {/* 4 Cards de Métricas Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Uso Cloudflare R2</span>
            <div className="size-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20">
              <Cloud className="size-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-28 rounded-lg" />
          ) : (
            <div>
              <p className="text-2xl font-black tracking-tight font-mono text-foreground">
                {data?.bucketStats.totalGb ? `${data.bucketStats.totalGb} GB` : `${data?.bucketStats.totalMb || 0} MB`}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium flex items-center gap-1">
                <Database className="size-3 text-primary" />
                Bucket: <strong className="text-foreground">{data?.bucketStats.bucketName || "atlasfit"}</strong>
              </p>
            </div>
          )}
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total de Arquivos</span>
            <div className="size-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
              <Layers className="size-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-20 rounded-lg" />
          ) : (
            <div>
              <p className="text-2xl font-black tracking-tight font-mono text-foreground">
                {data?.bucketStats.totalObjects || 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                Arquivos armazenados no Cloudflare R2
              </p>
            </div>
          )}
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personais em Alerta (80%)</span>
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-16 rounded-lg" />
          ) : (
            <div>
              <p className="text-2xl font-black tracking-tight font-mono text-amber-500">
                {data?.summary.warningCount || 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                Próximos do limite do plano
              </p>
            </div>
          )}
        </Card>

        <Card className="border-border/40 bg-card/60 backdrop-blur-md p-5 sm:p-6 space-y-4 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Personais Lotados (100%)</span>
            <div className="size-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
              <ShieldAlert className="size-4" />
            </div>
          </div>
          {loading ? (
            <Skeleton className="h-8 w-16 rounded-lg" />
          ) : (
            <div>
              <p className="text-2xl font-black tracking-tight font-mono text-rose-500">
                {data?.summary.exceededCount || 0}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                Uploads e importações pausados
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personals" className="space-y-6">
        <TabsList className="bg-secondary/40 p-1 rounded-2xl h-fit! sm:h-12 flex max-sm:flex-col sm:inline-flex w-full sm:w-auto gap-1">
          <TabsTrigger value="personals" className="rounded-xl font-bold text-xs h-10 px-5 gap-2 w-full sm:w-auto justify-center">
            <UserCheck className="size-3.5" /> Metrificação por Personal
          </TabsTrigger>
          <TabsTrigger value="live-r2" className="rounded-xl font-bold text-xs h-10 px-5 gap-2 w-full sm:w-auto justify-center">
            <Cloud className="size-3.5" /> Explorador Cloudflare R2
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personals" className="space-y-2 outline-none">
          <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden p-4 sm:p-6 space-y-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-md">
                <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, e-mail ou plano..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 text-sm rounded-xl bg-background"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  <Filter className="size-4" /> Status:
                </div>
                <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl overflow-x-auto max-w-full">
                  <Button
                    size="sm"
                    variant={statusFilter === "ALL" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("ALL")}
                    className="h-8 text-xs font-bold rounded-lg"
                  >
                    Todos ({data?.personalsMetrics.length || 0})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "NORMAL" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("NORMAL")}
                    className="h-8 text-xs font-bold rounded-lg text-emerald-500"
                  >
                    Normais
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "WARNING" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("WARNING")}
                    className="h-8 text-xs font-bold rounded-lg text-amber-500"
                  >
                    Alerta
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "EXCEEDED" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("EXCEEDED")}
                    className="h-8 text-xs font-bold rounded-lg text-rose-500"
                  >
                    Lotados
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === "TEST" ? "secondary" : "ghost"}
                    onClick={() => setStatusFilter("TEST")}
                    className="h-8 text-xs font-bold rounded-lg text-indigo-500"
                  >
                    Contas Teste ({data?.personalsMetrics.filter((p) => p.isTestAccount || p.isFreeTrial).length || 0})
                  </Button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto border border-border/40 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <TableHead className="py-4">Personal Trainer</TableHead>
                    <TableHead className="py-4">Plano</TableHead>
                    <TableHead className="py-4">Uso de Armazenamento</TableHead>
                    <TableHead className="py-4">Arquivos / Workspaces</TableHead>
                    <TableHead className="py-4 text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/30 text-xs font-medium">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredPersonals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-12 text-center text-muted-foreground italic">
                        Nenhum personal trainer encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPersonals.map((p) => (
                      <TableRow key={p.userId} className="hover:bg-secondary/10 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-foreground leading-tight">{p.name}</p>
                            {(p.isTestAccount || p.isFreeTrial) && (
                              <Badge className="bg-indigo-500/10 text-indigo-500 border-indigo-500/20 text-[9px] font-bold uppercase px-1.5 py-0 border">
                                {p.isFreeTrial ? "Trial" : "Teste"}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold text-[10px] uppercase border-border/60">
                            {p.planName}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-64">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span>
                                {p.totalUsedMb >= 1024 ? `${p.totalUsedGb} GB` : `${p.totalUsedMb} MB`}
                              </span>
                              <span className="text-muted-foreground">
                                / {p.isUnlimited ? "Ilimitado" : `${p.storageLimitMb} MB`}
                              </span>
                            </div>
                            {!p.isUnlimited && (
                              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    p.percentageUsed >= 100
                                      ? "bg-rose-500"
                                      : p.percentageUsed >= 80
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                  )}
                                  style={{ width: `${Math.min(p.percentageUsed, 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-bold">{p.totalFiles} arquivos</p>
                          <p className="text-[10px] text-muted-foreground">{p.workspacesCount} workspace(s)</p>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            className={cn(
                              "font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 border",
                              p.status === "EXCEEDED"
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                : p.status === "WARNING"
                                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                  : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}
                          >
                            {p.status === "EXCEEDED"
                              ? "Lotado (100%)"
                              : p.status === "WARNING"
                                ? "Alerta (80%)"
                                : "Normal"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="live-r2" className="space-y-4 outline-none">
          <Card className="border-border/40 bg-card/50 shadow-sm overflow-hidden p-4 space-y-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold tracking-tight">Últimos Arquivos & Exportações no C.R2</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visualização ao vivo dos arquivos armazenados diretamente no bucket do Cloudflare R2.
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary bg-primary/5 px-2 py-0.5 self-start sm:self-auto">
                R2 Live Bucket: {data?.bucketStats.bucketName}
              </Badge>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por caminho ou nome do arquivo..."
                  value={fileSearchTerm}
                  onChange={(e) => {
                    setFileSearchTerm(e.target.value);
                    setFilePage(1);
                  }}
                  className="pl-9 h-10 text-sm rounded-xl bg-background"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground" />
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo:</span>
                <div className="flex items-center gap-1 bg-secondary/30 p-1 rounded-xl overflow-x-auto">
                  <Button
                    size="sm"
                    variant={fileTypeFilter === "ALL" ? "secondary" : "ghost"}
                    onClick={() => {
                      setFileTypeFilter("ALL");
                      setFilePage(1);
                    }}
                    className="h-8 text-xs font-bold rounded-lg"
                  >
                    Todos ({data?.bucketStats.files.length || 0})
                  </Button>
                  <Button
                    size="sm"
                    variant={fileTypeFilter === "IMAGES" ? "secondary" : "ghost"}
                    onClick={() => {
                      setFileTypeFilter("IMAGES");
                      setFilePage(1);
                    }}
                    className="h-8 text-xs font-bold rounded-lg text-blue-500"
                  >
                    Imagens
                  </Button>
                  <Button
                    size="sm"
                    variant={fileTypeFilter === "DOCUMENTS" ? "secondary" : "ghost"}
                    onClick={() => {
                      setFileTypeFilter("DOCUMENTS");
                      setFilePage(1);
                    }}
                    className="h-8 text-xs font-bold rounded-lg text-amber-500"
                  >
                    Documentos
                  </Button>
                  <Button
                    size="sm"
                    variant={fileTypeFilter === "EXPORTS" ? "secondary" : "ghost"}
                    onClick={() => {
                      setFileTypeFilter("EXPORTS");
                      setFilePage(1);
                    }}
                    className="h-8 text-xs font-bold rounded-lg text-purple-500"
                  >
                    Exportações
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-border/40 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-border/40 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <TableHead className="py-4">Caminho / Objeto R2</TableHead>
                    <TableHead className="py-4">Tamanho</TableHead>
                    <TableHead className="py-4">Última Modificação</TableHead>
                    <TableHead className="py-4 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/30 text-xs font-medium">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredFiles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground italic">
                        Nenhum arquivo encontrado com os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedFiles.map((file) => (
                      <TableRow key={file.key} className="hover:bg-secondary/10 transition-colors">
                        <TableCell>
                          <p className="font-mono font-bold text-foreground text-[11px] truncate max-w-md select-all">
                            {file.key}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono font-bold text-primary">
                          {file.sizeFormatted}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono text-[11px]">
                          {new Date(file.lastModified).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedFile(file)}
                            className="h-8 px-3 rounded-lg text-xs font-bold gap-1.5 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                          >
                            <Eye className="size-3.5" /> Exibir
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls */}
            {!loading && filteredFiles.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs font-medium">
                <p className="text-muted-foreground">
                  Exibindo <strong className="text-foreground">{startFileIndex}</strong> a{" "}
                  <strong className="text-foreground">{endFileIndex}</strong> de{" "}
                  <strong className="text-foreground">{filteredFiles.length}</strong> arquivos
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentFilePage <= 1}
                    onClick={() => setFilePage((prev) => Math.max(1, prev - 1))}
                    className="h-8 px-3 rounded-lg font-bold gap-1 text-xs cursor-pointer"
                  >
                    <ChevronLeft className="size-3.5" /> Anterior
                  </Button>

                  <span className="text-xs font-bold text-muted-foreground px-2">
                    Página {currentFilePage} de {totalFilePages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentFilePage >= totalFilePages}
                    onClick={() => setFilePage((prev) => Math.min(totalFilePages, prev + 1))}
                    className="h-8 px-3 rounded-lg font-bold gap-1 text-xs cursor-pointer"
                  >
                    Próxima <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Exibição / Pré-visualização de Arquivo */}
      <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
        <DialogContent className="max-w-2xl rounded-2xl! p-6 overflow-y-auto!">
          <DialogHeader>
            <DialogTitle className="text-lg font-black tracking-tight flex items-center gap-2">
              <Eye className="size-5 text-primary" /> Visualizar Arquivo Cloudflare R2
            </DialogTitle>
          </DialogHeader>

          {selectedFile && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-secondary/30 rounded-xl border border-border/40 font-mono text-xs overflow-x-auto select-all">
                <span className="text-muted-foreground">Key: </span>
                <strong className="text-foreground">{selectedFile.key}</strong>
              </div>

              {isImageFile(selectedFile.key) ? (
                <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-black/40 flex items-center justify-center p-4 min-h-[300px] max-h-[500px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedFile.fileUrl}
                    alt={selectedFile.key}
                    className="max-h-[460px] object-contain rounded-lg shadow-xl"
                  />
                </div>
              ) : (
                <div className="p-8 rounded-2xl border border-border/40 bg-secondary/20 flex flex-col items-center justify-center gap-3 text-center">
                  <FileText className="size-12 text-primary" />
                  <div>
                    <p className="font-bold text-sm">Arquivo Documento / Dados</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">Tamanho: {selectedFile.sizeFormatted}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground font-mono">
                  Modificado: {new Date(selectedFile.lastModified).toLocaleString()}
                </p>
                <div className="flex gap-2">
                  <Button
                    asChild
                    variant="outline"
                    className="h-9 px-4 rounded-xl font-bold text-xs gap-1.5"
                  >
                    <a href={selectedFile.fileUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-3.5" /> Abrir Link Direto
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
