const origin = 'http://127.0.0.1:31173';
const routes = ['change-plan', 'activate', 'pause', 'resume', 'cancel', 'cancel/withdraw', 'renew'];
async function main() {
 for (const route of ['/api/auth/csrf', '/api/auth/session']) {
  const res = await fetch(origin + route, { signal: AbortSignal.timeout(180000) }); await res.text(); console.log('Autenticação sem sessão: ' + route + ' HTTP ' + res.status);
 }
 for (const operation of routes) {
  const res = await fetch(origin + '/api/gym/enrollments/synthetic-warm-invalid/' + operation, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(180000) });
  await res.text(); console.log('Aquecimento sem matrícula: ' + operation + ' HTTP ' + res.status);
 }
 for (const route of ['/api/gym/finance/payments', '/api/gym/reviews/CONTRACT/synthetic-warm-invalid', '/api/gym/reviews/ACCOUNT/synthetic-warm-invalid']) {
  const res = await fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(180000) }); await res.text(); console.log('Aquecimento sem dados: ' + route + ' HTTP ' + res.status);
 }
 for (const route of ['/student/contracts', '/gym/plans']) { const res = await fetch(origin + route, { redirect: 'manual', signal: AbortSignal.timeout(180000) }); await res.text(); console.log('Página sem sessão: ' + route + ' HTTP ' + res.status); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
