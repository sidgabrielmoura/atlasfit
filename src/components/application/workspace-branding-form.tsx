"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { workspaceActions, workspaceStore } from "@/stores/workspace.store";
import { normalizeWorkspaceColor, workspaceBrandingSchema, type WorkspaceBrandingInput } from "@/modules/workspaces/domain/branding";

export interface WorkspaceBrandingData {
  id: string; name: string; slug: string; slogan: string | null; primaryColor: string | null;
  logoUrl: string | null; logoKey: string | null; watermarkUrl: string | null; watermarkKey: string | null;
  workoutCoverUrl: string | null; workoutCoverKey: string | null;
}
function draftOf(workspace: WorkspaceBrandingData): WorkspaceBrandingInput {
  const { id, ...branding } = workspace;
  return { ...branding, primaryColor: normalizeWorkspaceColor(branding.primaryColor) };
}
const assets = [
  { field: "logoUrl", key: "logoKey", target: "logo", label: "Logo" },
  { field: "watermarkUrl", key: "watermarkKey", target: "watermark", label: "Marca d’água" },
  { field: "workoutCoverUrl", key: "workoutCoverKey", target: "workout_cover", label: "Capa dos treinos" },
] as const;

export function WorkspaceBrandingForm({ workspace }: { workspace: WorkspaceBrandingData }) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => draftOf(workspace));
  const [applied, setApplied] = useState(() => draftOf(workspace));
  const [files, setFiles] = useState<Partial<Record<(typeof assets)[number]["field"], File>>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { const next = draftOf(workspace); setDraft(next); setApplied(next); setFiles({}); setError(null); }, [workspace]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(applied) || Object.keys(files).length > 0;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const parsed = workspaceBrandingSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Confira os campos."); return; }
    setSaving(true); setError(null);
    try {
      const branding = { ...parsed.data };
      for (const asset of assets) {
        const file = files[asset.field];
        if (!file) continue;
        const response = await fetch("/api/storage/presigned", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspace.id, fileName: file.name, contentType: file.type, fileSize: file.size, targetType: asset.target }) });
        if (!response.ok) throw new Error("Não foi possível preparar o upload da imagem.");
        const upload = await response.json();
        const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
        if (!put.ok) throw new Error("O envio da imagem falhou. Tente novamente.");
        branding[asset.field] = upload.fileUrl;
        branding[asset.key] = upload.objectKey;
      }
      const response = await fetch("/api/gym/settings/branding", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspaceId: workspace.id, branding }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Não foi possível salvar a marca.");
      setDraft(branding); setApplied(branding); setFiles({});
      if (workspaceStore.activeWorkspace?.id === workspace.id) workspaceActions.setActiveWorkspace({ ...workspaceStore.activeWorkspace, ...result.data });
      toast.success("Marca salva."); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível salvar."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="flex flex-col gap-4">
    <Card><CardHeader><CardTitle>Identificação e marca</CardTitle></CardHeader><CardContent>
      <FieldGroup className="grid gap-4 md:grid-cols-2">
        <Field><FieldLabel htmlFor="gym-brand-name">Nome da academia</FieldLabel><Input id="gym-brand-name" required maxLength={100} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} disabled={saving} /></Field>
        <Field><FieldLabel htmlFor="gym-brand-slug">Endereço público</FieldLabel><Input id="gym-brand-slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value })} disabled={saving} /></Field>
        <Field><FieldLabel htmlFor="gym-brand-slogan">Slogan</FieldLabel><Input id="gym-brand-slogan" maxLength={160} value={draft.slogan || ""} onChange={event => setDraft({ ...draft, slogan: event.target.value })} disabled={saving} /></Field>
        <Field><FieldLabel htmlFor="gym-brand-color">Cor principal</FieldLabel><div className="flex gap-2"><Input aria-label="Escolher cor principal" type="color" className="w-14 p-1" value={normalizeWorkspaceColor(draft.primaryColor)} onChange={event => setDraft({ ...draft, primaryColor: event.target.value })} disabled={saving} /><Input id="gym-brand-color" pattern="#[0-9a-fA-F]{6}" maxLength={7} value={draft.primaryColor} onChange={event => setDraft({ ...draft, primaryColor: event.target.value })} disabled={saving} /></div></Field>
      </FieldGroup>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Imagens</CardTitle></CardHeader><CardContent><FieldGroup className="grid gap-4 md:grid-cols-3">
      {assets.map(asset => <Field key={asset.field}><FieldLabel htmlFor={`gym-brand-${asset.field}`}>{asset.label}</FieldLabel><Input id={`gym-brand-${asset.field}`} inputMode="url" placeholder="https://…" value={draft[asset.field] || ""} onChange={event => setDraft({ ...draft, [asset.field]: event.target.value, [asset.key]: null })} disabled={saving} /><Input aria-label={`Enviar ${asset.label}`} type="file" accept="image/png,image/jpeg,image/webp" disabled={saving} onChange={event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) { setError("Use PNG, JPEG ou WebP de até 10 MB."); event.target.value = ""; return; }
        setFiles({ ...files, [asset.field]: file });
      }} /><Button type="button" variant="ghost" size="sm" disabled={saving} onClick={() => { setDraft({ ...draft, [asset.field]: null, [asset.key]: null }); const next = { ...files }; delete next[asset.field]; setFiles(next); }}>Remover imagem</Button></Field>)}
    </FieldGroup></CardContent></Card>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap items-center justify-end gap-3"><span aria-live="polite" className="text-sm text-muted-foreground">{dirty ? "Alterações pendentes" : "Valores aplicados"}</span><Button type="button" variant="outline" disabled={!dirty || saving} onClick={() => { setDraft(applied); setFiles({}); setError(null); }}>Descartar</Button><Button type="submit" disabled={!dirty || saving}>{saving && <Spinner data-icon="inline-start" />}Salvar marca</Button></div>
  </form>;
}
