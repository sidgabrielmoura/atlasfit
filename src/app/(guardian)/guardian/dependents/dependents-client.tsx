"use client";

import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { guardianDependentSchema, guardianLegalResultSchema, guardianLegalDocumentSchema as legalDocumentSchema, guardianPortalError as messageFromResponse, type GuardianDependent } from "@/modules/workspaces/domain/guardian-portal";
import { GymStudentFinance } from "@/components/application/gym-student-finance";
import { GymStudentHealth } from "@/components/privacy/gym-student-health";
import { GuardianPrivacyRequests } from "@/components/privacy/guardian-privacy-requests";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Building2,
  FileCheck2,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { GymContractAcceptance } from "@/components/application/gym-contract-acceptance";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DependentItem = GuardianDependent;

interface GuardianDependentsClientProps {
  initialDependents: DependentItem[];
  userName: string;
  userEmail: string;
}

export function GuardianDependentsClient({
  initialDependents,
  userName,
}: GuardianDependentsClientProps) {
  const [dependents, setDependents] = useState(initialDependents);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [listReload, setListReload] = useState(0);
  const [selectedFinance, setSelectedFinance] = useState<DependentItem | null>(null);
  const [selectedPrivacy, setSelectedPrivacy] = useState<DependentItem | null>(null);
  const [documentType, setDocumentType] = useState<"TERMS" | "PRIVACY">("TERMS");
  const accepting = useRef(false);
  const [selectedDependentForTerms, setSelectedDependentForTerms] = useState<DependentItem | null>(null);
  const [isAcceptingTerms, setIsAcceptingTerms] = useState(false);
  const [legalDocument, setLegalDocument] = useState<z.infer<typeof legalDocumentSchema> | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [acceptedDocument, setAcceptedDocument] = useState(false);
  const [documentReload, setDocumentReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setListLoading(true); setListError(null);
    void (async () => {
      try {
        const response = await fetch("/api/guardian/dependents", { signal: controller.signal });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(messageFromResponse(data, "Não foi possível atualizar os dependentes."));
        const rows = z.array(guardianDependentSchema).parse(data);
        if (!controller.signal.aborted) setDependents(rows);
      } catch (error: unknown) {
        if (!controller.signal.aborted) { setDependents([]); setListError(error instanceof Error ? error.message : "Não foi possível atualizar os dependentes."); }
      } finally { if (!controller.signal.aborted) setListLoading(false); }
    })();
    return () => controller.abort();
  }, [listReload]);

  useEffect(() => {
    setLegalDocument(null); setDocumentError(null); setAcceptedDocument(false);
    if (!selectedDependentForTerms) return;
    const controller = new AbortController();
    const item = selectedDependentForTerms;
    async function load() {
      try {
        const response = await fetch(`/api/guardian/dependents/${item.guardianId}/accept-terms?workspaceId=${encodeURIComponent(item.workspace.id)}&documentType=${documentType}`, { signal: controller.signal });
        const data: unknown = await response.json();
        if (!response.ok) throw new Error(messageFromResponse(data, "Não foi possível carregar o documento."));
        const document = legalDocumentSchema.parse(data);
        if (!controller.signal.aborted) setLegalDocument(document);
      } catch (error) { if (!controller.signal.aborted) setDocumentError(error instanceof Error ? error.message : "Não foi possível carregar o documento."); }
    }
    void load();
    return () => controller.abort();
  }, [selectedDependentForTerms, documentReload, documentType]);

  const handleAcceptTerms = async () => {
    if (accepting.current || !selectedDependentForTerms || !legalDocument || !acceptedDocument || legalDocument.acceptedAt) return;
    accepting.current = true;

    setIsAcceptingTerms(true);
    try {
      const res = await fetch(`/api/guardian/dependents/${selectedDependentForTerms.guardianId}/accept-terms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: selectedDependentForTerms.workspace.id,
          documentType: legalDocument.type,
          documentId: legalDocument.id,
          documentHash: legalDocument.documentHash,
          accepted: true,
        }),
      });

      const data: unknown = await res.json();
      if (!res.ok) {
        if (res.status === 409) setDocumentReload(value => value + 1);
        throw new Error(messageFromResponse(data, "Erro ao registrar aceite de termos."));
      }

      guardianLegalResultSchema.parse(data);
      toast.success(`${documentType === "PRIVACY" ? "Ciência" : "Aceite"} da versão ${legalDocument.version} registrada para ${selectedDependentForTerms.student.name}.`);
      setSelectedDependentForTerms(null); setListReload(value => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao aceitar termos.");
    } finally {
      accepting.current = false; setIsAcceptingTerms(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* Page Header */}
      <div className="border-b pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Portal do Responsável Legal</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              Dependentes
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Olá, {userName}. Consulte seus vínculos, mensalidades e documentos. Exibimos até 100 vínculos verificados.
          </p>
        </div>
      </div>

      {listError ? <Alert variant="destructive"><AlertDescription>{listError} <Button variant="outline" disabled={listLoading} onClick={() => setListReload(value => value + 1)}>Tentar novamente</Button></AlertDescription></Alert> : listLoading ? <div className="grid gap-4 md:grid-cols-2" role="status" aria-label="Atualizando dependentes">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div> : dependents.length === 0 ? (
        <Empty><EmptyHeader><EmptyTitle>Nenhum dependente vinculado</EmptyTitle><EmptyDescription>Solicite à recepção a associação e a conferência da sua conta à ficha do menor, com os poderes adequados ao seu vínculo.</EmptyDescription></EmptyHeader></Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {dependents.map((item) => {
            const student = item.student;
            const workspace = item.workspace;
            const powers = item.powers;

            return (
              <Card key={item.guardianId} className="flex flex-col justify-between overflow-hidden border-border/80 shadow-sm">
                <div>
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                            {student.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-base">{student.name}</CardTitle>
                          <CardDescription className="text-xs flex items-center gap-1.5 mt-0.5">
                            <span>Vínculo: <strong>{item.relationship}</strong></span>
                            {student.age !== undefined && <span>• {student.age} anos</span>}
                          </CardDescription>
                        </div>
                      </div>

                      {student.isActive ? (
                        <Badge variant="default" className="bg-emerald-600/15 text-emerald-600 border-emerald-500/20 text-xs">
                          Cadastro ativo
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Inativo
                        </Badge>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 flex flex-col gap-4 text-xs">
                    {/* Gym & Unit Info */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-muted/30 border">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Academia</span>
                        <p className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          <span>{workspace.name}</span>
                        </p>
                      </div>

                      <div>
                        <span className="text-muted-foreground block text-[11px]">Unidade / Filial</span>
                        <p className="font-semibold text-foreground mt-0.5">
                          {student.unit?.name || "Matriz"}
                        </p>
                      </div>

                      <div className="pt-1">
                        <span className="text-muted-foreground block text-[11px]">Plano</span>
                        <p className="font-semibold text-foreground mt-0.5">
                          {student.plan} ({student.modality})
                        </p>
                      </div>

                      <div className="pt-1">
                        <span className="text-muted-foreground block text-[11px]">Treinador</span>
                        <p className="font-semibold text-foreground mt-0.5">
                          {student.assignedStaff?.name || "Geral"}
                        </p>
                      </div>
                    </div>

                    {/* Powers badges */}
                    {powers.isLegalRepresentative && student.isMinor && item.contracts.length > 0 && <div className="flex flex-col gap-3">
                      <p className="text-sm font-medium">Contratos da academia</p>
                      {item.contracts.map(contract => <div key={contract.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"><span className="text-sm">{contract.planName}</span><GymContractAcceptance workspaceId={workspace.id} enrollmentId={contract.id} /></div>)}
                    </div>}
                    <div>
                      <span className="text-muted-foreground block text-[11px] mb-1.5 uppercase tracking-wider font-semibold">
                        Seus Poderes de Representação
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {powers.isLegalRepresentative && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[11px]">
                            Representante Legal (Termos)
                          </Badge>
                        )}
                        {powers.isFinancialResponsible && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">
                            Responsável Financeiro
                          </Badge>
                        )}
                        {powers.isEmergencyContact && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]">
                            Contato de Emergência
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Health privacy demarcation */}
                    <div className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <HeartPulse className="h-3.5 w-3.5 text-red-500" />
                          Acesso a Dados de Saúde & Anamnese
                        </span>
                        {powers.hasHealthAccess ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            Autorizado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-muted text-muted-foreground text-[10px]">
                            Restrito (LGPD)
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {powers.hasHealthAccess
                          ? `Liberação médica registrada: ${student.medicalClearance ? "Sim" : "Pendente"}.`
                          : "Seu vínculo não permite consultar informações de saúde."}
                      </p>
                    </div>

                    
                    
                  </CardContent>
                </div>

                <CardFooter className="pt-3 border-t bg-muted/10 flex flex-wrap items-center justify-between gap-3">
                  {(powers.isLegalRepresentative || powers.hasHealthAccess) && <Button size="sm" variant="outline" onClick={() => setSelectedPrivacy(item)}>Saúde e solicitações</Button>}
                  <div className="text-[11px] text-muted-foreground">
                    Matrícula: <strong className="font-mono text-foreground">{student.registrationNumber || "Sem matrícula"}</strong>
                  </div>

                  {powers.isFinancialResponsible && <Button size="sm" variant="outline" onClick={() => setSelectedFinance(item)}>Mensalidades</Button>}
                  {powers.isLegalRepresentative && <Button size="sm" variant="outline" onClick={() => { setDocumentType("PRIVACY"); setSelectedDependentForTerms(item); }}>Privacidade</Button>}
                  {powers.isLegalRepresentative && student.isMinor && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setDocumentType("TERMS"); setSelectedDependentForTerms(item); }}
                      className="gap-1.5 text-xs h-8"
                    >
                      <FileCheck2 className="h-3.5 w-3.5 text-primary" />
                      Consultar termos
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: Aceite de Termos de Menor pelo Responsável Legal                   */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(selectedDependentForTerms)} onOpenChange={(open) => { if (!open && !isAcceptingTerms) setSelectedDependentForTerms(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{legalDocument?.title || "Documento do AtlasFit"}</DialogTitle>
            <DialogDescription>Representação de {selectedDependentForTerms?.student.name} na {selectedDependentForTerms?.workspace.name}. Este aceite não ativa matrícula, pagamento ou acesso físico.</DialogDescription>
          </DialogHeader>
          {documentError ? <Alert variant="destructive"><AlertDescription>{documentError} <Button variant="outline" onClick={() => setDocumentReload(value => value + 1)}>Tentar novamente</Button></AlertDescription></Alert> : legalDocument ? <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Versão {legalDocument.version}</p>{legalDocument.acceptedAt && <Alert><AlertDescription>Registro desta versão confirmado em {new Date(legalDocument.acceptedAt).toLocaleString("pt-BR")}.</AlertDescription></Alert>}
            <pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap break-words rounded-md border p-4 font-sans text-sm leading-relaxed">{legalDocument.content}</pre>
            <Field orientation="horizontal"><Checkbox id="guardian-document-confirmation" checked={acceptedDocument} onCheckedChange={value => setAcceptedDocument(value === true)} disabled={isAcceptingTerms || Boolean(legalDocument.acceptedAt)} /><FieldLabel htmlFor="guardian-document-confirmation">{documentType === "PRIVACY" ? "Li e reconheço a política de privacidade exibida em representação do dependente." : "Li e aceito os termos exibidos em representação do dependente."}</FieldLabel></Field>
          </div> : <div role="status" aria-label="Carregando documento" className="flex flex-col gap-4"><Skeleton className="h-6 w-40" /><Skeleton className="h-60 w-full" /></div>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDependentForTerms(null)} disabled={isAcceptingTerms}>Fechar</Button>
            <Button onClick={handleAcceptTerms} disabled={isAcceptingTerms || !legalDocument || !acceptedDocument || Boolean(legalDocument.acceptedAt)}>{isAcceptingTerms ? <><Loader2 data-icon="inline-start" className="animate-spin" /> Registrando…</> : documentType === "PRIVACY" ? "Registrar ciência" : "Registrar aceite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedFinance)} onOpenChange={(open) => { if (!open) setSelectedFinance(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Mensalidades de {selectedFinance?.student.name}</DialogTitle><DialogDescription>Consulta dos registros da {selectedFinance?.workspace.name}, conforme seu poder financeiro verificado.</DialogDescription></DialogHeader>
          {selectedFinance && <GymStudentFinance key={selectedFinance.guardianId} workspaceId={selectedFinance.workspace.id} statementUrl={"/api/guardian/dependents/" + encodeURIComponent(selectedFinance.guardianId) + "/finance?workspaceId=" + encodeURIComponent(selectedFinance.workspace.id)} showContractsLink={false} />}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedPrivacy)} onOpenChange={open => { if (!open) setSelectedPrivacy(null); }}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Saúde e privacidade de {selectedPrivacy?.student.name}</DialogTitle><DialogDescription>Dados e solicitações desta academia, conforme seus poderes verificados.</DialogDescription></DialogHeader>
          {selectedPrivacy?.powers.hasHealthAccess && <GymStudentHealth workspaceId={selectedPrivacy.workspace.id} memberId={selectedPrivacy.student.memberId} guardianId={selectedPrivacy.guardianId} canEdit={false} />}
          {selectedPrivacy?.powers.isLegalRepresentative && <GuardianPrivacyRequests workspaceId={selectedPrivacy.workspace.id} guardianId={selectedPrivacy.guardianId} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
