require('./gym-check-runner.cjs')('personal-shared-unit', ['--config', 'vitest.config.ts',
 'src/modules/payments/__tests__/financial.test.ts',
 'src/modules/payments/__tests__/wallet-security.test.ts',
 'src/modules/payments/__tests__/abacatepay-recurrence.test.ts',
 'src/modules/payments/__tests__/billing-state-machine.test.ts',
 'src/lib/privacy/__tests__/privacy-security.test.ts',
 'src/lib/__tests__/workout-duplicate-checker.test.ts',
]);
