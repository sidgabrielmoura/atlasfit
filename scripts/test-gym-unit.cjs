require('./gym-check-runner.cjs')('finalizar-unitarios', ['--config', 'vitest.config.ts', '--no-file-parallelism', ...process.argv.slice(2)]);
