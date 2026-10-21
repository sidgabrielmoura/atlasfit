require('./gym-check-runner.cjs')('postgresql-setup', ['--config', 'vitest.gym.config.ts', 'tests/gym/password-setup.integration.ts', 'tests/gym/minor-account.integration.ts']);
