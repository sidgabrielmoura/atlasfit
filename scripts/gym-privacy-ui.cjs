const fs = require('node:fs');
const ts = require('typescript');
const file = 'src/app/(gym)/gym/settings/settings-client.tsx';
let source = fs.readFileSync(file,'utf8');
const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const edits=[];
function visit(node) {
 if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(ast)==='Input') {
  const text=node.getText(ast);
  const field=['dossierUserId','deleteTargetUserId'].find(field=>text.includes(`value={${field}}`));
  if (field) { const setter=field==='dossierUserId'?'setDossierUserId':'setDeleteTargetUserId'; edits.push({start:node.getStart(ast),end:node.end,text:`<NativeSelect id="${field}" aria-label="Selecionar titular da academia" value={${field}} onChange={event => ${setter}(event.target.value)}><NativeSelectOption value="">Selecione o titular</NativeSelectOption>{privacySubjects.map(subject => <NativeSelectOption key={subject.userId} value={subject.userId}>{subject.name}</NativeSelectOption>)}</NativeSelect>`}); return; }
 }
 if (ts.isJsxElement(node)) {
  const tag=node.openingElement.tagName.getText(ast);
  const text=node.getText(ast);
  if (tag==='AlertDescription' && text.includes('Dados de biometria física')) { edits.push({start:node.getStart(ast),end:node.end,text:'<AlertDescription>Solicitações são registradas para análise. Exclusão, retenção e confirmação de remoção exigem tratamento autorizado e verificação dos vínculos.</AlertDescription>'});return; }
  if (tag==='AlertDialogDescription' && text.includes('Esta ação anonimizará permanentemente')) { edits.push({start:node.getStart(ast),end:node.end,text:'<AlertDialogDescription>A solicitação ficará pendente de análise. Cadastro, contratos e histórico serão preservados até a definição e execução do tratamento autorizado.</AlertDialogDescription>'});return; }
 }
 ts.forEachChild(node,visit);
}
visit(ast);
for(const edit of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,edit.start)+edit.text+source.slice(edit.end);
const replacements=[
 ['Gestão de titularidade do workspace e central de conformidade legal de dados pessoais.','Marca, titularidade e solicitações de privacidade.'],
 ['Configurações & Governança','Configurações'],
 ['LGPD & Privacidade','Privacidade'],
 ['Titularidade (Owner)','Titularidade'],
 ['Conformidade LGPD & Retenção Legal (Art. 16 e 18)','Solicitações de privacidade'],
 ['Direito à Eliminação (Anonimização)','Solicitar eliminação'],
 ['Anonimiza permanentemente o cadastro pessoal, dados médicos e revoga credenciais nos controles de acesso, retendo apenas o histórico contábil legal.','Registre o pedido do titular para análise do escopo, autorização e retenção.'],
 ['Gere um arquivo JSON estruturado contendo todos os dados pessoais, contratos, termos aceitos, presenças e recibos financeiros.','Exporte os registros disponíveis do titular nesta academia.'],
 ['ID do Usuário Titular','Titular'],
 ['ID do Titular para Eliminação','Titular'],
 ['Você pode obter o ID na ficha do aluno ou colaborador.','A lista contém pessoas vinculadas a esta academia.'],
 ['Executar Anonimização Assistida','Registrar solicitação'],
 ['Histórico de Solicitações LGPD (DataSubjectRequest)','Solicitações recentes'],
 ['Trilha auditável de portabilidade, acesso e solicitações de anonimização atendidas.','Acompanhe o estado dos pedidos registrados.'],
 ['Confirmar Anonimização Definitiva de Titular (LGPD Art. 16)?','Registrar pedido de eliminação?'],
 ['"Anonimizando..." : "Confirmar Eliminação"','"Registrando..." : "Registrar solicitação"'],
 ['`Titular anonimizado com sucesso! Registros fiscais retidos conforme Art. 16 da LGPD.`','"Solicitação registrada e pendente de análise."'],
 ['Seu acesso será automaticamente rebaixado para GERENTE (MANAGER). Esta ação é atômica e irreversível.','Seu papel passará a gerente. Confirme o destinatário antes de transferir.'],
];
for(const [from,to] of replacements)source=source.replaceAll(from,to);
source=source.replace('<label className="text-xs font-medium text-muted-foreground">Titular</label>','<label htmlFor="dossierUserId" className="text-xs font-medium text-muted-foreground">Titular</label>');
const second=source.indexOf('<label className="text-xs font-medium text-muted-foreground">Titular</label>');
if(second>=0)source=source.slice(0,second)+source.slice(second).replace('<label className="text-xs font-medium text-muted-foreground">Titular</label>','<label htmlFor="deleteTargetUserId" className="text-xs font-medium text-muted-foreground">Titular</label>');
fs.writeFileSync(file,source);
