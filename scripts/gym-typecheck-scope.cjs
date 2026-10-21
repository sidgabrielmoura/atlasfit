const ts = require('typescript');
const path = require('node:path');
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
if (parsed.errors.length) throw new Error(parsed.errors.map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n')).join('\n'));
const temporary = path.resolve('.tmp') + path.sep;
console.log(JSON.stringify({ inputFiles: parsed.fileNames.length, temporaryFiles: parsed.fileNames.filter(file => path.resolve(file).startsWith(temporary)).length }));
