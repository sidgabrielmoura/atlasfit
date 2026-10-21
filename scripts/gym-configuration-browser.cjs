const fs = require('node:fs');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const { expect: base } = require('../.tmp/gym-visual-runner/node_modules/playwright/test');
const expect = base.configure({ timeout: 120000 });
const origin = 'http://127.0.0.1:31173';
const fixture = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/configuration-browser-fixture.json', 'utf8'));
const folder = '.tmp/gym-stabilization/configuration-browser-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), scenarios: [], screenshots: [], viewportChecks: [], errors: [], expectedHttpErrors: [] };
const db = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' });
let browser, page;
async function shot(label) {
  const file = folder + '/' + label + '.png'; await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file);
  const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })); report.viewportChecks.push({ label, ...size });
  assert(size.scrollWidth <= size.width + 1, 'Overflow: ' + label);
}
async function context(user, viewport) {
  const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  ctx.on('page', p => { p.setDefaultNavigationTimeout(120000); p.setDefaultTimeout(120000); p.on('pageerror', error => report.errors.push(error.message.slice(0, 500))); });
  const csrf = await (await ctx.request.get(origin + '/api/auth/csrf')).json();
  await ctx.request.post(origin + '/api/auth/callback/credentials', { form: { email: user.email, password: fixture.password, csrfToken: csrf.csrfToken, callbackUrl: origin + '/superadmin/gym-settings', authenticationProof: user.proof }, headers: { 'X-Auth-Return-Redirect': '1' } });
  const session = await (await ctx.request.get(origin + '/api/auth/session')).json(); assert.equal(session?.user?.id, user.id, 'Sessão sintética não confirmada.'); return ctx;
}
async function saveGlobal(expectedStatus = 200) {
  const [result] = await Promise.all([
    page.waitForResponse(response => new URL(response.url()).pathname === '/api/superadmin/gym-settings' && response.request().method() === 'PATCH'),
    page.getByRole('button', { name: 'Salvar', exact: true }).first().click(),
  ]);
  assert.equal(result.status(), expectedStatus); if (expectedStatus !== 200) report.expectedHttpErrors.push(expectedStatus);
}
async function openIndividual() {
  await page.goto(origin + '/superadmin/workspaces/' + fixture.workspaceId);
  await page.getByRole('tab', { name: /Academia/ }).click();
  await expect(page.getByLabel('Máximo de Alunos', { exact: true })).toBeVisible();
}
async function run() {
  await db.connect(); browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); report.browser = browser.version();
  const first = await context(fixture.admins[0], { width: 1440, height: 1000 });
  const second = await context(fixture.admins[1], { width: 390, height: 844 });
  page = await first.newPage(); await openIndividual();
  await expect(page.getByLabel('Máximo de Alunos', { exact: true })).toHaveValue('10');
  await page.getByLabel('Máximo de Alunos', { exact: true }).fill('17');
  await page.getByLabel('Máximo de Equipe / Staff').fill('8'); await page.getByLabel('Máximo de Unidades Filiais').fill('4');
  await page.getByLabel('Tolerância de Inadimplência (Dias)').fill('9');
  const guardian = page.getByRole('switch', { name: 'Assinatura Obrigatória de Responsável' }); await guardian.focus(); await page.keyboard.press('Space');
  let releaseSave;
  const saveGate = new Promise(resolve => { releaseSave = resolve; });
  await page.route('**/api/superadmin/workspaces/' + fixture.workspaceId + '/gym-config', async route => {
    if (route.request().method() === 'PATCH') await saveGate;
    return route.continue();
  });
  const saved = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/gym-config') && response.request().method() === 'PATCH');
  saved.catch(() => {});
  await page.getByRole('button', { name: 'Salvar Configurações', exact: true }).click();
  await expect(page.getByLabel('Máximo de Alunos', { exact: true })).toBeDisabled(); await expect(guardian).toBeDisabled();
  const beforeSave = await (await first.request.get(origin + '/api/superadmin/workspaces/' + fixture.workspaceId)).json(); assert.equal(beforeSave.subscription.maxStudents, 10);
  releaseSave(); assert.equal((await saved).status(), 200);
  const applied = await (await first.request.get(origin + '/api/superadmin/workspaces/' + fixture.workspaceId)).json();
  assert.equal(applied.subscription.maxStudents, 17); assert.equal(applied.subscription.maxStaff, 8); assert.equal(applied.subscription.maxUnits, 4);
  assert.equal(applied.settings.billingGracePeriodDays, 9); assert.equal(applied.settings.requireGuardianSignature, false);
  await page.reload(); await page.getByRole('tab', { name: /Academia/ }).click();
  await expect(page.getByLabel('Máximo de Alunos', { exact: true })).toHaveValue('17'); await expect(guardian).not.toBeChecked();
  await shot('individual-desktop'); report.scenarios.push('Campos de licença/política são persistidos, GET confirma e reload mantém; switch por teclado.');
  let confirmationFailure = true;
  await page.route('**/api/superadmin/workspaces/' + fixture.workspaceId, route => {
    if (confirmationFailure && route.request().method() === 'GET') { confirmationFailure = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Confirmação sintética indisponível.' }) }); }
    return route.continue();
  });
  await page.getByLabel('Máximo de Alunos', { exact: true }).fill('18');
  const secondSave = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/gym-config') && response.request().method() === 'PATCH');
  secondSave.catch(() => {});
  await page.getByRole('button', { name: 'Salvar Configurações', exact: true }).click(); assert.equal((await secondSave).status(), 200);
  await expect(page.getByText('Gravação recebida, mas a confirmação falhou. Recarregue para conferir os valores.', { exact: true })).toBeVisible();
  await page.reload(); await page.getByRole('tab', { name: /Academia/ }).click(); await expect(page.getByLabel('Máximo de Alunos', { exact: true })).toHaveValue('18');
  report.scenarios.push('Campos bloqueados durante PATCH; falha de confirmação não gera sucesso fictício e recarga recupera valor persistido.');
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('button', { name: 'Adicionar Unidade', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da Unidade').fill('Filial visual sintética'); await dialog.getByLabel('Código da Filial (Identificador)').fill('filial-visual');
  await dialog.getByLabel('Endereço Completo (Opcional)').fill('Rua sintética, 123 — São Paulo');
  await page.keyboard.press('Tab'); assert(await dialog.evaluate(element => element.contains(document.activeElement)));
  const created = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/gym-config') && response.request().method() === 'POST');
  created.catch(() => {});
  await dialog.getByRole('button', { name: /Cadastrar Unidade|Salvar Unidade/ }).click(); assert.equal((await created).status(), 201); await expect(dialog).toBeHidden();
  await page.reload(); await page.getByRole('tab', { name: /Academia/ }).click();
  for (const geometry of await page.getByRole('tab').evaluateAll(elements => elements.map(element => ({ scrollWidth: element.scrollWidth, width: element.clientWidth })))) assert(geometry.scrollWidth <= geometry.width + 1, 'Texto da aba cortado no celular.');
  await expect(page.getByText('Rua sintética, 123 — São Paulo', { exact: true })).toBeVisible();
  assert.equal((await db.query('SELECT address FROM "GymUnit" WHERE "workspaceId"=$1 AND code=$2', [fixture.workspaceId, 'filial-visual'])).rows[0].address, 'Rua sintética, 123 — São Paulo');
  await shot('individual-unidade-mobile'); report.scenarios.push('Unidade criada pelo celular conserva endereço string, exibe depois do reload e mantém foco no diálogo.');
  page = await first.newPage(); let failLoad = true;
  await page.route('**/api/superadmin/gym-settings', async route => {
    if (failLoad && route.request().method() === 'GET') { failLoad = false; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Leitura sintética indisponível.' }) }); }
    return route.continue();
  });
  await page.goto(origin + '/superadmin/gym-settings'); await expect(page.locator('[role="alert"]:not(#__next-route-announcer__)')).toHaveText('Leitura sintética indisponível.');
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click(); await expect(page.getByLabel('Alunos', { exact: true })).toBeVisible();
  report.scenarios.push('Falha inicial de GET mostra indisponibilidade e nova tentativa recupera os valores reais.');
  const pageA = page, pageB = await second.newPage(); await pageB.goto(origin + '/superadmin/gym-settings'); await expect(pageB.getByLabel('Alunos', { exact: true })).toBeVisible();
  const baseline = await (await first.request.get(origin + '/api/superadmin/gym-settings')).json();
  const requestedStudents = baseline.defaultMaxStudents === 41 ? 61 : 41;
  const requestedStaff = baseline.defaultMaxStaff === 73 ? 83 : 73;
  const concurrentStudents = requestedStudents + 1;
  await pageA.getByLabel('Alunos', { exact: true }).fill(String(requestedStudents)); await pageB.getByLabel('Equipe', { exact: true }).fill(String(requestedStaff));
  await saveGlobal(); await expect(pageA.getByText('Valores aplicados', { exact: true })).toBeVisible();
  page = pageB; await saveGlobal(); await expect(pageB.getByLabel('Alunos', { exact: true })).toHaveValue(String(requestedStudents));
  const persisted = await (await second.request.get(origin + '/api/superadmin/gym-settings')).json(); assert.equal(persisted.defaultMaxStudents, requestedStudents); assert.equal(persisted.defaultMaxStaff, requestedStaff);
  await shot('global-mobile'); report.scenarios.push('Administradores distintos com drafts simultâneos conservam alterações em campos diferentes.');
  const pageC = await first.newPage(); await pageC.goto(origin + '/superadmin/gym-settings'); await expect(pageC.getByLabel('Alunos', { exact: true })).toBeVisible();
  await pageC.getByLabel('Alunos', { exact: true }).fill(String(concurrentStudents)); await pageB.getByLabel('Alunos', { exact: true }).fill(String(concurrentStudents + 1));
  page = pageC; await saveGlobal(); await expect(pageC.getByText('Valores aplicados', { exact: true })).toBeVisible();
  page = pageB; await saveGlobal(409); await expect(pageB.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible(); await expect(pageB.getByText('Alterações pendentes', { exact: true })).toBeVisible();
  await pageB.getByRole('button', { name: 'Descartar alterações', exact: true }).click(); await pageB.getByRole('button', { name: 'Recarregar', exact: true }).click();
  await expect(pageB.getByLabel('Alunos', { exact: true })).toHaveValue(String(concurrentStudents)); report.scenarios.push('Conflito no mesmo campo é explícito; descarte e recarga recuperam a alteração aplicada por outro administrador.');
  let patches = 0; pageB.on('request', request => { if (new URL(request.url()).pathname === '/api/superadmin/gym-settings' && request.method() === 'PATCH') patches++; });
  await pageB.getByLabel('Alunos', { exact: true }).fill('-1'); await pageB.getByRole('button', { name: 'Salvar', exact: true }).first().click();
  await expect(pageB.locator('[role="alert"]:not(#__next-route-announcer__)')).toBeVisible(); assert.equal(patches, 0); await pageB.getByRole('button', { name: 'Descartar alterações', exact: true }).click();
  const toggle = pageB.getByRole('switch', { name: 'Importação de alunos' }); await toggle.focus(); await pageB.keyboard.press('Space');
  await expect(pageB.getByText('Alterações pendentes', { exact: true })).toBeVisible(); await pageB.getByRole('button', { name: 'Descartar alterações', exact: true }).click();
  await pageB.reload(); await expect(pageB.getByLabel('Alunos', { exact: true })).toHaveValue(String(concurrentStudents));
  await shot('global-mobile-recarga'); report.scenarios.push('Valor negativo não emite PATCH; edição pendente e descarte por teclado; reload conserva valores aplicados no celular.');
  assert.equal(report.errors.length, 0); report.success = true;
}
run().catch(async error => { report.success = false; report.failure = error.message; if (page) await page.screenshot({ path: folder + '/failure.png', fullPage: true }).catch(() => {}); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); await db.end().catch(() => {}); report.finishedAt = new Date().toISOString();
  fs.writeFileSync(folder + '/report.json', JSON.stringify(report, null, 2)); fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-configuracao-browser.json', JSON.stringify({ file: folder + '/report.json', ...report }, null, 2));
  console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, failure: report.failure, file: folder + '/report.json' }));
});
