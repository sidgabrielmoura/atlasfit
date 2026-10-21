// Read-only warm-up of the two protected pages before the active browser loads
// shared development chunks. The final browser independently checks redirects.
(async () => {
  for (const route of ['/superadmin/dashboard', '/guardian/dependents']) {
    const response = await fetch('http://127.0.0.1:31173' + route, { signal: AbortSignal.timeout(180000) });
    await response.text();
    if (response.status !== 200) throw new Error('Protected route warm-up failed: ' + route);
    console.log(JSON.stringify({ route, status: response.status, target: new URL(response.url).pathname }));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
