const fs = require('node:fs');
const folder = 'docs/audits/academias/estabilizacao';
const file = `${folder}/tratamento.json`;
const states = JSON.parse(fs.readFileSync(file, 'utf8'));
const references = [
 'src/modules/workspaces/application/gym-workout-service.ts', 'src/modules/workspaces/application/gym-workout-commands.ts',
 'src/modules/workspaces/application/gym-workout-query.ts', 'src/modules/workspaces/application/gym-workout-http.ts',
 'src/modules/workspaces/application/student-authority.ts', 'src/modules/workspaces/domain/gym-workout-contract.ts',
 'src/modules/workspaces/domain/gym-workout-client.ts', 'src/app/(gym)/gym/workouts/page.tsx',
 'src/app/(gym)/gym/workouts/workouts-client.tsx', 'src/app/(gym)/gym/workouts/use-workout-options.ts',
 'src/app/api/gym/workouts/templates/route.ts', 'src/app/api/gym/workouts/templates/[id]/route.ts',
 'src/app/api/gym/workouts/assign/route.ts', 'src/app/api/gym/workouts/exercises/route.ts',
 'src/app/api/gym/workouts/students/route.ts', 'src/app/api/gym/students/[id]/workouts/route.ts',
 'tests/gym/workout-integrity.integration.ts', 'tests/gym/http.spec.ts', `${folder}/treinos-biblioteca-prescricao.md`,
];
const changes = {
 '001': 'Comandos de treinos revalidam suspensão e grants atuais dentro da transação, inclusive antes de devolver um retry. Outros serviços/jobs ainda pendentes.',
 '002': 'Biblioteca compartilhada pode ser lida por instrutor local, sem conceder edição institucional global. Prescrição/leitura validam unidade/atribuição; boolean legado de gestor não concede autoridade. Todo restante da equipe/OWNER continua pendente.',
 '005': 'DTOs de modelos/fichas e opções de alunos usam seleção explícita, sem material de autenticação/CPF/saúde. Não declara todas as respostas do módulo encerradas.',
 '011': 'Prescrição valida academia, unidade atual do aluno, fonte institucional e disponibilidade dos exercícios; relações de grupos são recriadas no destino. Demais escritores/constraints ainda pendentes.',
 '045': 'Página /gym/workouts conectada com biblioteca paginada, criação, edição, desativação e prescrição. Métodos avançados são conservados na cópia; edição avançada indisponível explicitamente. CRM/aulas/cliente de acessos continuam pendentes, portanto o achado não está encerrado.',
 '048': 'Página de treinos usa contexto/cookie comuns e snapshot identificado por conteúdo; refresh troca o estado após mutações. Seletores assíncronos abortam consultas antigas. Switcher/mobile e demais páginas permanecem pendentes.',
};
for (const [suffix, correction] of Object.entries(changes)) {
 const state = states[`GYM-AUD-${suffix}`];
 state.state = 'Pendente';
 state.correction += ` ${correction}`;
 state.files = [...new Set([...state.files, ...references])];
 state.validation = [...new Set([...state.validation, 'Cinco cenários PostgreSQL de treinos: escopo/privado/grants, atribuição, retry concorrente, grupos/métodos/preferências e rollback por falha de auditoria. Jornadas HTTP SSR/CRUD/prescrição/revogação e resultados finais em verificacoes-isoladas.json; não homologa browser.'])];
}
fs.writeFileSync(file, JSON.stringify(states, null, 2));
console.log('Lote de treinos registrado sem encerrar achados compostos.');
require('./gym-update-config-progress.cjs');
