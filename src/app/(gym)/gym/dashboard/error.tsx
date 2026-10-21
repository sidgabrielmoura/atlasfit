"use client";

import { useTransition } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function GymDashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col items-start gap-4">
      <h1 className="text-2xl font-black tracking-tight md:text-3xl">Visão geral</h1>
      <Alert variant="destructive">
        <AlertTitle>Não foi possível carregar a visão geral</AlertTitle>
        <AlertDescription>Tente novamente para consultar os indicadores e a rotina da academia.</AlertDescription>
      </Alert>
      <Button variant="outline" disabled={isPending} onClick={() => startTransition(reset)}>
        {isPending ? "Carregando..." : "Tentar novamente"}
      </Button>
    </div>
  );
}
