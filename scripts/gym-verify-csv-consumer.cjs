const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const native = read('.tmp/gym-csv-consumer/latest.json');
assert.equal(native.success, true); assert.equal(native.conversions.length, 6);
const folder = path.dirname(native.file), cells = read(folder + '/cells.json');
const expected = read('.tmp/gym-csv-consumer/expected.json');
const checks = [];
for (const kind of ['students', 'invoices']) {
  const stages = ['opened', 'reopened'].map(stage => cells.files.find(file => file.kind === kind && file.stage === stage));
  for (const file of stages) {
    assert.equal(file.rows.length, expected.length + 1);
    assert.ok(file.rows.every(row => row.length === 9));
    assert.ok(file.rows.flat().every(cell => !cell.formula), 'Formula evaluated in native consumer');
    for (const item of expected) {
      const row = file.rows.find(row => row[0].text === item.id); assert.ok(row, item.id);
      const name = row[kind === 'students' ? 1 : 3];
      assert.equal(name.type, 'string');
      // Calc normalizes CR/LF in text paragraphs; the protective prefix must survive.
      assert.equal(name.text.replace(/[\r\n]/g, ''), (item.name.startsWith('Nome') ? item.name : "'\t" + item.name).replace(/[\r\n]/g, ''));
      assert.equal(row[kind === 'students' ? 5 : 2].text, item.date);
      if (kind === 'students') {
        assert.equal(row[3].type, 'string'); assert.equal(row[3].text, "'\t+5500000000000");
      } else {
        const cents = BigInt(item.amountInCents), decimal = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
        for (const column of [5, 7]) {
          if (item.amountInCents.length > 15) {
            assert.equal(row[column].type, 'string'); assert.equal(row[column].text, "'\t" + decimal);
          } else {
            assert.equal(row[column].type, 'float'); assert.equal(row[column].value, decimal);
          }
        }
        assert.equal(row[6].value, '0');
      }
    }
    checks.push({ kind, stage: file.stage, rows: expected.length, formulas: 0, success: true });
  }
  assert.deepEqual(stages[0].rows.map(row => row.map(({ text, type, value }) => ({ text, type, value }))), stages[1].rows.map(row => row.map(({ text, type, value }) => ({ text, type, value }))));
}
const report = { recordedAt: new Date().toISOString(), consumer: native.consumer, nativeReport: native.file, cells: folder + '/cells.json', checks, success: true, limitations: ['LibreOffice Calc 26.8.1 on this Windows host; not an Excel verification.', 'CSV dates explicitly imported as ISO text. Initial monetary decimals use en-US; consumer saves pt-BR decimals and reopens with pt-BR.', 'Amounts exceeding 15 significant digits are explicit text; smaller amounts remain numeric.'] };
fs.writeFileSync(folder + '/verification.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
