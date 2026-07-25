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
  AlertDialogAction,
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
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";

interface DeletionRequestItem {
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

export default function DeletionRequestsPage() {
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
      const data = await res.json();
      setRequests(data);
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
    const toastId = toast.loading(`Excluindo todos os dados de ${selectedRequest.user.name || selectedRequest.user.email}...`);

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
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao excluir dados do personal.", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <UserX className="size-8 text-red-500" />
            Solicitações de Exclusão de Dados
          </h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os pedidos de remoção definitiva de contas de Personal Trainers e seus dados associados.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchRequests}
          disabled={isLoading}
          className="shrink-0 gap-2 font-semibold cursor-pointer"
        >
          {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Atualizar Lista"}
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm bg-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                Solicitações Pendentes
                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20 text-xs font-extrabold">
                  {requests.length}
                </Badge>
              </CardTitle>
              <CardDescription>
                Ao aprovar a exclusão, a conta do personal, seus workspaces, alunos vinculados exclusivamente, treinos, conversas e mídias serão destruídos.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-2xl border border-border/40 bg-secondary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 w-full">
                    <Skeleton className="size-12 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-44" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  </div>
                  <Skeleton className="h-10 w-32 rounded-xl shrink-0" />
                </div>
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-border/50 rounded-2xl bg-secondary/5 flex flex-col items-center justify-center space-y-3">
              <div className="size-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="size-7 text-emerald-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-foreground">Nenhuma solicitação de exclusão pendente</h3>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Quando um Personal Trainer solicitar a exclusão de seus dados no painel de configurações, o pedido aparecerá aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((req) => {
                const requestedDateFormatted = new Date(req.requestedAt).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                const userCreatedFormatted = new Date(req.user.createdAt).toLocaleDateString("pt-BR");

                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl border border-red-500/20 bg-card hover:border-red-500/40 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xs"
                  >
                    <div className="flex items-start sm:items-center gap-4">
                      <Avatar className="size-14 border border-border/40 shrink-0">
                        <AvatarImage src={req.user.image || undefined} />
                        <AvatarFallback className="bg-red-500/10 text-red-500 font-bold text-lg">
                          {(req.user.name || req.user.email || "P").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-base text-foreground truncate">
                            {req.user.name || "Sem nome cadastrado"}
                          </h3>
                          <Badge variant="outline" className="bg-secondary text-muted-foreground text-[10px] font-bold">
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

                        <div className="pt-1.5 flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="size-3.5 shrink-0" />
                          <span>Solicitado em: <strong>{requestedDateFormatted}</strong></span>
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
                        className="rounded-xl text-xs font-bold gap-2 cursor-pointer bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/15 h-11 px-5"
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

      {/* Superadmin Data Wipe Confirmation AlertDialog */}
      <AlertDialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <AlertDialogContent className="rounded-2xl max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-red-600 flex items-center gap-2">
              <ShieldAlert className="size-6 text-red-600 shrink-0" />
              CONFIRMAÇÃO DE EXPURGO TOTAL DE DADOS
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed space-y-3 pt-2">
              <p>
                Você está prestes a aprovar e executar a exclusão definitiva de todos os dados referentes ao personal:
              </p>

              {selectedRequest && (
                <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/50 text-foreground space-y-1 font-mono text-xs">
                  <div><strong>Nome:</strong> {selectedRequest.user.name || "N/A"}</div>
                  <div><strong>Email:</strong> {selectedRequest.user.email}</div>
                  <div><strong>Solicitado em:</strong> {new Date(selectedRequest.requestedAt).toLocaleString("pt-BR")}</div>
                </div>
              )}

              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-medium space-y-1">
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

              <p className="font-bold text-red-600 dark:text-red-400 text-xs">
                Esta ação é IRREVERSÍVEL. Tem certeza que deseja prosseguir?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 pt-2">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl text-xs font-bold">
              Cancelar
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmDeletion}
              disabled={isDeleting}
              className="rounded-xl text-xs font-bold cursor-pointer bg-red-600 hover:bg-red-700 gap-2"
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
    </div>
  );
}
