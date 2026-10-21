# Revisão de escopo — CRM, aulas e equipamentos

Instrução do usuário em 02/10/2026: retirar CRM e aulas GYM e toda a implementação de equipamentos; manter os demais fluxos e executar a configuração do personal vinculado **por último**. A retirada não remove CRM, calendário, carteira ou pagamentos do PERSONAL autônomo.

## Alterações executadas

| Camada | Intervenção | Preservado |
|---|---|---|
| Páginas e navegação | Removidas as páginas GYM de CRM, aulas e acesso físico e seus clientes; links e textos correspondentes retirados | Alunos, equipe, matrículas, planos, financeiro, importação, treinos e marca |
| Servidor | Removidos endpoints de CRM/aulas/dispositivos/biometria/acesso, feed físico, operações e piloto; serviços e contratos exclusivos removidos | Autorização por academia/unidade e APIs operacionais |
| Portais | Removidas APIs de reserva de aluno/responsável e controles físicos do portal | Representação verificada, aceite, contratos, saúde autorizada e extrato interno |
| Recepção | Consulta paginada por unidade, contrato e saldo; nenhum polling, avaliação física ou comando. Financeiro omitido para quem não possui permissão | Situação efetiva da matrícula e mensalidade; CPF/senhas não enviados |
| Importação | CSV sem credenciais; colunas preenchidas de equipamentos são recusadas. Prévia usa versão `gym-import-v3` e chave própria | Validação integral no servidor, quota, saldos autorizados e histórico de lotes anteriores |
| Equipe e desligamento | Retiradas operações sobre grade/reservas e filas de purga. Repasse continua transacional; cancelamento local conserva dívidas e identidade | Grants, autoria, outros vínculos e recebimentos |
| Configuração e indicadores | Removidos flags, licença/uso de dispositivos e indicadores físicos/CRM/aulas da operação. Consultas não criam licenças em edição comum | Importação habilitável, defaults operacionais e licença própria GYM |
| Realtime | Retirados canais físicos/aulas e roteamento de eventos para eles | Canais financeiros autorizados e conversas compartilhadas |
| Wallet | Removidos componentes órfãos de wallet/conciliação externa e serviço exclusivo não utilizado | Tombstones HTTP 410, inventário local de legado, eventos e pagamentos globais/PERSONAL |
| Testes | Retirados arquivos/cenários exclusivos desses módulos. Mantidos testes pertinentes de segurança, integridade e dinheiro; quatro cenários focados adicionados | Regressão dos fluxos comuns e testes PostgreSQL de concorrência |

O cancelamento de aluno agora é imediato, local e auditado; solicitação futura é recusada nesse endpoint e deve usar a matrícula específica. Assinatura externa associada bloqueia esse encerramento e exige reconciliação. Não se presume cancelamento no gateway. Pagamentos e obrigações existentes não são apagados nem quitados pelo desligamento.

## Histórico e transição

Nenhum banco real foi consultado ou alterado. Schema e migrations históricos continuam contendo tabelas de módulos retirados; são armazenamento legado inativo e **não** comprovação de recurso operacional. Não foi executado DROP, purga de equipamento ou cancelamento externo. O dossiê local pode exportar registros históricos de reservas/acessos já armazenados; não opera equipamentos ou reservas.

As fontes retiradas têm snapshot/hashes nos [arquivos iniciais](retirada-modulos-manifest.json), [testes e automações](retirada-modulos-testes.json) e [órfãos da wallet](retirada-wallet-orfaos.json). Cópia local recuperável está em `.tmp/gym-retired-sources`, fora de `src`; não é importada pela aplicação. A documentação original e os anexos de acesso/agente/recuperação descrevem versões anteriores à retirada e não devem orientar uma ativação atual.

Prévia `v2` pendente deve ser refeita; o contrato antigo não pode criar credenciais por caminhos alternativos. Lotes concluídos permanecem registrados; reutilização não deve migrar o resultado antigo silenciosamente. Nenhuma agenda externa ou dispositivo implantado foi inspecionado: a retirada do código não cancela agendas/agentes existentes fora deste checkout. Na futura task, será necessário inventariar essas dependências antes de qualquer reativação/purga.

## Verificação disponível

- TypeScript passou após a consolidação das fontes; verificações posteriores constam no acompanhamento do ciclo financeiro.
- HTTP isolado: 3 cenários aprovados (rotas retiradas retornam 404, configuração operacional e autorização SSR da recepção). Os outros 21 cenários ficaram fora do filtro e não foram executados nesse lote.
- `node scripts/test-gym-config-isolated.cjs`: 11 cenários aprovados; configuração/baseline/rollback e regressão de treinos.
- `node scripts/test-gym-retirement-isolated.cjs`: 41 cenários aprovados; importação, recepção/unidade, fontes ausentes, desligamento, financeiro preservado, autoridade e armazenamento.
- Falhas intermediárias estão nos artefatos brutos; uma limpeza automatizada removeu indevidamente suites, foi revertida a partir do snapshot e corrigida antes da repetição aprovada. Não foi considerada aprovação a execução com arquivo sem cenários.

Não há homologação visual/mobile/teclado ou prova sobre configurações implantadas. Os resultados anteriores de dispositivos/aulas continuam históricos, sem validade como aceitação do escopo atual.

## Última etapa: personal vinculado

| Contexto | Comportamento solicitado | Estado |
|---|---|---|
| GYM selecionado + vínculo de personal | Usar a área PERSONAL existente; ocultar e negar no servidor captação, CRM, financeiro/Atlas Pay, engajamento/crescimento, assinatura própria, configurações e financeiro de dashboard/alunos | Pendente; requer leitura completa das jornadas PERSONAL antes da implementação |
| Workspace PERSONAL próprio | Criação privada, trial normal e limites da assinatura autônoma; academia não consulta esse workspace | Pendente |
| Trial/assinatura própria expirada | Retorno padrão à academia; tentativa explícita no próprio workspace mostra o paywall existente, com retorno à academia | Pendente |
| Limites e repetição | Quota conta workspaces próprios PERSONAL, sem depender da licença GYM; concorrência e nova criação não renovam trial | Pendente |
| Regressão | Segurança/tenant/unidade, matrícula atribuída, valores omitidos, privacidade do workspace próprio, revogação, vencimento e concorrência verificados em banco real descartável e HTTP | Pendente |

Esta etapa é distinta da simples ocultação de menus: os handlers PERSONAL hoje recusam GYM. A equivalência exige adapters operacionais com autoridade local e preservação dos caminhos financeiros autônomos. Nenhuma liberação genérica dos endpoints PERSONAL foi realizada neste lote.
