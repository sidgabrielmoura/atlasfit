const fs = require('node:fs');
const edit = (file, change) => { const old = fs.readFileSync(file, 'utf8'); const next = change(old); if (old === next) throw Error('No edit: ' + file); fs.writeFileSync(file, next); };
edit('src/app/(gym)/gym/settings/settings-client.tsx', s => s.replace('Informe o ID do titular para anonimização.', 'Selecione o titular do pedido.').replace('Falha ao anonimizar titular.', 'Não foi possível registrar o pedido.').replace('Erro na anonimização de dados.', 'Não foi possível registrar o pedido.'));
edit('src/components/privacy/privacy-center-tab.tsx', s => s.replace('Baixe uma cópia completa, estruturada e legível dos seus dados cadastrais, saúde e histórico de treinos.', 'Baixe seus registros cadastrais, saúde, treinos, contratos e anexos em um pacote estruturado.').replace('Arquivos sem tamanho verificável impedem a conclusão e precisam ser reconciliados.', 'O pacote admite até 100 MB e 1.000 anexos; acima disso, solicite atendimento em lotes. Arquivos sem vínculo ou tamanho verificável exigem reconciliação antes da conclusão.'));
edit('src/app/(gym)/gym/settings/page.tsx', s => {
 const from = s.indexOf('  // 3. Últimas solicitações'); const to = s.indexOf('  const isCurrentOwner', from); if (from < 0 || to < 0) throw Error('Missing legacy query');
 s = s.slice(0, from) + s.slice(to);
 const propFrom = s.indexOf('      recentRequests={recentDsrRequests.map'); const propTo = s.indexOf('      }))}', propFrom); if (propFrom < 0 || propTo < 0) throw Error('Missing legacy prop');
 return s.slice(0, propFrom) + '      recentRequests={[]}' + s.slice(propTo + '      }))}'.length);
});
