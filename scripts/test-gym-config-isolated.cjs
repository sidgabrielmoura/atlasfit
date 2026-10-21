require('./gym-check-runner.cjs')('postgresql-config', ['--config', 'vitest.gym.config.ts', 'tests/gym/global-configuration.integration.ts', 'tests/gym/workout-integrity.integration.ts']);
