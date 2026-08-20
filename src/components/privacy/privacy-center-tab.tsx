"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck,
  Download,
  Trash2,
  Lock,
  ExternalLink,
  Loader2,
  Calendar,
  CheckCircle2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface PrivacyData {
  compliance: {
    isCompliant: boolean;
  };
  activeDocuments: {
    terms?: { version: string; publishedAt: string; contentHash: string };
    privacy?: { version: string; publishedAt: string; contentHash: string };
  };
  acceptances: Array<{
    id: string;
    documentType: string;
    documentVersion: string;
    documentHash: string;
    acceptedAt: string;
    source: string;
  }>;
  consents: Array<{
    purpose: string;
    grantedAt: string;
    revokedAt: string | null;
  }>;
  requests: Array<{
    id: string;
    type: string;
    status: string;
    requestedAt: string;
  }>;
}

export function PrivacyCenterTab() {
  const [data, setData] = useState<PrivacyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [consentEmail, setConsentEmail] = useState(false);
  const [consentWhatsapp, setConsentWhatsapp] = useState(false);
  const [updatingConsent, setUpdatingConsent] = useState<string | null>(null);

  useEffect(() => {
    fetchPrivacyData();
  }, []);

  const fetchPrivacyData = async () => {
    try {
      const res = await fetch("/api/user/privacy");
      if (!res.ok) throw new Error("Erro ao carregar dados de privacidade.");
      const json = await res.json();
      setData(json);

      const emailConsent = json.consents?.find((c: any) => c.purpose === "MARKETING_EMAIL" && !c.revokedAt);
      const whatsappConsent = json.consents?.find((c: any) => c.purpose === "MARKETING_WHATSAPP" && !c.revokedAt);
      setConsentEmail(!!emailConsent);
      setConsentWhatsapp(!!whatsappConsent);
    } catch (err: any) {
      toast.error(err.message || "Não foi possível carregar as informações de privacidade.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleConsent = async (purpose: string, currentValue: boolean) => {
    const nextValue = !currentValue;
    setUpdatingConsent(purpose);

    try {
      const res = await fetch("/api/user/privacy/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, granted: nextValue }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.error || "Erro ao atualizar consentimento.");
      }

      if (purpose === "MARKETING_EMAIL") setConsentEmail(nextValue);
      if (purpose === "MARKETING_WHATSAPP") setConsentWhatsapp(nextValue);

      toast.success(nextValue ? "Preferência atualizada: Comunicação ativada! 🎉" : "Preferência atualizada: Comunicação revogada.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar preferência.");
    } finally {
      setUpdatingConsent(null);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    const toastId = toast.loading("Gerando pacote estruturado de dados...");

    try {
      const res = await fetch("/api/user/export-data");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Falha ao gerar arquivo de exportação.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlasfit-dados-titular-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.success("Download do pacote de portabilidade concluído!", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erro ao exportar dados.", { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    const toastId = toast.loading("Processando exclusão definitiva de dados...");

    try {
      const res = await fetch("/api/user/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "DELETION",
          notes: "Solicitação formal de exclusão definitiva e expurgo de dados do titular.",
        }),
      });

      if (!res.ok) throw new Error("Erro ao registrar solicitação de exclusão.");

      toast.success("Solicitação de exclusão registrada com sucesso. Nossa equipe e sistemas iniciarão o expurgo.", { id: toastId });
      fetchPrivacyData();
    } catch (err: any) {
      toast.error(err.message || "Falha ao processar solicitação.", { id: toastId });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview & Quick Links */}
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              Governança e Privacidade de Dados
            </CardTitle>
            <CardDescription className="text-xs">
              Gerencie seus consentimentos, consulte o histórico de aceites e exerça seus direitos sob a LGPD.
            </CardDescription>
          </div>
          <Badge variant="outline" className="gap-1 px-3 py-1">
            <CheckCircle2 className="size-3 text-emerald-500" />
            Conforme LGPD
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Link
            href="/termos-de-uso"
            target="_blank"
            className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span>Termos de Uso vigentes (v{data?.activeDocuments.terms?.version || "1.0"})</span>
            </div>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </Link>

          <Link
            href="/politica-de-privacidade"
            target="_blank"
            className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors text-xs font-semibold"
          >
            <div className="flex items-center gap-2">
              <Lock className="size-4 text-primary" />
              <span>Política de Privacidade (v{data?.activeDocuments.privacy?.version || "1.0"})</span>
            </div>
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Consents Management */}
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">Comunicações e Preferências Opcionais</CardTitle>
          <CardDescription className="text-xs">
            Você tem total autonomia para conceder ou revogar o envio de comunicações promocionais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 border border-border/30">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="consentEmail" className="text-sm font-semibold cursor-pointer">
                Comunicações e dicas por E-mail
              </Label>
              <p className="text-xs text-muted-foreground">
                Receber novidades sobre ferramentas, atualizações da plataforma e dicas de treino.
              </p>
            </div>
            <Switch
              id="consentEmail"
              checked={consentEmail}
              disabled={updatingConsent === "MARKETING_EMAIL"}
              onCheckedChange={() => handleToggleConsent("MARKETING_EMAIL", consentEmail)}
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-secondary/20 border border-border/30">
            <div className="space-y-0.5 pr-4">
              <Label htmlFor="consentWhatsapp" className="text-sm font-semibold cursor-pointer">
                Comunicações via WhatsApp
              </Label>
              <p className="text-xs text-muted-foreground">
                Receber avisos e novidades exclusivas através do número de WhatsApp cadastrado.
              </p>
            </div>
            <Switch
              id="consentWhatsapp"
              checked={consentWhatsapp}
              disabled={updatingConsent === "MARKETING_WHATSAPP"}
              onCheckedChange={() => handleToggleConsent("MARKETING_WHATSAPP", consentWhatsapp)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Data Portability (Art. 18, V) */}
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Download className="size-4 text-primary" />
            Portabilidade de Dados (Exportação)
          </CardTitle>
          <CardDescription className="text-xs">
            Baixe uma cópia completa, estruturada e legível dos seus dados cadastrais, saúde e histórico de treinos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground max-w-lg">
            O arquivo JSON gerado inclui seu perfil, avaliações físicas, histórico de medidas, registros de execução e links temporários para mídias associadas.
          </div>
          <Button
            onClick={handleExportData}
            disabled={isExporting}
            variant="outline"
            className="rounded-xl h-10 px-4 font-semibold text-xs gap-2 shrink-0"
          >
            {isExporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Gerando Arquivo...
              </>
            ) : (
              <>
                <Download className="size-3.5" />
                Exportar Meus Dados (JSON)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Acceptance Evidence History */}
      {data?.acceptances && data.acceptances.length > 0 && (
        <Card className="border-border/50 bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Histórico de Aceites Registrados</CardTitle>
            <CardDescription className="text-xs">
              Evidências imutáveis de aceites de termos com data, versão e hash de integridade SHA-256.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {data.acceptances.map((acc) => (
              <div
                key={acc.id}
                className="p-3 rounded-xl bg-secondary/20 border border-border/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="font-semibold text-foreground">
                    {acc.documentType === "TERMS" ? "Termos de Uso" : "Política de Privacidade"} — v{acc.documentVersion}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground truncate max-w-sm">
                    Hash: {acc.documentHash}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
                  <Calendar className="size-3.5" />
                  <span>{new Date(acc.acceptedAt).toLocaleDateString("pt-BR")} às {new Date(acc.acceptedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Account Deletion / Data Erasure */}
      <Card className="border-destructive/30 bg-destructive/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold text-destructive flex items-center gap-2">
            <Trash2 className="size-4" />
            Exclusão Definitiva de Conta e Dados
          </CardTitle>
          <CardDescription className="text-xs text-destructive/80">
            Ação irreversível de eliminação de registros no banco de dados e expurgo de arquivos no Cloudflare R2.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="text-xs text-muted-foreground max-w-lg">
            Ao solicitar a exclusão, todos os seus treinos, fotos comparativas, dados de saúde e acessos serão permanentemente eliminados.
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="rounded-xl h-10 px-4 font-semibold text-xs gap-2 shrink-0"
              >
                <Trash2 className="size-3.5" />
                Excluir Minha Conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="size-5" />
                  Tem certeza absoluta?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
                  <p>
                    Esta ação é <strong className="text-foreground">irreversível</strong>. Todos os seus dados pessoais, históricos de treino, medidas e fotos de evolução serão expurgados definitivamente dos nossos servidores e do storage em nuvem.
                  </p>
                  <p>
                    Deseja realmente prosseguir com o pedido de exclusão?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  variant="destructive"
                  disabled={isDeleting}
                >
                  {isDeleting ? "Processando..." : "Sim, Excluir Meus Dados"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
