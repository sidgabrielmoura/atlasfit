"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Row = { id:string;activeVersion?:{id:string}|null };
/** Small server pages; preserve chosen options while the user searches another page. */
export function useGymCatalog<T extends Row>(workspaceId:string, kind:"students"|"plans", initial:T[], selectedIds:string[]) {
  const [rows,setRows]=useState(initial),[search,setSearch]=useState(""),[page,setPage]=useState(1);
  const [hasMore,setHasMore]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [revision,setRevision]=useState(0); const selection=useRef(selectedIds); selection.current=selectedIds;
  useEffect(()=>{
    const controller=new AbortController();setBusy(true);setError("");
    const timer=setTimeout(async()=>{
      try {
        const query=new URLSearchParams({workspaceId,search,page:String(page),limit:"20",status:"ACTIVE"});
        const response=await fetch(`/api/gym/${kind}?${query}`,{signal:controller.signal,cache:"no-store"});
        const data=await response.json();if(!response.ok)throw Error(data.error?.message || "Não foi possível consultar o catálogo.");
        if(!controller.signal.aborted){
          setRows(previous=>{
            const next=data[kind] as T[];
            const pinned=previous.filter(row=>selection.current.includes(row.activeVersion?.id || row.id) && !next.some(item=>item.id===row.id));
            return [...pinned,...next];
          });
          setHasMore(data.pagination.page<data.pagination.totalPages);
        }
      } catch(failure){if(!controller.signal.aborted)setError(failure instanceof Error?failure.message:"Consulta indisponível.");}
      finally{if(!controller.signal.aborted)setBusy(false);}
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[workspaceId,kind,page,search,revision]);
  return {rows,search,page,hasMore,busy,error,setSearch:(value:string)=>{setSearch(value);setPage(1);},previous:()=>setPage(value=>Math.max(1,value-1)),next:()=>setPage(value=>value+1),retry:()=>setRevision(value=>value+1)};
}
export function GymCatalogSearch({label,catalog}:{label:string;catalog:Omit<ReturnType<typeof useGymCatalog>,"rows">}) {
  return <div className="space-y-2">
    <Input type="search" aria-label={label} placeholder={label} value={catalog.search} maxLength={150} onChange={event=>catalog.setSearch(event.target.value)}/>
    <div className="flex flex-wrap items-center gap-2 text-xs"><Button type="button" size="sm" variant="outline" disabled={catalog.busy || catalog.page<=1} onClick={catalog.previous}>Anterior</Button><span role="status">{catalog.busy?"Consultando…":`Página ${catalog.page}`}</span><Button type="button" size="sm" variant="outline" disabled={catalog.busy || !catalog.hasMore} onClick={catalog.next}>Próxima</Button></div>
    {catalog.error && <p role="alert" className="text-sm">{catalog.error} <Button type="button" variant="outline" size="sm" onClick={catalog.retry}>Tentar novamente</Button></p>}
  </div>;
}
