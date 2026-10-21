const fs = require('node:fs');
const dotenv = require('dotenv');
const run = require('./gym-check-runner.cjs');
const configured = dotenv.parse(fs.readFileSync('.env'));
const keys = ['CLOUDFLARE_ID_TOKEN_ACCESS', 'CLOUDFLARE_TOKEN_VALUE', 'CLOUDFLARE_SECRET_ACCESS_KEY', 'CLOUDFLARE_R2_BUCKET', 'ABLY_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'RESEND_FROM_EMAIL'];
const additions = Object.fromEntries(keys.filter(key => configured[key]).map(key => [key, configured[key]]));
// Real providers, synthetic disposable database. No customer messages or money commands.
run('servicos-externos', ['--config', 'vitest.services.config.ts'], { ...additions, GYM_EXTERNAL_SMOKE: 'authorized-20261007', ASAAS_API_KEY: '', ASAAS_MASTER_WALLET_ID: '' });
require('./gym-redact-service-results.cjs');
