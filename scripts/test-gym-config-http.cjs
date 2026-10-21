require('./gym-check-runner.cjs')('http-config', ['--config', 'vitest.gym-http.config.ts', '--testNamePattern', 'configuração global confirma'], { GYM_HTTP_ORIGIN: 'http://127.0.0.1:31173' });
