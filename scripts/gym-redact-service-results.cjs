const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const configured = dotenv.parse(fs.readFileSync('.env'));
for (const filename of fs.readdirSync('.tmp/gym-stabilization').filter(name => /^(servicos-externos|realtime-externo)-/.test(name) && name.endsWith('-raw.json'))) {
  const file = path.join('.tmp/gym-stabilization', filename);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  function redact(value) {
    if (typeof value === 'string') {
      for (const secret of Object.values(configured).filter(item => item.length > 5)) value = value.split(secret).join('[redacted]');
      return value.replace(/https?:[^\s"<>]+/g, '[redacted-url]');
    }
    if (Array.isArray(value)) return value.map(redact);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
    return value;
  }
  const safe = redact(raw);
  fs.writeFileSync(file, JSON.stringify(safe, null, 2));
  if (process.argv.includes('--show-failures')) for (const suite of safe.testResults) for (const test of suite.assertionResults) if (test.status === 'failed') console.log(JSON.stringify({ file: filename, test: test.title, errors: test.failureMessages.map(message => message.slice(0, 750)) }));
}
