const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright'), { expect: base } = require('../.tmp/gym-visual-runner/node_modules/playwright/test'); const expect = base.configure({ timeout: 120000 });
const origin = 'http://127.0.0.1:31173', f = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/student-ingress-browser-fixture.json', 'utf8'));
const folder = '.tmp/gym-stabilization/student-ingress-browser-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const redact = value => String(value).replace(/gym_[a-f0-9]{64}/g, '[REDACTED]').replace(/([?&]token=)[^&\s"']+/g, '$1[REDACTED]').replace(/[a-f0-9]{64}/gi, '[REDACTED]');
const report = { startedAt: new Date().toISOString(), scenarios: [], errors: [], screenshots: [], synthetic: true }; let browser, page;
function scenario(label) { report.scenarios.push(label); console.log('Ingresso: ' + label); }
async function shot(target, name) { const file = folder + '/' + name + '.png'; await target.screenshot({ path: file, fullPage: true, mask: [target.getByLabel('Link de ingresso do aluno'), target.locator('#student-link-invitation')] }); report.screenshots.push(file); }
async function context(viewport = { width: 1440, height: 1000 }) {
  const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
  await ctx.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  ctx.on('page', p => { p.setDefaultTimeout(120000); p.setDefaultNavigationTimeout(120000); p.on('pageerror', error => report.errors.push(redact(error.message))); }); return ctx;
}
async function ownLogin(p, email, password, returnTo) {
  report.phase = 'Login próprio';
  const destination = returnTo ? new URL(returnTo, origin) : null;
  await p.goto(origin + '/auth/student' + (destination ? '?callbackUrl=' + encodeURIComponent(destination.pathname + destination.search) : '')); await p.locator('#email').fill(email); await p.locator('#password').fill(password); await p.getByRole('button', { name: 'Entrar Agora' }).click();
  await expect.poll(async () => (await (await p.context().request.get(origin + '/api/auth/session', { timeout: 120000 })).json())?.user?.email).toBe(email);
  if (destination) await expect(p).toHaveURL(destination.href); else await expect(p).not.toHaveURL(/\/auth\/student/);
}
async function run() {
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); report.browser = browser.version();
  const operator = await context(); const csrf = await (await operator.request.get(origin + '/api/auth/csrf', { timeout: 120000 })).json();
  const login = await operator.request.post(origin + '/api/auth/callback/credentials', { form: { email: f.owner.email, password: f.password, csrfToken: csrf.csrfToken, authenticationProof: f.owner.proof, callbackUrl: origin + '/gym/students' }, headers: { 'X-Auth-Return-Redirect': '1' }, timeout: 120000 }); assert.equal(login.status(), 200);
  assert.equal((await (await operator.request.get(origin + '/api/auth/session', { timeout: 120000 })).json()).user.id, f.owner.id);
  await operator.addCookies([{ name: 'atlasfit_active_workspace_id', value: f.gym.id, url: origin }]);
  for (const path of ['/gym/students', '/auth/setup-password', '/auth/student', '/select-workspace', '/student/dashboard', '/account/gym-link', '/api/gym/students/check-duplicate', '/api/gym/students/identity-link', '/api/user/gym-link', `/api/gym/students/${f.student.memberId}/invite`, '/api/student/settings', '/api/student/dashboard', '/api/student/lock-status', '/api/user/privacy', '/api/personal/notifications', '/api/personal/notifications/preferences', '/api/engage/active', '/api/banners?role=ALL', '/api/ably/token', `/api/chat/conversations?workspaceId=${f.gym.id}`]) { await operator.request.get(origin + path, { timeout: 180000 }); console.log('Ingresso: rota compilada ' + path); }
  page = await operator.newPage(); await page.goto(origin + '/gym/students'); await page.getByRole('button', { name: 'Ver perfil de ' + f.studentName, exact: true }).click();
  await page.getByRole('button', { name: 'Emitir / reemitir link do aluno' }).click(); await page.getByRole('button', { name: 'Confirmar emissão' }).click();
  const link = page.getByLabel('Link de ingresso do aluno'); await expect(link).toBeVisible(); const path = await link.inputValue(); await shot(page, 'convite-operador');
  scenario('Operador emite link manual com confirmação e prazo, sem configurar senha ou aceitar documentos pelo aluno.');
  const newcomer = await context({ width: 390, height: 844 }), setup = await newcomer.newPage(); await setup.goto(path);
  await expect(setup.getByRole('heading', { name: 'Crie sua Senha' })).toBeVisible(); assert.equal(await setup.locator('meta[name="referrer"]').getAttribute('content'), 'no-referrer');
  await expect(setup.getByRole('button', { name: 'Confirmar Senha e Ativar Conta' })).toBeDisabled(); await setup.getByLabel('Seu e-mail para login').fill(f.studentEmail); await setup.locator('#password').fill(f.studentPassword); await setup.locator('#confirm-password').fill(f.studentPassword);
  for (const name of ['Termos de Uso', 'Política de Privacidade']) { await setup.getByRole('button', { name, exact: true }).click(); await expect(setup.getByRole('dialog')).toContainText('Versão'); await setup.keyboard.press('Escape'); }
  await setup.locator('#acceptedTerms').focus(); await setup.keyboard.press('Space'); await setup.locator('#acceptedPrivacy').focus(); await setup.keyboard.press('Space'); await shot(setup, 'setup-mobile');
  await setup.getByRole('button', { name: 'Confirmar Senha e Ativar Conta' }).click(); await expect(setup.getByRole('heading', { name: 'Tudo pronto!' })).toBeVisible();
  scenario('Formulário celular exibe documentos vigentes, exige dois aceites próprios e permite e-mail e senha próprios por teclado.');
  await ownLogin(setup, f.studentEmail, f.studentPassword); await setup.goto(origin + '/select-workspace'); await expect(setup).toHaveURL(/\/student\/dashboard/); assert.equal((await (await newcomer.request.get(origin + '/api/student/settings')).json()).user?.id || (await (await newcomer.request.get(origin + '/api/auth/session')).json()).user.id, f.student.userId); await shot(setup, 'portal-novo-aluno');
  scenario('Aluno USER entra com a senha criada, seleciona sua academia e acessa o portal próprio.');
  const replay = await context(), replayPage = await replay.newPage(); await replayPage.goto(path); await expect(replayPage.getByRole('alert').filter({ hasText: 'Convite indisponível' })).toBeVisible();
  scenario('Link consumido é recusado na página pública.');
  await page.goto(origin + '/gym/students');
  const registration = page.getByRole('dialog', { name: 'Novo aluno', exact: true });
  await expect(async () => { await page.getByRole('button', { name: 'Novo aluno', exact: true }).click(); await expect(registration).toBeVisible({ timeout: 3000 }); }).toPass({ timeout: 15000 });
  await page.getByLabel('E-mail do aluno', { exact: true }).fill(f.existing.email); await page.getByLabel('Nascimento', { exact: true }).fill('1990-01-15'); await page.getByRole('button', { name: 'Verificar Duplicidade' }).click(); await page.getByRole('button', { name: 'Gerar convite de autorização' }).click();
  const invitation = page.locator('#student-link-invitation'); await expect(invitation).toBeVisible(); const authorizationPath = await invitation.inputValue();
  const existing = await context(), own = await existing.newPage(); await ownLogin(own, f.existing.email, f.password, authorizationPath); await own.getByRole('button', { name: 'Autorizar meu vínculo' }).click(); await expect(own.getByRole('status')).toContainText('Autorização registrada'); await shot(own, 'autorizacao-titular');
  await page.getByRole('button', { name: 'Conferir autorização' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Autorização confirmada' })).toBeVisible(); await page.locator('#register-birth').fill(''); await expect(page.locator('#register-name')).toHaveValue(''); await expect(page.locator('#register-name')).toHaveJSProperty('required', false); await expect(page.locator('#register-birth')).toHaveJSProperty('required', false); await page.getByRole('button', { name: 'Cadastrar aluno', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Novo aluno', exact: true })).toHaveCount(0); await page.getByRole('button', { name: 'Ver perfil de ' + f.existing.name, exact: true }).click(); await page.getByRole('button', { name: 'Emitir / reemitir link do aluno' }).click(); await page.getByRole('button', { name: 'Confirmar emissão' }).click(); await expect(page.getByRole('link', { name: 'Página de login' })).toBeVisible(); await expect(page.getByLabel('Link de ingresso do aluno')).toHaveCount(0);
  scenario('Conta existente autoriza vínculo na sessão própria; cadastro mantém o login e oferece a página de entrada.');
  await own.goto(origin + '/select-workspace'); await expect(own.getByRole('button', { name: 'Acessar ' + f.gym.name })).toBeEnabled(); await expect(own.getByRole('button', { name: 'Acessar PERSONAL privado ingresso' })).toBeVisible(); await own.getByRole('button', { name: 'Acessar ' + f.gym.name }).click(); await expect(own).toHaveURL(/\/student\/dashboard/); await shot(own, 'portal-conta-existente');
  scenario('Titular com PERSONAL privado seleciona a academia como aluno na sessão existente.');
  assert.deepEqual(report.errors, []); report.success = true;
}
run().catch(async error => { report.success = false; report.failure = redact(error.message.split('\nCall log:')[0]); report.failureStack = redact(error.stack).split('\n').filter(line => line.includes('gym-student-ingress-browser.cjs')).join('\n'); if (page) await shot(page, 'failure').catch(() => {}); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); report.finishedAt = new Date().toISOString(); fs.writeFileSync(folder + '/report.json', JSON.stringify(report, null, 2) + '\n'); fs.writeFileSync('.tmp/gym-stabilization/student-ingress-browser-report.json', JSON.stringify({ file: folder + '/report.json', ...report }, null, 2) + '\n'); console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, failure: report.failure, file: folder + '/report.json' })); });
