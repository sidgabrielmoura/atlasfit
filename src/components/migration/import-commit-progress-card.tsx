"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ImportCommitState } from "@/providers/import-commit-provider";

export function ImportCommitProgressCard({ state, onDismiss }: { state: ImportCommitState; onDismiss: () => void }) {
  const running = state.phase === "running";
  const percentage = state.total ? Math.round(state.processed * 100 / state.total) : 0;
  const title = running ? "Criação de alunos em andamento" : state.phase === "error" || state.result?.interrupted ? "Confira os cadastros restantes" : state.failed ? "Criação finalizada com pendências" : "Criação de alunos concluída";
  return <aside aria-label="Progresso da criação de alunos" className="fixed right-4 bottom-24 z-50 w-[calc(100vw-2rem)] max-w-sm sm:right-6 sm:bottom-6">
    <Card size="sm" className="shadow-lg">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription role="status" aria-live="polite">{running && !state.total ? "Preparando os cadastros…" : `${state.succeeded} concluído(s)${state.failed ? ` · ${state.failed} com erro` : ""}`}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Progress value={percentage} aria-label="Alunos processados" />
        <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{state.processed} de {state.total}</span><span className="tabular-nums">{percentage}%</span></div>
        {state.message && <p className="text-xs text-muted-foreground">{state.message}</p>}
      </CardContent>
      {!running && <CardFooter className="justify-between gap-2">
        <Button variant="outline" size="sm" asChild><Link href={state.reviewRoute}>{state.failed || state.result?.interrupted || state.phase === "error" ? "Revisar pendências" : "Ver importação"}</Link></Button>
        <Button variant="ghost" size="sm" onClick={onDismiss}>Fechar</Button>
      </CardFooter>}
    </Card>
  </aside>;
}
