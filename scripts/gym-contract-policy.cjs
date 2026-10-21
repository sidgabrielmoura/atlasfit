const fs = require('node:fs');
function write(file, operation) { fs.writeFileSync(file, operation(fs.readFileSync(file, 'utf8'))); }
write('src/modules/workspaces/application/enrollment-service.ts', s => s.replace('billingResumePolicy?: "SKIP" | "SHIFT"', 'billingResumePolicy?: "SKIP"'));
write('src/modules/workspaces/application/enrollment-pause.ts', s => {
 s = s.replace('z.enum(["SKIP", "SHIFT"]).default("SKIP")', 'z.literal("SKIP").default("SKIP")');
 s = s.replace(/    if \(pause\.billingResumePolicy === "SHIFT"\) \{[\s\S]*?    \} else \{\r?\n/, '');
 s = s.replace('      nextDueDate = result.next; skipped = result.skipped;\n    }', '      nextDueDate = result.next; skipped = result.skipped;');
 return s;
});
write('src/app/(gym)/gym/enrollments/enrollments-client.tsx', s => s.replace('  const [pauseBillingPolicy, setPauseBillingPolicy] = useState<"SKIP" | "SHIFT">("SKIP")\n', '').replace('billingResumePolicy: pauseBillingPolicy,', 'billingResumePolicy: "SKIP",').replace('; setPauseBillingPolicy("SKIP")', '').replace(/              <div className="space-y-2"><Label htmlFor="gym-pause-billing-policy">[\s\S]*?<\/div>\r?\n/, '              <p className="text-xs text-muted-foreground">A geração fica suspensa durante a pausa. Na retomada, vencimentos suspensos serão pulados, sem cobrança retroativa. Faturas já emitidas permanecem registradas.</p>\n'));
write('src/modules/workspaces/application/privacy-service.ts', s => s.replace('paidAmountInCents: invoice.paidAmountInCents.toString(),', 'paidAmountInCents: invoice.paidAmountInCents.toString(), openingPaidAmountInCents: invoice.openingPaidAmountInCents.toString(),').replace('      evaluations, files,', '      administrativeReviews, evaluations, files,'));
write('tests/gym/contract-reconciliation.integration.ts', s => {
 s = s.replace('expect(current.nextDueDate).toEqual(new Date("2026-12-01T12:00:00Z")); // Anchor is contractual day 1; still inside interval: advances to January.', 'expect(current.nextDueDate).toEqual(new Date("2027-01-01T12:00:00Z"));\n    expect(await prisma.gymInvoice.count({ where: { enrollmentId: f.enrollment.id } })).toBe(1);\n    expect(await prisma.gymInvoice.findUnique({ where: { id: f.invoice.id } })).toMatchObject({ status: "OPEN", balanceRemainingInCents: BigInt(10000) });');
 const start = s.indexOf('  it("adiamento desloca'), end = s.indexOf('  it("dívida anterior', start);
 if (start < 0 || end < 0) throw new Error('Teste de política não encontrado');
 s = s.slice(0, start) + `  it("cancelar pausa futura preserva calendário e não concede tempo ou acesso adicional", async () => {
    const f = await fixture(), due = new Date(Date.now() + 10 * day);
    await prisma.gymEnrollment.update({ where: { id: f.enrollment.id }, data: { nextDueDate: due } });
    await pauseGymEnrollment({ ...f.command, startDate: new Date(Date.now() + day), endDate: new Date(Date.now() + 20 * day), reason: "Agenda sintética futura" });
    await Promise.all([resumeGymEnrollment(f.command), resumeGymEnrollment(f.command)]);
    expect(await prisma.gymEnrollment.findUnique({ where: { id: f.enrollment.id } })).toMatchObject({ nextDueDate: due, endDate: f.enrollment.endDate, status: "ACTIVE" });
  });
` + s.slice(end); return s;
});
