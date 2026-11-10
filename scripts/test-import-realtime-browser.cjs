// Browser regression using the real components and a deterministic Ably transport.
// No credentials, external services or database are used.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('../.tmp/gym-realtime-runner/node_modules/esbuild');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const { expect } = require('../.tmp/gym-visual-runner/node_modules/playwright/test');
const output = path.resolve('.tmp/import-realtime-browser');
fs.mkdirSync(output, { recursive: true });
const report = { synthetic: true, scenarios: [], errors: [] };
let browser, server;
(async () => {
  await esbuild.build({ entryPoints: ['tests/migration-realtime/browser.fixture.tsx'], outfile: path.join(output, 'app.js'), bundle: true, jsx: 'automatic', platform: 'browser', define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [{ name: 'test-context', setup(build) {
      build.onResolve({ filter: /^(next\/link|next\/navigation|next-auth\/react|@\/providers\/ably-provider)$/ }, args => ({ path: args.path, namespace: 'test-context' }));
      build.onLoad({ filter: /.*/, namespace: 'test-context' }, args => ({ resolveDir: process.cwd(), loader: 'tsx', contents:
        args.path === 'next/link' ? 'import React from "react"; export default function Link({href,children,...props}) {return <a href={href} {...props} onClick={e=>{if(href.startsWith("/gym/import/job-test")){e.preventDefault();window.mount("review")}}}>{children}</a>}' :
        args.path === 'next/navigation' ? 'export const useRouter=()=>({push:()=>{},refresh:()=>{throw Error("Unexpected router refresh")}}); export const usePathname=()=>"/gym/import";' :
        args.path === 'next-auth/react' ? 'export const useSession=()=>({data:{user:{id:"owner-test"}}});' : 'export const useAbly=()=>window.fakeAbly; export const useAblyCapability=()=>window.fakeAbly.auth.tokenDetails.capability;' }));
    } }] });
  server = http.createServer((req, res) => {
    if (req.url === '/styles.css') {
      res.setHeader('Content-Type', 'text/css');
      const chunks = path.resolve('.tmp/gym-fixes/build/static/chunks');
      return res.end(fs.readdirSync(chunks).filter(file=>file.endsWith('.css')).map(file=>fs.readFileSync(path.join(chunks,file),'utf8')).join('\n'));
    }
    res.setHeader('Content-Type', req.url === '/app.js' ? 'application/javascript' : 'text/html');
    res.end(req.url === '/app.js' ? fs.readFileSync(path.join(output, 'app.js')) : '<!doctype html><html class="dark" style="--font-sans:Arial,sans-serif;--font-heading:Arial,sans-serif;font-family:Arial,sans-serif"><meta charset="utf-8"><link rel="stylesheet" href="/styles.css"><body><div id="root"></div><script src="/app.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  await page.goto(origin);
  await expect(page.getByText('Texto bruto', { exact: true })).toBeVisible();
  await expect(page.getByText('1000 coins', { exact: true })).toBeVisible();
  await page.evaluate(() => { window.originalCard = document.querySelector('[data-slot="card"]'); });
  const initialRequests = await page.evaluate(() => window.requests.length);
  await page.waitForTimeout(4200);
  assert.equal(await page.evaluate(() => window.requests.length), initialRequests, 'Active processing must not poll');
  await page.evaluate(() => {
    window.publish('job_updated', { jobId: 'job-test', status: 'PROCESSING', progressPercentage: 62, creditsConsumed: 17, progressMessage: 'Etapa ao vivo' });
    window.publish('import:credits_updated', { workspaceId: 'workspace-test', quotaBalance: { allowed: true, remaining: 983, quotaUsed: 0, quotaTotal: 0, credits: 983 } });
  });
  await expect(page.getByText('983 coins', { exact: true })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '62');
  assert.equal(await page.evaluate(() => window.requests.length), initialRequests, 'Events update state directly');
  assert(await page.evaluate(() => window.originalCard === document.querySelector('[data-slot="card"]')));
  assert.equal(await page.locator('[data-slot="skeleton"]').count(), 0);
  report.scenarios.push('Progresso, consumo e saldo atualizam sem polling, skeletons ou remontagem dos cards.');

  await page.evaluate(() => { window.hold(); window.reconnect(); });
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    window.publish('job_updated', { jobId: 'job-test', status: 'PROCESSING', progressPercentage: 78, creditsConsumed: 30 });
    window.publish('import:credits_updated', { workspaceId: 'workspace-test', quotaBalance: { allowed: true, remaining: 970, quotaUsed: 0, quotaTotal: 0, credits: 970 } });
    window.release();
  });
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '78');
  await expect(page.getByText('970 coins', { exact: true })).toBeVisible();
  await page.waitForTimeout(100);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '78');
  assert.equal(await page.locator('[data-slot="skeleton"]').count(), 0);
  const reconnectedRequests = await page.evaluate(() => window.requests.length);
  await page.evaluate(() => window.reconnect(true));
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.requests.length), reconnectedRequests);
  report.scenarios.push('Reconexão sem continuidade sincroniza discretamente; HTTP atrasado não sobrescreve eventos novos.');

  await page.evaluate(() => window.mount('review'));
  await expect(page.getByText('Pessoa Teste', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  const nameInput = page.getByRole('dialog').getByRole('textbox').first();
  await nameInput.fill('Edição preservada');
  const reviewRequests = await page.evaluate(() => window.requests.length);
  await page.waitForTimeout(4200);
  assert.equal(await page.evaluate(() => window.requests.length), reviewRequests, 'Review must not poll');
  await page.evaluate(() => window.publish('job_updated', { jobId: 'job-test', status: 'PROCESSING', progressPercentage: 88, creditsConsumed: 35 }));
  await expect(page.getByText(/Processando arquivos de importação.*88%/)).toBeVisible();
  await expect(nameInput).toHaveValue('Edição preservada');
  await page.evaluate(() => window.publish('job_updated', { jobId: 'job-test', status: 'REVIEW', progressPercentage: 100, creditsConsumed: 35, totalStudents: 1, totalWorkouts: 0 }));
  await expect(page.getByText(/Processando arquivos de importação/)).toHaveCount(0);
  await expect(nameInput).toHaveValue('Edição preservada');
  const afterReviewRequests = await page.evaluate(() => window.requests.length);
  await page.evaluate(() => window.publish('job_updated', { jobId: 'job-test', status: 'REVIEW', progressPercentage: 100, creditsConsumed: 35, totalStudents: 1, totalWorkouts: 0 }));
  await page.waitForTimeout(100);
  assert.equal(await page.evaluate(() => window.requests.length), afterReviewRequests, 'Duplicate terminal event must not refetch records');
  report.scenarios.push('Revisão mantém modal e texto digitado, atualiza o status ao vivo e ignora conclusões duplicadas.');
  await page.evaluate(() => { window.prepareCommit(); window.mount('dashboard'); });
  await expect(page.getByText('Texto bruto', { exact: true })).toBeVisible();
  await page.evaluate(() => window.mount('review'));
  await expect(page.getByText('Aluno com pendência', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Finalizar Importação', exact: true }).first().click();
  await page.getByRole('button', { name: 'Confirmar Importação', exact: true }).click();
  const floating = page.getByRole('complementary', { name: 'Progresso da criação de alunos' });
  await expect(floating.getByText('Criação de alunos em andamento', { exact: true })).toBeVisible();
  await page.evaluate(() => window.commitEvent({ type: 'progress', total: 3, processed: 1, succeeded: 1, failed: 0, recordIds: ['commit-record-0'] }));
  await expect(floating.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  assert(await floating.evaluate(element => element.getBoundingClientRect().width >= 300), 'Floating card must have readable width');
  await page.evaluate(() => window.mount('dashboard'));
  await expect(page.getByText('Texto bruto', { exact: true })).toBeVisible();
  await expect(floating.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  const whileCreating = await page.evaluate(() => window.requests.length);
  await page.waitForTimeout(4200);
  assert.equal(await page.evaluate(() => window.requests.length), whileCreating, 'Creation must not poll');
  await page.screenshot({ path: path.join(output, 'commit-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(floating).toBeVisible();
  assert(await floating.evaluate(element => element.getBoundingClientRect().right <= innerWidth && element.getBoundingClientRect().left >= 0));
  await page.screenshot({ path: path.join(output, 'commit-mobile.png'), fullPage: true });
  await page.evaluate(() => {
    const failure = { recordIds: ['commit-record-1'], recordId: 'commit-record-1', name: 'Aluno com pendência', code: 'INVALID_REQUEST', message: 'Data de nascimento válida é obrigatória.' };
    window.commitEvent({ type: 'progress', total: 3, processed: 2, succeeded: 1, failed: 1, recordIds: ['commit-record-1'], failure });
    window.commitEvent({ type: 'progress', total: 3, processed: 3, succeeded: 2, failed: 1, recordIds: ['commit-record-2'] });
    window.commitEvent({ type: 'finished', result: { success: false, status: 'PARTIAL', total: 3, processed: 3, succeeded: 2, failed: 1, interrupted: false, failures: [failure] } });
  });
  await expect(floating.getByText('Criação finalizada com pendências', { exact: true })).toBeVisible();
  assert.equal(await page.evaluate(() => window.requests.filter(url => url.endsWith('/commit')).length), 1, 'Exactly one confirmation request');
  await floating.getByRole('link', { name: 'Revisar pendências' }).click();
  await expect(page.getByText('Aluno com pendência', { exact: true })).toBeVisible();
  await expect(page.getByText('Data de nascimento válida é obrigatória.', { exact: true })).toBeVisible();
  await expect(page.getByText('Aluno concluído', { exact: true })).toHaveCount(0);
  await expect(page.getByText('[object Object]', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await page.locator('#migration-birth-date').fill('1991-01-15');
  await page.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
  await expect(page.getByText('Data de nascimento válida é obrigatória.', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Todos', exact: true }).click();
  await expect(page.getByText('Data de nascimento válida é obrigatória.', { exact: true })).toHaveCount(0);
  report.scenarios.push('Uma única confirmação transmite progresso, mantém o card ao navegar e não consulta a API durante a criação.');
  report.scenarios.push('Card responsivo mostra conclusão parcial, exibe os registros com erro e conserva a correção após recarregar os dados.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { window.prepareCatalogReview(); window.mount('dashboard'); });
  await expect(page.getByText('Texto bruto', { exact: true })).toBeVisible();
  await page.evaluate(() => window.mount('review'));
  await expect(page.getByText('Treino com vínculos pendentes', { exact: true })).toBeVisible();
  const beforeMatches = await page.evaluate(() => window.requests.filter(url => url.includes('/workouts/exercises')).length);
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await expect(page.getByRole('dialog').getByRole('combobox')).toHaveCount(1); // Only the workout day remains a select.
  await expect(page.getByLabel('Exercício vinculado 1', { exact: true })).toHaveText('Supino reto com barra');
  await expect(page.getByLabel('Exercício vinculado 2', { exact: true })).toHaveText('Tríceps no pulley');
  assert.equal(await page.evaluate(() => window.requests.filter(url => url.includes('/workouts/exercises')).length), beforeMatches + 1, 'All names must be resolved in one request');
  await page.getByRole('button', { name: 'Remover vínculo do exercício 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Solicitar exercício 2', exact: true })).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.getByLabel('Exercício vinculado 2', { exact: true })).toHaveCount(0);
  assert.equal(await page.evaluate(() => window.requests.filter(url => url.includes('/workouts/exercises')).length), beforeMatches + 1, 'Removed links must not be recreated automatically');
  await page.getByRole('button', { name: 'Solicitar exercício 2', exact: true }).click();
  await expect(page.getByText('Exercício solicitado', { exact: true })).toBeVisible();
  await page.screenshot({ path: path.join(output, 'exercise-auto-links.png'), fullPage: true });
  await page.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
  const linked = await page.evaluate(() => window.getDraftRecords()[0].normalizedData.exercises);
  assert.equal(linked[0].matchedExerciseId, 'catalog-bench');
  assert.equal(linked[1].matchedExerciseId, null);
  assert.equal(linked[1].isRequestedOfficial, true);
  assert.equal(linked[1].catalogLinkRemoved, true);
  await page.getByRole('button', { name: 'Editar', exact: true }).first().click();
  await expect(page.getByText('Exercício solicitado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remover vínculo do exercício 1', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar Alterações', exact: true }).click();
  const customized = await page.evaluate(() => window.getDraftRecords()[0].normalizedData.exercises);
  assert.equal(customized[0].matchedExerciseId, null);
  assert.equal(customized[0].isRequestedOfficial, false);
  report.scenarios.push('Vínculos automáticos em lote substituem os seletores; remover preserva a escolha e solicitar mantém o exercício personalizado.');
  assert.deepEqual(report.errors, []);
  report.success = true;
})().catch(error => { report.success = false; report.failure = error.stack; process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
});
