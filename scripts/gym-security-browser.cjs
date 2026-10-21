const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), assert = require('node:assert/strict');
const esbuild = require('../.tmp/gym-realtime-runner/node_modules/esbuild');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const { expect } = require('../.tmp/gym-visual-runner/node_modules/playwright/test');
const folder = '.tmp/gym-stabilization/security-browser-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), scenarios: [], errors: [], screenshots: [], transport: 'Controlado; componentes React/Radix reais. Segurança do servidor verificada separadamente por HTTP/PostgreSQL.' };
let browser, server, mutations = 0, closures = [], phase = 0, blockers = true;
async function run() {
  const bundle = await esbuild.build({ entryPoints: ['tests/gym/security-browser.fixture.tsx'], bundle: true, platform: 'browser', format: 'iife', write: false, jsx: 'automatic', define: { 'process.env.NODE_ENV': '"development"' }, alias: { '@': path.resolve('src') } });
  server = http.createServer((request, response) => {
    if (request.url === '/fixture.js') { response.setHeader('Content-Type', 'text/javascript'); return response.end(bundle.outputFiles[0].text); }
    response.setHeader('Content-Type', 'text/html'); response.end('<html lang="pt-BR"><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); report.browser = browser.version(); page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/*', async route => {
    const url = new URL(route.request().url()); if (url.origin !== origin) return route.abort();
    const respond = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname === '/api/superadmin/security/reauthenticate') {
      const body = route.request().postDataJSON();
      if (body.password !== 'synthetic-password') return respond({ error: 'Senha inválida.' }, 401);
      if (phase === 0) { phase = 1; return respond({ success: false, step: 'EMAIL' }); }
      if (phase === 1) { assert.equal(body.code, '123456'); phase = 2; return respond({ success: false, step: 'TOTP' }); }
      assert.equal(body.totpCode, '654321'); return respond({ success: true, reauthenticationProof: 'a'.repeat(64) });
    }
    if (url.pathname === '/mutation') { assert.equal(route.request().postDataJSON().reauthenticationProof, 'a'.repeat(64)); mutations++; return respond({ success: true }); }
    if (url.pathname === '/api/gym/settings/closure') {
      if (route.request().method() === 'GET') return respond({ data: { alreadyClosed: false, canClose: !blockers, retained: { members: 3, contracts: 1, invoices: 1, files: 1, objects: 1 }, blockers: { externalEnrollments: blockers ? 1 : 0 } } });
      closures.push(route.request().postDataJSON()); if (closures.length === 1) return route.abort();
      assert.deepEqual(closures[0], closures[1]); return respond({ data: { receiptId: 'synthetic-receipt', alreadyClosed: true } });
    }
    return route.continue();
  });
  await page.goto(origin); await page.getByRole('button', { name: 'Alterar MFA', exact: true }).click(); await page.getByRole('button', { name: 'Continuar alteração' }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirmar alteração de segurança' }); await expect(dialog).toBeVisible();
  await dialog.getByLabel('Senha atual').fill('wrong'); await dialog.getByRole('button', { name: 'Confirmar identidade' }).click(); await expect(dialog.getByRole('alert')).toHaveText('Senha inválida.'); assert.equal(mutations, 0);
  await dialog.getByLabel('Senha atual').fill('synthetic-password'); await dialog.getByRole('button', { name: 'Confirmar identidade' }).click();
  await dialog.getByLabel('Código enviado ao e-mail').fill('123456'); await dialog.getByRole('button', { name: 'Confirmar identidade' }).click();
  await dialog.getByLabel('Código do autenticador atual ou backup').fill('654321'); await page.keyboard.press('Tab'); assert(await dialog.evaluate(element => element.contains(document.activeElement)));
  await dialog.getByRole('button', { name: 'Confirmar identidade' }).click(); await expect(page.locator('#result')).toHaveText('Alteração confirmada'); assert.equal(mutations, 1);
  report.scenarios.push('Dialog de reautenticação sobre confirmação: senha inválida não altera; senha/e-mail/TOTP e teclado liberam uma mutação com prova.');
  await page.getByRole('button', { name: 'Alterar MFA', exact: true }).click(); await page.getByRole('button', { name: 'Continuar alteração' }).click();
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click(); await expect(page.locator('#result')).toHaveText('Confirmação cancelada.'); assert.equal(mutations, 1); await page.getByRole('button', { name: 'Voltar', exact: true }).click();
  report.scenarios.push('Cancelar reautenticação mantém a operação sem executar e não deixa promessa pendente.');
  await page.getByRole('button', { name: 'Revisar encerramento' }).click(); const closure = page.getByRole('alertdialog', { name: 'Encerrar a academia?' }); await expect(closure.getByText('assinaturas externas de matrículas', { exact: true })).toBeVisible();
  await expect(closure.getByRole('button', { name: 'Confirmar encerramento' })).toBeDisabled(); await closure.getByRole('button', { name: 'Voltar' }).click(); blockers = false;
  report.scenarios.push('Encerramento exibe bloqueador externo e impede confirmação.');
  await page.getByRole('button', { name: 'Revisar encerramento' }).click(); await closure.getByLabel('Motivo do encerramento').fill('Encerramento sintético de navegador'); await closure.getByLabel('Digite academia-sintetica para confirmar').fill('academia-sintetica');
  await closure.getByRole('button', { name: 'Confirmar encerramento' }).click(); await expect(closure.getByRole('button', { name: 'Conferir mesma solicitação' })).toBeVisible(); await expect(closure.getByLabel('Motivo do encerramento')).toBeDisabled();
  await closure.getByRole('button', { name: 'Conferir mesma solicitação' }).click(); await expect(page.getByText(/Academia encerrada. Recibo:/)).toBeVisible(); assert.equal(closures.length, 2);
  report.scenarios.push('Resposta incerta trava dados; retry conserva UUID/corpo e confirma recibo sem segundo encerramento.');
  const shot = folder + '/security-mobile.png'; await page.screenshot({ path: shot, fullPage: true }); report.screenshots.push(shot);
  assert.deepEqual(report.errors, []); report.success = true;
}
run().catch(error => { report.success = false; report.failure = error.message; process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve)); report.finishedAt = new Date().toISOString();
  fs.writeFileSync(folder + '/report.json', JSON.stringify(report, null, 2)); fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-security-browser.json', JSON.stringify({ file: folder + '/report.json', ...report }, null, 2));
  console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, failure: report.failure, file: folder + '/report.json' }));
});
