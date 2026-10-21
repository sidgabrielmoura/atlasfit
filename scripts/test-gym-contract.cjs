const { spawnSync } = require('node:child_process');
const runCheck = require('./gym-check-runner.cjs');

// These suites publish synthetic legal documents in the same disposable database.
// Complete database/HTTP checks before preparing browser accounts and their acceptances.
function check(label, args, environment) {
  runCheck(label, args, environment);
  if (process.exitCode) process.exit(process.exitCode);
}
function script(file, args = []) {
  const result = spawnSync(process.execPath, [file, ...args], { stdio: 'inherit', windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

check('contract-complete-final', ['--config', 'vitest.gym.config.ts']);
check('contract-http-final-verified', ['--config', 'vitest.gym-http.config.ts', 'tests/gym/http.spec.ts', '-t', 'HTTP passo 3 completo'], { GYM_HTTP_ORIGIN: 'http://127.0.0.1:31173' });
check('contract-browser-fixture-final', ['--config', 'vitest.gym-contract-visual.config.ts']);
script('scripts/gym-contract-visual.cjs');
script('scripts/gym-verify-source.cjs', ['contract-types-final']);
script('scripts/gym-record-transitions.cjs');
script('scripts/gym-stabilization-report.cjs');
script('scripts/gym-remaining-report.cjs');
script('scripts/gym-validate-progress.cjs');
