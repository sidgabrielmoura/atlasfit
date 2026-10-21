"use client";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { gymAdvancedEditSchema, type GymAdvancedEdit } from "@/modules/workspaces/domain/gym-workout-advanced";
import { gymWorkoutCardSchema, gymWorkoutResponseError, type GymWorkoutCard } from "@/modules/workspaces/domain/gym-workout-client";
const readSchema = z.object({ data: z.object({ revision: z.string(), exercises: z.array(z.object({ id: z.string(), sets: z.number(), reps: z.string(), rest: z.string(), load: z.string().nullable(), description: z.string().nullable(), order: z.number(), methodType: z.enum(["NONE", "DROPSET", "REST_PAUSE"]), methodConfig: z.record(z.string(), z.unknown()).nullable(), groupId: z.string().nullable(), allowRepsModification: z.boolean().nullable() })), groups: z.array(z.object({ id: z.string(), type: z.enum(["BISET", "TRISET", "CIRCUIT"]), config: z.record(z.string(), z.unknown()).nullable() })) }) });
function Choice({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <label className="block text-sm">{label}<select aria-label={label} value={value} onChange={event => onChange(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3">{options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select></label>;
}
function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="block text-sm">{label}<Input aria-label={label} type="number" required min={min} max={max} value={value} onChange={event => onChange(Number(event.target.value))} /></label>;
}
export function AdvancedTemplateEditor({ workspaceId, template, onClose, onSaved }: { workspaceId: string; template: GymWorkoutCard; onClose: () => void; onSaved: (workout: GymWorkoutCard) => void }) {
  const [form, setForm] = useState<GymAdvancedEdit | null>(null), [error, setError] = useState(""), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false), [reload, setReload] = useState(0);
  const lease = useRef(0), pending = useRef(false);
  const endpoint = `/api/gym/workouts/templates/${encodeURIComponent(template.id)}/advanced`;
  useEffect(() => {
    const current = ++lease.current, controller = new AbortController(); setLoading(true); setForm(null); setError("");
    async function load() {
      try {
        const response = await fetch(`${endpoint}?${new URLSearchParams({ workspaceId })}`, { cache: "no-store", signal: controller.signal }); const body: unknown = await response.json();
        if (!response.ok) throw new Error(gymWorkoutResponseError(body, "Falha ao carregar o modelo."));
        const { data } = readSchema.parse(body);
        const value = z.object(gymAdvancedEditSchema.shape).parse({ workspaceId, revision: data.revision,
          groups: data.groups.map(group => ({ ...group, config: group.config === null ? null : { ...(typeof group.config.rounds === "number" ? { rounds: group.config.rounds } : {}), ...(typeof group.config.restBetweenRounds === "number" ? { restBetweenRounds: group.config.restBetweenRounds } : {}) } })),
          exercises: data.exercises.map(({ methodType, methodConfig, ...row }) => ({ ...row, method: { type: methodType, config: methodType === "DROPSET" ? { drops: methodConfig?.drops ?? 2, reduction: methodConfig?.reduction ?? 20 } : methodType === "REST_PAUSE" ? { pause: methodConfig?.pause ?? 15, rounds: methodConfig?.rounds ?? 2 } : null } })) });
        if (lease.current === current) setForm(value);
      } catch (cause) { if (lease.current === current && !controller.signal.aborted) setError(cause instanceof z.ZodError ? "Configuração incompatível. Confira a integridade dos métodos e grupos." : cause instanceof Error ? cause.message : "Falha ao carregar o modelo."); }
      finally { if (lease.current === current) setLoading(false); }
    }
    void load(); return () => { controller.abort(); ++lease.current; };
  }, [workspaceId, endpoint, reload]);
  function updateRow(index: number, patch: Partial<GymAdvancedEdit["exercises"][number]>) { setForm(current => current && ({ ...current, exercises: current.exercises.map((row, position) => position === index ? { ...row, ...patch } : row) })); }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!form || pending.current) return;
    const parsed = gymAdvancedEditSchema.safeParse(form); if (!parsed.success) { setError(parsed.error.issues[0]?.message || "Confira os campos."); return; }
    pending.current = true; setSaving(true); setError(""); const current = lease.current;
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parsed.data) }); const body: unknown = await response.json();
      if (!response.ok) throw new Error(gymWorkoutResponseError(body, "Falha ao salvar métodos e grupos."));
      const { workout } = z.object({ success: z.literal(true), workout: gymWorkoutCardSchema }).parse(body);
      if (lease.current === current) { onSaved(workout); onClose(); }
    } catch (cause) { if (lease.current === current) setError(cause instanceof z.ZodError ? "Resposta inválida. Reabra o editor para conferir o modelo." : cause instanceof Error ? cause.message : "Falha ao salvar. Reabra o editor para conferir o resultado."); }
    finally { pending.current = false; if (lease.current === current) setSaving(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}><DialogContent className="sm:max-w-3xl sm:max-h-[90dvh] sm:overflow-auto"><form onSubmit={save} className="space-y-4">
    <DialogHeader><DialogTitle>Métodos e grupos de {template.name}</DialogTitle><DialogDescription>Edite a prescrição do modelo. As fichas já prescritas aos alunos permanecem preservadas. Para adicionar ou remover exercícios, retire seus métodos e grupos, use a preferência da ficha para o ajuste de repetições e abra Editar.</DialogDescription></DialogHeader>
    {loading && <p role="status">Carregando modelo…</p>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <fieldset disabled={loading || saving} className="space-y-4">
      {form?.exercises.map((row, index) => <fieldset key={row.id} className="space-y-3 rounded-lg border p-3"><legend className="px-1 text-sm font-medium">{index + 1}. {template.exercises.find(ex => ex.id === row.id)?.exercise.name || "Exercício"}</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><NumberField label={`Séries avançadas ${index + 1}`} value={row.sets} min={1} max={100} onChange={sets => updateRow(index, { sets })} />
          {([['reps', 'Repetições', 100], ['rest', 'Descanso', 80], ['load', 'Carga', 100], ['description', 'Observação', 2000]] as const).map(([key, label, max]) => <label key={key} className="block text-sm">{label}<Input aria-label={`${label} avançada ${index + 1}`} required={key === 'reps' || key === 'rest'} maxLength={max} value={row[key] || ""} onChange={event => updateRow(index, { [key]: event.target.value })} /></label>)}</div>
        <div className="grid gap-3 sm:grid-cols-3"><Choice label={`Método do exercício ${index + 1}`} value={row.method.type} options={[["NONE", "Tradicional"], ["DROPSET", "Dropset"], ["REST_PAUSE", "Rest-pause"]]} onChange={value => updateRow(index, { method: value === "DROPSET" ? { type: "DROPSET", config: { drops: 2, reduction: 20 } } : value === "REST_PAUSE" ? { type: "REST_PAUSE", config: { pause: 15, rounds: 2 } } : { type: "NONE", config: null } })} />
          <Choice label={`Grupo do exercício ${index + 1}`} value={row.groupId || ""} options={[["", "Sem grupo"], ...form.groups.map((group, position): [string, string] => [group.id, `${position + 1}. ${group.type}`])]} onChange={value => updateRow(index, { groupId: value || null })} />
          <Choice label={`Ajuste de repetições ${index + 1}`} value={row.allowRepsModification === null ? "INHERIT" : String(row.allowRepsModification)} options={[["INHERIT", "Preferência da ficha"], ["true", "Permitir"], ["false", "Impedir"]]} onChange={value => updateRow(index, { allowRepsModification: value === "INHERIT" ? null : value === "true" })} /></div>
        {row.method.type === "DROPSET" && <div className="grid grid-cols-2 gap-3"><NumberField label={`Reduções do dropset ${index + 1}`} value={row.method.config.drops} min={1} max={20} onChange={drops => { if (row.method.type === "DROPSET") updateRow(index, { method: { ...row.method, config: { ...row.method.config, drops } } }); }} /><NumberField label={`Percentual do dropset ${index + 1}`} value={row.method.config.reduction} min={1} max={100} onChange={reduction => { if (row.method.type === "DROPSET") updateRow(index, { method: { ...row.method, config: { ...row.method.config, reduction } } }); }} /></div>}
        {row.method.type === "REST_PAUSE" && <div className="grid grid-cols-2 gap-3"><NumberField label={`Pausa do rest-pause ${index + 1}`} value={row.method.config.pause} min={1} max={600} onChange={pause => { if (row.method.type === "REST_PAUSE") updateRow(index, { method: { ...row.method, config: { ...row.method.config, pause } } }); }} /><NumberField label={`Rodadas do rest-pause ${index + 1}`} value={row.method.config.rounds} min={1} max={20} onChange={rounds => { if (row.method.type === "REST_PAUSE") updateRow(index, { method: { ...row.method, config: { ...row.method.config, rounds } } }); }} /></div>}
      </fieldset>)}
      {form && <fieldset className="space-y-3"><legend className="font-medium">Grupos</legend><p className="text-sm text-muted-foreground">Biset e circuito precisam de pelo menos dois exercícios; triset precisa de três.</p>{form.groups.map((group, index) => <div key={group.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-4">
        <Choice label={`Tipo do grupo ${index + 1}`} value={group.type} options={[["BISET", "Biset"], ["TRISET", "Triset"], ["CIRCUIT", "Circuito"]]} onChange={value => setForm({ ...form, groups: form.groups.map(old => old.id === group.id ? { ...old, type: value as typeof group.type } : old) })} />
        {([['rounds', 'Rodadas', 1, 100], ['restBetweenRounds', 'Descanso', 0, 3600]] as const).map(([key, label, min, max]) => <label key={key} className="block text-sm">{label}<Input aria-label={`${label} do grupo ${index + 1}`} type="number" min={min} max={max} value={group.config?.[key] ?? ""} onChange={event => setForm({ ...form, groups: form.groups.map(old => old.id === group.id ? { ...old, config: { ...old.config, [key]: event.target.value ? Number(event.target.value) : undefined } } : old) })} /></label>)}
        <Button type="button" variant="outline" onClick={() => setForm({ ...form, groups: form.groups.filter(old => old.id !== group.id), exercises: form.exercises.map(ex => ex.groupId === group.id ? { ...ex, groupId: null } : ex) })}>Remover grupo {index + 1}</Button></div>)}<Button type="button" variant="outline" disabled={form.groups.length >= 50} onClick={() => setForm({ ...form, groups: [...form.groups, { id: `new:${crypto.randomUUID()}`, type: "BISET", config: null }] })}>Adicionar grupo</Button></fieldset>}
    </fieldset><DialogFooter><Button type="button" variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button type="button" variant="outline" disabled={saving || loading} onClick={() => setReload(value => value + 1)}>Recarregar modelo</Button><Button type="submit" disabled={!form || loading || saving}>{saving ? "Salvando…" : "Salvar métodos e grupos"}</Button></DialogFooter>
  </form></DialogContent></Dialog>;
}
