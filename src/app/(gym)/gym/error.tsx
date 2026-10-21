"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GymError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Gym section error boundary triggered:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center p-4">
      <Card className="min-w-0 max-w-md w-full border-border/50 text-center">
        <CardHeader className="min-w-0 p-6 space-y-2">
          <div className="mx-auto flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <CardTitle className="text-base font-bold tracking-tight text-foreground">
            Erro ao carregar a seção da academia
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Ocorreu uma falha inesperada ao sincronizar os dados da sua unidade. Tente novamente ou retorne à página inicial.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4">
          {error.digest && (
            <p className="text-[10px] font-mono text-muted-foreground bg-muted/30 p-2 rounded-md truncate">
              Código: {error.digest}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button
              onClick={() => reset()}
              size="sm"
              className="cursor-pointer gap-1.5 text-xs font-medium"
            >
              <RefreshCcw className="size-3.5" />
              Tentar novamente
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="cursor-pointer gap-1.5 text-xs font-medium"
            >
              <Link href="/gym/dashboard">
                <Home className="size-3.5" />
                Painel Principal
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
