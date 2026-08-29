"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Trash2,
  ShieldAlert,
  Clock,
  UserX,
  Loader2,
  CheckCircle2,
  Calendar,
  Mail,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

export interface DeletionRequestItem {
  id: string;
  userId: string;
  requestedAt: string;
  status: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    image: string | null;
    createdAt: string;
  };
}

interface DeletionRequestsSectionProps {
  onRequestCountChange?: (count: number) => void;
  onDataChange?: () => void;
}

export function DeletionRequestsSection({
  onRequestCountChange,
  onDataChange,
}: DeletionRequestsSectionProps) {
  const [requests, setRequests] = useState<DeletionRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal State
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequestItem | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/deletion-requests");
      if (!res.ok) {
        throw new Error("Erro ao buscar solicitações de exclusão.");
      }
      const data: DeletionRequestItem[] = await res.json();
      setRequests(data);
      if (onRequestCountChange) {
        onRequestCountChange(data.length);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao carregar solicitações de exclusão.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleConfirmDeletion = async () => {
    if (!selectedRequest) return;

    setIsDeleting(true);
    const toastId = toast.loading(
      `Excluindo todos os dados de ${selectedRequest.user.name || selectedRequest.user.email}...`
    );

    try {
      const res = await fetch(`/api/superadmin/deletion-requests/${selectedRequest.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || "Erro ao efetuar expurgo dos dados.");
      }

      toast.success("Todos os dados do personal foram excluídos com sucesso! 🗑️", { id: toastId });
      setIsConfirmModalOpen(false);
      setSelectedRequest(null);
      await fetchRequests();
      if (onDataChange) {
        onDataChange();
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao excluir dados do personal.", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <section id="solicitacoes-exclusao" className="space-y-4 pt-4">
      <Card className="border-border/40 bg-card shadow-sm overflow-hidden p-0">
        <CardHeader className="border-b border-border/40 bg-secondary/10 px-6 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  Solicitações de Exclusão de Dados
                  <Badge
                    variant="outline"
                    className={`text-xs font-extrabold ${requests.length > 0
                      ? "bg-red-500/10 text-red-500 border-red-500/20"
                      : "bg-secondary text-muted-foreground border-border/40"
                      }`}
                  >
                    {requests.length} {requests.length === 1 ? "pendente" : "pendentes"}
                  </Badge>
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Gerencie pedidos de remoção definitiva de contas de Personal Trainers e seus dados associados (LGPD). Ao aprovar, todos os dados vinculados serão expurgados permanentemente.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchRequests}
              disabled={isLoading}
              className="shrink-0 gap-2 font-semibold cursor-pointer rounded-xl h-9 text-xs"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Atualizando..." : "Atualizar Lista"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-border/40 bg-secondary/10 flex flex-col sm:flex-row items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 w-full">
                    <Skeleton className="size-12 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-44 rounded-md" />
                      <Skeleton className="h-4 w-64 rounded-md" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-36 rounded-xl shrink-0" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-2xl bg-secondary/5 flex flex-col items-center justify-center space-y-3">
              <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="size-6 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">
                  Nenhuma solicitação de exclusão pendente
                </h3>
                <p className="text-xs text-muted-foreground max-w-md">
                  Quando um Personal Trainer solicitar a exclusão de sua conta e dados no painel de configurações, o pedido aparecerá listado aqui para auditoria e expurgo.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                const requestedDateFormatted = new Date(req.requestedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const userCreatedFormatted = req.user.createdAt
                  ? new Date(req.user.createdAt).toLocaleDateString("pt-BR")
                  : "N/A";

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 sm:p-5 rounded-2xl border border-red-500/20 bg-card hover:border-red-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0">
                      <Avatar className="size-12 sm:size-14 border border-border/40 shrink-0">
                        <AvatarImage src={req.user.image || undefined} />
                        <AvatarFallback className="bg-red-500/10 text-red-500 font-bold text-base">
                          {(req.user.name || req.user.email || "P").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm sm:text-base text-foreground truncate">
                            {req.user.name || "Sem nome cadastrado"}
                          </h4>
                          <Badge
                            variant="outline"
                            className="bg-secondary text-muted-foreground text-[10px] font-bold"
                          >
                            {req.user.role}
                          </Badge>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5 truncate">
                            <Mail className="size-3.5 text-primary shrink-0" />
                            {req.user.email}
                          </span>
                          <span className="flex items-center gap-1.5 shrink-0">
                            <Calendar className="size-3.5 text-muted-foreground shrink-0" />
                            Cadastrado em {userCreatedFormatted}
                          </span>
                        </div>

                        <div className="pt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="size-3.5 shrink-0" />
                          <span>
                            Solicitado em: <strong>{requestedDateFormatted}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/40 shrink-0">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedRequest(req);
                          setIsConfirmModalOpen(true);
                        }}
                        className="rounded-xl text-xs font-bold gap-2 cursor-pointer bg-red-600 hover:bg-red-700 shadow-sm shadow-red-600/20 h-10 px-4"
                      >
                        <Trash2 className="size-4" />
                        Excluir Todos os Dados
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SuperAdmin Data Wipe Confirmation AlertDialog */}
      <AlertDialog
        open={isConfirmModalOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setIsConfirmModalOpen(open);
            if (!open) setSelectedRequest(null);
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-lg border-border/40">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-black text-red-600 flex items-center gap-2">
              <ShieldAlert className="size-5 text-red-600 shrink-0" />
              CONFIRMAÇÃO DE EXPURGO TOTAL DE DADOS
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-3 pt-2 text-left">
              <p>
                Você está prestes a aprovar e executar a exclusão definitiva de todos os dados referentes ao personal trainer:
              </p>

              {selectedRequest && (
                <div className="p-3 rounded-xl bg-secondary/40 border border-border/50 text-foreground space-y-1 font-mono text-xs">
                  <div>
                    <strong>Nome:</strong> {selectedRequest.user.name || "N/A"}
                  </div>
                  <div>
                    <strong>E-mail:</strong> {selectedRequest.user.email}
                  </div>
                  <div>
                    <strong>Solicitado em:</strong>{" "}
                    {new Date(selectedRequest.requestedAt).toLocaleString("pt-BR")}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium space-y-1">
                <strong>O que será excluído no banco de dados:</strong>
                <ul className="list-disc list-inside text-[11px] space-y-0.5 mt-1">
                  <li>A conta de usuário do Personal Trainer</li>
                  <li>Todos os Workspaces pertencentes ao personal</li>
                  <li>Alunos cadastrados exclusivamente nesses workspaces</li>
                  <li>Planilhas de treinos, exercícios prescritos e logs de execução</li>
                  <li>Avaliações físicas, históricos de progresso e fotos</li>
                  <li>Conversas, mensagens de chat e arquivos</li>
                  <li>Planos de workspaces e histórico de faturamento</li>
                </ul>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 pt-1">
                <AlertTriangle className="size-4 shrink-0" />
                <span>Esta ação é IRREVERSÍVEL. Tem certeza que deseja prosseguir?</span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold"
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDeletion}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold cursor-pointer bg-red-600 hover:bg-red-700 gap-2 h-10 px-4"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Excluindo Todos os Dados...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Confirmar Expurgo Definitivo
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
