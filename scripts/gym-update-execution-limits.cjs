const fs = require('node:fs');
const file = 'docs/audits/academias/estabilizacao-modulo-academias.md';
let doc = fs.readFileSync(file, 'utf8');
const marker = '<!-- limites-execucao-focal -->';
const paragraph = `${marker}\nO host de teste possui aproximadamente 15,69 GiB de RAM. Durante a suíte HTTP longa, restaram cerca de 0,59 GiB disponíveis; após encerrar o Next descartável, havia 3,74 GiB. A execução completa mais recente terminou com 22 aprovações e seis desconexões durante restart por heap. A cópia isolada preserva arquivos sem mudanças, usa otimização de memória de webpack e mantém o React Compiler; a configuração de produção não foi alterada. Falta de memória motivou execução por lotes e encerramento do daemon entre lotes. Falhas de download de fontes por EACCES exigiram autorização do comando do servidor para acesso público à rede; nenhum segredo externo foi habilitado. Lotes focais posteriores aprovados não transformam a última suíte completa em aprovação. Não há benchmark de produção.\n`;
if (!doc.includes(marker)) doc = doc.replace('\nInspeção visual pendente:', `\n${paragraph}\nInspeção visual pendente:`);
doc = doc.replace('TypeScript passou após o lote de agente e recepção.', 'TypeScript passou após o lote de configuração global e o leitor JSON compartilhado (`npx.cmd tsc --noEmit --incremental false`, saída 0). Uma execução intermediária apontou o código novo de conflito ausente da união de erros; a união foi corrigida e a repetição passou. A análise do escopo do compilador identificou 878 entradas e nenhuma dentro de .tmp; a cópia HTTP não foi excluída artificialmente para obter aprovação.');
fs.writeFileSync(file, doc);
console.log('Limites e execução focal registrados sem apagar falhas anteriores.');
