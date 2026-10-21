const fs = require('node:fs'), dotenv = require('dotenv');
const configured = dotenv.parse(fs.readFileSync('.env'));
const keys = ['RESEND_API_KEY', 'EMAIL_FROM', 'RESEND_FROM_EMAIL'];
const additions = Object.fromEntries(keys.filter(key => configured[key]).map(key => [key, configured[key]]));
require('./gym-check-runner.cjs')('student-invitation-resend', ['--config', 'vitest.services.config.ts', 'tests/services/student-invitation.external.ts'], { ...additions, GYM_EXTERNAL_SMOKE: 'authorized-20261007', ASAAS_API_KEY: '' });
const reportFile = 'docs/audits/academias/estabilizacao/verificacoes-isoladas.json', report = JSON.parse(fs.readFileSync(reportFile, 'utf8')), file = report['student-invitation-resend']?.rawFile;
if (file) {
  let raw = fs.readFileSync(file, 'utf8');
  for (const secret of Object.values(configured).filter(value => value.length > 5)) raw = raw.split(secret).join('[redacted]');
  raw = raw.replace(/gym_[a-f0-9]{64}/g, '[redacted-token]'); fs.writeFileSync(file, raw);
}
