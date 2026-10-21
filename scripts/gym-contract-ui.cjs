const fs = require('node:fs');
function update(file, transform) { const original = fs.readFileSync(file, 'utf8'); const result = transform(original); if (result === original) throw new Error(`Nenhuma alteração em ${file}`); fs.writeFileSync(file, result); }
update('src/app/(gym)/gym/enrollments/enrollments-client.tsx', s => {
 s = s.replace('import { useState, useRef } from "react"', 'import { useState, useRef } from "react"\nimport Link from "next/link"');
 s = s.replace('  // Form - Cancel', '  const [pauseBillingPolicy, setPauseBillingPolicy] = useState<"SKIP" | "SHIFT">("SKIP")\n  const [withdrawTarget, setWithdrawTarget] = useState<any | null>(null)\n  const [withdrawReason, setWithdrawReason] = useState("")\n\n  // Form - Cancel');
 s = s.replace('extendEndDate: pauseExtendEndDate,', 'extendEndDate: pauseExtendEndDate,\n          billingResumePolicy: pauseBillingPolicy,');
 const a = s.indexOf('  // Reconcile Subscription (GYM-042)'), b = s.indexOf('\n  }', a) + 4;
 if (a < 0 || b < a) throw new Error('Handler de reconciliação não encontrado');
 s = s.slice(0, a) + `  const handleWithdrawCancellation = async () => {
    if (!withdrawTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/gym/enrollments/' + withdrawTarget.id + '/cancel/withdraw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, reason: withdrawReason }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error?.message || 'Não foi possível retirar o cancelamento.');
      toast.success('Cancelamento retirado. A renovação automática permanece desativada.'); setWithdrawTarget(null); loadEnrollments(selectedStatusTab, searchQuery);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Falha ao retirar cancelamento.'); }
    finally { setIsSubmitting(false); }
  }` + s.slice(b);
 s = s.replace('Matrícula cancelada imediatamente. Acesso físico revogado.', 'Matrícula cancelada. Acesso pela matrícula encerrado; obrigações anteriores preservadas.');
 s = s.replace('Cancelamento agendado para o fim do ciclo. Acesso mantido até a data paga.', 'Cancelamento agendado para o fim da vigência. O estado atual permanece até essa data.');
 s = s.replace('{enr.providerSubscriptionId && <DropdownMenuItem onClick={() => handleReconcileSubscription(enr.id)}><RefreshCw className="size-4" />Reconciliar assinatura</DropdownMenuItem>}', '{(enr.providerSubscriptionId || enr.recurrenceMode === "PROVIDER" || enr.scheduledPlanVersionId || creditBalance !== 0) && <DropdownMenuItem asChild><Link href="/gym/reconciliation"><RefreshCw className="size-4" />Revisar legado e saldos</Link></DropdownMenuItem>}{enr.cancellationEffectiveDate && ["ACTIVE", "PAUSED"].includes(enr.status) && <DropdownMenuItem onClick={() => { setWithdrawTarget(enr); setWithdrawReason(""); }}><RefreshCw className="size-4" />Retirar cancelamento futuro</DropdownMenuItem>}');
 s = s.replace('setPauseExtendEndDate(true) }}', 'setPauseExtendEndDate(true); setPauseBillingPolicy("SKIP") }}');
 s = s.replace('setCancelImmediate("cycle_end") }}', 'setCancelImmediate(["ACTIVE", "PAUSED"].includes(enr.status) && enr.endDate && new Date(enr.endDate) > new Date() ? "cycle_end" : "immediate") }}');
 s = s.replace('Os próximos ciclos usam o preço do novo plano. Nenhum crédito é criado automaticamente.', 'Os próximos ciclos usam o preço do novo plano. Nenhum crédito é criado automaticamente. Depois da data de início, conclua a ativação desta revisão para substituir o contrato anterior.');
 const marker = '                  id="pauseExtendEndDate"'; const m = s.indexOf(marker), block = s.lastIndexOf('              <div', m);
 if (m < 0 || block < 0) throw new Error('Campo de pausa não encontrado');
 s = s.slice(0, block) + `              <div className="space-y-2"><Label htmlFor="gym-pause-billing-policy">Cobrança após a pausa</Label><select id="gym-pause-billing-policy" className="w-full rounded-md border bg-background p-2 text-sm" value={pauseBillingPolicy} onChange={e => setPauseBillingPolicy(e.target.value as "SKIP" | "SHIFT")}><option value="SKIP">Pular vencimentos suspensos, sem retroativo</option><option value="SHIFT">Adiar calendário pelo tempo efetivo da pausa</option></select><p className="text-xs text-muted-foreground">A geração fica suspensa durante a pausa. Faturas já emitidas permanecem registradas.</p></div>\n` + s.slice(block);
 const end = s.lastIndexOf('\n    </');
 s = s.slice(0, end) + `
      <Dialog open={Boolean(withdrawTarget)} onOpenChange={open => { if (!open && !isSubmitting) setWithdrawTarget(null); }}><DialogContent><DialogHeader><DialogTitle>Retirar cancelamento futuro</DialogTitle><DialogDescription>A matrícula mantém o estado atual. Esta decisão não ativa contratos nem reinicia uma recorrência interrompida.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="withdraw-reason">Justificativa</Label><Input id="withdraw-reason" minLength={5} maxLength={2000} value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} /></div><DialogFooter><Button variant="outline" disabled={isSubmitting} onClick={() => setWithdrawTarget(null)}>Voltar</Button><Button disabled={isSubmitting || withdrawReason.trim().length < 5} onClick={handleWithdrawCancellation}>Retirar cancelamento</Button></DialogFooter></DialogContent></Dialog>
` + s.slice(end);
 return s;
});
update('src/components/application/gym-sidebar.tsx', s => s.replace('  { title: "Importação Assistida"', '  { title: "Revisão de contratos e saldos", href: "/gym/reconciliation", icon: FileText, requiresManagement: true },\n  { title: "Importação Assistida"'));
