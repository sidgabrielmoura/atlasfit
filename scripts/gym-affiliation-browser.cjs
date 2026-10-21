const fs = require('node:fs');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const { expect: base } = require('../.tmp/gym-visual-runner/node_modules/playwright/test');
const expect = base.configure({ timeout: 120000 });
const origin = 'http://127.0.0.1:31173';
const fixture = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/affiliation-browser-fixture.json', 'utf8'));
const folder = '.tmp/gym-stabilization/affiliation-browser-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), appMode: process.argv.includes('--production') ? 'production' : 'development', scenarios: [], screenshots: [], viewportChecks: [], errors: [], externalRequestsBlocked: 0, success: false };
const db = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
let browser, page;
async function shot(label) {
  const file = folder + '/' + label + '.png'; await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file);
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })); report.viewportChecks.push({ label, ...size });
  assert(size.scrollWidth <= size.width + 1, 'Overflow: ' + label);
}
async function choose(name) {
  await page.locator('[data-slot="sidebar-header"] button[aria-haspopup="menu"]').click();
  await page.getByRole('menuitem').filter({ hasText: name }).click();
}
async function run() {
  await db.connect(); browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); report.browser = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await context.route('**/*', route => { if (new URL(route.request().url()).origin === origin) return route.continue(); ++report.externalRequestsBlocked; return route.abort(); });
  const csrf = await (await context.request.get(origin + '/api/auth/csrf')).json();
  await context.request.post(origin + '/api/auth/callback/credentials', { form: { email: fixture.user.email, password: fixture.password, csrfToken: csrf.csrfToken, callbackUrl: origin + '/select-workspace', authenticationProof: fixture.user.proof }, headers: { 'X-Auth-Return-Redirect': '1' } });
  assert.equal((await (await context.request.get(origin + '/api/auth/session')).json()).user.id, fixture.user.id);
  await context.addCookies([{ name: 'atlasfit_active_workspace_id', value: fixture.workspaceId, url: origin, httpOnly: true, sameSite: 'Lax' }]);
  page = await context.newPage(); page.setDefaultNavigationTimeout(120000); page.setDefaultTimeout(120000); page.on('pageerror', error => report.errors.push((error.stack || error.message).slice(0, 1500)));
  page.on('response', async response => {
    if (response.request().resourceType() !== 'script' || !response.url().startsWith(origin)) return;
    try { const source = await response.text(); try { new (require('node:vm').Script)(source, { filename: response.url() }); } catch (error) { if (error.message === 'Invalid or unexpected token') { report.invalidScript = error.stack?.slice(0, 2000); fs.writeFileSync(folder + '/invalid-script.js', source); } } } catch {}
  });
  const commercialRequests = [];
  page.on('request', request => { if (/\/api\/personal\/(?:subscription|wallet|finance|crm|engage|rewards|dashboard)/.test(request.url())) commercialRequests.push(request.url()); });
  await page.goto(origin + '/personal/academy'); await expect(page.getByText('Aluno visual atribuído', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Carteira Atlas Pay', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Funil CRM', exact: true })).toHaveCount(0);
  await shot('academy-desktop');
  await page.getByRole('link', { name: 'Agenda', exact: true }).first().click(); await expect(page.getByRole('button', { name: 'Nova Tarefa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Nova Tarefa', exact: true }).click(); const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Título da Tarefa', { exact: true }).fill('Agenda visual do personal');
  await dialog.getByLabel('Categoria', { exact: true }).click();
  await expect(page.getByRole('option', { name: 'Aula', exact: true })).toHaveCount(0); await expect(page.getByRole('option', { name: 'Financeiro', exact: true })).toHaveCount(0);
  await page.getByRole('option', { name: 'Lembrete', exact: true }).click();
  await dialog.getByRole('button', { name: 'Criar Tarefa', exact: true }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByText('Agenda visual do personal', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Concluir Agenda visual do personal', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Concluir Agenda visual do personal', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Editar Agenda visual do personal', exact: true }).click();
  await dialog.getByLabel('Título da Tarefa', { exact: true }).fill('Agenda visual atualizada'); await dialog.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
  await expect(dialog).toBeHidden(); await page.reload(); await expect(page.getByText('Agenda visual atualizada', { exact: true })).toBeVisible();
  assert.equal((await db.query('SELECT "authorId" FROM "TrainerTask" WHERE "workspaceId"=$1 AND title=$2', [fixture.workspaceId, 'Agenda visual atualizada'])).rows[0].authorId, fixture.user.id);
  await shot('agenda-desktop'); report.scenarios.push('Agenda GYM cria, conclui, edita e persiste pelo navegador; autoria confirmada no PostgreSQL; categorias comerciais ausentes.');
  await page.getByRole('button', { name: 'Excluir Agenda visual atualizada', exact: true }).click(); await dialog.getByRole('button', { name: 'Confirmar Exclusão', exact: true }).click(); await expect(dialog).toBeHidden();
  await expect(page.getByText('Agenda visual atualizada', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 }); await shot('agenda-mobile');
  await expect(page.getByRole('link', { name: 'Agenda', exact: true }).last()).toHaveAttribute('aria-current', 'page');
  await page.getByRole('link', { name: 'Treinos', exact: true }).click(); await expect(page).toHaveURL(/view=workouts/); await expect(page.getByRole('link', { name: 'Treinos', exact: true })).toHaveAttribute('aria-current', 'page'); await shot('workouts-mobile');
  assert.equal(commercialRequests.length, 0, 'GYM must not preload PERSONAL commercial APIs.');
  report.scenarios.push('Desktop e celular sem overflow; navegação por query mantém item ativo; academia não pré-carrega APIs comerciais PERSONAL.');
  await page.setViewportSize({ width: 1440, height: 1000 }); await choose('Assessoria visual privada'); await expect(page).toHaveURL(/\/personal\/dashboard/);
  await expect(page.getByRole('link', { name: 'Carteira Atlas Pay', exact: true })).toBeVisible(); report.scenarios.push('Switcher grava contexto e restaura navegação autônoma da assessoria privada.');
  await db.query('UPDATE "FreeTrial" SET "isActive"=false WHERE "userId"=$1', [fixture.user.id]);
  await page.goto(origin + '/personal/dashboard'); await expect(page).toHaveURL(/\/subscription-expired$/);
  await page.getByRole('button', { name: 'Reativar com ' + fixture.planName, exact: true }).first().click(); await expect(dialog).toBeVisible();
  await dialog.getByLabel('CPF ou CNPJ do pagador').fill('52998224725'); await dialog.getByLabel('Celular com DDD').fill('11900000000');
  await dialog.getByRole('button', { name: 'Continuar para pagamento', exact: true }).click(); await expect(dialog.getByRole('alert')).toContainText('gateway de assinaturas ainda não foi configurado');
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await shot('paywall-desktop');
  assert.equal((await db.query('SELECT count(*)::int AS count FROM "Transaction" WHERE "userId"=$1', [fixture.user.id])).rows[0].count, 0);
  report.scenarios.push('Acesso explícito vencido mostra paywall; checkout com dados válidos e gateway ausente exibe falha sem crédito ou transação fictícia.');
  await page.goto(origin + '/dashboard'); await expect(page).toHaveURL(/\/personal\/academy$/); await expect(page.getByText('Aluno visual atribuído', { exact: true }).first()).toBeVisible();
  assert.equal((await context.cookies()).find(cookie => cookie.name === 'atlasfit_active_workspace_id').value, fixture.workspaceId);
  report.scenarios.push('Entrada padrão /dashboard troca de volta para a academia licenciada; cookie confirmado e operação preservada com trial pessoal revogado.');
  await context.clearCookies({ name: /atlasfit_active_workspace_id|student_active_workspace_id/ });
  await page.goto(origin + '/dashboard'); await expect(page).toHaveURL(/\/personal\/academy$/); await expect(page.getByText('Aluno visual atribuído', { exact: true }).first()).toBeVisible();
  report.scenarios.push('Entrada sem cookie de workspace também prefere a única academia licenciada quando a assessoria privada venceu.');
  assert.deepEqual(report.errors, []); report.success = true;
}
run().catch(async error => { report.error = error.stack?.slice(0, 2000) || error.message; if (page) { await page.screenshot({ path: folder + '/failure.png', fullPage: true }).catch(() => {}); } process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); await db.end(); report.finishedAt = new Date().toISOString();
  fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-personal-afiliado-browser.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, screenshots: report.screenshots.length, errors: report.errors, error: report.error }));
});
