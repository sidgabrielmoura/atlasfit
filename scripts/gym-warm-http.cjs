// Compile only the isolated development routes. Anonymous requests must never invoke domain/external operations.
const origin = 'http://127.0.0.1:31173';
const routes = [
 '/api/auth/session', '/api/gym/import/preview', '/api/gym/import/commit',
 '/api/personal/migration?workspaceId=warmup', '/api/personal/migration/warmup',
 '/api/personal/migration/warmup/records', '/api/personal/migration/warmup/records/warmup',
 '/api/personal/migration/warmup/preview', '/api/personal/migration/warmup/process',
 '/api/personal/migration/warmup/commit', '/api/personal/migration/warmup/upload',
];
(async () => {
 for(const route of routes) {
  const start=Date.now(); const response=await fetch(origin+route,{redirect:'manual',signal:AbortSignal.timeout(60000)});
  await response.arrayBuffer();
  if(![200,401,405].includes(response.status)) throw Error(`Preparação local retornou HTTP ${response.status}: ${route}`);
  console.log(`${route}: HTTP ${response.status}, ${Date.now()-start} ms (inclui compilação dev).`);
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
