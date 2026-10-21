const fs=require('node:fs');
function edit(p,f){const old=fs.readFileSync(p,'utf8'),next=f(old);if(next===old)throw new Error('No change '+p);fs.writeFileSync(p,next);}
function rep(s,a,b){if(!s.includes(a))throw new Error('Missing anchor '+a.slice(0,70));return s.replace(a,b);}
edit('src/modules/workspaces/application/privacy-service.ts',s=>s.replace('hiredAt: true','hireDate: true'));
edit('src/app/api/gym/privacy/export/route.ts',s=>{
  s='import { z } from "zod";\nimport { readJsonRequest } from "@/lib/http/read-json";\n'+s;
  s=rep(s,'const body = await req.json();\n    const { workspaceId, targetUserId } = body;','const body = z.object({ workspaceId: z.string().min(1).max(100), targetUserId: z.string().min(1).max(100).optional(), requestId: z.string().min(1).max(100).optional() }).strict().parse(await readJsonRequest(req, 4096));\n    const { workspaceId, targetUserId } = body;');
  s=rep(s,'actorUserId: context.userId,','actorUserId: context.userId,\n      requestId: body.requestId,');
  s=rep(s,'return NextResponse.json({ data: dossier });','return NextResponse.json({ data: dossier }, { headers: { "Cache-Control": "no-store" } });');
  s=s.replace('console.error("[GYM_PRIVACY_EXPORT_ERROR]", error);','console.error("[GYM_PRIVACY_EXPORT_ERROR] Exportação não concluída.");').replace('error.message || "Falha ao exportar dossiê LGPD."','"Pacote não gerado. Confira o pedido e os arquivos e tente novamente."');
  return s;
});
edit('src/app/(gym)/gym/settings/settings-client.tsx',s=>{
  s='import { GymPrivacyRequests } from "@/components/privacy/gym-privacy-requests";\n'+s;
  return rep(s,'{/* Tabela de Solicitações DSR Recentes */}','<GymPrivacyRequests workspaceId={workspace.id} />\n\n          {/* Tabela de Solicitações DSR Recentes */}');
});
edit('src/app/(gym)/gym/settings/page.tsx',s=>rep(s,'where: { workspaceId: context.workspaceId },\n    take: 10,','where: { workspaceId: context.workspaceId, OR: [{ metadata: { equals: Prisma.DbNull } }, { NOT: { metadata: { path: ["purpose"], equals: "GYM_IDENTITY_LINK" } } }] },\n    take: 10,').replace('import { redirect }','import { Prisma } from "@prisma/client";\nimport { redirect }'));
edit('src/app/(gym)/gym/students/students-client.tsx',s=>{
  s=rep(s,'existingUserId: "",','existingUserId: "",\n    identityLinkProofId: "",');
  const reset=s.indexOf('const resetRegisterForm');s=s.slice(0,reset)+s.slice(reset).replace('existingUserId: "",','existingUserId: "",\n      identityLinkProofId: "",');
  s=rep(s,'  // Submit assisted registration',`  const [linkInvitation, setLinkInvitation] = useState<{ requestId: string; url: string; authorized: boolean } | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const issueLink = async () => {
    setLinkBusy(true);
    try {
      const res = await fetch("/api/gym/students/identity-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId, unitId: registerForm.unitId, targetUserId: registerForm.existingUserId, email: registerForm.email || undefined, cpf: registerForm.cpfCnpj || undefined }) });
      const body = await res.json(); if (!res.ok) throw new Error(body.error?.message || "Convite não emitido.");
      setLinkInvitation({ requestId: body.requestId, url: new URL(body.path, window.location.origin).href, authorized: false });
      setRegisterForm(prev => ({ ...prev, identityLinkProofId: "" }));
    } catch (e) { toast.error(message(e, "Falha ao emitir convite.")); } finally { setLinkBusy(false); }
  };
  const checkLink = async () => {
    if (!linkInvitation) return; setLinkBusy(true);
    try { const res = await fetch("/api/gym/students/identity-link?" + new URLSearchParams({ workspaceId, requestId: linkInvitation.requestId }), { cache: "no-store" }); const body = await res.json(); if (!res.ok) throw new Error(body.error?.message || "Convite indisponível."); setLinkInvitation(prev => prev ? { ...prev, authorized: body.authorized } : prev); setRegisterForm(prev => ({ ...prev, identityLinkProofId: body.authorized ? linkInvitation.requestId : "" })); toast.info(body.authorized ? "Titular autorizou o vínculo." : "Aguardando autorização do titular."); }
    catch (e) { toast.error(message(e, "Falha ao conferir autorização.")); } finally { setLinkBusy(false); }
  };
  // Submit assisted registration`);
  s=rep(s,'    setIsSubmittingRegister(true);','    if (registerForm.existingUserId && !registerForm.identityLinkProofId) { toast.error("O titular deve autorizar o vínculo antes do cadastro."); return; }\n    setIsSubmittingRegister(true);');
  s=rep(s,'    setDuplicateResult({ status: "IDLE" });','    setDuplicateResult({ status: "IDLE" });\n    setLinkInvitation(null);');
  s=rep(s,'      setDuplicateResult(data);','      setDuplicateResult(data);\n      setLinkInvitation(null);\n      setRegisterForm(prev => ({ ...prev, identityLinkProofId: "" }));');
  s=rep(s,'              {duplicateResult.status === "ALREADY_MEMBER" && (',`              {duplicateResult.status === "EXISTING_USER_CAN_LINK" && <div className="space-y-2 rounded-lg border p-3"><p className="text-sm">O titular precisa entrar na própria conta e autorizar. Para menor, use a conta de responsável legal já verificado.</p><Button type="button" variant="outline" disabled={linkBusy} onClick={() => void issueLink()}>Gerar convite de autorização</Button>{linkInvitation && <><Label htmlFor="student-link-invitation">Link para entregar ao titular por canal verificado</Label><Input id="student-link-invitation" value={linkInvitation.url} readOnly /><Button type="button" variant="outline" onClick={() => { void navigator.clipboard.writeText(linkInvitation.url).then(() => toast.success("Link copiado.")).catch(() => toast.error("Copie o link pelo campo.")); }}>Copiar link</Button><Button type="button" variant="outline" disabled={linkBusy} onClick={() => void checkLink()}>Conferir autorização</Button><p role="status" className="text-sm">{linkInvitation.authorized ? "Autorização confirmada para esta unidade." : "Aguardando confirmação."}</p></>}</div>}
              {duplicateResult.status === "ALREADY_MEMBER" && (`);
  // Labels are already imported by this screen only if its original form used them.
  if(!s.includes('import { Label }'))s='import { Label } from "@/components/ui/label";\n'+s;
  return s;
});
