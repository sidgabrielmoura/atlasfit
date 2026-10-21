const fs=require('node:fs');
function edit(p,f){const s=fs.readFileSync(p,'utf8'),n=f(s);if(s===n)throw new Error('No change '+p);fs.writeFileSync(p,n);}
function rep(s,a,b){if(!s.includes(a))throw new Error('Anchor missing '+a.slice(0,60));return s.replace(a,b);}
edit('src/lib/privacy/export.service.ts',s=>{
  s='import { collectGymArchiveAttachments } from "@/modules/workspaces/application/gym-privacy-archive";\nimport { gymAttachmentKeys } from "@/modules/workspaces/application/gym-storage";\nimport { permitsOwnAccount } from "@/lib/auth/account-eligibility";\n'+s;
  s=rep(s,'    const user =','    if (!await permitsOwnAccount(userId)) throw new Error("Conta sem elegibilidade para exportação própria.");\n    const user =');
  s=rep(s,'            role: true,\n            plan: true,','            role: true,\n            studentProfile: { select: { registrationNumber: true, healthData: true, onboardedAt: true, medicalClearance: true, medicalClearanceExpiresAt: true, emergencyContactName: true, emergencyContactPhone: true, notes: true } },\n            plan: true,');
  s=rep(s,'        studentFiles: {','        progressPhotos: { select: { id: true, workspaceId: true, objectKey: true, photoUrl: true, date: true, comment: true, trainerLiked: true } },\n        studentFiles: {');
  s=rep(s,'            fileName: true,','            workspaceId: true, objectKey: true, mimeType: true, size: true,\n            fileName: true,');
  s=rep(s,'            rightThigh: true,','            rightForearm: true, leftForearm: true,\n            rightThigh: true,');
  for(const marker of ['studentWorkouts','workoutLogs','physicalEvaluations','progressHistory']) { const start=s.indexOf('        '+marker+': {'),select=s.indexOf('select: {',start);s=s.slice(0,select)+s.slice(select).replace('select: {','select: {\n            workspaceId: true,'); }
  s=rep(s,'    // Register Audit Log',`    const archives = [];
    const grouped = new Map<string, { key: string; resourceId: string; name: string }[]>();
    for (const file of user.studentFiles) if (file.type === "file") {
      const key = file.objectKey || gymAttachmentKeys(file.url)[0]; if (!key) throw new Error("Arquivo legado requer reconciliação antes da exportação.");
      grouped.set(file.workspaceId, [...(grouped.get(file.workspaceId) || []), { key, resourceId: file.id, name: file.fileName || file.name }]);
    }
    for (const photo of user.progressPhotos) {
      const key = photo.objectKey || gymAttachmentKeys(photo.photoUrl)[0]; if (!key) throw new Error("Foto legada requer reconciliação antes da exportação.");
      grouped.set(photo.workspaceId, [...(grouped.get(photo.workspaceId) || []), { key, resourceId: photo.id, name: "Foto de evolução" }]);
    }
    for (const [workspaceId, sources] of grouped) archives.push({ workspaceId, ...await collectGymArchiveAttachments(workspaceId, sources) });
    const invoices = await prisma.gymInvoice.findMany({ where: { studentUserId: userId }, select: { workspaceId: true, invoiceNumber: true, title: true, status: true, dueDate: true, competenceMonth: true, totalInCents: true, paidAmountInCents: true, balanceRemainingInCents: true } });
    const enrollments = await prisma.gymEnrollment.findMany({ where: { studentMember: { userId } }, select: { workspaceId: true, status: true, startDate: true, endDate: true, priceInCents: true, enrollmentFeeInCents: true, planVersion: { select: { name: true, version: true, termsText: true, termsVersion: true } }, acceptance: { select: { signedAt: true, termsSnapshot: true, termsVersion: true, representationRole: true } }, events: { select: { fromStatus: true, toStatus: true, createdAt: true } } } });
    // Register Audit Log`);
  s=rep(s,'      userData: user,','      userData: user,\n      archives,\n      financialRecords: JSON.parse(JSON.stringify(invoices, (_key, value) => typeof value === "bigint" ? value.toString() : value)),\n      contracts: JSON.parse(JSON.stringify(enrollments, (_key, value) => typeof value === "bigint" ? value.toString() : value)),');
  return s;
});
edit('src/app/api/user/export-data/route.ts',s=>rep(s,'  const ip =','  if (session.user.isImpersonated) return NextResponse.json({ error: "Encerre a impersonação para exportar dados próprios." }, { status: 403 });\n  const ip =').replace('console.error("[DATA_EXPORT_API_ERROR]", error);','console.error("[DATA_EXPORT_API_ERROR] Pacote não gerado.");').replace('error.message || "Erro ao gerar pacote de dados."','"Não foi possível gerar o pacote completo. Confira o armazenamento e tente novamente."'));
edit('src/components/privacy/privacy-center-tab.tsx',s=>{
  s='import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";\nimport { Textarea } from "@/components/ui/textarea";\n'+s;
  s=rep(s,'interface PrivacyData {','interface PrivacyData {\n  gymWorkspaces?: { id: string; name: string }[];');
  s=rep(s,'    requestedAt: string;','    requestedAt: string;\n    workspaceId?: string | null; response?: string | null; rejectionReason?: string | null;');
  s=rep(s,'  const [data, setData]','  const [requestWorkspace, setRequestWorkspace] = useState("");\n  const [requestType, setRequestType] = useState("INFORMATION");\n  const [requestNotes, setRequestNotes] = useState("");\n  const [requestBusy, setRequestBusy] = useState(false);\n  const [data, setData]');
  s=rep(s,'  const handleDeleteAccount = async () => {',`  const submitRequest = async () => {
    setRequestBusy(true);
    try { const res = await fetch("/api/user/privacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: requestType, workspaceId: requestWorkspace || null, notes: requestNotes }) }); const body = await res.json(); if (!res.ok) throw new Error(typeof body.error === "string" ? body.error : body.error?.message || "Pedido não registrado."); toast.success("Pedido registrado para análise."); setRequestNotes(""); await fetchPrivacyData(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Falha ao enviar pedido."); } finally { setRequestBusy(false); }
  };
  const handleDeleteAccount = async () => {`);
  s=rep(s,'          type: "DELETION",','          type: "DELETION",\n          workspaceId: requestWorkspace || null,');
  s=s.replace('Processando exclusão definitiva de dados...','Registrando pedido de exclusão...').replace('Nossa equipe e sistemas iniciarão o expurgo.','O controlador analisará a identidade, o escopo e as retenções.');
  s=s.replace('Conforme LGPD','Central de privacidade');
  s=s.replace('O arquivo JSON gerado inclui seu perfil, avaliações físicas, histórico de medidas, registros de execução e links temporários para mídias associadas.','O pacote inclui os registros do titular e anexos em base64 com hash de integridade. Arquivos sem tamanho verificável impedem a conclusão e precisam ser reconciliados.');
  s=s.replace('Ação irreversível de eliminação de registros no banco de dados e expurgo de arquivos no Cloudflare R2.','Pedido sujeito à conferência da identidade e à análise das finalidades de retenção pelo controlador selecionado.');
  s=s.replace('Ao solicitar a exclusão, todos os seus treinos, fotos comparativas, dados de saúde e acessos serão permanentemente eliminados.','A solicitação será analisada pelo controlador. A resposta informará os dados eliminados, os registros conservados e os motivos da retenção.');
  s=s.replace('Esta ação é <strong className="text-foreground">irreversível</strong>. Todos os seus dados pessoais, históricos de treino, medidas e fotos de evolução serão expurgados definitivamente dos nossos servidores e do storage em nuvem.','Este pedido será registrado para análise. A exclusão ocorrerá após a conferência da identidade e das finalidades de retenção, com resposta fundamentada.');
  s=s.replace('Sim, Excluir Meus Dados','Registrar pedido de exclusão');
  s=rep(s,'      {/* Account Deletion / Data Erasure */}',`      <Card><CardHeader><CardTitle>Exercer meus direitos</CardTitle><CardDescription>Selecione quem mantém os registros e acompanhe a resposta ao seu pedido.</CardDescription></CardHeader><CardContent className="space-y-4">
        <Label htmlFor="privacy-controller">Controlador responsável</Label><NativeSelect id="privacy-controller" value={requestWorkspace} onChange={e => setRequestWorkspace(e.target.value)}><NativeSelectOption value="">AtlasFit — conta da plataforma</NativeSelectOption>{data?.gymWorkspaces?.map(w => <NativeSelectOption key={w.id} value={w.id}>{w.name}</NativeSelectOption>)}</NativeSelect>
        <Label htmlFor="privacy-type">Tipo de pedido</Label><NativeSelect id="privacy-type" value={requestType} onChange={e => setRequestType(e.target.value)}>{Object.entries({ ACCESS: "Acesso aos dados", CORRECTION: "Correção", DELETION: "Eliminação", PORTABILITY: "Portabilidade", CONSENT_REVOCATION: "Revogação de consentimento", INFORMATION: "Informações sobre tratamento", OBJECTION: "Oposição", OTHER: "Outro pedido" }).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}</NativeSelect>
        <Label htmlFor="privacy-notes">Descreva seu pedido</Label><Textarea id="privacy-notes" value={requestNotes} onChange={e => setRequestNotes(e.target.value)} maxLength={2000} /><Button disabled={requestBusy} onClick={() => void submitRequest()}>{requestBusy ? "Registrando…" : "Enviar pedido"}</Button>
        <div className="space-y-3" aria-label="Meus pedidos de privacidade">{data?.requests.map(r => <div key={r.id} className="rounded-lg border p-3 text-sm"><p>{r.type} · {r.status} · {new Date(r.requestedAt).toLocaleDateString("pt-BR")}</p><p>{data.gymWorkspaces?.find(w => w.id === r.workspaceId)?.name || "AtlasFit — plataforma"}</p>{(r.response || r.rejectionReason) && <p className="mt-2 whitespace-pre-wrap">{r.response || r.rejectionReason}</p>}</div>)}</div>
      </CardContent></Card>
      {/* Account Deletion / Data Erasure */}`);
  return s;
});
