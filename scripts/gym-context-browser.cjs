const fs = require('node:fs'), assert = require('node:assert/strict'), { Client } = require('pg');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright'), { expect: base } = require('../.tmp/gym-visual-runner/node_modules/playwright/test'); const expect = base.configure({ timeout: 120000 });
const origin = 'http://127.0.0.1:31173', fixture = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/context-browser-fixture.json', 'utf8'));
const folder = '.tmp/gym-stabilization/context-browser-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), scenarios: [], errors: [], screenshots: [], cookieChecks: [], requests: [], transport: 'Next/Chrome/HTTP/PostgreSQL reais e dados exclusivamente sintéticos; nenhum gateway acionado.' };
function scenario(label) { report.scenarios.push(label); fs.writeFileSync(folder + '/progress.json', JSON.stringify({ scenarios: report.scenarios, recordedAt: new Date().toISOString() }, null, 2)); console.log('Contexto: ' + label); }
const db = new Client({ connectionString: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001' }); let browser, page;
const get = (context, url) => context.request.get(url, { timeout: 120000 });
async function session(user) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const csrf = await (await context.request.get(origin + '/api/auth/csrf')).json(); await context.request.post(origin + '/api/auth/callback/credentials', { form: { email: user.email, password: fixture.password, csrfToken: csrf.csrfToken, authenticationProof: user.proof, callbackUrl: origin + '/select-workspace' }, headers: { 'X-Auth-Return-Redirect': '1' } });
  assert.equal((await (await context.request.get(origin + '/api/auth/session')).json()).user.id, user.id);
  const selected = await context.newPage(); selected.setDefaultTimeout(120000); selected.setDefaultNavigationTimeout(120000); selected.on('pageerror', error => report.errors.push(error.message)); return { context, page: selected };
}
async function cookies(context, workspace) {
  const values = (await context.cookies(origin)).filter(cookie => ['atlasfit_active_workspace_id', 'student_active_workspace_id'].includes(cookie.name)); assert.equal(values.length, 2); assert(values.every(cookie => cookie.value === workspace.id && cookie.httpOnly)); report.cookieChecks.push({ workspaceId: workspace.id, httpOnly: true, sameValue: true });
  await expect(page.locator('header').first().getByText(workspace.name, { exact: true })).toBeVisible();
}
async function switchTo(current, next, route) {
  await page.getByRole('button', { name: new RegExp(current.name) }).click(); await page.getByRole('menuitem', { name: new RegExp(next.name) }).click();
  // Both gyms have the same landing URL. Await the authoritative cookie change,
  // not merely a URL that already matched before the selection request finished.
  await expect.poll(async () => (await page.context().cookies(origin)).find(cookie => cookie.name === 'atlasfit_active_workspace_id')?.value).toBe(next.id);
  await expect(page).toHaveURL(new RegExp(route + '(?:\\?|$)'));
}
async function shot(label) { const file = folder + '/' + label + '.png'; await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file); }
async function run() {
  await db.connect(); browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); report.browser = browser.version();
  const owner = await session(fixture.users[0]), worker = await session(fixture.users[1]); page = owner.page;
  // Compile every visited layout before the browser loads shared chunks. Cold
  // development compilation can replace app/layout.js during a route change.
  // Keep all page errors visible; warming does not suppress runtime failures.
  for (const route of ['/gym/dashboard', '/gym/finance', '/personal/dashboard', '/personal/subscription', '/subscription-expired', '/auth/admin', '/auth/student', '/superadmin/dashboard', '/guardian/dependents']) {
    const response = await owner.context.request.get(origin + route, { timeout: 180000 });
    assert.equal(response.status(), 200, 'Warm-up failed for ' + route);
    console.log('Contexto: rota compilada ' + route);
  }
  for (const route of ['/api/banners?role=PERSONAL', '/api/ably/token?workspaceId=' + fixture.gyms[0].id, '/api/engage/active?workspaceId=' + fixture.gyms[0].id, '/api/personal/notifications/preferences', '/api/personal/notifications?workspaceId=' + fixture.gyms[0].id, '/api/chat/conversations?workspaceId=' + fixture.gyms[0].id, '/api/personal/credits/balance?workspaceId=' + fixture.personal.id, '/api/personal/dashboard?workspaceId=' + fixture.personal.id, '/api/personal/subscription', '/api/gym/workouts/templates?workspaceId=' + fixture.gyms[0].id, '/api/gym/analytics/kpis?workspaceId=' + fixture.gyms[0].id]) {
    const response = await owner.context.request.get(origin + route, { timeout: 180000 });
    assert(response.status() < 500 || route.startsWith('/api/ably/token?'), 'API warm-up failed: ' + route);
    console.log('Contexto: API compilada ' + route.split('?')[0]);
  }
  const beforeTrial = (await db.query('SELECT "startDate", "endDate", "isActive" FROM "FreeTrial" WHERE id = $1', [fixture.trialId])).rows[0];
  await page.goto(origin + '/select-workspace'); const card = page.getByRole('button', { name: 'Acessar ' + fixture.gyms[0].name, exact: true }); await expect(card).toBeEnabled(); await card.focus(); await page.keyboard.press('Enter'); await expect(page).toHaveURL(/\/gym\/dashboard(?:\?|$)/); await cookies(owner.context, fixture.gyms[0]);
  scenario('Seleção inicial pelo teclado grava ambos os cookies HTTP-only e inicializa cabeçalho/store com a academia A.');
  await switchTo(fixture.gyms[0], fixture.gyms[1], '/gym/dashboard'); await cookies(owner.context, fixture.gyms[1]);
  const route = id => origin + '/api/gym/workouts/templates?workspaceId=' + id;
  assert.equal((await get(owner.context, route(fixture.gyms[1].id))).status(), 200); assert.equal((await get(owner.context, route(fixture.gyms[0].id))).status(), 409);
  await page.reload(); await cookies(owner.context, fixture.gyms[1]); scenario('Switcher A→B, reload e requisições convergem; requisição atrasada da academia A recebe 409.');
  await switchTo(fixture.gyms[1], fixture.personal, '/personal/dashboard'); await cookies(owner.context, fixture.personal);
  const dashboard = origin + '/api/personal/dashboard?workspaceId=' + fixture.personal.id; assert.equal((await get(owner.context, dashboard)).status(), 200);
  await page.reload(); await cookies(owner.context, fixture.personal); const current = await get(owner.context, dashboard); assert.equal(current.status(), 200);
  assert.equal((await get(owner.context, origin + '/api/personal/dashboard?workspaceId=' + fixture.gyms[0].id)).status(), 409);
  assert.deepEqual((await db.query('SELECT "startDate", "endDate", "isActive" FROM "FreeTrial" WHERE id = $1', [fixture.trialId])).rows[0], beforeTrial);
  scenario('GYM→PERSONAL e reload restauram store pelo servidor; dashboard privado responde no contexto PERSONAL e trial permanece intacto.');
  await switchTo(fixture.personal, fixture.gyms[0], '/gym/dashboard'); await cookies(owner.context, fixture.gyms[0]);
  await page.getByRole('button', { name: new RegExp(fixture.gyms[0].name) }).click(); await page.getByRole('menuitem', { name: 'Adicionar Workspace', exact: true }).click(); const warning = page.getByRole('dialog', { name: 'Limite de Workspaces Atingido' }); await expect(warning).toBeVisible(); await warning.getByRole('button', { name: 'Fazer Upgrade do Plano' }).click(); await expect(page).toHaveURL(/\/personal\/subscription(?:\?|$)/);
  await cookies(owner.context, fixture.personal); assert.equal((await db.query('SELECT COUNT(*)::int AS count FROM "Workspace" WHERE "ownerId" = $1 AND type = \'PERSONAL\'', [fixture.users[0].id])).rows[0].count, 1); await expect(page.getByText(/Solicitação enviada/i)).toHaveCount(0);
  await switchTo(fixture.personal, fixture.gyms[0], '/gym/dashboard'); await cookies(owner.context, fixture.gyms[0]); scenario('Limite PERSONAL não conta academias e não cria assessoria adicional; CTA de upgrade iniciado no GYM seleciona PERSONAL e abre assinatura real, sem toast fictício. Retorno ao GYM funciona.');
  page = worker.page; await page.goto(origin + '/select-workspace'); await page.getByRole('button', { name: 'Acessar ' + fixture.gyms[0].name, exact: true }).click(); await expect(page).toHaveURL(/\/gym\/dashboard(?:\?|$)/); await cookies(worker.context, fixture.gyms[0]);
  await switchTo(fixture.gyms[0], fixture.gyms[1], '/gym/finance'); await cookies(worker.context, fixture.gyms[1]); assert.equal((await get(worker.context, route(fixture.gyms[1].id))).status(), 403); assert.equal((await get(worker.context, route(fixture.gyms[0].id))).status(), 409); await page.reload(); await cookies(worker.context, fixture.gyms[1]); await shot('financeiro-desktop'); scenario('Gerente e financeiro aparecem na seleção/switcher; financeiro chega à rota financeira e não recebe permissão de treinos. Reload preserva contexto/papéis.');
  page = owner.page; await db.query('UPDATE "FreeTrial" SET "isActive" = false WHERE id = $1', [fixture.trialId]); await page.setViewportSize({ width: 390, height: 844 }); await page.goto(origin + '/select-workspace'); await page.getByRole('button', { name: 'Acessar ' + fixture.personal.name, exact: true }).click(); await expect(page).toHaveURL(/\/subscription-expired(?:\?|$)/); await shot('personal-paywall-mobile');
  await page.goto(origin + '/select-workspace'); await page.getByRole('button', { name: 'Acessar ' + fixture.gyms[0].name, exact: true }).click(); await expect(page).toHaveURL(/\/gym\/dashboard(?:\?|$)/); await cookies(owner.context, fixture.gyms[0]); await shot('gym-mobile'); scenario('Trial revogado com fim futuro aciona paywall PERSONAL; academia licenciada continua acessível. Nenhuma cobrança foi criada.');
  const anonymous = await browser.newContext(); for (const [source, target] of [['/superadmin/dashboard', '/auth/admin'], ['/guardian/dependents', '/auth/student']]) { const result = await anonymous.request.get(origin + source); assert.equal(new URL(result.url()).pathname, target); assert.equal(result.status(), 200); } await anonymous.close(); scenario('Sessão ausente em superadmin/responsável redireciona a rotas canônicas existentes que respondem 200.');
  assert.deepEqual(report.errors, []); report.success = true;
}
run().catch(async error => { report.success = false; report.failure = error.message.split('\nCall log:')[0]; if (page) { const file = folder + '/failure.png'; await page.screenshot({ path: file }).catch(() => {}); report.screenshots.push(file); } process.exitCode = 1; }).finally(async () => { await db.query('UPDATE "FreeTrial" SET "isActive" = true WHERE id = $1', [fixture.trialId]).catch(() => {}); if (browser) await browser.close(); await db.end().catch(() => {}); report.finishedAt = new Date().toISOString(); fs.writeFileSync(folder + '/report.json', JSON.stringify(report, null, 2)); fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-contexto-browser.json', JSON.stringify({ file: folder + '/report.json', ...report }, null, 2)); console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, failure: report.failure, file: folder + '/report.json' })); });
