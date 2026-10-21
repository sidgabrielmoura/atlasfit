require('./gym-check-runner.cjs')('http', ['--config', 'vitest.gym-http.config.ts'], { GYM_HTTP_ORIGIN: 'http://127.0.0.1:31173' });
