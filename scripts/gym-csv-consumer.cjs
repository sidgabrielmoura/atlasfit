const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process'), { pathToFileURL } = require('node:url');
const folder = '.tmp/gym-csv-consumer';
const consumer = JSON.parse(fs.readFileSync(folder + '/consumer.json', 'utf8').replace(/^\uFEFF/, ''));
const exe = consumer.executable.replace(/\.exe$/, '.com');
if (!path.resolve(exe).startsWith(path.resolve(folder) + path.sep)) throw new Error('Consumer must be extracted inside the synthetic test folder.');
const runFolder = folder + '/run-' + Date.now(); fs.mkdirSync(runFolder, { recursive: true });
const report = { startedAt: new Date().toISOString(), consumer: consumer.packageUrl, packageSha256: consumer.sha256, conversions: [], file: runFolder + '/report.json' };
function convert(inputs, output, format, infilter) {
  fs.mkdirSync(output, { recursive: true });
  const args = ['-env:UserInstallation=' + pathToFileURL(path.resolve(runFolder, 'profile')).href, '--headless', '--norestore', ...(infilter ? ['--infilter=' + infilter] : []), '--convert-to', format, '--outdir', path.resolve(output), ...inputs.map(file => path.resolve(file))];
  const result = spawnSync(exe, args, { encoding: 'utf8', windowsHide: true, timeout: 60000 });
  report.conversions.push({ args, exitCode: result.status, output: result.stdout + result.stderr });
  if (result.status !== 0) throw new Error('Native consumer conversion failed (' + result.status + '): ' + (result.error?.message || '') + result.stdout + result.stderr);
}
try {
  for (const kind of ['students', 'invoices']) {
    const options = `Text - txt - csv (StarCalc):59,34,76,1,${kind === 'invoices' ? '3/2' : '6/2/8/2'},1033,false,true,false,false,false,0,true`;
    convert([folder + '/input/' + kind + '.csv'], runFolder + '/opened', 'ods', options);
    convert([runFolder + '/opened/' + kind + '.ods'], runFolder + '/saved', 'csv:Text - txt - csv (StarCalc):59,34,76,1,,1033,false,true,false,false,false,0,false,true,true');
    // This Windows consumer saves numeric decimals in its pt-BR locale.
    // Reopen using that locale, with dates explicitly retained as ISO text.
    convert([runFolder + '/saved/' + kind + '.csv'], runFolder + '/reopened', 'ods', options.replace(',1033,', ',1046,'));
  }
  report.success = true;
} catch (error) { report.success = false; report.failure = error.message; process.exitCode = 1; }
finally { report.finishedAt = new Date().toISOString(); fs.writeFileSync(report.file, JSON.stringify(report, null, 2)); fs.writeFileSync(folder + '/latest.json', JSON.stringify(report, null, 2)); console.log(JSON.stringify({ success: report.success, conversions: report.conversions.length, file: report.file, failure: report.failure })); }
