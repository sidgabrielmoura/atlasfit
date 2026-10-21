const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/components/auth/actions.ts'; let source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
const bodies = {
 getSetupInfo: '{ return getPasswordSetupInfo(token); }',
 setupPassword: `{
  const requestHeaders = await headers();
  try { return await completePasswordSetup({ token, password: passwordStr, cpfCnpj: cpfCnpjStr, birthDate: birthDateStr, acceptedTerms, acceptedPrivacy, termsDocumentId, privacyDocumentId, ip: requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined, userAgent: requestHeaders.get('user-agent') || undefined }); }
  catch (error) { console.error('[PASSWORD_SETUP_FAILED]', { errorType: error instanceof Error ? error.name : 'unknown' }); return { error: 'Não foi possível concluir a ativação. Tente novamente.' }; }
 }`
};
const edits = [];
for (const [name, body] of Object.entries(bodies)) {
 const method = ast.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === name);
 if (!method?.body) throw new Error('Action ausente: ' + name);
 edits.push({ start: method.body.pos, end: method.body.end, text: ' ' + body });
 if (name === 'setupPassword' && !method.parameters.some(p => p.name.getText(ast) === 'termsDocumentId')) edits.push({ start: method.parameters.end, end: method.parameters.end, text: ',\n  termsDocumentId?: string,\n  privacyDocumentId?: string\n' });
}
for (const edit of edits.sort((a,b) => b.start - a.start)) source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
if (!source.includes('from "@/lib/auth/password-setup-service"')) source = source.replace('"use server";', '"use server";\nimport { getPasswordSetupInfo, completePasswordSetup } from "@/lib/auth/password-setup-service";');
fs.writeFileSync(file, source);
