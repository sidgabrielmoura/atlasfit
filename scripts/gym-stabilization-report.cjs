const fs = require('node:fs');
const findings = JSON.parse(fs.readFileSync('docs/audits/academias/achados.json', 'utf8'));
const folder = 'docs/audits/academias/estabilizacao';
const statePath = `${folder}/tratamento.json`;
const states = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
for (const finding of findings) states[finding.id] ??= { state: 'Pendente', correction: '', files: [], validation: [], dependencies: finding.dependencies };
fs.writeFileSync(statePath, JSON.stringify(states, null, 2));
const rows = findings.map((finding) => `| ${finding.id} | ${finding.title} | ${states[finding.id].state} |`).join('\n');
fs.writeFileSync(`${folder}/tratamento-achados.md`, '# Tratamento dos 65 achados\n\nA auditoria original permanece preservada. “Implementado” não equivale a homologação.\n\n| Achado | Situação original | Estado atual |\n|---|---|---|\n' + rows + '\n\n' + findings.map((finding) => {
  const state = states[finding.id];
  const retired = state.retiredFiles?.length ? `\n**Fontes retiradas (histórico):** ${state.retiredFiles.join(', ')}\n` : '';
  const scope = state.scopeRevision ? `\n**Revisão de escopo:** ${state.scopeRevision}\n` : '';
  return `## ${finding.id} — ${finding.title}\n\n**Confirmação original:** ${finding.confirmation}\n\n${finding.evidence}\n\n**Confirmação atual:** ${state.currentConfirmation || 'Revalidação integral atual ainda pendente.'}\n\n**Estado:** ${state.state}\n\n**Intervenção:** ${state.correction || 'Em investigação/implementação; nenhuma correção completa declarada.'}\n\n**Arquivos:** ${state.files.join(', ') || 'A registrar.'}\n\n**Validação:** ${state.validation.join('; ') || 'Pendente.'}\n\n**Dependências:** ${state.dependencies}\n${retired}${scope}`;
}).join('\n'));
console.log('Acompanhamento individual dos 65 achados atualizado.');
