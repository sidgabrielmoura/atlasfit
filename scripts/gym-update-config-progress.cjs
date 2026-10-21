const fs = require('node:fs');
const folder = 'docs/audits/academias/estabilizacao';
const states = JSON.parse(fs.readFileSync(`${folder}/tratamento.json`, 'utf8'));
const checks = JSON.parse(fs.readFileSync(`${folder}/verificacoes-isoladas.json`, 'utf8'));
const files = ['src/app/(superadmin)/superadmin/gym-settings/page.tsx', 'src/app/api/superadmin/gym-settings/route.ts', 'src/modules/workspaces/application/gym-feature-flags-service.ts', 'src/lib/http/read-json.ts', 'tests/gym/global-configuration.integration.ts', 'tests/gym/http.spec.ts', `${folder}/configuracao-global.md`];
const changes = {
 '015': 'Página global deixa de oferecer edição dos controles sem efeito completo demonstrado; registra indisponibilidade de biometria/contingência/purga e escopo incompleto de aulas/CRM. Defaults copiados no provisionamento não alteram licenças existentes. Enforcement completo de módulos e todos os caminhos de servidor permanece pendente.',
 '016': 'DTO derivado do schema, leitura sem escrita com fallback validado, PATCH parcial com baseline obrigatório e comparação Serializable; conflitos 409, corpo limitado, auditoria atômica sem IP fictício. UI identifica dirty/applied, bloqueia edição durante save, relê servidor antes de sucesso. Verificação visual de falhas/concorrência ainda pendente.',
 '051': 'Página reorganizada com componentes existentes, três grupos compactos, ajuda secundária, labels associados, erro/retry sem skeleton permanente e distinção entre rascunho e aplicado. Não anuncia driver fisicamente homologado. Desktop/mobile/teclado e recuperação visual continuam pendentes.',
};
const passed = ['postgresql-config', 'http-config'].every(key => checks[key]?.passed > 0 && checks[key].failed === 0);
for (const [suffix, correction] of Object.entries(changes)) {
 const state = states[`GYM-AUD-${suffix}`];
 state.correction += ` ${correction}`;
 state.files = [...new Set([...state.files, ...files])];
 state.validation = [...new Set([...state.validation, 'Lote focal PostgreSQL/configuração e regressão de treinos; HTTP de persistência/baseline/payload/revogação. Resultados integrais em verificacoes-isoladas.json; navegador não homologado.'])];
 if (suffix !== '015') state.state = passed ? 'Implementado, aguardando verificação específica' : 'Pendente';
 state.currentConfirmation = 'Código atual inspecionado; servidor verificado no banco descartável e HTTP nas condições registradas; interação visual ainda pendente.';
}
fs.writeFileSync(`${folder}/tratamento.json`, JSON.stringify(states, null, 2));
console.log('Configuração global registrada sem declarar homologação visual.');
