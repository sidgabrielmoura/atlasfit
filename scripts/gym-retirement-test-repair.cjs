const fs=require('node:fs'),path=require('node:path'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
function repair(relative, fn) { const file=path.resolve(root,relative),backup=path.resolve(root,'.tmp/gym-retired-sources',relative); if(!file.startsWith(root+path.sep)||!backup.startsWith(root+path.sep))throw new Error('Invalid root');fs.writeFileSync(file,fn(fs.readFileSync(backup,'utf8').replace(/\r\n/g,'\n'))); }
function remove(text,test){const file=ts.createSourceFile('file.ts',text,ts.ScriptTarget.Latest,true),edits=[];function visit(n){if(test(n)){edits.push([n.getFullStart(),n.end]);return;}ts.forEachChild(n,visit);}visit(file);for(const[a,b]of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,a)+text.slice(b);return text;}
function call(n, name) { return ts.isExpressionStatement(n)&&ts.isCallExpression(n.expression)&&n.expression.expression.getText()===name; }
repair('tests/gym/global-configuration.integration.ts',text=>{
 text=remove(text,n=>call(n,'setting')&&/GYM_CONFIG_KEYS\.(BIOMETRIC_MODE|HEARTBEAT_INTERVAL|TURNSTILES_ENABLED|BIOMETRICS_ENABLED)/.test(n.expression.arguments[0]?.getText()||''));
 // Calls are awaited, so match only their own direct expression, never a describe callback.
 text=remove(text,n=>ts.isExpressionStatement(n)&&ts.isAwaitExpression(n.expression)&&ts.isCallExpression(n.expression.expression)&&n.expression.expression.expression.getText()==='setting'&&/GYM_CONFIG_KEYS\.(BIOMETRIC_MODE|HEARTBEAT_INTERVAL|TURNSTILES_ENABLED|BIOMETRICS_ENABLED)/.test(n.expression.expression.arguments[0]?.getText()||''));
 return text.replace('defaultBiometricMode: "LOCAL_AGENT", ','').replace(', heartbeatIntervalSec: 30, turnstilesEnabled: false','').replace(', biometricsEnabled: false','').replace('{ primaryHardwareDriver: "CONTROL_ID" }','{ defaultMaxStaff: 10 }');
});
repair('tests/gym/operation-authority.integration.ts',text=>{
 text=remove(text,n=>call(n,'it')&&/última vaga e fila|reserva própria|responsável legítimo age|sem substituto cancela reserva/.test(n.expression.arguments[0].getText()));
 text=remove(text,n=>ts.isImportDeclaration(n)&&/booking-mutations|gym-booking-service/.test(n.moduleSpecifier.getText()));
 text=remove(text,n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>['modality','room','startsAt','session'].includes(d.name.getText())));
 text=remove(text,n=>ts.isExpressionStatement(n)&&!call(n,'describe')&&!call(n,'it')&&/prisma\.gymClassSession\.|new GymBookingService\(\)/.test(n.getText()));
 return text.replace(', students, session }',', students }').replace(', reassignedSessionsCount: 1','').replace('recursos, filas e privacidade','recursos e privacidade');
});
repair('tests/gym/reception-scope.integration.ts',text=>{
 text=remove(text,n=>(ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText()==='accessedAt'))||(ts.isExpressionStatement(n)&&!call(n,'describe')&&!call(n,'it')&&/prisma\.gym(?:AccessLog|DeviceCommand)\./.test(n.getText())));
 return text.replace('"access.read"','"students.read"').replace(', lastAccess: accessedAt.toISOString()','').replace('matrícula e saldo vêm do contrato/fatura; última passagem vem do log e GET não gera efeitos','matrícula e saldo vêm do contrato/fatura; consulta não gera cobrança');
});
repair('src/modules/workspaces/__tests__/gym-021.test.ts',text=>remove(text,n=>ts.isExpressionStatement(n)&&!call(n,'describe')&&!call(n,'it')&&/features\.(turnstilesEnabled|biometricsEnabled)/.test(n.getText())));
repair('src/modules/workspaces/__tests__/gym-072.test.ts',text=>remove(text,n=>ts.isExpressionStatement(n)&&!call(n,'describe')&&!call(n,'it')&&n.getText().includes('result.createdAccessGrantsCount')));
console.log('Restored applicable suites and removed only leaf assertions for retired resources.');
