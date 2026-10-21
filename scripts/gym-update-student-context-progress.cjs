const fs = require('node:fs');
const folder = 'docs/audits/academias/estabilizacao'; const file = `${folder}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(file, 'utf8'));
const checks = JSON.parse(fs.readFileSync(`${folder}/verificacoes-isoladas.json`, 'utf8'));
const context = ['src/lib/student-auth.ts', 'src/modules/workspaces/domain/student-membership.ts', 'src/lib/student-workout-scope.ts', 'src/app/api/student/dashboard/route.ts', 'src/app/api/student/workouts/route.ts', 'src/stores/workout.store.ts', 'src/stores/workspace.store.ts', 'tests/gym/student-context.integration.ts', 'tests/gym/http.spec.ts'];
const finance = ['src/lib/student-billing-scope.ts', 'src/app/api/student/lock-status/route.ts', 'src/app/api/student/finance/route.ts', 'src/modules/workspaces/application/gym-student-finance.ts'];
for (const suffix of ['002', '011', '030', '048']) {
  const state = states[`GYM-AUD-${suffix}`];
  const additions = {
    '002': 'Portal/extrato/aceite agora recusam fallback por perfil quando existe histórico de grants; STUDENT vigente precisa ser global ou da unidade real. Demais APIs e grants locais permanecem pendentes.',
    '011': 'Leitura de histórico de treino cruza workspace do log e definição; conclusão valida treino e IDs de exercícios no vínculo selecionado. Reconciliação de dados anteriores e escritores alternativos pendentes.',
    '030': 'Portal, dashboard e bloqueio estudantil GYM usam financeiro manual, sem consulta/reconciliação de wallet. Cobrança externa histórica não é cancelada nem baixada. Legado/webhooks e ciclo contratual permanecem pendentes.',
    '048': 'Dashboard/treinos selecionam o mesmo workspace do cookie; clientes abortam respostas antigas e conferem contexto. Store de treino preserva execução de origem conhecida no reload e limpa ao alternar/logout. Browser, unidade e demais portais/caminhos antigos pendentes.',
  };
  state.correction += ` ${additions[suffix]}`;
  state.files = [...new Set([...state.files, ...context, ...finance])];
  state.validation = [...new Set([...state.validation, 'PostgreSQL: histórico STUDENT, snapshot financeiro e store; HTTP: dashboard/treinos/baixa financeira e bloqueio PERSONAL/GYM, sem operação externa real'])];
}
states['GYM-AUD-050'].correction = `Últimas execuções concluídas: PostgreSQL ${checks.postgresql.passed}/${checks.postgresql.failed}, HTTP ${checks.http.passed}/${checks.http.failed}, regressão compartilhada ${checks['personal-shared-unit'].passed}/${checks['personal-shared-unit'].failed}. Incluem helpers/store e HEAD simulado. Suíte existente ${checks['existing-unit-all'].passed}/${checks['existing-unit-all'].failed}, com inventário individual; causas/correções pendentes. Reinício Next por memória causou seis fetch failed em execução intermediária; artefato preservado, runner isolado ajustado. Browser, equipamentos e serviços externos não homologados.`;
states['GYM-AUD-050'].files = [...new Set([...states['GYM-AUD-050'].files, 'scripts/gym-http-isolated.cjs', 'scripts/gym-existing-failure-inventory.cjs', 'docs/audits/academias/estabilizacao/portal-aluno-contexto.md'])];
fs.writeFileSync(file, JSON.stringify(states, null, 2));
console.log('Contexto e financeiro do portal estudantil registrados nos achados pertinentes.');
require('./gym-update-access-progress.cjs');
