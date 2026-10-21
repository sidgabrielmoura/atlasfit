const fs = require('node:fs');
const dotenv = require('dotenv');
const run = require('./gym-check-runner.cjs');
const configured = dotenv.parse(fs.readFileSync('.env'));
run('realtime-externo', ['--config', 'vitest.services.config.ts', 'tests/services/realtime.external.ts'], {
  ABLY_API_KEY: configured.ABLY_API_KEY || '', GYM_EXTERNAL_SMOKE: 'authorized-20261007', ASAAS_API_KEY: '', ASAAS_MASTER_WALLET_ID: '',
});
require('./gym-redact-service-results.cjs');
