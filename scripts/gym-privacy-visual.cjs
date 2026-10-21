const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const { expect: base } = require('../.tmp/gym-visual-runner/node_modules/playwright/test');
const expect = base.configure({ timeout: 60000 });
const origin = 'http://127.0.0.1:31173';
const fixture = JSON.parse(fs.readFileSync('.tmp/gym-stabilization/privacy-visual-fixture.json', 'utf8'));
const folder = '.tmp/gym-stabilization/privacy-visual/run-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), scenarios: [], screenshots: [], viewportChecks: [], errors: [] };
let browser, page;
async function shot(label) { const file = folder + '/' + label + '.png'; await page.screenshot({ path: file, fullPage: true }); report.screenshots.push(file); const size = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth })); report.viewportChecks.push({ label, ...size }); assert(size.scrollWidth <= size.width + 1, 'Overflow: ' + label); }
async function context(user, viewport) {
 const ctx = await browser.newContext({ viewport, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' });
 await ctx.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
 ctx.on('page', p => { p.setDefaultNavigationTimeout(120000); p.on('pageerror', e => report.errors.push(e.message.slice(0, 500))); });
 const csrf = await (await ctx.request.get(origin + '/api/auth/csrf')).json();
 await ctx.request.post(origin + '/api/auth/callback/credentials', { form: { email: user.email, password: fixture.password, csrfToken: csrf.csrfToken, callbackUrl: origin + '/select-workspace', authenticationProof: fixture.proofs[user.id] }, headers: { 'X-Auth-Return-Redirect': '1' } });
 const session = await (await ctx.request.get(origin + '/api/auth/session')).json(); assert.equal(session?.user?.id, user.id, 'Sessão sintética não validada');
 return ctx;
}
async function run() {
 browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true }); report.browser = browser.version();
 const parent = await context(fixture.parent, { width: 390, height: 844 });
 const operator = await context(fixture.owner, { width: 1440, height: 1000 }); await operator.addCookies([{ name: 'atlasfit_active_workspace_id', value: fixture.workspaceId, url: origin }]);
 page = await parent.newPage(); await page.goto(origin + fixture.invitationPath);
 await expect(page.getByText('Autorizar vínculo com academia', { exact: true })).toBeVisible();
 await expect(page.getByRole('button', { name: 'Autorizar meu vínculo' })).toBeVisible(); await shot('vinculo-mobile');
 await page.getByRole('button', { name: 'Autorizar meu vínculo' }).click(); await expect(page.getByText(/Autorização registrada/)).toBeVisible();
 report.scenarios.push('Vínculo existente: confirmação própria no celular');
 await page.goto(origin + '/guardian/dependents'); await page.getByRole('button', { name: 'Saúde e solicitações' }).click();
 const dialog = page.getByRole('dialog'); await expect(dialog.getByLabel('Condições e limitações informadas')).toHaveValue('Limitação exclusivamente sintética');
 assert(await dialog.getByLabel('Condições e limitações informadas').getAttribute('readonly') !== null);
 await dialog.getByLabel('Direito solicitado').selectOption('INFORMATION'); await dialog.getByLabel('Detalhes do pedido').fill('Pedido sintético realizado no navegador para verificar o fluxo do responsável.');
 await dialog.getByRole('button', { name: 'Enviar solicitação' }).click(); await expect(dialog.getByRole('status').filter({ hasText: 'Pedido registrado' })).toBeVisible();
 await shot('responsavel-saude-privacidade-mobile'); await page.keyboard.press('Tab'); assert(await dialog.evaluate(d => d.contains(document.activeElement))); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
 report.scenarios.push('Responsável: saúde somente leitura, solicitação real, foco e fechamento por teclado');
 page = await operator.newPage(); await page.goto(origin + '/gym/settings');
 const tab = page.getByRole('tab').filter({ hasText: /LGPD|Privacidade/ }); await tab.click();
 await expect(page.getByText('Atendimento de solicitações de privacidade')).toBeVisible();
 const row = page.locator('div.rounded-xl.border.p-3').filter({ hasText: 'Acesso aos dados' }); await row.getByRole('button', { name: 'Atender pedido' }).click();
 await page.getByRole('button', { name: 'Iniciar revisão' }).click(); await row.getByRole('button', { name: 'Atender pedido' }).click();
 const downloading = page.waitForEvent('download'); await page.getByRole('button', { name: 'Gerar pacote com anexos' }).click(); const download = await downloading; await download.saveAs(folder + '/dossier-sintetico.json');
 const dossier = JSON.parse(fs.readFileSync(folder + '/dossier-sintetico.json', 'utf8')); assert.equal(dossier.exportMetadata.requestId, fixture.requestId); assert.equal(dossier.attachmentManifest.complete, true); assert(!JSON.stringify(dossier).includes(fixture.password));
 await expect(row.getByText(/Concluído/)).toBeVisible(); await shot('fila-privacidade-desktop'); await page.setViewportSize({ width: 390, height: 844 }); await shot('fila-privacidade-mobile');
 report.scenarios.push('Gestão: revisão, download completo e encerramento real do pedido em desktop e celular');
 assert.equal(report.errors.length, 0, 'Erros de execução no navegador'); report.success = true;
}
run().catch(async error => { report.success = false; report.failure = error.message; if (page) await page.screenshot({ path: folder + '/failure.png', fullPage: true }).catch(() => {}); process.exitCode = 1; }).finally(async () => { report.finishedAt = new Date().toISOString(); fs.writeFileSync(folder + '/report.json', JSON.stringify(report, null, 2)); fs.writeFileSync('.tmp/gym-stabilization/privacy-visual-latest.json', JSON.stringify({ file: folder + '/report.json', ...report }, null, 2)); if (browser) await browser.close(); console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, failure: report.failure, report: folder + '/report.json' })); });
