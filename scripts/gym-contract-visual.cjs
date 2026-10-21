const fs = require('node:fs');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const { expect: base } = require('../.tmp/gym-visual-runner/node_modules/playwright/test');
const expect = base.configure({ timeout: 120000 });
const origin = 'http://127.0.0.1:31173';
const fixture = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/contract-visual-fixture.json', 'utf8'));
const folder = '.tmp/gym-stabilization/contract-visual/run-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), scenarios: [], screenshots: [], viewportChecks: [], errors: [], apiFailures: [] };
const db = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
let browser, page;
async function shot(label) { const file = folder + '/' + label + '.png'; await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file); const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })); report.viewportChecks.push({ label, ...size }); assert(size.scrollWidth <= size.width + 1, 'Overflow: ' + label); }
async function context(user, viewport) {
 const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
 await ctx.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
 ctx.on('page', p => {
  p.setDefaultNavigationTimeout(120000); p.setDefaultTimeout(120000); p.on('pageerror', e => report.errors.push(e.message.slice(0, 500)));
  p.on('requestfailed', request => { const path = new URL(request.url()).pathname; if (path.startsWith('/api/gym/')) report.apiFailures.push({ path, failure: request.failure()?.errorText }); });
  p.on('response', response => { const path = new URL(response.url()).pathname; if (path.startsWith('/api/gym/') && response.status() >= 400) report.apiFailures.push({ path, status: response.status() }); });
 });
 const csrf = await (await ctx.request.get(origin + '/api/auth/csrf')).json();
 await ctx.request.post(origin + '/api/auth/callback/credentials', { form: { email: user.email, password: fixture.password, csrfToken: csrf.csrfToken, callbackUrl: origin + '/select-workspace', authenticationProof: fixture.proofs[user.id] }, headers: { 'X-Auth-Return-Redirect': '1' } });
 const session = await (await ctx.request.get(origin + '/api/auth/session')).json(); assert.equal(session?.user?.id, user.id, 'Sessão sintética inválida');
 await ctx.addCookies([{ name: 'atlasfit_active_workspace_id', value: fixture.workspaceId, url: origin }]); return ctx;
}
async function post(ctx, route, body) { const result = await ctx.request.post(origin + route, { data: body }); const data = await result.json(); assert([200, 201].includes(result.status()), data.error?.message); return data; }
async function submit(dialog, button, endpoint) {
 const response = page.waitForResponse(result => new URL(result.url()).pathname.startsWith('/api/gym/') && new URL(result.url()).pathname.endsWith(endpoint) && result.request().method() === 'POST');
 await dialog.getByRole('button', { name: button, exact: typeof button === 'string' }).click();
 const result = await response, data = await result.json();
 assert([200, 201].includes(result.status()), data.error?.message || `HTTP ${result.status()}: ${endpoint}`);
 await expect(dialog).toBeHidden();
}
function studentCard(status) { return page.locator('[data-slot="card"]').filter({ has: page.getByRole('heading', { name: fixture.adult.name, exact: true }) }).filter({ has: page.getByText(status, { exact: true }) }).first(); }
async function action(status, title) { await studentCard(status).getByRole('button', { name: 'Ações da matrícula de ' + fixture.adult.name }).click(); await page.getByRole('menuitem', { name: title, exact: true }).click(); }
async function confirmContract() {
 await page.getByRole('button', { name: 'Consultar contrato' }).last().click(); const dialog = page.getByRole('dialog');
 await expect(dialog.getByLabel('Li e aceito as condições exibidas.')).toBeVisible(); await dialog.getByLabel('Li e aceito as condições exibidas.').check();
 await shot('contrato-' + report.scenarios.length); await page.keyboard.press('Tab'); assert(await dialog.evaluate(d => d.contains(document.activeElement)));
 await submit(dialog, 'Confirmar contrato', '/accept');
}
async function run() {
 await db.connect(); browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); report.browser = browser.version();
 const operator = await context(fixture.owner, { width: 1440, height: 1000 });
 const adult = await context(fixture.adult, { width: 390, height: 844 });
 const parent = await context(fixture.parent, { width: 390, height: 844 });
 page = await parent.newPage(); await page.goto(origin + '/guardian/dependents'); await confirmContract();
 const minor = await db.query('SELECT status FROM "GymEnrollment" WHERE id=$1', [fixture.minorEnrollmentId]); assert.equal(minor.rows[0].status, 'PENDING_ACTIVATION');
 report.scenarios.push('Representante verificado lê e aceita contrato do menor no celular, com foco por teclado');
 page = await operator.newPage(); await page.goto(origin + '/gym/enrollments');
 await action('Ativa', 'Trocar plano'); let dialog = page.getByRole('dialog');
 await dialog.getByLabel('Novo plano', { exact: true }).click(); await page.getByRole('option').filter({ hasText: 'Plano novo visual' }).click();
 await dialog.getByLabel('Obrigação inicial aprovada (R$)').fill('50,00'); await dialog.getByLabel('Justificativa do ajuste').fill('Troca com ajuste aprovado para verificação visual'); await dialog.getByLabel('Aprovo o valor inicial e as consequências desta troca como gestor autorizado.').check();
 await shot('troca-plano-desktop'); await submit(dialog, 'Preparar novo contrato', '/change-plan');
 const revisions = await db.query('SELECT id FROM "GymEnrollment" WHERE "supersedesEnrollmentId"=$1 ORDER BY "createdAt" DESC', [fixture.originalEnrollmentId]); assert.equal(revisions.rowCount, 1); const revisionId = revisions.rows[0].id;
 page = await adult.newPage(); await page.goto(origin + '/student/contracts');
 const pending = page.locator('[data-slot="card"]').filter({ hasText: 'Plano novo visual' }); await pending.getByRole('button', { name: 'Consultar contrato' }).click();
 dialog = page.getByRole('dialog'); await expect(dialog.getByText(/Obrigação inicial aprovada \(centavos BRL\): 5000/)).toBeVisible(); await dialog.getByLabel('Li e aceito as condições exibidas.').check(); await shot('aceite-revisao-mobile'); await submit(dialog, 'Confirmar contrato', '/accept');
 const invoice = await db.query('SELECT id,"totalInCents"::text FROM "GymInvoice" WHERE "enrollmentId"=$1', [revisionId]); assert.equal(invoice.rowCount, 1, 'O aceite deve persistir uma obrigação inicial'); assert.equal(invoice.rows[0].totalInCents, '5000');
 await post(operator, '/api/gym/finance/payments', { workspaceId: fixture.workspaceId, financialAccountId: fixture.accountId, paymentMethod: 'BANK_TRANSFER_MANUAL', amountInCents: '5000', allocations: [{ invoiceId: invoice.rows[0].id, amountInCents: '5000' }], idempotencyKey: require('node:crypto').randomUUID() });
 page = operator.pages()[0]; await page.goto(origin + '/gym/enrollments'); await action('Aguardando pagamento', 'Ativar matrícula'); await submit(page.getByRole('dialog'), 'Confirmar Ativação', '/activate');
 const activated = await db.query('SELECT id,status FROM "GymEnrollment" WHERE id=ANY($1)', [[revisionId, fixture.originalEnrollmentId]]); assert.equal(activated.rows.find(r => r.id === revisionId).status, 'ACTIVE'); assert.equal(activated.rows.find(r => r.id === fixture.originalEnrollmentId).status, 'CANCELLED');
 report.scenarios.push('Troca pelo formulário, novo aceite próprio, recebimento HTTP real e ativação atômica pela interface');
 await action('Ativa', 'Renovar matrícula'); dialog = page.getByRole('alertdialog'); await submit(dialog, 'Confirmar Renovação', '/renew');
 const renewals = await db.query('SELECT id FROM "GymEnrollment" WHERE "supersedesEnrollmentId"=$1', [revisionId]); assert.equal(renewals.rowCount, 1); const renewalId = renewals.rows[0].id;
 const operatorPage = page; page = adult.pages()[0]; await page.goto(origin + '/student/contracts');
 const renewalCard = page.locator('[data-slot="card"]').filter({ hasText: 'Plano novo visual' }).filter({ hasText: 'Aguardando aceite' }); await renewalCard.getByRole('button', { name: 'Consultar contrato' }).click(); dialog = page.getByRole('dialog'); await dialog.getByLabel('Li e aceito as condições exibidas.').check(); await submit(dialog, 'Confirmar contrato', '/accept');
 assert.equal((await db.query('SELECT status FROM "GymEnrollment" WHERE id=$1', [renewalId])).rows[0].status, 'PENDING_ACTIVATION');
 report.scenarios.push('Renovação cria proposta própria, novo aceite e obrigação, preservando a vigência atual'); page = operatorPage; await page.goto(origin + '/gym/enrollments');
 await page.setViewportSize({ width: 390, height: 844 }); await action('Ativa', 'Pausar matrícula'); dialog = page.getByRole('dialog');
 const today = new Date().toISOString().slice(0, 10), future = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
 await dialog.getByLabel('Início *').fill(today); await dialog.getByLabel('Término *').fill(future); await dialog.getByLabel('Motivo *').fill('Pausa sintética no navegador'); await shot('pausa-mobile');
 await submit(dialog, /Confirmar Pausa|Confirmar Trancamento/, '/pause');
 await action('Pausada', 'Retomar matrícula'); await expect(studentCard('Ativa')).toBeVisible();
 await action('Ativa', 'Cancelar matrícula'); dialog = page.getByRole('alertdialog'); await dialog.getByLabel('Motivo do Cancelamento *').fill('Cancelamento futuro verificado no navegador'); await submit(dialog, 'Confirmar Cancelamento', '/cancel');
 await action('Ativa', 'Retirar cancelamento futuro'); dialog = page.getByRole('dialog'); await dialog.getByLabel('Justificativa').fill('Retirada solicitada na revisão visual'); await shot('retirada-cancelamento-mobile'); await submit(dialog, 'Retirar cancelamento', '/cancel/withdraw');
 report.scenarios.push('Pausa, retomada, cancelamento futuro e retirada real pelo celular');
 await action('Ativa', 'Cancelar matrícula'); dialog = page.getByRole('alertdialog'); await dialog.locator('#cancel_immediate').check(); await dialog.getByLabel('Motivo do Cancelamento *').fill('Encerramento imediato após revisão visual'); await submit(dialog, 'Confirmar Cancelamento', '/cancel');
 assert.equal((await db.query('SELECT status FROM "GymEnrollment" WHERE id=$1', [renewalId])).rows[0].status, 'CANCELLED');
 assert.equal((await db.query('SELECT count(*)::int AS n FROM "GymInvoice" WHERE "enrollmentId"=$1', [renewalId])).rows[0].n, 1);
 report.scenarios.push('Encerramento imediato cancela proposta dependente e preserva sua obrigação');
 await page.setViewportSize({ width: 1440, height: 1000 }); await page.goto(origin + '/gym/reconciliation'); await page.getByRole('button', { name: /^Revisar / }).first().click(); dialog = page.getByRole('dialog');
 await dialog.getByLabel('Conferi o encerramento da assinatura no provedor e possuo o comprovante.').check(); await dialog.getByLabel('Conferi todas as cobranças externas pendentes e seus destinos.').check(); await dialog.getByLabel('Ciclos já emitidos, incluindo os externos').fill('1');
 await dialog.getByLabel('Justificativa').fill('Conferência documental externa exclusivamente sintética'); await dialog.getByLabel('Referência do comprovante ou relatório').fill('VISUAL-EXTERNAL-001'); await dialog.getByLabel('Conferi os fatos e aprovo esta decisão como gestor autorizado.').check(); await shot('revisao-legado-desktop'); await submit(dialog, 'Registrar revisão', '/CONTRACT/' + fixture.legacyId);
 const legacy = await db.query('SELECT "providerSubscriptionId","retiredProviderSubscriptionId","subscriptionStatus" FROM "GymEnrollment" WHERE id=$1', [fixture.legacyId]); assert.equal(legacy.rows[0].providerSubscriptionId, null); assert(legacy.rows[0].retiredProviderSubscriptionId); assert.equal(legacy.rows[0].subscriptionStatus, 'CANCELLED');
 await page.getByRole('button', { name: 'Contas internas', exact: true }).click(); await page.getByRole('button', { name: 'Revisar Conta da conciliação visual' }).click(); dialog = page.getByRole('dialog');
 await dialog.getByLabel('Justificativa').fill('Saldo reconstituído pelos fatos da conta interna'); await dialog.getByLabel('Referência do comprovante ou relatório').fill('VISUAL-ACCOUNT-001'); await dialog.getByLabel('Conferi os fatos e aprovo esta decisão como gestor autorizado.').check(); await submit(dialog, 'Registrar revisão', '/ACCOUNT/' + fixture.accountId);
 const balance = await db.query('SELECT "balanceInCents"::text FROM "GymFinancialAccount" WHERE id=$1', [fixture.accountId]); assert.equal(balance.rows[0].balanceInCents, '5500');
 await page.setViewportSize({ width: 390, height: 844 }); await shot('historico-revisoes-mobile');
 report.scenarios.push('Revisão documental externa e correção de saldo pela interface, histórico em desktop/celular');
 assert.equal(report.errors.length, 0, 'Erros no navegador'); assert.equal(report.apiFailures.length, 0, 'Falhas HTTP na jornada'); report.success = true;
}
run().catch(async error => { report.success = false; report.failure = error.message; if (page) await page.screenshot({ path: folder + '/failure.png', fullPage: true }).catch(() => {}); process.exitCode = 1; }).finally(async () => { report.finishedAt = new Date().toISOString(); fs.writeFileSync(folder + '/report.json', JSON.stringify(report, null, 2)); fs.writeFileSync('.tmp/gym-stabilization/contract-visual-latest.json', JSON.stringify({ file: folder + '/report.json', ...report }, null, 2)); if (browser) await browser.close(); await db.end().catch(() => {}); console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, failure: report.failure, report: folder + '/report.json' })); });
