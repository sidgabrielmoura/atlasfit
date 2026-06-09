"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Folder,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  FileText,
  Loader2,
  Building2,
  User,
  AlertCircle,
  CheckCircle2,
  Download,
  ChevronRight,
  Info
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

function CategoryIcon({ category }: { category: string }) {
  switch (category) {
    case "exames":
      return <FileText className="size-4 text-rose-500" />;
    case "dieta_treino":
      return <FileText className="size-4 text-emerald-500" />;
    default:
      return <Folder className="size-4 text-blue-500" />;
  }
}

function CategoryBadge({ category }: { category: string }) {
  switch (category) {
    case "exames":
      return <Badge className="bg-rose-500/10 text-rose-600 border-none font-bold text-[9px] uppercase tracking-wider">Exames</Badge>;
    case "dieta_treino":
      return <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-bold text-[9px] uppercase tracking-wider">Dieta & Treino</Badge>;
    default:
      return <Badge className="bg-blue-500/10 text-blue-600 border-none font-bold text-[9px] uppercase tracking-wider">Outros</Badge>;
  }
}

function TableRowSkeleton() {
  return (
    <TableRow className="border-b border-border/10">
      <TableCell className="px-6 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg shrink-0" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4">
        <Skeleton className="h-5 w-20 rounded-full" />
      </TableCell>
      <TableCell className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5 rounded shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      </TableCell>
      <TableCell className="px-6 py-4 text-center">
        <Skeleton className="h-3 w-8 mx-auto" />
      </TableCell>
      <TableCell className="px-6 py-4 text-center">
        <Skeleton className="h-3 w-16 mx-auto" />
      </TableCell>
      <TableCell className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="size-8 rounded-lg" />
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function SuperAdminFilesPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("todos");

  // Modal details
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isFileDetailOpen, setIsFileDetailOpen] = useState(false);

  // Deletion States
  const [fileToDelete, setFileToDelete] = useState<any>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (category !== "todos") params.append("category", category);

      const res = await fetch(`/api/superadmin/files?${params.toString()}`);
      if (!res.ok) throw new Error("Erro ao buscar arquivos");
      const data = await res.json();
      setFiles(data);
    } catch (error) {
      toast.error("Não foi possível carregar os arquivos globais.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles();
  };

  const triggerDeleteFile = (file: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setFileToDelete(file);
    setIsDeleteAlertOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading("Excluindo arquivo do sistema...");
    try {
      const res = await fetch(`/api/superadmin/files/${fileToDelete.id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Falha ao excluir arquivo");
      
      toast.success("Arquivo removido permanentemente!", { id: toastId });
      setIsDeleteAlertOpen(false);
      setIsFileDetailOpen(false);
      setSelectedFile(null);
      setFileToDelete(null);
      await fetchFiles();
    } catch (error) {
      toast.error("Erro ao excluir arquivo.", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerViewDetails = (file: any) => {
    setSelectedFile(file);
    setIsFileDetailOpen(true);
  };

  return (
    <div className="p-6 md:p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border/40 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
            <Folder className="size-4" />
            File Moderation Panel
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">Auditoria de Arquivos</h1>
          <p className="text-muted-foreground text-sm font-medium">Controle de exames, meal plans e mídias compartilhadas no ecossistema AtlasFit.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/40 bg-secondary/5 shadow-none">
        <CardContent className="p-4 flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input 
                placeholder="Pesquisar por nome do arquivo, aluno ou workspace..." 
                className="pl-9 h-10 rounded-xl border-border/40 bg-background text-xs font-semibold" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="h-10 px-5 rounded-xl font-bold text-xs shrink-0 cursor-pointer">
              {isLoading ? <Loader2 className="size-3.5 animate-spin mr-1" /> : <Search className="size-3.5 mr-1" />}
              BUSCAR
            </Button>
          </form>
          
          <div className="flex items-center gap-2">
            <Button
              variant={category === "todos" ? "default" : "outline"}
              onClick={() => setCategory("todos")}
              className="h-10 rounded-xl text-xs font-bold border-border/40 cursor-pointer"
            >
              TODOS
            </Button>
            <Button
              variant={category === "exames" ? "default" : "outline"}
              onClick={() => setCategory("exames")}
              className="h-10 rounded-xl text-xs font-bold border-border/40 cursor-pointer"
            >
              EXAMES
            </Button>
            <Button
              variant={category === "dieta_treino" ? "default" : "outline"}
              onClick={() => setCategory("dieta_treino")}
              className="h-10 rounded-xl text-xs font-bold border-border/40 cursor-pointer"
            >
              DIETA & TREINO
            </Button>
            <Button
              variant={category === "outros" ? "default" : "outline"}
              onClick={() => setCategory("outros")}
              className="h-10 rounded-xl text-xs font-bold border-border/40 cursor-pointer"
            >
              OUTROS
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files List Table */}
      <Card className="border-border/40 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/5 border-b border-border/30 hover:bg-secondary/5">
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">Arquivo</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">Categoria</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">Aluno / Dono</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left">Workspace</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Tamanho</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center">Data Envio</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right">Ações</th>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-border/20">
                {isLoading && files.length === 0 ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : files.length === 0 ? (
                  <TableRow>
                    <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground opacity-60">
                      <AlertCircle className="size-8 mx-auto mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">Nenhum arquivo encontrado</p>
                    </td>
                  </TableRow>
                ) : files.map((file) => (
                  <TableRow
                    key={file.id}
                    onClick={() => triggerViewDetails(file)}
                    className="hover:bg-secondary/15 transition-colors cursor-pointer group"
                  >
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-primary/5 text-primary flex items-center justify-center border border-primary/10 shrink-0">
                          <CategoryIcon category={file.category} />
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors block truncate max-w-[240px]">{file.name}</span>
                          <span className="text-[10px] font-mono text-muted-foreground block mt-0.5 truncate max-w-[200px]">{file.fileName || "Link Externo"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <CategoryBadge category={file.category} />
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {file.student ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-secondary border border-border/40 flex items-center justify-center text-[10px] font-black text-muted-foreground uppercase shrink-0">
                            {file.student.name?.charAt(0) || "U"}
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-foreground block truncate max-w-[120px]">{file.student.name}</span>
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">{file.student.email}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sistema / Desconhecido</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {file.workspace ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-foreground block truncate max-w-[120px]">{file.workspace.name}</span>
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[120px]">/app/{file.workspace.slug}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center font-semibold text-xs text-foreground">
                      {file.fileSize || "Link"}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-center text-xs text-muted-foreground font-medium">
                      {new Date(file.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          asChild
                          size="icon"
                          variant="ghost"
                          className="size-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all cursor-pointer"
                        >
                          <a href={file.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="size-4" />
                          </a>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => triggerDeleteFile(file, e)}
                          className="size-8 rounded-lg text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all cursor-pointer"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ================= MODAIS DE CONTROLE ================= */}

      {/* 1. Modal de Detalhes do Arquivo */}
      <Dialog open={isFileDetailOpen} onOpenChange={(open) => {
        setIsFileDetailOpen(open);
        if (!open) setSelectedFile(null);
      }}>
        <DialogContent className="max-w-md rounded-2xl border-border/50">
          {selectedFile && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-black tracking-tight">Detalhes do Arquivo</DialogTitle>
                <DialogDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Ficha técnica do documento compartilhado
                </DialogDescription>
              </DialogHeader>

              <div className="py-4 space-y-4">
                <div className="p-4 rounded-xl border border-border/40 bg-secondary/15 flex flex-col gap-3">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Nome Visível:</span>
                    <span className="text-foreground text-right max-w-[200px] truncate">{selectedFile.name}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Ficheiro Físico:</span>
                    <span className="text-foreground text-right max-w-[200px] font-mono truncate">{selectedFile.fileName || "Link"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Tamanho:</span>
                    <span className="text-foreground">{selectedFile.fileSize || "N/A"}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Categoria:</span>
                    <CategoryBadge category={selectedFile.category} />
                  </div>
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Enviado em:</span>
                    <span className="text-foreground">{new Date(selectedFile.createdAt).toLocaleString("pt-BR")}</span>
                  </div>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl border border-border/30 bg-card">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Info className="size-3.5 text-primary" /> Observações / Anotações
                  </p>
                  <p className="text-xs text-foreground leading-relaxed pt-1 font-medium">
                    {selectedFile.notes || "Nenhuma observação ou descrição foi registrada para este arquivo."}
                  </p>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/20 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={(e) => triggerDeleteFile(selectedFile, e)}
                  variant="ghost"
                  type="button"
                  disabled={isDeleting}
                  className="rounded-xl hover:bg-rose-500/10 h-11 font-black hover:text-rose-600 transition-all cursor-pointer mr-auto text-rose-500 flex gap-1.5"
                >
                  <Trash2 className="size-4" /> Excluir Arquivo
                </Button>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsFileDetailOpen(false);
                      setSelectedFile(null);
                    }}
                    className="rounded-xl font-bold h-11"
                  >
                    Fechar
                  </Button>
                  <Button
                    asChild
                    className="rounded-xl h-11 px-6 font-black bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 cursor-pointer flex gap-1.5"
                  >
                    <a href={selectedFile.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" /> Acessar Link
                    </a>
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 2. AlertDialog de Exclusão Segura */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-2xl border-rose-500/20 shadow-2xl shadow-rose-500/5">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto size-12 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center border border-rose-500/20 shrink-0">
              <Trash2 className="size-6" />
            </div>
            <AlertDialogTitle className="text-xl font-black tracking-tight text-center">Excluir Arquivo Definitivamente?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground text-center">
              Tem certeza que deseja excluir permanentemente o documento <strong className="text-foreground">{fileToDelete?.name}</strong>? Esta ação é irreversível e removerá o arquivo físico da nuvem e a referência do aluno no workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 gap-2 sm:justify-center">
            <AlertDialogCancel className="rounded-xl font-bold h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="rounded-xl h-11 px-8 font-black bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20 cursor-pointer flex gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Excluindo...</span>
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  <span>Confirmar Exclusão</span>
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
