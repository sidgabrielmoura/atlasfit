const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright'), { expect: base } = require('../.tmp/gym-visual-runner/node_modules/playwright/test'); const expect = base.configure({ timeout: 120000 });
const f = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/student-ingress-browser-fixture.json', 'utf8')), origin = 'http://127.0.0.1:31173';
const report = { startedAt: new Date().toISOString(), synthetic: true, errors: [] }; let browser;
(async () => {
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' }); await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const csrf = await (await context.request.get(origin + '/api/auth/csrf', { timeout: 120000 })).json();
  await context.request.post(origin + '/api/auth/callback/credentials', { form: { email: f.existing.email, password: f.password, csrfToken: csrf.csrfToken, callbackUrl: origin + '/select-workspace' }, headers: { 'X-Auth-Return-Redirect': '1' }, timeout: 120000 });
  assert.equal((await (await context.request.get(origin + '/api/auth/session')).json()).user.id, f.existing.id);
  await context.addCookies([{ name: 'atlasfit_active_workspace_id', value: f.gym.id, url: origin }]);
  const api = await context.request.get(origin + '/api/student/dashboard', { timeout: 120000 }); assert.equal(api.status(), 200); const data = await api.json(); assert.equal(data.workspace.id, f.gym.id); report.apiStatus = api.status(); report.contextConfirmed = true;
  const page = await context.newPage(); page.setDefaultTimeout(120000); page.on('pageerror', error => report.errors.push(error.message)); await page.goto(origin + '/student/dashboard', { timeout: 120000 }); await expect(page.locator('h1')).toBeVisible(); await expect(page.getByRole('heading', { name: 'Ops! Algo deu errado.' })).toHaveCount(0);
  const prior = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/student-ingress-browser-report.json', 'utf8')), folder = prior.file.slice(0, prior.file.lastIndexOf('/')); report.screenshot = folder + '/portal-conta-existente-carregado.png'; await page.screenshot({ path: report.screenshot, fullPage: true }); assert.deepEqual(report.errors, []); report.success = true;
})().catch(error => { report.success = false; report.failure = error.message.split('\nCall log:')[0].replace(/(?:gym_)?[a-f0-9]{64}/gi, '[REDACTED]'); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); report.finishedAt = new Date().toISOString(); fs.writeFileSync('.tmp/gym-stabilization/student-ingress-portal-browser.json', JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ success: report.success, apiStatus: report.apiStatus, failure: report.failure })); });
