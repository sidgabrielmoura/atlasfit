const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('../.tmp/gym-realtime-runner/node_modules/esbuild');
const { chromium } = require('../.tmp/gym-visual-runner/node_modules/playwright');
const folder = '.tmp/gym-stabilization/realtime-browser-' + Date.now(); fs.mkdirSync(folder, { recursive: true });
const report = { startedAt: new Date().toISOString(), scenarios: [], errors: [], externalRequests: [], provider: 'Mock controlado; componente React e stores reais.' };
let browser, server;
async function run() {
  const bundle = await esbuild.build({ entryPoints: ['tests/gym/realtime-provider.fixture.tsx'], bundle: true, platform: 'browser', format: 'iife', write: false,
    define: { 'process.env.NODE_ENV': '"development"' }, alias: { '@': path.resolve('src') },
    plugins: [{ name: 'controlled-provider', setup(build) {
      build.onResolve({ filter: /^ably$/ }, () => ({ path: path.resolve('tests/gym/realtime-client.fixture.ts') }));
      build.onResolve({ filter: /^(next-auth\/react|sonner|.*audio\/sound-alert)$/ }, args => ({ path: args.path, namespace: 'test-mock' }));
      build.onLoad({ filter: /.*/, namespace: 'test-mock' }, args => ({ loader: 'js', resolveDir: process.cwd(), contents:
        args.path === 'next-auth/react' ? 'export const useSession = () => ({ data: { user: { id: "synthetic", name: "Sintético" } } });'
        : args.path === 'sonner' ? 'export const toast = {success:()=>{},error:()=>{}};'
        : 'export const playRestChimeSound = () => {};'
      }));
    } }],
  });
  const init = `window.__realtimeTest={clients:[],authorizations:[],presence:[],contexts:[]};window.fetch=async()=>new Response(JSON.stringify([{id:'contact'}]),{status:200});`;
  server = http.createServer((req, res) => {
    if (req.url === '/fixture.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(bundle.outputFiles[0].text); }
    else { res.setHeader('Content-Type', 'text/html'); res.end('<html lang="pt-BR"><body><div id="root"></div><script>' + init + '</script><script src="/fixture.js"></script></body></html>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage(); report.browser = browser.version();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    report.externalRequests.push(new URL(route.request().url()).origin); return route.abort();
  });
  await page.goto(origin); await page.waitForFunction(() => window.__realtimeTest.clients.length === 1);
  assert.equal(await page.locator('#client').textContent(), 'none');
  await page.evaluate(() => window.__realtimeTest.authorizations[0].resolve());
  await page.waitForFunction(() => document.getElementById('client').textContent === '1');
  await page.waitForFunction(() => window.__realtimeTest.presence.length > 0);
  assert.equal(await page.evaluate(() => window.__realtimeTest.clients[0].options.autoConnect), false);
  report.scenarios.push('Contexto React permanece null até autorizar e notifica consumidor após obter cliente.');
  await page.evaluate(() => window.__realtimeTest.select('B', 'GYM'));
  await page.waitForFunction(() => window.__realtimeTest.clients.length === 2);
  assert.equal(await page.locator('#client').textContent(), 'none');
  assert.equal(await page.evaluate(() => window.__realtimeTest.clients[0].closed), true);
  await page.evaluate(() => {
    const h = window.__realtimeTest;
    h.clients[0].channels.get('user:synthetic:workspace:A:chat').emit('conversation:new', { id: 'late-A', workspaceId: 'A' }, true);
    h.presence[0].resolve([{ clientId: 'late-A' }]);
  });
  await page.waitForTimeout(30);
  assert.deepEqual(await page.evaluate(() => ({ conversations: window.__realtimeTest.store.conversations.length, presence: Object.keys(window.__realtimeTest.store.presence) })), { conversations: 0, presence: [] });
  report.scenarios.push('Troca fecha conexão anterior, mascara contexto e descarta mensagem/presença tardias.');
  await page.evaluate(() => window.__realtimeTest.select('A'));
  await page.waitForFunction(() => window.__realtimeTest.clients.length === 3);
  assert.equal(await page.locator('#client').textContent(), 'none', 'Returning to A must not expose its old closed client.');
  await page.evaluate(() => window.__realtimeTest.authorizations[2].resolve());
  await page.waitForFunction(() => document.getElementById('client').textContent === '3');
  await page.evaluate(() => window.__realtimeTest.authorizations[1].resolve());
  await page.waitForTimeout(30);
  assert.equal(await page.locator('#client').textContent(), '3');
  assert.equal(await page.evaluate(() => window.__realtimeTest.clients[1].closed), true);
  await page.evaluate(() => {
    const h = window.__realtimeTest, channel = h.clients[2].channels.get('user:synthetic:workspace:A:chat');
    channel.emit('conversation:new', { id: 'foreign-B', workspaceId: 'B' });
    channel.emit('conversation:new', { id: 'valid-A', workspaceId: 'A' });
  });
  assert.deepEqual(await page.evaluate(() => window.__realtimeTest.store.conversations.map(item => item.id)), ['valid-A']);
  report.scenarios.push('Retorno rápido A/B/A não expõe o cliente A fechado; autorização fora de ordem não ressuscita B e evento estrangeiro é descartado.');
  await page.evaluate(() => window.__realtimeTest.select('D'));
  await page.waitForFunction(() => window.__realtimeTest.clients.length === 4);
  await page.evaluate(() => window.__realtimeTest.authorizations[3].reject(new Error('Synthetic auth failure')));
  await page.waitForFunction(() => window.__realtimeTest.clients[3].closed);
  assert.equal(await page.locator('#client').textContent(), 'none');
  report.scenarios.push('Falha de autorização fecha cliente e não disponibiliza conexão com permissões antigas.');
  await page.evaluate(() => window.__realtimeTest.select('E'));
  await page.waitForFunction(() => window.__realtimeTest.clients.length === 5);
  await page.evaluate(() => window.__realtimeTest.unmount());
  await page.evaluate(() => window.__realtimeTest.authorizations[4].resolve());
  await page.waitForTimeout(30);
  assert.equal(await page.evaluate(() => window.__realtimeTest.clients.every(client => client.closed)), true);
  assert.equal(await page.evaluate(() => window.__realtimeTest.contexts.includes(5)), false);
  report.scenarios.push('Desmontagem fecha todos os clientes e descarta autorização pendente.');
  assert.deepEqual(report.errors, []); assert.deepEqual(report.externalRequests, []); report.success = true;
}
run().catch(error => { report.success = false; report.failure = error.message; process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(folder + '/report.json', JSON.stringify(report, null, 2));
  fs.writeFileSync('docs/audits/academias/estabilizacao/verificacoes-realtime-browser.json', JSON.stringify({ file: folder + '/report.json', ...report }, null, 2));
  console.log(JSON.stringify({ success: report.success, scenarios: report.scenarios.length, failure: report.failure, file: folder + '/report.json' }));
});
