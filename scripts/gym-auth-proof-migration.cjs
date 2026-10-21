const fs = require('node:fs');
const target = 'src/components/auth/actions.ts';
let source = fs.readFileSync(target, 'utf8');
const signInBlock = /await signIn\("credentials", \{\s*email: formData.email,\s*password: formData.password,\s*redirect: false,\s*\}\);/g;
let count = 0;
source = source.replace(signInBlock, () => { count++; return 'await completeVerifiedLogin();'; });
if (count !== 5) throw new Error(`Esperados cinco caminhos de login; encontrados ${count}.`);
fs.writeFileSync(target, source);
console.log('Cinco caminhos de login conectados à prova de autenticação.');
