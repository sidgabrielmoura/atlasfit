# Administração e suspensão de workspace — 05/10/2026

## Situação e intervenção

GYM-AUD-014 descrevia a omissão de `isActive` na lista e o toggle incompatível com o estado persistido. A lista já retornava esse campo no checkout atual; faltavam validação da atualização, integração do feedback e verificação do ciclo. Este lote completa esses pontos sem converter tipos de workspace ou alterar registros financeiros.

`workspaceAdministrationSchema` rejeita campos desconhecidos, valores booleanos em texto e edição vazia. Suspensão/reativação exige o estado anterior observado (`expectedIsActive`). Um estado alterado por outro operador retorna 409, exigindo recarga. O tipo PERSONAL/GYM não pode ser convertido por edição administrativa.

`updateWorkspaceAdministration` reconsulta o papel SUPERADMIN no banco e executa identificação, titularidade, atributos e auditoria numa única transação Serializable. Conflito de slug não deixa transferência parcial: a tentativa de unicidade é reavaliada uma vez, com autorização atual, e retorna conflito. O registro administrativo preserva o ator original e identifica o usuário efetivo. A recuperação administrativa continua permitida quando a academia está suspensa.

Lista e detalhe enviam o baseline e usam o retorno aplicado. A store diferencia carregamento/erro da lista de outras operações. Uma gravação concluída com recarga falha informa a gravação e pede atualização; conserva a listagem anterior identificada como desatualizada. Erros estruturados são exibidos com opção de tentar recarregar.

## Verificações e alcance

| Verificação | Cobertura | Resultado final |
|---|---|---|
| PostgreSQL real descartável | Suspensão simultânea, baseline obsoleto, reativação, validação, tipo imutável, ator sem autoridade | 2 testes agrupados aprovados, incluindo o cenário seguinte |
| PostgreSQL real descartável | Conflito de slug com transferência de titularidade: rollback de proprietário, grants e auditoria; workspace PERSONAL conserva tipo | Aprovado no segundo teste agrupado |
| HTTP com autenticação Credentials | Lista ativa/inativa, PATCH inválido, suspensão, bloqueio financeiro da academia, reativação e revogação de SUPERADMIN com JWT existente | 1 jornada aprovada; 31 casos fora do filtro |
| TypeScript | Árvore atual, `--noEmit --incremental false` | Código de saída 0 |

Os comandos, datas, resultados e hashes estão em [verificacoes-administracao-workspace.json](verificacoes-administracao-workspace.json). A execução intermediária que revelou validação síncrona foi preservada nos resultados brutos; o serviço foi tornado assíncrono, sem relaxar a asserção. Tentativas de execução com nome de configuração e variável de ambiente incorretos não verificaram a aplicação; os resultados finais utilizam os contratos corretos.

Somente `127.0.0.1:56432/atlasfit_gym_stabilization_20261001` e aplicação isolada na porta 31173 foram usados. Não houve migration, operação financeira externa, mensagem ou alteração de produção neste lote.

## Limites e achados relacionados

GYM-AUD-014 fica corrigido e verificado para o contrato, estado persistido e jornada HTTP. A inspeção do código demonstra a integração da interface; não equivale a homologação visual, mobile ou teclado, que permanece em GYM-AUD-051/050.

O reaproveitamento da transferência foi verificado com PERSONAL no banco, mas não homologa todas as jornadas PERSONAL. GYM-AUD-001 continua exigindo suspensão em todos os caminhos mantidos. GYM-AUD-003 continua exigindo revisão dos outros caminhos de grants/titularidade e dados históricos. GYM-AUD-053 continua exigindo ator original em todos os comandos; este PATCH cobre apenas sua operação administrativa. Consultas extensas e indicadores do detalhe permanecem no diagnóstico de desempenho e GYM-AUD-036.
