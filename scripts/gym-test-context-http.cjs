// Run against the explicitly owned isolated Next server while its runner drains logs.
require('./gym-check-runner.cjs')('contexto-http', ['--config', 'vitest.gym-http.config.ts', '-t', 'HTTP contexto PERSONAL e trial'], { GYM_HTTP_ORIGIN: 'http://127.0.0.1:31173' });
