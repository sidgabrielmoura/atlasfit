const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const { expect: baseExpect } = require('../.tmp/gym-visual-runner/node_modules/playwright/test');
// Cold compilation in the isolated development server can exceed 15 seconds.
const expect = baseExpect.configure({ timeout: 60000 });
const origin = 'http://127.0.0.1:31173';
const connectionString = 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001';
const outputRoot = '.tmp/gym-stabilization/guardian-visual';
const output = `${outputRoot}/run-${Date.now()}`;
fs.mkdirSync(output, { recursive: true });
const allowed = ['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'COMSPEC', 'PATHEXT', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
Object.assign(env, { DATABASE_URL: connectionString, AUTH_SECRET: 'isolated-gym-test-secret-not-for-production', ABLY_API_KEY: '', ASAAS_API_KEY: '', RESEND_API_KEY: '' });
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const report = { startedAt: new Date().toISOString(), browser: null, viewportChecks: [], screenshots: [], scenarios: [], failures: [], browserErrors: [] };
let browser;
let currentPage;
async function screenshot(page, label) {
 await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {}))); });
 const file = `${output}/${label}.png`; await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file);
 const overflow = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
 report.viewportChecks.push({ label, ...overflow });
 assert(overflow.scrollWidth <= overflow.width + 1, `${label}: conteúdo ultrapassa a largura da página`);
}
async function scenario(name, operation) {
 console.log(`Navegador: ${name}`);
 try { await operation(); report.scenarios.push({ name, status: 'passed' }); }
 catch (error) { report.scenarios.push({ name, status: 'failed' }); report.failures.push({ name, message: error.message }); if (currentPage) await currentPage.screenshot({ path: `${output}/failure.png`, fullPage: true }); throw error; }
}
async function context(viewport) {
 const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
 ctx.on('page', page => page.on('pageerror', error => { const message = error.message.slice(0, 800); if (!report.browserErrors.includes(message)) report.browserErrors.push(message); }));
 await ctx.route('**/*', route => { const url = new URL(route.request().url()); return url.origin === origin || ['data:', 'blob:', 'about:'].includes(url.protocol) ? route.continue() : route.abort(); });
 return ctx;
}
async function acceptOwnPending(page) {
 const response = await page.context().request.get(`${origin}/api/user/privacy`);
 assert.equal(response.status(), 200);
 const data = await response.json();
 for (const doc of data.compliance.pendingDocuments) {
  const dialog = page.getByRole('dialog').filter({ hasText: 'Governança e Transparência' });
  await expect(dialog.getByRole('heading', { name: `${doc.title} (v${doc.version})` })).toBeVisible();
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Concordar e Continuar' }).click();
  await expect(dialog.getByRole('heading', { name: `${doc.title} (v${doc.version})` })).toBeHidden({ timeout: 60000 });
 }
}
async function login(ctx, user, fixture, withProof = true) {
 const csrf = await (await ctx.request.get(`${origin}/api/auth/csrf`)).json();
 await ctx.request.post(`${origin}/api/auth/callback/credentials`, { form: { email: user.email, password: fixture.password, csrfToken: csrf.csrfToken, callbackUrl: `${origin}/guardian/dependents`, ...(withProof ? { authenticationProof: fixture.proofs[user.id] } : {}) }, headers: { 'X-Auth-Return-Redirect': '1' } });
 const session = await (await ctx.request.get(`${origin}/api/auth/session`)).json(); assert.equal(session.user?.id, user.id);
}
async function run() {
 const setup = spawnSync(process.execPath, ['node_modules/vitest/vitest.mjs', 'run', '--config', 'vitest.gym-visual.config.ts'], { env, stdio: 'inherit' });
 assert.equal(setup.status, 0, 'Falha ao preparar fixture visual');
 const fixture = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/guardian-visual-fixture.json', 'utf8'));
 browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); report.browser = browser.version();
 const operator = await context({ width: 1440, height: 1000 }); const parent = await context({ width: 1440, height: 1000 });
 await login(operator, fixture.owner, fixture); await login(parent, fixture.parent, fixture);
 await operator.addCookies([{ name: 'atlasfit_active_workspace_id', value: fixture.workspaceId, url: origin }]);
 const anonymous = await context({ width: 390, height: 844 });
 let page = await anonymous.newPage(); currentPage = page; page.setDefaultNavigationTimeout(120000);
 await scenario('Convite: carregamento, celular, leitura, teclado e confirmação sem mutação ao cancelar', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/api/guardian/ingress?*', async route => { await gate; await route.continue(); });
  await page.goto(origin + fixture.invitationPath);
  await expect(page.getByRole('status', { name: 'Validando convite' })).toBeVisible(); release();
  await expect(page.getByLabel('Seu CPF')).toBeVisible(); await page.unroute('**/api/guardian/ingress?*'); await screenshot(page, 'convite-mobile');
  await page.getByRole('button', { name: /Ler termos/ }).click(); await expect(page.getByRole('dialog')).toBeVisible(); await screenshot(page, 'documento-mobile'); await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByLabel('Seu CPF').fill(fixture.pending.cpf); await page.getByLabel('Seu nascimento').fill('1990-01-15');
  await page.getByLabel('Senha da sua nova conta', { exact: true }).fill(fixture.password); await page.getByLabel('Confirmar senha', { exact: true }).fill(fixture.password);
  await page.getByLabel('Li e aceito os termos para minha própria conta.').check(); await page.getByLabel('Li e estou ciente da política de privacidade para minha conta.').check();
  await page.getByRole('button', { name: 'Criar minha conta e vincular' }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible(); await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Confirmar', exact: true })).toBeFocused(); await page.keyboard.press('Tab'); assert(await dialog.evaluate(element => element.contains(document.activeElement)), 'Foco saiu da confirmação'); await page.keyboard.press('Tab'); await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape'); assert.equal(await prisma.user.count({ where: { email: fixture.pending.email } }), 0);
 });
 await scenario('Convite: erro de hash preservado, nova confirmação, consumo único e login pelo formulário', async () => {
  const document = await prisma.legalDocument.findFirstOrThrow({ where: { type: 'TERMS', status: 'PUBLISHED' }, orderBy: [{ effectiveAt: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }] });
  const content = document.content + ' Revisão sintética durante a leitura.';
  const hash = require('node:crypto').createHash('sha256').update(content).digest('hex');
  await prisma.legalDocument.update({ where: { id: document.id }, data: { content, contentHash: hash } });
  await page.getByRole('button', { name: 'Criar minha conta e vincular' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Os documentos mudaram' })).toBeVisible(); await expect(page.getByLabel('Li e aceito os termos para minha própria conta.')).not.toBeChecked(); await screenshot(page, 'convite-erro-mobile');
  await page.getByLabel('Li e aceito os termos para minha própria conta.').check(); await page.getByLabel('Li e estou ciente da política de privacidade para minha conta.').check();
  await page.getByRole('button', { name: 'Criar minha conta e vincular' }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByText('Vínculo confirmado', { exact: true })).toBeVisible();
  const user = await prisma.user.findUniqueOrThrow({ where: { email: fixture.pending.email } }); assert.equal(await prisma.workspaceMember.count({ where: { userId: user.id } }), 0);
  await page.getByRole('link', { name: 'Entrar com minha conta' }).click();
  await page.locator('input[type=email]').fill(fixture.pending.email); await page.locator('input[type=password]').fill(fixture.password);
  await page.locator('form').getByRole('button', { name: /Entrar|Acessar/i }).click();
  await page.waitForURL('**/guardian/dependents', { timeout: 60000 }); await expect(page.getByRole('button', { name: 'Mensalidades' })).toBeVisible();
  assert.equal((await (await anonymous.request.get(`${origin}/api/user/privacy`)).json()).compliance.isCompliant, true);
 });
 await scenario('Portal: extrato no celular, recuperação de erro e precisão monetária sem transbordamento', async () => {
  let fail = true;
  await page.route('**/api/guardian/dependents/*/finance?*', async route => { if (fail) { await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: 'Indisponibilidade sintética recuperável.' } }) }); } else await route.continue(); });
  await page.getByRole('button', { name: 'Mensalidades' }).click(); await expect(page.getByRole('alert').filter({ hasText: 'Indisponibilidade sintética' })).toBeVisible();
  await screenshot(page, 'financeiro-erro-mobile'); fail = false;
  await page.getByRole('button', { name: 'Tentar novamente' }).click(); await expect(page.getByText('Mensalidade sintética de precisão', { exact: true })).toBeVisible();
  await expect(page.getByText('R$ 90.071.992.547.409,93', { exact: true })).toHaveCount(4);
  const monetaryBounds = await page.getByRole('dialog').evaluate(dialog => {
   const bounds = dialog.getBoundingClientRect();
   return [...dialog.querySelectorAll('p, strong')].filter(element => element.textContent === 'R$ 90.071.992.547.409,93').map(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    return [...range.getClientRects()].every(rect => rect.left >= bounds.left && rect.right <= bounds.right);
   });
  });
  assert.equal(monetaryBounds.length, 4); assert(monetaryBounds.every(Boolean), 'Valor monetário ficou cortado no diálogo');
  await screenshot(page, 'financeiro-mobile');
  await page.getByRole('dialog').evaluate(dialog => { dialog.scrollTop = dialog.scrollHeight; }); await screenshot(page, 'financeiro-fatura-mobile');
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden(); await screenshot(page, 'portal-mobile');
 });
 const desktop = await parent.newPage(); currentPage = desktop; desktop.setDefaultNavigationTimeout(120000);
 await scenario('Reaceite próprio: conflito real de hash, falha de recarga, retry e confirmação renovada', async () => {
  await desktop.goto(origin + '/guardian/dependents');
  const dialog = desktop.getByRole('dialog').filter({ hasText: 'Governança e Transparência' });
  await expect(dialog).toBeVisible();
  const doc = await prisma.legalDocument.findFirstOrThrow({ where: { type: 'TERMS', status: 'PUBLISHED' }, orderBy: [{ effectiveAt: 'desc' }, { publishedAt: 'desc' }, { id: 'desc' }] });
  const content = doc.content + ' Nova revisão sintética durante o reaceite próprio.';
  const hash = require('node:crypto').createHash('sha256').update(content.trim()).digest('hex');
  await prisma.legalDocument.update({ where: { id: doc.id }, data: { content, contentHash: hash } });
  const count = () => prisma.legalAcceptance.count({ where: { userId: fixture.parent.id, source: 'IN_APP_MODAL', representedUserId: null } });
  const before = await count();
  let failReload = true; let posts = 0;
  await desktop.route('**/api/user/privacy', route => failReload ? route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }) : route.continue());
  let release; const gate = new Promise(resolve => { release = resolve; });
  await desktop.route('**/api/user/privacy/accept', async route => { posts++; await gate; await route.continue(); });
  await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Concordar e Continuar' }).evaluate(button => { button.click(); button.click(); });
  await expect(dialog.getByRole('checkbox')).toBeDisabled(); release();
  await expect(dialog.getByRole('button', { name: 'Recarregar documentos' })).toBeVisible({ timeout: 60000 });
  await expect(dialog.getByRole('alert')).toContainText('Não foi possível consultar');
  assert.equal(posts, 1, 'Clique repetido enviou duas confirmações'); assert.equal(await count(), before);
  await expect(dialog.getByRole('checkbox')).not.toBeChecked(); await expect(dialog.getByRole('checkbox')).toBeDisabled();
  await screenshot(desktop, 'reaceite-recarga-erro-desktop');
  failReload = false; await dialog.getByRole('button', { name: 'Recarregar documentos' }).click();
  await expect(dialog.getByText('Nova revisão sintética durante o reaceite próprio.', { exact: false })).toBeVisible();
  await expect(dialog.getByRole('checkbox')).not.toBeChecked(); await expect(dialog.getByRole('checkbox')).toBeEnabled();
  await screenshot(desktop, 'reaceite-atual-desktop');
  await desktop.unroute('**/api/user/privacy'); await desktop.unroute('**/api/user/privacy/accept');
  await acceptOwnPending(desktop);
  assert.equal(await count(), before + 1);
  const record = await prisma.legalAcceptance.findFirstOrThrow({ where: { userId: fixture.parent.id, source: 'IN_APP_MODAL', representedUserId: null }, orderBy: { acceptedAt: 'desc' } });
  assert.equal(record.documentHash, hash); assert.equal(record.workspaceId, null);
 });
 await scenario('Portal desktop: reaceite da conta, documentos e registro separado em representação', async () => {
  await desktop.goto(origin + '/guardian/dependents'); await acceptOwnPending(desktop); await expect(desktop.getByRole('button', { name: 'Privacidade', exact: true })).toBeVisible(); await screenshot(desktop, 'portal-desktop');
  await desktop.getByRole('button', { name: 'Privacidade', exact: true }).click(); await expect(desktop.getByText(/Li e reconheço a política/)).toBeVisible(); await screenshot(desktop, 'privacidade-desktop');
  await desktop.getByLabel('Li e reconheço a política de privacidade exibida em representação do dependente.').check(); await desktop.getByRole('button', { name: 'Registrar ciência' }).click(); await expect(desktop.getByRole('dialog')).toBeHidden();
  const record = await prisma.legalAcceptance.findFirst({ where: { userId: fixture.parent.id, workspaceId: fixture.workspaceId, source: 'GUARDIAN_PORTAL' } }); assert.equal(record?.acceptanceType, 'PRIVACY_ACKNOWLEDGED');
 });
 const staff = await operator.newPage(); currentPage = staff; staff.setDefaultNavigationTimeout(120000);
 await scenario('Operador: ficha, conferência, emissão, cancelar e atualização de contato', async () => {
  await staff.goto(origin + '/gym/students'); await acceptOwnPending(staff); await expect(staff.getByText('Dependente visual sintético', { exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Ações de Dependente visual sintético', exact: true }).click(); await staff.getByRole('menuitem', { name: 'Detalhes e edição' }).click();
  await expect(staff.getByText('Ingresso dos responsáveis', { exact: true })).toBeVisible();
  const card = staff.locator('[data-slot=card]').filter({ hasText: 'Ingresso dos responsáveis' });
  await expect(card.getByRole('button', { name: 'Emitir / reemitir convite' }).first()).toBeEnabled({ timeout: 60000 }); await card.scrollIntoViewIfNeeded(); await screenshot(staff, 'operador-desktop');
  const issuedCount = () => prisma.auditLog.count({ where: { entityId: fixture.workspaceId, action: { startsWith: 'GYM_GUARDIAN_INVITATION_ISSUED:' } } });
  const beforeCancel = await issuedCount();
  await card.getByRole('button', { name: 'Emitir / reemitir convite' }).first().click(); const dialog = staff.getByRole('dialog').filter({ hasText: 'Emitir convite do responsável?' });
  await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused(); await dialog.getByRole('button', { name: 'Cancelar' }).click(); await expect(dialog).toBeHidden(); assert.equal(await issuedCount(), beforeCancel);
  await card.getByRole('button', { name: 'Emitir / reemitir convite' }).first().click(); await dialog.getByRole('button', { name: 'Confirmar', exact: true }).click(); await expect(staff.getByLabel('Link de ingresso do responsável')).toBeVisible({ timeout: 60000 });
  await operator.grantPermissions(['clipboard-read', 'clipboard-write'], { origin }); await card.getByRole('button', { name: 'Copiar link' }).click();
  assert.equal(await staff.evaluate(() => navigator.clipboard.readText()), await staff.getByLabel('Link de ingresso do responsável').inputValue());
  const beforeContact = await prisma.gymGuardian.findUniqueOrThrow({ where: { id: fixture.pending.id } });
  await card.getByRole('button', { name: 'Atualizar e-mail' }).first().click(); const contact = staff.getByRole('dialog').filter({ hasText: 'Atualizar contato do responsável' });
  await contact.getByLabel('E-mail conferido do responsável').fill('visual-change@example.invalid'); await contact.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(staff.getByText('Conferência pendente', { exact: true })).toBeVisible({ timeout: 60000 });
  const afterContact = await prisma.gymGuardian.findUniqueOrThrow({ where: { id: fixture.pending.id } });
  for (const key of ['name', 'cpf', 'phone', 'relationship', 'guardianUserId', 'isLegalRepresentative', 'isFinancialResponsible', 'isEmergencyContact', 'hasHealthAccess']) assert.equal(afterContact[key], beforeContact[key], `Alterar e-mail modificou ${key}`);
  await expect(card.getByRole('button', { name: 'Emitir / reemitir convite' }).first()).toBeDisabled();
  await staff.setViewportSize({ width: 390, height: 844 });
  const cardSize = await card.evaluate(element => ({ height: element.clientHeight, contentHeight: element.scrollHeight }));
  report.viewportChecks.push({ label: 'responsaveis-sem-corte-vertical', ...cardSize });
  assert(cardSize.contentHeight <= cardSize.height + 1, 'O cartão de responsáveis está comprimido e corta seus controles');
  await card.getByRole('button', { name: 'Registrar conferência' }).first().scrollIntoViewIfNeeded(); await screenshot(staff, 'operador-mobile');
  await card.getByRole('button', { name: 'Registrar conferência' }).first().click(); const verification = staff.getByRole('dialog').filter({ hasText: 'Registrar conferência de representação' });
  await verification.getByLabel('Registro da conferência').fill('Nova conferência exclusivamente sintética de identidade adulta e representação.'); await verification.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(verification).toBeHidden({ timeout: 60000 }); await expect(card.getByRole('button', { name: 'Emitir / reemitir convite' }).first()).toBeEnabled();
 });
 await browser.close(); browser = null;
 assert.equal(report.browserErrors.length, 0, `Erros não tratados no navegador: ${report.browserErrors.join('; ')}`);
 report.success = true;
}
run().catch(error => { console.error(error.message); if (!report.failures.length) report.failures.push({ name: 'Preparação da revisão', message: error.message }); report.success = false; process.exitCode = 1; }).finally(async () => {
 if (browser) await browser.close(); await prisma.$disconnect(); report.finishedAt = new Date().toISOString();
 fs.writeFileSync(`${output}/result.json`, JSON.stringify(report, null, 2));
 fs.writeFileSync(`${outputRoot}/result.json`, JSON.stringify(report, null, 2));
 console.log(`Revisão no navegador: ${report.scenarios.filter(row => row.status === 'passed').length} passaram; ${report.failures.length} falhas. Artefato ${output}/result.json`);
});
