"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

type Preview={canPurge:boolean;closedAt:string|null;purgeAfter:string|null;job:null|{status:string;lastErrorCode:string|null;nextAttemptAt:string}};
const errors:Record<string,string>={STORAGE_NOT_CONFIGURED:"Armazenamento não configurado. A purga aguarda nova tentativa.",UPLOAD_EXPIRY_PENDING:"Aguardando expiração dos uploads já autorizados.",STORAGE_BATCH_PENDING:"Remoção dos arquivos em andamento.",LEGACY_SCAN_PENDING:"Conferência das filas históricas em andamento.",PURGE_RETRY_REQUIRED:"Falha na remoção. A purga será repetida automaticamente."};
const statusLabels:Record<string,string>={QUEUED:"Aguardando processamento",PROCESSING:"Em processamento",RETRY:"Aguardando nova tentativa"};
export function GymPurgeForm({workspaceId,slug}:{workspaceId:string;slug:string}) {
  const [preview,setPreview]=useState<Preview|null>(null),[error,setError]=useState(""),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[confirmation,setConfirmation]=useState(""),[receipt,setReceipt]=useState("");
  const submitted=useRef<{requestKey:string;confirmationSlug:string}|null>(null);
  const endpoint=`/api/superadmin/workspaces/${encodeURIComponent(workspaceId)}/purge`;
  async function refresh(){try{const r=await fetch(endpoint,{cache:"no-store"});const json=await r.json();if(!r.ok)throw Error(json.error?.message||"Falha ao conferir a política de purga.");setPreview(json.data);}catch(e){setError(e instanceof Error?e.message:"Conferência indisponível.");}}
  useEffect(()=>{void refresh();},[workspaceId]);
  async function purge(){
    if(busy)return;setBusy(true);setError("");
    const body=submitted.current??{requestKey:crypto.randomUUID(),confirmationSlug:confirmation.trim()};submitted.current=body;
    try {
      const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const json=await response.json();
      if(!response.ok){if(response.status<500)submitted.current=null;throw Error(json.error?.message||"Não foi possível confirmar a purga.");}
      if(json.data.status==="COMPLETED"){setReceipt(json.data.receipt.requestKey);setOpen(false);}
      else{setOpen(false);await refresh();setError(errors[json.data.code]||"Purga solicitada. Acompanhe o processamento; os dados ainda não foram totalmente eliminados.");}
    }catch(e){setError(e instanceof Error?e.message:"Resposta indisponível. Confira a mesma solicitação.");}finally{setBusy(false);}
  }
  return <Card className="min-w-0 border-destructive/30"><CardHeader><CardTitle className="text-sm">Purga dos dados da academia</CardTitle><CardDescription>Elimina definitivamente os dados e arquivos da academia. A política automática conclui a purga em até um mês após o encerramento. Contas compartilhadas ou utilizadas em outros serviços da plataforma são preservadas.</CardDescription></CardHeader>
    <CardContent className="space-y-3 text-sm">
      {receipt?<div role="status"><p>Purga concluída. Recibo técnico: <span className="break-all">{receipt}</span>.</p><a className="underline" href="/superadmin/workspaces">Voltar aos workspaces</a></div>:<>
        {preview?.purgeAfter&&<p>Prazo máximo: {new Date(preview.purgeAfter).toLocaleString("pt-BR")}. {preview.job&&<>Estado: {statusLabels[preview.job.status]||"Conferência necessária"}.</>}</p>}
        {preview&&!preview.canPurge&&<p>Disponível após o encerramento definitivo pelo titular.</p>}
        {preview?.job?.lastErrorCode&&<p role="status">{errors[preview.job.lastErrorCode]||"A purga exige conferência e nova tentativa."}</p>}
        <div className="flex flex-wrap gap-2"><Button variant="destructive" disabled={!preview?.canPurge||busy} onClick={()=>setOpen(true)}>Purgar todos os dados agora</Button><Button variant="outline" disabled={busy} onClick={()=>submitted.current?void purge():void refresh()}>{submitted.current?"Conferir mesma solicitação":"Atualizar estado"}</Button></div>
      </>}
      {error&&<p role="alert" className="text-destructive">{error}</p>}
      <AlertDialog open={open} onOpenChange={value=>{if(!busy)setOpen(value);}}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Purgar a academia definitivamente?</AlertDialogTitle><AlertDialogDescription>Contratos, cobranças, saúde, arquivos, mensagens e histórico desta academia serão eliminados. Esta ação é irreversível. Contas usadas em outros workspaces ou serviços continuam existindo.</AlertDialogDescription></AlertDialogHeader>
        <label htmlFor="gym-purge-slug" className="break-all text-sm">Digite {slug} para confirmar</label><Input id="gym-purge-slug" value={confirmation} disabled={busy||Boolean(submitted.current)} onChange={e=>setConfirmation(e.target.value)}/>
        <AlertDialogFooter><AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel><Button variant="destructive" disabled={busy||confirmation.trim()!==slug} onClick={purge}>{busy?"Processando…":"Confirmar purga definitiva"}</Button></AlertDialogFooter>
      </AlertDialogContent></AlertDialog>
    </CardContent></Card>;
}
