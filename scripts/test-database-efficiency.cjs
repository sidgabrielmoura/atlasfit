// Explicit isolated target and empty external-provider credentials. Never inherit .env targets.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const allowed = ['PATH','Path','SystemRoot','WINDIR','TEMP','TMP','COMSPEC','PATHEXT','NUMBER_OF_PROCESSORS','PROCESSOR_ARCHITECTURE','USERPROFILE','LOCALAPPDATA','APPDATA'];
const env = Object.fromEntries(allowed.filter(key => process.env[key] !== undefined).map(key => [key, process.env[key]]));
Object.assign(env, { NODE_ENV: 'test', DATABASE_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001', DIRECT_URL: 'postgresql://atlasfit_test@127.0.0.1:56432/atlasfit_gym_stabilization_20261001', AUTH_SECRET: 'isolated-database-efficiency-test-secret-32-characters', ABACATEPAY_WEBHOOK_SECRET: 'isolated-webhook-only', ABLY_API_KEY: '', RESEND_API_KEY: '', ASAAS_API_KEY: '', CLOUDFLARE_ID_TOKEN_ACCESS: '', CLOUDFLARE_TOKEN_VALUE: '', CLOUDFLARE_SECRET_ACCESS_KEY: '', NEXT_TELEMETRY_DISABLED: '1' });
fs.mkdirSync('.tmp', { recursive: true });
const config = process.argv.includes('--unit') ? 'vitest.config.ts' : 'vitest.gym.config.ts';
const extras = process.argv.slice(2).filter(value => value !== '--unit');
const files = extras.length ? extras : config === 'vitest.config.ts' ? [] : ['tests/gym/database-efficiency.integration.ts','tests/gym/database-efficiency-volume.integration.ts','tests/gym/report-scope.integration.ts','tests/gym/report-temporal.integration.ts','tests/gym/realtime-scope.integration.ts','tests/gym/session-revocation.integration.ts','tests/gym/enrollment-pause.integration.ts','tests/gym/notification-delivery.integration.ts'];
const label = config === 'vitest.config.ts' ? 'unit' : 'integration';
const args = ['node_modules/vitest/vitest.mjs','run','--config',config,'--no-file-parallelism',...files,'--reporter=json',`--outputFile=.tmp/database-efficiency-${label}.json`];
const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
process.exitCode = result.status ?? 1;
