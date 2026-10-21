const fs = require('node:fs'); const ts = require('typescript');
const file = 'src/lib/privacy/age-validator.ts'; let source = fs.readFileSync(file, 'utf8');
const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true); const changes=[];
const bodies = {
 validateAgeEligibility: `
  const birthDate = parseBirthDate(birthDateInput);
  if (!birthDate) return { isValid: false, error: birthDateInput ? "Data de nascimento inválida." : "A data de nascimento é obrigatória para validação de elegibilidade da conta." };
  const age = civilAge(birthDate);
  if (age < 0) return { isValid: false, error: "A data de nascimento não pode estar no futuro." };
  if (age < minAge) return { isValid: false, age, error: \`O AtlasFit é exclusivo para maiores de \${minAge} anos. O cadastro de menores não é permitido.\` };
  if (age > 120) return { isValid: false, age, error: "Data de nascimento inválida (idade superior a 120 anos)." };
  return { isValid: true, age, birthDate };
`,
 validateGymMinorEligibility: `
  const birthDate = parseBirthDate(birthDateInput);
  if (!birthDate) return { isValid: false, isMinor: false, requiresGuardian: false, error: birthDateInput ? "Data de nascimento inválida." : "A data de nascimento é obrigatória para verificar elegibilidade." };
  const age = civilAge(birthDate);
  if (age < 0 || age > 120) return { isValid: false, isMinor: false, requiresGuardian: false, error: age < 0 ? "A data de nascimento não pode estar no futuro." : "Data de nascimento inválida (idade superior a 120 anos)." };
  const isMinor = age < 18;
  if (age < minMinorAge) return { isValid: false, age, birthDate, isMinor: true, requiresGuardian: true, error: \`A idade mínima para matrícula nesta academia é de \${minMinorAge} anos com representação legal.\` };
  return { isValid: true, age, birthDate, isMinor, requiresGuardian: isMinor };
`,
};
function walk(n) { if(ts.isFunctionDeclaration(n)&&n.body&&n.name&&Object.hasOwn(bodies,n.name.text)) changes.push({start:n.body.getStart(ast)+1,end:n.body.end-1,text:bodies[n.name.text]}); ts.forEachChild(n,walk); } walk(ast);
if(changes.length!==2) throw Error('Esperava dois validadores de idade.');
for(const c of changes.sort((a,b)=>b.start-a.start)) source=source.slice(0,c.start)+c.text+source.slice(c.end);
if(!source.includes('from "./civil-age"')) source='import { parseBirthDate, civilAge } from "./civil-age";\n'+source;
fs.writeFileSync(file,source); console.log('Datas civis validadas sem rollover e aniversário em São Paulo.');
