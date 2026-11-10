"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel } from "@/components/ui/field";

export function ImportExerciseLink({ index, exerciseName, linkedName, linkedId, requested, searching, error, disabled, onRemove, onRequest }: {
  index: number; exerciseName: string; linkedName?: string | null; linkedId?: string | null; requested?: boolean;
  searching?: boolean; error?: string; disabled?: boolean; onRemove: () => void; onRequest: () => void;
}) {
  return <Field className="gap-1! mt-4">
    <FieldLabel className="text-xs! font-semibold">Vínculo do exercício:</FieldLabel>
    {linkedId ? <div className="flex min-w-0 items-center justify-between gap-2 rounded-xl border bg-muted/20 px-2 py-2">
      <span className="min-w-0 text-xs! wrap-break-word" aria-label={`Exercício vinculado ${index + 1}`}>{linkedName || exerciseName}</span>
      <Button type="button" variant="ghost" size="sm" className="cursor-pointer text-xs!" disabled={disabled} onClick={onRemove} aria-label={`Remover vínculo do exercício ${index + 1}`}>Remover</Button>
    </div> : requested ? <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-foreground">Será criado como personalizado neste treino.</p>
    </div> : <div className="flex flex-col gap-2">
      {searching && <p role="status" className="text-xs text-muted-foreground">Buscando exercício semelhante…</p>}
      {error && <p role="alert" className="text-xs text-muted-foreground">{error} Você pode solicitar o exercício e continuar.</p>}
      <Button type="button" variant="outline" size="sm" disabled={disabled || !exerciseName.trim()} onClick={onRequest} aria-label={`Solicitar exercício ${index + 1}`}>Solicitar exercício</Button>
      <p className="text-xs text-muted-foreground">Sem vínculo, este exercício permanece personalizado apenas neste treino.</p>
    </div>}
  </Field>;
}
