const { spawnSync } = require('node:child_process');
const run = require('./gym-check-runner.cjs');
run('integracao-realtime-completa', ['--config', 'vitest.gym.config.ts']);
const integrationFailed = !!process.exitCode;
run('personal-entregas-realtime', ['--config', 'vitest.config.ts',
  'src/modules/payments/__tests__/financial.test.ts', 'src/modules/payments/__tests__/wallet-security.test.ts',
  'src/modules/payments/__tests__/abacatepay-recurrence.test.ts', 'src/modules/payments/__tests__/billing-state-machine.test.ts',
  'src/lib/privacy/__tests__/privacy-security.test.ts', 'src/lib/__tests__/workout-duplicate-checker.test.ts']);
const personalFailed = !!process.exitCode;
const http = spawnSync(process.execPath, ['scripts/gym-http-batches.cjs'], { stdio: 'inherit', windowsHide: true });
process.exitCode = integrationFailed || personalFailed || http.status !== 0 ? 1 : 0;
