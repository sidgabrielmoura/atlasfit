"use client";
import { GymPrivacyRequests } from "@/components/privacy/gym-privacy-requests";
import { GymClosureForm } from "@/components/application/gym-closure-form";


import { GymPageHeader } from "@/components/application/gym-page";
import { GymTabsList } from "@/components/application/gym-tabs-list";
import { WorkspaceBrandingForm, type WorkspaceBrandingData } from "@/components/application/workspace-branding-form";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import React, { useState } from "react";
import {
  ShieldAlert,
  UserCheck,
  Download,
  AlertTriangle,
  FileText,
  KeyRound,
  RefreshCw,
  Info,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";

interface StaffMemberOption {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface DsrRequestItem {
  id: string;
  type: string;
  status: string;
  requestedAt: string;
  completedAt: string | null;
  requesterName: string;
  notes: string | null;
}

interface GymSettingsClientProps {
  workspace: WorkspaceBrandingData & {
    id: string;
    name: string;
    slug: string;
    ownerId: string;
    createdAt: Date;
  };
  isCurrentOwner: boolean;
  currentUserId: string;
  eligibleStaffMembers: StaffMemberOption[];
  recentRequests: DsrRequestItem[];
  privacySubjects: { userId: string; name: string }[];
}

export function GymSettingsClient({
  workspace,
  isCurrentOwner,
  currentUserId,
  eligibleStaffMembers,
  recentRequests,
  privacySubjects,
}: GymSettingsClientProps) {
  const [activeTab, setActiveTab] = useState("brand");

  // Estados de Transferência de Titularidade
  const [selectedTargetUserId, setSelectedTargetUserId] = useState<string>("");
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  // Estados de Dossiê LGPD
  const [dossierUserId, setDossierUserId] = useState("");
  const [isExportingDossier, setIsExportingDossier] = useState(false);

  // Estados de Exclusão LGPD
  const [deleteTargetUserId, setDeleteTargetUserId] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Executar transferência de propriedade
  const handleTransferOwnership = async () => {
    if (!selectedTargetUserId) {
      toast.error("Selecione o membro que assumirá como novo proprietário.");
      return;
    }

    try {
      setIsTransferring(true);
      const res = await fetch("/api/gym/settings/transfer-ownership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          targetUserId: selectedTargetUserId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falha ao transferir propriedade.");
      }

      toast.success("Titularidade da academia transferida com sucesso!");
      setIsTransferModalOpen(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Erro na transferência de propriedade.");
    } finally {
      setIsTransferring(false);
    }
  };

  // 2. Exportar Dossiê do Titular (LGPD Art. 18 / 19)
  const handleExportDossier = async () => {
    if (!dossierUserId.trim()) {
      toast.error("Informe o ID do usuário titular para exportação.");
      return;
    }

    try {
      setIsExportingDossier(true);
      const res = await fetch("/api/gym/privacy/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          targetUserId: dossierUserId.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Falha ao extrair dossiê do titular.");
      }

      // Download do arquivo JSON
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dossie-titular-lgpd-${dossierUserId.trim()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Dossiê LGPD exportado e baixado com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao exportar dossiê LGPD.");
    } finally {
      setIsExportingDossier(false);
    }
  };

  // 3. Executar anonimização com retenção fiscal
  const handleExecuteDeletion = async () => {
    if (!deleteTargetUserId.trim()) {
      toast.error("Selecione o titular do pedido.");
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch("/api/gym/privacy/delete-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: workspace.id,
          targetUserId: deleteTargetUserId.trim(),
          reason: deleteReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Não foi possível registrar o pedido.");
      }

      toast.success(
        "Solicitação registrada e pendente de análise."
      );
      setIsDeleteModalOpen(false);
      setDeleteTargetUserId("");
      setDeleteReason("");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Não foi possível registrar o pedido.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Cabeçalho */}
      <GymPageHeader
        title={<>Configurações</>}
        description={<>Marca, titularidade e solicitações de privacidade.</>}
        badge={<> <Badge variant="outline" className="border-border/50 text-[10px] text-muted-foreground font-medium">
            LGPD & Segurança
          </Badge> </>}
        
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <GymTabsList className="">
          <TabsTrigger value="brand">Identificação e marca</TabsTrigger>
          <TabsTrigger value="lgpd" className="text-xs">Privacidade</TabsTrigger>
          <TabsTrigger value="ownership" className="text-xs">Titularidade</TabsTrigger>
        </GymTabsList>
        <TabsContent value="brand"><WorkspaceBrandingForm workspace={workspace} /></TabsContent>

        {/* ABA 1: LGPD & DIREITOS DO TITULAR */}
        <TabsContent value="lgpd" className="space-y-4">
          <Alert className="border-border/50 bg-background/50">
            <Info className="size-3.5 text-primary" />
            <AlertTitle className="text-xs font-semibold text-foreground">
              Solicitações de privacidade
            </AlertTitle>
            <AlertDescription>Solicitações são registradas para análise. Exclusão, retenção e confirmação de remoção exigem tratamento autorizado e verificação dos vínculos.</AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2 min-w-0 [&>*]:min-w-0">
            {/* Portabilidade de Dados */}
            <Card className="min-w-0 border-border/50">
              <CardHeader className="min-w-0">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5 font-bold">
                  <Download className="size-3.5 text-primary" />
                  Dossiê do Titular (Portabilidade)
                </CardTitle>
                <CardDescription className="text-sm">
                  Exporte os registros disponíveis do titular nesta academia.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="dossierUserId" className="text-xs font-medium text-muted-foreground">Titular</label>
                  <NativeSelect id="dossierUserId" aria-label="Selecionar titular da academia" value={dossierUserId} onChange={event => setDossierUserId(event.target.value)}><NativeSelectOption value="">Selecione o titular</NativeSelectOption>{privacySubjects.map(subject => <NativeSelectOption key={subject.userId} value={subject.userId}>{subject.name}</NativeSelectOption>)}</NativeSelect>
                  <p className="text-[11px] text-muted-foreground">
                    A lista contém pessoas vinculadas a esta academia.
                  </p>
                </div>

                <Button
                  onClick={handleExportDossier}
                  disabled={!dossierUserId.trim() || isExportingDossier}
                  size="sm"
                  className="w-full cursor-pointer gap-1.5 text-xs font-medium"
                >
                  {isExportingDossier ? <Spinner className="size-3.5" /> : <Download className="size-3.5" />}
                  {isExportingDossier ? "Gerando..." : "Exportar e Baixar (.json)"}
                </Button>
              </CardContent>
            </Card>

            {/* Anonimização com Retenção Fiscal */}
            <Card className="min-w-0 border-border/50">
              <CardHeader className="min-w-0">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="size-3.5 text-muted-foreground" />
                  Solicitar eliminação
                </CardTitle>
                <CardDescription className="text-sm">
                  Registre o pedido do titular para análise do escopo, autorização e retenção.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="deleteTargetUserId" className="text-xs font-medium text-muted-foreground">Titular</label>
                  <NativeSelect id="deleteTargetUserId" aria-label="Selecionar titular da academia" value={deleteTargetUserId} onChange={event => setDeleteTargetUserId(event.target.value)}><NativeSelectOption value="">Selecione o titular</NativeSelectOption>{privacySubjects.map(subject => <NativeSelectOption key={subject.userId} value={subject.userId}>{subject.name}</NativeSelectOption>)}</NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Justificativa / Motivo</label>
                  <Input
                    placeholder="Ex: Solicitação expressa do titular via formulário LGPD"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="h-9 text-xs border-border/50 bg-background/50"
                  />
                </div>

                <Button
                  variant="outline"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={!deleteTargetUserId.trim() || isDeleting}
                  size="sm"
                  className="w-full cursor-pointer gap-1.5 text-xs font-medium border-border/50 hover:bg-destructive/10 hover:text-destructive"
                >
                  {isDeleting ? <Spinner className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                  {isDeleting ? "Processando..." : "Registrar solicitação"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <GymPrivacyRequests workspaceId={workspace.id} />

          </TabsContent>

        {/* ABA 2: TRANSFERÊNCIA DE PROPRIETÁRIO */}
        <TabsContent value="ownership" className="space-y-4">
          <Card className="min-w-0 border-border/50">
            <CardHeader className="min-w-0">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5 font-bold">
                <KeyRound className="size-3.5 text-primary" />
                Transferência de Propriedade do Workspace
              </CardTitle>
              <CardDescription className="text-sm">
                Transfira a propriedade (papel OWNER) da academia para outro membro ativo da equipe com salvaguardas e auditoria atômica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isCurrentOwner ? (
                <Alert className="border-border/50 bg-background/50">
                  <AlertTriangle className="size-3.5 text-muted-foreground" />
                  <AlertTitle className="text-xs font-semibold text-foreground">
                    Acesso Restrito ao Proprietário Atual
                  </AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                    Apenas o atual proprietário da academia tem alçada para transferir a titularidade do workspace.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <Alert className="border-border/50 bg-background/50">
                    <Info className="size-3.5 text-primary" />
                    <AlertTitle className="text-xs font-semibold text-foreground">
                      Regra de Proteção contra Perda de Dono
                    </AlertTitle>
                    <AlertDescription className="text-xs text-muted-foreground mt-0.5">
                      Ao transferir a titularidade, seu papel será rebaixado automaticamente para <strong>GERENTE (MANAGER)</strong>,
                      e você deixará de ter permissões exclusivas de proprietário. A operação é atômica e irreversível.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-1.5 max-w-md">
                    <label className="text-xs font-medium text-muted-foreground">Selecione o Novo Proprietário</label>
                    <NativeSelect
                      className="w-full"
                      value={selectedTargetUserId}
                      onChange={(e) => setSelectedTargetUserId(e.target.value)}
                    >
                      <NativeSelectOption value="" className="bg-background text-foreground">Selecione um membro ativo da equipe...</NativeSelectOption>
                      {eligibleStaffMembers
                        .filter((m) => m.userId !== currentUserId)
                        .map((m) => (
                          <NativeSelectOption key={m.userId} value={m.userId} className="bg-background text-foreground">
                            {m.user.name || m.user.email} ({m.role})
                          </NativeSelectOption>
                        ))}
                    </NativeSelect>
                  </div>

                  <Button
                    onClick={() => setIsTransferModalOpen(true)}
                    disabled={!selectedTargetUserId || isTransferring}
                    size="sm"
                    className="cursor-pointer gap-1.5 text-xs font-medium"
                  >
                    <KeyRound className="size-3.5" />
                    Iniciar Transferência de Titularidade
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isCurrentOwner && <GymClosureForm workspaceId={workspace.id} slug={workspace.slug} />}

      {/* Modal AlertDialog de Confirmação de Transferência de Dono */}
      <AlertDialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <AlertDialogContent className="border border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Confirmar Transferência de Propriedade?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs text-muted-foreground">
              <p>
                Você está prestes a transferir o controle total e exclusivo do workspace <strong>{workspace.name}</strong> para outro usuário.
              </p>
              <p className="font-semibold text-foreground">
                Seu papel passará a gerente. Confirme o destinatário antes de transferir.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring} className="cursor-pointer text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleTransferOwnership();
              }}
              disabled={isTransferring}
              className="cursor-pointer gap-1.5 text-xs font-medium"
            >
              {isTransferring ? <Spinner className="size-3.5" /> : <KeyRound className="size-3.5" />}
              {isTransferring ? "Transferindo..." : "Confirmar Transferência"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal AlertDialog de Anonimização LGPD */}
      <AlertDialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <AlertDialogContent className="border border-border/50 bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold text-foreground">
              Registrar pedido de eliminação?
            </AlertDialogTitle>
            <AlertDialogDescription>A solicitação ficará pendente de análise. Cadastro, contratos e histórico serão preservados até a definição e execução do tratamento autorizado.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="cursor-pointer text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                handleExecuteDeletion();
              }}
              disabled={isDeleting}
              className="cursor-pointer gap-1.5 text-xs font-medium"
            >
              {isDeleting ? <Spinner className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
              {isDeleting ? "Registrando..." : "Registrar solicitação"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
