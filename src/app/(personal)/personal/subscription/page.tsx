"use client";

import { motion } from "framer-motion";
import { currentSubscription, platformPlans } from "@/lib/mock-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Zap, CreditCard, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SubscriptionPage() {
  const usagePercentage = Math.round((currentSubscription.usage.students.current / currentSubscription.usage.students.limit) * 100);
  const isNearLimit = usagePercentage >= 80;

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 pt-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assinatura</h2>
          <p className="text-muted-foreground mt-1">Gerencie seu plano, limites de uso e cobranças.</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col space-y-10"
      >
        <section>
          <Card className="border-primary/20 shadow-md bg-card overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    Plano Atual: <span className="text-primary">PRO</span>
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 ml-2">Ativo</Badge>
                  </CardTitle>
                  <CardDescription className="mt-2 text-base">
                    Sua próxima cobrança será em <strong>{currentSubscription.nextBillingDate.split('-').reverse().join('/')}</strong>.
                  </CardDescription>
                </div>
                <div className="hidden md:flex p-3 bg-secondary/50 rounded-full">
                  <CreditCard className="size-6 text-primary" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8 p-4 bg-secondary/20 rounded-xl border border-border/50">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Alunos Ativos</span>
                    <span className="text-sm font-bold">
                      {currentSubscription.usage.students.current} <span className="text-muted-foreground font-normal">/ {currentSubscription.usage.students.limit}</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-500", isNearLimit ? "bg-red-500" : "bg-primary")}
                      style={{ width: `${usagePercentage}%` }}
                    />
                  </div>
                  {isNearLimit && (
                    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                      <AlertCircle className="size-3" /> Você está próximo do limite do seu plano.
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Armazenamento (Arquivos/Vídeos)</span>
                    <span className="text-sm font-bold">
                      {currentSubscription.usage.storage.current} <span className="text-muted-foreground font-normal">/ {currentSubscription.usage.storage.limit} {currentSubscription.usage.storage.unit}</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${(currentSubscription.usage.storage.current / currentSubscription.usage.storage.limit) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="text-center space-y-2 pt-8">
            <h3 className="text-2xl font-bold tracking-tight">Faça um Upgrade e Cresça</h3>
            <p className="text-muted-foreground">Escolha o plano ideal para escalar sua consultoria online.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start pt-8 pb-12">
            {platformPlans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "relative flex flex-col h-full transition-all duration-300 overflow-visible",
                  plan.highlight
                    ? "border-primary shadow-lg shadow-primary/10 scale-100 md:scale-105 z-10"
                    : "border-border/50 bg-card/50 hover:bg-card"
                )}
              >
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                    <Badge className="bg-primary text-primary-foreground font-bold px-4 py-1.5 shadow-md">
                      Recomendado
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-xl mb-2">{plan.name}</CardTitle>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-4xl font-extrabold tracking-tight">{plan.price}</span>
                    <span className="text-muted-foreground font-medium">{plan.interval}</span>
                  </div>
                  <CardDescription className="mt-4 text-sm h-10 flex items-center justify-center">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-4">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="size-5 text-primary shrink-0" />
                        <span className="text-sm font-medium text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-6">
                  <Button
                    className={cn("w-full", plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : " cursor-pointer")}
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={plan.disabled && !plan.highlight}
                  >
                    {plan.highlight ? <Zap className="mr-2 size-4" /> : null}
                    {plan.buttonText}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
